import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { BlobReader, BlobWriter, ZipWriter } from "@zip.js/zip.js";

import {
  bindVerifiedNodeReleaseForPreflight,
  verifySidecar,
} from "../scripts/portable/release-artifacts.mjs";
import {
  hashComponentSet,
  hashFileSet,
  serializeStableJson,
} from "../scripts/portable/release-evidence.mjs";
import {
  capturePreflightInputIdentities,
  commitPreflightArtifacts,
  runPortableReleasePreflightCore,
} from "../scripts/portable/release-preflight.mjs";
import {
  verifyNodeReleaseInputWithEvidenceCore,
} from "../scripts/portable/node-release.mjs";
import { serializePortableManifest } from "../scripts/portable/manifest.mjs";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "1.2.3";
const NODE_VERSION = "24.18.0";
const NODE_ARCHIVE_NAME = `node-v${NODE_VERSION}-win-x64.zip`;
const NODE_RUNTIME_ROOT = `node-v${NODE_VERSION}-win-x64`;
const NODE_EXE = Buffer.from("MZ fixed integration runtime\n");
const NODE_LICENSE = Buffer.from("Node.js fixture license\n");
const SIGNED_SHASUMS = Buffer.from("fixed signed SHASUMS fixture\n");
const RELEASE_KEYS = Buffer.from("fixed Node.js release key fixture\n");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function tarOctal(header, offset, length, value) {
  header.write(`${Math.trunc(value).toString(8).padStart(length - 2, "0")}\0 `, offset, length, "ascii");
}

function tarEntry(name, bytes) {
  const body = Buffer.from(bytes);
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  tarOctal(header, 100, 8, 0o644);
  tarOctal(header, 108, 8, 0);
  tarOctal(header, 116, 8, 0);
  tarOctal(header, 124, 12, body.length);
  tarOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header.write("0", 156, 1, "ascii");
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  tarOctal(header, 148, 8, [...header].reduce((sum, byte) => sum + byte, 0));
  return Buffer.concat([header, body, Buffer.alloc((512 - (body.length % 512)) % 512)]);
}

function makeTarball(entries) {
  return gzipSync(Buffer.concat([
    ...[...entries].map(([name, bytes]) => tarEntry(`package/${name}`, bytes)),
    Buffer.alloc(1024),
  ]));
}

async function makeZipBytes(entries) {
  const writer = new ZipWriter(new BlobWriter("application/zip"));
  for (const [name, bytes] of entries) {
    const directory = name.endsWith("/");
    await writer.add(name, directory ? undefined : new BlobReader(new Blob([bytes])), {
      directory,
      unixMode: directory ? 0o040755 : 0o100644,
    });
  }
  const blob = await writer.close();
  return Buffer.from(await blob.arrayBuffer());
}

function packageJson() {
  return Buffer.from(`${JSON.stringify({
    name: "intent-planner",
    version: VERSION,
    dependencies: { alpha: "1.0.0" },
  }, null, 2)}\n`);
}

function packageLock() {
  return Buffer.from(`${JSON.stringify({
    name: "intent-planner",
    version: VERSION,
    lockfileVersion: 3,
    packages: {
      "": { name: "intent-planner", version: VERSION, dependencies: { alpha: "1.0.0" } },
      "node_modules/alpha": {
        version: "1.0.0",
        resolved: "https://registry.npmjs.org/alpha/-/alpha-1.0.0.tgz",
        integrity: "sha512-Zml4dHVyZQ==",
        dependencies: { shared: "2.0.0" },
      },
      "node_modules/alpha/node_modules/shared": {
        version: "2.0.0",
        resolved: "https://registry.npmjs.org/shared/-/shared-2.0.0.tgz",
        integrity: "sha512-Zml4dHVyZQ==",
      },
    },
  }, null, 2)}\n`);
}

function packageMetadata(name, version, license) {
  return Buffer.from(`${JSON.stringify({ name, version, license })}\n`);
}

function commonFileRecords(entries) {
  return [...entries]
    .filter(([name]) => !name.startsWith("node_modules/") && name !== "package-lock.json")
    .map(([name, bytes]) => ({ path: name, size: bytes.byteLength, sha256: sha256(bytes) }));
}

async function buildFixture(t, variant = "pass") {
  const variants = new Set(Array.isArray(variant) ? variant : [variant]);
  const workspace = await mkdtemp(path.join(REPOSITORY_ROOT, ".portable-preflight-integration-"));
  await mkdir(path.join(REPOSITORY_ROOT, ".cache"), { recursive: true });
  const cache = await mkdtemp(path.join(REPOSITORY_ROOT, ".cache", "portable-preflight-integration-"));
  t.after(() => Promise.all([
    rm(workspace, { recursive: true, force: true }),
    rm(cache, { recursive: true, force: true }),
  ]));
  const releaseDir = path.join(workspace, "release", VERSION);
  const outputRoot = path.join(workspace, "artifacts", "preflight");
  await mkdir(releaseDir, { recursive: true });

  const nodeArchive = await makeZipBytes(new Map([
    [`${NODE_RUNTIME_ROOT}/`, null],
    [`${NODE_RUNTIME_ROOT}/node.exe`, NODE_EXE],
    [`${NODE_RUNTIME_ROOT}/LICENSE`, NODE_LICENSE],
  ]));
  const nodeConfig = {
    nodeVersion: NODE_VERSION,
    platform: "win32",
    arch: "x64",
    archiveName: NODE_ARCHIVE_NAME,
    archiveSha256: sha256(nodeArchive),
    releaseKeysSha256: sha256(RELEASE_KEYS),
  };
  const nodeArchivePath = path.join(cache, NODE_ARCHIVE_NAME);
  const shasumsPath = path.join(cache, "SHASUMS256.txt.asc");
  const keysPath = path.join(cache, "pubring.kbx");
  await writeFile(nodeArchivePath, nodeArchive);
  await writeFile(shasumsPath, SIGNED_SHASUMS);
  await writeFile(keysPath, RELEASE_KEYS);

  const baseCommon = new Map([
    ["bin/cli.mjs", Buffer.from("export const fixture = 'same release';\n")],
    ["package.json", packageJson()],
  ]);
  const npmCommon = new Map(baseCommon);
  const zipCommon = new Map(baseCommon);
  if (variants.has("npm-replaced")) npmCommon.set("bin/cli.mjs", Buffer.from("export const fixture = 'npm only';\n"));
  if (variants.has("zip-replaced")) zipCommon.set("bin/cli.mjs", Buffer.from("export const fixture = 'zip only';\n"));

  const tarballPath = path.join(workspace, `intent-planner-${VERSION}.tgz`);
  await writeFile(tarballPath, makeTarball(npmCommon));

  const lockBytes = packageLock();
  const portableEntries = new Map([
    ...[...zipCommon].map(([name, bytes]) => [`app/${name}`, bytes]),
    ["app/package-lock.json", lockBytes],
    ["app/node_modules/alpha/package.json", packageMetadata("alpha", "1.0.0", "MIT")],
    ["app/node_modules/alpha/LICENSE", Buffer.from("Alpha license\n")],
    ["app/node_modules/alpha/NOTICE", Buffer.from("Alpha notice\n")],
    ["app/node_modules/alpha/node_modules/shared/package.json", packageMetadata("shared", "2.0.0", "Apache-2.0")],
    ["app/node_modules/alpha/node_modules/shared/LICENSE", Buffer.from("Shared license\n")],
    ["runtime/node.exe", variants.has("runtime-modified") ? Buffer.from("MZ modified runtime\n") : NODE_EXE],
    ["runtime/LICENSE", NODE_LICENSE],
  ]);
  if (variants.has("license-missing")) portableEntries.delete("app/node_modules/alpha/LICENSE");

  const components = [
    { name: "alpha", version: "1.0.0" },
    { name: "shared", version: "2.0.0" },
  ];
  const evidence = {
    schemaVersion: 1,
    intentPlannerVersion: VERSION,
    npmPackage: {
      name: "intent-planner",
      version: VERSION,
      commonContentSha256: hashFileSet(commonFileRecords(zipCommon)),
    },
    node: {
      version: NODE_VERSION,
      platform: "win32",
      arch: "x64",
      archiveName: NODE_ARCHIVE_NAME,
      archiveSha256: sha256(nodeArchive),
      signedShasumsSha256: sha256(SIGNED_SHASUMS),
      releaseKeyBundleSha256: sha256(RELEASE_KEYS),
    },
    dependencies: {
      packageLockSha256: sha256(lockBytes),
      componentsSha256: hashComponentSet(components),
    },
  };
  portableEntries.set("portable-build-evidence.json", serializeStableJson(evidence));
  const manifestFiles = [...portableEntries].map(([name, bytes]) => ({
    path: name,
    size: bytes.byteLength,
    sha256: sha256(bytes),
  })).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  portableEntries.set("portable-manifest.json", serializePortableManifest({
    schemaVersion: 1,
    intentPlannerVersion: VERSION,
    nodeVersion: NODE_VERSION,
    platform: "win32",
    arch: "x64",
    entrypoint: "app/bin/cli.mjs",
    files: manifestFiles,
  }));
  if (variants.has("manifest-modified")) {
    portableEntries.set("runtime/node.exe", Buffer.from("MZ changed after manifest\n"));
  }
  const portableZip = await makeZipBytes(new Map(
    [...portableEntries].map(([name, bytes]) => [`intent-planner-v${VERSION}-win-x64-portable/${name}`, bytes]),
  ));
  const portableZipPath = path.join(workspace, `intent-planner-v${VERSION}-win-x64-portable.zip`);
  await writeFile(portableZipPath, portableZip);

  const scheduleRaw = Buffer.from(`${JSON.stringify({
    v24: { lts: "2025-10-28", maintenance: "2026-10-20", end: "2028-04-30" },
  })}\n`);
  const scheduleRawPath = path.join(releaseDir, "node-schedule.raw.json");
  const scheduleSnapshotPath = path.join(releaseDir, "node-schedule.json");
  await writeFile(scheduleRawPath, scheduleRaw);
  await writeFile(scheduleSnapshotPath, serializeStableJson({
    schemaVersion: 1,
    source: {
      url: "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json",
      retrievedAt: "2026-08-06T12:00:00Z",
      rawPath: "node-schedule.raw.json",
      sha256: sha256(scheduleRaw),
    },
  }));

  const npmAudit = Buffer.from(`${JSON.stringify({
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: { dependencies: { prod: 2, dev: 0, optional: 0, peer: 0, peerOptional: 0, total: 2 } },
  })}\n`);
  const nodeSecurity = Buffer.from("fixed reviewed Node.js security source\n");
  const npmAuditPath = path.join(releaseDir, "evidence", "npm-audit.json");
  const nodeSecurityPath = path.join(releaseDir, "evidence", "node-security.txt");
  await mkdir(path.join(releaseDir, "evidence"));
  await writeFile(npmAuditPath, npmAudit);
  await writeFile(nodeSecurityPath, nodeSecurity);
  const targets = [
    { kind: "node", name: "node", version: NODE_VERSION },
    { kind: "dependency", name: "alpha", version: "1.0.0" },
    { kind: "dependency", name: "shared", version: "2.0.0" },
  ];
  const capturedAt = variants.has("stale-snapshot") ? "2026-08-06T10:00:00Z" : "2026-08-06T13:00:00Z";
  const vulnerabilitySnapshotPath = path.join(releaseDir, "vulnerabilities.json");
  await writeFile(vulnerabilitySnapshotPath, serializeStableJson({
    schemaVersion: 1,
    intentPlannerVersion: VERSION,
    capturedAt,
    targetsSha256: hashComponentSet(targets.map(({ name, version }) => ({ name, version }))),
    sources: [
      {
        id: "node-security-index",
        kind: "node-security",
        url: "https://nodejs.org/en/blog/vulnerability/fixture",
        retrievedAt: capturedAt,
        rawPath: "evidence/node-security.txt",
        resultSha256: sha256(nodeSecurity),
        status: "available",
      },
      {
        id: "npm-audit-production",
        kind: "npm-audit",
        url: "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk",
        retrievedAt: capturedAt,
        rawPath: "evidence/npm-audit.json",
        resultSha256: sha256(npmAudit),
        status: "available",
      },
    ],
    targets,
    findings: [{
      id: "CVE-2026-FIXTURE",
      sourceId: "node-security-index",
      component: { name: "node", version: NODE_VERSION },
      sourceUrl: "https://nodejs.org/en/blog/vulnerability/fixture",
    }],
    zeroFindings: false,
  }));
  const decisionsPath = path.join(releaseDir, "decisions.json");
  await writeFile(decisionsPath, serializeStableJson({
    schemaVersion: 1,
    intentPlannerVersion: VERSION,
    decisions: variants.has("decision-missing") ? [] : [{
      vulnerabilityId: "CVE-2026-FIXTURE",
      component: { name: "node", version: NODE_VERSION },
      decision: "accept",
      owner: "fixture-release-owner",
      reason: "固定fixtureで確認済みの公開判断",
      decidedAt: "2026-08-06",
      recheckBy: variants.has("expired-decision") ? "2026-08-06" : "2026-08-20",
      mitigation: null,
    }],
  }));

  const releaseInputPath = path.join(releaseDir, "release-input.json");
  await writeFile(releaseInputPath, serializeStableJson({
    schemaVersion: 1,
    intentPlannerVersion: VERSION,
    versionsFrozenAt: "2026-08-06T11:00:00Z",
    publicationDate: "2026-08-07",
    npmTarball: { path: path.relative(releaseDir, tarballPath), sha256: sha256(await readFile(tarballPath)) },
    portableZip: { path: path.relative(releaseDir, portableZipPath), sha256: sha256(portableZip) },
    nodeReleaseEvidence: {
      archivePath: path.relative(releaseDir, nodeArchivePath),
      signedShasumsPath: path.relative(releaseDir, shasumsPath),
      releaseKeyBundlePath: path.relative(releaseDir, keysPath),
    },
    nodeScheduleSnapshot: "node-schedule.json",
    vulnerabilitySnapshot: "vulnerabilities.json",
    vulnerabilityDecisions: "decisions.json",
  }));

  return {
    releaseInputPath,
    outputRoot,
    portableZipPath,
    tarballPath,
    vulnerabilitySnapshotPath,
    decisionsPath,
    nodeArchivePath,
    shasumsPath,
    keysPath,
    scheduleSnapshotPath,
    scheduleRawPath,
    npmAuditPath,
    nodeSecurityPath,
    nodeConfig,
    signedPlaintext: `${nodeConfig.archiveSha256}  ${NODE_ARCHIVE_NAME}\n`,
  };
}

async function runFixture(fixture, { beforeNodeVerification } = {}) {
  return runPortableReleasePreflightCore({
    releaseInputPath: fixture.releaseInputPath,
    outputRoot: fixture.outputRoot,
  }, {
    reverifyNodeRelease: async ({ releaseInput, portableInspection }) => {
      await beforeNodeVerification?.();
      const verifiedNodeRelease = await verifyNodeReleaseInputWithEvidenceCore({
        releaseInput,
        config: fixture.nodeConfig,
        readArchive: () => readFile(releaseInput.nodeReleaseEvidence.archivePathResolved),
        readKeyring: () => readFile(releaseInput.nodeReleaseEvidence.releaseKeyBundlePathResolved),
        readSignedShasums: () => readFile(releaseInput.nodeReleaseEvidence.signedShasumsPathResolved),
        runGpg: async ({ outputFile }) => {
          await writeFile(outputFile, fixture.signedPlaintext);
          return { exitCode: 0, status: "[GNUPG:] VALIDSIG fixture\n" };
        },
      });
      return bindVerifiedNodeReleaseForPreflight({
        releaseInput,
        portableInspection,
        verifiedNodeRelease,
      });
    },
  });
}

function check(result, id) {
  return result.checks.find((item) => item.id === id);
}

async function hashPaths(paths) {
  return Object.fromEntries(await Promise.all(paths.map(async (filePath) => [filePath, sha256(await readFile(filePath))])));
}

async function hashArtifactTree(root) {
  const files = [];
  async function visit(directory, prefix = "") {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolutePath, relativePath);
      else files.push([relativePath, sha256(await readFile(absolutePath))]);
    }
  }
  await visit(root);
  return files;
}

function passingCommitResult() {
  return {
    status: "pass",
    checks: [{
      id: "fixture.complete",
      status: "pass",
      message: "固定fixtureの検査に合格しました",
      details: {},
      requirements: ["6.1"],
    }],
  };
}

test("fixed release fixture passes every check and writes reviewable offline artifacts", async (t) => {
  const fixture = await buildFixture(t);
  const result = await runFixture(fixture);

  assert.equal(result.status, "pass", JSON.stringify(result));
  assert.ok(result.checks.length > 0);
  assert.ok(result.checks.every(({ status }) => status === "pass"));
  const outputDir = path.join(fixture.outputRoot, `intent-planner-${VERSION}-windows-x64`);
  assert.deepEqual((await readdir(outputDir)).sort(), [
    "component-inventory.json",
    `intent-planner-v${VERSION}-win-x64-portable.zip.sha256`,
    "licenses",
    "preflight-report.json",
  ]);
  const report = JSON.parse(await readFile(path.join(outputDir, "preflight-report.json"), "utf8"));
  assert.equal(report.status, "pass");
  assert.deepEqual(report.checks, result.checks);
  const inventory = JSON.parse(await readFile(path.join(outputDir, "component-inventory.json"), "utf8"));
  assert.deepEqual(inventory.components.map(({ kind, name, version }) => ({ kind, name, version })), [
    { kind: "runtime", name: "node", version: NODE_VERSION },
    { kind: "direct-dependency", name: "alpha", version: "1.0.0" },
    { kind: "transitive-dependency", name: "shared", version: "2.0.0" },
  ]);
  assert.match(await readFile(path.join(outputDir, "licenses", "node", NODE_VERSION, "LICENSE"), "utf8"), /Node\.js fixture license/u);
  assert.match(await readFile(path.join(outputDir, "licenses", "npm", "alpha", "1.0.0", "NOTICE"), "utf8"), /Alpha notice/u);
  assert.equal((await verifySidecar(
    fixture.portableZipPath,
    path.join(outputDir, `intent-planner-v${VERSION}-win-x64-portable.zip.sha256`),
  )).status, "pass");
});

test("multiple independent defects are reported once while dependent checks are blocked", async (t) => {
  const fixture = await buildFixture(t, ["manifest-modified", "decision-missing"]);
  const result = await runFixture(fixture);

  assert.equal(result.status, "fail");
  const metadataFailure = check(result, "portable.metadata");
  assert.equal(metadataFailure?.status, "fail");
  assert.equal(metadataFailure.details.reason, "check-exception");
  assert.equal(metadataFailure.details.error?.code, "MANIFEST_INVALID");
  assert.equal(metadataFailure.details.error?.resource, "runtime/node.exe");
  const decisionFailure = check(result, "vulnerability.decisions");
  assert.equal(decisionFailure?.status, "fail");
  assert.equal(decisionFailure.details.reason, "decision-coverage-mismatch");
  assert.deepEqual(decisionFailure.details.missingDecisions, [`CVE-2026-FIXTURE:node@${NODE_VERSION}`]);
  assert.deepEqual(decisionFailure.details.extraDecisions, []);
  assert.deepEqual(check(result, "node.release-evidence")?.details.blockedBy, ["portable.metadata"]);
  assert.deepEqual(check(result, "license.materials")?.details.blockedBy, ["component.inventory"]);
  assert.equal(result.checks.filter(({ status }) => status === "fail").length, 2);
  await assert.rejects(readdir(fixture.outputRoot), { code: "ENOENT" });
});

test("an explicit input changed during inspection is rejected before artifacts are committed", async (t) => {
  const fixture = await buildFixture(t);
  const originalDecisionBytes = await readFile(fixture.decisionsPath);
  const result = await runFixture(fixture, {
    beforeNodeVerification: () => writeFile(
      fixture.decisionsPath,
      Buffer.concat([originalDecisionBytes, Buffer.from("\n")]),
    ),
  });

  assert.equal(result.status, "fail");
  assert.equal(check(result, "preflight.outputs")?.details.error?.code, "PREFLIGHT_INPUT_CHANGED");
  assert.equal(check(result, "preflight.outputs")?.details.error?.resource, "vulnerability-decisions");
  assert.deepEqual(await readdir(fixture.outputRoot), []);
});

test("sidecar revalidation failure removes every staged artifact", async (t) => {
  const fixture = await buildFixture(t);
  const identities = await capturePreflightInputIdentities([{
    id: "portable-zip",
    path: fixture.portableZipPath,
  }]);
  const finalDir = path.join(fixture.outputRoot, `intent-planner-${VERSION}-windows-x64`);

  await assert.rejects(commitPreflightArtifacts({
    checkResult: passingCommitResult(),
    inputIdentities: identities,
    portableZipPath: fixture.portableZipPath,
    intentPlannerVersion: VERSION,
    finalDir,
    stageLicenseMaterials: async () => {
      await writeFile(fixture.portableZipPath, Buffer.from("changed after sidecar creation\n"));
      return { schemaVersion: 1, components: [] };
    },
  }), { code: "PREFLIGHT_SIDECAR_INVALID" });
  assert.deepEqual(await readdir(fixture.outputRoot), []);
});

test("a failure before the commit point removes partial license artifacts", async (t) => {
  const fixture = await buildFixture(t);
  const identities = await capturePreflightInputIdentities([{
    id: "portable-zip",
    path: fixture.portableZipPath,
  }]);
  const finalDir = path.join(fixture.outputRoot, `intent-planner-${VERSION}-windows-x64`);
  const failure = Object.assign(new Error("fixture staging failure"), { code: "FIXTURE_STAGE_FAILED" });

  await assert.rejects(commitPreflightArtifacts({
    checkResult: passingCommitResult(),
    inputIdentities: identities,
    portableZipPath: fixture.portableZipPath,
    intentPlannerVersion: VERSION,
    finalDir,
    stageLicenseMaterials: async (stagingDir) => {
      const partialDir = path.join(stagingDir, "licenses", "partial");
      await mkdir(partialDir, { recursive: true });
      await writeFile(path.join(partialDir, "LICENSE"), Buffer.from("partial\n"));
      throw failure;
    },
  }), (error) => error === failure);
  assert.deepEqual(await readdir(fixture.outputRoot), []);
});

test("rerunning fixed inputs preserves decision meaning, inputs, and committed artifacts", async (t) => {
  const fixture = await buildFixture(t);
  const observedInputs = [
    fixture.releaseInputPath,
    fixture.tarballPath,
    fixture.portableZipPath,
    fixture.vulnerabilitySnapshotPath,
    fixture.decisionsPath,
    fixture.nodeArchivePath,
    fixture.shasumsPath,
    fixture.keysPath,
    fixture.scheduleSnapshotPath,
    fixture.scheduleRawPath,
    fixture.npmAuditPath,
    fixture.nodeSecurityPath,
  ];
  const inputsBefore = await hashPaths(observedInputs);

  const first = await runFixture(fixture);
  const outputDir = path.join(fixture.outputRoot, `intent-planner-${VERSION}-windows-x64`);
  const artifactsAfterFirstRun = await hashArtifactTree(outputDir);
  const second = await runFixture(fixture);

  assert.equal(first.status, "pass");
  assert.equal(first.outputs.status, "committed");
  assert.equal(second.status, "pass");
  assert.equal(second.outputs.status, "already-committed");
  assert.deepEqual(second.checks, first.checks);
  assert.deepEqual(await hashPaths(observedInputs), inputsBefore);
  assert.deepEqual(await hashArtifactTree(outputDir), artifactsAfterFirstRun);
});

for (const [variant, expectedCheck, assertDetails] of [
  ["npm-replaced", "common-content.files", (details) => assert.ok(details.mismatches.some(({ path: name }) => name === "bin/cli.mjs"))],
  ["zip-replaced", "common-content.files", (details) => assert.ok(details.mismatches.some(({ path: name }) => name === "bin/cli.mjs"))],
  ["runtime-modified", "node.runtime-content", (details) => {
    assert.equal(details.reason, "check-exception");
    assert.equal(details.error?.code, "NODE_RUNTIME_CONTENT_MISMATCH");
    assert.equal(details.error?.resource, "runtime/node.exe");
  }],
  ["license-missing", "license.materials", (details) => {
    assert.equal(details.reason, "check-exception");
    assert.equal(details.error?.code, "LICENSE_MATERIAL_INVALID");
    assert.equal(details.error?.resource, "alpha@1.0.0");
  }],
  ["stale-snapshot", "vulnerability.snapshot", (details) => assert.equal(details.reason, "check-exception")],
  ["expired-decision", "vulnerability.decision-records", (details) => assert.equal(details.reason, "check-exception")],
]) {
  test(`fixed release fixture rejects ${variant} with a specific failed check`, async (t) => {
    const fixture = await buildFixture(t, variant);
    const result = await runFixture(fixture);

    assert.equal(result.status, "fail");
    const failedCheck = check(result, expectedCheck);
    assert.equal(failedCheck?.status, "fail", JSON.stringify(result));
    assertDetails(failedCheck.details);
    await assert.rejects(readdir(fixture.outputRoot), { code: "ENOENT" });
  });
}
