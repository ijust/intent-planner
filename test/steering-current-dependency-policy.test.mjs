import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tech = fs.readFileSync(path.join(repoRoot, ".kiro/steering/tech.md"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

function policyErrors(body) {
  const errors = [];
  if (!body.includes("INV119")) errors.push("active invariant INV119");
  if (!body.includes("DR234")) errors.push("dependency decision DR234");
  if (body.includes("ランタイム/dev 依存ともゼロ")) errors.push("superseded zero-dependency claim");
  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    if (!body.includes(`\`${name}\``)) errors.push(`allowed dependency ${name}`);
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) errors.push(`non-exact dependency ${name}`);
  }
  return errors;
}

test("steering tech: 現行INV119とpackage.jsonの許可依存を説明する", () => {
  assert.deepEqual(policyErrors(tech), []);
});

test("steering tech: 古い依存ゼロ説明や許可依存の欠落を判別する", () => {
  assert.ok(policyErrors(tech.split("INV119").join("REMOVED")).includes("active invariant INV119"));
  assert.ok(policyErrors(`${tech}\n- ランタイム/dev 依存ともゼロ`).includes("superseded zero-dependency claim"));
  for (const name of Object.keys(pkg.dependencies ?? {})) {
    const mutated = tech.split(`\`${name}\``).join("`REMOVED`");
    assert.ok(policyErrors(mutated).includes(`allowed dependency ${name}`), `${name} の欠落を検出する`);
  }
});
