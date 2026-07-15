import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const requireFromIntentPlanner = createRequire(import.meta.url);

export const HANDOFF_BRIDGE_COMPATIBILITY = Object.freeze({
  version: "0.1.2",
  skillFiles: Object.freeze({
    "SKILL.md": "6314bcb673577eecb79751b07e514c38da7615aa2c694bc5f1ba403c1da79aff",
    "references/composition-guide.md":
      "9ed9d9e03f2503f20dbff3e6482c5a8b7b968196b3eed328c35e6d19dc77951a",
    "references/handoff-contract.md":
      "1dff6cc4f2284311e8bec6e8ac915087d52e52712f6896b773e0e7be4bcf8ecf",
    "scripts/contract.mjs":
      "f4528a5904610414b7f155c233953e1f00205fab8559aba5e8dcaa658bc4e1ea",
    "scripts/render-handoff.mjs":
      "ec2a18ec9a36da9237726447c990ac6ccf7cc5c4b8011f9e8ae9e926590b8639",
    "scripts/validate-model.mjs":
      "d88a28f0b3c1b6cbcc6276a073572728dbac2049d4b8dd11b10aa8d9d6f38ea9",
    "scripts/validate-output.mjs":
      "953e0291f3351c82ff2ac0c90f9e73a273141be5f43f669c60f38aeb7c067f0b",
    "scripts/write-handoff.mjs":
      "28ee41ae5975677e22627f20f4ac94be2bf419cfc862d1338f0823e345ca28b0",
  }),
});

function normalize(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function isProjectRelative(value) {
  const normalized = normalize(value);
  return (
    normalized.length > 0 &&
    !normalized.includes("\0") &&
    !normalized.startsWith("/") &&
    !/^[A-Za-z]:\//u.test(normalized) &&
    normalized.split("/").every((segment) => segment && segment !== "." && segment !== "..")
  );
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function expectedDirectories(files) {
  const result = new Set();
  for (const relativePath of Object.keys(files)) {
    const segments = relativePath.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      result.add(segments.slice(0, index).join("/"));
    }
  }
  return result;
}

function safeLstat(root, relativePath) {
  if (!isProjectRelative(relativePath)) return { kind: "unsafe" };
  let current = path.resolve(root);
  for (const segment of normalize(relativePath).split("/")) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error?.code === "ENOENT") return { kind: "missing" };
      return { kind: "unsafe" };
    }
    if (stat.isSymbolicLink()) return { kind: "unsafe" };
  }
  return { kind: "ok", stat: fs.lstatSync(current), absolutePath: current };
}

/** Published skill bytes are the compatibility boundary; no provider logic is copied here. */
export function inspectHandoffBridge(
  targetDir,
  agentEntry,
  compatibility = HANDOFF_BRIDGE_COMPATIBILITY,
) {
  const skillRoot = normalize(agentEntry?.handoffBridgeSkillDest);
  if (!isProjectRelative(skillRoot)) {
    return { state: "inconsistent", issues: [{ code: "unsafe-path", path: skillRoot || "<skill>" }] };
  }
  const root = safeLstat(targetDir, skillRoot);
  if (root.kind === "missing") return { state: "not-installed" };
  if (root.kind !== "ok" || !root.stat.isDirectory()) {
    return { state: "inconsistent", issues: [{ code: "unsafe-path", path: skillRoot }] };
  }

  const issues = [];
  const expectedFiles = new Set(Object.keys(compatibility.skillFiles));
  const directories = expectedDirectories(compatibility.skillFiles);
  for (const [relativePath, expectedHash] of Object.entries(compatibility.skillFiles)) {
    const projectPath = `${skillRoot}/${relativePath}`;
    const found = safeLstat(targetDir, projectPath);
    if (found.kind === "missing") issues.push({ code: "missing", path: projectPath });
    else if (found.kind !== "ok" || !found.stat.isFile()) {
      issues.push({ code: "unsafe-path", path: projectPath });
    } else if (sha256(fs.readFileSync(found.absolutePath)) !== expectedHash) {
      issues.push({ code: "hash-mismatch", path: projectPath });
    }
  }

  function visit(relativeDir = "") {
    const absoluteDir = path.join(root.absolutePath, ...relativeDir.split("/").filter(Boolean));
    for (const name of fs.readdirSync(absoluteDir).sort()) {
      const relativeEntry = relativeDir ? `${relativeDir}/${name}` : name;
      const projectPath = `${skillRoot}/${relativeEntry}`;
      const found = safeLstat(targetDir, projectPath);
      if (found.kind !== "ok") {
        issues.push({ code: "unsafe-path", path: projectPath });
      } else if (found.stat.isDirectory()) {
        if (directories.has(relativeEntry)) visit(relativeEntry);
        else issues.push({ code: "unexpected-entry", path: projectPath });
      } else if (!found.stat.isFile() || !expectedFiles.has(relativeEntry)) {
        issues.push({ code: "unexpected-entry", path: projectPath });
      }
    }
  }
  visit();

  return issues.length > 0
    ? { state: "inconsistent", issues }
    : { state: "ready", version: compatibility.version, skillPath: skillRoot };
}

export function resolveHandoffBridgeCliPath({ searchPaths = requireFromIntentPlanner.resolve.paths("handoff-bridge") } = {}) {
  for (const searchPath of searchPaths ?? []) {
    const packageJsonPath = path.join(searchPath, "handoff-bridge", "package.json");
    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    } catch {
      continue;
    }
    if (
      packageJson?.name !== "handoff-bridge" ||
      packageJson?.version !== HANDOFF_BRIDGE_COMPATIBILITY.version ||
      packageJson?.bin?.["handoff-bridge"] !== "bin/cli.mjs"
    ) {
      continue;
    }
    const cliPath = path.join(path.dirname(packageJsonPath), packageJson.bin["handoff-bridge"]);
    const stat = fs.lstatSync(cliPath);
    if (!stat.isSymbolicLink() && stat.isFile()) return cliPath;
  }
  throw new Error("installed handoff-bridge package does not match the pinned owner CLI contract");
}

function ownerAgent(agentEntry) {
  if (agentEntry?.handoffBridgeArg === "--claude") return "claude";
  if (agentEntry?.handoffBridgeArg === "--codex") return "codex";
  return null;
}

function validOwnerOutput(value, entry, compatibility, targetDir) {
  const expected = Object.keys(compatibility.skillFiles).sort();
  const actual = [...(value?.created ?? []), ...(value?.skipped ?? [])].sort();
  return (
    value !== null &&
    typeof value === "object" &&
    value.agent === ownerAgent(entry) &&
    typeof value.targetRoot === "string" &&
    path.resolve(value.targetRoot) ===
      path.resolve(fs.realpathSync(targetDir), entry.handoffBridgeSkillDest) &&
    Array.isArray(value.created) && value.created.every((item) => typeof item === "string") &&
    Array.isArray(value.skipped) && value.skipped.every((item) => typeof item === "string") &&
    new Set(actual).size === actual.length &&
    actual.join("\0") === expected.join("\0")
  );
}

/** Delegate installation to the pinned owner CLI and decide success only from a post-check. */
export function runHandoffBridgeIntegration(
  targetDir,
  {
    agentEntry,
    dryRun = false,
    compatibility = HANDOFF_BRIDGE_COMPATIBILITY,
    spawnSyncImpl = spawnSync,
    cliPath,
    resolveCliPathImpl = resolveHandoffBridgeCliPath,
  } = {},
) {
  const health = inspectHandoffBridge(targetDir, agentEntry, compatibility);
  if (health.state === "ready") return { action: "already-ready", health };
  if (health.state === "inconsistent") return { action: "blocked-inconsistent", health };
  if (dryRun) {
    return {
      action: "planned",
      version: compatibility.version,
      agent: agentEntry?.agentName,
      health,
    };
  }

  let ownerCli;
  try {
    ownerCli = cliPath ?? resolveCliPathImpl();
  } catch (error) {
    return { action: "failed", failure: { kind: "owner-unavailable", message: error.message }, health };
  }
  const result = spawnSyncImpl(process.execPath, [ownerCli, agentEntry?.handoffBridgeArg], {
    cwd: path.resolve(targetDir),
    encoding: "utf8",
  });
  const postHealth = inspectHandoffBridge(targetDir, agentEntry, compatibility);
  if (result.error || result.status !== 0) {
    return {
      action: "failed",
      failure: { kind: result.error ? "spawn-error" : "nonzero-exit", message: result.error?.message ?? result.stderr },
      health: postHealth,
    };
  }
  let output;
  try {
    output = JSON.parse(result.stdout);
  } catch {
    return { action: "failed", failure: { kind: "invalid-json", message: "owner output is not JSON" }, health: postHealth };
  }
  if (!validOwnerOutput(output, agentEntry, compatibility, targetDir)) {
    return { action: "failed", failure: { kind: "contract-mismatch", message: "owner output contract mismatch" }, health: postHealth };
  }
  if (postHealth.state !== "ready") {
    return { action: "failed", failure: { kind: "postcheck-failed", message: "installed skill failed compatibility inspection" }, health: postHealth };
  }
  return { action: "installed", health: postHealth, install: output };
}
