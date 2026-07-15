import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  TERM_DRIFT_COMPATIBILITY,
  createTermDriftCompatibility,
  projectTermDriftManifest,
} from "../src/term-drift.mjs";
import { AGENT_REGISTRY } from "../src/install.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TERM_DRIFT_SOURCE = fs.readFileSync(path.join(REPO_ROOT, "src", "term-drift.mjs"), "utf8");

const FIXTURE = Object.freeze({
  commonFiles: Object.freeze({
    ".term-drift/rules/detect.md": "adversarial detect fixture\n",
    ".term-drift/rules/workflow.md": "adversarial workflow fixture\n",
  }),
  skillFiles: Object.freeze({
    "SKILL.md": "adversarial skill fixture\n",
    "agents/openai.yaml": "interface:\n  display_name: adversarial fixture\n",
  }),
});

const COMPATIBILITY = createTermDriftCompatibility("adversarial-fixture", FIXTURE);
const CODEX_AGENT = Object.freeze({
  agentName: "codex",
  termDriftArg: "--codex",
  termDriftSkillDest: ".agents/skills/term-drift",
});

const DEPENDENCY_CATEGORIES = Object.freeze([
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "bundledDependencies",
  "bundleDependencies",
]);
const EXPECTED_DEPENDENCY_SNAPSHOT = Object.freeze({
  dependencies: Object.freeze({ "handoff-bridge": "0.1.3", "term-drift": "0.3.3" }),
  devDependencies: null,
  optionalDependencies: null,
  peerDependencies: null,
  bundledDependencies: null,
  bundleDependencies: null,
});

function dependencySnapshot(packageJson) {
  return Object.fromEntries(
    DEPENDENCY_CATEGORIES.map((category) => {
      if (!Object.hasOwn(packageJson, category)) return [category, null];
      const value = packageJson[category];
      if (Array.isArray(value)) return [category, [...value].sort()];
      if (value !== null && typeof value === "object") {
        return [category, Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))];
      }
      return [category, value];
    }),
  );
}

function termDriftDependencyReferences(packageJson) {
  const references = [];
  for (const category of DEPENDENCY_CATEGORIES) {
    const value = packageJson[category];
    if (Array.isArray(value)) {
      for (const name of value) {
        if (name === "term-drift") references.push(`${category}:${name}`);
      }
    } else if (value !== null && typeof value === "object") {
      for (const name of Object.keys(value)) {
        if (name === "term-drift") references.push(`${category}:${name}`);
      }
    }
  }
  return references;
}

function collectDistributionRegularFiles(packageJson) {
  const files = [];
  const packageRoots = [...new Set([...packageJson.files, "package.json"])];

  function visit(absolutePath) {
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink()) return;
    if (stat.isFile()) {
      files.push({
        relativePath: path.relative(REPO_ROOT, absolutePath).replaceAll(path.sep, "/"),
        bytes: fs.readFileSync(absolutePath),
      });
      return;
    }
    if (!stat.isDirectory()) return;
    for (const name of fs.readdirSync(absolutePath).sort()) {
      visit(path.join(absolutePath, name));
    }
  }

  for (const packageRoot of packageRoots) visit(path.join(REPO_ROOT, packageRoot));
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function matchingBodyCopies(files, forbiddenHashes) {
  return files
    .filter(({ bytes }) => forbiddenHashes.has(sha256(bytes)))
    .map(({ relativePath }) => relativePath)
    .sort();
}

function replaceOnce(source, before, after, mutationName) {
  const first = source.indexOf(before);
  assert.notEqual(first, -1, `${mutationName}: injection seam exists`);
  assert.equal(source.indexOf(before, first + before.length), -1, `${mutationName}: seam is unique`);
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
}

async function withMutant(mutationName, mutate, run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `ip-term-drift-mutant-${mutationName}-`));
  const modulePath = path.join(root, "term-drift.mjs");
  fs.writeFileSync(modulePath, mutate(TERM_DRIFT_SOURCE));
  try {
    const mutant = await import(`${pathToFileURL(modulePath).href}?mutation=${mutationName}`);
    await run(mutant);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function withTarget(run) {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "ip-term-drift-adversarial-target-"));
  try {
    return run(targetDir);
  } finally {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
}

function writeFixtureFile(targetDir, relativePath, bytes) {
  const absolutePath = path.join(targetDir, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, bytes);
}

function nonzeroOwnerResult() {
  return { status: 73, stdout: "", stderr: "owner failed" };
}

async function markerOnlyIsRejected(mod) {
  return withTarget((targetDir) => {
    fs.mkdirSync(path.join(targetDir, ".term-drift"));
    return mod.inspectTermDrift(targetDir, CODEX_AGENT, COMPATIBILITY).state !== "ready";
  });
}

async function runnerUsesInstalledSelectedAgent(mod) {
  return withTarget((targetDir) => {
    let call;
    const termDriftCliPath = "/dependency/term-drift/bin/cli.mjs";
    mod.executeTermDriftInstall(targetDir, {
      agentEntry: CODEX_AGENT,
      compatibility: COMPATIBILITY,
      termDriftCliPath,
      spawnSyncImpl(command, args) {
        call = { command, args };
        return nonzeroOwnerResult();
      },
    });
    return (
      call?.command === process.execPath &&
      call?.args?.[0] === termDriftCliPath &&
      call?.args?.[1] === CODEX_AGENT.termDriftArg
    );
  });
}

test("mutation: marker-onlyをreadyにする誤実装を判別する", async () => {
  const production = await import("../src/term-drift.mjs");
  assert.equal(await markerOnlyIsRejected(production), true, "production oracle accepts the safe result");

  await withMutant(
    "marker-ready",
    (source) =>
      replaceOnce(
        source,
        'if (!hasArtifact && skillRootInspection.kind !== "unsafe") return { state: "not-installed" };',
        'if (markerInspection.kind === "ok") return { state: "ready", version: compatibility.version, skillPath: skillRoot };\n  if (!hasArtifact && skillRootInspection.kind !== "unsafe") return { state: "not-installed" };',
        "marker-only ready",
      ),
    async (mutant) => {
      assert.equal(await markerOnlyIsRejected(mutant), false, "oracle rejects marker-only ready mutant");
    },
  );
});

test("mutation: runtime npx取得をinstalled CLIオラクルが判別する", async () => {
  const production = await import("../src/term-drift.mjs");
  assert.equal(await runnerUsesInstalledSelectedAgent(production), true);

  await withMutant(
    "runtime-npx",
    (source) =>
      replaceOnce(
        source,
        "const command = process.execPath;",
        'const command = "npx";',
        "runtime npx",
      ),
    async (mutant) => {
      assert.equal(await runnerUsesInstalledSelectedAgent(mutant), false, "oracle rejects runtime npx mutant");
    },
  );
});

test("mutation: 標準routeを省略する誤実装をcall-countオラクルが判別する", async () => {
  function spawnsWithoutDedicatedOptIn(mod) {
    return withTarget((targetDir) => {
      let spawnCalls = 0;
      const result = mod.runTermDriftIntegration(targetDir, {
        agentEntry: CODEX_AGENT,
        requested: false,
        dryRun: false,
        compatibility: COMPATIBILITY,
        spawnSyncImpl() {
          spawnCalls += 1;
          return nonzeroOwnerResult();
        },
      });
      return result.action === "failed" && spawnCalls === 1;
    });
  }

  const production = await import("../src/term-drift.mjs");
  assert.equal(spawnsWithoutDedicatedOptIn(production), true);
  await withMutant(
    "standard-route-skipped",
    (source) =>
      replaceOnce(source, "if (dryRun) {", "if (dryRun || true) {", "standard route skipped"),
    async (mutant) => {
      assert.equal(spawnsWithoutDedicatedOptIn(mutant), false, "oracle rejects skipped standard route mutant");
    },
  );
});

test("mutation: optional失敗時のcore rollbackをbyte保持オラクルが判別する", async () => {
  function preservesCore(mod) {
    return withTarget((targetDir) => {
      const corePath = path.join(targetDir, ".intent", "README.md");
      writeFixtureFile(targetDir, ".intent/README.md", "completed core\n");
      const before = fs.readFileSync(corePath);
      mod.runTermDriftIntegration(targetDir, {
        agentEntry: CODEX_AGENT,
        requested: true,
        dryRun: false,
        compatibility: COMPATIBILITY,
        spawnSyncImpl: nonzeroOwnerResult,
      });
      return fs.existsSync(corePath) && fs.readFileSync(corePath).equals(before);
    });
  }

  const production = await import("../src/term-drift.mjs");
  assert.equal(preservesCore(production), true);
  await withMutant(
    "core-rollback",
    (source) =>
      replaceOnce(
        source,
        "if (!result.ok) {\n    return {",
        'if (!result.ok) {\n    fs.rmSync(path.join(targetDir, ".intent"), { recursive: true, force: true });\n    return {',
        "core rollback",
      ),
    async (mutant) => {
      assert.equal(preservesCore(mutant), false, "oracle rejects core rollback mutant");
    },
  );
});

test("mutation: selected agentを固定分岐へ変える誤実装を判別する", async () => {
  const production = await import("../src/term-drift.mjs");
  assert.equal(await runnerUsesInstalledSelectedAgent(production), true);

  await withMutant(
    "hardcoded-agent",
    (source) =>
      replaceOnce(
        source,
        "      agentEntry.termDriftArg,\n    );",
        '      "--claude",\n    );',
        "hardcoded agent",
      ),
    async (mutant) => {
      assert.equal(await runnerUsesInstalledSelectedAgent(mutant), false, "oracle rejects fixed-agent mutant");
    },
  );
});

test("mutation: term-drift所有物の直接上書きをbyte保持オラクルが判別する", async () => {
  function preservesOwnerBytes(mod) {
    return withTarget((targetDir) => {
      const glossaryPath = path.join(targetDir, ".term-drift", "glossary.yml");
      writeFixtureFile(targetDir, ".term-drift/glossary.yml", "team-term: stable\n");
      const before = fs.readFileSync(glossaryPath);
      mod.runTermDriftIntegration(targetDir, {
        agentEntry: CODEX_AGENT,
        requested: true,
        dryRun: false,
        compatibility: COMPATIBILITY,
        spawnSyncImpl: nonzeroOwnerResult,
      });
      return fs.readFileSync(glossaryPath).equals(before);
    });
  }

  const production = await import("../src/term-drift.mjs");
  assert.equal(preservesOwnerBytes(production), true);
  await withMutant(
    "owner-overwrite",
    (source) =>
      replaceOnce(
        source,
        'const result = (operation === "update" ? executeTermDriftUpdate : executeTermDriftInstall)(',
        'fs.writeFileSync(path.join(targetDir, ".term-drift", "glossary.yml"), "overwritten\\n");\n  const result = (operation === "update" ? executeTermDriftUpdate : executeTermDriftInstall)(',
        "term-owned overwrite",
      ),
    async (mutant) => {
      assert.equal(preservesOwnerBytes(mutant), false, "oracle rejects owner overwrite mutant");
    },
  );
});

test("distribution contract declares the exact owner dependency without bundling owner rules or skill bodies", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  assert.deepEqual(dependencySnapshot(packageJson), EXPECTED_DEPENDENCY_SNAPSHOT);
  assert.deepEqual(termDriftDependencyReferences(packageJson), ["dependencies:term-drift"]);
  assert.deepEqual(packageJson.files, ["templates", "bin", "src", "README.md", "LICENSE"]);

  const distributionFiles = collectDistributionRegularFiles(packageJson);
  const bundledOwnerPaths = [];
  for (const { relativePath } of distributionFiles) {
    if (
      /(?:^|\/)\.term-drift\/rules\/(?:detect|workflow)\.md$/u.test(relativePath) ||
      /(?:^|\/)skills\/term-drift\/(?:SKILL\.md|agents\/openai\.yaml)$/u.test(relativePath)
    ) {
      bundledOwnerPaths.push(relativePath);
    }
  }
  assert.deepEqual(bundledOwnerPaths, []);

  const publishedOwnerBodyHashes = new Set([
    ...Object.values(TERM_DRIFT_COMPATIBILITY.commonFiles),
    ...Object.values(TERM_DRIFT_COMPATIBILITY.skillFiles),
  ]);
  assert.deepEqual(matchingBodyCopies(distributionFiles, publishedOwnerBodyHashes), []);
});

test("mutation: optional/peer dependency追加を全dependency区分の固定契約が判別する", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  for (const category of ["optionalDependencies", "peerDependencies"]) {
    const mutant = { ...packageJson, [category]: { "term-drift": "0.2.1" } };
    assert.notDeepEqual(
      dependencySnapshot(mutant),
      EXPECTED_DEPENDENCY_SNAPSHOT,
      `${category} mutation must violate the exact dependency snapshot`,
    );
    assert.deepEqual(termDriftDependencyReferences(mutant), [
      "dependencies:term-drift",
      `${category}:term-drift`,
    ]);
  }
});

test("mutation: owner本文を別名で同梱してもSHA-256オラクルが判別する", () => {
  const arbitraryOwnerBody = Buffer.from("short arbitrary owner body fixture\n");
  const fixtureOwnerHashes = new Set([sha256(arbitraryOwnerBody)]);
  const renamedMutant = [
    { relativePath: "templates/en/reference/renamed-content.md", bytes: arbitraryOwnerBody },
    { relativePath: "README.md", bytes: Buffer.from("different public bytes\n") },
  ];

  assert.deepEqual(matchingBodyCopies(renamedMutant, fixtureOwnerHashes), [
    "templates/en/reference/renamed-content.md",
  ]);
});

test("production compatibility version and four published hashes remain exact", () => {
  assert.deepEqual(TERM_DRIFT_COMPATIBILITY, {
    version: "0.3.3",
    commonFiles: {
      ".term-drift/rules/detect.md":
        "2b7339e0753db67fbefee6308269e85f8ab37667c04a421d953d376041f16f83",
      ".term-drift/rules/workflow.md":
        "8c979b7d1f748e27d727b46746a0d3ddf931f1da8fb560fe26736c40a5a25ea1",
    },
    skillFiles: {
      "SKILL.md": "1a6f8073cee729c1b9aad2835965a70dfd175311e4ba3d8357ad2bcab5a0cc54",
      "agents/openai.yaml":
        "e35e3820b0fc52bec4e8f033a6519ed05b9deebd24fe0b4f4fa0269f627e94d7",
    },
  });
  assert.equal(
    Object.keys(TERM_DRIFT_COMPATIBILITY.commonFiles).length +
      Object.keys(TERM_DRIFT_COMPATIBILITY.skillFiles).length,
    4,
  );
});

test("three-agent golden manifests derive skill assets only from AGENT_REGISTRY", () => {
  const projections = Object.values(AGENT_REGISTRY).map((entry) =>
    projectTermDriftManifest(entry),
  );

  assert.deepEqual(
    projections.map(({ agent }) => agent).sort(),
    ["claude", "codex", "gemini"],
  );
  for (const [index, entry] of Object.values(AGENT_REGISTRY).entries()) {
    const skillPaths = Object.keys(projections[index].assets).filter((assetPath) =>
      assetPath.endsWith("/SKILL.md") || assetPath.endsWith("/agents/openai.yaml"),
    );
    assert.deepEqual(skillPaths, [
      `${entry.termDriftSkillDest}/SKILL.md`,
      `${entry.termDriftSkillDest}/agents/openai.yaml`,
    ]);
  }
});
