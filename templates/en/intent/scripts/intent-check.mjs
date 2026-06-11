#!/usr/bin/env node
// intent-check — writeback enforcement の判定スクリプト
// （第1〜2層: 設定/成果物のパースと staleness 導出。CLI 本体は後続層で実装する）
//
// 動作要件: Node.js >= 18.17。node: プレフィックスの標準モジュールのみを使う
// 単一ファイル実装（外部依存なし）。templates/ja と templates/en に同一バイトで
// 配布される言語非依存の共通実装。
//
// 設計上の約束:
// - 状態ファイルを持たない。入力は .intent/ 配下の既存成果物（mode.md / deltas.md /
//   export-log.md）と git 履歴（spawnSync の引数配列で実行。シェル文字列を組み立てない）のみ。
// - fail-open: 設定の未記載・不正値・ファイル不在はすべて既定値
//   （enforcement=off / threshold=5 / 除外なし）へ静かにフォールバックし、停止しない。
//   不正値があったことは invalidFields で呼び出し側へ伝え、判定行の注記に使えるようにする。
//   git の失敗（CLI 不在・非リポジトリ・ハッシュ不存在）も例外にせず縮退する。

import { spawnSync } from "node:child_process";
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

/**
 * computeStaleness の結果（後続層が threshold / pending と合成して CheckResult を作る）。
 *
 * @typedef {object} StalenessResult
 * @property {number|null} commits 基準点以降に非除外パスへ触れたコミット数。
 *   基準点なし・git 利用不可（baseline.kind === "none"）のとき null
 * @property {{ kind: "export-hash"|"delta-date"|"none", value: string|null }} baseline
 *   採用された基準点。export-hash は短縮ハッシュ、delta-date は日付（YYYY-MM-DD）、
 *   none（not-applicable 相当）は value=null
 * @property {boolean} gitAvailable git CLI が実行でき、かつ cwd が git 作業ツリー内か
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

// 値が ISO 8601 の日付（任意で時刻つき）として実在するか。
// 形（YYYY-MM-DD 始まり）+ Date.parse の実パース + 日付部の round-trip の3点を要求し、
// プレースホルダ（`<ISO 8601 日付>`）・月範囲外（2026-13-45）に加えて、Date.parse が
// 03-03 へ繰り上げて受理してしまう暦に無い日付（2026-02-31）も弾く。
function isIsoDate(value) {
  const match = /^(\d{4}-\d{2}-\d{2})([T ].+)?$/.exec(value);
  if (!match) return false;
  if (Number.isNaN(Date.parse(value))) return false;
  const parsed = new Date(`${match[1]}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === match[1];
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

/**
 * deltas.md の内容から全 delta エントリのヘッダ日付を記載順に抽出する。
 *
 * Status は問わない（promoted / closed も含める）: delta エントリの存在自体が
 * 「その日付に writeback が行われた」証拠であり、staleness の基準点（フォールバック
 * 連鎖の第2候補）として有効なため。ヘッダ日付が ISO 8601 として実在しない行
 * （プレースホルダ `<ISO 8601 日付>` 等）は捨てる。
 *
 * @param {string|null|undefined} content deltas.md の内容。不在なら null
 * @returns {string[]} 有効な日付文字列（記載順・記録された文字列のまま）
 */
export function parseDeltaDates(content) {
  if (typeof content !== "string" || content === "") return [];

  /** @type {string[]} */
  const dates = [];
  for (const line of content.split(/\r?\n/)) {
    const header = DELTA_HEADER_RE.exec(line);
    if (header && isIsoDate(header[2])) dates.push(header[2]);
  }
  return dates;
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
// staleness — git 履歴からの導出（基準点フォールバック連鎖）
// ---------------------------------------------------------------------------

/**
 * git を同期実行し、成功時のみ stdout を返す。失敗（非ゼロ終了・CLI 不在 ENOENT）は
 * 例外にせず null を返す（フォールバック連鎖の入口）。シェルを介さず引数配列で渡す。
 *
 * @param {string} gitCmd git コマンド名（テスト用注入点。通常 "git"）
 * @param {string[]} args git 引数の配列
 * @param {string} cwd 実行ディレクトリ
 * @returns {string|null} stdout。失敗なら null
 */
function runGit(gitCmd, args, cwd) {
  const result = spawnSync(gitCmd, args, { cwd, encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) return null;
  return typeof result.stdout === "string" ? result.stdout : "";
}

// 有効な ISO 日付のうち最新（Date.parse が最大）のものを返す。無ければ null。
function latestIsoDate(dates) {
  let latest = null;
  for (const date of dates) {
    if (typeof date !== "string" || !isIsoDate(date)) continue;
    if (latest === null || Date.parse(date) > Date.parse(latest)) latest = date;
  }
  return latest;
}

// 翌日 00:00（ローカル時刻・タイムゾーン表記なし）の --since 値を作る。
// 同日コミットを数えない（false positive 回避の安全側。設計が許容する盲点）ための境界。
// Date コンストラクタが月末・年末の繰り上がりを正規化する。
function nextDayMidnight(isoDateOnly) {
  const [y, m, d] = isoDateOnly.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  const pad = (n) => String(n).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T00:00:00`;
}

// 計数用 pathspec: `.` 全体から .intent/（暗黙除外）と設定除外パスを除く。
// EnforcementConfig.exclude は先頭に .intent/ を含むため重複は捨てる。
function buildCountPathspec(excludePaths) {
  const spec = [".", `:(exclude)${IMPLICIT_EXCLUDE}`];
  const seen = new Set([IMPLICIT_EXCLUDE]);
  for (const exclude of excludePaths) {
    if (typeof exclude !== "string" || exclude === "" || seen.has(exclude)) continue;
    seen.add(exclude);
    spec.push(`:(exclude)${exclude}`);
  }
  return spec;
}

/**
 * staleness（基準点以降に `.intent/` と除外パス以外へ触れたコミット数）を git から導出する。
 *
 * 基準点のフォールバック連鎖（R2.1, R2.4 / design "IntentCheckScript"）:
 * 1. export-log 最新行のコミットハッシュ。`git cat-file -e <hash>^{commit}` で存在確認
 *    してから `git rev-list --count <hash>..HEAD -- <pathspec>` で数える。ハッシュ不存在
 *    （rebase / amend / shallow clone）や rev-list 失敗は例外にせず 2. へ。
 * 2. delta エントリ日付（最新のもの）。`git rev-list --count HEAD --since=<翌日 00:00>` で
 *    日付より後のコミットのみ数える（同日コミットは数えない安全側）。ただし最新 export
 *    より新しい delta 日付がある場合（= export 後に writeback 済みで、ハッシュ基準点は
 *    もう古い）は 1. より先に試す。
 * 3. どちらの基準点も使えなければ kind: "none"（not-applicable 相当、commits: null）。
 *
 * 非 git ディレクトリ・git CLI 不在は gitAvailable: false で即 kind: "none" を返し、
 * 例外を投げない（fail-open）。書き込みは一切行わず、同一入力に対して決定的。
 *
 * @param {object} options
 * @param {string} options.cwd 判定対象のプロジェクトルート（git 実行ディレクトリ）
 * @param {ExportLogEntry[]} [options.exportLog] parseExportLog の結果（記載順）
 * @param {string[]} [options.deltaDates] parseDeltaDates の結果（delta エントリの日付）
 * @param {string[]} [options.excludePaths] 計数から除く相対パス接頭辞
 *   （EnforcementConfig.exclude。`.intent/` は含まれていなくても常に暗黙除外する）
 * @param {string} [options.gitCmd] git コマンド名（テスト用の注入点。既定 "git"）
 * @returns {StalenessResult}
 */
export function computeStaleness({
  cwd,
  exportLog = [],
  deltaDates = [],
  excludePaths = [],
  gitCmd = "git",
}) {
  /** @type {(gitAvailable: boolean) => StalenessResult} */
  const none = (gitAvailable) => ({
    commits: null,
    baseline: { kind: "none", value: null },
    gitAvailable,
  });

  const insideWorkTree = runGit(gitCmd, ["rev-parse", "--is-inside-work-tree"], cwd);
  if (insideWorkTree === null || insideWorkTree.trim() !== "true") return none(false);

  const pathspec = buildCountPathspec(excludePaths);
  const countCommits = (revArgs) => {
    const out = runGit(gitCmd, ["rev-list", "--count", ...revArgs, "--", ...pathspec], cwd);
    if (out === null) return null;
    const count = Number.parseInt(out.trim(), 10);
    return Number.isInteger(count) && count >= 0 ? count : null;
  };

  const latestExport = exportLog.length > 0 ? exportLog[exportLog.length - 1] : null;
  const exportHash = latestExport && latestExport.commit ? latestExport.commit : null;
  const latestDelta = latestIsoDate(deltaDates);

  /** @type {Array<{ kind: "export-hash"|"delta-date", value: string, count: () => number|null }>} */
  const candidates = [];
  if (exportHash !== null) {
    candidates.push({
      kind: "export-hash",
      value: exportHash,
      count: () => {
        if (runGit(gitCmd, ["cat-file", "-e", `${exportHash}^{commit}`], cwd) === null) return null;
        return countCommits([`${exportHash}..HEAD`]);
      },
    });
  }
  if (latestDelta !== null) {
    const dateOnly = latestDelta.slice(0, 10);
    candidates.push({
      kind: "delta-date",
      value: dateOnly,
      count: () => countCommits(["HEAD", `--since=${nextDayMidnight(dateOnly)}`]),
    });
  }
  // 最新 export より delta 日付が厳密に新しい（export 後の writeback がある）ときだけ
  // delta-date を先頭へ。export 日時が不正で比較できない場合はハッシュ優先のまま。
  if (
    candidates.length === 2 &&
    latestExport !== null &&
    latestDelta !== null &&
    Date.parse(latestDelta) > Date.parse(latestExport.exportedAt)
  ) {
    candidates.reverse();
  }

  for (const candidate of candidates) {
    const commits = candidate.count();
    if (commits !== null) {
      return {
        commits,
        baseline: { kind: candidate.kind, value: candidate.value },
        gitAvailable: true,
      };
    }
  }
  return none(true);
}

// ---------------------------------------------------------------------------
// main guard — import 安全性の確保
// ---------------------------------------------------------------------------

// 直接実行（node .intent/scripts/intent-check.mjs）の判定。
// 現時点の main は意図的に何もしない最小実装（無出力・exit 0）。
// 判定の合成（CheckResult）と CLI 出力（判定行・終了コード）は後続層がここを拡張する。
const isMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  process.exit(0);
}
