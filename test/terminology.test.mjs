// terminology (intent-planner-terminology) の防護テスト (task 4.1)。
// node:test 標準・依存ゼロ (INV2)。
//
// design C5 (アンカー原則): 全検査は本 spec で新規導入した確定リテラル
// (tasks.md 冒頭のアンカー表 A1 / A4–A6 / A8–A12。DROP 行 A2/A3/A7 は検査対象外) を
// アンカーにする。変更前から存在する語をアンカーにすると追加が無くても green になり
// 防護が空転するため、各アンカーは**表の対象ファイル単体を読み込んで**検査する
// (「Issue より上位」等は modes/*.md にも既存のため、リポジトリ横断 grep はしない)。
//
// 範囲分担 (重複回避):
//   - claude↔codex の rules byte 等価は agent-rules-parity が担う。本ファイルは
//     アンカー表の指定 (4象限) に従い rules も4象限を直接検査する
//     (CONTRACT.md は parity の byte 等価対象外のため、4象限の検査が必須)。
//   - ロック非接触の証明は standard-invariance.test.mjs に委ねる (git 状態は責務外)。
//
// design C5 の4項目:
//   1. scaffold 説明の存在: packets/README.md (A1) / intent-tree.md (A4) /
//      intent-compass.md (A5 drift 注釈 + A6 局所最適説明と具体例) (Req 2.1, 2.2, 1.3)
//   2. README 導入説明: リポジトリ README.md の steering / scaffold 括弧説明 (A8) (Req 3.1, 3.2)
//   3. CONTRACT 作法: 4象限の「問いと用語の作法」節 (A9) の位置と2作法キーワード (Req 1.1, 1.2, 4.3)
//   4. 問い文面の自己完結マーカー: designer-questions.md (A10) /
//      walking-skeleton.md 手順2 (A11) / first-packet.md (A12) (Req 4.1, 4.2)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];

function skillDir(lang, agent, skill) {
  return path.join(TEMPLATES, lang, agent, "skills", skill);
}

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

// 指定したレベル2見出し行から次のレベル2見出し (## ) 直前までを節として切り出す。
// startsWith("## ") は "### " に誤マッチしない (3文字目が '#' のため)。
function sliceSection(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

// ---- 項目1: scaffold 説明の存在 (A1, A4, A5, A6 / Req 2.1, 2.2, 1.3) ----

// A1: packets/README.md 冒頭 blockquote。粒度補足 (新規部分) が既存の packet 説明と
// **同一の blockquote 行に統合**されていること (新しい文・blockquote の追加では合格にしない)。
const PACKETS_GRANULARITY = {
  ja: { anchor: "Issue より上位・spec より手前の粒度", existing: "cc-sdd に渡す前の作業単位" },
  en: { anchor: "broader than an Issue, just before a spec", existing: "before handing off to cc-sdd" },
};

for (const lang of LANGS) {
  test(`scaffold A1: ${lang}/intent/packets/README.md の冒頭 blockquote に粒度補足が統合されている (2.1, 2.2)`, () => {
    const spec = PACKETS_GRANULARITY[lang];
    const content = read(path.join(TEMPLATES, lang, "intent", "packets", "README.md"));
    const quoteLines = content
      .split(/\r?\n/)
      .filter((l) => l.trimStart().startsWith(">"));
    const anchorLines = quoteLines.filter((l) => l.includes(spec.anchor));
    assert.ok(
      anchorLines.length > 0,
      `${lang}/intent/packets/README.md: blockquote 行に粒度補足「${spec.anchor}」がある`,
    );
    assert.ok(
      anchorLines.some((l) => l.includes(spec.existing)),
      `${lang}/intent/packets/README.md: 粒度補足が既存の packet 説明「${spec.existing}」と同一行に統合されている (別文の追加では不合格)`,
    );
  });
}

// A4: intent-tree.md 冒頭 blockquote の L0〜L4 説明。
const TREE_LEVEL = {
  ja: "L0〜L4 は意図の階層レベル（Level。L0=目的 〜 L4=作業単位候補）",
  en: "L0–L4 are the levels of the intent hierarchy (Level; L0 = purpose … L4 = candidate work units)",
};

for (const lang of LANGS) {
  test(`scaffold A4: ${lang}/intent/intent-tree.md の冒頭 blockquote に L の説明がある (2.1, 2.2)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "intent-tree.md"));
    const quoteLines = content
      .split(/\r?\n/)
      .filter((l) => l.trimStart().startsWith(">"));
    assert.ok(
      quoteLines.some((l) => l.includes(TREE_LEVEL[lang])),
      `${lang}/intent/intent-tree.md: blockquote 行に「${TREE_LEVEL[lang]}」がある`,
    );
  });
}

// A5: intent-compass.md Current Drift 節の drift 注釈 (節の外への移動では不合格)。
const DRIFT_NOTE = {
  ja: "（このズレを drift と呼ぶ）",
  en: "(this gap is called drift)",
};

for (const lang of LANGS) {
  test(`scaffold A5: ${lang}/intent/intent-compass.md の Current Drift 節に drift 注釈がある (2.1, 2.2)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "intent-compass.md"));
    const section = sliceSection(content, "## Current Drift");
    assert.ok(section !== null, `${lang}/intent/intent-compass.md に「## Current Drift」見出しがある`);
    assert.ok(
      section.includes(DRIFT_NOTE[lang]),
      `${lang}/intent/intent-compass.md: Current Drift 節に「${DRIFT_NOTE[lang]}」がある (節の外では不合格)`,
    );
  });
}

// A6: intent-compass.md Anti-direction 節の局所最適説明 + 具体例2個以上。
// 具体例のリテラルは task 2.2 の確定例 (「ついでに別の処理も直す」「テストなしの一括置換」)。
const LOCAL_OPT = {
  ja: {
    explain: "局所最適（全体の意図より目先の修正を優先してしまうこと）",
    examples: ["ついでに別の処理も直す", "テストなしの一括置換"],
  },
  en: {
    explain: "local optimization (favoring immediate fixes over the overall intent)",
    examples: ["fix some other processing while at it", "bulk replacement without tests"],
  },
};

for (const lang of LANGS) {
  test(`scaffold A6: ${lang}/intent/intent-compass.md の Anti-direction 節に局所最適の説明と具体例がある (2.1, 4.2)`, () => {
    const spec = LOCAL_OPT[lang];
    const content = read(path.join(TEMPLATES, lang, "intent", "intent-compass.md"));
    const section = sliceSection(content, "## Anti-direction");
    assert.ok(section !== null, `${lang}/intent/intent-compass.md に「## Anti-direction」見出しがある`);
    assert.ok(
      section.includes(spec.explain),
      `${lang}/intent/intent-compass.md: Anti-direction 節に「${spec.explain}」がある (節の外では不合格)`,
    );
    for (const example of spec.examples) {
      assert.ok(
        section.includes(example),
        `${lang}/intent/intent-compass.md: Anti-direction 節に具体例「${example}」がある`,
      );
    }
  });
}

// ---- 項目2: README 導入説明 (A8 / Req 3.1, 3.2) ----
// 防護対象は「raw な最初の出現」ではなく挿入先に確定したリテラル (design C3)。
// README は ja 主体・en 対訳なしのため言語ループしない。

const README_NOTES = [
  "steering（プロジェクト全体に常時効く指針コンテキスト）",
  "scaffold（記入用の雛形ファイル群）",
];

for (const literal of README_NOTES) {
  test(`README A8: リポジトリ README.md に「${literal}」がある (3.1, 3.2)`, () => {
    const content = read(path.join(REPO_ROOT, "README.md"));
    assert.ok(content.includes(literal), `README.md に挿入確定リテラル「${literal}」がある`);
  });
}

// ---- 項目3: CONTRACT 作法 (A9 / Req 1.1, 1.2, 4.3) ----
// 4象限の CONTRACT.md に「問いと用語の作法」節が「共通の制約」の後・
// 「スキル間の状態共有」の前に存在し、節内 (次の ## まで) に2作法のキーワードがあること。
// CONTRACT.md は agent-rules-parity の byte 等価対象外のため4象限とも検査する。

const CONTRACT_SPEC = {
  ja: {
    before: "## 共通の制約",
    heading: "## 問いと用語の作法",
    after: "## スキル間の状態共有",
    keywords: ["自己完結", "訳語に置換しない"],
  },
  en: {
    before: "## Shared constraints",
    heading: "## Question and Terminology Conventions",
    after: "## State sharing across skills",
    // en は大文字小文字の揺れを吸収するため小文字化して比較する。
    keywords: ["self-contained", "do not replace them with translated coinages"],
  },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`CONTRACT A9: ${lang}/${agent}/skills/CONTRACT.md の「問いと用語の作法」節が正位置に2作法を持つ (1.1, 1.2, 4.3)`, () => {
      const spec = CONTRACT_SPEC[lang];
      const content = read(path.join(TEMPLATES, lang, agent, "skills", "CONTRACT.md"));
      const lines = content.split(/\r?\n/);

      const beforeIdx = lines.findIndex((l) => l.trim() === spec.before);
      const headingIdx = lines.findIndex((l) => l.trim() === spec.heading);
      const afterIdx = lines.findIndex((l) => l.trim() === spec.after);
      assert.notEqual(beforeIdx, -1, `${lang}/${agent}: 「${spec.before}」見出しがある`);
      assert.notEqual(headingIdx, -1, `${lang}/${agent}: 「${spec.heading}」見出しがある`);
      assert.notEqual(afterIdx, -1, `${lang}/${agent}: 「${spec.after}」見出しがある`);
      assert.ok(
        beforeIdx < headingIdx && headingIdx < afterIdx,
        `${lang}/${agent}: 「${spec.heading}」が「${spec.before}」の後・「${spec.after}」の前にある (実際の行順: ${beforeIdx + 1}, ${headingIdx + 1}, ${afterIdx + 1})`,
      );

      const section = sliceSection(content, spec.heading);
      assert.ok(section !== null, `${lang}/${agent}: 「${spec.heading}」節が切り出せる`);
      const haystack = lang === "en" ? section.toLowerCase() : section;
      for (const keyword of spec.keywords) {
        assert.ok(
          haystack.includes(keyword),
          `${lang}/${agent}: 「${spec.heading}」節内にキーワード「${keyword}」がある (節の外への散在では不合格)`,
        );
      }
    });
  }
}

// ---- 項目4: 問い文面の自己完結マーカー (A10, A11, A12 / Req 4.1, 4.2) ----
// rules はアンカー表の指定どおり4象限を検査する (byte 等価の保証は parity 側でも担保)。

// A10: designer-questions.md の要否説明に packet と walking skeleton の一行説明が併存する。
// 倒置形 (「〜最小実装＝walking skeleton」) への退行では「walking skeleton（…）」が消えるため検出できる。
const DQ_MARKERS = {
  ja: ["packet（作業単位）", "walking skeleton（入力から出力まで一通り動く最小実装）"],
  en: [
    "packet (unit of work)",
    "walking skeleton (a minimal implementation that runs end to end from input to output)",
  ],
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`自己完結 A10: ${lang}/${agent}/intent-discover/rules/designer-questions.md に術語の一行説明がある (4.1, 4.2)`, () => {
      const content = read(
        path.join(skillDir(lang, agent, "intent-discover"), "rules", "designer-questions.md"),
      );
      for (const marker of DQ_MARKERS[lang]) {
        assert.ok(
          content.includes(marker),
          `${lang}/${agent}/designer-questions.md: 自己完結マーカー「${marker}」がある`,
        );
      }
    });
  }
}

// A11: walking-skeleton.md の手順2 (判定結果と根拠の提示) に packet の平易な言い換えがある。
// 手順節内の「2.」項目から「3.」項目の直前までを切り出し、手順2の外への移動では不合格にする。
const WS_PROCEDURE_HEADING = { ja: "## 手順", en: "## Procedure" };
const WS_MARKER = {
  ja: "この packet（cc-sdd に渡す作業単位）が何を作り、完了後に何がどこまで動くか",
  en: "what this packet (the unit of work handed to cc-sdd) builds and what runs end to end after completion",
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`自己完結 A11: ${lang}/${agent}/intent-packets/rules/walking-skeleton.md の手順2に平易な根拠提示の指示がある (4.1, 4.2)`, () => {
      const content = read(
        path.join(skillDir(lang, agent, "intent-packets"), "rules", "walking-skeleton.md"),
      );
      const section = sliceSection(content, WS_PROCEDURE_HEADING[lang]);
      assert.ok(
        section !== null,
        `${lang}/${agent}/walking-skeleton.md に「${WS_PROCEDURE_HEADING[lang]}」見出しがある`,
      );
      const lines = section.split(/\r?\n/);
      const step2Idx = lines.findIndex((l) => l.startsWith("2."));
      assert.notEqual(step2Idx, -1, `${lang}/${agent}/walking-skeleton.md: 手順節に項目「2.」がある`);
      let step2End = lines.length;
      for (let i = step2Idx + 1; i < lines.length; i++) {
        if (lines[i].startsWith("3.")) {
          step2End = i;
          break;
        }
      }
      const step2 = lines.slice(step2Idx, step2End).join("\n");
      assert.ok(
        step2.includes(WS_MARKER[lang]),
        `${lang}/${agent}/walking-skeleton.md: 手順2の内側に「${WS_MARKER[lang]}」がある (手順2の外では不合格)`,
      );
    });
  }
}

// A12: first-packet.md の Walking Skeleton 言及 (手順3) に一行説明が併記されている。
// ja はアンカー表の注記どおり実装済みリテラル「Walking Skeleton（E2E を貫く最小実装）」で検査する
// (説明が術語の直後に括弧で併存することを束ねて検査する)。
const FP_MARKER = {
  ja: "Walking Skeleton（E2E を貫く最小実装）",
  en: "walking skeleton (the minimal implementation that cuts end to end)",
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`自己完結 A12: ${lang}/${agent}/intent-packets/rules/first-packet.md に walking skeleton の一行説明がある (4.1, 4.2)`, () => {
      const content = read(
        path.join(skillDir(lang, agent, "intent-packets"), "rules", "first-packet.md"),
      );
      assert.ok(
        content.includes(FP_MARKER[lang]),
        `${lang}/${agent}/first-packet.md: 自己完結マーカー「${FP_MARKER[lang]}」がある`,
      );
    });
  }
}
