// pkt-20260704-validate-starter-coverage-5oqg（A40・DR83 宿主⑤・INV57）の構造オラクル。
//
// 背景: 定石の発火はどの宿主でも「弱ければ黙る」ため見落としが静かに通過しうる。供給側（発火）と
//   検査側（validate）を揃えるため、intent-validate に「明白に関係する定石領域が採用も否認も検討も
//   されていない packet を warn-only で名指しする」検出軸 starter-coverage-gap を足した。
//   検出軸追加の定型（A29/A30/A38/A41 と同型）に沿い、catalog 1行 + 注記節 + 独立 Step を 4系統へ
//   足したことを discriminative に名指しする。軸行・Step・器読み込み・既存軸との分離を消す退化を落とす。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const VARIANTS = [
  ["ja", "claude"], ["en", "claude"], ["ja", "codex"], ["en", "codex"],
];
const AXIS = "starter-coverage-gap";

function checksPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-validate", "SKILL.md");
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}

// ---- 1: 検査カタログに starter-coverage-gap 軸行がある ----
test("starter-coverage-gap: 検査カタログに軸行がある（4系統）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(checksPath(lang, agent));
    assert.match(t, new RegExp(`\\|\\s*${AXIS}\\s*\\|`), `${lang}/${agent}: カタログに ${AXIS} 行がある`);
    // 定石カタログを対象にする。
    assert.match(t, /constraint-starters/, `${lang}/${agent}: 定石カタログを照合対象にする`);
    // 器の採否記録を読む（検討済みは黙る）。
    assert.match(t, /constraint-ledger\.md/, `${lang}/${agent}: 採否記録の器を読む`);
    // A40/DR83 宿主⑤ への帰属。
    assert.match(t, /DR83/, `${lang}/${agent}: DR83（宿主⑤）へ帰属する`);
  }
});

// ---- 2: SKILL に独立 Step 3.14 がある ----
test("starter-coverage-gap: SKILL に独立 Step（検出軸追加の定型）がある（4系統）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(skillPath(lang, agent));
    assert.match(t, new RegExp(AXIS), `${lang}/${agent}: SKILL が ${AXIS} を持つ`);
    // Step 3.14 見出し（既存 Step 3.13 の後に足した独立 Step）。
    assert.match(t, /Step 3\.14/, `${lang}/${agent}: Step 3.14 が追加されている`);
    // warn-only（gate にしない・停止しない）。
    const warnOnly = lang === "ja"
      ? /(export・実装を止めない|gate にせず|warn-only)/
      : /(does not stop export|not a gate|warn-only)/i;
    assert.match(t, warnOnly, `${lang}/${agent}: warn-only（gate にしない）`);
    // 自動採用しない（人が判断）。
    const noAutoAdopt = lang === "ja"
      ? /(自動で採用しない|採用は人)/
      : /(do not auto-adopt|adoption is a human)/i;
    assert.match(t, noAutoAdopt, `${lang}/${agent}: 自動採用しない`);
  }
});

// ---- 3: 既存の品質系軸と検出軸を分ける（所見を混ぜない）----
test("starter-coverage-gap: 既存軸と検出軸を分ける明文がある（軸分離）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(checksPath(lang, agent));
    // requirement-oracle-check / requirements-smell / invariant-uninherited と別軸である旨。
    assert.match(t, /requirements-smell/, `${lang}/${agent}: requirements-smell と分ける`);
    assert.match(t, /invariant-uninherited/, `${lang}/${agent}: invariant-uninherited と分ける`);
    const separate = lang === "ja"
      ? /検出軸を分け.*所見を混ぜない|所見を混ぜない/
      : /separate the (detection )?axis|do not mix findings/i;
    assert.match(t, separate, `${lang}/${agent}: 所見を混ぜない明文`);
  }
});

// ---- 4: 4系統パリティ（claude ⇔ codex byte 等価）----
test("starter-coverage-gap: validate-checks が claude⇔codex で byte 等価（4系統パリティ）", () => {
  for (const lang of ["ja", "en"]) {
    const claude = read(checksPath(lang, "claude"));
    const codex = read(checksPath(lang, "codex"));
    assert.equal(claude, codex, `${lang}: validate-checks.md が claude⇔codex で byte 等価`);
  }
});
