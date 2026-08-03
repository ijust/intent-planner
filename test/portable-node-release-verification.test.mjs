import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fsPromises from "node:fs/promises";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { verifyNodeRelease } from "../scripts/portable/node-release.mjs";
import {
  createGpgRunner,
  NODE_RELEASE_INPUT_LIMITS,
  NODE_RELEASE_INPUT_NAMES,
  parseSignedShasums,
  readBoundedCacheFile,
  readOfficialInput,
  verifyNodeReleaseTrustChainCore,
} from "../scripts/portable/node-release-core.mjs";

const KEYRING = Buffer.from("fixture official keyring");
const ARCHIVE = Buffer.from("fixture node archive");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function fixtureConfig(overrides = {}) {
  return Object.freeze({
    schemaVersion: 1,
    nodeVersion: "24.18.0",
    platform: "win32",
    arch: "x64",
    archiveName: "node-v24.18.0-win-x64.zip",
    archiveSha256: sha256(ARCHIVE),
    releaseBaseUrl: "https://nodejs.org/download/release/v24.18.0/",
    releaseKeysUrl: "https://raw.githubusercontent.com/nodejs/release-keys/b28073028e6d6855cfb53bf7fa0137599c01f967/gpg-only-active-keys/pubring.kbx",
    releaseKeysSha256: sha256(KEYRING),
    ...overrides,
  });
}

async function makeCache(config, { keyring = KEYRING, archive = ARCHIVE, shasums } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "node-release-cache-"));
  await writeFile(path.join(directory, "pubring.kbx"), keyring);
  await writeFile(
    path.join(directory, "SHASUMS256.txt.asc"),
    shasums ?? Buffer.from("signed fixture; plaintext must come from gpg"),
  );
  await writeFile(path.join(directory, config.archiveName), archive);
  return directory;
}

function successfulGpg(plaintext, observations = {}) {
  return async (request) => {
    observations.request = request;
    observations.keyring = await readFile(request.keyringFile);
    observations.signed = await readFile(request.signedFile);
    await writeFile(request.outputFile, plaintext);
    return {
      exitCode: 0,
      status: "[GNUPG:] GOODSIG 0123456789ABCDEF Node.js\n[GNUPG:] VALIDSIG 0123456789ABCDEF 2026-08-02 0 4 0 1 10 01 0123456789ABCDEF\n",
    };
  };
}

async function verifyFixtureNodeRelease({
  cacheDirectory,
  fetchImpl = globalThis.fetch,
  fsImpl = fsPromises,
  loadConfig,
  runGpg,
  signal,
  tempRoot = os.tmpdir(),
}) {
  const config = await loadConfig();
  const readInput = (cacheName, url, maximumBytes) => readOfficialInput({
    cacheDirectory,
    cacheName,
    url,
    resource: cacheName,
    maximumBytes,
    fetchImpl,
    fsOps: fsImpl,
    signal,
  });
  return verifyNodeReleaseTrustChainCore({
    config,
    fsOps: fsImpl,
    readKeyring: () => readInput(
      NODE_RELEASE_INPUT_NAMES.keyring,
      config.releaseKeysUrl,
      NODE_RELEASE_INPUT_LIMITS.keyring,
    ),
    readSignedShasums: () => readInput(
      NODE_RELEASE_INPUT_NAMES.signedShasums,
      `${config.releaseBaseUrl}${NODE_RELEASE_INPUT_NAMES.signedShasums}`,
      NODE_RELEASE_INPUT_LIMITS.signedShasums,
    ),
    readArchive: () => readInput(
      config.archiveName,
      `${config.releaseBaseUrl}${config.archiveName}`,
      NODE_RELEASE_INPUT_LIMITS.archive,
    ),
    runGpg,
    tempRoot,
  });
}

test("cacheでも鍵束hash→公式署名→一覧hash→設定hash→実archive hashの順に検証してhandleだけを返す", async () => {
  const config = fixtureConfig();
  const cacheDirectory = await makeCache(config);
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "node-release-temp-root-"));
  const observations = {};
  const plaintext = `${config.archiveSha256}  ${config.archiveName}\n`;

  try {
    const verified = await verifyFixtureNodeRelease({
      cacheDirectory,
      tempRoot,
      loadConfig: async () => config,
      runGpg: successfulGpg(plaintext, observations),
    });

    assert.equal(verified.archiveName, config.archiveName);
    assert.equal(verified.sha256, config.archiveSha256);
    assert.equal(verified.size, ARCHIVE.byteLength);
    assert.deepEqual(await verified.readBytes(), ARCHIVE);
    const firstRead = await verified.readBytes();
    firstRead[0] ^= 0xff;
    assert.deepEqual(await verified.readBytes(), ARCHIVE, "handleは検証済み原本のcopyを返す");
    assert.deepEqual(observations.keyring, KEYRING);
    assert.match(observations.signed.toString(), /plaintext must come from gpg/);

    const remaining = await import("node:fs/promises").then(({ readdir }) => readdir(tempRoot));
    assert.deepEqual(remaining, [], "成功時も専用GnuPG領域を削除する");
  } finally {
    await rm(cacheDirectory, { recursive: true, force: true });
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("鍵束hash不一致ではGnuPGもarchive読込も行わず、本文をエラーへ含めない", async () => {
  const config = fixtureConfig({ releaseKeysSha256: "0".repeat(64) });
  const cacheDirectory = await makeCache(config);
  let gpgCalled = false;

  try {
    await assert.rejects(
      verifyFixtureNodeRelease({
        cacheDirectory,
        loadConfig: async () => config,
        runGpg: async () => {
          gpgCalled = true;
          throw new Error("must not run");
        },
      }),
      (error) => {
        assert.equal(error.name, "NodeReleaseVerificationError");
        assert.match(error.message, /stage=keyring-hash/);
        assert.doesNotMatch(error.message, /fixture official keyring/);
        return true;
      },
    );
    assert.equal(gpgCalled, false);
  } finally {
    await rm(cacheDirectory, { recursive: true, force: true });
  }
});

test("署名検証失敗ではGnuPG出力をparseせずarchiveを後続へ渡さない", async () => {
  const config = fixtureConfig();
  const cacheDirectory = await makeCache(config);
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "node-release-temp-root-"));

  try {
    await assert.rejects(
      verifyFixtureNodeRelease({
        cacheDirectory,
        tempRoot,
        loadConfig: async () => config,
        runGpg: async ({ outputFile }) => {
          await writeFile(outputFile, `${config.archiveSha256}  ${config.archiveName}\n`);
          return { exitCode: 1, status: "[GNUPG:] BADSIG leaked untrusted identity" };
        },
      }),
      (error) => {
        assert.match(error.message, /stage=signature/);
        assert.doesNotMatch(error.message, /leaked untrusted identity/);
        return true;
      },
    );
    const remaining = await import("node:fs/promises").then(({ readdir }) => readdir(tempRoot));
    assert.deepEqual(remaining, [], "失敗時も専用GnuPG領域を削除する");
  } finally {
    await rm(cacheDirectory, { recursive: true, force: true });
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("署名済み一覧は小文字64hexとexact filename 1件だけを許す", () => {
  const config = fixtureConfig();
  const valid = `${"1".repeat(64)}  win-x64/node.exe\n${config.archiveSha256}  ${config.archiveName}\n`;
  assert.equal(parseSignedShasums(valid, config.archiveName), config.archiveSha256);
  const withUnrelatedSimilarName = `${"2".repeat(64)}  ${config.archiveName}.backup\n${config.archiveSha256}  ${config.archiveName}\n`;
  assert.equal(
    parseSignedShasums(withUnrelatedSimilarName, config.archiveName),
    config.archiveSha256,
  );

  const invalidInputs = [
    `${config.archiveSha256.toUpperCase()}  ${config.archiveName}\n`,
    `${config.archiveSha256} *${config.archiveName}\n`,
    `${config.archiveSha256}  ${config.archiveName}\n${config.archiveSha256}  ${config.archiveName}\n`,
    `${config.archiveSha256}  ./${config.archiveName}\n`,
    `${config.archiveSha256}  ${config.archiveName}\nnot-a-valid-line\n`,
  ];
  for (const input of invalidInputs) {
    assert.throws(() => parseSignedShasums(input, config.archiveName), /node-release-verification:/);
  }
});

test("署名済み一覧・設定・実archiveのhashが一致しない場合はhandleを返さない", async () => {
  const listedHash = "1".repeat(64);
  const config = fixtureConfig();
  const cacheDirectory = await makeCache(config);
  try {
    await assert.rejects(
      verifyFixtureNodeRelease({
        cacheDirectory,
        loadConfig: async () => config,
        runGpg: successfulGpg(`${listedHash}  ${config.archiveName}\n`),
      }),
      /stage=config-hash/,
    );
  } finally {
    await rm(cacheDirectory, { recursive: true, force: true });
  }

  const wrongArchiveDirectory = await makeCache(config, { archive: Buffer.from("tampered archive") });
  try {
    await assert.rejects(
      verifyFixtureNodeRelease({
        cacheDirectory: wrongArchiveDirectory,
        loadConfig: async () => config,
        runGpg: successfulGpg(`${config.archiveSha256}  ${config.archiveName}\n`),
      }),
      /stage=archive-hash/,
    );
  } finally {
    await rm(wrongArchiveDirectory, { recursive: true, force: true });
  }
});

test("network取得は固定URLだけを要求し、redirect後のorigin/path逸脱を本文読込前に拒否する", async () => {
  const config = fixtureConfig();
  const requests = [];
  const secretBody = "DO-NOT-READ-OR-REPORT";
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    return {
      ok: true,
      status: 200,
      url: "https://attacker.invalid/stolen/pubring.kbx?token=secret",
      headers: new Headers({ "content-length": String(secretBody.length) }),
      body: {
        getReader() {
          throw new Error(secretBody);
        },
      },
    };
  };

  await assert.rejects(
    verifyFixtureNodeRelease({ loadConfig: async () => config, fetchImpl }),
    (error) => {
      assert.match(error.message, /stage=source-boundary/);
      assert.doesNotMatch(error.message, /attacker|token|DO-NOT/);
      return true;
    },
  );
  assert.deepEqual(requests, [{
    url: config.releaseKeysUrl,
    options: { redirect: "error", signal: undefined },
  }]);
});

test("network入力もcacheと同じ信頼連鎖を通り、固定した3 URL以外を取得しない", async () => {
  const config = fixtureConfig();
  const plaintext = `${config.archiveSha256}  ${config.archiveName}\n`;
  const signed = Buffer.from("signed fixture from official URL");
  const expected = new Map([
    [config.releaseKeysUrl, KEYRING],
    [`${config.releaseBaseUrl}SHASUMS256.txt.asc`, signed],
    [`${config.releaseBaseUrl}${config.archiveName}`, ARCHIVE],
  ]);
  const requests = [];
  const fetchImpl = async (url, options) => {
    const requestedUrl = String(url);
    requests.push({ url: requestedUrl, options });
    const bytes = expected.get(requestedUrl);
    assert.ok(bytes, `unexpected URL: ${requestedUrl}`);
    return {
      ok: true,
      status: 200,
      url: requestedUrl,
      headers: new Headers({ "content-length": String(bytes.byteLength) }),
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
    };
  };

  const verified = await verifyFixtureNodeRelease({
    loadConfig: async () => config,
    fetchImpl,
    runGpg: successfulGpg(plaintext),
  });

  assert.deepEqual(await verified.readBytes(), ARCHIVE);
  assert.deepEqual(requests.map(({ url }) => url), [...expected.keys()]);
  assert.ok(requests.every(({ options }) => (
    options.redirect === "error"
    && options.signal === undefined
    && Object.keys(options).length === 2
  )));
});

test("既定GnuPG runnerはgpg.exeと隔離home配下だけを固定引数で使う", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "node-release-gpg-"));
  const seen = {};
  const runner = createGpgRunner({
    execFileImpl(executable, args, options, callback) {
      Object.assign(seen, { executable, args, options });
      callback(null, "", "[GNUPG:] VALIDSIG fixture");
    },
  });
  const request = {
    homedir: directory,
    keyringFile: path.join(directory, "pubring.kbx"),
    signedFile: path.join(directory, "SHASUMS256.txt.asc"),
    outputFile: path.join(directory, "SHASUMS256.txt"),
  };

  try {
    assert.deepEqual(await runner(request), {
      exitCode: 0,
      status: "[GNUPG:] VALIDSIG fixture",
    });
    assert.equal(seen.executable, "gpg.exe");
    assert.deepEqual(seen.args, [
      "--no-options", "--batch", "--no-tty",
      "--homedir", ".",
      "--no-default-keyring", "--keyring", "pubring.kbx",
      "--trustdb-name", "trustdb.gpg",
      "--no-auto-key-retrieve", "--status-fd", "2",
      "--output", "SHASUMS256.txt",
      "--decrypt", "SHASUMS256.txt.asc",
    ]);
    assert.equal(seen.options.cwd, directory);
    assert.equal(seen.options.shell, false);
    await assert.rejects(
      runner({ ...request, outputFile: path.join(directory, "..", "escaped.txt") }),
      /unsupported GnuPG request/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("cache入力のsize上限超過を読込前に拒否する", async () => {
  const config = fixtureConfig();
  const cacheDirectory = await makeCache(config);
  const keyringPath = path.join(cacheDirectory, "pubring.kbx");
  try {
    const baseFs = await import("node:fs/promises");
    const fsImpl = {
      ...baseFs,
      async open(file, flags) {
        const handle = await baseFs.open(file, flags);
        if (path.resolve(file) !== path.resolve(keyringPath)) return handle;
        return {
          async stat() {
            return { isFile: () => true, size: 6 * 1024 * 1024 };
          },
          async readFile() {
            throw new Error("oversize body must not be read");
          },
          async close() {
            await handle.close();
          },
        };
      },
    };
    await assert.rejects(
      verifyFixtureNodeRelease({ cacheDirectory, loadConfig: async () => config, fsImpl }),
      /stage=source-size/,
    );
    await access(keyringPath);
  } finally {
    await rm(cacheDirectory, { recursive: true, force: true });
  }
});

test("公開verifyNodeReleaseは設定loaderとGnuPG runnerの差し替えを受け付けない", async () => {
  const config = fixtureConfig();
  const cacheDirectory = await makeCache(config);
  const directory = await mkdtemp(path.join(os.tmpdir(), "node-release-untrusted-config-"));
  const invalidConfig = path.join(directory, "node-runtime.json");
  await writeFile(invalidConfig, "{}", "utf8");
  try {
    const productionApi = await import("../scripts/portable/node-release.mjs");
    assert.equal("createGpgRunner" in productionApi, false);
    assert.equal("readOfficialInput" in productionApi, false);
    assert.equal("verifyNodeReleaseTrustChainCore" in productionApi, false);
    await assert.rejects(
      verifyNodeRelease({
        cacheDirectory,
        configSource: invalidConfig,
        loadConfig: async () => config,
        runGpg: successfulGpg(`${config.archiveSha256}  ${config.archiveName}\n`),
      }),
      /stage=configuration/,
    );
  } finally {
    await rm(cacheDirectory, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test("cacheの外部symlinkは内容を読む前に拒否する", async () => {
  const config = fixtureConfig();
  const cacheDirectory = await makeCache(config);
  const outsideDirectory = await mkdtemp(path.join(os.tmpdir(), "node-release-outside-"));
  const outsideKeyring = path.join(outsideDirectory, "outside-keyring.kbx");
  const cacheKeyring = path.join(cacheDirectory, "pubring.kbx");
  await writeFile(outsideKeyring, KEYRING);
  await rm(cacheKeyring);
  await symlink(outsideKeyring, cacheKeyring);
  try {
    await assert.rejects(
      verifyNodeRelease({
        cacheDirectory,
        loadConfig: async () => config,
        runGpg: successfulGpg(`${config.archiveSha256}  ${config.archiveName}\n`),
      }),
      /actual=symlink/,
    );
  } finally {
    await rm(cacheDirectory, { recursive: true, force: true });
    await rm(outsideDirectory, { recursive: true, force: true });
  }
});

test("cacheが偽の小さいstatを返しても最大+1 byteまでの固定chunk読込で停止する", async () => {
  const baseFs = await import("node:fs/promises");
  let legacyReadFileCalled = false;
  let lstatCalled = false;
  let closeCalled = false;
  const fakeMetadata = {
    isFile: () => true,
    isSymbolicLink: () => false,
    size: 0,
  };
  const fsImpl = {
    ...baseFs,
    async lstat() {
      lstatCalled = true;
      return fakeMetadata;
    },
    async open() {
      return {
        async stat() {
          return fakeMetadata;
        },
        async read(buffer) {
          buffer.fill(0x61);
          return { bytesRead: buffer.byteLength, buffer };
        },
        async readFile() {
          legacyReadFileCalled = true;
          return Buffer.alloc(0);
        },
        async close() {
          closeCalled = true;
        },
      };
    },
  };

  await assert.rejects(readBoundedCacheFile({
    file: "/fixed-cache/pubring.kbx",
    resource: "pubring.kbx",
    maximumBytes: 4,
    fsOps: fsImpl,
  }), /stage=source-size/);
  assert.equal(lstatCalled, true);
  assert.equal(legacyReadFileCalled, false);
  assert.equal(closeCalled, true);
});

test("cacheの固定chunk読込は成功時にもhandleをcloseする", async () => {
  const expected = Buffer.from("safe");
  let readCount = 0;
  let closeCalled = false;
  const metadata = {
    isFile: () => true,
    isSymbolicLink: () => false,
    size: expected.byteLength,
  };
  const fsOps = {
    async lstat() {
      return metadata;
    },
    async open() {
      return {
        async stat() {
          return metadata;
        },
        async read(buffer) {
          if (readCount > 0) return { bytesRead: 0, buffer };
          readCount += 1;
          expected.copy(buffer);
          return { bytesRead: expected.byteLength, buffer };
        },
        async close() {
          closeCalled = true;
        },
      };
    },
  };

  assert.deepEqual(await readBoundedCacheFile({
    file: "/fixed-cache/pubring.kbx",
    resource: "pubring.kbx",
    maximumBytes: 8,
    fsOps,
  }), expected);
  assert.equal(closeCalled, true);
});
