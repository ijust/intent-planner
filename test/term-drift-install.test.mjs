import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  TERM_DRIFT_COMPATIBILITY,
  createTermDriftFailure,
  createTermDriftCompatibility,
  executeTermDriftInstall,
  getTermDriftNpxExecutable,
  inspectTermDrift,
  normalizeTermDriftPath,
  projectTermDriftManifest,
  runTermDriftIntegration,
} from "../src/term-drift.mjs";
import { AGENT_REGISTRY } from "../src/install.mjs";

const PRODUCTION_HASHES = Object.freeze({
  commonFiles: Object.freeze({
    ".term-drift/rules/detect.md":
      "3c21b9fa6a5e2498f13713648945d2e4a61e0e664a1af9f7e16204a7e922728b",
    ".term-drift/rules/workflow.md":
      "cf5d5475539b24fbfb4fe330b56505fdf2ce94df3c2eea0a08a2e88547ae7945",
  }),
  skillFiles: Object.freeze({
    "SKILL.md": "1cf49ed084ad5c182d67f22cab9fc9cffa0403fe87e15681347c3906744bde0f",
    "agents/openai.yaml":
      "e35e3820b0fc52bec4e8f033a6519ed05b9deebd24fe0b4f4fa0269f627e94d7",
  }),
});

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

test("production compatibility contract freezes term-drift 0.2.3 and its four published hashes", () => {
  assert.deepEqual(TERM_DRIFT_COMPATIBILITY, {
    version: "0.2.3",
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

test("golden manifest contract projects the selected AGENT_REGISTRY entry without another agent table", () => {
  for (const entry of Object.values(AGENT_REGISTRY)) {
    const manifest = projectTermDriftManifest(entry);
    const expectedAssets = {
      ...PRODUCTION_HASHES.commonFiles,
      ...Object.fromEntries(
        Object.entries(PRODUCTION_HASHES.skillFiles).map(([relativePath, hash]) => [
          `${entry.termDriftSkillDest}/${relativePath}`,
          hash,
        ]),
      ),
    };

    assert.deepEqual(manifest, {
      package: "term-drift",
      version: "0.2.3",
      agent: entry.agentName,
      assets: expectedAssets,
    });
    assert.deepEqual(Object.keys(manifest).sort(), ["agent", "assets", "package", "version"]);
    assert.equal(Object.isFrozen(manifest), true);
    assert.equal(Object.isFrozen(manifest.assets), true);
  }
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
    assert.equal(markerOnly.repairability, "additive-compatible");
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
    assert.equal(partial.repairability, "additive-compatible");
    assert.deepEqual(issuePaths(partial, "missing"), [
      ".term-drift/version.json",
      ".term-drift/rules/workflow.md",
      ".agents/skills/term-drift/SKILL.md",
      ".agents/skills/term-drift/agents/openai.yaml",
    ]);
  });
});

test("compatible common artifacts allow a completely missing selected agent skill to be added", () => {
  withInspectorTarget((targetDir) => {
    writeFixtureFile(
      targetDir,
      ".term-drift/version.json",
      `${JSON.stringify({ package: "term-drift", version: INSPECTOR_FIXTURE.version }, null, 2)}\n`,
    );
    for (const [relativePath, bytes] of Object.entries(INSPECTOR_FIXTURE.commonFiles)) {
      writeFixtureFile(targetDir, relativePath, bytes);
    }

    for (const agentEntry of [
      { agentName: "claude", termDriftSkillDest: ".claude/skills/term-drift" },
      { agentName: "codex", termDriftSkillDest: ".agents/skills/term-drift" },
      { agentName: "gemini", termDriftSkillDest: ".gemini/skills/term-drift" },
    ]) {
      const health = inspectFixture(targetDir, agentEntry);
      assert.equal(health.state, "inconsistent");
      assert.equal(health.repairability, "additive-compatible");
      assert.deepEqual(
        health.issues,
        Object.keys(INSPECTOR_FIXTURE.skillFiles).map((relativePath) => ({
          code: "missing",
          path: `${agentEntry.termDriftSkillDest}/${relativePath}`,
        })),
      );
    }
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
    assert.equal(health.repairability, "blocked");
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
    assert.equal(health.repairability, "blocked");
    assert.deepEqual(issuePaths(health, "missing"), [
      ".agents/skills/term-drift/agents/openai.yaml",
    ]);
    assert.deepEqual(issuePaths(health, "unexpected-skill-entry"), [
      ".agents/skills/term-drift/extra-dir",
      ".agents/skills/term-drift/extra.md",
    ]);
  });
});

test("a present but partial selected skill is blocked even when every issue is missing", () => {
  withInspectorTarget((targetDir) => {
    writeCompleteInspectorFixture(targetDir);
    fs.rmSync(path.join(targetDir, ".agents/skills/term-drift/agents/openai.yaml"));

    const health = inspectFixture(targetDir);
    assert.equal(health.state, "inconsistent");
    assert.equal(health.repairability, "blocked");
    assert.deepEqual(health.issues, [
      {
        code: "missing",
        path: ".agents/skills/term-drift/agents/openai.yaml",
      },
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
    assert.equal(health.repairability, "blocked");
    assert.deepEqual(issuePaths(health, "unsafe-path"), [
      ".term-drift/rules/detect.md",
      ".agents/skills/term-drift/SKILL.md",
    ]);

    const outside = inspectFixture(targetDir, {
      agentName: "unsafe",
      termDriftSkillDest: "../outside/term-drift",
    });
    assert.equal(outside.state, "inconsistent");
    assert.equal(outside.repairability, "blocked");
    assert.deepEqual(issuePaths(outside, "unsafe-path"), [
      ".term-drift/rules/detect.md",
      "../outside/term-drift",
    ]);
  });
});

const RUNNER_AGENT = Object.freeze({
  agentName: "codex",
  termDriftArg: "--codex",
  termDriftSkillDest: ".agents/skills/term-drift",
});

function installOutput(overrides = {}) {
  return {
    installed: true,
    agent: RUNNER_AGENT.agentName,
    version: INSPECTOR_CONTRACT.version,
    skill: RUNNER_AGENT.termDriftSkillDest,
    ledger: null,
    created: [],
    skipped: [],
    notes: [],
    ...overrides,
  };
}

function spawnResult(overrides = {}) {
  return {
    status: 0,
    stdout: JSON.stringify(installOutput()),
    stderr: "",
    ...overrides,
  };
}

test("pinned runner uses an argv array, target cwd, shell false, and a platform-compatible npx executable", () => {
  withInspectorTarget((targetDir) => {
    const calls = [];
    const result = executeTermDriftInstall(targetDir, {
      agentEntry: RUNNER_AGENT,
      compatibility: INSPECTOR_CONTRACT,
      spawnSyncImpl(command, args, options) {
        calls.push({ command, args, options });
        writeCompleteInspectorFixture(targetDir);
        return spawnResult();
      },
    });

    assert.deepEqual(calls, [
      {
        command: getTermDriftNpxExecutable(process.platform),
        args: ["--yes", `term-drift@${INSPECTOR_CONTRACT.version}`, "--codex"],
        options: { cwd: targetDir, encoding: "utf8", shell: false },
      },
    ]);
    assert.equal(getTermDriftNpxExecutable("win32"), "npx.cmd");
    assert.equal(getTermDriftNpxExecutable("linux"), "npx");
    assert.equal(getTermDriftNpxExecutable("darwin"), "npx");
    assert.deepEqual(result, {
      ok: true,
      attempt: {
        command: getTermDriftNpxExecutable(process.platform),
        args: ["--yes", `term-drift@${INSPECTOR_CONTRACT.version}`, "--codex"],
        cwd: targetDir,
        exitCode: 0,
        stdout: JSON.stringify(installOutput()),
        stderr: "",
        error: null,
      },
      install: installOutput(),
      postHealth: {
        state: "ready",
        version: INSPECTOR_CONTRACT.version,
        skillPath: RUNNER_AGENT.termDriftSkillDest,
      },
    });
  });
});

test("production runner argv pins term-drift 0.2.3 and only the selected agent argument", () => {
  withInspectorTarget((targetDir) => {
    const calls = [];
    const result = executeTermDriftInstall(targetDir, {
      agentEntry: RUNNER_AGENT,
      spawnSyncImpl(command, args, options) {
        calls.push({ command, args, options });
        return spawnResult({ status: 1, stdout: "", stderr: "stopped before install" });
      },
    });

    assert.deepEqual(calls[0].args, ["--yes", "term-drift@0.2.3", "--codex"]);
    assert.equal(calls[0].options.shell, false);
    assert.equal(result.failure.kind, "nonzero-exit");
  });
});

test("pinned runner normalizes the reported skill path before matching the selected registry destination", () => {
  withInspectorTarget((targetDir) => {
    const result = executeTermDriftInstall(targetDir, {
      agentEntry: RUNNER_AGENT,
      compatibility: INSPECTOR_CONTRACT,
      spawnSyncImpl() {
        writeCompleteInspectorFixture(targetDir);
        return spawnResult({
          stdout: JSON.stringify(
            installOutput({ skill: ".agents\\skills\\term-drift" }),
          ),
        });
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.install.skill, RUNNER_AGENT.termDriftSkillDest);
  });
});

test("pinned runner returns structured failures and always reports post-install health", () => {
  const cases = [
    {
      expectedKind: "spawn-error",
      fake: () => ({
        status: null,
        stdout: "",
        stderr: "spawn stderr",
        error: Object.assign(new Error("spawn failed"), { code: "ENOENT" }),
      }),
    },
    {
      expectedKind: "spawn-error",
      fake: () => {
        throw new Error("injected spawn threw");
      },
    },
    {
      expectedKind: "nonzero-exit",
      fake: () => spawnResult({ status: 2, stdout: "partial output", stderr: "failed" }),
    },
    {
      expectedKind: "invalid-json",
      fake: () => spawnResult({ stdout: "not json" }),
    },
    {
      expectedKind: "contract-mismatch",
      fake: () => spawnResult({ stdout: JSON.stringify(installOutput({ version: "wrong" })) }),
    },
    {
      expectedKind: "contract-mismatch",
      fake: () => spawnResult({ stdout: JSON.stringify(installOutput({ agent: "claude" })) }),
    },
    {
      expectedKind: "contract-mismatch",
      fake: () => spawnResult({ stdout: JSON.stringify(installOutput({ skill: ".claude/skills/term-drift" })) }),
    },
  ];

  for (const { expectedKind, fake } of cases) {
    withInspectorTarget((targetDir) => {
      const result = executeTermDriftInstall(targetDir, {
        agentEntry: RUNNER_AGENT,
        compatibility: INSPECTOR_CONTRACT,
        spawnSyncImpl: fake,
      });

      assert.equal(result.ok, false);
      assert.equal(result.failure.kind, expectedKind);
      assert.deepEqual(result.postHealth, { state: "not-installed" });
      assert.equal(result.attempt.cwd, targetDir);
      assert.equal(Array.isArray(result.attempt.args), true);
    });
  }
});

test("a nonzero owner process is post-inspected with the injected compatibility contract", () => {
  withInspectorTarget((targetDir) => {
    const result = executeTermDriftInstall(targetDir, {
      agentEntry: RUNNER_AGENT,
      compatibility: INSPECTOR_CONTRACT,
      spawnSyncImpl() {
        writeCompleteInspectorFixture(targetDir);
        return spawnResult({ status: 2, stdout: "owner partial output", stderr: "owner failed" });
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "nonzero-exit");
    assert.equal(result.attempt.stdout, "owner partial output");
    assert.equal(result.attempt.stderr, "owner failed");
    assert.deepEqual(result.postHealth, {
      state: "ready",
      version: INSPECTOR_CONTRACT.version,
      skillPath: RUNNER_AGENT.termDriftSkillDest,
    });
  });
});

test("pinned runner distinguishes a valid process contract from a failed post-inspection", () => {
  withInspectorTarget((targetDir) => {
    const result = executeTermDriftInstall(targetDir, {
      agentEntry: RUNNER_AGENT,
      compatibility: INSPECTOR_CONTRACT,
      spawnSyncImpl: () => spawnResult(),
    });

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "postcheck-failed");
    assert.deepEqual(result.postHealth, { state: "not-installed" });
  });
});

test("invalid selected-agent runner contracts are rejected before spawn", () => {
  withInspectorTarget((targetDir) => {
    let spawnCalls = 0;
    const result = executeTermDriftInstall(targetDir, {
      agentEntry: {
        agentName: "codex",
        termDriftArg: "codex",
        termDriftSkillDest: RUNNER_AGENT.termDriftSkillDest,
      },
      compatibility: INSPECTOR_CONTRACT,
      spawnSyncImpl() {
        spawnCalls += 1;
        return spawnResult();
      },
    });

    assert.equal(spawnCalls, 0);
    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "contract-mismatch");
    assert.deepEqual(result.postHealth, { state: "not-installed" });
  });
});

function prepareCoordinatorHealth(targetDir, healthKind) {
  if (healthKind === "not-installed") return;
  if (healthKind === "ready") {
    writeCompleteInspectorFixture(targetDir);
    return;
  }
  if (healthKind === "additive-compatible") {
    fs.mkdirSync(path.join(targetDir, ".term-drift"), { recursive: true });
    return;
  }
  if (healthKind === "blocked") {
    writeCompleteInspectorFixture(targetDir);
    writeFixtureFile(targetDir, ".term-drift/rules/detect.md", "incompatible bytes\n");
    return;
  }
  throw new Error(`unknown coordinator health fixture: ${healthKind}`);
}

function expectedCoordinatorAction(healthKind, requested, dryRun) {
  if (healthKind === "ready") return "already-ready";
  if (healthKind === "blocked") return "blocked-inconsistent";
  if (dryRun) return requested ? "planned" : "skipped";
  return "installed";
}

test("integration coordinator follows the complete health, request, and dry-run decision table", () => {
  for (const healthKind of [
    "not-installed",
    "additive-compatible",
    "ready",
    "blocked",
  ]) {
    for (const requested of [false, true]) {
      for (const dryRun of [false, true]) {
        withInspectorTarget((targetDir) => {
          prepareCoordinatorHealth(targetDir, healthKind);
          let confirmCalls = 0;
          let spawnCalls = 0;
          let confirmContext;

          const result = runTermDriftIntegration(targetDir, {
            agentEntry: RUNNER_AGENT,
            requested,
            dryRun,
            compatibility: INSPECTOR_CONTRACT,
            confirm(context) {
              confirmCalls += 1;
              confirmContext = context;
              return true;
            },
            spawnSyncImpl() {
              spawnCalls += 1;
              writeCompleteInspectorFixture(targetDir);
              return spawnResult();
            },
          });

          const eligible =
            healthKind === "not-installed" || healthKind === "additive-compatible";
          assert.equal(
            result.action,
            expectedCoordinatorAction(healthKind, requested, dryRun),
            `${healthKind}, requested=${requested}, dryRun=${dryRun}`,
          );
          assert.equal(
            confirmCalls,
            eligible && !dryRun && !requested ? 1 : 0,
            `confirm count for ${healthKind}, requested=${requested}, dryRun=${dryRun}`,
          );
          assert.equal(
            spawnCalls,
            eligible && !dryRun ? 1 : 0,
            `spawn count for ${healthKind}, requested=${requested}, dryRun=${dryRun}`,
          );

          if (confirmCalls === 1) {
            assert.equal(confirmContext.version, INSPECTOR_CONTRACT.version);
            assert.equal(confirmContext.agent, RUNNER_AGENT.agentName);
            assert.equal(
              confirmContext.health.state,
              healthKind === "not-installed" ? "not-installed" : "inconsistent",
            );
          }
          if (result.action === "planned") {
            assert.equal(result.version, INSPECTOR_CONTRACT.version);
            assert.equal(result.agent, RUNNER_AGENT.agentName);
            assert.equal(
              result.mode,
              healthKind === "not-installed" ? "fresh-install" : "additive-completion",
            );
          }
        });
      }
    }
  }
});

test("integration coordinator skips an eligible install when injected confirmation declines", () => {
  withInspectorTarget((targetDir) => {
    let confirmCalls = 0;
    let spawnCalls = 0;
    const result = runTermDriftIntegration(targetDir, {
      agentEntry: RUNNER_AGENT,
      requested: false,
      dryRun: false,
      compatibility: INSPECTOR_CONTRACT,
      confirm() {
        confirmCalls += 1;
        return false;
      },
      spawnSyncImpl() {
        spawnCalls += 1;
        return spawnResult();
      },
    });

    assert.equal(result.action, "skipped");
    assert.deepEqual(result.health, { state: "not-installed" });
    assert.equal(confirmCalls, 1);
    assert.equal(spawnCalls, 0);
  });
});

test("integration coordinator returns runner failure with post-health from the injected contract", () => {
  withInspectorTarget((targetDir) => {
    let receivedArgs;
    const result = runTermDriftIntegration(targetDir, {
      agentEntry: RUNNER_AGENT,
      requested: true,
      dryRun: false,
      compatibility: INSPECTOR_CONTRACT,
      confirm() {
        throw new Error("pre-approved requests must not confirm");
      },
      spawnSyncImpl(_command, args) {
        receivedArgs = args;
        return spawnResult({ status: 2, stdout: "", stderr: "owner failed" });
      },
    });

    assert.deepEqual(receivedArgs, [
      "--yes",
      `term-drift@${INSPECTOR_CONTRACT.version}`,
      RUNNER_AGENT.termDriftArg,
    ]);
    assert.equal(result.action, "failed");
    assert.deepEqual(result.failure, {
      kind: "nonzero-exit",
      message: "term-drift installer exited with status 2",
      postHealth: { state: "not-installed" },
      guidance: {
        kind: "retry",
        command: `${getTermDriftNpxExecutable(process.platform)} --yes term-drift@${INSPECTOR_CONTRACT.version} --codex`,
        targetDir,
      },
    });
    assert.deepEqual(result.health, { state: "not-installed" });
  });
});

test("failure guidance is determined uniquely by post-health for every runner failure kind", () => {
  const failureKinds = [
    "spawn-error",
    "nonzero-exit",
    "invalid-json",
    "contract-mismatch",
    "postcheck-failed",
  ];
  const healthCases = [
    {
      health: { state: "not-installed" },
      guidanceKind: "retry",
    },
    {
      health: {
        state: "inconsistent",
        repairability: "additive-compatible",
        issues: [{ code: "missing", path: ".term-drift/version.json" }],
      },
      guidanceKind: "retry",
    },
    {
      health: {
        state: "inconsistent",
        repairability: "blocked",
        issues: [{ code: "hash-mismatch", path: ".term-drift/rules/detect.md" }],
      },
      guidanceKind: "manual-resolution",
    },
    {
      health: {
        state: "ready",
        version: INSPECTOR_CONTRACT.version,
        skillPath: RUNNER_AGENT.termDriftSkillDest,
      },
      guidanceKind: "contract-anomaly-ready",
    },
  ];
  const targetDir = "/tmp/project with spaces; echo unsafe";
  const attempt = {
    command: "npx",
    args: ["--yes", `term-drift@${INSPECTOR_CONTRACT.version}`, RUNNER_AGENT.termDriftArg],
    cwd: targetDir,
    exitCode: 2,
    stdout: "",
    stderr: "",
    error: null,
  };

  for (const kind of failureKinds) {
    for (const { health, guidanceKind } of healthCases) {
      const failure = createTermDriftFailure(
        { kind, message: `${kind} detail` },
        health,
        attempt,
      );

      assert.equal(failure.kind, kind, `${kind} must be preserved`);
      assert.equal(failure.message, `${kind} detail`);
      assert.deepEqual(failure.postHealth, health);
      assert.equal(failure.guidance.kind, guidanceKind, `${kind} × ${health.state}`);

      if (guidanceKind === "retry") {
        assert.equal(
          failure.guidance.command,
          `npx --yes term-drift@${INSPECTOR_CONTRACT.version} --codex`,
        );
        assert.equal(failure.guidance.targetDir, targetDir);
        assert.equal(failure.guidance.command.includes(targetDir), false);
      } else if (guidanceKind === "manual-resolution") {
        assert.deepEqual(failure.guidance.issues, health.issues);
        assert.equal(
          failure.guidance.afterResolutionCommand,
          `npx --yes term-drift@${INSPECTOR_CONTRACT.version} --codex`,
        );
        assert.equal(failure.guidance.targetDir, targetDir);
        assert.equal("command" in failure.guidance, false, "blocked health must not suggest immediate retry");
        assert.equal(failure.guidance.afterResolutionCommand.includes(targetDir), false);
      } else {
        assert.equal(typeof failure.guidance.message, "string");
        assert.notEqual(failure.guidance.message.length, 0);
        assert.equal("command" in failure.guidance, false, "ready anomaly must not suggest reinstall");
        assert.equal("afterResolutionCommand" in failure.guidance, false);
      }
    }
  }
});

test("failure guidance rejects unknown post-health shapes instead of suggesting retry", () => {
  const attempt = {
    command: "npx",
    args: ["--yes", `term-drift@${INSPECTOR_CONTRACT.version}`, RUNNER_AGENT.termDriftArg],
    cwd: "/tmp/unknown-health",
    exitCode: 2,
    stdout: "",
    stderr: "",
    error: null,
  };

  for (const postHealth of [
    { state: "unknown" },
    { state: "inconsistent", repairability: "unknown", issues: [] },
    { state: "inconsistent", repairability: "blocked" },
    null,
  ]) {
    assert.throws(
      () =>
        createTermDriftFailure(
          { kind: "nonzero-exit", message: "owner failed" },
          postHealth,
          attempt,
        ),
      /unsupported term-drift post-health/,
    );
  }
});

test("manual-resolution guidance owns a deep non-aliased issue snapshot", () => {
  const postHealth = {
    state: "inconsistent",
    repairability: "blocked",
    issues: [{ code: "hash-mismatch", path: ".term-drift/rules/detect.md" }],
  };
  const failure = createTermDriftFailure(
    { kind: "contract-mismatch", message: "owner contract failed" },
    postHealth,
    {
      command: "npx",
      args: ["--yes", `term-drift@${INSPECTOR_CONTRACT.version}`, RUNNER_AGENT.termDriftArg],
      cwd: "/tmp/blocked-health",
      exitCode: 0,
      stdout: "{}",
      stderr: "",
      error: null,
    },
  );

  assert.notEqual(failure.guidance.issues, postHealth.issues);
  assert.notEqual(failure.guidance.issues[0], postHealth.issues[0]);
  postHealth.issues[0].path = "mutated";
  postHealth.issues.push({ code: "unsafe-path", path: "mutated" });
  assert.deepEqual(failure.guidance.issues, [
    { code: "hash-mismatch", path: ".term-drift/rules/detect.md" },
  ]);
});

test("integration coordinator delegates once and a ready rerun preserves user data without spawning", () => {
  withInspectorTarget((targetDir) => {
    let spawnCalls = 0;
    const options = {
      agentEntry: RUNNER_AGENT,
      requested: true,
      dryRun: false,
      compatibility: INSPECTOR_CONTRACT,
      confirm() {
        throw new Error("pre-approved requests must not confirm");
      },
      spawnSyncImpl() {
        spawnCalls += 1;
        writeCompleteInspectorFixture(targetDir);
        return spawnResult();
      },
    };

    const first = runTermDriftIntegration(targetDir, options);
    assert.equal(first.action, "installed");
    assert.equal(first.health.state, "ready");

    writeFixtureFile(targetDir, ".term-drift/glossary.yml", "team-term: stable\n");
    const beforeRerun = fs.readFileSync(path.join(targetDir, ".term-drift/glossary.yml"));
    const second = runTermDriftIntegration(targetDir, options);

    assert.equal(second.action, "already-ready");
    assert.equal(spawnCalls, 1);
    assert.deepEqual(
      fs.readFileSync(path.join(targetDir, ".term-drift/glossary.yml")),
      beforeRerun,
    );
  });
});
