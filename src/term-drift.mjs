import crypto from "node:crypto";

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

