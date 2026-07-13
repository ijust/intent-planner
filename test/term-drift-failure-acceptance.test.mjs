import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  renderTermDriftResult,
  termDriftExitCode,
} from "../bin/cli.mjs";
import { AGENT_REGISTRY, install } from "../src/install.mjs";
import {
  createTermDriftCompatibility,
  createTermDriftFailure,
  getTermDriftNpxExecutable,
  runTermDriftIntegration,
} from "../src/term-drift.mjs";

const AGENT = AGENT_REGISTRY.codex;
const FIXTURE = Object.freeze({
  version: "failure-acceptance-fixture",
  commonFiles: Object.freeze({
    ".term-drift/rules/detect.md": "failure acceptance detect\n",
    ".term-drift/rules/workflow.md": "failure acceptance workflow\n",
  }),
  skillFiles: Object.freeze({
    "SKILL.md": "failure acceptance skill\n",
    "agents/openai.yaml": "interface:\n  display_name: failure acceptance\n",
  }),
});
const COMPATIBILITY = createTermDriftCompatibility(FIXTURE.version, {
  commonFiles: FIXTURE.commonFiles,
  skillFiles: FIXTURE.skillFiles,
});

function withTarget(run) {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "ip-term-drift-failure-acceptance-"));
  try {
    run(targetDir);
  } finally {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
}

function writeFixtureFile(targetDir, relativePath, bytes) {
  const absolutePath = path.join(targetDir, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, bytes);
}

function writeReady(targetDir) {
  writeFixtureFile(
    targetDir,
    ".term-drift/version.json",
    `${JSON.stringify({ package: "term-drift", version: COMPATIBILITY.version })}\n`,
  );
  for (const [relativePath, bytes] of Object.entries(FIXTURE.commonFiles)) {
    writeFixtureFile(targetDir, relativePath, bytes);
  }
  for (const [relativePath, bytes] of Object.entries(FIXTURE.skillFiles)) {
    writeFixtureFile(targetDir, `${AGENT.termDriftSkillDest}/${relativePath}`, bytes);
  }
}

function writePostHealth(targetDir, healthKind) {
  if (healthKind === "not-installed") return;
  if (healthKind === "additive-compatible") {
    fs.mkdirSync(path.join(targetDir, ".term-drift"), { recursive: true });
    return;
  }
  if (healthKind === "blocked") {
    writeFixtureFile(targetDir, ".term-drift/version.json", "not-json\n");
    return;
  }
  if (healthKind === "ready") {
    writeReady(targetDir);
    return;
  }
  throw new Error(`unknown post-health fixture: ${healthKind}`);
}

function installOutput(overrides = {}) {
  return {
    installed: true,
    agent: AGENT.agentName,
    version: COMPATIBILITY.version,
    skill: AGENT.termDriftSkillDest,
    ledger: null,
    created: [],
    skipped: [],
    notes: [],
    ...overrides,
  };
}

function snapshotTree(root) {
  if (!fs.existsSync(root)) return null;
  const snapshot = {};

  function visit(current, relative) {
    const stat = fs.lstatSync(current);
    if (stat.isDirectory()) {
      snapshot[relative || "."] = { kind: "directory" };
      for (const name of fs.readdirSync(current).sort()) {
        visit(path.join(current, name), relative ? `${relative}/${name}` : name);
      }
      return;
    }
    assert.equal(stat.isFile(), true, `${current} must remain a regular file`);
    snapshot[relative] = { kind: "file", bytes: fs.readFileSync(current) };
  }

  visit(root, "");
  return snapshot;
}

function snapshotTermOwned(targetDir) {
  return {
    common: snapshotTree(path.join(targetDir, ".term-drift")),
    selectedSkill: snapshotTree(
      path.join(targetDir, ...AGENT.termDriftSkillDest.split("/")),
    ),
  };
}

function expectedGuidance(healthKind) {
  if (healthKind === "blocked") return "manual-resolution";
  if (healthKind === "ready") return "contract-anomaly-ready";
  return "retry";
}

function ownerFailureResult(failureKind) {
  if (failureKind === "spawn-error") {
    return { status: null, stdout: "", stderr: "", error: new Error("owner spawn failed") };
  }
  if (failureKind === "nonzero-exit") {
    return { status: 73, stdout: "owner partial output", stderr: "owner failed" };
  }
  if (failureKind === "invalid-json") {
    return { status: 0, stdout: "{not-json", stderr: "" };
  }
  if (failureKind === "contract-mismatch") {
    return {
      status: 0,
      stdout: JSON.stringify(installOutput({ version: "unexpected-version" })),
      stderr: "",
    };
  }
  if (failureKind === "postcheck-failed") {
    return { status: 0, stdout: JSON.stringify(installOutput()), stderr: "" };
  }
  throw new Error(`unknown failure fixture: ${failureKind}`);
}

test("runner failures are post-inspected without intent-planner mutating owner artifacts", () => {
  const failureKinds = [
    "spawn-error",
    "nonzero-exit",
    "invalid-json",
    "contract-mismatch",
    "postcheck-failed",
  ];
  const healthKinds = ["not-installed", "additive-compatible", "blocked", "ready"];

  for (const failureKind of failureKinds) {
    for (const healthKind of healthKinds) {
      withTarget((targetDir) => {
        let spawnCalls = 0;
        let ownerReturnSnapshot;
        const beforeOwner = snapshotTermOwned(targetDir);
        const result = runTermDriftIntegration(targetDir, {
          agentEntry: AGENT,
          requested: true,
          dryRun: false,
          compatibility: COMPATIBILITY,
          confirm() {
            throw new Error("an explicit request must not prompt");
          },
          spawnSyncImpl() {
            spawnCalls += 1;
            assert.deepEqual(
              snapshotTermOwned(targetDir),
              beforeOwner,
              `${failureKind} x ${healthKind}: pre-run inspection must be read-only`,
            );
            writePostHealth(targetDir, healthKind);
            ownerReturnSnapshot = snapshotTermOwned(targetDir);
            return ownerFailureResult(failureKind);
          },
        });

        assert.equal(spawnCalls, 1, `${failureKind} x ${healthKind}: owner invocation count`);
        assert.deepEqual(
          snapshotTermOwned(targetDir),
          ownerReturnSnapshot,
          `${failureKind} x ${healthKind}: post-inspection must be read-only`,
        );

        // A valid owner result plus ready filesystem is success, so postcheck-failed x ready
        // is deliberately unrepresentable as a runner failure.
        if (failureKind === "postcheck-failed" && healthKind === "ready") {
          assert.equal(result.action, "installed");
          assert.equal(termDriftExitCode(result, true), 0);
          return;
        }

        assert.equal(result.action, "failed", `${failureKind} x ${healthKind}`);
        assert.equal(result.failure.kind, failureKind);
        assert.equal(result.failure.guidance.kind, expectedGuidance(healthKind));
        assert.equal(termDriftExitCode(result, true), 2);
      });
    }
  }
});

test("all failure kinds map each post-health to one guidance and requested exit result", () => {
  const failureKinds = [
    "spawn-error",
    "nonzero-exit",
    "invalid-json",
    "contract-mismatch",
    "postcheck-failed",
  ];
  const healthCases = [
    ["not-installed", { state: "not-installed" }],
    [
      "additive-compatible",
      {
        state: "inconsistent",
        repairability: "additive-compatible",
        issues: [{ code: "missing", path: ".term-drift/version.json" }],
      },
    ],
    [
      "blocked",
      {
        state: "inconsistent",
        repairability: "blocked",
        issues: [{ code: "hash-mismatch", path: ".term-drift/rules/detect.md" }],
      },
    ],
    [
      "ready",
      {
        state: "ready",
        version: COMPATIBILITY.version,
        skillPath: AGENT.termDriftSkillDest,
      },
    ],
  ];
  const attempt = {
    command: getTermDriftNpxExecutable(process.platform),
    args: ["--yes", `term-drift@${COMPATIBILITY.version}`, AGENT.termDriftArg],
    cwd: "/tmp/failure acceptance target",
    exitCode: 73,
    stdout: "",
    stderr: "",
    error: null,
  };

  for (const failureKind of failureKinds) {
    for (const [healthKind, health] of healthCases) {
      const failure = createTermDriftFailure(
        { kind: failureKind, message: `${failureKind} detail` },
        health,
        attempt,
      );
      const result = { action: "failed", health, failure };

      assert.equal(failure.guidance.kind, expectedGuidance(healthKind));
      assert.equal(termDriftExitCode(result, true), 2);

      const output = renderTermDriftResult(result, {
        lang: "en",
        requested: true,
        dryRun: false,
        agentEntry: AGENT,
        version: COMPATIBILITY.version,
      });
      if (healthKind === "blocked") {
        assert.match(output, /resolve the issues above first/i);
        assert.match(output, /does not automatically repair term-drift-owned files/i);
        assert.match(output, /command after resolution/i);
        assert.doesNotMatch(output, /retry command:/i);
      } else if (healthKind === "ready") {
        assert.match(output, /files are ready/i);
        assert.match(output, /installer response contract needs verification/i);
        assert.doesNotMatch(output, /retry command:/i);
        assert.doesNotMatch(output, /command after resolution/i);
      } else {
        assert.match(output, /retry command:/i);
      }
    }
  }
});

test("ready rerun invokes the owner once and preserves core plus user glossary bytes", () => {
  withTarget((targetDir) => {
    install(targetDir, { agent: AGENT.agentName, lang: "ja", confirmRootDoc: () => false });
    const corePath = path.join(targetDir, ".intent", "README.md");
    const coreBefore = fs.readFileSync(corePath);
    const glossaryPath = path.join(targetDir, ".term-drift", "glossary.yml");
    writeFixtureFile(targetDir, ".term-drift/glossary.yml", "team-term: stable\n");
    const glossaryBefore = fs.readFileSync(glossaryPath);
    let spawnCalls = 0;

    const options = {
      agentEntry: AGENT,
      requested: true,
      dryRun: false,
      compatibility: COMPATIBILITY,
      spawnSyncImpl() {
        spawnCalls += 1;
        writeReady(targetDir);
        return { status: 0, stdout: JSON.stringify(installOutput()), stderr: "" };
      },
    };

    const first = runTermDriftIntegration(targetDir, options);
    const second = runTermDriftIntegration(targetDir, options);

    assert.equal(first.action, "installed");
    assert.equal(second.action, "already-ready");
    assert.equal(spawnCalls, 1, "a ready rerun must not invoke the owner installer twice");
    assert.deepEqual(fs.readFileSync(corePath), coreBefore);
    assert.deepEqual(fs.readFileSync(glossaryPath), glossaryBefore);
  });
});

test("optional owner failure retains core and every owner byte present when the fake returned", () => {
  withTarget((targetDir) => {
    install(targetDir, { agent: AGENT.agentName, lang: "ja", confirmRootDoc: () => false });
    const corePath = path.join(targetDir, ".intent", "README.md");
    const coreBefore = fs.readFileSync(corePath);
    writeFixtureFile(targetDir, ".term-drift/glossary.yml", "team-term: keep-me\n");
    const glossaryPath = path.join(targetDir, ".term-drift", "glossary.yml");
    const glossaryBefore = fs.readFileSync(glossaryPath);
    let ownerReturnSnapshot;

    const result = runTermDriftIntegration(targetDir, {
      agentEntry: AGENT,
      requested: true,
      dryRun: false,
      compatibility: COMPATIBILITY,
      spawnSyncImpl() {
        writeFixtureFile(
          targetDir,
          `${AGENT.termDriftSkillDest}/SKILL.md`,
          FIXTURE.skillFiles["SKILL.md"],
        );
        ownerReturnSnapshot = snapshotTermOwned(targetDir);
        return { status: 73, stdout: "partial", stderr: "owner failed" };
      },
    });

    assert.equal(result.action, "failed");
    assert.equal(result.failure.kind, "nonzero-exit");
    assert.equal(result.failure.guidance.kind, "manual-resolution");
    assert.equal(termDriftExitCode(result, true), 2);
    assert.deepEqual(fs.readFileSync(corePath), coreBefore, "completed core remains available");
    assert.deepEqual(fs.readFileSync(glossaryPath), glossaryBefore, "user glossary is untouched");
    assert.deepEqual(snapshotTermOwned(targetDir), ownerReturnSnapshot);
  });
});

test("blocked health is a byte-identical non-run and requested/unrequested exits remain distinct", () => {
  withTarget((targetDir) => {
    writeFixtureFile(targetDir, ".term-drift/version.json", "not-json\n");
    writeFixtureFile(targetDir, ".term-drift/glossary.yml", "team-term: blocked-stable\n");
    const before = snapshotTermOwned(targetDir);
    let spawnCalls = 0;

    const requested = runTermDriftIntegration(targetDir, {
      agentEntry: AGENT,
      requested: true,
      dryRun: false,
      compatibility: COMPATIBILITY,
      spawnSyncImpl() {
        spawnCalls += 1;
        throw new Error("blocked health must not invoke the owner installer");
      },
    });

    assert.equal(requested.action, "blocked-inconsistent");
    assert.equal(spawnCalls, 0);
    assert.equal(termDriftExitCode(requested, true), 2);
    assert.equal(termDriftExitCode(requested, false), 0);
    assert.deepEqual(snapshotTermOwned(targetDir), before);
  });
});
