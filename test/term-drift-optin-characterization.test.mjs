// term-drift の専用 opt-in を指定しない既存 CLI 経路の characterization test。
//
// 外部実行の観測には PATH 先頭の npx sentinel を使う。通常実行、--yes、非TTY、
// dry-run、既存の更新レーンのいずれも、term-drift 専用 opt-in がなければ sentinel を
// 起動せず、term-drift 所有ファイルを配置しないことを固定する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO_ROOT, "bin", "cli.mjs");

function makeFixture(prefix = "ip-term-drift-optin-") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const target = path.join(root, "target");
  const fakeBin = path.join(root, "bin");
  const sentinel = path.join(root, "npx-was-called");
  fs.mkdirSync(target);
  fs.mkdirSync(fakeBin);

  const fakeNpx = path.join(fakeBin, "npx");
  fs.writeFileSync(
    fakeNpx,
    "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$TERM_DRIFT_NPX_SENTINEL\"\nexit 97\n",
  );
  fs.chmodSync(fakeNpx, 0o755);
  fs.writeFileSync(
    path.join(fakeBin, "npx.cmd"),
    "@echo off\r\n> \"%TERM_DRIFT_NPX_SENTINEL%\" echo %*\r\nexit /b 97\r\n",
  );

  return { root, target, fakeBin, sentinel };
}

function runCli(fixture, args) {
  return spawnSync(process.execPath, [CLI, fixture.target, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    // pipe は非TTY。将来の実装が対話確認を追加しても、この経路では暗黙に同意しない。
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PATH: fixture.fakeBin,
      TERM_DRIFT_NPX_SENTINEL: fixture.sentinel,
    },
  });
}

function assertCoreSuccess(result) {
  assert.equal(result.status, 0, `CLI succeeds\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.equal(result.signal, null);
}

function assertNoTermDriftSideEffects(fixture, agent = "claude") {
  assert.equal(fs.existsSync(fixture.sentinel), false, "external npx process call count is zero");
  assert.equal(fs.existsSync(path.join(fixture.target, ".term-drift")), false, ".term-drift is not placed");
  const skillRoot = agent === "claude" ? ".claude/skills" : ".agents/skills";
  assert.equal(
    fs.existsSync(path.join(fixture.target, skillRoot, "term-drift")),
    false,
    "selected agent's term-drift skill is not placed",
  );
}

function listFileBytes(root) {
  const files = new Map();
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.set(path.relative(root, absolute), fs.readFileSync(absolute));
    }
  }
  visit(root);
  return files;
}

function assertFileMapsEqual(actual, expected) {
  assert.deepEqual([...actual.keys()].sort(), [...expected.keys()].sort(), "file set is unchanged");
  for (const [relative, bytes] of expected) {
    assert.deepEqual(actual.get(relative), bytes, `${relative} remains byte-identical`);
  }
}

test("no term-drift opt-in: default nonTTY install keeps core cc-sdd/root-doc/gitignore behavior and never invokes npx", () => {
  const fixture = makeFixture();
  try {
    fs.mkdirSync(path.join(fixture.target, ".git"));
    fs.mkdirSync(path.join(fixture.target, ".kiro"));
    const rootDoc = path.join(fixture.target, "CLAUDE.md");
    fs.writeFileSync(rootDoc, "USER ROOT DOCUMENT\n");

    const result = runCli(fixture, []);

    assertCoreSuccess(result);
    assertNoTermDriftSideEffects(fixture);
    assert.equal(fs.readFileSync(rootDoc, "utf8"), "USER ROOT DOCUMENT\n", "nonTTY keeps existing root doc");
    assert.ok(fs.existsSync(path.join(fixture.target, ".intent", "README.md")), "shared scaffold is installed");
    assert.ok(
      fs.existsSync(path.join(fixture.target, ".claude", "skills", "intent-discover", "SKILL.md")),
      "selected agent's core skill is installed",
    );
    assert.match(fs.readFileSync(path.join(fixture.target, ".gitignore"), "utf8"), /\.intent\/cc-sdd\/\*/);
    assert.match(result.stdout, /cc-sdd/);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("no term-drift opt-in: --yes only consents to the existing root-doc append, not external installation", () => {
  const fixture = makeFixture();
  try {
    const rootDoc = path.join(fixture.target, "CLAUDE.md");
    fs.writeFileSync(rootDoc, "USER ROOT DOCUMENT\n");

    const result = runCli(fixture, ["--yes"]);

    assertCoreSuccess(result);
    assertNoTermDriftSideEffects(fixture);
    const after = fs.readFileSync(rootDoc, "utf8");
    assert.ok(after.startsWith("USER ROOT DOCUMENT\n"), "existing root content is preserved");
    assert.ok(after.length > "USER ROOT DOCUMENT\n".length, "--yes retains its existing root-doc meaning");
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("no term-drift opt-in: dry-run changes no files, invokes no process, and shows no term-drift install plan", () => {
  const fixture = makeFixture();
  try {
    fs.mkdirSync(path.join(fixture.target, ".git"));
    fs.mkdirSync(path.join(fixture.target, ".kiro"));
    fs.writeFileSync(path.join(fixture.target, "CLAUDE.md"), "USER ROOT DOCUMENT\n");
    const before = listFileBytes(fixture.target);

    const result = runCli(fixture, ["--yes", "--dry-run"]);

    assertCoreSuccess(result);
    assertNoTermDriftSideEffects(fixture);
    assertFileMapsEqual(listFileBytes(fixture.target), before);
    assert.match(result.stdout, /\[dry-run\]/);
    assert.match(result.stdout, /cc-sdd/);
    assert.doesNotMatch(
      result.stdout,
      /term-drift[^\n]*(?:0\.2\.1|導入予定|would install|planned)/i,
      "an unrequested dry-run does not invent a term-drift installation plan",
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("no term-drift opt-in: existing core update, shared update, and update suppression lanes remain independent", () => {
  const fixture = makeFixture();
  try {
    const args = ["--agent", "codex", "--yes"];
    assertCoreSuccess(runCli(fixture, args));

    const codeFile = path.join(fixture.target, ".agents", "skills", "intent-discover", "SKILL.md");
    const userDataFile = path.join(fixture.target, ".intent", "intent-tree.md");
    const sharedFile = path.join(fixture.target, "AGENTS.md");
    fs.writeFileSync(codeFile, "USER MODIFIED CODE\n");
    fs.writeFileSync(userDataFile, "USER INTENT DATA\n");
    fs.appendFileSync(sharedFile, "\nUSER SHARED CONTENT\n");

    const defaultUpdate = runCli(fixture, args);
    assertCoreSuccess(defaultUpdate);
    assertNoTermDriftSideEffects(fixture, "codex");
    assert.notEqual(fs.readFileSync(codeFile, "utf8"), "USER MODIFIED CODE\n", "default lane refreshes core code");
    assert.equal(fs.readFileSync(`${codeFile}.bak`, "utf8"), "USER MODIFIED CODE\n", "core code backup is kept");
    assert.equal(fs.readFileSync(userDataFile, "utf8"), "USER INTENT DATA\n", "user data remains protected");
    assert.match(fs.readFileSync(sharedFile, "utf8"), /USER SHARED CONTENT/, "shared file is skipped by default");

    fs.writeFileSync(codeFile, "SECOND USER MODIFICATION\n");
    const noUpdate = runCli(fixture, [...args, "--no-update"]);
    assertCoreSuccess(noUpdate);
    assertNoTermDriftSideEffects(fixture, "codex");
    assert.equal(fs.readFileSync(codeFile, "utf8"), "SECOND USER MODIFICATION\n", "--no-update suppresses refresh");

    const sharedUpdate = runCli(fixture, [...args, "--update-shared"]);
    assertCoreSuccess(sharedUpdate);
    assertNoTermDriftSideEffects(fixture, "codex");
    assert.doesNotMatch(fs.readFileSync(sharedFile, "utf8"), /USER SHARED CONTENT/, "--update-shared refreshes shared file");
    assert.match(fs.readFileSync(`${sharedFile}.bak`, "utf8"), /USER SHARED CONTENT/, "shared backup preserves prior bytes");
    assert.equal(fs.readFileSync(userDataFile, "utf8"), "USER INTENT DATA\n", "shared update does not touch user data");
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});
