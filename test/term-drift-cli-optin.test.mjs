// term-drift 標準配置と旧 --with-term-drift 互換aliasのCLI検査。
// installed direct dependencyのowner CLIを一時targetへ実走し、network取得へ依存しない。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO_ROOT, "bin", "cli.mjs");

function withFixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ip-term-drift-cli-"));
  const target = path.join(root, "target");
  fs.mkdirSync(target);
  try {
    return run({ root, target });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function runCli(fixture, args) {
  return spawnSync(process.execPath, [CLI, fixture.target, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
}

function assertReadyFiles(target, agentSkillRoot = ".agents/skills/term-drift") {
  assert.equal(fs.existsSync(path.join(target, ".term-drift/version.json")), true);
  assert.equal(fs.existsSync(path.join(target, agentSkillRoot, "SKILL.md")), true);
}

test("flagなし通常CLIがselected agentのowner installerを標準実行する", () => {
  withFixture((fixture) => {
    const result = runCli(fixture, ["--agent", "codex"]);

    assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    assertReadyFiles(fixture.target);
    assert.match(result.stdout, /term-drift:/);
    assert.match(result.stdout, /導入と互換性確認が完了/);
  });
});

test("旧 --with-term-drift はflagなしと同じ標準結果になる互換alias", () => {
  for (const legacyFlag of [false, true]) {
    withFixture((fixture) => {
      const args = ["--agent", "codex", "--lang", "en"];
      if (legacyFlag) args.push("--with-term-drift");
      const result = runCli(fixture, args);

      assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
      assertReadyFiles(fixture.target);
      assert.match(result.stdout, /Installation and compatibility check completed/i);
    });
  }
});

test("--yes はroot文書同意だけを扱い、term-drift標準配置を抑止しない", () => {
  withFixture((fixture) => {
    const result = runCli(fixture, ["--agent", "codex", "--yes"]);

    assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    assertReadyFiles(fixture.target);
  });
});

test("flagなしdry-runはowner processを起動せず標準配置計画を日英表示する", () => {
  for (const [lang, patterns] of [
    ["ja", [/term-drift 0\.3\.3/, /agent: codex/, /action: 実行予定/, /mode: 新規導入/, /未導入/]],
    ["en", [/term-drift 0\.3\.3/, /agent: codex/, /action: would run/i, /mode: fresh install/i, /not installed/i]],
  ]) {
    withFixture((fixture) => {
      const result = runCli(fixture, ["--agent", "codex", "--lang", lang, "--dry-run"]);

      assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
      assert.equal(fs.existsSync(path.join(fixture.target, ".term-drift")), false);
      for (const pattern of patterns) assert.match(result.stdout, pattern);
    });
  }
});

test("flagなしでもblocked healthを問題path付きで非ゼロ表示する", () => {
  withFixture((fixture) => {
    fs.mkdirSync(path.join(fixture.target, ".term-drift"));
    fs.writeFileSync(path.join(fixture.target, ".term-drift", "version.json"), "not-json\n");

    const result = runCli(fixture, ["--lang", "en", "--dry-run"]);

    assert.equal(result.status, 2, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    assert.match(result.stdout, /action: suppressed/i);
    assert.match(result.stdout, /automatic repair is blocked/i);
    assert.match(result.stdout, /\.term-drift\/version\.json \(invalid-version\)/);
    assert.doesNotMatch(result.stdout, /action: would run/i);
  });
});

test("ja/en helpは標準配置とlegacy aliasを同時に説明する", () => {
  for (const [lang, standardPattern] of [
    ["ja", /標準導入/],
    ["en", /installed by default/i],
  ]) {
    const result = spawnSync(process.execPath, [CLI, "--help", "--lang", lang], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /--with-term-drift/);
    assert.match(result.stdout, standardPattern);
    assert.match(result.stdout, /\.term-drift\//);
  }
});
