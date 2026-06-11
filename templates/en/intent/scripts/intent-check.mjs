#!/usr/bin/env node
// intent-check — writeback enforcement の判定スクリプト
//
// 使い方: node .intent/scripts/intent-check.mjs（引数なし。cwd = プロジェクトルート）
// stdout 1行目（機械可読の判定行・キー順固定）:
//   intent-check: result=<ok|stale|not-applicable> enforcement=<off|remind|gate>
//                 commits=<N|-> threshold=<M> grace=<in-implementation|-> pending=<K> block=<yes|no>
// 2行目以降は人間可読の根拠（基準点・grace 判定根拠・欠落 packet・pending packet 名・案内）。
// 終了コード: 0 = 通過（ok / not-applicable / off / remind の警告含む）
//             1 = ブロック（enforcement=gate かつ (stale または pending>0) のときのみ）
//             2 = 内部エラー（想定外例外。stderr に原因。呼び出し側は通過扱い = fail-open）
//
// 動作要件: Node.js >= 18.17。node: プレフィックスの標準モジュールのみを使う
// 単一ファイル実装（外部依存なし）。templates/ja と templates/en に同一バイトで
// 配布される言語非依存の共通実装（このため出力メッセージは英語に固定する）。
//
// 設計上の約束:
// - 状態ファイルを持たない。入力は .intent/ 配下の既存成果物（mode.md / deltas.md /
//   export-log.md）・`.kiro/specs/`（存在時、読み取りのみ）と git 履歴（spawnSync の
//   引数配列で実行。シェル文字列を組み立てない）のみ。ファイル書き込みはゼロ。
// - fail-open: 設定の未記載・不正値・ファイル不在はすべて既定値
//   （enforcement=off / threshold=5 / 除外なし）へ静かにフォールバックし、停止しない。
//   不正値があったことは invalidFields で呼び出し側へ伝え、人間可読部の注記に使う。
//   git の失敗（CLI 不在・非リポジトリ・ハッシュ不存在）も例外にせず縮退する。

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
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

/**
 * deltas.md の内容から全 delta エントリの名前（packet 名）を記載順に抽出する。
 *
 * Status は問わない: delta エントリの存在自体が「その packet について writeback が
 * 行われた」証拠であり、多重 export の grace 抑止判定（先行 export 行に対応する
 * writeback があるか）に使うため。parseDeltaDates と同じく、ヘッダ日付が ISO 8601
 * として実在しない行（プレースホルダ雛形等）は捨てる。
 *
 * @param {string|null|undefined} content deltas.md の内容。不在なら null
 * @returns {string[]} delta エントリの名前（記載順・記録された文字列のまま）
 */
export function parseDeltaNames(content) {
  if (typeof content !== "string" || content === "") return [];

  /** @type {string[]} */
  const names = [];
  for (const line of content.split(/\r?\n/)) {
    const header = DELTA_HEADER_RE.exec(line);
    if (header && isIsoDate(header[2])) names.push(header[1]);
  }
  return names;
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

// export-log の commit セルとして基準点に使ってよい形: 短縮〜完全長の hex ハッシュのみ。
// `HEAD` / `main` 等の revision 式は git 上は解決できてしまうが「export 時点の固定点」では
// ないため、ハッシュ形状でなければ記録なし扱いにしてフォールバック連鎖へ進める。
const HEX_HASH_RE = /^[0-9a-f]{4,40}$/i;

// 有効な ISO 日付のうち日付部（YYYY-MM-DD）が最新のものを返す。無ければ null。
// 比較は日付部の語彙比較（ゼロ埋め固定長なので辞書順 = 時系列順）。Date.parse 比較だと
// 日付のみ（UTC 解釈）とタイムゾーン付き時刻の混在で日付部の古い方が勝つことがある。
// 基準点として使うのは日付部だけなので、同日付内の時刻差は順位に影響させない（先勝ち）。
function latestIsoDate(dates) {
  let latest = null;
  for (const date of dates) {
    if (typeof date !== "string" || !isIsoDate(date)) continue;
    if (latest === null || date.slice(0, 10) > latest.slice(0, 10)) latest = date;
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
  // hex 形状でない commit セル（`HEAD` 等）は記録なし扱い（フォールバック連鎖へ）
  const exportHash =
    latestExport && latestExport.commit && HEX_HASH_RE.test(latestExport.commit)
      ? latestExport.commit
      : null;
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
// in-implementation grace — .kiro/specs/ との照合（読み取りのみ・任意依存）
// ---------------------------------------------------------------------------

// 未チェックタスク行（`- [ ]`）。1つでも残っていれば spec は進行中とみなす。
const UNCHECKED_TASK_RE = /^\s*-\s*\[ \]/m;

/**
 * packet 名に対応する進行中 spec を `.kiro/specs/` から探す。
 *
 * 照合規則（単純・決定的）: spec ディレクトリ名 または その tasks.md 本文が
 * packet 名（trim 済み）を含むこと（テキスト包含・大文字小文字非区別）。かつ
 * tasks.md に未チェックタスク `- [ ]` が1つ以上残っていること（= 実装進行中）。
 * 候補が複数あるときは名前順で最初の進行中 spec を返す（決定性の確保）。
 *
 * `.kiro/specs/` 不在・tasks.md 不在・照合不可はすべて null（grace なし）に縮退する。
 *
 * @param {string} cwd プロジェクトルート
 * @param {string} packetName export-log 最新行の packet 名（trim 済み・非空）
 * @returns {string|null} 進行中 spec のディレクトリ名。対応なしなら null
 */
function findInProgressSpecForPacket(cwd, packetName) {
  const specsDir = path.join(cwd, ".kiro", "specs");
  let entries;
  try {
    entries = fs.readdirSync(specsDir, { withFileTypes: true });
  } catch (err) {
    if (err && (err.code === "ENOENT" || err.code === "ENOTDIR")) return null;
    throw err;
  }

  const needle = packetName.toLowerCase();
  const dirNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const dirName of dirNames) {
    const tasks = readTextIfExists(path.join(specsDir, dirName, "tasks.md"));
    if (tasks === null) continue;
    const matches =
      dirName.toLowerCase().includes(needle) || tasks.toLowerCase().includes(needle);
    if (matches && UNCHECKED_TASK_RE.test(tasks)) return dirName;
  }
  return null;
}

// ---------------------------------------------------------------------------
// runCheck — 判定の合成（CheckResult）と出力契約
// ---------------------------------------------------------------------------

/**
 * runCheck の合成結果（design "Service Interface" の CheckResult）。
 * design 定義の8フィールドに、人間可読の根拠行を組み立てるための3フィールド
 * （graceSpec / graceBlockedBy / invalidFields）を追加している。
 *
 * 不変条件:
 * - result === "stale" ⇒ commits > threshold
 * - shouldBlock ⇒ enforcement === "gate"
 * - grace === "in-implementation" ⇒ result === "ok"
 *
 * @typedef {object} CheckResult
 * @property {"ok"|"stale"|"not-applicable"} result staleness 判定。
 *   enforcement=off では導出自体をスキップし "ok"（commits=null）と報告する
 *   （off では警告もブロックも発生せず判定値は消費されないため。人間可読部に明記）
 * @property {"off"|"remind"|"gate"} enforcement 適用された強制の強度
 * @property {number|null} commits 基準点以降の非除外コミット数（未導出・導出不能は null）
 * @property {number} threshold 適用された staleness 閾値
 * @property {{ kind: "export-hash"|"delta-date"|"none", value: string|null }} baseline 採用基準点
 * @property {"in-implementation"|null} grace 進行中 spec 検出により staleness を抑止した印
 * @property {string|null} graceSpec grace の根拠になった spec ディレクトリ名
 * @property {string[]} graceBlockedBy grace を抑止した欠落 packet 名（先行 export 行のうち
 *   対応する delta エントリが deltas.md に無いもの。多重 export の保護）
 * @property {string[]} pendingDeltas pending 状態の delta の packet 名（厳格パース）
 * @property {string[]} invalidFields 既定値へフォールバックした不正設定フィールド名
 * @property {boolean} shouldBlock enforcement==="gate" && (stale || pending>0)
 */

/**
 * pending / staleness / grace を合成して最終判定を作る（書き込みゼロ・決定的）。
 *
 * 判定の流れ:
 * 1. `.intent/` 不在 → not-applicable（前提条件。git も読まない）
 * 2. enforcement=off → staleness 導出をスキップして ok（pending の計数だけは行う）
 * 3. remind|gate → computeStaleness。基準点なしは not-applicable、
 *    commits > threshold なら stale。ただし in-implementation grace
 *    （export-log 最新 packet ↔ 進行中 spec の照合。先行 export 行の delta 欠落が
 *    あれば適用せず graceBlockedBy に欠落名）で ok へ抑止しうる
 * 4. shouldBlock = gate かつ (stale または pending>0)。staleness が not-applicable
 *    でも pending だけでブロックは成立する（R4.5）。pending 検査は grace 中も常に有効
 *
 * @param {string} cwd 判定対象のプロジェクトルート
 * @param {object} [opts]
 * @param {string} [opts.gitCmd] git コマンド名（テスト用の注入点。既定 "git"）
 * @returns {CheckResult}
 */
export function runCheck(cwd, { gitCmd = "git" } = {}) {
  const intentDir = path.join(cwd, ".intent");
  const config = parseEnforcementConfig(readTextIfExists(path.join(intentDir, "mode.md")));
  const deltasContent = readTextIfExists(path.join(intentDir, "deltas.md"));
  const pendingDeltas = parsePendingDeltas(deltasContent);
  const exportLog = parseExportLog(readTextIfExists(path.join(intentDir, "export-log.md")));

  /** @type {CheckResult} */
  const check = {
    result: "not-applicable",
    enforcement: config.enforcement,
    commits: null,
    threshold: config.threshold,
    baseline: { kind: "none", value: null },
    grace: null,
    graceSpec: null,
    graceBlockedBy: [],
    pendingDeltas,
    invalidFields: config.invalidFields,
    shouldBlock: false,
  };

  if (fs.existsSync(intentDir)) {
    if (config.enforcement === "off") {
      // off は強制を発動しないため staleness 導出（git 実行）を省略する。
      // result=ok / commits=null は「検査せず通過」の意（人間可読部に明記される）。
      check.result = "ok";
    } else {
      const staleness = computeStaleness({
        cwd,
        exportLog,
        deltaDates: parseDeltaDates(deltasContent),
        excludePaths: config.exclude,
        gitCmd,
      });
      check.commits = staleness.commits;
      check.baseline = staleness.baseline;
      if (staleness.baseline.kind === "none") {
        check.result = "not-applicable"; // pending のみで判定継続（R4.5）
      } else if (staleness.commits > config.threshold) {
        applyGrace(check, cwd, exportLog, deltasContent);
      } else {
        check.result = "ok";
      }
    }
  }

  check.shouldBlock =
    check.enforcement === "gate" && (check.result === "stale" || pendingDeltas.length > 0);
  return check;
}

/**
 * 閾値超過時の in-implementation grace 判定。check の result / grace / graceSpec /
 * graceBlockedBy を更新する（grace 不成立なら result="stale" のまま）。
 *
 * 適用条件（design "IntentCheckScript" の grace 段落）:
 * - export-log 最新行の packet が `.kiro/specs/` の進行中 spec に対応すること
 * - かつ最新行より前の全 export 行に、packet 名が一致する delta エントリ
 *   （status 不問 = writeback の証拠）が deltas.md に存在すること。
 *   欠落があれば grace を適用せず、欠落 packet 名を graceBlockedBy に積む
 *
 * @param {CheckResult} check 更新対象（result は呼び出し時点で stale 相当）
 * @param {string} cwd プロジェクトルート
 * @param {ExportLogEntry[]} exportLog export 履歴（記載順）
 * @param {string|null} deltasContent deltas.md の内容
 */
function applyGrace(check, cwd, exportLog, deltasContent) {
  check.result = "stale";
  const latest = exportLog.length > 0 ? exportLog[exportLog.length - 1] : null;
  const packet = latest ? latest.packet.trim() : "";
  if (packet === "") return; // 照合キーなし → grace なし

  const specName = findInProgressSpecForPacket(cwd, packet);
  if (specName === null) return; // 進行中 spec に対応しない → grace なし

  // 多重 export の保護: 先行 export 行の writeback 漏れがあるなら grace を抑止する
  const deltaNames = new Set(
    parseDeltaNames(deltasContent).map((name) => name.trim().toLowerCase()),
  );
  /** @type {string[]} */
  const missing = [];
  for (const row of exportLog.slice(0, -1)) {
    const name = row.packet.trim();
    if (name === "" || deltaNames.has(name.toLowerCase()) || missing.includes(name)) continue;
    missing.push(name);
  }
  if (missing.length > 0) {
    check.graceBlockedBy = missing;
    return;
  }

  check.result = "ok";
  check.grace = "in-implementation";
  check.graceSpec = specName;
}

/**
 * CheckResult を出力契約（design "Batch / Job Contract"）に整形する。
 * 1行目は機械可読の判定行（キー順固定・注記等で形式を崩さない）、2行目以降は
 * 人間可読の根拠。ja/en 同一バイト配布のためメッセージは英語に固定する。
 *
 * @param {CheckResult} check runCheck の結果
 * @returns {string[]} 出力行（先頭が判定行。常に2行以上）
 */
export function formatCheckOutput(check) {
  const commits = check.commits === null ? "-" : String(check.commits);
  const grace = check.grace === null ? "-" : check.grace;
  const block = check.shouldBlock ? "yes" : "no";
  const lines = [
    `intent-check: result=${check.result} enforcement=${check.enforcement} commits=${commits} threshold=${check.threshold} grace=${grace} pending=${check.pendingDeltas.length} block=${block}`,
  ];

  if (check.invalidFields.length > 0) {
    lines.push(
      `- config: ${check.invalidFields.join(", ")} (invalid value ignored; defaults applied)`,
    );
  }
  if (check.enforcement === "off") {
    lines.push("- enforcement=off: staleness check skipped (nothing is blocked; commits=-)");
  } else if (check.baseline.kind === "none") {
    lines.push("- baseline: none (no usable reference point or no git history; staleness not applicable)");
  } else {
    lines.push(`- baseline: ${check.baseline.kind} ${check.baseline.value}`);
  }
  if (check.grace === "in-implementation") {
    lines.push(
      `- grace: latest export packet matches in-progress spec ".kiro/specs/${check.graceSpec}/" (unchecked tasks remain); staleness suppressed`,
    );
  }
  if (check.graceBlockedBy.length > 0) {
    lines.push(
      `- grace suppressed: earlier export packet(s) without a writeback delta: ${check.graceBlockedBy.join(", ")}`,
    );
  }
  if (check.result === "stale") {
    lines.push(`- stale: ${check.commits} commits since baseline exceed threshold ${check.threshold}`);
  }
  if (check.pendingDeltas.length > 0) {
    lines.push(`- pending delta(s): ${check.pendingDeltas.join(", ")}`);
  }
  if (check.result === "stale" || check.pendingDeltas.length > 0) {
    lines.push("- next: run /intent-writeback to record learnings before moving on");
  }
  return lines;
}

// ---------------------------------------------------------------------------
// main guard — CLI 本体（import 時は副作用ゼロ）
// ---------------------------------------------------------------------------

// 直接実行（node .intent/scripts/intent-check.mjs）の判定。
const isMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    const check = runCheck(process.cwd());
    process.stdout.write(`${formatCheckOutput(check).join("\n")}\n`);
    process.exitCode = check.shouldBlock ? 1 : 0;
  } catch (err) {
    // 想定外の内部エラーのみここに来る（git 失敗やファイル不在は各層で縮退済み）。
    // 呼び出し側（スキル・pre-push フック）は exit 2 を通過扱いにする（fail-open）。
    const detail = err && err.stack ? err.stack : String(err);
    process.stderr.write(`intent-check: internal error\n${detail}\n`);
    process.exitCode = 2;
  }
}
