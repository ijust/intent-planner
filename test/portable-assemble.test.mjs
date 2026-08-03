import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  assemblePortablePayload,
  assemblePortablePayloadCore,
  assertAssembledPortablePayloadHandle,
  consumeAssembledPortablePayloadHandle,
} from "../scripts/portable/assemble.mjs";
import {
  consumeVerifiedDependencyStageHandle,
  stageDependenciesCore,
} from "../scripts/portable/dependencies-core.mjs";
import {
  consumeVerifiedNodeRuntimeHandle,
  extractNodeRuntimeFromVerifiedArchive,
} from "../scripts/portable/node-archive.mjs";
import { verifyNodeReleaseTrustChainCore } from "../scripts/portable/node-release-core.mjs";
import { assertVerifiedPortableManifestHandle } from "../scripts/portable/manifest.mjs";

const VERSION = "1.2.3";
const NODE_VERSION = "24.18.0";
const ARCHIVE_NAME = `node-v${NODE_VERSION}-win-x64.zip`;
const ARCHIVE_ROOT = `node-v${NODE_VERSION}-win-x64/`;

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

function makeStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const body = Buffer.from(entry.body ?? "");
    const directory = entry.name.endsWith("/");
    const checksum = crc32(body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(((directory ? 0o040755 : 0o100644) << 16) >>> 0, 38);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.length + name.length + body.length;
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

async function makeRuntime() {
  const nodeBytes = Buffer.from([0x4d, 0x5a, 0x00, 0xff]);
  const licenseBytes = Buffer.from("Node.js fixture license\r\n");
  const archive = makeStoredZip([
    { name: ARCHIVE_ROOT },
    { name: `${ARCHIVE_ROOT}node.exe`, body: nodeBytes },
    { name: `${ARCHIVE_ROOT}LICENSE`, body: licenseBytes },
  ]);
  const archiveSha256 = createHash("sha256").update(archive).digest("hex");
  const keyring = Buffer.from("fixture keyring");
  const verifiedArchive = await verifyNodeReleaseTrustChainCore({
    config: {
      archiveName: ARCHIVE_NAME,
      archiveSha256,
      releaseKeysSha256: createHash("sha256").update(keyring).digest("hex"),
    },
    readKeyring: async () => keyring,
    readSignedShasums: async () => Buffer.from("signed fixture"),
    readArchive: async () => archive,
    runGpg: async ({ outputFile }) => {
      await fs.writeFile(outputFile, `${archiveSha256}  ${ARCHIVE_NAME}\n`);
      return { exitCode: 0, status: "[GNUPG:] VALIDSIG 0123456789ABCDEF" };
    },
  });
  return {
    runtime: await extractNodeRuntimeFromVerifiedArchive(verifiedArchive),
    nodeBytes,
    licenseBytes,
  };
}

async function makeDependencyStage(t, { version = VERSION, omitDistFile } = {}) {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "portable-assemble-input-"));
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));
  const repository = path.join(temporaryRoot, "repository");
  const dist = path.join(repository, "dist");
  const dependencyStage = path.join(temporaryRoot, "dependency-stage");
  const packageJson = { name: "intent-planner", version, dependencies: {} };
  const packageLock = {
    name: "intent-planner",
    version,
    lockfileVersion: 3,
    requires: true,
    packages: { "": { name: "intent-planner", version, dependencies: {} } },
  };
  const files = new Map([
    ["bin/cli.mjs", Buffer.from("export const cli = true;\n")],
    ["src/portable/verify-and-run.mjs", Buffer.from("export const verify = true;\n")],
    ["templates/fixture.txt", Buffer.from("template\n")],
    ["README.md", Buffer.from("# fixture\n")],
    ["LICENSE", Buffer.from("fixture license\n")],
    ["package.json", Buffer.from(`${JSON.stringify(packageJson, null, 2)}\n`)],
  ]);
  if (omitDistFile) files.delete(omitDistFile);
  for (const [relative, bytes] of files) {
    const target = path.join(dist, ...relative.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
  }
  await fs.writeFile(
    path.join(repository, "package-lock.json"),
    `${JSON.stringify(packageLock, null, 2)}\n`,
  );
  const handle = await stageDependenciesCore({
    rootDirectory: repository,
    distDirectory: dist,
    stageDirectory: dependencyStage,
    async runNpmCi(appDirectory) {
      await fs.mkdir(path.join(appDirectory, "node_modules"));
      await fs.writeFile(path.join(appDirectory, "node_modules", ".package-lock.json"), "{}\n");
      return { exitCode: 0 };
    },
  });
  t.after(() => handle.cleanup().catch(() => {}));
  return { temporaryRoot, handle, files, packageLock };
}

async function makeFixture(t, options) {
  const dependency = await makeDependencyStage(t, options);
  const runtime = await makeRuntime();
  const stageDirectory = path.join(dependency.temporaryRoot, "windows-portable");
  await fs.mkdir(stageDirectory);
  return { ...dependency, ...runtime, stageDirectory: await fs.realpath(stageDirectory) };
}

async function listTree(root) {
  const entries = [];
  async function visit(directory, prefix) {
    for (const name of (await fs.readdir(directory)).sort()) {
      const relative = prefix ? `${prefix}/${name}` : name;
      const metadata = await fs.lstat(path.join(directory, name));
      entries.push(`${metadata.isDirectory() ? "d" : "f"}:${relative}`);
      if (metadata.isDirectory()) await visit(path.join(directory, name), relative);
    }
  }
  await visit(root, "");
  return entries;
}

test("検証済み入力だけから単一 named root 契約の自己完結 payload を組み立てる", async (t) => {
  const fixture = await makeFixture(t);
  const sourcePackageBefore = await fs.readFile(path.join(fixture.handle.appDirectory, "package.json"));

  const assembled = await assemblePortablePayload({
    stageDirectory: fixture.stageDirectory,
    dependencyStage: fixture.handle,
    nodeRuntime: fixture.runtime,
  });
  t.after(() => assembled.cleanup().catch(() => {}));

  assert.equal(assertAssembledPortablePayloadHandle(assembled), assembled);
  assert.equal(Object.isFrozen(assembled), true);
  assert.equal(assembled.directoryName, `intent-planner-v${VERSION}-win-x64-portable`);
  assert.equal(assembled.version, VERSION);
  assert.equal(assembled.nodeVersion, NODE_VERSION);
  assert.equal(path.basename(assembled.payloadRoot), assembled.directoryName);
  assert.equal(assembled.manifestMaterialized, true);
  assertVerifiedPortableManifestHandle(assembled.manifestHandle);
  assert.equal(assembled.manifest, assembled.manifestHandle.manifest);
  assert.deepEqual(await fs.readFile(path.join(assembled.payloadRoot, "runtime", "node.exe")), fixture.nodeBytes);
  assert.deepEqual(await fs.readFile(path.join(assembled.payloadRoot, "runtime", "LICENSE")), fixture.licenseBytes);
  assert.deepEqual(await fs.readFile(path.join(assembled.payloadRoot, "app", "package.json")), sourcePackageBefore);
  assert.deepEqual(await fs.readFile(path.join(fixture.handle.appDirectory, "package.json")), sourcePackageBefore);
  assert.match(await fs.readFile(path.join(assembled.payloadRoot, "PORTABLE-README.txt"), "utf8"), /Windows x64/);
  assert.match(await fs.readFile(path.join(assembled.payloadRoot, "PORTABLE-README.txt"), "utf8"), /intent-planner\.cmd/);
  assert.match(await fs.readFile(path.join(assembled.payloadRoot, "PORTABLE-README.txt"), "utf8"), /bundled Node\.js .* dependencies/i);
  assert.doesNotMatch(await fs.readFile(path.join(assembled.payloadRoot, "PORTABLE-README.txt"), "utf8"), /signed|secure against attackers/i);
  assert.deepEqual(
    (await listTree(assembled.payloadRoot)).filter((entry) => entry.startsWith("d:") && !entry.includes("/")),
    ["d:app", "d:runtime"],
  );
  assert.equal((await fs.readFile(path.join(assembled.payloadRoot, "portable-manifest.json"), "utf8")).endsWith("\n"), true);
  assert.equal(assembled.manifest.files.some((entry) => entry.path === "portable-manifest.json"), false);
  for (const required of [
    "intent-planner.cmd",
    "PORTABLE-README.txt",
    "runtime/node.exe",
    "runtime/LICENSE",
    "app/bin/cli.mjs",
    "app/src/portable/verify-and-run.mjs",
    "app/package-lock.json",
    "app/node_modules/.package-lock.json",
  ]) {
    assert.equal(assembled.manifest.files.some((entry) => entry.path === required), true, required);
  }
});

test("完成 handle は偽造不能で一度だけ消費でき、cleanup は開始時に失効する", async (t) => {
  const fixture = await makeFixture(t);
  const assembled = await assemblePortablePayload({
    stageDirectory: fixture.stageDirectory,
    dependencyStage: fixture.handle,
    nodeRuntime: fixture.runtime,
  });
  const forged = Object.freeze({ ...assembled });
  assert.throws(() => assertAssembledPortablePayloadHandle(forged), /untrusted/);
  assert.throws(() => consumeAssembledPortablePayloadHandle(forged), /untrusted/);
  const consumed = consumeAssembledPortablePayloadHandle(assembled);
  assert.equal(Object.isFrozen(consumed), true);
  assert.equal(consumed.payloadRoot, assembled.payloadRoot);
  assert.equal(consumed.directoryName, assembled.directoryName);
  assert.throws(() => consumeAssembledPortablePayloadHandle(assembled), /untrusted-or-consumed/);
  await consumed.cleanup();
  await assert.rejects(fs.access(assembled.payloadRoot));
});

test("偽造または失効した upstream handle は出力前に拒否する", async (t) => {
  const fixture = await makeFixture(t);
  const cases = [
    { dependencyStage: Object.freeze({ ...fixture.handle }), nodeRuntime: fixture.runtime },
    { dependencyStage: fixture.handle, nodeRuntime: Object.freeze({ ...fixture.runtime }) },
  ];
  for (const [index, inputs] of cases.entries()) {
    await assert.rejects(
      assemblePortablePayload({ stageDirectory: fixture.stageDirectory, ...inputs }),
      /untrusted/,
    );
    assert.deepEqual(await fs.readdir(fixture.stageDirectory), [], `case ${index}`);
  }
});

test("同梱版が不正または必須 app 入力が欠けると完成 payload を残さない", async (t) => {
  const fixture = await makeFixture(t, { version: "1.2" });
  await assert.rejects(
    assemblePortablePayload({
      stageDirectory: fixture.stageDirectory,
      dependencyStage: fixture.handle,
      nodeRuntime: fixture.runtime,
    }),
    /version.*complete-exact-version/,
  );
  assert.deepEqual(await fs.readdir(fixture.stageDirectory), []);
});

test("handle 発行後に live app へ追加された link と case variant を収録しない", async (t) => {
  for (const scenario of ["symlink", "case-collision"]) {
    await t.test(scenario, async (subtest) => {
      const fixture = await makeFixture(subtest);
      if (scenario === "symlink") {
        await fs.symlink("cli.mjs", path.join(fixture.handle.appDirectory, "bin", "alias.mjs"));
      } else {
        await fs.writeFile(path.join(fixture.handle.appDirectory, "readme.md"), "collision\n");
        const rootNames = await fs.readdir(fixture.handle.appDirectory);
        if (!(rootNames.includes("README.md") && rootNames.includes("readme.md"))) {
          subtest.skip("case-insensitive test filesystem cannot materialize a Windows case collision");
          return;
        }
      }
      const assembled = await assemblePortablePayload({
        stageDirectory: fixture.stageDirectory,
        dependencyStage: fixture.handle,
        nodeRuntime: fixture.runtime,
      });
      subtest.after(() => assembled.cleanup().catch(() => {}));
      if (scenario === "symlink") {
        await assert.rejects(fs.access(path.join(assembled.payloadRoot, "app", "bin", "alias.mjs")));
      } else {
        await assert.rejects(fs.access(path.join(assembled.payloadRoot, "app", "readme.md")));
      }
    });
  }
});

test("cmd は正本 CRLF bytes のまま、README と root 名は同じ入力で決定的", async (t) => {
  const first = await makeFixture(t);
  const second = await makeFixture(t);
  const one = await assemblePortablePayload({
    stageDirectory: first.stageDirectory,
    dependencyStage: first.handle,
    nodeRuntime: first.runtime,
  });
  const two = await assemblePortablePayload({
    stageDirectory: second.stageDirectory,
    dependencyStage: second.handle,
    nodeRuntime: second.runtime,
  });
  t.after(() => Promise.all([one.cleanup().catch(() => {}), two.cleanup().catch(() => {})]));
  const cmdSource = await fs.readFile(new URL("../scripts/portable/intent-planner.cmd", import.meta.url));
  assert.deepEqual(await fs.readFile(path.join(one.payloadRoot, "intent-planner.cmd")), cmdSource);
  assert.equal(cmdSource.includes(Buffer.from("\r\n")), true);
  assert.equal(cmdSource.toString("binary").replaceAll("\r\n", "").includes("\n"), false);
  assert.equal(one.directoryName, two.directoryName);
  assert.deepEqual(
    await fs.readFile(path.join(one.payloadRoot, "PORTABLE-README.txt")),
    await fs.readFile(path.join(two.payloadRoot, "PORTABLE-README.txt")),
  );
});

test("検証時点で必須 app が欠ける場合は完成前に拒否し、発行後のlock変更は収録しない", async (t) => {
  await t.test("missing-entrypoint", async (subtest) => {
    const fixture = await makeFixture(subtest, { omitDistFile: "bin/cli.mjs" });
    await assert.rejects(
      assemblePortablePayload({
        stageDirectory: fixture.stageDirectory,
        dependencyStage: fixture.handle,
        nodeRuntime: fixture.runtime,
      }),
      /resource=bin\/cli\.mjs expected=regular-file actual=missing/,
    );
    assert.deepEqual(await fs.readdir(fixture.stageDirectory), []);
  });
  await t.test("lock-version-mismatch", async (subtest) => {
    const fixture = await makeFixture(subtest);
    const lockPath = path.join(fixture.handle.appDirectory, "package-lock.json");
    const originalLock = await fs.readFile(lockPath);
    const lock = JSON.parse(await fs.readFile(lockPath, "utf8"));
    lock.version = "9.9.9";
    await fs.writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    const assembled = await assemblePortablePayload({
      stageDirectory: fixture.stageDirectory,
      dependencyStage: fixture.handle,
      nodeRuntime: fixture.runtime,
    });
    subtest.after(() => assembled.cleanup().catch(() => {}));
    assert.deepEqual(
      await fs.readFile(path.join(assembled.payloadRoot, "app", "package-lock.json")),
      originalLock,
    );
  });
});

test("失効した dependency/runtime handle は最初の出力前に拒否する", async (t) => {
  await t.test("expired-dependency", async (subtest) => {
    const fixture = await makeFixture(subtest);
    await fixture.handle.cleanup();
    await assert.rejects(
      assemblePortablePayload({
        stageDirectory: fixture.stageDirectory,
        dependencyStage: fixture.handle,
        nodeRuntime: fixture.runtime,
      }),
      /handle-verification.*untrusted/,
    );
    assert.deepEqual(await fs.readdir(fixture.stageDirectory), []);
  });
  await t.test("expired-runtime", async (subtest) => {
    const fixture = await makeFixture(subtest);
    await consumeVerifiedNodeRuntimeHandle(fixture.runtime);
    await assert.rejects(
      assemblePortablePayload({
        stageDirectory: fixture.stageDirectory,
        dependencyStage: fixture.handle,
        nodeRuntime: fixture.runtime,
      }),
      /runtime-handle.*untrusted-or-consumed/,
    );
    assert.deepEqual(await fs.readdir(fixture.stageDirectory), []);
  });
});

test("manifest failure は部分 payload と private container を残さない", async (t) => {
  const fixture = await makeFixture(t);
  await assert.rejects(
    assemblePortablePayloadCore({
      stageDirectory: fixture.stageDirectory,
      dependencyStage: fixture.handle,
      nodeRuntime: fixture.runtime,
    }, {
      async writeManifest() {
        throw new Error("fixture manifest failure");
      },
    }),
    /fixture manifest failure/,
  );
  assert.deepEqual(await fs.readdir(fixture.stageDirectory), []);
});

test("cleanup は同時呼出しを共有し、一時失敗後も失効したまま retry できる", async (t) => {
  const fixture = await makeFixture(t);
  let removeCalls = 0;
  const assembled = await assemblePortablePayloadCore({
    stageDirectory: fixture.stageDirectory,
    dependencyStage: fixture.handle,
    nodeRuntime: fixture.runtime,
  }, {
    async removeDirectory(directory) {
      removeCalls += 1;
      if (removeCalls === 1) throw new Error("temporary removal failure");
      await fs.rm(directory, { recursive: true, force: false });
    },
  });
  const first = assembled.cleanup();
  assert.equal(assembled.cleanup(), first);
  await assert.rejects(first, /stage=cleanup.*remove-failure/);
  assert.throws(() => assertAssembledPortablePayloadHandle(assembled), /untrusted-or-consumed/);
  await assembled.cleanup();
  assert.equal(removeCalls, 2);
  await assert.rejects(fs.access(assembled.payloadRoot));
});

test("cleanup は path swap を削除せず、元の private container を戻した後に retry できる", async (t) => {
  const fixture = await makeFixture(t);
  const assembled = await assemblePortablePayload({
    stageDirectory: fixture.stageDirectory,
    dependencyStage: fixture.handle,
    nodeRuntime: fixture.runtime,
  });
  const container = path.relative(fixture.stageDirectory, assembled.payloadRoot).split(path.sep)[0];
  const containerPath = path.join(fixture.stageDirectory, container);
  const movedPath = `${containerPath}-moved`;
  await fs.rename(containerPath, movedPath);
  await fs.mkdir(containerPath);
  await fs.writeFile(path.join(containerPath, "replacement.txt"), "keep\n");
  await assert.rejects(assembled.cleanup(), /identity-changed|unavailable/);
  assert.equal(await fs.readFile(path.join(containerPath, "replacement.txt"), "utf8"), "keep\n");
  await fs.rm(containerPath, { recursive: true });
  await fs.rename(movedPath, containerPath);
  await assembled.cleanup();
  await assert.rejects(fs.access(containerPath));
});

test("組立モジュールは外部 command・network・ZIP/publication を持たない", async () => {
  const source = await fs.readFile(new URL("../scripts/portable/assemble.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /node:child_process|node:http|node:https|\bfetch\s*\(|\bspawn\s*\(/);
  assert.doesNotMatch(source, /artifacts\/|\.zip\b|GitHub Releases|npm\s+(?:ci|install|pack|publish)/i);
});

test("handle 発行後の危険な live path は収録せず、dependency app に重なる stage は拒否する", async (t) => {
  await t.test("unsafe-path", async (subtest) => {
    const fixture = await makeFixture(subtest);
    await fs.writeFile(path.join(fixture.handle.appDirectory, "bin", "unsafe:name"), "unsafe\n");
    const assembled = await assemblePortablePayload({
      stageDirectory: fixture.stageDirectory,
      dependencyStage: fixture.handle,
      nodeRuntime: fixture.runtime,
    });
    subtest.after(() => assembled.cleanup().catch(() => {}));
    await assert.rejects(
      fs.access(path.join(assembled.payloadRoot, "app", "bin", "unsafe:name")),
    );
  });
  await t.test("overlap", async (subtest) => {
    const fixture = await makeFixture(subtest);
    const overlappingStage = path.join(fixture.handle.appDirectory, "windows-portable");
    await fs.mkdir(overlappingStage);
    await assert.rejects(
      assemblePortablePayload({
        stageDirectory: overlappingStage,
        dependencyStage: fixture.handle,
        nodeRuntime: fixture.runtime,
      }),
      /separate-from-dependency-app.*overlap/,
    );
    assert.deepEqual(await fs.readdir(overlappingStage), []);
  });
});

test("production facade は test operation の差替え口を公開しない", async (t) => {
  const fixture = await makeFixture(t);
  let injected = false;
  const assembled = await assemblePortablePayload({
    stageDirectory: fixture.stageDirectory,
    dependencyStage: fixture.handle,
    nodeRuntime: fixture.runtime,
  }, {
    async afterAppCopy() {
      injected = true;
      throw new Error("must not run");
    },
  });
  t.after(() => assembled.cleanup().catch(() => {}));
  assert.equal(assemblePortablePayload.length, 1);
  assert.equal(injected, false);
});

test("dependency handle 発行後の live app 改変を使わず、検証時の private bytes だけを収録する", async (t) => {
  const fixture = await makeFixture(t);
  const packagePath = path.join(fixture.handle.appDirectory, "package.json");
  const cliPath = path.join(fixture.handle.appDirectory, "bin", "cli.mjs");
  const originalPackage = await fs.readFile(packagePath);
  const originalCli = await fs.readFile(cliPath);
  await fs.writeFile(packagePath, JSON.stringify({ name: "intent-planner", version: "99.0.0" }));
  await fs.writeFile(cliPath, "tampered implementation secret\n");

  const assembled = await assemblePortablePayload({
    stageDirectory: fixture.stageDirectory,
    dependencyStage: fixture.handle,
    nodeRuntime: fixture.runtime,
  });
  t.after(() => assembled.cleanup().catch(() => {}));

  assert.deepEqual(await fs.readFile(path.join(assembled.payloadRoot, "app", "package.json")), originalPackage);
  assert.deepEqual(await fs.readFile(path.join(assembled.payloadRoot, "app", "bin", "cli.mjs")), originalCli);
  assert.doesNotMatch(
    await fs.readFile(path.join(assembled.payloadRoot, "app", "bin", "cli.mjs"), "utf8"),
    /tampered implementation secret/,
  );
});

test("既に消費済みの dependency handle は private stage 作成前に拒否する", async (t) => {
  const fixture = await makeFixture(t);
  await consumeVerifiedDependencyStageHandle(fixture.handle);
  await assert.rejects(
    assemblePortablePayload({
      stageDirectory: fixture.stageDirectory,
      dependencyStage: fixture.handle,
      nodeRuntime: fixture.runtime,
    }),
    /handle-verification.*untrusted/,
  );
  assert.deepEqual(await fs.readdir(fixture.stageDirectory), []);
});

test("app copy 後の payload symlink 差替えでは外部へ一切書かず安全な cleanup failure にする", async (t) => {
  const fixture = await makeFixture(t);
  const victim = path.join(fixture.temporaryRoot, "outside-victim");
  await fs.mkdir(victim);
  let originalPayload;
  await assert.rejects(
    assemblePortablePayloadCore({
      stageDirectory: fixture.stageDirectory,
      dependencyStage: fixture.handle,
      nodeRuntime: fixture.runtime,
    }, {
      async afterAppCopy() {
        const [containerName] = await fs.readdir(fixture.stageDirectory);
        const container = path.join(fixture.stageDirectory, containerName);
        const payload = path.join(container, `intent-planner-v${VERSION}-win-x64-portable`);
        originalPayload = path.join(container, "payload-original");
        await fs.rename(payload, originalPayload);
        await fs.symlink(victim, payload);
      },
    }),
    /stage=cleanup.*cleanup-failed/,
  );
  assert.deepEqual(await fs.readdir(victim), []);
  assert.equal((await fs.lstat(originalPayload)).isDirectory(), true);
  assert.equal(
    (await fs.readFile(path.join(originalPayload, "app", "bin", "cli.mjs"), "utf8")).includes("cli"),
    true,
  );
});

test("app copy 後の payload directory 差替えを削除せず元のassembly failureをcauseに残す", async (t) => {
  const fixture = await makeFixture(t);
  let replacement;
  let originalPayload;
  let caught;
  try {
    await assemblePortablePayloadCore({
      stageDirectory: fixture.stageDirectory,
      dependencyStage: fixture.handle,
      nodeRuntime: fixture.runtime,
    }, {
      async afterAppCopy() {
        const [containerName] = await fs.readdir(fixture.stageDirectory);
        const container = path.join(fixture.stageDirectory, containerName);
        replacement = path.join(container, `intent-planner-v${VERSION}-win-x64-portable`);
        originalPayload = path.join(container, "payload-original");
        await fs.rename(replacement, originalPayload);
        await fs.mkdir(replacement);
        await fs.writeFile(path.join(replacement, "replacement.txt"), "keep\n");
      },
    });
  } catch (error) {
    caught = error;
  }
  assert.match(caught?.message ?? "", /stage=cleanup.*cleanup-failed/);
  assert.equal(caught?.cause instanceof AggregateError, true);
  assert.equal(caught.cause.errors.some((error) => /ownership|identity-changed/.test(error.message)), true);
  assert.equal(await fs.readFile(path.join(replacement, "replacement.txt"), "utf8"), "keep\n");
  assert.equal((await fs.lstat(originalPayload)).isDirectory(), true);
});
