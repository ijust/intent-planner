import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkNodeMaintenanceStatus } from "../scripts/portable/release-preflight.mjs";
import {
  readBuildEvidence,
  readNodeScheduleSnapshot,
  readReleaseInput,
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
  return { releaseInput, scheduleSnapshot, buildEvidence };
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
