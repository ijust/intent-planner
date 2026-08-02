import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
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

async function createFixture(t) {
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

  const generated = await writePortableManifest({
    payloadRoot: source,
    intentPlannerVersion: VERSION,
    nodeVersion: NODE_VERSION,
  });
  t.after(() => generated.cleanup().catch(() => {}));
  return {
    generated,
    root: generated.payloadRoot,
    options: {
      payloadRoot: generated.payloadRoot,
      modulePath: path.join(generated.payloadRoot, ...MODULE_PATH.split("/")),
      platform: "win32",
      arch: "x64",
      nodeVersion: NODE_VERSION,
      execPath: path.join(generated.payloadRoot, ...NODE_PATH.split("/")),
    },
  };
}

async function readManifest(root) {
  return JSON.parse(await fs.readFile(path.join(root, MANIFEST_NAME), "utf8"));
}

async function writeRawManifest(root, value, { canonical = true } = {}) {
  const text = canonical ? `${JSON.stringify(value, null, 2)}\n` : JSON.stringify(value);
  await fs.writeFile(path.join(root, MANIFEST_NAME), text);
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
  const fixture = await createFixture(t);
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

test("失敗表示は本文を含まず、検査は修復・取得・CLI委譲・cwd参照を持たない", async (t) => {
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
  assert.doesNotMatch(source, /node:(?:child_process|http|https|net|tls|dns)/);
  assert.doesNotMatch(source, /\b(?:fetch|spawn|execFile|process\.cwd|process\.chdir)\s*\(/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(?:bin\/cli\.mjs|scripts\/portable)/);
  assert.doesNotMatch(source, /\b(?:writeFile|appendFile|mkdir|rm|rename|copyFile|cp)\s*\(/);
});
