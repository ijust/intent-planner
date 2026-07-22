// 構造検証 + パッケージング検証 (node:test 標準・依存ゼロ)
// 4.3: en frontmatter 規約 / en・ja ファイル集合 1:1 / npm pack に en・ja 同梱・test 除外。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classifyFile, install } from "../src/install.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const EN_ROOT = path.join(TEMPLATES, "en");
const JA_ROOT = path.join(TEMPLATES, "ja");
const NPM_TEST_ENV = {
  ...process.env,
  npm_config_cache: path.join(os.tmpdir(), "intent-planner-structure-pack-npm-cache"),
};

// en の skill ディレクトリ名 (= name 期待値)。基盤4 + lifecycle 4。
// intent-release-note は release-note seam の placeholder SKILL.md（rules 先置きの受け皿。
//   変換ロジック本体は後続 skill packet）。read-only 射影系のため AUTO_INVOCABLE_SKILLS にも入る。
const EN_SKILL_NAMES = [
  "intent-discover",
  "intent-compass",
  "intent-packets",
  "intent-export-cc-sdd",
  "intent-export-openspec",
  "intent-export-speckit",
  "intent-status",
  "intent-validate",
  "intent-improve",
  "intent-writeback",
  "intent-overview",
  "intent-from-spec",
  "intent-from-code",
  "intent-to-spec",
  "intent-release-note",
  "intent-plan",
  "intent-graphiti-sync",
];

// frontmatter 必須フィールド (core 契約)。
const REQUIRED_FRONTMATTER_FIELDS = [
  "name",
  "description",
  "allowed-tools",
  "argument-hint",
  "disable-model-invocation",
];

// canonical 非書き換え (read-only) 系スキル = モデル自動起動を許す。
// 判定軸は「canonical を書き換えない」こと。これらは `disable-model-invocation` を
// 必須にせず、むしろ持たないことを要求する (フィールド不在検査)。
// 注意: lifecycle.test.mjs:42 の READ_ONLY_SKILLS とは別軸 (あちらは allowed-tools 軸で
// status/validate のみ) なので、同名衝突を避けるため AUTO_INVOCABLE_SKILLS と命名する。
const AUTO_INVOCABLE_SKILLS = new Set([
  "intent-status",
  "intent-validate",
  "intent-overview",
  "intent-from-spec",
  "intent-from-code",
  "intent-to-spec",
  "intent-release-note",
  "intent-plan",
]);

// 明示起動に限定する skill。Graphiti の事前確認は read-only でも外部接続を
// 観測し得るため、canonical 非書き換えだけを根拠に自動起動側へ入れない。
const NOT_AUTO_INVOCABLE_SKILLS = new Set([
  "intent-discover",
  "intent-compass",
  "intent-packets",
  "intent-export-cc-sdd",
  "intent-export-openspec",
  "intent-export-speckit",
  "intent-improve",
  "intent-writeback",
  "intent-graphiti-sync",
]);

// 先頭の `---` フェンス間を frontmatter として読み、`key: value` を素朴に抽出する (yaml 依存なし)。
function parseFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  assert.equal(lines[0].trim(), "---", `${filePath}: 先頭が --- フェンス`);
  const fields = {};
  let closed = false;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closed = true;
      break;
    }
    const m = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  assert.ok(closed, `${filePath}: 閉じ --- フェンスが存在する`);
  return fields;
}

// 言語ルート配下の全ファイルを相対パスで列挙する (任意ネスト・隠しファイル含む)。
function listFiles(root) {
  return fs
    .readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const parent = entry.parentPath ?? entry.path;
      return path.relative(root, path.join(parent, entry.name));
    });
}

// ---- 4.3 構造: en SKILL.md の frontmatter 規約 (Req 5.2 / 5.3) ----

for (const skillName of EN_SKILL_NAMES) {
  test(`en frontmatter: ${skillName} は必須5フィールドを持ち name が規約に従う`, () => {
    const skillPath = path.join(EN_ROOT, "claude", "skills", skillName, "SKILL.md");
    assert.ok(fs.existsSync(skillPath), `SKILL.md が実在する: ${skillPath}`);

    const fm = parseFrontmatter(skillPath);

    const autoInvocable = AUTO_INVOCABLE_SKILLS.has(skillName);
    const notAutoInvocable = NOT_AUTO_INVOCABLE_SKILLS.has(skillName);
    assert.notEqual(
      autoInvocable,
      notAutoInvocable,
      `${skillName}: auto-invocable と明示起動専用のどちらか一方に分類される`,
    );

    // 必須フィールドがすべて存在し、空でない。
    // auto-invocable (canonical 非書き換え) スキルは `disable-model-invocation` を必須にしない。
    // 残り4フィールド (name/description/allowed-tools/argument-hint) は全スキル一律で必須。
    for (const field of REQUIRED_FRONTMATTER_FIELDS) {
      if (autoInvocable && field === "disable-model-invocation") continue;
      assert.ok(
        Object.prototype.hasOwnProperty.call(fm, field),
        `${skillName}: frontmatter に ${field} がある`,
      );
      assert.ok(fm[field].length > 0, `${skillName}: ${field} が空でない`);
    }

    // auto-invocable スキルは `disable-model-invocation` を持たない (積極的な不在検査)。
    // canonical を書き換えないため、モデル自動起動を抑止しない。
    if (autoInvocable) {
      assert.ok(
        !("disable-model-invocation" in fm),
        `${skillName}: auto-invocable は disable-model-invocation を持たない (自動起動可)`,
      );
    } else {
      assert.equal(
        fm["disable-model-invocation"],
        "true",
        `${skillName}: 明示起動専用は disable-model-invocation: true`,
      );
    }

    // name は intent-* で始まり、ディレクトリ名と一致する。
    assert.ok(fm.name.startsWith("intent-"), `${skillName}: name が intent- で始まる`);
    assert.equal(fm.name, skillName, `${skillName}: name がディレクトリ名と一致する`);

    // name は kiro-* と衝突しない (cc-sdd 非衝突)。
    assert.ok(!fm.name.startsWith("kiro-"), `${skillName}: name が kiro- で始まらない`);
  });
}

// ---- 4.3 構造: en/ja ファイル集合の 1:1 一致 (Req 5.2 / 6.2 — 翻訳漏れ・余剰なし) ----

test("en/ja のファイル集合が 1:1 一致 (翻訳漏れ・余剰なし)", () => {
  const enFiles = new Set(listFiles(EN_ROOT));
  const jaFiles = new Set(listFiles(JA_ROOT));

  const missingInEn = [...jaFiles].filter((f) => !enFiles.has(f)).sort();
  const surplusInEn = [...enFiles].filter((f) => !jaFiles.has(f)).sort();

  assert.deepEqual(missingInEn, [], `en に欠落 (ja にあって en にない): ${missingInEn.join(", ")}`);
  assert.deepEqual(surplusInEn, [], `en に余剰 (en にあって ja にない): ${surplusInEn.join(", ")}`);

  // 念のため集合として完全一致 (件数 > 0)。
  assert.ok(enFiles.size > 0, "en は空でない");
  assert.deepEqual(
    [...enFiles].sort(),
    [...jaFiles].sort(),
    "en/ja の相対パス集合が完全一致",
  );
});

// ---- 4.3 パッケージング: npm pack --dry-run --json に en・ja 同梱 / test 除外 (Req 5.4 / 6.4) ----

test("npm pack の成果物に templates/ja/** と templates/en/** が含まれ test/ を含まない", () => {
  // --dry-run --json は files[].path を構造化 JSON で返す (テキスト走査より堅牢)。
  // 実際に npm pack を起動して実成果物リストを検査する (ハードコードではない)。
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: NPM_TEST_ENV,
    // npm の進捗/警告は STDERR。JSON は STDOUT に出るので STDOUT のみ解析する。
  });

  const parsed = JSON.parse(raw);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  assert.ok(entry && Array.isArray(entry.files), "pack JSON に files 配列がある");

  // path は posix 区切り正規化されている前提だが、念のため正規化する。
  const paths = entry.files.map((f) => f.path.split(path.sep).join("/"));

  assert.ok(
    paths.some((p) => p.startsWith("templates/ja/")),
    `成果物に templates/ja/ 配下が含まれる: ${paths.join(", ")}`,
  );
  assert.ok(
    paths.some((p) => p.startsWith("templates/en/")),
    `成果物に templates/en/ 配下が含まれる: ${paths.join(", ")}`,
  );
  assert.ok(
    !paths.some((p) => p.startsWith("test/")),
    `成果物に test/ 配下を含まない: ${paths.filter((p) => p.startsWith("test/")).join(", ")}`,
  );
});

const GRAPHITI_DISTRIBUTION_PATHS = [
  "templates/ja/claude/skills/intent-graphiti-sync/SKILL.md",
  "templates/ja/codex/skills/intent-graphiti-sync/SKILL.md",
  "templates/ja/intent/graphiti-safety-boundary.md",
  "templates/ja/intent/graphiti-sync-boundary.md",
  "templates/ja/intent/graphiti-search-boundary.md",
  "templates/en/claude/skills/intent-graphiti-sync/SKILL.md",
  "templates/en/codex/skills/intent-graphiti-sync/SKILL.md",
  "templates/en/intent/graphiti-safety-boundary.md",
  "templates/en/intent/graphiti-sync-boundary.md",
  "templates/en/intent/graphiti-search-boundary.md",
];

test("Graphiti preflight の4配布面と共通契約が npm pack に含まれる", () => {
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: NPM_TEST_ENV,
  });
  const parsed = JSON.parse(raw);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  const paths = new Set(entry.files.map((file) => file.path.split(path.sep).join("/")));

  for (const expected of GRAPHITI_DISTRIBUTION_PATHS) {
    assert.ok(paths.has(expected), `pack に ${expected} が含まれる`);
  }
});

test("Graphiti安全契約は installer 管理のcodeとして分類される", () => {
  assert.equal(classifyFile(".intent/graphiti-safety-boundary.md"), "code");
  assert.equal(classifyFile(".intent/graphiti-sync-boundary.md"), "code");
  assert.equal(classifyFile(".intent/graphiti-search-boundary.md"), "code");
});

test("Graphiti preflight は既存 installer の dry-run と通常installで日英・Claude/Codexへ再帰配置される", () => {
  const fixtures = [
    ["ja", "claude", ".claude/skills/intent-graphiti-sync/SKILL.md"],
    ["ja", "codex", ".agents/skills/intent-graphiti-sync/SKILL.md"],
    ["en", "claude", ".claude/skills/intent-graphiti-sync/SKILL.md"],
    ["en", "codex", ".agents/skills/intent-graphiti-sync/SKILL.md"],
  ];

  for (const [lang, agent, skillRelative] of fixtures) {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), `graphiti-${lang}-${agent}-`));
    try {
      const dryRun = install(target, { lang, agent, dryRun: true });
      assert.ok(
        dryRun.copied.includes(skillRelative),
        `${lang}/${agent}: dry-run が skill の配置を計画する`,
      );
      assert.ok(
        dryRun.copied.includes(".intent/graphiti-safety-boundary.md"),
        `${lang}/${agent}: dry-run が共通契約の配置を計画する`,
      );
      assert.ok(
        dryRun.copied.includes(".intent/graphiti-sync-boundary.md"),
        `${lang}/${agent}: dry-run が同期契約の配置を計画する`,
      );
      assert.ok(
        dryRun.copied.includes(".intent/graphiti-search-boundary.md"),
        `${lang}/${agent}: dry-run が検索契約の配置を計画する`,
      );
      assert.equal(fs.readdirSync(target).length, 0, `${lang}/${agent}: dry-run は書き込まない`);

      const installed = install(target, { lang, agent });
      assert.ok(installed.copied.includes(skillRelative), `${lang}/${agent}: skill を配置する`);
      assert.ok(
        installed.copied.includes(".intent/graphiti-safety-boundary.md"),
        `${lang}/${agent}: 共通契約を配置する`,
      );
      assert.ok(fs.existsSync(path.join(target, skillRelative)), `${lang}/${agent}: skill が実在する`);
      assert.ok(
        fs.existsSync(path.join(target, ".intent", "graphiti-safety-boundary.md")),
        `${lang}/${agent}: 共通契約が実在する`,
      );
      assert.ok(
        fs.existsSync(path.join(target, ".intent", "graphiti-sync-boundary.md")),
        `${lang}/${agent}: 同期契約が実在する`,
      );
      assert.ok(
        fs.existsSync(path.join(target, ".intent", "graphiti-search-boundary.md")),
        `${lang}/${agent}: 検索契約が実在する`,
      );
    } finally {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
});
