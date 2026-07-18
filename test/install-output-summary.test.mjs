// インストール出力のサマリ化と次アクション明示のテスト
// (pkt-20260704-install-output-next-action-ufz4 / A45 系統 / C11・L1。
//  既定サマリの短縮契約は pkt-20260718-インストール出力の既定サマリ短縮-yqjz で更新:
//  冒頭に結論行・毎回同文の但し書きは --verbose 送り・警告は存在・件数・結論を必ず残す)
//
// 判別オラクル（誤った実装を落とす対比）:
//   (a) 素の install 出力が概ね一画面 (25 行以内) に収まり、冒頭の結論行・カテゴリ件数・
//       次アクションブロックを含む (ja/en)
//   (a2) 変化なしの再実行の既定出力が非空 15 行以内に収まり、冒頭で「変更なし」が読める
//   (b) --verbose で従来の全列挙 (+ path 行) と但し書き全文が戻る（情報を失っていない）
//   (c) 保護/共有の但し書き全文は既定では畳まれ、スキップ要約1行に件数が残る
//   (c') 警告は既定でも存在・件数・結論が残る（畳んでよいのは同文説明の全文だけ）
//   (d) --dry-run は従来どおり全列挙のまま（確認用途・結論行も足さない）
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

function runGit(dir, args) {
  execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" });
}

// ---- (a) 素の install (ja): 一画面に収まり件数サマリ + 次アクションブロックを含む ----
test("fresh install (ja): compact summary + concrete next-action block", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir]);
    const lines = out.split("\n");
    assert.ok(lines.length <= 25, `出力が概ね一画面に収まる (実際: ${lines.length} 行)`);

    // 冒頭は結論行（何が変わったか・対応が要るか）で始まる。
    assert.match(lines[0], /^結果: 新規 \d+ 件/, "1行目が結論行で始まる");
    assert.match(lines[0], /対応が要る項目はありません|要対応の注意 \d+ 件/, "結論行に要対応の有無が出る");
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
    assert.match(lines[0], /^Result: placed \d+ new/, "1行目が英語の結論行で始まる");
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

// ---- (a2) 変化なしの再実行: 非空 15 行以内 + 冒頭で「変更なし」が読める ----
// (L1 計測基準 (a)「変化なし再実行の既定出力がおおよそ15行以内」の観測。空行は段落の
//  区切りとして除外して数える＝内容行で測る)
test("no-change re-run: at most 15 non-empty lines, conclusion first", () => {
  const dir = tmpDir();
  try {
    runCli([dir]);
    const out = runCli([dir]);
    const lines = out.split("\n");
    const nonEmpty = lines.filter((l) => l.trim() !== "");
    assert.ok(
      nonEmpty.length <= 15,
      `変化なし再実行の既定出力が非空 15 行以内 (実際: ${nonEmpty.length} 行)`,
    );
    assert.match(lines[0], /^結果: 変更はありません/, "1行目で「変更なし」の結論が読める");
    assert.match(lines[0], /対応が要る項目はありません/, "1行目で要対応なしが読める");
    // 再実行の次アクション（続きは status）も残る。
    assert.match(out, /\/intent-status/, "再実行の次アクションが残る");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
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

// ---- (c) 保護/共有の但し書き全文は既定では畳まれ、スキップ要約1行に件数が残る ----
// (旧契約「注記文は既定でも全文出る」は install-output-brevity で更新: 但し書きは毎回同文の
//  説明のため --verbose 送り。何をスキップしたかの件数はスキップ要約1行で既定でも読める)
test("default: skip notes fold into a one-line summary; --verbose restores full notes", () => {
  const dir = tmpDir();
  try {
    // 初回 install 後に user-data と共有ファイルを編集して更新経路を通す。
    runCli([dir]);
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# mine\n");
    fs.writeFileSync(path.join(dir, ".intent", "intent-tree.md"), "# my tree\n");

    const out = runCli([dir]);
    // 既定はスキップ要約1行（件数入り）で、カテゴリ別の見出し・列挙・但し書きは畳む。
    assert.match(out, /^スキップ: .*あなたのデータを保護 \d+/m, "スキップ要約1行に保護件数が出る");
    assert.doesNotMatch(out, /^\s{2}= /m, "既定では保護/共有のファイル列挙を畳む");
    assert.doesNotMatch(out, /--force を付けるとこれらも全て上書き/, "既定では保護但し書きの全文を畳む");
    // --verbose では但し書き（データ保護の危険明示・--update-shared 案内）の全文が戻る。
    const verbose = runCli([dir, "--verbose"]);
    assert.match(verbose, /スキップ \(あなたのデータを保護\) \(\d+\):/, "verbose でカテゴリ見出しが戻る");
    assert.match(
      verbose,
      /--force を付けるとこれらも全て上書きされ、データが失われます/,
      "verbose で保護注記の警告文が全文戻る",
    );
    assert.match(verbose, /配布版へ更新するには --update-shared/, "verbose で安全な代替案内が全文戻る");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- (c'') 警告（Git 追跡中の cc-sdd 下書き）は既定でも存在・件数・結論が残る ----
// (INV117 のオラクル: 「畳みすぎ」＝警告の存在・件数・結論まで消える誤実装を落とす)
test("default: tracked cc-sdd warning keeps existence, count and conclusion", () => {
  const dir = tmpDir();
  try {
    runGit(dir, ["init", "-q"]);
    runCli([dir]);
    fs.mkdirSync(path.join(dir, ".intent", "cc-sdd", "sample"), { recursive: true });
    for (let i = 1; i <= 7; i++) {
      fs.writeFileSync(path.join(dir, ".intent", "cc-sdd", "sample", `f${i}.md`), "x\n");
    }
    runGit(dir, ["add", "-f", ".intent/cc-sdd/"]);
    runGit(dir, ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "x"]);

    const out = runCli([dir]);
    // 存在・件数（見出し）と結論（対応の要否）は既定でも残る。
    assert.match(out, /注意: Git 追跡中の cc-sdd 下書きがあります \(7 件\):/, "警告の存在・件数が残る");
    assert.match(out, /意図して Git で共有しているなら対応は不要です/, "警告の結論（対応の要否）が残る");
    // 冒頭の結論行にも要対応が数え上がる。
    assert.match(out.split("\n")[0], /要対応の注意 \d+ 件/, "結論行に要対応が出る");
    // ファイル一覧と対処手順の全文は既定では畳む。
    assert.doesNotMatch(out, /^\s{2}- \.intent\/cc-sdd\//m, "既定ではファイル一覧を畳む");
    assert.doesNotMatch(out, /git rm --cached/, "既定では対処手順の全文を畳む");
    // --verbose で全一覧と対処手順の全文が戻る。
    const verbose = runCli([dir, "--verbose"]);
    const listed = verbose.split("\n").filter((l) => l.startsWith("  - .intent/cc-sdd/"));
    assert.equal(listed.length, 7, "verbose で全7件が列挙される");
    assert.match(verbose, /git rm --cached/, "verbose で対処手順の全文が戻る");
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
    // dry-run はプレビュー契約のまま＝冒頭の結論行も足さない。
    assert.doesNotMatch(out, /^結果: /m, "dry-run に結論行を足さない");
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
