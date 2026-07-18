// golden-hash-manifest（golden lock の台帳外出し + 正規更新スクリプト化）の discriminative テスト。
//   pkt-20260704-golden-hash-manifest-2ll7・C10/A1。
//
// 狙い: hash lock の「持ち方」を単一マニフェスト（test/golden-locks.manifest.json）へ寄せ、
//   正規更新を `scripts/golden-hash.mjs` の1コマンドにする改修が、検査の意味・強度を1件も
//   緩めていないこと（移行前後で同じ改変に同じ検査結果）を落とせるオラクルで固定する。
//
// node:test + node:assert/strict・依存ゼロ・read-only（実ファイルは一切改変しない）。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(ROOT, "test", "golden-locks.manifest.json");
const TEST_FILE = path.join(ROOT, "test", "standard-invariance.test.mjs");

const mod = await import(fileURLToPath(new URL("../scripts/golden-hash.mjs", import.meta.url)));

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

// ---- 1. マニフェストが正本の構造を持つ（4グループ・hashKind・entries） ----
test("1: マニフェストは4グループ（byte/frontmatter/installer/skillBody）を hashKind 付きで持つ", () => {
  const m = readManifest();
  const groups = m.groups;
  for (const g of ["byteLocked", "frontmatterLocked", "installerLocked", "skillBodyLocked"]) {
    assert.ok(groups[g], `グループ ${g} がある`);
    assert.ok(
      groups[g].hashKind === "file" || groups[g].hashKind === "frontmatter",
      `${g}.hashKind は file か frontmatter`,
    );
    assert.ok(
      groups[g].entries && Object.keys(groups[g].entries).length > 0,
      `${g}.entries が非空`,
    );
  }
  // frontmatter でハッシュするのは frontmatterLocked のみ（他はファイル全体）。
  assert.equal(groups.byteLocked.hashKind, "file");
  assert.equal(groups.frontmatterLocked.hashKind, "frontmatter");
  assert.equal(groups.installerLocked.hashKind, "file");
  assert.equal(groups.skillBodyLocked.hashKind, "file");
});

// ---- 2. ロック対象の総数が承認済み台帳と一致する ----
// continuous-intent-planning で実装向けexport 8面を追加:
// byte=22 / frontmatter=10 / installer=8 / skillBody=22 = 62。
test("2: ロック対象の件数が承認済み台帳と一致する（検査対象を暗黙に減らさない）", () => {
  const m = readManifest();
  const counts = {
    byteLocked: Object.keys(m.groups.byteLocked.entries).length,
    frontmatterLocked: Object.keys(m.groups.frontmatterLocked.entries).length,
    installerLocked: Object.keys(m.groups.installerLocked.entries).length,
    skillBodyLocked: Object.keys(m.groups.skillBodyLocked.entries).length,
  };
  assert.deepEqual(counts, {
    byteLocked: 22,
    frontmatterLocked: 10,
    installerLocked: 8,
    skillBodyLocked: 22,
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(total, 62, "ロック対象は合計62件");
});

// ---- 3. マニフェストの hash が実ファイルと一致する（検出力の等価・回帰ガード本体） ----
// scan() は test/standard-invariance.test.mjs と同一の hash 方式で突き合わせる。
// ズレ0 = 「マニフェスト経由でも従来と同じロックが効いている」の実証。
test("3: マニフェストの全 hash が実ファイルと一致する（ズレ0）", () => {
  const m = readManifest();
  const { drifts, missing } = mod.scan(m);
  assert.deepEqual(missing, [], `ロック対象は全て実在する（missing: ${missing.join(", ")}）`);
  assert.deepEqual(
    drifts.map((d) => d.rel),
    [],
    `マニフェストの hash が実ファイルとズレている: ${drifts.map((d) => d.rel).join(", ")}`,
  );
});

// ---- 4. 判別オラクル: ロック対象1つの hash を1文字変えると scan がズレを検出する ----
// （誤実装＝マニフェストが実ファイルと無関係になる実装を落とす。in-memory のみ・実ファイル非改変）。
test("4: マニフェストの hash を故意に汚すと scan がその1件をズレとして検出する", () => {
  const m = readManifest();
  const firstRel = Object.keys(m.groups.byteLocked.entries)[0];
  m.groups.byteLocked.entries[firstRel] = "0".repeat(64); // ありえない hash に差し替え
  const { drifts } = mod.scan(m);
  const hit = drifts.find((d) => d.rel === firstRel);
  assert.ok(hit, `${firstRel} のズレを検出する`);
  assert.equal(hit.old, "0".repeat(64));
  assert.notEqual(hit.actual, "0".repeat(64), "実ファイルの正しい hash を actual に載せる");
});

// ---- 5. frontmatter グループは frontmatter ブロックの hash で照合する（file 全体でない） ----
// hashKind の取り違え（frontmatter 対象をファイル全体でハッシュする誤実装）を落とす。
test("5: frontmatterLocked は frontmatter ブロックの hash で照合する（ファイル全体と別）", () => {
  const m = readManifest();
  const rel = Object.keys(m.groups.frontmatterLocked.entries)[0];
  const expected = m.groups.frontmatterLocked.entries[rel];
  const fmHash = mod.frontmatterHash(rel);
  const wholeHash = mod.fileHash(rel);
  assert.equal(expected, fmHash, "マニフェスト値は frontmatter ブロックの hash と一致");
  assert.notEqual(
    expected,
    wholeHash,
    "ファイル全体の hash とは異なる（frontmatter だけをロックしている証拠）",
  );
});

// ---- 6. 「validate は非ロック」が暗記でなくマニフェストに明示される（nonLocked） ----
// 従来 memory（skill-lock-range-per-skill）で運用していた区別を台帳へ載せた。
test("6: nonLocked に intent-validate の非ロックが記録され、実際にロック対象外である", () => {
  const m = readManifest();
  assert.ok(m.nonLocked, "nonLocked セクションがある");
  const note = JSON.stringify(m.nonLocked);
  assert.ok(note.includes("intent-validate"), "intent-validate の非ロックが明示される");
  // 実際に intent-validate の SKILL.md がどのロックグループにも入っていないこと。
  const allLocked = Object.values(m.groups).flatMap((g) => Object.keys(g.entries));
  const validateLocked = allLocked.filter((rel) => rel.includes("intent-validate"));
  assert.deepEqual(
    validateLocked,
    [],
    `intent-validate はロック対象に入っていない（入っていた: ${validateLocked.join(", ")}）`,
  );
});

// ---- 7. テストコードに sha256 リテラルを直書きしない（台帳へ寄せた証拠） ----
// 改修の眼目＝54個の hash リテラルがテストから消え、マニフェスト経由になったこと。
test("7: standard-invariance.test.mjs に64桁 hash リテラルが残っていない（台帳外出し完了）", () => {
  const src = fs.readFileSync(TEST_FILE, "utf8");
  const literals = src.match(/"[0-9a-f]{64}"/g) || [];
  assert.deepEqual(literals, [], `hash リテラルがテストに残っている: ${literals.slice(0, 3).join(", ")}…`);
  // マニフェスト参照になっていること。
  assert.ok(src.includes("golden-locks.manifest.json"), "マニフェストを読み込んでいる");
  assert.ok(src.includes("MANIFEST.groups"), "MANIFEST.groups からロック表を引いている");
});

// ---- 8. 再計算スクリプトの hash 定義がテスト側と byte 一致する（二重定義の同期） ----
// scripts/golden-hash.mjs とテストが別々に hash 関数を持つため、同じ入力に同じ hash を
// 返すことを実ファイルで突き合わせる（片方だけズレる二重定義バグを落とす）。
test("8: scripts/golden-hash.mjs の hash 関数がテスト側と同じ hash を返す", () => {
  const m = readManifest();
  const rel = Object.keys(m.groups.byteLocked.entries)[0];
  const scriptHash = mod.fileHash(rel);
  const localHash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, rel)))
    .digest("hex");
  assert.equal(scriptHash, localHash, "スクリプトの fileHash とテスト側の算出が一致");
});
