// pkt-20260710-canonical-norm-migrate-invdr-3h82 固有オラクル。
// 移送直前のworktree preimage（HEADではない）から固定したhashで、全INV/DRの
// byte同一move・旧新重複ゼロ・領域/group/Updated保持・派生index整合を判別する。
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "test/fixtures/canonical-norm-migrate-invdr/preimage.json"), "utf8"),
);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const trimBlank = (lines) => {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === "") start += 1;
  while (end > start && lines[end - 1] === "") end -= 1;
  return lines.slice(start, end);
};
const block = (content, from, to) => {
  const lines = content.split("\n");
  const start = lines.indexOf(from);
  const end = to ? lines.indexOf(to, start + 1) : lines.length;
  return trimBlank(lines.slice(start + 1, end)).join("\n");
};

const symbolFileIds = (storeDir) => fs.readdirSync(storeDir)
  .filter((file) => /^(?:INV|DR)\d+\.md$/.test(file))
  .map((file) => file.replace(/\.md$/, ""));

function checkLiveStore({ storeDir, expected }) {
  const errors = [];
  const expectedIds = Object.keys(expected.symbols);
  const currentIds = symbolFileIds(storeDir);

  for (const id of expectedIds) {
    if (!currentIds.includes(id)) errors.push(`${id}: 移送済み実体ファイル欠落`);
  }
  for (const id of currentIds) {
    const file = path.join(storeDir, `${id}.md`);
    const content = fs.readFileSync(file, "utf8");
    if (!new RegExp(`^id: ${id}$`, "m").test(content)) errors.push(`${id}: frontmatter id不一致`);
    if (!/^area: .+$/m.test(content)) errors.push(`${id}: area欠落`);
    if (!/^status: .+$/m.test(content)) errors.push(`${id}: status欠落`);
    if (!/^## Law$/m.test(content)) errors.push(`${id}: Law欠落`);
    if (!/^## Annex$/m.test(content)) errors.push(`${id}: Annex欠落`);
  }

  const groupsPath = path.join(storeDir, "groups.md");
  if (!fs.existsSync(groupsPath)) errors.push("group metadata欠落");

  const indexPath = path.join(storeDir, "index.md");
  if (!fs.existsSync(indexPath)) {
    errors.push("index.md欠落");
    return errors;
  }
  const index = fs.readFileSync(indexPath, "utf8");
  const indexIds = index
    .split("\n")
    .filter((line) => /^- (?:INV|DR)\d+ /.test(line))
    .map((line) => line.slice(2).split(" ")[0]);
  if (new Set(indexIds).size !== indexIds.length) errors.push("index.mdに重複ID");
  for (const id of expectedIds) {
    if (!indexIds.includes(id)) errors.push(`${id}: index.mdから移送済み実体へ到達不能`);
  }
  for (const id of currentIds) {
    if (!indexIds.includes(id)) errors.push(`${id}: 現役実体がindex.mdから到達不能`);
    const content = fs.readFileSync(path.join(storeDir, `${id}.md`), "utf8");
    const area = content.match(/^area: (.+)$/m)?.[1];
    const status = content.match(/^status: (.+)$/m)?.[1];
    const indexMeta = index.match(new RegExp(`^- ${id} \\[領域: ([^\\]]+)\\] (\\S+) —`, "m"));
    if (area && status && (!indexMeta || indexMeta[1] !== area || indexMeta[2] !== status)) {
      errors.push(`${id}: index.mdのarea/statusが実体と不一致`);
    }
  }
  for (const id of indexIds) {
    if (!currentIds.includes(id)) errors.push(`${id}: index.mdが存在しない実体を参照`);
  }
  return errors;
}

function checkMigration({ compassPath, storeDir, expected, allowLaterSymbols = false, liveStore = false }) {
  if (liveStore) return checkLiveStore({ storeDir, expected });
  const errors = [];
  const compass = fs.readFileSync(compassPath, "utf8");
  if (!allowLaterSymbols && sha256(compass) !== expected.expected_compass_sha256) errors.push("旧本体の非対象byteまたはstubがpreimage期待値と不一致");
  if (allowLaterSymbols && !/^## Invariants\n\n分割収納へ移送済み。/m.test(compass)) errors.push("旧本体のInvariants stubが欠落");
  if (allowLaterSymbols && !/^## Decision Rules\n\n分割収納へ移送済み。/m.test(compass)) errors.push("旧本体のDecision Rules stubが欠落");
  const afterInvariantHeading = compass.slice(compass.indexOf("## Invariants"));
  for (const id of Object.keys(expected.symbols)) {
    const residual = id.startsWith("INV")
      ? new RegExp(`^- \\*\\*${id}\\b`, "m").test(afterInvariantHeading)
      : new RegExp(`^### ${id}\\b`, "m").test(afterInvariantHeading);
    if (residual) errors.push(`${id}: 旧本体にも残存（旧新重複）`);

    const file = path.join(storeDir, `${id}.md`);
    if (!fs.existsSync(file)) {
      errors.push(`${id}: 実体ファイル欠落`);
      continue;
    }
    const content = fs.readFileSync(file, "utf8");
    const meta = expected.symbols[id];
    if (!new RegExp(`^id: ${id}$`, "m").test(content)) errors.push(`${id}: frontmatter id不一致`);
    if (!new RegExp(`^area: ${meta.area}$`, "m").test(content)) errors.push(`${id}: area不一致`);
    if (!new RegExp(`^status: ${meta.status}$`, "m").test(content)) errors.push(`${id}: status不一致`);
    if (sha256(block(content, "## Law", "## Annex")) !== meta.law_sha256) errors.push(`${id}: Lawがpreimageとbyte不一致`);
    if (sha256(block(content, "## Annex")) !== meta.annex_sha256) errors.push(`${id}: Annexがpreimageとbyte不一致`);
    if (sha256(content) !== meta.file_sha256) errors.push(`${id}: 許可された構造を含むfile全体が期待値と不一致`);
  }

  const groupsPath = path.join(storeDir, "groups.md");
  if (!fs.existsSync(groupsPath)) errors.push("group metadata欠落");
  else {
    const groups = fs.readFileSync(groupsPath, "utf8");
    const marker = groups.indexOf("\n## Anti-direction groups");
    const invdrGroups = allowLaterSymbols && marker >= 0 ? groups.slice(0, marker + 1).trimEnd() + "\n" : groups;
    if (sha256(invdrGroups) !== expected.expected_groups_sha256) errors.push("group/Updated metadataがpreimageとbyte不一致");
  }

  const indexPath = path.join(storeDir, "index.md");
  if (!fs.existsSync(indexPath)) errors.push("index.md欠落");
  else {
    const content = fs.readFileSync(indexPath, "utf8");
    const marker = content.indexOf("\n- Anti-");
    const invdrIndex = allowLaterSymbols && marker >= 0 ? content.slice(0, marker + 1) : content;
    if (sha256(invdrIndex) !== expected.expected_index_sha256) errors.push("index.mdが派生期待値と不一致");
    const ids = content
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2).split(" ")[0]);
    if (new Set(ids).size !== ids.length) errors.push("index.mdに重複ID");
    const invdrIds = ids.filter((id) => /^(INV|DR)\d+$/.test(id));
    if ((allowLaterSymbols ? invdrIds.length : ids.length) !== Object.keys(expected.symbols).length) errors.push("index.mdの全記号到達性が不足");
  }
  return errors;
}

function writeMiniFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ip-invdr-oracle-"));
  const storeDir = path.join(dir, "compass");
  fs.mkdirSync(storeDir);
  const compass = [
    "# compass",
    "",
    "## Invariants",
    "",
    "分割収納へ移送済み。",
    "",
    "## Decision Rules",
    "",
    "分割収納へ移送済み。",
    "",
  ].join("\n");
  const law = "- **INV1 約束**: byte同一。";
  const annex = "  - 検査オラクル: 実体。";
  const symbol = [
    "---",
    "id: INV1",
    "area: always",
    "status: active",
    "---",
    "",
    "# INV1 約束",
    "",
    "## Law",
    law,
    "",
    "## Annex",
    annex,
    "",
  ].join("\n");
  const groups = "# groups\n\n### 全作業共通\n- area: always\n- symbols: INV1\n- Updated (Invariants): 2026-07-10\n";
  const index = "# index\n\n- INV1 [領域: always] active — 約束\n";
  fs.writeFileSync(path.join(dir, "intent-compass.md"), compass);
  fs.writeFileSync(path.join(storeDir, "INV1.md"), symbol);
  fs.writeFileSync(path.join(storeDir, "groups.md"), groups);
  fs.writeFileSync(path.join(storeDir, "index.md"), index);
  return {
    dir,
    compassPath: path.join(dir, "intent-compass.md"),
    storeDir,
    expected: {
      expected_compass_sha256: sha256(compass),
      expected_groups_sha256: sha256(groups),
      expected_index_sha256: sha256(index),
      symbols: {
        INV1: {
          area: "always",
          status: "active",
          law_sha256: sha256(law),
          annex_sha256: sha256(annex),
          file_sha256: sha256(symbol),
        },
      },
    },
  };
}

test("migration oracle: 正しいfixtureはgreen", () => {
  const fixture = writeMiniFixture();
  assert.deepEqual(checkMigration(fixture), []);
});

for (const [name, mutate, expectedError] of [
  ["実体欠落", (f) => fs.rmSync(path.join(f.storeDir, "INV1.md")), /実体ファイル欠落/],
  [
    "旧新重複",
    (f) => fs.appendFileSync(f.compassPath, "- **INV1 約束**: byte同一。\n"),
    /旧本体にも残存/,
  ],
  [
    "Law 1byte改変",
    (f) => {
      const p = path.join(f.storeDir, "INV1.md");
      fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("byte同一", "Byte同一"));
    },
    /Lawがpreimageとbyte不一致/,
  ],
  [
    "area欠落",
    (f) => {
      const p = path.join(f.storeDir, "INV1.md");
      fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("area: always\n", ""));
    },
    /area不一致/,
  ],
  [
    "group欠落",
    (f) => fs.rmSync(path.join(f.storeDir, "groups.md")),
    /group metadata欠落/,
  ],
  [
    "Updated欠落",
    (f) => {
      const p = path.join(f.storeDir, "groups.md");
      fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/- Updated.*\n/, ""));
    },
    /group\/Updated metadataがpreimageとbyte不一致/,
  ],
  [
    "index実体到達性欠落",
    (f) => fs.writeFileSync(path.join(f.storeDir, "index.md"), "# index\n"),
    /index\.mdが派生期待値と不一致/,
  ],
]) {
  test(`migration oracle 判別: ${name}でred`, () => {
    const fixture = writeMiniFixture();
    mutate(fixture);
    assert.ok(checkMigration(fixture).some((error) => expectedError.test(error)), checkMigration(fixture).join("\n"));
  });
}

test("dogfood: 移送済み全INV/DRが現役分割収納で構造整合し到達できる", () => {
  assert.equal(manifest.inventory.INV, 95);
  assert.equal(manifest.inventory.DR, 176);
  const errors = checkMigration({
    compassPath: path.join(root, ".intent/intent-compass.md"),
    storeDir: path.join(root, ".intent/compass"),
    expected: manifest,
    liveStore: true,
  });
  assert.deepEqual(errors, [], errors.slice(0, 20).join("\n"));
});

test("post-migration oracle: Law更新と後続記号を許容し、欠落とindex driftはred", () => {
  const fixture = writeMiniFixture();
  const inv1Path = path.join(fixture.storeDir, "INV1.md");
  const inv1Original = fs.readFileSync(inv1Path, "utf8");
  fs.writeFileSync(inv1Path, inv1Original.replace("byte同一", "承認済み更新"));

  const inv2 = fs.readFileSync(inv1Path, "utf8")
    .replaceAll("INV1", "INV2")
    .replace("約束", "後続の約束");
  fs.writeFileSync(path.join(fixture.storeDir, "INV2.md"), inv2);
  fs.appendFileSync(path.join(fixture.storeDir, "index.md"), "- INV2 [領域: always] active — 後続の約束\n");
  assert.deepEqual(checkMigration({ ...fixture, liveStore: true }), []);

  fs.writeFileSync(path.join(fixture.storeDir, "INV2.md"), inv2.replace("## Annex", "## Notes"));
  const malformedLaterSymbol = checkMigration({ ...fixture, liveStore: true });
  assert.ok(
    malformedLaterSymbol.some((error) => /INV2: Annex欠落/.test(error)),
    malformedLaterSymbol.join("\n"),
  );
  fs.writeFileSync(path.join(fixture.storeDir, "INV2.md"), inv2);

  fs.rmSync(inv1Path);
  const missing = checkMigration({ ...fixture, liveStore: true });
  assert.ok(missing.some((error) => /INV1: 移送済み実体ファイル欠落/.test(error)), missing.join("\n"));

  fs.writeFileSync(inv1Path, inv1Original);
  fs.writeFileSync(path.join(fixture.storeDir, "index.md"), "# index\n\n- INV1 [領域: always] active — 約束\n");
  const stale = checkMigration({ ...fixture, liveStore: true });
  assert.ok(stale.some((error) => /INV2: 現役実体がindex\.mdから到達不能/.test(error)), stale.join("\n"));
});
