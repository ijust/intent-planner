// evidence-anchored finding（検証所見の根拠固定・INV50/INV51/DR73/A39 validate 側）の不変条件テスト
//   （node:test 標準・依存ゼロ）。
//
// 背景: intent-validate は「評価する AI」であり、その所見の裏づけを構造的に強制する規律を持つ
//   （eval engineering の evidence-anchored scoring / RULERS の intent-planner 版・
//   「評価する AI の安定は正しさを意味しない」= Reliability without Validity）。各所見は canonical
//   からの逐語引用で根拠を固定し、逐語引用で裏づけできない所見は深刻度を「要修正」に上げない。
//   これは新しい検出軸（Step 3.x）ではなく、全所見の出し方にかける横断規律であり、Step 4（報告）＋
//   各検出の温度への上乗せとして乗せる（DR73・Anti-direction 230）。intent-validate は SKILL 本文を
//   hash lock しない（非 SKILL_BODY_LOCKED）ので本文を正当に編集できる。
//   ここでは「Step 4 に横断規律ブロックがある・逐語引用で根拠固定・裏づけできない所見は要修正に上げない・
//   判定は LLM 意味判断で機械照合に寄せない・7つ目の検査軸として並置しない（Step 3.x を増やさない）・
//   コールドスタート Fail-Safe・validate-checks.md に Note がある・手法でありツールでない（INV51）」を
//   4系統 + dogfood で名指し検査し、削除・ドリフトを回帰として落とす（discriminative oracle・
//   dangling-reference 追加時と同型だが「軸でなく横断規律」の点が異なる）。
//
// 注: validate-checks.md は ja（claude=codex=dogfood）/ en（claude=codex）で byte 等価。
//   SKILL.md は本文等価で codex は frontmatter 差分。ここでは内容アンカーを名指しする。
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

function checksPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "SKILL.md");
}

// ---- 1. SKILL.md Step 4 に横断規律ブロック（evidence-anchored / 逐語引用で根拠固定）がある ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の SKILL Step 4 に根拠固定の横断規律ブロックがある`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      const i4 = c.indexOf("### Step 4");
      assert.ok(i4 > 0, `${lang}/${agent}: Step 4 見出しがある`);
      const step4 = c.slice(i4);
      // 逐語引用（verbatim quote）で根拠を固定する。
      assert.ok(/verbatim/i.test(step4), `${lang}/${agent}: Step 4 に verbatim（逐語引用）の語がある`);
      assert.ok(
        /逐語引用|verbatim quote/i.test(step4),
        `${lang}/${agent}: Step 4 で逐語引用による根拠固定に触れる`,
      );
    });
  }
}

// ---- 2. 裏づけできない所見は要修正に上げない（深刻度 cap の報告規律・INV50） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の SKILL Step 4 が「裏づけできない所見は要修正に上げない」を明記する`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      const step4 = c.slice(c.indexOf("### Step 4"));
      assert.ok(
        /要修正に(?:は)?上げない|not raised to (?:")?must-fix|not raise[ds]? .* to (?:")?must-fix/i.test(step4),
        `${lang}/${agent}: 裏づけできない所見は要修正に上げない（深刻度 cap）を明記する`,
      );
      // INV50 の根拠を参照する。
      assert.ok(step4.includes("INV50"), `${lang}/${agent}: INV50 の根拠を参照する`);
    });
  }
}

// ---- 3. 判定は LLM 意味判断で機械照合に寄せない（INV2/A1・Anti-direction 232） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の SKILL Step 4 が引用判定を機械照合に寄せない`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      const step4 = c.slice(c.indexOf("### Step 4"));
      assert.ok(step4.includes("intent-check.mjs"), `${lang}/${agent}: intent-check.mjs（機械検査）に寄せない旨に触れる`);
      assert.ok(/grep/i.test(step4), `${lang}/${agent}: grep にも寄せない旨に触れる`);
      assert.ok(step4.includes("INV2"), `${lang}/${agent}: 意味判断（INV2/A1）の根拠を参照する`);
      // 表層一致の罠（string-match）に落ちない。
      assert.ok(
        /string-match|表層一致|surface-match/i.test(step4),
        `${lang}/${agent}: 機械 string-match の表層一致の罠に触れる`,
      );
    });
  }
}

// ---- 4. 7つ目の検査軸として並置しない（Step 3.x を増やさない・横断規律である・DR73/Anti-direction 230） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の SKILL Step 4 が「7つ目の検査軸でなく横断規律」であることを明記する`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      const step4 = c.slice(c.indexOf("### Step 4"));
      // 横断規律である（全所見にかかる・新しい検出軸ではない）。
      assert.ok(
        /横断規律|cross-cutting discipline/i.test(step4),
        `${lang}/${agent}: 横断規律であることを明記する`,
      );
      assert.ok(step4.includes("DR73"), `${lang}/${agent}: DR73 の根拠を参照する`);
      // Step 3.x を増やさない（7つ目の軸として並置しない）。
      assert.ok(
        /検出軸として並置しない|検出軸ではない|Step 3\.x を増やさない|not (?:a|placed as a).*(?:seventh|detection axis)|NOT a new detection axis/i.test(step4),
        `${lang}/${agent}: 7つ目の検査軸として並置しない旨を明記する`,
      );
      // 実際に Step 3.x を新設していない — 構造回帰防止。
      // 番号の絶対値（「3.17 が無い」）で表現すると、他の正当な検査軸の追加で偽陽性になるため、
      // 「根拠固定（evidence-anchored / 逐語引用）を主題とする Step 3.x が存在しないこと」で判定する。
      const evidenceAnchoredStep = c
        .split("\n")
        .find((l) => /^### Step 3\.\d+/.test(l) && /evidence-anchored|根拠固定|逐語引用|verbatim/i.test(l));
      assert.ok(
        evidenceAnchoredStep === undefined,
        `${lang}/${agent}: 本規律のために Step 3.x を新設していない（横断規律ゆえ軸を増やさない）— 実際=「${evidenceAnchoredStep}」`,
      );
    });
  }
}

// ---- 5. コールドスタート Fail-Safe（canonical 空のとき所見を要修正に上げない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の SKILL Step 4 がコールドスタート Fail-Safe を持つ`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      const step4 = c.slice(c.indexOf("### Step 4"));
      assert.ok(
        /canonical が空|canonical is empty|引用の裏づけ不能|cannot be backed/i.test(step4),
        `${lang}/${agent}: canonical 空/未作成のコールドスタート異常系に触れる`,
      );
      // 誤って全所見を抑圧しない（unverified-hypothesis の Fail-Safe と同型）。
      assert.ok(
        /unverified-hypothesis/i.test(step4),
        `${lang}/${agent}: unverified-hypothesis の Fail-Safe と同型である旨に触れる`,
      );
    });
  }
}

// ---- 6. validate-checks.md に根拠固定の Note がある（軸行でなく横断規律の注記・4系統） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の validate-checks に根拠固定の横断規律 Note がある（軸行でない）`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      // 逐語引用・横断規律・INV50/DR73 を注記に持つ。
      assert.ok(/verbatim/i.test(c), `${lang}/${agent}: validate-checks に verbatim の語がある`);
      assert.ok(c.includes("INV50"), `${lang}/${agent}: validate-checks が INV50 を参照する`);
      assert.ok(c.includes("DR73"), `${lang}/${agent}: validate-checks が DR73 を参照する`);
      // カタログ表に軸行を足していない（横断規律ゆえ）— evidence-anchored / 検証所見の根拠固定 の
      //   データ行（| ... |）が表に無いことを確認する。
      const hasAxisRow = c
        .split("\n")
        .some((l) => /^\|\s*(evidence-anchored|検証所見の根拠固定)/i.test(l.trim()));
      assert.ok(!hasAxisRow, `${lang}/${agent}: 横断規律をカタログ表の軸行として足していない`);
    });
  }
}

// ---- 7. 手法でありツールでない（INV51・golden/kappa/pairwise/promptfoo を内蔵しない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`7: ${lang}/${agent} の validate-checks が「手法でありツールでない」（INV51）を明記する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      assert.ok(c.includes("INV51"), `${lang}/${agent}: validate-checks が INV51 を参照する`);
      // ツール/データセット系を製品へ内蔵しない（例示語のいずれかに触れる）。
      assert.ok(
        /golden dataset|kappa|pairwise|promptfoo|回帰スイート|regression suite/i.test(c),
        `${lang}/${agent}: 評価基盤（golden/kappa/pairwise/promptfoo 等）を内蔵しない旨に触れる`,
      );
    });
  }
}

// ---- 8. dogfood（.claude / docs）が parent と同期している ----
// dogfood は gitignore でテスト対象外だが、本 run で parent が同期したことを存在で確認する。
test("8: dogfood .claude と docs/theory.md が evidence-anchored を同期している（存在すれば検査）", () => {
  const dogfoodSkill = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "SKILL.md");
  const dogfoodChecks = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "rules", "validate-checks.md");
  if (fs.existsSync(dogfoodSkill)) {
    // dogfood SKILL は ja/claude と byte 同一（本文等価・claude 系）。
    assert.equal(
      fs.readFileSync(dogfoodSkill, "utf8"),
      fs.readFileSync(skillPath("ja", "claude"), "utf8"),
      "dogfood SKILL は ja/claude と byte 同一",
    );
  }
  if (fs.existsSync(dogfoodChecks)) {
    assert.equal(
      fs.readFileSync(dogfoodChecks, "utf8"),
      fs.readFileSync(checksPath("ja", "claude"), "utf8"),
      "dogfood validate-checks は ja/claude と byte 同一",
    );
  }
  // theory.md（doc-sync・INV10）に根拠固定の段落がある。
  const theory = path.join(REPO_ROOT, "docs", "theory.md");
  assert.ok(
    /evidence-anchored finding|所見の根拠固定/.test(fs.readFileSync(theory, "utf8")),
    "docs/theory.md に evidence-anchored finding の段落がある",
  );
});

// ---- 9. 記号台帳（symbol-labels.json）が INV50/INV51/DR73/A39 の短名を持つ（配布物の記号置換・INV59） ----
test("9: symbol-labels.json が INV50/INV51/DR73/A39 の ja/en 短名を持つ", () => {
  const ledger = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "scripts", "symbol-labels.json"), "utf8"),
  );
  for (const sym of ["INV50", "INV51", "DR73", "A39"]) {
    assert.ok(ledger[sym], `台帳に ${sym} がある`);
    assert.ok(ledger[sym].ja && ledger[sym].en, `${sym} が ja/en 短名を持つ`);
  }
});
