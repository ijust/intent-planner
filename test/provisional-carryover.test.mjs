// pkt-20260704-provisional-carryover-93v4（暫定・未定の持ち越し検査）の
//   不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: 「推測は人間レビューまで暫定」「未定スロットは再訪条件付きで保持」の規律はあるが、保持したまま
//   packet の進行段階（state）が verifying/done へ進むのを見張る目が無い。暫定のまま done になった決定は
//   誰もレビューしないうちに既成事実になる。validate 新軸 `provisional-carryover` が (1)進行との矛盾
//   (2)再訪条件の成立 (3)未確認の暫定標識 を read-only/warn-only で名指しする（C38/C3/C9/C10・A49・INV63）。
//   最重要の設計は「未定の保持そのものは罰しない」（Anti-direction 300）— draft/ready のまま未定を保つ
//   packet では沈黙し、警告対象は進行段階との矛盾（done なのに未回収）に限る。
//   intent-validate は SKILL 本文を hash lock しない（非 SKILL_BODY_LOCKED）ので本文を正当に編集できる。
//
// ここでは packet の Validation 判別オラクル (a)〜(d) をアンカーで discriminative に守る:
//   (a) state=done + 未定 残存を名指しする規約
//   (b) state=draft + 未定 保持で沈黙する規約（未定の保持を罰しない・Anti-direction 300 の核心）
//   (c) canonical 不変（read-only・自動確定/自動昇格/state 自動変更をしない・Anti-direction 303）
//   (d) Decisions 節なし旧 packet を警告対象にしない（後方互換）
//   + read-only/no-gate/意味判断（機械閾値・機械照合に寄せない）・既存軸との軸分離・4系統パリティ・glossary
//
// 注: validate-checks.md は ja（claude=codex=dogfood）/ en（claude=codex）で byte 等価。
//   SKILL.md は本文等価で codex は frontmatter 差分。glossary 登録は dogfood でのみ検査する。
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

const CHECK_ID = "provisional-carryover";

function checksPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "SKILL.md");
}

// ---- 1. 検査カタログに provisional-carryover の行がある（4系統・深刻度 推奨/recommended） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の validate-checks に ${CHECK_ID} 検査軸の行がある`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(row, `${lang}/${agent}: catalog 表に ${CHECK_ID} のデータ行がある`);
      const cells = row.split("|").map((s) => s.trim());
      const severity = cells[cells.length - 2];
      const ok = lang === "ja" ? severity === "推奨" : severity.toLowerCase() === "recommended";
      assert.ok(ok, `${lang}/${agent}: 深刻度が 推奨/recommended — 実際=「${severity}」`);
    });
  }
}

// ---- 2. read-only・no-gate・意味判断（機械閾値・機械照合に寄せない）の不変条件 ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の ${CHECK_ID} が read-only・意味判断（機械閾値・機械照合に寄せない）`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(/intent-check\.mjs/.test(row), `${lang}/${agent}: scripts/intent-check.mjs に寄せない旨を持つ`);
      assert.ok(/INV2\/A1/.test(row), `${lang}/${agent}: INV2/A1（意味判断・機械検査でない）に触れる`);
      // 経過日数などの機械閾値を持たない（INV2 の核）。
      const noThreshold = lang === "ja" ? /機械閾値|経過日数/ : /numeric threshold|elapsed days/i;
      assert.ok(noThreshold.test(row), `${lang}/${agent}: 経過日数などの機械閾値を持たない明記`);
      // 自動確定/自動昇格/state 自動変更をしない（Anti-direction 303）。
      assert.ok(/303/.test(row), `${lang}/${agent}: Anti-direction 303（自動確定/自動変更しない）を継承`);
    });
  }
}

// ---- 3(b). 未定の保持そのものを罰しない（Anti-direction 300 の核心・沈黙の判別オラクル） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3(b): ${lang}/${agent} の ${CHECK_ID} が未定の保持を罰しない（draft/ready では沈黙・AD300）`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(/300/.test(row), `${lang}/${agent}: Anti-direction 300（未定の保持を罰しない）に触れる`);
      const silent = lang === "ja" ? /draft\/ready.*沈黙|沈黙.*draft\/ready|保持を罰しない/ : /draft\/ready.*silent|silent.*draft\/ready|do not penalize/i;
      assert.ok(silent.test(row), `${lang}/${agent}: draft/ready のまま未定を保持する packet では沈黙する明記`);
    });
  }
}

// ---- 4. 既存軸（ambiguous-deferred-phrasing / decision-slot-empty / compass-rule-decay）と軸分離する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の ${CHECK_ID} が既存の未確定/滞留系軸と軸分離する`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      assert.ok(row.includes("ambiguous-deferred-phrasing"), `${lang}/${agent}: ambiguous-deferred-phrasing と軸を分ける`);
      assert.ok(row.includes("decision-slot-empty"), `${lang}/${agent}: decision-slot-empty と軸を分ける`);
      assert.ok(row.includes("compass-rule-decay"), `${lang}/${agent}: compass-rule-decay と軸を分ける`);
    });
  }
}

// ---- 5(d). 後方互換: Decisions 節なし旧 packet を警告対象にしない ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5(d): ${lang}/${agent} の ${CHECK_ID} が Decisions 節なし旧 packet を警告対象にしない`, () => {
      const c = fs.readFileSync(checksPath(lang, agent), "utf8");
      const row = c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
      const backcompat = lang === "ja" ? /後方互換|未記入/ : /backward.compat|unfilled/i;
      assert.ok(backcompat.test(row), `${lang}/${agent}: Decisions 節なし旧 packet を「未記入」として扱う後方互換の明記`);
    });
  }
}

// ---- 6. SKILL.md（4系統）が独立 Step 3.16 として本軸を結線する（見出し順も保つ） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の SKILL が独立 Step 3.16 として ${CHECK_ID} を結線する`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(c.includes("### Step 3.16"), `${lang}/${agent}: Step 3.16 見出しがある`);
      assert.ok(c.includes(CHECK_ID), `${lang}/${agent}: SKILL 本文が ${CHECK_ID} を含む`);
      const i315 = c.indexOf("### Step 3.15");
      const i316 = c.indexOf("### Step 3.16");
      const i4 = c.indexOf("### Step 4");
      assert.ok(i315 > 0 && i316 > i315 && i4 > i316, `${lang}/${agent}: Step 3.15 < 3.16 < 4 の順で見出しが存在する`);
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
}

// ---- 8. dogfood（.claude / .intent）が parent と同期している ----
test("8: dogfood .claude/.intent に provisional-carryover が同期されている（存在すれば検査）", () => {
  const dogfoodChecks = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "rules", "validate-checks.md");
  const dogfoodSkill = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "SKILL.md");
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
    assert.ok(fs.readFileSync(dogfoodSkill, "utf8").includes("### Step 3.16:"), "dogfood SKILL が Step 3.16 を含む");
  }
  if (fs.existsSync(dogfoodGlossary)) {
    assert.ok(fs.readFileSync(dogfoodGlossary, "utf8").includes(CHECK_ID), "dogfood glossary が本軸を含む");
  }
});
