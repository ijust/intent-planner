import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cases = [
  {
    path: new URL('../docs/walkthrough.md', import.meta.url),
    prompt: '/intent-plan ログイン機能を作りたい',
    supersededPrompt: '/intent-discover ログイン機能を作りたい',
  },
  {
    path: new URL('../docs/walkthrough.en.md', import.meta.url),
    prompt: '/intent-plan I want to build a login feature',
    supersededPrompt: '/intent-discover I want to build a login feature',
  },
];

for (const walkthrough of cases) {
  test(`${walkthrough.path.pathname} starts the walkthrough with intent-plan`, async () => {
    const content = await readFile(walkthrough.path, 'utf8');

    assert.match(content, new RegExp(walkthrough.prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(content, new RegExp(walkthrough.supersededPrompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(content, /discover → compass → packets → export/);
  });
}
