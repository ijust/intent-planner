import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  capturePreflightInputIdentities,
  checkNpmAuditSnapshot,
  checkNodeMaintenanceStatus,
  checkVulnerabilityDecisions,
  checkVulnerabilitySnapshotEvidence,
  commitPreflightArtifacts,
  commitPreflightArtifactsCore,
  runPreflightCheckPlan,
} from "../scripts/portable/release-preflight.mjs";
import {
  hashComponentSet,
  readBuildEvidence,
  readNodeScheduleSnapshot,
  readReleaseInput,
  readVulnerabilityDecisions,
  readVulnerabilitySnapshot,
  serializeStableJson,
} from "../scripts/portable/release-evidence.mjs";

const HASH = "a".repeat(64);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function writeJson(filename, value) {
  await writeFile(filename, serializeStableJson(value));
}

async function maintenanceFixture({
  publicationDate = "2026-05-31",
  nodeVersion = "24.1.0",
  schedule = {
    v24: { lts: "2026-01-01", maintenance: "2026-06-01", end: "2027-01-01" },
  },
  rawBytes,
  snapshotSha256,
} = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-preflight-maintenance-"));
  const workspaceRoot = path.join(root, "workspace");
  const evidenceRoot = path.join(workspaceRoot, "release", "portable", "1.2.3");
  const cacheRoot = path.join(root, "cache");
  await mkdir(evidenceRoot, { recursive: true });
  await mkdir(cacheRoot, { recursive: true });
  const rawPath = path.join(evidenceRoot, "node-schedule.raw.json");
  const schedulePath = path.join(evidenceRoot, "node-schedule.json");
  const releaseInputPath = path.join(evidenceRoot, "release-input.json");
  const buildEvidencePath = path.join(evidenceRoot, "build-evidence.json");
  const bytes = rawBytes ?? serializeStableJson(schedule);
  await writeFile(rawPath, bytes);
  await writeJson(schedulePath, {
    schemaVersion: 1,
    source: {
      url: "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json",
      retrievedAt: `${publicationDate}T00:00:00Z`,
      rawPath: "node-schedule.raw.json",
      sha256: snapshotSha256 ?? sha256(bytes),
    },
  });
  await writeJson(releaseInputPath, {
    schemaVersion: 1,
    intentPlannerVersion: "1.2.3",
    versionsFrozenAt: `${publicationDate}T00:00:00Z`,
    publicationDate,
    npmTarball: { path: "candidate.tgz", sha256: HASH },
    portableZip: { path: "candidate.zip", sha256: HASH },
    nodeReleaseEvidence: {
      archivePath: path.relative(evidenceRoot, path.join(cacheRoot, "node.zip")),
      signedShasumsPath: path.relative(evidenceRoot, path.join(cacheRoot, "SHASUMS256.txt.sig")),
      releaseKeyBundlePath: path.relative(evidenceRoot, path.join(cacheRoot, "keys.asc")),
    },
    nodeScheduleSnapshot: "node-schedule.json",
    vulnerabilitySnapshot: "vulnerabilities.json",
    vulnerabilityDecisions: "decisions.json",
  });
  await writeJson(buildEvidencePath, {
    schemaVersion: 1,
    intentPlannerVersion: "1.2.3",
    npmPackage: { name: "intent-planner", version: "1.2.3", commonContentSha256: HASH },
    node: {
      version: nodeVersion,
      platform: "win32",
      arch: "x64",
      archiveName: `node-v${nodeVersion}-win-x64.zip`,
      archiveSha256: HASH,
      signedShasumsSha256: HASH,
      releaseKeyBundleSha256: HASH,
    },
    dependencies: { packageLockSha256: HASH, componentsSha256: HASH },
  });
  const releaseInput = await readReleaseInput(releaseInputPath, { workspaceRoot, cacheRoot });
  const scheduleSnapshot = await readNodeScheduleSnapshot(schedulePath, {
    evidenceRoot,
    versionsFrozenAt: releaseInput.versionsFrozenAt,
    publicationDate: releaseInput.publicationDate,
  });
  const buildEvidence = await readBuildEvidence(buildEvidencePath);
  return { releaseInput, scheduleSnapshot, buildEvidence, evidenceRoot };
}

async function vulnerabilityFixture({
  publicationDate = "2026-05-31",
  intentPlannerVersion = "1.2.3",
  inventory = [
    { kind: "runtime", name: "node", version: "24.1.0" },
    { kind: "direct-dependency", name: "alpha", version: "1.0.0" },
    { kind: "transitive-dependency", name: "shared", version: "2.0.0" },
  ],
  mutateSnapshot = () => {},
  omitRawSource,
} = {}) {
  const base = await maintenanceFixture({ publicationDate });
  const rawSources = {
    "npm-audit-production": Buffer.from('{"auditReportVersion":2}\n'),
    "node-security-index": Buffer.from("<html>reviewed Node.js security index</html>\n"),
  };
  const snapshot = {
    schemaVersion: 1,
    intentPlannerVersion,
    capturedAt: `${publicationDate}T12:00:00Z`,
    targetsSha256: hashComponentSet(inventory.map(({ name, version }) => ({ name, version }))),
    sources: [
      {
        id: "npm-audit-production",
        kind: "npm-audit",
        url: "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk",
        retrievedAt: `${publicationDate}T11:00:00Z`,
        rawPath: "evidence/npm-audit.json",
        resultSha256: sha256(rawSources["npm-audit-production"]),
        status: "available",
      },
      {
        id: "node-security-index",
        kind: "node-security",
        url: "https://nodejs.org/en/blog/vulnerability/",
        retrievedAt: `${publicationDate}T11:30:00Z`,
        rawPath: "evidence/node-security-index.html",
        resultSha256: sha256(rawSources["node-security-index"]),
        status: "available",
      },
    ],
    targets: inventory.map(({ kind, name, version }) => ({
      kind: kind === "runtime" ? "node" : "dependency",
      name,
      version,
    })),
    findings: [],
    zeroFindings: true,
  };
  await mutateSnapshot(snapshot, rawSources);
  await mkdir(path.join(base.evidenceRoot, "evidence"), { recursive: true });
  for (const source of snapshot.sources) {
    if (source.id === omitRawSource) continue;
    const bytes = rawSources[source.id];
    if (bytes) await writeFile(path.join(base.evidenceRoot, source.rawPath), bytes);
  }
  const snapshotPath = path.join(base.evidenceRoot, "vulnerabilities.json");
  await writeJson(snapshotPath, snapshot);
  const vulnerabilitySnapshot = await readVulnerabilitySnapshot(snapshotPath, {
    evidenceRoot: base.evidenceRoot,
    versionsFrozenAt: base.releaseInput.versionsFrozenAt,
    publicationDate: base.releaseInput.publicationDate,
  });
  return { ...base, vulnerabilitySnapshot, componentInventory: Object.freeze(inventory.map(Object.freeze)) };
}

function auditReport(vulnerabilities = {}, dev = 0) {
  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: { dependencies: { dev } },
  };
}

async function npmAuditFixture({
  inventory,
  report = auditReport(),
  rawBytes,
  findings = [],
  mutateSnapshot = () => {},
} = {}) {
  return vulnerabilityFixture({
    ...(inventory ? { inventory } : {}),
    async mutateSnapshot(snapshot, rawSources) {
      rawSources["npm-audit-production"] = rawBytes ?? serializeStableJson(report);
      snapshot.sources.find(({ kind }) => kind === "npm-audit").resultSha256 = sha256(rawSources["npm-audit-production"]);
      snapshot.findings = findings;
      snapshot.zeroFindings = findings.length === 0;
      await mutateSnapshot(snapshot, rawSources);
    },
  });
}

async function vulnerabilityDecisionFixture({
  decision = "accept",
  zeroFindings = false,
  mutateDecisions = () => {},
  evidenceBytes = Buffer.from("reviewed mitigation evidence\n"),
  omitEvidence = false,
} = {}) {
  const base = await vulnerabilityFixture({
    mutateSnapshot(snapshot) {
      snapshot.findings = zeroFindings ? [] : [{
        id: "CVE-2026-ALPHA",
        sourceId: "npm-audit-production",
        component: { name: "alpha", version: "1.0.0" },
        sourceUrl: "https://example.invalid/CVE-2026-ALPHA",
      }];
      snapshot.zeroFindings = zeroFindings;
    },
  });
  const mitigationPath = path.join(base.evidenceRoot, "evidence", "mitigation.txt");
  if (!omitEvidence) await writeFile(mitigationPath, evidenceBytes);
  const decisions = {
    schemaVersion: 1,
    intentPlannerVersion: "1.2.3",
    decisions: zeroFindings ? [] : [{
      vulnerabilityId: "CVE-2026-ALPHA",
      component: { name: "alpha", version: "1.0.0" },
      decision,
      owner: "release-owner",
      reason: "対象版で確認した公開判断",
      decidedAt: "2026-05-30",
      recheckBy: "2026-06-30",
      mitigation: decision === "avoid" ? {
        description: "影響する機能を無効化した",
        candidateSha256: HASH,
        verifiedBy: "release-verifier",
        verifiedAt: "2026-05-30",
        evidencePath: "evidence/mitigation.txt",
        evidenceSha256: sha256(evidenceBytes),
      } : null,
      externalReferences: ["https://tickets.invalid/unreachable/123"],
    }],
  };
  await mutateDecisions(decisions);
  const decisionsPath = path.join(base.evidenceRoot, "decisions.json");
  await writeJson(decisionsPath, decisions);
  const vulnerabilityDecisions = await readVulnerabilityDecisions(decisionsPath, {
    evidenceRoot: base.evidenceRoot,
    publicationDate: base.releaseInput.publicationDate,
  });
  return { ...base, vulnerabilityDecisions };
}

test("classifies Node.js as Active LTS and Maintenance LTS at the specified date boundaries", async () => {
  const cases = [
    ["2026-01-01", "active-lts"],
    ["2026-05-31", "active-lts"],
    ["2026-06-01", "maintenance-lts"],
  ];
  for (const [publicationDate, state] of cases) {
    const input = await maintenanceFixture({ publicationDate });
    const check = await checkNodeMaintenanceStatus(input);
    assert.equal(check.status, "pass");
    assert.equal(check.details.state, state);
    assert.equal(check.details.version, "24.1.0");
    assert.equal(check.details.major, 24);
    assert.equal(check.details.publicationDate, publicationDate);
    assert.deepEqual(check.details.boundaries, {
      lts: "2026-01-01",
      maintenance: "2026-06-01",
      end: "2027-01-01",
    });
    assert.equal(Object.isFrozen(check), true);
    assert.equal(Object.isFrozen(check.details), true);
    assert.equal(Object.isFrozen(check.details.boundaries), true);
  }
});

test("fails closed before LTS, at EOL, and for an unknown major without parity guesses", async () => {
  const cases = [
    ["not-yet-lts", { publicationDate: "2025-12-31" }, "publication-before-lts"],
    ["eol", { publicationDate: "2027-01-01" }, "publication-on-or-after-end"],
    ["unknown", { nodeVersion: "25.1.0" }, "unknown-major"],
  ];
  for (const [name, options, reason] of cases) {
    const check = await checkNodeMaintenanceStatus(await maintenanceFixture(options));
    assert.equal(check.status, "fail", name);
    assert.equal(check.details.reason, reason);
    assert.match(check.message, /Node\.js/);
  }
});

test("fails closed for missing, invalid, and out-of-order target-major boundaries", async () => {
  const cases = [
    ["missing", { v24: { lts: "2026-01-01", end: "2027-01-01" } }, "boundary-missing"],
    ["invalid", { v24: { lts: "2026-02-30", maintenance: "2026-06-01", end: "2027-01-01" } }, "boundary-invalid"],
    ["order", { v24: { lts: "2026-06-01", maintenance: "2026-01-01", end: "2027-01-01" } }, "boundary-order-invalid"],
  ];
  for (const [name, schedule, reason] of cases) {
    const check = await checkNodeMaintenanceStatus(await maintenanceFixture({ schedule }));
    assert.equal(check.status, "fail", name);
    assert.equal(check.details.reason, reason);
  }
});

test("fails with expected and actual values for raw schedule hash mismatch", async () => {
  const input = await maintenanceFixture({ snapshotSha256: "0".repeat(64) });
  const check = await checkNodeMaintenanceStatus(input);
  assert.equal(check.status, "fail");
  assert.equal(check.details.reason, "raw-hash-mismatch");
  assert.equal(check.details.expectedSha256, "0".repeat(64));
  assert.match(check.details.actualSha256, /^[0-9a-f]{64}$/);
});

test("fails closed for invalid raw JSON and forged release input provenance", async () => {
  const invalidRaw = await maintenanceFixture({ rawBytes: Buffer.from("{invalid") });
  assert.equal((await checkNodeMaintenanceStatus(invalidRaw)).details.reason, "raw-json-invalid");

  const valid = await maintenanceFixture();
  const check = await checkNodeMaintenanceStatus({ ...valid, releaseInput: Object.freeze({ ...valid.releaseInput }) });
  assert.equal(check.status, "fail");
  assert.equal(check.details.reason, "release-input-unverified");
});

test("accepts a strict vulnerability snapshot whose raw sources and complete targets match", async () => {
  const input = await vulnerabilityFixture();
  const check = await checkVulnerabilitySnapshotEvidence(input);

  assert.equal(check.id, "vulnerability.snapshot-evidence");
  assert.equal(check.status, "pass");
  assert.equal(check.details.zeroFindings, true);
  assert.equal(check.details.targetCount, 3);
  assert.equal(check.details.findingCount, 0);
  assert.deepEqual(check.details.sourceKinds, ["node-security", "npm-audit"]);
  assert.deepEqual(check.details.targets, [
    "dependency:alpha@1.0.0",
    "dependency:shared@2.0.0",
    "node:node@24.1.0",
  ]);
  assert.deepEqual(check.details.sources.map(({ id, kind, retrievedAt }) => ({ id, kind, retrievedAt })), [
    { id: "node-security-index", kind: "node-security", retrievedAt: "2026-05-31T11:30:00Z" },
    { id: "npm-audit-production", kind: "npm-audit", retrievedAt: "2026-05-31T11:00:00Z" },
  ]);
  assert.match(check.details.targetsSha256, /^[0-9a-f]{64}$/u);
  assert.deepEqual(check.requirements, ["5.1", "5.2", "5.3", "5.4", "5.5", "6.1"]);
  assert.equal(Object.isFrozen(check), true);
  assert.equal(Object.isFrozen(check.details), true);
  assert.equal(Object.isFrozen(check.details.sourceKinds), true);
  assert.equal(Object.isFrozen(check.details.sources), true);
  assert.ok(check.details.sources.every(Object.isFrozen));
});

test("accepts findings only when Node.js and dependency findings use their required source kinds", async () => {
  const input = await vulnerabilityFixture({
    mutateSnapshot(snapshot) {
      snapshot.findings = [
        {
          id: "CVE-2026-NODE",
          sourceId: "node-security-index",
          component: { name: "node", version: "24.1.0" },
          sourceUrl: "https://nodejs.org/en/blog/vulnerability/example",
        },
        {
          id: "CVE-2026-ALPHA",
          sourceId: "npm-audit-production",
          component: { name: "alpha", version: "1.0.0" },
          sourceUrl: "https://github.com/advisories/GHSA-example",
        },
      ];
      snapshot.zeroFindings = false;
    },
  });
  const check = await checkVulnerabilitySnapshotEvidence(input);
  assert.equal(check.status, "pass");
  assert.equal(check.details.zeroFindings, false);
  assert.equal(check.details.findingCount, 2);
});

test("fails closed when a raw vulnerability source is missing or its hash differs", async () => {
  const missing = await vulnerabilityFixture({ omitRawSource: "node-security-index" });
  const missingCheck = await checkVulnerabilitySnapshotEvidence(missing);
  assert.equal(missingCheck.status, "fail");
  assert.equal(missingCheck.details.reason, "raw-source-unavailable");
  assert.equal(missingCheck.details.sourceId, "node-security-index");

  const mismatch = await vulnerabilityFixture({
    mutateSnapshot(snapshot) {
      snapshot.sources.find(({ id }) => id === "npm-audit-production").resultSha256 = "0".repeat(64);
    },
  });
  const mismatchCheck = await checkVulnerabilitySnapshotEvidence(mismatch);
  assert.equal(mismatchCheck.status, "fail");
  assert.equal(mismatchCheck.details.reason, "raw-source-hash-mismatch");
  assert.equal(mismatchCheck.details.sourceId, "npm-audit-production");
  assert.equal(mismatchCheck.details.expectedSha256, "0".repeat(64));
  assert.match(mismatchCheck.details.actualSha256, /^[0-9a-f]{64}$/u);
});

test("rejects target version replacement, missing targets, extra targets, and target-set hash changes", async () => {
  const cases = [
    ["version", [{ kind: "runtime", name: "node", version: "24.2.0" }, { kind: "direct-dependency", name: "alpha", version: "1.0.0" }, { kind: "transitive-dependency", name: "shared", version: "2.0.0" }]],
    ["missing", [{ kind: "runtime", name: "node", version: "24.1.0" }, { kind: "direct-dependency", name: "alpha", version: "1.0.0" }]],
    ["extra", [{ kind: "runtime", name: "node", version: "24.1.0" }, { kind: "direct-dependency", name: "alpha", version: "1.0.0" }, { kind: "transitive-dependency", name: "shared", version: "2.0.0" }, { kind: "transitive-dependency", name: "extra", version: "3.0.0" }]],
  ];
  for (const [name, inventory] of cases) {
    const input = await vulnerabilityFixture();
    const check = await checkVulnerabilitySnapshotEvidence({
      ...input,
      componentInventory: Object.freeze(inventory.map(Object.freeze)),
    });
    assert.equal(check.status, "fail", name);
    assert.equal(check.details.reason, "target-set-mismatch", name);
    assert.ok(Array.isArray(check.details.expectedTargets));
    assert.ok(Array.isArray(check.details.actualTargets));
  }

  const hashMismatch = await vulnerabilityFixture({
    mutateSnapshot(snapshot) { snapshot.targetsSha256 = "f".repeat(64); },
  });
  const hashCheck = await checkVulnerabilitySnapshotEvidence(hashMismatch);
  assert.equal(hashCheck.status, "fail");
  assert.equal(hashCheck.details.reason, "target-hash-mismatch");
  assert.equal(hashCheck.details.expectedSha256, "f".repeat(64));
  assert.match(hashCheck.details.actualSha256, /^[0-9a-f]{64}$/u);
});

test("requires both source kinds and rejects findings mapped to the wrong source kind", async () => {
  const missingKind = await vulnerabilityFixture({
    mutateSnapshot(snapshot) {
      snapshot.sources = snapshot.sources.filter(({ kind }) => kind !== "node-security");
    },
  });
  const missingCheck = await checkVulnerabilitySnapshotEvidence(missingKind);
  assert.equal(missingCheck.status, "fail");
  assert.equal(missingCheck.details.reason, "required-source-kind-missing");
  assert.equal(missingCheck.details.sourceKind, "node-security");

  const wrongKind = await vulnerabilityFixture({
    mutateSnapshot(snapshot) {
      snapshot.findings = [{
        id: "CVE-2026-NODE",
        sourceId: "npm-audit-production",
        component: { name: "node", version: "24.1.0" },
        sourceUrl: "https://example.invalid/node-finding",
      }];
      snapshot.zeroFindings = false;
    },
  });
  const wrongCheck = await checkVulnerabilitySnapshotEvidence(wrongKind);
  assert.equal(wrongCheck.status, "fail");
  assert.equal(wrongCheck.details.reason, "finding-source-kind-mismatch");
  assert.equal(wrongCheck.details.findingId, "CVE-2026-NODE");
  assert.equal(wrongCheck.details.expectedSourceKind, "node-security");
  assert.equal(wrongCheck.details.actualSourceKind, "npm-audit");
});

test("rejects product-version mismatch, invalid inventory, and forged release input", async () => {
  const versionMismatch = await vulnerabilityFixture({ intentPlannerVersion: "1.2.4" });
  assert.equal(
    (await checkVulnerabilitySnapshotEvidence(versionMismatch)).details.reason,
    "intent-planner-version-mismatch",
  );

  const valid = await vulnerabilityFixture();
  assert.equal((await checkVulnerabilitySnapshotEvidence({
    ...valid,
    componentInventory: Object.freeze([Object.freeze({ kind: "runtime", name: "node", version: "24.1.0" })]),
  })).details.reason, "target-set-mismatch");
  assert.equal((await checkVulnerabilitySnapshotEvidence({
    ...valid,
    componentInventory: [{ kind: "runtime", name: "node", version: "24.1.0" }],
  })).details.reason, "component-inventory-invalid");
  assert.equal((await checkVulnerabilitySnapshotEvidence({
    ...valid,
    releaseInput: Object.freeze({ ...valid.releaseInput }),
  })).details.reason, "release-input-unverified");
});

test("normalizes direct npm audit v2 advisories and exactly matches snapshot dependency findings", async () => {
  const input = await npmAuditFixture({
    report: auditReport({
      alpha: {
        via: [{ source: 1001, url: "https://github.com/advisories/ghsa-abcd-1234-zzzz" }],
      },
      shared: {
        via: ["alpha", { source: 2002, url: "https://registry.example.test/advisories/legacy-record" }],
      },
    }),
    findings: [
      {
        id: "GHSA-ABCD-1234-ZZZZ",
        sourceId: "npm-audit-production",
        component: { name: "alpha", version: "1.0.0" },
        sourceUrl: "https://github.com/advisories/ghsa-abcd-1234-zzzz",
      },
      {
        id: "2002",
        sourceId: "npm-audit-production",
        component: { name: "shared", version: "2.0.0" },
        sourceUrl: "https://registry.example.test/advisories/legacy-record",
      },
    ],
  });

  const check = await checkNpmAuditSnapshot(input);

  assert.equal(check.id, "vulnerability.npm-audit");
  assert.equal(check.status, "pass");
  assert.equal(check.details.sourceId, "npm-audit-production");
  assert.equal(check.details.findingCount, 2);
  assert.equal(check.details.zeroVulnerabilities, false);
  assert.equal(Object.isFrozen(check), true);
  assert.equal(Object.isFrozen(check.details), true);
  assert.equal(Object.isFrozen(check.details.findings), true);
});

test("accepts zero npm vulnerabilities only when raw vulnerabilities and npm findings are both empty", async () => {
  const check = await checkNpmAuditSnapshot(await npmAuditFixture());
  assert.equal(check.status, "pass");
  assert.equal(check.details.zeroVulnerabilities, true);
  assert.equal(check.details.findingCount, 0);

  const inconsistent = await npmAuditFixture({
    report: auditReport({ alpha: { via: ["shared"] } }),
  });
  assert.equal((await checkNpmAuditSnapshot(inconsistent)).details.reason, "zero-result-inconsistent");
});

test("rejects invalid npm audit JSON, report version, dev results, and raw hash mismatch without raw text", async () => {
  const secret = "SECRET_AUDIT_MARKER";
  const invalid = await npmAuditFixture({ rawBytes: Buffer.from(`{${secret}`) });
  const invalidCheck = await checkNpmAuditSnapshot(invalid);
  assert.equal(invalidCheck.details.reason, "audit-json-invalid");
  assert.doesNotMatch(JSON.stringify(invalidCheck), new RegExp(secret));

  const version = await npmAuditFixture({ report: { ...auditReport(), auditReportVersion: 1 } });
  assert.equal((await checkNpmAuditSnapshot(version)).details.reason, "audit-report-version-invalid");

  const dev = await npmAuditFixture({ report: auditReport({}, 1) });
  assert.equal((await checkNpmAuditSnapshot(dev)).details.reason, "audit-dev-dependencies-present");

  const mismatch = await npmAuditFixture({
    mutateSnapshot(snapshot) {
      snapshot.sources.find(({ kind }) => kind === "npm-audit").resultSha256 = "0".repeat(64);
    },
  });
  const mismatchCheck = await checkNpmAuditSnapshot(mismatch);
  assert.equal(mismatchCheck.details.reason, "audit-raw-hash-mismatch");
  assert.equal(mismatchCheck.details.expectedSha256, "0".repeat(64));
  assert.match(mismatchCheck.details.actualSha256, /^[0-9a-f]{64}$/u);
});

test("rejects unknown and ambiguous dependency targets without guessing a version", async () => {
  const unknown = await npmAuditFixture({
    report: auditReport({ missing: { via: [{ source: 1, url: "https://example.test/CVE-2026-0001" }] } }),
  });
  assert.equal((await checkNpmAuditSnapshot(unknown)).details.reason, "target-unknown");

  const inventory = [
    { kind: "runtime", name: "node", version: "24.1.0" },
    { kind: "direct-dependency", name: "shared", version: "1.0.0" },
    { kind: "transitive-dependency", name: "shared", version: "2.0.0" },
  ];
  const ambiguous = await npmAuditFixture({
    inventory,
    report: auditReport({ shared: { via: [{ source: 1, url: "https://example.test/CVE-2026-0001" }] } }),
  });
  assert.equal((await checkNpmAuditSnapshot(ambiguous)).details.reason, "target-version-ambiguous");
});

test("rejects malformed direct advisories, multiple npm sources, and replaced snapshot findings", async () => {
  const missingValue = await npmAuditFixture({
    report: auditReport({ alpha: { via: [{ source: "", url: "https://example.test/advisory/no-id" }] } }),
  });
  assert.equal((await checkNpmAuditSnapshot(missingValue)).details.reason, "advisory-invalid");

  const multiple = await npmAuditFixture({
    async mutateSnapshot(snapshot, rawSources) {
      rawSources["npm-audit-second"] = serializeStableJson(auditReport());
      snapshot.sources.push({
        ...snapshot.sources.find(({ kind }) => kind === "npm-audit"),
        id: "npm-audit-second",
        rawPath: "evidence/npm-audit-second.json",
        resultSha256: sha256(rawSources["npm-audit-second"]),
      });
    },
  });
  assert.equal((await checkNpmAuditSnapshot(multiple)).details.reason, "npm-audit-source-count-invalid");

  const replaced = await npmAuditFixture({
    report: auditReport({
      alpha: { via: [{ source: 1001, url: "https://github.com/advisories/GHSA-ABCD-1234-ZZZZ" }] },
    }),
    findings: [{
      id: "CVE-2026-REPLACED",
      sourceId: "npm-audit-production",
      component: { name: "alpha", version: "1.0.0" },
      sourceUrl: "https://github.com/advisories/GHSA-ABCD-1234-ZZZZ",
    }],
  });
  const replacedCheck = await checkNpmAuditSnapshot(replaced);
  assert.equal(replacedCheck.details.reason, "finding-set-mismatch");
  assert.ok(Array.isArray(replacedCheck.details.expectedFindings));
  assert.ok(Array.isArray(replacedCheck.details.actualFindings));
});

function planCheck(id, status, requirements = ["6.1"], details = {}) {
  return { id, status, message: `${id} ${status}`, details, requirements };
}

test("runs a small explicit check plan in order and passes only when every check passes", async () => {
  const order = [];
  const result = await runPreflightCheckPlan([
    { id: "root", requirements: ["1.5"], dependsOn: [], run: async () => { order.push("root"); return planCheck("root", "pass", ["1.5"]); } },
    { id: "child", requirements: ["6.1"], dependsOn: ["root"], run: async () => { order.push("child"); return planCheck("child", "pass"); } },
  ]);
  assert.deepEqual(order, ["root", "child"]);
  assert.equal(result.status, "pass");
  assert.deepEqual(result.checks.map(({ id, status }) => ({ id, status })), [
    { id: "root", status: "pass" },
    { id: "child", status: "pass" },
  ]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.checks), true);
  assert.ok(result.checks.every((check) => Object.isFrozen(check) && Object.isFrozen(check.details)));
});

test("keeps independent failures, blocks direct dependents, and continues independent checks", async () => {
  const ran = [];
  const result = await runPreflightCheckPlan([
    { id: "identity", requirements: ["6.1"], dependsOn: [], run: async () => planCheck("identity", "fail", ["6.1"], { reason: "identity-failed" }) },
    { id: "dependent", requirements: ["5.5"], dependsOn: ["identity"], run: async () => { ran.push("dependent"); return planCheck("dependent", "pass", ["5.5"]); } },
    { id: "independent-a", requirements: ["6.2"], dependsOn: [], run: async () => { ran.push("a"); return planCheck("independent-a", "fail", ["6.2"]); } },
    { id: "independent-b", requirements: ["6.3"], dependsOn: [], run: async () => { ran.push("b"); return planCheck("independent-b", "pass", ["6.3"]); } },
  ]);
  assert.equal(result.status, "fail");
  assert.deepEqual(ran, ["a", "b"]);
  assert.deepEqual(result.checks.map(({ id, status }) => ({ id, status })), [
    { id: "identity", status: "fail" },
    { id: "dependent", status: "blocked" },
    { id: "independent-a", status: "fail" },
    { id: "independent-b", status: "pass" },
  ]);
  assert.deepEqual(result.checks[1].details.blockedBy, ["identity"]);
});

test("sanitizes thrown checks and fails closed for invalid results and invalid plans", async () => {
  const secret = "SECRET_EXCEPTION_CONTENT";
  const thrown = await runPreflightCheckPlan([{
    id: "throws",
    requirements: ["6.1"],
    dependsOn: [],
    async run() {
      const error = new Error(secret, { cause: new Error(secret) });
      Object.assign(error, { code: "SAFE_CODE", stage: "read", resource: "candidate", expected: "present", actual: "missing" });
      throw error;
    },
  }]);
  assert.equal(thrown.checks[0].status, "fail");
  assert.equal(thrown.checks[0].details.error.code, "SAFE_CODE");
  assert.doesNotMatch(JSON.stringify(thrown), new RegExp(secret));

  const invalidResult = await runPreflightCheckPlan([{
    id: "invalid", requirements: ["6.1"], dependsOn: [], run: async () => ({ status: "pass" }),
  }]);
  assert.equal(invalidResult.checks[0].details.reason, "invalid-check-result");

  const circular = {};
  circular.self = circular;
  for (const details of [{ value: 1n }, { value: new Map([["key", "value"]]) }, circular]) {
    const result = await runPreflightCheckPlan([{
      id: "json-unsafe",
      requirements: ["6.1"],
      dependsOn: [],
      run: async () => planCheck("json-unsafe", "pass", ["6.1"], details),
    }]);
    assert.equal(result.checks[0].details.reason, "invalid-check-result");
    assert.doesNotThrow(() => JSON.stringify(result));
  }

  for (const plan of [
    [
      { id: "same", requirements: ["6.1"], dependsOn: [], run: async () => planCheck("same", "pass") },
      { id: "same", requirements: ["6.1"], dependsOn: [], run: async () => planCheck("same", "pass") },
    ],
    [{ id: "unknown", requirements: ["6.1"], dependsOn: ["later"], run: async () => planCheck("unknown", "pass") }],
  ]) {
    const result = await runPreflightCheckPlan(plan);
    assert.equal(result.status, "fail");
    assert.equal(result.checks.length, 1);
    assert.equal(result.checks[0].id, "preflight.plan");
  }
});

test("captures frozen SHA-256 identities for only the explicitly listed regular files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-preflight-identities-"));
  const first = path.join(root, "first.bin");
  const second = path.join(root, "second.bin");
  const firstBytes = Buffer.from("first identity");
  const secondBytes = Buffer.from("second identity");
  await writeFile(first, firstBytes);
  await writeFile(second, secondBytes);
  const identities = await capturePreflightInputIdentities([
    { id: "first", path: first },
    { id: "second", path: second },
  ]);
  assert.deepEqual(identities.map(({ id, path: filePath, size, sha256: value }) => ({ id, path: filePath, size, sha256: value })), [
    { id: "first", path: first, size: firstBytes.byteLength, sha256: sha256(firstBytes) },
    { id: "second", path: second, size: secondBytes.byteLength, sha256: sha256(secondBytes) },
  ]);
  assert.ok(identities.every(({ mtime }) => typeof mtime === "string" && mtime.length > 0));
  assert.equal(Object.isFrozen(identities), true);
  assert.ok(identities.every(Object.isFrozen));
});

test("fails identity capture for unavailable explicit inputs", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-preflight-changing-"));
  const missingInput = [{ id: "missing", path: path.join(root, "missing.bin") }];
  await assert.rejects(
    capturePreflightInputIdentities(missingInput),
    (error) => error.code === "INPUT_IDENTITY_UNAVAILABLE" && error.resource === "missing",
  );

  const result = await runPreflightCheckPlan([
    {
      id: "identity",
      requirements: ["1.5"],
      dependsOn: [],
      run: async () => capturePreflightInputIdentities(missingInput),
    },
    {
      id: "dependent",
      requirements: ["6.1"],
      dependsOn: ["identity"],
      run: async () => planCheck("dependent", "pass"),
    },
  ]);
  assert.deepEqual(result.checks.map(({ id, status }) => ({ id, status })), [
    { id: "identity", status: "fail" },
    { id: "dependent", status: "blocked" },
  ]);
  assert.equal(result.checks[0].details.error.code, "INPUT_IDENTITY_UNAVAILABLE");
});

test("passes zero findings with zero decisions and accepts a complete risk acceptance", async () => {
  const zero = await checkVulnerabilityDecisions(
    await vulnerabilityDecisionFixture({ zeroFindings: true }),
  );
  assert.equal(zero.status, "pass");
  assert.equal(zero.details.findingCount, 0);
  assert.deepEqual(zero.details.decisionCounts, { update: 0, avoid: 0, accept: 0 });

  const accepted = await checkVulnerabilityDecisions(await vulnerabilityDecisionFixture());
  assert.equal(accepted.id, "vulnerability.decisions");
  assert.equal(accepted.status, "pass");
  assert.equal(accepted.details.findingCount, 1);
  assert.deepEqual(accepted.details.decisionCounts, { update: 0, avoid: 0, accept: 1 });
  assert.deepEqual(accepted.requirements, ["5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "6.1"]);
  assert.equal(Object.isFrozen(accepted), true);
  assert.equal(Object.isFrozen(accepted.details), true);
  assert.equal(Object.isFrozen(accepted.details.decisionCounts), true);
});

test("passes avoid only when the candidate and repository evidence hashes match", async () => {
  const check = await checkVulnerabilityDecisions(
    await vulnerabilityDecisionFixture({ decision: "avoid" }),
  );
  assert.equal(check.status, "pass");
  assert.deepEqual(check.details.decisionCounts, { update: 0, avoid: 1, accept: 0 });
});

test("always rejects update for the current candidate", async () => {
  const check = await checkVulnerabilityDecisions(
    await vulnerabilityDecisionFixture({ decision: "update" }),
  );
  assert.equal(check.status, "fail");
  assert.equal(check.details.reason, "candidate-update-required");
  assert.equal(check.details.vulnerabilityId, "CVE-2026-ALPHA");
  assert.equal(check.details.component, "alpha@1.0.0");
});

test("rejects missing, extra, and component-version-mismatched decisions", async () => {
  const cases = [
    ["missing", (value) => { value.decisions = []; }],
    ["extra", (value) => { value.decisions.push({
      ...value.decisions[0],
      vulnerabilityId: "CVE-2026-EXTRA",
    }); }],
    ["version", (value) => { value.decisions[0].component.version = "9.0.0"; }],
  ];
  for (const [name, mutateDecisions] of cases) {
    const check = await checkVulnerabilityDecisions(
      await vulnerabilityDecisionFixture({ mutateDecisions }),
    );
    assert.equal(check.status, "fail", name);
    assert.equal(check.details.reason, "decision-coverage-mismatch", name);
    assert.ok(Array.isArray(check.details.missingDecisions));
    assert.ok(Array.isArray(check.details.extraDecisions));
  }
});

test("rejects decision-set product version mismatch and forged release input", async () => {
  const versionMismatch = await vulnerabilityDecisionFixture({
    mutateDecisions(value) { value.intentPlannerVersion = "1.2.4"; },
  });
  assert.equal(
    (await checkVulnerabilityDecisions(versionMismatch)).details.reason,
    "intent-planner-version-mismatch",
  );

  const valid = await vulnerabilityDecisionFixture();
  assert.equal((await checkVulnerabilityDecisions({
    ...valid,
    releaseInput: Object.freeze({ ...valid.releaseInput }),
  })).details.reason, "release-input-unverified");
});

test("rejects avoid candidate mismatch, missing evidence, and evidence hash mismatch", async () => {
  const candidate = await vulnerabilityDecisionFixture({
    decision: "avoid",
    mutateDecisions(value) { value.decisions[0].mitigation.candidateSha256 = "0".repeat(64); },
  });
  const candidateCheck = await checkVulnerabilityDecisions(candidate);
  assert.equal(candidateCheck.details.reason, "avoid-candidate-mismatch");
  assert.equal(candidateCheck.details.expectedSha256, HASH);
  assert.equal(candidateCheck.details.actualSha256, "0".repeat(64));

  const missing = await vulnerabilityDecisionFixture({ decision: "avoid", omitEvidence: true });
  assert.equal((await checkVulnerabilityDecisions(missing)).details.reason, "avoid-evidence-unavailable");

  const mismatch = await vulnerabilityDecisionFixture({
    decision: "avoid",
    mutateDecisions(value) { value.decisions[0].mitigation.evidenceSha256 = "f".repeat(64); },
  });
  const mismatchCheck = await checkVulnerabilityDecisions(mismatch);
  assert.equal(mismatchCheck.details.reason, "avoid-evidence-hash-mismatch");
  assert.equal(mismatchCheck.details.expectedSha256, "f".repeat(64));
  assert.match(mismatchCheck.details.actualSha256, /^[0-9a-f]{64}$/u);
  assert.doesNotMatch(JSON.stringify(mismatchCheck), /reviewed mitigation evidence/u);
});

async function commitFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-preflight-commit-"));
  const zipPath = path.join(root, "intent-planner-1.2.3-windows-x64.zip");
  const evidencePath = path.join(root, "release-input.json");
  await writeFile(zipPath, Buffer.from("fixed portable zip bytes\n"));
  await writeFile(evidencePath, Buffer.from('{"fixed":true}\n'));
  const inputIdentities = await capturePreflightInputIdentities([
    { id: "portable-zip", path: zipPath },
    { id: "release-input", path: evidencePath },
  ]);
  const checkResult = await runPreflightCheckPlan([{
    id: "all-required",
    requirements: ["6.3"],
    dependsOn: [],
    run: async () => planCheck("all-required", "pass", ["6.3"], { fixed: true }),
  }]);
  const finalDir = path.join(root, "artifacts", "preflight", "intent-planner-1.2.3-windows-x64");
  const components = Object.freeze([Object.freeze({
    kind: "runtime",
    name: "node",
    version: "24.1.0",
    licenseExpression: "MIT",
    licenseFiles: Object.freeze(["licenses/node/24.1.0/LICENSE"]),
    noticeFiles: Object.freeze([]),
  })]);
  let failLicense = false;
  const stageLicenseMaterials = async (stagingDir) => {
    const licensePath = path.join(stagingDir, "licenses", "node", "24.1.0", "LICENSE");
    await mkdir(path.dirname(licensePath), { recursive: true });
    await writeFile(licensePath, "Node license\n");
    const index = { schemaVersion: 1, components };
    if (failLicense) throw new Error("license staging failed");
    return index;
  };
  return {
    root,
    zipPath,
    evidencePath,
    inputIdentities,
    checkResult,
    finalDir,
    stageLicenseMaterials,
    setLicenseFailure(value) { failLicense = value; },
  };
}

function commitOptions(fixture, overrides = {}) {
  return {
    checkResult: fixture.checkResult,
    inputIdentities: fixture.inputIdentities,
    portableZipPath: fixture.zipPath,
    intentPlannerVersion: "1.2.3",
    finalDir: fixture.finalDir,
    stageLicenseMaterials: fixture.stageLicenseMaterials,
    ...overrides,
  };
}

async function relativeFiles(root) {
  const files = [];
  async function visit(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(path.join(directory, entry.name), relativePath);
      else files.push(relativePath);
    }
  }
  await visit(root);
  return files.sort();
}

test("commits the complete deterministic artifact set only after every check passes", async () => {
  const fixture = await commitFixture();
  const zipBefore = await readFile(fixture.zipPath);
  const evidenceBefore = await readFile(fixture.evidencePath);
  const result = await commitPreflightArtifacts(commitOptions(fixture));

  assert.equal(result.status, "committed");
  assert.equal(result.outputDir, fixture.finalDir);
  assert.deepEqual(await relativeFiles(fixture.finalDir), [
    "component-inventory.json",
    "intent-planner-1.2.3-windows-x64.zip.sha256",
    "licenses/index.json",
    "licenses/node/24.1.0/LICENSE",
    "preflight-report.json",
  ]);
  assert.deepEqual(
    JSON.parse(await readFile(path.join(fixture.finalDir, "preflight-report.json"), "utf8")),
    { schemaVersion: 1, intentPlannerVersion: "1.2.3", status: "pass", checks: fixture.checkResult.checks },
  );
  assert.deepEqual(
    JSON.parse(await readFile(path.join(fixture.finalDir, "component-inventory.json"), "utf8")),
    { schemaVersion: 1, intentPlannerVersion: "1.2.3", components: [
      {
        kind: "runtime", name: "node", version: "24.1.0", licenseExpression: "MIT",
        licenseFiles: ["licenses/node/24.1.0/LICENSE"], noticeFiles: [],
      },
    ] },
  );
  assert.deepEqual(await readFile(fixture.zipPath), zipBefore);
  assert.deepEqual(await readFile(fixture.evidencePath), evidenceBefore);
});

test("does not stage outputs when any required check failed or was blocked", async () => {
  for (const status of ["fail", "blocked"]) {
    const fixture = await commitFixture();
    const checkResult = { status: "fail", checks: [{ ...fixture.checkResult.checks[0], status }] };
    await assert.rejects(commitPreflightArtifacts(commitOptions(fixture, { checkResult })), {
      code: "PREFLIGHT_CHECKS_INCOMPLETE",
    });
    await assert.rejects(stat(fixture.finalDir), { code: "ENOENT" });
    await assert.rejects(readdir(path.dirname(fixture.finalDir)), { code: "ENOENT" });
  }
});

test("rejects incomplete, duplicate, and non-JSON pass checks before staging", async () => {
  const cases = [
    { status: "pass", checks: [{ id: "missing-fields", status: "pass" }] },
    {
      status: "pass",
      checks: [fixtureCheck("same"), fixtureCheck("same")],
    },
    {
      status: "pass",
      checks: [fixtureCheck("unsafe", { value: 1n })],
    },
  ];
  function fixtureCheck(id, details = {}) {
    return { id, status: "pass", message: "合格", details, requirements: ["6.3"] };
  }
  for (const checkResult of cases) {
    const fixture = await commitFixture();
    await assert.rejects(commitPreflightArtifacts(commitOptions(fixture, { checkResult })), {
      code: "PREFLIGHT_CHECKS_INCOMPLETE",
    });
    await assert.rejects(stat(fixture.finalDir), { code: "ENOENT" });
    await assert.rejects(readdir(path.dirname(fixture.finalDir)), { code: "ENOENT" });
  }
});

test("removes staging when license generation or final identity verification fails", async () => {
  const licenseFailure = await commitFixture();
  licenseFailure.setLicenseFailure(true);
  await assert.rejects(commitPreflightArtifacts(commitOptions(licenseFailure)), /license staging failed/u);
  assert.deepEqual(await readdir(path.dirname(licenseFailure.finalDir)), []);

  const identityFailure = await commitFixture();
  await writeFile(identityFailure.evidencePath, Buffer.from('{"fixed":false}\n'));
  await assert.rejects(commitPreflightArtifacts(commitOptions(identityFailure)), {
    code: "PREFLIGHT_INPUT_CHANGED",
  });
  assert.deepEqual(await readdir(path.dirname(identityFailure.finalDir)), []);
});

test("removes staging when the staged sidecar no longer matches the ZIP", async () => {
  const fixture = await commitFixture();
  const originalStage = fixture.stageLicenseMaterials;
  const stageLicenseMaterials = async (stagingDir) => {
    const index = await originalStage(stagingDir);
    await writeFile(fixture.zipPath, Buffer.from("changed after sidecar generation\n"));
    return index;
  };
  await assert.rejects(
    commitPreflightArtifacts(commitOptions(fixture, { stageLicenseMaterials })),
    { code: "PREFLIGHT_SIDECAR_INVALID" },
  );
  assert.deepEqual(await readdir(path.dirname(fixture.finalDir)), []);
});

test("treats an identical existing artifact directory as a successful rerun", async () => {
  const fixture = await commitFixture();
  const first = await commitPreflightArtifacts(commitOptions(fixture));
  const firstReport = await readFile(path.join(fixture.finalDir, "preflight-report.json"));
  const second = await commitPreflightArtifacts(commitOptions(fixture));
  assert.equal(first.status, "committed");
  assert.equal(second.status, "already-committed");
  assert.deepEqual(await readFile(path.join(fixture.finalDir, "preflight-report.json")), firstReport);
  assert.deepEqual(await readdir(path.dirname(fixture.finalDir)), [path.basename(fixture.finalDir)]);
});

test("refuses to overwrite an existing artifact directory with different content", async () => {
  const fixture = await commitFixture();
  await mkdir(fixture.finalDir, { recursive: true });
  await writeFile(path.join(fixture.finalDir, "unrelated.txt"), "keep me\n");
  await assert.rejects(commitPreflightArtifacts(commitOptions(fixture)), {
    code: "PREFLIGHT_OUTPUT_EXISTS",
  });
  assert.equal(await readFile(path.join(fixture.finalDir, "unrelated.txt"), "utf8"), "keep me\n");
  assert.deepEqual(await readdir(path.dirname(fixture.finalDir)), [path.basename(fixture.finalDir)]);
});

test("reports staging cleanup failure and retains the original operation failure", async () => {
  const fixture = await commitFixture();
  await mkdir(fixture.finalDir, { recursive: true });
  await writeFile(path.join(fixture.finalDir, "different.txt"), "different\n");
  let stagingDir;
  const cleanupCause = new Error("cleanup unavailable");
  await assert.rejects(
    commitPreflightArtifactsCore(commitOptions(fixture), {
      async removeStaging(directory) {
        stagingDir = directory;
        throw cleanupCause;
      },
    }),
    (error) => error.code === "PREFLIGHT_CLEANUP_FAILED"
      && error.cause === cleanupCause
      && error.operationFailure?.code === "PREFLIGHT_OUTPUT_EXISTS"
      && error.resource === "preflight staging directory"
      && !error.message.includes(path.basename(stagingDir))
      && !JSON.stringify(error.operationFailure).includes(path.basename(stagingDir)),
  );
  assert.ok(stagingDir);
  await rm(stagingDir, { recursive: true, force: true });
});

test("does not report an identical rerun until its staging cleanup succeeds", async () => {
  const fixture = await commitFixture();
  await commitPreflightArtifacts(commitOptions(fixture));
  let stagingDir;
  await assert.rejects(
    commitPreflightArtifactsCore(commitOptions(fixture), {
      async removeStaging(directory) {
        stagingDir = directory;
        throw new Error("cleanup unavailable");
      },
    }),
    { code: "PREFLIGHT_CLEANUP_FAILED" },
  );
  await rm(stagingDir, { recursive: true, force: true });
});

test("production commit rejects cleanup operation injection", async () => {
  const fixture = await commitFixture();
  await assert.rejects(
    commitPreflightArtifacts(commitOptions(fixture, { removeStaging: async () => {} })),
    { code: "PREFLIGHT_CHECKS_INCOMPLETE" },
  );
  await assert.rejects(readdir(path.dirname(fixture.finalDir)), { code: "ENOENT" });
});

test("test core accepts only the exact callable cleanup operation", async () => {
  for (const operations of [
    { removeStaging: null },
    { removeStaging: async () => {}, extra: true },
  ]) {
    const fixture = await commitFixture();
    await assert.rejects(
      commitPreflightArtifactsCore(commitOptions(fixture), operations),
      { code: "PREFLIGHT_CHECKS_INCOMPLETE" },
    );
    await assert.rejects(readdir(path.dirname(fixture.finalDir)), { code: "ENOENT" });
  }
});
