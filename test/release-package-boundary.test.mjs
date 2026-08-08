import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Uint8ArrayReader, ZipReader, ZipReaderStream } from "@zip.js/zip.js";
import { Parser as TarParser, ReadEntry as TarReadEntry } from "tar";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

const RELEASE_PREFLIGHT_REFERENCE = /(?:preflight-windows-portable-release|portable[\\/]release-preflight)\.mjs/u;

function assertUserEntrypointsDoNotReferenceReleasePreflight(sources) {
  for (const [relativePath, source] of sources) {
    assert.doesNotMatch(
      source,
      RELEASE_PREFLIGHT_REFERENCE,
      `${relativePath} から保守用公開前検査を呼ばない`,
    );
  }
}

test("保守用archive依存を開発時だけに固定し、公開package境界を保つ", (t) => {
  const rootPackage = readJson("package.json");

  assert.equal(typeof ZipReader, "function");
  assert.equal(typeof Uint8ArrayReader, "function");
  assert.equal(typeof ZipReaderStream, "function");
  assert.equal(typeof TarParser, "function");
  assert.equal(typeof TarReadEntry, "function");

  assert.deepEqual(rootPackage.dependencies, {
    "handoff-bridge": "0.2.2",
    "term-drift": "0.3.6",
  });
  assert.equal(rootPackage.devDependencies?.["@zip.js/zip.js"], "2.8.34");
  assert.equal(rootPackage.devDependencies?.tar, "7.5.22");
  assert.equal(rootPackage.scripts.test, "node --test");
  assert.equal(rootPackage.scripts.build, "node scripts/build-dist.mjs");
  assert.equal(rootPackage.scripts["build:portable:windows"], "node scripts/build-windows-portable.mjs");
  assert.equal(rootPackage.scripts["preflight:portable:windows"], "node scripts/preflight-windows-portable-release.mjs");
  assert.equal(rootPackage.scripts.prepublishOnly, "node scripts/publish-check.mjs");

  const buildRoot = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-dist-boundary-"));
  t.after(() => fs.rmSync(buildRoot, { recursive: true, force: true }));
  for (const relativePath of [
    "package.json",
    "templates",
    "bin",
    "src",
    "scripts",
    "README.md",
    "LICENSE",
    "README.en.md",
  ]) {
    const source = path.join(ROOT, relativePath);
    if (fs.existsSync(source)) {
      fs.cpSync(source, path.join(buildRoot, relativePath), { recursive: true });
    }
  }

  execFileSync(process.execPath, ["scripts/build-dist.mjs"], {
    cwd: buildRoot,
    stdio: "pipe",
  });

  const distPackage = JSON.parse(fs.readFileSync(path.join(buildRoot, "dist", "package.json"), "utf8"));
  for (const field of ["version", "bin", "files", "dependencies"]) {
    assert.deepEqual(distPackage[field], rootPackage[field], `公開packageの ${field} を変えない`);
  }
  assert.equal("devDependencies" in distPackage, false);
  assert.equal("preflight:portable:windows" in distPackage.scripts, false);

  const npmCache = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-pack-"));
  let packOutput;
  try {
    packOutput = execFileSync(
      "npm",
      ["pack", "./dist", "--dry-run", "--json", "--ignore-scripts"],
      {
        cwd: buildRoot,
        encoding: "utf8",
        env: { ...process.env, npm_config_cache: npmCache },
      },
    );
  } finally {
    fs.rmSync(npmCache, { recursive: true, force: true });
  }
  const [{ files }] = JSON.parse(packOutput);
  const packedPaths = new Set(files.map(({ path: packedPath }) => packedPath.replaceAll(path.sep, "/")));

  assert.ok(packedPaths.has("bin/cli.mjs"), "既存CLI entrypointを公開候補に保つ");
  assert.equal(
    [...packedPaths].some((packedPath) => packedPath === "scripts" || packedPath.startsWith("scripts/")),
    false,
    "保守用scriptsを公開候補へ含めない",
  );

  const forbiddenPackedPaths = [
    [/(?:^|\/)intent-planner-v.+-win-x64-portable\.zip$/u, "ポータブルZIP"],
    [/(?:^|\/)runtime\/node\.exe$/iu, "Windows用ランタイム"],
    [/^scripts\/preflight-windows-portable-release\.mjs$/u, "公開前検査entrypoint"],
    [/^scripts\/portable\/release-(?:preflight|artifacts|evidence)\.mjs$/u, "公開前検査・release用module"],
  ];
  for (const [pattern, label] of forbiddenPackedPaths) {
    assert.equal(
      [...packedPaths].some((packedPath) => pattern.test(packedPath)),
      false,
      `${label}をnpm配布候補へ含めない`,
    );
  }
});

test("利用者向けentrypointから保守用公開前検査を呼ばない", () => {
  const userEntrypoints = [
    ["bin/cli.mjs", readSource("bin/cli.mjs")],
    ["scripts/build-windows-portable.mjs", readSource("scripts/build-windows-portable.mjs")],
    ["scripts/portable/build.mjs", readSource("scripts/portable/build.mjs")],
    ["src/portable/verify-and-run.mjs", readSource("src/portable/verify-and-run.mjs")],
  ];

  assertUserEntrypointsDoNotReferenceReleasePreflight(userEntrypoints);
});

test("保守用公開前検査はpublishまたはupload操作を持たない", () => {
  const maintainerPreflightSources = [
    "scripts/preflight-windows-portable-release.mjs",
    "scripts/portable/release-preflight.mjs",
  ];
  const forbiddenOperations = [
    [/\b(?:from\s+|import\s*(?:\(\s*)?)["'][^"'\r\n]*(?:publish|upload)[^"'\r\n]*["']/iu, "publish/upload module参照"],
    [/\bnpm\s+publish\b/iu, "npm publish"],
    [/\b(?:gh|github)\s+release\s+upload\b/iu, "release upload"],
    [/\b(?:publish|upload)(?:Artifact|Release|Asset)?\s*\(/iu, "publish/upload関数呼び出し"],
  ];

  for (const relativePath of maintainerPreflightSources) {
    const source = readSource(relativePath);
    for (const [pattern, label] of forbiddenOperations) {
      assert.doesNotMatch(source, pattern, `${relativePath} は${label}を実行しない`);
    }
  }
});
