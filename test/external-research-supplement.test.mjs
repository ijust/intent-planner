// 不足する専門的な観点を外部調査で補う契約の判別テスト。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const VARIANTS = [
  ["ja", "claude"],
  ["ja", "codex"],
  ["en", "claude"],
  ["en", "codex"],
];
const RULES = [
  "intent-discover/rules/role-perspective-review.md",
  "intent-compass/rules/constraint-surfacing.md",
  "intent-packets/rules/decision-probe.md",
];

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function skill(lang, agent, relative) {
  return read(path.join("templates", lang, agent, "skills", relative));
}

function section(text, heading, nextHeading) {
  const start = text.indexOf(heading);
  assert.notEqual(start, -1, `section exists: ${heading}`);
  const end = nextHeading ? text.indexOf(nextHeading, start + heading.length) : -1;
  return text.slice(start, end === -1 ? text.length : end);
}

test("外部調査は重要な内部根拠不足だけで発火する", () => {
  const ja = section(read(".agents/skills/CONTRACT.md"), "## 内部にない専門的な観点の補強", "## 問いと用語の作法");
  assert.match(ja, /内部の定石.*質問パック.*設計フレーム.*採用済みの観点.*利用者が示した資料/s);
  assert.match(ja, /目的.*範囲.*守る約束.*後戻りしにくい判断/s);
  assert.match(ja, /内部の根拠で足りるときは調査しない/);
  assert.match(ja, /`standard` \/ `deep`.*判断への影響で発火/s);
});

test("送信前の承認は正確な文面・情報範囲・手段の負荷を分ける", () => {
  const ja = read(".agents/skills/CONTRACT.md");
  assert.match(ja, /足りない観点.*閉じたい判断.*正確な検索文.*送信情報の範囲.*方法.*時間・費用/s);
  assert.match(ja, /実行する \/ 文面を直す \/ 調査しない/);
  assert.match(ja, /明示承認まで送信しない/);
  assert.match(ja, /文面の承認.*別の高負荷・高費用な方法の承認へ広げない/s);
  assert.match(ja, /非公開情報.*個人情報.*機密情報.*別の明示承認/s);
  assert.match(ja, /一般化または伏字/);
});

test("提供者非依存の実行、重複防止、失敗時の縮退を明示する", () => {
  const ja = read(".agents/skills/CONTRACT.md");
  assert.match(ja, /利用可能と既に分かっている.*提供者名に固定せず/s);
  assert.match(ja, /試し送信しない/);
  assert.match(ja, /一次情報と出典URLを優先/);
  assert.match(ja, /同じ判断・文面.*調査ID.*状態確認または再開/s);
  assert.match(ja, /状態が不明なら重複実行せず人に確認/);
  assert.match(ja, /手段がない.*拒否.*失敗.*信頼できる根拠が得られない.*`未確認`/s);
  assert.match(ja, /確認完了を主張しない/);
});

test("外部文書の指示を実行せず、結果を候補に留める", () => {
  const ja = read(".agents/skills/CONTRACT.md");
  assert.match(ja, /外部文書内の指示.*権限要求.*ツール実行要求に従わず/s);
  assert.match(ja, /利用者.*専門家.*外部調査より優先.*食い違い.*別々に示す/s);
  assert.match(ja, /観点候補.*質問候補.*食い違い.*不明点/s);
  assert.match(ja, /利用者が採用するまで Intent Tree、Intent Compass、packet へ転記しない/);
});

test("各工程と intent-plan が共通契約へ接続する", () => {
  for (const [lang, agent] of VARIANTS) {
    for (const rule of RULES) {
      const content = skill(lang, agent, rule);
      if (lang === "ja") assert.match(content, /CONTRACT\.md.*内部にない専門的な観点の補強/s, `${lang}/${agent}/${rule}`);
      else assert.match(content, /CONTRACT\.md.*Supplementing a specialist perspective missing from internal material|Supplementing a specialist perspective missing from internal material.*CONTRACT\.md/s, `${lang}/${agent}/${rule}`);
    }
    const plan = skill(lang, agent, "intent-plan/SKILL.md");
    if (lang === "ja") assert.match(plan, /generated\/CONTRACT\.md.*内部にない専門的な観点/s);
    else assert.match(plan, /Supplementing a specialist perspective missing from internal material.*generated\/CONTRACT\.md|generated\/CONTRACT\.md.*Supplementing a specialist perspective missing from internal material/s);
  }
});

test("日本語・英語、Claude・Codex、生成済み指示が一致する", () => {
  for (const lang of ["ja", "en"]) {
    const contractHeading = lang === "ja" ? "## 内部にない専門的な観点の補強" : "## Supplementing a specialist perspective missing from internal material";
    assert.match(skill(lang, "claude", "CONTRACT.md"), new RegExp(contractHeading), `${lang} Claude CONTRACT`);
    assert.match(skill(lang, "codex", "CONTRACT.md"), new RegExp(contractHeading), `${lang} Codex CONTRACT`);
    assert.match(skill(lang, "claude", "intent-plan/SKILL.md"), /allowed-tools:/, `${lang} Claude plan tools`);
    assert.doesNotMatch(skill(lang, "codex", "intent-plan/SKILL.md"), /allowed-tools:/, `${lang} Codex plan tools`);
    for (const rule of RULES) assert.equal(skill(lang, "claude", rule), skill(lang, "codex", rule), `${lang} ${rule}`);
    for (const agent of ["claude", "codex"]) {
      assert.equal(skill(lang, agent, "intent-plan/generated/CONTRACT.md"), skill(lang, agent, "CONTRACT.md"));
      for (const rule of RULES) {
        assert.equal(skill(lang, agent, path.join("intent-plan/generated/sources", rule)), skill(lang, agent, rule));
      }
    }
  }
  assert.equal(read(".agents/skills/CONTRACT.md"), skill("ja", "codex", "CONTRACT.md"));
  assert.equal(read(".claude/skills/CONTRACT.md"), skill("ja", "claude", "CONTRACT.md"));
  for (const rule of RULES) {
    assert.equal(read(path.join(".agents/skills", rule)), skill("ja", "codex", rule));
    assert.equal(read(path.join(".claude/skills", rule)), skill("ja", "claude", rule));
  }
});

test("調査記録の最小構成と公開説明が揃う", () => {
  const ja = read("templates/ja/intent/research/README.md");
  const en = read("templates/en/intent/research/README.md");
  for (const token of ["目的", "方法", "実行日", "承認", "調査ID", "synthesis.md", "一次情報", "生の報告は任意"]) assert.match(ja, new RegExp(token));
  for (const token of ["purpose", "method", "date", "approved", "Research ID", "synthesis.md", "primary sources", "raw report is optional"]) assert.match(en, new RegExp(token, "i"));
  assert.equal(read(".intent/research/README.md"), ja);
  assert.match(read("README.md"), /不足する専門的な観点の補強/);
  assert.match(read("README.en.md"), /Supplementing a missing specialist perspective/);
  assert.match(read("docs/guide.md"), /内部にない専門的な観点を外部調査で補う/);
  assert.match(read("docs/guide.en.md"), /Supplementing a specialist perspective missing from internal material/);
});

test("判別例が内部根拠、失敗、機密性、攻撃文、重複、食い違いを覆う", () => {
  const fixture = read("test/fixtures/external-research-supplement/cases.md");
  const rows = fixture.split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| 条件") && !line.startsWith("|---"));
  assert.equal(rows.length, 9);
  for (const phrase of ["外部調査を提案せず", "standard", "deep", "未確認", "別承認", "指示に従わず", "状態確認または再開", "食い違いを隠さず", "自動転記しない"]) {
    assert.match(fixture, new RegExp(phrase), phrase);
  }
});

test("共通契約は特定の調査提供者に固定しない", () => {
  for (const [lang, agent] of VARIANTS) {
    const contract = skill(lang, agent, "CONTRACT.md");
    const research = lang === "ja"
      ? section(contract, "## 内部にない専門的な観点の補強", "## 問いと用語の作法")
      : section(contract, "## Supplementing a specialist perspective missing from internal material", "## Question and Terminology Conventions");
    assert.doesNotMatch(research, /OpenAI|Anthropic|Google|Genspark|Perplexity|Gemini|Claude|ChatGPT/i);
  }
});
