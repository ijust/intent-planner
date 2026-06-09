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
} from "../src/install.mjs";

const TEMPLATES = defaultTemplatesDir();
// computeCopyPlan は言語ルートを起点にする (templates/ 直下ではなく templates/ja)。
const JA_ROOT = resolveLangRoot(TEMPLATES, "ja").langRoot;
// en も対応言語。computeCopyPlan は en ルート (templates/en) を起点に走査できる。
const EN_ROOT = resolveLangRoot(TEMPLATES, "en").langRoot;

function tmpDir(prefix = "ip-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

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
