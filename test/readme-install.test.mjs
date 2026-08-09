// README は導入の入口、guide は詳細契約の正本として検査する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

const DOCS = [
  {
    readme: "README.md",
    guide: "docs/guide.md",
    install: "## インストール",
    portable: "### 3. WindowsポータブルZIP",
    guideLink: "docs/guide.md#インストールのオプション",
    demo: "https://youtu.be/S8bx6JOgPuI",
    start: ["Claude Code", "/intent-plan", "Codex / Gemini CLI", "スラッシュを付けず"],
    tour: [".intent/intent-tree.md", ".intent/intent-compass.md", ".intent/packets/", "実装用下書き", "アプリケーションコードの実装はまだ開始しません"],
  },
  {
    readme: "README.en.md",
    guide: "docs/guide.en.md",
    install: "## Install",
    portable: "### 3. Windows Portable ZIP",
    guideLink: "docs/guide.en.md#installation-options",
    demo: "https://youtu.be/WT3WVFk-iL0",
    start: ["Claude Code", "/intent-plan", "Codex / Gemini CLI", "do not add a slash"],
    tour: [".intent/intent-tree.md", ".intent/intent-compass.md", ".intent/packets/", "handoff draft", "Application-code implementation has not started"],
  },
];

for (const spec of DOCS) {
  test(`${spec.readme}: README は最短導入と詳細ガイドへの入口を保つ`, () => {
    const body = read(spec.readme);
    for (const token of [spec.install, spec.portable, spec.guideLink, spec.demo, ...spec.start, ...spec.tour]) {
      assert.ok(body.includes(token), `${spec.readme} に ${token} がある`);
    }
    for (const agent of ["claude", "codex", "gemini"]) {
      assert.ok(body.toLowerCase().includes(agent), `${spec.readme} が ${agent} を案内する`);
    }
    assert.ok(body.includes("npm install --save-dev intent-planner"));
    assert.ok(body.includes("intent-planner-v<version>-win-x64-portable.zip"));
    assert.ok(body.includes(".sha256"));
  });

  test(`${spec.guide}: 詳細な導入契約は guide に残る`, () => {
    const body = read(spec.guide);
    for (const token of [
      ".claude/skills/intent-*", ".agents/skills/", "CLAUDE.md", "AGENTS.md", "GEMINI.md",
      ".intent/", "--yes", "--enforce", "--with-ci", "--force", "--update-shared", "--no-update", ".bak",
    ]) {
      assert.ok(body.includes(token), `${spec.guide} に ${token} がある`);
    }
    for (const [name, version] of Object.entries(PACKAGE_JSON.dependencies ?? {})) {
      assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
      assert.ok(body.includes(`${name} ${version}`), `${spec.guide} に ${name} ${version} がある`);
    }
  });
}

test("package metadata は公開中の3 agentを列挙する", () => {
  for (const agent of ["claude", "codex", "gemini"]) {
    assert.ok(PACKAGE_JSON.description.toLowerCase().includes(agent));
    assert.ok(PACKAGE_JSON.keywords.includes(agent));
  }
});
