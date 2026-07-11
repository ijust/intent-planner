// compass 記号の分割収納（canonical-norm-vessel hqpv）の判別検証。
// 検査するもの:
//   (a) 器の scaffold（templates ja/en + dogfood）が存在し、規約の実質（1記号1ファイル・採番=ファイル作成・
//       law/annex・派生 index・恒久フォールバック）を持つ
//   (b) 読み手（compass/constraint-surfacing/status/validate/rootdoc）と書き手（compass）が
//       新旧両対応の読み順・起案規約を持つ（分割収納があれば index→Law・無ければ旧本体）
//   (c) 参照保全オラクル: 収納の規約（id↔ファイル名・最小スキーマ・Law 節・index↔実体の整合）を
//       機械照合する checker が、壊れた fixture を赤にできる（判別力・Anti 406）
//   (d) 挙動保持: 収納が空（README のみ）の dogfood で checker が沈黙し、旧本体が全記号を保持する
// checker は規約の機械的整形検査であり test/ に閉じる（製品 CLI へ移さない＝INV2/A1）。
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

// ---- 参照保全 checker（規約の正本は scaffold README・ここはその機械照合） ----
const SYMBOL_FILE = /^(INV\d+|DR\d+|C\d+|A\d+|Anti-\d+)\.md$/;
function checkStore(dir) {
  const errors = [];
  if (!fs.existsSync(dir)) return { present: false, symbols: 0, errors };
  const files = fs.readdirSync(dir).filter((f) => SYMBOL_FILE.test(f));
  const indexPath = path.join(dir, "index.md");
  const indexIds = fs.existsSync(indexPath)
    ? fs
        .readFileSync(indexPath, "utf8")
        .split("\n")
        .filter((l) => l.startsWith("- "))
        .map((l) => l.slice(2).split(" ")[0])
    : [];
  for (const f of files) {
    const id = f.replace(/\.md$/, "");
    const c = fs.readFileSync(path.join(dir, f), "utf8");
    const fm = c.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) {
      errors.push(`${f}: frontmatter なし`);
      continue;
    }
    if (!new RegExp(`^id: ${id}$`, "m").test(fm[1])) errors.push(`${f}: id がファイル名と不一致`);
    if (!/^area: .+$/m.test(fm[1])) errors.push(`${f}: area なし`);
    if (!/^status: .+$/m.test(fm[1])) errors.push(`${f}: status なし`);
    if (!/^## Law$/m.test(c)) errors.push(`${f}: Law 節なし`);
    if (!indexIds.includes(id)) errors.push(`${f}: index.md に行が無い`);
  }
  for (const id of indexIds) {
    if (!files.includes(`${id}.md`)) errors.push(`index.md: ${id} の実体ファイルが無い`);
  }
  return { present: true, symbols: files.length, errors };
}

function makeFixtureStore(mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ip-compass-store-"));
  fs.writeFileSync(
    path.join(dir, "INV1.md"),
    "---\nid: INV1\narea: 派生\nstatus: active\n---\n\n# INV1 例の約束\n\n## Law\n例の規範本文。\n\n## Annex\n経緯。\n",
  );
  fs.writeFileSync(path.join(dir, "index.md"), "# index（派生）\n\n- INV1 [領域: 派生] active — 例の約束\n");
  if (mutate) mutate(dir);
  return dir;
}

// ---- (a) scaffold ----
for (const [rel, lang] of [
  ["templates/ja/intent/compass/README.md", "ja"],
  ["templates/en/intent/compass/README.md", "en"],
  [".intent/compass/README.md", "ja"],
]) {
  test(`store scaffold: ${rel} が規約の実質を持つ`, () => {
    const c = read(rel);
    assert.match(c, lang === "ja" ? /1記号=1ファイル/ : /one symbol = one file/, "1記号1ファイル");
    assert.match(c, lang === "ja" ? /採番の宣言/ : /numbering declaration/, "採番=ファイル作成");
    assert.match(c, /## Law/, "law 層");
    assert.match(c, /## Annex/, "annex 層");
    assert.match(c, lang === "ja" ? /派生キャッシュ/ : /derived cache/, "index は派生");
    assert.match(c, lang === "ja" ? /恒久フォールバック|旧経路は削除しません/ : /permanent fallback/, "旧経路の恒久フォールバック");
    assert.match(c, /status: active/, "最小スキーマ status");
    assert.match(c, /area:/, "最小スキーマ area");
  });
}

// ---- (b) 読み手・書き手の結線（新旧両対応の実質） ----
// law 層まで読む読み手（compass 自己参照・定石照合・rootdoc の実装前 pull）
const LAW_READERS = [
  ["templates/ja/claude/skills/intent-compass/SKILL.md", "ja"],
  ["templates/ja/codex/skills/intent-compass/SKILL.md", "ja"],
  ["templates/en/claude/skills/intent-compass/SKILL.md", "en"],
  ["templates/en/codex/skills/intent-compass/SKILL.md", "en"],
  [".claude/skills/intent-compass/SKILL.md", "ja"],
  ["templates/ja/claude/skills/intent-compass/rules/constraint-surfacing.md", "ja"],
  ["templates/ja/codex/skills/intent-compass/rules/constraint-surfacing.md", "ja"],
  ["templates/en/claude/skills/intent-compass/rules/constraint-surfacing.md", "en"],
  ["templates/en/codex/skills/intent-compass/rules/constraint-surfacing.md", "en"],
  [".claude/skills/intent-compass/rules/constraint-surfacing.md", "ja"],
  ["templates/ja/agents/claude/CLAUDE_intent.md", "ja"],
  ["templates/ja/agents/codex/AGENTS.md", "ja"],
  ["templates/ja/agents/gemini/GEMINI_intent.md", "ja"],
  ["templates/en/agents/claude/CLAUDE_intent.md", "en"],
  ["templates/en/agents/codex/AGENTS.md", "en"],
  ["templates/en/agents/gemini/GEMINI_intent.md", "en"],
  ["CLAUDE_intent.md", "ja"],
  ["AGENTS.md", "ja"],
];
for (const [rel, lang] of LAW_READERS) {
  test(`store readers(law): ${rel} が index→Law の読み順と旧経路フォールバックを持つ`, () => {
    const c = read(rel);
    assert.match(c, /\.intent\/compass\//, "分割収納のパス");
    assert.match(c, /index\.md/, "index 経由の読み順");
    assert.match(c, /## Law|`## Law`/, "law 層を読む");
    assert.match(
      c,
      lang === "ja" ? /無ければ|無い記号は|在れば/ : /otherwise|for symbols not in the store|when present|exists/i,
      "旧経路フォールバック（新旧両対応）",
    );
  });
}
// index の見取りまでの読み手（status）
for (const [rel, lang] of [
  ["templates/ja/claude/skills/intent-status/SKILL.md", "ja"],
  ["templates/ja/codex/skills/intent-status/SKILL.md", "ja"],
  ["templates/en/claude/skills/intent-status/SKILL.md", "en"],
  ["templates/en/codex/skills/intent-status/SKILL.md", "en"],
  [".claude/skills/intent-status/SKILL.md", "ja"],
]) {
  test(`store readers(index): ${rel} が分割収納 index の見取りとフォールバックを持つ`, () => {
    const c = read(rel);
    assert.match(c, /\.intent\/compass\//, "分割収納のパス");
    assert.match(c, /index\.md/, "index の見取り");
    assert.match(c, lang === "ja" ? /無ければ従来どおり/ : /otherwise as before/i, "旧経路フォールバック");
  });
}
// 実在照合の読み手（validate＝新旧どちらかで到達すれば実在）
for (const [rel, lang] of [
  ["templates/ja/claude/skills/intent-validate/SKILL.md", "ja"],
  ["templates/ja/codex/skills/intent-validate/SKILL.md", "ja"],
  ["templates/en/claude/skills/intent-validate/SKILL.md", "en"],
  ["templates/en/codex/skills/intent-validate/SKILL.md", "en"],
  [".claude/skills/intent-validate/SKILL.md", "ja"],
]) {
  test(`store readers(existence): ${rel} が実在照合の新旧両対応を持つ`, () => {
    const c = read(rel);
    assert.match(c, /\.intent\/compass\//, "分割収納のパス");
    assert.match(
      c,
      lang === "ja" ? /どちらかで到達できれば実在/ : /reachable in either the split store/,
      "新旧どちらか到達で実在（dual-path）",
    );
  });
}
// 書き手（compass SKILL）: 新規記号の起案先とファイル作成=採番
for (const rel of [
  "templates/ja/claude/skills/intent-compass/SKILL.md",
  "templates/ja/codex/skills/intent-compass/SKILL.md",
  ".claude/skills/intent-compass/SKILL.md",
]) {
  test(`store writer: ${rel} が新規記号の分割収納起案と採番宣言を持つ`, () => {
    const c = read(rel);
    assert.match(c, /ファイル作成＝採番宣言/, "採番=ファイル作成（DR131）");
    assert.match(c, /`index\.md` を再生成/, "index 再生成の随伴");
  });
}
for (const rel of [
  "templates/en/claude/skills/intent-compass/SKILL.md",
  "templates/en/codex/skills/intent-compass/SKILL.md",
]) {
  test(`store writer: ${rel} が新規記号の分割収納起案と採番宣言を持つ`, () => {
    const c = read(rel);
    assert.match(c, /creating the file = the numbering declaration/, "採番=ファイル作成（DR131）");
    assert.match(c, /regenerate `index\.md`/, "index 再生成の随伴");
  });
}

// ---- (c) E2E と判別力（変異で赤くなる checker・Anti 406） ----
test("store E2E: 正しい fixture（記号1件+index）で checker が緑", () => {
  const dir = makeFixtureStore();
  const r = checkStore(dir);
  assert.equal(r.present, true);
  assert.equal(r.symbols, 1);
  assert.deepEqual(r.errors, []);
  // pull: index の行 → 実体の Law が引ける
  const law = fs.readFileSync(path.join(dir, "INV1.md"), "utf8").split("## Law")[1];
  assert.match(law, /例の規範本文/);
});
test("store 判別: index が指す実体ファイルの欠落で赤", () => {
  const dir = makeFixtureStore((d) => fs.rmSync(path.join(d, "INV1.md")));
  assert.ok(checkStore(dir).errors.some((e) => e.includes("実体ファイルが無い")));
});
test("store 判別: 実体はあるが index 行が無い（dangling）で赤", () => {
  const dir = makeFixtureStore((d) => fs.writeFileSync(path.join(d, "index.md"), "# index（派生）\n"));
  assert.ok(checkStore(dir).errors.some((e) => e.includes("index.md に行が無い")));
});
test("store 判別: Law 節の欠落で赤", () => {
  const dir = makeFixtureStore((d) =>
    fs.writeFileSync(path.join(d, "INV1.md"), "---\nid: INV1\narea: 派生\nstatus: active\n---\n\n本文のみ。\n"),
  );
  assert.ok(checkStore(dir).errors.some((e) => e.includes("Law 節なし")));
});
test("store 判別: frontmatter id とファイル名の不一致で赤", () => {
  const dir = makeFixtureStore((d) =>
    fs.writeFileSync(
      path.join(d, "INV1.md"),
      "---\nid: INV2\narea: 派生\nstatus: active\n---\n\n## Law\nずれ。\n",
    ),
  );
  assert.ok(checkStore(dir).errors.some((e) => e.includes("id がファイル名と不一致")));
});

// ---- (d) 挙動保持（behavior-preserving）と dogfood の参照保全 ----
test("store fallback: 収納ディレクトリ不在の fixture で checker は present=false（旧経路のまま）", () => {
  const r = checkStore(path.join(os.tmpdir(), "ip-compass-store-not-exist-xyz"));
  assert.equal(r.present, false);
  assert.deepEqual(r.errors, []);
});
test("dogfood: .intent/compass/ は整合（現状は器のみ=記号0でも緑・移送後も同じ検査が守る）", () => {
  const r = checkStore(path.join(root, ".intent/compass"));
  assert.equal(r.present, true);
  assert.deepEqual(r.errors, []);
});
test("dogfood 参照保全: active packet の parent_intents 記号が新旧どちらかの収納から到達可能", () => {
  const activeDir = path.join(root, ".intent/packets/active");
  // C/A 記号の正本は tree・INV/DR/Anti の正本は compass。到達性は両正本+分割収納で判定する。
  const oldBody = read(".intent/intent-compass.md") + "\n" + read(".intent/intent-tree.md");
  const storeDir = path.join(root, ".intent/compass");
  const storeFiles = fs.existsSync(storeDir) ? fs.readdirSync(storeDir).filter((f) => SYMBOL_FILE.test(f)) : [];
  const missing = [];
  for (const f of fs.readdirSync(activeDir).filter((f) => f.endsWith(".md") && f !== "README.md")) {
    const fm = fs.readFileSync(path.join(activeDir, f), "utf8").match(/^parent_intents: \[(.*)\]$/m);
    if (!fm) continue;
    for (const raw of fm[1].split(",").map((s) => s.trim())) {
      if (!/^(INV|DR|C|A)\d+$/.test(raw)) continue; // L0/L1-a/C-norm1 等の非記号トークンは対象外
      const inStore = storeFiles.includes(`${raw}.md`);
      const inOld = new RegExp(`(^|[^0-9A-Za-z])${raw}([^0-9]|$)`, "m").test(oldBody);
      if (!inStore && !inOld) missing.push(`${f}: ${raw}`);
    }
  }
  assert.deepEqual(missing, [], `到達不能の記号参照: ${missing.join(", ")}`);
});
