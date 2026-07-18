import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(ROOT, "test/golden-locks.manifest.json"), "utf8"),
);
const START = "<!-- intent-plan:downstream-start -->";
const END = "<!-- intent-plan:downstream-end -->";
const SOURCES = MANIFEST.markerStripped.entries;

function occurrences(content, marker) {
  return content.split(marker).length - 1;
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

for (const [rel, preMarkerHash] of Object.entries(SOURCES)) {
  test(`${rel}: 下流起動markerがStep 4全体を1組だけ囲む`, () => {
    const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const step4 = content.match(/^### Step 4:.*$/m)?.[0];

    assert.ok(step4, "Step 4見出しが存在する");
    assert.equal(occurrences(content, START), 1, "start markerが1個だけ存在する");
    assert.equal(occurrences(content, END), 1, "end markerが1個だけ存在する");

    const startIndex = content.indexOf(START);
    const endIndex = content.indexOf(END);
    assert.ok(startIndex < endIndex, "markerがstart→endの正順である");
    assert.equal(content.slice(startIndex + START.length + 1, startIndex + START.length + 1 + step4.length), step4);
    assert.equal(content.slice(endIndex + END.length + 1).startsWith("## Output Description"), true);

    const step4Body = content.slice(startIndex, endIndex);
    const downstreamCommand = rel.includes("cc-sdd")
      ? "/kiro-spec-init"
      : rel.includes("openspec")
        ? "/opsx:propose"
        : "/speckit.specify";
    assert.ok(step4Body.includes(downstreamCommand), "個別入口の下流続行案内が残る");

    const withoutMarkers = content.replace(`${START}\n`, "").replace(`${END}\n`, "");
    assert.equal(sha256(withoutMarkers), preMarkerHash, "marker以外のbytesが導入前と一致する");
  });
}

test("marker stripped goldenは実装向けexport 12面を欠落なく列挙する", () => {
  assert.equal(Object.keys(SOURCES).length, 12);
});
