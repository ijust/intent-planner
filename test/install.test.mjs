// intent-planner installer のテスト (node:test 標準・依存ゼロ)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  computeCopyPlan,
  applyPlan,
  detectCcSdd,
  install,
  defaultTemplatesDir,
  resolveLangRoot,
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
      fs.existsSync(path.join(tgt, ".intent", "cc-sdd", "requirements.md")),
      "cc-sdd scaffold 配置",
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
      fs.existsSync(path.join(tgt, ".intent", "cc-sdd", "tasks.md")),
      "en: cc-sdd/tasks.md 配置",
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
