// requirement-oracle-check（export 下書きの受入基準が誤った実装を落とせる観測できる基準か・C10/C27・A42 validate 側）の
//   不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: packet を切る段（intent-packets の終端判定）では受入基準を「誤った実装を落とせる観測できる基準
//   （discriminative testability）」に締めているのに、packet を export 下書き（requirements）へ変換する過程で
//   基準が曖昧になっても拾う軸が無かった。packet で締めた品質が下書きで静かに失われる落差（lossy projection）を、
//   本検査軸 `requirement-oracle-check` が export の手前で拾う。深刻度は「推奨」（着工を止める矛盾ではなく、
//   直すと下流へ渡す下書きの信頼性が上がる品質リスク＝requirements-smell と同格）。
//   intent-validate は SKILL 本文を hash lock しない（非 SKILL_BODY_LOCKED）ので本文を正当に編集できる
//   （dangling-reference / unverified-hypothesis / groundless-conclusion 追加時と同じ横断知見）。
//   ここでは「検査軸が catalog にある（深刻度 推奨/recommended）・SKILL が独立 Step 3.13 を持つ・
//   read-only/no-gate/LLM 文脈（機械検査に寄せない）・既存の品質/境界系軸（requirements-smell /
//   export-draft-mismatch）と軸分離・射程は export 下書き・見出し階層・glossary 登録（dogfood）」を
//   4系統で名指し検査し、削除・ドリフトを回帰として落とす（discriminative oracle・既存軸追加時と同型）。
//
// 注: validate-checks.md は ja（claude=codex=dogfood）/ en（claude=codex）で byte 等価。
//   SKILL.md は本文等価で codex は frontmatter 差分。ここでは内容アンカーを名指しする。
//   glossary は配布 scaffold（templates/*/intent/glossary.md）には検査軸を積まない方針（A38/A41 と同じ）ゆえ、
//   本軸の glossary 登録は dogfood（.intent/glossary.md）でのみ検査する。
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

const CHECK_ID = "requirement-oracle-check";

function checksPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "SKILL.md");
}

// ---- 1. 検査カタログ（validate-checks.md）に requirement-oracle-check の行がある（4系統・深刻度 推奨/recommended） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の validate-checks に ${CHECK_ID} 検査軸の行がある`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(row, `${lang}/${agent}: catalog 表に ${CHECK_ID} のデータ行がある`);
      // 深刻度 推奨/recommended（着工を止める矛盾ではない品質リスク・requirements-smell と同格）。
      // 深刻度は表の最終セル（行末 `| 推奨 |` / `| recommended |`）。日本語には単語境界が無いため
      // \b に頼らず最終セルの値を取り出して判定する。
      const lastCell = row.trim().replace(/\|\s*$/, "").split("|").pop().trim();
      assert.ok(
        /^(recommended|推奨)$/.test(lastCell),
        `${lang}/${agent}: ${CHECK_ID} の深刻度は 推奨/recommended（品質リスク・止めない）。実際: "${lastCell}"`,
      );
    });
  }
}

// ---- 2. read-only・no-gate・LLM 文脈（機械検査に寄せない）の不変条件 ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の validate-checks が ${CHECK_ID} を read-only・LLM 文脈・機械検査非依存で定義する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      // LLM 意味判断（機械照合・正規表現・キーワードリストに寄せない）。
      assert.ok(
        /LLM|意味|semantic/i.test(c),
        `${lang}/${agent}: LLM の意味判断であることに触れる`,
      );
      assert.ok(
        /intent-check\.mjs/.test(c),
        `${lang}/${agent}: intent-check.mjs に寄せない旨に触れる`,
      );
      // 下書きも canonical も自動改変しない（詰め直しは提案どまり）。
      assert.ok(
        /自動で書き換えない|自動改変|proposal only|自動で.*ない|rework stays a proposal|no auto/i.test(c),
        `${lang}/${agent}: 下書き/canonical を自動改変しない（提案どまり）旨に触れる`,
      );
    });
  }
}

// ---- 3. 既存の品質/境界系軸（requirements-smell / export-draft-mismatch）と軸分離する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の validate-checks が ${CHECK_ID} を requirements-smell / export-draft-mismatch と軸分離する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(row, `${lang}/${agent}: catalog に ${CHECK_ID} の行がある`);
      // 隣接2軸を名指しして軸を分ける。
      assert.ok(
        /requirements-smell/.test(row),
        `${lang}/${agent}: requirements-smell（字面）と軸を分ける旨に触れる`,
      );
      assert.ok(
        /export-draft-mismatch/.test(row),
        `${lang}/${agent}: export-draft-mismatch（整合）と軸を分ける旨に触れる`,
      );
      // こちらは「誤実装を弁別できるか」の軸である。
      assert.ok(
        /弁別|誤った実装を落とせる|誤実装|discriminate|catch a wrong implementation/i.test(row),
        `${lang}/${agent}: 受入基準が誤実装を弁別できるか、が本軸の突合面である`,
      );
    });
  }
}

// ---- 4. 射程を export 下書き（cc-sdd / openspec）に絞る ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の validate-checks が ${CHECK_ID} の射程を export 下書きに絞る`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(row, `${lang}/${agent}: catalog に ${CHECK_ID} の行がある`);
      assert.ok(
        /cc-sdd/.test(row) && /openspec/.test(row),
        `${lang}/${agent}: 対象が cc-sdd / openspec の export 下書きである`,
      );
    });
  }
}

// ---- 5. gate にしない（warn-only・誤検知前提） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の validate-checks が ${CHECK_ID} を gate にしない（停止しない）`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      assert.ok(
        /gate にしない|止めない|never stops|does not stop|No gate|not a gate|gate でない|warn-only/i.test(c),
        `${lang}/${agent}: gate にしない（export/下流フローを止めない）旨に触れる`,
      );
    });
  }
}

// ---- 6. SKILL.md（4系統）が独立 Step 3.13 として requirement-oracle-check を結線する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の SKILL が ${CHECK_ID} を独立 Step 3.13 として結線する`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(c.includes(CHECK_ID), `${lang}/${agent}: SKILL が ${CHECK_ID} を参照する`);
      // 独立した Step 3.13 見出し（3.12 compass-rule-decay の後・Step 4 の前）。
      assert.ok(
        new RegExp(`### Step 3\\.13:.*\`?${CHECK_ID}\`?`).test(c),
        `${lang}/${agent}: SKILL に Step 3.13（${CHECK_ID}）の見出しがある`,
      );
      // warn-only / gate にしない。
      assert.ok(
        /warn-only|gate にしない|止めない|never stops|does not stop|No gate|gate でない/i.test(c),
        `${lang}/${agent}: SKILL 側にも gate にしない（停止しない）が明記される`,
      );
    });
  }
}

// ---- 7. SKILL 見出し階層が壊れていない（構造破壊の回帰防止） ----
// 機械検査ですり抜けた構造破壊（親見出し消失・子項目が宙に浮く）を回帰として落とす。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`7: ${lang}/${agent} の SKILL は Step 3.11/3.12/3.13/4 の見出し階層が保たれる`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      const i311 = c.indexOf("### Step 3.11");
      const i312 = c.indexOf("### Step 3.12");
      const i313 = c.indexOf("### Step 3.13");
      const i4 = c.indexOf("### Step 4");
      assert.ok(
        i311 > 0 && i312 > i311 && i313 > i312 && i4 > i313,
        `${lang}/${agent}: Step 3.11 < 3.12 < 3.13 < 4 の順で全見出しが存在する`,
      );
    });
  }
}

// ---- 8. 定義を二重に持たない（正本は intent-packets 終端判定・Anti-direction 250） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`8: ${lang}/${agent} の SKILL が ${CHECK_ID} の定義正本を intent-packets 終端判定に置き二重化しない`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(
        /intent-packets.*終端判定|終端判定.*intent-packets|termination test|packets.*termination/i.test(c),
        `${lang}/${agent}: 「誤実装を落とせる観測できる基準」の正本が intent-packets 終端判定にある旨に触れる`,
      );
    });
  }
}

// ---- 9. dogfood（.intent / .claude）が parent と同期している ----
// dogfood は gitignore でテスト対象外だが、本 run で parent が同期したことを存在で確認する。
// 配布 scaffold glossary には検査軸を積まない方針（A38/A41 と同じ）ゆえ、glossary 登録は dogfood でのみ確認する。
test("9: dogfood .claude/.intent に requirement-oracle-check が同期されている（存在すれば検査）", () => {
  const dogfoodChecks = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "rules", "validate-checks.md");
  const dogfoodSkill = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "SKILL.md");
  const dogfoodGlossary = path.join(REPO_ROOT, ".intent", "glossary.md");
  if (fs.existsSync(dogfoodChecks)) {
    assert.ok(
      fs.readFileSync(dogfoodChecks, "utf8").includes(CHECK_ID),
      "dogfood validate-checks が requirement-oracle-check を含む",
    );
    // dogfood checks は ja/claude と byte 同一（共有 catalog）。
    assert.equal(
      fs.readFileSync(dogfoodChecks, "utf8"),
      fs.readFileSync(checksPath("ja", "claude"), "utf8"),
      "dogfood validate-checks は ja/claude と byte 同一",
    );
  }
  if (fs.existsSync(dogfoodSkill)) {
    assert.ok(
      fs.readFileSync(dogfoodSkill, "utf8").includes("### Step 3.13:"),
      "dogfood SKILL が Step 3.13 を含む",
    );
  }
  if (fs.existsSync(dogfoodGlossary)) {
    assert.ok(
      fs.readFileSync(dogfoodGlossary, "utf8").includes(CHECK_ID),
      "dogfood glossary が requirement-oracle-check を含む",
    );
  }
});
