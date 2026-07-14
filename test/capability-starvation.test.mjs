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

function evaluateFixture({ hasValueStatement, coreState, coreExported, supportDone }) {
  if (!hasValueStatement) return "skipped-unverified";
  if (coreState === "implementing" || coreState === "verifying" || coreState === "done" || coreExported) return "silent";
  return supportDone >= 2 ? "finding" : "silent";
}

function contractIssues(text) {
  const lower = text.toLowerCase();
  const issues = [];
  if (!/(semantic|meaning|意味)/.test(lower)) issues.push("semantic judgment missing");
  if (!/(no fixed|numeric threshold|固定閾値|件数の固定値)/.test(lower)) issues.push("fixed-threshold prohibition missing");
  if (/(after exactly|at least \d+|\d+ days|ちょうど\d+|\d+日)/.test(lower)) issues.push("fixed threshold introduced");
  if (!/(suspected|candidate|疑い|候補)/.test(lower)) issues.push("tentative wording missing");
  if (/(definitely starved|is starved|飢餓状態である|確実に未着手)/.test(lower)) issues.push("assertive wording introduced");
  return issues;
}

test("fixture oracle distinguishes starvation, healthy progress, and missing inputs", () => {
  assert.equal(evaluateFixture({ hasValueStatement: true, coreState: "ready", coreExported: false, supportDone: 3 }), "finding");
  assert.equal(evaluateFixture({ hasValueStatement: true, coreState: "implementing", coreExported: true, supportDone: 3 }), "silent");
  assert.equal(evaluateFixture({ hasValueStatement: false, coreState: "ready", coreExported: false, supportDone: 3 }), "skipped-unverified");
});

test("mutation oracle rejects a numeric threshold and an assertive finding", () => {
  const baseline = "Use semantic meaning, no fixed numeric threshold, and report a suspected candidate only.";
  assert.deepEqual(contractIssues(baseline), []);

  const thresholdMutation = baseline.replace("no fixed numeric threshold", "after exactly 3 days");
  assert.notEqual(thresholdMutation, baseline, "threshold mutation was injected");
  assert.ok(contractIssues(thresholdMutation).includes("fixed threshold introduced"));

  const assertionMutation = baseline.replace("a suspected candidate", "the capability is starved");
  assert.notEqual(assertionMutation, baseline, "assertion mutation was injected");
  assert.ok(contractIssues(assertionMutation).includes("assertive wording introduced"));
});

for (const lang of LANGS) {
  test(`${lang} validate catalog defines the substantive capability-starvation contract`, () => {
    const claude = read(`templates/${lang}/claude/skills/intent-validate/rules/validate-checks.md`);
    const codex = read(`templates/${lang}/codex/skills/intent-validate/rules/validate-checks.md`);
    assert.equal(claude, codex, `${lang} catalog keeps claude/codex byte parity`);

    const row = claude.split("\n").find((line) => line.startsWith("| capability-starvation |"));
    assert.ok(row, "catalog row exists");
    const expected = lang === "ja"
      ? ["North Star", "Current Drift", "packet frontmatter", "plan.md", "export-log", "意味判断", "固定閾値", "疑い", "情報", "スキップ"]
      : ["North Star", "Current Drift", "packet frontmatter", "plan.md", "export-log", "semantic", "fixed threshold", "suspected", "info", "skip"];
    for (const phrase of expected) assert.ok(row.toLowerCase().includes(phrase.toLowerCase()), `catalog row includes ${phrase}`);
    assert.deepEqual(contractIssues(row), []);
  });

  for (const agent of AGENTS) {
    test(`${lang}/${agent} validate applies capability-starvation after Step 3.18`, () => {
      const skill = read(`templates/${lang}/${agent}/skills/intent-validate/SKILL.md`);
      const step318 = skill.indexOf("### Step 3.18:");
      const step319 = skill.indexOf("### Step 3.19:");
      const step4 = skill.indexOf("### Step 4:");
      assert.ok(step318 >= 0 && step318 < step319 && step319 < step4);

      const section = skill.slice(step319, step4);
      const expected = lang === "ja"
        ? ["capability-starvation", "North Star", "Current Drift", "Walking Skeleton", "未 export", "意味判断", "固定閾値", "疑い", "沈黙", "未検証", "自動変更"]
        : ["capability-starvation", "North Star", "Current Drift", "Walking Skeleton", "unexported", "semantic", "fixed threshold", "suspected", "silent", "unverified", "automatic"];
      for (const phrase of expected) assert.ok(section.toLowerCase().includes(phrase.toLowerCase()), `${lang}/${agent} Step 3.19 includes ${phrase}`);
      assert.deepEqual(contractIssues(section), []);
    });
  }
}
