import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * term-drift の互換性検査へ注入する読み取り専用契約。
 * ファイル本文は保持せず、公開版またはテストfixtureから得たSHA-256だけを保持する。
 *
 * @typedef {Readonly<{
 *   version: string,
 *   commonFiles: Readonly<Record<string, string>>,
 *   skillFiles: Readonly<Record<string, string>>,
 * }>} TermDriftCompatibility
 */

/**
 * OS固有の区切り文字だけをPOSIX形式へ揃える。
 * `.` や `..` の解決、絶対path化、filesystem参照は行わない。
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeTermDriftPath(value) {
  if (typeof value !== "string") {
    throw new TypeError("path must be a string");
  }
  return value.replaceAll("\\", "/");
}

/**
 * @param {string | Buffer | Uint8Array} bytes
 * @returns {string}
 */
function sha256(bytes) {
  if (typeof bytes !== "string" && !Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
    throw new TypeError("fixture bytes must be a string, Buffer, or Uint8Array");
  }
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

/**
 * @param {Record<string, string | Buffer | Uint8Array>} files
 * @returns {Readonly<Record<string, string>>}
 */
function hashFixtureFiles(files) {
  if (files === null || typeof files !== "object" || Array.isArray(files)) {
    throw new TypeError("fixture files must be a path-to-bytes object");
  }

  /** @type {Record<string, string>} */
  const hashes = {};
  for (const [relativePath, bytes] of Object.entries(files)) {
    const normalizedPath = normalizeTermDriftPath(relativePath);
    if (normalizedPath.length === 0) {
      throw new TypeError("fixture path must be a non-empty string");
    }
    if (Object.hasOwn(hashes, normalizedPath)) {
      throw new TypeError(`fixture paths collide after normalization: ${normalizedPath}`);
    }
    hashes[normalizedPath] = sha256(bytes);
  }
  return Object.freeze(hashes);
}

/**
 * 短い任意fixture bytesからproduction契約と同じshapeを作る。
 * Inspectorのテストはこの契約を注入することで、term-drift本文、network、npm cacheへ依存しない。
 *
 * @param {string} version
 * @param {{
 *   commonFiles: Record<string, string | Buffer | Uint8Array>,
 *   skillFiles: Record<string, string | Buffer | Uint8Array>,
 * }} fixture
 * @returns {TermDriftCompatibility}
 */
export function createTermDriftCompatibility(version, fixture) {
  if (typeof version !== "string" || version.length === 0) {
    throw new TypeError("version must be a non-empty string");
  }
  if (fixture === null || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new TypeError("fixture must contain commonFiles and skillFiles");
  }

  return Object.freeze({
    version,
    commonFiles: hashFixtureFiles(fixture.commonFiles),
    skillFiles: hashFixtureFiles(fixture.skillFiles),
  });
}

/** @type {TermDriftCompatibility} */
export const TERM_DRIFT_COMPATIBILITY = Object.freeze({
  version: "0.2.1",
  commonFiles: Object.freeze({
    ".term-drift/rules/detect.md":
      "303644de1f60c05f2a2a52948d84072fc023e38cfcadc4898d3212fac5193bfe",
    ".term-drift/rules/workflow.md":
      "60522e3e4a371d7f47ea0da92c0418d0704618a8654fa7e3af9444becc085e86",
  }),
  skillFiles: Object.freeze({
    "SKILL.md": "c006def08324ad50e749b36bfa31b7a747a32607561cd20768f64a48440266cb",
    "agents/openai.yaml":
      "e35e3820b0fc52bec4e8f033a6519ed05b9deebd24fe0b4f4fa0269f627e94d7",
  }),
});

const VERSION_PATH = ".term-drift/version.json";

/**
 * @typedef {'missing'|'invalid-version'|'hash-mismatch'|'unsafe-path'|'unexpected-skill-entry'} TermDriftIssueCode
 * @typedef {{code: TermDriftIssueCode, path: string}} TermDriftIssue
 * @typedef {{state:'not-installed'} | {state:'ready', version:string, skillPath:string} | {state:'inconsistent', repairability:'additive-compatible'|'blocked', issues:TermDriftIssue[]}} TermDriftHealth
 */

function isProjectLocalRelativePath(relativePath) {
  if (typeof relativePath !== "string") return false;
  const normalized = normalizeTermDriftPath(relativePath);
  if (
    normalized.length === 0 ||
    normalized.includes("\0") ||
    normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    /^[A-Za-z]:\//u.test(normalized)
  ) {
    return false;
  }
  return normalized
    .split("/")
    .every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function resolveProjectPath(targetDir, relativePath) {
  const normalized = normalizeTermDriftPath(relativePath);
  if (!isProjectLocalRelativePath(normalized)) return null;

  const root = path.resolve(targetDir);
  const absolutePath = path.resolve(root, ...normalized.split("/"));
  const relativeFromRoot = path.relative(root, absolutePath);
  if (
    relativeFromRoot === "" ||
    relativeFromRoot === ".." ||
    relativeFromRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeFromRoot)
  ) {
    return null;
  }
  return { root, absolutePath, normalized };
}

/**
 * lstatを各階層へ適用し、symlinkを辿らずに対象へ到達する。
 * @returns {{kind:'missing'} | {kind:'unsafe'} | {kind:'ok', stat:fs.Stats}}
 */
function lstatProjectPath(targetDir, relativePath) {
  const resolved = resolveProjectPath(targetDir, relativePath);
  if (!resolved) return { kind: "unsafe" };

  let current = resolved.root;
  const segments = resolved.normalized.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error?.code === "ENOENT") return { kind: "missing" };
      return { kind: "unsafe" };
    }
    if (stat.isSymbolicLink()) return { kind: "unsafe" };
    if (index < segments.length - 1 && !stat.isDirectory()) return { kind: "unsafe" };
    if (index === segments.length - 1) return { kind: "ok", stat };
  }
  return { kind: "unsafe" };
}

function readRegularProjectFile(targetDir, relativePath) {
  const inspected = lstatProjectPath(targetDir, relativePath);
  if (inspected.kind !== "ok") return inspected;
  if (!inspected.stat.isFile()) return { kind: "unsafe" };

  const resolved = resolveProjectPath(targetDir, relativePath);
  try {
    return { kind: "ok", bytes: fs.readFileSync(resolved.absolutePath) };
  } catch {
    return { kind: "unsafe" };
  }
}

function parseCompatibleVersion(bytes, compatibility) {
  try {
    const value = JSON.parse(bytes.toString("utf8"));
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const keys = Object.keys(value).sort();
    return (
      keys.length === 2 &&
      keys[0] === "package" &&
      keys[1] === "version" &&
      value.package === "term-drift" &&
      value.version === compatibility.version
    );
  } catch {
    return false;
  }
}

function expectedSkillDirectories(skillFiles) {
  const directories = new Set();
  for (const relativePath of Object.keys(skillFiles)) {
    const segments = normalizeTermDriftPath(relativePath).split("/");
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join("/"));
    }
  }
  return directories;
}

function inspectSkillTree(targetDir, skillRoot, compatibility, addIssue) {
  const rootInspection = lstatProjectPath(targetDir, skillRoot);
  if (rootInspection.kind !== "ok" || !rootInspection.stat.isDirectory()) return;

  const expectedFiles = new Set(Object.keys(compatibility.skillFiles).map(normalizeTermDriftPath));
  const expectedDirectories = expectedSkillDirectories(compatibility.skillFiles);
  const root = resolveProjectPath(targetDir, skillRoot);

  function visit(relativeDir) {
    const absoluteDir = path.join(root.absolutePath, ...relativeDir.split("/").filter(Boolean));
    let names;
    try {
      names = fs.readdirSync(absoluteDir).sort();
    } catch {
      addIssue("unsafe-path", relativeDir ? `${skillRoot}/${relativeDir}` : skillRoot);
      return;
    }

    for (const name of names) {
      const relativeEntry = relativeDir ? `${relativeDir}/${name}` : name;
      const projectRelativeEntry = `${skillRoot}/${relativeEntry}`;
      const entry = lstatProjectPath(targetDir, projectRelativeEntry);
      if (entry.kind !== "ok") {
        addIssue("unsafe-path", projectRelativeEntry);
        continue;
      }
      if (entry.stat.isDirectory()) {
        if (!expectedDirectories.has(relativeEntry)) {
          addIssue("unexpected-skill-entry", projectRelativeEntry);
          continue;
        }
        visit(relativeEntry);
        continue;
      }
      if (entry.stat.isSymbolicLink() || !entry.stat.isFile()) {
        addIssue("unsafe-path", projectRelativeEntry);
      } else if (!expectedFiles.has(relativeEntry)) {
        addIssue("unexpected-skill-entry", projectRelativeEntry);
      }
    }
  }

  visit("");
}

/**
 * target project内のterm-drift 0.2.1一式をread-onlyで照合する。
 * 存在するartifactが互換で欠落だけなら安全な追加候補とし、競合は自動修復対象外にする。
 *
 * @param {string} targetDir
 * @param {{termDriftSkillDest:string}} agentEntry
 * @param {TermDriftCompatibility} compatibility
 * @returns {TermDriftHealth}
 */
export function inspectTermDrift(
  targetDir,
  agentEntry,
  compatibility = TERM_DRIFT_COMPATIBILITY,
) {
  const skillRoot = normalizeTermDriftPath(agentEntry?.termDriftSkillDest ?? "");
  const markerInspection = lstatProjectPath(targetDir, ".term-drift");
  const skillRootInspection = lstatProjectPath(targetDir, skillRoot);
  const hasArtifact = markerInspection.kind !== "missing" || skillRootInspection.kind !== "missing";
  if (!hasArtifact && skillRootInspection.kind !== "unsafe") return { state: "not-installed" };

  /** @type {TermDriftIssue[]} */
  const issues = [];
  const issueKeys = new Set();
  function addIssue(code, issuePath) {
    const normalizedPath = normalizeTermDriftPath(issuePath);
    const key = `${code}:${normalizedPath}`;
    if (!issueKeys.has(key)) {
      issueKeys.add(key);
      issues.push({ code, path: normalizedPath });
    }
  }

  function inspectExpectedFile(relativePath, expectedHash) {
    const normalizedPath = normalizeTermDriftPath(relativePath);
    const result = readRegularProjectFile(targetDir, normalizedPath);
    if (result.kind === "missing") {
      addIssue("missing", normalizedPath);
      return null;
    }
    if (result.kind === "unsafe") {
      addIssue("unsafe-path", normalizedPath);
      return null;
    }
    if (expectedHash && sha256(result.bytes) !== expectedHash) {
      addIssue("hash-mismatch", normalizedPath);
    }
    return result.bytes;
  }

  const versionBytes = inspectExpectedFile(VERSION_PATH);
  if (versionBytes && !parseCompatibleVersion(versionBytes, compatibility)) {
    addIssue("invalid-version", VERSION_PATH);
  }

  for (const [relativePath, expectedHash] of Object.entries(compatibility.commonFiles)) {
    inspectExpectedFile(relativePath, expectedHash);
  }

  if (!isProjectLocalRelativePath(skillRoot)) {
    addIssue("unsafe-path", skillRoot || "<selected-skill-path>");
  } else {
    for (const [relativePath, expectedHash] of Object.entries(compatibility.skillFiles)) {
      inspectExpectedFile(`${skillRoot}/${normalizeTermDriftPath(relativePath)}`, expectedHash);
    }
    inspectSkillTree(targetDir, skillRoot, compatibility, addIssue);
  }

  if (issues.length > 0) {
    const hasOnlyMissingIssues = issues.every((issue) => issue.code === "missing");
    const hasPartialSelectedSkill =
      skillRootInspection.kind !== "missing" &&
      issues.some(
        (issue) => issue.code === "missing" && issue.path.startsWith(`${skillRoot}/`),
      );
    const repairability =
      hasOnlyMissingIssues && !hasPartialSelectedSkill ? "additive-compatible" : "blocked";
    return { state: "inconsistent", repairability, issues };
  }
  return { state: "ready", version: compatibility.version, skillPath: skillRoot };
}

/**
 * NodeがWindowsで解決するnpx shimだけ`.cmd`を付ける。
 * commandはshellへ渡さず、常にspawnの実行ファイル名として使う。
 *
 * @param {string} platform
 * @returns {'npx'|'npx.cmd'}
 */
export function getTermDriftNpxExecutable(platform = process.platform) {
  return platform === "win32" ? "npx.cmd" : "npx";
}

/**
 * @typedef {{
 *   command:string,
 *   args:string[],
 *   cwd:string,
 *   exitCode:number|null,
 *   stdout:string,
 *   stderr:string,
 *   error:string|null,
 * }} TermDriftRawAttempt
 * @typedef {{
 *   installed:true,
 *   agent:string,
 *   version:string,
 *   skill:string,
 *   ledger:string|null,
 *   created:string[],
 *   skipped:string[],
 *   notes:string[],
 * }} TermDriftInstallOutput
 * @typedef {'spawn-error'|'nonzero-exit'|'invalid-json'|'contract-mismatch'|'postcheck-failed'} TermDriftFailureKind
 * @typedef {{kind:TermDriftFailureKind, message:string}} TermDriftAttemptFailure
 * @typedef {
 *   | {ok:true, attempt:TermDriftRawAttempt, install:TermDriftInstallOutput, postHealth:TermDriftHealth}
 *   | {ok:false, attempt:TermDriftRawAttempt, failure:TermDriftAttemptFailure, postHealth:TermDriftHealth}
 * } TermDriftInstallAttemptResult
 */

function processText(value) {
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return Buffer.from(value).toString("utf8");
  }
  return "";
}

function validStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function validateRunnerAgentEntry(agentEntry) {
  return (
    agentEntry !== null &&
    typeof agentEntry === "object" &&
    typeof agentEntry.agentName === "string" &&
    agentEntry.agentName.length > 0 &&
    typeof agentEntry.termDriftArg === "string" &&
    /^--[a-z][a-z0-9-]*$/u.test(agentEntry.termDriftArg) &&
    isProjectLocalRelativePath(agentEntry.termDriftSkillDest)
  );
}

function validateInstallOutput(value, agentEntry, compatibility) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  if (
    value.installed !== true ||
    value.version !== compatibility.version ||
    value.agent !== agentEntry.agentName ||
    typeof value.skill !== "string" ||
    normalizeTermDriftPath(value.skill) !== normalizeTermDriftPath(agentEntry.termDriftSkillDest) ||
    (value.ledger !== null && typeof value.ledger !== "string") ||
    !validStringArray(value.created) ||
    !validStringArray(value.skipped) ||
    !validStringArray(value.notes)
  ) {
    return null;
  }

  return {
    installed: true,
    agent: value.agent,
    version: value.version,
    skill: normalizeTermDriftPath(value.skill),
    ledger: value.ledger,
    created: [...value.created],
    skipped: [...value.skipped],
    notes: [...value.notes],
  };
}

/**
 * term-drift所有のinstallerを、固定版・選択済みagent・target cwdだけで実行する。
 * intent-planner自身はterm-drift所有物をwrite/deleteせず、終了後のfilesystemを再検査する。
 *
 * @param {string} targetDir
 * @param {{
 *   agentEntry:{agentName:string, termDriftArg:string, termDriftSkillDest:string},
 *   spawnSyncImpl?:typeof spawnSync,
 *   compatibility?:TermDriftCompatibility,
 * }} options
 * @returns {TermDriftInstallAttemptResult}
 */
export function executeTermDriftInstall(
  targetDir,
  {
    agentEntry,
    spawnSyncImpl = spawnSync,
    compatibility = TERM_DRIFT_COMPATIBILITY,
  },
) {
  const command = getTermDriftNpxExecutable();
  const args = ["--yes", `term-drift@${compatibility.version}`, agentEntry?.termDriftArg].filter(
    (value) => typeof value === "string",
  );
  /** @type {TermDriftRawAttempt} */
  const attempt = {
    command,
    args,
    cwd: targetDir,
    exitCode: null,
    stdout: "",
    stderr: "",
    error: null,
  };

  if (!validateRunnerAgentEntry(agentEntry)) {
    return {
      ok: false,
      attempt,
      failure: {
        kind: "contract-mismatch",
        message: "selected agent entry does not provide a safe term-drift runner contract",
      },
      postHealth: inspectTermDrift(targetDir, agentEntry ?? {}, compatibility),
    };
  }

  let processResult;
  try {
    processResult = spawnSyncImpl(command, args, {
      cwd: targetDir,
      encoding: "utf8",
      shell: false,
    });
  } catch (error) {
    attempt.error = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      attempt,
      failure: { kind: "spawn-error", message: attempt.error },
      postHealth: inspectTermDrift(targetDir, agentEntry, compatibility),
    };
  }

  attempt.exitCode = Number.isInteger(processResult?.status) ? processResult.status : null;
  attempt.stdout = processText(processResult?.stdout);
  attempt.stderr = processText(processResult?.stderr);
  attempt.error = processResult?.error
    ? processResult.error instanceof Error
      ? processResult.error.message
      : String(processResult.error)
    : null;
  const postHealth = inspectTermDrift(targetDir, agentEntry, compatibility);

  if (attempt.error !== null) {
    return {
      ok: false,
      attempt,
      failure: { kind: "spawn-error", message: attempt.error },
      postHealth,
    };
  }
  if (attempt.exitCode !== 0) {
    return {
      ok: false,
      attempt,
      failure: {
        kind: "nonzero-exit",
        message: `term-drift installer exited with status ${attempt.exitCode ?? "unknown"}`,
      },
      postHealth,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(attempt.stdout);
  } catch {
    return {
      ok: false,
      attempt,
      failure: { kind: "invalid-json", message: "term-drift installer did not return valid JSON" },
      postHealth,
    };
  }

  const install = validateInstallOutput(parsed, agentEntry, compatibility);
  if (!install) {
    return {
      ok: false,
      attempt,
      failure: {
        kind: "contract-mismatch",
        message: "term-drift installer output does not match the selected version and agent contract",
      },
      postHealth,
    };
  }
  if (
    postHealth.state !== "ready" ||
    postHealth.version !== compatibility.version ||
    normalizeTermDriftPath(postHealth.skillPath) !==
      normalizeTermDriftPath(agentEntry.termDriftSkillDest)
  ) {
    return {
      ok: false,
      attempt,
      failure: {
        kind: "postcheck-failed",
        message: "term-drift installer completed but the compatible installation is not ready",
      },
      postHealth,
    };
  }

  return { ok: true, attempt, install, postHealth };
}

/**
 * @typedef {
 *   | {action:'skipped', health:TermDriftHealth}
 *   | {action:'planned', version:string, agent:string, mode:'fresh-install'|'additive-completion', health:TermDriftHealth}
 *   | {action:'already-ready', health:TermDriftHealth}
 *   | {action:'blocked-inconsistent', health:TermDriftHealth}
 *   | {action:'installed', health:TermDriftHealth, install:TermDriftInstallOutput}
 *   | {action:'failed', health:TermDriftHealth, failure:TermDriftAttemptFailure}
 * } TermDriftAction
 */

/**
 * filesystem healthを最初に確定し、必要な場合だけ同意確認とowner installer実行へ進む。
 * dry-run、ready、競合状態、未同意では外部processを起動しない。
 *
 * @param {string} targetDir
 * @param {{
 *   agentEntry:{agentName:string, termDriftArg:string, termDriftSkillDest:string},
 *   requested:boolean,
 *   dryRun:boolean,
 *   confirm?:(context:{version:string, agent:string, health:TermDriftHealth})=>boolean,
 *   spawnSyncImpl?:typeof spawnSync,
 *   compatibility?:TermDriftCompatibility,
 * }} options
 * @returns {TermDriftAction}
 */
export function runTermDriftIntegration(
  targetDir,
  {
    agentEntry,
    requested,
    dryRun,
    confirm = () => false,
    spawnSyncImpl = spawnSync,
    compatibility = TERM_DRIFT_COMPATIBILITY,
  },
) {
  const health = inspectTermDrift(targetDir, agentEntry, compatibility);

  if (health.state === "ready") {
    return { action: "already-ready", health };
  }
  if (health.state === "inconsistent" && health.repairability === "blocked") {
    return { action: "blocked-inconsistent", health };
  }

  const mode = health.state === "not-installed" ? "fresh-install" : "additive-completion";
  if (dryRun) {
    return requested
      ? {
          action: "planned",
          version: compatibility.version,
          agent: agentEntry.agentName,
          mode,
          health,
        }
      : { action: "skipped", health };
  }

  const approved =
    requested ||
    confirm({
      version: compatibility.version,
      agent: agentEntry.agentName,
      health,
    }) === true;
  if (!approved) {
    return { action: "skipped", health };
  }

  const result = executeTermDriftInstall(targetDir, {
    agentEntry,
    spawnSyncImpl,
    compatibility,
  });
  if (!result.ok) {
    return { action: "failed", health: result.postHealth, failure: result.failure };
  }
  return { action: "installed", health: result.postHealth, install: result.install };
}
