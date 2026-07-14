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
  assert.equal(c.rootDoc, "CLAUDE.md", "claude は rootDoc=CLAUDE.md");
  assert.equal(c.rootDocImport, true, "claude は @import 記法あり (A2: 参照1行追記)");
});

test("AGENT_REGISTRY: codex エントリは Codex 配置を表現する", () => {
  const x = AGENT_REGISTRY.codex;
  assert.ok(x, "codex エントリが存在する");
  assert.equal(x.skillSubdir, "codex", "skillSubdir は codex");
  assert.equal(x.skillDest, ".agents/skills", "skillDest は .agents/skills");
  assert.equal(x.rootDoc, "AGENTS.md", "codex は rootDoc=AGENTS.md");
  assert.equal(x.rootDocImport, false, "codex は @import 記法なし (A1: 本文末尾へ append)");
});

test("AGENT_REGISTRY: gemini エントリは Gemini 配置を表現する (1.1)", () => {
  const g = AGENT_REGISTRY.gemini;
  assert.ok(g, "gemini エントリが存在する");
  // skillDest は cross-tool alias の .agents/skills を共有候補とする (DR35・第一候補)。
  assert.equal(g.skillDest, ".agents/skills", "skillDest は .agents/skills (共有候補)");
  assert.equal(g.rootDoc, "GEMINI.md", "gemini は rootDoc=GEMINI.md");
  // skillSubdir は codex 共有で確定済み（task 3.2・実機 smoke で gemini CLI が .agents/skills を読むことを確証）。
  assert.equal(g.skillSubdir, "codex", "skillSubdir は codex 共有で確定（task 3.2・実機 smoke 済み）");
  assert.equal(g.rootDocImport, true, "gemini は @import 記法あり (A2: 参照1行追記)");
});

// import 有無は汎用フラグで表現する (INV33/DR51): agent 名ハードコード分岐を増やさない。
// claude / gemini = @import あり (A2)、codex = @import なし (A1)。
test("AGENT_REGISTRY: rootDocImport は import 有無の汎用フラグ (claude/gemini=true, codex=false)", () => {
  assert.equal(AGENT_REGISTRY.claude.rootDocImport, true, "claude=@import あり");
  assert.equal(AGENT_REGISTRY.gemini.rootDocImport, true, "gemini=@import あり");
  assert.equal(AGENT_REGISTRY.codex.rootDocImport, false, "codex=@import なし");
});

test("AGENT_REGISTRY: 各エントリは自分の agent 名を知っている (rootDoc ソースパス解決用)", () => {
  assert.equal(AGENT_REGISTRY.claude.agentName, "claude", "claude.agentName");
  assert.equal(AGENT_REGISTRY.codex.agentName, "codex", "codex.agentName");
  assert.equal(AGENT_REGISTRY.gemini.agentName, "gemini", "gemini.agentName");
});

test("AGENT_REGISTRY: 各agentのterm-drift引数と専用skill配置先を同じentryに保持する", () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(AGENT_REGISTRY).map(([agent, entry]) => [
        agent,
        {
          arg: entry.termDriftArg,
          skillDest: entry.termDriftSkillDest,
        },
      ]),
    ),
    {
      claude: { arg: "--claude", skillDest: ".claude/skills/term-drift" },
      codex: { arg: "--codex", skillDest: ".agents/skills/term-drift" },
      gemini: { arg: "--gemini", skillDest: ".gemini/skills/term-drift" },
    },
    "外部契約は選択済みagent entryだけから取得できる",
  );
});

// 7.2 更新 (1.1/1.2): AGENT_REGISTRY は claude / codex / gemini を含む。
// 未登録 agent の封じ自体は別名 (cursor) で残す (Anti-direction 97)。
// このテストはレジストリに想定外の agent (cursor 等) を 1 つでも足すと即 fail する。
test("AGENT_REGISTRY: キー集合は厳密に [claude, codex, gemini] のみ (1.1, 1.2)", () => {
  assert.deepEqual(
    Object.keys(AGENT_REGISTRY).sort(),
    ["claude", "codex", "gemini"],
    "登録 agent は claude / codex / gemini の 3 つだけ (cursor 等は無い)",
  );
});

// 未登録 agent の封じ (1.2): cursor 等はエントリ無しのまま。
test("AGENT_REGISTRY: 未登録 agent (cursor) はエントリ無し (縫い目: 封じを別名で存置)", () => {
  assert.equal(AGENT_REGISTRY.cursor, undefined, "cursor は未登録");
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

test("computeCopyPlan(claude 既定): 計画先は .claude/skills と .intent とルート CLAUDE.md", () => {
  const tgt = tmpDir();
  try {
    const plan = computeCopyPlan(JA_ROOT, tgt, {});
    assert.ok(plan.length > 0, "計画が空でない");
    for (const e of plan) {
      // claude-md-onboarding-doc (2026-06) で実 templates の CLAUDE.md テンプレが
      // 実在化したため、claude 計画にルート直下 CLAUDE.md が入る (codex/AGENTS.md と同型)。
      // さらに Anti-533 (2026-07-14) で本体 CLAUDE_intent.md も常に計画へ入る
      // (新規リポでも本体を配る。入口 CLAUDE.md は本体への参照1行に徹する)。
      assert.ok(
        e.relative.startsWith(`.claude${path.sep}skills`) ||
          e.relative.startsWith(".intent") ||
          e.relative === AGENT_REGISTRY.claude.rootDoc ||
          e.relative === "CLAUDE_intent.md",
        `claude 計画先は .claude/skills か .intent かルート CLAUDE.md / CLAUDE_intent.md: ${e.relative}`,
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

// ---- computeCopyPlan: claude rootDoc 配置経路と後方互換 (claude-rootdoc-seam) ----
//
// claude.rootDoc は "CLAUDE.md" を指す（1.1 で有効化）。テンプレ本文
// templates/<lang>/agents/claude/CLAUDE.md は本 seam では未配置のため、
// 実 JA_ROOT を使う検証はテンプレ不在経路（後方互換）を確かめる。
// テンプレ存在時の配置経路は一時 langRoot fixture を作って確かめる。

// claude rootDoc 計画から "CLAUDE.md" を指すエントリだけを取り出すヘルパ。
// 配置先 relative が "CLAUDE.md" のエントリ（ルート直下配置）が rootDoc 計画。
function claudeRootDocEntries(plan) {
  return plan.filter((e) => e.relative === "CLAUDE.md");
}

// 最小の langRoot fixture を作る: claude skill ツリー1件・共有 intent 1件・
// agents/claude/CLAUDE.md（rootDoc テンプレ本文）を置く。
// withRootDoc=false なら CLAUDE.md テンプレを置かない（不在経路の fixture）。
function makeClaudeLangRoot({ withRootDoc }) {
  const root = tmpDir("ip-claude-langroot-");
  const skillDir = path.join(root, "claude", "skills", "intent-sample");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), "sample skill");
  const intentDir = path.join(root, "intent");
  fs.mkdirSync(intentDir, { recursive: true });
  fs.writeFileSync(path.join(intentDir, "README.md"), "shared intent");
  if (withRootDoc) {
    const agentDir = path.join(root, "agents", "claude");
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, "CLAUDE.md"), "claude root doc body");
  }
  return root;
}

// (a) テンプレ存在時: claude 計画にルート CLAUDE.md 配置エントリがちょうど1件 (1.1, 1.2, 1.3)。
test("computeCopyPlan(claude): CLAUDE.md テンプレ存在時はルート CLAUDE.md 配置を1件計画する (1.1)", () => {
  const langRoot = makeClaudeLangRoot({ withRootDoc: true });
  const tgt = tmpDir();
  try {
    const plan = computeCopyPlan(langRoot, tgt, {
      agentEntry: AGENT_REGISTRY.claude,
    });
    const rootDocs = claudeRootDocEntries(plan);
    assert.equal(rootDocs.length, 1, "CLAUDE.md 配置エントリはちょうど1件");
    assert.ok(
      rootDocs[0].from.endsWith(path.join("agents", "claude", "CLAUDE.md")),
      `CLAUDE.md ソースは agents/claude/CLAUDE.md: ${rootDocs[0].from}`,
    );
    assert.equal(
      rootDocs[0].to,
      path.join(tgt, "CLAUDE.md"),
      "CLAUDE.md 配置先はルート直下 (1.2)",
    );
    assert.equal(rootDocs[0].action, "COPY", "新規配置先では COPY");
  } finally {
    fs.rmSync(langRoot, { recursive: true, force: true });
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// (b) テンプレ不在時: CLAUDE.md エントリが計画に無い かつ 算出が例外を投げない (2.1, 2.2)。
test("computeCopyPlan(claude): CLAUDE.md テンプレ不在時は CLAUDE.md を計画せず例外も投げない (2.1, 2.2)", () => {
  const langRoot = makeClaudeLangRoot({ withRootDoc: false });
  const tgt = tmpDir();
  try {
    let plan;
    assert.doesNotThrow(() => {
      plan = computeCopyPlan(langRoot, tgt, {
        agentEntry: AGENT_REGISTRY.claude,
      });
    }, "テンプレ不在でも computeCopyPlan は例外を投げず完了する (2.2)");
    assert.ok(plan.length > 0, "skill/intent 計画は出る（処理は継続）");
    assert.equal(
      claudeRootDocEntries(plan).length,
      0,
      "CLAUDE.md 配置エントリは計画に含まれない (2.1)",
    );
  } finally {
    fs.rmSync(langRoot, { recursive: true, force: true });
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// (c) discriminative オラクル: 実 JA_ROOT に CLAUDE.md テンプレが実在するので
// ルート CLAUDE.md 配置エントリはちょうど 1 件 (codex/AGENTS.md と同型)。
// claude-md-onboarding-doc (2026-06) で templates/{ja,en}/agents/claude/CLAUDE.md を
// 実在化したため、先行 seam (claude-rootdoc-seam) の「テンプレ不在で 0 件」前提は更新済み。
// rootDoc を null に戻すとこの 1 件が落ちる（= 誤実装を落とす discriminative ペア）。
test("computeCopyPlan(claude): 実 JA_ROOT は CLAUDE.md テンプレ実在のためルート CLAUDE.md を1件計画する (2.3)", () => {
  const tgt = tmpDir();
  try {
    const plan = computeCopyPlan(JA_ROOT, tgt, {
      agentEntry: AGENT_REGISTRY.claude,
    });
    const rootDocs = claudeRootDocEntries(plan);
    assert.equal(
      rootDocs.length,
      1,
      "実テンプレ実在のため CLAUDE.md エントリはちょうど 1 件 (codex/AGENTS.md と同型)",
    );
    assert.ok(
      rootDocs[0].from.endsWith(path.join("agents", "claude", "CLAUDE.md")),
      `CLAUDE.md ソースは agents/claude/CLAUDE.md: ${rootDocs[0].from}`,
    );
    assert.equal(
      rootDocs[0].to,
      path.join(tgt, "CLAUDE.md"),
      "CLAUDE.md 配置先はルート直下",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// (d) テンプレ不在時、配置先に既存の CLAUDE.md があっても書き込み・上書き・退避が計画されない (4.1)。
test("computeCopyPlan(claude): テンプレ不在なら既存 CLAUDE.md への書き込み/上書き/退避を計画しない (4.1)", () => {
  const langRoot = makeClaudeLangRoot({ withRootDoc: false });
  const tgt = tmpDir();
  try {
    // 利用者の既存 CLAUDE.md を配置先ルートに置く。
    fs.writeFileSync(path.join(tgt, "CLAUDE.md"), "user's own CLAUDE.md");
    const plan = computeCopyPlan(langRoot, tgt, {
      agentEntry: AGENT_REGISTRY.claude,
    });
    // CLAUDE.md を指すエントリ自体が無い＝COPY も SKIP も backup も一切計画されない。
    assert.equal(
      claudeRootDocEntries(plan).length,
      0,
      "既存 CLAUDE.md への配置エントリ（書き込み/上書き/退避）は計画されない (4.1)",
    );
    // backup フラグの立つエントリが CLAUDE.md について存在しないことも明示確認。
    assert.equal(
      plan.filter((e) => e.relative === "CLAUDE.md" && e.backup).length,
      0,
      "CLAUDE.md の退避（backup）は計画されない",
    );
  } finally {
    fs.rmSync(langRoot, { recursive: true, force: true });
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

test("install: 不正 agent (cursor) はエラーを投げ何も配置しない (1.2: 封じを別名で存置)", () => {
  const tgt = tmpDir();
  try {
    assert.equal(AGENT_REGISTRY.cursor, undefined, "未知agentには外部実行契約も存在しない");
    assert.throws(() => install(tgt, { agent: "cursor" }), /cursor|agent|エージェント/i);
    assert.equal(fs.readdirSync(tgt).length, 0, "配置先は空のまま (エラー停止)");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("install(agent:gemini): gemini は有効・.intent は配置され .claude は作られない (1.1)", () => {
  const tgt = tmpDir();
  try {
    const result = install(tgt, { agent: "gemini" });
    assert.equal(result.agent, "gemini", "解決 agent は gemini");
    assert.ok(fs.existsSync(path.join(tgt, ".intent")), "共有 .intent は配置される");
    assert.ok(!fs.existsSync(path.join(tgt, ".claude")), ".claude は作られない (非干渉)");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// 2.2: 配置先パスの正しさ（degrade の床）。実機 smoke (2.1) で .agents/skills 共有が
// Gemini CLI に読まれることを確証済み（skillDest 共有確定）。本テストは実機 CLI 無しでも
// 常に走る自動検証として、gemini 配置物が確定した配置先（registry の skillDest=.agents/skills）
// に存在し、skill ツリーが .agents/skills/intent-* へ実際に配置されることを固定する。
test("install(agent:gemini): skill は確定配置先 .agents/skills/intent-* へ・パスが registry と一致 (2.2)", () => {
  const tgt = tmpDir();
  try {
    install(tgt, { agent: "gemini" });
    const skillDest = AGENT_REGISTRY.gemini.skillDest;
    assert.equal(skillDest, ".agents/skills", "gemini の skillDest は .agents/skills（共有確定）");
    const destDir = path.join(tgt, ...skillDest.split("/"));
    assert.ok(fs.existsSync(destDir), `gemini 配置先 ${skillDest} が実在する`);
    // intent-* skill が確定配置先に置かれている（暫定共有パスに偶然 pass する状態ではない）。
    const entries = fs.readdirSync(destDir);
    assert.ok(
      entries.some((e) => e.startsWith("intent-")),
      `${skillDest}/intent-* が配置される: ${entries.join(",")}`,
    );
    // 非干渉: gemini で .claude/ は作られない。
    assert.ok(!fs.existsSync(path.join(tgt, ".claude")), "gemini 配置に .claude は無い");
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
