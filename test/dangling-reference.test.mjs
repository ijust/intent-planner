// dangling-reference（canonical 内の番号付き相互参照の宙吊り検出・C20/A35 validate 側）の不変条件テスト
//   （node:test 標準・依存ゼロ）。
//
// 背景: canonical-slimming の compass 遡及退避で、番号付き Anti-direction をブロック move して参照先が
//   消える dangling reference を起こしたのが無検出で通った（OQ-slim5）。pull 規律は「参照先が実在する」
//   ことを暗黙の前提にしており、退避・統合・削除のたびにその前提が静かに壊れうるのに validate に拾う軸が
//   無かった。本検査軸 `dangling-reference`（Doorstop の suspect-link 相当）はそれを export 前に拾う。
//   intent-validate は SKILL 本文を hash lock しない（非 SKILL_BODY_LOCKED）ので本文を正当に編集できる
//   （unverified-hypothesis / groundless-conclusion 追加時と同じ横断知見）。
//   ここでは「検査軸が catalog にある・SKILL が独立 Step を持つ・read-only/no-gate/LLM 文脈（機械検査に
//   寄せない）・既存3軸と軸分離・対象を compass 番号参照に絞る（memory/parent_intents 対象外）・見出し
//   階層・glossary 登録」を 4系統で名指し検査し、削除・ドリフトを回帰として落とす（discriminative oracle・
//   coinage-suspect / groundless-conclusion / unverified-hypothesis 追加時と同型）。
//
// 注: validate-checks.md は ja（claude=codex=dogfood）/ en（claude=codex）で byte 等価。
//   SKILL.md は本文等価で codex は frontmatter 2 行差分。ここでは内容アンカーを名指しする。
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

const CHECK_ID = "dangling-reference";

function checksPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "SKILL.md");
}
function glossaryPath(lang) {
  return path.join(TEMPLATES, lang, "intent", "glossary.md");
}

// ---- 1. 検査カタログ（validate-checks.md）に dangling-reference の行がある（4系統・深刻度 info） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の validate-checks に ${CHECK_ID} 検査軸の行がある`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(row, `${lang}/${agent}: catalog 表に ${CHECK_ID} のデータ行がある`);
      // 深刻度 info（誤検知前提の一方向報告・既存3軸同型）。
      assert.ok(
        /\b(info|情報)\b/.test(row),
        `${lang}/${agent}: ${CHECK_ID} の深刻度は info（誤検知前提の一方向報告）`,
      );
    });
  }
}

// ---- 2. read-only・no-gate・LLM 文脈（機械検査に寄せない）の不変条件 ----
// アンカー破壊→赤化→復元→緑（catalog 行 + 専用 Note + SKILL Step）。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の validate-checks が ${CHECK_ID} を read-only・LLM 文脈・機械検査非依存で定義する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(lower.includes("read-only"), `${lang}/${agent}: read-only`);
      // 機械検査（intent-check.mjs）・grep に寄せない（INV2/A1・既存3軸と質を揃える）。
      assert.ok(
        c.includes("intent-check.mjs"),
        `${lang}/${agent}: intent-check.mjs（機械検査）に寄せない旨に触れる`,
      );
      assert.ok(c.includes("INV2"), `${lang}/${agent}: 意味判断（INV2/A1）の根拠を参照する`);
      // grep にも寄せないことを明記（dangling は機械照合に見えるが LLM 文脈で読む）。
      assert.ok(/grep/i.test(c), `${lang}/${agent}: grep にも寄せない旨に触れる`);
    });
  }
}

// ---- 3. 既存3軸（coinage/groundless/unverified）と検出軸を分ける（所見を混ぜない） ----
// INV42/DR67 の不変条件: 参照先の実在欠落 を意味/根拠/証拠の3軸と別に保つ。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の validate-checks が ${CHECK_ID} を既存3軸と軸分離する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      // 既存3軸を名指しして対比する。
      assert.ok(c.includes("coinage-suspect"), `${lang}/${agent}: coinage-suspect を名指す`);
      assert.ok(c.includes("groundless-conclusion"), `${lang}/${agent}: groundless-conclusion を名指す`);
      assert.ok(c.includes("unverified-hypothesis"), `${lang}/${agent}: unverified-hypothesis を名指す`);
      // 検出軸を分ける／所見を混ぜない の明文。
      assert.ok(
        /検出軸を分け|軸を分ける|separate (detection )?axis|keep its detection axis separate/i.test(c),
        `${lang}/${agent}: 検出軸を分ける旨を明記する`,
      );
      // この軸 = 参照先の実在欠落（指す先の有無）であることに触れる。
      assert.ok(
        /実在欠落|参照先の実在|missing referent|reference points to|指す先/i.test(c),
        `${lang}/${agent}: 参照先の実在欠落（この軸の核）であることを述べる`,
      );
    });
  }
}

// ---- 4. 対象を compass 番号参照に絞る（memory リンク・parent_intents は対象外） ----
// DR67/OQ-dangling-2 の不変条件: 対象を広げて誤検知で溢れさせない（Anti-direction 218）。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の validate-checks が対象を compass 番号参照に絞り memory/parent_intents を除外する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      // 対象 = compass の番号付き相互参照（Anti-direction N / INV N / DR N）。
      assert.ok(c.includes("Anti-direction N"), `${lang}/${agent}: Anti-direction N を対象に挙げる`);
      assert.ok(/`INV N`/.test(c) && /`DR N`/.test(c), `${lang}/${agent}: INV N / DR N を対象に挙げる`);
      // memory リンク（[[slug]]）は対象外（別リポで照合不能）。
      assert.ok(
        /\[\[memory-slug\]\]|memory-slug|memory.*別リポ|memory is in a separate repo/i.test(c),
        `${lang}/${agent}: memory リンクが対象外である根拠に触れる`,
      );
      // packet の parent_intents 参照は対象外。
      assert.ok(
        /parent_intents/.test(c),
        `${lang}/${agent}: packet の parent_intents が対象外であることに触れる`,
      );
    });
  }
}

// ---- 5. gate にしない（warn-only・誤検知前提・Anti-direction 218） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の validate-checks が ${CHECK_ID} を gate にしない（停止しない）`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      assert.ok(
        /gate にしない|止めない|never stops|does not stop|No gate|not a gate|gate でない/i.test(c),
        `${lang}/${agent}: gate にしない（export/実装を止めない）旨に触れる`,
      );
    });
  }
}

// ---- 6. SKILL.md（4系統）が独立 Step 3.9 として dangling-reference を結線する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の SKILL が ${CHECK_ID} を独立 Step 3.9 として結線する`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(c.includes(CHECK_ID), `${lang}/${agent}: SKILL が ${CHECK_ID} を参照する`);
      // 独立した Step 3.9 見出し（3.8 unverified の後・Step 4 の前）。
      assert.ok(
        new RegExp(`### Step 3\\.9:.*\`?${CHECK_ID}\`?`).test(c),
        `${lang}/${agent}: SKILL に Step 3.9（${CHECK_ID}）の見出しがある`,
      );
      // warn-only / gate にしない。
      assert.ok(
        /warn-only|gate にしない|止めない|never stops|does not stop|No gate|gate でない/i.test(c),
        `${lang}/${agent}: SKILL 側にも gate にしない（停止しない）が明記される`,
      );
    });
  }
}

// ---- 7. SKILL 見出し階層が壊れていない（構造破壊の回帰防止・Anti-direction 201） ----
// 機械検査ですり抜けた構造破壊（親見出し消失・子項目が宙に浮く）を回帰として落とす。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`7: ${lang}/${agent} の SKILL は Step 3.6/3.7/3.8/3.9/4 の見出し階層が保たれる`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      const i36 = c.indexOf("### Step 3.6");
      const i37 = c.indexOf("### Step 3.7");
      const i38 = c.indexOf("### Step 3.8");
      const i39 = c.indexOf("### Step 3.9");
      const i4 = c.indexOf("### Step 4");
      assert.ok(
        i36 > 0 && i37 > i36 && i38 > i37 && i39 > i38 && i4 > i39,
        `${lang}/${agent}: Step 3.6 < 3.7 < 3.8 < 3.9 < 4 の順で全見出しが存在する`,
      );
    });
  }
}

// ---- 8. glossary に dangling-reference が正規語として登録される（既存3軸と軸が別と明記） ----
for (const lang of LANGS) {
  test(`8: ${lang} の glossary に ${CHECK_ID} が登録され既存3軸と軸が別と明記される`, () => {
    const c = fs.readFileSync(glossaryPath(lang), "utf8");
    const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
    assert.ok(row, `${lang}: glossary に ${CHECK_ID} のデータ行がある`);
    // 既存3軸との軸分離に触れる（coinage/groundless/unverified のいずれかを名指す）。
    assert.ok(
      /coinage|groundless|unverified|既存3軸|existing three/i.test(row),
      `${lang}: 既存3軸と検出軸が別であることに触れる`,
    );
  });
}

// ---- 9. dogfood（.intent / .claude）が parent と同期している ----
// dogfood は gitignore でテスト対象外だが、本 run で parent が同期したことを存在で確認する
//   （subagent は .claude/ を書けないため parent 同期が必須・該当時のみ）。
test("9: dogfood .claude/.intent に dangling-reference が同期されている（存在すれば検査）", () => {
  const dogfoodChecks = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "rules", "validate-checks.md");
  const dogfoodGlossary = path.join(REPO_ROOT, ".intent", "glossary.md");
  if (fs.existsSync(dogfoodChecks)) {
    assert.ok(
      fs.readFileSync(dogfoodChecks, "utf8").includes(CHECK_ID),
      "dogfood validate-checks が dangling-reference を含む",
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
      "dogfood glossary が dangling-reference を含む",
    );
  }
});
