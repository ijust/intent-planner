import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "code-async-messaging.md";
const IDS = [
  "atomic-state-change-and-message-intent",
  "bounded-inflight-and-queue-capacity",
  "business-ordering-scope-and-version",
  "duplicate-message-side-effect-once",
];
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");
const ids = (text) => [...text.matchAll(/^## id:\s*(\S+)/gm)].map((m) => m[1]).sort();

test("async messaging: 日英に四つの独立した定石がある", () => {
  for (const lang of ["ja", "en"]) assert.deepEqual(ids(read("templates", lang, "intent", "constraint-starters", FILE)), IDS);
});

test("async messaging: 二重書込み、重複、順序範囲、容量超過を判別できる", () => {
  const pairs = [
    ["同じローカルトランザクション", "same local transaction"],
    ["安定した識別子", "stable identifier"],
    ["欠番", "gaps"],
    ["最古の滞留時間", "oldest-item age"],
  ];
  for (const [index, lang] of ["ja", "en"].entries()) {
    const text = read("templates", lang, "intent", "constraint-starters", FILE);
    for (const pair of pairs) assert.ok(text.includes(pair[index]), `${lang}: ${pair[index]}`);
    assert.match(text, lang === "ja" ? /出典:\s*\S/ : /source:\s*\S/);
  }
});

test("async messaging: 親索引と自己適用へ結線される", () => {
  for (const lang of ["ja", "en"]) assert.ok(read("templates", lang, "intent", "constraint-starters.md").includes(`constraint-starters/${FILE}`));
  assert.equal(read(".intent", "constraint-starters", FILE), read("templates", "ja", "intent", "constraint-starters", FILE));
  assert.ok(read(".intent", "constraint-starters.md").includes(`constraint-starters/${FILE}`));
});

test("async messaging: 既存定石との境界を持ち、製品や固定値を強制しない", () => {
  for (const lang of ["ja", "en"]) {
    const text = read("templates", lang, "intent", "constraint-starters", FILE);
    for (const boundary of ["idempotency-retry-safe", "immutable-event-correction", "remote-call-"]) assert.ok(text.includes(boundary));
    assert.doesNotMatch(text, /\b(?:Temporal|Cadence|MassTransit|NServiceBus|Debezium)\b/);
    assert.doesNotMatch(text, /\b(?:prefetch|queue|partition)\s*(?:=|:|は)\s*\d+/i);
    assert.doesNotMatch(text, /system-wide exactly-once|システム全体.*exactly-once/i);
  }
});
