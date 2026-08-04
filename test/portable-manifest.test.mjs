import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import * as manifestApi from "../scripts/portable/manifest.mjs";

const {
  createPortableManifest,
  serializePortableManifest,
  validatePortableManifest,
  verifyPortableManifest,
  writePortableManifest,
} = manifestApi;

const execFileAsync = promisify(execFile);
const HASH = "a".repeat(64);

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "portable-manifest-"));
  await fs.mkdir(path.join(root, "app", "bin"), { recursive: true });
  await fs.mkdir(path.join(root, "runtime"));
  await fs.writeFile(path.join(root, "app", "bin", "cli.mjs"), "console.log('ok');\n");
  await fs.writeFile(path.join(root, "runtime", "node.exe"), Buffer.from([3, 1, 4, 1, 5]));
  await fs.writeFile(path.join(root, "PORTABLE-README.txt"), "portable\n");
  return root;
}

async function addLateLargeFile(root, size = 64 * 1024 * 1024) {
  const handle = await fs.open(path.join(root, "runtime", "zz-late-large.bin"), "w");
  await handle.truncate(size);
  await handle.close();
}

async function snapshotNames(parent) {
  return new Set(
    (await fs.readdir(parent)).filter((name) => name.startsWith(".intent-planner-snapshot-")),
  );
}

async function waitForCapturedFile(parent, sourceRoot, relativePath, excluded, attempts = 500) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const names = await fs.readdir(parent);
    for (const name of names) {
      if (!name.startsWith(".intent-planner-snapshot-") || excluded.has(name)) continue;
      const candidate = path.join(parent, name, "payload", relativePath);
      try {
        if ((await fs.lstat(candidate)).isFile()) return candidate;
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.fail(`captured snapshot file did not appear for ${sourceRoot}`);
}

async function trackedHandle(t, promise) {
  const handle = await promise;
  t.after(() => handle.cleanup().catch(() => {}));
  return handle;
}

const metadata = Object.freeze({
  intentPlannerVersion: "0.28.0",
  nodeVersion: "24.18.0",
});

function validManifest(files = [{
  path: "app/bin/cli.mjs",
  size: 1,
  sha256: HASH,
}]) {
  return {
    schemaVersion: 1,
    intentPlannerVersion: "0.28.0",
    nodeVersion: "24.18.0",
    platform: "win32",
    arch: "x64",
    entrypoint: "app/bin/cli.mjs",
    files,
  };
}

test("全通常ファイルを POSIX 相対パス順で列挙し、同じ内容から同じ bytes を作る", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const first = await trackedHandle(
    t,
    createPortableManifest({ payloadRoot: root, ...metadata }),
  );
  const second = await trackedHandle(
    t,
    createPortableManifest({ payloadRoot: root, ...metadata }),
  );

  assert.equal(Object.isFrozen(first), true);
  assert.equal(first.manifestMaterialized, false);
  assert.equal(path.isAbsolute(first.payloadRoot), true);
  assert.match(
    path.basename(path.dirname(first.payloadRoot)),
    /^\.intent-planner-snapshot-[0-9a-f]{32}$/,
  );
  manifestApi.assertVerifiedPortableManifestHandle(first);
  assert.deepEqual(first.manifest.files.map((entry) => entry.path), [
    "PORTABLE-README.txt",
    "app/bin/cli.mjs",
    "runtime/node.exe",
  ]);
  assert.deepEqual(first.manifest, second.manifest);
  assert.deepEqual(
    serializePortableManifest(first.manifest),
    serializePortableManifest(second.manifest),
  );
  assert.equal(serializePortableManifest(first.manifest).at(-1), 0x0a);
  for (const entry of first.manifest.files) {
    assert.equal(Number.isSafeInteger(entry.size) && entry.size >= 0, true);
    assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  }
});

test("マニフェストを書き、直後の再読込と全ファイル照合に成功する", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const written = await trackedHandle(
    t,
    writePortableManifest({ payloadRoot: root, ...metadata }),
  );
  await assert.rejects(fs.access(path.join(root, "portable-manifest.json")));
  const bytes = await fs.readFile(path.join(written.payloadRoot, "portable-manifest.json"));
  assert.equal(written.manifestMaterialized, true);
  assert.deepEqual(bytes, serializePortableManifest(written.manifest));
  const verified = await trackedHandle(t, verifyPortableManifest({
    payloadRoot: written.payloadRoot,
    expectedIntentPlannerVersion: metadata.intentPlannerVersion,
    expectedNodeVersion: metadata.nodeVersion,
  }));
  assert.deepEqual(verified.manifest, written.manifest);
});

test("読戻した manifest の版・canonical bytes が要求値と違えば拒否する", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const generated = await trackedHandle(
    t,
    createPortableManifest({ payloadRoot: root, ...metadata }),
  );
  const changedVersion = { ...generated.manifest, intentPlannerVersion: "0.29.0" };
  await fs.writeFile(
    path.join(root, "portable-manifest.json"),
    serializePortableManifest(changedVersion),
  );
  await assert.rejects(
    verifyPortableManifest({
      payloadRoot: root,
      expectedIntentPlannerVersion: metadata.intentPlannerVersion,
      expectedNodeVersion: metadata.nodeVersion,
    }),
    /stage=metadata resource=intentPlannerVersion expected=0\.28\.0 actual=0\.29\.0/,
  );

  await fs.writeFile(
    path.join(root, "portable-manifest.json"),
    Buffer.from(JSON.stringify(generated.manifest), "utf8"),
  );
  await assert.rejects(
    verifyPortableManifest({
      payloadRoot: root,
      expectedIntentPlannerVersion: metadata.intentPlannerVersion,
      expectedNodeVersion: metadata.nodeVersion,
    }),
    /stage=schema resource=portable-manifest\.json expected=canonical-json-bytes actual=noncanonical/,
  );
});

test("公開 verify API は memory manifest 差替えを拒否し必ず disk を読む", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const precomputed = await trackedHandle(
    t,
    createPortableManifest({ payloadRoot: root, ...metadata }),
  );
  await fs.writeFile(path.join(root, "portable-manifest.json"), "not-json\n");

  await assert.rejects(
    verifyPortableManifest({
      payloadRoot: root,
      expectedIntentPlannerVersion: metadata.intentPlannerVersion,
      expectedNodeVersion: metadata.nodeVersion,
      manifest: precomputed.manifest,
    }),
    /stage=input resource=options expected=exact-verify-keys actual=invalid-keys/,
  );
  await assert.rejects(
    verifyPortableManifest({
      payloadRoot: root,
      expectedIntentPlannerVersion: metadata.intentPlannerVersion,
      expectedNodeVersion: metadata.nodeVersion,
    }),
    /stage=schema resource=portable-manifest\.json expected=valid-json actual=invalid/,
  );
});

test("create・verify・write は取得済みbytesだけから一貫したprivate snapshotを返す", async (t) => {
  const operations = ["create", "verify", "write"];
  for (const operationName of operations) {
    await t.test(operationName, async (t) => {
      const root = await fixture();
      const parent = path.dirname(root);
      t.after(() => fs.rm(root, { recursive: true, force: true }));
      await addLateLargeFile(root);
      if (operationName === "verify") {
        const prepared = await trackedHandle(
          t,
          createPortableManifest({ payloadRoot: root, ...metadata }),
        );
        await fs.writeFile(
          path.join(root, "portable-manifest.json"),
          serializePortableManifest(prepared.manifest),
        );
      }
      const earlyFile = path.join(root, "app", "bin", "cli.mjs");
      const original = await fs.readFile(earlyFile);
      const changed = Buffer.alloc(original.byteLength, 0x79);
      const existingSnapshots = await snapshotNames(parent);
      const operation = operationName === "create"
        ? createPortableManifest({ payloadRoot: root, ...metadata })
        : operationName === "verify"
          ? verifyPortableManifest({
            payloadRoot: root,
            expectedIntentPlannerVersion: metadata.intentPlannerVersion,
            expectedNodeVersion: metadata.nodeVersion,
          })
          : writePortableManifest({ payloadRoot: root, ...metadata });

      const captured = await waitForCapturedFile(
        parent,
        root,
        "app/bin/cli.mjs",
        existingSnapshots,
      );
      assert.deepEqual(await fs.readFile(captured), original);
      await fs.writeFile(earlyFile, changed);
      const handle = await trackedHandle(t, operation);

      assert.deepEqual(await fs.readFile(earlyFile), changed);
      assert.deepEqual(
        await fs.readFile(path.join(handle.payloadRoot, "app", "bin", "cli.mjs")),
        original,
      );
      const entry = handle.manifest.files.find((file) => file.path === "app/bin/cli.mjs");
      assert.equal(entry.sha256, createHash("sha256").update(original).digest("hex"));
      assert.equal(handle.manifestMaterialized, operationName !== "create");
    });
  }
});

test("pre-open済みsource handleの変更はsourceだけへ反映されsnapshot内部は一貫する", async (t) => {
  const root = await fixture();
  const parent = path.dirname(root);
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await addLateLargeFile(root);
  const earlyFile = path.join(root, "app", "bin", "cli.mjs");
  const original = await fs.readFile(earlyFile);
  const changed = Buffer.alloc(original.byteLength, 0x7a);
  const preopened = await fs.open(earlyFile, "r+");
  t.after(() => preopened.close().catch(() => {}));

  const existingSnapshots = await snapshotNames(parent);
  const operation = writePortableManifest({ payloadRoot: root, ...metadata });
  await waitForCapturedFile(parent, root, "app/bin/cli.mjs", existingSnapshots);
  await preopened.write(changed, 0, changed.byteLength, 0);
  await preopened.sync();
  await preopened.close();

  const handle = await trackedHandle(t, operation);
  assert.deepEqual(await fs.readFile(earlyFile), changed);
  assert.deepEqual(
    await fs.readFile(path.join(handle.payloadRoot, "app", "bin", "cli.mjs")),
    original,
  );
});

test("handle は偽造不能でcleanup開始時に失効し、並行cleanupも安全", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const handle = await createPortableManifest({ payloadRoot: root, ...metadata });
  assert.throws(
    () => manifestApi.assertVerifiedPortableManifestHandle({ ...handle }),
    /verified-portable-manifest-handle/,
  );
  manifestApi.assertVerifiedPortableManifestHandle(handle);
  const first = handle.cleanup();
  assert.equal(handle.cleanup(), first);
  assert.throws(
    () => manifestApi.assertVerifiedPortableManifestHandle(handle),
    /verified-portable-manifest-handle/,
  );
  await Promise.all([first, handle.cleanup(), handle.cleanup()]);
  await assert.rejects(fs.access(handle.payloadRoot));
});

test("cleanup はsnapshot pathの差替えを削除せず拒否し、同一物へ戻せば再試行できる", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const handle = await createPortableManifest({ payloadRoot: root, ...metadata });
  const container = path.dirname(handle.payloadRoot);
  const parked = `${container}.parked`;
  const victim = await fs.mkdtemp(path.join(path.dirname(container), "portable-cleanup-victim-"));
  const victimFile = path.join(victim, "victim.txt");
  await fs.writeFile(victimFile, "keep\n");
  t.after(async () => {
    await fs.rm(container, { recursive: true, force: true });
    await fs.rm(parked, { recursive: true, force: true });
    await fs.rm(victim, { recursive: true, force: true });
  });

  await fs.rename(container, parked);
  await fs.rename(victim, container);
  await assert.rejects(handle.cleanup(), /stage=snapshot-cleanup.*identity-changed/);
  assert.equal(await fs.readFile(path.join(container, "victim.txt"), "utf8"), "keep\n");
  assert.throws(
    () => manifestApi.assertVerifiedPortableManifestHandle(handle),
    /verified-portable-manifest-handle/,
  );

  await fs.rename(container, victim);
  await fs.rename(parked, container);
  await handle.cleanup();
  await assert.rejects(fs.access(container));
  assert.equal(await fs.readFile(victimFile, "utf8"), "keep\n");
});

test("snapshot container と payload は private mode 0700 で作られる", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const handle = await trackedHandle(
    t,
    createPortableManifest({ payloadRoot: root, ...metadata }),
  );
  if (process.platform !== "win32") {
    assert.equal((await fs.stat(path.dirname(handle.payloadRoot))).mode & 0o777, 0o700);
    assert.equal((await fs.stat(handle.payloadRoot)).mode & 0o777, 0o700);
  }
});

test("source scan失敗ではowned snapshotだけを回収しsourceと外部victimを保つ", async (t) => {
  const root = await fixture();
  const parent = path.dirname(root);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "portable-snapshot-victim-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  const victim = path.join(outside, "victim.txt");
  const link = path.join(root, "unsafe-link");
  await fs.writeFile(victim, "keep\n");
  await fs.symlink(victim, link);
  const before = await snapshotNames(parent);

  await assert.rejects(
    createPortableManifest({ payloadRoot: root, ...metadata }),
    /actual=link/,
  );

  assert.deepEqual(await snapshotNames(parent), before);
  assert.equal((await fs.lstat(link)).isSymbolicLink(), true);
  assert.equal(await fs.readFile(victim, "utf8"), "keep\n");
});

test("create はstable regularな既存manifestだけを自己除外しsourceを変更しない", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const existing = path.join(root, "portable-manifest.json");
  await fs.writeFile(existing, "old regular manifest bytes\n");

  const handle = await trackedHandle(
    t,
    createPortableManifest({ payloadRoot: root, ...metadata }),
  );

  assert.equal(handle.manifestMaterialized, false);
  await assert.rejects(fs.access(path.join(handle.payloadRoot, "portable-manifest.json")));
  assert.equal(await fs.readFile(existing, "utf8"), "old regular manifest bytes\n");
});

test("sourceのmanifest名にあるlink・directory・case variantを全public operationが拒否する", async (t) => {
  for (const kind of ["link", "directory", "case-variant"]) {
    await t.test(kind, async (t) => {
      const root = await fixture();
      const outside = await fs.mkdtemp(path.join(os.tmpdir(), "portable-source-manifest-"));
      t.after(() => fs.rm(root, { recursive: true, force: true }));
      t.after(() => fs.rm(outside, { recursive: true, force: true }));
      const target = kind === "case-variant"
        ? path.join(root, "Portable-Manifest.json")
        : path.join(root, "portable-manifest.json");
      if (kind === "link") {
        const victim = path.join(outside, "victim.json");
        await fs.writeFile(victim, "keep\n");
        await fs.symlink(victim, target);
      } else if (kind === "directory") {
        await fs.mkdir(target);
      } else {
        await fs.writeFile(target, "case collision\n");
      }

      const operations = [
        () => createPortableManifest({ payloadRoot: root, ...metadata }),
        () => verifyPortableManifest({
          payloadRoot: root,
          expectedIntentPlannerVersion: metadata.intentPlannerVersion,
          expectedNodeVersion: metadata.nodeVersion,
        }),
        () => writePortableManifest({ payloadRoot: root, ...metadata }),
      ];
      for (const operation of operations) {
        await assert.rejects(operation(), /stage=(read|scan|write)/);
      }
      assert.equal((await fs.lstat(target)).isSymbolicLink(), kind === "link");
    });
  }
});

test("source内の一般パスもWindowsの大文字小文字衝突を拒否する", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const upper = path.join(root, "Case.txt");
  const lower = path.join(root, "case.txt");
  await fs.writeFile(upper, "upper\n");
  await fs.writeFile(lower, "lower\n");
  if ((await fs.stat(upper)).ino === (await fs.stat(lower)).ino) {
    t.skip("case-insensitive filesystem");
    return;
  }
  await assert.rejects(
    createPortableManifest({ payloadRoot: root, ...metadata }),
    /actual=windows-case-collision/,
  );
});

test("収録ファイルの欠損、追加、1バイト変更を拒否する", async (t) => {
  for (const mutation of ["missing", "extra", "changed"]) {
    await t.test(mutation, async (t) => {
      const root = await fixture();
      t.after(() => fs.rm(root, { recursive: true, force: true }));
      const prepared = await trackedHandle(
        t,
        createPortableManifest({ payloadRoot: root, ...metadata }),
      );
      await fs.writeFile(
        path.join(root, "portable-manifest.json"),
        serializePortableManifest(prepared.manifest),
      );
      if (mutation === "missing") await fs.rm(path.join(root, "runtime", "node.exe"));
      if (mutation === "extra") await fs.writeFile(path.join(root, "extra.txt"), "extra");
      if (mutation === "changed") await fs.appendFile(path.join(root, "app", "bin", "cli.mjs"), "x");
      await assert.rejects(
        verifyPortableManifest({
          payloadRoot: root,
          expectedIntentPlannerVersion: metadata.intentPlannerVersion,
          expectedNodeVersion: metadata.nodeVersion,
        }),
        /portable-manifest: stage=(file-set|file-integrity)/,
      );
    });
  }
});

test("危険・非正規パス、重複、Windows の大文字小文字衝突を拒否する", () => {
  for (const unsafe of [
    "/absolute",
    "../parent",
    "a/../parent",
    "a\\windows",
    "a\0nul",
    "",
    "./entry",
    "a//entry",
    "a/./entry",
    "a/entry/",
    "a:drive",
    "bad?.txt",
    "trailing. ",
    "CON.txt",
    ...["COM", "LPT"].flatMap((prefix) => ["¹", "²", "³"].flatMap((suffix) => [
      `runtime/${prefix}${suffix}`,
      `runtime/${prefix}${suffix}.txt`,
    ])),
  ]) {
    assert.throws(
      () => validatePortableManifest(validManifest([
        { path: "app/bin/cli.mjs", size: 1, sha256: HASH },
        { path: unsafe, size: 1, sha256: HASH },
      ])),
      /portable-manifest: stage=schema/,
      unsafe,
    );
  }
  assert.throws(
    () => validatePortableManifest(validManifest([
      { path: "app/bin/cli.mjs", size: 1, sha256: HASH },
      { path: "app/bin/cli.mjs", size: 1, sha256: HASH },
    ])),
    /actual=duplicate/,
  );
  assert.throws(
    () => validatePortableManifest(validManifest([
      { path: "app/bin/cli.mjs", size: 1, sha256: HASH },
      { path: "APP/BIN/CLI.MJS", size: 1, sha256: HASH },
    ])),
    /actual=windows-case-collision/,
  );
  assert.throws(
    () => validatePortableManifest(validManifest([
      { path: "app/bin/cli.mjs", size: 1, sha256: HASH },
      { path: "Portable-Manifest.json", size: 1, sha256: HASH },
    ])),
    /actual=self-listed/,
  );
  assert.throws(
    () => validatePortableManifest(validManifest([
      { path: "runtime/node.exe", size: 1, sha256: HASH },
      { path: "app/bin/cli.mjs", size: 1, sha256: HASH },
    ])),
    /actual=unsorted/,
  );

  for (const ordinary of [
    "runtime/COM¹backup.txt",
    "runtime/COM³_backup",
    "runtime/COM10.txt",
    "runtime/LPT¹backup.txt",
    "runtime/LPT²-log",
    "runtime/LPT10.txt",
  ]) {
    assert.doesNotThrow(
      () => validatePortableManifest(validManifest([
        { path: "app/bin/cli.mjs", size: 1, sha256: HASH },
        { path: ordinary, size: 1, sha256: HASH },
      ])),
      ordinary,
    );
  }
});

test("自己列挙、入口欠損、不正 metadata・hash・余分な key を拒否する", () => {
  const cases = [
    validManifest([{ path: "portable-manifest.json", size: 1, sha256: HASH }]),
    validManifest([{ path: "other.mjs", size: 1, sha256: HASH }]),
    { ...validManifest(), intentPlannerVersion: "^0.28.0" },
    { ...validManifest(), nodeVersion: "v24.18.0" },
    { ...validManifest(), platform: "linux" },
    { ...validManifest(), arch: "arm64" },
    { ...validManifest(), entrypoint: "src/other.mjs" },
    { ...validManifest(), extra: true },
    validManifest([{ path: "app/bin/cli.mjs", size: -1, sha256: HASH }]),
    validManifest([{ path: "app/bin/cli.mjs", size: 1, sha256: "A".repeat(64) }]),
    validManifest([{ path: "app/bin/cli.mjs", size: 1, sha256: HASH, extra: true }]),
  ];
  for (const candidate of cases) {
    assert.throws(() => validatePortableManifest(candidate), /portable-manifest: stage=schema/);
  }
});

test("外部・broken・deep symlink をたどらず拒否する", async (t) => {
  const root = await fixture();
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "portable-manifest-outside-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  await fs.writeFile(path.join(outside, "secret.txt"), "do not disclose");
  await fs.symlink(path.join(outside, "secret.txt"), path.join(root, "external-link"));
  await assert.rejects(createPortableManifest({ payloadRoot: root, ...metadata }), /actual=link/);
  await fs.rm(path.join(root, "external-link"));
  await fs.symlink(path.join(root, "missing"), path.join(root, "broken-link"));
  await assert.rejects(createPortableManifest({ payloadRoot: root, ...metadata }), /actual=link/);
  await fs.rm(path.join(root, "broken-link"));
  await fs.mkdir(path.join(root, "deep"));
  await fs.symlink(outside, path.join(root, "deep", "linked-directory"));
  await assert.rejects(createPortableManifest({ payloadRoot: root, ...metadata }), /actual=link/);
});

test("FIFO などの特殊ファイルを読み込まず拒否する", { skip: process.platform === "win32" }, async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await execFileAsync("mkfifo", [path.join(root, "named-pipe")]);
  await assert.rejects(createPortableManifest({ payloadRoot: root, ...metadata }), /actual=special-file/);
});

test("manifest名の特殊ファイルも全public operationが拒否して保持する", { skip: process.platform === "win32" }, async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const target = path.join(root, "portable-manifest.json");
  await execFileAsync("mkfifo", [target]);

  const operations = [
    () => createPortableManifest({ payloadRoot: root, ...metadata }),
    () => verifyPortableManifest({
      payloadRoot: root,
      expectedIntentPlannerVersion: metadata.intentPlannerVersion,
      expectedNodeVersion: metadata.nodeVersion,
    }),
    () => writePortableManifest({ payloadRoot: root, ...metadata }),
  ];
  for (const operation of operations) {
    await assert.rejects(operation(), /stage=(scan|write)/);
  }
  assert.equal((await fs.lstat(target)).isFIFO(), true);
});

test("既存 manifest symlink を上書きせず外部 victim を保つ", async (t) => {
  const root = await fixture();
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "portable-manifest-victim-"));
  const victim = path.join(outside, "victim.json");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  await fs.writeFile(victim, "keep me\n");
  await fs.symlink(victim, path.join(root, "portable-manifest.json"));

  await assert.rejects(writePortableManifest({ payloadRoot: root, ...metadata }), /stage=write/);
  assert.equal(await fs.readFile(victim, "utf8"), "keep me\n");
  assert.equal((await fs.lstat(path.join(root, "portable-manifest.json"))).isSymbolicLink(), true);
});

test("既存の通常 manifest も上書き・削除しない", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const target = path.join(root, "portable-manifest.json");
  await fs.writeFile(target, "preexisting\n");
  await assert.rejects(writePortableManifest({ payloadRoot: root, ...metadata }), /stage=write/);
  assert.equal(await fs.readFile(target, "utf8"), "preexisting\n");
});

test("読めない通常ファイルを内容を表示せず拒否する", { skip: process.platform === "win32" }, async (t) => {
  const root = await fixture();
  const unreadable = path.join(root, "unreadable.txt");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(unreadable, "private payload contents\n");
  await fs.chmod(unreadable, 0o000);
  await assert.rejects(
    createPortableManifest({ payloadRoot: root, ...metadata }),
    (error) => {
      assert.match(error.message, /stage=read resource=unreadable\.txt/);
      assert.doesNotMatch(error.message, /private payload contents/);
      return true;
    },
  );
});

test("payload root と version 入力を厳格に拒否する", async () => {
  await assert.rejects(
    createPortableManifest({ payloadRoot: "relative", ...metadata }),
    /stage=input/,
  );
  await assert.rejects(
    createPortableManifest({ payloadRoot: path.parse(process.cwd()).root, ...metadata }),
    /stage=snapshot resource=payloadRoot expected=dedicated-stage-directory actual=broad-root/,
  );
  const root = await fixture();
  try {
    await assert.rejects(
      createPortableManifest({ payloadRoot: root, ...metadata, nodeVersion: "latest" }),
      /stage=schema/,
    );
    await assert.rejects(
      verifyPortableManifest({
        payloadRoot: root,
        expectedIntentPlannerVersion: metadata.intentPlannerVersion,
        expectedNodeVersion: "latest",
      }),
      /stage=schema resource=expectedNodeVersion/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
