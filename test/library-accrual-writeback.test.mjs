// library-accrual-writeback: writeback の昇格局面（§3）に「実装して効いた制約を
// 個人台帳 constraint-library.md へ昇格するか」を read-only で問う第3段を足す packet
// (pkt-20260628-library-accrual-writeback-s2zt) の discriminative oracle。
//
// 検証対象（packet ## Validation の受容オラクル）:
//   - writeback-protocol.md §3 に「個人台帳（constraint-library）への昇格」を問う第3段がある（4系統）
//   - 昇格候補タグを [decision] / [invariant-violation] に限定している（[implicit-behavior] 等を除外）
//   - read-only 提示・自動追記しない・既載は再提示しない・台帳不在ならスキップ（後方互換）
//   - intent-writeback SKILL.md Step 4 が第3段（個人台帳昇格）へ言及する（4系統）
//   いずれか1系統でも欠ければ落ちる（誤実装＝一部系統だけ反映を落とす・read-only 堰を消す退化）。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const VARIANTS = ["ja/claude", "ja/codex", "en/claude", "en/codex"];
const rel = (variant, p) => path.join(ROOT, `templates/${variant}/skills/${p}`);
const read = (variant, p) => fs.readFileSync(rel(variant, p), "utf8");

// ---- 1. writeback-protocol.md §3 に個人台帳昇格の第3段がある（4系統） ----
for (const variant of VARIANTS) {
  test(`[${variant}] writeback-protocol.md §3 に個人台帳（constraint-library）昇格の第3段がある`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    assert.match(body, /constraint-library\.md/, `${variant}: 個人台帳 constraint-library.md を参照する`);
    const ja = variant.startsWith("ja");
    // 第3段の見出し（個人台帳への昇格を問う）。
    const stageHeading = ja
      ? /第3段.*個人台帳.*昇格/s
      : /Stage 3.*personal ledger/is;
    assert.match(body, stageHeading, `${variant}: §3 第3段（個人台帳昇格）の見出しがある`);
  });
}

// ---- 2. 昇格候補タグを [decision]/[invariant-violation] に限定する ----
for (const variant of VARIANTS) {
  test(`[${variant}] 個人台帳昇格の候補タグを [decision]/[invariant-violation] に限定する`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    // 昇格候補タグの限定（両タグが第3段の文脈に現れる）。
    assert.match(body, /\[decision\]/, `${variant}: [decision] を昇格候補に挙げる`);
    assert.match(body, /\[invariant-violation\]/, `${variant}: [invariant-violation] を昇格候補に挙げる`);
    const ja = variant.startsWith("ja");
    // [implicit-behavior] を昇格対象にしない（過剰提示を避ける）。
    const excludeImplicit = ja
      ? /\[implicit-behavior\].*(対象にしない|昇格対象にしない)/s
      : /\[implicit-behavior\].*(do not target|unlikely)/is;
    assert.match(body, excludeImplicit, `${variant}: [implicit-behavior] は個人台帳昇格の対象にしない`);
  });
}

// ---- 3. read-only 堰（自動追記しない・既載は再提示しない・台帳不在ならスキップ） ----
for (const variant of VARIANTS) {
  test(`[${variant}] 個人台帳昇格は read-only 堰（自動追記しない・既載再提示しない・不在スキップ）`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    const ja = variant.startsWith("ja");
    // 自動追記しない（人が採否を承認してから）。
    const noAutoWrite = ja
      ? /自動で.*台帳.*追記しない|自動で台帳に追記しない/s
      : /do not auto-write into the ledger/i;
    assert.match(body, noAutoWrite, `${variant}: 自動で台帳に追記しない（read-only 堰）`);
    // 既載は再提示しない（重複排除）。
    const dedup = ja
      ? /既に台帳.*再提示しない|再提示しない（重複排除）/s
      : /already in the ledger.*do not|do not re-surface/is;
    assert.match(body, dedup, `${variant}: 既載の制約は再提示しない（重複排除）`);
    // 台帳不在ならスキップ（後方互換）。
    const skipAbsent = ja
      ? /不在.*(スキップ|スキップし)/s
      : /absent.*(skip)/is;
    assert.match(body, skipAbsent, `${variant}: 台帳不在ならスキップ（後方互換）`);
  });
}

// ---- 4. intent-writeback SKILL.md Step 4 が第3段（個人台帳昇格）へ言及する ----
for (const variant of VARIANTS) {
  test(`[${variant}] intent-writeback SKILL.md Step 4 が個人台帳昇格へ言及する`, () => {
    const body = read(variant, "intent-writeback/SKILL.md");
    assert.match(body, /constraint-library\.md/, `${variant}: SKILL Step 4 が個人台帳を参照する`);
    const ja = variant.startsWith("ja");
    const refStage3 = ja
      ? /個人台帳.*昇格.*第3段|§3 第3段/s
      : /personal ledger.*Stage 3|§3 Stage 3/is;
    assert.match(body, refStage3, `${variant}: SKILL Step 4 が rules §3 第3段へ言及する`);
  });
}
