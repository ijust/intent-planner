// corrective-intent: 結論だけ残して根拠を捨てると後から否定する事実が来ても訂正
// できない（brittle memory・arXiv 2606.25449v1）のを防ぐため、discover（予防・最上流）/
// validate（事後検出）/ writeback（昇格時）の3局面に「結論に根拠を併走させる」read-only
// promptlet を薄く乗せた3 packet の discriminative oracle。
//
// 検証対象（各 packet の ## Validation の discriminative oracle）:
//   - discover (algo-gore-lite.md): L3 で結論に根拠を併走させる促し + 規律「結論と根拠を分けて持つ」（4系統）
//   - writeback (writeback-protocol.md): §4 昇格局面で結論だけ昇格せず根拠を併走 + 質的 completeness フラグ（4系統）
//   - 全 packet 共通: read-only 促し・記入は人・AI が根拠を捏造しない（最重要 Invariant）
//   いずれか1系統でも欠ければ落ちる（誤実装＝一部系統だけ反映を落とす / 最重要 Invariant の脱落）。
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
const isJa = (variant) => variant.startsWith("ja");

// ---- 1. discover: algo-gore-lite が L3 で結論に根拠を併走させる促しを持つ（4系統） ----
for (const variant of VARIANTS) {
  test(`[${variant}] discover algo が結論に根拠（rationale）を併走させる促しを持つ`, () => {
    const body = read(variant, "intent-discover/rules/algo-gore-lite.md");
    // 結論⇄根拠の非対称性（結論は根拠から再導出できるが逆はできない）が書かれている
    const hasAsymmetry = isJa(variant)
      ? /結論は根拠から再導出できる(が|ものの)、根拠は結論から再導出できない/.test(body)
      : /conclusion can be re-derived from the grounds, but the grounds cannot be re-derived/i.test(body);
    assert.ok(hasAsymmetry, `${variant}: 結論⇄根拠の非対称性が書かれている`);
    // 辿れない根拠は Open Questions へ逃がす（推測で埋めない）
    const escapesToOQ = isJa(variant)
      ? /辿れない[^。\n]*Open Questions|Open Questions[^。\n]*逃が/.test(body)
      : /Open Questions/.test(body) && /cannot be traced|not be traced/i.test(body);
    assert.ok(escapesToOQ, `${variant}: 辿れない根拠を Open Questions へ逃がす`);
  });

  test(`[${variant}] discover algo の規律に「結論と根拠を分けて持つ（訂正可能性）」がある`, () => {
    const body = read(variant, "intent-discover/rules/algo-gore-lite.md");
    const hasDiscipline = isJa(variant)
      ? /結論と根拠を分けて持つ（訂正可能性）/.test(body)
      : /Hold the conclusion and its grounds separately \(correctability\)/i.test(body);
    assert.ok(hasDiscipline, `${variant}: 規律に「結論と根拠を分けて持つ（訂正可能性）」がある`);
  });
}

// ---- 2. writeback: §4 昇格局面で結論だけ昇格せず根拠を併走させる（4系統） ----
for (const variant of VARIANTS) {
  test(`[${variant}] writeback §4 が結論だけを昇格せず根拠を併走させる`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    const hasGroundsCompanion = isJa(variant)
      ? /結論だけを昇格しない（根拠を併走させる・訂正可能性）/.test(body)
      : /Do not promote only the conclusion \(keep the grounds running alongside/i.test(body);
    assert.ok(hasGroundsCompanion, `${variant}: §4 に結論だけ昇格しない規律がある`);
    // 既存構造（Decision Rule の Why/Consequences）へ併走・新必須フィールドなし
    const reusesExisting = isJa(variant)
      ? /Why \/ Consequences/.test(body) && /新しい必須フィールド[^。\n]*導入しない/.test(body)
      : /Why \/ Consequences/.test(body) && /not introduce a new required field/i.test(body);
    assert.ok(reusesExisting, `${variant}: 既存構造へ併走・新必須フィールドを導入しない`);
  });

  test(`[${variant}] writeback §4 の completeness フラグが質的（数 k/N でない）`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    const isQualitative = isJa(variant)
      ? /質的(な)?(\s)?(completeness\s)?フラグ/.test(body) && /数（k\/N）では持たない/.test(body)
      : /qualitative\s+(completeness\s)?flag/i.test(body) && /not held as a number \(k\/N\)/i.test(body);
    assert.ok(isQualitative, `${variant}: completeness フラグが質的・数では持たない`);
  });

  test(`[${variant}] writeback §4 が A21 平易要約を圧縮タグへ戻さない（両立）`, () => {
    const body = read(variant, "intent-writeback/rules/writeback-protocol.md");
    const keepsSummary = isJa(variant)
      ? /平易な要約[^。\n]*圧縮タグへ戻さない/.test(body)
      : /Do not fold the plain-language summary[^.\n]*compressed tag/i.test(body);
    assert.ok(keepsSummary, `${variant}: 平易な要約を根拠込みの圧縮タグへ戻さない`);
  });
}

// ---- 3. 全 packet 共通の最重要 Invariant: AI が根拠を捏造しない（read-only・記入は人） ----
for (const variant of VARIANTS) {
  test(`[${variant}] discover/writeback で AI が根拠を捏造して結論を後付け正当化しない`, () => {
    for (const p of [
      "intent-discover/rules/algo-gore-lite.md",
      "intent-writeback/rules/writeback-protocol.md",
    ]) {
      const body = read(variant, p);
      // 根拠の捏造禁止（discover/writeback で言い回しは異なるが、いずれも「根拠を捏造しない」+
      //   「後付け正当化」or「read-only 促しまで」の核を持つ）。
      const forbidsFabrication = isJa(variant)
        ? /捏造/.test(body) && /(後付け正当化|read-only)/.test(body)
        : /fabricate grounds/i.test(body) && /(retroactively justify|prompting only|read-only)/i.test(body);
      assert.ok(forbidsFabrication, `${variant}: ${p} に「AI が根拠を捏造して結論を後付け正当化しない」がある`);
    }
  });
}

// ---- 4. 4系統パリティ: 各言語内 claude⇔codex は共有 rules が byte 等価 ----
test("algo-gore-lite.md と writeback-protocol.md は各言語内 claude⇔codex が byte 等価（corrective-intent 追加部位）", () => {
  for (const lang of ["ja", "en"]) {
    for (const p of [
      "intent-discover/rules/algo-gore-lite.md",
      "intent-writeback/rules/writeback-protocol.md",
    ]) {
      const claude = read(`${lang}/claude`, p);
      const codex = read(`${lang}/codex`, p);
      assert.equal(claude, codex, `${lang}: ${p} の claude⇔codex が byte 等価`);
    }
  }
});
