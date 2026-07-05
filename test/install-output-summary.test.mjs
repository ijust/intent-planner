// インストール出力のサマリ化と次アクション明示のテスト
// (pkt-20260704-install-output-next-action-ufz4 / A45 系統 / C11・L1)
//
// 判別オラクル（誤った実装を落とす対比）:
//   (a) 素の install 出力が概ね一画面 (25 行以内) に収まり、カテゴリ件数と次アクションブロックを含む (ja/en)
//   (b) --verbose で従来の全列挙 (+ path 行) が戻る（情報を失っていない）
//   (c) 警告系・保護/共有の注記文は既定でも全文出る（要約で隠さない）
//   (d) --dry-run は従来どおり全列挙のまま（確認用途）
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "..", "bin", "cli.mjs");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ip-out-summary-"));
}

function runCli(args) {
  return execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

// ---- (a) 素の install (ja): 一画面に収まり件数サマリ + 次アクションブロックを含む ----
test("fresh install (ja): compact summary + concrete next-action block", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir]);
    const lines = out.split("\n");
    assert.ok(lines.length <= 25, `出力が概ね一画面に収まる (実際: ${lines.length} 行)`);

    // カテゴリ見出しは件数付きで残る。
    assert.match(out, /新規配置しました \(\d+\):/, "新規配置の件数サマリ見出しが出る");
    // ファイル1件ずつの列挙は既定では畳まれている。
    assert.doesNotMatch(out, /^\s{2}\+ /m, "既定ではファイル列挙 (+ path) を出さない");
    // 全一覧の見方 (--verbose) を案内する。
    assert.match(out, /--verbose/, "--verbose の案内が出る");

    // 具体的な次アクション: どのツールで何を打つか。
    assert.match(out, /次にやること:/, "次アクションの見出しが出る");
    assert.match(out, /Claude Code/, "使うツール名 (Claude Code) が出る");
    assert.match(out, /\/intent-discover/, "打つコマンド /intent-discover が出る");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (a') 素の install (en): 同様に一画面 + 英語の次アクションブロック ----
test("fresh install (en): compact summary + English next-action block", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--lang", "en"]);
    const lines = out.split("\n");
    assert.ok(lines.length <= 25, `出力が概ね一画面に収まる (実際: ${lines.length} 行)`);
    assert.match(out, /Placed \(\d+\):/, "件数サマリ見出しが英語で出る");
    assert.doesNotMatch(out, /^\s{2}\+ /m, "既定ではファイル列挙を出さない");
    assert.match(out, /What to do next:/, "英語の次アクション見出しが出る");
    assert.match(out, /Open Claude Code/, "使うツール名 (Claude Code) が英語文脈で出る");
    assert.match(out, /Type \/intent-discover/, "打つコマンド /intent-discover が出る");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (a'') agent 別に次アクションのツール名が言い分けられる ----
test("next-action names the agent's tool (codex / gemini)", () => {
  const codexDir = tmpDir();
  const geminiDir = tmpDir();
  try {
    const codexOut = runCli([codexDir, "--agent", "codex"]);
    assert.match(codexOut, /次にやること:/, "codex でも次アクション見出しが出る");
    assert.match(codexOut, /Codex/, "codex では Codex を案内する");

    const geminiOut = runCli([geminiDir, "--agent", "gemini"]);
    assert.match(geminiOut, /Gemini CLI/, "gemini では Gemini CLI を案内する");
  } finally {
    fs.rmSync(codexDir, { recursive: true, force: true });
    fs.rmSync(geminiDir, { recursive: true, force: true });
  }
});

// ---- (b) --verbose: 従来のファイル全列挙 (+ path) が戻る ----
test("--verbose restores the full per-file listing", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--verbose"]);
    assert.match(out, /新規配置しました \(\d+\):/, "件数見出しは出る");
    assert.match(out, /^\s{2}\+ /m, "--verbose ではファイル列挙 (+ path) が出る");
    // 列挙数はカテゴリ件数と概ね揃う（多数行になる）。
    const plusLines = out.split("\n").filter((l) => l.startsWith("  + "));
    assert.ok(plusLines.length > 50, `多数のファイルが列挙される (実際: ${plusLines.length})`);
    // 全列挙のときは「--verbose を付けると」案内を重ねて出さない。
    assert.doesNotMatch(out, /--verbose を付けると表示されます/, "verbose 時は verbose 案内を出さない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (c) 警告系・保護/共有の注記文は既定でも全文出る（要約で隠さない） ----
test("default: protection/shared notes stay full-text (not summarized away)", () => {
  const dir = tmpDir();
  try {
    // 初回 install 後に user-data と共有ファイルを編集して更新経路を通す。
    runCli([dir]);
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# mine\n");
    fs.writeFileSync(path.join(dir, ".intent", "intent-tree.md"), "# my tree\n");

    const out = runCli([dir]);
    // 件数サマリになっているが……
    assert.match(out, /スキップ \(あなたのデータを保護\) \(\d+\):/, "データ保護の件数見出しが出る");
    assert.doesNotMatch(out, /^\s{2}= /m, "既定では保護/共有のファイル列挙を畳む");
    // ……注記文（データ保護の危険明示・--update-shared 案内）は全文残る。
    assert.match(out, /--force を付けるとこれらも全て上書きされ、データが失われます/, "保護注記の警告文が全文残る");
    assert.match(out, /配布版へ更新するには --update-shared/, "共有ファイルの安全な代替案内が全文残る");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (c') 警告 (非 git スキップ告知) は既定でも出る ----
test("default: warning notices are not summarized away", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir]);
    assert.match(out, /git リポジトリではないため \.gitignore 整備をスキップしました/, "警告告知は要約されず出る");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (d) --dry-run は従来どおり全列挙のまま ----
test("--dry-run keeps the full per-file listing (unchanged)", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--dry-run"]);
    assert.match(out, /新規配置予定 \(\d+\):/, "dry-run の配置予定見出しが出る");
    assert.match(out, /^\s{2}\+ /m, "dry-run ではファイル列挙が全て出る");
    const plusLines = out.split("\n").filter((l) => l.startsWith("  + "));
    assert.ok(plusLines.length > 50, `dry-run は全列挙のまま (実際: ${plusLines.length})`);
    // dry-run は列挙するので verbose 案内を出さない。
    assert.doesNotMatch(out, /--verbose を付けると表示されます/, "dry-run で verbose 案内を出さない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- --help: --verbose の説明が ja / en 両方に載る ----
test("--help documents --verbose (ja and en)", () => {
  const ja = runCli(["--help"]);
  const jaLine = ja.split("\n").find((l) => l.includes("--verbose"));
  assert.ok(jaLine, "--verbose の説明行が ja ヘルプに存在する");
  assert.match(jaLine, /列挙|一覧/, "--verbose 説明が列挙の趣旨を述べる");

  const en = runCli(["--help", "--lang", "en"]);
  const enLine = en.split("\n").find((l) => l.includes("--verbose"));
  assert.ok(enLine, "--verbose の説明行が en ヘルプに存在する");
  assert.match(enLine, /list|List/, "--verbose 説明 (en) が list を述べる");
});
