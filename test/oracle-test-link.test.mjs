// pkt-20260704-oracle-test-link-ayzt（受入オラクルと実テストの対応記録・verified-by の実線化）の
//   不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: A38（invariant-oracle-missing）は「Invariant に検査オラクルが在るか」を実装前に見えるようにした。
//   本 packet はその実装後側で、packet の受入オラクル（## Validation）が実装後どの実テストで守られているかを
//   verified-by（## Verification protocol）として writeback が実測記入し、intent-validate の新軸
//   `oracle-test-link-missing` が「対応の切れ（テスト消失）・未対応」を read-only/warn-only で名指しする。
//   書き手（writeback）と読み手（validate）を対で結線して往復を閉じる（C38/C8/C10・A49・INV63）。
//   intent-validate / intent-writeback は SKILL 本文を hash lock しない（非 SKILL_BODY_LOCKED）ので
//   本文を正当に編集できる（dangling-reference / requirement-oracle-check 追加時と同じ横断知見）。
//
// ここでは packet の Validation 判別オラクル (a)〜(e) をアンカーで discriminative に守る:
//   (a) validate 新軸が「対応の切れ（テスト消失）」を検出する規約を持つ
//   (b/沈黙) 全対応が健在なら黙る・負例で沈黙する規約を持つ
//   (c/未対応) 対応が無いオラクルを「未対応」明示で扱い推測で埋めない規約を持つ
//   (e/後方互換) Verification protocol 節が無い旧 packet を警告対象にしない規約を持つ
//   + writeback が step 0 で verified-by を実測記入する工程を持つ（捏造ゼロ）
//   + read-only/no-gate/LLM 文脈・既存軸との軸分離・4系統パリティ・glossary 登録（dogfood）
//
// 注: validate-checks.md / writeback-protocol.md は ja（claude=codex=dogfood）/ en（claude=codex）で byte 等価。
//   SKILL.md は本文等価で codex は frontmatter 差分。glossary 登録は dogfood（.intent/glossary.md）でのみ検査する。
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

const CHECK_ID = "oracle-test-link-missing";

function checksPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "SKILL.md");
}
function writebackRulePath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-writeback", "rules", "writeback-protocol.md");
}

// ---- 1. 検査カタログに oracle-test-link-missing の行がある（4系統・深刻度 推奨/recommended） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の validate-checks に ${CHECK_ID} 検査軸の行がある`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(row, `${lang}/${agent}: catalog 表に ${CHECK_ID} のデータ行がある`);
      const cells = row.split("|").map((s) => s.trim());
      const severity = cells[cells.length - 2];
      const ok = lang === "ja" ? severity === "推奨" : severity.toLowerCase() === "recommended";
      assert.ok(ok, `${lang}/${agent}: 深刻度が 推奨/recommended（品質リスク・A38 姉妹軸と同格）— 実際=「${severity}」`);
    });
  }
}

// ---- 2. read-only・no-gate・LLM 文脈（機械検査に寄せない）の不変条件 ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の ${CHECK_ID} が read-only・no-gate・意味判断（機械照合に寄せない）`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      // 機械検査に寄せない（intent-check.mjs / 正規表現の機械的一致を否定する明記）。
      assert.ok(/intent-check\.mjs/.test(row), `${lang}/${agent}: scripts/intent-check.mjs に寄せない旨を持つ`);
      assert.ok(/INV2\/A1/.test(row), `${lang}/${agent}: INV2/A1（意味判断・機械検査でない）に触れる`);
      // 検査層は自動改変しない（記入は writeback の別アクション）。
      const writerAnchor = lang === "ja" ? "writeback" : "writeback";
      assert.ok(row.includes(writerAnchor), `${lang}/${agent}: 記入は writeback の別アクションである旨に触れる`);
    });
  }
}

// ---- 3. 既存軸（invariant-oracle-missing / trace-downstream-missing）と軸分離する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の ${CHECK_ID} が invariant-oracle-missing / trace-downstream-missing と軸分離する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(row.includes("invariant-oracle-missing"), `${lang}/${agent}: invariant-oracle-missing と軸を分ける明記`);
      assert.ok(row.includes("trace-downstream-missing"), `${lang}/${agent}: trace-downstream-missing と軸を分ける明記`);
    });
  }
}

// ---- 4. 後方互換: Verification protocol 節が無い旧 packet を警告対象にしない（(e)） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4(e): ${lang}/${agent} の ${CHECK_ID} が Verification protocol 節なし旧 packet を警告対象にしない`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(row.includes("Verification protocol"), `${lang}/${agent}: Verification protocol 節に触れる`);
      const backcompat = lang === "ja" ? /後方互換|未記入|未観測/ : /backward-compat|unfilled|unobserved/i;
      assert.ok(backcompat.test(row), `${lang}/${agent}: 節なし旧 packet を「未記入/未観測」として扱う後方互換の明記`);
    });
  }
}

// ---- 5. SKILL.md（4系統）が独立 Step 3.15 として本軸を結線する（見出し順も保つ） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の SKILL が独立 Step 3.15 として ${CHECK_ID} を結線する`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(c.includes("### Step 3.15"), `${lang}/${agent}: Step 3.15 見出しがある`);
      assert.ok(c.includes(CHECK_ID), `${lang}/${agent}: SKILL 本文が ${CHECK_ID} を含む`);
      // Step 3.14 < 3.15 < 4 の順（構造破壊の回帰防止）。
      const i314 = c.indexOf("### Step 3.14");
      const i315 = c.indexOf("### Step 3.15");
      const i4 = c.indexOf("### Step 4");
      assert.ok(i314 > 0 && i315 > i314 && i4 > i315, `${lang}/${agent}: Step 3.14 < 3.15 < 4 の順で見出しが存在する`);
    });
  }
}

// ---- 6. writeback-protocol（4系統）が §7 に verified-by 実測記入の step 0 を持つ（捏造ゼロ・任意・gate でない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の writeback-protocol が verified-by の実測記入工程を持つ（捏造ゼロ・任意）`, () => {
      const w = fs.readFileSync(writebackRulePath(lang, agent), "utf8");
      assert.ok(w.includes("verified-by"), `${lang}/${agent}: writeback に verified-by 記入工程がある`);
      // 実測ベース・捏造ゼロ（存在しないテストを書かない）。
      const measured = lang === "ja" ? /実測/ : /measurement/i;
      assert.ok(measured.test(w), `${lang}/${agent}: 実測に基づく（measurement-based）明記`);
      // Anti-direction 299（捏造）と 298（gate 化しない）を継承。
      assert.ok(/299/.test(w) && /298/.test(w), `${lang}/${agent}: Anti-direction 299（捏造ゼロ）/298（gate でない）を継承`);
    });
  }
}

// ---- 7. rules が claude⇔codex で byte 等価（パリティ） ----
for (const lang of LANGS) {
  test(`7: ${lang} の validate-checks が claude⇔codex で byte 等価`, () => {
    assert.equal(
      fs.readFileSync(checksPath(lang, "claude"), "utf8"),
      fs.readFileSync(checksPath(lang, "codex"), "utf8"),
      `${lang}: validate-checks が claude⇔codex で byte 等価`,
    );
  });
  test(`7: ${lang} の writeback-protocol が claude⇔codex で byte 等価`, () => {
    assert.equal(
      fs.readFileSync(writebackRulePath(lang, "claude"), "utf8"),
      fs.readFileSync(writebackRulePath(lang, "codex"), "utf8"),
      `${lang}: writeback-protocol が claude⇔codex で byte 等価`,
    );
  });
}

// ---- 8. dogfood（.claude / .intent）が parent と同期している ----
test("8: dogfood .claude/.intent に oracle-test-link-missing が同期されている（存在すれば検査）", () => {
  const dogfoodChecks = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "rules", "validate-checks.md");
  const dogfoodSkill = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "SKILL.md");
  const dogfoodWriteback = path.join(REPO_ROOT, ".claude", "skills", "intent-writeback", "rules", "writeback-protocol.md");
  const dogfoodGlossary = path.join(REPO_ROOT, ".intent", "glossary.md");
  if (fs.existsSync(dogfoodChecks)) {
    assert.ok(fs.readFileSync(dogfoodChecks, "utf8").includes(CHECK_ID), "dogfood validate-checks が本軸を含む");
    assert.equal(
      fs.readFileSync(dogfoodChecks, "utf8"),
      fs.readFileSync(checksPath("ja", "claude"), "utf8"),
      "dogfood validate-checks は ja/claude と byte 同一",
    );
  }
  if (fs.existsSync(dogfoodSkill)) {
    assert.ok(fs.readFileSync(dogfoodSkill, "utf8").includes("### Step 3.15:"), "dogfood SKILL が Step 3.15 を含む");
  }
  if (fs.existsSync(dogfoodWriteback)) {
    assert.ok(fs.readFileSync(dogfoodWriteback, "utf8").includes("verified-by"), "dogfood writeback が verified-by 工程を含む");
  }
  if (fs.existsSync(dogfoodGlossary)) {
    assert.ok(fs.readFileSync(dogfoodGlossary, "utf8").includes(CHECK_ID), "dogfood glossary が本軸を含む");
  }
});
