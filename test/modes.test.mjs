// 新モード定義 (refactor / behavior-unknown, ja/en) の構造整合と algo 参照一致の検証
// (node:test 標準・依存ゼロ)。Req 1.4 / 2.4 / 3.5 / 7.1。
//
// 検証する3領域:
//   1. モード定義スキーマ整合: 新モードが standard と同じ必須節 (algo 組み合わせ表 +
//      「適合する状況」節) を、各言語の見出しで持つ。
//   2. algo 名 ↔ ファイル実在: モード定義の algo 組み合わせ表が参照する algo 名が、
//      同一言語ツリーの skill `rules/` 配下に実在するファイルへ解決できる。
//   3. 新 algo rules の実在: algo-drift-analysis / algo-migration-slicing /
//      algo-characterization-test が ja/en の `intent-*` skill の `rules/` 配下に実在する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

const LANGS = ["ja", "en"];
const NEW_MODES = ["refactor", "behavior-unknown"];

// 言語ごとの必須節見出し。standard.md から動的に導出する (ハードコードしない) ため、
// standard.md に必ず存在すると分かっている「節の冒頭マーカー」だけ言語別に持つ。
// - algo 組み合わせ表の節: ja「## このモードが組み合わせるアルゴリズム」/ en「## The algorithms this mode combines」
// - 適合する状況の節:       ja「## 適合する状況」/ en「## Applicable situations」
const SECTION_MARKERS = {
  ja: {
    algoTable: "## このモードが組み合わせるアルゴリズム",
    applicable: "## 適合する状況",
  },
  en: {
    algoTable: "## The algorithms this mode combines",
    applicable: "## Applicable situations",
  },
};

function modePath(lang, mode) {
  return path.join(TEMPLATES, lang, "intent", "modes", `${mode}.md`);
}

function rulesDir(lang, skill) {
  return path.join(TEMPLATES, lang, "claude", "skills", skill, "rules");
}

// 同一言語ツリーの全 skill rules 配下に実在する rule ファイル名 (拡張子なし) の集合。
// 例: "algo-gore-lite", "algo-drift-analysis", "algo-qoc", "map-cc-sdd" 等。
function existingRuleStems(lang) {
  const skillsRoot = path.join(TEMPLATES, lang, "claude", "skills");
  const stems = new Set();
  for (const skill of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const rd = rulesDir(lang, skill.name);
    if (!fs.existsSync(rd)) continue;
    for (const f of fs.readdirSync(rd)) {
      if (f.endsWith(".md")) stems.add(f.replace(/\.md$/, ""));
    }
  }
  return stems;
}

// モード定義の algo 組み合わせ表 (先頭から「適合する状況」節までの本文) に登場する
// 太字 algo 表示名 (**Name**) を抽出し、参照ファイル名 (拡張子なし) へ正規化する。
//   - "map-cc-sdd"        -> "map-cc-sdd"        (map-* はそのまま)
//   - "GORE-lite"         -> "algo-gore-lite"
//   - "Drift Analysis"    -> "algo-drift-analysis"
//   - "Migration Slicing" -> "algo-migration-slicing"
// 補足語 (例: 括弧書きの説明) は太字の外なので拾わない。
function referencedRuleStems(content) {
  const stems = new Set();
  const boldRe = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = boldRe.exec(content)) !== null) {
    const raw = m[1].trim();
    if (raw.startsWith("map-")) {
      stems.add(raw); // map-cc-sdd 等はそのままファイル名
      continue;
    }
    // 表示名を kebab-case 化して algo- を前置する。
    const kebab = raw
      .toLowerCase()
      .replace(/[()]/g, " ")
      .trim()
      .replace(/\s+/g, "-");
    stems.add(`algo-${kebab}`);
  }
  return stems;
}

// algo 組み合わせ表の節本文 (algoTable 見出し以降、次の `## ` 見出しまで) を切り出す。
// 太字 algo 名はこの表の中に集中しているため、参照抽出はこの範囲に限定する。
function algoTableSection(content, lang) {
  const marker = SECTION_MARKERS[lang].algoTable;
  const start = content.indexOf(marker);
  if (start < 0) return "";
  const after = content.slice(start + marker.length);
  const nextHeading = after.search(/\n## /);
  return nextHeading < 0 ? after : after.slice(0, nextHeading);
}

// ---- 領域1: モード定義スキーマ整合 (standard と同じ必須節を持つ) ----

// 前提: standard.md が想定見出しを実際に持つ (マーカー導出の妥当性を固定)。
for (const lang of LANGS) {
  test(`schema(${lang}): standard.md が必須節マーカーを持つ (導出元の妥当性)`, () => {
    const std = fs.readFileSync(modePath(lang, "standard"), "utf8");
    assert.ok(
      std.includes(SECTION_MARKERS[lang].algoTable),
      `standard.md(${lang}) に algo 表見出しがある`,
    );
    assert.ok(
      std.includes(SECTION_MARKERS[lang].applicable),
      `standard.md(${lang}) に適合状況見出しがある`,
    );
  });
}

for (const lang of LANGS) {
  for (const mode of NEW_MODES) {
    test(`schema(${lang}): ${mode}.md が standard と同じ必須節 (algo 表 + 適合状況) を持つ`, () => {
      const p = modePath(lang, mode);
      assert.ok(fs.existsSync(p), `モード定義が実在する: ${p}`);
      const content = fs.readFileSync(p, "utf8");

      // standard と同一言語の見出しを必須として要求する。
      assert.ok(
        content.includes(SECTION_MARKERS[lang].algoTable),
        `${mode}.md(${lang}) に algo 組み合わせ表の見出しがある`,
      );
      assert.ok(
        content.includes(SECTION_MARKERS[lang].applicable),
        `${mode}.md(${lang}) に「適合する状況」節の見出しがある`,
      );

      // algo 組み合わせ表には実体 (フェーズ→algo の表行) がある。
      const tableSection = algoTableSection(content, lang);
      assert.ok(
        tableSection.includes("|") && /\*\*[^*]+\*\*/.test(tableSection),
        `${mode}.md(${lang}) の algo 表に表行と太字 algo 名がある`,
      );

      // 適合状況節に少なくとも1項目 (箇条書き) がある。
      const applIdx = content.indexOf(SECTION_MARKERS[lang].applicable);
      const applBody = content.slice(applIdx);
      assert.ok(
        /\n- /.test(applBody),
        `${mode}.md(${lang}) の適合状況節に箇条書き項目がある`,
      );
    });
  }
}

// ---- 領域2: algo 名 ↔ ファイル実在 (参照する algo 名が実在 rules に解決する) ----
// これが Req 1.4 / 2.4 の核心: モード定義が存在しない algo を参照していないこと。

for (const lang of LANGS) {
  for (const mode of NEW_MODES) {
    test(`algo-resolution(${lang}): ${mode}.md の参照 algo 名がすべて実在 rules ファイルへ解決する`, () => {
      const content = fs.readFileSync(modePath(lang, mode), "utf8");
      const stems = existingRuleStems(lang);

      const tableSection = algoTableSection(content, lang);
      const referenced = referencedRuleStems(tableSection);

      // 参照が空 (太字 algo 名を1つも検出できない) なら、表の検出ロジックか定義が壊れている。
      assert.ok(referenced.size > 0, `${mode}.md(${lang}) の algo 表から参照 algo を抽出できる`);

      const unresolved = [...referenced].filter((s) => !stems.has(s));
      assert.deepEqual(
        unresolved,
        [],
        `${mode}.md(${lang}) が参照する algo が rules/ に実在しない: ${unresolved.join(", ")}` +
          ` (実在 stems: ${[...stems].sort().join(", ")})`,
      );
    });
  }
}

// 新モードが実際に新 algo を参照していることの最小保証 (表が空配線でない証拠)。
test("algo-resolution: refactor は drift-analysis と migration-slicing を, behavior-unknown は characterization-test を参照する", () => {
  for (const lang of LANGS) {
    const refStems = referencedRuleStems(algoTableSection(fs.readFileSync(modePath(lang, "refactor"), "utf8"), lang));
    assert.ok(refStems.has("algo-drift-analysis"), `refactor(${lang}) が algo-drift-analysis を参照`);
    assert.ok(refStems.has("algo-migration-slicing"), `refactor(${lang}) が algo-migration-slicing を参照`);

    const behStems = referencedRuleStems(
      algoTableSection(fs.readFileSync(modePath(lang, "behavior-unknown"), "utf8"), lang),
    );
    assert.ok(behStems.has("algo-characterization-test"), `behavior-unknown(${lang}) が algo-characterization-test を参照`);
    assert.ok(behStems.has("algo-example-mapping"), `behavior-unknown(${lang}) が algo-example-mapping を参照`);
  }
});

// ---- 領域3: 新 algo rules の実在 (intent-* skill の rules/ 配下, ja/en) ----
// Req 3.5: ファイル名・配置が cc-sdd の kiro-* と衝突しない (intent-* 配下) こと。

const NEW_ALGO_RULES = [
  { skill: "intent-discover", file: "algo-drift-analysis.md" },
  { skill: "intent-packets", file: "algo-migration-slicing.md" },
  { skill: "intent-packets", file: "algo-characterization-test.md" },
];

for (const lang of LANGS) {
  for (const { skill, file } of NEW_ALGO_RULES) {
    test(`new-algo(${lang}): ${file} が ${skill}/rules/ 配下に実在し intent-* 命名である`, () => {
      const p = path.join(rulesDir(lang, skill), file);
      assert.ok(fs.existsSync(p), `新 algo rule が実在する: ${p}`);

      // intent-* skill 配下であり、kiro-* と衝突しない。
      assert.ok(
        skill.startsWith("intent-"),
        `${file}(${lang}) は intent-* skill 配下に置かれる`,
      );
      assert.ok(
        !skill.startsWith("kiro-"),
        `${file}(${lang}) は kiro-* skill 配下に置かれない`,
      );

      // パスが templates/<lang>/claude/skills/intent-*/rules/ である (配置規約)。
      const expectedUnder = path.join(
        TEMPLATES,
        lang,
        "claude",
        "skills",
      );
      assert.ok(p.startsWith(expectedUnder + path.sep), `配置が templates/${lang}/claude/skills/ 配下`);

      // 中身が空でない (プレースホルダのみでないことの最小保証)。
      const body = fs.readFileSync(p, "utf8").trim();
      assert.ok(body.length > 0, `${file}(${lang}) が非空`);
    });
  }
}
