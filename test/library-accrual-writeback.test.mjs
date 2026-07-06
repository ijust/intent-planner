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

// ---- 2b. タグ一致だけで問わず「定石性」でふるう（false positive より silence）----
// A28 後の補正: [decision] はほぼ毎回出るため、タグ限定だけでは毎回発火して推薦が雑になる。
// 一回性の判断を除外し、横展開できる定石性が読み取れるものだけに絞る堰を要求する。
for (const variant of VARIANTS) {
  test(`[${variant}] 個人台帳昇格はタグだけで問わず定石性（再利用性）でふるう`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    const ja = variant.startsWith("ja");
    // タグ一致だけでは自動的に問わない（タグ限定の上に再利用性の堰がある）。
    const notTagAlone = ja
      ? /タグ.*だけで.*問わ(ない|ず)|それだけで自動的に問わない/s
      : /not by tag alone|on the tag alone/is;
    assert.match(body, notTagAlone, `${variant}: タグ一致だけでは個人台帳昇格を問わない`);
    // 一回性（この packet 固有）の判断は問わない。
    const excludeOneOff = ja
      ? /一回性.*問わ(ない|ず)|packet 固有でしか効かない.*問わ(ない|ず)/s
      : /one-off judgment that only holds for this packet/is;
    assert.match(body, excludeOneOff, `${variant}: 一回性（packet 固有）の判断は問わない`);
    // 弱ければ／迷えば沈黙に倒す（false positive より silence）。
    const leanSilence = ja
      ? /問わない側へ倒す|沈黙に倒す|過剰提示より沈黙/s
      : /lean toward silence|ask nothing/is;
    assert.match(body, leanSilence, `${variant}: 弱ければ／迷えば沈黙に倒す`);
  });
}

// ---- 2c. 台帳昇格提案は「既定は黙る・利益が明確なときだけ問う」に倒す（A53・DR100） ----
// 出典: [decision] はほぼ毎回出るため「定石性が読み取れるものだけ」の緩い基準では
// AI が沈黙より提案へ倒れ「毎回出る」。既定を黙るに明示し、台帳に入れる利益の見定めに
// 使う軽い観点（横展開できるか / 既にカバー済みでないか / 後で効く場面が想像できるか）を
// 添える堰を要求する。退化（既定を問うに戻す・観点を消す・機械閾値に寄せる）を落とす。
for (const variant of VARIANTS) {
  test(`[${variant}] 台帳昇格提案は既定を黙るに置き利益が明確なときだけ問う（A53・DR100）`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    const ja = variant.startsWith("ja");
    // 既定は黙る（利益が明確に読み取れるときだけ問う）。
    const defaultSilence = ja
      ? /既定を「黙る」|台帳に入れる利益が明確に読み取れる.*だけ.*問う/s
      : /default is silence|default to "stay silent"|ask only when the benefit is clearly legible/is;
    assert.match(body, defaultSilence, `${variant}: 既定を黙るに置き利益が明確なときだけ問う`);
    // 利益の見定めの観点: 既にカバー済みでないか（既存 Invariant / starters）。
    const cueCovered = ja
      ? /既にカバーされていないか|既存の Invariant.*constraint-starters/s
      : /already covered|existing Invariant.*starters/is;
    assert.match(body, cueCovered, `${variant}: 既存でカバー済みでないかの観点を添える`);
    // 利益の見定めの観点: 後で実際に効く場面が想像できるか。
    const cuePicture = ja
      ? /後で実際に効く場面が想像できるか|効く.*局面.*想像/s
      : /picture where it actually bites later|picture a concrete situation/is;
    assert.match(body, cuePicture, `${variant}: 後で効く場面が想像できるかの観点を添える`);
    // 機械スコア・再利用回数の閾値に寄せない（意味判断のまま）。
    const notMechanical = ja
      ? /機械的スコア・再利用回数の閾値でなく|意味で読む/s
      : /not by a mechanical score or a reuse-count threshold/is;
    assert.match(body, notMechanical, `${variant}: 機械スコア・再利用回数の閾値に寄せない`);
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
