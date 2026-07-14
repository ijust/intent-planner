import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("canonical contract: dogfood compass is a split-store skeleton with permanent fallback", () => {
  const c = read(".intent/intent-compass.md");
  assert.match(c, /分割収納を正本/);
  assert.match(c, /恒久 fallback/);
  assert.match(c, /## Normalized store reading guide/);
  assert.ok(fs.existsSync(path.join(root, ".intent", "compass-history-legacy-contract.md")));
  const legacy = fs.readFileSync(path.join(root, ".intent", "compass-history-legacy-contract.md"));
  assert.equal(crypto.createHash("sha256").update(legacy).digest("hex"), "dd254430110baa086a2b47b0ba888da401343b804986315c58d34f242f2af3e1");
  const mutated = Buffer.from(legacy);
  mutated[0] ^= 1;
  assert.notEqual(crypto.createHash("sha256").update(mutated).digest("hex"), crypto.createHash("sha256").update(legacy).digest("hex"));
});

test("canonical contract: ja/en scaffold and migration docs are synchronized", () => {
  const ja = read("templates/ja/intent/intent-compass.md");
  const en = read("templates/en/intent/intent-compass.md");
  assert.match(ja, /正規化収納への案内/);
  assert.match(en, /Normalized store pointer/);
  for (const p of ["docs/migration.md", "docs/migration.en.md"]) {
    const c = read(p);
    assert.match(c, /opt-in|Opt-in/);
    assert.match(c, /DR132/);
    assert.match(c, /旧単一|legacy single/);
    assert.match(c, /自動|automatically/);
  }
});

test("canonical contract: opt-in fixture migration is reversible and keeps legacy fallback", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canonical-contract-"));
  fs.mkdirSync(path.join(dir, ".intent", "compass"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".intent", "intent-compass.md"), "# legacy\n");
  fs.writeFileSync(path.join(dir, ".intent", "compass", "INV1.md"), "---\nid: INV1\narea: always\nstatus: active\n---\n\n## Law\nkeep\n");
  fs.writeFileSync(path.join(dir, ".intent", "compass", "index.md"), "- INV1\n");
  const chooseLaw = (base, id) => {
    const split = path.join(base, ".intent", "compass", `${id}.md`);
    return fs.existsSync(split) ? fs.readFileSync(split, "utf8").match(/## Law[\s\S]*/)?.[0] : fs.readFileSync(path.join(base, ".intent", "intent-compass.md"), "utf8");
  };
  assert.match(chooseLaw(dir, "INV1"), /## Law/);
  fs.rmSync(path.join(dir, ".intent", "compass", "INV1.md"));
  assert.equal(chooseLaw(dir, "INV1"), "# legacy\n");
});
