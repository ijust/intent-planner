import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { AGENT_REGISTRY } from "../src/install.mjs";
import {
  HANDOFF_BRIDGE_COMPATIBILITY,
  inspectHandoffBridge,
  resolveHandoffBridgeCliPath,
  runHandoffBridgeIntegration,
} from "../src/handoff-bridge.mjs";

function temporaryProject(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "intent-handoff-bridge-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("registry maps every supported agent to the owner installer without a second agent table", () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(AGENT_REGISTRY).map(([agent, entry]) => [
        agent,
        { arg: entry.handoffBridgeArg, skill: entry.handoffBridgeSkillDest },
      ]),
    ),
    {
      claude: { arg: "--claude", skill: ".claude/skills/handoff-bridge" },
      codex: { arg: "--codex", skill: ".agents/skills/handoff-bridge" },
      gemini: { arg: "--gemini", skill: ".gemini/skills/handoff-bridge" },
    },
  );
});

test("dry-run reports the pinned owner action without starting a process", (t) => {
  const target = temporaryProject(t);
  let calls = 0;
  const result = runHandoffBridgeIntegration(target, {
    agentEntry: AGENT_REGISTRY.codex,
    dryRun: true,
    spawnSyncImpl() {
      calls += 1;
    },
  });
  assert.equal(calls, 0);
  assert.deepEqual(result, {
    action: "planned",
    version: "0.2.1",
    agent: "codex",
    health: { state: "not-installed" },
  });
});

for (const agent of ["claude", "codex", "gemini"]) {
  test(`owner installer places and verifies the ${agent} projection`, (t) => {
    const target = temporaryProject(t);
    const entry = AGENT_REGISTRY[agent];
    const first = runHandoffBridgeIntegration(target, { agentEntry: entry });
    assert.equal(first.action, "installed");
    assert.deepEqual(first.health, {
      state: "ready",
      version: HANDOFF_BRIDGE_COMPATIBILITY.version,
      skillPath: entry.handoffBridgeSkillDest,
    });
    const second = runHandoffBridgeIntegration(target, { agentEntry: entry });
    assert.equal(second.action, "already-ready");
  });
}

test("a differing owner file is blocked and never overwritten or passed to the owner process", (t) => {
  const target = temporaryProject(t);
  const entry = AGENT_REGISTRY.codex;
  const skill = path.join(target, entry.handoffBridgeSkillDest);
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(skill, "SKILL.md"), "local content\n");
  let calls = 0;
  const result = runHandoffBridgeIntegration(target, {
    agentEntry: entry,
    spawnSyncImpl() {
      calls += 1;
    },
  });
  assert.equal(calls, 0);
  assert.equal(result.action, "blocked-inconsistent");
  assert.ok(result.health.issues.some((issue) => issue.code === "hash-mismatch"));
  assert.equal(fs.readFileSync(path.join(skill, "SKILL.md"), "utf8"), "local content\n");
});

test("owner package is pinned and its public handoff contract remains consumer-compatible", () => {
  const cli = resolveHandoffBridgeCliPath();
  const packageRoot = path.resolve(path.dirname(cli), "..");
  const skillRoot = path.join(packageRoot, "skills", "handoff-bridge");
  const skill = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
  const contract = fs.readFileSync(path.join(skillRoot, "references", "handoff-contract.md"), "utf8");
  const composition = fs.readFileSync(path.join(skillRoot, "references", "composition-guide.md"), "utf8");

  assert.match(skill, /利用者が明示的に起動したときだけ実行/u);
  assert.match(skill, /description:.*引き継いで.*引継書を書いて.*handoffを作って/u);
  assert.match(skill, /既定保存/u);
  assert.match(skill, /\.handoff-bridge/u);
  assert.match(skill, /hidden transcript.*追加探索しない/u);
  assert.match(skill, /locatorを読み戻さず/u);
  for (const field of ["source", "locator", "read_for", "authority", "provenance"]) {
    assert.match(contract, new RegExp(`\\b${field}\\b`, "u"));
  }
  for (const failure of [
    "malformed-model",
    "malformed-ref",
    "composition-failure",
    "output-validation-failure",
    "write-conflict",
  ]) {
    assert.match(contract, new RegExp(failure, "u"));
  }
  assert.match(composition, /既知の不足は未解決事項として運び/u);
  assert.match(composition, /入力全量を複製しない/u);
  assert.match(skill, /domain adapter、registry、resolverを呼ぶ、または作る/u);
});

test("inspection rejects an unexpected skill entry", (t) => {
  const target = temporaryProject(t);
  const entry = AGENT_REGISTRY.codex;
  assert.equal(runHandoffBridgeIntegration(target, { agentEntry: entry }).action, "installed");
  fs.writeFileSync(path.join(target, entry.handoffBridgeSkillDest, "extra.md"), "extra\n");
  const health = inspectHandoffBridge(target, entry);
  assert.equal(health.state, "inconsistent");
  assert.ok(health.issues.some((issue) => issue.code === "unexpected-entry"));
});

test("real installed scripts render, validate, and persist one handoff through owner-managed default storage", (t) => {
  const target = temporaryProject(t);
  const entry = AGENT_REGISTRY.codex;
  assert.equal(runHandoffBridgeIntegration(target, { agentEntry: entry }).action, "installed");
  const skill = fs.realpathSync(path.join(target, entry.handoffBridgeSkillDest));
  const model = {
    schema_version: "handoff-bridge/v1",
    generated_at: "2026-07-15T00:00:00Z",
    objective: "Continue the verified handoff integration.",
    current_state: ["The owner skill is installed and compatibility-checked."],
    session_context: ["intent-planner delegates installation to the pinned owner CLI."],
    decisions: [{ decision: "Keep generation in the owner skill.", rationale: "Avoid a second implementation." }],
    next_actions: [{ order: 1, action: "Review the integration evidence.", success_signal: "The packet evidence matches the tested files." }],
    unresolved: [],
    risks: [{ risk: "The handoff may become stale.", response: "Consult the referenced source before acting." }],
    references: [{
      source: "intent-planner packet",
      locator: ".intent/packets/active/pkt-20260712-handoff-engine-host-skeleton-970a.md",
      read_for: "the accepted integration boundary and validation evidence",
      authority: "the packet and current implementation win over this derived handoff",
      provenance: "supplied by the current integration session",
    }],
    receiver_checks: ["Confirm the packet is still current before continuing."],
  };
  const rendered = spawnSync(process.execPath, [path.join(skill, "scripts", "render-handoff.mjs")], {
    input: JSON.stringify(model),
    encoding: "utf8",
  });
  assert.equal(rendered.status, 0, rendered.stderr);
  assert.match(rendered.stdout, /Derivative notice:/u);
  assert.match(rendered.stdout, /Canonical source wins:/u);

  const written = spawnSync(
    process.execPath,
    [path.join(skill, "scripts", "write-handoff.mjs"), "--default", target],
    { input: rendered.stdout, encoding: "utf8" },
  );
  assert.equal(written.status, 0, written.stderr);
  const result = JSON.parse(written.stdout);
  assert.equal(result.ok, true);
  assert.match(result.path, /^\.handoff-bridge\/handoff-20260715T000000Z-/u);
  const outputPath = path.join(target, result.path);
  assert.equal(fs.readFileSync(outputPath, "utf8"), rendered.stdout);
  assert.equal(fs.readFileSync(path.join(target, ".handoff-bridge", ".gitignore"), "utf8"), "*");
});
