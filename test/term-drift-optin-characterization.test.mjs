// opt-in以前から存在するcore CLI lanesと、term-drift標準配置の共存を固定する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO_ROOT, "bin", "cli.mjs");

function makeFixture(prefix = "ip-term-drift-standard-") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const target = path.join(root, "target");
  fs.mkdirSync(target);
  return { root, target };
}

function runCli(fixture, args) {
  return spawnSync(process.execPath, [CLI, fixture.target, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertCoreSuccess(result) {
  assert.equal(result.status, 0, `CLI succeeds\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.equal(result.signal, null);
}

function assertTermDriftReady(fixture, agent = "claude") {
  const skillRoot = agent === "claude" ? ".claude/skills" : ".agents/skills";
  assert.equal(fs.existsSync(path.join(fixture.target, ".term-drift", "version.json")), true);
  assert.equal(fs.existsSync(path.join(fixture.target, skillRoot, "term-drift", "SKILL.md")), true);
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

test("default nonTTY install keeps core behavior and places term-drift through the standard owner route", () => {
  const fixture = makeFixture();
  try {
    fs.mkdirSync(path.join(fixture.target, ".git"));
    fs.mkdirSync(path.join(fixture.target, ".kiro"));
    const rootDoc = path.join(fixture.target, "CLAUDE.md");
    fs.writeFileSync(rootDoc, "USER ROOT DOCUMENT\n");

    const result = runCli(fixture, []);

    assertCoreSuccess(result);
    assertTermDriftReady(fixture);
    assert.equal(fs.readFileSync(rootDoc, "utf8"), "USER ROOT DOCUMENT\n", "nonTTY keeps existing root doc");
    assert.ok(fs.existsSync(path.join(fixture.target, ".intent", "README.md")));
    assert.ok(fs.existsSync(path.join(fixture.target, ".claude", "skills", "intent-discover", "SKILL.md")));
    assert.match(fs.readFileSync(path.join(fixture.target, ".gitignore"), "utf8"), /\.intent\/cc-sdd\/\*/);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("--yes keeps its root-doc meaning while term-drift remains standard", () => {
  const fixture = makeFixture();
  try {
    const rootDoc = path.join(fixture.target, "CLAUDE.md");
    fs.writeFileSync(rootDoc, "USER ROOT DOCUMENT\n");

    const result = runCli(fixture, ["--yes"]);

    assertCoreSuccess(result);
    assertTermDriftReady(fixture);
    const after = fs.readFileSync(rootDoc, "utf8");
    assert.ok(after.startsWith("USER ROOT DOCUMENT\n"));
    assert.ok(after.length > "USER ROOT DOCUMENT\n".length);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("dry-run changes no files and shows the standard term-drift plan", () => {
  const fixture = makeFixture();
  try {
    fs.mkdirSync(path.join(fixture.target, ".git"));
    fs.mkdirSync(path.join(fixture.target, ".kiro"));
    fs.writeFileSync(path.join(fixture.target, "CLAUDE.md"), "USER ROOT DOCUMENT\n");
    const before = listFileBytes(fixture.target);

    const result = runCli(fixture, ["--yes", "--dry-run"]);

    assertCoreSuccess(result);
    assertFileMapsEqual(listFileBytes(fixture.target), before);
    assert.match(result.stdout, /\[dry-run\]/);
    assert.match(result.stdout, /term-drift 0\.3\.6/);
    assert.match(result.stdout, /実行予定/);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("core update, shared update, and update suppression remain independent after term-drift is ready", () => {
  const fixture = makeFixture();
  try {
    const args = ["--agent", "codex", "--yes"];
    assertCoreSuccess(runCli(fixture, args));
    assertTermDriftReady(fixture, "codex");

    const ownerVersion = path.join(fixture.target, ".term-drift", "version.json");
    const ownerBefore = fs.readFileSync(ownerVersion);
    const codeFile = path.join(fixture.target, ".agents", "skills", "intent-discover", "SKILL.md");
    const userDataFile = path.join(fixture.target, ".intent", "intent-tree.md");
    const sharedFile = path.join(fixture.target, "AGENTS.md");
    fs.writeFileSync(codeFile, "USER MODIFIED CODE\n");
    fs.writeFileSync(userDataFile, "USER INTENT DATA\n");
    fs.appendFileSync(sharedFile, "\nUSER SHARED CONTENT\n");

    const defaultUpdate = runCli(fixture, args);
    assertCoreSuccess(defaultUpdate);
    assert.match(defaultUpdate.stdout, /term-drift[\s\S]*利用可能/);
    assert.deepEqual(fs.readFileSync(ownerVersion), ownerBefore);
    assert.notEqual(fs.readFileSync(codeFile, "utf8"), "USER MODIFIED CODE\n");
    assert.equal(fs.readFileSync(userDataFile, "utf8"), "USER INTENT DATA\n");
    assert.match(fs.readFileSync(sharedFile, "utf8"), /USER SHARED CONTENT/);

    fs.writeFileSync(codeFile, "SECOND USER MODIFICATION\n");
    assertCoreSuccess(runCli(fixture, [...args, "--no-update"]));
    assert.equal(fs.readFileSync(codeFile, "utf8"), "SECOND USER MODIFICATION\n");

    assertCoreSuccess(runCli(fixture, [...args, "--update-shared"]));
    assert.doesNotMatch(fs.readFileSync(sharedFile, "utf8"), /USER SHARED CONTENT/);
    assert.equal(fs.readFileSync(userDataFile, "utf8"), "USER INTENT DATA\n");
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});
