// intent-check スクリプト第1〜2層（enforcement 設定/成果物のパースと staleness 導出）のテスト
// (node:test 標準・依存ゼロ)
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeCopyPlan,
  applyPlan,
  install,
  defaultTemplatesDir,
  resolveLangRoot,
} from "../src/install.mjs";
import {
  parseEnforcementConfig,
  parsePendingDeltas,
  parseDeltaDates,
  parseDeltaNames,
  parseExportLog,
  readTextIfExists,
  computeStaleness,
  runCheck,
  formatCheckOutput,
} from "../templates/ja/intent/scripts/intent-check.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JA_INTENT = path.join(HERE, "..", "templates", "ja", "intent");
const EN_INTENT = path.join(HERE, "..", "templates", "en", "intent");

function tmpDir(prefix = "ip-enforcement-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ----------------------------------------------------------------------------
// 配布の前提: intent-check.mjs は ja/en で同一バイト（言語非依存の共通実装）
// ----------------------------------------------------------------------------

test("intent-check.mjs は ja/en 両ツリーに存在しバイト一致する", () => {
  const ja = fs.readFileSync(path.join(JA_INTENT, "scripts", "intent-check.mjs"));
  const en = fs.readFileSync(path.join(EN_INTENT, "scripts", "intent-check.mjs"));
  assert.ok(ja.length > 0, "ja スクリプトが空でない");
  assert.ok(ja.equals(en), "ja/en の intent-check.mjs はバイト一致すること");
});

// ----------------------------------------------------------------------------
// parseEnforcementConfig — mode.md の Enforcement セクション（寛容パース）
// ----------------------------------------------------------------------------

test("未記入 scaffold の mode.md (ja/en) は off / 5 / 除外なし（.intent/ のみ暗黙除外）", () => {
  for (const intentDir of [JA_INTENT, EN_INTENT]) {
    const content = fs.readFileSync(path.join(intentDir, "mode.md"), "utf8");
    const config = parseEnforcementConfig(content);
    assert.equal(config.enforcement, "off");
    assert.equal(config.threshold, 5);
    assert.deepEqual(config.exclude, [".intent/"]);
    assert.deepEqual(config.invalidFields, []);
  }
});

test("mode.md 不在（content = null / undefined）は既定値にフォールバックし invalid 扱いしない", () => {
  for (const content of [null, undefined]) {
    const config = parseEnforcementConfig(content);
    assert.equal(config.enforcement, "off");
    assert.equal(config.threshold, 5);
    assert.deepEqual(config.exclude, [".intent/"]);
    assert.deepEqual(config.invalidFields, []);
  }
});

test("Enforcement フィールドが未記載の mode.md は既定値（invalid フラグなし）", () => {
  const content = "# Active Mode\n\n- **mode**: standard\n- **selected**: 2026-06-11\n";
  const config = parseEnforcementConfig(content);
  assert.equal(config.enforcement, "off");
  assert.equal(config.threshold, 5);
  assert.deepEqual(config.exclude, [".intent/"]);
  assert.deepEqual(config.invalidFields, []);
});

test("有効な設定値（remind / gate・閾値・除外パス）を読み取る", () => {
  const content = [
    "## Enforcement（ユーザー管理）",
    "",
    "- **enforcement**: gate",
    "- **enforcement-threshold**: 12",
    "- **enforcement-exclude**: docs/, vendor/lib",
    "",
  ].join("\n");
  const config = parseEnforcementConfig(content);
  assert.equal(config.enforcement, "gate");
  assert.equal(config.threshold, 12);
  assert.deepEqual(config.exclude, [".intent/", "docs/", "vendor/lib"]);
  assert.deepEqual(config.invalidFields, []);
});

test("太字マーカーなしのフィールド行 (- enforcement: remind) も許容する", () => {
  const content = [
    "## Enforcement",
    "",
    "- enforcement: remind",
    "- enforcement-threshold: 3",
    "- enforcement-exclude: generated/",
    "",
  ].join("\n");
  const config = parseEnforcementConfig(content);
  assert.equal(config.enforcement, "remind");
  assert.equal(config.threshold, 3);
  assert.deepEqual(config.exclude, [".intent/", "generated/"]);
  assert.deepEqual(config.invalidFields, []);
});

test("不正な enforcement 値は off にフォールバックし invalidFields で報告する", () => {
  const config = parseEnforcementConfig("- **enforcement**: gaate\n");
  assert.equal(config.enforcement, "off");
  assert.deepEqual(config.invalidFields, ["enforcement"]);
});

test("enforcement 値の大文字小文字差は意図的に許容する（Off → off / GATE → gate）", () => {
  // 寛容パースの一部として lowercase 正規化は仕様（タイポではなく表記ゆれの吸収）。
  const off = parseEnforcementConfig("- **enforcement**: Off\n");
  assert.equal(off.enforcement, "off");
  assert.deepEqual(off.invalidFields, []);
  const gate = parseEnforcementConfig("- **enforcement**: GATE\n");
  assert.equal(gate.enforcement, "gate");
  assert.deepEqual(gate.invalidFields, []);
});

test("不正な閾値（非数値・負・ゼロ・非整数）は 5 にフォールバックし invalidFields で報告する", () => {
  for (const bad of ["abc", "-3", "0", "3.5", "5 commits"]) {
    const config = parseEnforcementConfig(`- **enforcement-threshold**: ${bad}\n`);
    assert.equal(config.threshold, 5, `threshold "${bad}" は 5 に倒れること`);
    assert.deepEqual(config.invalidFields, ["enforcement-threshold"]);
  }
});

test("空の値（値なし・末尾スペースのみ）は未記載と同じ扱い（invalid ではない）", () => {
  // scaffold 実物は `- **enforcement-exclude**: `（末尾スペース）。`: ` と `:` を同一視する。
  const withSpace = parseEnforcementConfig("- **enforcement-exclude**: \n- **enforcement**: \n");
  const withoutSpace = parseEnforcementConfig("- **enforcement-exclude**:\n- **enforcement**:\n");
  for (const config of [withSpace, withoutSpace]) {
    assert.equal(config.enforcement, "off");
    assert.equal(config.threshold, 5);
    assert.deepEqual(config.exclude, [".intent/"]);
    assert.deepEqual(config.invalidFields, []);
  }
});

test("除外パスはカンマ区切りで trim され、空要素は捨てられ、.intent/ は重複しない", () => {
  const config = parseEnforcementConfig(
    "- **enforcement-exclude**: docs/ ,  , vendor/ , .intent/ ,\n",
  );
  assert.deepEqual(config.exclude, [".intent/", "docs/", "vendor/"]);
});

test("説明文の箇条書き（`- **enforcement** — ...`）はフィールド行として誤認しない", () => {
  // scaffold には em-dash 区切りの説明行が同居する。コロン区切りの設定行だけを読むこと。
  const content = [
    "- **enforcement**: remind",
    "- **enforcement** — 強度の説明です。値は `off` | `remind` | `gate` の3つです:",
    "- **enforcement-threshold** — 閾値の説明です。正の整数（既定: 5）。",
  ].join("\n");
  const config = parseEnforcementConfig(content);
  assert.equal(config.enforcement, "remind");
  assert.equal(config.threshold, 5);
  assert.deepEqual(config.invalidFields, []);
});

// ----------------------------------------------------------------------------
// parsePendingDeltas — deltas.md の厳格パース
// ----------------------------------------------------------------------------

test("未記入 scaffold の deltas.md (ja/en) はプレースホルダ雛形のみで pending=0", () => {
  for (const intentDir of [JA_INTENT, EN_INTENT]) {
    const content = fs.readFileSync(path.join(intentDir, "deltas.md"), "utf8");
    assert.deepEqual(parsePendingDeltas(content), []);
  }
});

test("実エントリの pending は packet 名つきで数えられる", () => {
  const content = [
    "# Intent Deltas",
    "",
    "## Delta: checkout-refactor — 2026-06-11",
    "",
    "- Status: pending",
    "- Source: .intent/cc-sdd/ の Source Packet",
    "",
    "### 学び",
    "",
    "- [decision] 新しい決定",
  ].join("\n");
  assert.deepEqual(parsePendingDeltas(content), ["checkout-refactor"]);
});

test("promoted / closed / 注記つきエントリは pending と数えない（リテラル等価のみ）", () => {
  const content = [
    "## Delta: promoted-packet — 2026-06-10",
    "",
    "- Status: promoted (2026-06-11)",
    "",
    "## Delta: closed-packet — 2026-06-10",
    "",
    "- Status: closed (2026-06-11)",
    "",
    "## Delta: annotated-packet — 2026-06-10",
    "",
    "- Status: pending (re-export 待ち)",
    "",
    "## Delta: real-pending — 2026-06-11",
    "",
    "- Status: pending",
  ].join("\n");
  // substring 一致は不可: "pending (...)" や "promoted (...)" は数えない
  assert.deepEqual(parsePendingDeltas(content), ["real-pending"]);
});

test("プレースホルダの Status 行（pending | promoted (...) | closed (...)）は数えない", () => {
  const content = [
    "## Delta: some-packet — 2026-06-11",
    "",
    "- Status: pending | promoted (<昇格日>) | closed (<クローズ日>)",
  ].join("\n");
  assert.deepEqual(parsePendingDeltas(content), []);
});

test("ヘッダ日付が ISO 8601 として実パース不能なエントリは数えない", () => {
  const content = [
    "## Delta: placeholder — <ISO 8601 日付>",
    "",
    "- Status: pending",
    "",
    "## Delta: bad-date — 2026-13-45",
    "",
    "- Status: pending",
    "",
    "## Delta: good-date — 2026-06-11",
    "",
    "- Status: pending",
  ].join("\n");
  assert.deepEqual(parsePendingDeltas(content), ["good-date"]);
});

test("暦上実在しない繰り上がり日付（2026-02-31）のエントリは数えない", () => {
  // Date.parse は "2026-02-31" を 03-03 に繰り上げて受理してしまう。
  // isIsoDate は日付部の round-trip 検証でこれを弾くこと。
  const content = ["## Delta: rollover — 2026-02-31", "", "- Status: pending"].join("\n");
  assert.deepEqual(parsePendingDeltas(content), []);
  assert.deepEqual(parseDeltaDates(content), []);
});

test("日時つき ISO 8601 ヘッダも有効、複数 pending は記載順に返る", () => {
  const content = [
    "## Delta: first — 2026-06-10T09:30:00Z",
    "",
    "- Status: pending",
    "",
    "## Delta: second — 2026-06-11",
    "",
    "- Status: pending",
  ].join("\n");
  assert.deepEqual(parsePendingDeltas(content), ["first", "second"]);
});

test("deltas.md 不在（content = null）や空文字列は pending=0", () => {
  assert.deepEqual(parsePendingDeltas(null), []);
  assert.deepEqual(parsePendingDeltas(""), []);
});

// ----------------------------------------------------------------------------
// parseDeltaDates — staleness 基準点用の日付抽出（status 不問）
// ----------------------------------------------------------------------------

test("parseDeltaDates は全エントリの有効な日付を status 不問で記載順に返す", () => {
  // promoted も含める: delta エントリの存在自体が「その日に writeback した」証拠であり、
  // staleness の基準点として有効なため。
  const content = [
    "## Delta: promoted-one — 2026-06-09",
    "",
    "- Status: promoted (2026-06-10)",
    "",
    "## Delta: placeholder — <ISO 8601 日付>",
    "",
    "- Status: pending",
    "",
    "## Delta: pending-one — 2026-06-11T09:30:00Z",
    "",
    "- Status: pending",
  ].join("\n");
  assert.deepEqual(parseDeltaDates(content), ["2026-06-09", "2026-06-11T09:30:00Z"]);
});

test("parseDeltaDates は不在（null）・空文字列・未記入 scaffold (ja/en) で空配列", () => {
  assert.deepEqual(parseDeltaDates(null), []);
  assert.deepEqual(parseDeltaDates(""), []);
  for (const intentDir of [JA_INTENT, EN_INTENT]) {
    const content = fs.readFileSync(path.join(intentDir, "deltas.md"), "utf8");
    assert.deepEqual(parseDeltaDates(content), []);
  }
});

// ----------------------------------------------------------------------------
// parseExportLog — export-log.md のテーブル読み取り
// ----------------------------------------------------------------------------

test("未記入 scaffold の export-log.md (ja/en) はヘッダのみで空配列", () => {
  for (const intentDir of [JA_INTENT, EN_INTENT]) {
    const content = fs.readFileSync(path.join(intentDir, "export-log.md"), "utf8");
    assert.deepEqual(parseExportLog(content), []);
  }
});

test("export-log のデータ行を記載順に読み取り、commit の `-` は null とする", () => {
  const content = [
    "# Export Log",
    "",
    "> /intent-export-cc-sdd が export ごとに1行追記します。",
    "",
    "| packet | exported_at | commit |",
    "|---|---|---|",
    "| checkout-refactor | 2026-06-11T11:00:00Z | a1b2c3d |",
    "| legacy-api-wrap | 2026-06-12T09:30:00Z | - |",
    "",
  ].join("\n");
  assert.deepEqual(parseExportLog(content), [
    { packet: "checkout-refactor", exportedAt: "2026-06-11T11:00:00Z", commit: "a1b2c3d" },
    { packet: "legacy-api-wrap", exportedAt: "2026-06-12T09:30:00Z", commit: null },
  ]);
});

test("export-log 不在（content = null）や空文字列は空配列", () => {
  assert.deepEqual(parseExportLog(null), []);
  assert.deepEqual(parseExportLog(""), []);
});

// ----------------------------------------------------------------------------
// computeStaleness — git fixture による基準点フォールバック連鎖と計数
// ----------------------------------------------------------------------------

// fixture 用 git 実行。失敗はテスト失敗として即座に可視化する。
function gitIn(dir, args, env = {}) {
  const res = spawnSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  assert.equal(res.status, 0, `git ${args.join(" ")} failed: ${res.stderr}`);
  return res.stdout.trim();
}

function initGitFixture() {
  const dir = tmpDir("ip-staleness-");
  gitIn(dir, ["init", "-q"]);
  gitIn(dir, ["config", "user.email", "fixture@example.com"]);
  gitIn(dir, ["config", "user.name", "Fixture"]);
  gitIn(dir, ["config", "commit.gpgsign", "false"]);
  return dir;
}

// 1ファイル変更を1コミットする。date はタイムゾーン表記なしのローカル時刻で渡し、
// rev-list --since（同じくローカル解釈）との比較をマシンの TZ に依存させない。
function commitFile(dir, relPath, content, date) {
  const abs = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  gitIn(dir, ["add", "-A"]);
  gitIn(dir, ["commit", "-q", "-m", `commit ${relPath}`], {
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  });
  return gitIn(dir, ["rev-parse", "--short", "HEAD"]);
}

test("export-hash 基準点: ハッシュ以降の非除外コミットだけを数える（.intent/ 暗黙除外 + 設定除外）", () => {
  const dir = initGitFixture();
  const base = commitFile(dir, "src/app.js", "v1", "2026-06-10T09:00:00");
  commitFile(dir, "src/app.js", "v2", "2026-06-10T10:00:00");
  commitFile(dir, "src/lib.js", "v1", "2026-06-10T11:00:00");
  commitFile(dir, ".intent/deltas.md", "x", "2026-06-10T12:00:00");
  commitFile(dir, "docs/readme.md", "x", "2026-06-10T13:00:00");
  const exportLog = [{ packet: "p1", exportedAt: "2026-06-10T09:30:00Z", commit: base }];

  // 設定除外（docs/）+ 暗黙除外（.intent/）→ src の2コミットのみ
  const r = computeStaleness({
    cwd: dir,
    exportLog,
    deltaDates: [],
    excludePaths: [".intent/", "docs/"],
  });
  assert.equal(r.gitAvailable, true);
  assert.deepEqual(r.baseline, { kind: "export-hash", value: base });
  assert.equal(r.commits, 2);
  assert.ok(r.commits <= 5, "既定閾値 5 以下 → 2.3 で ok 判定になる側");

  // 除外パス未指定でも .intent/ は常に暗黙除外（docs/ は数える）
  const rImplicit = computeStaleness({ cwd: dir, exportLog, deltaDates: [], excludePaths: [] });
  assert.deepEqual(rImplicit.baseline, { kind: "export-hash", value: base });
  assert.equal(rImplicit.commits, 3);
});

test("export-hash 基準点: 非除外コミットが閾値を超える計数になる（stale 側）", () => {
  const dir = initGitFixture();
  const base = commitFile(dir, "src/app.js", "v0", "2026-06-10T09:00:00");
  for (let i = 1; i <= 6; i++) {
    commitFile(dir, "src/app.js", `v${i}`, `2026-06-10T1${i}:00:00`);
  }
  const r = computeStaleness({
    cwd: dir,
    exportLog: [{ packet: "p1", exportedAt: "2026-06-10T09:30:00Z", commit: base }],
    deltaDates: [],
    excludePaths: [".intent/"],
  });
  assert.deepEqual(r.baseline, { kind: "export-hash", value: base });
  assert.equal(r.commits, 6);
  assert.ok(r.commits > 5, "既定閾値 5 超過 → 2.3 で stale 判定になる側");
});

test("amend でハッシュが履歴から消えたら exit せず delta-date 基準点へフォールバックする", () => {
  const dir = initGitFixture();
  commitFile(dir, "src/app.js", "v1", "2026-06-10T09:00:00");
  const exported = commitFile(dir, "src/app.js", "v2", "2026-06-10T10:00:00");

  // amend + reflog 失効 + gc で export 済みハッシュをオブジェクト store から完全に消す
  fs.writeFileSync(path.join(dir, "src/app.js"), "v2-amended");
  gitIn(dir, ["add", "-A"]);
  gitIn(dir, ["commit", "-q", "--amend", "-m", "amended"], {
    GIT_AUTHOR_DATE: "2026-06-10T10:30:00",
    GIT_COMMITTER_DATE: "2026-06-10T10:30:00",
  });
  gitIn(dir, ["reflog", "expire", "--expire=now", "--all"]);
  gitIn(dir, ["gc", "-q", "--prune=now"]);
  // fixture 自己検証: ハッシュは本当に存在しない
  const gone = spawnSync("git", ["-C", dir, "cat-file", "-e", `${exported}^{commit}`], {
    encoding: "utf8",
  });
  assert.notEqual(gone.status, 0, "amend 後のハッシュは cat-file -e で見つからないこと");

  commitFile(dir, "src/lib.js", "v1", "2026-06-11T10:00:00");
  const r = computeStaleness({
    cwd: dir,
    exportLog: [{ packet: "p1", exportedAt: "2026-06-10T11:00:00Z", commit: exported }],
    deltaDates: ["2026-06-10"],
    excludePaths: [".intent/"],
  });
  // delta 日付（2026-06-10）は export より古いが、ハッシュ経路の失敗で (2) に切り替わる
  assert.equal(r.gitAvailable, true);
  assert.deepEqual(r.baseline, { kind: "delta-date", value: "2026-06-10" });
  assert.equal(r.commits, 1, "翌日（06-11）の1コミットのみ。同日（06-10）は数えない");
});

test("最新 export より新しい delta 日付は export-hash より優先され、同日コミットは数えない", () => {
  const dir = initGitFixture();
  const base = commitFile(dir, "src/app.js", "v1", "2026-06-10T09:00:00");
  commitFile(dir, "src/app.js", "v2", "2026-06-11T08:00:00"); // writeback 同日 → 数えない
  commitFile(dir, "src/lib.js", "v1", "2026-06-12T09:00:00"); // 翌日 → 数える
  const exportLog = [{ packet: "p1", exportedAt: "2026-06-10T10:00:00Z", commit: base }];

  const r = computeStaleness({
    cwd: dir,
    exportLog,
    deltaDates: ["2026-06-11"],
    excludePaths: [".intent/"],
  });
  assert.deepEqual(r.baseline, { kind: "delta-date", value: "2026-06-11" });
  assert.equal(r.commits, 1);

  // 対照: delta 日付なしなら hash 基準で 2 → 基準点の切替が計数に効いている証明
  const rHash = computeStaleness({ cwd: dir, exportLog, deltaDates: [], excludePaths: [] });
  assert.deepEqual(rHash.baseline, { kind: "export-hash", value: base });
  assert.equal(rHash.commits, 2);

  // 対照: export より古い delta 日付（同日以前）は hash を優先する
  const rOld = computeStaleness({ cwd: dir, exportLog, deltaDates: ["2026-06-10"], excludePaths: [] });
  assert.deepEqual(rOld.baseline, { kind: "export-hash", value: base });

  // 日時つき delta 日付も日付部に正規化されて使われる
  const rDateTime = computeStaleness({
    cwd: dir,
    exportLog,
    deltaDates: ["2026-06-11T09:30:00Z"],
    excludePaths: [],
  });
  assert.deepEqual(rDateTime.baseline, { kind: "delta-date", value: "2026-06-11" });
  assert.equal(rDateTime.commits, 1);
});

test("export 行のハッシュが `-`（null）なら delta-date 基準点を使う（古い日付でも）", () => {
  const dir = initGitFixture();
  commitFile(dir, "src/app.js", "v1", "2026-06-10T09:00:00");
  commitFile(dir, "src/app.js", "v2", "2026-06-11T09:00:00");
  const r = computeStaleness({
    cwd: dir,
    exportLog: [{ packet: "p1", exportedAt: "2026-06-12T10:00:00Z", commit: null }],
    deltaDates: ["2026-06-10"],
    excludePaths: [],
  });
  assert.deepEqual(r.baseline, { kind: "delta-date", value: "2026-06-10" });
  assert.equal(r.commits, 1, "06-11 のコミットのみ（06-10 同日は数えない）");
});

test("非 git ディレクトリは not-applicable（gitAvailable=false, baseline=none, commits=null）", () => {
  const dir = tmpDir();
  const r = computeStaleness({
    cwd: dir,
    exportLog: [{ packet: "p1", exportedAt: "2026-06-10T10:00:00Z", commit: "abc1234" }],
    deltaDates: ["2026-06-10"],
    excludePaths: [],
  });
  assert.equal(r.gitAvailable, false);
  assert.deepEqual(r.baseline, { kind: "none", value: null });
  assert.equal(r.commits, null);
});

test("git リポジトリでも基準点がなければ not-applicable（baseline=none）", () => {
  const dir = initGitFixture();
  commitFile(dir, "src/app.js", "v1", "2026-06-10T09:00:00");
  const r = computeStaleness({ cwd: dir, exportLog: [], deltaDates: [], excludePaths: [] });
  assert.equal(r.gitAvailable, true);
  assert.deepEqual(r.baseline, { kind: "none", value: null });
  assert.equal(r.commits, null);

  // 不正な日付しか無い場合も基準点なし扱い
  const r2 = computeStaleness({
    cwd: dir,
    exportLog: [],
    deltaDates: ["<ISO 8601 日付>", "2026-13-45"],
    excludePaths: [],
  });
  assert.deepEqual(r2.baseline, { kind: "none", value: null });
  assert.equal(r2.commits, null);
});

test("git コマンド不在（gitCmd 注入で不存在バイナリ）は not-applicable で例外を投げない", () => {
  const dir = initGitFixture();
  const base = commitFile(dir, "src/app.js", "v1", "2026-06-10T09:00:00");
  const r = computeStaleness({
    cwd: dir,
    exportLog: [{ packet: "p1", exportedAt: "2026-06-10T10:00:00Z", commit: base }],
    deltaDates: ["2026-06-10"],
    excludePaths: [],
    gitCmd: path.join(dir, "no-such-git"),
  });
  assert.equal(r.gitAvailable, false);
  assert.deepEqual(r.baseline, { kind: "none", value: null });
  assert.equal(r.commits, null);
});

// ----------------------------------------------------------------------------
// readTextIfExists — ファイル不在の安全な縮退
// ----------------------------------------------------------------------------

test("readTextIfExists は存在するファイルの内容を返し、不在なら null を返す", () => {
  const dir = tmpDir();
  const file = path.join(dir, "mode.md");
  assert.equal(readTextIfExists(file), null);
  fs.writeFileSync(file, "- **enforcement**: remind\n");
  assert.equal(readTextIfExists(file), "- **enforcement**: remind\n");
});

// ----------------------------------------------------------------------------
// 2.3: runCheck / formatCheckOutput / CLI — grace・block 判定と出力契約
// ----------------------------------------------------------------------------

const SCRIPT_PATH = path.join(JA_INTENT, "scripts", "intent-check.mjs");

// 判定行の固定形式（design Batch/Job Contract。キー順も固定）
const JUDGMENT_RE =
  /^intent-check: result=(ok|stale|not-applicable) enforcement=(off|remind|gate) commits=(\d+|-) threshold=(\d+) grace=(in-implementation|-) pending=(\d+) block=(yes|no)$/;

function runCli(cwd) {
  return spawnSync(process.execPath, [SCRIPT_PATH], { cwd, encoding: "utf8" });
}

function writeIntent(dir, { mode, deltas, exportLog } = {}) {
  const intentDir = path.join(dir, ".intent");
  fs.mkdirSync(intentDir, { recursive: true });
  if (typeof mode === "string") fs.writeFileSync(path.join(intentDir, "mode.md"), mode);
  if (typeof deltas === "string") fs.writeFileSync(path.join(intentDir, "deltas.md"), deltas);
  if (typeof exportLog === "string") {
    fs.writeFileSync(path.join(intentDir, "export-log.md"), exportLog);
  }
}

function modeMd(enforcement, threshold) {
  const lines = ["# Active Mode", "", "## Enforcement（ユーザー管理）", ""];
  lines.push(`- **enforcement**: ${enforcement}`);
  if (threshold !== undefined) lines.push(`- **enforcement-threshold**: ${threshold}`);
  lines.push("");
  return lines.join("\n");
}

function exportLogMd(rows) {
  return [
    "# Export Log",
    "",
    "| packet | exported_at | commit |",
    "|---|---|---|",
    ...rows.map((r) => `| ${r.packet} | ${r.exportedAt} | ${r.commit ?? "-"} |`),
    "",
  ].join("\n");
}

function deltasMd(entries) {
  const lines = ["# Intent Deltas", ""];
  for (const e of entries) {
    lines.push(`## Delta: ${e.name} — ${e.date}`, "", `- Status: ${e.status}`, "");
  }
  return lines.join("\n");
}

function writeKiroSpec(dir, specName, tasksContent) {
  const specDir = path.join(dir, ".kiro", "specs", specName);
  fs.mkdirSync(specDir, { recursive: true });
  fs.writeFileSync(path.join(specDir, "tasks.md"), tasksContent);
}

// 既定閾値 5 を超える 6 コミット（基準点 = 最初のコミットの export ハッシュ）の stale fixture
function staleGitFixture() {
  const dir = initGitFixture();
  const base = commitFile(dir, "src/app.js", "v0", "2026-06-10T09:00:00");
  for (let i = 1; i <= 6; i++) {
    commitFile(dir, "src/app.js", `v${i}`, `2026-06-10T1${i}:00:00`);
  }
  return { dir, base };
}

test("parseDeltaNames は status 不問で有効な日付のエントリ名を記載順に返す", () => {
  const content = [
    "## Delta: promoted-one — 2026-06-09",
    "",
    "- Status: promoted (2026-06-10)",
    "",
    "## Delta: placeholder — <ISO 8601 日付>",
    "",
    "- Status: pending",
    "",
    "## Delta: pending-one — 2026-06-11",
    "",
    "- Status: pending",
  ].join("\n");
  assert.deepEqual(parseDeltaNames(content), ["promoted-one", "pending-one"]);
  assert.deepEqual(parseDeltaNames(null), []);
  assert.deepEqual(parseDeltaNames(""), []);
});

test("hex 形状でない commit セル（HEAD 等の revision 式）はハッシュ基準点に使わない", () => {
  const { dir } = staleGitFixture();
  // 修正前は cat-file -e HEAD^{commit} が成功し HEAD..HEAD = 0 commits で偽 ok になる
  const r = computeStaleness({
    cwd: dir,
    exportLog: [{ packet: "p1", exportedAt: "2026-06-10T09:30:00Z", commit: "HEAD" }],
    deltaDates: [],
    excludePaths: [],
  });
  assert.deepEqual(r.baseline, { kind: "none", value: null }, "HEAD は基準点にならない");
  assert.equal(r.commits, null);

  // delta 日付があればフォールバック連鎖で delta-date に切り替わる
  const r2 = computeStaleness({
    cwd: dir,
    exportLog: [{ packet: "p1", exportedAt: "2026-06-10T09:30:00Z", commit: "HEAD" }],
    deltaDates: ["2026-06-09"],
    excludePaths: [],
  });
  assert.deepEqual(r2.baseline, { kind: "delta-date", value: "2026-06-09" });
});

test("最新 delta の選定は日付部（YYYY-MM-DD）の語彙比較で TZ 付き時刻に揺らされない", () => {
  const dir = initGitFixture();
  commitFile(dir, "src/app.js", "v1", "2026-06-10T09:00:00");
  // Date.parse 比較だと -05:00 の時刻（= 06-11T03:00Z）が "2026-06-11"（= 06-11T00:00Z）に
  // 勝ってしまい、日付部の古い方（06-10）が基準点になる。語彙比較なら 06-11 が選ばれる。
  const r = computeStaleness({
    cwd: dir,
    exportLog: [],
    deltaDates: ["2026-06-10T22:00:00-05:00", "2026-06-11"],
    excludePaths: [],
  });
  assert.deepEqual(r.baseline, { kind: "delta-date", value: "2026-06-11" });
});

test("runCheck grace 付与: 最新 export packet が進行中 spec に対応すると閾値超過でも ok", () => {
  const { dir, base } = staleGitFixture();
  writeIntent(dir, {
    mode: modeMd("gate"),
    exportLog: exportLogMd([
      { packet: "checkout-refactor", exportedAt: "2026-06-10T09:30:00Z", commit: base },
    ]),
  });

  // 対照: .kiro/ 不在のうちは grace なしで stale + gate block
  const before = runCheck(dir);
  assert.equal(before.result, "stale");
  assert.equal(before.grace, null);
  assert.equal(before.commits, 6);
  assert.equal(before.threshold, 5);
  assert.equal(before.shouldBlock, true);

  // 進行中 spec（未チェックタスクあり）が packet 名に対応 → grace
  writeKiroSpec(dir, "checkout-refactor", "# Tasks\n\n- [x] 1. done\n- [ ] 2. in progress\n");
  const after = runCheck(dir);
  assert.equal(after.result, "ok");
  assert.equal(after.grace, "in-implementation");
  assert.equal(after.graceSpec, "checkout-refactor");
  assert.equal(after.commits, 6, "grace は計数を隠さない（判定だけを抑止）");
  assert.equal(after.shouldBlock, false);
});

test("runCheck grace 解除: spec の全タスク完了で stale に戻る（gate なら block）", () => {
  const { dir, base } = staleGitFixture();
  writeIntent(dir, {
    mode: modeMd("gate"),
    exportLog: exportLogMd([
      { packet: "checkout-refactor", exportedAt: "2026-06-10T09:30:00Z", commit: base },
    ]),
  });
  writeKiroSpec(dir, "checkout-refactor", "# Tasks\n\n- [x] 1. done\n- [x] 2. done\n");
  const r = runCheck(dir);
  assert.equal(r.result, "stale");
  assert.equal(r.grace, null);
  assert.equal(r.shouldBlock, true);
});

test("runCheck grace 照合: dir 名不一致でも tasks.md 本文の包含（大文字小文字非区別）で対応", () => {
  const { dir, base } = staleGitFixture();
  writeIntent(dir, {
    mode: modeMd("remind"),
    exportLog: exportLogMd([
      { packet: "checkout-refactor", exportedAt: "2026-06-10T09:30:00Z", commit: base },
    ]),
  });
  writeKiroSpec(
    dir,
    "payment-flow",
    "# Tasks\n\n> Source Packet: Checkout-Refactor\n\n- [ ] 1. implement\n",
  );
  const r = runCheck(dir);
  assert.equal(r.result, "ok");
  assert.equal(r.grace, "in-implementation");
  assert.equal(r.graceSpec, "payment-flow");
});

test("runCheck 多重 export: 先行 export 行に対応する delta が欠落なら grace 抑止 + 欠落名を報告", () => {
  const { dir, base } = staleGitFixture();
  writeIntent(dir, {
    mode: modeMd("gate"),
    deltas: deltasMd([]),
    exportLog: exportLogMd([
      { packet: "alpha-packet", exportedAt: "2026-06-09T10:00:00Z", commit: null },
      { packet: "beta-packet", exportedAt: "2026-06-10T09:30:00Z", commit: base },
    ]),
  });
  writeKiroSpec(dir, "beta-packet", "# Tasks\n\n- [ ] 1. implement\n");

  const suppressed = runCheck(dir);
  assert.equal(suppressed.result, "stale", "grace は適用されない");
  assert.equal(suppressed.grace, null);
  assert.deepEqual(suppressed.graceBlockedBy, ["alpha-packet"]);
  assert.equal(suppressed.shouldBlock, true);
  const lines = formatCheckOutput(suppressed);
  assert.ok(
    lines.slice(1).some((l) => l.includes("alpha-packet")),
    "欠落 packet 名が人間可読部に出力されること",
  );

  // 対照: 先行 packet の delta（status 不問 = promoted でも writeback の証拠）があれば grace
  writeIntent(dir, {
    deltas: deltasMd([{ name: "alpha-packet", date: "2026-06-09", status: "promoted (2026-06-09)" }]),
  });
  const granted = runCheck(dir);
  assert.equal(granted.result, "ok");
  assert.equal(granted.grace, "in-implementation");
  assert.deepEqual(granted.graceBlockedBy, []);
});

test("runCheck grace 中も pending は常に有効（gate なら block / CLI exit 1）", () => {
  const { dir, base } = staleGitFixture();
  writeIntent(dir, {
    mode: modeMd("gate"),
    // delta 日付（06-09）は export（06-10）より古い → 基準点は export-hash のまま stale 側
    deltas: deltasMd([{ name: "earlier-packet", date: "2026-06-09", status: "pending" }]),
    exportLog: exportLogMd([
      { packet: "checkout-refactor", exportedAt: "2026-06-10T09:30:00Z", commit: base },
    ]),
  });
  writeKiroSpec(dir, "checkout-refactor", "# Tasks\n\n- [ ] 1. implement\n");

  const r = runCheck(dir);
  assert.equal(r.result, "ok", "staleness は grace で抑止される");
  assert.equal(r.grace, "in-implementation");
  assert.deepEqual(r.pendingDeltas, ["earlier-packet"]);
  assert.equal(r.shouldBlock, true, "pending 検査は grace 中も有効");

  const cli = runCli(dir);
  assert.equal(cli.status, 1);
  const first = cli.stdout.split("\n")[0];
  assert.match(first, JUDGMENT_RE);
  assert.ok(first.includes("grace=in-implementation"));
  assert.ok(first.includes("pending=1"));
  assert.ok(first.includes("block=yes"));
  assert.ok(cli.stdout.includes("earlier-packet"), "pending packet 名が根拠に出ること");
});

test("CLI: gate + pending（非 git → not-applicable）は pending のみで block し exit 1", () => {
  const dir = tmpDir();
  writeIntent(dir, {
    mode: modeMd("gate"),
    deltas: deltasMd([{ name: "checkout-refactor", date: "2026-06-11", status: "pending" }]),
  });
  const cli = runCli(dir);
  assert.equal(cli.status, 1, "gate + pending は exit 1");
  const first = cli.stdout.split("\n")[0];
  assert.match(first, JUDGMENT_RE);
  assert.equal(
    first,
    "intent-check: result=not-applicable enforcement=gate commits=- threshold=5 grace=- pending=1 block=yes",
  );
  assert.ok(cli.stdout.includes("checkout-refactor"), "pending packet 名を根拠に出す");
  assert.ok(cli.stdout.includes("/intent-writeback"), "writeback 案内を出す");
});

test("CLI: remind + stale は exit 0 のまま警告行を出す（result=stale block=no）", () => {
  const { dir, base } = staleGitFixture();
  writeIntent(dir, {
    mode: modeMd("remind"),
    exportLog: exportLogMd([
      { packet: "checkout-refactor", exportedAt: "2026-06-10T09:30:00Z", commit: base },
    ]),
  });
  const cli = runCli(dir);
  assert.equal(cli.status, 0, "remind は一切ブロックしない");
  const first = cli.stdout.split("\n")[0];
  assert.match(first, JUDGMENT_RE);
  assert.equal(
    first,
    "intent-check: result=stale enforcement=remind commits=6 threshold=5 grace=- pending=0 block=no",
  );
  assert.ok(cli.stdout.includes(base), "基準点（export-hash）を根拠に出す");
  assert.ok(cli.stdout.includes("/intent-writeback"), "writeback 案内を出す");
});

test("CLI: off は staleness 導出をスキップして常に exit 0（pending は判定行に載る）", () => {
  const { dir, base } = staleGitFixture();
  writeIntent(dir, {
    mode: modeMd("off"),
    deltas: deltasMd([{ name: "earlier-packet", date: "2026-06-09", status: "pending" }]),
    exportLog: exportLogMd([
      { packet: "checkout-refactor", exportedAt: "2026-06-10T09:30:00Z", commit: base },
    ]),
  });
  const cli = runCli(dir);
  assert.equal(cli.status, 0, "off は stale 相当の履歴でも常に exit 0");
  const first = cli.stdout.split("\n")[0];
  assert.match(first, JUDGMENT_RE);
  assert.equal(
    first,
    "intent-check: result=ok enforcement=off commits=- threshold=5 grace=- pending=1 block=no",
  );
});

test("runCheck 不正設定: 判定行の形式は固定のまま、invalid 注記は人間可読部に載る", () => {
  const dir = tmpDir();
  writeIntent(dir, {
    mode: "- **enforcement**: gaate\n- **enforcement-threshold**: -3\n",
  });
  const r = runCheck(dir);
  assert.equal(r.enforcement, "off", "不正値は off へフォールバック");
  assert.equal(r.threshold, 5);
  assert.deepEqual(r.invalidFields, ["enforcement", "enforcement-threshold"]);
  const lines = formatCheckOutput(r);
  assert.match(lines[0], JUDGMENT_RE, "1行目は固定形式（注記で形式を崩さない）");
  assert.ok(
    lines.slice(1).some((l) => l.includes("invalid value ignored")),
    "invalid 注記が人間可読部にあること",
  );
  assert.ok(
    lines.slice(1).some((l) => l.includes("enforcement-threshold")),
    "どのフィールドが不正かを示すこと",
  );
});

test("CLI: 想定外エラー（mode.md がディレクトリ）は exit 2 + stderr に原因", () => {
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, ".intent", "mode.md"), { recursive: true });
  const cli = runCli(dir);
  assert.equal(cli.status, 2);
  assert.ok(cli.stderr.includes("intent-check"), "stderr に原因を出す");
  assert.equal(cli.stdout, "", "判定行は出さない（中途半端な出力をしない）");
});

test("intent-check.mjs は import 安全のまま、引数なし直接実行が CLI 契約（判定行 + exit 0/1/2）を持つ", () => {
  // import 時に main-guard が誤発火しないこと（このテスト自体がトップレベル import 済み）。
  // .intent/ なしの素のディレクトリでは not-applicable / off / block=no で exit 0。
  const dir = tmpDir();
  const cli = runCli(dir);
  assert.equal(cli.status, 0);
  const lines = cli.stdout.split("\n");
  assert.equal(
    lines[0],
    "intent-check: result=not-applicable enforcement=off commits=- threshold=5 grace=- pending=0 block=no",
  );
  assert.ok(lines.length >= 2 && lines[1].length > 0, "2行目以降に人間可読の根拠があること");
});

// ----------------------------------------------------------------------------
// 6.3–6.6: pre-push フック — 判定は intent-check に完全委譲、exit 1 のみ拒否
// ----------------------------------------------------------------------------

const HOOK_JA = path.join(JA_INTENT, "scripts", "pre-push");
const HOOK_EN = path.join(EN_INTENT, "scripts", "pre-push");
// テストプロセス自身の node がフック（git 経由含む）から見えるよう PATH 先頭に足す
const NODE_DIR = path.dirname(process.execPath);
const PATH_WITH_NODE = `${NODE_DIR}${path.delimiter}${process.env.PATH ?? ""}`;

// gitIn と違い失敗を assert しない（push 拒否の検証に使う）
function gitRaw(dir, args) {
  return spawnSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    env: { ...process.env, PATH: PATH_WITH_NODE },
  });
}

// fixture に intent-check.mjs を配備し、ja テンプレートのフックを .git/hooks/pre-push へ設置する
function installPrePushHook(dir, { withScript = true } = {}) {
  if (withScript) {
    const scriptsDir = path.join(dir, ".intent", "scripts");
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.copyFileSync(SCRIPT_PATH, path.join(scriptsDir, "intent-check.mjs"));
  }
  const hooksDir = path.join(dir, ".git", "hooks");
  fs.mkdirSync(hooksDir, { recursive: true });
  const hookPath = path.join(hooksDir, "pre-push");
  fs.copyFileSync(HOOK_JA, hookPath);
  fs.chmodSync(hookPath, 0o755);
  return hookPath;
}

function addBareRemote(dir) {
  const remote = tmpDir("ip-remote-");
  gitIn(remote, ["init", "-q", "--bare"]);
  gitIn(dir, ["remote", "add", "origin", remote]);
}

// フックを git を介さず直接実行する（pre-push 同様 cwd = リポジトリ最上位、stdin は与えない）
function runHookDirect(dir, hookPath, env) {
  return spawnSync("/bin/sh", [hookPath], { cwd: dir, encoding: "utf8", env });
}

test("pre-push フックは ja/en 両ツリーに存在しバイト一致する（POSIX sh・実行ビット付き）", () => {
  const ja = fs.readFileSync(HOOK_JA);
  const en = fs.readFileSync(HOOK_EN);
  assert.ok(ja.length > 0, "ja フックが空でない");
  assert.ok(ja.equals(en), "ja/en の pre-push はバイト一致すること");
  assert.ok(ja.toString("utf8").startsWith("#!/bin/sh\n"), "shebang は #!/bin/sh");
  for (const hook of [HOOK_JA, HOOK_EN]) {
    assert.ok(fs.statSync(hook).mode & 0o111, `${hook} に実行ビットがあること`);
  }
});

test("6.3/6.6: gate 違反（pending delta）は push を拒否し、--no-verify は素通しする", () => {
  const dir = initGitFixture();
  writeIntent(dir, {
    mode: modeMd("gate"),
    deltas: deltasMd([{ name: "checkout-refactor", date: "2026-06-11", status: "pending" }]),
  });
  commitFile(dir, "src/app.js", "v1", "2026-06-11T09:00:00");
  installPrePushHook(dir);
  addBareRemote(dir);

  const push = gitRaw(dir, ["push", "origin", "HEAD"]);
  assert.notEqual(push.status, 0, "gate 違反の push は拒否されること");
  const out = push.stdout + push.stderr;
  assert.ok(out.includes("block=yes"), "判定行（根拠）が表示されること");
  assert.ok(out.includes("checkout-refactor"), "pending packet 名が表示されること");
  assert.ok(out.includes("/intent-writeback"), "writeback 案内が表示されること");

  // 6.6: git 標準の --no-verify による回避を妨げない
  const bypass = gitRaw(dir, ["push", "--no-verify", "origin", "HEAD"]);
  assert.equal(bypass.status, 0, `--no-verify は通ること: ${bypass.stderr}`);
});

test("6.5: enforcement off では pending があっても push を妨げない", () => {
  const dir = initGitFixture();
  writeIntent(dir, {
    mode: modeMd("off"),
    deltas: deltasMd([{ name: "checkout-refactor", date: "2026-06-11", status: "pending" }]),
  });
  commitFile(dir, "src/app.js", "v1", "2026-06-11T09:00:00");
  installPrePushHook(dir);
  addBareRemote(dir);
  const push = gitRaw(dir, ["push", "origin", "HEAD"]);
  assert.equal(push.status, 0, `off は push を通すこと: ${push.stderr}`);
});

test("6.4: remind + stale は警告を出しつつ push を通す（フックは exit 1 以外を素通し）", () => {
  const { dir, base } = staleGitFixture();
  writeIntent(dir, {
    mode: modeMd("remind"),
    exportLog: exportLogMd([
      { packet: "checkout-refactor", exportedAt: "2026-06-10T09:30:00Z", commit: base },
    ]),
  });
  commitFile(dir, "src/app.js", "v7", "2026-06-10T17:00:00");
  installPrePushHook(dir);
  addBareRemote(dir);
  const push = gitRaw(dir, ["push", "origin", "HEAD"]);
  assert.equal(push.status, 0, `remind は push を通すこと: ${push.stderr}`);
  const out = push.stdout + push.stderr;
  assert.ok(out.includes("result=stale"), "警告（判定行）は表示されること");
});

test("node 不在: フックは stderr に1行通知して exit 0（無言の gate 無効化を防ぐ）", () => {
  const dir = initGitFixture();
  writeIntent(dir, {
    mode: modeMd("gate"),
    deltas: deltasMd([{ name: "checkout-refactor", date: "2026-06-11", status: "pending" }]),
  });
  const hookPath = installPrePushHook(dir);
  const emptyBin = tmpDir("ip-nobin-"); // node を含まない PATH を模す
  const res = runHookDirect(dir, hookPath, { PATH: emptyBin });
  assert.equal(res.status, 0, "node 不在は fail-open（exit 0）");
  assert.ok(res.stderr.includes("intent-check"), "stderr 通知に主体名があること");
  assert.ok(res.stderr.includes("node not found"), "node 不在を通知すること");
  assert.ok(res.stderr.includes("skipped"), "検査スキップを明示すること");
});

test("intent-check.mjs 不在: フックは stderr に1行通知して exit 0", () => {
  const dir = initGitFixture();
  writeIntent(dir, { mode: modeMd("gate") });
  const hookPath = installPrePushHook(dir, { withScript: false });
  const res = runHookDirect(dir, hookPath, { ...process.env, PATH: PATH_WITH_NODE });
  assert.equal(res.status, 0, "スクリプト不在は fail-open（exit 0）");
  assert.ok(res.stderr.includes("intent-check.mjs not found"), "スクリプト不在を通知すること");
  assert.ok(res.stderr.includes("skipped"), "検査スキップを明示すること");
});

test("内部エラー（intent-check exit 2）はフックが exit 0 に倒す（fail-open）", () => {
  const dir = initGitFixture();
  fs.mkdirSync(path.join(dir, ".intent", "mode.md"), { recursive: true }); // 読込で内部エラー
  const hookPath = installPrePushHook(dir);
  // fixture 自己検証: intent-check 単体は exit 2 になる状態であること
  const cli = runCli(dir);
  assert.equal(cli.status, 2, "前提: intent-check は内部エラーで exit 2");
  const res = runHookDirect(dir, hookPath, { ...process.env, PATH: PATH_WITH_NODE });
  assert.equal(res.status, 0, "exit 2 はブロックに使わない（fail-open）");
});

// ----------------------------------------------------------------------------
// 6.1–6.2, 6.7: インストーラ --enforce — pre-push フックの計画 (computeCopyPlan) と
// 配置 (applyPlan / install)。フック以外の計画・適用は従来と完全同一であること。
// ----------------------------------------------------------------------------

// インストーラの言語ルート（テンプレ配置元）。フックのソースは <langRoot>/intent/scripts/pre-push。
const INSTALL_JA_ROOT = resolveLangRoot(defaultTemplatesDir(), "ja").langRoot;
const HOOK_RELATIVE = path.join(".git", "hooks", "pre-push");

test("6.2: enforce 省略と enforce:false の plan は deepEqual で従来形（フックエントリ・mode キー無し）", () => {
  const tgt = tmpDir("ip-enforce-");
  try {
    const plain = computeCopyPlan(INSTALL_JA_ROOT, tgt, {});
    const explicit = computeCopyPlan(INSTALL_JA_ROOT, tgt, { enforce: false });
    assert.deepEqual(explicit, plain, "enforce:false は省略時とバイト同一の plan");
    assert.ok(plain.length > 0, "計画が空でない");
    for (const e of plain) {
      assert.ok(
        e.relative.startsWith(".claude") || e.relative.startsWith(".intent"),
        `従来形: relative は .claude/.intent 始まり: ${e.relative}`,
      );
      assert.equal("mode" in e, false, `従来エントリに mode キーは無い: ${e.relative}`);
    }
    assert.ok(
      !plain.some((e) => e.relative === HOOK_RELATIVE),
      "enforce なしの plan に .git/hooks エントリは無い",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("6.2: .git があっても enforce なしならフックエントリを足さない（既定は強制なし）", () => {
  const dir = initGitFixture();
  const plan = computeCopyPlan(INSTALL_JA_ROOT, dir, {});
  assert.ok(
    !plan.some((e) => e.relative === HOOK_RELATIVE),
    "git リポジトリでも enforce 指定なしではフックを計画しない",
  );
});

test("6.1: enforce + .git ありで plan 末尾に pre-push フックエントリ（COPY・mode 0o755）", () => {
  const dir = initGitFixture();
  const plan = computeCopyPlan(INSTALL_JA_ROOT, dir, { enforce: true });
  const last = plan[plan.length - 1];
  assert.deepEqual(
    last,
    {
      from: path.join(INSTALL_JA_ROOT, "intent", "scripts", "pre-push"),
      to: path.join(dir, ".git", "hooks", "pre-push"),
      relative: HOOK_RELATIVE,
      action: "COPY",
      mode: 0o755,
    },
    "フックエントリは plan 末尾に1つ、設計どおりの形状",
  );
  assert.equal(
    plan.filter((e) => e.relative === HOOK_RELATIVE).length,
    1,
    "フックエントリは重複しない",
  );
  // フック以外の計画は enforce なしと完全同一（追加は末尾1エントリのみ）
  const plain = computeCopyPlan(INSTALL_JA_ROOT, dir, {});
  assert.deepEqual(plan.slice(0, -1), plain, "フック以外のエントリは従来とバイト同一");
});

test("6.1: enforce:true でも .git 不在ならフックエントリ無し（plan は従来と同一）", () => {
  const tgt = tmpDir("ip-enforce-");
  try {
    const plan = computeCopyPlan(INSTALL_JA_ROOT, tgt, { enforce: true });
    assert.ok(!plan.some((e) => e.relative === HOOK_RELATIVE), "フックエントリ無し");
    assert.deepEqual(plan, computeCopyPlan(INSTALL_JA_ROOT, tgt, {}), "従来 plan と同一");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("6.7: 既存 .git/hooks/pre-push は SKIP（applyPlan でも無変更）、force で COPY", () => {
  const dir = initGitFixture();
  const hookPath = path.join(dir, ".git", "hooks", "pre-push");
  fs.mkdirSync(path.dirname(hookPath), { recursive: true });
  fs.writeFileSync(hookPath, "#!/bin/sh\n# user hook\nexit 0\n");

  const plan = computeCopyPlan(INSTALL_JA_ROOT, dir, { enforce: true });
  const entry = plan.find((e) => e.relative === HOOK_RELATIVE);
  assert.ok(entry, "既存フックありでもエントリ自体は計画に載る（SKIP 表示のため）");
  assert.equal(entry.action, "SKIP", "既存フックは上書きせず SKIP");

  const applied = applyPlan(plan);
  assert.ok(applied.skipped.includes(HOOK_RELATIVE), "SKIP として報告される");
  assert.equal(
    fs.readFileSync(hookPath, "utf8"),
    "#!/bin/sh\n# user hook\nexit 0\n",
    "既存フックの内容は無変更",
  );

  const forced = computeCopyPlan(INSTALL_JA_ROOT, dir, { enforce: true, force: true });
  assert.equal(
    forced.find((e) => e.relative === HOOK_RELATIVE).action,
    "COPY",
    "force は既存の上書き原則どおり COPY",
  );
});

test("applyPlan: mode 付きエントリは copy 後に chmod され 0o755・内容が template と一致", () => {
  const dir = initGitFixture();
  const plan = computeCopyPlan(INSTALL_JA_ROOT, dir, { enforce: true });
  const applied = applyPlan(plan);
  assert.ok(applied.copied.includes(HOOK_RELATIVE), "フックが copied に入る");

  const hookPath = path.join(dir, ".git", "hooks", "pre-push");
  assert.ok(fs.existsSync(hookPath), ".git/hooks/pre-push が配置される");
  assert.equal(fs.statSync(hookPath).mode & 0o777, 0o755, "chmod 0o755 が適用される");
  assert.ok(
    fs.readFileSync(hookPath).equals(fs.readFileSync(HOOK_JA)),
    "内容が templates/ja/intent/scripts/pre-push とバイト一致",
  );
});

test("7.5: applyPlan は mode 無しエントリの挙動を変えない（install 経由の通常配置が従来どおり）", () => {
  const tgt = tmpDir("ip-enforce-");
  try {
    const result = install(tgt, {});
    assert.ok(result.copied.length > 0, "通常配置は従来どおり全コピー");
    assert.ok(!result.copied.includes(HOOK_RELATIVE), "enforce なしでフックは配置されない");
    const readme = path.join(tgt, ".intent", "README.md");
    assert.equal(
      fs.readFileSync(readme, "utf8"),
      fs.readFileSync(path.join(INSTALL_JA_ROOT, "intent", "README.md"), "utf8"),
      "mode 無しエントリは従来どおり内容一致でコピーされる",
    );
    assert.equal(fs.existsSync(path.join(tgt, ".git")), false, ".git を作らない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("install: enforce がフック配置まで通る / .git 不在は enforceHookSkippedNoGit で報告", () => {
  // git fixture: フックが配置され実行ビットが立つ
  const dir = initGitFixture();
  const r = install(dir, { enforce: true });
  assert.ok(r.copied.includes(HOOK_RELATIVE), "install(enforce) でフックが copied に入る");
  assert.equal(r.enforceHookSkippedNoGit, false, ".git ありではスキップ報告しない");
  const hookPath = path.join(dir, ".git", "hooks", "pre-push");
  assert.ok(fs.existsSync(hookPath), "フックが実配置される");
  assert.equal(fs.statSync(hookPath).mode & 0o777, 0o755, "実行ビット付き");

  // .git 不在: フックは計画に載らず、スキップ理由が結果で分かる（4.2 のサマリ用の最小公開）
  const plain = tmpDir("ip-enforce-");
  try {
    const r2 = install(plain, { enforce: true });
    assert.equal(r2.enforceHookSkippedNoGit, true, ".git 不在は enforceHookSkippedNoGit=true");
    assert.ok(!r2.copied.includes(HOOK_RELATIVE), "フックは copied に入らない");
    assert.ok(!r2.skipped.includes(HOOK_RELATIVE), "フックは skipped にも入らない（計画外）");
    assert.equal(fs.existsSync(path.join(plain, ".git")), false, ".git を作らない");
  } finally {
    fs.rmSync(plain, { recursive: true, force: true });
  }

  // enforce なしの install は従来どおり false 報告（追加フィールドは additive）
  const noEnforce = tmpDir("ip-enforce-");
  try {
    const r3 = install(noEnforce, {});
    assert.equal(r3.enforceHookSkippedNoGit, false, "enforce なしでは常に false");
  } finally {
    fs.rmSync(noEnforce, { recursive: true, force: true });
  }
});

test("computeCopyPlan: enforce:true でも FS に書き込まない（純粋・existsSync のみ）", () => {
  const dir = initGitFixture();
  const hooksDir = path.join(dir, ".git", "hooks");
  const hooksBefore = fs.existsSync(hooksDir) ? fs.readdirSync(hooksDir).sort() : null;

  computeCopyPlan(INSTALL_JA_ROOT, dir, { enforce: true });

  assert.deepEqual(fs.readdirSync(dir).sort(), [".git"], "配置先トップは .git のみのまま");
  const hooksAfter = fs.existsSync(hooksDir) ? fs.readdirSync(hooksDir).sort() : null;
  assert.deepEqual(hooksAfter, hooksBefore, ".git/hooks は無変更（pre-push を書かない）");
});

// ----------------------------------------------------------------------------
// 7.2: 配布物の構造検証と parity（Req 1.1, 1.3, 1.5, 7.1 + 4.x/5.x の構造的検証）
// 非破壊・読み取りのみ。既存検査との分担:
//   - intent-check.mjs / pre-push の ja/en バイト一致は本ファイル既存テストが担保
//   - decision-table の 12 行構成は lifecycle.test.mjs が担保
//   - codex SKILL.md の最小 frontmatter（全スキル横断）は agents.test.mjs が担保
//     （ここでは enforcement のゲート/警告を担う 2 スキルに限定して再確認する）
// ----------------------------------------------------------------------------

const TEMPLATES_ROOT = path.join(HERE, "..", "templates");
const PARITY_LANGS = ["ja", "en"];
const SKILL_AGENTS = ["claude", "codex"];

function templateSkillPath(lang, agent, ...rest) {
  return path.join(TEMPLATES_ROOT, lang, agent, "skills", ...rest);
}

// 先頭の `---` フェンス間を frontmatter として読み、`key: value` を素朴に抽出する (yaml 依存なし)。
function parseFrontmatterFields(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  assert.equal(lines[0].trim(), "---", `${filePath}: 先頭が --- フェンス`);
  const fields = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") return fields;
    const m = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  assert.fail(`${filePath}: 閉じ --- フェンスが存在する`);
}

// ---- 1.1/1.3/1.5: mode.md の Enforcement セクション（ja/en） ----

const MODE_MD_EXPECTATIONS = {
  ja: {
    heading: "## Enforcement（ユーザー管理）",
    note: "`/intent-discover` を含むスキルはこのセクションを変更しません",
  },
  en: {
    heading: "## Enforcement (user-managed)",
    note: "Skills, including `/intent-discover`, never modify it",
  },
};

for (const lang of PARITY_LANGS) {
  test(`7.2 mode.md(${lang}): Enforcement セクション・3フィールド行・スキル不変更注記がある (1.1, 1.3, 1.5)`, () => {
    const content = fs.readFileSync(
      path.join(TEMPLATES_ROOT, lang, "intent", "mode.md"),
      "utf8",
    );
    const exp = MODE_MD_EXPECTATIONS[lang];
    assert.ok(content.includes(exp.heading), `${lang}: 見出し「${exp.heading}」がある`);
    assert.ok(content.includes("- **enforcement**: off"), `${lang}: enforcement 既定 off の行がある`);
    assert.ok(
      content.includes("- **enforcement-threshold**: 5"),
      `${lang}: enforcement-threshold 既定 5 の行がある`,
    );
    assert.match(
      content,
      /^- \*\*enforcement-exclude\*\*:/m,
      `${lang}: enforcement-exclude のフィールド行がある（値は空でよい）`,
    );
    assert.ok(content.includes(exp.note), `${lang}: 「スキルは変更しない」注記がある`);
  });
}

// ---- 4.x: decision-table（4変種）— staleness 行の位置と claude/codex バイト一致 ----

const IMPL_IN_PROGRESS_LITERALS = { ja: "実装進行中", en: "implementation in progress" };

for (const lang of PARITY_LANGS) {
  test(`7.2 decision-table(${lang}): staleness 行は「実装進行中」行の直後・claude/codex はバイト一致 (7.1)`, () => {
    const claudeBuf = fs.readFileSync(
      templateSkillPath(lang, "claude", "intent-status", "rules", "decision-table.md"),
    );
    const codexBuf = fs.readFileSync(
      templateSkillPath(lang, "codex", "intent-status", "rules", "decision-table.md"),
    );
    assert.ok(claudeBuf.length > 0, `${lang}: decision-table が空でない`);
    assert.ok(claudeBuf.equals(codexBuf), `${lang}: claude/codex の decision-table はバイト一致`);

    // 決定表のデータ行（`| <番号> | ...`）だけを順序付きで取り出す（注記の重複ヒットを避ける）
    const rows = claudeBuf
      .toString("utf8")
      .split(/\r?\n/)
      .filter((line) => /^\| \d+ \|/.test(line));
    const implIdx = rows.findIndex((line) => line.includes(IMPL_IN_PROGRESS_LITERALS[lang]));
    const staleIdx = rows.findIndex(
      (line) => line.includes("grace=-") && line.includes("result=stale"),
    );
    assert.notEqual(implIdx, -1, `${lang}: 「実装進行中」（grace 元）の行が決定表にある`);
    assert.notEqual(staleIdx, -1, `${lang}: staleness 行（grace=- かつ result=stale）が決定表にある`);
    assert.equal(
      staleIdx,
      implIdx + 1,
      `${lang}: staleness 行は「実装進行中」行の直後（first-match で grace が先に拾われる順序）`,
    );
  });
}

// ---- 4.x/5.x: CONTRACT（4変種）— Bash 限定例外の存在 ----

for (const lang of PARITY_LANGS) {
  for (const agent of SKILL_AGENTS) {
    test(`7.2 CONTRACT(${lang}/${agent}): Bash 限定例外（intent-check.mjs + git rev-parse --short HEAD）がある (7.1)`, () => {
      const content = fs.readFileSync(templateSkillPath(lang, agent, "CONTRACT.md"), "utf8");
      assert.ok(
        content.includes("intent-check.mjs"),
        `${lang}/${agent}: 読み取り専用スクリプト intent-check.mjs への言及がある`,
      );
      assert.ok(
        content.includes("git rev-parse --short HEAD"),
        `${lang}/${agent}: export 記録用の git rev-parse --short HEAD への言及がある`,
      );
    });
  }
}

// ---- 4.x/5.x: export / status SKILL.md（4変種）— ゲート/警告手順の存在 ----

for (const lang of PARITY_LANGS) {
  for (const agent of SKILL_AGENTS) {
    test(`7.2 export SKILL(${lang}/${agent}): ゲート手順（intent-check.mjs / export-log.md / block=）への言及がある`, () => {
      const content = fs.readFileSync(
        templateSkillPath(lang, agent, "intent-export-cc-sdd", "SKILL.md"),
        "utf8",
      );
      for (const needle of ["intent-check.mjs", "export-log.md", "block="]) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 「${needle}」への言及がある`);
      }
    });

    test(`7.2 status SKILL(${lang}/${agent}): 警告手順（intent-check.mjs）への言及がある`, () => {
      const content = fs.readFileSync(
        templateSkillPath(lang, agent, "intent-status", "SKILL.md"),
        "utf8",
      );
      assert.ok(content.includes("intent-check.mjs"), `${lang}/${agent}: intent-check.mjs への言及がある`);
    });
  }
}

// ---- export-dirs 3.1: 「現行 packet」解決順序 — export-log 最新行を正とする言及（4変種） ----
// export SKILL 自体は export-log の書き手（1行追記）であり「現行 packet」の解決順序を持たない
// （解決順序は読み手の関心）ため、検査対象は読み手3 skill（writeback / status / validate）とする。
// 文言の詳細検査（正典・フォールバック告知・同定規則）は test/export-dirs.test.mjs が担い、
// ここでは export-log 言及検査群の一員として「最新行を正とする言及の存在」を固定する。

const RESOLUTION_ORDER_LITERALS = {
  ja: "最新行",
  en: "latest row",
};

for (const lang of PARITY_LANGS) {
  for (const agent of SKILL_AGENTS) {
    test(`export-dirs 3.1 解決順序(${lang}/${agent}): writeback/status/validate が export-log 最新行を正とする言及を持つ`, () => {
      const targets = [
        ["intent-writeback/rules/writeback-protocol.md", templateSkillPath(lang, agent, "intent-writeback", "rules", "writeback-protocol.md")],
        ["intent-status/SKILL.md", templateSkillPath(lang, agent, "intent-status", "SKILL.md")],
        ["intent-validate/SKILL.md", templateSkillPath(lang, agent, "intent-validate", "SKILL.md")],
      ];
      for (const [label, filePath] of targets) {
        const content = fs.readFileSync(filePath, "utf8");
        assert.ok(
          content.includes("export-log") && content.includes(RESOLUTION_ORDER_LITERALS[lang]),
          `${lang}/${agent}/${label}: export-log 最新行（${RESOLUTION_ORDER_LITERALS[lang]}）への言及がある`,
        );
      }
    });
  }
}

for (const lang of PARITY_LANGS) {
  test(`7.2 SKILL frontmatter(${lang}): claude の allowed-tools に Bash・codex に allowed-tools 無し`, () => {
    for (const skill of ["intent-export-cc-sdd", "intent-status"]) {
      const claudeFm = parseFrontmatterFields(templateSkillPath(lang, "claude", skill, "SKILL.md"));
      const tools = (claudeFm["allowed-tools"] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      assert.ok(
        tools.includes("Bash"),
        `${lang}/claude/${skill}: allowed-tools に Bash がある（実際: ${tools.join(", ")}）`,
      );
      const codexFm = parseFrontmatterFields(templateSkillPath(lang, "codex", skill, "SKILL.md"));
      assert.ok(
        !("allowed-tools" in codexFm),
        `${lang}/codex/${skill}: frontmatter に allowed-tools を持たない`,
      );
    }
  });
}

// ---- 7.1: ja/en parity（新規3ファイル）— 存在検査のみ ----
// scripts/ 2ファイルの ja/en バイト一致は本ファイル既存テスト
// （intent-check.mjs: 冒頭 / pre-push: 6.3 セクション）で担保済みのため重複させない。

test("7.2 ja/en parity: export-log.md / scripts/intent-check.mjs / scripts/pre-push が両言語ツリーに存在する (7.1)", () => {
  const NEW_SCAFFOLD_FILES = [
    "export-log.md",
    path.join("scripts", "intent-check.mjs"),
    path.join("scripts", "pre-push"),
  ];
  for (const intentDir of [JA_INTENT, EN_INTENT]) {
    for (const rel of NEW_SCAFFOLD_FILES) {
      assert.ok(
        fs.existsSync(path.join(intentDir, rel)),
        `${rel} が ${intentDir} に存在する`,
      );
    }
  }
});

// ---- 5.x: scaffold README（ja/en）— Enforcement セクションと SessionStart スニペット ----

for (const lang of PARITY_LANGS) {
  test(`7.2 scaffold README(${lang}): Enforcement セクションと SessionStart スニペットがある`, () => {
    const content = fs.readFileSync(
      path.join(TEMPLATES_ROOT, lang, "intent", "README.md"),
      "utf8",
    );
    assert.match(content, /^## Enforcement/m, `${lang}: Enforcement セクション見出しがある`);
    assert.ok(content.includes("SessionStart"), `${lang}: SessionStart フックのスニペットがある`);
  });
}
