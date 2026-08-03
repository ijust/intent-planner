import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";

import {
  assertVerifiedNodeRuntimeHandle,
  consumeVerifiedNodeRuntimeHandle,
  extractNodeRuntimeFromVerifiedArchive,
} from "../scripts/portable/node-archive.mjs";
import {
  verifyNodeReleaseTrustChainCore,
} from "../scripts/portable/node-release-core.mjs";

const ARCHIVE_NAME = "node-v24.18.0-win-x64.zip";
const ROOT = "node-v24.18.0-win-x64/";

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    }
  }
  return (value ^ 0xffffffff) >>> 0;
}

function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const localName = Buffer.from(entry.localName ?? entry.name, "utf8");
    const body = Buffer.from(entry.body ?? "");
    const method = entry.method ?? 0;
    const localMethod = entry.localMethod ?? method;
    const flags = entry.flags ?? 0x0800;
    const localFlags = entry.localFlags ?? flags;
    const storedBody = method === 8 ? deflateRawSync(body) : body;
    const checksum = entry.crc32 ?? crc32(body);
    const localExtra = Buffer.from(entry.localExtra ?? []);
    const centralExtra = Buffer.from(entry.centralExtra ?? []);
    const directory = entry.directory ?? entry.name.endsWith("/");
    const unixMode = entry.unixMode ?? (directory ? 0o040755 : 0o100644);

    let descriptor = Buffer.alloc(0);
    if (entry.descriptor) {
      const withSignature = entry.descriptor.signature !== false;
      descriptor = Buffer.alloc(withSignature ? 16 : 12);
      let descriptorOffset = 0;
      if (withSignature) {
        descriptor.writeUInt32LE(0x08074b50, 0);
        descriptorOffset = 4;
      }
      descriptor.writeUInt32LE(entry.descriptor.crc32 ?? checksum, descriptorOffset);
      descriptor.writeUInt32LE(
        entry.descriptor.compressedSize ?? storedBody.length,
        descriptorOffset + 4,
      );
      descriptor.writeUInt32LE(
        entry.descriptor.uncompressedSize ?? body.length,
        descriptorOffset + 8,
      );
    }

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(localFlags, 6);
    local.writeUInt16LE(localMethod, 8);
    local.writeUInt32LE(entry.localCrc32 ?? checksum, 14);
    local.writeUInt32LE(entry.localCompressedSize ?? storedBody.length, 18);
    local.writeUInt32LE(entry.localUncompressedSize ?? body.length, 22);
    local.writeUInt16LE(localName.length, 26);
    local.writeUInt16LE(localExtra.length, 28);
    localParts.push(local, localName, localExtra, storedBody, descriptor);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(storedBody.length, 20);
    central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(centralExtra.length, 30);
    central.writeUInt32LE((unixMode << 16) >>> 0, 38);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name, centralExtra);

    localOffset += local.length
      + localName.length
      + localExtra.length
      + storedBody.length
      + descriptor.length;
  }

  const localBytes = Buffer.concat(localParts);
  const centralBytes = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(localBytes.length, 16);
  return Buffer.concat([localBytes, centralBytes, end]);
}

function centralEntryOffset(archive, entryIndex) {
  const endOffset = archive.length - 22;
  let cursor = archive.readUInt32LE(endOffset + 16);
  for (let index = 0; index < entryIndex; index += 1) {
    cursor += 46
      + archive.readUInt16LE(cursor + 28)
      + archive.readUInt16LE(cursor + 30)
      + archive.readUInt16LE(cursor + 32);
  }
  return cursor;
}

function mutateArchive(archive, mutate) {
  const changed = Buffer.from(archive);
  mutate(changed);
  return changed;
}

function untrustedHandle(bytes, overrides = {}) {
  const archive = Buffer.from(bytes);
  return Object.freeze({
    archiveName: ARCHIVE_NAME,
    sha256: createHash("sha256").update(archive).digest("hex"),
    size: archive.length,
    async readBytes() {
      return Buffer.from(archive);
    },
    ...overrides,
  });
}

async function verifiedHandle(bytes) {
  const archive = Buffer.from(bytes);
  const keyring = Buffer.from("fixture official keyring");
  const archiveSha256 = createHash("sha256").update(archive).digest("hex");
  return verifyNodeReleaseTrustChainCore({
    config: {
      archiveName: ARCHIVE_NAME,
      archiveSha256,
      releaseKeysSha256: createHash("sha256").update(keyring).digest("hex"),
    },
    readKeyring: async () => keyring,
    readSignedShasums: async () => Buffer.from("signed fixture"),
    readArchive: async () => archive,
    runGpg: async ({ outputFile }) => {
      await writeFile(outputFile, `${archiveSha256}  ${ARCHIVE_NAME}\n`);
      return {
        exitCode: 0,
        status: "[GNUPG:] VALIDSIG 0123456789ABCDEF",
      };
    },
  });
}

function safeEntries(extra = []) {
  return [
    { name: ROOT, directory: true },
    {
      name: `${ROOT}node.exe`,
      body: Buffer.from([0x4d, 0x5a, 0x00, 0xff]),
      method: 8,
    },
    { name: `${ROOT}LICENSE`, body: "Node.js fixture license\r\n" },
    { name: `${ROOT}node_modules/npm/README.md`, body: "ordinary archive content" },
    ...extra,
  ];
}

test("検証済み単一root ZIPからnode.exeとLICENSEだけを内容変更なしで返す", async () => {
  const archive = makeZip(safeEntries());

  const extracted = await extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive));

  assert.deepEqual(Object.keys(extracted).sort(), ["license", "nodeExe"]);
  assert.equal(extracted.nodeExe.archivePath, `${ROOT}node.exe`);
  assert.equal(extracted.license.archivePath, `${ROOT}LICENSE`);
  assert.deepEqual(await extracted.nodeExe.readBytes(), Buffer.from([0x4d, 0x5a, 0x00, 0xff]));
  assert.deepEqual(await extracted.license.readBytes(), Buffer.from("Node.js fixture license\r\n"));
  const changed = await extracted.nodeExe.readBytes();
  changed[0] = 0;
  assert.deepEqual(await extracted.nodeExe.readBytes(), Buffer.from([0x4d, 0x5a, 0x00, 0xff]));
});

test("抽出処理が発行した生存中のruntime handleだけを受理する", async () => {
  const archive = makeZip(safeEntries());
  const runtime = await extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive));

  assert.equal(assertVerifiedNodeRuntimeHandle(runtime), runtime);
  for (const forged of [
    Object.freeze({ ...runtime }),
    new Proxy(runtime, {}),
    Object.freeze({
      nodeExe: runtime.nodeExe,
      license: runtime.license,
    }),
  ]) {
    assert.throws(
      () => assertVerifiedNodeRuntimeHandle(forged),
      /stage=runtime-handle resource=runtime-handle expected=issued-verified-runtime-handle actual=untrusted-or-consumed/,
    );
  }
});

test("runtime handleは一度だけ消費でき、公開copyの変更を原本へ持ち込まない", async () => {
  const nodeExe = Buffer.from([0x4d, 0x5a, 0x00, 0xff]);
  const license = Buffer.from("Node.js private evidence license\r\n");
  const archive = makeZip(safeEntries().map((entry) => {
    if (entry.name === `${ROOT}node.exe`) return { ...entry, body: nodeExe };
    if (entry.name === `${ROOT}LICENSE`) return { ...entry, body: license };
    return entry;
  }));
  const runtime = await extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive));

  const publicNodeBytes = await runtime.nodeExe.readBytes();
  const publicLicenseBytes = await runtime.license.readBytes();
  publicNodeBytes.fill(0);
  publicLicenseBytes.fill(0);

  const consumedPromise = consumeVerifiedNodeRuntimeHandle(runtime);
  assert.throws(
    () => assertVerifiedNodeRuntimeHandle(runtime),
    /actual=untrusted-or-consumed/,
    "consume 呼出しから制御が戻る前に元handleを失効させる",
  );
  await assert.rejects(
    consumeVerifiedNodeRuntimeHandle(runtime),
    /actual=untrusted-or-consumed/,
  );

  const consumed = await consumedPromise;
  assert.equal(Object.isFrozen(consumed), true);
  assert.deepEqual(Object.keys(consumed).sort(), ["license", "nodeExe"]);
  assert.equal(consumed.nodeExe.archivePath, `${ROOT}node.exe`);
  assert.equal(consumed.nodeExe.size, nodeExe.byteLength);
  assert.equal(consumed.nodeExe.sha256, createHash("sha256").update(nodeExe).digest("hex"));
  assert.equal(consumed.license.archivePath, `${ROOT}LICENSE`);
  assert.equal(consumed.license.size, license.byteLength);
  assert.equal(consumed.license.sha256, createHash("sha256").update(license).digest("hex"));
  assert.deepEqual(await consumed.nodeExe.readBytes(), nodeExe);
  assert.deepEqual(await consumed.license.readBytes(), license);

  const firstConsumedRead = await consumed.nodeExe.readBytes();
  firstConsumedRead.fill(0);
  assert.deepEqual(await consumed.nodeExe.readBytes(), nodeExe, "消費後も毎回独立したcopyを返す");
  assert.deepEqual(await runtime.nodeExe.readBytes(), nodeExe, "失効後も既存の公開readBytes契約は維持する");
  assert.throws(
    () => assertVerifiedNodeRuntimeHandle(consumed),
    /actual=untrusted-or-consumed/,
    "消費後の値には検証済みhandleの権限を引き継がない",
  );
});

test("runtime handleの同時消費では一件だけが成功する", async () => {
  const archive = makeZip(safeEntries());
  const runtime = await extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive));

  const attempts = await Promise.allSettled([
    consumeVerifiedNodeRuntimeHandle(runtime),
    consumeVerifiedNodeRuntimeHandle(runtime),
    consumeVerifiedNodeRuntimeHandle(runtime),
  ]);

  assert.equal(attempts.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(attempts.filter(({ status }) => status === "rejected").length, 2);
  for (const attempt of attempts.filter(({ status }) => status === "rejected")) {
    assert.equal(attempt.reason.name, "NodeArchiveError");
    assert.match(attempt.reason.message, /actual=untrusted-or-consumed/);
  }
});

test("runtime handle拒否エラーへファイル本文を含めない", async () => {
  const secret = "runtime-license-secret-do-not-leak";
  const archive = makeZip(safeEntries().map((entry) => (
    entry.name === `${ROOT}LICENSE` ? { ...entry, body: secret } : entry
  )));
  const runtime = await extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive));
  await consumeVerifiedNodeRuntimeHandle(runtime);

  assert.throws(
    () => assertVerifiedNodeRuntimeHandle(runtime),
    (error) => {
      assert.equal(error.name, "NodeArchiveError");
      assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );
});

test("絶対・親参照・backslash・drive・UNC・control pathを全項目検査で拒否する", async () => {
  const dangerousPaths = [
    "/absolute.txt",
    `${ROOT}../escape.txt`,
    `${ROOT}nested\\escape.txt`,
    "C:/drive.txt",
    "//server/share.txt",
    `${ROOT}nul\0byte.txt`,
    `${ROOT}line\nfeed.txt`,
  ];

  for (const dangerousPath of dangerousPaths) {
    const archive = makeZip(safeEntries([{ name: dangerousPath, body: "not returned" }]));
    await assert.rejects(
      extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive)),
      (error) => {
        assert.equal(error.name, "NodeArchiveError");
        assert.equal(error.stage, "entry-path");
        assert.doesNotMatch(error.message, /not returned/);
        return true;
      },
      dangerousPath,
    );
  }
});

test("正規化後の重複と想定外rootは必須2ファイルを渡す前に拒否する", async () => {
  const duplicate = makeZip(safeEntries([
    { name: `${ROOT}node_modules/npm/README.md`, body: "duplicate" },
  ]));
  await assert.rejects(
    extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(duplicate)),
    /stage=entry-duplicate/,
  );

  const wrongRoot = makeZip(safeEntries([
    { name: "node-v24.18.0-win-arm64/README.md", body: "wrong root" },
  ]));
  await assert.rejects(
    extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(wrongRoot)),
    /stage=entry-root/,
  );
});

test("node.exeまたはLICENSEの欠損と非通常ファイルを拒否する", async () => {
  const missingLicense = makeZip(safeEntries().filter(({ name }) => name !== `${ROOT}LICENSE`));
  await assert.rejects(
    extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(missingLicense)),
    /stage=required-entry/,
  );

  const symlinkNode = makeZip(safeEntries().map((entry) => (
    entry.name === `${ROOT}node.exe`
      ? { ...entry, unixMode: 0o120777, body: "LICENSE" }
      : entry
  )));
  await assert.rejects(
    extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(symlinkNode)),
    /stage=entry-type/,
  );
});

test("検証済みhandleのname・hash・size・readBytes不整合をZIP解析前に拒否する", async () => {
  const archive = makeZip(safeEntries());
  const invalidHandles = [
    { ...untrustedHandle(archive), archiveName: "other.zip" },
    { ...untrustedHandle(archive), sha256: "0".repeat(64) },
    { ...untrustedHandle(archive), size: archive.length + 1 },
    { archiveName: ARCHIVE_NAME, sha256: "0".repeat(64), size: archive.length },
  ];

  for (const handle of invalidHandles) {
    await assert.rejects(
      extractNodeRuntimeFromVerifiedArchive(Object.freeze(handle)),
      (error) => {
        assert.equal(error.name, "NodeArchiveError");
        assert.equal(error.stage, "verified-archive");
        return true;
      },
    );
  }
});

test("name・hash・size・readBytesが一致しても信頼連鎖が発行していない偽handleを拒否する", async () => {
  const archive = makeZip(safeEntries());
  await assert.rejects(
    extractNodeRuntimeFromVerifiedArchive(untrustedHandle(archive)),
    (error) => {
      assert.equal(error.name, "NodeArchiveError");
      assert.equal(error.stage, "verified-archive");
      return true;
    },
  );
});

test("bit3 entryはdata descriptorが欠落していればtargetでも拒否する", async () => {
  const archive = makeZip(safeEntries().map((entry) => (
    entry.name === `${ROOT}node.exe`
      ? { ...entry, flags: 0x0808 }
      : entry
  )));

  await assert.rejects(
    extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive)),
    /stage=data-descriptor/,
  );
});

test("対象外entryもlocal header不一致とdata切断を抽出前に拒否する", async () => {
  const base = makeZip(safeEntries());
  const readmeCentral = centralEntryOffset(base, 3);
  const readmeLocal = base.readUInt32LE(readmeCentral + 42);
  const mismatches = [
    mutateArchive(base, (archive) => archive.writeUInt16LE(8, readmeLocal + 8)),
    mutateArchive(base, (archive) => archive.writeUInt16LE(0, readmeLocal + 6)),
    mutateArchive(base, (archive) => archive.writeUInt32LE(0, readmeLocal + 14)),
    mutateArchive(base, (archive) => {
      const nameLength = archive.readUInt16LE(readmeLocal + 26);
      archive[readmeLocal + 30 + nameLength - 1] ^= 1;
    }),
  ];
  for (const mismatch of mismatches) {
    await assert.rejects(
      extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(mismatch)),
      /stage=local-entry/,
    );
  }

  const truncated = mutateArchive(base, (archive) => {
    const central = centralEntryOffset(archive, 3);
    const local = archive.readUInt32LE(central + 42);
    const tooLarge = archive.readUInt32LE(central + 20) + 32;
    archive.writeUInt32LE(tooLarge, central + 20);
    archive.writeUInt32LE(tooLarge, central + 24);
    archive.writeUInt32LE(tooLarge, local + 18);
    archive.writeUInt32LE(tooLarge, local + 22);
  });
  await assert.rejects(
    extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(truncated)),
    /stage=local-entry/,
  );
});

test("全entryのlocal span重複を拒否する", async () => {
  const entries = safeEntries([
    { name: `${ROOT}after-overlap.txt`, body: "after" },
  ]);
  const base = makeZip(entries);
  const readmeCentral = centralEntryOffset(base, 3);
  const readmeLocal = base.readUInt32LE(readmeCentral + 42);
  const readmeNameLength = base.readUInt16LE(readmeLocal + 26);
  const readmeBodyOffset = readmeLocal + 30 + readmeNameLength;
  const afterCentral = centralEntryOffset(base, 4);
  const afterLocal = base.readUInt32LE(afterCentral + 42);
  const overlappingSize = afterLocal + 4 - readmeBodyOffset;
  const overlap = mutateArchive(base, (archive) => {
    archive.writeUInt32LE(overlappingSize, readmeCentral + 20);
    archive.writeUInt32LE(overlappingSize, readmeCentral + 24);
    archive.writeUInt32LE(overlappingSize, readmeLocal + 18);
    archive.writeUInt32LE(overlappingSize, readmeLocal + 22);
  });

  await assert.rejects(
    extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(overlap)),
    /stage=entry-overlap/,
  );
});

test("central/localのZIP64 extraと対象外の危険type・compressionを拒否する", async () => {
  const zip64Extra = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  for (const extraField of ["centralExtra", "localExtra"]) {
    const archive = makeZip(safeEntries().map((entry) => (
      entry.name === `${ROOT}node_modules/npm/README.md`
        ? { ...entry, [extraField]: zip64Extra }
        : entry
    )));
    await assert.rejects(
      extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive)),
      /stage=extra-field/,
    );
  }

  const malformedExtra = Buffer.from([0x02, 0x00, 0x04, 0x00, 0xff]);
  for (const extraField of ["centralExtra", "localExtra"]) {
    const archive = makeZip(safeEntries().map((entry) => (
      entry.name === `${ROOT}node_modules/npm/README.md`
        ? { ...entry, [extraField]: malformedExtra }
        : entry
    )));
    await assert.rejects(
      extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive)),
      /stage=extra-field/,
    );
  }

  const symlink = makeZip(safeEntries().map((entry) => (
    entry.name === `${ROOT}node_modules/npm/README.md`
      ? { ...entry, unixMode: 0o120777 }
      : entry
  )));
  await assert.rejects(
    extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(symlink)),
    /stage=entry-type/,
  );

  const unsupportedCompression = makeZip(safeEntries().map((entry) => (
    entry.name === `${ROOT}node_modules/npm/README.md`
      ? { ...entry, method: 99 }
      : entry
  )));
  await assert.rejects(
    extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(unsupportedCompression)),
    /stage=entry-compression/,
  );
});

test("bit3 descriptorはsignature有無の両形式を照合し、不一致を拒否する", async () => {
  for (const signature of [true, false]) {
    const archive = makeZip(safeEntries().map((entry) => (
      entry.name === `${ROOT}node.exe`
        ? {
            ...entry,
            flags: 0x0808,
            localCrc32: 0,
            localCompressedSize: 0,
            localUncompressedSize: 0,
            descriptor: { signature },
          }
        : entry
    )));
    const extracted = await extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive));
    assert.deepEqual(await extracted.nodeExe.readBytes(), Buffer.from([0x4d, 0x5a, 0x00, 0xff]));
  }

  const mismatch = makeZip(safeEntries().map((entry) => (
    entry.name === `${ROOT}node.exe`
      ? {
          ...entry,
          flags: 0x0808,
          localCrc32: 0,
          localCompressedSize: 0,
          localUncompressedSize: 0,
          descriptor: { crc32: 0 },
        }
      : entry
  )));
  await assert.rejects(
    extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(mismatch)),
    /stage=data-descriptor/,
  );
});

test("target/non-targetのunsupported ZIP flagsをmethod別allowlistで拒否する", async () => {
  const targets = [
    `${ROOT}node.exe`,
    `${ROOT}node_modules/npm/README.md`,
  ];
  const unsupportedFlags = [
    0x0020,
    0x2000,
    0x0080,
  ];

  for (const target of targets) {
    for (const unsupportedFlag of unsupportedFlags) {
      const archive = makeZip(safeEntries().map((entry) => (
        entry.name === target
          ? { ...entry, flags: 0x0800 | unsupportedFlag }
          : entry
      )));
      await assert.rejects(
        extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive)),
        /stage=entry-flags/,
      );
    }

    const storedWithDeflateOption = makeZip(safeEntries().map((entry) => (
      entry.name === target
        ? { ...entry, method: 0, flags: 0x0802 }
        : entry
    )));
    await assert.rejects(
      extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(storedWithDeflateOption)),
      /stage=entry-flags/,
    );
  }
});

test("deflate entryは合法なoption bits 1-2をtarget/non-target双方で受理する", async () => {
  for (const target of [`${ROOT}node.exe`, `${ROOT}node_modules/npm/README.md`]) {
    const archive = makeZip(safeEntries().map((entry) => (
      entry.name === target
        ? { ...entry, method: 8, flags: 0x0806 }
        : entry
    )));
    const extracted = await extractNodeRuntimeFromVerifiedArchive(await verifiedHandle(archive));
    assert.deepEqual(await extracted.nodeExe.readBytes(), Buffer.from([0x4d, 0x5a, 0x00, 0xff]));
  }
});
