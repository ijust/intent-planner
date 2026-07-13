import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  TERM_DRIFT_COMPATIBILITY,
  createTermDriftCompatibility,
  normalizeTermDriftPath,
} from "../src/term-drift.mjs";

const PRODUCTION_HASHES = Object.freeze({
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

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

test("production compatibility contract freezes term-drift 0.2.1 and its four published hashes", () => {
  assert.deepEqual(TERM_DRIFT_COMPATIBILITY, {
    version: "0.2.1",
    ...PRODUCTION_HASHES,
  });
  assert.equal(Object.isFrozen(TERM_DRIFT_COMPATIBILITY), true);
  assert.equal(Object.isFrozen(TERM_DRIFT_COMPATIBILITY.commonFiles), true);
  assert.equal(Object.isFrozen(TERM_DRIFT_COMPATIBILITY.skillFiles), true);
  assert.equal(
    Object.keys(TERM_DRIFT_COMPATIBILITY.commonFiles).length +
      Object.keys(TERM_DRIFT_COMPATIBILITY.skillFiles).length,
    4,
  );
});

test("an injectable compatibility contract hashes short arbitrary fixture bytes without package artifacts", () => {
  const fixtureBytes = {
    commonFiles: {
      ".term-drift/rules/detect.md": "detect fixture\n",
      ".term-drift/rules/workflow.md": Buffer.from([0, 1, 2, 3]),
    },
    skillFiles: {
      "SKILL.md": "skill fixture\n",
      "agents/openai.yaml": "interface:\n  display_name: fixture\n",
    },
  };

  const contract = createTermDriftCompatibility("fixture-version", fixtureBytes);

  assert.deepEqual(contract, {
    version: "fixture-version",
    commonFiles: {
      ".term-drift/rules/detect.md": sha256(fixtureBytes.commonFiles[".term-drift/rules/detect.md"]),
      ".term-drift/rules/workflow.md": sha256(
        fixtureBytes.commonFiles[".term-drift/rules/workflow.md"],
      ),
    },
    skillFiles: {
      "SKILL.md": sha256(fixtureBytes.skillFiles["SKILL.md"]),
      "agents/openai.yaml": sha256(fixtureBytes.skillFiles["agents/openai.yaml"]),
    },
  });
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(Object.isFrozen(contract.commonFiles), true);
  assert.equal(Object.isFrozen(contract.skillFiles), true);
});

test("path normalization converts platform separators to POSIX without resolving the path", () => {
  assert.equal(normalizeTermDriftPath(".agents\\skills\\term-drift\\SKILL.md"), ".agents/skills/term-drift/SKILL.md");
  assert.equal(normalizeTermDriftPath(".agents/skills/term-drift/SKILL.md"), ".agents/skills/term-drift/SKILL.md");
  assert.equal(normalizeTermDriftPath("..\\term-drift\\SKILL.md"), "../term-drift/SKILL.md");
  assert.equal(normalizeTermDriftPath("\\\\server\\share\\term-drift"), "//server/share/term-drift");
});

test("compatibility contract construction rejects ambiguous or invalid input", () => {
  assert.throws(
    () => createTermDriftCompatibility("", { commonFiles: {}, skillFiles: {} }),
    /version must be a non-empty string/,
  );
  assert.throws(
    () =>
      createTermDriftCompatibility("fixture-version", {
        commonFiles: { "detect.md": 42 },
        skillFiles: {},
      }),
    /fixture bytes must be a string, Buffer, or Uint8Array/,
  );
  assert.throws(() => normalizeTermDriftPath(null), /path must be a string/);
});

