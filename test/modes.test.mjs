// 新モード定義 (refactor / behavior-unknown / feature-growth, ja/en) の構造整合と algo 参照一致の検証
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
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

const LANGS = ["ja", "en"];
const NEW_MODES = ["refactor", "behavior-unknown", "feature-growth"];

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

// feature-growth が新 algo 2種を実際に参照していることの明示保証 (表が空配線でない証拠)。
// 「全参照が実在に解決する」検証だけでは、表から両 algo が漏れた場合に検出できない。
test("algo-resolution: feature-growth は impact-analysis と additive-slicing を参照する", () => {
  for (const lang of LANGS) {
    const fgStems = referencedRuleStems(
      algoTableSection(fs.readFileSync(modePath(lang, "feature-growth"), "utf8"), lang),
    );
    assert.ok(fgStems.has("algo-impact-analysis"), `feature-growth(${lang}) が algo-impact-analysis を参照`);
    assert.ok(fgStems.has("algo-additive-slicing"), `feature-growth(${lang}) が algo-additive-slicing を参照`);
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

// ---- 領域4: modes deliverable の en/ja パリティ & pack 同梱 (Req 6.1/6.2/6.4/7.2/7.5) ----
//
// 一般的な「en/ja 集合 1:1 一致」(structure-pack.test.mjs) と
// 「pack に templates/ja・en 同梱・test 除外」(同) は既に存在する。ここは重複を避け、
// 各 spec が追加した「特定の成果物ファイル」が両言語ツリーと pack の双方に確実に含まれること
// (= 各 spec の成果物への traceable な検証) に焦点を当てる。集合一致テストは新ファイルを
// 「集合の一員」として暗黙にしか担保しないため、ファイル名を明示してロックする。

// modes spec の 5 ファイル + feature-growth spec の 3 ファイルの「言語ルート相対パス」(posix 区切り)。
// 各言語ツリー templates/<lang>/ 配下に同名で存在し、pack に同梱されるべき集合。
const NEW_DELIVERABLE_RELS = [
  "intent/modes/refactor.md",
  "intent/modes/behavior-unknown.md",
  "claude/skills/intent-discover/rules/algo-drift-analysis.md",
  "claude/skills/intent-packets/rules/algo-migration-slicing.md",
  "claude/skills/intent-packets/rules/algo-characterization-test.md",
  "intent/modes/feature-growth.md",
  "claude/skills/intent-discover/rules/algo-impact-analysis.md",
  "claude/skills/intent-packets/rules/algo-additive-slicing.md",
];

// 領域4-1: 新 deliverable が ja/en 両ツリーに 1:1 でミラーされている (Req 6.1/6.2/7.2)。
// (新モード定義・新 algo rules が片側言語に欠落していれば必ず落ちる。)
test("modes-parity: 各 spec の新 deliverable が templates/ja と templates/en の両方に存在する", () => {
  for (const rel of NEW_DELIVERABLE_RELS) {
    for (const lang of LANGS) {
      const p = path.join(TEMPLATES, lang, ...rel.split("/"));
      assert.ok(
        fs.existsSync(p),
        `本 spec の新ファイルが ${lang} ツリーに存在する: templates/${lang}/${rel}`,
      );
    }
  }
});

// 領域4-2: npm pack の成果物に、新 deliverable が ja・en 両方の配下で同梱され、test/ は含まれない
// (Req 6.4/7.5)。実際に npm pack を起動し files[].path を検査する (ハードコードではない)。
test("modes-pack: npm pack 成果物に各 spec の新 deliverable が templates/ja・en 両方含まれ test/ を含まない", () => {
  // --dry-run --json は files[].path を構造化 JSON で STDOUT に返す。
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  const parsed = JSON.parse(raw);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  assert.ok(entry && Array.isArray(entry.files), "pack JSON に files 配列がある");

  // path を posix 区切りへ正規化した集合 (高速な includes 判定のため Set 化)。
  const packed = new Set(entry.files.map((f) => f.path.split(path.sep).join("/")));

  // 新 deliverable が ja・en 両方の配下で同梱されている。
  for (const rel of NEW_DELIVERABLE_RELS) {
    for (const lang of LANGS) {
      const expected = `templates/${lang}/${rel}`;
      assert.ok(
        packed.has(expected),
        `pack 成果物に新ファイルが同梱される: ${expected}` +
          ` (packed templates: ${[...packed].filter((p) => p.startsWith("templates/")).join(", ")})`,
      );
    }
  }

  // test/ 配下は配布物に含めない (回帰時に新ファイル同梱と一緒に検出できるよう同居)。
  const testPaths = [...packed].filter((p) => p.startsWith("test/"));
  assert.deepEqual(testPaths, [], `pack 成果物に test/ 配下を含まない: ${testPaths.join(", ")}`);
});
