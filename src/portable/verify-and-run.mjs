import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { constants as fsConstants, realpathSync } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MANIFEST_NAME = "portable-manifest.json";
const ENTRYPOINT = "app/bin/cli.mjs";
const PACKAGE_JSON = "app/package.json";
const BUNDLED_NODE = "runtime/node.exe";
const VERIFIER_MODULE = "app/src/portable/verify-and-run.mjs";
const MAXIMUM_MANIFEST_BYTES = 16 * 1024 * 1024;
const MAXIMUM_PACKAGE_BYTES = 1024 * 1024;
const READ_BUFFER_BYTES = 64 * 1024;
const TOP_LEVEL_KEYS = Object.freeze([
  "arch",
  "entrypoint",
  "files",
  "intentPlannerVersion",
  "nodeVersion",
  "platform",
  "schemaVersion",
]);
const FILE_KEYS = Object.freeze(["path", "sha256", "size"]);
const CORE_OPTION_KEYS = Object.freeze([
  "arch",
  "execPath",
  "modulePath",
  "nodeVersion",
  "payloadRoot",
  "platform",
]);
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/;
const WINDOWS_UNSAFE_CHARACTER = /[\u0000-\u001f\u007f<>:"|?*]/;
const WINDOWS_RESERVED_SEGMENT = /^(?:con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])(?:\.|$)/i;
const EXACT_VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const VERIFIED_RUNTIME_HANDLES = new WeakSet();
const HANDLE_EVIDENCE = new WeakMap();

export class PortableRuntimeVerificationError extends Error {
  constructor({ stage, resource, expected, actual }, options) {
    super(
      `portable-runtime: stage=${safeLabel(stage)} resource=${safeLabel(resource)} `
      + `expected=${safeLabel(expected)} actual=${safeLabel(actual)}`,
      options,
    );
    this.name = "PortableRuntimeVerificationError";
    this.stage = stage;
    this.resource = resource;
    this.expected = expected;
    this.actual = actual;
    this.exitCode = 2;
  }
}

function safeLabel(value) {
  const sanitized = String(value).replace(/[\u0000-\u001f\u007f]/g, "?");
  return sanitized.length <= 160 ? sanitized : `${sanitized.slice(0, 157)}...`;
}

function runtimeError(stage, resource, expected, actual, options) {
  return new PortableRuntimeVerificationError({ stage, resource, expected, actual }, options);
}

export function formatPortableRuntimeError(error) {
  if (error instanceof PortableRuntimeVerificationError) return error.message;
  return "portable-runtime: stage=internal resource=verification expected=success actual=failed";
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, keys) {
  return isPlainObject(value)
    && Object.keys(value).sort().join("\0") === keys.join("\0");
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toAbsolute(root, relative) {
  return path.join(root, ...relative.split("/"));
}

function isExactVersion(value) {
  return typeof value === "string" && EXACT_VERSION.test(value);
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameFileState(left, right) {
  return sameIdentity(left, right)
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function metadataFingerprint(metadata) {
  return Object.freeze({
    dev: metadata.dev,
    ino: metadata.ino,
    size: metadata.size,
    mtimeNs: metadata.mtimeNs,
    ctimeNs: metadata.ctimeNs,
  });
}

function validateRelativePath(value, resource) {
  if (typeof value !== "string" || value.length === 0) {
    throw runtimeError("schema", resource, "non-empty-canonical-relative-path", "invalid");
  }
  if (value.includes("\\") || WINDOWS_UNSAFE_CHARACTER.test(value) || path.posix.isAbsolute(value)) {
    throw runtimeError("schema", resource, "safe-canonical-relative-path", "unsafe");
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")
      || segments.some((segment) => /[. ]$/.test(segment) || WINDOWS_RESERVED_SEGMENT.test(segment))
      || path.posix.normalize(value) !== value) {
    throw runtimeError("schema", resource, "canonical-relative-path", "noncanonical");
  }
  if (value.toLowerCase() === MANIFEST_NAME) {
    throw runtimeError("schema", resource, "manifest-not-self-listed", "self-listed");
  }
}

function validatePortableManifest(value) {
  if (!hasExactKeys(value, TOP_LEVEL_KEYS)) {
    throw runtimeError("schema", "manifest", "exact-top-level-keys", "invalid-keys");
  }
  if (value.schemaVersion !== 1) {
    throw runtimeError("schema", "schemaVersion", "1", value.schemaVersion);
  }
  if (!isExactVersion(value.intentPlannerVersion)) {
    throw runtimeError("schema", "intentPlannerVersion", "complete-exact-version", "invalid");
  }
  if (!isExactVersion(value.nodeVersion)) {
    throw runtimeError("schema", "nodeVersion", "complete-exact-version", "invalid");
  }
  if (value.platform !== "win32") {
    throw runtimeError("schema", "platform", "win32", value.platform);
  }
  if (value.arch !== "x64") {
    throw runtimeError("schema", "arch", "x64", value.arch);
  }
  if (value.entrypoint !== ENTRYPOINT) {
    throw runtimeError("schema", "entrypoint", ENTRYPOINT, value.entrypoint);
  }
  if (!Array.isArray(value.files)) {
    throw runtimeError("schema", "files", "array", "invalid");
  }

  const files = [];
  const exactPaths = new Set();
  const windowsPaths = new Set();
  for (let index = 0; index < value.files.length; index += 1) {
    const entry = value.files[index];
    const resource = `files[${index}]`;
    if (!hasExactKeys(entry, FILE_KEYS)) {
      throw runtimeError("schema", resource, "exact-file-keys", "invalid-keys");
    }
    validateRelativePath(entry.path, `${resource}.path`);
    if (!Number.isSafeInteger(entry.size) || entry.size < 0) {
      throw runtimeError("schema", `${resource}.size`, "non-negative-safe-integer", "invalid");
    }
    if (typeof entry.sha256 !== "string" || !LOWERCASE_SHA256.test(entry.sha256)) {
      throw runtimeError("schema", `${resource}.sha256`, "64-lowercase-hex", "invalid");
    }
    if (exactPaths.has(entry.path)) {
      throw runtimeError("schema", entry.path, "unique-path", "duplicate");
    }
    const folded = entry.path.toLowerCase();
    if (windowsPaths.has(folded)) {
      throw runtimeError("schema", entry.path, "windows-case-unique-path", "windows-case-collision");
    }
    exactPaths.add(entry.path);
    windowsPaths.add(folded);
    files.push(Object.freeze({ path: entry.path, size: entry.size, sha256: entry.sha256 }));
  }
  for (let index = 1; index < files.length; index += 1) {
    if (files[index - 1].path >= files[index].path) {
      throw runtimeError("schema", "files", "strict-path-order", "unsorted");
    }
  }
  if (!exactPaths.has(ENTRYPOINT)) {
    throw runtimeError("schema", "entrypoint", "listed-regular-file", "missing");
  }

  return Object.freeze({
    schemaVersion: 1,
    intentPlannerVersion: value.intentPlannerVersion,
    nodeVersion: value.nodeVersion,
    platform: "win32",
    arch: "x64",
    entrypoint: ENTRYPOINT,
    files: Object.freeze(files),
  });
}

function serializePortableManifest(manifest) {
  return Buffer.from(`${JSON.stringify(validatePortableManifest(manifest), null, 2)}\n`, "utf8");
}

async function lstatOrError(filename, stage, resource, expected) {
  try {
    return await fs.lstat(filename, { bigint: true });
  } catch (error) {
    throw runtimeError(stage, resource, expected, "unavailable", { cause: error });
  }
}

async function realpathOrError(filename, stage, resource, expected) {
  try {
    return await fs.realpath(filename);
  } catch (error) {
    throw runtimeError(stage, resource, expected, "unavailable", { cause: error });
  }
}

async function resolvePayloadRoot(payloadRoot) {
  if (typeof payloadRoot !== "string" || !path.isAbsolute(payloadRoot)) {
    throw runtimeError("location", "payloadRoot", "absolute-canonical-directory", "invalid");
  }
  const resolved = path.resolve(payloadRoot);
  if (payloadRoot !== resolved) {
    throw runtimeError("location", "payloadRoot", "absolute-canonical-directory", "noncanonical");
  }
  const metadata = await lstatOrError(resolved, "location", "payloadRoot", "canonical-directory");
  if (metadata.isSymbolicLink()) {
    throw runtimeError("location", "payloadRoot", "canonical-directory", "link");
  }
  if (!metadata.isDirectory()) {
    throw runtimeError("location", "payloadRoot", "canonical-directory", "not-directory");
  }
  const realPath = await realpathOrError(resolved, "location", "payloadRoot", "canonical-directory");
  if (realPath !== resolved || realPath === path.parse(realPath).root) {
    throw runtimeError("location", "payloadRoot", "canonical-directory", "noncanonical-or-broad");
  }
  return Object.freeze({ realPath, metadata });
}

function validateCoreOptions(options) {
  if (!hasExactKeys(options, CORE_OPTION_KEYS)) {
    throw runtimeError("input", "options", "exact-core-keys", "invalid-keys");
  }
  for (const key of CORE_OPTION_KEYS) {
    if (typeof options[key] !== "string" || options[key].length === 0) {
      throw runtimeError("input", key, "non-empty-string", "invalid");
    }
  }
  if (!path.isAbsolute(options.modulePath)) {
    throw runtimeError("location", "module", "absolute-path", "invalid");
  }
  if (options.modulePath !== path.resolve(options.modulePath)) {
    throw runtimeError("location", "module", "canonical-absolute-path", "noncanonical");
  }
  if (!path.isAbsolute(options.execPath)) {
    throw runtimeError("location", "process.execPath", "absolute-path", "invalid");
  }
  if (options.execPath !== path.resolve(options.execPath)) {
    throw runtimeError("location", "process.execPath", "canonical-absolute-path", "noncanonical");
  }
  return Object.freeze({ ...options });
}

function validateModuleLocation(root, modulePath) {
  const resolved = path.resolve(modulePath);
  if (!isInside(root, resolved)) {
    throw runtimeError("location", "module", "inside-payload-root", "outside");
  }
  if (resolved !== toAbsolute(root, VERIFIER_MODULE)) {
    throw runtimeError("location", "module", VERIFIER_MODULE, "wrong-location");
  }
}

function validateEnvironment(options, root, manifest) {
  if (options.platform !== "win32") {
    throw runtimeError("environment", "platform", "win32", options.platform);
  }
  if (options.arch !== "x64") {
    throw runtimeError("environment", "arch", "x64", options.arch);
  }
  if (options.nodeVersion !== manifest.nodeVersion) {
    throw runtimeError("environment", "nodeVersion", manifest.nodeVersion, options.nodeVersion);
  }
  const expectedNode = toAbsolute(root, BUNDLED_NODE);
  if (path.resolve(options.execPath) !== expectedNode) {
    throw runtimeError(
      "environment",
      "process.execPath",
      BUNDLED_NODE,
      "host-or-other-runtime",
    );
  }
}

async function readStableRegularFile(filename, relative, {
  maximumBytes,
  expectedSize,
  captureBytes = false,
} = {}) {
  const before = await lstatOrError(filename, "read", relative, "readable-stable-regular-file");
  if (before.isSymbolicLink()) {
    throw runtimeError("read", relative, "regular-file", "link");
  }
  if (!before.isFile()) {
    throw runtimeError("read", relative, "regular-file", "special-file");
  }
  if (before.size > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw runtimeError("read", relative, "safe-file-size", "too-large");
  }
  if (maximumBytes !== undefined && before.size > BigInt(maximumBytes)) {
    throw runtimeError("read", relative, `at-most-${maximumBytes}-bytes`, "too-large");
  }
  if (expectedSize !== undefined && before.size !== BigInt(expectedSize)) {
    throw runtimeError("file-integrity", relative, expectedSize, before.size);
  }

  let handle;
  try {
    const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
    handle = await fs.open(filename, fsConstants.O_RDONLY | noFollow);
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || !sameFileState(before, opened)) {
      throw runtimeError("read", relative, "stable-regular-file", "identity-changed");
    }

    const hash = createHash("sha256");
    const captured = captureBytes ? [] : undefined;
    let position = 0;
    while (position < Number(opened.size)) {
      const buffer = Buffer.allocUnsafe(Math.min(READ_BUFFER_BYTES, Number(opened.size) - position));
      const { bytesRead } = await handle.read(buffer, 0, buffer.byteLength, position);
      if (bytesRead === 0) {
        throw runtimeError("read", relative, "complete-file", "short-read");
      }
      const chunk = buffer.subarray(0, bytesRead);
      hash.update(chunk);
      if (captured) captured.push(Buffer.from(chunk));
      position += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    if (!sameFileState(opened, after) || BigInt(position) !== after.size) {
      throw runtimeError("read", relative, "stable-regular-file", "content-changed");
    }
    const pathAfter = await lstatOrError(filename, "read", relative, "stable-regular-file");
    if (!sameFileState(after, pathAfter)) {
      throw runtimeError("read", relative, "stable-regular-file", "path-changed");
    }
    return Object.freeze({
      bytes: captured ? Buffer.concat(captured) : undefined,
      sha256: hash.digest("hex"),
      metadata: metadataFingerprint(after),
    });
  } catch (error) {
    if (error instanceof PortableRuntimeVerificationError) throw error;
    throw runtimeError("read", relative, "readable-stable-regular-file", "unavailable", {
      cause: error,
    });
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

async function readCanonicalManifest(root) {
  const filename = path.join(root, MANIFEST_NAME);
  const initial = await lstatOrError(filename, "read", MANIFEST_NAME, "regular-file");
  if (initial.isSymbolicLink()) {
    throw runtimeError("read", MANIFEST_NAME, "regular-file", "link");
  }
  if (!initial.isFile()) {
    throw runtimeError("read", MANIFEST_NAME, "regular-file", "special-file");
  }
  const canonical = await realpathOrError(filename, "read", MANIFEST_NAME, "canonical-file");
  if (canonical !== filename || !isInside(root, canonical)) {
    throw runtimeError("read", MANIFEST_NAME, "inside-canonical-root", "outside");
  }
  const capture = await readStableRegularFile(filename, MANIFEST_NAME, {
    maximumBytes: MAXIMUM_MANIFEST_BYTES,
    captureBytes: true,
  });
  let value;
  try {
    value = JSON.parse(capture.bytes.toString("utf8"));
  } catch (error) {
    throw runtimeError("schema", MANIFEST_NAME, "valid-json", "invalid", { cause: error });
  }
  const manifest = validatePortableManifest(value);
  if (!capture.bytes.equals(serializePortableManifest(manifest))) {
    throw runtimeError("schema", MANIFEST_NAME, "canonical-json-bytes", "noncanonical");
  }
  return Object.freeze({ manifest, capture });
}

function expectedDirectories(files) {
  const expected = new Set();
  for (const file of files) {
    const segments = file.path.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      expected.add(segments.slice(0, index).join("/"));
    }
  }
  return expected;
}

function registerWindowsPath(paths, relative) {
  const folded = relative.toLowerCase();
  if (paths.has(folded)) {
    throw runtimeError("scan", relative, "windows-case-unique-path", "windows-case-collision");
  }
  paths.add(folded);
}

async function scanPayload(rootContext, manifest, manifestCapture) {
  const root = rootContext.realPath;
  const expectedFiles = new Map(manifest.files.map((file) => [file.path, file]));
  const impliedDirectories = expectedDirectories(manifest.files);
  const seenFiles = new Map();
  const seenDirectories = new Map();
  const windowsPaths = new Set();
  let observedManifest = false;

  async function visit(directory, relativeDirectory) {
    const before = await lstatOrError(
      directory,
      "scan",
      relativeDirectory || ".",
      "readable-stable-directory",
    );
    if (before.isSymbolicLink()) {
      throw runtimeError("scan", relativeDirectory || ".", "directory", "link");
    }
    if (!before.isDirectory()) {
      throw runtimeError("scan", relativeDirectory || ".", "directory", "not-directory");
    }
    const canonical = await realpathOrError(
      directory,
      "scan",
      relativeDirectory || ".",
      "canonical-directory",
    );
    if (canonical !== directory || !isInside(root, canonical)) {
      throw runtimeError("scan", relativeDirectory || ".", "inside-canonical-root", "outside");
    }
    let names;
    try {
      names = (await fs.readdir(directory)).sort();
    } catch (error) {
      throw runtimeError("scan", relativeDirectory || ".", "readable-directory", "unavailable", {
        cause: error,
      });
    }

    for (const name of names) {
      const relative = relativeDirectory ? `${relativeDirectory}/${name}` : name;
      const absolute = path.join(directory, name);
      if (relativeDirectory === "" && name.toLowerCase() === MANIFEST_NAME) {
        if (name !== MANIFEST_NAME) {
          throw runtimeError("scan", relative, "exact-manifest-name", "windows-case-collision");
        }
        const metadata = await lstatOrError(absolute, "read", MANIFEST_NAME, "regular-file");
        if (metadata.isSymbolicLink()) {
          throw runtimeError("read", MANIFEST_NAME, "regular-file", "link");
        }
        if (!metadata.isFile() || !sameFileState(metadata, manifestCapture.metadata)) {
          throw runtimeError("read", MANIFEST_NAME, "stable-regular-file", "identity-changed");
        }
        observedManifest = true;
        continue;
      }

      validateRelativePath(relative, relative);
      registerWindowsPath(windowsPaths, relative);
      const metadata = await lstatOrError(
        absolute,
        "scan",
        relative,
        "regular-file-or-directory",
      );
      if (metadata.isSymbolicLink()) {
        throw runtimeError("scan", relative, "regular-file-or-directory", "link");
      }
      if (metadata.isDirectory()) {
        if (!impliedDirectories.has(relative)) {
          throw runtimeError("file-set", relative, "implied-directory", "extra");
        }
        seenDirectories.set(relative, metadataFingerprint(metadata));
        await visit(absolute, relative);
      } else if (metadata.isFile()) {
        const expected = expectedFiles.get(relative);
        if (!expected) {
          throw runtimeError("file-set", relative, "not-present", "extra");
        }
        const canonicalFile = await realpathOrError(absolute, "scan", relative, "canonical-file");
        if (canonicalFile !== absolute || !isInside(root, canonicalFile)) {
          throw runtimeError("scan", relative, "inside-canonical-root", "outside");
        }
        const captureBytes = relative === PACKAGE_JSON;
        const actual = await readStableRegularFile(absolute, relative, {
          expectedSize: expected.size,
          maximumBytes: captureBytes ? MAXIMUM_PACKAGE_BYTES : undefined,
          captureBytes,
        });
        if (actual.sha256 !== expected.sha256) {
          throw runtimeError("file-integrity", relative, expected.sha256, actual.sha256);
        }
        seenFiles.set(relative, actual);
      } else {
        throw runtimeError("scan", relative, "regular-file-or-directory", "special-file");
      }
    }

    const after = await lstatOrError(
      directory,
      "scan",
      relativeDirectory || ".",
      "stable-directory",
    );
    let afterNames;
    try {
      afterNames = (await fs.readdir(directory)).sort();
    } catch (error) {
      throw runtimeError("scan", relativeDirectory || ".", "stable-directory", "unavailable", {
        cause: error,
      });
    }
    if (!after.isDirectory() || !sameFileState(before, after)
        || names.join("\0") !== afterNames.join("\0")) {
      throw runtimeError("scan", relativeDirectory || ".", "stable-directory", "changed");
    }
  }

  await visit(root, "");
  if (!observedManifest) {
    throw runtimeError("read", MANIFEST_NAME, "present-regular-file", "missing");
  }
  for (const entry of manifest.files) {
    if (!seenFiles.has(entry.path)) {
      throw runtimeError("file-set", entry.path, "present", "missing");
    }
  }
  for (const directory of impliedDirectories) {
    if (!seenDirectories.has(directory)) {
      throw runtimeError("file-set", directory, "present-directory", "missing");
    }
  }
  const manifestAgain = await readStableRegularFile(
    path.join(root, MANIFEST_NAME),
    MANIFEST_NAME,
    { maximumBytes: MAXIMUM_MANIFEST_BYTES, captureBytes: true },
  );
  if (!sameFileState(manifestCapture.metadata, manifestAgain.metadata)
      || !manifestCapture.bytes.equals(manifestAgain.bytes)) {
    throw runtimeError("read", MANIFEST_NAME, "stable-manifest", "changed");
  }
  return Object.freeze({
    files: seenFiles,
    directories: seenDirectories,
  });
}

function compareScans(first, second, manifest) {
  for (const entry of manifest.files) {
    const left = first.files.get(entry.path);
    const right = second.files.get(entry.path);
    if (!left || !right || !sameFileState(left.metadata, right.metadata)
        || left.sha256 !== right.sha256) {
      throw runtimeError("verification", entry.path, "stable-verified-file", "changed");
    }
  }
  for (const [directory, left] of first.directories) {
    const right = second.directories.get(directory);
    if (!right || !sameFileState(left, right)) {
      throw runtimeError("verification", directory, "stable-directory", "changed");
    }
  }
}

function parsePackageVersion(capture, expectedVersion) {
  if (!capture?.bytes) {
    throw runtimeError("metadata", PACKAGE_JSON, "listed-readable-package", "missing");
  }
  let packageJson;
  try {
    packageJson = JSON.parse(capture.bytes.toString("utf8"));
  } catch (error) {
    throw runtimeError("metadata", PACKAGE_JSON, "valid-json", "invalid", { cause: error });
  }
  const suppliedVersion = isPlainObject(packageJson) && typeof packageJson.version === "string"
    ? packageJson.version
    : undefined;
  const actual = isExactVersion(suppliedVersion) ? suppliedVersion : "invalid";
  if (actual !== expectedVersion) {
    throw runtimeError("metadata", PACKAGE_JSON, expectedVersion, actual);
  }
}

async function assertRootStable(rootContext) {
  const current = await lstatOrError(
    rootContext.realPath,
    "verification",
    "payloadRoot",
    "stable-canonical-directory",
  );
  const canonical = await realpathOrError(
    rootContext.realPath,
    "verification",
    "payloadRoot",
    "stable-canonical-directory",
  );
  if (!current.isDirectory() || current.isSymbolicLink()
      || !sameFileState(rootContext.metadata, current)
      || canonical !== rootContext.realPath) {
    throw runtimeError("verification", "payloadRoot", "stable-canonical-directory", "changed");
  }
}

function issueVerifiedHandle(options, root, manifest) {
  const handle = Object.freeze({
    payloadRoot: root,
    nodePath: toAbsolute(root, BUNDLED_NODE),
    entrypointPath: toAbsolute(root, ENTRYPOINT),
    manifest,
  });
  const evidence = Object.freeze({ options });
  VERIFIED_RUNTIME_HANDLES.add(handle);
  HANDLE_EVIDENCE.set(handle, evidence);
  return handle;
}

export function assertVerifiedPortableRuntimeHandle(value) {
  if (!VERIFIED_RUNTIME_HANDLES.has(value)) {
    throw runtimeError("handle", "value", "verified-portable-runtime-handle", "invalid");
  }
  return value;
}

export async function reverifyVerifiedPortableRuntimeHandle(value) {
  assertVerifiedPortableRuntimeHandle(value);
  const evidence = HANDLE_EVIDENCE.get(value);
  VERIFIED_RUNTIME_HANDLES.delete(value);
  HANDLE_EVIDENCE.delete(value);
  return verifyPortablePayloadCore(evidence.options);
}

/**
 * Recheck the payload immediately before the next task delegates to the CLI.
 * Consumption is one-shot: both the original and the refreshed handle are expired.
 */
export async function consumeVerifiedPortableRuntimeHandle(value) {
  assertVerifiedPortableRuntimeHandle(value);
  const evidence = HANDLE_EVIDENCE.get(value);
  VERIFIED_RUNTIME_HANDLES.delete(value);
  HANDLE_EVIDENCE.delete(value);
  const refreshed = await verifyPortablePayloadCore(evidence.options);
  VERIFIED_RUNTIME_HANDLES.delete(refreshed);
  HANDLE_EVIDENCE.delete(refreshed);
  return Object.freeze({
    payloadRoot: refreshed.payloadRoot,
    nodePath: refreshed.nodePath,
    entrypointPath: refreshed.entrypointPath,
    manifest: refreshed.manifest,
  });
}

export async function verifyPortablePayloadCore(options) {
  const validated = validateCoreOptions(options);
  const root = await resolvePayloadRoot(validated.payloadRoot);
  validateModuleLocation(root.realPath, validated.modulePath);
  const { manifest, capture: manifestCapture } = await readCanonicalManifest(root.realPath);
  validateEnvironment(validated, root.realPath, manifest);

  const listed = new Set(manifest.files.map((entry) => entry.path));
  for (const required of [VERIFIER_MODULE, BUNDLED_NODE, PACKAGE_JSON, ENTRYPOINT]) {
    if (!listed.has(required)) {
      throw runtimeError("metadata", required, "listed-verified-file", "missing");
    }
  }

  const first = await scanPayload(root, manifest, manifestCapture);
  const second = await scanPayload(root, manifest, manifestCapture);
  compareScans(first, second, manifest);
  parsePackageVersion(second.files.get(PACKAGE_JSON), manifest.intentPlannerVersion);

  const moduleCanonical = await realpathOrError(
    validated.modulePath,
    "location",
    "module",
    VERIFIER_MODULE,
  );
  if (moduleCanonical !== toAbsolute(root.realPath, VERIFIER_MODULE)) {
    throw runtimeError("location", "module", VERIFIER_MODULE, "wrong-canonical-file");
  }
  const nodeCanonical = await realpathOrError(
    validated.execPath,
    "environment",
    "process.execPath",
    BUNDLED_NODE,
  );
  if (nodeCanonical !== toAbsolute(root.realPath, BUNDLED_NODE)) {
    throw runtimeError("environment", "process.execPath", BUNDLED_NODE, "wrong-canonical-file");
  }
  await assertRootStable(root);

  return issueVerifiedHandle(validated, root.realPath, manifest);
}

export function verifyPortablePayload() {
  const modulePath = fileURLToPath(import.meta.url);
  const payloadRoot = path.resolve(path.dirname(modulePath), "../../..");
  return verifyPortablePayloadCore({
    payloadRoot,
    modulePath,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    execPath: process.execPath,
  });
}

function validateCliArguments(args) {
  if (!Array.isArray(args) || args.some((value) => typeof value !== "string")) {
    throw runtimeError("input", "args", "array-of-strings", "invalid");
  }
  return Object.freeze([...args]);
}

function delegationFailure(error) {
  const actual = typeof error?.code === "string" && error.code.length > 0
    ? error.code
    : "unavailable";
  return runtimeError(
    "delegate",
    ENTRYPOINT,
    "started-with-bundled-runtime",
    actual,
    { cause: error },
  );
}

function awaitCliTermination(child) {
  if (!child || typeof child.once !== "function") {
    throw delegationFailure(new TypeError("invalid child process handle"));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      reject(delegationFailure(error));
    });
    child.once("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      if (Number.isInteger(exitCode) && exitCode >= 0 && signal === null) {
        resolve(Object.freeze({ exitCode, signal: null }));
        return;
      }
      if (exitCode === null && typeof signal === "string" && signal.length > 0) {
        resolve(Object.freeze({ exitCode: null, signal }));
        return;
      }
      reject(runtimeError(
        "delegate",
        ENTRYPOINT,
        "exit-code-or-signal",
        "invalid-child-result",
      ));
    });
  });
}

export async function delegateToExistingCliCore(handle, args, spawnProcess) {
  assertVerifiedPortableRuntimeHandle(handle);
  const forwardedArgs = validateCliArguments(args);
  if (typeof spawnProcess !== "function") {
    throw runtimeError("input", "spawnProcess", "function", "invalid");
  }

  const runtime = await consumeVerifiedPortableRuntimeHandle(handle);
  let child;
  try {
    child = spawnProcess(
      runtime.nodePath,
      [runtime.entrypointPath, ...forwardedArgs],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
      },
    );
  } catch (error) {
    throw delegationFailure(error);
  }
  return awaitCliTermination(child);
}

export function delegateToExistingCli(handle, args) {
  return delegateToExistingCliCore(handle, args, spawn);
}

export async function runPortableCli() {
  const handle = await verifyPortablePayload();
  return delegateToExistingCli(handle, process.argv.slice(2));
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

async function runDirect() {
  try {
    const result = await runPortableCli();
    if (result.signal !== null) {
      process.kill(process.pid, result.signal);
      return;
    }
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stderr.write(`${formatPortableRuntimeError(error)}\n`);
    process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 2;
  }
}

if (isDirectRun()) {
  await runDirect();
}
