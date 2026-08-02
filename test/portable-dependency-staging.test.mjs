import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { stageDependencies } from "../scripts/portable/dependencies.mjs";
import {
  assertVerifiedDependencyStageHandle,
  createFixedNpmCiRunner,
  stageDependenciesCore,
} from "../scripts/portable/dependencies-core.mjs";

const FIXED_ARGS = [
  "ci",
  "--omit=dev",
  "--ignore-scripts",
  "--audit=false",
  "--fund=false",
];
const execFileAsync = promisify(execFile);

function lockEntry(name, version) {
  return {
    version,
    resolved: `https://registry.npmjs.org/${name}/-/${name.split("/").at(-1)}-${version}.tgz`,
    integrity: "sha512-dGVzdA==",
  };
}

function fixtureLock() {
  return {
    name: "fixture",
    version: "1.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "fixture",
        version: "1.0.0",
        dependencies: { alpha: "1.0.0", "@scope/tool": "2.0.0" },
      },
      "node_modules/alpha": lockEntry("alpha", "1.0.0"),
      "node_modules/alpha/node_modules/nested": lockEntry("nested", "3.0.0"),
      "node_modules/@scope/tool": lockEntry("@scope/tool", "2.0.0"),
      "node_modules/dev-only": { ...lockEntry("dev-only", "9.0.0"), dev: true },
    },
  };
}

async function createFixture() {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "portable-dependency-stage-"));
  const rootDirectory = path.join(temporaryRoot, "repository");
  const distDirectory = path.join(rootDirectory, "dist");
  const stageDirectory = path.join(rootDirectory, ".tmp", "portable");
  const packageJson = {
    name: "fixture",
    version: "1.0.0",
    dependencies: { alpha: "1.0.0", "@scope/tool": "2.0.0" },
  };
  const packageLock = fixtureLock();
  await fs.mkdir(path.join(distDirectory, "src"), { recursive: true });
  await fs.writeFile(path.join(distDirectory, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  await fs.writeFile(path.join(distDirectory, "src", "entry.mjs"), "export const ready = true;\n");
  await fs.writeFile(path.join(rootDirectory, "package-lock.json"), `${JSON.stringify(packageLock, null, 2)}\n`);
  return {
    temporaryRoot,
    rootDirectory,
    distDirectory,
    stageDirectory,
    packageJson,
    packageLock,
  };
}

async function writeInstalledPackage(appDirectory, lockPath, name, version) {
  const packageDirectory = path.join(appDirectory, ...lockPath.split("/"));
  await fs.mkdir(packageDirectory, { recursive: true });
  await fs.writeFile(
    path.join(packageDirectory, "package.json"),
    `${JSON.stringify({ name, version })}\n`,
  );
}

async function writeMatchingTree(appDirectory) {
  await writeInstalledPackage(appDirectory, "node_modules/alpha", "alpha", "1.0.0");
  await fs.mkdir(path.join(appDirectory, "node_modules", "alpha", "lib"));
  await fs.writeFile(path.join(appDirectory, "node_modules", "alpha", "index.js"), "export default true;\n");
  await fs.writeFile(path.join(appDirectory, "node_modules", "alpha", "lib", "value.js"), "export const value = 1;\n");
  await writeInstalledPackage(
    appDirectory,
    "node_modules/alpha/node_modules/nested",
    "nested",
    "3.0.0",
  );
  await writeInstalledPackage(appDirectory, "node_modules/@scope/tool", "@scope/tool", "2.0.0");
  await fs.mkdir(path.join(appDirectory, "node_modules", ".bin"), { recursive: true });
  await fs.symlink(
    path.join("..", "alpha", "package.json"),
    path.join(appDirectory, "node_modules", ".bin", "alpha"),
  );
  await fs.writeFile(path.join(appDirectory, "node_modules", ".package-lock.json"), "{}\n");
}

test("固定 npm ci command は検証済み絶対 Node/npm CLI だけを使い app-local npm.cmd を選ばない", async (t) => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
  const trustedDirectory = path.join(fixture.temporaryRoot, "trusted-runtime");
  const nodeExecutable = path.join(trustedDirectory, "node.exe");
  const npmExecPath = path.join(trustedDirectory, "npm-cli.js");
  await fs.mkdir(trustedDirectory);
  await fs.writeFile(nodeExecutable, "trusted node");
  await fs.writeFile(npmExecPath, "trusted npm cli");
  await fs.mkdir(path.join(fixture.stageDirectory, "app"), { recursive: true });
  await fs.writeFile(path.join(fixture.stageDirectory, "app", "npm.cmd"), "untrusted local npm");
  const calls = [];
  const spawnImpl = (command, args, options) => {
    calls.push({ command, args, options });
    return {
      once(event, listener) {
        if (event === "close") queueMicrotask(() => listener(0, null));
        return this;
      },
    };
  };

  const runner = await createFixedNpmCiRunner({
    nodeExecutable,
    npmExecPath,
    rootDirectory: fixture.rootDirectory,
    stageDirectory: fixture.stageDirectory,
    spawnImpl,
  });
  await runner(path.join(fixture.stageDirectory, "app"));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, await fs.realpath(nodeExecutable));
  assert.deepEqual(calls[0].args, [await fs.realpath(npmExecPath), ...FIXED_ARGS]);
  assert.equal(calls[0].options.shell, false);
  assert.equal(calls[0].options.stdio, "ignore");
  assert.notEqual(calls[0].command, path.join(fixture.stageDirectory, "app", "npm.cmd"));
});

test("dist と root lock を一時 app へ複製し、scoped・nested package を照合して cleanup 可能な handle を返す", async (t) => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
  const rootLockBefore = await fs.readFile(path.join(fixture.rootDirectory, "package-lock.json"));
  const distSourceBefore = await fs.readFile(path.join(fixture.distDirectory, "src", "entry.mjs"));
  let runnerCalls = 0;

  const handle = await stageDependenciesCore({
    rootDirectory: fixture.rootDirectory,
    distDirectory: fixture.distDirectory,
    stageDirectory: fixture.stageDirectory,
    async runNpmCi(appDirectory) {
      runnerCalls += 1;
      assert.deepEqual(
        JSON.parse(await fs.readFile(path.join(appDirectory, "package.json"), "utf8")),
        fixture.packageJson,
      );
      assert.deepEqual(
        JSON.parse(await fs.readFile(path.join(appDirectory, "package-lock.json"), "utf8")),
        fixture.packageLock,
      );
      await writeMatchingTree(appDirectory);
      return { exitCode: 0 };
    },
  });

  assert.equal(runnerCalls, 1);
  assert.equal(handle.appDirectory, path.join(await fs.realpath(fixture.stageDirectory), "app"));
  assert.equal(handle.nodeModulesDirectory, path.join(handle.appDirectory, "node_modules"));
  assert.deepEqual(await fs.readFile(path.join(handle.appDirectory, "package-lock.json")), rootLockBefore);
  assert.deepEqual(await fs.readFile(path.join(fixture.rootDirectory, "package-lock.json")), rootLockBefore);
  assert.deepEqual(await fs.readFile(path.join(fixture.distDirectory, "src", "entry.mjs")), distSourceBefore);
  await handle.cleanup();
  await assert.rejects(fs.access(handle.appDirectory));
});

test("npm failure と tree 不一致は機密な command output を出さず未確定 app を削除する", async (t) => {
  for (const scenario of [
    {
      name: "npm-failure",
      runner: async () => ({ exitCode: 7, stdout: "token=npm_secret", stderr: "package body" }),
      expected: /stage=npm-ci package=app expected=exit-code-0 actual=exit-code-7/,
    },
    {
      name: "missing-package",
      runner: async (appDirectory) => {
        await writeInstalledPackage(appDirectory, "node_modules/alpha", "alpha", "1.0.0");
        await writeInstalledPackage(appDirectory, "node_modules/@scope/tool", "@scope/tool", "2.0.0");
        return { exitCode: 0 };
      },
      expected: /stage=tree-validation package=node_modules\/alpha\/node_modules\/nested expected=3\.0\.0 actual=missing/,
    },
    {
      name: "extra-package",
      runner: async (appDirectory) => {
        await writeMatchingTree(appDirectory);
        await writeInstalledPackage(appDirectory, "node_modules/extra", "extra", "4.0.0");
        return { exitCode: 0 };
      },
      expected: /stage=tree-validation package=node_modules\/extra expected=missing actual=4\.0\.0/,
    },
    {
      name: "wrong-version",
      runner: async (appDirectory) => {
        await writeMatchingTree(appDirectory);
        await fs.writeFile(
          path.join(appDirectory, "node_modules", "alpha", "package.json"),
          JSON.stringify({ name: "alpha", version: "8.0.0" }),
        );
        return { exitCode: 0 };
      },
      expected: /stage=tree-validation package=node_modules\/alpha expected=1\.0\.0 actual=8\.0\.0/,
    },
  ]) {
    await t.test(scenario.name, async (subtest) => {
      const fixture = await createFixture();
      subtest.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
      let error;
      try {
        await stageDependenciesCore({
          rootDirectory: fixture.rootDirectory,
          distDirectory: fixture.distDirectory,
          stageDirectory: fixture.stageDirectory,
          runNpmCi: scenario.runner,
        });
      } catch (caught) {
        error = caught;
      }
      assert.match(error?.message ?? "", scenario.expected);
      assert.doesNotMatch(error.message, /npm_secret|package body|stdout|stderr/);
      await assert.rejects(fs.access(path.join(fixture.stageDirectory, "app")));
    });
  }
});

test("installed package の name 不一致と package symlink を安全側で拒否する", async (t) => {
  for (const scenario of ["name", "symlink"]) {
    await t.test(scenario, async (subtest) => {
      const fixture = await createFixture();
      subtest.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
      await assert.rejects(
        stageDependenciesCore({
          rootDirectory: fixture.rootDirectory,
          distDirectory: fixture.distDirectory,
          stageDirectory: fixture.stageDirectory,
          async runNpmCi(appDirectory) {
            await writeMatchingTree(appDirectory);
            if (scenario === "name") {
              await fs.writeFile(
                path.join(appDirectory, "node_modules", "alpha", "package.json"),
                JSON.stringify({ name: "renamed", version: "1.0.0" }),
              );
            } else {
              const target = path.join(fixture.temporaryRoot, "outside-package");
              await fs.mkdir(target);
              await fs.writeFile(path.join(target, "package.json"), JSON.stringify({ name: "alpha", version: "1.0.0" }));
              await fs.rm(path.join(appDirectory, "node_modules", ".bin", "alpha"));
              await fs.rm(path.join(appDirectory, "node_modules", "alpha"), { recursive: true });
              await fs.symlink(target, path.join(appDirectory, "node_modules", "alpha"), "dir");
            }
            return { exitCode: 0 };
          },
        }),
        scenario === "name"
          ? /stage=tree-validation package=node_modules\/alpha expected=alpha actual=renamed/
          : /stage=tree-validation package=node_modules\/alpha expected=directory actual=link/,
      );
      await assert.rejects(fs.access(path.join(fixture.stageDirectory, "app")));
    });
  }
});

test("stage lock または root lock・dist が npm 実行中に変われば拒否して cleanup する", async (t) => {
  for (const changed of ["stage-lock", "root-lock", "dist"]) {
    await t.test(changed, async (subtest) => {
      const fixture = await createFixture();
      subtest.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
      await assert.rejects(
        stageDependenciesCore({
          rootDirectory: fixture.rootDirectory,
          distDirectory: fixture.distDirectory,
          stageDirectory: fixture.stageDirectory,
          async runNpmCi(appDirectory) {
            await writeMatchingTree(appDirectory);
            if (changed === "stage-lock") {
              await fs.appendFile(path.join(appDirectory, "package-lock.json"), " ");
            } else if (changed === "root-lock") {
              await fs.appendFile(path.join(fixture.rootDirectory, "package-lock.json"), " ");
            } else {
              await fs.writeFile(path.join(fixture.distDirectory, "src", "entry.mjs"), "changed\n");
            }
            return { exitCode: 0 };
          },
        }),
        changed === "stage-lock"
          ? /stage=lock-integrity package=package-lock\.json expected=unchanged actual=modified/
          : /stage=source-integrity .*expected=unchanged actual=modified/,
      );
      await assert.rejects(fs.access(path.join(fixture.stageDirectory, "app")));
    });
  }
});

test("dist symlink と root/dist/stage の重なりを npm 実行前に拒否する", async (t) => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
  await fs.symlink(
    path.join(fixture.temporaryRoot, "outside"),
    path.join(fixture.distDirectory, "outside-link"),
  );
  let runnerCalled = false;
  await assert.rejects(
    stageDependenciesCore({
      rootDirectory: fixture.rootDirectory,
      distDirectory: fixture.distDirectory,
      stageDirectory: fixture.stageDirectory,
      async runNpmCi() {
        runnerCalled = true;
        return { exitCode: 0 };
      },
    }),
    /stage=source-scan package=outside-link expected=regular-file-or-directory actual=link/,
  );
  assert.equal(runnerCalled, false);

  await assert.rejects(
    stageDependenciesCore({
      rootDirectory: fixture.rootDirectory,
      distDirectory: fixture.distDirectory,
      stageDirectory: fixture.distDirectory,
      runNpmCi: async () => ({ exitCode: 0 }),
    }),
    /stage=path-boundary package=stage expected=separate-from-dist actual=overlap/,
  );
});

test("production API は runner や lock validator の差替え口を公開しない", () => {
  assert.equal(stageDependencies.length, 1);
  assert.doesNotMatch(stageDependencies.toString(), /runNpmCi|lockValidator|validator/);
});

test("cleanup は stage の rename + outside への symlink 差替えを拒否し、victim と元 app を保持する", async (t) => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
  const handle = await stageDependenciesCore({
    rootDirectory: fixture.rootDirectory,
    distDirectory: fixture.distDirectory,
    stageDirectory: fixture.stageDirectory,
    async runNpmCi(appDirectory) {
      await writeMatchingTree(appDirectory);
      return { exitCode: 0 };
    },
  });
  const movedStage = path.join(fixture.rootDirectory, ".tmp", "portable-moved");
  const outsideStage = path.join(fixture.temporaryRoot, "outside-stage");
  await fs.rename(fixture.stageDirectory, movedStage);
  await fs.mkdir(path.join(outsideStage, "app"), { recursive: true });
  const victim = path.join(outsideStage, "app", "victim.txt");
  await fs.writeFile(victim, "preserve me");
  await fs.symlink(outsideStage, fixture.stageDirectory, "dir");

  await assert.rejects(
    handle.cleanup(),
    /stage=cleanup package=stage expected=verified-directory actual=link/,
  );
  assert.equal(await fs.readFile(victim, "utf8"), "preserve me");
  assert.equal(
    JSON.parse(await fs.readFile(path.join(movedStage, "app", "package.json"), "utf8")).name,
    "fixture",
  );
});

test("cleanup の一時的 rm failure は完了扱いにせず retry でき、同時呼出しは同じ Promise を共有する", async (t) => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
  let removeCalls = 0;
  let releaseRemoval;
  const removalGate = new Promise((resolve) => {
    releaseRemoval = resolve;
  });
  const handle = await stageDependenciesCore({
    rootDirectory: fixture.rootDirectory,
    distDirectory: fixture.distDirectory,
    stageDirectory: fixture.stageDirectory,
    async runNpmCi(appDirectory) {
      await writeMatchingTree(appDirectory);
      return { exitCode: 0 };
    },
    async removeDirectory(directory) {
      removeCalls += 1;
      if (removeCalls === 1) throw new Error("transient rm failure with secret");
      await removalGate;
      await fs.rm(directory, { recursive: true });
    },
  });

  await assert.rejects(
    handle.cleanup(),
    /stage=cleanup package=app expected=removed actual=remove-failure/,
  );
  await fs.access(handle.appDirectory);
  const first = handle.cleanup();
  const concurrent = handle.cleanup();
  assert.equal(first, concurrent);
  assert.throws(
    () => assertVerifiedDependencyStageHandle(handle),
    /stage=handle-verification package=stage expected=issued-verified-handle actual=untrusted/,
  );
  releaseRemoval();
  await first;
  assert.equal(removeCalls, 2);
  await assert.rejects(fs.access(handle.appDirectory));
});

test("cleanup が一部を削除して失敗しても handle は失効したまま retry できる", async (t) => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
  let removeCalls = 0;
  const handle = await stageDependenciesCore({
    rootDirectory: fixture.rootDirectory,
    distDirectory: fixture.distDirectory,
    stageDirectory: fixture.stageDirectory,
    async runNpmCi(appDirectory) {
      await writeMatchingTree(appDirectory);
      return { exitCode: 0 };
    },
    async removeDirectory(directory) {
      removeCalls += 1;
      if (removeCalls === 1) {
        await fs.rm(path.join(directory, "node_modules", "alpha", "package.json"));
        throw new Error("partial removal");
      }
      await fs.rm(directory, { recursive: true });
    },
  });

  await assert.rejects(
    handle.cleanup(),
    /stage=cleanup package=app expected=removed actual=remove-failure/,
  );
  assert.throws(
    () => assertVerifiedDependencyStageHandle(handle),
    /stage=handle-verification package=stage expected=issued-verified-handle actual=untrusted/,
  );
  await handle.cleanup();
  assert.equal(removeCalls, 2);
  await assert.rejects(fs.access(handle.appDirectory));
});

test("failure cleanup が失敗した場合は元の staging failure を cause に保持する", async (t) => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
  let error;
  try {
    await stageDependenciesCore({
      rootDirectory: fixture.rootDirectory,
      distDirectory: fixture.distDirectory,
      stageDirectory: fixture.stageDirectory,
      runNpmCi: async () => ({ exitCode: 19 }),
      removeDirectory: async () => {
        throw new Error("cleanup secret");
      },
    });
  } catch (caught) {
    error = caught;
  }
  assert.match(error?.message ?? "", /stage=cleanup package=app expected=removed actual=remove-failure/);
  assert.match(error?.cause?.message ?? "", /stage=npm-ci package=app expected=exit-code-0 actual=exit-code-19/);
  assert.doesNotMatch(error.message, /cleanup secret/);
});

test(".bin は内部の通常ファイルを指す POSIX symlink だけを許し、外部 symlink を拒否する", async (t) => {
  await t.test("internal-link", async (subtest) => {
    const fixture = await createFixture();
    subtest.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
    const handle = await stageDependenciesCore({
      rootDirectory: fixture.rootDirectory,
      distDirectory: fixture.distDirectory,
      stageDirectory: fixture.stageDirectory,
      platform: "linux",
      async runNpmCi(appDirectory) {
        await writeMatchingTree(appDirectory);
        return { exitCode: 0 };
      },
    });
    await handle.cleanup();
  });

  await t.test("external-link", async (subtest) => {
    const fixture = await createFixture();
    subtest.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
    const external = path.join(fixture.temporaryRoot, "external-command");
    await fs.writeFile(external, "do not execute");
    await assert.rejects(
      stageDependenciesCore({
        rootDirectory: fixture.rootDirectory,
        distDirectory: fixture.distDirectory,
        stageDirectory: fixture.stageDirectory,
        platform: "linux",
        async runNpmCi(appDirectory) {
          await writeMatchingTree(appDirectory);
          const shim = path.join(appDirectory, "node_modules", ".bin", "alpha");
          await fs.rm(shim);
          await fs.symlink(external, shim);
          return { exitCode: 0 };
        },
      }),
      /stage=tree-validation package=node_modules\/\.bin\/alpha expected=regular-file-inside-node_modules actual=outside/,
    );
    assert.equal(await fs.readFile(external, "utf8"), "do not execute");
  });
});

test("Windows .bin は regular shim file を許し、link を拒否する", async (t) => {
  for (const useLink of [false, true]) {
    await t.test(useLink ? "link" : "regular-file", async (subtest) => {
      const fixture = await createFixture();
      subtest.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
      const operation = stageDependenciesCore({
        rootDirectory: fixture.rootDirectory,
        distDirectory: fixture.distDirectory,
        stageDirectory: fixture.stageDirectory,
        platform: "win32",
        async runNpmCi(appDirectory) {
          await writeMatchingTree(appDirectory);
          const shim = path.join(appDirectory, "node_modules", ".bin", "alpha");
          await fs.rm(shim);
          if (useLink) {
            await fs.symlink(path.join("..", "alpha", "package.json"), shim);
          } else {
            await fs.writeFile(shim, "@echo off\r\n");
          }
          return { exitCode: 0 };
        },
      });
      if (useLink) {
        await assert.rejects(
          operation,
          /stage=tree-validation package=node_modules\/\.bin\/alpha expected=regular-shim-file actual=link/,
        );
      } else {
        const handle = await operation;
        await handle.cleanup();
      }
    });
  }
});

test("package の通常内容にある外部 symlink と深い subdirectory symlink を再帰的に拒否する", async (t) => {
  for (const scenario of ["regular-content-link", "nested-directory-link"]) {
    await t.test(scenario, async (subtest) => {
      const fixture = await createFixture();
      subtest.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
      const outsideFile = path.join(fixture.temporaryRoot, "outside-content.txt");
      const outsideDirectory = path.join(fixture.temporaryRoot, "outside-directory");
      await fs.writeFile(outsideFile, "preserve outside file");
      await fs.mkdir(outsideDirectory);
      await fs.writeFile(path.join(outsideDirectory, "victim.txt"), "preserve outside directory");
      const packageEntry = scenario === "regular-content-link"
        ? "node_modules/alpha/index.js"
        : "node_modules/alpha/lib/escape";

      await assert.rejects(
        stageDependenciesCore({
          rootDirectory: fixture.rootDirectory,
          distDirectory: fixture.distDirectory,
          stageDirectory: fixture.stageDirectory,
          async runNpmCi(appDirectory) {
            await writeMatchingTree(appDirectory);
            const target = path.join(appDirectory, ...packageEntry.split("/"));
            if (scenario === "regular-content-link") await fs.rm(target);
            await fs.symlink(
              scenario === "regular-content-link" ? outsideFile : outsideDirectory,
              target,
              scenario === "regular-content-link" ? "file" : "dir",
            );
            return { exitCode: 0 };
          },
        }),
        new RegExp(`stage=tree-validation package=${packageEntry.replaceAll("/", "\\/")} expected=regular-file-or-directory actual=link`),
      );
      await assert.rejects(fs.access(path.join(fixture.stageDirectory, "app")));
      assert.equal(await fs.readFile(outsideFile, "utf8"), "preserve outside file");
      assert.equal(
        await fs.readFile(path.join(outsideDirectory, "victim.txt"), "utf8"),
        "preserve outside directory",
      );
    });
  }
});

test("package 内容の POSIX special file を拒否する", {
  skip: process.platform === "win32" ? "mkfifo is POSIX-only" : false,
}, async (t) => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
  await assert.rejects(
    stageDependenciesCore({
      rootDirectory: fixture.rootDirectory,
      distDirectory: fixture.distDirectory,
      stageDirectory: fixture.stageDirectory,
      async runNpmCi(appDirectory) {
        await writeMatchingTree(appDirectory);
        await execFileAsync("mkfifo", [path.join(appDirectory, "node_modules", "alpha", "pipe")]);
        return { exitCode: 0 };
      },
    }),
    /stage=tree-validation package=node_modules\/alpha\/pipe expected=regular-file-or-directory actual=special-file/,
  );
  await assert.rejects(fs.access(path.join(fixture.stageDirectory, "app")));
});

test("検証済み stage handle だけが consumer assertion を通る", async (t) => {
  const fixture = await createFixture();
  t.after(() => fs.rm(fixture.temporaryRoot, { recursive: true, force: true }));
  const handle = await stageDependenciesCore({
    rootDirectory: fixture.rootDirectory,
    distDirectory: fixture.distDirectory,
    stageDirectory: fixture.stageDirectory,
    async runNpmCi(appDirectory) {
      await writeMatchingTree(appDirectory);
      return { exitCode: 0 };
    },
  });
  assert.equal(assertVerifiedDependencyStageHandle(handle), handle);
  assert.throws(
    () => assertVerifiedDependencyStageHandle(Object.freeze({
      appDirectory: handle.appDirectory,
      nodeModulesDirectory: handle.nodeModulesDirectory,
      packageLockPath: handle.packageLockPath,
      cleanup: handle.cleanup,
    })),
    /stage=handle-verification package=stage expected=issued-verified-handle actual=untrusted/,
  );
  await handle.cleanup();
});
