// インストーラの agent 次元のテスト (task 1.1: AGENT_REGISTRY + コピー計画の agent 一般化)
// node:test 標準・依存ゼロ。既存 install.test.mjs (i18n) とは独立。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  AGENT_REGISTRY,
  computeCopyPlan,
  install,
  defaultTemplatesDir,
  resolveLangRoot,
} from "../src/install.mjs";

const TEMPLATES = defaultTemplatesDir();
const JA_ROOT = resolveLangRoot(TEMPLATES, "ja").langRoot;

function tmpDir(prefix = "ip-agent-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ---- AGENT_REGISTRY: 形と縫い目 ----

test("AGENT_REGISTRY: claude エントリは現行 Claude 配置を表現する", () => {
  const c = AGENT_REGISTRY.claude;
  assert.ok(c, "claude エントリが存在する");
  assert.equal(c.skillSubdir, "claude", "skillSubdir は claude");
  assert.equal(c.skillDest, ".claude/skills", "skillDest は .claude/skills");
  assert.equal(c.rootDoc, null, "claude は rootDoc なし");
});

test("AGENT_REGISTRY: codex エントリは Codex 配置を表現する", () => {
  const x = AGENT_REGISTRY.codex;
  assert.ok(x, "codex エントリが存在する");
  assert.equal(x.skillSubdir, "codex", "skillSubdir は codex");
  assert.equal(x.skillDest, ".agents/skills", "skillDest は .agents/skills");
  assert.equal(x.rootDoc, "AGENTS.md", "codex は rootDoc=AGENTS.md");
});

test("AGENT_REGISTRY: 各エントリは自分の agent 名を知っている (rootDoc ソースパス解決用)", () => {
  assert.equal(AGENT_REGISTRY.claude.agentName, "claude", "claude.agentName");
  assert.equal(AGENT_REGISTRY.codex.agentName, "codex", "codex.agentName");
});

test("AGENT_REGISTRY: 未知 agent はエントリ無し (縫い目: 1エントリ追加で拡張)", () => {
  assert.equal(AGENT_REGISTRY.gemini, undefined, "gemini は未登録");
});

// ---- computeCopyPlan: claude 既定の後方互換・回帰の核心 ----

test("computeCopyPlan(claude 既定): 3引数 {force} 呼び出しと options 省略が同一計画 (後方互換)", () => {
  const tgt = tmpDir();
  try {
    const planOmit = computeCopyPlan(JA_ROOT, tgt, {});
    const planExplicit = computeCopyPlan(JA_ROOT, tgt, {
      agentEntry: AGENT_REGISTRY.claude,
    });
    assert.deepEqual(planOmit, planExplicit, "省略時 = claude 明示指定");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("computeCopyPlan(claude 既定): 計画先は .claude/skills と .intent のみ・rootDoc なし", () => {
  const tgt = tmpDir();
  try {
    const plan = computeCopyPlan(JA_ROOT, tgt, {});
    assert.ok(plan.length > 0, "計画が空でない");
    for (const e of plan) {
      assert.ok(
        e.relative.startsWith(`.claude${path.sep}skills`) ||
          e.relative.startsWith(".intent"),
        `claude 計画先は .claude/skills か .intent: ${e.relative}`,
      );
    }
    // AGENTS.md / .agents/ は claude 計画に現れない (非干渉 5.2)。
    assert.equal(
      plan.filter(
        (e) =>
          e.relative === "AGENTS.md" ||
          e.relative.startsWith(`.agents${path.sep}`),
      ).length,
      0,
      "claude 計画に AGENTS.md / .agents/ は無い",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("computeCopyPlan(claude 既定): 構成順序は skill → intent (skill 群がすべて intent 群より前)", () => {
  const tgt = tmpDir();
  try {
    const plan = computeCopyPlan(JA_ROOT, tgt, {});
    const lastSkill = plan
      .map((e) => e.relative.startsWith(`.claude${path.sep}skills`))
      .lastIndexOf(true);
    const firstIntent = plan
      .map((e) => e.relative.startsWith(".intent"))
      .indexOf(true);
    assert.ok(lastSkill >= 0 && firstIntent >= 0, "skill と intent の両方がある");
    assert.ok(lastSkill < firstIntent, "全 skill 計画が全 intent 計画より前");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- computeCopyPlan: codex 計画の形 (テンプレ未作成なので skill/rootDoc は空、intent のみ) ----

test("computeCopyPlan(codex): intent 計画は agent 不問で .intent へ (codex テンプレ未作成でも intent は出る)", () => {
  const tgt = tmpDir();
  try {
    const plan = computeCopyPlan(JA_ROOT, tgt, {
      agentEntry: AGENT_REGISTRY.codex,
    });
    const intentEntries = plan.filter((e) => e.relative.startsWith(".intent"));
    assert.ok(intentEntries.length > 0, "codex でも intent 計画は出る (共有)");
    // codex テンプレ未作成 (task 2.x) のため skill / rootDoc は空。.claude/ は一切出ない。
    assert.equal(
      plan.filter((e) => e.relative.startsWith(`.claude${path.sep}`)).length,
      0,
      "codex 計画に .claude/ は出ない (非干渉 5.1)",
    );
    // 出るとしたら .agents/skills か AGENTS.md か .intent のみ。
    for (const e of plan) {
      assert.ok(
        e.relative.startsWith(`.agents${path.sep}skills`) ||
          e.relative === "AGENTS.md" ||
          e.relative.startsWith(".intent"),
        `codex 計画先は .agents/skills / AGENTS.md / .intent: ${e.relative}`,
      );
    }
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- install: agent 引数 ----

test("install: agent 既定は claude・戻り値に agent を含む", () => {
  const tgt = tmpDir();
  try {
    const result = install(tgt, {});
    assert.equal(result.agent, "claude", "既定 agent は claude");
    assert.ok(fs.existsSync(path.join(tgt, ".claude", "skills")), ".claude/skills 配置");
    assert.ok(!fs.existsSync(path.join(tgt, ".agents")), ".agents/ は作られない");
    assert.ok(!fs.existsSync(path.join(tgt, "AGENTS.md")), "AGENTS.md は作られない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("install: 不正 agent はエラーを投げ何も配置しない", () => {
  const tgt = tmpDir();
  try {
    assert.throws(() => install(tgt, { agent: "gemini" }), /gemini|agent|エージェント/i);
    assert.equal(fs.readdirSync(tgt).length, 0, "配置先は空のまま (エラー停止)");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("install(agent:codex): .intent は配置され .claude は作られない (codex テンプレ未作成でも共有 intent は出る)", () => {
  const tgt = tmpDir();
  try {
    const result = install(tgt, { agent: "codex" });
    assert.equal(result.agent, "codex", "解決 agent は codex");
    assert.ok(fs.existsSync(path.join(tgt, ".intent")), "共有 .intent は配置される");
    assert.ok(!fs.existsSync(path.join(tgt, ".claude")), ".claude は作られない (非干渉)");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});
