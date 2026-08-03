import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createWindowsPortableZipCore } from "../scripts/portable/zip.mjs";
import {
  finalizePortableBuildCore,
  parsePortableBuildArguments,
} from "../scripts/build-windows-portable.mjs";

test("Windows標準tarで単一named rootをZIPへ確定する", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "portable-zip-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const directoryName = "intent-planner-v1.2.3-win-x64-portable";
  const payloadRoot = path.join(root, "stage", directoryName);
  const artifactsDirectory = path.join(root, "artifacts");
  await fs.mkdir(payloadRoot, { recursive: true });
  await fs.mkdir(artifactsDirectory, { recursive: true });
  await fs.writeFile(path.join(artifactsDirectory, `${directoryName}.zip`), "stale");
  await fs.writeFile(path.join(payloadRoot, "intent-planner.cmd"), "@echo off\r\n");

  const result = await createWindowsPortableZipCore({
    payload: Object.freeze({ payloadRoot, directoryName, version: "1.2.3" }),
    artifactsDirectory,
  }, {
    async runTar(request) {
      assert.equal(request.executable, "tar.exe");
      assert.deepEqual(request.args.slice(0, 4), ["-a", "-c", "-f", request.outputPath]);
      assert.deepEqual(request.args.slice(4), ["-C", path.dirname(payloadRoot), directoryName]);
      await fs.writeFile(request.outputPath, "fixture zip bytes");
      return Object.freeze({ exitCode: 0 });
    },
  });

  assert.equal(result.filename, `${directoryName}.zip`);
  assert.equal(result.zipPath, path.join(artifactsDirectory, `${directoryName}.zip`));
  assert.equal(await fs.readFile(result.zipPath, "utf8"), "fixture zip bytes");
  assert.deepEqual((await fs.readdir(artifactsDirectory)).sort(), [`${directoryName}.zip`]);
});

test("ZIP作成失敗では最終成果物を残さない", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "portable-zip-failure-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const directoryName = "intent-planner-v1.2.3-win-x64-portable";
  const payloadRoot = path.join(root, "stage", directoryName);
  const artifactsDirectory = path.join(root, "artifacts");
  await fs.mkdir(payloadRoot, { recursive: true });
  await fs.mkdir(artifactsDirectory, { recursive: true });
  await fs.writeFile(path.join(artifactsDirectory, `${directoryName}.zip`), "stale");

  await assert.rejects(
    createWindowsPortableZipCore({
      payload: Object.freeze({ payloadRoot, directoryName, version: "1.2.3" }),
      artifactsDirectory,
    }, {
      async runTar(request) {
        await fs.writeFile(request.outputPath, "partial");
        return Object.freeze({ exitCode: 2 });
      },
    }),
    /stage=zip.*exit-code-2/,
  );
  assert.deepEqual(await fs.readdir(artifactsDirectory), []);
});

test("明示的な生成コマンドは任意のcacheだけを受け取り、公開処理を呼ばない", async () => {
  assert.deepEqual(parsePortableBuildArguments([], "/work"), { cacheDirectory: undefined });
  assert.deepEqual(parsePortableBuildArguments(["--cache", "inputs"], "/work"), {
    cacheDirectory: path.resolve("/work", "inputs"),
  });
  assert.throws(() => parsePortableBuildArguments(["--publish"], "/work"), /usage:/);

  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(
    packageJson.scripts["build:portable:windows"],
    "node scripts/build-windows-portable.mjs",
  );
  const source = await fs.readFile(new URL("../scripts/build-windows-portable.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /npm\s+publish|github\s+release|publish-check/i);
  const distBuilder = await fs.readFile(new URL("../scripts/build-dist.mjs", import.meta.url), "utf8");
  assert.match(distBuilder, /delete distPkg\.scripts\["build:portable:windows"\]/);
  const ignore = await fs.readFile(new URL("../.gitignore", import.meta.url), "utf8");
  assert.match(ignore, /^artifacts\/$/m);
});

test("ZIP確定後のstage cleanup失敗では確定済みZIPを取り除いて失敗する", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "portable-finalize-failure-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const zipPath = path.join(root, "intent-planner-v1.2.3-win-x64-portable.zip");
  const assembled = Object.freeze({
    async cleanup() {
      throw new Error("stage cleanup failed");
    },
  });

  await assert.rejects(
    finalizePortableBuildCore({ assembled, artifactsDirectory: root }, {
      async createZip() {
        await fs.writeFile(zipPath, "zip");
        return Object.freeze({ zipPath });
      },
      async removeFile(filename) {
        await fs.rm(filename, { force: true });
      },
    }),
    /stage cleanup failed/,
  );
  await assert.rejects(fs.access(zipPath));
});
