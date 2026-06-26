// intent-db-design-drift-writeback の落差検出＋理由記録テスト（pkt③・node:test 標準・依存ゼロ）。
//
// 背景: intent-validate / intent-writeback は agent 向け指示文書（rule）であり実行体ではない。
//   ゆえに「DB 落差検出軸の追加・read-only/tool 不変・behavior-preserving スキップ・writeback の
//   理由記録（既存二段階プロトコルに乗る・新経路を作らない）」を rule がそれぞれ明文化していることを
//   テキスト検査で固定する（db-design-seam.test.mjs と同型の手法）。検査は4系統すべてに掛ける。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];

function validateChecks(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function writebackProtocol(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-writeback", "rules", "writeback-protocol.md");
}

// ---- 1. intent-validate に db-design-implementation-drift 軸が4系統で追加されている ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の validate-checks に db-design-implementation-drift 軸がある`, () => {
      const c = fs.readFileSync(validateChecks(lang, agent), "utf8");
      assert.ok(
        c.includes("db-design-implementation-drift"),
        `${lang}/${agent}: 検査軸 ID db-design-implementation-drift が定義される`,
      );
      // 突合面（叩き台 .intent/db-design/ vs 実装スキーマ migration/DDL）が明記される。
      assert.ok(c.includes(".intent/db-design/"), `${lang}/${agent}: 叩き台 .intent/db-design/ を突合面に持つ`);
      assert.ok(
        /migration|DDL/i.test(c),
        `${lang}/${agent}: 実装スキーマ（migration/DDL）を突合相手に持つ`,
      );
    });
  }
}

// ---- 2. read-only・tool 不変（allowed-tools を増やさない・実装スキーマは Grep で読むのみ） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の DB 落差軸が read-only・tool 不変（Write/Bash を増やさない・Grep で読むのみ）`, () => {
      const c = fs.readFileSync(validateChecks(lang, agent), "utf8");
      const lower = c.toLowerCase();
      // 落差検査の注記に Read, Glob, Grep のまま（tool 不変）が明記される。
      assert.ok(
        c.includes("Read, Glob, Grep") || /allowed-tools/i.test(c),
        `${lang}/${agent}: allowed-tools が Read, Glob, Grep のまま（tool 不変）と明記`,
      );
      assert.ok(
        c.includes("INV6") || c.includes("変更しない") || /never modif|not modif/i.test(c),
        `${lang}/${agent}: 実装スキーマを変更しない（read-only・INV6）`,
      );
      // 修正は提案・書き戻さない。
      assert.ok(
        c.includes("書き戻さない") || c.includes("提案") || /not written back|suggestion/i.test(c),
        `${lang}/${agent}: 修正は提案にとどめ書き戻さない`,
      );
    });
  }
}

// ---- 3. behavior-preserving（叩き台が無い案件ではスキップ・他軸は通常実施） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の DB 落差軸は叩き台無しでスキップ（behavior-preserving）`, () => {
      const c = fs.readFileSync(validateChecks(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        c.includes("behavior-preserving"),
        `${lang}/${agent}: behavior-preserving が明記される`,
      );
      assert.ok(
        c.includes("スキップ") || lower.includes("skip"),
        `${lang}/${agent}: 叩き台が無い案件ではスキップする`,
      );
    });
  }
}

// ---- 4. Fail-Safe（実装スキーマ同定不能を「落差なし」と誤標識しない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の DB 落差軸は同定不能を「落差なし」と誤標識しない（Fail-Safe）`, () => {
      const c = fs.readFileSync(validateChecks(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        c.includes("Fail-Safe") || c.includes("誤標識しない") || /not mislabel|do not mislabel/i.test(c),
        `${lang}/${agent}: 同定不能を「落差なし」と誤標識しない`,
      );
      // 完全一致＝参照された、の可視化。
      assert.ok(
        c.includes("参照された") || /was referenced|referenced/i.test(c),
        `${lang}/${agent}: 完全一致を「参照された」と可視化する`,
      );
    });
  }
}

// ---- 5. 棲み分け（叩き台品質検査 db-inspect-oracle とは突合面が異なる・重複検査を作らない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の DB 落差軸は db-inspect-oracle と棲み分ける（重複検査を作らない）`, () => {
      const c = fs.readFileSync(validateChecks(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        c.includes("db-inspect-oracle"),
        `${lang}/${agent}: 叩き台品質検査 db-inspect-oracle との棲み分けに言及`,
      );
      assert.ok(
        c.includes("重複検査") || /duplicate check/i.test(c),
        `${lang}/${agent}: 重複検査を作らない旨が明記`,
      );
    });
  }
}

// ---- 6. intent-writeback に DB 落差の理由記録（既存二段階プロトコルに乗る・新経路を作らない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の writeback-protocol に DB 落差の理由記録があり [decision] に乗る`, () => {
      const c = fs.readFileSync(writebackProtocol(lang, agent), "utf8");
      const lower = c.toLowerCase();
      // db-design-implementation-drift 連携の理由記録に言及。
      assert.ok(
        c.includes("db-design-implementation-drift"),
        `${lang}/${agent}: validate の db-design-implementation-drift 連携に言及`,
      );
      // 新タグ・新経路を作らず [decision] に乗せる。
      assert.ok(
        c.includes("[decision]"),
        `${lang}/${agent}: 理由は既存タグ [decision] に乗せる（新タグを作らない）`,
      );
      // 二段階プロトコル（§3）に乗る。
      assert.ok(
        /§3|二段階|two-stage/i.test(c),
        `${lang}/${agent}: 既存の二段階プロトコル（§3）に乗る（新昇格経路を作らない）`,
      );
    });
  }
}

// ---- 7. 「参照された/意図的変更/未回収」の仕分けがあり未回収は静かに消さない ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`7: ${lang}/${agent} の writeback が落差を「参照/意図的変更/未回収」に仕分け未回収を残す`, () => {
      const c = fs.readFileSync(writebackProtocol(lang, agent), "utf8");
      const lower = c.toLowerCase();
      const hasTriage =
        (c.includes("参照された") && c.includes("意図的変更") && c.includes("未回収")) ||
        (/referenced/i.test(c) && /intentional change/i.test(c) && /unrecovered/i.test(c));
      assert.ok(hasTriage, `${lang}/${agent}: 「参照された/意図的変更/未回収」の3仕分けがある`);
      // 未回収は [question] として残し静かに消さない（lossy-projection）。
      assert.ok(
        c.includes("[question]") && (c.includes("静かに") || /silently|disappear/i.test(c)),
        `${lang}/${agent}: 未回収は [question] で残し静かに消さない（lossy-projection）`,
      );
    });
  }
}

// ---- 8. writeback-protocol の既存構造（§3 二段階・§9 テンプレート）が behavior-preserving ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`8: ${lang}/${agent} の writeback は叩き台/落差が無い案件で理由抽出をスキップ（behavior-preserving）`, () => {
      const c = fs.readFileSync(writebackProtocol(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        c.includes("behavior-preserving") &&
          (c.includes("スキップ") || lower.includes("skip")),
        `${lang}/${agent}: 叩き台/落差が無い案件では理由抽出をスキップ（既存 writeback を壊さない）`,
      );
    });
  }
}
