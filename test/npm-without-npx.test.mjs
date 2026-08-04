import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

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
