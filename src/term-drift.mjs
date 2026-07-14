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
  version: "0.2.5",
  commonFiles: Object.freeze({
    ".term-drift/rules/detect.md":
      "627d1bf950f9f87e655d5dd10215d408a2e605582e5e869f3b9b6cf67111ec49",
    ".term-drift/rules/workflow.md":
      "dd898983dc349d0c327e42f98f5d301bb3e08111acfdbe54624b720bdc54aba3",
  }),
  skillFiles: Object.freeze({
    "SKILL.md": "cdd550d32d66e4c5695413e8d11ab3c0fe5eab5a853f01017b3d03d186599cf8",
    "agents/openai.yaml":
      "e35e3820b0fc52bec4e8f033a6519ed05b9deebd24fe0b4f4fa0269f627e94d7",
  }),
});

/**
 * intent-planner が直前に互換確認した版だけを、owner updateへ渡せるbaselineとして保持する。
 * 未知の旧版やmanifest自己申告だけで整合するassetはここへ含めない。
 */
export const TERM_DRIFT_TRUSTED_UPDATE_BASELINES = Object.freeze([
  Object.freeze({
    version: "0.2.3",
    commonFiles: Object.freeze({
      ".term-drift/rules/detect.md":
        "3c21b9fa6a5e2498f13713648945d2e4a61e0e664a1af9f7e16204a7e922728b",
      ".term-drift/rules/workflow.md":
        "cf5d5475539b24fbfb4fe330b56505fdf2ce94df3c2eea0a08a2e88547ae7945",
    }),
    skillFiles: Object.freeze({
      "SKILL.md": "1cf49ed084ad5c182d67f22cab9fc9cffa0403fe87e15681347c3906744bde0f",
      "agents/openai.yaml":
        "e35e3820b0fc52bec4e8f033a6519ed05b9deebd24fe0b4f4fa0269f627e94d7",
    }),
  }),
]);

/**
 * 公開互換契約を、選択済みAgent Registry entry用のgolden manifestへ射影する。
 * agent一覧やowner asset本文は保持せず、呼出し側が選択したentryだけを入力にする。
 *
 * @param {{agentName:string, termDriftSkillDest:string}} agentEntry
 * @param {TermDriftCompatibility} compatibility
 * @returns {Readonly<{
 *   package:'term-drift',
 *   version:string,
 *   agent:string,
 *   assets:Readonly<Record<string, string>>,
 * }>}
 */
export function projectTermDriftManifest(
  agentEntry,
  compatibility = TERM_DRIFT_COMPATIBILITY,
) {
  if (typeof agentEntry?.agentName !== "string" || agentEntry.agentName.length === 0) {
    throw new TypeError("agent entry must contain a non-empty agentName");
  }

  const skillRoot = normalizeTermDriftPath(agentEntry?.termDriftSkillDest ?? "");
  if (!isProjectLocalRelativePath(skillRoot)) {
    throw new TypeError("agent entry must contain a project-local termDriftSkillDest");
  }

  const assets = { ...compatibility.commonFiles };
  for (const [relativePath, hash] of Object.entries(compatibility.skillFiles)) {
    const projectPath = `${skillRoot}/${normalizeTermDriftPath(relativePath)}`;
    if (Object.hasOwn(assets, projectPath)) {
      throw new TypeError(`compatibility asset path collision: ${projectPath}`);
    }
    assets[projectPath] = hash;
  }

  return Object.freeze({
    package: "term-drift",
    version: compatibility.version,
    agent: agentEntry.agentName,
    assets: Object.freeze(assets),
  });
}

const VERSION_PATH = ".term-drift/version.json";

/**
 * @typedef {'missing'|'invalid-version'|'agent-mismatch'|'asset-manifest-mismatch'|'hash-mismatch'|'unsafe-path'|'unexpected-skill-entry'|'self-consistent-untrusted-asset'|'unsupported-newer-version'} TermDriftIssueCode
 * @typedef {{code: TermDriftIssueCode, path: string}} TermDriftIssue
 * @typedef {{state:'not-installed'} | {state:'ready', version:string, skillPath:string} | {state:'inconsistent', repairability:'additive-compatible'|'update-attemptable'|'blocked', issues:TermDriftIssue[]}} TermDriftHealth
 */

/**
 * owner manifestの自己申告を、選択済みagentから射影したpinned契約へ照合する。
 * filesystemや実asset bytesは参照せず、違反をmanifest項目またはasset pathへ対応づける。
 *
 * @param {unknown} manifest
 * @param {{agentName:string, termDriftSkillDest:string}} agentEntry
 * @param {TermDriftCompatibility} compatibility
 * @returns {TermDriftIssue[]}
 */
export function validateTermDriftManifest(
  manifest,
  agentEntry,
  compatibility = TERM_DRIFT_COMPATIBILITY,
) {
  const isPlainObject = (value) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  };
  if (!isPlainObject(manifest)) {
    return [{ code: "invalid-version", path: VERSION_PATH }];
  }

  const expected = projectTermDriftManifest(agentEntry, compatibility);
  const expectedTopLevelKeys = ["agent", "assets", "package", "version"];
  const expectedTopLevelKeySet = new Set(expectedTopLevelKeys);
  /** @type {TermDriftIssue[]} */
  const topLevelIssues = [];
  for (const key of expectedTopLevelKeys) {
    if (!Object.hasOwn(manifest, key)) {
      topLevelIssues.push({ code: "invalid-version", path: `${VERSION_PATH}#/${key}` });
    }
  }
  for (const key of Object.keys(manifest)) {
    if (!expectedTopLevelKeySet.has(key)) {
      topLevelIssues.push({ code: "invalid-version", path: `${VERSION_PATH}#/${key}` });
    }
  }
  if (topLevelIssues.length > 0) return topLevelIssues;

  /** @type {TermDriftIssue[]} */
  const issues = [];
  if (manifest.package !== expected.package) {
    issues.push({ code: "invalid-version", path: `${VERSION_PATH}#/package` });
  }
  if (manifest.version !== expected.version) {
    issues.push({ code: "invalid-version", path: `${VERSION_PATH}#/version` });
  }
  if (manifest.agent !== expected.agent) {
    issues.push({ code: "agent-mismatch", path: `${VERSION_PATH}#/agent` });
  }
  if (!isPlainObject(manifest.assets)) {
    issues.push({ code: "asset-manifest-mismatch", path: `${VERSION_PATH}#/assets` });
    return issues;
  }

  const actualAssets = manifest.assets;
  const expectedAssetPaths = Object.keys(expected.assets);
  const expectedAssetSet = new Set(expectedAssetPaths);
  for (const assetPath of expectedAssetPaths) {
    const hash = actualAssets[assetPath];
    if (
      !Object.hasOwn(actualAssets, assetPath) ||
      typeof hash !== "string" ||
      !/^[0-9a-f]{64}$/u.test(hash) ||
      hash !== expected.assets[assetPath]
    ) {
      issues.push({ code: "asset-manifest-mismatch", path: assetPath });
    }
  }
  for (const assetPath of Object.keys(actualAssets)) {
    if (!expectedAssetSet.has(assetPath)) {
      issues.push({ code: "asset-manifest-mismatch", path: normalizeTermDriftPath(assetPath) });
    }
  }
  return issues;
}

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

function parseTermDriftManifest(bytes) {
  try {
    return { ok: true, value: JSON.parse(bytes.toString("utf8")) };
  } catch {
    return { ok: false, value: null };
  }
}

/**
 * SemVer 2.0.0のprecedenceだけを比較する。build metadataはprecedenceへ影響しない。
 * @returns {-1|0|1|null}
 */
function compareSemver(left, right) {
  const pattern =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;
  const leftMatch = typeof left === "string" ? pattern.exec(left) : null;
  const rightMatch = typeof right === "string" ? pattern.exec(right) : null;
  if (!leftMatch || !rightMatch) return null;

  for (let index = 1; index <= 3; index += 1) {
    const leftNumber = Number(leftMatch[index]);
    const rightNumber = Number(rightMatch[index]);
    if (leftNumber !== rightNumber) return leftNumber < rightNumber ? -1 : 1;
  }

  const leftPre = leftMatch[4]?.split(".") ?? [];
  const rightPre = rightMatch[4]?.split(".") ?? [];
  if (leftPre.length === 0 || rightPre.length === 0) {
    if (leftPre.length === rightPre.length) return 0;
    return leftPre.length === 0 ? 1 : -1;
  }
  const length = Math.max(leftPre.length, rightPre.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPre[index] === undefined) return -1;
    if (rightPre[index] === undefined) return 1;
    if (leftPre[index] === rightPre[index]) continue;
    const leftNumeric = /^\d+$/u.test(leftPre[index]);
    const rightNumeric = /^\d+$/u.test(rightPre[index]);
    if (leftNumeric && rightNumeric) {
      return Number(leftPre[index]) < Number(rightPre[index]) ? -1 : 1;
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPre[index] < rightPre[index] ? -1 : 1;
  }
  return 0;
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

function matchesTrustedUpdateBaseline(
  manifest,
  actualAssetHashes,
  agentEntry,
  trustedUpdateBaselines,
) {
  if (!Array.isArray(trustedUpdateBaselines)) return false;
  return trustedUpdateBaselines.some((baseline) => {
    if (manifest?.version !== baseline?.version) return false;
    if (validateTermDriftManifest(manifest, agentEntry, baseline).length > 0) return false;
    const expected = projectTermDriftManifest(agentEntry, baseline);
    return Object.entries(expected.assets).every(
      ([assetPath, expectedHash]) => actualAssetHashes.get(assetPath) === expectedHash,
    );
  });
}

/**
 * target project内の互換term-drift一式をread-onlyで照合する。
 * 存在するartifactが互換で欠落だけなら安全な追加候補とし、競合は自動修復対象外にする。
 *
 * @param {string} targetDir
 * @param {{termDriftSkillDest:string}} agentEntry
 * @param {TermDriftCompatibility} compatibility
 * @param {readonly TermDriftCompatibility[]} trustedUpdateBaselines
 * @returns {TermDriftHealth}
 */
export function inspectTermDrift(
  targetDir,
  agentEntry,
  compatibility = TERM_DRIFT_COMPATIBILITY,
  trustedUpdateBaselines = TERM_DRIFT_TRUSTED_UPDATE_BASELINES,
) {
  const skillRoot = normalizeTermDriftPath(agentEntry?.termDriftSkillDest ?? "");
  const markerInspection = lstatProjectPath(targetDir, ".term-drift");
  const skillRootInspection = lstatProjectPath(targetDir, skillRoot);
  const hasArtifact = markerInspection.kind !== "missing" || skillRootInspection.kind !== "missing";
  if (!hasArtifact && skillRootInspection.kind !== "unsafe") return { state: "not-installed" };

  /** @type {TermDriftIssue[]} */
  const issues = [];
  const issueKeys = new Set();
  const actualAssetHashes = new Map();
  let manifestValue = null;
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
    const actualHash = sha256(result.bytes);
    actualAssetHashes.set(normalizedPath, actualHash);
    if (expectedHash && actualHash !== expectedHash) {
      addIssue("hash-mismatch", normalizedPath);
    }
    return result.bytes;
  }

  const versionBytes = inspectExpectedFile(VERSION_PATH);
  if (versionBytes) {
    const manifest = parseTermDriftManifest(versionBytes);
    if (!manifest.ok) {
      addIssue("invalid-version", VERSION_PATH);
    } else if (
      typeof agentEntry?.agentName === "string" &&
      agentEntry.agentName.length > 0 &&
      isProjectLocalRelativePath(skillRoot)
    ) {
      manifestValue = manifest.value;
      for (const issue of validateTermDriftManifest(manifest.value, agentEntry, compatibility)) {
        addIssue(issue.code, issue.path);
      }
      if (
        manifest.value?.assets !== null &&
        typeof manifest.value?.assets === "object" &&
        !Array.isArray(manifest.value.assets)
      ) {
        for (const assetPath of Object.keys(manifest.value.assets)) {
          if (!isProjectLocalRelativePath(assetPath)) {
            addIssue("unsafe-path", assetPath);
          }
        }
      }
    }
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

  const trustedUpdateBaseline = matchesTrustedUpdateBaseline(
    manifestValue,
    actualAssetHashes,
    agentEntry,
    trustedUpdateBaselines,
  );

  if (manifestValue) {
    if (compareSemver(manifestValue.version, compatibility.version) === 1) {
      addIssue("unsupported-newer-version", `${VERSION_PATH}#/version`);
    }

    if (
      manifestValue.assets !== null &&
      typeof manifestValue.assets === "object" &&
      !Array.isArray(manifestValue.assets)
    ) {
      const expected = projectTermDriftManifest(agentEntry, compatibility);
      for (const [assetPath, pinnedHash] of Object.entries(expected.assets)) {
        const recordedHash = manifestValue.assets[assetPath];
        const actualHash = actualAssetHashes.get(assetPath);
        if (
          typeof recordedHash === "string" &&
          /^[0-9a-f]{64}$/u.test(recordedHash) &&
          recordedHash === actualHash &&
          recordedHash !== pinnedHash &&
          !trustedUpdateBaseline
        ) {
          addIssue("self-consistent-untrusted-asset", assetPath);
        }
      }
    }
  }

  if (issues.length > 0) {
    const hasOnlyMissingIssues = issues.every((issue) => issue.code === "missing");
    const hasPartialSelectedSkill =
      skillRootInspection.kind !== "missing" &&
      issues.some(
        (issue) => issue.code === "missing" && issue.path.startsWith(`${skillRoot}/`),
      );
    const hasTrustBlock = issues.some(
      (issue) =>
        issue.code === "self-consistent-untrusted-asset" ||
        issue.code === "unsupported-newer-version",
    );
    const isLegacyTwoFieldManifest =
      manifestValue !== null &&
      typeof manifestValue === "object" &&
      !Array.isArray(manifestValue) &&
      Object.keys(manifestValue).length === 2 &&
      Object.hasOwn(manifestValue, "package") &&
      Object.hasOwn(manifestValue, "version") &&
      manifestValue.package === "term-drift" &&
      manifestValue.version === "0.2.1";
    const hasManifestBytesMismatch =
      manifestValue?.assets !== null &&
      typeof manifestValue?.assets === "object" &&
      !Array.isArray(manifestValue.assets) &&
      Object.entries(manifestValue.assets).some(
        ([assetPath, recordedHash]) =>
          typeof recordedHash === "string" &&
          actualAssetHashes.has(assetPath) &&
          recordedHash !== actualAssetHashes.get(assetPath),
      );
    const repairability = hasTrustBlock
      ? "blocked"
      : trustedUpdateBaseline || isLegacyTwoFieldManifest || hasManifestBytesMismatch
        ? "update-attemptable"
        : hasOnlyMissingIssues && !hasPartialSelectedSkill
          ? "additive-compatible"
          : "blocked";
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
 * @typedef {{updated:true,fromVersion:string,version:string,agent:string,skill:string,assets:string[]}} TermDriftUpdateOutput
 * @typedef {'install'|'update'} TermDriftOperation
 * @typedef {'spawn-error'|'nonzero-exit'|'invalid-json'|'contract-mismatch'|'postcheck-failed'} TermDriftFailureKind
 * @typedef {{operation:TermDriftOperation, kind:TermDriftFailureKind, message:string}} TermDriftAttemptFailure
 * @typedef {
 *   | {kind:'retry', command:string, targetDir:string}
 *   | {kind:'manual-resolution', issues:TermDriftIssue[], afterResolutionCommand:string, targetDir:string}
 *   | {kind:'contract-anomaly-ready', message:string}
 * } TermDriftFailureGuidance
 * @typedef {{operation:TermDriftOperation, kind:TermDriftFailureKind, message:string, postHealth:TermDriftHealth, guidance:TermDriftFailureGuidance}} TermDriftFailure
 * @typedef {
 *   | {ok:true, attempt:TermDriftRawAttempt, install:TermDriftInstallOutput, postHealth:TermDriftHealth}
 *   | {ok:true, attempt:TermDriftRawAttempt, update:TermDriftUpdateOutput, postHealth:TermDriftHealth}
 *   | {ok:false, attempt:TermDriftRawAttempt, failure:TermDriftAttemptFailure, postHealth:TermDriftHealth}
 * } TermDriftInstallAttemptResult
 */

/**
 * post-install healthを唯一の判定材料として、owner境界を越えない失敗案内を作る。
 * commandはrunnerの固定argv相当だけを保持し、利用者指定のtargetDirは連結しない。
 *
 * @param {TermDriftAttemptFailure} attemptFailure
 * @param {TermDriftHealth} postHealth
 * @param {TermDriftRawAttempt} attempt
 * @returns {TermDriftFailure}
 */
export function createTermDriftFailure(attemptFailure, postHealth, attempt) {
  const retryCommand = [attempt.command, ...attempt.args].join(" ");
  /** @type {TermDriftFailureGuidance} */
  let guidance;

  if (
    postHealth?.state === "ready" &&
    typeof postHealth.version === "string" &&
    typeof postHealth.skillPath === "string"
  ) {
    guidance = {
      kind: "contract-anomaly-ready",
      message: `compatible term-drift files are ready, but the owner ${attemptFailure.operation} attempt contract failed; verify the owner ${attemptFailure.operation} contract before continuing`,
    };
  } else if (
    postHealth?.state === "inconsistent" &&
    (postHealth.repairability === "blocked" ||
      postHealth.repairability === "additive-compatible" ||
      postHealth.repairability === "update-attemptable") &&
    Array.isArray(postHealth.issues) &&
    postHealth.issues.every(
      (issue) =>
        issue !== null &&
        typeof issue === "object" &&
        typeof issue.code === "string" &&
        typeof issue.path === "string",
    )
  ) {
    guidance =
      postHealth.repairability === "blocked"
        ? {
            kind: "manual-resolution",
            issues: postHealth.issues.map((issue) => ({ ...issue })),
            afterResolutionCommand: retryCommand,
            targetDir: attempt.cwd,
          }
        : {
            kind: "retry",
            command: retryCommand,
            targetDir: attempt.cwd,
          };
  } else if (postHealth?.state === "not-installed") {
    guidance = {
      kind: "retry",
      command: retryCommand,
      targetDir: attempt.cwd,
    };
  } else {
    throw new TypeError("unsupported term-drift post-health");
  }

  return {
    operation: attemptFailure.operation,
    kind: attemptFailure.kind,
    message: attemptFailure.message,
    postHealth,
    guidance,
  };
}

function termDriftAttemptFailure(operation, kind, message) {
  return { operation, kind, message };
}

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

function validateUpdateOutput(value, agentEntry, compatibility) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const expectedAssets = Object.keys(projectTermDriftManifest(agentEntry, compatibility).assets).sort();
  if (
    value.updated !== true ||
    typeof value.fromVersion !== "string" ||
    value.fromVersion.length === 0 ||
    value.version !== compatibility.version ||
    value.agent !== agentEntry.agentName ||
    typeof value.skill !== "string" ||
    normalizeTermDriftPath(value.skill) !== normalizeTermDriftPath(agentEntry.termDriftSkillDest) ||
    !validStringArray(value.assets)
  ) {
    return null;
  }
  const assets = value.assets.map(normalizeTermDriftPath);
  if (
    new Set(assets).size !== assets.length ||
    [...assets].sort().join("\0") !== expectedAssets.join("\0")
  ) {
    return null;
  }
  return {
    updated: true,
    fromVersion: value.fromVersion,
    version: value.version,
    agent: value.agent,
    skill: normalizeTermDriftPath(value.skill),
    assets,
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
 *   trustedUpdateBaselines?:readonly TermDriftCompatibility[],
 * }} options
 * @returns {TermDriftInstallAttemptResult}
 */
function executeTermDriftOperation(
  targetDir,
  {
    operation,
    agentEntry,
    spawnSyncImpl = spawnSync,
    compatibility = TERM_DRIFT_COMPATIBILITY,
    trustedUpdateBaselines = TERM_DRIFT_TRUSTED_UPDATE_BASELINES,
  },
) {
  const command = getTermDriftNpxExecutable();
  const args = [
    "--yes",
    `term-drift@${compatibility.version}`,
    ...(operation === "update" ? ["update"] : []),
    agentEntry?.termDriftArg,
  ].filter((value) => typeof value === "string");
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
      failure: termDriftAttemptFailure(
        operation,
        "contract-mismatch",
        "selected agent entry does not provide a safe term-drift runner contract",
      ),
      postHealth: inspectTermDrift(
        targetDir,
        agentEntry ?? {},
        compatibility,
        trustedUpdateBaselines,
      ),
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
      failure: termDriftAttemptFailure(operation, "spawn-error", attempt.error),
      postHealth: inspectTermDrift(
        targetDir,
        agentEntry,
        compatibility,
        trustedUpdateBaselines,
      ),
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
  const postHealth = inspectTermDrift(
    targetDir,
    agentEntry,
    compatibility,
    trustedUpdateBaselines,
  );

  if (attempt.error !== null) {
    return {
      ok: false,
      attempt,
      failure: termDriftAttemptFailure(operation, "spawn-error", attempt.error),
      postHealth,
    };
  }
  if (attempt.exitCode !== 0) {
    return {
      ok: false,
      attempt,
      failure: termDriftAttemptFailure(
        operation,
        "nonzero-exit",
        `term-drift ${operation === "install" ? "installer" : "update"} exited with status ${attempt.exitCode ?? "unknown"}`,
      ),
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
      failure: termDriftAttemptFailure(
        operation,
        "invalid-json",
        `term-drift ${operation} did not return valid JSON`,
      ),
      postHealth,
    };
  }

  const output =
    operation === "update"
      ? validateUpdateOutput(parsed, agentEntry, compatibility)
      : validateInstallOutput(parsed, agentEntry, compatibility);
  if (!output) {
    return {
      ok: false,
      attempt,
      failure: termDriftAttemptFailure(
        operation,
        "contract-mismatch",
        `term-drift ${operation} output does not match the selected version and agent contract`,
      ),
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
      failure: termDriftAttemptFailure(
        operation,
        "postcheck-failed",
        `term-drift ${operation} completed but the compatible installation is not ready`,
      ),
      postHealth,
    };
  }

  return operation === "update"
    ? { ok: true, attempt, update: output, postHealth }
    : { ok: true, attempt, install: output, postHealth };
}

export function executeTermDriftInstall(targetDir, options) {
  return executeTermDriftOperation(targetDir, { ...options, operation: "install" });
}

export function executeTermDriftUpdate(targetDir, options) {
  return executeTermDriftOperation(targetDir, { ...options, operation: "update" });
}

/**
 * @typedef {
 *   | {action:'skipped', health:TermDriftHealth}
 *   | {action:'planned', operation:TermDriftOperation, version:string, agent:string, mode:'fresh-install'|'additive-completion', health:TermDriftHealth}
 *   | {action:'already-ready', health:TermDriftHealth}
 *   | {action:'blocked-inconsistent', health:TermDriftHealth}
 *   | {action:'installed', health:TermDriftHealth, install:TermDriftInstallOutput}
 *   | {action:'updated', health:TermDriftHealth, update:TermDriftUpdateOutput}
 *   | {action:'failed', operation:TermDriftOperation, health:TermDriftHealth, failure:TermDriftFailure}
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
 *   confirm?:(context:{operation:TermDriftOperation, version:string, agent:string, health:TermDriftHealth})=>boolean,
 *   spawnSyncImpl?:typeof spawnSync,
 *   compatibility?:TermDriftCompatibility,
 *   trustedUpdateBaselines?:readonly TermDriftCompatibility[],
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
    trustedUpdateBaselines = TERM_DRIFT_TRUSTED_UPDATE_BASELINES,
  },
) {
  const health = inspectTermDrift(
    targetDir,
    agentEntry,
    compatibility,
    trustedUpdateBaselines,
  );

  if (health.state === "ready") {
    return { action: "already-ready", health };
  }
  if (health.state === "inconsistent" && health.repairability === "blocked") {
    return { action: "blocked-inconsistent", health };
  }

  const operation =
    health.state === "inconsistent" && health.repairability === "update-attemptable"
      ? "update"
      : "install";
  const mode = health.state === "not-installed" ? "fresh-install" : "additive-completion";
  if (dryRun) {
    return requested === true
      ? {
          action: "planned",
          version: compatibility.version,
          agent: agentEntry.agentName,
          mode,
          operation,
          health,
        }
      : { action: "skipped", health };
  }

  const approved =
    requested === true ||
    confirm({
      operation,
      version: compatibility.version,
      agent: agentEntry.agentName,
      health,
    }) === true;
  if (!approved) {
    return { action: "skipped", health };
  }

  const result = (operation === "update" ? executeTermDriftUpdate : executeTermDriftInstall)(
    targetDir,
    {
      agentEntry,
      spawnSyncImpl,
      compatibility,
      trustedUpdateBaselines,
    },
  );
  if (!result.ok) {
    return {
      action: "failed",
      operation,
      health: result.postHealth,
      failure: createTermDriftFailure(result.failure, result.postHealth, result.attempt),
    };
  }
  return operation === "update"
    ? { action: "updated", health: result.postHealth, update: result.update }
    : { action: "installed", health: result.postHealth, install: result.install };
}
