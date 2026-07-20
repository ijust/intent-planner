// question-quality-floor（pkt-20260720-質問の最低品質をintent-planning全体へ適用する-6j4z）の
// 判別テスト。固定語の存在だけでなく、既知事項の除外・重要判断への影響・回答後の更新・
// 資料探索の境界・再診断の条件が共通契約、質問直前点検、配布用ルート文書、実例に揃うことを検査する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];
const QUESTION_RULES = [
  "intent-discover/rules/designer-questions.md",
  "intent-discover/rules/mode-selection.md",
  "intent-discover/rules/question-pack-surfacing.md",
  "intent-compass/rules/algo-qoc.md",
  "intent-compass/rules/constraint-surfacing.md",
  "intent-packets/rules/decision-probe.md",
  "intent-db-design/rules/db-design-input.md",
  "intent-export-cc-sdd/rules/export-questions.md",
  "intent-export-openspec/rules/export-questions.md",
  "intent-export-speckit/rules/export-questions.md",
  "intent-writeback/rules/writeback-protocol.md",
];

function template(lang, agent, rel) {
  return path.join(ROOT, "templates", lang, agent, "skills", rel);
}

function qualityHeading(lang) {
  return lang === "ja"
    ? "## 問いの内容点検（出力直前・共通）"
    : "## Question-content check (right before output; shared)";
}

function qualityBlock(content, lang) {
  const index = content.indexOf(qualityHeading(lang));
  return index < 0 ? null : content.slice(index);
}

test("共通契約が質問内容の最低品質と資料探索の境界を一体で定める", () => {
  const ja = fs.readFileSync(path.join(ROOT, ".agents", "skills", "CONTRACT.md"), "utf8");
  assert.match(ja, /## 質問内容の最低品質/);
  assert.match(ja, /資料に答えがあることを聞き直さない/);
  assert.match(ja, /答えによって重要な判断が変わることだけを問う/);
  assert.match(ja, /回答から確定事項と前提を更新して次の問いを変える/);
  assert.match(ja, /全資料の読了を質問開始の条件にしない/);
  assert.match(ja, /具体的な未決事項なしに探索を広げない/);
  assert.match(ja, /単なる文言修正.*最上位/);

  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const content = fs.readFileSync(template(lang, agent, "CONTRACT.md"), "utf8");
      if (lang === "ja") {
        assert.match(content, /## 質問内容の最低品質/);
        assert.match(content, /資料に答えがあることを聞き直さない/);
      } else {
        assert.match(content, /## Minimum quality for question content/);
        assert.match(content, /Do not ask for an answer already available in the material/);
      }
    }
  }
});

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`${lang}/${agent} の質問規則が同じ内容点検を質問直前に持つ`, () => {
      let reference = null;
      for (const rel of QUESTION_RULES) {
        const content = fs.readFileSync(template(lang, agent, rel), "utf8");
        const block = qualityBlock(content, lang);
        assert.ok(block, `${rel}: 質問内容の点検がある`);
        if (reference === null) reference = block;
        assert.equal(block, reference, `${rel}: 同じ言語の点検内容が一致する`);
      }
      if (lang === "ja") {
        assert.match(reference, /指定された資料.*最初の重要な判断に必要な範囲/);
        assert.match(reference, /答えが見つからない重要な判断を示せる場合だけ/);
        assert.match(reference, /目的・対象者・範囲・成功条件・使い勝手・守る約束・構成・後戻りしにくい判断/);
        assert.match(reference, /回答済み事項を言い換えて聞き直さない/);
        assert.match(reference, /同じ症状への2回目の対処/);
        assert.match(reference, /単なる文言修正.*最上位/);
      } else {
        assert.match(reference, /materials the user named.*next important decision/is);
        assert.match(reference, /only when you can name an important decision/is);
        assert.match(reference, /purpose, target user, scope, success criteria, user experience, promises(?: to preserve)?, architecture/is);
        assert.match(reference, /Do not rephrase and re-ask what the user already answered/);
        assert.match(reference, /second attempt to treat the same symptom/);
        assert.match(reference, /wording correction.*top-level/is);
      }
    });
  }
}

test("dogfood の質問規則が日本語テンプレートと同じ内容点検を持つ", () => {
  for (const rel of QUESTION_RULES) {
    const expected = qualityBlock(fs.readFileSync(template("ja", "claude", rel), "utf8"), "ja");
    for (const tree of [".agents", ".claude"]) {
      const file = path.join(ROOT, tree, "skills", rel);
      if (!fs.existsSync(file)) continue;
      const actual = qualityBlock(fs.readFileSync(file, "utf8"), "ja");
      assert.equal(actual, expected, `${tree}/skills/${rel}: 日本語テンプレートと一致する`);
    }
  }
});

test("配布用ルート文書が既知事項・判断への影響・回答後の更新・探索境界を要約する", () => {
  const docs = {
    ja: [
      "templates/ja/agents/claude/CLAUDE_intent.md",
      "templates/ja/agents/codex/AGENTS.md",
      "templates/ja/agents/gemini/GEMINI_intent.md",
      "CLAUDE_intent.md",
    ],
    en: [
      "templates/en/agents/claude/CLAUDE_intent.md",
      "templates/en/agents/codex/AGENTS.md",
      "templates/en/agents/gemini/GEMINI_intent.md",
    ],
  };
  for (const file of docs.ja) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.match(content, /質問を出す前に、利用者が指定した資料と今回のIntent成果物を、次の重要な判断に必要な範囲から読む/);
    assert.match(content, /全資料の読了を質問開始の条件にせず、具体的な未決事項なしに探索を広げない/);
    assert.match(content, /回答後は確定事項と前提を更新して次の問いを変え/);
  }
  for (const file of docs.en) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.match(content, /Before asking, read the materials the user named and the current Intent artifacts only as far as the next important decision requires/);
    assert.match(content, /Do not make reading every document a prerequisite for starting questions/);
    assert.match(content, /After an answer, update the confirmed facts and premises and change the next question/);
  }
});

test("判別例が過不足・回答後の更新・探索・再診断の赤緑を対で持つ", () => {
  const content = fs.readFileSync(path.join(__dirname, "fixtures", "question-quality-floor", "questions.md"), "utf8");
  const rows = content.split("\n").filter((line) => /^\| [1-9] \|/.test(line));
  assert.equal(rows.length, 9);
  assert.equal(rows.filter((line) => line.includes("赤（")).length, 5);
  assert.equal(rows.filter((line) => line.includes("緑（")).length, 4);
  assert.match(content, /docs\/copilotチラシ作成指示\.txt/);
  assert.match(content, /目的、範囲、成功条件、使い勝手、守る約束、構成、後戻りしにくい判断/);
  assert.match(content, /回答済み事項を言い換えて聞き直し/);
  assert.match(content, /具体的な未決事項なしに参照をたどり続ける/);
  assert.match(content, /原因を見分けず目的から全面的に聞き直す/);
});
