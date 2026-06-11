// intent-planner CLI のテスト (node:test 標準・依存ゼロ)
// CLI を子プロセスで実行し、stdout の告知文言を検証する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "..", "bin", "cli.mjs");

function runCli(args) {
  return execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ip-cli-test-"));
}

// ---- 2.4 --help: --lang 説明が ja, en を反映 ----
test("--help shows --lang supports ja and en", () => {
  const out = runCli(["--help"]);
  // --lang の説明行に ja と en の両方が含まれる
  const langLine = out.split("\n").find((l) => l.includes("--lang"));
  assert.ok(langLine, "--lang の説明行が存在する");
  assert.match(langLine, /ja/, "--lang 説明に ja を含む");
  assert.match(langLine, /en/, "--lang 説明に en を含む");
  // 「現在 ja のみ対応」のような en を否定する表現を残さない
  assert.doesNotMatch(out, /ja のみ/, "HELP に「ja のみ」が残っていない");
});

// ---- 2.3 未対応言語 (fr): en を否定しない中立な告知 ----
test("--lang fr prints neutral fallback notice (does not deny en)", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--lang", "fr"]);
    // フォールバック告知が出る
    assert.match(out, /注意/, "フォールバック告知が出る");
    assert.match(out, /fr/, "指定言語 fr に言及する");
    // 「ja のみ対応」/「現在 ja のみ」のような en を否定する文言を含まない
    assert.doesNotMatch(out, /ja のみ/, "「ja のみ」を含まない");
    assert.doesNotMatch(out, /現在 ja のみ対応/, "「現在 ja のみ対応」を含まない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 2.3 / 2.2 --lang en: langFallback=false なので告知が出ない ----
test("--lang en prints no fallback notice", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--lang", "en"]);
    assert.doesNotMatch(out, /注意:/, "en 指定時にフォールバック告知が出ない");
    assert.doesNotMatch(out, /未対応/, "en 指定時に未対応告知が出ない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// execFileSync が非ゼロ終了でも stdout/stderr/status を取れるラッパ。
function runCliResult(args) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      status: err.status ?? 1,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
  }
}

// ---- task 2.3 (a) --agent codex: codex 配置 (.agents/skills/intent-* + AGENTS.md, .claude なし) ----
test("--agent codex places codex skills + AGENTS.md and not .claude", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--agent", "codex"]);
    // on-disk: codex の配置先と AGENTS.md・.intent があり、.claude は無い
    assert.ok(
      fs.existsSync(path.join(dir, ".agents", "skills", "intent-discover")),
      ".agents/skills/intent-discover が配置される",
    );
    assert.ok(fs.existsSync(path.join(dir, "AGENTS.md")), "AGENTS.md が配置される");
    assert.ok(fs.existsSync(path.join(dir, ".intent")), ".intent が配置される");
    assert.ok(!fs.existsSync(path.join(dir, ".claude")), ".claude は配置されない");
    // 結果表示に codex・AGENTS.md・次コマンドが出る
    assert.match(out, /codex/, "結果に配置 agent codex が出る");
    assert.match(out, /AGENTS\.md/, "結果に AGENTS.md 案内が出る");
    assert.match(out, /\/intent-discover/, "結果に次コマンド /intent-discover が出る");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- task 2.3 (b) --agent 未指定: claude 配置 (.claude/skills, AGENTS.md なし) ----
test("no --agent installs claude (.claude/skills, no AGENTS.md)", () => {
  const dir = tmpDir();
  try {
    runCli([dir]);
    assert.ok(
      fs.existsSync(path.join(dir, ".claude", "skills", "intent-discover")),
      ".claude/skills/intent-discover が配置される",
    );
    assert.ok(fs.existsSync(path.join(dir, ".intent")), ".intent が配置される");
    assert.ok(!fs.existsSync(path.join(dir, "AGENTS.md")), "AGENTS.md は配置されない");
    assert.ok(!fs.existsSync(path.join(dir, ".agents")), ".agents は配置されない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- task 2.3 (c) --agent gemini: 非ゼロ終了 + エラー文言 + 無配置 ----
test("--agent gemini exits non-zero, prints error, places nothing", () => {
  const dir = tmpDir();
  try {
    const res = runCliResult([dir, "--agent", "gemini"]);
    assert.notEqual(res.status, 0, "非ゼロ終了する");
    assert.match(res.stderr, /対応していないエージェント/, "未対応 agent の旨を表示する");
    assert.match(res.stderr, /gemini/, "指定された gemini に言及する");
    // 何も配置されない
    assert.ok(!fs.existsSync(path.join(dir, ".claude")), ".claude を配置しない");
    assert.ok(!fs.existsSync(path.join(dir, ".agents")), ".agents を配置しない");
    assert.ok(!fs.existsSync(path.join(dir, "AGENTS.md")), "AGENTS.md を配置しない");
    assert.ok(!fs.existsSync(path.join(dir, ".intent")), ".intent を配置しない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- task 2.3 (d) --help: --agent 説明 (claude, codex) ----
test("--help shows --agent supporting claude and codex", () => {
  const out = runCli(["--help"]);
  const agentLine = out.split("\n").find((l) => l.includes("--agent"));
  assert.ok(agentLine, "--agent の説明行が存在する");
  assert.match(agentLine, /claude/, "--agent 説明に claude を含む");
  assert.match(agentLine, /codex/, "--agent 説明に codex を含む");
});

// ---- task 2.3: --agent=codex (= 形式) も同様に codex 配置 ----
test("--agent=codex (equals form) installs codex", () => {
  const dir = tmpDir();
  try {
    runCli([dir, "--agent=codex"]);
    assert.ok(fs.existsSync(path.join(dir, "AGENTS.md")), "AGENTS.md が配置される");
    assert.ok(!fs.existsSync(path.join(dir, ".claude")), ".claude は配置されない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- task 4.2 --enforce: フック配置サマリ (6.1, 6.7, 6.8) ----
// install は .git の existsSync しか見ないため、mkdir で git リポジトリ相当の配置先を作る。
function gitTmpDir() {
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, ".git"));
  return dir;
}

// install.mjs の plan が返す relative と同じ形（path.join 由来）で照合する。
const HOOK_RELATIVE = path.join(".git", "hooks", "pre-push");

// (a) --help に --enforce の説明行がある
test("--help shows --enforce line", () => {
  const out = runCli(["--help"]);
  const enforceLine = out.split("\n").find((l) => l.includes("--enforce"));
  assert.ok(enforceLine, "--enforce の説明行が存在する");
  assert.match(enforceLine, /pre-push/, "--enforce 説明に pre-push を含む");
});

// (b) 6.1: git リポジトリで --enforce → 配置一覧にフック + mode.md 案内、0o755 で実配置
test("--enforce in git repo lists hook placement, prints mode note, installs 0o755 hook", () => {
  const dir = gitTmpDir();
  try {
    const out = runCli([dir, "--enforce"]);
    assert.ok(out.includes(HOOK_RELATIVE), "配置一覧に .git/hooks/pre-push が出る");
    assert.match(out, /\.intent\/mode\.md/, "mode.md の案内が出る");
    assert.match(out, /enforcement/, "enforcement 設定で有効化される旨が出る");
    const hookPath = path.join(dir, ".git", "hooks", "pre-push");
    assert.ok(fs.existsSync(hookPath), "フックが実配置される");
    assert.equal(fs.statSync(hookPath).mode & 0o777, 0o755, "実行ビット 0o755 が付く");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (c) .git 不在で --enforce → 配置せず告知 + git init 後の再実行案内、.git を作らない
test("--enforce without .git prints notice + git init guidance, creates no .git", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--enforce"]);
    assert.match(out, /pre-push フックは配置しませんでした/, "フック未配置の告知が出る");
    assert.match(out, /git init 後に/, "git init 後の再実行案内が出る");
    assert.equal(fs.existsSync(path.join(dir, ".git")), false, ".git を作らない");
    assert.ok(!out.includes(HOOK_RELATIVE), "フックは配置一覧に出ない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (d) 6.8: --enforce --dry-run → 配置予定一覧にフックが含まれ、書き込みは発生しない
test("--enforce --dry-run lists hook in 配置予定 and writes nothing", () => {
  const dir = gitTmpDir();
  try {
    const out = runCli([dir, "--enforce", "--dry-run"]);
    assert.match(out, /配置予定/, "dry-run の配置予定見出しが出る");
    assert.ok(out.includes(HOOK_RELATIVE), "配置予定一覧に .git/hooks/pre-push が出る");
    assert.equal(
      fs.existsSync(path.join(dir, ".git", "hooks", "pre-push")),
      false,
      "フックは書き込まれない",
    );
    assert.equal(fs.existsSync(path.join(dir, ".intent")), false, "dry-run では何も書かない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (e) 6.7: 既存フックは SKIP 一覧に出て、手動統合（intent-check 呼び出し追記）の案内が出る
test("--enforce with existing hook shows skip + manual integration guidance", () => {
  const dir = gitTmpDir();
  const hookPath = path.join(dir, ".git", "hooks", "pre-push");
  fs.mkdirSync(path.dirname(hookPath), { recursive: true });
  fs.writeFileSync(hookPath, "#!/bin/sh\n# user hook\nexit 0\n");
  try {
    const out = runCli([dir, "--enforce"]);
    assert.ok(out.includes(`  = ${HOOK_RELATIVE}`), "スキップ一覧にフックが出る");
    assert.match(out, /intent-check\.mjs/, "手動統合の案内に intent-check 呼び出しが出る");
    assert.match(out, /追記/, "既存フックへの追記を案内する");
    assert.equal(
      fs.readFileSync(hookPath, "utf8"),
      "#!/bin/sh\n# user hook\nexit 0\n",
      "既存フックの内容は無変更",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (f) 6.2: --enforce なしの既定経路は不変（フック未配置・enforcement 言及なし）
test("no --enforce places no hook and prints no enforcement notes", () => {
  const dir = gitTmpDir();
  try {
    const out = runCli([dir]);
    assert.equal(
      fs.existsSync(path.join(dir, ".git", "hooks", "pre-push")),
      false,
      "フックは配置されない",
    );
    assert.ok(!out.includes(HOOK_RELATIVE), ".git/hooks/pre-push に言及しない");
    assert.doesNotMatch(out, /enforcement/, "enforcement の案内が出ない");
    assert.doesNotMatch(out, /git init/, "git init 案内が出ない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
