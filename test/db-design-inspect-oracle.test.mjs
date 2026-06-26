// intent-db-design-inspect-oracle の検査オラクル不変条件テスト（pkt②・node:test 標準・依存ゼロ）。
//
// 背景: db-inspect-oracle.md は射影スキル（agent 向け指示文書）の rule であり実行体ではない。
//   ゆえに「5検査軸・機械/意味の仕分け・invariant 適合照合・不可逆性警告 warn-only・判定保留・
//   read-only/warn-only・永続ストア無し」を rule と SKILL がそれぞれ明文化していることを
//   テキスト検査で固定する（db-design-seam.test.mjs と同型の手法）。検査は4系統すべてに掛ける。
//
// 注: rule（db-inspect-oracle.md）は claude/codex で byte 同一（agent-rules-parity が別途固定）。
//   ここでは内容アンカーを4系統で名指し検査し、削除・ドリフトを回帰として落とす。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"]; // gemini は codex ツリー共有（専用ファイル無し）。

function rulePath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-db-design", "rules", "db-inspect-oracle.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-db-design", "SKILL.md");
}

// ---- 1. rule が4系統すべてに存在する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} に db-inspect-oracle.md が存在する（4系統配置）`, () => {
      assert.ok(fs.existsSync(rulePath(lang, agent)), `${rulePath(lang, agent)} が実在する`);
    });
  }
}

// ---- 2. 5検査軸がすべて定義されている ----
const AXES = {
  ja: ["正規化崩れ", "欠落インデックス", "N+1", "制約漏れ", "命名一貫性"],
  en: ["normaliz", "missing index", "N+1", "missing constraint", "naming"],
};
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の rule に5検査軸（正規化/欠落index/N+1/制約漏れ/命名）が定義される`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      for (const axis of AXES[lang]) {
        assert.ok(
          c.includes(axis) || lower.includes(axis.toLowerCase()),
          `${lang}/${agent}: 検査軸「${axis}」が定義される`,
        );
      }
      // 制約漏れの4制約（NOT NULL・UNIQUE・FK・CHECK）が明記される。
      for (const con of ["NOT NULL", "UNIQUE", "FK", "CHECK"]) {
        assert.ok(c.includes(con), `${lang}/${agent}: 制約漏れ軸に ${con} が明記される`);
      }
    });
  }
}

// ---- 3. 機械軸/意味軸の仕分けがある（INV2/INV35(4)：意味判断を脆い grep に落とさない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の rule が機械軸/意味軸を仕分ける（INV2・意味を grep に落とさない）`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      const hasMech = c.includes("機械") || lower.includes("mechanical");
      const hasSem = c.includes("意味") || lower.includes("semantic");
      assert.ok(hasMech && hasSem, `${lang}/${agent}: 機械軸/意味軸の仕分けが明記される`);
      assert.ok(c.includes("INV2"), `${lang}/${agent}: INV2（機械検査と意味判断の分離）を参照する`);
    });
  }
}

// ---- 4. invariant 適合照合がある（INV35(3)：意図 vs 出力スキーマ・該当なしはスキップ） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の rule が invariant 適合照合を定義する（immutable 等・違反候補・スキップ）`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(c.includes("INV35"), `${lang}/${agent}: INV35（意図固定＋適合検査の両輪）を参照する`);
      assert.ok(
        c.includes("immutable") || lower.includes("immutable"),
        `${lang}/${agent}: immutable 等の DB 意図への適合照合に言及する`,
      );
      assert.ok(
        c.includes("違反候補") || lower.includes("violation candidate") || /violation[^\n]*candidate/i.test(c),
        `${lang}/${agent}: 適合照合は「違反候補」の標識（断定でない）`,
      );
    });
  }
}

// ---- 5. 不可逆性警告が warn-only・既存スキーマ無しでスキップ ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の rule が不可逆性警告を warn-only で定義し既存スキーマ無しでスキップ`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        c.includes("不可逆") || lower.includes("irreversib"),
        `${lang}/${agent}: 不可逆性警告に言及する`,
      );
      // 跳ねるコストの起因（型変更/NOT NULL 追加/カラム削除/キー変更）のいずれかに触れる。
      assert.ok(
        c.includes("型変更") || c.includes("カラム削除") || lower.includes("type change") || lower.includes("drop column"),
        `${lang}/${agent}: migration コストが跳ねる変更（型変更・カラム削除等）に触れる`,
      );
      assert.ok(
        c.includes("warn-only") || c.includes("gate ではない") || lower.includes("not a gate"),
        `${lang}/${agent}: 不可逆性警告は warn-only（gate でない）`,
      );
    });
  }
}

// ---- 6. 判定保留（Fail-Safe・合格と誤標識しない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の rule が判定保留（情報不足で合格と誤標識しない）を定義する`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        c.includes("判定保留") || lower.includes("hold judgment") || lower.includes("on hold") || lower.includes("inconclusive"),
        `${lang}/${agent}: 判定不能な軸は「判定保留＋理由」`,
      );
      assert.ok(
        c.includes("誤標識しない") || c.includes("合格") || lower.includes("not mislabel") || lower.includes("pass"),
        `${lang}/${agent}: 判定保留を「合格」と誤標識しない（Fail-Safe）`,
      );
    });
  }
}

// ---- 7. read-only・warn-only・永続ストア/外部接続なしの不変条件 ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`7: ${lang}/${agent} の rule が read-only・warn-only・永続ストア/外部接続なしを明記する`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(c.includes("warn-only"), `${lang}/${agent}: warn-only（gate でない・誤検知前提・停止しない）`);
      assert.ok(
        c.includes("read-only") || c.includes("読み取り") || lower.includes("read only"),
        `${lang}/${agent}: read-only・canonical 不可侵`,
      );
      assert.ok(
        c.includes("永続ストア") || lower.includes("persistent store"),
        `${lang}/${agent}: 永続ストアを導入しない`,
      );
      assert.ok(
        /外部.*接続|外部.*DB|external.*(db|connection|service)/i.test(c),
        `${lang}/${agent}: 実行時に外部 DB へ接続しない`,
      );
    });
  }
}

// ---- 8. SKILL.md（4系統）が検査 Step（Step 3.5）で rule を結線する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`8: ${lang}/${agent} の SKILL が Step 3.5（DB 固有検査オラクル）で db-inspect-oracle を参照する`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(c.includes("db-inspect-oracle"), `${lang}/${agent}: SKILL が db-inspect-oracle rule を参照する`);
      assert.ok(
        c.includes("Step 3.5") || /検査オラクル|inspect.*oracle/i.test(c),
        `${lang}/${agent}: SKILL に検査 Step（Step 3.5）が結線される`,
      );
      // 検査所見は警告であって射影を止めない（warn-only が SKILL 側にも明記される）。
      assert.ok(
        c.includes("warn-only") || c.includes("停止しない") || /does not stop|do not stop/i.test(c),
        `${lang}/${agent}: SKILL 側にも検査が warn-only（停止しない）と明記される`,
      );
    });
  }
}
