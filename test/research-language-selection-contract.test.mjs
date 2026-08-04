import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  ["ja", ".agents/skills/CONTRACT.md"],
  ["ja", ".agents/skills/intent-plan/generated/CONTRACT.md"],
  ["ja", ".claude/skills/CONTRACT.md"],
  ["ja", "templates/ja/codex/skills/CONTRACT.md"],
  ["ja", "templates/ja/codex/skills/intent-plan/generated/CONTRACT.md"],
  ["ja", "templates/ja/claude/skills/CONTRACT.md"],
  ["ja", "templates/ja/claude/skills/intent-plan/generated/CONTRACT.md"],
  ["en", "templates/en/codex/skills/CONTRACT.md"],
  ["en", "templates/en/codex/skills/intent-plan/generated/CONTRACT.md"],
  ["en", "templates/en/claude/skills/CONTRACT.md"],
  ["en", "templates/en/claude/skills/intent-plan/generated/CONTRACT.md"],
];

test("research language: 原文言語を判断し、地域固定せず、必要なら複数言語を使う", () => {
  for (const [lang, rel] of targets) {
    const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    if (lang === "ja") {
      assert.ok(text.includes("調査言語を一次資料の原文に合わせる"), rel);
      assert.ok(text.includes("特定の地域・制度・利用者集団"), rel);
      assert.ok(text.includes("複数言語で調べる"), rel);
      assert.doesNotMatch(text, /日本固有の法令.*日本語を基本/);
    } else {
      assert.ok(text.includes("Match the research language to the primary sources"), rel);
      assert.ok(text.includes("specific to a region, institution, or user population"), rel);
      assert.ok(text.includes("Search in multiple languages"), rel);
      assert.doesNotMatch(text, /Japan-specific laws.*default to Japanese/);
    }
  }
});
