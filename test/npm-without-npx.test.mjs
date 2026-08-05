import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const DIST_ROOT = path.join(REPO_ROOT, "dist");
const ROOT_PACKAGE = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
const EXPECTED_PACKAGE_CONTRACT = {
  name: "intent-planner",
  bin: { "intent-planner": "bin/cli.mjs" },
  engines: { node: ">=18.17" },
  dependencies: { "handoff-bridge": "0.2.2", "term-drift": "0.3.6" },
};
const REQUIRED_INSTALL_INPUTS = [
  {
    name: "intent-planner",
    directory: DIST_ROOT,
    preparation: "Run `npm run build` to generate dist/package.json.",
  },
  ...Object.entries(EXPECTED_PACKAGE_CONTRACT.dependencies).map(([name, version]) => ({
    name,
    version,
    directory: path.join(REPO_ROOT, "node_modules", name),
    preparation: `Run \`npm ci\` to install the lockfile-pinned ${name} package.`,
  })),
];

function read(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function installSection(body, heading) {
  const start = body.indexOf(heading);
  assert.notEqual(start, -1, `${heading}: install section is missing`);
  const end = body.indexOf("\n---", start);
  return body.slice(start, end === -1 ? body.length : end);
}

const README_CONTRACTS = [
  {
    relativePath: "README.md",
    heading: "### インストール",
    checks: [
      ["route: npx", (body) => /npx\s*経路/.test(body)],
      ["route: npm without npx", (body) => /npx\s*を使わない\s*npm\s*経路/.test(body)],
      ["route: portable ZIP", (body) => /ポータブル ZIP\s*経路/.test(body)],
      ["npm prerequisite: Node.js", (body) => /npm\s*経路[^。\n]*Node\.js/.test(body)],
      ["npm prerequisite: npm", (body) => /npm\s*経路[^。\n]*Node\.js[^。\n]*npm/.test(body)],
      ["npm prerequisite: registry access", (body) => /npm\s*レジストリへ到達できる/.test(body)],
      ["npm is not offline or Node-free", (body) => /オフライン対応でも、Node\.js\s*不要でもありません/.test(body)],
      ["portable fallback", (body) => /利用できない場合/.test(body) && /ポータブル ZIP\s*経路/.test(body) && /別の経路/.test(body)],
      ["npm install command", (body) => body.includes("npm install --save-dev intent-planner")],
      ["POSIX local CLI", (body) => body.includes("./node_modules/.bin/intent-planner")],
      ["Windows local CLI", (body) => body.includes(".\\node_modules\\.bin\\intent-planner.cmd")],
      ["agent option", (body) => body.includes("--agent codex")],
      ["dry-run option", (body) => body.includes("--dry-run")],
      ["guide handoff", (body) => /docs\/guide\.md#/.test(body)],
      ["non-destructive behavior", (body) => /非破壊/.test(body) && /上書きしません/.test(body)],
      ["force warning and safe alternatives", (body) => (
        body.includes("`--force` は利用者データを含む全ファイルを上書き")
        && body.includes("`--update-shared`")
        && body.includes("`--no-update`")
      )],
    ],
  },
  {
    relativePath: "README.en.md",
    heading: "### Install",
    checks: [
      ["route: npx", (body) => /npx route/i.test(body)],
      ["route: npm without npx", (body) => /npm route without npx/i.test(body)],
      ["route: portable ZIP", (body) => /portable ZIP route/i.test(body)],
      ["npm prerequisite: Node.js", (body) => /npm route[^.\n]*Node\.js/i.test(body)],
      ["npm prerequisite: npm", (body) => /npm route[^.\n]*Node\.js[^.\n]*npm/i.test(body)],
      ["npm prerequisite: registry access", (body) => /(?:can access|access to) the npm registry/i.test(body)],
      ["npm is not offline or Node-free", (body) => /neither an offline nor a Node\.js-free option/i.test(body)],
      ["portable fallback", (body) => /when you cannot use/i.test(body) && /portable ZIP route/i.test(body) && /separate route/i.test(body)],
      ["npm install command", (body) => body.includes("npm install --save-dev intent-planner")],
      ["POSIX local CLI", (body) => body.includes("./node_modules/.bin/intent-planner --lang en")],
      ["Windows local CLI", (body) => body.includes(".\\node_modules\\.bin\\intent-planner.cmd --lang en")],
      ["agent option", (body) => body.includes("--agent codex")],
      ["dry-run option", (body) => body.includes("--dry-run")],
      ["guide handoff", (body) => /docs\/guide\.en\.md#/.test(body)],
      ["non-destructive behavior", (body) => /non-destructive/i.test(body) && /not overwritten/i.test(body)],
      ["force warning and safe alternatives", (body) => (
        body.includes("`--force` overwrites all files, including user data")
        && body.includes("`--update-shared`")
        && body.includes("`--no-update`")
      )],
    ],
  },
];

const GUIDE_CONTRACTS = [
  {
    relativePath: "docs/guide.md",
    heading: "## インストールのオプション",
    checks: [
      ["route: npx", (body) => /npx\s*経路/.test(body)],
      ["route: npm without npx", (body) => /npx\s*を使わない\s*npm\s*経路/.test(body)],
      ["route: portable ZIP", (body) => /ポータブル ZIP\s*経路/.test(body)],
      ["npm prerequisites", (body) => /Node\.js、npm、npm\s*レジストリへの到達/.test(body)],
      ["npm is not offline or Node-free", (body) => /オフライン対応でも、Node\.js\s*不要でもありません/.test(body)],
      ["portable fallback", (body) => /利用できない場合[^。]*npm\s*経路は選べません/.test(body) && /ポータブル ZIP\s*経路/.test(body)],
      ["npm install command", (body) => body.includes("npm install --save-dev intent-planner")],
      ["development dependency effect", (body) => /開発依存/.test(body) && body.includes("package.json")],
      ["lockfile effect", (body) => body.includes("package-lock.json")],
      ["node_modules effect", (body) => body.includes("node_modules")],
      ["POSIX local CLI", (body) => body.includes("./node_modules/.bin/intent-planner")],
      ["Windows local CLI", (body) => body.includes(".\\node_modules\\.bin\\intent-planner.cmd")],
      ["agent option", (body) => body.includes("--agent codex")],
      ["dry-run option", (body) => body.includes("--dry-run")],
      ["safe rerun", (body) => /通常の再実行[^。\n]*既存[^。\n]*上書きしません/.test(body)],
      ["force warning and safe alternatives", (body) => (
        body.includes("`--force` は利用者データを含む全ファイルを上書き")
        && body.includes("`--update-shared`")
        && body.includes("`--no-update`")
      )],
    ],
    mutations: [
      ["npm install command", "npm install --save-dev intent-planner", "npm install intent-planner"],
      ["npm prerequisites", "Node.js、npm、npm レジストリへの到達", "利用環境の確認"],
      ["portable fallback", "npm 経路は選べません", "別の方法を確認してください"],
    ],
  },
  {
    relativePath: "docs/guide.en.md",
    heading: "## Installation options",
    checks: [
      ["route: npx", (body) => /npx route/i.test(body)],
      ["route: npm without npx", (body) => /npm route without npx/i.test(body)],
      ["route: portable ZIP", (body) => /portable ZIP route/i.test(body)],
      ["npm prerequisites", (body) => /Node\.js, npm, and access to the npm registry/i.test(body)],
      ["npm is not offline or Node-free", (body) => /neither an offline nor a Node\.js-free option/i.test(body)],
      ["portable fallback", (body) => /cannot use[^\n]*you cannot choose the npm route/i.test(body) && /portable ZIP route/i.test(body)],
      ["npm install command", (body) => body.includes("npm install --save-dev intent-planner")],
      ["development dependency effect", (body) => /development dependency/i.test(body) && body.includes("package.json")],
      ["lockfile effect", (body) => body.includes("package-lock.json")],
      ["node_modules effect", (body) => body.includes("node_modules")],
      ["POSIX local CLI", (body) => body.includes("./node_modules/.bin/intent-planner --lang en")],
      ["Windows local CLI", (body) => body.includes(".\\node_modules\\.bin\\intent-planner.cmd --lang en")],
      ["agent option", (body) => body.includes("--agent codex")],
      ["dry-run option", (body) => body.includes("--dry-run")],
      ["safe rerun", (body) => /normal rerun/i.test(body) && /does not overwrite existing files/i.test(body)],
      ["force warning and safe alternatives", (body) => (
        body.includes("`--force` overwrites all files, including user data")
        && body.includes("`--update-shared`")
        && body.includes("`--no-update`")
      )],
    ],
    mutations: [
      ["npm install command", "npm install --save-dev intent-planner", "npm install intent-planner"],
      ["npm prerequisites", "Node.js, npm, and access to the npm registry", "the required tools"],
      ["portable fallback", "you cannot choose the npm route", "check another method"],
    ],
  },
];

function contractErrors(body, contract) {
  return contract.checks
    .filter(([, predicate]) => !predicate(body))
    .map(([meaning]) => `${contract.relativePath}: missing ${meaning}`);
}

function fencedShellCommands(body) {
  return [...body.matchAll(/```(?:bash|powershell)\n([\s\S]*?)```/g)]
    .flatMap((match) => match[1].split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateInstallInputs(inputs) {
  const errors = [];
  const inputByName = new Map(inputs.map((input) => [input.name, input]));

  for (const required of REQUIRED_INSTALL_INPUTS) {
    const input = inputByName.get(required.name);
    if (!input) {
      errors.push(`${required.name}: local package input is missing. ${required.preparation}`);
      continue;
    }

    const packagePath = path.join(input.directory, "package.json");
    if (!fs.existsSync(packagePath)) {
      errors.push(`${required.name}: ${packagePath} is missing. ${required.preparation}`);
      continue;
    }

    const packageContract = readJson(packagePath);
    if (packageContract.name !== required.name) {
      errors.push(`${required.name}: local input declares package name ${packageContract.name ?? "<missing>"}`);
    }
    if (required.version && packageContract.version !== required.version) {
      errors.push(
        `${required.name}: expected lockfile-pinned version ${required.version}, got ${packageContract.version ?? "<missing>"}`,
      );
    }
  }

  return errors;
}

function runOfflineInstall(fixture, inputs = REQUIRED_INSTALL_INPUTS, env = process.env) {
  const inputErrors = validateInstallInputs(inputs);
  assert.deepEqual(inputErrors, [], inputErrors.join("\n"));

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const args = [
    "install",
    "--save-dev",
    ...inputs.map((input) => input.directory),
    "--install-links",
    "--offline",
    "--registry=http://127.0.0.1:9",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ];
  assert.ok(args.includes(DIST_ROOT), "npm install uses the generated dist package");
  assert.equal(args.includes(REPO_ROOT), false, "npm install must not use the repository root as a package input");

  return spawnSync(npmCommand, args, {
    cwd: fixture,
    encoding: "utf8",
    env,
  });
}

function createNpxSentinel(fixture) {
  const directory = path.join(fixture, ".npx-sentinel");
  const recordPath = path.join(directory, "called");
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const executablePath = path.join(directory, executable);
  fs.mkdirSync(directory, { recursive: true });

  if (process.platform === "win32") {
    fs.writeFileSync(
      executablePath,
      "@echo off\r\n> \"%NPX_SENTINEL_RECORD%\" echo called\r\nexit /b 97\r\n",
    );
  } else {
    fs.writeFileSync(
      executablePath,
      "#!/bin/sh\nprintf '%s\\n' called > \"$NPX_SENTINEL_RECORD\"\nexit 97\n",
      { mode: 0o755 },
    );
  }

  const env = { ...process.env, NPX_SENTINEL_RECORD: recordPath };
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  env[pathKey] = `${directory}${path.delimiter}${env[pathKey] ?? ""}`;
  return { directory, env, recordPath };
}

function commandShell(env) {
  const comSpecKey = Object.keys(env).find((key) => key.toLowerCase() === "comspec");
  return comSpecKey ? env[comSpecKey] : "cmd.exe";
}

function localBinPath(fixture) {
  return path.join(
    fixture,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "intent-planner.cmd" : "intent-planner",
  );
}

function runLocalCli(fixture, args, env) {
  const localBin = localBinPath(fixture);
  assert.ok(
    fs.existsSync(localBin),
    `local intent-planner CLI is missing: ${localBin}; refusing to fall back to npx or a global CLI`,
  );

  if (process.platform === "win32") {
    for (const arg of args) {
      assert.match(arg, /^[A-Za-z0-9._-]+$/, `unsupported cmd.exe test argument: ${arg}`);
    }
    const command = `call node_modules\\.bin\\intent-planner.cmd ${args.join(" ")}`.trim();
    return spawnSync(commandShell(env), ["/d", "/s", "/c", command], {
      cwd: fixture,
      encoding: "utf8",
      env,
    });
  }

  return spawnSync("./node_modules/.bin/intent-planner", args, {
    cwd: fixture,
    encoding: "utf8",
    env,
  });
}

function runDirectCli(fixture, args, env) {
  return spawnSync(process.execPath, [path.join(DIST_ROOT, "bin", "cli.mjs"), ...args], {
    cwd: fixture,
    encoding: "utf8",
    env,
  });
}

function snapshotTree(root) {
  const entries = [];

  function visit(directory, relativeDirectory = "") {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = path.join(relativeDirectory, entry.name);
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        entries.push({ path: relativePath, type: "directory" });
        visit(absolutePath, relativePath);
      } else if (entry.isSymbolicLink()) {
        entries.push({ path: relativePath, type: "symlink", target: fs.readlinkSync(absolutePath) });
      } else {
        entries.push({
          path: relativePath,
          type: "file",
          bytes: fs.readFileSync(absolutePath).toString("base64"),
        });
      }
    }
  }

  visit(root);
  return entries;
}

function normalizeCliOutput(output, targetName) {
  return output
    .split(targetName).join("<target>")
    .replaceAll("\\", "/")
    .replaceAll("\r\n", "\n");
}

function observeCliRun(result, targetRoot, targetName) {
  return {
    status: result.status,
    signal: result.signal,
    stdout: normalizeCliOutput(result.stdout, targetName),
    stderr: normalizeCliOutput(result.stderr, targetName),
    tree: snapshotTree(targetRoot),
  };
}

function cliParityErrors(direct, local) {
  const errors = [];
  for (const field of ["status", "signal", "stdout", "stderr", "tree"]) {
    try {
      assert.deepEqual(local[field], direct[field]);
    } catch {
      errors.push(`local CLI differs from direct CLI: ${field}`);
    }
  }
  return errors;
}

function treeDifferences(directTree, localTree) {
  const directByPath = new Map(directTree.map((entry) => [entry.path, entry]));
  const localByPath = new Map(localTree.map((entry) => [entry.path, entry]));
  return [...new Set([...directByPath.keys(), ...localByPath.keys()])]
    .filter((relativePath) => {
      try {
        assert.deepEqual(localByPath.get(relativePath), directByPath.get(relativePath));
        return false;
      } catch {
        return true;
      }
    });
}

function seedProtectedFiles(targetRoot) {
  const files = new Map([
    ["AGENTS.md", "# existing AGENTS instructions\n"],
    ["CLAUDE.md", "# existing CLAUDE instructions\n"],
    [path.join(".intent", "intent-tree.md"), "# existing intent tree\n"],
  ]);
  for (const [relativePath, contents] of files) {
    const absolutePath = path.join(targetRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, contents);
  }
  return files;
}

function assertProtectedFiles(targetRoot, expected, message) {
  for (const [relativePath, contents] of expected) {
    assert.equal(fs.readFileSync(path.join(targetRoot, relativePath), "utf8"), contents, `${message}: ${relativePath}`);
  }
}

function compareDirectAndLocalCli(fixture, caseName, args, env) {
  const directTargetName = `${caseName}-direct`;
  const localTargetName = `${caseName}-local`;
  const directTarget = path.join(fixture, directTargetName);
  const localTarget = path.join(fixture, localTargetName);
  fs.mkdirSync(directTarget);
  fs.mkdirSync(localTarget);
  const protectedFiles = seedProtectedFiles(directTarget);
  seedProtectedFiles(localTarget);

  const directResult = runDirectCli(fixture, [directTargetName, ...args], env);
  const localResult = runLocalCli(fixture, [localTargetName, ...args], env);
  const direct = observeCliRun(directResult, directTarget, directTargetName);
  const local = observeCliRun(localResult, localTarget, localTargetName);

  assertProtectedFiles(directTarget, protectedFiles, `${caseName}: direct CLI protects existing user files`);
  assertProtectedFiles(localTarget, protectedFiles, `${caseName}: local CLI protects existing user files`);
  return { direct, local, directTarget, localTarget, protectedFiles };
}

function localCliErrors(result) {
  const errors = [];
  if (result.status !== 0) {
    errors.push(`local CLI exited with status ${result.status ?? "<missing>"}`);
  }
  if (!/新規配置予定 \(\d+\):/.test(result.stdout)) {
    errors.push("local CLI did not reach the existing CLI dry-run output");
  }
  if (!/AGENTS\.md を配置予定/.test(result.stdout)) {
    errors.push("local CLI did not preserve the --agent codex dry-run behavior");
  }
  return errors;
}

function replaceLocalBinWithSuccessShim(fixture) {
  const localBin = localBinPath(fixture);
  fs.rmSync(localBin);
  if (process.platform === "win32") {
    fs.writeFileSync(localBin, "@echo off\r\nexit /b 0\r\n");
  } else {
    fs.writeFileSync(localBin, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  }
}

function invokeNpxSentinel(fixture, env) {
  if (process.platform === "win32") {
    return spawnSync(commandShell(env), ["/d", "/s", "/c", "call npx.cmd --version"], {
      cwd: fixture,
      encoding: "utf8",
      env,
    });
  }
  return spawnSync("npx", ["--version"], { cwd: fixture, encoding: "utf8", env });
}

function installedPackageErrors(fixture) {
  const errors = [];
  const installedRoot = path.join(fixture, "node_modules", "intent-planner");

  if (!fs.existsSync(installedRoot)) {
    return [`${installedRoot}: installed package is missing`];
  }
  if (fs.lstatSync(installedRoot).isSymbolicLink()) {
    errors.push(`${installedRoot}: installed package must be a copied package, not a symlink`);
  }

  const installed = readJson(path.join(installedRoot, "package.json"));
  for (const field of ["name", "bin", "engines", "dependencies"]) {
    try {
      assert.deepEqual(installed[field], ROOT_PACKAGE[field]);
    } catch {
      errors.push(`intent-planner package contract changed: ${field}`);
    }
  }
  return errors;
}

for (const contract of README_CONTRACTS) {
  test(`${contract.relativePath} describes the npm route without weakening existing routes`, () => {
    const section = installSection(read(contract.relativePath), contract.heading);
    const errors = contractErrors(section, contract);
    assert.deepEqual(errors, [], errors.join("\n"));

    const unsafeExamples = fencedShellCommands(section).filter((command) => command.includes("--force"));
    assert.deepEqual(
      unsafeExamples,
      [],
      `${contract.relativePath}: --force must not be a normal command example`,
    );
  });
}

test("README contract rejects a required meaning removed from only one language side", () => {
  for (const contract of README_CONTRACTS) {
    const complete = installSection(read(contract.relativePath), contract.heading);
    assert.deepEqual(contractErrors(complete, contract), [], `${contract.relativePath}: mutation fixture must start valid`);

    for (const [meaning, predicate] of contract.checks) {
      assert.equal(predicate(complete), true, `${contract.relativePath}: ${meaning} must be independently observable`);
    }

    const installCommandRemoved = complete.replace("npm install --save-dev intent-planner", "npm install intent-planner");
    assert.deepEqual(
      contractErrors(installCommandRemoved, contract),
      [`${contract.relativePath}: missing npm install command`],
      `${contract.relativePath}: changing one side's install command must produce one specific diagnosis`,
    );

    const offlineExplanation = contract.relativePath === "README.md"
      ? "オフライン対応でも、Node.js 不要でもありません"
      : "neither an offline nor a Node.js-free option";
    const offlineExplanationRemoved = complete.replace(offlineExplanation, "check the prerequisites");
    assert.deepEqual(
      contractErrors(offlineExplanationRemoved, contract),
      [`${contract.relativePath}: missing npm is not offline or Node-free`],
      `${contract.relativePath}: removing one side's offline boundary must produce one specific diagnosis`,
    );
  }
});

for (const contract of GUIDE_CONTRACTS) {
  test(`${contract.relativePath} describes the complete npm route without npx`, () => {
    const section = installSection(read(contract.relativePath), contract.heading);
    const errors = contractErrors(section, contract);
    assert.deepEqual(errors, [], errors.join("\n"));

    const unsafeExamples = fencedShellCommands(section).filter((command) => command.includes("--force"));
    assert.deepEqual(
      unsafeExamples,
      [],
      `${contract.relativePath}: --force must not be a normal command example`,
    );
  });
}

test("guide contract rejects required meanings removed from only one language side", () => {
  for (const contract of GUIDE_CONTRACTS) {
    const complete = installSection(read(contract.relativePath), contract.heading);
    assert.deepEqual(contractErrors(complete, contract), [], `${contract.relativePath}: mutation fixture must start valid`);

    for (const [meaning, from, to] of contract.mutations) {
      const mutated = complete.replace(from, to);
      assert.notEqual(mutated, complete, `${contract.relativePath}: ${meaning} mutation must change the document fixture`);
      assert.deepEqual(
        contractErrors(mutated, contract),
        [`${contract.relativePath}: missing ${meaning}`],
        `${contract.relativePath}: removing one side's ${meaning} must produce one specific diagnosis`,
      );
    }
  }
});

test("published package installs offline as a normal development dependency", (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-npm-without-npx-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(fixture, "package.json"),
    JSON.stringify({ name: "npm-without-npx-fixture", version: "1.0.0", private: true }, null, 2) + "\n",
  );

  const result = runOfflineInstall(fixture);
  assert.equal(
    result.status,
    0,
    `offline npm install failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const fixturePackage = readJson(path.join(fixture, "package.json"));
  assert.ok(
    fixturePackage.devDependencies?.["intent-planner"],
    "package.json records intent-planner as a development dependency",
  );
  assert.ok(fs.existsSync(path.join(fixture, "package-lock.json")), "npm install creates package-lock.json");
  assert.ok(fs.existsSync(path.join(fixture, "node_modules", "intent-planner")), "npm install creates node_modules");
  assert.ok(fs.existsSync(path.join(fixture, "node_modules", "handoff-bridge")), "handoff-bridge is installed");
  assert.ok(fs.existsSync(path.join(fixture, "node_modules", "term-drift")), "term-drift is installed");

  const localBin = path.join(
    fixture,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "intent-planner.cmd" : "intent-planner",
  );
  assert.ok(fs.existsSync(localBin), `npm creates the OS-specific local bin: ${localBin}`);
  for (const [field, expected] of Object.entries(EXPECTED_PACKAGE_CONTRACT)) {
    assert.deepEqual(ROOT_PACKAGE[field], expected, `root package contract remains unchanged: ${field}`);
  }
  assert.deepEqual(installedPackageErrors(fixture), [], "installed intent-planner preserves its package contract");

  const lock = readJson(path.join(fixture, "package-lock.json"));
  const lockedIntentPlanner = lock.packages?.["node_modules/intent-planner"];
  assert.ok(lockedIntentPlanner, "package-lock records node_modules/intent-planner");
  assert.match(
    lockedIntentPlanner.resolved ?? "",
    /(?:^|[/\\])dist$/,
    "package-lock resolves intent-planner from generated dist, not the repository root",
  );
});

test("offline install acceptance rejects missing inputs and symlink installs", (t) => {
  const missingDependencyInputs = REQUIRED_INSTALL_INPUTS.filter((input) => input.name !== "term-drift");
  assert.deepEqual(
    validateInstallInputs(missingDependencyInputs),
    ["term-drift: local package input is missing. Run `npm ci` to install the lockfile-pinned term-drift package."],
    "removing an exact dependency input produces an actionable npm ci diagnosis",
  );

  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-npm-symlink-control-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const nodeModules = path.join(fixture, "node_modules");
  fs.mkdirSync(nodeModules, { recursive: true });
  fs.symlinkSync(DIST_ROOT, path.join(nodeModules, "intent-planner"), process.platform === "win32" ? "junction" : "dir");

  assert.deepEqual(
    installedPackageErrors(fixture),
    [
      `${path.join(fixture, "node_modules", "intent-planner")}: installed package must be a copied package, not a symlink`,
    ],
    "a symlink install is a real invalid fixture and is rejected",
  );
});

test("OS-specific local CLI runs without invoking npx", (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-local-bin-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(fixture, "package.json"),
    JSON.stringify({ name: "local-bin-fixture", version: "1.0.0", private: true }, null, 2) + "\n",
  );

  const sentinel = createNpxSentinel(fixture);
  const result = runOfflineInstall(fixture, REQUIRED_INSTALL_INPUTS, sentinel.env);
  assert.equal(
    result.status,
    0,
    `offline npm install failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const cli = runLocalCli(fixture, [".", "--agent", "codex", "--dry-run"], sentinel.env);
  assert.deepEqual(
    localCliErrors(cli),
    [],
    `local CLI failed its existing-CLI contract\nstdout:\n${cli.stdout}\nstderr:\n${cli.stderr}`,
  );
  assert.equal(fs.existsSync(sentinel.recordPath), false, "the local CLI path must not invoke npx");

  replaceLocalBinWithSuccessShim(fixture);
  const fakeSuccess = runLocalCli(fixture, [".", "--agent", "codex", "--dry-run"], sentinel.env);
  assert.deepEqual(
    localCliErrors(fakeSuccess),
    [
      "local CLI did not reach the existing CLI dry-run output",
      "local CLI did not preserve the --agent codex dry-run behavior",
    ],
    "an exit-zero shim must not satisfy the local CLI acceptance contract",
  );
  assert.equal(fs.existsSync(sentinel.recordPath), false, "the exit-zero shim must not obscure an npx invocation");
});

test("npx sentinel is observable and a missing local bin never falls back", (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-npx-sentinel-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const sentinel = createNpxSentinel(fixture);

  assert.throws(
    () => runLocalCli(fixture, ["--dry-run"], sentinel.env),
    /local intent-planner CLI is missing.*refusing to fall back to npx or a global CLI/,
  );
  assert.equal(fs.existsSync(sentinel.recordPath), false, "a missing local bin must not attempt npx");

  const control = invokeNpxSentinel(fixture, sentinel.env);
  assert.notEqual(control.status, 0, "the npx sentinel must fail when it is invoked");
  assert.equal(fs.existsSync(sentinel.recordPath), true, "the npx sentinel must record its invocation");
});

test("local bin preserves the direct CLI arguments, output, and non-destructive rerun behavior", (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "intent-planner-cli-parity-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(fixture, "package.json"),
    JSON.stringify({ name: "cli-parity-fixture", version: "1.0.0", private: true }, null, 2) + "\n",
  );

  const sentinel = createNpxSentinel(fixture);
  const installResult = runOfflineInstall(fixture, REQUIRED_INSTALL_INPUTS, sentinel.env);
  assert.equal(
    installResult.status,
    0,
    `offline npm install failed\nstdout:\n${installResult.stdout}\nstderr:\n${installResult.stderr}`,
  );
  const sentinelCallsAfterInstall = fs.existsSync(sentinel.recordPath) ? 1 : 0;

  const cases = [
    ["default", []],
    ["codex", ["--agent", "codex"]],
    ["dry-run", ["--agent", "codex", "--dry-run"]],
    ["english", ["--lang", "en", "--dry-run"]],
  ];
  for (const [caseName, args] of cases) {
    const comparison = compareDirectAndLocalCli(fixture, caseName, args, sentinel.env);
    assert.deepEqual(
      cliParityErrors(comparison.direct, comparison.local),
      [],
      `${caseName}: local bin must preserve direct CLI behavior; differing tree paths: ${treeDifferences(comparison.direct.tree, comparison.local.tree).join(", ")}`,
    );
  }

  const rerun = compareDirectAndLocalCli(fixture, "rerun", ["--agent", "codex"], sentinel.env);
  const directRerunResult = runDirectCli(fixture, [path.basename(rerun.directTarget), "--agent", "codex"], sentinel.env);
  const localRerunResult = runLocalCli(fixture, [path.basename(rerun.localTarget), "--agent", "codex"], sentinel.env);
  const directRerun = observeCliRun(
    directRerunResult,
    rerun.directTarget,
    path.basename(rerun.directTarget),
  );
  const localRerun = observeCliRun(localRerunResult, rerun.localTarget, path.basename(rerun.localTarget));
  assertProtectedFiles(rerun.directTarget, rerun.protectedFiles, "direct CLI rerun protects existing user files");
  assertProtectedFiles(rerun.localTarget, rerun.protectedFiles, "local CLI rerun protects existing user files");
  assert.deepEqual(
    cliParityErrors(directRerun, localRerun),
    [],
    "local bin rerun must preserve direct CLI behavior",
  );

  const mutatedLocal = structuredClone(rerun.local);
  const firstFile = mutatedLocal.tree.find((entry) => entry.type === "file");
  assert.ok(firstFile, "the parity mutation must select an observed placed file");
  firstFile.bytes = Buffer.from("parity negative control\n").toString("base64");
  assert.notDeepEqual(mutatedLocal.tree, rerun.local.tree, "the parity mutation must change the observed tree");
  assert.deepEqual(
    cliParityErrors(rerun.direct, mutatedLocal),
    ["local CLI differs from direct CLI: tree"],
    "the comparison oracle must reject changed placement bytes",
  );

  const sentinelCallsAfterCli = fs.existsSync(sentinel.recordPath) ? 1 : 0;
  assert.equal(
    sentinelCallsAfterCli,
    sentinelCallsAfterInstall,
    "install, argument cases, and rerun must not add an npx sentinel record",
  );
});
