// CI 検査テンプレート (x958) 専用テスト (node:test 標準・依存ゼロ)。
// packet: pkt-20260706-ci-check-template-x958 (A54 / C42 / DR103 / INV71)。
//
// 範囲: --with-ci で配置される GitHub Actions 雛形と installer 配線の判別オラクル。
//   群A: 雛形が ja/en に実在し、LLM 呼び出し・API キー・secrets 参照を含まない (INV71)。
//   群B: permissions が明記され読み取り最小 (contents: read) で、write 権限が現れない。
//   群C: warn/fail の非対称を「抽出した run スクリプトの実行」で判別する:
//        intent-check が stale (exit 1) でもステップは exit 0 + ::warning を出す /
//        exit 2 (実行不可) は warning を出さず通過 / スクリプト不在はスキップで通過 /
//        テストステップは既定 exit 0・コマンドを埋めて赤なら非 0 (PR fail 相当)。
//   群D: installer 配線 — withCi 明示時のみ計画・既定では計画しない・既存は上書きしない
//        (shared 分類・非破壊)。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { computeCopyPlan, classifyFile, AGENT_REGISTRY } from "../src/install.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const LANGS = ["ja", "en"];

function templatePath(lang) {
  return path.join(REPO_ROOT, "templates", lang, "ci", "intent-planner-check.yml");
}
function readTemplate(lang) {
  return fs.readFileSync(templatePath(lang), "utf8");
}

// ---- 群A: 実在 + INV71 (スクリプト検査のみ・鍵ゼロ) ----

const FORBIDDEN_PATTERNS = [
  /ANTHROPIC_API_KEY/i,
  /OPENAI/i,
  /secrets\./, // GITHUB_TOKEN を含め secrets 参照ゼロ (鍵不要が売りの雛形)
  /api\.anthropic\.com/i,
  /claude/i, // LLM 呼び出しの痕跡
];

for (const lang of LANGS) {
  test(`群A: ${lang} 雛形が実在し LLM/API キー/secrets 参照を含まない (INV71)`, () => {
    assert.ok(fs.existsSync(templatePath(lang)), `${lang}: templates/${lang}/ci/intent-planner-check.yml が実在する`);
    const content = readTemplate(lang);
    for (const pat of FORBIDDEN_PATTERNS) {
      assert.ok(!pat.test(content), `${lang}: 禁止パターン ${pat} が現れない`);
    }
  });
}

// ---- 群B: permissions 明記 + 読み取り最小 ----

for (const lang of LANGS) {
  test(`群B: ${lang} 雛形の permissions が読み取り最小である`, () => {
    const content = readTemplate(lang);
    assert.ok(/^permissions:\s*$/m.test(content), `${lang}: permissions ブロックが明記されている`);
    assert.ok(/^\s+contents: read\s*$/m.test(content), `${lang}: contents: read がある`);
    assert.ok(!/:\s*write(-all)?\s*$/m.test(content), `${lang}: write 権限の付与 (「: write」) が現れない`);
    assert.ok(!/write-all/.test(content), `${lang}: write-all が現れない`);
  });
}

// ---- 群C: warn/fail 非対称 (抽出した run スクリプトを実際に実行して判別) ----

// step 名を起点に `run: |` ブロック本文 (10 スペース字下げ) を取り出す。
function extractRunBlock(content, stepNameFragment) {
  const lines = content.split(/\r?\n/);
  const nameIdx = lines.findIndex((l) => l.includes("- name:") && l.includes(stepNameFragment));
  assert.ok(nameIdx >= 0, `step が見つかる: ${stepNameFragment}`);
  const runIdx = lines.findIndex((l, i) => i > nameIdx && /^\s+run: \|\s*$/.test(l));
  assert.ok(runIdx > nameIdx, `run: | が見つかる: ${stepNameFragment}`);
  const body = [];
  for (let i = runIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "") { body.push(""); continue; }
    if (!l.startsWith("          ")) break; // 10 スペースより浅い = ブロック終端
    body.push(l.slice(10));
  }
  return body.join("\n");
}

// GitHub Actions の既定 shell 相当で実行し {code, stdout} を返す。
function runScript(script, cwd) {
  const file = path.join(cwd, "_step.sh");
  fs.writeFileSync(file, script);
  try {
    const out = execFileSync("bash", ["-e", "-o", "pipefail", file], { cwd, encoding: "utf8" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

function makeRepoFixture(intentCheckSource) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-tpl-"));
  if (intentCheckSource !== null) {
    fs.mkdirSync(path.join(dir, ".intent", "scripts"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".intent", "scripts", "intent-check.mjs"), intentCheckSource);
  }
  return dir;
}

for (const lang of LANGS) {
  const content = readTemplate(lang);
  const checkScript = extractRunBlock(content, "intent-check");
  const testScript = extractRunBlock(content, "project tests");

  test(`群C: ${lang} intent-check が stale (exit 1) でもステップは exit 0 + warning (PR を落とさない)`, () => {
    const dir = makeRepoFixture(
      `console.log("intent-check: result=stale enforcement=gate commits=9 threshold=5 grace=- pending=0 block=yes"); process.exitCode = 1;`,
    );
    const r = runScript(checkScript, dir);
    assert.equal(r.code, 0, "ステップ自体は成功終了 (warn は PR を落とさない)");
    assert.ok(r.out.includes("::warning"), "GitHub の warning 注釈が出る");
  });

  test(`群C: ${lang} remind モード相当 (exit 0 だが result=stale) でも warning が出る (grep 経路の主検査)`, () => {
    // intent-check の実契約では enforcement=remind/off だと stale でも exit 0 (shouldBlock は gate のみ)。
    // つまり出力の result=stale を読む grep 節が warning の主経路であり、exit code だけ見る実装を落とす。
    const dir = makeRepoFixture(
      `console.log("intent-check: result=stale enforcement=remind commits=9 threshold=5 grace=- pending=1 block=no");`,
    );
    const r = runScript(checkScript, dir);
    assert.equal(r.code, 0, "remind の stale はステップを落とさない");
    assert.ok(r.out.includes("::warning"), "exit 0 でも result=stale なら warning が出る");
  });

  test(`群C: ${lang} intent-check が exit 2 (実行不可) なら warning を出さず通過 (fail-open)`, () => {
    const dir = makeRepoFixture(`process.exitCode = 2;`);
    const r = runScript(checkScript, dir);
    assert.equal(r.code, 0, "実行不可でもステップは成功終了");
    assert.ok(!r.out.includes("::warning"), "実行不可は書き戻し漏れの warning にしない");
  });

  test(`群C: ${lang} intent-check スクリプト不在ならスキップして通過 (部分利用リポで止まらない)`, () => {
    const dir = makeRepoFixture(null);
    const r = runScript(checkScript, dir);
    assert.equal(r.code, 0, "不在でもステップは成功終了");
    assert.ok(!r.out.includes("::warning"), "不在はスキップであって警告ではない");
  });

  test(`群C: ${lang} intent-check が正常 (exit 0/ok) なら warning を出さない`, () => {
    const dir = makeRepoFixture(
      `console.log("intent-check: result=ok enforcement=off commits=- threshold=5 grace=- pending=0 block=no");`,
    );
    const r = runScript(checkScript, dir);
    assert.equal(r.code, 0);
    assert.ok(!r.out.includes("::warning"), "ok では警告を出さない (狼少年化しない)");
  });

  test(`群C: ${lang} テストステップは既定で exit 0・コマンドを埋めて赤なら非 0 (fail の非対称)`, () => {
    const dir = makeRepoFixture(null);
    const asIs = runScript(testScript, dir);
    assert.equal(asIs.code, 0, "穴埋め前の既定はスキップで成功終了");
    // 「1行書き換えると有効化」の実挙動: echo 行を赤いテストコマンドへ置換すると fail する。
    const enabled = testScript
      .split("\n")
      .map((l) => (l.trimStart().startsWith("echo ") ? "false" : l))
      .join("\n");
    const red = runScript(enabled, dir);
    assert.notEqual(red.code, 0, "テスト赤はステップ失敗 (PR fail 相当)");
  });
}

// ---- 群D: installer 配線 (withCi 明示時のみ・非破壊・shared 分類) ----

const CI_RELATIVE = path.join(".github", "workflows", "intent-planner-check.yml");

test("群D: classifyFile が CI 雛形を shared に分類する (update で上書きしない根拠)", () => {
  assert.equal(classifyFile(CI_RELATIVE), "shared");
});

test("群D: withCi 明示時のみ計画され、既定では計画されない", () => {
  const langRoot = path.join(REPO_ROOT, "templates", "ja");
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "ci-plan-"));
  const without = computeCopyPlan(langRoot, target, { agentEntry: AGENT_REGISTRY.claude });
  assert.ok(!without.some((e) => e.relative === CI_RELATIVE), "既定 (withCi なし) では計画に現れない");
  const withCi = computeCopyPlan(langRoot, target, { agentEntry: AGENT_REGISTRY.claude, withCi: true });
  const entry = withCi.find((e) => e.relative === CI_RELATIVE);
  assert.ok(entry, "withCi: true で計画に現れる");
  assert.equal(entry.action, "COPY", "配置先が空なら COPY");
});

test("群D: 既存の雛形 (利用者が編集済みかもしれない) は update でも上書きしない (SKIP)", () => {
  const langRoot = path.join(REPO_ROOT, "templates", "ja");
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "ci-skip-"));
  fs.mkdirSync(path.join(target, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(path.join(target, ".github", "workflows", "intent-planner-check.yml"), "# user edited\n");
  const plan = computeCopyPlan(langRoot, target, {
    agentEntry: AGENT_REGISTRY.claude,
    withCi: true,
    update: true,
  });
  const entry = plan.find((e) => e.relative === CI_RELATIVE);
  assert.ok(entry, "計画には現れる");
  assert.equal(entry.action, "SKIP", "既存は SKIP (非破壊)");
});
