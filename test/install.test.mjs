// intent-planner installer のテスト (node:test 標準・依存ゼロ)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  computeCopyPlan,
  applyPlan,
  detectCcSdd,
  detectTrackedCcSdd,
  planGitignore,
  install,
  defaultTemplatesDir,
  resolveLangRoot,
  classifyFile,
  AGENT_REGISTRY,
} from "../src/install.mjs";

// これら i18n 統合テストは既定 agent (claude) を対象にする。
// 既定 agent の配置は agent-scoped: claude の skill サブツリー
// (<lang>/claude/skills/ → .claude/skills/) + 共有 (<lang>/intent/ → .intent/) のみ。
// codex サブツリー (<lang>/codex/, <lang>/agents/) は配置されない。
const CLAUDE = AGENT_REGISTRY.claude;

const TEMPLATES = defaultTemplatesDir();
// computeCopyPlan は言語ルートを起点にする (templates/ 直下ではなく templates/ja)。
const JA_ROOT = resolveLangRoot(TEMPLATES, "ja").langRoot;
// en も対応言語。computeCopyPlan は en ルート (templates/en) を起点に走査できる。
const EN_ROOT = resolveLangRoot(TEMPLATES, "en").langRoot;

function tmpDir(prefix = "ip-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// あるディレクトリ配下の全ファイルをそのディレクトリ相対パスで列挙する（任意ネスト・隠しファイル含む）。
// 配置先 (.claude / .intent) の実ファイル走査にも使う汎用ヘルパ。
function listFilesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const parent = entry.parentPath ?? entry.path;
      return path.relative(dir, path.join(parent, entry.name));
    });
}

// install が「既定 agent (claude) で実際に配置するファイル集合」を、
// 言語ルート相対の {langRel, placedRel} ペアで列挙する agent-aware ヘルパ。
// agent-scoped 配置に一致させるため、codex サブツリー (<lang>/codex/, <lang>/agents/) は含めない。
//   - claude skill サブツリー: <langRoot>/<skillSubdir>/skills/**  → <skillDest>/**
//     (既定 claude では <langRoot>/claude/skills/** → .claude/skills/**)
//   - 共有 intent scaffold:    <langRoot>/intent/**               → .intent/**
function expectedAgentFiles(langRoot, agentEntry = CLAUDE) {
  const pairs = [];

  // (a) skill サブツリー: <skillSubdir>/skills/<rel> → <skillDest>/<rel>
  const skillSubRoot = path.join(agentEntry.skillSubdir, "skills");
  const skillSrc = path.join(langRoot, skillSubRoot);
  for (const rel of listFilesUnder(skillSrc)) {
    pairs.push({
      langRel: path.join(skillSubRoot, rel),
      placedRel: path.join(agentEntry.skillDest, rel),
    });
  }

  // (b) 共有 intent: intent/<rel> → .intent/<rel>
  const intentSrc = path.join(langRoot, "intent");
  for (const rel of listFilesUnder(intentSrc)) {
    pairs.push({
      langRel: path.join("intent", rel),
      placedRel: path.join(".intent", rel),
    });
  }

  return pairs;
}

// 期待ファイル件数は実テンプレートから動的に導出する（テンプレ追加に追従させ、件数ハードコードを避ける）。
// 既定 agent (claude) が配置する集合のみを数える（codex サブツリーは対象外）。
const JA_COUNT = expectedAgentFiles(JA_ROOT).length;
const EN_COUNT = expectedAgentFiles(EN_ROOT).length;

// ---- 2.1 単体: resolveLangRoot (言語ルート解決・純粋) ----

test("resolveLangRoot: ja は templates/ja を返し langFallback false", () => {
  const r = resolveLangRoot(TEMPLATES, "ja");
  assert.equal(r.langRoot, path.join(TEMPLATES, "ja"), "ja ルート");
  assert.equal(r.langFallback, false, "対応言語なので fallback なし");
  assert.equal(r.resolvedLang, "ja");
});

test("resolveLangRoot: en は templates/en を返し langFallback false (パス計算のみ・存在不要)", () => {
  const r = resolveLangRoot(TEMPLATES, "en");
  assert.equal(r.langRoot, path.join(TEMPLATES, "en"), "en ルート");
  assert.equal(r.langFallback, false, "対応言語なので fallback なし");
  assert.equal(r.resolvedLang, "en");
});

test("resolveLangRoot: 未対応言語は ja にフォールバックし langFallback true (非停止)", () => {
  const r = resolveLangRoot(TEMPLATES, "fr");
  assert.equal(r.langRoot, path.join(TEMPLATES, "ja"), "既定 ja ルートへフォールバック");
  assert.equal(r.langFallback, true, "対応集合外なので fallback");
  assert.equal(r.resolvedLang, "ja");
});

test("resolveLangRoot: 例外を投げない (未対応でも非停止)", () => {
  assert.doesNotThrow(() => resolveLangRoot(TEMPLATES, "zz"));
});

// ---- 4.1 単体: computeCopyPlan / detectCcSdd ----

test("computeCopyPlan: 新規配置先では全て COPY", () => {
  const tgt = tmpDir();
  try {
    const plan = computeCopyPlan(JA_ROOT, tgt, {});
    assert.ok(plan.length > 0, "計画が空でない");
    assert.ok(
      plan.every((e) => e.action === "COPY"),
      "新規配置先では全エントリが COPY",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("computeCopyPlan: 既存ファイルは SKIP、force で COPY", () => {
  const tgt = tmpDir();
  try {
    // 既存ファイルを1つ作る
    const existing = path.join(tgt, ".intent", "README.md");
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, "PRE-EXISTING");

    const planSkip = computeCopyPlan(JA_ROOT, tgt, { force: false });
    const readmeSkip = planSkip.find((e) => e.relative === path.join(".intent", "README.md"));
    assert.equal(readmeSkip.action, "SKIP", "force なしで既存は SKIP");

    const planForce = computeCopyPlan(JA_ROOT, tgt, { force: true });
    const readmeForce = planForce.find((e) => e.relative === path.join(".intent", "README.md"));
    assert.equal(readmeForce.action, "COPY", "force ありで既存も COPY");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("computeCopyPlan: 計画は .claude/.intent 配下のみで .kiro/kiro-* を含まない (非破壊の核心)", () => {
  const tgt = tmpDir();
  try {
    const plan = computeCopyPlan(JA_ROOT, tgt, {});
    for (const e of plan) {
      assert.ok(
        e.relative.startsWith(".claude") || e.relative.startsWith(".intent"),
        `計画パスは .claude/.intent 配下: ${e.relative}`,
      );
      assert.ok(
        e.to.includes(`${path.sep}.claude${path.sep}`) ||
          e.to.includes(`${path.sep}.intent${path.sep}`),
        `計画の to も .claude/.intent 配下: ${e.to}`,
      );
    }
    const leaks = plan.filter(
      (e) =>
        e.relative.includes(".kiro") ||
        /(^|\/)kiro-/.test(e.relative) ||
        e.to.includes(".kiro") ||
        /(^|\/)kiro-/.test(e.to),
    );
    assert.equal(leaks.length, 0, ".kiro/kiro-* を計画に含まない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("computeCopyPlan: ファイルシステムを変更しない (純粋)", () => {
  const tgt = tmpDir();
  try {
    computeCopyPlan(JA_ROOT, tgt, {});
    assert.equal(fs.readdirSync(tgt).length, 0, "配置先は空のまま");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("computeCopyPlan: en ルート経由でも新規配置先では全て COPY (templates/en 実在)", () => {
  const tgt = tmpDir();
  try {
    // EN_ROOT は resolveLangRoot(defaultTemplatesDir(), "en").langRoot = templates/en。
    const plan = computeCopyPlan(EN_ROOT, tgt, {});
    assert.ok(plan.length > 0, "en ルートの計画が空でない (templates/en に実体がある)");
    assert.ok(
      plan.every((e) => e.action === "COPY"),
      "新規配置先では en ルートでも全エントリが COPY",
    );
    // 計画は実在する templates/en 配下のファイルを from に持つ。
    assert.ok(
      plan.every((e) => e.from.startsWith(EN_ROOT)),
      "全エントリの from が templates/en 配下",
    );
    assert.ok(
      plan.every((e) => fs.existsSync(e.from)),
      "計画の各 from は実在する en テンプレートファイル",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("computeCopyPlan: en ルートでも既存は SKIP、force で COPY", () => {
  const tgt = tmpDir();
  try {
    const existing = path.join(tgt, ".intent", "README.md");
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, "PRE-EXISTING");

    const planSkip = computeCopyPlan(EN_ROOT, tgt, { force: false });
    const readmeSkip = planSkip.find((e) => e.relative === path.join(".intent", "README.md"));
    assert.ok(readmeSkip, "en ルートにも .intent/README.md がある");
    assert.equal(readmeSkip.action, "SKIP", "en ルートでも force なしで既存は SKIP");

    const planForce = computeCopyPlan(EN_ROOT, tgt, { force: true });
    const readmeForce = planForce.find((e) => e.relative === path.join(".intent", "README.md"));
    assert.equal(readmeForce.action, "COPY", "en ルートでも force ありで既存も COPY");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("computeCopyPlan: en ルートの計画も .claude/.intent 配下のみで .kiro/kiro-* を含まない", () => {
  const tgt = tmpDir();
  try {
    const plan = computeCopyPlan(EN_ROOT, tgt, {});
    assert.ok(plan.length > 0, "en ルートの計画が空でない");
    for (const e of plan) {
      assert.ok(
        e.relative.startsWith(".claude") || e.relative.startsWith(".intent"),
        `en 計画パスは .claude/.intent 配下: ${e.relative}`,
      );
      assert.ok(
        e.to.includes(`${path.sep}.claude${path.sep}`) ||
          e.to.includes(`${path.sep}.intent${path.sep}`),
        `en 計画の to も .claude/.intent 配下: ${e.to}`,
      );
    }
    const leaks = plan.filter(
      (e) =>
        e.relative.includes(".kiro") ||
        /(^|\/)kiro-/.test(e.relative) ||
        e.to.includes(".kiro") ||
        /(^|\/)kiro-/.test(e.to),
    );
    assert.equal(leaks.length, 0, "en 計画にも .kiro/kiro-* を含まない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- 4.3 単体: 非破壊許可リスト (enforce 時の .git/hooks/pre-push 例外) ----

// enforce 時に唯一追加で許可される relative。path.join 形でプラットフォーム差を吸収する。
const HOOK_RELATIVE = path.join(".git", "hooks", "pre-push");

// 非破壊許可リスト述語: plan エントリの relative が書き込みを許された配下かを返す。
// 既定 agent (claude) の許可ルートは .claude / .intent のみ（従来検証と同一の厳しさ）。
// enforce 指定時に限り .git/hooks/pre-push の「1ファイルちょうど」を追加で許可する。
// 前方一致ではなく完全一致で比較するため、.git/config や .git/hooks/post-commit など
// 任意の .git 配下パスは enforce でも拒否される（許可リスト方式の維持）。
function isAllowedPlanRelative(relative, { enforce = false } = {}) {
  if (relative.startsWith(".claude") || relative.startsWith(".intent")) return true;
  return enforce && relative === HOOK_RELATIVE;
}

test("許可リスト述語: 許可リスト外パスは enforce でも拒否される (負例)", () => {
  // enforce:true でも .git/hooks/pre-push 以外の .git 配下・任意パスは拒否される。
  for (const bad of [
    path.join(".git", "config"),
    path.join(".git", "hooks", "post-commit"),
    path.join(".git", "hooks", "pre-push.sample"),
    "package.json",
    path.join(".github", "workflows", "ci.yml"),
  ]) {
    assert.equal(
      isAllowedPlanRelative(bad, { enforce: true }),
      false,
      `enforce でも許可リスト外は拒否: ${bad}`,
    );
  }
  // フック relative 自体も enforce なしでは拒否される (6.2: 既定はフック配置なし)。
  assert.equal(
    isAllowedPlanRelative(HOOK_RELATIVE, { enforce: false }),
    false,
    "enforce なしでは .git/hooks/pre-push も拒否",
  );
  // enforce ありならフック relative だけは許可される。
  assert.equal(
    isAllowedPlanRelative(HOOK_RELATIVE, { enforce: true }),
    true,
    "enforce ありで .git/hooks/pre-push のみ許可",
  );
});

test("computeCopyPlan(enforce): 許可リストは .claude/.intent + .git/hooks/pre-push ちょうど1件 (非破壊の拡張)", () => {
  const tgt = tmpDir();
  try {
    // enforce のフック計画は配置先に .git がある場合のみ走る。
    fs.mkdirSync(path.join(tgt, ".git"));

    const plan = computeCopyPlan(JA_ROOT, tgt, { enforce: true });
    assert.ok(plan.length > 0, "enforce 計画が空でない");

    // 全エントリが enforce 許可リストを満たす (任意パスへの書き込みは fail する)。
    for (const e of plan) {
      assert.ok(
        isAllowedPlanRelative(e.relative, { enforce: true }),
        `enforce 計画パスは許可リスト内: ${e.relative}`,
      );
    }

    // 追加されるのは .git/hooks/pre-push の「1件ちょうど」。
    const gitEntries = plan.filter((e) => !isAllowedPlanRelative(e.relative, { enforce: false }));
    assert.equal(gitEntries.length, 1, "許可リスト外への追加はフック1件のみ");
    assert.equal(gitEntries[0].relative, HOOK_RELATIVE, "追加分は .git/hooks/pre-push");
    assert.equal(
      gitEntries[0].to,
      path.join(tgt, ".git", "hooks", "pre-push"),
      "フックの to は配置先の .git/hooks/pre-push",
    );

    // 仮に将来 .git/config など許可リスト外を計画するエントリが混入したら、
    // 上の every 相当の検証は必ず fail する (検査自体の有効性の証明)。
    const poisoned = [...plan, { relative: path.join(".git", "config") }];
    assert.equal(
      poisoned.every((e) => isAllowedPlanRelative(e.relative, { enforce: true })),
      false,
      "許可リスト外エントリが混入した計画は検証に落ちる",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("computeCopyPlan(enforce なし): .git 配下を一切計画せず従来許可リストをそのまま通る", () => {
  const tgt = tmpDir();
  try {
    // .git があっても enforce なしならフックは計画されない (6.2)。
    fs.mkdirSync(path.join(tgt, ".git"));

    const plan = computeCopyPlan(JA_ROOT, tgt, {});
    assert.ok(plan.length > 0, "計画が空でない");
    for (const e of plan) {
      assert.ok(
        isAllowedPlanRelative(e.relative, { enforce: false }),
        `enforce なし計画は従来許可リスト (.claude/.intent) 内: ${e.relative}`,
      );
      assert.ok(!e.relative.startsWith(".git"), `enforce なしで .git 配下を計画しない: ${e.relative}`);
    }

    // enforce なしの計画は enforce 指定時からフック1件を除いた集合と完全一致 (バイト同一性, R7.4)。
    const enforcedPlan = computeCopyPlan(JA_ROOT, tgt, { enforce: true });
    assert.deepEqual(
      plan,
      enforcedPlan.filter((e) => e.relative !== HOOK_RELATIVE),
      "enforce なし計画 = enforce 計画 − フック1件 (mode キーも現れない)",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("detectCcSdd: .kiro/ の有無で boolean を返す", () => {
  const tgt = tmpDir();
  try {
    assert.equal(detectCcSdd(tgt), false, ".kiro なしで false");
    fs.mkdirSync(path.join(tgt, ".kiro"));
    assert.equal(detectCcSdd(tgt), true, ".kiro ありで true");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- 4.2 統合: install ----

test("install: 期待ファイルが配置される (3階層ネスト・cc-sdd/*.md 含む)", () => {
  const tgt = tmpDir();
  try {
    install(tgt, {});
    // 浅いファイル
    assert.ok(fs.existsSync(path.join(tgt, ".intent", "README.md")), "scaffold README 配置");
    // 3階層ネスト
    assert.ok(
      fs.existsSync(
        path.join(tgt, ".claude", "skills", "intent-discover", "rules", "algo-gore-lite.md"),
      ),
      "3階層ネストの algo rule 配置",
    );
    // cc-sdd 配下
    assert.ok(
      fs.existsSync(path.join(tgt, ".intent", "cc-sdd", "README.md")),
      "cc-sdd scaffold README 配置",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("install: 再実行で既存は変更されずスキップされる (非破壊)", () => {
  const tgt = tmpDir();
  try {
    install(tgt, {});
    const sample = path.join(tgt, ".intent", "README.md");
    const before = fs.readFileSync(sample, "utf8");
    const mtimeBefore = fs.statSync(sample).mtimeMs;

    const result = install(tgt, {});
    const after = fs.readFileSync(sample, "utf8");

    assert.equal(after, before, "既存ファイルの内容が無変更");
    assert.equal(fs.statSync(sample).mtimeMs, mtimeBefore, "既存ファイルが書き直されていない");
    assert.equal(result.copied.length, 0, "再実行では何もコピーしない");
    assert.ok(result.skipped.length > 0, "全て skipped に入る");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("install: dryRun はファイルシステムを一切変更しない", () => {
  const tgt = tmpDir();
  try {
    const result = install(tgt, { dryRun: true });
    assert.equal(fs.readdirSync(tgt).length, 0, "配置先は空のまま");
    assert.ok(result.copied.length > 0, "計画上の copied は提示される");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("install: cc-sdd を検出するが .kiro/ は改変しない", () => {
  const tgt = tmpDir();
  try {
    const kiroFile = path.join(tgt, ".kiro", "marker.txt");
    fs.mkdirSync(path.dirname(kiroFile), { recursive: true });
    fs.writeFileSync(kiroFile, "ORIGINAL");

    const result = install(tgt, {});
    assert.equal(result.ccSddDetected, true, "cc-sdd 検出");
    assert.equal(fs.readFileSync(kiroFile, "utf8"), "ORIGINAL", ".kiro/ 配下は無変更");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("install: force で既存を上書きする", () => {
  const tgt = tmpDir();
  try {
    const sample = path.join(tgt, ".intent", "README.md");
    fs.mkdirSync(path.dirname(sample), { recursive: true });
    fs.writeFileSync(sample, "OLD");

    install(tgt, { force: true });
    assert.notEqual(fs.readFileSync(sample, "utf8"), "OLD", "force で既存が上書きされる");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- 4.2 統合 (i18n): en 配置 / ja 回帰 / 非破壊 / dry-run / フォールバック ----

// en 配置: install(tmp, {lang:"en"}) の結果が templates/en/** と 1:1 一致する。
// 配置ファイル集合・内容・件数・深いネストを実ファイルで検証する（件数は実テンプレから動的導出）。
test("install(en): templates/en/** と配置結果が 1:1 一致 (内容・件数・3階層ネスト)", () => {
  const tgt = tmpDir();
  try {
    const result = install(tgt, { lang: "en" });

    // 既定 agent (claude) が配置する集合 = claude skill サブツリー + 共有 intent。
    const expected = expectedAgentFiles(EN_ROOT);
    assert.equal(expected.length, EN_COUNT, "templates/en の claude+intent 集合はパリティ件数");
    assert.equal(EN_COUNT, JA_COUNT, "en と ja のファイル数は一致 (翻訳パリティ)");
    assert.equal(result.copied.length, EN_COUNT, "en 配置で claude+intent 全ファイルコピー");
    assert.equal(result.resolvedLang, "en", "解決言語は en");
    assert.equal(result.langFallback, false, "en は対応言語なので fallback なし");

    // claude+intent の各 en テンプレートファイルが、対応する配置先に内容一致で存在する。
    for (const { langRel, placedRel } of expected) {
      const placed = path.join(tgt, placedRel);
      assert.ok(fs.existsSync(placed), `配置されている: ${placedRel}`);
      assert.equal(
        fs.readFileSync(placed, "utf8"),
        fs.readFileSync(path.join(EN_ROOT, langRel), "utf8"),
        `内容が en テンプレートと一致: ${placedRel}`,
      );
    }

    // 配置先に余剰ファイルがない (集合 1:1)。
    const placedFiles = [];
    for (const root of [".claude", ".intent"]) {
      const rootDir = path.join(tgt, root);
      if (!fs.existsSync(rootDir)) continue;
      for (const r of listFilesUnder(rootDir)) placedFiles.push(path.join(root, r));
    }
    assert.equal(placedFiles.length, EN_COUNT, "配置先にも claude+intent 全ファイルのみ (余剰なし)");

    // 3階層ネスト・cc-sdd 配下を明示的に確認 (en 実体)。
    assert.ok(
      fs.existsSync(
        path.join(tgt, ".claude", "skills", "intent-discover", "rules", "algo-gore-lite.md"),
      ),
      "en: 3階層ネストの algo rule 配置",
    );
    assert.ok(
      fs.existsSync(path.join(tgt, ".intent", "cc-sdd", "README.md")),
      "en: cc-sdd/README.md 配置",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ja 回帰 (核心): install(tmp, {}) の配置結果が templates/ja/** と完全一致する。
// templates/ja の全ファイルについて、配置先ファイルが byte 単位で同一であることを検証する。
// これは templates/ja への移動 + 言語ルート解決が ja 挙動を変えていないことの証拠。
// もし ja 配置が templates/ja から乖離すれば (パス計算・件数・内容のいずれかで) 必ず失敗する。
test("install(ja 既定): templates/ja/** と配置結果が byte 完全一致 (移行回帰の核心)", () => {
  const tgt = tmpDir();
  try {
    const result = install(tgt, {});

    // 既定 agent (claude) が配置する集合 = claude skill サブツリー + 共有 intent。
    // codex サブツリーは install(claude) の対象外なので期待集合に含めない (agent-aware)。
    const expected = expectedAgentFiles(JA_ROOT);
    assert.equal(JA_COUNT, EN_COUNT, "ja と en の配置ファイル数は一致 (翻訳パリティ)");
    assert.equal(result.copied.length, JA_COUNT, "ja 既定で claude+intent 全ファイルコピー");
    assert.equal(result.resolvedLang, "ja", "解決言語は ja");
    assert.equal(result.langFallback, false, "ja は fallback なし");

    // claude 既定が配置する全ファイルが、対応配置先に byte 同一で存在する (網羅・スポットではない)。
    for (const { langRel, placedRel } of expected) {
      const placed = path.join(tgt, placedRel);
      assert.ok(fs.existsSync(placed), `ja 配置されている: ${placedRel}`);
      const srcBuf = fs.readFileSync(path.join(JA_ROOT, langRel));
      const dstBuf = fs.readFileSync(placed);
      assert.ok(
        srcBuf.equals(dstBuf),
        `ja 配置内容が templates/ja と byte 一致: ${placedRel}`,
      );
    }

    // 配置先集合も claude 既定の写像と 1:1 (余剰・漏れなし)。
    const placedSet = new Set();
    for (const root of [".claude", ".intent"]) {
      const rootDir = path.join(tgt, root);
      if (!fs.existsSync(rootDir)) continue;
      for (const r of listFilesUnder(rootDir)) placedSet.add(path.join(root, r));
    }
    const expectedSet = new Set(expected.map((p) => p.placedRel));
    assert.deepEqual(
      [...placedSet].sort(),
      [...expectedSet].sort(),
      "配置先集合は claude 既定 (claude skill + intent) の写像と完全一致",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// en 非破壊: 配置後に1ファイルを改変 → 再 install(en) でそのファイルは skipped・無変更、
// その後 force で上書きされる。
test("install(en): 再実行で改変ファイルは skip・無変更、force で上書き (非破壊)", () => {
  const tgt = tmpDir();
  try {
    install(tgt, { lang: "en" });

    const sampleRel = path.join(".intent", "README.md");
    const sample = path.join(tgt, sampleRel);
    fs.writeFileSync(sample, "USER-EDIT-EN");
    const mtimeBefore = fs.statSync(sample).mtimeMs;

    const reResult = install(tgt, { lang: "en" });
    assert.equal(reResult.copied.length, 0, "再 install(en) は何もコピーしない");
    assert.ok(reResult.skipped.length > 0, "全て skipped に入る");
    assert.ok(reResult.skipped.includes(sampleRel), "改変ファイルは skipped に含まれる");
    assert.equal(fs.readFileSync(sample, "utf8"), "USER-EDIT-EN", "改変内容が保持される");
    assert.equal(fs.statSync(sample).mtimeMs, mtimeBefore, "改変ファイルは書き直されない");

    const forceResult = install(tgt, { lang: "en", force: true });
    assert.ok(forceResult.copied.includes(sampleRel), "force で改変ファイルが copied に入る");
    assert.equal(
      fs.readFileSync(sample, "utf8"),
      fs.readFileSync(path.join(EN_ROOT, "intent", "README.md"), "utf8"),
      "force で en テンプレート内容に上書きされる",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// en dry-run: ファイルシステムを一切変更しない (配置先は空のまま)。
test("install(en, dryRun): ファイルを 1 件も書かない", () => {
  const tgt = tmpDir();
  try {
    const result = install(tgt, { lang: "en", dryRun: true });
    assert.equal(fs.readdirSync(tgt).length, 0, "配置先は空のまま (en dry-run)");
    assert.equal(result.copied.length, EN_COUNT, "計画上の copied は全ファイル分提示される");
    assert.equal(result.resolvedLang, "en", "dry-run でも解決言語は en");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// フォールバック統合: 未対応 lang は ja 配置 + langFallback true。
// 配置されたものが templates/ja と一致し、templates/en とは異なることを検証する。
test("install(fr): langFallback true かつ配置内容は ja テンプレート (en ではない)", () => {
  const tgt = tmpDir();
  try {
    const result = install(tgt, { lang: "fr" });
    assert.equal(result.langFallback, true, "未対応 lang は fallback true");
    assert.equal(result.resolvedLang, "ja", "解決言語は ja");
    assert.equal(result.copied.length, JA_COUNT, "ja として全ファイル配置");

    // 配置内容が templates/ja と一致 (ja 配置の証拠)。claude 既定の配置集合を検証する。
    for (const { langRel, placedRel } of expectedAgentFiles(JA_ROOT)) {
      const placed = path.join(tgt, placedRel);
      assert.equal(
        fs.readFileSync(placed, "utf8"),
        fs.readFileSync(path.join(JA_ROOT, langRel), "utf8"),
        `fallback 配置は ja テンプレートと一致: ${langRel}`,
      );
    }

    // README は ja と一致し、en とは異なる (en へ誤フォールバックしていない証拠)。
    const placedReadme = fs.readFileSync(path.join(tgt, ".intent", "README.md"), "utf8");
    const jaReadme = fs.readFileSync(path.join(JA_ROOT, "intent", "README.md"), "utf8");
    const enReadme = fs.readFileSync(path.join(EN_ROOT, "intent", "README.md"), "utf8");
    assert.equal(placedReadme, jaReadme, "fallback は ja README");
    assert.notEqual(jaReadme, enReadme, "前提: ja と en の README は異なる");
    assert.notEqual(placedReadme, enReadme, "fallback は en README ではない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- 4.4 symlink 安全性 (INV1) と部分失敗の報告 ----

// dangling symlink: fs.existsSync はリンクを辿るため、リンク先が消えた symlink を
// 「存在しない」と誤判定し COPY → リンク越しに配置先ツリー外へ書き込んでしまう (INV1 破り)。
// lstat ベースの存在判定なら dangling symlink も「既存エントリ」= SKIP になる。
test("install: 配置先の dangling symlink は SKIP され、リンク越しに外部へ書かない (INV1)", () => {
  const tgt = tmpDir();
  const outside = tmpDir("ip-outside-");
  try {
    const sampleRel = path.join(".intent", "README.md");
    const linkPath = path.join(tgt, sampleRel);
    const outsideTarget = path.join(outside, "victim.md"); // 実在しない → dangling
    fs.mkdirSync(path.dirname(linkPath), { recursive: true });
    fs.symlinkSync(outsideTarget, linkPath);

    const result = install(tgt, {});

    assert.ok(!fs.existsSync(outsideTarget), "リンク越しに外部ファイルが作られていない");
    assert.ok(fs.lstatSync(linkPath).isSymbolicLink(), "dangling symlink 自体は残る");
    assert.equal(fs.readlinkSync(linkPath), outsideTarget, "リンク先パスも無変更");
    assert.ok(result.skipped.includes(sampleRel), "dangling symlink の配置先は skipped 扱い");
    assert.ok(!result.copied.includes(sampleRel), "dangling symlink の配置先へは copy しない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

// live symlink + force: copyFileSync はリンクを辿って書くため、リンク先 (外部ファイル) が
// 上書きされてしまう。force の上書きは「リンク自体を実ファイルに置換」が正しい。
test("install(force): 配置先の live symlink はリンク自体が実ファイルに置換され、リンク先は無傷", () => {
  const tgt = tmpDir();
  const outside = tmpDir("ip-outside-");
  try {
    const sampleRel = path.join(".intent", "README.md");
    const linkPath = path.join(tgt, sampleRel);
    const outsideTarget = path.join(outside, "victim.md");
    fs.writeFileSync(outsideTarget, "VICTIM-ORIGINAL");
    fs.mkdirSync(path.dirname(linkPath), { recursive: true });
    fs.symlinkSync(outsideTarget, linkPath);

    install(tgt, { force: true });

    assert.equal(
      fs.readFileSync(outsideTarget, "utf8"),
      "VICTIM-ORIGINAL",
      "force でもリンク先 (外部ファイル) は上書きされない",
    );
    const st = fs.lstatSync(linkPath);
    assert.ok(!st.isSymbolicLink(), "symlink は残らずリンク自体が置換される");
    assert.ok(st.isFile(), "配置先は実ファイルになる");
    assert.equal(
      fs.readFileSync(linkPath, "utf8"),
      fs.readFileSync(path.join(JA_ROOT, "intent", "README.md"), "utf8"),
      "置換後の内容は ja テンプレートと一致",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

// 部分失敗: コピー途中で EACCES 等が起きたとき、どこまで配置したかを失わずに報告する。
// エラーは copiedSoFar (配置済み relative の配列) を持ち、メッセージは件数と再実行安全を伝える。
// root 実行環境では chmod 0o500 が書き込みを阻止しないため skip する。
test(
  "install: 途中失敗は copiedSoFar 付きエラーで報告され、再実行安全を案内する",
  { skip: process.getuid?.() === 0 ? "root では chmod で書き込みを阻止できない" : false },
  () => {
    const tgt = tmpDir();
    try {
      // 計画順は skill (.claude) → intent (.intent)。.intent を読み取り専用にして
      // skill コピー成功後の intent コピーで EACCES を起こす (部分失敗の再現)。
      fs.mkdirSync(path.join(tgt, ".intent"), { mode: 0o500 });

      let thrown;
      try {
        install(tgt, {});
      } catch (err) {
        thrown = err;
      } finally {
        // 後始末 (rmSync) のため必ず書き込み権限を戻す。
        fs.chmodSync(path.join(tgt, ".intent"), 0o700);
      }

      assert.ok(thrown, "途中失敗でエラーが投げられる");
      assert.ok(Array.isArray(thrown.copiedSoFar), "エラーは copiedSoFar 配列を持つ");
      assert.ok(thrown.copiedSoFar.length > 0, "失敗前に配置済みのファイルがある");
      assert.ok(
        thrown.copiedSoFar.every((r) => r.startsWith(".claude")),
        "配置済みは .claude 配下のみ (.intent で失敗)",
      );
      assert.ok(
        thrown.message.includes(String(thrown.copiedSoFar.length)),
        `メッセージに配置済み件数を含む: ${thrown.message}`,
      );
      assert.ok(thrown.message.includes("再実行"), `メッセージに再実行案内を含む: ${thrown.message}`);
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  },
);

// ---- gitignore 整備 (export-dirs Req 4.1-4.6): planGitignore / applyGitignore / detectTrackedCcSdd ----

// install が書く gitignore ブロック (コメント1 + パターン2 + 末尾改行)。
const GITIGNORE_BLOCK =
  "# intent-planner: cc-sdd export drafts are local-only\n" +
  ".intent/cc-sdd/*\n" +
  "!.intent/cc-sdd/README.md\n" +
  ".intent/overview/*\n" +
  "!.intent/overview/README.md\n" +
  ".intent/spec-ingest/*\n" +
  "!.intent/spec-ingest/README.md\n" +
  ".intent/nl-spec/*\n" +
  "!.intent/nl-spec/README.md\n" +
  ".intent/**/*.bak\n" +
  ".claude/**/*.bak\n" +
  ".agents/**/*.bak\n";

// (a) .gitignore 不在 (git リポジトリ相当) → ブロックで新規作成 (4.1)。
test("install(gitignore): .gitignore 不在ならブロックで新規作成し README 再包含行を含む", () => {
  const tgt = tmpDir();
  try {
    fs.mkdirSync(path.join(tgt, ".git"));
    const result = install(tgt, {});
    assert.equal(result.gitignore, "create", "action は create");
    const gi = path.join(tgt, ".gitignore");
    assert.ok(fs.existsSync(gi), ".gitignore が作成される");
    // 内容はブロックそのもの = 除外は cc-sdd/* のみ、README.md は再包含で追跡可能に保たれる。
    assert.equal(fs.readFileSync(gi, "utf8"), GITIGNORE_BLOCK, "内容がブロック全体 + 末尾改行と一致");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// (a') overview 派生ビューの Git 非追跡化 (overview spec 1.2/7.4)。
// .intent/overview/* を除外し README.md のみ再包含する 2 パターンが計画ブロックに現れる。
test("install(gitignore): overview の 2 パターン (.intent/overview/* / !README.md) が計画ブロックに現れる", () => {
  const tgt = tmpDir();
  try {
    fs.mkdirSync(path.join(tgt, ".git"));
    const plan = planGitignore(tgt);
    assert.equal(plan.action, "create", ".gitignore 不在なので create");
    assert.ok(
      plan.blockLines.includes(".intent/overview/*"),
      "blockLines に .intent/overview/* が含まれる",
    );
    assert.ok(
      plan.blockLines.includes("!.intent/overview/README.md"),
      "blockLines に !.intent/overview/README.md が含まれる (README 再包含)",
    );
    // 除外行 → 再包含行の順序 (再包含は除外の後でなければ効かない)。
    assert.ok(
      plan.blockLines.indexOf(".intent/overview/*") <
        plan.blockLines.indexOf("!.intent/overview/README.md"),
      "除外行が README 再包含行より前にある",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// (b) 既存 .gitignore → 既存内容のバイト列を先頭に保存したまま末尾追記 (4.2)。
// 末尾改行あり/なしの両方を検証する (改行なしは改行を補ってから追記)。
test("install(gitignore): 既存 .gitignore は無変更のまま末尾追記 (改行なし末尾には改行を補う)", () => {
  for (const existing of ["node_modules/\n*.log\n", "node_modules/\n*.log"]) {
    const tgt = tmpDir();
    try {
      fs.mkdirSync(path.join(tgt, ".git"));
      const gi = path.join(tgt, ".gitignore");
      fs.writeFileSync(gi, existing);

      const result = install(tgt, {});
      assert.equal(result.gitignore, "append", "action は append");
      const after = fs.readFileSync(gi, "utf8");
      assert.ok(after.startsWith(existing), "既存内容のバイト列が先頭にそのまま残る");
      const expectedSep = existing.endsWith("\n") ? "" : "\n";
      assert.equal(after, existing + expectedSep + GITIGNORE_BLOCK, "既存 + (改行補完) + ブロック");
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  }
});

// (c) 2回実行 → 2回目は none で byte 無変更 (冪等・4.3)。
test("install(gitignore): 再実行で追記が重複せず action none・byte 無変更 (冪等)", () => {
  const tgt = tmpDir();
  try {
    fs.mkdirSync(path.join(tgt, ".git"));
    const first = install(tgt, {});
    assert.equal(first.gitignore, "create", "1回目は create");
    const gi = path.join(tgt, ".gitignore");
    const before = fs.readFileSync(gi);

    const second = install(tgt, {});
    assert.equal(second.gitignore, "none", "2回目は none");
    assert.ok(fs.readFileSync(gi).equals(before), ".gitignore は byte 無変更");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// (b') 部分状態: 除外行だけが既に存在 → 欠落行 (再包含 + *.bak 群) のみ追記 (per-line 冪等判定)。
test("install(gitignore): 除外行のみ既存なら欠落行 (README 再包含 + *.bak 群) だけを追記する", () => {
  const tgt = tmpDir();
  try {
    fs.mkdirSync(path.join(tgt, ".git"));
    const gi = path.join(tgt, ".gitignore");
    const existing = "node_modules/\n.intent/cc-sdd/*\n";
    fs.writeFileSync(gi, existing);

    const result = install(tgt, {});
    assert.equal(result.gitignore, "append", "欠落行があるので append");
    const after = fs.readFileSync(gi, "utf8");
    // 欠落は cc-sdd 再包含行 + overview 2パターン + spec-ingest 2パターン + nl-spec 2パターン + *.bak 3パターン。全パターン欠落ではないのでコメント行は付かない。
    assert.equal(
      after,
      existing +
        "!.intent/cc-sdd/README.md\n" +
        ".intent/overview/*\n" +
        "!.intent/overview/README.md\n" +
        ".intent/spec-ingest/*\n" +
        "!.intent/spec-ingest/README.md\n" +
        ".intent/nl-spec/*\n" +
        "!.intent/nl-spec/README.md\n" +
        ".intent/**/*.bak\n" +
        ".claude/**/*.bak\n" +
        ".agents/**/*.bak\n",
      "欠落行のみ追記 (コメント行は付かない)",
    );
    // 除外行は重複しない (per-line 冪等)。
    const lines = after.split("\n");
    assert.equal(lines.filter((l) => l.trim() === ".intent/cc-sdd/*").length, 1, "除外行は1回のみ");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// (d) git fixture: 追跡済みの cc-sdd 下書きが trackedCcSdd に検出され、自動 rm されない (4.4)。
test("install(gitignore): 追跡済み cc-sdd 下書きを trackedCcSdd に検出し README を除外・自動解除しない", () => {
  const tgt = tmpDir();
  try {
    // 本物の git リポジトリを作り、cc-sdd 下書き + README を追跡済みにする。
    const git = (...args) =>
      spawnSync(
        "git",
        ["-c", "user.email=test@example.com", "-c", "user.name=test", ...args],
        { cwd: tgt, encoding: "utf8" },
      );
    assert.equal(git("init").status, 0, "git init 成功 (前提)");
    const draftRel = ".intent/cc-sdd/requirements.md";
    fs.mkdirSync(path.join(tgt, ".intent", "cc-sdd"), { recursive: true });
    fs.writeFileSync(path.join(tgt, draftRel), "## Source Packet\nlegacy-packet\n");
    fs.writeFileSync(path.join(tgt, ".intent", "cc-sdd", "README.md"), "tracked readme");
    assert.equal(git("add", ".intent/cc-sdd").status, 0, "git add 成功 (前提)");
    assert.equal(git("commit", "-m", "track legacy drafts").status, 0, "git commit 成功 (前提)");

    const result = install(tgt, {});
    assert.ok(result.trackedCcSdd.includes(draftRel), "追跡済み下書きが検出される");
    assert.ok(
      !result.trackedCcSdd.includes(".intent/cc-sdd/README.md"),
      "README.md は trackedCcSdd から除外される",
    );
    // 自動で追跡解除 (git rm --cached 相当) しない: ls-files に残ったまま。
    const lsAfter = git("ls-files", "--", ".intent/cc-sdd").stdout;
    assert.ok(lsAfter.includes(draftRel), "install 後も下書きは追跡されたまま (案内のみ)");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// (e) dry-run → .gitignore を書かず、計画 action だけ返す (4.5)。
test("install(gitignore, dryRun): .gitignore を作成せず計画 action create を返す", () => {
  const tgt = tmpDir();
  try {
    fs.mkdirSync(path.join(tgt, ".git"));
    const result = install(tgt, { dryRun: true });
    assert.equal(result.gitignore, "create", "dry-run でも計画 action は create");
    assert.ok(!fs.existsSync(path.join(tgt, ".gitignore")), ".gitignore は作成されない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// (f) 非 git ディレクトリ → skipped-not-git で .gitignore を作らず、配置自体は成功する (4.6)。
test("install(gitignore): .git 不在なら skipped-not-git で .gitignore を作らず配置は継続", () => {
  const tgt = tmpDir();
  try {
    const result = install(tgt, {});
    assert.equal(result.gitignore, "skipped-not-git", "非 git は skipped-not-git");
    assert.ok(!fs.existsSync(path.join(tgt, ".gitignore")), ".gitignore は作成されない");
    assert.deepEqual(result.trackedCcSdd, [], "非リポジトリでは trackedCcSdd は [] (フェイルオープン)");
    assert.ok(result.copied.length > 0, "通常の配置は継続される");
    assert.ok(fs.existsSync(path.join(tgt, ".intent", "README.md")), "scaffold は配置済み");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// planGitignore は純粋 (書き込まない)・detectTrackedCcSdd は非リポジトリでフェイルオープン。
test("planGitignore: 計画のみでファイルシステムを変更しない (純粋)", () => {
  const tgt = tmpDir();
  try {
    fs.mkdirSync(path.join(tgt, ".git"));
    const plan = planGitignore(tgt);
    assert.equal(plan.action, "create", "不在なら create 計画");
    assert.equal(plan.path, path.join(tgt, ".gitignore"), "path は配置先の .gitignore");
    assert.deepEqual(plan.blockLines, GITIGNORE_BLOCK.trimEnd().split("\n"), "blockLines はブロック全体");
    assert.ok(!fs.existsSync(plan.path), "planGitignore は書き込まない");
    assert.deepEqual(detectTrackedCcSdd(tgt), [], "壊れた擬似 .git では [] (フェイルオープン)");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// cc-sdd (en): .kiro/ を置いて install(en) → 検出 true かつ .kiro/ 配下は byte 無変更。
test("install(en): .kiro/ を検出するが配下は無変更 (cc-sdd 非接触)", () => {
  const tgt = tmpDir();
  try {
    const kiroFile = path.join(tgt, ".kiro", "specs", "marker.md");
    fs.mkdirSync(path.dirname(kiroFile), { recursive: true });
    fs.writeFileSync(kiroFile, "CC-SDD-SENTINEL-EN");

    const result = install(tgt, { lang: "en" });
    assert.equal(result.ccSddDetected, true, "en 配置でも cc-sdd 検出");
    assert.equal(result.resolvedLang, "en", "解決言語は en");
    assert.equal(
      fs.readFileSync(kiroFile, "utf8"),
      "CC-SDD-SENTINEL-EN",
      ".kiro/ 配下のセンチネルは byte 無変更",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- バージョンアップ (update モード): classifyFile / code 更新 / user-data 保護 / .bak / 冪等 ----

// classifyFile: code / user-data / shared の3分類を relative パスで判定する純粋関数。
test("classifyFile: user-data / shared / code を relative で正しく分類する", () => {
  // user-data: ユーザー・ワークフローが書く .intent/ 配下の成果物・ログ・状態。
  for (const rel of [
    path.join(".intent", "intent-tree.md"),
    path.join(".intent", "intent-compass.md"),
    path.join(".intent", "drift-log.md"),
    path.join(".intent", "mode.md"),
    path.join(".intent", "packets", "index.md"),
    path.join(".intent", "packets", "plan.md"),
  ]) {
    assert.equal(classifyFile(rel), "user-data", `user-data に分類: ${rel}`);
  }
  // shared: ユーザー領域と共有するファイル。CLAUDE.md は AGENTS.md と同性質
  // （リポジトリ直下のプロジェクト指示でユーザーが追記しうる）なので shared。
  for (const rel of ["AGENTS.md", "CLAUDE.md", path.join(".git", "hooks", "pre-push")]) {
    assert.equal(classifyFile(rel), "shared", `shared に分類: ${rel}`);
  }
  // code: intent-planner 専有ツリー（skill・scripts・参照ドキュメント）。
  for (const rel of [
    path.join(".claude", "skills", "intent-discover", "SKILL.md"),
    path.join(".claude", "skills", "intent-discover", "rules", "algo-gore-lite.md"),
    path.join(".intent", "README.md"),
    path.join(".intent", "scripts", "intent-check.mjs"),
    path.join(".intent", "modes", "standard.md"),
    path.join(".intent", "cc-sdd", "README.md"),
    path.join(".intent", "packets", "README.md"),
  ]) {
    assert.equal(classifyFile(rel), "code", `code に分類: ${rel}`);
  }
});

// computeCopyPlan(update): 既存 code は COPY+backup、user-data は SKIP、新規は COPY。
test("computeCopyPlan(update): 既存 code は上書き計画 (backup) / user-data は保護 (SKIP)", () => {
  const tgt = tmpDir();
  try {
    // code (skill) と user-data (intent-tree) を「中身を変えて」既存配置する。
    const skillRel = path.join(".claude", "skills", "intent-discover", "SKILL.md");
    const dataRel = path.join(".intent", "intent-tree.md");
    for (const rel of [skillRel, dataRel]) {
      const p = path.join(tgt, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, "STALE LOCAL CONTENT");
    }

    const plan = computeCopyPlan(JA_ROOT, tgt, { update: true });
    const skill = plan.find((e) => e.relative === skillRel);
    const data = plan.find((e) => e.relative === dataRel);

    assert.equal(skill.kind, "code", "skill は code 種別");
    assert.equal(skill.action, "COPY", "既存 code は update で上書き");
    assert.equal(skill.backup, true, "上書きする code は backup 対象");

    assert.equal(data.kind, "user-data", "intent-tree は user-data 種別");
    assert.equal(data.action, "SKIP", "user-data は update でも保護 (SKIP)");
    assert.equal(data.backup, false, "保護対象は backup しない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// computeCopyPlan(update): 既存 code がソースと byte 一致なら SKIP (冪等・無駄な上書きをしない)。
test("computeCopyPlan(update): 既存 code がソースと一致なら SKIP (冪等)", () => {
  const tgt = tmpDir();
  try {
    install(tgt, {}); // まず最新を配置 (= ソースと byte 一致状態)
    const plan = computeCopyPlan(JA_ROOT, tgt, { update: true });
    const codeEntries = plan.filter((e) => e.kind === "code");
    assert.ok(codeEntries.length > 0, "code エントリが存在する (前提)");
    assert.ok(
      codeEntries.every((e) => e.action === "SKIP" && e.backup === false),
      "一致する既存 code は全て SKIP・backup なし (更新不要)",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// install(update): code を上書きしつつ user-data を保護し、上書き分だけ .bak を残す。
test("install(update): code 更新で .bak 退避・user-data 無変更・新規も配置", () => {
  const tgt = tmpDir();
  try {
    install(tgt, {}); // 初期配置

    // code (skill) と user-data (intent-tree) を改変。
    const skillRel = path.join(".claude", "skills", "intent-discover", "SKILL.md");
    const dataRel = path.join(".intent", "intent-tree.md");
    const skillPath = path.join(tgt, skillRel);
    const dataPath = path.join(tgt, dataRel);
    fs.writeFileSync(skillPath, "STALE SKILL");
    fs.writeFileSync(dataPath, "USER INTENT TREE");

    const result = install(tgt, { update: true });

    // code は最新テンプレ内容へ更新され、改変前の "STALE SKILL" は .bak に残る。
    assert.equal(
      fs.readFileSync(skillPath, "utf8"),
      fs.readFileSync(path.join(JA_ROOT, "claude", "skills", "intent-discover", "SKILL.md"), "utf8"),
      "code はテンプレ最新へ更新される",
    );
    assert.equal(fs.readFileSync(`${skillPath}.bak`, "utf8"), "STALE SKILL", "上書き前の現物が .bak に残る");
    assert.ok(result.backedUp.includes(skillRel), "backedUp に上書き code が含まれる");

    // user-data は完全保護 (無変更・.bak も作らない)。
    assert.equal(fs.readFileSync(dataPath, "utf8"), "USER INTENT TREE", "user-data は無変更");
    assert.ok(!fs.existsSync(`${dataPath}.bak`), "user-data の .bak は作らない");
    assert.ok(result.skipped.includes(dataRel), "user-data は skipped に入る");
    assert.ok(!result.copied.includes(dataRel), "user-data は copied に入らない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// install(update): 既存 AGENTS.md (shared) は上書きせず保護する (codex agent)。
test("install(update, codex): 既存 AGENTS.md (shared) は上書きしない", () => {
  const tgt = tmpDir();
  try {
    install(tgt, { agent: "codex" }); // 初期配置
    const docPath = path.join(tgt, "AGENTS.md");
    fs.writeFileSync(docPath, "USER PROJECT INSTRUCTIONS");

    const result = install(tgt, { agent: "codex", update: true });
    assert.equal(fs.readFileSync(docPath, "utf8"), "USER PROJECT INSTRUCTIONS", "AGENTS.md は無変更");
    assert.ok(result.skipped.includes("AGENTS.md"), "AGENTS.md は skipped (shared 保護)");
    assert.ok(!fs.existsSync(`${docPath}.bak`), "shared の .bak は作らない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// install(update): 同じ版で再実行すると何も書かず .bak も作らない (完全冪等)。
test("install(update): 同版での再実行は無書込・.bak なし (冪等)", () => {
  const tgt = tmpDir();
  try {
    install(tgt, {});
    const second = install(tgt, { update: true });
    assert.equal(second.copied.length, 0, "2回目は何もコピーしない");
    assert.equal(second.backedUp.length, 0, "2回目は backup を取らない");
    assert.ok(second.skipped.length > 0, "全て skipped に入る");
    // .bak ファイルが1つも作られていない。
    const baks = listFilesUnder(tgt).filter((r) => r.endsWith(".bak"));
    assert.deepEqual(baks, [], "冪等な再実行で .bak は作られない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// install(update, dryRun): 計画は提示するがファイルを一切書かない (.bak も作らない)。
test("install(update, dryRun): 上書き予定を提示するが書き込まない", () => {
  const tgt = tmpDir();
  try {
    install(tgt, {});
    const skillPath = path.join(tgt, ".claude", "skills", "intent-discover", "SKILL.md");
    fs.writeFileSync(skillPath, "STALE SKILL");

    const result = install(tgt, { update: true, dryRun: true });
    assert.ok(
      result.copied.includes(path.join(".claude", "skills", "intent-discover", "SKILL.md")),
      "上書き予定が copied 計画に出る",
    );
    assert.ok(
      result.backedUp.includes(path.join(".claude", "skills", "intent-discover", "SKILL.md")),
      "backup 予定が backedUp 計画に出る",
    );
    assert.equal(fs.readFileSync(skillPath, "utf8"), "STALE SKILL", "dry-run は書き込まない");
    assert.ok(!fs.existsSync(`${skillPath}.bak`), "dry-run は .bak を作らない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// force は update に優先し、user-data も含め全て上書きする (バックアップは取らない)。
test("install(force): update より優先し user-data も上書き・.bak なし", () => {
  const tgt = tmpDir();
  try {
    install(tgt, {});
    const dataPath = path.join(tgt, ".intent", "intent-tree.md");
    fs.writeFileSync(dataPath, "USER INTENT TREE");

    const result = install(tgt, { force: true, update: true });
    assert.notEqual(fs.readFileSync(dataPath, "utf8"), "USER INTENT TREE", "force で user-data も上書き");
    assert.equal(result.backedUp.length, 0, "force は backup を取らない (明示的全上書き)");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});
