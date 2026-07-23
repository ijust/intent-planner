import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planGitignore } from "../src/install.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const read = (relative) => fs.readFileSync(path.join(REPO_ROOT, relative), "utf8");

const SYSTEMS = [
  [".claude", "ja"],
  [".agents", "ja"],
  ["templates/ja/claude", "ja"],
  ["templates/ja/codex", "ja"],
  ["templates/en/claude", "en"],
  ["templates/en/codex", "en"],
];

const ROOT_DOCS = [
  ["AGENTS.md", "ja"],
  ["CLAUDE_intent.md", "ja"],
  ["templates/ja/agents/claude/CLAUDE_intent.md", "ja"],
  ["templates/ja/agents/codex/AGENTS.md", "ja"],
  ["templates/ja/agents/gemini/GEMINI_intent.md", "ja"],
  ["templates/en/agents/claude/CLAUDE_intent.md", "en"],
  ["templates/en/agents/codex/AGENTS.md", "en"],
  ["templates/en/agents/gemini/GEMINI_intent.md", "en"],
];

test("自然な引き継ぎ依頼の起動規則は handoff-bridge 所有で、root 文書へ複製しない", () => {
  for (const [relative] of ROOT_DOCS) {
    const content = read(relative);
    assert.doesNotMatch(content, /handoff-bridge/u, `${relative}: 所有側の起動・保存規則を複製しない`);
  }

  for (const relative of [
    ".agents/skills/handoff-bridge/SKILL.md",
    ".claude/skills/handoff-bridge/SKILL.md",
  ]) {
    const content = read(relative);
    assert.match(content, /description:.*引き継いで.*引継書を書いて.*handoffを作って/u);
    assert.match(content, /既定保存/u);
    assert.match(content, /\.handoff-bridge\//u);
  }
});

for (const [system] of SYSTEMS) {
  test(`${system} に内部の intent-handoff スキルを再導入しない`, () => {
    assert.ok(!fs.existsSync(path.join(REPO_ROOT, system, "skills", "intent-handoff")));
  });
}

for (const [system, lang] of SYSTEMS) {
  test(`${system} の overview は引き継ぎ生成を担当しない`, () => {
    const rulesPath = path.join(REPO_ROOT, system, "skills", "intent-overview", "rules", "handoff-brief.md");
    assert.ok(!fs.existsSync(rulesPath));
    const content = read(path.join(system, "skills", "intent-overview", "SKILL.md"));
    assert.doesNotMatch(content, /rules\/handoff-brief\.md/u);
    const boundary = lang === "ja" ? /\.intent\/overview\/` 配下限定/u : /limited to (under )?`\.intent\/overview\//iu;
    assert.match(content, boundary);
  });
}

for (const [system, lang] of SYSTEMS) {
  for (const skill of ["intent-packets", "intent-writeback"]) {
    test(`${system}/${skill} は案内契機だけを持ち、handoff-bridge の実行規則を複製しない`, () => {
      const content = read(path.join(system, "skills", skill, "SKILL.md"));
      const compatible = lang === "ja" ? /互換確認済み.*handoff-bridge/u : /compatibility-verified.*handoff-bridge/iu;
      assert.match(content, compatible);
      assert.doesNotMatch(content, /\.handoff-bridge\//u);
      assert.doesNotMatch(content, /\.intent\/handoff(?:-bridge)?\//u);
      assert.doesNotMatch(content, /保存先|destination|Receiver Checks|saved file name/iu);
      const degrade = lang === "ja"
        ? /未配置・非互換・確認失敗.*生成.*案内を出さない/u
        : /not installed, incompatible, or verification fails.*do not emit.*generation guidance/is;
      assert.match(content, degrade);
    });
  }
}

test("intent-planner installer は handoff-bridge の保存領域をルート .gitignore に追加しない", () => {
  const temporary = fs.mkdtempSync(path.join(REPO_ROOT, ".tmp-handoff-test-"));
  try {
    fs.mkdirSync(path.join(temporary, ".git"));
    const plan = planGitignore(temporary);
    assert.equal(plan.action, "create");
    assert.ok(!plan.blockLines.includes(".intent/handoff-bridge/*"));
    assert.ok(!plan.blockLines.includes("!.intent/handoff-bridge/README.md"));
    assert.ok(!plan.blockLines.includes(".handoff-bridge/*"));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

for (const lang of ["ja", "en"]) {
  test(`${lang} template は旧 handoff-bridge scaffold を配布しない`, () => {
    assert.ok(!fs.existsSync(path.join(TEMPLATES, lang, "intent", "handoff-bridge", "README.md")));
  });
}
