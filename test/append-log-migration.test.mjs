// append-log-discipline-add / Task 3.1 — 既存全エントリの one-shot 移行を fixture 上で検証する。
// node:test 標準・依存ゼロ（Req 5.3 系）。src/bin は読まない。
//
// 設計（design Migration / requirements Req 4）:
//   5記録ファイルの全エントリを分割形へ move する。deltas/drift-log/milestones/compass-archive は
//   move 後に旧単一ファイルを畳む。export-log は fold せず、分割ファイルを exported_at 昇順連結した
//   生成 active ミラーとして旧単一ファイルを残す（読み手横断追随の完結=wire まで橋渡し）。
//   移行の正しさは seam の characterization（single==split==GOLDEN）を5ファイル分へ拡張したオラクルで判定する。
//
//   本テストは追跡外の dogfood `.intent/` を一切触らない。fixture を tmp へ複製し、その上で
//   in-test の migrate()/reverse() を回して behavior-preserving・fold/mirror・逆 migration を検証する。
//
//   重要: slug 導出は packet-format.md のスラッグ規則をテスト内に同文実装する（共有は test 層・
//   src にランタイム slugify を置かない＝INV2）。drift-log の9キー・compass-archive の6欄は不変。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, "fixtures", "append-log-discipline");

// ---- 既存スラッグ規則（packet-format.md の決定的導出・テスト内同文）----
function deriveSlug(name) {
  let s = (name ?? "").normalize("NFC").trim().toLowerCase();
  s = s.replace(/[\s/\\:*?"<>|]/g, "-");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s || "unnamed";
}

// ---- テーブル行抽出（ヘッダ/区切り行を除く）----
function tableRows(content, headerFirstCell) {
  const rows = [];
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length === 0) continue;
    if (cells[0] === headerFirstCell) continue;
    if (cells.every((c) => /^-+$/.test(c) || c === "")) continue;
    rows.push(cells);
  }
  return rows;
}

const TABLE_HEADER = {
  "export-log": "| packet | exported_at | commit |\n|---|---|---|",
  milestones: "| event | recorded_at | note |\n|---|---|---|",
};

// ---- migrate(): tmp 上の単一形 → 分割形へ move。4ファイルは fold、export-log はミラー保持。----
function migrate(root) {
  // deltas（packet 由来）: ## Delta: <packet> — <date> ごとに deltas/<packet-slug>.md へ。
  migrateSectioned(root, "deltas", /^## Delta:\s*(.+?)\s*—/m, "## Delta:", (m) => deriveSlug(m[1]), true);
  // drift-log（事象由来）: ### drift-log entry ごとに drift-log/<date>-<slug>.md へ。
  migrateDrift(root, true);
  // compass-archive（rule 単位）: 6欄 ADR 1行ごとに compass-archive/<rule-slug>.md へ（fixture は1件）。
  migrateCompassArchive(root, true);
  // milestones（事象由来・テーブル）: 行ごとに milestones/<date>-<event-slug>.md へ。
  migrateTable(root, "milestones", "event", (cells) => `${cells[1]}-${deriveSlug(cells[0])}`, true);
  // export-log（packet 由来・テーブル）: 行ごとに export-log/<packet-slug>.md へ。fold せずミラー再生成。
  migrateTable(root, "export-log", "packet", (cells) => deriveSlug(cells[0]), false);
  regenerateExportMirror(root);
}

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

// ## 見出し区切りの記録（deltas）。
function migrateSectioned(root, name, headRe, headTok, slugOf, fold) {
  const single = path.join(root, `${name}.md`);
  if (!fs.existsSync(single)) return;
  const content = fs.readFileSync(single, "utf8");
  const parts = content.split(new RegExp(`^${headTok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m")).slice(1).map((p) => headTok + p);
  ensureDir(path.join(root, name));
  for (const body of parts) {
    const m = body.match(headRe);
    const slug = slugOf(m);
    fs.writeFileSync(path.join(root, name, `${slug}.md`), body.trimEnd() + "\n");
  }
  if (fold) fs.rmSync(single);
}

function migrateDrift(root, fold) {
  const single = path.join(root, "drift-log.md");
  if (!fs.existsSync(single)) return;
  const withoutComments = fs.readFileSync(single, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const parts = withoutComments.split(/^### drift-log entry\s*$/m).slice(1).map((p) => p.trim()).filter(Boolean);
  ensureDir(path.join(root, "drift-log"));
  for (const body of parts) {
    const date = (body.match(/^-\s*recorded_at:\s*(\d{4}-\d{2}-\d{2})/m) || [])[1] || "0000-00-00";
    const pattern = (body.match(/^-\s*pattern:\s*(.+)$/m) || [])[1]?.trim() || "none";
    const slug = `${date}-${deriveSlug(pattern)}`;
    fs.writeFileSync(path.join(root, "drift-log", `${slug}.md`), "### drift-log entry\n" + body + "\n");
  }
  if (fold) fs.rmSync(single);
}

function migrateCompassArchive(root, fold) {
  const single = path.join(root, "compass-archive.md");
  if (!fs.existsSync(single)) return;
  const content = fs.readFileSync(single, "utf8");
  ensureDir(path.join(root, "compass-archive"));
  let i = 0;
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("- **Context**:")) continue;
    // rule slug: superseded 先や Decision から自然キーを引く。fixture は決め打ちで決定的に。
    const dec = (line.match(/\*\*Decision\*\*:\s*(.*?)\s*\//) || [])[1] || `rule-${i}`;
    const slug = deriveSlug(dec);
    fs.writeFileSync(path.join(root, "compass-archive", `${slug}.md`), line + "\n");
    i++;
  }
  if (fold) fs.rmSync(single);
}

function migrateTable(root, name, headerFirstCell, keyOf, fold) {
  const single = path.join(root, `${name}.md`);
  if (!fs.existsSync(single)) return;
  const rows = tableRows(fs.readFileSync(single, "utf8"), headerFirstCell);
  ensureDir(path.join(root, name));
  for (const cells of rows) {
    const slug = keyOf(cells);
    fs.writeFileSync(
      path.join(root, name, `${slug}.md`),
      `${TABLE_HEADER[name]}\n| ${cells.join(" | ")} |\n`,
    );
  }
  if (fold) fs.rmSync(single);
}

// export-log の生成ミラーを分割ファイルの exported_at 昇順連結で再生成する。
function regenerateExportMirror(root) {
  const dir = path.join(root, "export-log");
  const rows = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .flatMap((f) => tableRows(fs.readFileSync(path.join(dir, f), "utf8"), "packet"));
  rows.sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  const body = [TABLE_HEADER["export-log"], ...rows.map((c) => `| ${c.join(" | ")} |`)].join("\n") + "\n";
  fs.writeFileSync(path.join(root, "export-log.md"), body);
}

// ---- 読み手スナップショット（characterization と同型・5ファイル）。tmp の現状から取る。----
function snapshot(root) {
  const readSection = (name, headTok) => {
    const dir = path.join(root, name);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()
      .flatMap((f) => fs.readFileSync(path.join(dir, f), "utf8").split(new RegExp(`^${headTok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m")).slice(1).map((p) => headTok + p));
  };
  // deltas
  const deltas = readSection("deltas", "## Delta:").map((body) => ({
    packet: (body.match(/^## Delta:\s*(.+?)\s*—/m) || [])[1]?.trim() ?? null,
    status: (body.match(/^-\s*Status:\s*(\S+)/m) || [])[1]?.trim() ?? null,
    deferTags: [...body.matchAll(/^-\s*見送り:.*—\s*(却下|保留)/gm)].map((m) => m[1]),
  }));
  // drift tally
  const driftDir = path.join(root, "drift-log");
  const tally = {};
  if (fs.existsSync(driftDir)) {
    for (const f of fs.readdirSync(driftDir).filter((f) => f.endsWith(".md"))) {
      const body = fs.readFileSync(path.join(driftDir, f), "utf8");
      const pat = (body.match(/^-\s*pattern:\s*(.+)$/m) || [])[1]?.trim();
      const out = (body.match(/^-\s*outcome:\s*(.+)$/m) || [])[1]?.trim();
      const k = `${pat}|${out}`;
      tally[k] = (tally[k] || 0) + 1;
    }
  }
  // export-log (split, exported_at 昇順)
  const exDir = path.join(root, "export-log");
  const exportLog = !fs.existsSync(exDir) ? [] : fs.readdirSync(exDir).filter((f) => f.endsWith(".md"))
    .flatMap((f) => tableRows(fs.readFileSync(path.join(exDir, f), "utf8"), "packet"))
    .map(([packet, exported_at, commit]) => ({ packet, exported_at, commit }))
    .sort((a, b) => (a.exported_at < b.exported_at ? -1 : 1));
  // milestones (split)
  const msDir = path.join(root, "milestones");
  const milestones = !fs.existsSync(msDir) ? [] : fs.readdirSync(msDir).filter((f) => f.endsWith(".md"))
    .flatMap((f) => tableRows(fs.readFileSync(path.join(msDir, f), "utf8"), "event"))
    .map(([event, recorded_at, note]) => ({ event, recorded_at, note }))
    .sort((a, b) => (a.recorded_at < b.recorded_at ? -1 : 1));
  return { deltas, tally, exportLog, milestones };
}

// fixture（移行前 single 形）から期待スナップショットを作る。
function setupTmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "applog-mig-"));
  for (const f of ["deltas.md", "drift-log.md", "export-log.md", "milestones.md", "compass-archive.md"]) {
    fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  }
  return dir;
}

const EXPECT = {
  deltas: [{ packet: "export-route-by-case", status: "promoted", deferTags: ["却下", "保留"] }],
  tally: { "scope-creep|caught": 1 },
  exportLog: [
    { packet: "export-route-by-case", exported_at: "2026-06-18T09:00:00Z", commit: "25b28bf" },
    { packet: "append-log-規約の縫い目", exported_at: "2026-06-21T07:26:24Z", commit: "e0ad894" },
  ],
  milestones: [{ event: "本番構成を AWS ECS に確定", recorded_at: "2026-06-18", note: "開発合宿でインフラ方針を確定" }],
};

// ---- テスト ----

test("migration: 移行後も読み手が同じ情報を得る（behavior-preserving・Req 4.3/4.4）", () => {
  const dir = setupTmp();
  try {
    const before = snapshot(dir); // 単一形（split dir はまだ無い）— deltas/drift/milestones は空、後で比較は移行後
    migrate(dir);
    const after = snapshot(dir);
    assert.deepEqual(after.deltas, EXPECT.deltas);
    assert.deepEqual(after.tally, EXPECT.tally);
    assert.deepEqual(after.exportLog, EXPECT.exportLog);
    assert.deepEqual(after.milestones, EXPECT.milestones);
    void before;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("migration: 4ファイルは fold・export-log はミラー保持（Req 4.1/4.2a）", () => {
  const dir = setupTmp();
  try {
    migrate(dir);
    // fold される4ファイル: 旧単一ファイルが消えている。
    for (const f of ["deltas.md", "drift-log.md", "milestones.md", "compass-archive.md"]) {
      assert.ok(!fs.existsSync(path.join(dir, f)), `${f} は fold されている`);
    }
    // export-log は旧単一ファイルがミラーとして残る。
    assert.ok(fs.existsSync(path.join(dir, "export-log.md")), "export-log.md ミラーが残る");
    // 各分割ディレクトリが存在し実エントリを持つ。
    for (const d of ["deltas", "drift-log", "export-log", "milestones", "compass-archive"]) {
      const entries = fs.readdirSync(path.join(dir, d)).filter((f) => f.endsWith(".md"));
      assert.ok(entries.length >= 1, `${d}/ に分割エントリがある`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("migration: export-log ミラー == 分割の exported_at 昇順連結（Req 4.2a）", () => {
  const dir = setupTmp();
  try {
    migrate(dir);
    const mirrorRows = tableRows(fs.readFileSync(path.join(dir, "export-log.md"), "utf8"), "packet");
    assert.deepEqual(
      mirrorRows.map((c) => c[0]),
      ["export-route-by-case", "append-log-規約の縫い目"], // exported_at 昇順
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("migration: 孤児化しない — 移しきってから畳む（移行後に分割エントリ件数 == 移行前エントリ件数・Req 4.2）", () => {
  const dir = setupTmp();
  try {
    // 移行前のエントリ件数（単一形）を数える。
    const driftBefore = fs.readFileSync(path.join(dir, "drift-log.md"), "utf8").replace(/<!--[\s\S]*?-->/g, "").split(/^### drift-log entry\s*$/m).slice(1).filter((p) => p.trim()).length;
    const exBefore = tableRows(fs.readFileSync(path.join(dir, "export-log.md"), "utf8"), "packet").length;
    migrate(dir);
    const driftAfter = fs.readdirSync(path.join(dir, "drift-log")).filter((f) => f.endsWith(".md")).length;
    const exAfter = fs.readdirSync(path.join(dir, "export-log")).filter((f) => f.endsWith(".md")).length;
    assert.equal(driftAfter, driftBefore, "drift エントリが全て分割形へ移っている");
    assert.equal(exAfter, exBefore, "export-log エントリが全て分割形へ移っている");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("migration: 逆 migration（分割→旧単一）が rollback として成立する（Req 4.5）", () => {
  const dir = setupTmp();
  try {
    const originalDeltas = fs.readFileSync(path.join(dir, "deltas.md"), "utf8");
    migrate(dir);
    assert.ok(!fs.existsSync(path.join(dir, "deltas.md")), "移行で deltas.md は fold");
    // 逆 migration: deltas の分割ファイルを結合して旧単一形へ戻す（読み手情報が同じことだけ要求）。
    const reDir = path.join(dir, "deltas");
    const bodies = fs.readdirSync(reDir).filter((f) => f.endsWith(".md")).sort()
      .map((f) => fs.readFileSync(path.join(reDir, f), "utf8").trim());
    // 逆 migration 後の読み手情報が移行前と同一（packet/status/見送り tag）。
    const reSnap = bodies.map((body) => ({
      packet: (body.match(/^## Delta:\s*(.+?)\s*—/m) || [])[1]?.trim(),
      status: (body.match(/^-\s*Status:\s*(\S+)/m) || [])[1]?.trim(),
    }));
    assert.deepEqual(reSnap, [{ packet: "export-route-by-case", status: "promoted" }]);
    void originalDeltas;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
