import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const skills = [
  ['ja', 'claude'],
  ['ja', 'codex'],
  ['en', 'claude'],
  ['en', 'codex'],
];

for (const [lang, agent] of skills) {
  test(`${lang}/${agent} status reports every drift outcome`, async () => {
    const url = new URL(`../templates/${lang}/${agent}/skills/intent-status/SKILL.md`, import.meta.url);
    const content = await readFile(url, 'utf8');

    assert.match(
      content,
      /prevented N \/ caught N \/ missed N \/ false-positive N \/ not-applicable N \/ unjudged N/,
    );
    assert.match(content, /\| prevented \| outcome \|/);
    assert.match(content, /\| not-applicable \| outcome \|/);
    assert.match(content, /unknown N/);
    assert.match(content, /all (?:six )?counts|6項目すべて/);
  });
}

test('Codex dogfood status stays synchronized with its Japanese template', async () => {
  const [template, dogfood] = await Promise.all([
    readFile(new URL('../templates/ja/codex/skills/intent-status/SKILL.md', import.meta.url), 'utf8'),
    readFile(new URL('../.agents/skills/intent-status/SKILL.md', import.meta.url), 'utf8'),
  ]);

  assert.equal(dogfood, template);
});
