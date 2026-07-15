// domain-scope-loading（federated-governance の骨格＝improve/validate の領域スコープ実行・
//   C-fed2 / INV101）の不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: compass の全量走査は実行コストを記号総数に比例させ、規模とともに維持ループ
//   （improve/validate）の実行頻度が現実に負ける（理論検証の破綻点(a)）。読む側の JIT
//   （INV47・compass-category-tag-grep-filter）を維持ループへ広げ、案件領域 + always だけを
//   grep + インラインタグで部分ロードする。DB・embedding を入れず（DR71・INV2）、gate に
//   しない（INV101・opt-in・宣言/指定なしは従来動作）。
//
// ここで落とす誤実装（discriminative oracle）:
//   - 領域スコープの rule が improve/validate のどこかの variant に無い（配布漏れ）
//   - SKILL 本文が rules/domain-scope.md を参照していない（rule が孤立して読まれない）
//   - 「全体走査が本質の軸を絞らない」規律が抜けている（A41=compass-rule-decay /
//     coherence safety net を領域で絞って検出力を落とす誤実装）
//   - 「タグ欠落記号を黙って読み飛ばさない」境界条件が抜けている（検出漏れが静かに起きる）
//   - 「always を必ず一緒に引く」規律が抜けている（横断 Invariant を落として drift）
//   - grep フィルタを補助スクリプト（intent-check.mjs）に寄せている（INV2/A1・DR71 違反）
//   - opt-in（無指定は従来動作）の後方互換が明記されていない
//   - ja/claude ⇔ 各 variant のパリティが崩れている
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
const SKILLS = ["intent-improve", "intent-validate"];

function rulePath(lang, agent, skill) {
  return path.join(TEMPLATES, lang, agent, "skills", skill, "rules", "domain-scope.md");
}
function skillPath(lang, agent, skill) {
  return path.join(TEMPLATES, lang, agent, "skills", skill, "SKILL.md");
}

// ---- 1. 全 variant（2 skill × 2 lang × 2 agent）に domain-scope.md が在り、pull 規律を持つ ----
for (const skill of SKILLS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`1: ${lang}/${agent}/${skill} の domain-scope が領域タグ + always の pull 規律を持つ`, () => {
        const p = rulePath(lang, agent, skill);
        assert.ok(fs.existsSync(p), `${p} が存在する`);
        const c = fs.readFileSync(p, "utf8");
        // 領域タグ + always を grep で引く pull 規律（INV47）。
        assert.ok(/grep/i.test(c), `${lang}/${agent}/${skill}: grep で引く旨に触れる`);
        assert.ok(/INV47|DR71|compass-category-tag/.test(c), `${lang}/${agent}/${skill}: INV47/DR71 を典拠に参照する`);
        assert.ok(/always/.test(c), `${lang}/${agent}/${skill}: always タグに言及する`);
        // 横断 always を必ず一緒に引く（落とすと drift）。
        assert.ok(
          /必ず.*(引く|一緒|含める)|[Aa]lways.*(together|pull)|drift/i.test(c),
          `${lang}/${agent}/${skill}: 横断 always を必ず一緒に引く（落とすと drift）旨に触れる`,
        );
      });
    }
  }
}

// ---- 2. 「全体走査が本質の軸を絞らない」規律（検出力を落とさない・B-fed5） ----
for (const skill of SKILLS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`2: ${lang}/${agent}/${skill} の domain-scope が全体走査例外（検出力保持）を持つ`, () => {
        const c = fs.readFileSync(rulePath(lang, agent, skill), "utf8");
        // 全体走査が本質の軸／safety net を領域スコープで絞らない旨。
        assert.ok(
          /全体走査|full scan|safety net|全記号|all symbols/i.test(c),
          `${lang}/${agent}/${skill}: 全体走査が本質の軸を絞らない旨に触れる`,
        );
        // 検出力を落とさない旨。
        assert.ok(
          /検出力|weaken detection|detection/i.test(c),
          `${lang}/${agent}/${skill}: 検出力を落とさない旨に触れる`,
        );
      });
    }
  }
}

// ---- 3. 「タグ欠落記号を黙って読み飛ばさない」境界条件（PBR テスト観点・2026-07-15） ----
for (const skill of SKILLS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`3: ${lang}/${agent}/${skill} の domain-scope がタグ欠落記号の読み飛ばし禁止を持つ`, () => {
        const c = fs.readFileSync(rulePath(lang, agent, skill), "utf8");
        assert.ok(
          /読み飛ばさない|do not silently skip|silently skip/i.test(c),
          `${lang}/${agent}/${skill}: タグ欠落記号を黙って読み飛ばさない旨に触れる`,
        );
        // 欠落が報告に現れる（検出漏れが静かに起きない）。
        assert.ok(
          /報告に現れる|appear in the report|detection gap/i.test(c),
          `${lang}/${agent}/${skill}: 欠落が報告に現れる旨に触れる`,
        );
      });
    }
  }
}

// ---- 4. opt-in の後方互換（無指定は従来動作）と gate にしない ----
for (const skill of SKILLS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`4: ${lang}/${agent}/${skill} の domain-scope が opt-in 後方互換・非 gate を持つ`, () => {
        const c = fs.readFileSync(rulePath(lang, agent, skill), "utf8");
        // 無指定は従来動作（フォールバック）。
        assert.ok(
          /従来.*(動作|全量)|fall back|fallback|backward-compat/i.test(c),
          `${lang}/${agent}/${skill}: 無指定は従来の全量読みにフォールバックする旨に触れる`,
        );
        // gate にしない・INV101。
        assert.ok(/INV101/.test(c), `${lang}/${agent}/${skill}: INV101 を参照する`);
        assert.ok(
          /gate/i.test(c),
          `${lang}/${agent}/${skill}: gate にしない旨に触れる`,
        );
      });
    }
  }
}

// ---- 5. grep フィルタを補助スクリプト（intent-check.mjs）に寄せていない（INV2/A1・DR71） ----
for (const skill of SKILLS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`5: ${lang}/${agent}/${skill} の domain-scope が intent-check.mjs に寄せない`, () => {
        const c = fs.readFileSync(rulePath(lang, agent, skill), "utf8");
        assert.ok(
          !/intent-check\.mjs/.test(c),
          `${lang}/${agent}/${skill}: grep フィルタを intent-check.mjs に寄せない`,
        );
      });
    }
  }
}

// ---- 6. SKILL 本文が rules/domain-scope.md を参照している（rule が孤立しない） ----
for (const skill of SKILLS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`6: ${lang}/${agent}/${skill} の SKILL 本文が domain-scope を参照する`, () => {
        const c = fs.readFileSync(skillPath(lang, agent, skill), "utf8");
        assert.ok(
          c.includes("rules/domain-scope.md"),
          `${lang}/${agent}/${skill}: SKILL 本文が rules/domain-scope.md を参照する`,
        );
        // 対象数の報告（O2）に触れる。
        assert.ok(
          /記号数|target count|symbols/i.test(c),
          `${lang}/${agent}/${skill}: 読み込み対象数の報告に触れる`,
        );
      });
    }
  }
}

// ---- 7. dogfood（.claude/skills）が ja/claude と byte 同一（存在すれば検査・self-apply） ----
for (const skill of SKILLS) {
  for (const file of ["SKILL.md", "rules/domain-scope.md"]) {
    test(`7: dogfood ${skill}/${file} が ja/claude と同期している（存在すれば検査）`, () => {
      const dogfood = path.join(REPO_ROOT, ".claude", "skills", skill, file);
      if (!fs.existsSync(dogfood)) return;
      const parent = path.join(TEMPLATES, "ja", "claude", "skills", skill, file);
      assert.equal(
        fs.readFileSync(dogfood, "utf8"),
        fs.readFileSync(parent, "utf8"),
        `dogfood ${skill}/${file} は ja/claude と byte 同一`,
      );
    });
  }
}
