#!/usr/bin/env node

import { randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ALLOWED_COMMANDS = new Set([
  "now",
  "rand4",
  "mkdir-intent",
  "move-packet",
  "remove-own-drafting-assignment",
  "intent-check",
  "git-head",
]);

class InputError extends Error {}
class EnvironmentError extends Error {}

function requireArgs(actual, expected, usage) {
  if (actual.length !== expected) {
    throw new InputError(`usage: ${usage}`);
  }
}

function intentPath(relativePath, { packetsOnly = false } = {}) {
  if (!relativePath || relativePath.includes("\0") || path.isAbsolute(relativePath)) {
    throw new InputError("path must be relative and inside .intent/");
  }
  const segments = relativePath.split(/[\\/]+/);
  if (segments.includes("..")) {
    throw new InputError("path must not contain ..");
  }
  const normalized = path.normalize(relativePath);
  const allowedRoot = packetsOnly ? path.join(".intent", "packets") : ".intent";
  if (normalized !== allowedRoot && !normalized.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new InputError(`path must be inside ${allowedRoot}/`);
  }
  const target = path.resolve(process.cwd(), normalized);

  const projectRoot = fs.realpathSync(process.cwd());
  const intentRoot = path.resolve(process.cwd(), ".intent");
  let intentRootStat;
  try {
    intentRootStat = fs.lstatSync(intentRoot);
  } catch (error) {
    if (error.code === "ENOENT") throw new InputError("project .intent/ directory does not exist");
    throw new EnvironmentError(error.message);
  }
  if (intentRootStat.isSymbolicLink()) throw new InputError("path must not traverse a symlink");
  if (!intentRootStat.isDirectory()) throw new InputError("project .intent/ must be a directory");

  let intentRootReal;
  try {
    intentRootReal = fs.realpathSync(intentRoot);
  } catch (error) {
    throw new EnvironmentError(error.message);
  }
  if (path.relative(projectRoot, intentRootReal) !== ".intent") {
    throw new InputError("project .intent/ must stay inside the project root");
  }

  const targetRelative = path.relative(intentRoot, target);
  let closestExisting = intentRoot;
  let cursor = intentRoot;
  for (const segment of targetRelative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw new EnvironmentError(error.message);
    }
    if (stat.isSymbolicLink()) throw new InputError("path must not traverse a symlink");
    closestExisting = cursor;
  }

  let closestExistingReal;
  try {
    closestExistingReal = fs.realpathSync(closestExisting);
  } catch (error) {
    throw new EnvironmentError(error.message);
  }
  const relativeToIntent = path.relative(intentRootReal, closestExistingReal);
  if (relativeToIntent === ".." || relativeToIntent.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToIntent)) {
    throw new InputError("path must stay inside project .intent/");
  }
  return target;
}

function output(value) {
  process.stdout.write(`${value}\n`);
}

function runFixed(program, args, { passKnownFailure = false } = {}) {
  const result = spawnSync(program, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
  });
  if (result.error) {
    throw new EnvironmentError(result.error.message);
  }
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status === null) {
    throw new EnvironmentError("child process did not return an exit status");
  }
  if (result.status === 0 || (passKnownFailure && (result.status === 1 || result.status === 2))) {
    if (result.stdout) process.stdout.write(result.stdout);
    process.exitCode = result.status;
    return;
  }
  throw new EnvironmentError("required command is unavailable in this project");
}

function frontmatterValue(source, key) {
  const match = source.match(new RegExp(`^${key}:[ \\t]*(.*)$`, "m"));
  if (!match) return undefined;
  const value = match[1].trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function removeOwnDraftingAssignment(issueDir, session) {
  if (!issueDir || !session) throw new InputError("issue_dir and session are required");
  const assignments = intentPath(".intent/assignments");
  if (!fs.existsSync(assignments)) return;
  let entries;
  try {
    entries = fs.readdirSync(assignments, { withFileTypes: true });
  } catch (error) {
    throw new EnvironmentError(error.message);
  }
  const matches = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "README.md") continue;
    const candidate = path.join(assignments, entry.name);
    let source;
    try {
      source = fs.readFileSync(candidate, "utf8");
    } catch (error) {
      throw new EnvironmentError(error.message);
    }
    if (
      frontmatterValue(source, "phase") === "drafting" &&
      frontmatterValue(source, "issue_dir") === issueDir &&
      frontmatterValue(source, "session") === session
    ) {
      matches.push(candidate);
    }
  }
  if (matches.length > 1) {
    throw new InputError("more than one matching drafting assignment found");
  }
  if (matches.length === 1) fs.unlinkSync(matches[0]);
}

function execute(command, args) {
  switch (command) {
    case "now":
      requireArgs(args, 0, "now");
      output(new Date().toISOString());
      return;
    case "rand4": {
      requireArgs(args, 0, "rand4");
      const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
      let value = "";
      for (let index = 0; index < 4; index += 1) value += alphabet[randomInt(alphabet.length)];
      output(value);
      return;
    }
    case "mkdir-intent":
      requireArgs(args, 1, "mkdir-intent <.intent-relative-path>");
      fs.mkdirSync(intentPath(args[0]), { recursive: true });
      return;
    case "move-packet": {
      requireArgs(args, 2, "move-packet <source> <destination>");
      const source = intentPath(args[0], { packetsOnly: true });
      const destination = intentPath(args[1], { packetsOnly: true });
      if (!source.endsWith(".md") || !destination.endsWith(".md")) {
        throw new InputError("packet paths must end in .md");
      }
      if (!fs.existsSync(source)) throw new InputError("source packet does not exist");
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.renameSync(source, destination);
      return;
    }
    case "remove-own-drafting-assignment":
      requireArgs(args, 2, "remove-own-drafting-assignment <issue_dir> <session>");
      removeOwnDraftingAssignment(args[0], args[1]);
      return;
    case "intent-check": {
      requireArgs(args, 0, "intent-check");
      const script = intentPath(".intent/scripts/intent-check.mjs");
      if (!fs.existsSync(script)) throw new EnvironmentError(".intent/scripts/intent-check.mjs is unavailable");
      runFixed(process.execPath, [script], { passKnownFailure: true });
      return;
    }
    case "git-head":
      requireArgs(args, 0, "git-head");
      runFixed("git", ["rev-parse", "HEAD"]);
      return;
    default:
      throw new InputError(`unknown command: ${command ?? ""}`);
  }
}

const [command, ...args] = process.argv.slice(2);
try {
  if (!ALLOWED_COMMANDS.has(command)) throw new InputError(`unknown command: ${command ?? ""}`);
  execute(command, args);
} catch (error) {
  process.stderr.write(`intent-plan-ops: ${error.message}\n`);
  process.exitCode = error instanceof InputError ? 1 : 2;
}
