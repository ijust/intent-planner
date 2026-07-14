// pkt-20260710-canonical-norm-migrate-anti-jdem 固有オラクル。
// move前worktreeのraw snapshot/manifestを基準に、全Anti番号・既存INV/DR参照・
// byte同一move・旧新重複ゼロ・group/index・第1波split非改変を判別する。
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "test/fixtures/canonical-norm-migrate-anti/preimage.json"), "utf8"),
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

function scanReferences(storeDir, files) {
  const references = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(storeDir, file), "utf8");
    const heading = content.slice(0, content.indexOf("## Law"));
    const law = content.match(/^## Law\n([\s\S]*?)(?=^## Annex|$)/m)?.[1] ?? "";
    const annex = content.match(/^## Annex\n([\s\S]*)$/m)?.[1] ?? "";
    for (const [section, source] of [["Heading", heading], ["Law", law], ["Annex", annex]]) {
      for (const match of source.matchAll(/Anti-direction (\d+)/g)) {
        references.push({ file, number: Number(match[1]), section });
      }
    }
  }
  return references;
}

const symbolFileIds = (storeDir) => fs.readdirSync(storeDir)
  .filter((file) => /^(?:(?:INV|DR)\d+|Anti-\d+)\.md$/.test(file))
  .map((file) => file.replace(/\.md$/, ""));

function checkLiveStore({ storeDir, historyPath, expected }) {
  const errors = [];
  const migratedIds = [
    ...Object.keys(expected.baseline_symbols).map((file) => file.replace(/\.md$/, "")),
    ...Object.keys(expected.symbols),
  ];
  const currentIds = symbolFileIds(storeDir);

  for (const id of migratedIds) {
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

  if (!fs.existsSync(path.join(storeDir, "groups.md"))) errors.push("Anti group metadata欠落");
  const indexPath = path.join(storeDir, "index.md");
  let index = "";
  let indexIds = [];
  if (!fs.existsSync(indexPath)) errors.push("index.md欠落");
  else {
    index = fs.readFileSync(indexPath, "utf8");
    indexIds = index
      .split("\n")
      .filter((line) => /^- (?:(?:INV|DR)\d+|Anti-\d+) /.test(line))
      .map((line) => line.slice(2).split(" ")[0]);
    if (new Set(indexIds).size !== indexIds.length) errors.push("index.mdに重複ID");
    for (const id of migratedIds) {
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
  }

  const symbolFiles = currentIds.map((id) => `${id}.md`);
  const references = scanReferences(storeDir, symbolFiles);
  const history = fs.existsSync(historyPath) ? fs.readFileSync(historyPath, "utf8") : "";
  const unresolved = references.filter(({ number }) => {
    const current = fs.existsSync(path.join(storeDir, `Anti-${number}.md`));
    const historical = new RegExp(`^${number}\\.`, "m").test(history);
    return !current && !historical;
  });
  if (unresolved.length) errors.push(`参照target未解決: ${[...new Set(unresolved.map(({ number }) => number))].join(",")}`);
  return errors;
}

function checkMigration({ compassPath, storeDir, historyPath, expected, liveStore = false }) {
  if (liveStore) return checkLiveStore({ storeDir, historyPath, expected });
  const errors = [];
  const compass = fs.readFileSync(compassPath, "utf8");
  if (sha256(compass) !== expected.expected_compass_sha256) errors.push("旧本体の非対象byteまたはAnti stubがpreimage期待値と不一致");
  const antiStart = compass.match(/^## Anti-direction$/m)?.index ?? -1;
  const tail = antiStart >= 0 ? compass.slice(antiStart) : "";
  const antiEnd = tail.match(/^## Invariants$/m)?.index ?? tail.length;
  if (/^\d+\.\s/m.test(tail.slice(0, antiEnd))) errors.push("旧本体にもAnti番号が残存（旧新重複）");

  for (const [file, hash] of Object.entries(expected.baseline_symbols)) {
    const fullPath = path.join(storeDir, file);
    if (!fs.existsSync(fullPath) || sha256(fs.readFileSync(fullPath, "utf8")) !== hash) {
      errors.push(`${file}: 第1波split symbolがpreimageから改変`);
    }
  }

  for (const [id, meta] of Object.entries(expected.symbols)) {
    const file = path.join(storeDir, `${id}.md`);
    if (!fs.existsSync(file)) {
      errors.push(`${id}: 実体ファイル欠落`);
      continue;
    }
    const content = fs.readFileSync(file, "utf8");
    if (!new RegExp(`^id: ${id}$`, "m").test(content)) errors.push(`${id}: frontmatter id/番号不一致`);
    if (!new RegExp(`^area: ${meta.area}$`, "m").test(content)) errors.push(`${id}: area不一致`);
    if (!new RegExp(`^status: ${meta.status}$`, "m").test(content)) errors.push(`${id}: status不一致`);
    if (sha256(block(content, "## Law", "## Annex")) !== meta.law_sha256) errors.push(`${id}: Lawがpreimageとbyte不一致`);
    if (sha256(block(content, "## Annex")) !== meta.annex_sha256) errors.push(`${id}: Annexがpreimageとbyte不一致`);
    if (sha256(content) !== meta.file_sha256) errors.push(`${id}: 許可された構造を含むfile全体が期待値と不一致`);
  }

  const groupsPath = path.join(storeDir, "groups.md");
  let groups = "";
  if (!fs.existsSync(groupsPath)) errors.push("Anti group metadata欠落");
  else {
    groups = fs.readFileSync(groupsPath, "utf8");
    if (sha256(groups) !== expected.expected_groups_sha256) errors.push("Anti group metadataがpreimage期待値と不一致");
    const marker = groups.indexOf("\n## Anti-direction groups");
    const baseline = marker >= 0 ? groups.slice(0, marker + 1) : groups;
    if (sha256(baseline.trimEnd() + "\n") !== expected.baseline_groups_sha256) errors.push("第1波group metadataが改変");
  }

  const indexPath = path.join(storeDir, "index.md");
  let index = "";
  if (!fs.existsSync(indexPath)) errors.push("index.md欠落");
  else {
    index = fs.readFileSync(indexPath, "utf8");
    if (sha256(index) !== expected.expected_index_sha256) errors.push("index.mdが派生期待値と不一致");
    const marker = index.indexOf("\n- Anti-");
    const baseline = marker >= 0 ? index.slice(0, marker + 1) : index;
    if (sha256(baseline) !== expected.baseline_index_sha256) errors.push("既存INV/DR index行が改変");
    const ids = index.split("\n").filter((line) => line.startsWith("- ")).map((line) => line.slice(2).split(" ")[0]);
    if (new Set(ids).size !== ids.length) errors.push("index.mdに重複ID");
    if (ids.length !== Object.keys(expected.baseline_symbols).length + Object.keys(expected.symbols).length) {
      errors.push("index.mdの全記号到達性が不足");
    }
  }

  // 親見出しだけでなく、raw preimageのHTML commentにある明示areaも独立に伝播確認する。
  // symbols.area/file hashと同じ生成経路へ寄せると、comment境界の見落としを期待値ごと固定してしまう。
  for (const segment of expected.area_segments ?? []) {
    const symbolLine = `- symbols: ${segment.symbols.join(", ")}`;
    if (!groups.includes(`${segment.source}\n${symbolLine}`)) {
      errors.push(`comment小区分がgroup metadataに位置保存されていない: ${segment.source}`);
    }
    for (const id of segment.symbols) {
      const content = fs.existsSync(path.join(storeDir, `${id}.md`))
        ? fs.readFileSync(path.join(storeDir, `${id}.md`), "utf8")
        : "";
      const fileArea = content.match(/^area: (.+)$/m)?.[1];
      const indexArea = index.match(new RegExp(`^- ${id} \\[領域: ([^\\]]+)\\]`, "m"))?.[1];
      if (fileArea !== segment.area || indexArea !== segment.area) {
        errors.push(`${id}: comment小区分areaがfrontmatter/indexへ未伝播`);
      }
    }
  }

  const baselineFiles = Object.keys(expected.baseline_symbols).filter((file) => fs.existsSync(path.join(storeDir, file)));
  const references = scanReferences(storeDir, baselineFiles);
  const referenceKey = (item) => `${item.file}|${item.section}|${item.number}`;
  if (references.map(referenceKey).sort().join("\n") !== expected.references.map(referenceKey).sort().join("\n")) {
    errors.push("INV/DRのAnti参照集合がpreimageから改変");
  }
  const history = fs.existsSync(historyPath) ? fs.readFileSync(historyPath, "utf8") : "";
  if (sha256(history) !== expected.baseline_history_sha256) errors.push("compass-historyがpreimageから改変");
  const unresolved = references.filter(({ number }) => {
    const current = fs.existsSync(path.join(storeDir, `Anti-${number}.md`));
    const historical = new RegExp(`^${number}\\.`, "m").test(history);
    return !current && !historical;
  });
  if (unresolved.length) errors.push(`参照target未解決: ${unresolved.map(({ number }) => number).join(",")}`);
  const targets = new Set(references.map(({ number }) => number));
  if (references.length !== expected.inventory.references || targets.size !== expected.inventory.reference_targets) {
    errors.push("参照214箇所/149 targetの全数が不一致");
  }
  return errors;
}

function writeMiniFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ip-anti-oracle-"));
  const storeDir = path.join(dir, "compass");
  fs.mkdirSync(storeDir);
  const compass = "# compass\n\n## Anti-direction\n\n分割収納へ移送済み。\n\n## Invariants\n\nstub\n";
  const inv = "---\nid: INV1\narea: always\nstatus: active\n---\n\n# INV1 Anti-direction 1 を避ける\n\n## Law\nAnti-direction 1 を守る。\n\n## Annex\n経緯。\n";
  const anti = (number, title) => `---\nid: Anti-${number}\narea: always\nstatus: active\n---\n\n# Anti-direction ${number} ${title}\n\n## Law\n${number}. **${title}** — byte同一。\n\n## Annex\n\n`;
  const anti1 = anti(1, "参照を壊す");
  const anti2 = anti(2, "意味を書き換える");
  const areaSource = "<!-- mini [領域: always] -->";
  const groups = `# groups\n\n## Anti-direction groups（canonical metadata）\n\n### Anti-direction（全作業共通）\n- area: always\n${areaSource}\n- symbols: Anti-1, Anti-2\n`;
  const index = "# index\n\n- INV1 [領域: always] active — 約束\n- Anti-1 [領域: always] active — 参照を壊す\n- Anti-2 [領域: always] active — 意味を書き換える\n";
  const history = "# history\n";
  fs.writeFileSync(path.join(dir, "intent-compass.md"), compass);
  fs.writeFileSync(path.join(dir, "compass-history.md"), history);
  fs.writeFileSync(path.join(storeDir, "INV1.md"), inv);
  fs.writeFileSync(path.join(storeDir, "Anti-1.md"), anti1);
  fs.writeFileSync(path.join(storeDir, "Anti-2.md"), anti2);
  fs.writeFileSync(path.join(storeDir, "groups.md"), groups);
  fs.writeFileSync(path.join(storeDir, "index.md"), index);
  return {
    compassPath: path.join(dir, "intent-compass.md"),
    historyPath: path.join(dir, "compass-history.md"),
    storeDir,
    expected: {
      expected_compass_sha256: sha256(compass),
      expected_groups_sha256: sha256(groups),
      expected_index_sha256: sha256(index),
      baseline_groups_sha256: sha256("# groups\n"),
      baseline_index_sha256: sha256("# index\n\n- INV1 [領域: always] active — 約束\n"),
      baseline_history_sha256: sha256(history),
      baseline_symbols: { "INV1.md": sha256(inv) },
      references: [{ file: "INV1.md", number: 1, section: "Heading" }, { file: "INV1.md", number: 1, section: "Law" }],
      inventory: { references: 2, reference_targets: 1 },
      area_segments: [{ source: areaSource, area: "always", symbols: ["Anti-1", "Anti-2"] }],
      symbols: {
        "Anti-1": { area: "always", status: "active", law_sha256: sha256("1. **参照を壊す** — byte同一。"), annex_sha256: sha256(""), file_sha256: sha256(anti1) },
        "Anti-2": { area: "always", status: "active", law_sha256: sha256("2. **意味を書き換える** — byte同一。"), annex_sha256: sha256(""), file_sha256: sha256(anti2) },
      },
    },
  };
}

test("Anti migration oracle: 正しいfixtureはgreen", () => {
  const fixture = writeMiniFixture();
  assert.deepEqual(checkMigration(fixture), []);
});

for (const [name, mutate, expectedError] of [
  ["Anti実体欠落", (f) => fs.rmSync(path.join(f.storeDir, "Anti-2.md")), /実体ファイル欠落/],
  ["番号IDずれ", (f) => { const p = path.join(f.storeDir, "Anti-1.md"); fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("id: Anti-1", "id: Anti-9")); }, /id\/番号不一致/],
  ["旧新重複", (f) => fs.writeFileSync(f.compassPath, fs.readFileSync(f.compassPath, "utf8").replace("## Invariants", "1. **残存** — duplicate。\n\n## Invariants")), /旧本体にもAnti番号が残存/],
  ["Law 1byte改変", (f) => { const p = path.join(f.storeDir, "Anti-1.md"); fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("byte同一", "Byte同一")); }, /Lawがpreimageとbyte不一致/],
  ["area欠落", (f) => { const p = path.join(f.storeDir, "Anti-1.md"); fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("area: always\n", "")); }, /area不一致/],
  ["status欠落", (f) => { const p = path.join(f.storeDir, "Anti-1.md"); fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("status: active\n", "")); }, /status不一致/],
  ["group欠落", (f) => fs.writeFileSync(path.join(f.storeDir, "groups.md"), "# groups\n"), /Anti group metadataがpreimage期待値と不一致/],
  ["参照target欠落", (f) => fs.rmSync(path.join(f.storeDir, "Anti-1.md")), /参照target未解決/],
  ["既存index行改変", (f) => { const p = path.join(f.storeDir, "index.md"); fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("— 約束", "— 改変")); }, /既存INV\/DR index行が改変/],
  ["既存INV file改変", (f) => fs.appendFileSync(path.join(f.storeDir, "INV1.md"), "改変\n"), /第1波split symbolがpreimageから改変/],
  ["comment小区分area未伝播", (f) => {
    const antiPath = path.join(f.storeDir, "Anti-1.md");
    const anti = fs.readFileSync(antiPath, "utf8").replace("area: always", "area: 派生");
    fs.writeFileSync(antiPath, anti);
    f.expected.symbols["Anti-1"].area = "派生";
    f.expected.symbols["Anti-1"].file_sha256 = sha256(anti);
    const indexPath = path.join(f.storeDir, "index.md");
    const index = fs.readFileSync(indexPath, "utf8").replace("Anti-1 [領域: always]", "Anti-1 [領域: 派生]");
    fs.writeFileSync(indexPath, index);
    f.expected.expected_index_sha256 = sha256(index);
  }, /comment小区分areaがfrontmatter\/indexへ未伝播/],
]) {
  test(`Anti migration oracle 判別: ${name}でred`, () => {
    const fixture = writeMiniFixture();
    mutate(fixture);
    const errors = checkMigration(fixture);
    assert.ok(errors.some((error) => expectedError.test(error)), errors.join("\n"));
  });
}

test("dogfood: 移送済み全Antiが現役分割収納で構造整合し、全参照が解決する", () => {
  assert.equal(manifest.inventory.Anti, 514);
  assert.equal(manifest.inventory.groups, 67);
  assert.equal(manifest.inventory.references, 214);
  assert.equal(manifest.inventory.reference_targets, 149);
  assert.equal(manifest.inventory.law_references, 15);
  const errors = checkMigration({
    compassPath: path.join(root, ".intent/intent-compass.md"),
    historyPath: path.join(root, ".intent/compass-history.md"),
    storeDir: path.join(root, ".intent/compass"),
    expected: manifest,
    liveStore: true,
  });
  assert.deepEqual(errors, [], errors.slice(0, 30).join("\n"));
});

test("post-migration oracle: 既存Law更新と後続記号を許容し、参照切れはred", () => {
  const fixture = writeMiniFixture();
  const invPath = path.join(fixture.storeDir, "INV1.md");
  fs.writeFileSync(invPath, fs.readFileSync(invPath, "utf8").replace("経緯。", "承認済みの新しい経緯。"));

  const anti3 = `---\nid: Anti-3\narea: always\nstatus: active\n---\n\n# Anti-direction 3 後続追加\n\n## Law\n3. **後続追加** — current。\n\n## Annex\n\n`;
  fs.writeFileSync(path.join(fixture.storeDir, "Anti-3.md"), anti3);
  fs.appendFileSync(path.join(fixture.storeDir, "index.md"), "- Anti-3 [領域: always] active — 後続追加\n");
  assert.deepEqual(checkMigration({ ...fixture, liveStore: true }), []);

  fs.writeFileSync(path.join(fixture.storeDir, "Anti-3.md"), anti3.replace("## Law", "## Rule"));
  const malformedLaterSymbol = checkMigration({ ...fixture, liveStore: true });
  assert.ok(
    malformedLaterSymbol.some((error) => /Anti-3: Law欠落/.test(error)),
    malformedLaterSymbol.join("\n"),
  );
  fs.writeFileSync(path.join(fixture.storeDir, "Anti-3.md"), anti3);

  fs.writeFileSync(invPath, fs.readFileSync(invPath, "utf8").replaceAll("Anti-direction 1", "Anti-direction 99"));
  const broken = checkMigration({ ...fixture, liveStore: true });
  assert.ok(broken.some((error) => /参照target未解決: 99/.test(error)), broken.join("\n"));
});
