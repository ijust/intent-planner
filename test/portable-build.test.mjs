import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildWindowsPortablePayloadCore,
} from "../scripts/portable/build.mjs";

test("共通配布用内容から組み立てまでを承認済みの順序で一つにつなぐ", async (t) => {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "portable-build-"));
  t.after(() => fs.rm(rootDirectory, { recursive: true, force: true }));
  const calls = [];
  const archive = Object.freeze({ kind: "archive" });
  const runtime = Object.freeze({ kind: "runtime" });
  let dependencyCleaned = false;
  const dependencyStage = Object.freeze({
    kind: "dependencies",
    async cleanup() {
      calls.push("dependency-cleanup");
      dependencyCleaned = true;
    },
  });
  const assembled = Object.freeze({ kind: "assembled" });

  const result = await buildWindowsPortablePayloadCore({ rootDirectory }, {
    async buildDist(options) {
      calls.push("build-dist");
      assert.equal(options.rootDirectory, rootDirectory);
    },
    async preflight() {
      calls.push("preflight");
    },
    async verifyNodeRelease(options) {
      calls.push("verify-node");
      assert.equal(options.cacheDirectory, undefined);
      return archive;
    },
    async extractNodeRuntime(value) {
      calls.push("extract-node");
      assert.equal(value, archive);
      return runtime;
    },
    async stageDependencies(options) {
      calls.push("stage-dependencies");
      assert.equal(options.rootDirectory, rootDirectory);
      assert.equal(options.distDirectory, path.join(rootDirectory, "dist"));
      assert.equal(options.stageDirectory, path.join(rootDirectory, ".tmp", "windows-portable-dependencies"));
      return dependencyStage;
    },
    async assemble(options) {
      calls.push("assemble");
      assert.equal(options.stageDirectory, path.join(rootDirectory, ".tmp", "windows-portable"));
      assert.equal(options.dependencyStage, dependencyStage);
      assert.equal(options.nodeRuntime, runtime);
      return assembled;
    },
  });

  assert.equal(result, assembled);
  assert.equal(dependencyCleaned, true);
  assert.deepEqual(calls, [
    "build-dist",
    "preflight",
    "verify-node",
    "extract-node",
    "stage-dependencies",
    "assemble",
    "dependency-cleanup",
  ]);
});

test("途中失敗では依存ステージを片づけ、ZIPや公開処理へ進まない", async (t) => {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "portable-build-failure-"));
  t.after(() => fs.rm(rootDirectory, { recursive: true, force: true }));
  const calls = [];
  const dependencyStage = Object.freeze({
    async cleanup() {
      calls.push("dependency-cleanup");
    },
  });

  await assert.rejects(
    buildWindowsPortablePayloadCore({ rootDirectory, cacheDirectory: path.join(rootDirectory, "cache") }, {
      async buildDist() { calls.push("build-dist"); },
      async preflight() { calls.push("preflight"); },
      async verifyNodeRelease(options) {
        calls.push("verify-node");
        assert.equal(options.cacheDirectory, path.join(rootDirectory, "cache"));
        return Object.freeze({});
      },
      async extractNodeRuntime() { calls.push("extract-node"); return Object.freeze({}); },
      async stageDependencies() { calls.push("stage-dependencies"); return dependencyStage; },
      async assemble() { calls.push("assemble"); throw new Error("assembly failed"); },
    }),
    /assembly failed/,
  );
  assert.deepEqual(calls, [
    "build-dist",
    "preflight",
    "verify-node",
    "extract-node",
    "stage-dependencies",
    "assemble",
    "dependency-cleanup",
  ]);
  assert.equal(await fs.stat(path.join(rootDirectory, ".tmp", "windows-portable")).then(() => true, () => false), true);
});
