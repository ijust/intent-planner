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
  const fakeBin = path.join(root, "bin");
  const sentinel = path.join(root, "npx-call");
  fs.mkdirSync(target);
  fs.mkdirSync(fakeBin);
  fs.writeFileSync(
    path.join(fakeBin, "npx"),
    "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$TERM_DRIFT_NPX_SENTINEL\"\nexit 73\n",
  );
  fs.chmodSync(path.join(fakeBin, "npx"), 0o755);
  try {
    run({ root, target, fakeBin, sentinel });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function runCli(fixture, args, target = fixture.target) {
  return spawnSync(process.execPath, [CLI, target, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PATH: fixture.fakeBin,
      TERM_DRIFT_NPX_SENTINEL: fixture.sentinel,
    },
  });
}

test("optional result exit table distinguishes requested failure and requested blocked from warnings", () => {
  assert.equal(termDriftExitCode({ action: "failed", health: { state: "not-installed" } }, true), 2);
  assert.equal(
    termDriftExitCode(
      {
        action: "blocked-inconsistent",
        health: { state: "inconsistent", repairability: "blocked", issues: [] },
      },
      true,
    ),
    2,
  );
  assert.equal(
    termDriftExitCode(
      {
        action: "blocked-inconsistent",
        health: { state: "inconsistent", repairability: "blocked", issues: [] },
      },
      false,
    ),
    0,
  );
  for (const action of ["skipped", "already-ready", "installed", "planned"]) {
    assert.equal(termDriftExitCode({ action, health: { state: "not-installed" } }, true), 0);
  }
});

test("requested owner-installer failure exits 2, keeps core files, and does not print the success CTA", () => {
  for (const [lang, failedPattern, healthPattern] of [
    ["ja", /導入失敗/, /未導入/],
    ["en", /installation failed/i, /not installed/i],
  ]) {
    withFixture((fixture) => {
      const result = runCli(fixture, [
        "--agent",
        "codex",
        "--lang",
        lang,
        "--with-term-drift",
      ]);

      assert.equal(result.status, 2, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
      assert.equal(fs.existsSync(fixture.sentinel), true, "the requested owner installer ran");
      assert.equal(
        fs.existsSync(path.join(fixture.target, ".intent", "README.md")),
        true,
        "core installation remains after the optional failure",
      );
      assert.match(result.stdout, failedPattern);
      assert.match(result.stdout, healthPattern);
      assert.doesNotMatch(result.stdout, /support us with a star/i);
    });
  }
});

test("requested blocked health exits 2; the same unrequested health is a warning with exit 0", () => {
  withFixture((fixture) => {
    fs.mkdirSync(path.join(fixture.target, ".term-drift"));
    fs.writeFileSync(path.join(fixture.target, ".term-drift", "version.json"), "not-json\n");

    const requested = runCli(fixture, ["--with-term-drift"]);
    assert.equal(requested.status, 2, `stdout:\n${requested.stdout}\nstderr:\n${requested.stderr}`);
    assert.equal(fs.existsSync(fixture.sentinel), false, "blocked health never starts npx");
    assert.match(requested.stdout, /自動修復できない/);
    assert.match(requested.stdout, /\.term-drift\/version\.json \(invalid-version\)/);
    assert.doesNotMatch(requested.stdout, /support us with a star/i);

    const unrequested = runCli(fixture, []);
    assert.equal(unrequested.status, 0, `stdout:\n${unrequested.stdout}\nstderr:\n${unrequested.stderr}`);
    assert.match(unrequested.stdout, /自動修復できない/);
  });
});

test("a core installation exception remains exit 1 and never runs the optional integration", () => {
  withFixture((fixture) => {
    const invalidTarget = path.join(fixture.root, "not-a-directory");
    fs.writeFileSync(invalidTarget, "file\n");

    const result = runCli(fixture, ["--with-term-drift"], invalidTarget);

    assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    assert.equal(fs.existsSync(fixture.sentinel), false);
    assert.match(result.stderr, /エラー:/);
    assert.doesNotMatch(result.stdout, /term-drift:/);
  });
});
