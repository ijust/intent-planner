// domain-write（federated-governance の書き込み側つなぎ込み＝compass 新記号起案 / writeback 昇格の
//   area 導出確認 + owner 気づき・C-fed1 書き込み側 / INV91 / INV101 / DR193）の不変条件テスト
//   （node:test 標準・依存ゼロ）。
//
// 背景: 入れ物（vessel）と読み手（scope-run）だけでは、新記号がどの領域に生まれるかが依然その場
//   判断で、他セッションが起草中の領域へ気づかず書き込む。書き込みの瞬間に「area 導出+確認」と
//   「他セッションの owner 宣言の気づき（read-only・止めない）」を差し込み、O1（並行衝突の解消）を閉じる。
//
// ここで落とす誤実装（discriminative oracle・独立レビュー教訓＝見出し語一致でなく実質を検査する）:
//   - domain-write rule が compass / writeback のどこかの variant に無い（配布漏れ）
//   - owner の気づきが「止めない・自宣言に自警告しない・共存は正常」の INV91 実質を落とす
//     （gate 化・拒否・停止に化ける誤実装）
//   - area 導出が「黙って always にしない」規律を落とす（惰性 always で領域スコープの節約が漸減）
//   - 食い違いを「気づきまで（DR193・修正しない）」に留めず自動修正する
//   - domains 不在の後方互換フォールバックが抜ける
//   - SKILL 本文が rules/domain-write.md を参照していない（rule が孤立して読まれない）
//   - dogfood 3系統（.claude / .agents / templates）のパリティ崩れ
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
const SKILLS = ["intent-compass", "intent-writeback"];

function rulePath(lang, agent, skill) {
  return path.join(TEMPLATES, lang, agent, "skills", skill, "rules", "domain-write.md");
}
function skillPath(lang, agent, skill) {
  return path.join(TEMPLATES, lang, agent, "skills", skill, "SKILL.md");
}

// ---- 1. domain-write rule が全 variant（2 skill × 2 lang × 2 agent）に在り、area 導出の実質を持つ ----
for (const skill of SKILLS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`1: ${lang}/${agent}/${skill} の domain-write が area 導出+確認の実質を持つ`, () => {
        const p = rulePath(lang, agent, skill);
        assert.ok(fs.existsSync(p), `${p} が存在する`);
        const c = fs.readFileSync(p, "utf8");
        // area を案件文脈から導出して確認する。
        assert.ok(
          /(導出|derive)/i.test(c) && /(確認|confirm)/i.test(c),
          `${lang}/${agent}/${skill}: area を導出して確認する旨に触れる`,
        );
        // 実質: 黙って always にしない（惰性 always の禁止・Anti-543）。
        assert.ok(
          /(黙って.*always|default to .*always|silently default)/i.test(c) && /Anti-?543/.test(c),
          `${lang}/${agent}/${skill}: 黙って always を既定にしない（Anti-543）旨に触れる`,
        );
      });
    }
  }
}

// ---- 2. owner の気づきが INV91 の3規律の実質を持つ（止めない・自宣言に自警告しない・共存は正常） ----
for (const skill of SKILLS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`2: ${lang}/${agent}/${skill} の domain-write が owner 気づきの INV91 実質を持つ`, () => {
        const c = fs.readFileSync(rulePath(lang, agent, skill), "utf8");
        assert.ok(/INV91/.test(c), `${lang}/${agent}/${skill}: INV91 を参照する`);
        // 止めない・拒否しない・gate にしない。
        assert.ok(
          /(止めない|do not stop|拒否しない|do not refuse|完走|not a gate)/i.test(c),
          `${lang}/${agent}/${skill}: 気づきは止めない・完走する旨に触れる`,
        );
        // 自セッションの宣言には自警告しない（session 乱数で自他区別）。
        assert.ok(
          /(自セッション|自宣言|own declaration|one's own|自分の宣言)/i.test(c),
          `${lang}/${agent}/${skill}: 自セッションの宣言には警告しない旨に触れる`,
        );
        // 複数セッションの共存は正常（エラーにしない）。
        assert.ok(
          /(共存|co-?exist)/i.test(c) && /(正常|normal|エラーにしない|not an error)/i.test(c),
          `${lang}/${agent}/${skill}: 複数 owner 宣言の共存は正常（エラーにしない）旨に触れる`,
        );
      });
    }
  }
}

// ---- 3. 食い違いは気づきまで（DR193・自動修正しない） ----
for (const skill of SKILLS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`3: ${lang}/${agent}/${skill} の domain-write が食い違いを気づきまでに留める（DR193）`, () => {
        const c = fs.readFileSync(rulePath(lang, agent, skill), "utf8");
        assert.ok(/DR193/.test(c), `${lang}/${agent}/${skill}: DR193 を参照する`);
        // 記号→領域の正はタグだけ。
        assert.ok(
          /(タグだけ|tags? alone|the tags)/i.test(c),
          `${lang}/${agent}/${skill}: 記号→領域の正はタグだけ旨に触れる`,
        );
        // 自動修正しない（自動で領域定義へ追記/area 書き換えしない）。
        assert.ok(
          /(自動で.*追記|自動で.*書き換え|do not auto|auto-append|rewrite the area)/i.test(c),
          `${lang}/${agent}/${skill}: 食い違いを自動修正しない旨に触れる`,
        );
      });
    }
  }
}

// ---- 4. domains 不在の後方互換フォールバック ----
for (const skill of SKILLS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`4: ${lang}/${agent}/${skill} の domain-write が domains 不在の従来動作を持つ`, () => {
        const c = fs.readFileSync(rulePath(lang, agent, skill), "utf8");
        assert.ok(
          /(従来どおり|従来動作|behave as before|backward compat)/i.test(c) &&
            /(INV101|DR133|fallback|フォールバック)/i.test(c),
          `${lang}/${agent}/${skill}: domains 不在なら従来どおり（恒久フォールバック）旨に触れる`,
        );
      });
    }
  }
}

// ---- 5. SKILL 本文が rules/domain-write.md を参照している（rule が孤立しない） ----
for (const skill of SKILLS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`5: ${lang}/${agent}/${skill} の SKILL 本文が domain-write を参照する`, () => {
        const c = fs.readFileSync(skillPath(lang, agent, skill), "utf8");
        assert.ok(
          c.includes("rules/domain-write.md"),
          `${lang}/${agent}/${skill}: SKILL 本文が rules/domain-write.md を参照する`,
        );
      });
    }
  }
}

// ---- 6. dogfood 3系統（.claude=ja/claude, .agents=ja/codex）が同期している（存在すれば・self-apply） ----
for (const skill of SKILLS) {
  for (const [dogfoodRoot, agent] of [[".claude", "claude"], [".agents", "codex"]]) {
    for (const file of ["SKILL.md", "rules/domain-write.md"]) {
      test(`6: dogfood ${dogfoodRoot}/${skill}/${file} が ${agent} template と同期（存在すれば検査）`, () => {
        const dogfood = path.join(REPO_ROOT, dogfoodRoot, "skills", skill, ...file.split("/"));
        if (!fs.existsSync(dogfood)) return;
        const src = path.join(TEMPLATES, "ja", agent, "skills", skill, ...file.split("/"));
        assert.equal(
          fs.readFileSync(dogfood, "utf8"),
          fs.readFileSync(src, "utf8"),
          `dogfood ${dogfoodRoot}/${skill}/${file} は templates/ja/${agent} と byte 同一`,
        );
      });
    }
  }
}
