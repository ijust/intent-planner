// 英語利用者の導入導線（README.en の --lang en 明記 + CLI 主要メッセージの英語化）のテスト
// (pkt-20260704-english-install-path-q8qx / A45 / INV56 / DR82)
//
// 判別オラクル（誤った実装を落とす対比）:
//   (a) README.en のインストール例はすべて --lang en を含む（日本語版が入る導線を落とす）
//   (b) --lang en で --help・告知・次のステップ・警告が英語で出る（英語化漏れを落とす）
//   (c) --lang ja / 未指定の出力は従来の日本語のまま（日本語体験を変える実装を落とす）
//   (d) README install 節の機械検査（INV27・readme-install.test）は本ファイルの外で green を保つ
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CLI = path.join(ROOT, "bin", "cli.mjs");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ip-en-msg-"));
}

function runCli(args) {
  return execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

// ---- (a) README.en のインストール例はすべて --lang en を含む ----
test("README.en: every npx intent-planner example carries --lang en", () => {
  const readme = fs.readFileSync(path.join(ROOT, "README.en.md"), "utf8");
  const examples = readme.split("\n").filter((l) => l.trim().startsWith("npx intent-planner"));
  assert.ok(examples.length >= 4, `インストール例が4件以上ある (実際: ${examples.length})`);
  for (const line of examples) {
    assert.match(line, /--lang en/, `例に --lang en が含まれる: ${line.trim()}`);
  }
});

// ---- (b) --lang en: --help が英語で出る ----
test("--lang en: --help is English", () => {
  const out = runCli(["--help", "--lang", "en"]);
  assert.match(out, /Usage:/, "英語ヘルプの Usage 見出し");
  assert.match(out, /--update-shared/, "--update-shared の説明が載る");
  assert.doesNotMatch(out, /使い方:/, "日本語ヘルプが混ざらない");
});

// ---- (b') --lang en: インストール結果の告知・次のステップ・保護注記が英語で出る ----
test("--lang en: install notices, warnings and next step are English", () => {
  const dir = tmpDir();
  try {
    const first = runCli([dir, "--lang", "en"]);
    assert.match(first, /Placed \(\d+\):/, "新規配置の見出しが英語");
    // 次アクションブロック（従来の1行を置き換え）が英語で出る。
    assert.match(first, /What to do next:/, "次アクション見出しが英語");
    assert.match(first, /Type \/intent-discover/, "打つコマンド案内が英語");

    // user-data / shared を編集して更新経路の告知も確認する。
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# mine\n");
    fs.writeFileSync(path.join(dir, ".intent", "intent-tree.md"), "# my tree\n");
    const second = runCli([dir, "--lang", "en"]);
    assert.match(second, /Skipped \(protecting your data\)/, "データ保護スキップの見出しが英語");
    assert.match(second, /--force WOULD overwrite all of them/, "--force の危険明示（警告）が英語");
    assert.match(second, /Skipped \(respecting existing shared files\)/, "共有ファイルスキップの見出しが英語");
    assert.match(second, /add --update-shared/, "安全な代替の案内が英語 (INV56)");
    assert.doesNotMatch(second, /スキップ/, "日本語の見出しが混ざらない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (b'') --lang en: --update-shared の対象なし告知も英語 ----
test("--lang en: --update-shared no-target notice is English", () => {
  const dir = tmpDir();
  try {
    runCli([dir, "--lang", "en"]);
    const out = runCli([dir, "--lang", "en", "--update-shared"]);
    assert.match(out, /no shared files needed refreshing/, "対象なし告知が英語");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (c) 既定 (未指定) は従来どおり日本語 ----
test("default (no --lang): notices stay Japanese (backward compat)", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir]);
    assert.match(out, /新規配置しました/, "既定は日本語の見出し");
    // 次アクションブロックが日本語で出る。
    assert.match(out, /次にやること:/, "次アクション見出しが日本語");
    assert.match(out, /\/intent-discover と入力/, "打つコマンド案内が日本語");
    assert.doesNotMatch(out, /Placed \(/, "英語見出しが混ざらない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (c') 対応外 lang (fr): ja フォールバック（テンプレもメッセージも日本語・非停止） ----
test("--lang fr falls back to Japanese messages (non-stop)", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--lang", "fr"]);
    assert.match(out, /注意: 指定された言語 "fr"/, "フォールバック告知が日本語で出る");
    assert.match(out, /新規配置しました/, "本文も日本語");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (a') 実機 smoke: --lang en で英語版テンプレートが配置される ----
test("--lang en places English templates (README.en journey)", () => {
  const dir = tmpDir();
  try {
    runCli([dir, "--lang", "en"]);
    const scaffold = fs.readFileSync(path.join(dir, ".intent", "README.md"), "utf8");
    const enTemplate = fs.readFileSync(path.join(ROOT, "templates", "en", "intent", "README.md"), "utf8");
    assert.equal(scaffold, enTemplate, "配置された scaffold が英語テンプレートと一致する");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
