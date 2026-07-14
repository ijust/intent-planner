import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { renderTermDriftResult } from "../bin/cli.mjs";
import { AGENT_REGISTRY } from "../src/install.mjs";
import {
  createTermDriftCompatibility,
  inspectTermDrift,
  projectTermDriftManifest,
  runTermDriftIntegration,
} from "../src/term-drift.mjs";

const FIXTURE = Object.freeze({
  version: "acceptance-fixture",
  commonFiles: Object.freeze({
    ".term-drift/rules/detect.md": "acceptance detect\n",
    ".term-drift/rules/workflow.md": "acceptance workflow\n",
  }),
  skillFiles: Object.freeze({
    "SKILL.md": "acceptance skill\n",
    "agents/openai.yaml": "interface:\n  display_name: acceptance\n",
  }),
});

const COMPATIBILITY = createTermDriftCompatibility(FIXTURE.version, {
  commonFiles: FIXTURE.commonFiles,
  skillFiles: FIXTURE.skillFiles,
});

const AGENTS = Object.values(AGENT_REGISTRY);

function withTarget(run) {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "ip-term-drift-acceptance-"));
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

function writeCommon(targetDir, agentEntry) {
  writeFixtureFile(
    targetDir,
    ".term-drift/version.json",
    `${JSON.stringify(projectTermDriftManifest(agentEntry, COMPATIBILITY))}\n`,
  );
  for (const [relativePath, bytes] of Object.entries(FIXTURE.commonFiles)) {
    writeFixtureFile(targetDir, relativePath, bytes);
  }
}

function writeSelectedSkill(targetDir, agentEntry) {
  for (const [relativePath, bytes] of Object.entries(FIXTURE.skillFiles)) {
    writeFixtureFile(targetDir, `${agentEntry.termDriftSkillDest}/${relativePath}`, bytes);
  }
}

function writeReady(targetDir, agentEntry) {
  writeCommon(targetDir, agentEntry);
  writeSelectedSkill(targetDir, agentEntry);
}

function snapshotFiles(targetDir, relativePaths) {
  return Object.fromEntries(
    relativePaths.map((relativePath) => [
      relativePath,
      fs.readFileSync(path.join(targetDir, ...relativePath.split("/"))),
    ]),
  );
}

function assertSnapshot(targetDir, snapshot) {
  for (const [relativePath, expected] of Object.entries(snapshot)) {
    assert.deepEqual(
      fs.readFileSync(path.join(targetDir, ...relativePath.split("/"))),
      expected,
      `${relativePath} must remain byte-identical`,
    );
  }
}

function ownerInstallFake(targetDir, selectedAgent, calls) {
  return (command, args, options) => {
    calls.push({ command, args, options });
    writeCommon(targetDir, selectedAgent);
    writeSelectedSkill(targetDir, selectedAgent);
    return {
      status: 0,
      stdout: JSON.stringify({
        installed: true,
        agent: selectedAgent.agentName,
        version: COMPATIBILITY.version,
        skill: selectedAgent.termDriftSkillDest,
        ledger: null,
        created: [],
        skipped: [],
        notes: [],
      }),
      stderr: "",
    };
  };
}

function render(result, agentEntry, requested = true) {
  return renderTermDriftResult(result, {
    lang: "ja",
    requested,
    dryRun: false,
    agentEntry,
    version: COMPATIBILITY.version,
  });
}

function otherAgents(selectedAgent) {
  return AGENTS.filter((entry) => entry.agentName !== selectedAgent.agentName);
}

test("all registered agents share the same ready/additive/blocked/marker-only acceptance matrix", () => {
  assert.deepEqual(
    AGENTS.map((entry) => entry.agentName).sort(),
    ["claude", "codex", "gemini"],
  );

  for (const [selectedIndex, selectedAgent] of AGENTS.entries()) {
    withTarget((targetDir) => {
      writeReady(targetDir, selectedAgent);
      let spawnCalls = 0;
      const result = runTermDriftIntegration(targetDir, {
        agentEntry: selectedAgent,
        requested: true,
        dryRun: false,
        compatibility: COMPATIBILITY,
        spawnSyncImpl() {
          spawnCalls += 1;
          throw new Error("ready health must not run the owner installer");
        },
      });

      assert.equal(result.action, "already-ready", `${selectedAgent.agentName}: ready action`);
      assert.equal(spawnCalls, 0, `${selectedAgent.agentName}: ready spawn count`);
      assert.deepEqual(result.health, {
        state: "ready",
        version: COMPATIBILITY.version,
        skillPath: selectedAgent.termDriftSkillDest,
      });
      const output = render(result, selectedAgent);
      assert.match(output, /状態: 利用可能/);
      assert.ok(output.includes(`${selectedAgent.termDriftSkillDest}/SKILL.md`));
      for (const otherAgent of otherAgents(selectedAgent)) {
        assert.equal(
          fs.existsSync(path.join(targetDir, ...otherAgent.termDriftSkillDest.split("/"))),
          false,
          `${selectedAgent.agentName}: ready fixture must not place ${otherAgent.agentName}`,
        );
      }
    });

    withTarget((targetDir) => {
      const priorAgent = AGENTS[(selectedIndex + 1) % AGENTS.length];
      writeCommon(targetDir, selectedAgent);
      writeSelectedSkill(targetDir, priorAgent);
      const preservedPaths = [
        ".term-drift/version.json",
        ...Object.keys(FIXTURE.commonFiles),
        ...Object.keys(FIXTURE.skillFiles).map(
          (relativePath) => `${priorAgent.termDriftSkillDest}/${relativePath}`,
        ),
      ];
      const before = snapshotFiles(targetDir, preservedPaths);
      const calls = [];

      const beforeHealth = inspectTermDrift(targetDir, selectedAgent, COMPATIBILITY);
      assert.equal(beforeHealth.state, "inconsistent");
      assert.equal(beforeHealth.repairability, "additive-compatible");
      assert.deepEqual(
        beforeHealth.issues.map((issue) => issue.path),
        Object.keys(FIXTURE.skillFiles).map(
          (relativePath) => `${selectedAgent.termDriftSkillDest}/${relativePath}`,
        ),
      );

      const result = runTermDriftIntegration(targetDir, {
        agentEntry: selectedAgent,
        requested: true,
        dryRun: false,
        compatibility: COMPATIBILITY,
        spawnSyncImpl: ownerInstallFake(targetDir, selectedAgent, calls),
      });

      assert.equal(result.action, "installed", `${selectedAgent.agentName}: additive action`);
      assert.equal(calls.length, 1, `${selectedAgent.agentName}: additive spawn count`);
      assert.deepEqual(calls[0].args, [
        "--yes",
        `term-drift@${COMPATIBILITY.version}`,
        selectedAgent.termDriftArg,
      ]);
      assert.equal(calls[0].options.cwd, targetDir);
      assert.equal(calls[0].options.shell, false);
      assert.equal(result.health.state, "ready");
      assertSnapshot(targetDir, before);
      assert.ok(render(result, selectedAgent).includes(`${selectedAgent.termDriftSkillDest}/SKILL.md`));

      const untouchedAgent = AGENTS.find(
        (entry) =>
          entry.agentName !== selectedAgent.agentName && entry.agentName !== priorAgent.agentName,
      );
      assert.equal(
        fs.existsSync(path.join(targetDir, ...untouchedAgent.termDriftSkillDest.split("/"))),
        false,
        `${selectedAgent.agentName}: additive install must not place ${untouchedAgent.agentName}`,
      );
    });

    withTarget((targetDir) => {
      writeReady(targetDir, selectedAgent);
      const assetPath = ".term-drift/rules/detect.md";
      const blockedBytes = "blocked bytes\n";
      const manifest = projectTermDriftManifest(selectedAgent, COMPATIBILITY);
      writeFixtureFile(targetDir, assetPath, blockedBytes);
      writeFixtureFile(
        targetDir,
        ".term-drift/version.json",
        `${JSON.stringify({
          ...manifest,
          assets: {
            ...manifest.assets,
            [assetPath]: createTermDriftCompatibility("hash", {
              commonFiles: { [assetPath]: blockedBytes },
              skillFiles: {},
            }).commonFiles[assetPath],
          },
        })}\n`,
      );
      let spawnCalls = 0;
      const result = runTermDriftIntegration(targetDir, {
        agentEntry: selectedAgent,
        requested: true,
        dryRun: false,
        compatibility: COMPATIBILITY,
        spawnSyncImpl() {
          spawnCalls += 1;
          throw new Error("blocked health must not run the owner installer");
        },
      });

      assert.equal(result.action, "blocked-inconsistent", `${selectedAgent.agentName}: blocked action`);
      assert.equal(spawnCalls, 0, `${selectedAgent.agentName}: blocked spawn count`);
      assert.deepEqual(result.health.issues, [
        { code: "asset-manifest-mismatch", path: ".term-drift/rules/detect.md" },
        { code: "hash-mismatch", path: ".term-drift/rules/detect.md" },
        { code: "self-consistent-untrusted-asset", path: ".term-drift/rules/detect.md" },
      ]);
      assert.ok(render(result, selectedAgent).includes(".term-drift/rules/detect.md"));
    });

    withTarget((targetDir) => {
      fs.mkdirSync(path.join(targetDir, ".term-drift"));
      const markerHealth = inspectTermDrift(targetDir, selectedAgent, COMPATIBILITY);
      assert.equal(markerHealth.state, "inconsistent");
      assert.equal(markerHealth.repairability, "additive-compatible");
      assert.deepEqual(markerHealth.issues, [
        { code: "missing", path: ".term-drift/version.json" },
        ...Object.keys(FIXTURE.commonFiles).map((relativePath) => ({
          code: "missing",
          path: relativePath,
        })),
        ...Object.keys(FIXTURE.skillFiles).map((relativePath) => ({
          code: "missing",
          path: `${selectedAgent.termDriftSkillDest}/${relativePath}`,
        })),
      ]);

      const calls = [];
      const result = runTermDriftIntegration(targetDir, {
        agentEntry: selectedAgent,
        requested: true,
        dryRun: false,
        compatibility: COMPATIBILITY,
        spawnSyncImpl: ownerInstallFake(targetDir, selectedAgent, calls),
      });
      assert.equal(result.action, "installed", `${selectedAgent.agentName}: marker-only action`);
      assert.equal(calls.length, 1, `${selectedAgent.agentName}: marker-only spawn count`);
      assert.ok(render(result, selectedAgent).includes(`${selectedAgent.termDriftSkillDest}/SKILL.md`));
      for (const otherAgent of otherAgents(selectedAgent)) {
        assert.equal(
          fs.existsSync(path.join(targetDir, ...otherAgent.termDriftSkillDest.split("/"))),
          false,
          `${selectedAgent.agentName}: marker-only install must not place ${otherAgent.agentName}`,
        );
      }
    });
  }
});

test("version, rules, and selected skill defects flip ready health with exact issue paths", () => {
  const mutations = [
    {
      name: "version missing",
      path: ".term-drift/version.json",
      code: "missing",
      repairability: "additive-compatible",
      apply(targetDir) {
        fs.rmSync(path.join(targetDir, ".term-drift/version.json"));
      },
    },
    {
      name: "version invalid",
      path: ".term-drift/version.json#/version",
      code: "invalid-version",
      repairability: "blocked",
      apply(targetDir, selectedAgent) {
        writeFixtureFile(
          targetDir,
          ".term-drift/version.json",
          `${JSON.stringify({
            ...projectTermDriftManifest(selectedAgent, COMPATIBILITY),
            version: "other",
          })}\n`,
        );
      },
    },
    {
      name: "rules missing",
      path: ".term-drift/rules/detect.md",
      code: "missing",
      repairability: "additive-compatible",
      apply(targetDir) {
        fs.rmSync(path.join(targetDir, ".term-drift/rules/detect.md"));
      },
    },
    {
      name: "rules invalid",
      path: ".term-drift/rules/workflow.md",
      code: "hash-mismatch",
      repairability: "update-attemptable",
      apply(targetDir) {
        writeFixtureFile(targetDir, ".term-drift/rules/workflow.md", "invalid workflow\n");
      },
    },
    {
      name: "skill missing",
      skillRelative: "SKILL.md",
      code: "missing",
      repairability: "blocked",
      apply(targetDir, selectedAgent) {
        fs.rmSync(path.join(targetDir, ...selectedAgent.termDriftSkillDest.split("/"), "SKILL.md"));
      },
    },
    {
      name: "skill invalid",
      skillRelative: "agents/openai.yaml",
      code: "hash-mismatch",
      repairability: "update-attemptable",
      apply(targetDir, selectedAgent) {
        writeFixtureFile(
          targetDir,
          `${selectedAgent.termDriftSkillDest}/agents/openai.yaml`,
          "invalid interface\n",
        );
      },
    },
  ];

  for (const selectedAgent of AGENTS) {
    withTarget((targetDir) => {
      writeReady(targetDir, selectedAgent);
      const ready = runTermDriftIntegration(targetDir, {
        agentEntry: selectedAgent,
        requested: true,
        dryRun: false,
        compatibility: COMPATIBILITY,
        spawnSyncImpl() {
          throw new Error("ready baseline must not spawn");
        },
      });
      const readyOutput = render(ready, selectedAgent);
      assert.equal(ready.action, "already-ready");
      assert.ok(readyOutput.includes(`${selectedAgent.termDriftSkillDest}/SKILL.md`));
      assert.match(readyOutput, /状態: 利用可能/);
    });

    for (const mutation of mutations) {
      withTarget((targetDir) => {
        writeReady(targetDir, selectedAgent);
        mutation.apply(targetDir, selectedAgent);
        const issuePath = mutation.skillRelative
          ? `${selectedAgent.termDriftSkillDest}/${mutation.skillRelative}`
          : mutation.path;
        let spawnCalls = 0;
        const result = runTermDriftIntegration(targetDir, {
          agentEntry: selectedAgent,
          requested: false,
          dryRun: false,
          confirm: () => false,
          compatibility: COMPATIBILITY,
          spawnSyncImpl() {
            spawnCalls += 1;
            throw new Error("defect inspection must not spawn without consent");
          },
        });

        assert.equal(
          result.health.state,
          "inconsistent",
          `${selectedAgent.agentName}: ${mutation.name}`,
        );
        assert.equal(result.health.repairability, mutation.repairability);
        assert.deepEqual(result.health.issues, [{ code: mutation.code, path: issuePath }]);
        assert.equal(
          result.action,
          mutation.repairability === "blocked" ? "blocked-inconsistent" : "skipped",
        );
        assert.equal(spawnCalls, 0);

        const output = render(result, selectedAgent, false);
        if (mutation.repairability !== "update-attemptable") {
          assert.ok(output.includes(`問題: ${issuePath} (${mutation.code})`));
        }
        assert.doesNotMatch(output, /状態: 利用可能/);
        assert.doesNotMatch(output, /本格的な用語点検は/);
      });
    }
  }
});
