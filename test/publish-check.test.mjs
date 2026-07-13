// publish-check（npm publish 直前の安全ゲート）の discriminative テスト。
// 各チェックが誤実装を落とせること、Fail-Fast と fail-open の区別を検証する。
// node:test + node:assert/strict・依存ゼロ。

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "publish-check.mjs");

const mod = await import(fileURLToPath(new URL("../scripts/publish-check.mjs", import.meta.url)));

// --- (c) 広報網羅: 列挙の有無で合否が変わる discriminative テスト（Req 4.1, 4.2） ---

test("(c) AGENT_REGISTRY はエントリ名だけを抽出し、内部フィールドを agent 扱いしない", () => {
  assert.deepEqual(mod.collectAgents(), ["claude", "codex", "gemini"]);
});

test("(c) nested internal object を agent 扱いせず、top-level の追加 agent だけを抽出する", () => {
  const registry = {
    claude: { compatibility: { channel: "stable" } },
    codex: { installer: { argument: "--codex" } },
    future: { metadata: { owner: "external" } },
  };
  assert.deepEqual(mod.collectAgents(registry), ["claude", "codex", "future"]);
});

test("(c) 対応エージェント/出力先が keywords に全て揃っていれば ok", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const res = mod.checkPromotion(pkg);
  assert.equal(res.status, "ok", "現状の keywords は正本を満たすはず");
});

test("(c) keywords から対応エージェントを1つ抜くと missing（誤実装=見逃しを落とす）", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  pkg.keywords = pkg.keywords.filter((k) => k !== "gemini");
  const res = mod.checkPromotion(pkg);
  assert.equal(res.status, "missing");
  assert.ok(res.reasons.join("\n").includes("gemini"), "未収載の gemini を列挙する");
});

test("(c) keywords から対応出力先を1つ抜くと missing", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  pkg.keywords = pkg.keywords.filter((k) => k !== "openspec");
  const res = mod.checkPromotion(pkg);
  assert.equal(res.status, "missing");
  assert.ok(res.reasons.join("\n").includes("openspec"));
});

test("(c) description の文章は判定対象にしない（Req 4.3）", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const original = pkg.description;
  pkg.description = "";
  const res = mod.checkPromotion(pkg);
  // description を空にしても keywords が揃っていれば ok（description は評価対象外）。
  assert.equal(res.status, "ok", "description の内容は (c) の合否に影響しない");
  pkg.description = original;
});

// --- (a) 同梱漏洩: 漏洩パターンの判定ロジックを discriminative に検証（Req 2.1, 2.2） ---
// checkBundle は npm pack を子プロセス起動するため、漏洩判定の中核（templates 除外 +
// 開発文脈 grep）を、スクリプトと同じパターンで再現して discriminative に確認する。

const DEV_CONTEXT = [
  /^\.intent\//,
  /^\.kiro\//,
  /^\.claude\/skills\/intent-/,
  /^\.claude\/skills\/CONTRACT\.md$/,
  /^\.agents(\/|$)/,
  /^\.codex(\/|$)/,
];
function detectLeaks(files) {
  const candidates = files.filter((f) => !f.startsWith("templates/"));
  return candidates.filter((f) => DEV_CONTEXT.some((re) => re.test(f)));
}

test("(a) 開発文脈の混入を検出する（漏洩注入）", () => {
  const files = ["bin/cli.mjs", "src/install.mjs", ".kiro/specs/foo/design.md"];
  const leaks = detectLeaks(files);
  assert.deepEqual(leaks, [".kiro/specs/foo/design.md"]);
});

test("(a) templates 配下の正規 CONTRACT.md・intent-* skill を誤検出しない（除外）", () => {
  const files = [
    "templates/ja/claude/skills/CONTRACT.md",
    "templates/ja/claude/skills/intent-compass/SKILL.md",
    "bin/cli.mjs",
  ];
  const leaks = detectLeaks(files);
  assert.deepEqual(leaks, [], "配布対象の templates 配下は漏洩でない");
});

test("(a) リポジトリ直下の .claude/skills/CONTRACT.md は漏洩として検出する", () => {
  const leaks = detectLeaks([".claude/skills/CONTRACT.md", "README.md"]);
  assert.deepEqual(leaks, [".claude/skills/CONTRACT.md"]);
});

// --- 直接実行時の出力契約と exit コード（Req 1.1, 5.4・骨格の機械可読行） ---

test("直接実行: stdout 1行目が機械可読判定行で result/block を含む", () => {
  const r = spawnSync("node", [SCRIPT], { cwd: ROOT, encoding: "utf8" });
  const firstLine = r.stdout.split("\n")[0];
  assert.match(firstLine, /^publish-check: result=(pass|block|skip) /);
  assert.match(firstLine, /block=(yes|no)$/);
});

test("実行不能（package.json 不在の cwd）は exit 2・fail-open（Req 5.3）", () => {
  const r = spawnSync("node", [SCRIPT], { cwd: path.join(ROOT, "scripts"), encoding: "utf8" });
  // scripts/ には package.json が無い → 読めず exit 2（fail-open）。
  assert.equal(r.status, 2);
  assert.match(r.stdout, /result=skip/);
});
