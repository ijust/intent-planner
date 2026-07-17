// 利用者向け報告の「何をしたかを通じる言葉で先に示す」点検項目（(6)）が、
// 全エージェント本体（ja/en × claude/codex/gemini）と dogfood 本体に載り続けることの回帰テスト。
// 起点: 2026-07-18 利用者指示「これを示さないのは Invariants だね」「このツールでだよ」。
// 表層マーカーではなく実質句で判定する（test-asserts-substance-not-surface-marker）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const JA_PHRASE = "「今回何をしたか」を読み手に通じる言葉で先に示しているか";
const JA_GUARD = "記号の羅列やログの転写で代替しない";
const EN_PHRASE = "stating what was done this time, first, in words the reader understands";
const EN_GUARD = "transcript of your work log";

const targets = [
  ["ja", "templates/ja/agents/claude/CLAUDE_intent.md"],
  ["ja", "templates/ja/agents/codex/AGENTS.md"],
  ["ja", "templates/ja/agents/gemini/GEMINI_intent.md"],
  ["en", "templates/en/agents/claude/CLAUDE_intent.md"],
  ["en", "templates/en/agents/codex/AGENTS.md"],
  ["en", "templates/en/agents/gemini/GEMINI_intent.md"],
];

for (const [lang, rel] of targets) {
  test(`report-what-was-done: ${rel} が「何をしたかを先に示す」点検を持つ`, () => {
    const body = readFileSync(path.join(ROOT, rel), "utf8");
    const phrase = lang === "ja" ? JA_PHRASE : EN_PHRASE;
    const guard = lang === "ja" ? JA_GUARD : EN_GUARD;
    assert.ok(body.includes(phrase), `${rel} に点検の実質句が無い`);
    assert.ok(body.includes(guard), `${rel} に「羅列・転写で代替しない」の歯止めが無い`);
  });
}

test("report-what-was-done: dogfood 本体（存在すれば）も同じ点検を持つ", () => {
  for (const rel of ["CLAUDE_intent.md", "AGENTS.md"]) {
    const p = path.join(ROOT, rel);
    if (!existsSync(p)) continue;
    const body = readFileSync(p, "utf8");
    assert.ok(body.includes(JA_PHRASE), `${rel}（dogfood）に点検の実質句が無い`);
  }
});

test("report-what-was-done: 言語内でエージェント間の点検文が一致する", () => {
  for (const lang of ["ja", "en"]) {
    const phrase = lang === "ja" ? JA_PHRASE : EN_PHRASE;
    const bodies = targets
      .filter(([l]) => l === lang)
      .map(([, rel]) => readFileSync(path.join(ROOT, rel), "utf8"));
    const snippets = bodies.map((b) => {
      const i = b.indexOf(phrase);
      assert.ok(i !== -1);
      return b.slice(i, i + 200);
    });
    assert.ok(snippets.every((s) => s === snippets[0]), `${lang} でエージェント間の文面が揃っていない`);
  }
});
