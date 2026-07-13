import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  TERM_DRIFT_COMPATIBILITY,
  createTermDriftCompatibility,
  inspectTermDrift,
  normalizeTermDriftPath,
} from "../src/term-drift.mjs";

const PRODUCTION_HASHES = Object.freeze({
  commonFiles: Object.freeze({
    ".term-drift/rules/detect.md":
      "303644de1f60c05f2a2a52948d84072fc023e38cfcadc4898d3212fac5193bfe",
    ".term-drift/rules/workflow.md":
      "60522e3e4a371d7f47ea0da92c0418d0704618a8654fa7e3af9444becc085e86",
  }),
  skillFiles: Object.freeze({
    "SKILL.md": "c006def08324ad50e749b36bfa31b7a747a32607561cd20768f64a48440266cb",
    "agents/openai.yaml":
      "e35e3820b0fc52bec4e8f033a6519ed05b9deebd24fe0b4f4fa0269f627e94d7",
  }),
});

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

test("production compatibility contract freezes term-drift 0.2.1 and its four published hashes", () => {
  assert.deepEqual(TERM_DRIFT_COMPATIBILITY, {
    version: "0.2.1",
    ...PRODUCTION_HASHES,
  });
  assert.equal(Object.isFrozen(TERM_DRIFT_COMPATIBILITY), true);
  assert.equal(Object.isFrozen(TERM_DRIFT_COMPATIBILITY.commonFiles), true);
  assert.equal(Object.isFrozen(TERM_DRIFT_COMPATIBILITY.skillFiles), true);
  assert.equal(
    Object.keys(TERM_DRIFT_COMPATIBILITY.commonFiles).length +
      Object.keys(TERM_DRIFT_COMPATIBILITY.skillFiles).length,
    4,
  );
});

test("an injectable compatibility contract hashes short arbitrary fixture bytes without package artifacts", () => {
  const fixtureBytes = {
    commonFiles: {
      ".term-drift/rules/detect.md": "detect fixture\n",
      ".term-drift/rules/workflow.md": Buffer.from([0, 1, 2, 3]),
    },
    skillFiles: {
      "SKILL.md": "skill fixture\n",
      "agents/openai.yaml": "interface:\n  display_name: fixture\n",
    },
  };

  const contract = createTermDriftCompatibility("fixture-version", fixtureBytes);

  assert.deepEqual(contract, {
    version: "fixture-version",
    commonFiles: {
      ".term-drift/rules/detect.md": sha256(fixtureBytes.commonFiles[".term-drift/rules/detect.md"]),
      ".term-drift/rules/workflow.md": sha256(
        fixtureBytes.commonFiles[".term-drift/rules/workflow.md"],
      ),
    },
    skillFiles: {
      "SKILL.md": sha256(fixtureBytes.skillFiles["SKILL.md"]),
      "agents/openai.yaml": sha256(fixtureBytes.skillFiles["agents/openai.yaml"]),
    },
  });
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(Object.isFrozen(contract.commonFiles), true);
  assert.equal(Object.isFrozen(contract.skillFiles), true);
});

test("path normalization converts platform separators to POSIX without resolving the path", () => {
  assert.equal(normalizeTermDriftPath(".agents\\skills\\term-drift\\SKILL.md"), ".agents/skills/term-drift/SKILL.md");
  assert.equal(normalizeTermDriftPath(".agents/skills/term-drift/SKILL.md"), ".agents/skills/term-drift/SKILL.md");
  assert.equal(normalizeTermDriftPath("..\\term-drift\\SKILL.md"), "../term-drift/SKILL.md");
  assert.equal(normalizeTermDriftPath("\\\\server\\share\\term-drift"), "//server/share/term-drift");
});

test("compatibility contract construction rejects ambiguous or invalid input", () => {
  assert.throws(
    () => createTermDriftCompatibility("", { commonFiles: {}, skillFiles: {} }),
    /version must be a non-empty string/,
  );
  assert.throws(
    () =>
      createTermDriftCompatibility("fixture-version", {
        commonFiles: { "detect.md": 42 },
        skillFiles: {},
      }),
    /fixture bytes must be a string, Buffer, or Uint8Array/,
  );
  assert.throws(() => normalizeTermDriftPath(null), /path must be a string/);
});

const INSPECTOR_FIXTURE = Object.freeze({
  version: "fixture-version",
  commonFiles: Object.freeze({
    ".term-drift/rules/detect.md": "detect fixture\n",
    ".term-drift/rules/workflow.md": "workflow fixture\n",
  }),
  skillFiles: Object.freeze({
    "SKILL.md": "skill fixture\n",
    "agents/openai.yaml": "interface:\n  display_name: fixture\n",
  }),
});

const INSPECTOR_CONTRACT = createTermDriftCompatibility(INSPECTOR_FIXTURE.version, {
  commonFiles: INSPECTOR_FIXTURE.commonFiles,
  skillFiles: INSPECTOR_FIXTURE.skillFiles,
});

const INSPECTOR_AGENT = Object.freeze({
  agentName: "codex",
  termDriftSkillDest: ".agents/skills/term-drift",
});

function withInspectorTarget(run) {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "ip-term-drift-health-"));
  try {
    run(targetDir);
  } finally {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
}

function writeFixtureFile(targetDir, relativePath, bytes) {
  const absolutePath = path.join(targetDir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, bytes);
}

function writeCompleteInspectorFixture(targetDir) {
  writeFixtureFile(
    targetDir,
    ".term-drift/version.json",
    `${JSON.stringify({ package: "term-drift", version: INSPECTOR_FIXTURE.version }, null, 2)}\n`,
  );
  for (const [relativePath, bytes] of Object.entries(INSPECTOR_FIXTURE.commonFiles)) {
    writeFixtureFile(targetDir, relativePath, bytes);
  }
  for (const [relativePath, bytes] of Object.entries(INSPECTOR_FIXTURE.skillFiles)) {
    writeFixtureFile(
      targetDir,
      path.posix.join(INSPECTOR_AGENT.termDriftSkillDest, relativePath),
      bytes,
    );
  }
}

function inspectFixture(targetDir, agentEntry = INSPECTOR_AGENT) {
  return inspectTermDrift(targetDir, agentEntry, INSPECTOR_CONTRACT);
}

function issuePaths(health, code) {
  return health.issues.filter((issue) => issue.code === code).map((issue) => issue.path);
}

function snapshotTree(rootDir) {
  const entries = [];
  function visit(relativeDir) {
    const absoluteDir = path.join(rootDir, relativeDir);
    for (const name of fs.readdirSync(absoluteDir).sort()) {
      const relativePath = path.join(relativeDir, name);
      const absolutePath = path.join(rootDir, relativePath);
      const stat = fs.lstatSync(absolutePath);
      entries.push({
        path: normalizeTermDriftPath(relativePath),
        mode: stat.mode,
        mtimeMs: stat.mtimeMs,
        bytes: stat.isFile() ? fs.readFileSync(absolutePath).toString("base64") : null,
      });
      if (stat.isDirectory()) visit(relativePath);
    }
  }
  visit("");
  return entries;
}

test("filesystem inspector returns not-installed only when no project-local artifact exists", () => {
  withInspectorTarget((targetDir) => {
    fs.mkdirSync(path.join(targetDir, "node_modules", ".term-drift"), { recursive: true });
    writeFixtureFile(targetDir, "node_modules/.term-drift/version.json", "not an input\n");

    assert.deepEqual(inspectFixture(targetDir), { state: "not-installed" });
  });
});

test("filesystem inspector accepts only a complete compatible version, rules, and selected skill", () => {
  withInspectorTarget((targetDir) => {
    writeCompleteInspectorFixture(targetDir);
    writeFixtureFile(targetDir, ".term-drift/rules/project-note.md", "allowed common extra\n");
    const before = snapshotTree(targetDir);

    assert.deepEqual(inspectFixture(targetDir), {
      state: "ready",
      version: INSPECTOR_FIXTURE.version,
      skillPath: INSPECTOR_AGENT.termDriftSkillDest,
    });
    assert.deepEqual(snapshotTree(targetDir), before, "health inspection must not write or repair files");
  });
});

test("marker-only and missing version/rules/selected skill are inconsistent with path issues", () => {
  withInspectorTarget((targetDir) => {
    fs.mkdirSync(path.join(targetDir, ".term-drift"));

    const markerOnly = inspectFixture(targetDir);
    assert.equal(markerOnly.state, "inconsistent");
    assert.deepEqual(issuePaths(markerOnly, "missing"), [
      ".term-drift/version.json",
      ".term-drift/rules/detect.md",
      ".term-drift/rules/workflow.md",
      ".agents/skills/term-drift/SKILL.md",
      ".agents/skills/term-drift/agents/openai.yaml",
    ]);

    writeCompleteInspectorFixture(targetDir);
    fs.rmSync(path.join(targetDir, ".term-drift/version.json"));
    fs.rmSync(path.join(targetDir, ".term-drift/rules/workflow.md"));
    fs.rmSync(path.join(targetDir, ".agents/skills/term-drift"), { recursive: true });
    const partial = inspectFixture(targetDir);
    assert.equal(partial.state, "inconsistent");
    assert.deepEqual(issuePaths(partial, "missing"), [
      ".term-drift/version.json",
      ".term-drift/rules/workflow.md",
      ".agents/skills/term-drift/SKILL.md",
      ".agents/skills/term-drift/agents/openai.yaml",
    ]);
  });
});

test("invalid version schema and mismatched rule or skill bytes identify their exact paths", () => {
  withInspectorTarget((targetDir) => {
    writeCompleteInspectorFixture(targetDir);
    writeFixtureFile(
      targetDir,
      ".term-drift/version.json",
      JSON.stringify({ package: "other", version: INSPECTOR_FIXTURE.version }),
    );
    writeFixtureFile(targetDir, ".term-drift/rules/detect.md", "mismatched rule\n");
    writeFixtureFile(targetDir, ".agents/skills/term-drift/SKILL.md", "mismatched skill\n");

    const health = inspectFixture(targetDir);
    assert.equal(health.state, "inconsistent");
    assert.deepEqual(issuePaths(health, "invalid-version"), [".term-drift/version.json"]);
    assert.deepEqual(issuePaths(health, "hash-mismatch"), [
      ".term-drift/rules/detect.md",
      ".agents/skills/term-drift/SKILL.md",
    ]);
  });
});

test("selected skill tree rejects partial content and unexpected entries", () => {
  withInspectorTarget((targetDir) => {
    writeCompleteInspectorFixture(targetDir);
    fs.rmSync(path.join(targetDir, ".agents/skills/term-drift/agents/openai.yaml"));
    writeFixtureFile(targetDir, ".agents/skills/term-drift/extra.md", "unexpected\n");
    fs.mkdirSync(path.join(targetDir, ".agents/skills/term-drift/extra-dir"));

    const health = inspectFixture(targetDir);
    assert.equal(health.state, "inconsistent");
    assert.deepEqual(issuePaths(health, "missing"), [
      ".agents/skills/term-drift/agents/openai.yaml",
    ]);
    assert.deepEqual(issuePaths(health, "unexpected-skill-entry"), [
      ".agents/skills/term-drift/extra-dir",
      ".agents/skills/term-drift/extra.md",
    ]);
  });
});

test("symlinks, non-regular artifact files, and paths outside the project are unsafe", () => {
  withInspectorTarget((targetDir) => {
    writeCompleteInspectorFixture(targetDir);
    fs.rmSync(path.join(targetDir, ".term-drift/rules/detect.md"));
    fs.symlinkSync("workflow.md", path.join(targetDir, ".term-drift/rules/detect.md"));
    fs.rmSync(path.join(targetDir, ".agents/skills/term-drift/SKILL.md"));
    fs.mkdirSync(path.join(targetDir, ".agents/skills/term-drift/SKILL.md"));

    const health = inspectFixture(targetDir);
    assert.equal(health.state, "inconsistent");
    assert.deepEqual(issuePaths(health, "unsafe-path"), [
      ".term-drift/rules/detect.md",
      ".agents/skills/term-drift/SKILL.md",
    ]);

    const outside = inspectFixture(targetDir, {
      agentName: "unsafe",
      termDriftSkillDest: "../outside/term-drift",
    });
    assert.equal(outside.state, "inconsistent");
    assert.deepEqual(issuePaths(outside, "unsafe-path"), [
      ".term-drift/rules/detect.md",
      "../outside/term-drift",
    ]);
  });
});
