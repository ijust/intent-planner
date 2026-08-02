import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PortableBuildPreflightError,
  createCommandRunner,
  evaluatePortableBuildPreflight,
  runPortableBuildPreflight,
} from "../scripts/portable/preflight.mjs";

const SUCCESSFUL_COMMANDS = {
  gnupg: { exitCode: 0, stdout: "gpg (GnuPG) 2.4.8\n" },
  windowsZip: { exitCode: 0, stdout: "bsdtar 3.8.1 - libarchive 3.8.1\n" },
  node: { exitCode: 0, stdout: "v22.1.0\n" },
  npm: { exitCode: 0, stdout: "10.7.0\n" },
};

test("Windows x64 と全コマンドの実行結果・版を構造化して返す", async () => {
  const calls = [];
  const result = await runPortableBuildPreflight({
    platform: "win32",
    arch: "x64",
    machineGetter: () => "AMD64",
    commandRunner: async (request) => {
      calls.push(request);
      return SUCCESSFUL_COMMANDS[request.name];
    },
  });

  assert.deepEqual(calls, [
    { name: "gnupg", executable: "gpg.exe", args: ["--version"] },
    { name: "windowsZip", executable: "tar.exe", args: ["--version"] },
    { name: "node", executable: "node.exe", args: ["--version"] },
    { name: "npm", executable: "npm.cmd", args: ["--version"] },
  ]);
  assert.deepEqual(result, {
    stage: "build-preflight",
    ok: true,
    prerequisites: {
      windowsX64: {
        name: "windows-x64",
        ok: true,
        required: "platform=win32 process-arch=x64 native-arch=amd64",
        actual: "platform=win32 process-arch=x64 native-arch=amd64",
        version: "win32-x64-amd64",
        exitCode: null,
      },
      gnupg: {
        name: "gnupg",
        ok: true,
        required: "GnuPG with a recognizable version",
        actual: "version=2.4.8",
        version: "2.4.8",
        exitCode: 0,
      },
      windowsZip: {
        name: "windows-tar-zip",
        ok: true,
        required: "Windows bsdtar/libarchive ZIP support",
        actual: "version=3.8.1",
        version: "3.8.1",
        exitCode: 0,
      },
      node: {
        name: "build-node",
        ok: true,
        required: "Node.js >=18.17.0",
        actual: "version=22.1.0",
        version: "22.1.0",
        exitCode: 0,
      },
      npm: {
        name: "build-npm",
        ok: true,
        required: "npm with a recognizable version",
        actual: "version=10.7.0",
        version: "10.7.0",
        exitCode: 0,
      },
    },
  });
});

test("純粋な判定関数は実行済み結果から利用不能な前提をすべて分類する", () => {
  const result = evaluatePortableBuildPreflight({
    platform: "linux",
    arch: "arm64",
    nativeWindowsArch: "ARM64",
    commandResults: {
      gnupg: { exitCode: null, unavailable: true },
      windowsZip: { exitCode: 0, stdout: "GNU tar 1.35\n" },
      node: { exitCode: 0, stdout: "v16.20.2\n" },
      npm: { exitCode: 1, stdout: "" },
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    Object.values(result.prerequisites).map(({ name, ok, actual }) => ({ name, ok, actual })),
    [
      {
        name: "windows-x64",
        ok: false,
        actual: "platform=linux process-arch=arm64 native-arch=arm64",
      },
      { name: "gnupg", ok: false, actual: "unavailable" },
      { name: "windows-tar-zip", ok: false, actual: "version-unrecognized" },
      { name: "build-node", ok: false, actual: "version=16.20.2" },
      { name: "build-npm", ok: false, actual: "exit-code=1" },
    ],
  );
});

test("不足時は全コマンドを検査してから段階別の安全な原因だけで失敗する", async () => {
  const calls = [];
  const secret = "TOKEN=do-not-leak";

  await assert.rejects(
    runPortableBuildPreflight({
      platform: "win32",
      arch: "x64",
      machineGetter: () => "AMD64",
      commandRunner: async (request) => {
        calls.push(request.name);
        if (request.name === "gnupg") {
          throw new Error(`spawn failed ${secret} gpg.exe --version`);
        }
        if (request.name === "windowsZip") {
          return { exitCode: 1, stderr: `${secret} tar.exe --version` };
        }
        return SUCCESSFUL_COMMANDS[request.name];
      },
    }),
    (error) => {
      assert.equal(error instanceof PortableBuildPreflightError, true);
      assert.deepEqual(calls, ["gnupg", "windowsZip", "node", "npm"]);
      assert.match(error.message, /stage=build-preflight prerequisite=gnupg/);
      assert.match(error.message, /prerequisite=windows-tar-zip/);
      assert.match(error.message, /required=/);
      assert.match(error.message, /actual=unavailable/);
      assert.match(error.message, /actual=exit-code=1/);
      assert.doesNotMatch(error.message, /TOKEN|gpg\.exe|tar\.exe|--version/);
      assert.equal(error.result.ok, false);
      return true;
    },
  );
});

test("版として解釈できない任意出力をエラー表示へ転写しない", async () => {
  const secret = "private-output-123";

  await assert.rejects(
    runPortableBuildPreflight({
      platform: "win32",
      arch: "x64",
      machineGetter: () => "AMD64",
      commandRunner: async (request) => (
        request.name === "npm"
          ? { exitCode: 0, stdout: secret }
          : SUCCESSFUL_COMMANDS[request.name]
      ),
    }),
    (error) => {
      assert.match(error.message, /prerequisite=build-npm/);
      assert.match(error.message, /actual=version-unrecognized/);
      assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );
});

test("既定 runner はコマンドの非ゼロ終了コードと出力を検査側へ返す", async () => {
  const runner = createCommandRunner({
    platform: "win32",
    commandShell: "cmd.exe",
    execFileImpl: (file, args, options, callback) => {
      assert.equal(file, "gpg.exe");
      assert.deepEqual(args, ["--version"]);
      assert.equal(options.windowsHide, true);
      const error = new Error("failed");
      error.code = 2;
      callback(error, "partial-output", "private-error-output");
    },
  });

  assert.deepEqual(
    await runner({ name: "gnupg", executable: "gpg.exe", args: ["--version"] }),
    { exitCode: 2, stdout: "partial-output", stderr: "private-error-output" },
  );
});

test("ARM64 Windows 上の x64 Node 互換実行は生成環境として拒否する", async () => {
  await assert.rejects(
    runPortableBuildPreflight({
      platform: "win32",
      arch: "x64",
      machineGetter: () => "ARM64",
      commandRunner: async (request) => SUCCESSFUL_COMMANDS[request.name],
    }),
    (error) => {
      assert.equal(error instanceof PortableBuildPreflightError, true);
      assert.match(error.message, /prerequisite=windows-x64/);
      assert.match(error.message, /native-arch=arm64/);
      assert.doesNotMatch(error.message, /PROCESSOR_ARCHITECTURE|PROCESSOR_ARCHITEW6432/);
      assert.equal(error.result.prerequisites.windowsX64.ok, false);
      return true;
    },
  );
});

test("既定のネイティブCPU判定は環境変数相当よりmachine情報を優先する", async () => {
  await assert.rejects(
    runPortableBuildPreflight({
      platform: "win32",
      arch: "x64",
      nativeWindowsArch: "AMD64",
      machineGetter: () => "ARM64",
      commandRunner: async (request) => SUCCESSFUL_COMMANDS[request.name],
    }),
    (error) => {
      assert.match(error.message, /native-arch=arm64/);
      assert.equal(error.result.prerequisites.windowsX64.ok, false);
      return true;
    },
  );
});

test("machine情報のx64相当値だけが既定経路を成功させる", async () => {
  for (const machineValue of ["x86_64", "AMD64"]) {
    let calls = 0;
    const result = await runPortableBuildPreflight({
      platform: "win32",
      arch: "x64",
      nativeWindowsArch: "ARM64",
      machineGetter: () => {
        calls += 1;
        return machineValue;
      },
      commandRunner: async (request) => SUCCESSFUL_COMMANDS[request.name],
    });

    assert.equal(calls, 1);
    assert.equal(result.prerequisites.windowsX64.actual, "platform=win32 process-arch=x64 native-arch=amd64");
  }
});

test("CPU環境の未知値はエラーへ転写せずunknownへ正規化する", () => {
  const secret = "TOKEN-do-not-leak";
  const result = evaluatePortableBuildPreflight({
    platform: secret,
    arch: secret,
    nativeWindowsArch: secret,
    commandResults: SUCCESSFUL_COMMANDS,
  });

  assert.equal(
    result.prerequisites.windowsX64.actual,
    "platform=unknown process-arch=unknown native-arch=unknown",
  );
  assert.doesNotMatch(result.prerequisites.windowsX64.actual, new RegExp(secret));
});

test("既定 runner は固定した4コマンド以外と改変requestを実行しない", async () => {
  let executions = 0;
  const runner = createCommandRunner({
    platform: "win32",
    execFileImpl: (file, args, options, callback) => {
      executions += 1;
      callback(null, "", "");
    },
  });

  await assert.rejects(
    runner({ name: "custom", executable: "custom.cmd", args: ["secret-value"] }),
    /unsupported preflight command request/,
  );
  await assert.rejects(
    runner({ name: "npm", executable: "other.cmd", args: ["--version"] }),
    /unsupported preflight command request/,
  );
  await assert.rejects(
    runner({ name: "npm", executable: "npm.cmd", args: ["--version", "extra"] }),
    /unsupported preflight command request/,
  );
  assert.equal(executions, 0);
});

test("npm runner の shell 経路は固定引数だけを使い非ゼロ終了を分類する", async () => {
  const runner = createCommandRunner({
    platform: "win32",
    commandShell: "cmd.exe",
    execFileImpl: (file, args, options, callback) => {
      assert.equal(file, "cmd.exe");
      assert.deepEqual(args, ["/d", "/s", "/c", "npm.cmd --version"]);
      assert.equal(options.windowsHide, true);
      const error = new Error("npm failed");
      error.code = 7;
      callback(error, "", "private-error-output");
    },
  });

  assert.deepEqual(
    await runner({ name: "npm", executable: "npm.cmd", args: ["--version"] }),
    { exitCode: 7, stdout: "", stderr: "private-error-output" },
  );
});
