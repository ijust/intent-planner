import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("README explains the fit boundary and the direct route in both languages", () => {
  const ja = read("README.md");
  const en = read("README.en.md");

  for (const phrase of ["高リスク", "手戻り", "過剰", "direct"]) {
    assert.ok(ja.includes(phrase), `README.md includes ${phrase}`);
  }
  for (const phrase of ["high-risk", "rework", "overkill", "direct"]) {
    assert.ok(en.toLowerCase().includes(phrase), `README.en.md includes ${phrase}`);
  }
});

test("guide and theory describe minimum sufficient steering and bounded autonomy", () => {
  const pairs = [
    ["docs/guide.md", ["最小十分", "拘束力", "境界付き自律", "確定材料", "再確認候補"]],
    ["docs/guide.en.md", ["minimum sufficient", "binding", "bounded autonomy", "settled inputs", "recheck candidates"]],
    ["docs/theory.md", ["Less instruction", "最小十分", "境界付き自律"]],
    ["docs/theory.en.md", ["Less instruction", "minimum sufficient", "bounded autonomy"]],
  ];

  for (const [file, phrases] of pairs) {
    const content = read(file).toLowerCase();
    for (const phrase of phrases) {
      assert.ok(content.includes(phrase.toLowerCase()), `${file} includes ${phrase}`);
    }
  }
});

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`${lang}/${agent} status separates three kinds of state and keeps one human decision`, () => {
      const content = read(`templates/${lang}/${agent}/skills/intent-status/SKILL.md`);
      const expected = lang === "ja"
        ? ["次に人が決めること", "工程の状態", "未決の設計判断", "利用者成果", "未観測", "総合PASS"]
        : ["What the human decides next", "Process health", "Unresolved design decisions", "User outcomes", "unobserved", "overall PASS"];

      for (const phrase of expected) {
        assert.ok(content.includes(phrase), `${lang}/${agent} status includes ${phrase}`);
      }
      assert.ok(content.includes(lang === "ja" ? "ちょうど1つ" : "exactly one"));
      const decisionAt = content.indexOf(expected[0]);
      const processAt = content.indexOf(expected[1], decisionAt);
      const railAt = content.indexOf(lang === "ja" ? "工程一覧（" : "Progress rail (", processAt);
      assert.ok(decisionAt < processAt && processAt < railAt, `${lang}/${agent} foregrounds one human decision, then the three readings, then the rail`);
    });

    test(`${lang}/${agent} overview keeps process, decisions, and outcomes distinct`, () => {
      const skill = read(`templates/${lang}/${agent}/skills/intent-overview/SKILL.md`);
      const progress = read(`templates/${lang}/${agent}/skills/intent-overview/rules/progress-readout.md`);
      const expected = lang === "ja"
        ? ["工程の状態", "未決の設計判断", "利用者成果", "未観測", "総合PASS"]
        : ["Process health", "Unresolved design decisions", "User outcomes", "unobserved", "overall PASS"];

      for (const phrase of expected) {
        assert.ok(`${skill}\n${progress}`.includes(phrase), `${lang}/${agent} overview includes ${phrase}`);
      }
      const outputStart = skill.indexOf(lang === "ja" ? "## Output Description" : "## Output Description");
      const processAt = skill.indexOf(expected[0], outputStart);
      const railAt = skill.indexOf(lang === "ja" ? "作業単位ごとの進行状況（" : "Progress rail (", processAt);
      assert.ok(outputStart >= 0 && processAt > outputStart && railAt > processAt, `${lang}/${agent} overview puts the three readings before the rail`);
    });
  }
}
