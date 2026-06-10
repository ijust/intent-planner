// インストーラの agent 次元のテスト (task 1.1: AGENT_REGISTRY + コピー計画の agent 一般化)
// node:test 標準・依存ゼロ。既存 install.test.mjs (i18n) とは独立。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { fileURLToPath } from "node:url";

import {
  AGENT_REGISTRY,
  computeCopyPlan,
  install,
  defaultTemplatesDir,
  resolveLangRoot,
} from "../src/install.mjs";

const TEMPLATES = defaultTemplatesDir();
const JA_ROOT = resolveLangRoot(TEMPLATES, "ja").langRoot;
const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

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

// 7.2: AGENT_REGISTRY は claude / codex のみを含む (Gemini 等の混入を防ぐ)。
// このテストはレジストリに gemini/cursor 等を 1 つでも足すと即 fail する。
test("AGENT_REGISTRY: キー集合は厳密に [claude, codex] のみ (Gemini 等を含まない, 7.2)", () => {
  assert.deepEqual(
    Object.keys(AGENT_REGISTRY).sort(),
    ["claude", "codex"],
    "登録 agent は claude と codex の 2 つだけ (gemini/cursor 等は無い)",
  );
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

// 5.1: codex テンプレが存在する今、claude 計画が codex 由来を一切引かないことを確かめる。
// ソースパスに templates/.../codex/ を含まず、配置先に .agents/ を含まない。
test("computeCopyPlan(claude 既定): codex ソース (codex/) も .agents/ 配置先も漏れない (非干渉 5.1)", () => {
  const tgt = tmpDir();
  try {
    const plan = computeCopyPlan(JA_ROOT, tgt, {});
    assert.ok(plan.length > 0, "計画が空でない");
    for (const e of plan) {
      assert.ok(
        !e.from.includes(`${path.sep}codex${path.sep}`),
        `claude 計画のソースに codex/ ツリーが混入: ${e.from}`,
      );
      assert.ok(
        !e.relative.startsWith(`.agents${path.sep}`),
        `claude 計画の配置先に .agents/ が混入: ${e.relative}`,
      );
    }
    // claude skill ソースは claude/ ツリー由来であること (積極確認)。
    const skillEntries = plan.filter((e) =>
      e.relative.startsWith(`.claude${path.sep}skills`),
    );
    assert.ok(skillEntries.length > 0, "claude skill 計画がある");
    for (const e of skillEntries) {
      assert.ok(
        e.from.includes(`${path.sep}claude${path.sep}skills${path.sep}`),
        `claude skill ソースは claude/skills/ 由来: ${e.from}`,
      );
    }
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

// ---- computeCopyPlan: codex 計画の実配置 (テンプレ作成済み: skill + rootDoc + intent) ----

test("computeCopyPlan(codex): skill は .agents/skills/intent-* へ・rootDoc=AGENTS.md・.claude/ は無い (5.1)", () => {
  const tgt = tmpDir();
  try {
    const plan = computeCopyPlan(JA_ROOT, tgt, {
      agentEntry: AGENT_REGISTRY.codex,
    });

    // 配置先集合は .agents/skills / .intent / AGENTS.md に限られる (.claude/ は皆無)。
    for (const e of plan) {
      assert.ok(
        e.relative.startsWith(`.agents${path.sep}skills`) ||
          e.relative === "AGENTS.md" ||
          e.relative.startsWith(".intent"),
        `codex 計画先は .agents/skills / AGENTS.md / .intent のみ: ${e.relative}`,
      );
    }
    assert.equal(
      plan.filter((e) => e.relative.startsWith(`.claude${path.sep}`)).length,
      0,
      "codex 計画に .claude/ は一切出ない (非干渉 5.1)",
    );

    // skill 計画: .agents/skills/intent-* が実際に存在する (テンプレ作成済み)。
    const skillEntries = plan.filter((e) =>
      e.relative.startsWith(`.agents${path.sep}skills`),
    );
    assert.ok(skillEntries.length > 0, "codex skill 計画が空でない");
    assert.ok(
      skillEntries.some((e) =>
        e.relative.startsWith(`.agents${path.sep}skills${path.sep}intent-`),
      ),
      ".agents/skills/intent-* エントリがある",
    );
    for (const e of skillEntries) {
      assert.ok(
        e.from.includes(`${path.sep}codex${path.sep}skills${path.sep}`),
        `codex skill ソースは codex/skills/ 由来: ${e.from}`,
      );
    }

    // rootDoc 計画: AGENTS.md が 1 件・ソースは agents/codex/AGENTS.md。
    const rootDocs = plan.filter((e) => e.relative === "AGENTS.md");
    assert.equal(rootDocs.length, 1, "AGENTS.md は 1 件");
    assert.ok(
      rootDocs[0].from.endsWith(
        path.join("agents", "codex", "AGENTS.md"),
      ),
      `AGENTS.md ソースは agents/codex/AGENTS.md: ${rootDocs[0].from}`,
    );
    assert.equal(
      rootDocs[0].to,
      path.join(tgt, "AGENTS.md"),
      "AGENTS.md 配置先はルート直下",
    );

    // intent は agent 不問で出る (共有)。
    assert.ok(
      plan.some((e) => e.relative.startsWith(".intent")),
      "codex でも共有 .intent 計画が出る",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("computeCopyPlan(codex): 既存ファイルは SKIP・force で COPY (agent 不問の既存判定)", () => {
  const tgt = tmpDir();
  try {
    // 何も無い状態では全 COPY。
    const fresh = computeCopyPlan(JA_ROOT, tgt, {
      agentEntry: AGENT_REGISTRY.codex,
    });
    assert.ok(
      fresh.every((e) => e.action === "COPY"),
      "新規配置先では全エントリ COPY",
    );

    // AGENTS.md と codex skill の 1 件を既存にして SKIP を誘発する。
    const skillSample = fresh.find((e) =>
      e.relative.startsWith(`.agents${path.sep}skills`),
    );
    assert.ok(skillSample, "skill サンプルがある");
    for (const rel of ["AGENTS.md", skillSample.relative]) {
      const dest = path.join(tgt, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, "existing");
    }

    const planSkip = computeCopyPlan(JA_ROOT, tgt, {
      agentEntry: AGENT_REGISTRY.codex,
    });
    assert.equal(
      planSkip.find((e) => e.relative === "AGENTS.md").action,
      "SKIP",
      "既存 AGENTS.md は SKIP",
    );
    assert.equal(
      planSkip.find((e) => e.relative === skillSample.relative).action,
      "SKIP",
      "既存 codex skill は SKIP",
    );

    const planForce = computeCopyPlan(JA_ROOT, tgt, {
      agentEntry: AGENT_REGISTRY.codex,
      force: true,
    });
    assert.ok(
      planForce.every((e) => e.action === "COPY"),
      "force では既存でも全 COPY (agent 不問)",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- 依存ゼロ検証 (6.3): install.mjs / cli.mjs は node: ビルトインのみを import ----

test("依存ゼロ (6.3): src/install.mjs と bin/cli.mjs は node: ビルトインのみ import する", () => {
  const targets = [
    path.join(REPO_ROOT, "src", "install.mjs"),
    path.join(REPO_ROOT, "bin", "cli.mjs"),
  ];
  // `import ... from "spec"` / 副作用 import / 動的 import("spec") の specifier を抽出。
  const importRe =
    /\bimport\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const file of targets) {
    const src = fs.readFileSync(file, "utf8");
    const specs = [];
    let m;
    while ((m = importRe.exec(src)) !== null) {
      specs.push(m[1] ?? m[2] ?? m[3]);
    }
    assert.ok(specs.length > 0, `${file} は少なくとも 1 つ import する`);
    for (const spec of specs) {
      // 許可: node: ビルトイン、および相対/絶対のローカルパス (自リポ内モジュール)。
      // 禁止: bare specifier (= node_modules 由来の第三者依存)。
      const isNodeBuiltin = spec.startsWith("node:");
      const isLocal =
        spec.startsWith("./") ||
        spec.startsWith("../") ||
        spec.startsWith("/");
      assert.ok(
        isNodeBuiltin || isLocal,
        `${file} の import "${spec}" は node: ビルトインでもローカルパスでもない (第三者依存禁止 6.3)`,
      );
    }
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
