// unverified-hypothesis（意図版 Self-Probing・A30 validate 側）の不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: A30-packets が intent-packets に「決定の瞬間」の事前 probe（decision-probe.md）を入れた。
//   probe をすり抜けた仮説（証拠の裏が無いまま確定された暫定の確信）を、validate が export 前に事後で
//   拾うのが本検査軸 `unverified-hypothesis`。intent-validate は SKILL 本文を hash lock しない（非
//   SKILL_BODY_LOCKED）ので本文を正当に編集できる（corrective-intent validate と同じ横断知見）。
//   ここでは「検査軸が catalog にある・SKILL が手順を持つ・read-only/warn-only/意味判断・A29 と軸分離・
//   コールドスタート時 判定不能・反証第一・glossary 登録」を 4系統で名指し検査し、削除・ドリフトを
//   回帰として落とす（discriminative oracle・coinage-suspect / groundless-conclusion 追加時と同型）。
//
// 注: validate-checks.md は ja（claude=codex=dogfood）/ en（claude=codex）で byte 等価（export-dirs 等が
//   別途固定）。SKILL.md は本文等価で codex は frontmatter 2 行差分。ここでは内容アンカーを名指しする。
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

const CHECK_ID = "unverified-hypothesis";

function checksPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "SKILL.md");
}
function glossaryPath(lang) {
  return path.join(TEMPLATES, lang, "intent", "glossary.md");
}

// ---- 1. 検査カタログ（validate-checks.md）に unverified-hypothesis の行がある（4系統） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の validate-checks に ${CHECK_ID} 検査軸の行がある`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      // 表のデータ行（先頭 `| unverified-hypothesis |`）として存在する。
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(row, `${lang}/${agent}: catalog 表に ${CHECK_ID} のデータ行がある`);
      // 品質カテゴリ・深刻度 info（coinage-suspect / groundless-conclusion 同型）。
      assert.ok(
        /\b(info|情報)\b/.test(row),
        `${lang}/${agent}: ${CHECK_ID} の深刻度は info（誤検知前提の一方向報告）`,
      );
    });
  }
}

// ---- 2. read-only・warn-only(=gate にしない)・意味判断・機械検査に寄せない の不変条件 ----
// アンカー破壊→赤化→復元→緑（catalog 行 + 専用 Note + SKILL Step）。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の validate-checks が ${CHECK_ID} を read-only・意味判断・機械検査非依存で定義する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(lower.includes("read-only"), `${lang}/${agent}: read-only`);
      // 機械検査（intent-check.mjs）・必須フィールドの有無に寄せない（INV2/A1）。
      assert.ok(
        c.includes("intent-check.mjs"),
        `${lang}/${agent}: intent-check.mjs（機械検査）に寄せない旨に触れる`,
      );
      assert.ok(c.includes("INV2"), `${lang}/${agent}: 意味判断（INV2/A1）の根拠を参照する`);
      // canonical を自動改変しない。
      assert.ok(
        /auto-?edit|auto-?modif|auto-?rewrite|自動.*改変|自動で?書き換え/i.test(c),
        `${lang}/${agent}: canonical を自動改変しない`,
      );
    });
  }
}

// ---- 3. A29(groundless-conclusion) と検出軸を分ける（所見を混ぜない） ----
// A30 の最重要不変条件（DR61・INV37）: 仮説の証拠欠落 vs 結論の根拠欠落 を別軸に保つ。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の validate-checks が ${CHECK_ID} を groundless-conclusion(A29) と軸分離する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      assert.ok(c.includes("groundless-conclusion"), `${lang}/${agent}: groundless-conclusion を名指しする`);
      // 検出軸を分ける／所見を混ぜない の明文。
      assert.ok(
        /検出軸を分け|軸を分ける|separate (detection )?axis|keep its detection axis separate/i.test(c),
        `${lang}/${agent}: 検出軸を分ける旨を明記する`,
      );
      // 検証の軸（仮説の証拠欠落）であることに触れる（保存の軸=A29 との対比）。
      assert.ok(
        /検証の軸|verification axis|証拠.*無い|no evidence/i.test(c),
        `${lang}/${agent}: 仮説の証拠欠落（検証の軸）であることを述べる`,
      );
    });
  }
}

// ---- 4. コールドスタート回避（証拠 pool が空のとき即警告にせず判定不能） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の validate-checks が証拠 pool 空のとき判定不能を明示する（コールドスタート回避）`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      assert.ok(
        /証拠 pool.*空|空.*証拠 pool|evidence pool.*empty|empty.*evidence pool/i.test(c),
        `${lang}/${agent}: 証拠 pool が空のケースに触れる`,
      );
      assert.ok(
        /判定不能|cannot be judged/i.test(c),
        `${lang}/${agent}: 即警告にせず判定不能を明示する（Fail-Safe）`,
      );
    });
  }
}

// ---- 5. 反証を第一に（追認装置にしない・hallucination 抑止） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の validate-checks が反証/未検証の観点を所見の第一に置く`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      assert.ok(
        /反証|refut/i.test(c),
        `${lang}/${agent}: 反証（確信と矛盾する証拠）の観点に触れる`,
      );
    });
  }
}

// ---- 6. SKILL.md（4系統）が Step として unverified-hypothesis を結線する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の SKILL が ${CHECK_ID} を独立 Step として結線する`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(c.includes(CHECK_ID), `${lang}/${agent}: SKILL が ${CHECK_ID} を参照する`);
      // 独立した Step 見出し（3.7 groundless の後・Step 4 の前）。
      assert.ok(
        new RegExp(`### Step 3\\.8:.*\`?${CHECK_ID}\`?`).test(c),
        `${lang}/${agent}: SKILL に Step 3.8（${CHECK_ID}）の見出しがある`,
      );
      // warn-only / gate にしない。
      assert.ok(
        /warn-only|gate にしない|止めない|never stops|does not stop|No gate|gate でない/i.test(c),
        `${lang}/${agent}: SKILL 側にも gate にしない（停止しない）が明記される`,
      );
    });
  }
}

// ---- 7. SKILL 見出し階層が壊れていない（A30-packets の Critical バグ回帰防止） ----
// 機械検査ですり抜けた構造破壊（親見出し消失・子項目が宙に浮く）を回帰として落とす。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`7: ${lang}/${agent} の SKILL は Step 3.6/3.7/3.8/4 の見出し階層が保たれる`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      const i36 = c.indexOf("### Step 3.6");
      const i37 = c.indexOf("### Step 3.7");
      const i38 = c.indexOf("### Step 3.8");
      const i4 = c.indexOf("### Step 4");
      assert.ok(i36 > 0 && i37 > i36 && i38 > i37 && i4 > i38, `${lang}/${agent}: Step 3.6 < 3.7 < 3.8 < 4 の順で全見出しが存在する`);
    });
  }
}

// ---- 8. glossary に unverified-hypothesis が正規語として登録される（A29 と軸が別と明記） ----
for (const lang of LANGS) {
  test(`8: ${lang} の glossary に ${CHECK_ID} が登録され groundless-conclusion と軸が別と明記される`, () => {
    const c = fs.readFileSync(glossaryPath(lang), "utf8");
    const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
    assert.ok(row, `${lang}: glossary に ${CHECK_ID} のデータ行がある`);
    assert.ok(
      row.includes("groundless-conclusion"),
      `${lang}: groundless-conclusion と検出軸が別であることに触れる`,
    );
  });
}

// ---- 9. dogfood（.intent / .claude）が parent と同期している ----
// dogfood は gitignore でテスト対象外だが、本 run で parent が同期したことを存在で確認する
//   （subagent は .claude/ を書けないため parent 同期が必須・該当時のみ）。
test("9: dogfood .claude/.intent に unverified-hypothesis が同期されている（存在すれば検査）", () => {
  const dogfoodChecks = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "rules", "validate-checks.md");
  const dogfoodGlossary = path.join(REPO_ROOT, ".intent", "glossary.md");
  // dogfood は環境により未配置でも green（存在するときだけ同期を検査する）。
  if (fs.existsSync(dogfoodChecks)) {
    assert.ok(
      fs.readFileSync(dogfoodChecks, "utf8").includes(CHECK_ID),
      "dogfood validate-checks が unverified-hypothesis を含む",
    );
    // dogfood checks は ja/claude と byte 同一（共有 catalog）。
    assert.equal(
      fs.readFileSync(dogfoodChecks, "utf8"),
      fs.readFileSync(checksPath("ja", "claude"), "utf8"),
      "dogfood validate-checks は ja/claude と byte 同一",
    );
  }
  if (fs.existsSync(dogfoodGlossary)) {
    assert.ok(
      fs.readFileSync(dogfoodGlossary, "utf8").includes(CHECK_ID),
      "dogfood glossary が unverified-hypothesis を含む",
    );
  }
});
