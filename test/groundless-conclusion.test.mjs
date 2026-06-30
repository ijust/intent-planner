// groundless-conclusion（A29・corrective-intent の validate 側）の不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: 4d05f8a4 が intent-validate に「結論に根拠（rationale）が辿れるか」を read-only で点検する検査軸
//   `groundless-conclusion` を追加した。後続の unverified-hypothesis(A30)・dangling-reference は本軸を
//   「軸分離」の対比相手として名指すため間接的に守られていたが、本軸そのものを直接 assert する正リグレッションが
//   無かった（監査で指摘された穴）。ここでは「検査軸が catalog にある・SKILL が独立 Step を持つ・read-only/
//   意味判断/機械検査非依存・訂正可能性の観点・自動改変しない・gate にしない・glossary 登録」を 4 系統で
//   名指し検査し、削除・ドリフトを回帰として落とす（unverified-hypothesis.test.mjs と同型の discriminative oracle）。
//
// 注: intent-validate は SKILL 本文を hash lock しない（非 SKILL_BODY_LOCKED）ので本文を正当に編集できる。
//   gemini は codex ツリー共有（専用ファイル無し）なので AGENTS は claude/codex の 2 系統。
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

const CHECK_ID = "groundless-conclusion";

function checksPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "SKILL.md");
}
function glossaryPath(lang) {
  return path.join(TEMPLATES, lang, "intent", "glossary.md");
}

// ---- 1. 検査カタログ（validate-checks.md）に groundless-conclusion の行があり深刻度 info ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の validate-checks に ${CHECK_ID} 検査軸の行がある`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(row, `${lang}/${agent}: catalog 表に ${CHECK_ID} のデータ行がある`);
      // 品質カテゴリ・深刻度 info（誤検知前提の一方向報告）。
      assert.ok(
        /\b(info|情報)\b/.test(row),
        `${lang}/${agent}: ${CHECK_ID} の深刻度は info`,
      );
    });
  }
}

// ---- 2. read-only・意味判断・機械検査非依存・自動改変しない の不変条件 ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の validate-checks が ${CHECK_ID} を read-only・意味判断・機械検査非依存で定義する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      assert.ok(c.toLowerCase().includes("read-only"), `${lang}/${agent}: read-only`);
      // 機械検査（intent-check.mjs）・必須フィールドの有無に寄せない（INV2/A1）。
      assert.ok(
        /intent-check\.mjs|required field|必須フィールド|mechanical/i.test(c),
        `${lang}/${agent}: 機械検査・必須フィールドの有無に寄せない旨に触れる`,
      );
      // canonical を自動改変しない。
      assert.ok(
        /auto-?edit|auto-?modif|auto-?rewrite|自動.*改変|自動で?書き換え/i.test(c),
        `${lang}/${agent}: canonical を自動改変しない`,
      );
    });
  }
}

// ---- 3. 訂正可能性（correctability）の観点を添える＝本軸の核心 ----
// 結論が否定する事実が来たとき根拠から再評価できるか、を所見に添えるのが A29 の眼目。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の validate-checks が ${CHECK_ID} に訂正可能性の観点を添える`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      assert.ok(
        /訂正可能性|correctab|re-?evaluat|再評価/i.test(c),
        `${lang}/${agent}: 訂正可能性（再評価できるか）の観点に触れる`,
      );
      // 根拠（rationale＝理由・制約・前提・トレードオフ）が辿れるかを問う軸であること。
      assert.ok(
        /rationale|根拠|trade-?off|トレードオフ/i.test(c),
        `${lang}/${agent}: 根拠（rationale）の辿れなさを問う軸であることに触れる`,
      );
    });
  }
}

// ---- 4. 沈黙（疑いが無ければ発火しない）・候補提示に留め断定しない ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の validate-checks が ${CHECK_ID} を候補提示・疑い無しで沈黙と定義する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      // 候補提示に留め断定しない（誤検知前提）。
      assert.ok(
        /候補|candidate|疑い|suspect/i.test(c),
        `${lang}/${agent}: 候補提示・疑いとして挙げる（断定しない）`,
      );
    });
  }
}

// ---- 5. SKILL.md（4系統）が独立 Step として groundless-conclusion を結線する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の SKILL が ${CHECK_ID} を独立 Step（3.7）として結線する`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(c.includes(CHECK_ID), `${lang}/${agent}: SKILL が ${CHECK_ID} を参照する`);
      // 独立した Step 3.7 見出し（coinage 3.6 の後・unverified 3.8 の前）。
      assert.ok(
        new RegExp(`### Step 3\\.7:.*\`?${CHECK_ID}\`?`).test(c),
        `${lang}/${agent}: SKILL に Step 3.7（${CHECK_ID}）の見出しがある`,
      );
      // gate にしない（export/実装を止めない）。
      assert.ok(
        /gate にしない|止めない|never stops?|does not stop|no gate|gate でない/i.test(c),
        `${lang}/${agent}: SKILL 側にも gate にしない（停止しない）が明記される`,
      );
    });
  }
}

// ---- 6. SKILL 見出し階層が壊れていない（Step 3.6 < 3.7 < 3.8 の順） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の SKILL は Step 3.6/3.7/3.8 の見出し階層が保たれる`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      const i36 = c.indexOf("### Step 3.6");
      const i37 = c.indexOf("### Step 3.7");
      const i38 = c.indexOf("### Step 3.8");
      assert.ok(i36 > 0 && i37 > i36 && i38 > i37, `${lang}/${agent}: Step 3.6 < 3.7 < 3.8 の順で全見出しが存在する`);
    });
  }
}

// ---- 7. glossary に groundless-conclusion が正規語として登録される ----
for (const lang of LANGS) {
  test(`7: ${lang} の glossary に ${CHECK_ID} が登録される`, () => {
    const c = fs.readFileSync(glossaryPath(lang), "utf8");
    const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
    assert.ok(row, `${lang}: glossary に ${CHECK_ID} のデータ行がある`);
  });
}

// ---- 8. dogfood（.intent / .claude）が parent と同期している（存在すれば検査） ----
test("8: dogfood .claude/.intent に groundless-conclusion が同期されている（存在すれば検査）", () => {
  const dogfoodChecks = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "rules", "validate-checks.md");
  const dogfoodGlossary = path.join(REPO_ROOT, ".intent", "glossary.md");
  if (fs.existsSync(dogfoodChecks)) {
    assert.ok(
      fs.readFileSync(dogfoodChecks, "utf8").includes(CHECK_ID),
      "dogfood validate-checks が groundless-conclusion を含む",
    );
  }
  if (fs.existsSync(dogfoodGlossary)) {
    assert.ok(
      fs.readFileSync(dogfoodGlossary, "utf8").includes(CHECK_ID),
      "dogfood glossary が groundless-conclusion を含む",
    );
  }
});
