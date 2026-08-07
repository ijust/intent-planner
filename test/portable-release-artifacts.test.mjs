import assert from "node:assert/strict";
import { access, chmod, mkdtemp, mkdir, readFile, readdir, rm, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";

import {
  DEFAULT_ARCHIVE_LIMITS,
  PortableArchiveError,
  inspectPortableZip,
} from "../scripts/portable/release-artifacts.mjs";

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
