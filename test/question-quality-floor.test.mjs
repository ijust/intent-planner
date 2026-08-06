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

function sharedContract(lang, agent) {
  return fs.readFileSync(template(lang, agent, "CONTRACT.md"), "utf8");
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
        assert.match(content, /答えによって重要な判断が変わることだけを問う/);
        assert.match(content, /回答から確定事項と前提を更新して次の問いを変える/);
        assert.match(content, /全資料の読了を質問開始の条件にしない/);
      } else {
        assert.match(content, /## Minimum quality for question content/);
        assert.match(content, /Do not ask for an answer already available in the material/);
        assert.match(content, /Ask only when the answer can change an important decision/);
        assert.match(content, /Update confirmed facts and premises after every answer/);
        assert.match(content, /Build the next question from that updated state/);
        assert.match(content, /Do not make reading every document a prerequisite for starting questions/i);
      }
    }
  }
});

test("4配布面が質問直前の四分類を既存の質問状態と分けて定める", () => {
  for (const agent of AGENTS) {
    const ja = sharedContract("ja", agent);
    assert.match(ja, /質問を作る直前.*一時的に整理/s);
    assert.match(ja, /`既知`.*`食い違い`.*`成果を変える未決事項`.*`今は影響しない事項`/s);
    assert.match(ja, /この一時分類.*`回答済み`.*`今回の範囲外`.*`理由付きで後回し`.*`未確認`.*別/s);
    assert.match(ja, /保存.*新しい質問台帳.*作らない/s);

    const en = sharedContract("en", agent);
    assert.match(en, /immediately before composing questions.*transient/i);
    assert.match(en, /`known`.*`conflict`.*`outcome-changing unresolved`.*`non-impacting for now`/s);
    assert.match(en, /transient classification.*separate from.*`answered`.*`out of scope for this case`.*`deferred with a reason`.*`unconfirmed`/s);
    assert.match(en, /not persist.*new question ledger/is);
  }
});

test("質問前整理が既知の再質問を防ぎ、影響のある問いだけを残す", () => {
  for (const agent of AGENTS) {
    const ja = sharedContract("ja", agent);
    assert.match(ja, /既知.*質問候補から外し.*聞き直さない/s);
    assert.match(ja, /同じ資料.*確定内容.*重複.*増やさない/s);
    assert.match(ja, /食い違い.*成果を変える未決事項.*結果への影響.*質問とともに示す/s);
    assert.match(ja, /質問数.*減らす.*成果を変える未決事項.*落とさない/s);

    const en = sharedContract("en", agent);
    assert.match(en, /known.*remove.*question candidates.*do not ask (?:them )?again/is);
    assert.match(en, /same material.*confirmed content.*do not add duplicate/is);
    assert.match(en, /conflict.*outcome-changing unresolved.*impact on the result.*with the question/is);
    assert.match(en, /reduce the number of questions.*never drop.*outcome-changing unresolved/is);
  }
});

test("回答後更新と今は影響しない事項の再確認条件を4配布面で保つ", () => {
  for (const agent of AGENTS) {
    const ja = sharedContract("ja", agent);
    assert.match(ja, /回答後.*確定事項.*撤回された前提.*残る未決事項.*更新/s);
    assert.match(ja, /次の質問.*更新後の状態/s);
    assert.match(ja, /今は影響しない事項.*影響しない理由.*再確認条件/s);

    const en = sharedContract("en", agent);
    assert.match(en, /after an answer.*confirmed facts.*withdrawn assumptions.*remaining unresolved.*update/is);
    assert.match(en, /next question.*updated state/is);
    assert.match(en, /non-impacting for now.*reason.*does not affect.*revisit condition/is);
  }
});

test("変更候補を承認前の正本から分離し、部分承認だけを既存経路へ渡す", () => {
  for (const agent of AGENTS) {
    const ja = sharedContract("ja", agent);
    assert.match(ja, /変更候補.*出所.*理由.*影響範囲.*変更しない場合の影響/s);
    assert.match(ja, /未承認.*会話内.*正本.*書かない/s);
    assert.match(ja, /一部だけ.*承認.*承認された範囲だけ.*既存.*正規経路/s);
    assert.match(ja, /外部資料.*命令.*未検証.*採用しない/s);
    assert.match(ja, /外部.*連絡しない.*確認事項.*依頼文.*下書き/s);

    const en = sharedContract("en", agent);
    assert.match(en, /change candidate.*source.*reason.*affected scope.*effect of not changing/is);
    assert.match(en, /unapproved.*conversation.*do not write.*canonical/is);
    assert.match(en, /approves only part.*approved scope.*existing.*normal path/is);
    assert.match(en, /external material.*instructions.*unverified.*do not adopt/is);
    assert.match(en, /do not contact.*external.*questions.*request draft/is);
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

test("配布用ルート文書が質問品質の詳細を共通契約へ委譲する", () => {
  const docs = {
    ja: [
      "templates/ja/agents/claude/CLAUDE_intent.md",
      "templates/ja/agents/codex/AGENTS.md",
      "templates/ja/agents/gemini/GEMINI_intent.md",
      "CLAUDE_intent.md",
      "AGENTS.md",
    ],
    en: [
      "templates/en/agents/claude/CLAUDE_intent.md",
      "templates/en/agents/codex/AGENTS.md",
      "templates/en/agents/gemini/GEMINI_intent.md",
    ],
  };
  for (const file of docs.ja) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.match(content, /共通契約.*質問内容の最低品質.*質問の確認範囲と終了条件/s);
    assert.doesNotMatch(content, /質問を出す前に、利用者が指定した資料と今回のIntent成果物を/);
  }
  for (const file of docs.en) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.match(content, /Minimum quality for question content.*Question coverage and completion conditions.*common contract/is);
    assert.doesNotMatch(content, /Before asking, read the materials the user named and the current Intent artifacts/);
  }
});

test("判別例が過不足・回答後の更新・探索・再診断の赤緑を対で持つ", () => {
  const content = fs.readFileSync(path.join(__dirname, "fixtures", "question-quality-floor", "questions.md"), "utf8");
  const rows = content.split("\n").filter((line) => /^\| \d+ \|/.test(line));
  assert.equal(rows.length, 18);
  assert.equal(rows.filter((line) => line.includes("赤（")).length, 10);
  assert.equal(rows.filter((line) => line.includes("緑（")).length, 8);
  assert.match(content, /docs\/copilotチラシ作成指示\.txt/);
  assert.match(content, /目的、範囲、成功条件、使い勝手、守る約束、構成、後戻りしにくい判断/);
  assert.match(content, /回答済み事項を言い換えて聞き直し/);
  assert.match(content, /具体的な未決事項なしに参照をたどり続ける/);
  assert.match(content, /原因を見分けず目的から全面的に聞き直す/);
  assert.match(content, /既知.*食い違い.*成果を変える未決事項.*今は影響しない事項/s);
  assert.match(content, /食い違い.*結果への影響/s);
  assert.match(content, /確定事項.*撤回された前提.*残る未決事項/s);
  assert.match(content, /質問を4問に収めるため.*未決事項を落とす/s);
  assert.match(content, /影響しない理由.*再確認条件/s);
});
