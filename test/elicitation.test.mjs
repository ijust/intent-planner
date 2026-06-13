// elicitation (intent-planner-elicitation) の構造検証 (task 6.1)。
// node:test 標準・依存ゼロ (INV2)。
//
// 範囲分担 (重複回避):
//   - rules の claude/codex byte 等価は agent-rules-parity が、scaffold の
//     claude/codex byte 等価は agents が、algo-qoc.md の golden hash は
//     standard-invariance が担う。本ファイルはそれらに依存せず、追加された
//     発問・recap・逃がし・転記・theory.md 追記の「内容の存在」を検査する。
//   - byte 等価が別テストで担保されるため、rules / SKILL は **claude 面のみ**を
//     検査し、codex 面の追随はパリティテストに委ねる (review-adoption の流儀)。
//     scaffold (intent-compass.md / intent-tree.md) と theory.md は agent 非依存
//     の単一ファイルなのでそのまま検査する。theory.md は ja のみの単一ファイル
//     (docs/theory.md。en 変種は存在しない)。
//
//   検査項目 (design Testing Strategy「Unit Tests（防護テスト）」由来):
//     1. algo-qoc.md: 固定カテゴリ枠 (6カテゴリ語)・動的例示の指示・fallback (枠のみ)・
//        否定形発問・steering 配置推奨・omission recap・逃がし (1.1, 2.1, 2.4, 3.1, 5.1, 6.1)
//     2. designer-questions.md: 手順2.5 (off でも発火)・改稿済み off 節・手順6.5 (4.1, 4.2, 5.2)
//     3. first-packet.md: 優先順位・トレードオフ発問・「上書きしない」方針の保持 (4.3)
//     4. intent-packets SKILL: 保留 packet 固有制約の Safety 転記手順 (5.3)
//     5. docs/theory.md: 発問設計の解説見出し・対応表行・参考文献 (7.1, 7.2, 7.3)
//     6. 後方互換: 固定例示文字列 (具体 SQL・特定技術名) が scaffold/rules に埋め込まれて
//        いない (動的例示=固定文字列禁止)。追記が既存セクション内で、新規必須セクションを
//        作っていない (旧 scaffold 非破壊) (6.4, 8.4)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];

function ruleFile(lang, skill, rule) {
  return path.join(TEMPLATES, lang, "claude", "skills", skill, "rules", rule);
}

function skillFile(lang, skill) {
  return path.join(TEMPLATES, lang, "claude", "skills", skill, "SKILL.md");
}

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

// markdown テキストから見出し (#〜######) を順序付きで抽出する。fenced code block 内は除外。
function extractHeadings(text) {
  const headings = [];
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,6}) /);
    if (m) headings.push({ level: m[1].length, text: line.trim() });
  }
  return headings;
}

// ---- 項目1: algo-qoc.md の発問・recap・逃がし (1.1, 2.1, 2.4, 3.1, 5.1, 6.1) ----
// 固定カテゴリ枠は6カテゴリの語が揃うことを、動的例示は「文脈から生成」「2〜3」「非網羅」を、
// 否定形は損失シナリオの言い回しを、逃がしは「該当なし/不明/後で確認」と Open Questions を要求する。

const ALGO_QOC = {
  ja: {
    // 固定カテゴリ枠 (6カテゴリ): 重要度順の各カテゴリ語。
    categories: [
      "個人情報",
      "外部依存",
      "運用",
      "セキュリティ",
      "性能",
      "不変条件",
    ],
    // 動的例示の指示。固定例示文字列を埋め込まないことの明示。
    dynamicExample: ["文脈", "2〜3", "網羅ではない", "固定の例示文字列を埋め込まない"],
    // fallback: 文脈から例を生成できない場合は枠 (見出し) のみ。
    fallback: ["具体例を生成できない", "カテゴリの枠", "fallback"],
    // 否定形 (失敗前提) の発問。
    negation: ["失敗前提", "否定形", "完全に無視したら最悪"],
    // steering 配置推奨。
    steering: "/kiro-steering-custom",
    // omission recap (抜け・過剰の確認)。
    recap: ["omission recap", "抜け", "過剰", "要約"],
    // 逃がし: 3分岐と Open Questions。
    escape: ["該当なし／不明／後で確認", "Open Questions"],
  },
  en: {
    categories: [
      "personal information",
      "External dependenc",
      "Operations",
      "Security",
      "Performance",
      "invariant",
    ],
    dynamicExample: ["context", "2–3", "not exhaustive", "do not embed fixed example strings"],
    fallback: ["no concrete examples can be generated", "category frame", "fallback"],
    negation: ["failure premise", "in the negative", "worst that happens if this is completely ignored"],
    steering: "/kiro-steering-custom",
    recap: ["omission recap", "missing", "excess", "summar"],
    escape: ["not applicable / unknown / confirm later", "Open Questions"],
  },
};

for (const lang of LANGS) {
  test(`algo-qoc: ${lang} に固定カテゴリ枠 (6カテゴリ語) がある (1.1)`, () => {
    const content = read(ruleFile(lang, "intent-compass", "algo-qoc.md"));
    for (const cat of ALGO_QOC[lang].categories) {
      assert.ok(
        content.includes(cat),
        `${lang}/algo-qoc.md: 固定カテゴリ語「${cat}」がある`,
      );
    }
  });

  test(`algo-qoc: ${lang} に動的例示の指示 (文脈生成・2〜3・非網羅・固定文字列禁止) がある (2.1)`, () => {
    const content = read(ruleFile(lang, "intent-compass", "algo-qoc.md"));
    for (const kw of ALGO_QOC[lang].dynamicExample) {
      assert.ok(content.includes(kw), `${lang}/algo-qoc.md: 動的例示の指示「${kw}」がある`);
    }
  });

  test(`algo-qoc: ${lang} に fallback (枠のみ提示) の指示がある (2.4)`, () => {
    const content = read(ruleFile(lang, "intent-compass", "algo-qoc.md"));
    for (const kw of ALGO_QOC[lang].fallback) {
      assert.ok(content.includes(kw), `${lang}/algo-qoc.md: fallback の指示「${kw}」がある`);
    }
  });

  test(`algo-qoc: ${lang} に否定形 (失敗前提) 発問がある (3.1)`, () => {
    const content = read(ruleFile(lang, "intent-compass", "algo-qoc.md"));
    for (const kw of ALGO_QOC[lang].negation) {
      assert.ok(content.includes(kw), `${lang}/algo-qoc.md: 否定形発問の言い回し「${kw}」がある`);
    }
  });

  test(`algo-qoc: ${lang} に steering 配置推奨 (/kiro-steering-custom) がある (1.4)`, () => {
    const content = read(ruleFile(lang, "intent-compass", "algo-qoc.md"));
    assert.ok(
      content.includes(ALGO_QOC[lang].steering),
      `${lang}/algo-qoc.md: 「${ALGO_QOC[lang].steering}」配置推奨がある`,
    );
  });

  test(`algo-qoc: ${lang} に omission recap (要約・抜け・過剰の確認) がある (5.1)`, () => {
    const content = read(ruleFile(lang, "intent-compass", "algo-qoc.md"));
    for (const kw of ALGO_QOC[lang].recap) {
      assert.ok(content.includes(kw), `${lang}/algo-qoc.md: omission recap の語「${kw}」がある`);
    }
  });

  test(`algo-qoc: ${lang} に逃がし (3分岐 + Open Questions) がある (6.1)`, () => {
    const content = read(ruleFile(lang, "intent-compass", "algo-qoc.md"));
    for (const kw of ALGO_QOC[lang].escape) {
      assert.ok(content.includes(kw), `${lang}/algo-qoc.md: 逃がしの語「${kw}」がある`);
    }
  });
}

// ---- 項目2: designer-questions.md の手順2.5 / 改稿済み off 節 / 手順6.5 (4.1, 4.2, 5.2) ----

const DESIGNER_Q = {
  ja: {
    // 手順2.5 の小数番号見出し (行頭 "2.5.")。
    step25: /^2\.5\. /m,
    // 手順2.5 の内容: L0 目的・成功の追認 + 想定ユーザー (Actor) の追認。
    step25Content: ["目的・成功・想定ユーザーの追認", "想定ユーザー", "追認", "発火"],
    // 改稿済み off 節の確定文言。
    offHeading: "## designer-questions が off のとき",
    offWording: ["手順 2.5", "手順 6.5"],
    // 手順6.5 の小数番号見出しと tree 版 recap。
    step65: /^6\.5\. /m,
    step65Content: ["tree 版 omission recap", "抜け", "過剰"],
  },
  en: {
    step25: /^2\.5\. /m,
    step25Content: ["Affirm the purpose, success, and intended users", "intended users", "fires regardless"],
    offHeading: "## When designer-questions is off",
    offWording: ["step 2.5", "step 6.5"],
    step65: /^6\.5\. /m,
    step65Content: ["tree-level omission recap", "missing", "excess"],
  },
};

for (const lang of LANGS) {
  test(`designer-questions: ${lang} に手順2.5 (L0/成功・想定ユーザー追認、off でも発火) がある (4.1, 4.2)`, () => {
    const content = read(ruleFile(lang, "intent-discover", "designer-questions.md"));
    const spec = DESIGNER_Q[lang];
    assert.match(content, spec.step25, `${lang}/designer-questions.md: 行頭「2.5.」の手順がある`);
    for (const kw of spec.step25Content) {
      assert.ok(content.includes(kw), `${lang}/designer-questions.md: 手順2.5 の内容「${kw}」がある`);
    }
  });

  test(`designer-questions: ${lang} の off 節が改稿済み (手順2.5/6.5 への言及を含む) (4.2)`, () => {
    const content = read(ruleFile(lang, "intent-discover", "designer-questions.md"));
    const spec = DESIGNER_Q[lang];
    assert.ok(content.includes(spec.offHeading), `${lang}/designer-questions.md: 「${spec.offHeading}」見出しがある`);
    // off 節 (見出し以降) に確定文言が含まれること。
    const offSection = content.slice(content.indexOf(spec.offHeading));
    for (const kw of spec.offWording) {
      assert.ok(
        offSection.includes(kw),
        `${lang}/designer-questions.md: off 節に改稿済み確定文言「${kw}」がある`,
      );
    }
  });

  test(`designer-questions: ${lang} に手順6.5 (tree版 omission recap) がある (5.2)`, () => {
    const content = read(ruleFile(lang, "intent-discover", "designer-questions.md"));
    const spec = DESIGNER_Q[lang];
    assert.match(content, spec.step65, `${lang}/designer-questions.md: 行頭「6.5.」の手順がある`);
    for (const kw of spec.step65Content) {
      assert.ok(content.includes(kw), `${lang}/designer-questions.md: 手順6.5 の内容「${kw}」がある`);
    }
  });
}

// ---- 項目3: first-packet.md の優先順位発問と「上書きしない」方針 (4.3) ----

const FIRST_PACKET = {
  ja: {
    priority: ["優先順位", "トレードオフ", "速度 vs 品質"],
    escape: "該当なし／不明／後で確認",
    noOverride: "推薦の上書きを促すものではない",
  },
  en: {
    priority: ["priorit", "trade-off", "speed vs. quality"],
    escape: "not applicable / unknown / decide later",
    noOverride: "not a prompt to override",
  },
};

for (const lang of LANGS) {
  test(`first-packet: ${lang} に優先順位・トレードオフ発問と逃がしがある (4.3)`, () => {
    const content = read(ruleFile(lang, "intent-packets", "first-packet.md"));
    const spec = FIRST_PACKET[lang];
    for (const kw of spec.priority) {
      assert.ok(content.includes(kw), `${lang}/first-packet.md: 優先順位発問の語「${kw}」がある`);
    }
    assert.ok(content.includes(spec.escape), `${lang}/first-packet.md: 逃がし「${spec.escape}」がある`);
  });

  test(`first-packet: ${lang} に「上書きしない」方針が保たれている (4.3)`, () => {
    const content = read(ruleFile(lang, "intent-packets", "first-packet.md"));
    assert.ok(
      content.includes(FIRST_PACKET[lang].noOverride),
      `${lang}/first-packet.md: 推薦が利用者判断を「${FIRST_PACKET[lang].noOverride}」方針がある`,
    );
  });
}

// ---- 項目4: intent-packets SKILL の保留 packet 固有制約 → Safety 転記手順 (5.3) ----
// compass の Open Questions に保留された packet 固有制約 (候補) を packet の Safety/Invariants へ
// 転記し、転記済みエントリを Open Questions から除く導線が SKILL 本文に存在すること。

const PACKETS_TRANSFER = {
  ja: ["packet 固有制約（候補）", "Safety / Invariants", "Open Questions"],
  en: ["packet-specific constraints (candidates)", "Safety / Invariants", "Open Questions"],
};
const PACKETS_TRANSFER_VERB = {
  ja: "転記",
  en: "transcrib",
};

for (const lang of LANGS) {
  test(`intent-packets SKILL: ${lang} に保留 packet 固有制約の Safety 転記手順がある (5.3)`, () => {
    const content = read(skillFile(lang, "intent-packets"));
    for (const kw of PACKETS_TRANSFER[lang]) {
      assert.ok(content.includes(kw), `${lang}/intent-packets/SKILL.md: 転記手順の語「${kw}」がある`);
    }
    assert.ok(
      content.includes(PACKETS_TRANSFER_VERB[lang]),
      `${lang}/intent-packets/SKILL.md: 転記の動作語「${PACKETS_TRANSFER_VERB[lang]}」がある`,
    );
  });
}

// ---- 項目5: docs/theory.md の解説・対応表行・参考文献 (7.1, 7.2, 7.3) ----
// theory.md は ja のみの単一ファイル (en 変種は存在しない)。
// 解説見出し・対応表の4概念行・参考文献の追加出典を検査する。

const THEORY_PATH = path.join(REPO_ROOT, "docs", "theory.md");
// 発問設計の解説見出し (4概念それぞれの ### 見出し)。
const THEORY_HEADINGS = ["固定カテゴリ枠", "動的例示", "否定形", "omission recap"];
// 対応表に追加された4概念行のキー語。
const THEORY_TABLE_ROWS = [
  "固定カテゴリ枠での Invariant・制約の収集",
  "動的例示",
  "否定形",
  "omission recap",
];
// 参考文献に追加された一次情報の著者・出典。
const THEORY_REFS = [
  "Browne",
  "Burnay",
  "Tulving",
  "Jansson",
  "Carrizo",
  "LLM4RE",
];

test("theory.md: 発問設計の解説見出しがある (7.1)", () => {
  const content = read(THEORY_PATH);
  const headingTexts = extractHeadings(content)
    .filter((h) => h.level === 3)
    .map((h) => h.text);
  // 発問設計セクション (## 発問設計 …) が存在すること。
  assert.ok(
    content.includes("## 発問設計"),
    "theory.md: 「## 発問設計」セクションがある",
  );
  for (const kw of THEORY_HEADINGS) {
    assert.ok(
      headingTexts.some((h) => h.includes(kw)),
      `theory.md: 発問設計の解説見出し (###) に「${kw}」を含む見出しがある`,
    );
  }
});

test("theory.md: 対応表に4概念の行がある (7.2)", () => {
  const content = read(THEORY_PATH);
  for (const kw of THEORY_TABLE_ROWS) {
    // 対応表のデータ行 (| で始まる行) に概念語が含まれること。
    const tableLines = content
      .split(/\r?\n/)
      .filter((l) => l.trim().startsWith("|") && l.includes(kw));
    assert.ok(
      tableLines.length > 0,
      `theory.md: 対応表のデータ行に概念「${kw}」を含む行がある`,
    );
  }
});

test("theory.md: 参考文献に一次情報の出典がある (7.3)", () => {
  const content = read(THEORY_PATH);
  for (const ref of THEORY_REFS) {
    assert.ok(content.includes(ref), `theory.md: 参考文献に出典「${ref}」がある`);
  }
});

// ---- 項目6: 後方互換 — 固定例示文字列の不在・新規必須セクション不在 (6.4, 8.4) ----
// (a) 動的例示の方針: scaffold (intent-compass.md / intent-tree.md) と algo-qoc.md に
//     具体的な固定例示文字列 (特定の SQL 文・特定技術名) が埋め込まれていないこと。
//     固定例示を埋め込むと、無関係なプロジェクトへ誤った前提を刷り込み、fixation を招く。
// (b) 旧 scaffold 非破壊: 追加された注記が既存セクション内の blockquote 追記であり、
//     収集結果のための新規必須 ## セクションを作っていないこと。intent-compass.md /
//     intent-tree.md の ## セクション集合が、本機能で導入されるはずのない収集専用セクション
//     (例: "## Collected Constraints" 等) を持たないことを、既知セクションのみで構成される
//     ことの代わりに「固定例示禁止」と「ja/en 見出し構造一致」で担保する
//     (見出し構造の ja/en 1:1 は poc-coverage が intent-tree を、本テストが intent-compass を担う)。

// 動的例示方針に反する固定例示文字列 (具体 SQL・特定技術名)。これらが scaffold/rules の
// **例示として**埋め込まれていれば後退。algo-qoc.md は否定形発問の汎用例 (データ・外部依存)
// のみを持ち、特定技術名を含まない。
const FORBIDDEN_FIXED_EXAMPLES = [
  /\bSELECT\b.*\bFROM\b/i, // 具体的な SQL 文
  /\bPostgreSQL\b/i,
  /\bMySQL\b/i,
  /\bStripe\b/i,
  /\bReact\b/,
  /\bOAuth\b/,
];

const DYNAMIC_EXAMPLE_FILES = [
  ...LANGS.map((lang) => path.join(TEMPLATES, lang, "intent", "intent-compass.md")),
  ...LANGS.map((lang) => path.join(TEMPLATES, lang, "intent", "intent-tree.md")),
  ...LANGS.map((lang) => ruleFile(lang, "intent-compass", "algo-qoc.md")),
];

for (const filePath of DYNAMIC_EXAMPLE_FILES) {
  const rel = path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
  test(`後方互換: ${rel} に固定例示文字列 (具体 SQL・特定技術名) が埋め込まれていない (8.4)`, () => {
    const content = read(filePath);
    for (const re of FORBIDDEN_FIXED_EXAMPLES) {
      assert.doesNotMatch(
        content,
        re,
        `${rel}: 固定例示文字列 ${re} が埋め込まれていない (動的例示=固定文字列禁止)`,
      );
    }
  });
}

// 旧 scaffold 非破壊: intent-compass.md の ## セクション集合が、本機能の収集結果を理由に
// 新規必須セクションを増やしていないこと。収集結果は既存セクション (Invariants /
// Decision Rules / Open Questions) と blockquote 注記へ記録される設計のため、ja/en で
// セクション見出しの集合が一致 (翻訳差以外の追加がない) ことを固定する。
for (const name of ["intent-compass.md"]) {
  test(`後方互換: ${name} の ## セクション数が ja/en で一致する (新規必須セクションを増やしていない) (6.4)`, () => {
    const counts = {};
    for (const lang of LANGS) {
      const content = read(path.join(TEMPLATES, lang, "intent", name));
      counts[lang] = extractHeadings(content).filter((h) => h.level === 2).length;
    }
    assert.equal(
      counts.ja,
      counts.en,
      `${name}: ja/en の ## セクション数が一致する (ja=${counts.ja}, en=${counts.en})`,
    );
    // 収集結果は既存セクションへ記録される設計のため、注記追加で ## が増えていないこと。
    // 本機能は intent-compass.md に新規 ## を作らない (注記は blockquote)。
    assert.ok(counts.ja > 0, `${name}: ## セクションが存在する`);
  });
}
