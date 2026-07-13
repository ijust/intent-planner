// term-drift 専用 opt-in と CLI 同意境界の検査。
// 外部取得は PATH 先頭の fake npx で置き換え、network/package cache に依存しない。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeTermDriftConfirm } from "../bin/cli.mjs";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO_ROOT, "bin", "cli.mjs");

function withFixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ip-term-drift-cli-"));
  const target = path.join(root, "target");
  const fakeBin = path.join(root, "bin");
  const sentinel = path.join(root, "npx-call.json");
  fs.mkdirSync(target);
  fs.mkdirSync(fakeBin);
  fs.writeFileSync(
    path.join(fakeBin, "npx"),
    "#!/bin/sh\nprintf '[\"%s\",\"%s\",\"%s\"]\\n' \"$1\" \"$2\" \"$3\" > \"$TERM_DRIFT_NPX_SENTINEL\"\nexit 73\n",
  );
  fs.chmodSync(path.join(fakeBin, "npx"), 0o755);
  fs.writeFileSync(
    path.join(fakeBin, "npx.cmd"),
    "@echo off\r\n> \"%TERM_DRIFT_NPX_SENTINEL%\" echo [\"%1\",\"%2\",\"%3\"]\r\nexit /b 73\r\n",
  );
  try {
    run({ root, target, fakeBin, sentinel });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function runCli(fixture, args) {
  return spawnSync(process.execPath, [CLI, fixture.target, ...args], {
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

test("--with-term-drift is dedicated pre-consent and invokes the selected agent owner installer", () => {
  withFixture((fixture) => {
    const result = runCli(fixture, ["--agent", "codex", "--with-term-drift"]);

    assert.equal(result.status, 2, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    assert.equal(fs.existsSync(fixture.sentinel), true, "dedicated opt-in invokes npx in nonTTY");
    assert.deepEqual(JSON.parse(fs.readFileSync(fixture.sentinel, "utf8")), [
      "--yes",
      "term-drift@0.2.1",
      "--codex",
    ]);
  });
});

test("--yes alone remains root-document consent and never becomes term-drift consent", () => {
  withFixture((fixture) => {
    const result = runCli(fixture, ["--yes"]);

    assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    assert.equal(fs.existsSync(fixture.sentinel), false);
  });
});

test("dedicated opt-in dry-run invokes neither confirmation input nor owner installer", () => {
  withFixture((fixture) => {
    const result = runCli(fixture, ["--with-term-drift", "--dry-run"]);

    assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    assert.equal(fs.existsSync(fixture.sentinel), false);
  });
});

test("CLI renders the Coordinator dry-run plan with equivalent ja/en meanings", () => {
  for (const [lang, patterns] of [
    ["ja", [/term-drift 0\.2\.1/, /agent: codex/, /action: 実行予定/, /mode: 新規導入/, /未導入/]],
    ["en", [/term-drift 0\.2\.1/, /agent: codex/, /action: would run/i, /mode: fresh install/i, /not installed/i]],
  ]) {
    withFixture((fixture) => {
      const result = runCli(fixture, [
        "--agent",
        "codex",
        "--lang",
        lang,
        "--with-term-drift",
        "--dry-run",
      ]);

      assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
      assert.equal(fs.existsSync(fixture.sentinel), false);
      for (const pattern of patterns) assert.match(result.stdout, pattern);
    });
  }
});

test("CLI renders blocked Coordinator health with issue paths instead of a fictional run", () => {
  withFixture((fixture) => {
    fs.mkdirSync(path.join(fixture.target, ".term-drift"));
    fs.writeFileSync(path.join(fixture.target, ".term-drift", "version.json"), "not-json\n");

    const result = runCli(fixture, ["--lang", "en", "--with-term-drift", "--dry-run"]);

    assert.equal(result.status, 2, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    assert.equal(fs.existsSync(fixture.sentinel), false);
    assert.match(result.stdout, /action: suppressed/i);
    assert.match(result.stdout, /automatic repair is blocked/i);
    assert.match(result.stdout, /\.term-drift\/version\.json \(invalid-version\)/);
    assert.doesNotMatch(result.stdout, /action: would run/i);
  });
});

test("ja/en help expose the same dedicated opt-in independently from --yes", () => {
  for (const lang of ["ja", "en"]) {
    const result = spawnSync(process.execPath, [CLI, "--help", "--lang", lang], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /--with-term-drift/);
    assert.match(result.stdout, /--yes, -y/);
  }
});

test("TTY confirmation callback contains selected context and localized prompt; nonTTY declines", () => {
  for (const [language, promptFor] of [
    ["ja", ({ version, agent }) => `${agent} 向け term-drift ${version} を導入しますか?`],
    ["en", ({ version, agent }) => `Install term-drift ${version} for ${agent}?`],
  ]) {
    let received;
    const confirm = makeTermDriftConfirm({
      isTTY: true,
      promptFor,
      confirmFactory(options) {
        received = options;
        return () => true;
      },
    });
    assert.equal(confirm({ version: "0.2.1", agent: "gemini", health: { state: "not-installed" } }), true);
    assert.equal(received.isTTY, true);
    assert.match(received.promptFor(), language === "ja" ? /gemini 向け/ : /for gemini/);
  }

  let prompted = false;
  const decline = makeTermDriftConfirm({
    isTTY: false,
    promptFor: () => {
      prompted = true;
      return "must not be rendered";
    },
  });
  assert.equal(decline({ version: "0.2.1", agent: "claude", health: { state: "not-installed" } }), false);
  assert.equal(prompted, false);
});

test("TTY confirmation decline is propagated after exactly one factory and callback invocation", () => {
  let factoryCalls = 0;
  let confirmCalls = 0;
  const decline = makeTermDriftConfirm({
    isTTY: true,
    promptFor: ({ version, agent }) => `Install term-drift ${version} for ${agent}?`,
    confirmFactory(options) {
      factoryCalls += 1;
      assert.equal(options.isTTY, true);
      assert.match(options.promptFor(), /term-drift 0\.2\.1 for codex/);
      return () => {
        confirmCalls += 1;
        return false;
      };
    },
  });

  assert.equal(
    decline({ version: "0.2.1", agent: "codex", health: { state: "not-installed" } }),
    false,
  );
  assert.equal(factoryCalls, 1);
  assert.equal(confirmCalls, 1);
});
