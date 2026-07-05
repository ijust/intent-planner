// --update-shared（共有ファイル限定の安全な更新経路）と --force 実行時確認のテスト
// (pkt-20260704-force-update-trap-pphb / A45 / INV56 / DR82)
//
// 判別オラクル（誤った実装を落とす対比）:
//   (a) 専用更新手段で共有ファイルは配布版へ更新（.bak 退避）・user-data はバイト不変
//   (b) --force の確認は対話環境のみ（confirm ビルダーの単体検証・readLine 注入）
//   (c) 非対話の --force は従来どおり確認なしで実行（CI 互換・プロンプト文言が出ない）
//   (d) 共有ファイルのスキップ告知が --force を正規の更新経路として指さない
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { install, makeForceOverwriteConfirm } from "../src/install.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "..", "bin", "cli.mjs");
const TEMPLATES = path.join(__dirname, "..", "templates");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ip-upd-shared-"));
}

function runCli(args) {
  return execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

const CUSTOM_ROOTDOC = "# 私のプロジェクト指示\n\n独自の内容です。\n";
const CUSTOM_TREE = "# 私の Intent Tree\n\nユーザーの作業データ。\n";

// 素の一時ディレクトリへ通常 install → 共有ファイルと user-data をユーザーが編集した状態を作る。
function seedEditedRepo() {
  const dir = tmpDir();
  install(dir, { lang: "ja", agent: "claude" });
  fs.writeFileSync(path.join(dir, "CLAUDE.md"), CUSTOM_ROOTDOC);
  fs.writeFileSync(path.join(dir, ".intent", "intent-tree.md"), CUSTOM_TREE);
  return dir;
}

// ---- (a) 専用更新手段: 共有ファイルは配布版へ更新（.bak 退避）・user-data はバイト不変 ----
test("updateShared: shared is refreshed with .bak, user-data bytes are untouched", () => {
  const dir = seedEditedRepo();
  try {
    const result = install(dir, { lang: "ja", agent: "claude", update: true, updateShared: true });

    // 共有ファイルは配布版と一致し、上書き前のユーザー版が .bak に退避されている。
    const template = fs.readFileSync(path.join(TEMPLATES, "ja", "agents", "claude", "CLAUDE.md"), "utf8");
    assert.equal(fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8"), template, "CLAUDE.md が配布版へ更新される");
    assert.equal(
      fs.readFileSync(path.join(dir, "CLAUDE.md.bak"), "utf8"),
      CUSTOM_ROOTDOC,
      "上書き前のユーザー版が CLAUDE.md.bak に退避される",
    );
    assert.ok(result.backedUp.includes("CLAUDE.md"), "backedUp に CLAUDE.md が列挙される");

    // user-data は 1 バイトも変わらない（消える実装を落とす）。
    assert.equal(
      fs.readFileSync(path.join(dir, ".intent", "intent-tree.md"), "utf8"),
      CUSTOM_TREE,
      "user-data (.intent/intent-tree.md) はバイト不変",
    );

    // ルート文書を配布版へ置き換えたので、参照行の追記レーンは通らない（重ね書きしない）。
    assert.equal(result.rootDoc, "create", "上書き時は追記レーンを通さず create 扱い");
    const after = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    assert.equal(after, template, "参照行が重ねて追記されていない（配布版そのまま）");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (a') 冪等: 2回目の updateShared は共有ファイルが配布版と一致済みのため何も書かない ----
test("updateShared: second run is idempotent (identical shared -> SKIP)", () => {
  const dir = seedEditedRepo();
  try {
    install(dir, { lang: "ja", agent: "claude", update: true, updateShared: true });
    const second = install(dir, { lang: "ja", agent: "claude", update: true, updateShared: true });
    assert.ok(!second.copied.includes("CLAUDE.md"), "2回目は CLAUDE.md を COPY しない");
    assert.ok(second.skipped.includes("CLAUDE.md"), "2回目は CLAUDE.md を SKIP する");
    assert.ok(!second.backedUp.includes("CLAUDE.md"), "2回目は .bak を作らない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (a'') updateShared 無しの従来挙動は不変: 共有ファイルは SKIP のまま ----
test("without updateShared: shared stays skipped (backward compat)", () => {
  const dir = seedEditedRepo();
  try {
    const result = install(dir, { lang: "ja", agent: "claude", update: true });
    assert.ok(result.skipped.includes("CLAUDE.md"), "共有ファイルは従来どおり SKIP");
    assert.equal(
      fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8"),
      CUSTOM_ROOTDOC,
      "共有ファイルのユーザー内容は不変",
    );
    assert.ok(!fs.existsSync(path.join(dir, "CLAUDE.md.bak")), ".bak も作られない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (b) --force 確認ビルダー: 対話環境のみ確認・非対話/--yes は同意扱い ----
test("makeForceOverwriteConfirm: yes / non-TTY proceed, TTY asks via readLine", () => {
  // --yes: 常に同意（プロンプトを出さない）。
  assert.equal(makeForceOverwriteConfirm({ yes: true, isTTY: true })(), true);
  // 非対話: --force の明示自体を同意とみなし従来どおり実行（CI 互換・利用者確定 2026-07-04）。
  assert.equal(makeForceOverwriteConfirm({ yes: false, isTTY: false })(), true);
  // 対話: readLine の回答で決まる（y 系のみ true）。
  assert.equal(makeForceOverwriteConfirm({ isTTY: true, readLine: () => "y" })(), true);
  assert.equal(makeForceOverwriteConfirm({ isTTY: true, readLine: () => "YES" })(), true);
  assert.equal(makeForceOverwriteConfirm({ isTTY: true, readLine: () => "n" })(), false);
  assert.equal(makeForceOverwriteConfirm({ isTTY: true, readLine: () => "" })(), false, "空入力は安全側 (N)");
});

// ---- (c) 非対話の --force は従来どおり: プロンプトを出さず全上書きが実行される ----
test("CLI: non-TTY --force runs without confirmation prompt (CI compat)", () => {
  const dir = seedEditedRepo();
  try {
    const out = runCli([dir, "--force"]);
    assert.doesNotMatch(out, /続行しますか/, "非対話では確認プロンプトを出さない");
    assert.doesNotMatch(out, /中止しました/, "非対話では中止しない");
    // 全上書きが実際に行われる（user-data も配布版へ置き換わる = 従来の --force 挙動）。
    assert.notEqual(
      fs.readFileSync(path.join(dir, ".intent", "intent-tree.md"), "utf8"),
      CUSTOM_TREE,
      "--force は従来どおり user-data も上書きする",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (d) 共有ファイルのスキップ告知は --update-shared を案内し、--force を正規経路にしない ----
test("CLI: shared skip notice points to --update-shared, not --force (INV56)", () => {
  const dir = seedEditedRepo();
  try {
    const out = runCli([dir]);
    assert.match(out, /--update-shared/, "安全な代替 (--update-shared) を案内する");
    assert.doesNotMatch(out, /最新版へ更新するには --force/, "全上書きを更新の正規経路として案内しない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- CLI E2E: --update-shared で共有ファイルが更新され、更新一覧と .bak 案内が出る ----
test("CLI: --update-shared refreshes shared and reports it", () => {
  const dir = seedEditedRepo();
  try {
    // 更新ファイルの1件ずつの列挙は既定で畳むため --verbose で確認する。.bak 注記は既定でも出る。
    const out = runCli([dir, "--update-shared", "--verbose"]);
    assert.match(out, /\^ CLAUDE\.md/, "更新一覧に CLAUDE.md が出る");
    assert.match(out, /\.bak に退避/, ".bak 退避の案内が出る");
    assert.equal(
      fs.readFileSync(path.join(dir, ".intent", "intent-tree.md"), "utf8"),
      CUSTOM_TREE,
      "user-data はバイト不変",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- CLI: --update-shared で更新対象が無ければ「対象なし」を告げる（異常系を沈黙させない） ----
test("CLI: --update-shared with everything up-to-date reports no targets", () => {
  const dir = tmpDir();
  try {
    runCli([dir]); // 素の install（共有ファイルは配布版のまま）
    const out = runCli([dir, "--update-shared"]);
    assert.match(out, /上書き更新が必要な共有ファイルはありませんでした/, "更新対象なしを告げる");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- --help に --update-shared が載る ----
test("--help documents --update-shared with data-safety note", () => {
  const out = runCli(["--help"]);
  assert.match(out, /--update-shared/, "--update-shared がヘルプに載る");
  const idx = out.indexOf("--update-shared");
  const section = out.slice(idx, idx + 200);
  assert.match(section, /\.bak/, "上書き前退避 (.bak) に言及する");
});
