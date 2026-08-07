import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  checkNpmAuditSnapshot,
  checkNodeMaintenanceStatus,
  checkVulnerabilitySnapshotEvidence,
} from "../scripts/portable/release-preflight.mjs";
import {
  hashComponentSet,
  readBuildEvidence,
  readNodeScheduleSnapshot,
  readReleaseInput,
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
