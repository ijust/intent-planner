import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = [
  ["intent-export-cc-sdd", "map-cc-sdd.md"],
  ["intent-export-openspec", "map-openspec.md"],
  ["intent-export-speckit", "map-speckit.md"],
];

function templatePath(lang, agent, skill, file) {
  return path.join(ROOT, "templates", lang, agent, "skills", skill, "rules", file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

test("3つの実装向け出口が、要件を下流タスクへ割り当てて無担当を残さない", () => {
  for (const [skill, file] of TARGETS) {
    for (const agent of ["claude", "codex"]) {
      const body = read(templatePath("ja", agent, skill, file));
      assert.match(body, /各要件・受入項目|各 Requirement \/ Scenario/);
      assert.match(body, /少なくとも1つのタスクへ割り当て/);
      assert.match(body, /確認を求める/);
      assert.match(body, /共同担当は許す/);
      assert.match(body, /単一タスクなら非該当/);
    }
  }
});

test("3つの実装向け出口が、受入条件の反例と実運用相当経路を確認する", () => {
  for (const [skill, file] of TARGETS) {
    for (const agent of ["claude", "codex"]) {
      const body = read(templatePath("ja", agent, skill, file));
      assert.match(body, /受入条件.*満たしても.*壊れる|Scenario が通っても Requirement が壊れる/);
      assert.match(body, /実運用相当の経路/);
      assert.match(body, /通信・設定・起動構成/);
      assert.match(body, /理由付きで非該当/);
      assert.match(body, /全テストを実運用環境で動かすこと.*要求しない/);
      assert.match(body, /packet にないテスト方式を発明すること.*要求しない/);
    }
  }
});

test("英語の3出口にも同じ2つの確認と非該当の逃げ道がある", () => {
  for (const [skill, file] of TARGETS) {
    for (const agent of ["claude", "codex"]) {
      const body = read(templatePath("en", agent, skill, file));
      assert.match(body, /Downstream task-breakdown handoff/);
      assert.match(body, /at least one task/);
      assert.match(body, /no boundary item unowned/);
      assert.match(body, /Acceptance counterexample check/);
      assert.match(body, /production-equivalent path/);
      assert.match(body, /reasoned not-applicable/);
      assert.match(body, /Do not require every test to run in production/);
      assert.match(body, /invent a test method absent from the packet/);
    }
  }
});

test("各言語のclaude/codex ruleと日本語dogfood配置が一致する", () => {
  for (const [skill, file] of TARGETS) {
    assert.equal(
      read(templatePath("ja", "claude", skill, file)),
      read(templatePath("ja", "codex", skill, file)),
      `${skill}: ja claude/codex`,
    );
    assert.equal(
      read(templatePath("en", "claude", skill, file)),
      read(templatePath("en", "codex", skill, file)),
      `${skill}: en claude/codex`,
    );
    assert.equal(
      read(templatePath("ja", "claude", skill, file)),
      read(path.join(ROOT, ".claude", "skills", skill, "rules", file)),
      `${skill}: .claude dogfood`,
    );
    assert.equal(
      read(templatePath("ja", "claude", skill, file)),
      read(path.join(ROOT, ".agents", "skills", skill, "rules", file)),
      `${skill}: .agents dogfood`,
    );
  }
});
