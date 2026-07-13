// term-drift の任意導入契約が public docs / CLI help 間でドリフトしないための構造検査。
// 意味翻訳そのものは人がレビューし、機械検査は両言語に同じ契約ラベルと導線があることを固定する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "bin", "cli.mjs");
const DOCS = [
  "README.md",
  "README.en.md",
  "docs/guide.md",
  "docs/guide.en.md",
  "docs/theory.md",
  "docs/theory.en.md",
];
const PARITY_PAIRS = [
  ["README.md", "README.en.md"],
  ["docs/guide.md", "docs/guide.en.md"],
  ["docs/theory.md", "docs/theory.en.md"],
];
const CONTRACT_LABELS = [
  "--with-term-drift",
  "term-drift 0.2.1",
  "--yes",
  "not-installed",
  "ready",
  "inconsistent",
  "additive-compatible",
  "blocked",
  "install-failed",
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("term-drift 公開契約を説明する6文書が存在する", () => {
  const missing = DOCS.filter((relativePath) => !fs.existsSync(path.join(ROOT, relativePath)));
  assert.deepEqual(missing, [], `不足する公開文書: ${missing.join(", ")}`);
  assert.match(read("README.en.md"), /\(docs\/theory\.en\.md\)/, "English README から英語 theory を辿れる");
});

test("ja/en の公開文書ペアは同じ term-drift opt-in・health 契約ラベルを公開する", () => {
  for (const [jaPath, enPath] of PARITY_PAIRS) {
    for (const relativePath of [jaPath, enPath]) {
      const body = read(relativePath);
      const missing = CONTRACT_LABELS.filter((label) => !body.includes(label));
      assert.deepEqual(missing, [], `${relativePath} に不足する公開契約ラベル: ${missing.join(", ")}`);
      assert.match(body, /term-drift[^\n]*(?:専用|dedicated)[^\n]*(?:skill|スキル)/i);
    }
  }
});

test("公開 docs は owner 境界・安全な追加・自動更新対象外を説明する", () => {
  const meaningChecks = {
    "README.md": [/公式 installer/, /安全に追加/, /自動更新/, /term-drift 所有/],
    "README.en.md": [/official installer/i, /safe additive/i, /automatic updates/i, /term-drift-owned/i],
    "docs/guide.md": [/公式 installer/, /安全に追加/, /自動更新/, /term-drift 所有/],
    "docs/guide.en.md": [/official installer/i, /safe additive/i, /automatic updates/i, /term-drift-owned/i],
    "docs/theory.md": [/--with-term-drift/, /term-drift 0\.2\.1/, /公式 installer/, /自動更新/, /term-drift 所有/],
    "docs/theory.en.md": [
      /--with-term-drift/,
      /--yes/,
      /term-drift 0\.2\.1/,
      /official owner installer/i,
      /automatic updates/i,
      /term-drift-owned/i,
      /does not replace[^\n]*\/intent-validate/i,
    ],
  };

  for (const [relativePath, patterns] of Object.entries(meaningChecks)) {
    const body = read(relativePath);
    for (const pattern of patterns) assert.match(body, pattern, `${relativePath}: ${pattern}`);
  }
});

test("旧 init-only 導線は public docs と CLI 案内に残らない", () => {
  for (const relativePath of [...DOCS, "bin/cli.mjs"]) {
    assert.doesNotMatch(read(relativePath), /npx\s+term-drift\s+init/, relativePath);
  }
});

test("ja/en CLI help は専用 opt-in と --yes の別責務を同じ固定版で案内する", () => {
  for (const [lang, separateConsent] of [
    ["ja", /term-drift 導入の同意にはならない/],
    ["en", /does not consent to installing term-drift/],
  ]) {
    const result = spawnSync(process.execPath, [CLI, "--help", "--lang", lang], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /--with-term-drift[\s\S]{0,160}term-drift 0\.2\.1/);
    assert.match(result.stdout, /--yes, -y[\s\S]{0,180}(?:quickstart|ルート文書)/i);
    assert.match(result.stdout, separateConsent);
  }
});

test("intent-planner の公開版は docs 同期だけでは変更しない", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "0.21.0");
});
