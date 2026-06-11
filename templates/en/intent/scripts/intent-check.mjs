#!/usr/bin/env node
// intent-check — writeback enforcement の判定スクリプト（第1層: 設定と成果物のパース）
//
// 動作要件: Node.js >= 18.17。node: プレフィックスの標準モジュールのみを使う
// 単一ファイル実装（外部依存なし）。templates/ja と templates/en に同一バイトで
// 配布される言語非依存の共通実装。
//
// 設計上の約束:
// - 状態ファイルを持たない。入力は .intent/ 配下の既存成果物（mode.md / deltas.md /
//   export-log.md）と git 履歴のみ（git 連携・CLI 本体は後続層で実装する）。
// - fail-open: 設定の未記載・不正値・ファイル不在はすべて既定値
//   （enforcement=off / threshold=5 / 除外なし）へ静かにフォールバックし、停止しない。
//   不正値があったことは invalidFields で呼び出し側へ伝え、判定行の注記に使えるようにする。

import fs from "node:fs";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// 既定値（mode.md の Enforcement セクションが欠けているときの解釈）
// ---------------------------------------------------------------------------

const DEFAULT_ENFORCEMENT = "off";
const DEFAULT_THRESHOLD = 5;
// .intent/ は設定によらず常に staleness 計数から暗黙除外する。
// parseEnforcementConfig の返り値 exclude に必ず先頭で含めることで規約を一元化する。
const IMPLICIT_EXCLUDE = ".intent/";

const VALID_ENFORCEMENT = new Set(["off", "remind", "gate"]);

/**
 * mode.md の Enforcement セクションのパース結果。
 *
 * @typedef {object} EnforcementConfig
 * @property {"off"|"remind"|"gate"} enforcement 強制の強度（既定 off）
 * @property {number} threshold staleness 閾値コミット数（正の整数、既定 5）
 * @property {string[]} exclude 計数から除く相対パス接頭辞。先頭に必ず ".intent/"（暗黙除外）を含む
 * @property {string[]} invalidFields 不正値のため既定へフォールバックしたフィールド名
 *   （"enforcement" | "enforcement-threshold"。判定行の invalid 注記に使う）
 */

/**
 * export-log.md の1行（1 export）。
 *
 * @typedef {object} ExportLogEntry
 * @property {string} packet packet 名（packets.md との照合キー）
 * @property {string} exportedAt export 日時（ISO 8601。記録された文字列のまま）
 * @property {string|null} commit export 時点の短縮コミットハッシュ。記録 `-`（取得不可）は null
 */

// ---------------------------------------------------------------------------
// 共通ヘルパ
// ---------------------------------------------------------------------------

/**
 * ファイルを UTF-8 で読み、不在なら null を返す（fail-open の入口）。
 * 不在以外の I/O エラーは隠さず投げる（呼び出し側で exit 2 = 内部エラー扱いにする）。
 *
 * @param {string} filePath 読み取るファイルの絶対パス
 * @returns {string|null} ファイル内容。不在（ENOENT / ENOTDIR）なら null
 */
export function readTextIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    if (err && (err.code === "ENOENT" || err.code === "ENOTDIR")) return null;
    throw err;
  }
}

// 値が ISO 8601 の日付（任意で時刻つき）として実パース可能か。
// プレースホルダ（`<ISO 8601 日付>` 等）や範囲外の日付（2026-13-45）を弾く:
// 形（YYYY-MM-DD 始まり）と Date.parse の双方を要求する。
function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}([T ].+)?$/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

// ---------------------------------------------------------------------------
// mode.md — Enforcement セクションの寛容パース
// ---------------------------------------------------------------------------

// 設定行の形: `- **enforcement**: off`（太字マーカーは省略可: `- enforcement: off`）。
// scaffold に同居する説明行（`- **enforcement** — ...`）はコロン区切りでないため一致しない。
// 長いキーを先に置く（enforcement が enforcement-threshold の接頭辞のため）。
const CONFIG_LINE_RE =
  /^\s*-\s*(?:\*\*)?(enforcement-threshold|enforcement-exclude|enforcement)(?:\*\*)?\s*:\s*(.*)$/;

/**
 * mode.md の内容から enforcement 設定を寛容にパースする。
 *
 * 解釈規則（R1.3, R1.4, R2.5）:
 * - mode.md 不在（content = null）・フィールド未記載・空値 → 既定値（off / 5 / 除外なし）。
 *   invalid 扱いしない。
 * - 不正値（enforcement の値域外・threshold が正の整数でない）→ 既定値へフォールバックし、
 *   invalidFields にフィールド名を積む（判定行で「invalid value ignored」と注記するため）。
 * - `: ` と `:` は同一視する（値の前後空白は trim）。各フィールドは最初の設定行が勝つ。
 * - exclude はカンマ区切りで trim し空要素は捨てる。`.intent/` は常に暗黙除外として
 *   返り値 exclude の先頭に含める。
 *
 * @param {string|null|undefined} content mode.md の内容。不在なら null
 * @returns {EnforcementConfig} パース結果（常に完全な既定値つき）
 */
export function parseEnforcementConfig(content) {
  /** @type {EnforcementConfig} */
  const config = {
    enforcement: DEFAULT_ENFORCEMENT,
    threshold: DEFAULT_THRESHOLD,
    exclude: [IMPLICIT_EXCLUDE],
    invalidFields: [],
  };
  if (typeof content !== "string" || content === "") return config;

  /** @type {Record<string, string>} */
  const raw = {};
  for (const line of content.split(/\r?\n/)) {
    const match = CONFIG_LINE_RE.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (key in raw) continue; // 最初の設定行が勝つ
    raw[key] = value.trim();
  }

  // enforcement: 値域 off | remind | gate（大文字小文字は許容）。空値は未記載と同じ。
  if (raw.enforcement) {
    const value = raw.enforcement.toLowerCase();
    if (VALID_ENFORCEMENT.has(value)) {
      config.enforcement = /** @type {"off"|"remind"|"gate"} */ (value);
    } else {
      config.invalidFields.push("enforcement");
    }
  }

  // enforcement-threshold: 正の整数のみ有効。空値は未記載と同じ。
  if (raw["enforcement-threshold"]) {
    const value = raw["enforcement-threshold"];
    if (/^\d+$/.test(value) && Number.parseInt(value, 10) >= 1) {
      config.threshold = Number.parseInt(value, 10);
    } else {
      config.invalidFields.push("enforcement-threshold");
    }
  }

  // enforcement-exclude: カンマ区切り・trim・空要素除去。暗黙除外との重複は捨てる。
  if (raw["enforcement-exclude"]) {
    for (const entry of raw["enforcement-exclude"].split(",")) {
      const trimmed = entry.trim();
      if (trimmed === "" || trimmed === IMPLICIT_EXCLUDE) continue;
      config.exclude.push(trimmed);
    }
  }

  return config;
}

// ---------------------------------------------------------------------------
// deltas.md — pending エントリの厳格パース
// ---------------------------------------------------------------------------

// エントリヘッダの形: `## Delta: <名前> — <日付>`（区切りは em-dash）。
const DELTA_HEADER_RE = /^##\s*Delta:\s*(.+?)\s*—\s*(.+?)\s*$/;
// Status 行の形: `- Status: <値>`。値の判定は接頭辞除去 + trim 後のリテラル等価のみ。
const STATUS_LINE_RE = /^\s*-\s*Status:\s*(.*)$/;

/**
 * deltas.md の内容から pending 状態の delta を厳格パースで数え、packet 名を抽出する。
 *
 * 厳格条件（両方を満たすエントリのみ計数。substring 一致・緩い正規表現は使わない）:
 * - ヘッダ `## Delta: <名前> — <日付>` の日付が ISO 8601 として実パース可能
 *   （プレースホルダ `<ISO 8601 日付>` は不可）
 * - エントリ内の最初の Status 行の値（`- Status:` 接頭辞除去 + trim 後）が
 *   リテラル等価で `pending`（雛形の `pending | promoted (...)` や
 *   `promoted (2026-06-11)` 注記は構造的に除外）
 *
 * この規則により、配布直後の未記入 scaffold では必ず pending=0 になる。
 *
 * @param {string|null|undefined} content deltas.md の内容。不在なら null
 * @returns {string[]} pending な delta の packet 名（記載順）。件数 = pending 数
 */
export function parsePendingDeltas(content) {
  if (typeof content !== "string" || content === "") return [];

  /** @type {string[]} */
  const pending = [];
  /** @type {{ name: string, date: string, status: string|null } | null} */
  let entry = null;

  const finalize = () => {
    if (entry && entry.status === "pending" && isIsoDate(entry.date)) {
      pending.push(entry.name);
    }
    entry = null;
  };

  for (const line of content.split(/\r?\n/)) {
    const header = DELTA_HEADER_RE.exec(line);
    if (header) {
      finalize();
      entry = { name: header[1], date: header[2], status: null };
      continue;
    }
    if (/^##(?!#)/.test(line)) {
      // Delta 以外のレベル2見出し（### 学び 等のレベル3はエントリ内に留まる）
      finalize();
      continue;
    }
    if (entry && entry.status === null) {
      const status = STATUS_LINE_RE.exec(line);
      if (status) entry.status = status[1].trim();
    }
  }
  finalize();

  return pending;
}

// ---------------------------------------------------------------------------
// export-log.md — テーブル行の読み取り
// ---------------------------------------------------------------------------

/**
 * export-log.md の内容からデータ行（packet / exported_at / commit）を記載順に読み取る。
 * 見出し・引用（>）・テーブルヘッダ・区切り行（|---|）は読み飛ばす。
 * ヘッダのみの未記入 scaffold では空配列を返す。
 *
 * @param {string|null|undefined} content export-log.md の内容。不在なら null
 * @returns {ExportLogEntry[]} export 履歴（ファイル記載順）
 */
export function parseExportLog(content) {
  if (typeof content !== "string" || content === "") return [];

  /** @type {ExportLogEntry[]} */
  const entries = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue; // テーブル行以外（見出し・引用・空行）

    const cells = trimmed
      .split("|")
      .slice(1, trimmed.endsWith("|") ? -1 : undefined)
      .map((cell) => cell.trim());
    if (cells.length < 3) continue;
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue; // 区切り行 |---|---|---|
    if (cells[0] === "packet") continue; // ヘッダ行

    entries.push({
      packet: cells[0],
      exportedAt: cells[1],
      commit: cells[2] === "-" ? null : cells[2],
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// main guard — import 安全性の確保
// ---------------------------------------------------------------------------

// 直接実行（node .intent/scripts/intent-check.mjs）の判定。
// 現時点の main は意図的に何もしない最小実装（無出力・exit 0）。
// staleness 判定と CLI 出力（判定行・終了コード）は後続層がここを拡張する。
const isMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  process.exit(0);
}
