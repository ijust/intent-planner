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
