// append-log-discipline-seam / Task 3.1 — walking skeleton（両分割キーの E2E）を明示的に貫く。
// node:test 標準・依存ゼロ（Req 5.3）。src/bin は読まない・変更しない（Req 5.5）。
//
// 1.1（characterization）が既に「同一抽出器を単一形 / 分割形に回すと single==split==GOLDEN」を
// 固定している（Req 3.3 / 4.x）。本 3.1 はその上に、1.1 が残した walking skeleton の
// 縦スライスの欠落を機械的に閉じる:
//   (1) Req 3.1 — deltas の分割ファイル名 `deltas/<packet-slug>.md` が、ハードコードではなく
//       既存の packet スラッグ規則（packet-format.md の決定的導出）から導かれること。
//   (2) Req 3.2 — drift-log の分割ファイル名 `drift-log/<date>-<slug>.md` が、エントリの
//       日付 + 事象 slug から導かれ、連番採番（0001 等の中央カウンタ）を一切含まないこと。
//   (3) Req 3.4 — 旧形式（単一ファイル）と新分割形が *同時に共存* し、双方が読めて
//       双方が GOLDEN を返すこと（旧読み手経路が無傷であること）。
//
// 分割キーの命名は新採番を作らず既存スラッグ規則を再利用する（Req 3.1 / Adjacent / CONTRACT 1.6）。
// repo には共有 slugify 関数が存在しない（src/scripts/bin に無し）ため、packet-format.md の
// 文書化された決定的規則を本テスト内で素朴に実装する（新しい中央カウンタは導入しない）。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, "fixtures", "append-log-discipline");
const SPLIT = path.join(FIX, "split");

// ---------------------------------------------------------------------------
// 既存スラッグ規則（packet-format.md「スラッグ規則（決定的）」の同文実装）。
//   1. NFC 正規化
//   2. 前後 trim
//   3. ASCII 大文字 → 小文字
//   4. 空白とパス危険文字（/ \ : * ? " < > |）を `-` に置換
//   5. 連続 `-` を1つに圧縮
//   6. 先頭・末尾の `-` を除去
//   非 ASCII（日本語等）はそのまま保持。空になれば unnamed-packet。
// 新しい採番ロジックではない（連番カウンタを持たない決定的写像）。
// ---------------------------------------------------------------------------
function deriveSlug(name) {
  let s = name.normalize("NFC").trim().toLowerCase();
  s = s.replace(/[\s/\\:*?"<>|]+/g, "-");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s.length === 0 ? "unnamed-packet" : s;
}

// 単一ファイル deltas の代表エントリから packet 名を取り出す（照合キーは name）。
function deltaPacketNameFromSingleForm() {
  const content = fs.readFileSync(path.join(FIX, "deltas.md"), "utf8");
  const m = content.match(/^## Delta:\s*(.+?)\s*—/m);
  assert.ok(m, "単一形 deltas.md に `## Delta: <name> —` 見出しが必要");
  return m[1].trim();
}

// 単一ファイル drift-log の代表エントリから日付（recorded_at の日付部）と事象（pattern）を取り出す。
function driftDateAndPatternFromSingleForm() {
  const content = fs.readFileSync(path.join(FIX, "drift-log.md"), "utf8");
  // 記入見本（HTML コメント）を除去してから実エントリを読む。
  const real = content.replace(/<!--[\s\S]*?-->/g, "");
  const patternM = real.match(/^-\s*pattern:\s*(.+)$/m);
  const recordedM = real.match(/^-\s*recorded_at:\s*(\d{4}-\d{2}-\d{2})/m);
  assert.ok(patternM, "実エントリに pattern が必要");
  assert.ok(recordedM, "実エントリに recorded_at（ISO 8601）が必要");
  return { pattern: patternM[1].trim(), date: recordedM[1] };
}

function fileStem(p) {
  return path.basename(p, ".md");
}

// ---------------------------------------------------------------------------
// (1) Req 3.1 — deltas: packet 由来＝packet 単位ファイル。ファイル名はスラッグ規則で導出。
// ---------------------------------------------------------------------------
test("walking skeleton (Req 3.1): deltas の分割ファイル名が packet 名→既存スラッグ規則で導出され、ハードコードでない", () => {
  const packetName = deltaPacketNameFromSingleForm();
  const expectedStem = deriveSlug(packetName); // 規則からの導出
  // 分割形で実在するファイルがちょうど導出スラッグ名であること。
  const splitPath = path.join(SPLIT, "deltas", `${expectedStem}.md`);
  assert.ok(
    fs.existsSync(splitPath),
    `分割 deltas ファイルはスラッグ規則導出名 deltas/${expectedStem}.md に置かれるべき`,
  );
  // 念押し: ディレクトリ内の唯一の .md の stem も導出スラッグに一致（取り違え検出）。
  const files = fs
    .readdirSync(path.join(SPLIT, "deltas"))
    .filter((f) => f.endsWith(".md"));
  assert.deepEqual(files.map(fileStem), [expectedStem]);
  // この代表では export-route-by-case になる（規則の具体結果の固定）。
  assert.equal(expectedStem, "export-route-by-case");
});

// ---------------------------------------------------------------------------
// (2) Req 3.2 — drift-log: 事象由来＝日付+slug 単位ファイル。連番採番を用いない。
// ---------------------------------------------------------------------------
test("walking skeleton (Req 3.2): drift-log の分割ファイル名が 日付+事象slug で導出され、連番カウンタを含まない", () => {
  const { pattern, date } = driftDateAndPatternFromSingleForm();
  const slug = deriveSlug(pattern);
  const expectedStem = `${date}-${slug}`; // 日付（recorded_at）+ 事象 slug
  const splitPath = path.join(SPLIT, "drift-log", `${expectedStem}.md`);
  assert.ok(
    fs.existsSync(splitPath),
    `分割 drift-log ファイルは drift-log/${expectedStem}.md（日付+slug）に置かれるべき`,
  );
  // 日付部は recorded_at の日付（ISO 8601 の YYYY-MM-DD）由来である。
  assert.match(expectedStem, /^\d{4}-\d{2}-\d{2}-/);
  // 連番採番（0001 等の中央カウンタ）を一切含まない（CONTRACT 1.3 / Req 3.2）。
  // 日付部（先頭 YYYY-MM-DD）は正当な数字なので除外し、*slug 部*に連番が無いことを検査する。
  const slugPart = expectedStem.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  assert.equal(slugPart, slug, "slug 部は事象 slug そのもの（連番接尾辞を持たない）");
  assert.doesNotMatch(
    slugPart,
    /\d{3,}/,
    "slug 部に連番（0001 等）を含めてはならない",
  );
  assert.doesNotMatch(
    slugPart,
    /(^|[-_])(0001|seq|no\d+)([-_]|$)/i,
    "slug 部に連番系トークンを含めてはならない",
  );
  // この代表では 2026-06-18-scope-creep になる（規則の具体結果の固定）。
  assert.equal(expectedStem, "2026-06-18-scope-creep");
  const files = fs
    .readdirSync(path.join(SPLIT, "drift-log"))
    .filter((f) => f.endsWith(".md"));
  assert.deepEqual(files.map(fileStem), [expectedStem]);
});

// ---------------------------------------------------------------------------
// (3) Req 3.4 — 共存: 旧単一形と新分割形が同時に存在し、双方が読めて双方が同じ情報を返す。
//   1.1 が「同一抽出器の single==split==GOLDEN」を持つので、ここでは「同時に両形が物理的に
//   存在し、旧読み手経路（単一形）が無傷であること」を walking skeleton として明示固定する。
// ---------------------------------------------------------------------------
test("walking skeleton (Req 3.4): 旧単一形と新分割形が同時に共存し、旧読み手経路が無傷である", () => {
  // 双方の形式が物理的に同時に存在する。
  assert.ok(fs.existsSync(path.join(FIX, "deltas.md")), "旧単一形 deltas.md が共存している");
  assert.ok(
    fs.existsSync(path.join(FIX, "drift-log.md")),
    "旧単一形 drift-log.md が共存している",
  );
  assert.ok(
    fs.existsSync(path.join(SPLIT, "deltas", "export-route-by-case.md")),
    "新分割形 deltas が共存している",
  );
  assert.ok(
    fs.existsSync(path.join(SPLIT, "drift-log", "2026-06-18-scope-creep.md")),
    "新分割形 drift-log が共存している",
  );

  // 旧読み手経路（単一形）が移行後も同じ情報を返す（無傷）。
  // 1.1 の抽出器と同じロジックをここで独立に再現し「旧経路が壊れていない」ことを確かめる。
  const oldDelta = fs.readFileSync(path.join(FIX, "deltas.md"), "utf8");
  const oldStatus = oldDelta.match(/^-\s*Status:\s*(\S+)/m);
  assert.equal(oldStatus && oldStatus[1], "promoted", "旧単一形 deltas の status 読みが無傷");

  const oldDrift = fs
    .readFileSync(path.join(FIX, "drift-log.md"), "utf8")
    .replace(/<!--[\s\S]*?-->/g, "");
  const oldOutcome = oldDrift.match(/^-\s*outcome:\s*(\S+)/m);
  assert.equal(oldOutcome && oldOutcome[1], "caught", "旧単一形 drift-log の outcome 読みが無傷");

  // 新分割形も同じ load-bearing 情報を返す（移行で情報を落としていない）。
  const newDelta = fs.readFileSync(
    path.join(SPLIT, "deltas", "export-route-by-case.md"),
    "utf8",
  );
  const newStatus = newDelta.match(/^-\s*Status:\s*(\S+)/m);
  assert.equal(newStatus && newStatus[1], "promoted", "新分割形 deltas の status が単一形と一致");

  const newDrift = fs.readFileSync(
    path.join(SPLIT, "drift-log", "2026-06-18-scope-creep.md"),
    "utf8",
  );
  const newOutcome = newDrift.match(/^-\s*outcome:\s*(\S+)/m);
  assert.equal(newOutcome && newOutcome[1], "caught", "新分割形 drift-log の outcome が単一形と一致");
});

// ---------------------------------------------------------------------------
// スラッグ規則の決定性（同名→同スラッグ・新採番でないことの保証）。
// ---------------------------------------------------------------------------
test("walking skeleton: スラッグ規則は決定的で連番を持たない（同名→同結果）", () => {
  assert.equal(deriveSlug("export-route-by-case"), "export-route-by-case");
  assert.equal(deriveSlug("Export Route By Case"), "export-route-by-case"); // 空白→- / 小文字化
  assert.equal(deriveSlug("  scope-creep  "), "scope-creep"); // trim
  assert.equal(deriveSlug("a/b:c"), "a-b-c"); // パス危険文字
  assert.equal(deriveSlug("造語管理"), "造語管理"); // 非 ASCII 保持
  // 二度呼んでも同じ（カウンタ/状態を持たない）。
  assert.equal(deriveSlug("scope-creep"), deriveSlug("scope-creep"));
});
