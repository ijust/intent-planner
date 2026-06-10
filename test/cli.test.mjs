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
