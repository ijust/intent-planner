import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  hashComponentSet,
  hashFileSet,
  readBuildEvidence,
  readNodeScheduleSnapshot,
  readReleaseInput,
  readVulnerabilityDecisions,
  readVulnerabilitySnapshot,
  serializeStableJson,
  writeStableJson,
} from "../scripts/portable/release-evidence.mjs";

const A_HASH = "a".repeat(64);
const B_HASH = "b".repeat(64);

async function writeJson(filename, value) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, JSON.stringify(value));
}

function validRecords(root) {
  const releaseDirectory = path.join(root, "release", "portable", "0.28.0");
  return {
    releaseDirectory,
    releaseInput: {
      schemaVersion: 1,
      intentPlannerVersion: "0.28.0",
      versionsFrozenAt: "2026-08-06T11:00:00Z",
      publicationDate: "2026-08-07",
      npmTarball: { path: "../../../artifacts/intent-planner-0.28.0.tgz", sha256: A_HASH },
      portableZip: { path: "../../../artifacts/intent-planner-v0.28.0-win-x64-portable.zip", sha256: B_HASH },
      nodeReleaseEvidence: {
        archivePath: "../../../.cache/node/node-v24.18.0-win-x64.zip",
        signedShasumsPath: "../../../.cache/node/v24.18.0/SHASUMS256.txt.asc",
        releaseKeyBundlePath: "../../../.cache/node/release-keys.pgp",
      },
      nodeScheduleSnapshot: "node-schedule.json",
      vulnerabilitySnapshot: "vulnerability-snapshot.json",
      vulnerabilityDecisions: "vulnerability-decisions.json",
    },
    buildEvidence: {
      schemaVersion: 1,
      intentPlannerVersion: "0.28.0",
      npmPackage: { name: "intent-planner", version: "0.28.0", commonContentSha256: A_HASH },
      node: {
        version: "24.18.0", platform: "win32", arch: "x64",
        archiveName: "node-v24.18.0-win-x64.zip", archiveSha256: A_HASH,
        signedShasumsSha256: B_HASH, releaseKeyBundleSha256: A_HASH,
      },
      dependencies: { packageLockSha256: A_HASH, componentsSha256: B_HASH },
    },
    nodeSchedule: {
      schemaVersion: 1,
      source: {
        url: "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json",
        retrievedAt: "2026-08-06T12:00:00Z", rawPath: "node-schedule.raw.json", sha256: A_HASH,
      },
    },
    vulnerabilitySnapshot: {
      schemaVersion: 1,
      intentPlannerVersion: "0.28.0",
      capturedAt: "2026-08-06T13:00:00Z",
      targetsSha256: A_HASH,
      sources: [
        { id: "node-security-index", kind: "node-security", url: "https://nodejs.org/security", retrievedAt: "2026-08-06T13:00:00Z", rawPath: "evidence/node.html", resultSha256: B_HASH, status: "available" },
        { id: "npm-audit-production", kind: "npm-audit", url: "https://registry.npmjs.org/audit", retrievedAt: "2026-08-06T12:30:00Z", rawPath: "evidence/npm-audit.json", resultSha256: A_HASH, status: "available" },
      ],
      targets: [
        { kind: "dependency", name: "term-drift", version: "0.3.6" },
        { kind: "node", name: "node", version: "24.18.0" },
      ],
      findings: [
        { id: "CVE-2026-1234", sourceId: "node-security-index", component: { name: "node", version: "24.18.0" }, sourceUrl: "https://nodejs.org/security/cve-2026-1234" },
      ],
      zeroFindings: false,
    },
    vulnerabilityDecisions: {
      schemaVersion: 1,
      intentPlannerVersion: "0.28.0",
      decisions: [
        { vulnerabilityId: "CVE-2026-1234", component: { name: "node", version: "24.18.0" }, decision: "accept", owner: "release-owner", reason: "影響を確認して期限付きで受容する", decidedAt: "2026-08-06", recheckBy: "2026-08-20", mitigation: null, externalReferences: ["https://example.invalid/ticket/123"] },
      ],
    },
  };
}

test("stable JSON は object key を再帰的に整列し、配列順を保った同一bytesを作る", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "portable-release-evidence-"));
  const outputPath = path.join(directory, "evidence.json");
  t.after(() => rm(directory, { recursive: true, force: true }));

  const value = {
    z: { beta: 2, alpha: 1 },
    a: [{ z: true, a: false }, "second"],
  };
  const before = structuredClone(value);
  const reordered = {
    a: [{ a: false, z: true }, "second"],
    z: { alpha: 1, beta: 2 },
  };

  const first = serializeStableJson(value);
  const second = serializeStableJson(reordered);
  assert.deepEqual(first, second);
  assert.equal(first.toString("utf8"), '{\n  "a": [\n    {\n      "a": false,\n      "z": true\n    },\n    "second"\n  ],\n  "z": {\n    "alpha": 1,\n    "beta": 2\n  }\n}\n');
  assert.equal(first.at(-1), 0x0a);
  assert.deepEqual(value, before, "serialization must not mutate its input");

  await writeStableJson(outputPath, value);
  assert.deepEqual(await readFile(outputPath), first);
});

test("stable JSON は schema 固有でない配列を自動整列しない", () => {
  assert.notDeepEqual(
    serializeStableJson({ entries: [{ id: "b" }, { id: "a" }] }),
    serializeStableJson({ entries: [{ id: "a" }, { id: "b" }] }),
  );
});

test("stable JSON は __proto__ も通常のobject keyとして保持する", () => {
  const value = JSON.parse('{"z":1,"__proto__":{"polluted":true}}');

  assert.equal(
    serializeStableJson(value).toString("utf8"),
    '{\n  "__proto__": {\n    "polluted": true\n  },\n  "z": 1\n}\n',
  );
});

test("stable JSON は決定的なJSON表現を壊す値を具体的に拒否する", () => {
  assert.throws(() => serializeStableJson({ value: Number.POSITIVE_INFINITY }), /finite number.*value/);
  assert.throws(() => serializeStableJson({ value: undefined }), /JSON-compatible.*value/);
  assert.throws(() => serializeStableJson(new Date()), /plain object.*\$/);

  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => serializeStableJson(cyclic), /cyclic.*self/);
});

test("stable JSON は孤立surrogateをkeyと全string valueで拒否する", () => {
  const firstOrder = { [`x\uD800`]: 1, [`x\uD801`]: 2 };
  const reverseOrder = { [`x\uD801`]: 2, [`x\uD800`]: 1 };

  assert.throws(() => serializeStableJson(firstOrder), /well-formed Unicode object key/);
  assert.throws(() => serializeStableJson(reverseOrder), /well-formed Unicode object key/);
  assert.throws(
    () => serializeStableJson({ nested: ["valid", "x\uDC00"] }),
    /well-formed Unicode string.*nested\[1\]/,
  );
});

test("stable JSON は正しいsurrogate pairの非BMP Unicodeを許可する", () => {
  assert.equal(
    serializeStableJson({ "😀": ["𠮷", "ok"] }).toString("utf8"),
    '{\n  "😀": [\n    "𠮷",\n    "ok"\n  ]\n}\n',
  );
});

test("file set hash は path 順で安定し、各fieldの変更を検出する", () => {
  const records = [
    { path: "z/file.txt", size: 2, sha256: B_HASH },
    { path: "a/file.txt", size: 1, sha256: A_HASH },
  ];
  const reversed = [...records].reverse();
  const before = structuredClone(records);
  const baseline = hashFileSet(records);

  assert.match(baseline, /^[0-9a-f]{64}$/);
  assert.equal(hashFileSet(reversed), baseline);
  assert.deepEqual(records, before, "hashing must not mutate its input");
  assert.notEqual(hashFileSet([{ ...records[0], path: "y/file.txt" }, records[1]]), baseline);
  assert.notEqual(hashFileSet([{ ...records[0], size: 3 }, records[1]]), baseline);
  assert.notEqual(hashFileSet([{ ...records[0], sha256: A_HASH }, records[1]]), baseline);
});

test("component set hash は name・version 順で安定し、版変更を検出する", () => {
  const components = [
    { name: "term-drift", version: "0.3.6" },
    { name: "handoff-bridge", version: "0.2.2" },
  ];
  const baseline = hashComponentSet(components);

  assert.match(baseline, /^[0-9a-f]{64}$/);
  assert.equal(hashComponentSet([...components].reverse()), baseline);
  assert.notEqual(
    hashComponentSet([{ ...components[0], version: "0.3.7" }, components[1]]),
    baseline,
  );
});

test("集合hashは設計どおりのUTF-8・NUL・LF列をSHA-256にする", () => {
  assert.equal(
    hashFileSet([{ path: "file.txt", size: 3, sha256: A_HASH }]),
    createHash("sha256").update(`file.txt\u00003\u0000${A_HASH}\n`, "utf8").digest("hex"),
  );
  assert.equal(
    hashComponentSet([{ name: "component", version: "1.2.3" }]),
    createHash("sha256").update("component\u00001.2.3\n", "utf8").digest("hex"),
  );
  assert.notEqual(
    hashComponentSet([{ name: "ab", version: "c" }]),
    hashComponentSet([{ name: "a", version: "bc" }]),
  );
});

test("集合hashはNULと改行を含むfieldを拒否して連結の曖昧性を防ぐ", () => {
  assert.throws(
    () => hashFileSet([{ path: "a\0b", size: 1, sha256: A_HASH }]),
    /path.*NUL or LF/,
  );
  assert.throws(
    () => hashFileSet([{ path: "a\nb", size: 1, sha256: A_HASH }]),
    /path.*NUL or LF/,
  );
  assert.throws(
    () => hashComponentSet([{ name: "a\0b", version: "1.0.0" }]),
    /name.*NUL or LF/,
  );
  assert.throws(
    () => hashComponentSet([{ name: "a", version: "1.0.0\n2.0.0" }]),
    /version.*NUL or LF/,
  );
});

test("集合hashは孤立surrogateを拒否し、正しい非BMP Unicodeを許可する", () => {
  assert.throws(
    () => hashFileSet([{ path: "x\uD800", size: 1, sha256: A_HASH }]),
    /path.*well-formed Unicode/,
  );
  assert.throws(
    () => hashComponentSet([{ name: "x\uD801", version: "1.0.0" }]),
    /name.*well-formed Unicode/,
  );
  assert.throws(
    () => hashComponentSet([{ name: "name", version: "v\uDC00" }]),
    /version.*well-formed Unicode/,
  );

  assert.match(hashFileSet([{ path: "😀/𠮷.txt", size: 1, sha256: A_HASH }]), /^[0-9a-f]{64}$/);
  assert.match(hashComponentSet([{ name: "emoji-😀", version: "𠮷" }]), /^[0-9a-f]{64}$/);
});

test("集合hashは空集合とfile size境界を決定的に扱う", () => {
  const emptySha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  assert.equal(hashFileSet([]), emptySha256);
  assert.equal(hashComponentSet([]), emptySha256);

  assert.match(hashFileSet([{ path: "zero", size: 0, sha256: A_HASH }]), /^[0-9a-f]{64}$/);
  assert.match(
    hashFileSet([{ path: "maximum", size: Number.MAX_SAFE_INTEGER, sha256: A_HASH }]),
    /^[0-9a-f]{64}$/,
  );
  for (const invalidSize of [-1, -0, 1.5]) {
    assert.throws(
      () => hashFileSet([{ path: "invalid", size: invalidSize, sha256: A_HASH }]),
      /size.*non-negative safe integer/,
    );
  }
});

test("集合hashはcanonical encodingを一意にできない入力を拒否する", () => {
  assert.throws(
    () => hashFileSet([{ path: "a", size: Number.POSITIVE_INFINITY, sha256: A_HASH }]),
    /size.*non-negative safe integer/,
  );
  assert.throws(
    () => hashFileSet([{ path: "a", size: 1, sha256: A_HASH.toUpperCase() }]),
    /sha256.*64 lowercase hexadecimal/,
  );
  assert.throws(
    () => hashFileSet([
      { path: "a", size: 1, sha256: A_HASH },
      { path: "a", size: 2, sha256: B_HASH },
    ]),
    /duplicate file path.*a/,
  );
  assert.throws(
    () => hashComponentSet([{ name: "a", version: "" }]),
    /version.*non-empty string/,
  );
  assert.throws(
    () => hashComponentSet([
      { name: "a", version: "1.0.0" },
      { name: "a", version: "1.0.0" },
    ]),
    /duplicate component.*a@1.0.0/,
  );
});

test("5種類のrelease記録を正規化し、入力を変えず再帰的にfreezeする", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-release-readers-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const records = validRecords(root);
  const cacheRoot = path.join(root, ".cache");
  const files = {
    input: path.join(records.releaseDirectory, "release-input.json"),
    build: path.join(root, "portable-build-evidence.json"),
    schedule: path.join(records.releaseDirectory, "node-schedule.json"),
    snapshot: path.join(records.releaseDirectory, "vulnerability-snapshot.json"),
    decisions: path.join(records.releaseDirectory, "vulnerability-decisions.json"),
  };
  await Promise.all([
    writeJson(files.input, records.releaseInput),
    writeJson(files.build, records.buildEvidence),
    writeJson(files.schedule, records.nodeSchedule),
    writeJson(files.snapshot, records.vulnerabilitySnapshot),
    writeJson(files.decisions, records.vulnerabilityDecisions),
  ]);

  const releaseInput = await readReleaseInput(files.input, { workspaceRoot: root, cacheRoot });
  const build = await readBuildEvidence(files.build);
  const schedule = await readNodeScheduleSnapshot(files.schedule, {
    versionsFrozenAt: records.releaseInput.versionsFrozenAt,
    publicationDate: records.releaseInput.publicationDate,
  });
  const snapshot = await readVulnerabilitySnapshot(files.snapshot, {
    versionsFrozenAt: records.releaseInput.versionsFrozenAt,
    publicationDate: records.releaseInput.publicationDate,
  });
  const decisions = await readVulnerabilityDecisions(files.decisions, {
    publicationDate: records.releaseInput.publicationDate,
  });

  assert.equal(releaseInput.npmTarball.resolvedPath, path.join(root, "artifacts", "intent-planner-0.28.0.tgz"));
  assert.equal(releaseInput.nodeReleaseEvidence.archivePathResolved, path.join(cacheRoot, "node", "node-v24.18.0-win-x64.zip"));
  assert.deepEqual(snapshot.sources.map(({ id }) => id), ["node-security-index", "npm-audit-production"]);
  assert.deepEqual(snapshot.targets.map(({ kind, name }) => `${kind}:${name}`), ["dependency:term-drift", "node:node"]);
  assert.ok(Object.isFrozen(releaseInput) && Object.isFrozen(releaseInput.npmTarball));
  assert.ok(Object.isFrozen(build.node) && Object.isFrozen(schedule.source));
  assert.ok(Object.isFrozen(snapshot.sources) && Object.isFrozen(decisions.decisions[0].component));
  assert.equal(records.releaseInput.npmTarball.resolvedPath, undefined, "reader must not mutate source objects");
});

test("readerはBOM、invalid JSON、schema違い、unknown field、型違いを具体的に拒否する", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-release-invalid-json-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const filename = path.join(root, "build.json");
  const valid = validRecords(root).buildEvidence;

  await writeFile(filename, Buffer.from(`\ufeff${JSON.stringify(valid)}`, "utf8"));
  await assert.rejects(readBuildEvidence(filename), /BOM/);
  await writeFile(filename, "{");
  await assert.rejects(readBuildEvidence(filename), /invalid JSON/);
  await writeJson(filename, []);
  await assert.rejects(readBuildEvidence(filename), /expected object/);
  await writeJson(filename, { ...valid, schemaVersion: 2 });
  await assert.rejects(readBuildEvidence(filename), /schemaVersion.*expected 1/);
  await writeJson(filename, { ...valid, surprise: true });
  await assert.rejects(readBuildEvidence(filename), /unknown field.*surprise/);
  await writeJson(filename, { ...valid, intentPlannerVersion: "" });
  await assert.rejects(readBuildEvidence(filename), /intentPlannerVersion.*non-empty/);
  await writeFile(filename, Buffer.from([0xc3, 0x28]));
  await assert.rejects(readBuildEvidence(filename), /UTF-8/);
});

test("readerはroot・nestedのduplicate JSON keyをescaped-equivalentも含めて拒否する", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-release-duplicate-keys-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const filename = path.join(root, "build.json");
  const valid = validRecords(root).buildEvidence;
  await writeFile(filename, '{"schemaVersion":1,"schemaVersion":1}');
  await assert.rejects(readBuildEvidence(filename), /duplicate JSON key.*schemaVersion.*\$/);
  await writeFile(filename, '{"schemaVersion":1,"intentPlannerVersion":"0.28.0","npmPackage":{"name":"intent-planner","\\u006eame":"intent-planner"},"node":{},"dependencies":{}}');
  await assert.rejects(readBuildEvidence(filename), /duplicate JSON key.*name.*npmPackage/);

  const withPunctuation = JSON.stringify({
    ...valid,
    npmPackage: { ...valid.npmPackage, name: "intent-planner: {value, still-string}" },
  });
  await writeFile(filename, withPunctuation);
  let punctuationError;
  try {
    await readBuildEvidence(filename);
  } catch (error) {
    punctuationError = error;
  }
  assert.match(punctuationError?.message ?? "", /npmPackage\.name.*intent-planner/);
  assert.doesNotMatch(punctuationError.message, /duplicate JSON key/);
});

test("versionはstrict SemVerを使い、正当なprereleaseとbuildを受理する", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-release-semver-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const filename = path.join(root, "build.json");
  const valid = validRecords(root).buildEvidence;
  for (const invalid of ["01.2.3", "1.02.3", "1.2.03", "1.0.0-", "1.0.0-01", "1.0.0-alpha.01"]) {
    const value = structuredClone(valid);
    value.intentPlannerVersion = invalid;
    value.npmPackage.version = invalid;
    await writeJson(filename, value);
    await assert.rejects(readBuildEvidence(filename), /complete version/);
  }
  const accepted = structuredClone(valid);
  accepted.intentPlannerVersion = "1.2.3-rc.1+build.005";
  accepted.npmPackage.version = accepted.intentPlannerVersion;
  await writeJson(filename, accepted);
  assert.equal((await readBuildEvidence(filename)).intentPlannerVersion, "1.2.3-rc.1+build.005");
});

test("UTC Z timestampは任意桁fractionを受理し末尾zeroを除いた形へcanonicalizeする", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-release-fraction-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const records = validRecords(root);
  const filename = path.join(records.releaseDirectory, "node-schedule.json");
  for (const [input, expected] of [
    ["2026-08-06T12:00:00.1Z", "2026-08-06T12:00:00.1Z"],
    ["2026-08-06T12:00:00.123Z", "2026-08-06T12:00:00.123Z"],
    ["2026-08-06T12:00:00.123400Z", "2026-08-06T12:00:00.1234Z"],
    ["2026-08-06T12:00:00.000Z", "2026-08-06T12:00:00Z"],
  ]) {
    await writeJson(filename, { ...records.nodeSchedule, source: { ...records.nodeSchedule.source, retrievedAt: input } });
    assert.equal((await readNodeScheduleSnapshot(filename)).source.retrievedAt, expected);
  }
});

test("release inputはhash・時刻・日付と許可root境界を厳格に検証する", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-release-paths-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const records = validRecords(root);
  const filename = path.join(records.releaseDirectory, "release-input.json");
  const options = { workspaceRoot: root, cacheRoot: path.join(root, ".cache") };
  const reject = async (mutate, expected) => {
    const value = structuredClone(records.releaseInput);
    mutate(value);
    await writeJson(filename, value);
    await assert.rejects(readReleaseInput(filename, options), expected);
  };

  await reject((v) => { v.npmTarball.sha256 = A_HASH.toUpperCase(); }, /sha256.*lowercase/);
  await reject((v) => { v.versionsFrozenAt = "2026-02-30T11:00:00Z"; }, /versionsFrozenAt.*RFC3339/);
  await reject((v) => { v.publicationDate = "2026-02-30"; }, /publicationDate.*YYYY-MM-DD/);
  await reject((v) => { v.publicationDate = "2026-08-05"; }, /versionsFrozenAt.*publicationDate/);
  await reject((v) => { v.portableZip.path = "/tmp/file.zip"; }, /portableZip\.path.*relative/);
  await reject((v) => { v.portableZip.path = "C:\\temp\\file.zip"; }, /portableZip\.path.*drive/);
  await reject((v) => { v.portableZip.path = "C:relative.tgz"; }, /portableZip\.path.*drive/);
  await reject((v) => { v.portableZip.path = "\\\\server\\share\\file.zip"; }, /portableZip\.path.*UNC/);
  await reject((v) => { v.portableZip.path = "../../../../escape.zip"; }, /portableZip\.path.*outside allowed roots/);
  await reject((v) => { v.nodeScheduleSnapshot = "../other/node-schedule.json"; }, /nodeScheduleSnapshot.*outside allowed roots/);
  await reject((v) => { v.nodeScheduleSnapshot = "bad\0name.json"; }, /nodeScheduleSnapshot.*NUL/);
});

test("build evidenceは完全版、win32/x64、archive名、hashを固定する", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-build-evidence-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const filename = path.join(root, "build.json");
  const valid = validRecords(root).buildEvidence;
  const reject = async (mutate, expected) => {
    const value = structuredClone(valid);
    mutate(value);
    await writeJson(filename, value);
    await assert.rejects(readBuildEvidence(filename), expected);
  };
  await reject((v) => { v.node.version = "v24.18.0"; }, /node\.version.*complete version/);
  await reject((v) => { v.node.platform = "linux"; }, /node\.platform.*win32/);
  await reject((v) => { v.node.arch = "arm64"; }, /node\.arch.*x64/);
  await reject((v) => { v.node.archiveName = "node.zip"; }, /archiveName.*node-v24\.18\.0-win-x64\.zip/);
  await reject((v) => { delete v.dependencies.componentsSha256; }, /componentsSha256.*required/);
  await reject((v) => { v.npmPackage.version = "0.29.0"; }, /npmPackage\.version.*intentPlannerVersion/);
  await reject((v) => { v.npmPackage.name = "other"; }, /npmPackage\.name.*intent-planner/);
});

test("scheduleとsnapshotはUTC時刻・公開期間・source証拠を検証する", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-snapshots-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const records = validRecords(root);
  const scheduleFile = path.join(records.releaseDirectory, "node-schedule.json");
  const snapshotFile = path.join(records.releaseDirectory, "vulnerability-snapshot.json");
  const context = { versionsFrozenAt: "2026-08-06T11:00:00Z", publicationDate: "2026-08-07" };

  await writeJson(scheduleFile, { ...records.nodeSchedule, source: { ...records.nodeSchedule.source, retrievedAt: "2026-08-06T12:00:00+00:00" } });
  await assert.rejects(readNodeScheduleSnapshot(scheduleFile, context), /retrievedAt.*UTC Z/);
  await writeJson(scheduleFile, { ...records.nodeSchedule, source: { ...records.nodeSchedule.source, retrievedAt: "2026-08-08T00:00:00Z" } });
  await assert.rejects(readNodeScheduleSnapshot(scheduleFile, context), /retrievedAt.*publicationDate/);
  await writeJson(scheduleFile, { ...records.nodeSchedule, source: { ...records.nodeSchedule.source, url: "http:\/\/nodejs.org/schedule" } });
  await assert.rejects(readNodeScheduleSnapshot(scheduleFile, context), /url.*HTTPS/);
  await writeJson(scheduleFile, { ...records.nodeSchedule, source: { ...records.nodeSchedule.source, url: "https:\/\/example.test/schedule.json" } });
  await assert.rejects(readNodeScheduleSnapshot(scheduleFile, context), /url.*official Node\.js schedule/);

  const duplicateSource = structuredClone(records.vulnerabilitySnapshot);
  duplicateSource.sources.push({ ...duplicateSource.sources[0] });
  await writeJson(snapshotFile, duplicateSource);
  await assert.rejects(readVulnerabilitySnapshot(snapshotFile, context), /duplicate source id/);
  const unknownSource = structuredClone(records.vulnerabilitySnapshot);
  unknownSource.findings[0].sourceId = "missing";
  await writeJson(snapshotFile, unknownSource);
  await assert.rejects(readVulnerabilitySnapshot(snapshotFile, context), /sourceId.*missing/);
  const unknownTarget = structuredClone(records.vulnerabilitySnapshot);
  unknownTarget.findings[0].component.version = "24.19.0";
  await writeJson(snapshotFile, unknownTarget);
  await assert.rejects(readVulnerabilitySnapshot(snapshotFile, context), /component.*missing target/);
  const futureSource = structuredClone(records.vulnerabilitySnapshot);
  futureSource.sources[0].retrievedAt = "2026-08-06T14:00:00Z";
  await writeJson(snapshotFile, futureSource);
  await assert.rejects(readVulnerabilitySnapshot(snapshotFile, context), /retrievedAt.*capturedAt/);
  const unavailable = structuredClone(records.vulnerabilitySnapshot);
  unavailable.sources[0].status = "unavailable";
  await writeJson(snapshotFile, unavailable);
  await assert.rejects(readVulnerabilitySnapshot(snapshotFile, context), /status.*available/);
});

test("vulnerability snapshotはzeroFindingsと識別子重複を拒否し、入力順に依存しない", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-vulnerability-order-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const records = validRecords(root);
  const filename = path.join(records.releaseDirectory, "snapshot.json");
  const context = { versionsFrozenAt: "2026-08-06T11:00:00Z", publicationDate: "2026-08-07" };
  await writeJson(filename, records.vulnerabilitySnapshot);
  const first = await readVulnerabilitySnapshot(filename, context);
  const reordered = structuredClone(records.vulnerabilitySnapshot);
  reordered.sources.reverse();
  reordered.targets.reverse();
  await writeJson(filename, reordered);
  const second = await readVulnerabilitySnapshot(filename, context);
  assert.deepEqual(first, second);

  const wrongZero = structuredClone(records.vulnerabilitySnapshot);
  wrongZero.zeroFindings = true;
  await writeJson(filename, wrongZero);
  await assert.rejects(readVulnerabilitySnapshot(filename, context), /zeroFindings.*findings/);
  const duplicateTarget = structuredClone(records.vulnerabilitySnapshot);
  duplicateTarget.targets.push({ ...duplicateTarget.targets[0] });
  await writeJson(filename, duplicateTarget);
  await assert.rejects(readVulnerabilitySnapshot(filename, context), /duplicate target/);
  const duplicateFinding = structuredClone(records.vulnerabilitySnapshot);
  duplicateFinding.findings.push({ ...duplicateFinding.findings[0] });
  await writeJson(filename, duplicateFinding);
  await assert.rejects(readVulnerabilitySnapshot(filename, context), /duplicate finding id/);
});

test("decisionはupdate/avoid/accept固有形、期限、重複key、HTTPS参照を検証する", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portable-decisions-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const filename = path.join(root, "decisions.json");
  const base = validRecords(root).vulnerabilityDecisions;
  const avoid = {
    vulnerabilityId: "GHSA-abcd-1234-5678", component: { name: "term-drift", version: "0.3.6" },
    decision: "avoid", owner: "release-owner", reason: "対象機能を無効化して回避する",
    decidedAt: "2026-08-06", recheckBy: "2026-08-20",
    mitigation: { description: "対象機能を無効化", candidateSha256: A_HASH, verifiedBy: "release-reviewer", verifiedAt: "2026-08-06", evidencePath: "evidence/avoidance.json", evidenceSha256: B_HASH },
    externalReferences: [],
  };
  const update = { ...structuredClone(base.decisions[0]), vulnerabilityId: "CVE-2026-9999", decision: "update", mitigation: null, externalReferences: [] };
  await writeJson(filename, { ...base, decisions: [avoid, update, base.decisions[0]] });
  const normalized = await readVulnerabilityDecisions(filename, { publicationDate: "2026-08-07" });
  assert.deepEqual(normalized.decisions.map((item) => item.vulnerabilityId), ["CVE-2026-1234", "CVE-2026-9999", "GHSA-abcd-1234-5678"]);

  const rejectDecision = async (decision, expected) => {
    await writeJson(filename, { ...base, decisions: [decision] });
    await assert.rejects(readVulnerabilityDecisions(filename, { publicationDate: "2026-08-07" }), expected);
  };
  await rejectDecision({ ...base.decisions[0], decision: "ignore" }, /decision.*update.*avoid.*accept/);
  await rejectDecision({ ...base.decisions[0], mitigation: { description: "x" } }, /accept.*mitigation.*null/);
  await rejectDecision({ ...avoid, mitigation: { ...avoid.mitigation, evidencePath: "../outside.json" } }, /evidencePath.*outside allowed roots/);
  await rejectDecision({ ...avoid, mitigation: null }, /avoid.*mitigation/);
  await rejectDecision({ ...update, mitigation: avoid.mitigation }, /update.*mitigation.*null/);
  await rejectDecision({ ...base.decisions[0], decidedAt: "2026-08-21" }, /decidedAt.*recheckBy/);
  await rejectDecision({ ...base.decisions[0], recheckBy: "2026-08-06" }, /recheckBy.*publicationDate/);
  await rejectDecision({ ...base.decisions[0], decidedAt: "2026-08-08", recheckBy: "2026-08-20" }, /decidedAt.*publicationDate/);
  await rejectDecision({ ...avoid, mitigation: { ...avoid.mitigation, verifiedAt: "2026-08-08" } }, /verifiedAt.*publicationDate/);
  await rejectDecision({ ...base.decisions[0], externalReferences: ["http://example.test/ticket"] }, /externalReferences.*HTTPS/);

  await writeJson(filename, { ...base, decisions: [base.decisions[0], { ...base.decisions[0] }] });
  await assert.rejects(readVulnerabilityDecisions(filename), /duplicate decision.*CVE-2026-1234.*node@24\.18\.0/);
});
