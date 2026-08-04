import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CMD_PATH = path.join(ROOT, "scripts", "portable", "intent-planner.cmd");
const GIT_ATTRIBUTES_PATH = path.join(ROOT, ".gitattributes");

async function readLauncherBytes() {
  return fs.readFile(CMD_PATH);
}

function parseLauncher(source) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  const labels = new Map();
  const instructions = [];

  for (const [sourceIndex, original] of lines.entries()) {
    const line = original.trim();
    if (line === "") continue;
    if (line.startsWith(":")) {
      const label = line.slice(1).toLowerCase();
      assert.match(label, /^[a-z0-9_]+$/, `valid label on line ${sourceIndex + 1}`);
      assert.equal(labels.has(label), false, `unique label ${label}`);
      labels.set(label, instructions.length);
      continue;
    }

    let match;
    if (/^@echo off$/i.test(line)) {
      instructions.push({ type: "echo-off", sourceIndex });
    } else if (/^setlocal DisableDelayedExpansion$/i.test(line)) {
      instructions.push({ type: "setlocal", sourceIndex });
    } else if ((match = line.match(/^if \/I "(%[A-Z0-9_]+%)"=="([^"]*)" goto ([a-z0-9_]+)$/i))) {
      instructions.push({
        type: "if-equal",
        left: match[1],
        right: match[2],
        label: match[3],
        sourceIndex,
      });
    } else if ((match = line.match(/^if not exist "([^"]+)" goto ([a-z0-9_]+)$/i))) {
      instructions.push({ type: "if-missing", filename: match[1], label: match[2], sourceIndex });
    } else if ((match = line.match(/^if "(%[A-Z0-9_]+%)"=="([^"]*)" goto ([a-z0-9_]+)$/i))) {
      instructions.push({
        type: "if-equal",
        left: match[1],
        right: match[2],
        label: match[3],
        sourceIndex,
      });
    } else if ((match = line.match(/^goto ([a-z0-9_]+)$/i))) {
      instructions.push({ type: "goto", label: match[1], sourceIndex });
    } else if ((match = line.match(/^set "([A-Z0-9_]+)=(.*)"$/i))) {
      instructions.push({ type: "set", variable: match[1], value: match[2], sourceIndex });
    } else if ((match = line.match(/^echo (.*) 1>&2$/i))) {
      instructions.push({ type: "stderr", message: match[1], sourceIndex });
    } else if ((match = line.match(/^exit \/b(?: (.+))?$/i))) {
      instructions.push({ type: "exit", code: match[1] ?? null, sourceIndex });
    } else if ((match = line.match(/^"([^"]+)" "([^"]+)"( %\*)?$/))) {
      instructions.push({
        type: "invoke",
        executable: match[1],
        script: match[2],
        forwardsArguments: match[3] === " %*",
        sourceIndex,
      });
    } else {
      assert.fail(`unsupported or external command on line ${sourceIndex + 1}: ${line}`);
    }
  }

  for (const instruction of instructions) {
    if ("label" in instruction) {
      assert.equal(labels.has(instruction.label.toLowerCase()), true, `known label ${instruction.label}`);
    }
  }
  return { instructions, labels };
}

function expand(value, state) {
  return value
    .replaceAll(/%~dp0/gi, state.launcherDirectory)
    .replaceAll(/%=ExitCode%/gi, (state.lastExternalExitCode >>> 0).toString(16).padStart(8, "0"))
    .replaceAll(/%([A-Z0-9_]+)%/gi, (_whole, name) => {
      const environmentName = Object.keys(state.environment).find(
        (candidate) => candidate.toLowerCase() === name.toLowerCase(),
      );
      if (environmentName !== undefined) return state.environment[environmentName];
      if (name.toLowerCase() === "errorlevel") return String(state.errorLevel);
      return "";
    });
}

function simulate(program, options = {}) {
  const launcherDirectory = options.launcherDirectory ?? "C:\\Portable Folder\\日本語\\";
  const environment = {
    PROCESSOR_ARCHITECTURE: "AMD64",
    PROCESSOR_ARCHITEW6432: "",
    ...(options.environment ?? {}),
  };
  const existing = new Set(options.existing ?? [
    `${launcherDirectory}runtime\\node.exe`,
    `${launcherDirectory}app\\src\\portable\\verify-and-run.mjs`,
  ]);
  const state = {
    cwd: options.cwd ?? "C:\\Users\\Example\\Project With Spaces",
    environment,
    existing,
    launcherDirectory,
    errorLevel: 0,
    lastExternalExitCode: 0,
    stderr: [],
    invocations: [],
  };
  const rawArguments = options.rawArguments ?? '--dry-run --lang ja --label "A & B 日本語"';
  let pointer = 0;

  function jump(label) {
    pointer = program.labels.get(label.toLowerCase());
  }

  for (let steps = 0; steps < 200; steps += 1) {
    const instruction = program.instructions[pointer];
    assert.ok(instruction, "control flow must terminate with exit /b");
    pointer += 1;
    switch (instruction.type) {
      case "echo-off":
      case "setlocal":
        break;
      case "if-equal":
        if (expand(instruction.left, state).toLowerCase() === instruction.right.toLowerCase()) {
          jump(instruction.label);
        }
        break;
      case "if-missing":
        if (!state.existing.has(expand(instruction.filename, state))) jump(instruction.label);
        break;
      case "goto":
        jump(instruction.label);
        break;
      case "set":
        state.environment[instruction.variable] = expand(instruction.value, state);
        break;
      case "stderr":
        state.stderr.push(expand(instruction.message, state).replaceAll("^(", "(").replaceAll("^)", ")"));
        break;
      case "invoke": {
        state.invocations.push({
          executable: expand(instruction.executable, state),
          script: expand(instruction.script, state),
          rawArguments: instruction.forwardsArguments ? rawArguments : null,
          cwd: state.cwd,
          environment: { ...state.environment },
        });
        if (options.launchFailure) {
          state.errorLevel = options.launchFailure.exitCode;
          state.lastExternalExitCode = options.launchFailure.exitCode;
          state.stderr.push(options.launchFailure.diagnostic);
        } else {
          state.errorLevel = options.childExitCode ?? 0;
          state.lastExternalExitCode = options.childExitCode ?? 0;
        }
        break;
      }
      case "exit":
        return {
          ...state,
          exitCode: instruction.code === null
            ? state.errorLevel
            : Number(expand(instruction.code, state)),
        };
      default:
        assert.fail(`unhandled instruction ${instruction.type}`);
    }
  }
  assert.fail("launcher control flow exceeded step limit");
}

test("Windows x64とWOW64だけが同梱Node.jsへ到達する", async () => {
  const program = parseLauncher((await readLauncherBytes()).toString("ascii"));
  for (const environment of [
    { PROCESSOR_ARCHITECTURE: "AMD64", PROCESSOR_ARCHITEW6432: "" },
    { PROCESSOR_ARCHITECTURE: "x86", PROCESSOR_ARCHITEW6432: "AMD64" },
  ]) {
    const result = simulate(program, { environment });
    assert.equal(result.exitCode, 0);
    assert.equal(result.invocations.length, 1);
  }

  for (const environment of [
    { PROCESSOR_ARCHITECTURE: "ARM64", PROCESSOR_ARCHITEW6432: "" },
    { PROCESSOR_ARCHITECTURE: "x86", PROCESSOR_ARCHITEW6432: "" },
    { PROCESSOR_ARCHITECTURE: "AMD64", PROCESSOR_ARCHITEW6432: "ARM64" },
    { PROCESSOR_ARCHITECTURE: "x86", PROCESSOR_ARCHITEW6432: "ARM64" },
    { PROCESSOR_ARCHITECTURE: "", PROCESSOR_ARCHITEW6432: "" },
  ]) {
    const result = simulate(program, { environment });
    assert.equal(result.exitCode, 2);
    assert.equal(result.invocations.length, 0);
    assert.match(result.stderr.join("\n"), /unsupported CPU.*AMD64/i);
  }
});

test("必須ファイルを起動前に確認し、絶対パス・cwd・引数を維持する", async () => {
  const source = (await readLauncherBytes()).toString("ascii");
  const program = parseLauncher(source);
  const launcherDirectory = "C:\\配布 Folder\\";
  const cwd = "D:\\利用者\\Project & Data";
  const rawArguments = '--dry-run --lang ja --label "A & B 日本語" "100%" "bang!"';
  const existing = [
    `${launcherDirectory}runtime\\node.exe`,
    `${launcherDirectory}app\\src\\portable\\verify-and-run.mjs`,
  ];
  const result = simulate(program, { launcherDirectory, cwd, rawArguments, existing, childExitCode: 17 });

  assert.equal(result.exitCode, 17);
  assert.equal(result.invocations.length, 1);
  assert.deepEqual(result.invocations[0], {
    executable: `${launcherDirectory}runtime\\node.exe`,
    script: `${launcherDirectory}app\\src\\portable\\verify-and-run.mjs`,
    rawArguments,
    cwd,
    environment: {
      PROCESSOR_ARCHITECTURE: "AMD64",
      PROCESSOR_ARCHITEW6432: "",
    },
  });
  assert.equal(source.match(/%\*/g)?.length, 1);

  for (const missing of existing) {
    const missingResult = simulate(program, {
      launcherDirectory,
      cwd,
      existing: existing.filter((filename) => filename !== missing),
    });
    assert.equal(missingResult.exitCode, 3);
    assert.equal(missingResult.invocations.length, 0);
    assert.match(missingResult.stderr.join("\n"), /missing/i);
  }
});

test("呼出元のERRORLEVEL環境変数に影響されず、CLIの全終了コードと表示をそのまま返す", async () => {
  const source = (await readLauncherBytes()).toString("ascii");
  const program = parseLauncher(source);
  const invocationIndex = program.instructions.findIndex((instruction) => instruction.type === "invoke");
  assert.deepEqual(program.instructions.slice(0, invocationIndex).filter((instruction) => instruction.type === "set"), []);
  assert.equal(program.instructions[invocationIndex + 1]?.type, "exit");
  assert.equal(program.instructions[invocationIndex + 1]?.code, "0x%=ExitCode%");
  for (const exitCode of [0, 1, 2, 5, 17, 193, 216, 255, 740, 9009, 1260]) {
    const result = simulate(program, {
      childExitCode: exitCode,
      environment: { ERRORLEVEL: "malicious-or-stale" },
    });
    assert.equal(result.exitCode, exitCode);
    assert.equal(result.stderr.length, 0);
    assert.equal(result.invocations[0].environment.ERRORLEVEL, "malicious-or-stale");
  }

  const shadowedMutation = parseLauncher(source.replace("0x%=ExitCode%", "%ERRORLEVEL%"));
  const mutatedResult = simulate(shadowedMutation, {
    childExitCode: 17,
    environment: { ERRORLEVEL: "malicious-or-stale" },
  });
  assert.notEqual(mutatedResult.exitCode, 17, "shadowable ERRORLEVEL expansion must be caught");
});

test("Command shell自身の起動失敗診断を隠さず、失敗終了状態をそのまま返す", async () => {
  const program = parseLauncher((await readLauncherBytes()).toString("ascii"));
  const diagnostic = "cmd.exe: This app cannot run on your PC.";
  const result = simulate(program, {
    environment: { ERRORLEVEL: "malicious-or-stale" },
    launchFailure: { exitCode: 193, diagnostic },
  });
  assert.equal(result.exitCode, 193);
  assert.deepEqual(result.stderr, [diagnostic]);
  assert.equal(result.invocations.length, 1);
});

test("Command shell組み込みだけを使い、ホスト依存と機密出力を持ち込まない", async () => {
  const bytes = await readLauncherBytes();
  const source = bytes.toString("ascii");
  const program = parseLauncher(source);
  assert.equal(bytes.includes(0), false);
  assert.equal([...bytes].every((byte) => byte < 0x80), true, "launcher is BOM-free ASCII");
  assert.match(source, /\r\n$/);
  assert.doesNotMatch(source, /(^|[^\r])\n/, "launcher uses CRLF only");
  assert.doesNotMatch(source, /\r(?!\n)/, "launcher has no lone carriage returns");
  assert.doesNotMatch(source, /\b(?:powershell|pwsh|curl|bitsadmin|certutil|wget|npm|npx|runas|reg|setx|start|call|pushd|popd)\b/i);
  assert.doesNotMatch(source, /(?:^|[\r\n])\s*(?:cd|path)\b/i);
  assert.doesNotMatch(source, /https?:|\\\\[^\\]/i);
  assert.doesNotMatch(source, /(?:type|more|findstr)\s/i);
  assert.doesNotMatch(source, /%ERRORLEVEL%|INTENT_PLANNER_EXIT_CODE/i);

  const invocationIndex = program.instructions.findIndex((instruction) => instruction.type === "invoke");
  assert.notEqual(invocationIndex, -1);
  const writesBeforeInvocation = program.instructions.slice(0, invocationIndex).filter(
    (instruction) => instruction.type === "set" || instruction.type === "invoke",
  );
  assert.deepEqual(writesBeforeInvocation, []);
});

test("GitではLFへ正規化し、Windows作業ツリーではランチャーをCRLFに保つ", async () => {
  const attributes = await fs.readFile(GIT_ATTRIBUTES_PATH, "utf8");
  const rules = attributes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
  assert.equal(
    rules.filter((line) => line === "scripts/portable/intent-planner.cmd text eol=crlf").length,
    1,
  );
});
