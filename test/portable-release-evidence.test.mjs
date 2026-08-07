import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  hashComponentSet,
  hashFileSet,
  serializeStableJson,
  writeStableJson,
} from "../scripts/portable/release-evidence.mjs";

const A_HASH = "a".repeat(64);
const B_HASH = "b".repeat(64);

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
