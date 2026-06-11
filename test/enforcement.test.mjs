// intent-check スクリプト第1層（enforcement 設定と .intent/ 成果物のパース）のテスト
// (node:test 標準・依存ゼロ)
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseEnforcementConfig,
  parsePendingDeltas,
  parseExportLog,
  readTextIfExists,
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
// readTextIfExists — ファイル不在の安全な縮退
// ----------------------------------------------------------------------------

test("readTextIfExists は存在するファイルの内容を返し、不在なら null を返す", () => {
  const dir = tmpDir();
  const file = path.join(dir, "mode.md");
  assert.equal(readTextIfExists(file), null);
  fs.writeFileSync(file, "- **enforcement**: remind\n");
  assert.equal(readTextIfExists(file), "- **enforcement**: remind\n");
});

test("intent-check.mjs は import 安全（直接実行でなければ副作用ゼロ）かつ直接実行で exit 0", () => {
  // import 時に何も出力せず、main-guard が誤発火しないこと（このテスト自体が import 済み）。
  // 直接実行時は最小 main（無出力・exit 0）であること（CLI 本体は後続タスクの範囲）。
  const out = execFileSync(process.execPath, [path.join(JA_INTENT, "scripts", "intent-check.mjs")], {
    encoding: "utf8",
  });
  assert.equal(out, "");
});
