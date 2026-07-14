import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { termDriftExitCode } from "../bin/cli.mjs";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO_ROOT, "bin", "cli.mjs");

function withFixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ip-term-drift-result-"));
  const target = path.join(root, "target");
  fs.mkdirSync(target);
  try {
    run({ root, target });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function runCli(fixture, args, target = fixture.target) {
  return spawnSync(process.execPath, [CLI, target, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("standard result exit table treats failed and blocked as localized nonzero results", () => {
  assert.equal(termDriftExitCode({ action: "failed", health: { state: "not-installed" } }), 2);
  assert.equal(
    termDriftExitCode({
      action: "blocked-inconsistent",
      health: { state: "inconsistent", repairability: "blocked", issues: [] },
    }),
    2,
  );
  for (const action of ["already-ready", "installed", "updated", "planned"]) {
    assert.equal(termDriftExitCode({ action, health: { state: "not-installed" } }), 0);
  }
});

test("blocked healthはlegacy flagの有無に関係なくexit 2でcore成果を保持する", () => {
  for (const legacyFlag of [false, true]) {
    withFixture((fixture) => {
      fs.mkdirSync(path.join(fixture.target, ".term-drift"));
      fs.writeFileSync(path.join(fixture.target, ".term-drift", "version.json"), "not-json\n");
      const args = legacyFlag ? ["--with-term-drift"] : [];

      const result = runCli(fixture, args);

      assert.equal(result.status, 2, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
      assert.equal(fs.existsSync(path.join(fixture.target, ".intent", "README.md")), true);
      assert.match(result.stdout, /自動修復できない/);
      assert.match(result.stdout, /\.term-drift\/version\.json \(invalid-version\)/);
      assert.doesNotMatch(result.stdout, /support us with a star/i);
    });
  }
});

test("core installation exception remains exit 1 and never reaches standard term-drift integration", () => {
  withFixture((fixture) => {
    const invalidTarget = path.join(fixture.root, "not-a-directory");
    fs.writeFileSync(invalidTarget, "file\n");

    const result = runCli(fixture, ["--with-term-drift"], invalidTarget);

    assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    assert.match(result.stderr, /エラー:/);
    assert.doesNotMatch(result.stdout, /term-drift:/);
  });
});
