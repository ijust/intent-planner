import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, chmod, mkdtemp, mkdir, readFile, readdir, rm, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";

import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { create as createTar } from "tar";

import {
  DEFAULT_ARCHIVE_LIMITS,
  PortableArchiveError,
  inspectNpmTarball,
  inspectPortableZip,
  verifyPortableReleaseMetadata,
} from "../scripts/portable/release-artifacts.mjs";
import { serializePortableManifest } from "../scripts/portable/manifest.mjs";
import { hashFileSet, serializeStableJson } from "../scripts/portable/release-evidence.mjs";

const RELEASE_VERSION = "1.2.3";
const RELEASE_NODE_VERSION = "24.18.0";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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
  })).sort((left, right) => left.path.localeCompare(right.path));
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
