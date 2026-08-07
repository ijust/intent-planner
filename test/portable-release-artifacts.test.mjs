import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, chmod, link, mkdtemp, mkdir, readFile, readdir, rm, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";

import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { create as createTar } from "tar";

import {
  assertNodeReleaseEvidenceMatches,
  bindVerifiedNodeReleaseForPreflight,
  buildComponentInventory,
  collectLicenseMaterials,
  compareNodeRuntimeContentCore,
  compareCommonPackageContent,
  DEFAULT_ARCHIVE_LIMITS,
  hashAndWriteSidecar,
  PortableArchiveError,
  inspectNpmTarball,
  inspectPortableZip,
  reverifyNodeReleaseForPreflight,
  verifyNodeRuntimeContent,
  verifyPortableReleaseMetadata,
  verifySidecar,
} from "../scripts/portable/release-artifacts.mjs";
import {
  verifyNodeReleaseTrustChainWithEvidenceCore,
} from "../scripts/portable/node-release-core.mjs";
import { serializePortableManifest } from "../scripts/portable/manifest.mjs";
import {
  hashComponentSet,
  hashFileSet,
  readReleaseInput,
  serializeStableJson,
} from "../scripts/portable/release-evidence.mjs";

const RELEASE_VERSION = "1.2.3";
const RELEASE_NODE_VERSION = "24.18.0";
const NODE_ARCHIVE = Buffer.from("fixture Node.js archive");
const NODE_SHASUMS = Buffer.from("signed fixture");
const NODE_KEYS = Buffer.from("fixture release keys");
const NODE_RUNTIME_ROOT = `node-v${RELEASE_NODE_VERSION}-win-x64`;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function runtimeComparisonValues({
  nodeBytes = Buffer.from("MZ fixture"),
  licenseBytes = Buffer.from("Node license\n"),
  portableFiles,
} = {}) {
  const node = Object.freeze({
    version: RELEASE_NODE_VERSION,
    platform: "win32",
    arch: "x64",
    archiveName: `${NODE_RUNTIME_ROOT}.zip`,
    archiveSha256: "a".repeat(64),
    signedShasumsSha256: "b".repeat(64),
    releaseKeyBundleSha256: "c".repeat(64),
  });
  const officialRuntime = Object.freeze({
    nodeExe: Object.freeze({
      archivePath: `${NODE_RUNTIME_ROOT}/node.exe`,
      size: nodeBytes.byteLength,
      sha256: sha256(nodeBytes),
    }),
    license: Object.freeze({
      archivePath: `${NODE_RUNTIME_ROOT}/LICENSE`,
      size: licenseBytes.byteLength,
      sha256: sha256(licenseBytes),
    }),
  });
  return {
    node,
    officialRuntime,
    portableFiles: portableFiles ?? Object.freeze([
      Object.freeze({ path: "runtime/LICENSE", size: licenseBytes.byteLength, sha256: sha256(licenseBytes) }),
      Object.freeze({ path: "runtime/node.exe", size: nodeBytes.byteLength, sha256: sha256(nodeBytes) }),
      Object.freeze({ path: "intent-planner.cmd", size: 1, sha256: "d".repeat(64) }),
    ]),
  };
}

function writeTarOctal(header, offset, length, value) {
  const encoded = Math.trunc(value).toString(8).padStart(length - 2, "0");
  header.write(`${encoded}\0 `, offset, length, "ascii");
}

function rawTarEntry({ name, nameBytes, data = "", type = "0", linkpath = "", declaredSize }) {
  const body = Buffer.from(data);
  const header = Buffer.alloc(512);
  if (nameBytes) Buffer.from(nameBytes).copy(header, 0, 0, 100);
  else header.write(name, 0, 100, "utf8");
  writeTarOctal(header, 100, 8, type === "5" ? 0o755 : 0o644);
  writeTarOctal(header, 108, 8, 0);
  writeTarOctal(header, 116, 8, 0);
  writeTarOctal(header, 124, 12, declaredSize ?? (type === "0" ? body.length : 0));
  writeTarOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header.write(type, 156, 1, "ascii");
  header.write(linkpath, 157, 100, "utf8");
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  writeTarOctal(header, 148, 8, [...header].reduce((sum, byte) => sum + byte, 0));
  const declared = declaredSize ?? (type === "0" ? body.length : 0);
  const stored = Buffer.concat([body.subarray(0, declared), Buffer.alloc((512 - (declared % 512)) % 512)]);
  return Buffer.concat([header, stored]);
}

async function makeRawTarball(tarballPath, entries, { gzip = true, trailer = true } = {}) {
  const tarBytes = Buffer.concat([
    ...entries.map(rawTarEntry),
    ...(trailer ? [Buffer.alloc(1024)] : []),
  ]);
  await writeFile(tarballPath, gzip ? gzipSync(tarBytes) : tarBytes);
}

async function makeZip(zipPath, entries) {
  const writer = new ZipWriter(new BlobWriter("application/zip"));
  for (const entry of entries) {
    await writer.add(entry.name, entry.directory ? undefined : new TextReader(entry.data ?? ""), {
      directory: entry.directory,
      ...(entry.options ?? {}),
    });
  }
  const blob = await writer.close();
  await writeFile(zipPath, new Uint8Array(await blob.arrayBuffer()));
}

function normalReleaseEntries() {
  return new Map([
    ["app/bin/cli.mjs", Buffer.from("export const cli = true;\n")],
    ["app/package-lock.json", Buffer.from('{"lockfileVersion":3}\n')],
    ["app/package.json", Buffer.from(`${JSON.stringify({ name: "intent-planner", version: RELEASE_VERSION }, null, 2)}\n`)],
    ["runtime/LICENSE", Buffer.from("Node license\n")],
    ["runtime/node.exe", Buffer.from("MZ fixture")],
  ]);
}

function normalBuildEvidence(entries) {
  const commonFiles = [...entries]
    .filter(([entryPath]) => entryPath.startsWith("app/")
      && entryPath !== "app/package-lock.json"
      && !entryPath.startsWith("app/node_modules/"))
    .map(([entryPath, bytes]) => ({
      path: entryPath.slice("app/".length),
      size: bytes.byteLength,
      sha256: sha256(bytes),
    }));
  return {
    schemaVersion: 1,
    intentPlannerVersion: RELEASE_VERSION,
    npmPackage: {
      name: "intent-planner",
      version: RELEASE_VERSION,
      commonContentSha256: hashFileSet(commonFiles),
    },
    node: {
      version: RELEASE_NODE_VERSION,
      platform: "win32",
      arch: "x64",
      archiveName: `node-v${RELEASE_NODE_VERSION}-win-x64.zip`,
      archiveSha256: "a".repeat(64),
      signedShasumsSha256: "b".repeat(64),
      releaseKeyBundleSha256: "c".repeat(64),
    },
    dependencies: {
      packageLockSha256: sha256(entries.get("app/package-lock.json")),
      componentsSha256: "d".repeat(64),
    },
  };
}

function registryPackage(name, version) {
  return {
    version,
    resolved: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
    integrity: "sha512-Zml4dHVyZQ==",
  };
}

function inventoryFixtureData() {
  return {
    packageValue: {
      name: "intent-planner",
      version: RELEASE_VERSION,
      dependencies: { alpha: "1.0.0" },
    },
    packageLock: {
      name: "intent-planner",
      version: RELEASE_VERSION,
      lockfileVersion: 3,
      packages: {
        "": { name: "intent-planner", version: RELEASE_VERSION, dependencies: { alpha: "1.0.0" } },
        "node_modules/alpha": registryPackage("alpha", "1.0.0"),
        "node_modules/shared": registryPackage("shared", "1.0.0"),
        "node_modules/alpha/node_modules/shared": registryPackage("shared", "2.0.0"),
      },
    },
    installed: {
      "app/node_modules/alpha/package.json": { name: "alpha", version: "1.0.0" },
      "app/node_modules/shared/package.json": { name: "shared", version: "1.0.0" },
      "app/node_modules/alpha/node_modules/shared/package.json": { name: "shared", version: "2.0.0" },
    },
    files: {},
  };
}

async function makeInventoryZip(zipPath, mutate = () => {}) {
  const fixtureData = inventoryFixtureData();
  await mutate(fixtureData);
  return makeReleaseZip(zipPath, (state) => {
    const packageBytes = Buffer.from(`${JSON.stringify(fixtureData.packageValue, null, 2)}\n`);
    const lockBytes = Buffer.from(`${JSON.stringify(fixtureData.packageLock, null, 2)}\n`);
    state.entries.set("app/package.json", packageBytes);
    state.entries.set("app/package-lock.json", lockBytes);
    for (const [entryPath, value] of Object.entries(fixtureData.installed)) {
      state.entries.set(entryPath, Buffer.from(`${JSON.stringify(value)}\n`));
    }
    for (const [entryPath, bytes] of Object.entries(fixtureData.files)) {
      state.entries.set(entryPath, Buffer.from(bytes));
    }
    const sortedEntries = [...state.entries].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    state.entries.clear();
    for (const [entryPath, bytes] of sortedEntries) state.entries.set(entryPath, bytes);
    const components = [...new Map(Object.entries(fixtureData.packageLock.packages)
      .filter(([lockPath, entry]) => lockPath && entry.dev !== true)
      .map(([lockPath, entry]) => ({
        name: lockPath.slice(lockPath.lastIndexOf("node_modules/") + "node_modules/".length),
        version: entry.version,
      }))
      .map((component) => [`${component.name}\0${component.version}`, component])).values()];
    const commonFiles = [...state.entries]
      .filter(([entryPath]) => entryPath.startsWith("app/")
        && entryPath !== "app/package-lock.json"
        && !entryPath.startsWith("app/node_modules/"))
      .map(([entryPath, bytes]) => ({
        path: entryPath.slice("app/".length),
        size: bytes.byteLength,
        sha256: sha256(bytes),
      }));
    state.setEvidence({
      ...state.evidence,
      npmPackage: {
        ...state.evidence.npmPackage,
        commonContentSha256: hashFileSet(commonFiles),
      },
      dependencies: {
        packageLockSha256: sha256(lockBytes),
        componentsSha256: fixtureData.componentsSha256 ?? hashComponentSet(components),
      },
    });
  });
}

function addLicenseFixture(data) {
  data.installed["app/node_modules/alpha/package.json"].license = "MIT";
  data.installed["app/node_modules/shared/package.json"].license = "SEE LICENSE IN COPYING.txt";
  data.installed["app/node_modules/alpha/node_modules/shared/package.json"].license = "Apache-2.0";
  data.files["app/node_modules/alpha/LICENSE"] = "Alpha license\r\n";
  data.files["app/node_modules/alpha/NOTICE.md"] = "Alpha notice\n";
  data.files["app/node_modules/shared/COPYING.txt"] = "Shared one license\n";
  data.files["app/node_modules/alpha/node_modules/shared/LICENSE.md"] = "Shared two license\n";
}

async function makeReleaseZip(zipPath, mutate = () => {}) {
  const entries = normalReleaseEntries();
  let evidence = normalBuildEvidence(entries);
  let evidenceBytes = serializeStableJson(evidence);
  entries.set("portable-build-evidence.json", evidenceBytes);
  const state = {
    entries,
    evidence,
    setEvidence(next) {
      evidence = next;
      evidenceBytes = Buffer.isBuffer(next) ? next : serializeStableJson(next);
      entries.set("portable-build-evidence.json", evidenceBytes);
    },
    omitManifest: false,
    mutateManifestBytes: (bytes) => bytes,
    mutateManifest: (manifest) => manifest,
  };
  await mutate(state);
  const files = [...entries].map(([entryPath, bytes]) => ({
    path: entryPath,
    size: bytes.byteLength,
    sha256: sha256(bytes),
  })).sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)));
  const manifest = state.mutateManifest({
    schemaVersion: 1,
    intentPlannerVersion: RELEASE_VERSION,
    nodeVersion: RELEASE_NODE_VERSION,
    platform: "win32",
    arch: "x64",
    entrypoint: "app/bin/cli.mjs",
    files,
  });
  if (!state.omitManifest) {
    entries.set("portable-manifest.json", state.mutateManifestBytes(serializePortableManifest(manifest)));
  }
  await makeZip(zipPath, [...entries].map(([name, bytes]) => ({ name: `intent-planner-v${RELEASE_VERSION}-win-x64-portable/${name}`, data: bytes.toString("utf8") })));
  return { entries, evidence };
}

async function patchZipRecords(zipPath, patchRecord) {
  const bytes = Buffer.from(await readFile(zipPath));
  for (let offset = 0; offset <= bytes.length - 4; offset += 1) {
    const signature = bytes.readUInt32LE(offset);
    if (signature === 0x04034b50 || signature === 0x02014b50) patchRecord(bytes, offset, signature);
  }
  await writeFile(zipPath, bytes);
}

function replaceRecordFilename(bytes, offset, signature, from, to) {
  const nameLengthOffset = signature === 0x04034b50 ? 26 : 28;
  const nameOffset = offset + (signature === 0x04034b50 ? 30 : 46);
  const length = bytes.readUInt16LE(offset + nameLengthOffset);
  if (bytes.subarray(nameOffset, nameOffset + length).toString("utf8") === from) {
    assert.equal(Buffer.byteLength(from), Buffer.byteLength(to));
    bytes.write(to, nameOffset, length, "utf8");
  }
}

async function fixture(t) {
  const base = await mkdtemp(path.join(os.tmpdir(), "portable-artifacts-test-"));
  const tempRoot = path.join(base, "work");
  await mkdir(tempRoot);
  t.after(() => rm(base, { recursive: true, force: true }));
  return { base, tempRoot, zipPath: path.join(base, "candidate.zip") };
}

async function releaseInputFixture(base, node = {}) {
  const cacheRoot = path.join(base, "cache");
  const releaseRoot = path.join(base, "release", RELEASE_VERSION);
  await mkdir(cacheRoot, { recursive: true });
  await mkdir(releaseRoot, { recursive: true });
  const paths = {
    archive: path.join(cacheRoot, `node-v${RELEASE_NODE_VERSION}-win-x64.zip`),
    shasums: path.join(cacheRoot, "SHASUMS256.txt.asc"),
    keys: path.join(cacheRoot, "release-keys.pgp"),
  };
  await writeFile(paths.archive, node.archive ?? NODE_ARCHIVE);
  await writeFile(paths.shasums, node.shasums ?? NODE_SHASUMS);
  await writeFile(paths.keys, node.keys ?? NODE_KEYS);
  for (const name of ["node-schedule.json", "vulnerability-snapshot.json", "vulnerability-decisions.json"]) {
    await writeFile(path.join(releaseRoot, name), "{}\n");
  }
  const inputPath = path.join(releaseRoot, "release-input.json");
  await writeFile(inputPath, serializeStableJson({
    schemaVersion: 1,
    intentPlannerVersion: RELEASE_VERSION,
    versionsFrozenAt: "2026-08-06T11:00:00Z",
    publicationDate: "2026-08-07",
    npmTarball: { path: "candidate.tgz", sha256: "1".repeat(64) },
    portableZip: { path: "candidate.zip", sha256: "2".repeat(64) },
    nodeReleaseEvidence: {
      archivePath: path.relative(releaseRoot, paths.archive),
      signedShasumsPath: path.relative(releaseRoot, paths.shasums),
      releaseKeyBundlePath: path.relative(releaseRoot, paths.keys),
    },
    nodeScheduleSnapshot: "node-schedule.json",
    vulnerabilitySnapshot: "vulnerability-snapshot.json",
    vulnerabilityDecisions: "vulnerability-decisions.json",
  }));
  return {
    releaseInput: await readReleaseInput(inputPath, { workspaceRoot: base, cacheRoot }),
    paths,
  };
}

async function verifiedNodeFixture(overrides = {}) {
  const archive = overrides.archive ?? NODE_ARCHIVE;
  const signedShasums = overrides.signedShasums ?? NODE_SHASUMS;
  const keyring = overrides.keyring ?? NODE_KEYS;
  const archiveSha256 = sha256(archive);
  const node = overrides.node ?? {};
  const config = {
    nodeVersion: node.version ?? RELEASE_NODE_VERSION,
    platform: node.platform ?? "win32",
    arch: node.arch ?? "x64",
    archiveName: node.archiveName ?? `node-v${node.version ?? RELEASE_NODE_VERSION}-win-x64.zip`,
    archiveSha256,
    releaseKeysSha256: sha256(keyring),
  };
  return verifyNodeReleaseTrustChainWithEvidenceCore({
    config,
    readArchive: async () => archive,
    readKeyring: async () => keyring,
    readSignedShasums: async () => signedShasums,
    runGpg: async ({ outputFile }) => {
      await writeFile(outputFile, `${archiveSha256}  ${config.archiveName}\n`);
      return { exitCode: 0, status: "[GNUPG:] VALIDSIG fixture\n" };
    },
  });
}

async function comparableInspections(t, {
  npmEntries = [
    { name: "package/bin/cli.mjs", data: "export const cli = true;\n" },
    { name: "package/package.json", data: `${JSON.stringify({ name: "intent-planner", version: RELEASE_VERSION }, null, 2)}\n` },
  ],
  mutateZip,
} = {}) {
  const { base, tempRoot, zipPath } = await fixture(t);
  const tarballPath = path.join(base, "candidate.tgz");
  await makeRawTarball(tarballPath, npmEntries);
  await makeReleaseZip(zipPath, mutateZip);
  const npmInspection = await inspectNpmTarball({ tarballPath, tempRoot });
  const portableInspection = await inspectPortableZip({ zipPath, tempRoot });
  await verifyPortableReleaseMetadata(portableInspection);
  t.after(async () => {
    await npmInspection.cleanup();
    await portableInspection.cleanup();
  });
  return { npmInspection, portableInspection };
}

function expectArchiveError(promise, code) {
  return assert.rejects(promise, (error) => {
    assert.ok(error instanceof PortableArchiveError);
    assert.equal(error.code, code);
    assert.equal(typeof error.stage, "string");
    assert.equal(typeof error.resource, "string");
    assert.ok(!error.message.includes(os.tmpdir()));
    return true;
  });
}

test("archive limits are fixed at the reviewed defaults", () => {
  assert.deepEqual(DEFAULT_ARCHIVE_LIMITS, {
    maxEntries: 100_000,
    maxTotalUncompressedBytes: 2 * 1024 ** 3,
    maxFileUncompressedBytes: 512 * 1024 ** 2,
    maxPathUtf8Bytes: 1024,
  });
  assert.ok(Object.isFrozen(DEFAULT_ARCHIVE_LIMITS));
});

test("streams a normal single-root ZIP into a dedicated directory", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  const unrelatedFile = path.join(tempRoot, "keep.txt");
  await writeFile(unrelatedFile, "keep");
  await makeZip(zipPath, [
    { name: "intent-planner/", directory: true },
    { name: "intent-planner/app/", directory: true },
    { name: "intent-planner/app/a.txt", data: "alpha" },
    { name: "intent-planner/app/empty.txt", data: "" },
  ]);

  const result = await inspectPortableZip({ zipPath, tempRoot });
  assert.equal(result.rootName, "intent-planner");
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.files));
  assert.deepEqual(result.files, [
    { path: "app/a.txt", size: 5, sha256: "8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8" },
    { path: "app/empty.txt", size: 0, sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
  ]);
  assert.equal((await readFile(path.join(result.extractionRoot, "app/a.txt"), "utf8")), "alpha");
  await result.cleanup();
  await result.cleanup();
  await assert.rejects(readFile(path.join(result.extractionRoot, "app/a.txt")));
  assert.equal(await readFile(unrelatedFile, "utf8"), "keep");
});

test("verifies the complete portable manifest before exposing protected release evidence", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  const { evidence } = await makeReleaseZip(zipPath);
  const inspection = await inspectPortableZip({ zipPath, tempRoot });
  const metadata = await verifyPortableReleaseMetadata(inspection);

  assert.ok(Object.isFrozen(metadata));
  assert.ok(Object.isFrozen(metadata.node));
  assert.ok(Object.isFrozen(metadata.dependencies));
  assert.equal(metadata.candidateVersion, RELEASE_VERSION);
  assert.equal(metadata.npmCommonContentSha256, evidence.npmPackage.commonContentSha256);
  assert.deepEqual(metadata.node, evidence.node);
  assert.deepEqual(metadata.dependencies, evidence.dependencies);
  assert.equal(metadata.manifest.intentPlannerVersion, RELEASE_VERSION);
  assert.equal(metadata.buildEvidence.intentPlannerVersion, RELEASE_VERSION);
  await inspection.cleanup();
});

test("builds a stable Node.js/direct/transitive inventory from every lock path and ZIP package", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeInventoryZip(zipPath, (data) => {
    data.packageLock.packages["node_modules/shared/node_modules/alpha"] = registryPackage("alpha", "1.0.0");
    data.installed["app/node_modules/shared/node_modules/alpha/package.json"] = { name: "alpha", version: "1.0.0" };
  });
  const inspection = await inspectPortableZip({ zipPath, tempRoot });
  const metadata = await verifyPortableReleaseMetadata(inspection);

  const inventory = await buildComponentInventory(inspection, metadata.buildEvidence);

  assert.equal(Object.isFrozen(inventory), true);
  assert.ok(inventory.every(Object.isFrozen));
  assert.deepEqual(inventory, [
    { kind: "runtime", name: "node", version: RELEASE_NODE_VERSION },
    { kind: "direct-dependency", name: "alpha", version: "1.0.0" },
    { kind: "transitive-dependency", name: "shared", version: "1.0.0" },
    { kind: "transitive-dependency", name: "shared", version: "2.0.0" },
  ]);
  await inspection.cleanup();
});

test("rejects missing, extra, renamed, and version-replaced installed dependency packages", async (t) => {
  const cases = [
    ["missing", (data) => { delete data.installed["app/node_modules/alpha/package.json"]; }, "app/node_modules/alpha/package.json", "alpha@1.0.0", "missing"],
    ["extra", (data) => { data.installed["app/node_modules/extra/package.json"] = { name: "extra", version: "4.0.0" }; }, "app/node_modules/extra/package.json", "not present in production lock", "extra@4.0.0"],
    ["renamed", (data) => { data.installed["app/node_modules/alpha/package.json"].name = "renamed"; }, "app/node_modules/alpha/package.json", "alpha", "renamed"],
    ["version", (data) => { data.installed["app/node_modules/alpha/package.json"].version = "9.0.0"; }, "app/node_modules/alpha/package.json", "1.0.0", "9.0.0"],
  ];
  for (const [name, mutate, resource, expected, actual] of cases) {
    const { base, tempRoot } = await fixture(t);
    const zipPath = path.join(base, `${name}-inventory.zip`);
    await makeInventoryZip(zipPath, mutate);
    const inspection = await inspectPortableZip({ zipPath, tempRoot });
    const metadata = await verifyPortableReleaseMetadata(inspection);
    await assert.rejects(buildComponentInventory(inspection, metadata.buildEvidence), (error) => {
      assert.ok(error instanceof PortableArchiveError);
      assert.equal(error.code, "COMPONENT_INVENTORY_MISMATCH");
      assert.equal(error.resource, resource);
      assert.equal(error.expected, expected);
      assert.equal(error.actual, actual);
      return true;
    }, name);
    await inspection.cleanup();
  }
});

test("rejects invalid fixed lock and protected component-set hash mismatch", async (t) => {
  const cases = [
    ["lock", (data) => { data.packageLock.packages[""].dependencies.alpha = "2.0.0"; }, "COMPONENT_LOCK_INVALID"],
    ["lock-root-version", (data) => { data.packageLock.packages[""].version = "1.2.4"; }, "COMPONENT_LOCK_INVALID"],
    ["hash", (data) => { data.componentsSha256 = "f".repeat(64); }, "COMPONENT_SET_HASH_MISMATCH"],
  ];
  for (const [name, mutate, code] of cases) {
    const { base, tempRoot } = await fixture(t);
    const zipPath = path.join(base, `${name}-inventory.zip`);
    await makeInventoryZip(zipPath, mutate);
    const inspection = await inspectPortableZip({ zipPath, tempRoot });
    const metadata = await verifyPortableReleaseMetadata(inspection);
    await assert.rejects(buildComponentInventory(inspection, metadata.buildEvidence), (error) => {
      assert.ok(error instanceof PortableArchiveError);
      assert.equal(error.code, code);
      assert.notEqual(error.expected, undefined);
      assert.notEqual(error.actual, undefined);
      return true;
    }, name);
    await inspection.cleanup();
  }
});

test("component inventory accepts only the same live inspection and its protected build evidence", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeInventoryZip(zipPath);
  const inspection = await inspectPortableZip({ zipPath, tempRoot });
  const metadata = await verifyPortableReleaseMetadata(inspection);
  await assert.rejects(
    buildComponentInventory(Object.freeze({ ...inspection }), metadata.buildEvidence),
    (error) => error.code === "INSPECTION_INVALID",
  );
  await assert.rejects(
    buildComponentInventory(inspection, Object.freeze({ ...metadata.buildEvidence })),
    (error) => error.code === "BUILD_EVIDENCE_INVALID",
  );
  await inspection.cleanup();
  await assert.rejects(
    buildComponentInventory(inspection, metadata.buildEvidence),
    (error) => error.code === "INSPECTION_INVALID",
  );
});

test("component inventory rereads each installed package through inspection integrity records", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeInventoryZip(zipPath);
  const inspection = await inspectPortableZip({ zipPath, tempRoot });
  const metadata = await verifyPortableReleaseMetadata(inspection);
  await writeFile(
    path.join(inspection.extractionRoot, "app/node_modules/alpha/package.json"),
    '{"name":"alpha","version":"9.0.0"}\n',
  );
  await assert.rejects(buildComponentInventory(inspection, metadata.buildEvidence), (error) => {
    assert.equal(error.code, "COMPONENT_METADATA_INVALID");
    assert.equal(error.stage, "inspection-file-integrity");
    assert.equal(error.resource, "app/node_modules/alpha/package.json");
    return true;
  });
  await inspection.cleanup();
});

test("collects frozen offline license records and preserves Node/npm license and NOTICE bytes", async (t) => {
  const { base, tempRoot, zipPath } = await fixture(t);
  await makeInventoryZip(zipPath, addLicenseFixture);
  const inspection = await inspectPortableZip({ zipPath, tempRoot });
  const metadata = await verifyPortableReleaseMetadata(inspection);
  const inventory = await buildComponentInventory(inspection, metadata.buildEvidence);
  const outputDir = path.join(base, "license-stage");
  await mkdir(outputDir);

  const index = await collectLicenseMaterials(inspection, inventory, outputDir);

  assert.equal(Object.isFrozen(index), true);
  assert.equal(Object.isFrozen(index.components), true);
  assert.ok(index.components.every((component) => Object.isFrozen(component)
    && Object.isFrozen(component.licenseFiles)
    && Object.isFrozen(component.noticeFiles)));
  assert.deepEqual(index, {
    schemaVersion: 1,
    components: [
      {
        kind: "runtime",
        name: "node",
        version: RELEASE_NODE_VERSION,
        licenseExpression: "MIT",
        licenseFiles: [`licenses/node/${RELEASE_NODE_VERSION}/LICENSE`],
        noticeFiles: [],
      },
      {
        kind: "direct-dependency",
        name: "alpha",
        version: "1.0.0",
        licenseExpression: "MIT",
        licenseFiles: ["licenses/npm/alpha/1.0.0/LICENSE"],
        noticeFiles: ["licenses/npm/alpha/1.0.0/NOTICE.md"],
      },
      {
        kind: "transitive-dependency",
        name: "shared",
        version: "1.0.0",
        licenseExpression: "SEE LICENSE IN COPYING.txt",
        licenseFiles: ["licenses/npm/shared/1.0.0/COPYING.txt"],
        noticeFiles: [],
      },
      {
        kind: "transitive-dependency",
        name: "shared",
        version: "2.0.0",
        licenseExpression: "Apache-2.0",
        licenseFiles: ["licenses/npm/shared/2.0.0/LICENSE.md"],
        noticeFiles: [],
      },
    ],
  });
  assert.deepEqual(await readFile(path.join(outputDir, `licenses/node/${RELEASE_NODE_VERSION}/LICENSE`)), Buffer.from("Node license\n"));
  assert.deepEqual(await readFile(path.join(outputDir, "licenses/npm/alpha/1.0.0/LICENSE")), Buffer.from("Alpha license\r\n"));
  assert.deepEqual(await readFile(path.join(outputDir, "licenses/npm/alpha/1.0.0/NOTICE.md")), Buffer.from("Alpha notice\n"));
  assert.deepEqual(JSON.parse(await readFile(path.join(outputDir, "licenses/index.json"), "utf8")), index);
  await inspection.cleanup();
});

test("rejects missing license declarations, broken SEE LICENSE IN references, and missing license bodies", async (t) => {
  const cases = [
    ["declaration", (data) => { addLicenseFixture(data); delete data.installed["app/node_modules/alpha/package.json"].license; }, "non-empty package.json license", "missing"],
    ["see-reference", (data) => { addLicenseFixture(data); data.installed["app/node_modules/shared/package.json"].license = "SEE LICENSE IN absent.txt"; }, "existing package-relative regular file", "absent.txt"],
    ["body", (data) => { addLicenseFixture(data); delete data.files["app/node_modules/alpha/node_modules/shared/LICENSE.md"]; }, "at least one LICENSE* or COPYING* file", "missing"],
  ];
  for (const [name, mutate, expected, actual] of cases) {
    const { base, tempRoot } = await fixture(t);
    const zipPath = path.join(base, `${name}-license.zip`);
    await makeInventoryZip(zipPath, mutate);
    const inspection = await inspectPortableZip({ zipPath, tempRoot });
    const metadata = await verifyPortableReleaseMetadata(inspection);
    const inventory = await buildComponentInventory(inspection, metadata.buildEvidence);
    const outputDir = path.join(base, `${name}-stage`);
    await mkdir(outputDir);
    await assert.rejects(collectLicenseMaterials(inspection, inventory, outputDir), (error) => {
      assert.ok(error instanceof PortableArchiveError);
      assert.equal(error.code, "LICENSE_MATERIAL_INVALID");
      assert.match(error.resource, /alpha@1\.0\.0|shared@1\.0\.0|shared@2\.0\.0/);
      assert.equal(error.expected, expected);
      assert.equal(error.actual, actual);
      return true;
    }, name);
    await inspection.cleanup();
  }
});

test("license collection accepts only its same live inspection and Task 4.3 inventory", async (t) => {
  const { base, tempRoot, zipPath } = await fixture(t);
  await makeInventoryZip(zipPath, addLicenseFixture);
  const inspection = await inspectPortableZip({ zipPath, tempRoot });
  const metadata = await verifyPortableReleaseMetadata(inspection);
  const inventory = await buildComponentInventory(inspection, metadata.buildEvidence);
  await assert.rejects(
    collectLicenseMaterials(inspection, Object.freeze([...inventory]), path.join(base, "forged-stage")),
    (error) => error.code === "COMPONENT_INVENTORY_INVALID",
  );
  await inspection.cleanup();
  await assert.rejects(
    collectLicenseMaterials(inspection, inventory, path.join(base, "cleaned-stage")),
    (error) => error.code === "INSPECTION_INVALID",
  );
});

test("writes the exact lowercase SHA-256 sidecar without changing the portable ZIP and verifies it", async (t) => {
  const { base } = await fixture(t);
  const zipPath = path.join(base, "intent-planner-portable.zip");
  const sidecarPath = path.join(base, "intent-planner-portable.zip.sha256");
  const zipBytes = Buffer.from("portable ZIP fixture\0bytes");
  await writeFile(zipPath, zipBytes);

  const record = await hashAndWriteSidecar(zipPath, sidecarPath);

  const expectedSha256 = sha256(zipBytes);
  assert.deepEqual(record, { filename: path.basename(zipPath), sha256: expectedSha256 });
  assert.equal(Object.isFrozen(record), true);
  assert.equal(await readFile(sidecarPath, "utf8"), `${expectedSha256}  ${path.basename(zipPath)}\n`);
  assert.deepEqual(await readFile(zipPath), zipBytes);
  const check = await verifySidecar(zipPath, sidecarPath);
  assert.equal(check.status, "pass");
  assert.equal(check.details.expectedSha256, expectedSha256);
  assert.equal(check.details.actualSha256, expectedSha256);
  assert.equal(Object.isFrozen(check), true);
  assert.equal(Object.isFrozen(check.details), true);
});

test("sidecar verification reports ZIP replacement and sidecar hash, filename, and format mismatches", async (t) => {
  const cases = [
    ["zip-byte", async ({ zipPath }) => { await writeFile(zipPath, "changed ZIP bytes"); }],
    ["hash", async ({ sidecarPath, filename }) => { await writeFile(sidecarPath, `${"0".repeat(64)}  ${filename}\n`); }],
    ["filename", async ({ sidecarPath, sha256: value }) => { await writeFile(sidecarPath, `${value}  other.zip\n`); }],
    ["format", async ({ sidecarPath, sha256: value, filename }) => { await writeFile(sidecarPath, `${value} ${filename}\r\n`); }],
  ];
  for (const [name, mutate] of cases) {
    const { base } = await fixture(t);
    const zipPath = path.join(base, `${name}.zip`);
    const sidecarPath = path.join(base, `${name}.zip.sha256`);
    const bytes = Buffer.from(`original ${name} ZIP`);
    await writeFile(zipPath, bytes);
    const record = await hashAndWriteSidecar(zipPath, sidecarPath);
    await mutate({ zipPath, sidecarPath, filename: record.filename, sha256: record.sha256 });

    const check = await verifySidecar(zipPath, sidecarPath);

    assert.equal(check.status, "fail", name);
    assert.equal(check.details.expectedFilename, path.basename(zipPath));
    assert.notEqual(check.details.expectedFormat, undefined);
    assert.notEqual(check.details.actualFormat, undefined);
    assert.notEqual(check.details.actualSha256, undefined);
  }
});

test("sidecar generation rejects the ZIP itself as its output and leaves ZIP bytes unchanged", async (t) => {
  const { base } = await fixture(t);
  const zipPath = path.join(base, "same-path.zip");
  const bytes = Buffer.from("do not overwrite");
  await writeFile(zipPath, bytes);
  await assert.rejects(hashAndWriteSidecar(zipPath, zipPath), (error) => {
    assert.ok(error instanceof PortableArchiveError);
    assert.equal(error.code, "SIDECAR_PATH_INVALID");
    assert.notEqual(error.expected, undefined);
    assert.notEqual(error.actual, undefined);
    return true;
  });
  assert.deepEqual(await readFile(zipPath), bytes);
});

test("sidecar generation never changes an existing staging file or a hard-link alias of the ZIP", async (t) => {
  const cases = [
    ["existing", async (sidecarPath) => { await writeFile(sidecarPath, "keep existing sidecar\n"); }],
    ["hard-link", async (sidecarPath, zipPath) => { await link(zipPath, sidecarPath); }],
  ];
  for (const [name, prepare] of cases) {
    const { base } = await fixture(t);
    const zipPath = path.join(base, `${name}.zip`);
    const sidecarPath = path.join(base, `${name}.zip.sha256`);
    const zipBytes = Buffer.from(`unchanged ${name} ZIP bytes`);
    await writeFile(zipPath, zipBytes);
    await prepare(sidecarPath, zipPath);
    const sidecarBytes = await readFile(sidecarPath);

    await assert.rejects(hashAndWriteSidecar(zipPath, sidecarPath), (error) => {
      assert.ok(error instanceof PortableArchiveError);
      assert.equal(error.code, "SIDECAR_WRITE_FAILED");
      return true;
    }, name);
    assert.deepEqual(await readFile(zipPath), zipBytes, `${name} ZIP`);
    assert.deepEqual(await readFile(sidecarPath), sidecarBytes, `${name} sidecar`);
  }
});

test("sidecar verification classifies noncanonical content without returning its raw bytes", async (t) => {
  const { base } = await fixture(t);
  const zipPath = path.join(base, "private-material.zip");
  const sidecarPath = path.join(base, "private-material.zip.sha256");
  const zipBytes = Buffer.from("private fixture ZIP");
  await writeFile(zipPath, zipBytes);
  const record = await hashAndWriteSidecar(zipPath, sidecarPath);
  const canonical = `${record.sha256}  ${record.filename}\n`;
  const secret = "SECRET_MARKER";
  const suffixSize = Buffer.byteLength(canonical) - 65;
  const noncanonical = `${record.sha256} ${secret}${"x".repeat(suffixSize - secret.length)}`;
  assert.equal(Buffer.byteLength(noncanonical), Buffer.byteLength(canonical));
  await writeFile(sidecarPath, noncanonical);

  const check = await verifySidecar(zipPath, sidecarPath);

  assert.equal(check.status, "fail");
  assert.equal(check.details.actualFormat, "noncanonical-format");
  assert.doesNotMatch(JSON.stringify(check), /SECRET_MARKER/);
});

test("injectable trust core result cannot cross the production preflight provenance boundary", async (t) => {
  const { base, tempRoot, zipPath } = await fixture(t);
  const archiveSha256 = sha256(NODE_ARCHIVE);
  const signedShasumsSha256 = sha256(NODE_SHASUMS);
  const releaseKeyBundleSha256 = sha256(NODE_KEYS);
  await makeReleaseZip(zipPath, (state) => state.setEvidence({
    ...state.evidence,
    node: {
      ...state.evidence.node,
      archiveSha256,
      signedShasumsSha256,
      releaseKeyBundleSha256,
    },
  }));
  const inspection = await inspectPortableZip({ zipPath, tempRoot });
  await verifyPortableReleaseMetadata(inspection);
  const { releaseInput } = await releaseInputFixture(base);
  const verifiedNodeRelease = await verifiedNodeFixture();

  await assert.rejects(
    bindVerifiedNodeReleaseForPreflight({ releaseInput, portableInspection: inspection, verifiedNodeRelease }),
    (error) => {
      assert.equal(error.code, "NODE_RELEASE_VERIFICATION_INVALID");
      assert.equal(error.expected, "production offline trust-chain result");
      assert.equal(error.actual, "unverified");
      return true;
    },
  );
  await assert.rejects(verifiedNodeRelease.archiveHandle.readBytes(), /consumed/);
  await inspection.cleanup();
});

test("rejects every Node.js evidence mismatch with expected and actual values", async () => {
  const fields = [
    ["version", { node: { version: "22.0.0" } }],
    ["platform", { node: { platform: "linux" } }],
    ["arch", { node: { arch: "arm64" } }],
    ["archiveName", { node: { archiveName: "node-v24.18.0-linux-x64.tar.xz" } }],
    ["archiveSha256", {}, "1".repeat(64)],
    ["signedShasumsSha256", {}, "2".repeat(64)],
    ["releaseKeyBundleSha256", {}, "3".repeat(64)],
  ];
  for (const [field, verifierOverrides, expectedOverride] of fields) {
    const expectedNode = {
      version: RELEASE_NODE_VERSION,
      platform: "win32",
      arch: "x64",
      archiveName: `node-v${RELEASE_NODE_VERSION}-win-x64.zip`,
      archiveSha256: sha256(NODE_ARCHIVE),
      signedShasumsSha256: sha256(NODE_SHASUMS),
      releaseKeyBundleSha256: sha256(NODE_KEYS),
    };
    if (expectedOverride !== undefined) expectedNode[field] = expectedOverride;
    const verifiedNodeRelease = await verifiedNodeFixture(verifierOverrides);

    assert.throws(
      () => assertNodeReleaseEvidenceMatches(expectedNode, verifiedNodeRelease.node),
      (error) => {
        assert.ok(error instanceof PortableArchiveError);
        assert.equal(error.code, "NODE_RELEASE_EVIDENCE_MISMATCH");
        assert.equal(error.resource, `Node.js ${field}`);
        assert.equal(error.expected, expectedNode[field]);
        assert.equal(error.actual, verifiedNodeRelease.node[field]);
        return true;
      },
      field,
    );
  }
});

test("rejects forged release input, inspection, and Node.js verification results", async (t) => {
  const { base, tempRoot, zipPath } = await fixture(t);
  await makeReleaseZip(zipPath, (state) => state.setEvidence({
    ...state.evidence,
    node: {
      ...state.evidence.node,
      archiveSha256: sha256(NODE_ARCHIVE),
      signedShasumsSha256: sha256(NODE_SHASUMS),
      releaseKeyBundleSha256: sha256(NODE_KEYS),
    },
  }));
  const inspection = await inspectPortableZip({ zipPath, tempRoot });
  await verifyPortableReleaseMetadata(inspection);
  const { releaseInput } = await releaseInputFixture(base);
  const verifiedNodeRelease = await verifiedNodeFixture();
  const cases = [
    { releaseInput: Object.freeze({ ...releaseInput }), portableInspection: inspection, verifiedNodeRelease },
    { releaseInput, portableInspection: Object.freeze({ ...inspection }), verifiedNodeRelease },
    { releaseInput, portableInspection: inspection, verifiedNodeRelease: Object.freeze({ ...verifiedNodeRelease, archiveHandle: Object.freeze({ ...verifiedNodeRelease.archiveHandle }) }) },
  ];
  for (const value of cases) {
    await assert.rejects(bindVerifiedNodeReleaseForPreflight(value), (error) => {
      assert.ok(error instanceof PortableArchiveError);
      assert.ok(["RELEASE_INPUT_INVALID", "INSPECTION_INVALID", "NODE_RELEASE_VERIFICATION_INVALID"].includes(error.code));
      assert.notEqual(error.expected, undefined);
      assert.notEqual(error.actual, undefined);
      return true;
    });
  }
  await inspection.cleanup();
});

test("maps the exact official Node.js runtime to the portable runtime records", () => {
  const result = compareNodeRuntimeContentCore(runtimeComparisonValues());

  assert.deepEqual(result, {
    archive: {
      name: `${NODE_RUNTIME_ROOT}.zip`,
      sha256: "a".repeat(64),
    },
    files: [
      {
        archivePath: `${NODE_RUNTIME_ROOT}/LICENSE`,
        portablePath: "runtime/LICENSE",
        size: Buffer.byteLength("Node license\n"),
        sha256: sha256(Buffer.from("Node license\n")),
      },
      {
        archivePath: `${NODE_RUNTIME_ROOT}/node.exe`,
        portablePath: "runtime/node.exe",
        size: Buffer.byteLength("MZ fixture"),
        sha256: sha256(Buffer.from("MZ fixture")),
      },
    ],
  });
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.archive));
  assert.ok(Object.isFrozen(result.files));
  assert.ok(result.files.every(Object.isFrozen));
});

test("rejects missing, extra, size-changed, and hash-replaced portable runtime files", () => {
  const normal = runtimeComparisonValues();
  const cases = [
    ["missing", normal.portableFiles.filter(({ path: filePath }) => filePath !== "runtime/LICENSE"), "runtime/LICENSE"],
    ["extra", [...normal.portableFiles, { path: "runtime/README.md", size: 1, sha256: "e".repeat(64) }], "runtime/README.md"],
    [String(normal.officialRuntime.nodeExe.size + 1), normal.portableFiles.map((file) => file.path === "runtime/node.exe" ? { ...file, size: file.size + 1 } : file), "runtime/node.exe"],
    ["f".repeat(64), normal.portableFiles.map((file) => file.path === "runtime/LICENSE" ? { ...file, sha256: "f".repeat(64) } : file), "runtime/LICENSE"],
  ];

  for (const [kind, portableFiles, resource] of cases) {
    assert.throws(
      () => compareNodeRuntimeContentCore({ ...normal, portableFiles }),
      (error) => {
        assert.ok(error instanceof PortableArchiveError);
        assert.equal(error.code, "NODE_RUNTIME_CONTENT_MISMATCH");
        assert.equal(error.resource, resource);
        assert.equal(error.actual, kind);
        return true;
      },
      kind,
    );
  }
});

test("rejects ambiguous official runtime mappings and invalid comparison records", () => {
  const normal = runtimeComparisonValues();
  const cases = [
    { ...normal, officialRuntime: { ...normal.officialRuntime, nodeExe: { ...normal.officialRuntime.nodeExe, archivePath: `${NODE_RUNTIME_ROOT}/bin/node.exe` } } },
    { ...normal, officialRuntime: { ...normal.officialRuntime, license: { ...normal.officialRuntime.license, archivePath: `other-root/LICENSE` } } },
    { ...normal, portableFiles: [...normal.portableFiles, normal.portableFiles.find(({ path: filePath }) => filePath === "runtime/node.exe")] },
  ];
  for (const value of cases) {
    assert.throws(
      () => compareNodeRuntimeContentCore(value),
      (error) => error instanceof PortableArchiveError && error.code === "NODE_RUNTIME_CONTENT_INVALID",
    );
  }
});

test("production runtime verification accepts only a Task 4.1 bound result", async () => {
  const forged = Object.freeze({
    archiveHandle: Object.freeze({ readBytes: async () => Buffer.from("forged") }),
    node: runtimeComparisonValues().node,
  });
  await assert.rejects(
    verifyNodeRuntimeContent(forged, Object.freeze({ files: [] })),
    (error) => {
      assert.ok(error instanceof PortableArchiveError);
      assert.equal(error.code, "NODE_RUNTIME_BINDING_INVALID");
      return true;
    },
  );
});

test("production Node.js reverify entry fails closed when a release-input evidence file is missing", async (t) => {
  const { base, tempRoot, zipPath } = await fixture(t);
  await makeReleaseZip(zipPath);
  const inspection = await inspectPortableZip({ zipPath, tempRoot });
  await verifyPortableReleaseMetadata(inspection);
  const { releaseInput, paths } = await releaseInputFixture(base);
  await rm(paths.keys);

  await assert.rejects(
    reverifyNodeReleaseForPreflight({ releaseInput, portableInspection: inspection, tempRoot }),
    (error) => {
      assert.equal(error.name, "NodeReleaseVerificationError");
      assert.equal(error.stage, "source-read");
      assert.equal(error.resource, "pubring.kbx");
      assert.equal(error.expected, "readable-fixed-cache-file");
      assert.equal(error.actual, "unavailable");
      assert.doesNotMatch(error.message, new RegExp(base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      return true;
    },
  );
  await inspection.cleanup();
});

test("rejects missing, noncanonical, duplicate-key, and incomplete portable manifests", async (t) => {
  const cases = [
    ["missing", (state) => { state.omitManifest = true; }],
    ["malformed", (state) => { state.mutateManifestBytes = () => Buffer.from('{"schemaVersion":'); }],
    ["noncanonical", (state) => { state.mutateManifestBytes = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\n$/, "")); }],
    ["duplicate-key", (state) => { state.mutateManifestBytes = (bytes) => Buffer.from(bytes.toString("utf8").replace('  "schemaVersion": 1,', '  "schemaVersion": 1,\n  "schemaVersion": 1,')); }],
    ["extra-file", (state) => { state.entries.set("extra.txt", Buffer.from("extra")); state.mutateManifest = (manifest) => ({ ...manifest, files: manifest.files.filter(({ path: filePath }) => filePath !== "extra.txt") }); }],
    ["missing-file", (state) => { state.mutateManifest = (manifest) => ({ ...manifest, files: [...manifest.files, { path: "missing.txt", size: 1, sha256: "e".repeat(64) }].sort((left, right) => left.path < right.path ? -1 : 1) }); }],
    ["wrong-size", (state) => { state.mutateManifest = (manifest) => ({ ...manifest, files: manifest.files.map((file) => file.path === "app/package.json" ? { ...file, size: file.size + 1 } : file) }); }],
    ["wrong-hash", (state) => { state.mutateManifest = (manifest) => ({ ...manifest, files: manifest.files.map((file) => file.path === "app/package.json" ? { ...file, sha256: "f".repeat(64) } : file) }); }],
    ["replaced-evidence", (state) => { state.mutateManifest = (manifest) => ({ ...manifest, files: manifest.files.map((file) => file.path === "portable-build-evidence.json" ? { ...file, sha256: "f".repeat(64) } : file) }); }],
  ];
  for (const [name, mutate] of cases) {
    const { base, tempRoot } = await fixture(t);
    const zipPath = path.join(base, `${name}.zip`);
    await makeReleaseZip(zipPath, mutate);
    const inspection = await inspectPortableZip({ zipPath, tempRoot });
    await expectArchiveError(verifyPortableReleaseMetadata(inspection), "MANIFEST_INVALID");
    await inspection.cleanup();
  }
});

test("reads build evidence only after the manifest file set passes", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeReleaseZip(zipPath, (state) => {
    state.setEvidence(Buffer.from('{"schemaVersion":'));
    state.mutateManifest = (manifest) => ({
      ...manifest,
      files: manifest.files.map((file) => file.path === "app/package.json"
        ? { ...file, sha256: "f".repeat(64) }
        : file),
    });
  });
  const inspection = await inspectPortableZip({ zipPath, tempRoot });
  await assert.rejects(verifyPortableReleaseMetadata(inspection), (error) => {
    assert.ok(error instanceof PortableArchiveError);
    assert.equal(error.code, "MANIFEST_INVALID");
    assert.equal(error.stage, "manifest-file-integrity");
    return true;
  });
  await inspection.cleanup();
});

test("rejects protected build evidence that is missing, malformed, or contradicts ZIP content", async (t) => {
  const cases = [
    ["missing", (state) => { state.entries.delete("portable-build-evidence.json"); }],
    ["malformed", (state) => { state.setEvidence(Buffer.from('{"schemaVersion":')); }],
    ["duplicate-key", (state) => { state.setEvidence(Buffer.from(serializeStableJson(state.evidence).toString("utf8").replace('  "schemaVersion": 1\n', '  "schemaVersion": 1,\n  "schemaVersion": 1\n'))); }],
    ["schema", (state) => { state.setEvidence({ ...state.evidence, schemaVersion: 2 }); }],
    ["archive-name", (state) => { state.setEvidence({ ...state.evidence, node: { ...state.evidence.node, archiveName: "node-other.zip" } }); }],
    ["node-version", (state) => { state.setEvidence({ ...state.evidence, node: { ...state.evidence.node, version: "22.1.0", archiveName: "node-v22.1.0-win-x64.zip" } }); }],
    ["version", (state) => { state.setEvidence({ ...state.evidence, intentPlannerVersion: "1.2.4", npmPackage: { ...state.evidence.npmPackage, version: "1.2.4" } }); }],
    ["package-version", (state) => { state.entries.set("app/package.json", Buffer.from('{"name":"intent-planner","version":"1.2.4"}\n')); }],
    ["common-hash", (state) => { state.setEvidence({ ...state.evidence, npmPackage: { ...state.evidence.npmPackage, commonContentSha256: "f".repeat(64) } }); }],
    ["lock-hash", (state) => { state.setEvidence({ ...state.evidence, dependencies: { ...state.evidence.dependencies, packageLockSha256: "f".repeat(64) } }); }],
  ];
  for (const [name, mutate] of cases) {
    const { base, tempRoot } = await fixture(t);
    const zipPath = path.join(base, `${name}.zip`);
    await makeReleaseZip(zipPath, mutate);
    const inspection = await inspectPortableZip({ zipPath, tempRoot });
    await assert.rejects(verifyPortableReleaseMetadata(inspection), (error) => {
      assert.ok(error instanceof PortableArchiveError);
      assert.ok(["BUILD_EVIDENCE_INVALID", "BUILD_EVIDENCE_MISSING", "RELEASE_CONTENT_MISMATCH"].includes(error.code));
      return true;
    }, name);
    await inspection.cleanup();
  }
});

test("rejects release metadata verification after inspection cleanup", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeReleaseZip(zipPath);
  const inspection = await inspectPortableZip({ zipPath, tempRoot });
  await inspection.cleanup();
  await expectArchiveError(verifyPortableReleaseMetadata(inspection), "INSPECTION_INVALID");
});

test("rejects metadata bytes changed after ZIP inspection before parsing them", async (t) => {
  const cases = [
    ["manifest-size", "portable-manifest.json", "MANIFEST_INVALID", "size"],
    ["manifest-hash", "portable-manifest.json", "MANIFEST_INVALID", "hash"],
    ["evidence-hash", "portable-build-evidence.json", "BUILD_EVIDENCE_INVALID", "hash"],
    ["package-hash", "app/package.json", "RELEASE_CONTENT_MISMATCH", "hash"],
  ];
  for (const [name, relativePath, code, mutation] of cases) {
    const { base, tempRoot } = await fixture(t);
    const zipPath = path.join(base, `${name}-changed.zip`);
    await makeReleaseZip(zipPath);
    const inspection = await inspectPortableZip({ zipPath, tempRoot });
    const filename = path.join(inspection.extractionRoot, ...relativePath.split("/"));
    const replacement = Buffer.from(await readFile(filename));
    if (mutation === "hash") replacement[Math.floor(replacement.byteLength / 2)] ^= 1;
    await writeFile(filename, mutation === "size" ? replacement.subarray(1) : replacement);
    await assert.rejects(verifyPortableReleaseMetadata(inspection), (error) => {
      assert.ok(error instanceof PortableArchiveError);
      assert.equal(error.code, code);
      assert.equal(error.stage, "inspection-file-integrity");
      return true;
    }, relativePath);
    await inspection.cleanup();
  }
});

test("rejects unsafe paths, collisions, and invalid roots before extraction", async (t) => {
  const unsafeCases = [
    ["PATH_ABSOLUTE", [{ name: "/root/a", data: "x" }]],
    ["PATH_ABSOLUTE", [{ name: "C:/root/a", data: "x" }]],
    ["PATH_ABSOLUTE", [{ name: "//server/share/a", data: "x" }]],
    ["PATH_BACKSLASH", [{ name: "root/a\\b", data: "x" }]],
    ["PATH_DOT_SEGMENT", [{ name: "root/./a", data: "x" }]],
    ["PATH_PARENT_SEGMENT", [{ name: "root/../a", data: "x" }]],
    ["PATH_EMPTY_SEGMENT", [{ name: "root/a//b", data: "x" }]],
    ["PATH_TRAILING_DOT_SPACE", [{ name: "root/a. /b", data: "x" }]],
    ["PATH_WINDOWS_RESERVED", [{ name: "root/CON.txt", data: "x" }]],
    ["PATH_ADS", [{ name: "root/a:b", data: "x" }]],
    ["PATH_WINDOWS_CHARACTER", [{ name: "root/bad?.txt", data: "x" }]],
    ["PATH_WINDOWS_CHARACTER", [{ name: "root/bad<.txt", data: "x" }]],
    ["PATH_CONTROL_CHARACTER", [{ name: "root/a\u0001b", data: "x" }]],
    ["PATH_WINDOWS_RESERVED", [{ name: "root/CLOCK$", data: "x" }]],
    ["PATH_WINDOWS_RESERVED", [{ name: "root/CONIN$", data: "x" }]],
    ["PATH_WINDOWS_RESERVED", [{ name: "root/CONOUT$.txt", data: "x" }]],
    ["PATH_WINDOWS_RESERVED", [{ name: "root/COM\u00b9.txt", data: "x" }]],
    ["MULTIPLE_ROOTS", [{ name: "one/a", data: "x" }, { name: "two/b", data: "x" }]],
    ["PATH_CASE_COLLISION", [{ name: "root/A", data: "x" }, { name: "root/a", data: "y" }]],
    ["PATH_UNICODE_COLLISION", [{ name: "root/\u00e9", data: "x" }, { name: "root/e\u0301", data: "y" }]],
    ["PATH_PREFIX_COLLISION", [{ name: "root/a", data: "x" }, { name: "root/a/b", data: "y" }]],
  ];
  for (const [code, entries] of unsafeCases) {
    const { base, tempRoot } = await fixture(t);
    const zipPath = path.join(base, `${code}.zip`);
    await makeZip(zipPath, entries);
    await expectArchiveError(inspectPortableZip({ zipPath, tempRoot }), code);
  }
});

test("rejects exact duplicate paths represented by separate ZIP records", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeZip(zipPath, [{ name: "root/a", data: "x" }, { name: "root/b", data: "y" }]);
  await patchZipRecords(zipPath, (bytes, offset, signature) => {
    replaceRecordFilename(bytes, offset, signature, "root/b", "root/a");
  });
  await assert.rejects(inspectPortableZip({ zipPath, tempRoot }), (error) => {
    assert.ok(error instanceof PortableArchiveError);
    assert.ok(["PATH_DUPLICATE", "ARCHIVE_METADATA_INVALID"].includes(error.code));
    return true;
  });
});

test("rejects malformed raw UTF-8 and local/central filename disagreement", async (t) => {
  const cases = [
    ["RAW_FILENAME_INVALID", false, (bytes, offset, signature) => {
      const nameLength = bytes.readUInt16LE(offset + (signature === 0x04034b50 ? 26 : 28));
      const nameOffset = offset + (signature === 0x04034b50 ? 30 : 46);
      if (bytes.subarray(nameOffset, nameOffset + nameLength).toString("utf8") === "root/a") {
        bytes[nameOffset + nameLength - 1] = 0xff;
      }
    }],
    ["LOCAL_CENTRAL_MISMATCH", true, (bytes, offset, signature) => {
      if (signature !== 0x04034b50) return;
      const nameLength = bytes.readUInt16LE(offset + 26);
      const nameOffset = offset + 30;
      if (bytes.subarray(nameOffset, nameOffset + nameLength).toString("utf8") === "root/") bytes[nameOffset] = "s".charCodeAt(0);
    }],
  ];
  for (const [index, [code, directory, patch]] of cases.entries()) {
    const { base, tempRoot } = await fixture(t);
    const zipPath = path.join(base, `${code}-${index}.zip`);
    await makeZip(zipPath, [{ name: directory ? "root/" : "root/a", directory, data: "x" }]);
    await patchZipRecords(zipPath, patch);
    await expectArchiveError(inspectPortableZip({ zipPath, tempRoot }), code);
  }
});

test("accepts an unambiguous ASCII filename without the UTF-8 flag", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeZip(zipPath, [{ name: "root/ascii.txt", data: "ok" }]);
  await patchZipRecords(zipPath, (bytes, offset, signature) => {
    const field = offset + (signature === 0x04034b50 ? 6 : 8);
    bytes.writeUInt16LE(bytes.readUInt16LE(field) & ~0x0800, field);
  });
  const result = await inspectPortableZip({ zipPath, tempRoot });
  assert.deepEqual(result.files.map(({ path: filePath }) => filePath), ["ascii.txt"]);
  await result.cleanup();
});

test("accepts both signed and unsigned data descriptors", async (t) => {
  for (const [index, dataDescriptorSignature] of [true, false].entries()) {
    const { base, tempRoot } = await fixture(t);
    const zipPath = path.join(base, `descriptor-${index}.zip`);
    await makeZip(zipPath, [{ name: "root/a.txt", data: "ok", options: { dataDescriptorSignature } }]);
    const result = await inspectPortableZip({ zipPath, tempRoot });
    assert.equal(result.files[0].path, "a.txt");
    await result.cleanup();
  }
});

test("rejects a malformed Unicode path extra field", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeZip(zipPath, [{
    name: "root/a.txt",
    data: "ok",
    options: { extraField: new Map([[0x7075, new Uint8Array([2, 0, 0, 0, 0, 0x61])]]) },
  }]);
  await expectArchiveError(inspectPortableZip({ zipPath, tempRoot }), "UNICODE_PATH_INVALID");
});

test("rejects entry, file, total, and path limits using small limits", async (t) => {
  const cases = [
    ["ENTRY_LIMIT", [{ name: "root/a", data: "x" }, { name: "root/b", data: "y" }], { maxEntries: 1 }],
    ["FILE_SIZE_LIMIT", [{ name: "root/a", data: "xx" }], { maxFileUncompressedBytes: 1 }],
    ["TOTAL_SIZE_LIMIT", [{ name: "root/a", data: "x" }, { name: "root/b", data: "y" }], { maxTotalUncompressedBytes: 1 }],
    ["PATH_LENGTH_LIMIT", [{ name: "root/abcd", data: "x" }], { maxPathUtf8Bytes: 5 }],
  ];
  for (const [code, entries, limits] of cases) {
    const { base, tempRoot } = await fixture(t);
    const zipPath = path.join(base, `${code}.zip`);
    await makeZip(zipPath, entries);
    await expectArchiveError(inspectPortableZip({ zipPath, tempRoot, limits }), code);
  }
});

test("rejects encrypted and Unix special entries", async (t) => {
  const { base, tempRoot } = await fixture(t);
  const encrypted = path.join(base, "encrypted.zip");
  await makeZip(encrypted, [{ name: "root/a", data: "secret", options: { password: "p" } }]);
  await expectArchiveError(inspectPortableZip({ zipPath: encrypted, tempRoot }), "ENCRYPTED_ENTRY");

  for (const [name, unixMode] of [["symlink", 0o120777], ["fifo", 0o010644], ["device", 0o060644]]) {
    const zipPath = path.join(base, `${name}.zip`);
    await makeZip(zipPath, [{ name: "root/a", data: "x", options: { unixMode } }]);
    await expectArchiveError(inspectPortableZip({ zipPath, tempRoot }), "UNSUPPORTED_ENTRY_TYPE");
  }
});

test("rejects unsupported compression, flags, CRC, and declared-size mismatch", async (t) => {
  const cases = [
    ["UNSUPPORTED_COMPRESSION", (bytes, offset, signature) => bytes.writeUInt16LE(99, offset + (signature === 0x04034b50 ? 8 : 10))],
    ["UNSUPPORTED_FLAGS", (bytes, offset, signature) => {
      const field = offset + (signature === 0x04034b50 ? 6 : 8);
      bytes.writeUInt16LE(bytes.readUInt16LE(field) | 0x10, field);
    }],
    ["LOCAL_CENTRAL_MISMATCH", (bytes, offset, signature) => bytes.writeUInt32LE(2, offset + (signature === 0x04034b50 ? 22 : 24))],
    ["LOCAL_CENTRAL_MISMATCH", (bytes, offset, signature) => bytes.writeUInt32LE(0x12345678, offset + (signature === 0x04034b50 ? 14 : 16))],
  ];
  for (const [index, [code, patch]] of cases.entries()) {
    const { base, tempRoot } = await fixture(t);
    const zipPath = path.join(base, `${code}-${index}.zip`);
    await makeZip(zipPath, [{ name: "root/a", data: "x", options: { level: 0 } }]);
    await patchZipRecords(zipPath, patch);
    await assert.rejects(inspectPortableZip({ zipPath, tempRoot }), (error) => {
      assert.ok(error instanceof PortableArchiveError, `case ${index}`);
      assert.equal(error.code, code, `case ${index}`);
      return true;
    }, `case ${index} must reject`);
    assert.deepEqual(await readdir(tempRoot), []);
  }
});

test("rejects a directory whose local and central CRC agree but not with its data", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeZip(zipPath, [{ name: "root/", directory: true, options: { dataDescriptorSignature: true } }]);
  await patchZipRecords(zipPath, (bytes, offset, signature) => {
    bytes.writeUInt32LE(0x12345678, offset + (signature === 0x04034b50 ? 14 : 16));
  });
  const bytes = Buffer.from(await readFile(zipPath));
  for (let offset = 0; offset <= bytes.length - 16; offset += 1) {
    if (bytes.readUInt32LE(offset) === 0x08074b50) bytes.writeUInt32LE(0x12345678, offset + 4);
  }
  await writeFile(zipPath, bytes);
  await expectArchiveError(inspectPortableZip({ zipPath, tempRoot }), "ENTRY_STREAM_INVALID");
  assert.deepEqual(await readdir(tempRoot), []);
});

test("rejects an unsupported flag present only in the central directory", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeZip(zipPath, [{ name: "root/a", data: "x" }]);
  await patchZipRecords(zipPath, (bytes, offset, signature) => {
    if (signature !== 0x02014b50) return;
    const field = offset + 8;
    bytes.writeUInt16LE(bytes.readUInt16LE(field) | 0x10, field);
  });
  await expectArchiveError(inspectPortableZip({ zipPath, tempRoot }), "UNSUPPORTED_FLAGS");
});

test("rejects unknown archive limit keys", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeZip(zipPath, [{ name: "root/a", data: "x" }]);
  await expectArchiveError(inspectPortableZip({ zipPath, tempRoot, limits: { maxEntriez: 1 } }), "LIMITS_INVALID");
});

test("rejects an input whose identity changes during inspection and cleans partial output", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeZip(zipPath, [{ name: "root/large.txt", data: "x".repeat(8 * 1024 * 1024) }]);
  let timer;
  const startMutating = setTimeout(() => {
    timer = setInterval(() => { void utimes(zipPath, new Date(), new Date()); }, 1);
  }, 5);
  try {
    await expectArchiveError(inspectPortableZip({ zipPath, tempRoot }), "INPUT_MUTATED");
  } finally {
    clearTimeout(startMutating);
    clearInterval(timer);
  }
  assert.deepEqual(await readdir(tempRoot), []);
});

test("cleanup can retry after a transient filesystem failure", async (t) => {
  const { tempRoot, zipPath } = await fixture(t);
  await makeZip(zipPath, [{ name: "root/a.txt", data: "owned" }]);
  const result = await inspectPortableZip({ zipPath, tempRoot });
  await chmod(tempRoot, 0o500);
  try {
    await assert.rejects(result.cleanup());
  } finally {
    await chmod(tempRoot, 0o700);
  }
  await result.cleanup();
  await assert.rejects(access(result.extractionRoot));
});

test("rejects non-absolute and symlink input boundaries", async (t) => {
  const { base, tempRoot, zipPath } = await fixture(t);
  await makeZip(zipPath, [{ name: "root/a", data: "x" }]);
  await expectArchiveError(inspectPortableZip({ zipPath: "candidate.zip", tempRoot }), "INPUT_PATH_INVALID");
  await expectArchiveError(inspectPortableZip({ zipPath, tempRoot: "work" }), "TEMP_ROOT_INVALID");
  const link = path.join(base, "candidate-link.zip");
  await symlink(zipPath, link);
  await expectArchiveError(inspectPortableZip({ zipPath: link, tempRoot }), "INPUT_PATH_INVALID");
});

test("streams a normal npm tarball under package/ into a comparable file set", async (t) => {
  const { base, tempRoot } = await fixture(t);
  const tarballPath = path.join(base, "candidate.tgz");
  const unrelatedFile = path.join(tempRoot, "keep.txt");
  await writeFile(unrelatedFile, "keep");
  await makeRawTarball(tarballPath, [
    { name: "package/", type: "5" },
    { name: "package/lib/", type: "5" },
    { name: "package/lib/a.txt", data: "alpha" },
    { name: "package/empty.txt", data: "" },
  ]);

  const result = await inspectNpmTarball({ tarballPath, tempRoot });
  assert.equal(result.rootName, "package");
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.files));
  assert.deepEqual(result.files, [
    { path: "empty.txt", size: 0, sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
    { path: "lib/a.txt", size: 5, sha256: "8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8" },
  ]);
  assert.equal(await readFile(path.join(result.extractionRoot, "lib/a.txt"), "utf8"), "alpha");
  await result.cleanup();
  await result.cleanup();
  assert.equal(await readFile(unrelatedFile, "utf8"), "keep");
});

test("reads a gzip tarball produced through the pinned tar library", async (t) => {
  const { base, tempRoot } = await fixture(t);
  const source = path.join(base, "source");
  const tarballPath = path.join(base, "library.tgz");
  await mkdir(source);
  await writeFile(path.join(source, "package.json"), "{\"name\":\"fixture\"}\n");
  await createTar({ cwd: source, file: tarballPath, gzip: true, prefix: "package", portable: true }, ["package.json"]);
  const result = await inspectNpmTarball({ tarballPath, tempRoot });
  assert.deepEqual(result.files.map(({ path: filePath }) => filePath), ["package.json"]);
  await result.cleanup();
});

test("rejects npm tarball links, unknown types, and roots other than package", async (t) => {
  const cases = [
    ["UNSUPPORTED_ENTRY_TYPE", [{ name: "package/link", type: "2", linkpath: "target" }]],
    ["UNSUPPORTED_ENTRY_TYPE", [{ name: "package/hard", type: "1", linkpath: "package/target" }]],
    ["UNSUPPORTED_ENTRY_TYPE", [{ name: "package/device", type: "3" }]],
    ["UNSUPPORTED_ENTRY_TYPE", [{ name: "package/unknown", type: "7" }]],
    ["ROOT_INVALID", [{ name: "other/a", data: "x" }]],
    ["MULTIPLE_ROOTS", [{ name: "package/a", data: "x" }, { name: "other/b", data: "y" }]],
    ["ROOT_NOT_DIRECTORY", [{ name: "package", data: "x" }]],
  ];
  for (const [index, [code, entries]] of cases.entries()) {
    const { base, tempRoot } = await fixture(t);
    const tarballPath = path.join(base, `unsafe-type-${index}.tgz`);
    await makeRawTarball(tarballPath, entries);
    await expectArchiveError(inspectNpmTarball({ tarballPath, tempRoot }), code);
    assert.deepEqual(await readdir(tempRoot), []);
  }
});

test("applies common path and collision rules to npm tarballs", async (t) => {
  const cases = [
    ["PATH_ABSOLUTE", [{ name: "/package/a", data: "x" }]],
    ["PATH_PARENT_SEGMENT", [{ name: "package/../a", data: "x" }]],
    ["PATH_DUPLICATE", [{ name: "package/a", data: "x" }, { name: "package/a", data: "y" }]],
    ["PATH_CASE_COLLISION", [{ name: "package/A", data: "x" }, { name: "package/a", data: "y" }]],
    ["PATH_UNICODE_COLLISION", [{ name: "package/é", data: "x" }, { name: "package/é", data: "y" }]],
    ["PATH_WINDOWS_RESERVED", [{ name: "package/CON.txt", data: "x" }]],
    ["PATH_PREFIX_COLLISION", [{ name: "package/a", data: "x" }, { name: "package/a/b", data: "y" }]],
  ];
  for (const [index, [code, entries]] of cases.entries()) {
    const { base, tempRoot } = await fixture(t);
    const tarballPath = path.join(base, `unsafe-path-${index}.tgz`);
    await makeRawTarball(tarballPath, entries);
    await expectArchiveError(inspectNpmTarball({ tarballPath, tempRoot }), code);
  }
});

test("accepts a validly encoded replacement character in an npm tar path", async (t) => {
  const { base, tempRoot } = await fixture(t);
  const tarballPath = path.join(base, "replacement-character.tgz");
  await makeRawTarball(tarballPath, [{ name: "package/\ufffd.txt", data: "valid" }]);
  const result = await inspectNpmTarball({ tarballPath, tempRoot });
  assert.deepEqual(result.files.map(({ path: filePath }) => filePath), ["\ufffd.txt"]);
  await result.cleanup();
});

test("normalizes npm tar backslashes before applying path and collision rules", async (t) => {
  const { base, tempRoot } = await fixture(t);
  const acceptedPath = path.join(base, "backslash.tgz");
  await makeRawTarball(acceptedPath, [{ name: "package\\a\\b.txt", data: "ok" }]);
  const accepted = await inspectNpmTarball({ tarballPath: acceptedPath, tempRoot });
  assert.deepEqual(accepted.files.map(({ path: filePath }) => filePath), ["a/b.txt"]);
  await accepted.cleanup();

  const cases = [
    ["PATH_PARENT_SEGMENT", [{ name: "package\\..\\outside", data: "x" }]],
    ["PATH_ABSOLUTE", [{ name: "C:\\package\\a", data: "x" }]],
    ["PATH_ABSOLUTE", [{ name: "\\\\server\\share\\a", data: "x" }]],
    ["PATH_DUPLICATE", [{ name: "package\\a\\b", data: "x" }, { name: "package/a/b", data: "y" }]],
  ];
  for (const [index, [code, entries]] of cases.entries()) {
    const tarballPath = path.join(base, `backslash-unsafe-${index}.tgz`);
    await makeRawTarball(tarballPath, entries);
    await expectArchiveError(inspectNpmTarball({ tarballPath, tempRoot }), code);
  }
});

test("enforces npm tarball entry, file, total, and path limits", async (t) => {
  const cases = [
    ["ENTRY_LIMIT", [{ name: "package/a", data: "x" }, { name: "package/b", data: "y" }], { maxEntries: 1 }],
    ["FILE_SIZE_LIMIT", [{ name: "package/a", data: "xx" }], { maxFileUncompressedBytes: 1 }],
    ["TOTAL_SIZE_LIMIT", [{ name: "package/a", data: "x" }, { name: "package/b", data: "y" }], { maxTotalUncompressedBytes: 1 }],
    ["PATH_LENGTH_LIMIT", [{ name: "package/abcd", data: "x" }], { maxPathUtf8Bytes: 5 }],
  ];
  for (const [index, [code, entries, limits]] of cases.entries()) {
    const { base, tempRoot } = await fixture(t);
    const tarballPath = path.join(base, `limit-${index}.tgz`);
    await makeRawTarball(tarballPath, entries);
    await expectArchiveError(inspectNpmTarball({ tarballPath, tempRoot, limits }), code);
  }
});

test("rejects truncated or malformed npm tarballs without leaving partial output", async (t) => {
  for (const [index, bytes] of [Buffer.from("not a tarball"), gzipSync(Buffer.alloc(513, 1))].entries()) {
    const { base, tempRoot } = await fixture(t);
    const tarballPath = path.join(base, `broken-${index}.tgz`);
    await writeFile(tarballPath, bytes);
    await expectArchiveError(inspectNpmTarball({ tarballPath, tempRoot }), "TAR_PARSE_INVALID");
    assert.deepEqual(await readdir(tempRoot), []);
  }
});

test("rejects an npm tarball whose identity changes during inspection", async (t) => {
  const { base, tempRoot } = await fixture(t);
  const tarballPath = path.join(base, "changing.tgz");
  await makeRawTarball(tarballPath, [{ name: "package/large.txt", data: "x".repeat(8 * 1024 * 1024) }], { gzip: false });
  let timer;
  const startMutating = setTimeout(() => {
    timer = setInterval(() => { void utimes(tarballPath, new Date(), new Date()); }, 1);
  }, 0);
  try {
    await expectArchiveError(inspectNpmTarball({ tarballPath, tempRoot }), "INPUT_MUTATED");
  } finally {
    clearTimeout(startMutating);
    clearInterval(timer);
  }
  assert.deepEqual(await readdir(tempRoot), []);
});

test("rejects unsafe npm tarball input boundaries", async (t) => {
  const { base, tempRoot } = await fixture(t);
  const tarballPath = path.join(base, "candidate.tgz");
  await makeRawTarball(tarballPath, [{ name: "package/a", data: "x" }]);
  await expectArchiveError(inspectNpmTarball({ tarballPath: "candidate.tgz", tempRoot }), "INPUT_PATH_INVALID");
  await expectArchiveError(inspectNpmTarball({ tarballPath, tempRoot: "work" }), "TEMP_ROOT_INVALID");
  const link = path.join(base, "candidate-link.tgz");
  await symlink(tarballPath, link);
  await expectArchiveError(inspectNpmTarball({ tarballPath: link, tempRoot }), "INPUT_PATH_INVALID");
});

test("compares every npm regular file with the portable app content", async (t) => {
  const { npmInspection, portableInspection } = await comparableInspections(t);
  const checks = compareCommonPackageContent(npmInspection, portableInspection);

  assert.deepEqual(checks.map(({ id, status }) => ({ id, status })), [
    { id: "common-content.version", status: "pass" },
    { id: "common-content.files", status: "pass" },
  ]);
  assert.equal(checks[0].details.expected, RELEASE_VERSION);
  assert.equal(checks[0].details.actual, RELEASE_VERSION);
  assert.deepEqual(checks[1].details.mismatches, []);
  assert.ok(Object.isFrozen(checks));
  assert.ok(checks.every((check) => Object.isFrozen(check) && Object.isFrozen(check.details)));
  assert.deepEqual(compareCommonPackageContent(npmInspection, portableInspection), checks);
});

test("allows only the explicit ZIP-only content outside the common app set", async (t) => {
  const { npmInspection, portableInspection } = await comparableInspections(t, {
    mutateZip(state) {
      state.entries.set("app/node_modules/dependency/index.js", Buffer.from("module.exports = true;\n"));
      state.setEvidence(normalBuildEvidence(state.entries));
    },
  });
  assert.ok(compareCommonPackageContent(npmInspection, portableInspection).every(({ status }) => status === "pass"));
});

test("treats npm-owned node_modules paths as common product content", async (t) => {
  const commonBytes = "common product file\n";
  const npmEntries = [
    { name: "package/bin/cli.mjs", data: "export const cli = true;\n" },
    { name: "package/node_modules/common.txt", data: commonBytes },
    { name: "package/package.json", data: `${JSON.stringify({ name: "intent-planner", version: RELEASE_VERSION }, null, 2)}\n` },
  ];
  const cases = [
    ["matching", commonBytes, "pass", undefined],
    ["missing", undefined, "fail", "missing"],
    ["size", "short\n", "fail", "size"],
    ["hash", "common product fals\n", "fail", "hash"],
  ];
  for (const [name, portableBytes, status, kind] of cases) {
    await t.test(name, async (t) => {
      const { npmInspection, portableInspection } = await comparableInspections(t, {
        npmEntries,
        mutateZip: portableBytes === undefined ? undefined : (state) => {
          state.entries.set("app/node_modules/common.txt", Buffer.from(portableBytes));
          state.setEvidence(normalBuildEvidence(state.entries));
        },
      });
      const check = compareCommonPackageContent(npmInspection, portableInspection)
        .find(({ id }) => id === "common-content.files");
      assert.equal(check.status, status);
      if (kind) {
        assert.deepEqual(check.details.mismatches.map(({ path, kind: mismatchKind }) => ({ path, kind: mismatchKind })), [
          { path: "node_modules/common.txt", kind },
        ]);
      } else {
        assert.deepEqual(check.details.mismatches, []);
      }
    });
  }
});

test("reports npm or portable missing files with expected and actual records", async (t) => {
  const cases = [
    ["portable-missing", [
      { name: "package/bin/cli.mjs", data: "export const cli = true;\n" },
      { name: "package/package.json", data: `${JSON.stringify({ name: "intent-planner", version: RELEASE_VERSION }, null, 2)}\n` },
      { name: "package/README.md", data: "npm readme\n" },
    ], undefined, "README.md", "missing"],
    ["npm-missing", undefined, (state) => {
      state.entries.set("app/extra.txt", Buffer.from("extra\n"));
      state.setEvidence(normalBuildEvidence(state.entries));
    }, "extra.txt", "extra"],
  ];
  for (const [name, npmEntries, mutateZip, expectedPath, kind] of cases) {
    await t.test(name, async (t) => {
      const inspections = await comparableInspections(t, { ...(npmEntries ? { npmEntries } : {}), mutateZip });
      const check = compareCommonPackageContent(inspections.npmInspection, inspections.portableInspection)
        .find(({ id }) => id === "common-content.files");
      assert.equal(check.status, "fail");
      assert.deepEqual(check.details.mismatches.map(({ path, kind: mismatchKind }) => ({ path, kind: mismatchKind })), [
        { path: expectedPath, kind },
      ]);
      const [mismatch] = check.details.mismatches;
      assert.ok(Object.hasOwn(mismatch, "expected"));
      assert.ok(Object.hasOwn(mismatch, "actual"));
    });
  }
});

test("reports same-size hash replacement and size replacement without rereading candidate files", async (t) => {
  const cases = [
    ["hash", "export const cli = fals;\n", "hash"],
    ["size", "short\n", "size"],
  ];
  for (const [name, cliBytes, kind] of cases) {
    await t.test(name, async (t) => {
      const { npmInspection, portableInspection } = await comparableInspections(t, {
        npmEntries: [
          { name: "package/bin/cli.mjs", data: cliBytes },
          { name: "package/package.json", data: `${JSON.stringify({ name: "intent-planner", version: RELEASE_VERSION }, null, 2)}\n` },
        ],
      });
      const check = compareCommonPackageContent(npmInspection, portableInspection)
        .find(({ id }) => id === "common-content.files");
      assert.equal(check.status, "fail");
      assert.equal(check.details.mismatches[0].path, "bin/cli.mjs");
      assert.equal(check.details.mismatches[0].kind, kind);
      assert.notDeepEqual(check.details.mismatches[0].expected, check.details.mismatches[0].actual);
    });
  }
});

test("reports the npm and portable candidate versions when they differ", async (t) => {
  const { npmInspection, portableInspection } = await comparableInspections(t, {
    npmEntries: [
      { name: "package/bin/cli.mjs", data: "export const cli = true;\n" },
      { name: "package/package.json", data: `${JSON.stringify({ name: "intent-planner", version: "1.2.4" }, null, 2)}\n` },
    ],
  });
  const check = compareCommonPackageContent(npmInspection, portableInspection)
    .find(({ id }) => id === "common-content.version");
  assert.equal(check.status, "fail");
  assert.deepEqual(check.details, { expected: "1.2.4", actual: RELEASE_VERSION });
});

test("rejects forged, unverified, and cleaned inspections before comparison", async (t) => {
  const { base, tempRoot, zipPath } = await fixture(t);
  const tarballPath = path.join(base, "candidate.tgz");
  await makeRawTarball(tarballPath, [
    { name: "package/package.json", data: `${JSON.stringify({ name: "intent-planner", version: RELEASE_VERSION })}\n` },
  ]);
  await makeReleaseZip(zipPath);
  const npmInspection = await inspectNpmTarball({ tarballPath, tempRoot });
  const portableInspection = await inspectPortableZip({ zipPath, tempRoot });

  assert.throws(
    () => compareCommonPackageContent({ ...npmInspection }, portableInspection),
    (error) => error instanceof PortableArchiveError && error.code === "INSPECTION_INVALID",
  );
  assert.throws(
    () => compareCommonPackageContent(npmInspection, portableInspection),
    (error) => error instanceof PortableArchiveError && error.code === "INSPECTION_INVALID",
  );
  await verifyPortableReleaseMetadata(portableInspection);
  await npmInspection.cleanup();
  assert.throws(
    () => compareCommonPackageContent(npmInspection, portableInspection),
    (error) => error instanceof PortableArchiveError && error.code === "INSPECTION_INVALID",
  );
  await portableInspection.cleanup();
});
