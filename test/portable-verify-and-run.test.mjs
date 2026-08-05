import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { EventEmitter } from "node:events";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import { writePortableManifest } from "../scripts/portable/manifest.mjs";
import * as verifyApi from "../src/portable/verify-and-run.mjs";

const VERSION = "0.28.0";
const NODE_VERSION = "24.18.0";
const MODULE_PATH = "app/src/portable/verify-and-run.mjs";
const ENTRYPOINT = "app/bin/cli.mjs";
const NODE_PATH = "runtime/node.exe";
const MANIFEST_NAME = "portable-manifest.json";
const execFileAsync = promisify(execFile);

async function hashFixtureFile(filename) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filename);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.once("error", reject);
    stream.once("end", resolve);
  });
  return hash.digest("hex");
}

async function writeFixtureManifest(root, nodeVersion = NODE_VERSION) {
  const files = [];
  for (const relative of [
    "PORTABLE-README.txt",
    ENTRYPOINT,
    "app/package.json",
    MODULE_PATH,
    NODE_PATH,
  ].sort()) {
    const filename = path.join(root, ...relative.split("/"));
    const metadata = await fs.stat(filename);
    files.push({
      path: relative,
      size: metadata.size,
      sha256: await hashFixtureFile(filename),
    });
  }
  await fs.writeFile(
    path.join(root, MANIFEST_NAME),
    `${JSON.stringify({
      schemaVersion: 1,
      intentPlannerVersion: VERSION,
      nodeVersion,
      platform: "win32",
      arch: "x64",
      entrypoint: ENTRYPOINT,
      files,
    }, null, 2)}\n`,
  );
}

async function createFixture(t, { viaGenerator = false } = {}) {
  const source = await fs.mkdtemp(path.join(os.tmpdir(), "portable-runtime-source-"));
  t.after(() => fs.rm(source, { recursive: true, force: true }));
  await fs.mkdir(path.join(source, "app", "src", "portable"), { recursive: true });
  await fs.mkdir(path.join(source, "app", "bin"), { recursive: true });
  await fs.mkdir(path.join(source, "runtime"), { recursive: true });
  await fs.writeFile(path.join(source, MODULE_PATH), "// verifier fixture\n");
  await fs.writeFile(path.join(source, ENTRYPOINT), "// cli fixture\n");
  await fs.writeFile(
    path.join(source, "app", "package.json"),
    `${JSON.stringify({ name: "intent-planner", version: VERSION }, null, 2)}\n`,
  );
  await fs.writeFile(path.join(source, NODE_PATH), Buffer.from([0x4d, 0x5a, 1, 2, 3]));
  await fs.writeFile(path.join(source, "PORTABLE-README.txt"), "Windows x64 portable\n");

  let root = await fs.realpath(source);
  let generated;
  if (viaGenerator) {
    generated = await writePortableManifest({
      payloadRoot: source,
      intentPlannerVersion: VERSION,
      nodeVersion: NODE_VERSION,
    });
    t.after(() => generated.cleanup().catch(() => {}));
    root = generated.payloadRoot;
  } else {
    await writeFixtureManifest(root);
  }
  return {
    generated,
    root,
    options: {
      payloadRoot: root,
      modulePath: path.join(root, ...MODULE_PATH.split("/")),
      platform: "win32",
      arch: "x64",
      nodeVersion: NODE_VERSION,
      execPath: path.join(root, ...NODE_PATH.split("/")),
    },
  };
}

async function createRealProcessFixture(t) {
  const source = await fs.mkdtemp(path.join(os.tmpdir(), "portable-runtime-real-"));
  const support = await fs.mkdtemp(path.join(os.tmpdir(), "portable-runtime-support-"));
  t.after(() => fs.rm(source, { recursive: true, force: true }));
  t.after(() => fs.rm(support, { recursive: true, force: true }));
  const root = await fs.realpath(source);
  await fs.mkdir(path.join(root, "app", "src", "portable"), { recursive: true });
  await fs.mkdir(path.join(root, "app", "bin"), { recursive: true });
  await fs.mkdir(path.join(root, "runtime"), { recursive: true });
  await fs.copyFile(
    fileURLToPath(new URL("../src/portable/verify-and-run.mjs", import.meta.url)),
    path.join(root, MODULE_PATH),
  );
  await fs.writeFile(
    path.join(root, ENTRYPOINT),
    `const record = JSON.stringify({
  args: process.argv.slice(2),
  cwd: process.cwd(),
  marker: process.env.PORTABLE_TEST_MARKER ?? null,
});
process.stdout.write(\`portable-probe-stdout:\${record}\\n\`);
process.stderr.write(\`portable-probe-stderr:\${record}\\n\`);
const exitIndex = process.argv.indexOf("--exit-code");
process.exitCode = exitIndex === -1 ? 0 : Number(process.argv[exitIndex + 1]);
`,
  );
  await fs.writeFile(
    path.join(root, "app", "package.json"),
    `${JSON.stringify({ name: "intent-planner", version: VERSION }, null, 2)}\n`,
  );
  await fs.copyFile(process.execPath, path.join(root, NODE_PATH));
  await fs.chmod(path.join(root, NODE_PATH), 0o700);
  await fs.writeFile(path.join(root, "PORTABLE-README.txt"), "Windows x64 portable\n");
  await writeFixtureManifest(root, process.versions.node);

  const preload = path.join(support, "windows-process-facts.mjs");
  await fs.writeFile(
    preload,
    `for (const [key, value] of [["platform", "win32"], ["arch", "x64"]]) {
  const descriptor = Object.getOwnPropertyDescriptor(process, key);
  if (!descriptor?.configurable) throw new Error(\`process.\${key} is not configurable\`);
  Object.defineProperty(process, key, { ...descriptor, value });
}
`,
  );
  const harness = path.join(support, "delegate-harness.mjs");
  await fs.writeFile(
    harness,
    `import {
  delegateToExistingCli,
  verifyPortablePayloadCore,
} from ${JSON.stringify(pathToFileURL(fileURLToPath(new URL("../src/portable/verify-and-run.mjs", import.meta.url))).href)};
const options = JSON.parse(process.env.PORTABLE_TEST_OPTIONS);
const handle = await verifyPortablePayloadCore(options);
const result = await delegateToExistingCli(handle, process.argv.slice(2));
if (result.signal !== null) process.kill(process.pid, result.signal);
else process.exitCode = result.exitCode;
`,
  );
  return {
    root,
    harness,
    preload,
    modulePath: path.join(root, MODULE_PATH),
    nodePath: path.join(root, NODE_PATH),
    entrypointPath: path.join(root, ENTRYPOINT),
    options: {
      payloadRoot: root,
      modulePath: path.join(root, MODULE_PATH),
      platform: "win32",
      arch: "x64",
      nodeVersion: process.versions.node,
      execPath: path.join(root, NODE_PATH),
    },
  };
}

function runChildProcess(command, args, options) {
  return new Promise((resolve) => {
    execFile(command, args, { encoding: "utf8", ...options }, (error, stdout, stderr) => {
      resolve({
        exitCode: error === null ? 0 : error.code,
        signal: error?.signal ?? null,
        stdout,
        stderr,
      });
    });
  });
}

function probeRecord(output, stream) {
  const prefix = `portable-probe-${stream}:`;
  const line = output.split(/\r?\n/).find((value) => value.startsWith(prefix));
  assert.ok(line, `${stream} probe output is present`);
  return JSON.parse(line.slice(prefix.length));
}

async function readManifest(root) {
  return JSON.parse(await fs.readFile(path.join(root, MANIFEST_NAME), "utf8"));
}

async function writeRawManifest(root, value, { canonical = true } = {}) {
  const text = canonical ? `${JSON.stringify(value, null, 2)}\n` : JSON.stringify(value);
  await fs.writeFile(path.join(root, MANIFEST_NAME), text);
}

async function refreshManifestFile(root, relative) {
  const manifest = await readManifest(root);
  const entry = manifest.files.find((file) => file.path === relative);
  assert.ok(entry, `${relative} is listed in the fixture manifest`);
  const filename = path.join(root, ...relative.split("/"));
  const metadata = await fs.stat(filename);
  entry.size = metadata.size;
  entry.sha256 = await hashFixtureFile(filename);
  await writeRawManifest(root, manifest);
}

async function expectStage(promise, pattern) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.name, "PortableRuntimeVerificationError");
    assert.equal(error.exitCode, 2);
    assert.match(error.message, pattern);
    assert.ok(error.message.length <= 720);
    return true;
  });
}

test("RED: 起動前検査モジュールが存在する", () => {
  assert.equal(typeof verifyApi.verifyPortablePayloadCore, "function");
});

test("3.1生成器のcanonical manifestと全ファイルを検査し、偽造不能な実行情報を返す", async (t) => {
  const fixture = await createFixture(t, { viaGenerator: true });
  const handle = await verifyApi.verifyPortablePayloadCore(fixture.options);

  assert.equal(Object.isFrozen(handle), true);
  assert.equal(handle.payloadRoot, fixture.root);
  assert.equal(handle.nodePath, fixture.options.execPath);
  assert.equal(handle.entrypointPath, path.join(fixture.root, ...ENTRYPOINT.split("/")));
  assert.equal(handle.manifest.intentPlannerVersion, VERSION);
  assert.equal(Object.isFrozen(handle.manifest), true);
  verifyApi.assertVerifiedPortableRuntimeHandle(handle);
  assert.throws(
    () => verifyApi.assertVerifiedPortableRuntimeHandle({ ...handle }),
    /stage=handle resource=value expected=verified-portable-runtime-handle actual=invalid/,
  );

  const refreshed = await verifyApi.reverifyVerifiedPortableRuntimeHandle(handle);
  assert.throws(() => verifyApi.assertVerifiedPortableRuntimeHandle(handle), /actual=invalid/);
  verifyApi.assertVerifiedPortableRuntimeHandle(refreshed);
  const consumed = await verifyApi.consumeVerifiedPortableRuntimeHandle(refreshed);
  assert.equal(consumed.nodePath, fixture.options.execPath);
  assert.equal(Object.isFrozen(consumed), true);
  assert.throws(() => verifyApi.assertVerifiedPortableRuntimeHandle(refreshed), /actual=invalid/);
});

test("公開入口は引数を受けず、実際のmodule位置とprocess情報だけを使う", async () => {
  assert.equal(verifyApi.verifyPortablePayload.length, 0);
  assert.equal(verifyApi.runPortableCli.length, 0);
  assert.equal(verifyApi.delegateToExistingCli.length, 2);
  await assert.rejects(verifyApi.verifyPortablePayload(), /portable-runtime: stage=(location|environment)/);
});

test("欠損、余分、サイズ違い、同サイズhash違いを区別して拒否する", async (t) => {
  await t.test("missing", async (t) => {
    const fixture = await createFixture(t);
    await fs.rm(path.join(fixture.root, "PORTABLE-README.txt"));
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /stage=file-set resource=PORTABLE-README\.txt expected=present actual=missing/);
  });
  await t.test("extra", async (t) => {
    const fixture = await createFixture(t);
    await fs.writeFile(path.join(fixture.root, "extra.txt"), "extra");
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /stage=file-set resource=extra\.txt expected=not-present actual=extra/);
  });
  await t.test("extra empty directory", async (t) => {
    const fixture = await createFixture(t);
    await fs.mkdir(path.join(fixture.root, "extra-empty"));
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /stage=file-set resource=extra-empty expected=implied-directory actual=extra/);
  });
  await t.test("size", async (t) => {
    const fixture = await createFixture(t);
    await fs.appendFile(path.join(fixture.root, ENTRYPOINT), "x");
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /stage=file-integrity resource=app\/bin\/cli\.mjs expected=\d+ actual=\d+/);
  });
  await t.test("hash", async (t) => {
    const fixture = await createFixture(t);
    const filename = path.join(fixture.root, ENTRYPOINT);
    const bytes = await fs.readFile(filename);
    bytes[0] ^= 1;
    await fs.writeFile(filename, bytes);
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /stage=file-integrity resource=app\/bin\/cli\.mjs expected=[0-9a-f]{64} actual=[0-9a-f]{64}/);
  });
});

test("manifestはdiskだけからbounded/no-followで読み、schemaとcanonical bytesを厳密検査する", async (t) => {
  await t.test("noncanonical", async (t) => {
    const fixture = await createFixture(t);
    await writeRawManifest(fixture.root, await readManifest(fixture.root), { canonical: false });
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /stage=schema resource=portable-manifest\.json expected=canonical-json-bytes actual=noncanonical/);
  });
  for (const scenario of ["duplicate", "case", "unsafe", "self", "uppercase hash", "unsorted", "extra key"]) {
    await t.test(scenario, async (t) => {
      const fixture = await createFixture(t);
      const manifest = await readManifest(fixture.root);
      if (scenario === "duplicate") manifest.files.splice(1, 0, { ...manifest.files[0] });
      if (scenario === "case") manifest.files.splice(1, 0, { ...manifest.files[0], path: manifest.files[0].path.toUpperCase() });
      if (scenario === "unsafe") manifest.files[0].path = "../escape";
      if (scenario === "self") manifest.files[0].path = MANIFEST_NAME;
      if (scenario === "uppercase hash") manifest.files[0].sha256 = "A".repeat(64);
      if (scenario === "unsorted") manifest.files.reverse();
      if (scenario === "extra key") manifest.unexpected = true;
      await writeRawManifest(fixture.root, manifest);
      await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /stage=schema/);
    });
  }
  await t.test("oversize manifest", async (t) => {
    const fixture = await createFixture(t);
    const file = await fs.open(path.join(fixture.root, MANIFEST_NAME), "w");
    await file.truncate(16 * 1024 * 1024 + 1);
    await file.close();
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /stage=read resource=portable-manifest\.json expected=at-most-16777216-bytes actual=too-large/);
  });
});

test("root配下を再帰走査し、file・directory・manifestのlinkとspecial fileを拒否する", async (t) => {
  await t.test("file symlink", async (t) => {
    const fixture = await createFixture(t);
    const target = path.join(fixture.root, ENTRYPOINT);
    await fs.rename(target, `${target}.real`);
    await fs.symlink(`${path.basename(target)}.real`, target);
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /resource=app\/bin\/cli\.mjs expected=regular-file-or-directory actual=link/);
  });
  await t.test("directory symlink", async (t) => {
    const fixture = await createFixture(t);
    const directory = path.join(fixture.root, "app", "bin");
    await fs.rename(directory, `${directory}-real`);
    await fs.symlink(`${path.basename(directory)}-real`, directory, "dir");
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /resource=app\/bin expected=regular-file-or-directory actual=link/);
  });
  await t.test("manifest symlink", async (t) => {
    const fixture = await createFixture(t);
    const manifest = path.join(fixture.root, MANIFEST_NAME);
    await fs.rename(manifest, `${manifest}.real`);
    await fs.symlink(`${path.basename(manifest)}.real`, manifest);
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /resource=portable-manifest\.json expected=regular-file actual=link/);
  });
  await t.test("broken link", async (t) => {
    const fixture = await createFixture(t);
    await fs.symlink("missing", path.join(fixture.root, "broken"));
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /resource=broken expected=regular-file-or-directory actual=link/);
  });
  await t.test("special fifo", { skip: process.platform === "win32" }, async (t) => {
    const fixture = await createFixture(t);
    const fifo = path.join(fixture.root, "special.fifo");
    await execFileAsync("mkfifo", [fifo]);
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /resource=special\.fifo expected=regular-file-or-directory actual=special-file/);
  });
});

test("Windows x64・同梱Node版・同梱node.exe実体を固定する", async (t) => {
  for (const [field, value, pattern] of [
    ["platform", "linux", /resource=platform expected=win32 actual=linux/],
    ["arch", "arm64", /resource=arch expected=x64 actual=arm64/],
    ["nodeVersion", "24.18.1", /resource=nodeVersion expected=24\.18\.0 actual=24\.18\.1/],
  ]) {
    await t.test(field, async (t) => {
      const fixture = await createFixture(t);
      await expectStage(
        verifyApi.verifyPortablePayloadCore({ ...fixture.options, [field]: value }),
        pattern,
      );
    });
  }
  await t.test("host execPath", async (t) => {
    const fixture = await createFixture(t);
    await expectStage(
      verifyApi.verifyPortablePayloadCore({ ...fixture.options, execPath: process.execPath }),
      /resource=process\.execPath expected=runtime\/node\.exe actual=host-or-other-runtime/,
    );
  });
});

test("package版・固定entrypoint・verifier自身の正規配置を要求する", async (t) => {
  await t.test("package version", async (t) => {
    const fixture = await createFixture(t);
    const filename = path.join(fixture.root, "app", "package.json");
    const replacement = `${JSON.stringify({ name: "intent-planner", version: "0.29.0" }, null, 2)}\n`;
    const manifest = await readManifest(fixture.root);
    const entry = manifest.files.find((file) => file.path === "app/package.json");
    entry.size = Buffer.byteLength(replacement);
    entry.sha256 = createHash("sha256").update(replacement).digest("hex");
    await fs.writeFile(filename, replacement);
    await writeRawManifest(fixture.root, manifest);
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /stage=metadata resource=app\/package\.json expected=0\.28\.0 actual=0\.29\.0/);
  });
  await t.test("entrypoint missing from manifest", async (t) => {
    const fixture = await createFixture(t);
    const manifest = await readManifest(fixture.root);
    manifest.files = manifest.files.filter((file) => file.path !== ENTRYPOINT);
    await writeRawManifest(fixture.root, manifest);
    await expectStage(verifyApi.verifyPortablePayloadCore(fixture.options), /stage=schema resource=entrypoint expected=listed-regular-file actual=missing/);
  });
  await t.test("module at wrong location", async (t) => {
    const fixture = await createFixture(t);
    await expectStage(
      verifyApi.verifyPortablePayloadCore({ ...fixture.options, modulePath: path.join(fixture.root, ENTRYPOINT) }),
      /stage=location resource=module expected=app\/src\/portable\/verify-and-run\.mjs actual=wrong-location/,
    );
  });
  await t.test("module outside root", async (t) => {
    const fixture = await createFixture(t);
    await expectStage(
      verifyApi.verifyPortablePayloadCore({
        ...fixture.options,
        modulePath: fileURLToPath(import.meta.url),
      }),
      /stage=location resource=module expected=inside-payload-root actual=outside/,
    );
  });
  await t.test("root symlink", async (t) => {
    const fixture = await createFixture(t);
    const alias = `${fixture.root}-alias`;
    await fs.symlink(fixture.root, alias, "dir");
    t.after(() => fs.rm(alias, { force: true }));
    await expectStage(
      verifyApi.verifyPortablePayloadCore({
        ...fixture.options,
        payloadRoot: alias,
        modulePath: path.join(alias, ...MODULE_PATH.split("/")),
        execPath: path.join(alias, ...NODE_PATH.split("/")),
      }),
      /stage=location resource=payloadRoot expected=canonical-directory actual=link/,
    );
  });
  await t.test("noncanonical root spelling", async (t) => {
    const fixture = await createFixture(t);
    await expectStage(
      verifyApi.verifyPortablePayloadCore({
        ...fixture.options,
        payloadRoot: `${fixture.root}${path.sep}app${path.sep}..`,
      }),
      /stage=location resource=payloadRoot expected=absolute-canonical-directory actual=noncanonical/,
    );
  });
});

test("再検査は旧handleを失効させ、変更済み重要ファイルを渡さない", async (t) => {
  const fixture = await createFixture(t);
  const handle = await verifyApi.verifyPortablePayloadCore(fixture.options);
  await fs.appendFile(handle.entrypointPath, "changed");
  await assert.rejects(verifyApi.reverifyVerifiedPortableRuntimeHandle(handle), /stage=file-integrity/);
  assert.throws(() => verifyApi.assertVerifiedPortableRuntimeHandle(handle), /actual=invalid/);
});

test("CLI委譲用のhandle消費は必ず再検査し、検査後の変更を渡さない", async (t) => {
  const fixture = await createFixture(t);
  const handle = await verifyApi.verifyPortablePayloadCore(fixture.options);
  await fs.appendFile(handle.nodePath, "changed");
  await assert.rejects(
    verifyApi.consumeVerifiedPortableRuntimeHandle(handle),
    /stage=file-integrity resource=runtime\/node\.exe/,
  );
  assert.throws(() => verifyApi.assertVerifiedPortableRuntimeHandle(handle), /actual=invalid/);
});

test("失敗表示は本文を含まず、検査と委譲は修復・取得・CLI直接importを持たない", async (t) => {
  const fixture = await createFixture(t);
  const secret = "SECRET-BODY-SHOULD-NOT-LEAK";
  const packageFile = path.join(fixture.root, "app", "package.json");
  const bytes = await fs.readFile(packageFile);
  const replacement = Buffer.alloc(bytes.byteLength, "x");
  replacement.set(Buffer.from(secret).subarray(0, replacement.byteLength));
  await fs.writeFile(packageFile, replacement);
  await assert.rejects(verifyApi.verifyPortablePayloadCore(fixture.options), (error) => {
    assert.doesNotMatch(error.message, new RegExp(secret));
    assert.match(verifyApi.formatPortableRuntimeError(error), /^portable-runtime: stage=/);
    assert.doesNotMatch(verifyApi.formatPortableRuntimeError(error), new RegExp(secret));
    return true;
  });

  const source = await fs.readFile(
    new URL("../src/portable/verify-and-run.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /node:(?:http|https|net|tls|dns)/);
  assert.doesNotMatch(source, /\b(?:fetch|execFile|process\.chdir)\s*\(/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(?:bin\/cli\.mjs|scripts\/portable)/);
  assert.doesNotMatch(source, /\b(?:writeFile|appendFile|mkdir|rm|rename|copyFile|cp)\s*\(/);
  assert.doesNotMatch(source, /\b(?:npm|npx|powershell|curl|bitsadmin)\b/i);
  assert.doesNotMatch(source, /\b(?:shell|PATH)\s*:/);
});

function childResult({ code = 0, signal = null, error } = {}) {
  const child = new EventEmitter();
  queueMicrotask(() => {
    if (error) child.emit("error", error);
    else child.emit("close", code, signal);
  });
  return child;
}

async function verifyAndDelegate(options, args, spawnProcess) {
  const handle = await verifyApi.verifyPortablePayloadCore(options);
  return verifyApi.delegateToExistingCliCore(handle, args, spawnProcess);
}

test("欠損・1バイト破損・CPU・版・入口の不一致は既存CLIを一度も起動しない", async (t) => {
  const cases = [
    {
      name: "missing",
      mutate: async (fixture) => fs.rm(path.join(fixture.root, "PORTABLE-README.txt")),
      expected: /stage=file-set resource=PORTABLE-README\.txt expected=present actual=missing/,
    },
    {
      name: "one-byte corruption",
      mutate: async (fixture) => {
        const filename = path.join(fixture.root, ENTRYPOINT);
        const bytes = await fs.readFile(filename);
        bytes[0] ^= 1;
        await fs.writeFile(filename, bytes);
      },
      expected: /stage=file-integrity resource=app\/bin\/cli\.mjs expected=[0-9a-f]{64} actual=[0-9a-f]{64}/,
    },
    {
      name: "CPU mismatch",
      mutate: async (fixture) => {
        fixture.options.arch = "arm64";
      },
      expected: /stage=environment resource=arch expected=x64 actual=arm64/,
    },
    {
      name: "version mismatch",
      mutate: async (fixture) => {
        await fs.writeFile(
          path.join(fixture.root, "app", "package.json"),
          `${JSON.stringify({ name: "intent-planner", version: "0.29.0" }, null, 2)}\n`,
        );
        await refreshManifestFile(fixture.root, "app/package.json");
      },
      expected: /stage=metadata resource=app\/package\.json expected=0\.28\.0 actual=0\.29\.0/,
    },
    {
      name: "entrypoint mismatch",
      mutate: async (fixture) => {
        const manifest = await readManifest(fixture.root);
        manifest.entrypoint = "app/bin/not-cli.mjs";
        await writeRawManifest(fixture.root, manifest);
      },
      expected: /stage=schema resource=entrypoint expected=app\/bin\/cli\.mjs actual=app\/bin\/not-cli\.mjs/,
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async (t) => {
      const fixture = await createFixture(t);
      await scenario.mutate(fixture);
      let launches = 0;
      await assert.rejects(
        verifyAndDelegate(fixture.options, ["--dry-run"], () => {
          launches += 1;
          return childResult();
        }),
        scenario.expected,
      );
      assert.equal(launches, 0);
    });
  }
});

test("検査対象本文に不正な版があっても表示せず、既存CLIを起動しない", async (t) => {
  const fixture = await createFixture(t);
  const secret = "PACKAGE-BODY-SECRET";
  await fs.writeFile(
    path.join(fixture.root, "app", "package.json"),
    `${JSON.stringify({ name: "intent-planner", version: secret }, null, 2)}\n`,
  );
  await refreshManifestFile(fixture.root, "app/package.json");
  let launches = 0;

  await assert.rejects(
    verifyAndDelegate(fixture.options, [], () => {
      launches += 1;
      return childResult();
    }),
    (error) => {
      assert.equal(
        error.message,
        "portable-runtime: stage=metadata resource=app/package.json expected=0.28.0 actual=invalid",
      );
      assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );
  assert.equal(launches, 0);
});

test("検証済み環境だけを同梱Nodeと既存CLIへ全実行文脈付きで委譲する", async (t) => {
  const fixture = await createFixture(t);
  const handle = await verifyApi.verifyPortablePayloadCore(fixture.options);
  const args = ["空 白", "--lang", "ja", "--agent=codex", "引用\"符"];
  const calls = [];

  const result = await verifyApi.delegateToExistingCliCore(handle, args, (...call) => {
    calls.push(call);
    return childResult({ code: 0 });
  });

  assert.deepEqual(calls, [[
    fixture.options.execPath,
    [path.join(fixture.root, ...ENTRYPOINT.split("/")), ...args],
    { cwd: process.cwd(), env: process.env, stdio: "inherit" },
  ]]);
  assert.deepEqual(result, { exitCode: 0, signal: null });
  assert.equal(Object.isFrozen(result), true);
  assert.throws(() => verifyApi.assertVerifiedPortableRuntimeHandle(handle), /actual=invalid/);
});

test("製品用委譲は実spawnで引数・cwd・env・stdout・stderr・終了コードを維持する", {
  timeout: 30_000,
}, async (t) => {
  const fixture = await createRealProcessFixture(t);
  const workingDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "portable-runtime-cwd-"));
  t.after(() => fs.rm(workingDirectory, { recursive: true, force: true }));
  const cwd = await fs.realpath(workingDirectory);

  for (const expectedExitCode of [0, 37]) {
    await t.test(`exit ${expectedExitCode}`, async () => {
      const args = ["空 白", "--quoted", "a\"b", "--exit-code", String(expectedExitCode)];
      const marker = `delegate-${expectedExitCode}`;
      const result = await runChildProcess(
        process.execPath,
        [fixture.harness, ...args],
        {
          cwd,
          env: {
            ...process.env,
            NODE_OPTIONS: "",
            PORTABLE_TEST_MARKER: marker,
            PORTABLE_TEST_OPTIONS: JSON.stringify(fixture.options),
          },
        },
      );

      assert.equal(result.exitCode, expectedExitCode);
      assert.equal(result.signal, null);
      const expected = { args, cwd, marker };
      assert.deepEqual(probeRecord(result.stdout, "stdout"), expected);
      assert.deepEqual(probeRecord(result.stderr, "stderr"), expected);
    });
  }
});

test("製品用委譲は実行不能な同梱runtimeの実spawnで止まり、代替処理を起動しない", {
  skip: process.platform !== "win32",
}, async (t) => {
  const fixture = await createFixture(t);
  await fs.chmod(fixture.options.execPath, 0o700);
  const handle = await verifyApi.verifyPortablePayloadCore(fixture.options);
  await assert.rejects(
    verifyApi.delegateToExistingCli(handle, []),
    (error) => {
      assert.equal(error.exitCode, 2);
      assert.match(
        error.message,
        /stage=delegate resource=app\/bin\/cli\.mjs expected=started-with-bundled-runtime actual=(?:EACCES|ENOEXEC|EINVAL|UNKNOWN|Unknown system error -\d+)/,
      );
      return true;
    },
  );
});

test("検査モジュールの直接実行は実spawnしたCLIの出力と非ゼロ終了を呼出元へ伝える", {
  timeout: 30_000,
}, async (t) => {
  const fixture = await createRealProcessFixture(t);
  const workingDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "portable-direct-cwd-"));
  t.after(() => fs.rm(workingDirectory, { recursive: true, force: true }));
  const cwd = await fs.realpath(workingDirectory);
  const args = ["直 接", "--quoted", "x\"y", "--exit-code", "23"];
  const marker = "direct-execution";
  const result = await runChildProcess(
    fixture.nodePath,
    [fixture.modulePath, ...args],
    {
      cwd,
      env: {
        ...process.env,
        NODE_OPTIONS: `--import=${pathToFileURL(fixture.preload).href}`,
        PORTABLE_TEST_MARKER: marker,
      },
    },
  );

  assert.equal(result.exitCode, 23);
  assert.equal(result.signal, null);
  const expected = { args, cwd, marker };
  assert.deepEqual(probeRecord(result.stdout, "stdout"), expected);
  assert.deepEqual(probeRecord(result.stderr, "stderr"), expected);
});

test("既存CLIの非ゼロ終了とsignalを変換せず返す", async (t) => {
  await t.test("nonzero", async (t) => {
    const fixture = await createFixture(t);
    const handle = await verifyApi.verifyPortablePayloadCore(fixture.options);
    const result = await verifyApi.delegateToExistingCliCore(
      handle,
      ["--invalid"],
      () => childResult({ code: 64 }),
    );
    assert.deepEqual(result, { exitCode: 64, signal: null });
  });

  await t.test("signal", async (t) => {
    const fixture = await createFixture(t);
    const handle = await verifyApi.verifyPortablePayloadCore(fixture.options);
    const result = await verifyApi.delegateToExistingCliCore(
      handle,
      [],
      () => childResult({ code: null, signal: "SIGTERM" }),
    );
    assert.deepEqual(result, { exitCode: null, signal: "SIGTERM" });
  });
});

test("起動不能は原因付き非ゼロとなり、別ランタイムへ切り替えない", async (t) => {
  const fixture = await createFixture(t);
  const handle = await verifyApi.verifyPortablePayloadCore(fixture.options);
  let calls = 0;
  await assert.rejects(
    verifyApi.delegateToExistingCliCore(handle, [], () => {
      calls += 1;
      return childResult({ error: Object.assign(new Error("SECRET spawn detail"), { code: "EACCES" }) });
    }),
    (error) => {
      assert.equal(error.exitCode, 2);
      assert.match(error.message, /stage=delegate resource=app\/bin\/cli\.mjs expected=started-with-bundled-runtime actual=EACCES/);
      assert.doesNotMatch(error.message, /SECRET/);
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("未検証・失効・再検査失敗handleではCLIを起動しない", async (t) => {
  let calls = 0;
  const spawn = () => {
    calls += 1;
    return childResult();
  };
  await assert.rejects(
    verifyApi.delegateToExistingCliCore({}, [], spawn),
    /stage=handle resource=value expected=verified-portable-runtime-handle actual=invalid/,
  );

  const consumedFixture = await createFixture(t);
  const consumed = await verifyApi.verifyPortablePayloadCore(consumedFixture.options);
  await verifyApi.consumeVerifiedPortableRuntimeHandle(consumed);
  await assert.rejects(
    verifyApi.delegateToExistingCliCore(consumed, [], spawn),
    /stage=handle resource=value expected=verified-portable-runtime-handle actual=invalid/,
  );

  const changedFixture = await createFixture(t);
  const changed = await verifyApi.verifyPortablePayloadCore(changedFixture.options);
  await fs.appendFile(changed.entrypointPath, "changed");
  await assert.rejects(
    verifyApi.delegateToExistingCliCore(changed, [], spawn),
    /stage=file-integrity resource=app\/bin\/cli\.mjs/,
  );
  assert.equal(calls, 0);
});
