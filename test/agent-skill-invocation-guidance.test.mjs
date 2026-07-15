import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

for (const lang of ["ja", "en"]) {
  test(`${lang}: Codex の discover は intent-compass を自然文で案内する`, () => {
    const body = read(`templates/${lang}/codex/skills/intent-discover/SKILL.md`);
    assert.match(body, lang === "ja" ? /「`intent-compass` を実行して」/ : /"Run `intent-compass`"/);
    assert.doesNotMatch(
      body,
      /Next is `?\/intent-compass|次は `?\/intent-compass|一手[^\n]*`\/intent-compass/,
      "利用者がそのまま入力する次の一手に /intent-compass を出さない",
    );
  });

  test(`${lang}: Claude の discover は /intent-compass を維持する`, () => {
    const body = read(`templates/${lang}/claude/skills/intent-discover/SKILL.md`);
    assert.match(body, /`\/intent-compass`/);
  });

  for (const [agent, rel] of [
    ["codex", `templates/${lang}/agents/codex/AGENTS.md`],
    ["gemini", `templates/${lang}/agents/gemini/GEMINI_intent.md`],
  ]) {
    test(`${lang}: ${agent} quickstart は intent skill を自然文で依頼するよう案内する`, () => {
      const body = read(rel);
      assert.match(
        body,
        lang === "ja"
          ? /スラッシュ付きで入力せず[^\n]*自然文で依頼/
          : /do not type them as slash commands[^\n]*ask in natural language/i,
      );
    });
  }
}
