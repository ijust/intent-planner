// writeback-target-by-route: 出口に direct を足し、writeback §1 の対象特定を
// 「出口の明示記録（format=direct）一次 → 3条件 AND 推論フォールバック」の2段で
// 一意化する packet（pkt-20260626-writeback-target-by-route-fg4y）の discriminative oracle。
//
// 検証対象（packet ## Validation の discriminative oracle）:
//   - export-route.md の format 値域に `direct` がある（4系統）
//   - discover の出口追認に `direct` 肢がある（4系統）
//   - writeback-protocol.md §1 が ③.4（4a）で format=direct を読む段を持ち、
//     ③.5（4b）で 3条件 AND 推論フォールバックを持つ（4系統）
//   いずれか1系統でも欠ければ落ちる（誤実装＝一部系統だけ反映を落とす）。
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

// ---- 1. export-route.md の format 値域に direct がある（4系統） ----
for (const variant of VARIANTS) {
  test(`[${variant}] export-route.md の format 値域に direct がある`, () => {
    const body = read(variant, "intent-packets/rules/export-route.md");
    // 判定テーブル A の format=direct 行（同一行で direct と「直接実装/direct implementation」が共起）
    const hasDirectRow = body
      .split("\n")
      .some((l) => /`direct`/.test(l) && (variant.startsWith("ja") ? /直接実装/.test(l) : /direct implementation/i.test(l)));
    assert.ok(hasDirectRow, `${variant}: 判定テーブルに format=direct 行（直接実装への対応）がある`);
  });
}

// ---- 2. discover の出口追認に direct 肢がある（4系統） ----
for (const variant of VARIANTS) {
  test(`[${variant}] discover の format 追認の値域に direct がある`, () => {
    const body = read(variant, "intent-discover/SKILL.md");
    // format 値域の列挙に direct が含まれる（cc-sdd / openspec / to-spec / direct）
    assert.match(body, /`direct`/, `${variant}: discover が format 値域に direct を列挙する`);
    // direct を選ぶ意味（ツール不使用の直接実装）が書かれている
    const explainsDirect = variant.startsWith("ja")
      ? /ツールを使わず直接実装|直接実装|spec ツールを起動しない/.test(body)
      : /implemented directly without a tool|direct implementation|no spec tool/i.test(body);
    assert.ok(explainsDirect, `${variant}: direct を選ぶ意味（ツール不使用の直接実装）が書かれている`);
  });
}

// ---- 3. writeback-protocol.md §1 が format=direct 一次 + 3条件 AND 推論 を持つ（4系統） ----
for (const variant of VARIANTS) {
  test(`[${variant}] writeback §1 が format=direct 一次の明示記録ルートを持つ`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    // 明示記録ルート（4a）: format=direct を読む
    assert.match(body, /`?format`?\s*(行|line)?[^。\n]*`?direct`?|format=direct|format` (line )?is `direct`/i,
      `${variant}: §1 に format=direct を読む明示記録ルートがある`);
    assert.ok(/`direct`/.test(body), `${variant}: §1 が direct を参照する`);
  });

  test(`[${variant}] writeback §1 が 3条件 AND の推論フォールバックを持つ`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    // 推論ルート（4b）: spec_refs 空 + export-log 行なし + state=done の3条件 AND
    assert.match(body, /spec_refs/, `${variant}: §1 推論ルートが spec_refs を条件にする`);
    assert.match(body, /export-log/, `${variant}: §1 推論ルートが export-log 行なしを条件にする`);
    assert.match(body, /state=done|state.{0,3}done/, `${variant}: §1 推論ルートが state=done を条件にする`);
    const mentionsAnd = variant.startsWith("ja")
      ? /3条件 AND|3 条件 AND/.test(body)
      : /3-condition AND/i.test(body);
    assert.ok(mentionsAnd, `${variant}: 3条件 AND の合成であることが明記されている`);
  });

  test(`[${variant}] writeback §1 は5段優先順（first-match 構造を保つ）`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    const mentions5 = variant.startsWith("ja")
      ? /5段優先順/.test(body)
      : /5-tier priority/i.test(body);
    assert.ok(mentions5, `${variant}: §1 見出し/本文が5段優先順を明示する（4段から追随更新済み）`);
    // 最終救済（テキスト照合 + 利用者確認）が tier 5 として残る
    const finalRelief = variant.startsWith("ja")
      ? /テキスト照合.*利用者確認|利用者確認.*テキスト照合/.test(body)
      : /text.?matching.*confirmation|confirmation.*text.?matching/i.test(body);
    assert.ok(finalRelief, `${variant}: 最終救済（テキスト照合 + 利用者確認）が残る`);
  });
}

// ---- 4. SKILL.md Step 1 の段数追随（4段→5段） ----
for (const variant of VARIANTS) {
  test(`[${variant}] writeback SKILL.md Step 1 が5段優先順に追随している`, () => {
    const body = read(variant, "intent-writeback/SKILL.md");
    const mentions5 = variant.startsWith("ja")
      ? /5段優先順/.test(body)
      : /5-tier priority/i.test(body);
    assert.ok(mentions5, `${variant}: SKILL.md Step 1 が5段優先順（段数追随）`);
    assert.match(body, /`direct`|direct-implementation|直接実装/, `${variant}: SKILL.md が直接実装ルートに言及する`);
  });
}

// ---- 5. 4系統パリティ: 各言語内 claude⇔codex は当該追加部位が同型 ----
// writeback-protocol.md / export-route.md は共有 rule で byte 等価。
test("export-route.md と writeback-protocol.md は各言語内 claude⇔codex が byte 等価", () => {
  for (const lang of ["ja", "en"]) {
    for (const p of [
      "intent-packets/rules/export-route.md",
      "intent-writeback/rules/writeback-protocol.md",
    ]) {
      const claude = read(`${lang}/claude`, p);
      const codex = read(`${lang}/codex`, p);
      assert.equal(claude, codex, `${lang}: ${p} の claude⇔codex が byte 等価`);
    }
  }
});

// ---- 6. INV2: 機械検査スクリプトへ寄せていない（read-only 読解で閉じる） ----
for (const variant of VARIANTS) {
  test(`[${variant}] §1 の direct 判定を intent-check.mjs 等のスクリプトに寄せていない`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    assert.ok(
      !/intent-check\.mjs/.test(body) || !/direct.*intent-check\.mjs|intent-check\.mjs.*direct/.test(body),
      `${variant}: direct ルートを intent-check.mjs に移譲していない（INV2）`,
    );
  });
}
