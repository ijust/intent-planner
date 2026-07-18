import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SURFACES = [
  ["ja", "claude"],
  ["ja", "codex"],
  ["en", "claude"],
  ["en", "codex"],
];

for (const [lang, agent] of SURFACES) {
  const relative = `templates/${lang}/${agent}/skills/intent-plan/SKILL.md`;
  test(`${relative}: 薄い一続きの進行役である`, () => {
    const content = fs.readFileSync(path.resolve(relative), "utf8");
    assert.match(content, /name: intent-plan/);
    assert.match(content, /intent-discover\/instruction\.md/);
    assert.match(content, /intent-compass\/instruction\.md/);
    assert.match(content, /intent-packets\/instruction\.md/);
    assert.match(content, /generated\/views\/intent-export-/);
    assert.match(content, /Intent Planning|一続き/);
    assert.match(content, /specific stage|特定段階/);
    assert.match(content, /human|利用者|人が決める/i);
    assert.match(content, /do not start|開始しない|起動しない/i);
    for (const operation of [
      "now",
      "rand4",
      "mkdir-intent",
      "move-packet",
      "remove-own-drafting-assignment",
      "intent-check",
      "git-head",
    ]) {
      assert.match(content, new RegExp(operation));
    }
    assert.match(content, /alternate shell|代替shell/);
    assert.doesNotMatch(content, /SHA-256|manifest|transaction|rollback/i);
  });
}

test("Claude面だけが限定tool契約を持ち、skill chainingを禁止する", () => {
  for (const lang of ["ja", "en"]) {
    const claude = fs.readFileSync(
      path.resolve(`templates/${lang}/claude/skills/intent-plan/SKILL.md`),
      "utf8",
    );
    assert.match(
      claude,
      /allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Bash\(node \.intent\/scripts\/intent-plan-ops\.mjs \*\)/,
    );
    assert.match(claude, /disallowed-tools: Skill, Agent/);
    assert.doesNotMatch(claude, /disable-model-invocation/);
  }
});
