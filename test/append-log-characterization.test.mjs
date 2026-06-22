// append-log-discipline-seam / Task 1.1 — 移行前の読み手情報を characterization として固定する。
// node:test 標準・依存ゼロ（Req 5.3）。src/bin は読まない（Req 5.5）。
//
// 設計上の前提（design L243-271 / research L31-35）:
//   分割移行（walking skeleton）の behavior-preserving を機械判定するため、移行 *前* に
//   status/improve/writeback/overview が deltas / drift-log から得る情報を固定する（Req 4.1/4.4）。
//   この時点では移行が存在しないので green であるのが正しい（characterization は移行の砦）。
//
//   観測対象は research が特定した最低3点（Req 4.3）:
//     (a) deltas: 「packet 名 → delta status / 見送り tag の照合」
//     (b) drift-log: 「pattern × outcome の集計」
//     (c) 記録の中身不変の砦: drift-log の9キー固定順 と deltas エントリ書式をスナップショットに含める。
//
//   抽出器は単一ファイル形式 / 分割形式の *どちらからも同じ情報* を返す。これにより
//   後続タスク（walking skeleton 移行）で分割形に対して同じ抽出器を回したとき、同一の
//   golden snapshot が得られなければ失敗する discriminative oracle になる（Req 4.2）。
//
//   重要: 本テストは drift-watch.test.mjs（9キー byte 検査）を変更しない。9キー固定順は
//   ここでも独立に観測しスナップショットに焼き込むことで「中身不変」を二重に固定する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, "fixtures", "append-log-discipline");

// drift-log の9キー固定順（drift-watch.test.mjs の NINE_KEYS と同一順。ここで独立に再宣言し
// スナップショットの一部として焼き込むことで「9キー固定順が変わったら落ちる」砦を作る）。
const NINE_KEYS = [
  "pattern",
  "stage",
  "packet",
  "mechanism",
  "outcome",
  "user-verdict",
  "recorded_at",
  "commit",
  "note",
];

// ---------------------------------------------------------------------------
// 抽出器（読み手が得る情報）— 単一ファイル形式・分割形式のどちらにも適用できる。
// 入力は「deltas のエントリ本文の配列」「drift-log のエントリ本文の配列」。
// 単一ファイルは1本文に複数エントリ、分割は1ファイル1エントリだが、抽出器は
// 「エントリ本文の集合」を受けるので両形式で同じ。
// ---------------------------------------------------------------------------

// 単一ファイル deltas を「## Delta:」見出しごとのエントリ本文に切る。
function splitDeltasEntries(content) {
  const parts = content.split(/^## Delta:/m).slice(1);
  return parts.map((p) => "## Delta:" + p);
}

// 単一ファイル drift-log を「### drift-log entry」ごとのエントリ本文に切る。
// 記入見本（HTML コメント `<!-- ... -->` 内）は実エントリではないので除外する。
function splitDriftEntries(content) {
  // HTML コメントブロックを丸ごと除去（記入見本を実エントリと誤認しない）。
  const withoutComments = content.replace(/<!--[\s\S]*?-->/g, "");
  const parts = withoutComments.split(/^### drift-log entry\s*$/m).slice(1);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

// (a) deltas: packet 名 → { status, 見送り tag } の照合。
function extractDeltasReaderInfo(entryBodies) {
  return entryBodies.map((body) => {
    const nameMatch = body.match(/^## Delta:\s*(.+?)\s*—/m);
    const packet = nameMatch ? nameMatch[1].trim() : null;
    const statusMatch = body.match(/^-\s*Status:\s*(\S+)/m);
    const status = statusMatch ? statusMatch[1].trim() : null;
    // 見送り tag（却下 / 保留）を行ごとに照合する。
    const deferTags = [];
    for (const m of body.matchAll(/^-\s*見送り:.*—\s*(却下|保留)/gm)) {
      deferTags.push(m[1]);
    }
    return { packet, status, deferTags };
  });
}

// (b) drift-log: pattern × outcome の集計。+ (c) 9キー固定順の観測。
function extractDriftReaderInfo(entryBodies) {
  const keyOrderPerEntry = [];
  const tally = {}; // `${pattern}|${outcome}` → count
  for (const body of entryBodies) {
    const keys = [];
    const fields = {};
    for (const raw of body.split("\n")) {
      const m = raw.trim().match(/^-\s*([a-z_-]+):\s*(.*)$/);
      if (m && NINE_KEYS.includes(m[1])) {
        keys.push(m[1]);
        fields[m[1]] = m[2].trim();
      }
    }
    keyOrderPerEntry.push(keys);
    const cell = `${fields.pattern}|${fields.outcome}`;
    tally[cell] = (tally[cell] || 0) + 1;
  }
  return { tally, keyOrderPerEntry };
}

// ---------------------------------------------------------------------------
// add（残3ファイル）の抽出器。export-log / milestones はテーブル行、compass-archive は6欄 ADR。
// いずれも「読み手が得る情報」を単一ファイル形式・分割形式のどちらからも同じく返す。
// ---------------------------------------------------------------------------

// テーブル本文（`| a | b | c |` 行の配列）を抽出する。ヘッダ行（packet/event 等）と
// 区切り行（---）は除外し、データ行のセル配列を返す。単一ファイル/分割で共通。
function parseTableRows(content, headerFirstCell) {
  const rows = [];
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length === 0) continue;
    if (cells[0] === headerFirstCell) continue; // ヘッダ行
    if (cells.every((c) => /^-+$/.test(c) || c === "")) continue; // 区切り行
    rows.push(cells);
  }
  return rows;
}

// (d) export-log: packet 名 → { exported_at, commit } の照合（status の現行 Source Packet・
// writeback の書き戻し漏れ突合・intent-check の鮮度が読む情報）。exported_at 昇順に整列して返す。
function extractExportLogReaderInfo(entryContents) {
  const rows = entryContents.flatMap((c) => parseTableRows(c, "packet"));
  return rows
    .map(([packet, exported_at, commit]) => ({ packet, exported_at, commit }))
    .sort((a, b) => (a.exported_at < b.exported_at ? -1 : a.exported_at > b.exported_at ? 1 : 0));
}

// (e) milestones: event → recorded_at の照合（improve の Revisit substring 照合・status の
// 未消化検出が読む情報）。event 自然文を保持する。recorded_at 昇順に整列して返す。
function extractMilestonesReaderInfo(entryContents) {
  const rows = entryContents.flatMap((c) => parseTableRows(c, "event"));
  return rows
    .map(([event, recorded_at, note]) => ({ event, recorded_at, note }))
    .sort((a, b) => (a.recorded_at < b.recorded_at ? -1 : a.recorded_at > b.recorded_at ? 1 : 0));
}

// (f) compass-archive: superseded Decision Rule の系譜（6欄 + 後継参照）。6欄の値と superseded
// 先を観測対象にし、6欄が byte で保たれることを砦にする。
const SIX_FIELDS = [
  "Context",
  "Decision",
  "Why",
  "Alternatives considered",
  "Consequences",
  "Revisit when",
];
function extractCompassArchiveReaderInfo(entryContents) {
  const entries = [];
  for (const content of entryContents) {
    for (const raw of content.split("\n")) {
      const line = raw.trim();
      if (!line.startsWith("- **Context**:")) continue;
      const fields = {};
      for (const key of SIX_FIELDS) {
        const re = new RegExp(`\\*\\*${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\*\\*:\\s*(.*?)\\s*(?:/ \\*\\*|—\\s*superseded:|$)`);
        const m = line.match(re);
        fields[key] = m ? m[1].trim() : null;
      }
      const supMatch = line.match(/—\s*superseded:\s*(.+)$/);
      fields.superseded = supMatch ? supMatch[1].trim() : null;
      entries.push(fields);
    }
  }
  return entries;
}

// 読み手情報を一つのスナップショットへ束ねる（status/writeback=deltas、improve=drift cross、
// 9キー固定順=中身不変の砦、+ add の export-log / milestones / compass-archive）。
// 後続の分割移行はこの object と deep-equal でなければならない。
function readerSnapshot(deltasEntries, driftEntries, exportLog, milestones, compassArchive) {
  return {
    deltas: extractDeltasReaderInfo(deltasEntries),
    drift: extractDriftReaderInfo(driftEntries),
    exportLog: extractExportLogReaderInfo(exportLog ?? []),
    milestones: extractMilestonesReaderInfo(milestones ?? []),
    compassArchive: extractCompassArchiveReaderInfo(compassArchive ?? []),
  };
}

// ---------------------------------------------------------------------------
// 形式別ローダ（単一ファイル / 分割ディレクトリ）。同じ抽出器に食わせる。
// ---------------------------------------------------------------------------
// 分割ディレクトリ配下の .md を名前順に読み、各ファイル内容の配列を返す。
function readSplitDir(...segments) {
  const dir = path.join(FIX, "split", ...segments);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"));
}

function loadSingleForm() {
  const deltas = splitDeltasEntries(
    fs.readFileSync(path.join(FIX, "deltas.md"), "utf8"),
  );
  const drift = splitDriftEntries(
    fs.readFileSync(path.join(FIX, "drift-log.md"), "utf8"),
  );
  const exportLog = [fs.readFileSync(path.join(FIX, "export-log.md"), "utf8")];
  const milestones = [fs.readFileSync(path.join(FIX, "milestones.md"), "utf8")];
  const compassArchive = [
    fs.readFileSync(path.join(FIX, "compass-archive.md"), "utf8"),
  ];
  return readerSnapshot(deltas, drift, exportLog, milestones, compassArchive);
}

function loadSplitForm() {
  const deltas = readSplitDir("deltas").flatMap(splitDeltasEntries);
  const drift = readSplitDir("drift-log").flatMap(splitDriftEntries);
  const exportLog = readSplitDir("export-log");
  const milestones = readSplitDir("milestones");
  const compassArchive = readSplitDir("compass-archive");
  return readerSnapshot(deltas, drift, exportLog, milestones, compassArchive);
}

// ---------------------------------------------------------------------------
// Golden snapshot（移行前の読み手情報の固定値）。観測対象が移行後に変わったら落ちる。
// ---------------------------------------------------------------------------
const GOLDEN = {
  deltas: [
    {
      packet: "export-route-by-case",
      status: "promoted",
      deferTags: ["却下", "保留"],
    },
  ],
  drift: {
    tally: { "scope-creep|caught": 1 },
    keyOrderPerEntry: [NINE_KEYS],
  },
  // (d) export-log: packet→exported_at/commit（exported_at 昇順）。
  exportLog: [
    { packet: "export-route-by-case", exported_at: "2026-06-18T09:00:00Z", commit: "25b28bf" },
    { packet: "append-log-規約の縫い目", exported_at: "2026-06-21T07:26:24Z", commit: "e0ad894" },
  ],
  // (e) milestones: event→recorded_at（recorded_at 昇順）。event 自然文は不変。
  milestones: [
    { event: "本番構成を AWS ECS に確定", recorded_at: "2026-06-18", note: "開発合宿でインフラ方針を確定" },
  ],
  // (f) compass-archive: superseded Decision Rule の6欄 + 後継参照（byte 不変の砦）。
  compassArchive: [
    {
      Context: "target format の正本が無く出口選択が暗黙だった",
      Decision: "format を packet frontmatter に持たせる",
      Why: "出口を案件ごとに明示したい",
      "Alternatives considered": "steering へ持たせる案（全体に効きすぎる）",
      Consequences: "INV9 に接続",
      "Revisit when": "openspec 以外の出口が増えたとき",
      superseded: "DR26（mode.local.md 任意 format 行へ移行）",
    },
  ],
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

test("characterization: 単一ファイル形式（移行前）の読み手情報が golden と一致する（Req 4.1）", () => {
  assert.deepEqual(loadSingleForm(), GOLDEN);
});

test("characterization (a): deltas の packet 名→status / 見送り tag 照合が観測対象に含まれる（Req 4.3）", () => {
  const snap = loadSingleForm();
  assert.deepEqual(snap.deltas[0], {
    packet: "export-route-by-case",
    status: "promoted",
    deferTags: ["却下", "保留"],
  });
});

test("characterization (b): drift-log の pattern × outcome 集計が観測対象に含まれる（Req 4.3）", () => {
  const snap = loadSingleForm();
  assert.deepEqual(snap.drift.tally, { "scope-creep|caught": 1 });
});

test("characterization (c): drift-log の9キー固定順が中身不変の砦としてスナップショットに含まれる（Req 5.1）", () => {
  const snap = loadSingleForm();
  assert.deepEqual(snap.drift.keyOrderPerEntry, [NINE_KEYS]);
});

test("characterization (d): export-log の packet→exported_at/commit 照合が観測対象に含まれる（Req 4.3）", () => {
  const snap = loadSingleForm();
  assert.deepEqual(snap.exportLog, GOLDEN.exportLog);
});

test("characterization (e): milestones の event→recorded_at 照合（improve substring・status 未消化の砦）が観測対象に含まれる（Req 4.3）", () => {
  const snap = loadSingleForm();
  assert.deepEqual(snap.milestones, GOLDEN.milestones);
});

test("characterization (f): compass-archive の6欄+後継参照が byte 不変の砦としてスナップショットに含まれる（Req 7.1）", () => {
  const snap = loadSingleForm();
  assert.deepEqual(snap.compassArchive, GOLDEN.compassArchive);
});

test("characterization (discriminative): 同じ抽出器が分割形からも同一スナップショットを返す（Req 4.2 — 移行後に変われば失敗）", () => {
  // この時点では移行は存在しないが、後続タスクの移行が情報を落とさないことを
  // 同一抽出器・同一 golden で機械判定するための砦。単一==分割==golden を要求する。
  assert.deepEqual(loadSplitForm(), GOLDEN);
  assert.deepEqual(loadSplitForm(), loadSingleForm());
});
