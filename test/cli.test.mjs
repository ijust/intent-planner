// intent-planner CLI のテスト (node:test 標準・依存ゼロ)
// CLI を子プロセスで実行し、stdout の告知文言を検証する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "..", "bin", "cli.mjs");

function runCli(args) {
  return execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ip-cli-test-"));
}

// ---- 2.4 --help: --lang 説明が ja, en を反映 ----
test("--help shows --lang supports ja and en", () => {
  const out = runCli(["--help"]);
  // --lang の説明行に ja と en の両方が含まれる
  const langLine = out.split("\n").find((l) => l.includes("--lang"));
  assert.ok(langLine, "--lang の説明行が存在する");
  assert.match(langLine, /ja/, "--lang 説明に ja を含む");
  assert.match(langLine, /en/, "--lang 説明に en を含む");
  // 「現在 ja のみ対応」のような en を否定する表現を残さない
  assert.doesNotMatch(out, /ja のみ/, "HELP に「ja のみ」が残っていない");
});

// ---- 2.3 未対応言語 (fr): en を否定しない中立な告知 ----
test("--lang fr prints neutral fallback notice (does not deny en)", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--lang", "fr"]);
    // フォールバック告知が出る
    assert.match(out, /注意/, "フォールバック告知が出る");
    assert.match(out, /fr/, "指定言語 fr に言及する");
    // 「ja のみ対応」/「現在 ja のみ」のような en を否定する文言を含まない
    assert.doesNotMatch(out, /ja のみ/, "「ja のみ」を含まない");
    assert.doesNotMatch(out, /現在 ja のみ対応/, "「現在 ja のみ対応」を含まない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 2.3 / 2.2 --lang en: langFallback=false なので告知が出ない ----
test("--lang en prints no fallback notice", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--lang", "en"]);
    assert.doesNotMatch(out, /注意:/, "en 指定時にフォールバック告知が出ない");
    assert.doesNotMatch(out, /未対応/, "en 指定時に未対応告知が出ない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// execFileSync が非ゼロ終了でも stdout/stderr/status を取れるラッパ。
function runCliResult(args) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      status: err.status ?? 1,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
  }
}

// ---- task 2.3 (a) --agent codex: codex 配置 (.agents/skills/intent-* + AGENTS.md, .claude なし) ----
test("--agent codex places codex skills + AGENTS.md and not .claude", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--agent", "codex"]);
    // on-disk: codex の配置先と AGENTS.md・.intent があり、.claude は無い
    assert.ok(
      fs.existsSync(path.join(dir, ".agents", "skills", "intent-discover")),
      ".agents/skills/intent-discover が配置される",
    );
    assert.ok(fs.existsSync(path.join(dir, "AGENTS.md")), "AGENTS.md が配置される");
    assert.ok(fs.existsSync(path.join(dir, ".intent")), ".intent が配置される");
    assert.ok(!fs.existsSync(path.join(dir, ".claude")), ".claude は配置されない");
    // 結果表示に codex・AGENTS.md・Codex で実行できる次の指示が出る
    assert.match(out, /codex/, "結果に配置 agent codex が出る");
    assert.match(out, /AGENTS\.md/, "結果に AGENTS.md 案内が出る");
    assert.match(out, /intent-plan から始めて/, "Codex 用の一続きの実行指示が出る");
    assert.doesNotMatch(out, /\/intent-plan と入力/, "Codex に slash command を案内しない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("--agent codex --lang en uses natural-language skill guidance", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--agent", "codex", "--lang", "en"]);
    assert.match(out, /Say "start with intent-plan"/, "英語でも Codex 用の自然文の実行指示が出る");
    assert.doesNotMatch(out, /Type \/intent-plan at the prompt/, "英語でも Codex に slash command を案内しない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("re-installing for codex uses natural-language resume guidance", () => {
  const dir = tmpDir();
  try {
    runCli([dir, "--agent", "codex"]);
    const out = runCli([dir, "--agent", "codex"]);
    assert.match(out, /intent-plan を続けて/, "Codex の再開案内も自然文になる");
    assert.match(out, /intent-status を実行して/, "Codex の現在地確認も自然文になる");
    assert.doesNotMatch(out, /\/intent-status を実行/, "Codex の再開案内に slash command を出さない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 3.3 --agent gemini: 配置先 .agents/skills + GEMINI.md・告知が実態と一致 ----
test("--agent gemini places gemini skills + GEMINI.md and announces .agents/skills (not .claude)", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--agent", "gemini"]);
    // on-disk: gemini は .agents/skills を共有・GEMINI.md・.intent があり .claude は無い
    assert.ok(
      fs.existsSync(path.join(dir, ".agents", "skills", "intent-discover")),
      ".agents/skills/intent-discover が配置される（codex 共有）",
    );
    assert.ok(fs.existsSync(path.join(dir, "GEMINI.md")), "GEMINI.md が配置される");
    assert.ok(fs.existsSync(path.join(dir, ".intent")), ".intent が配置される");
    assert.ok(!fs.existsSync(path.join(dir, ".claude")), ".claude は配置されない");
    // 告知が実態と一致する: gemini・.agents/skills・GEMINI.md。.claude/skills と誤表示しない。
    assert.match(out, /gemini/, "結果に配置 agent gemini が出る");
    assert.match(out, /\.agents\/skills/, "告知の skill 配置先が .agents/skills");
    assert.doesNotMatch(out, /skill: \.claude\/skills/, "gemini で .claude/skills と誤表示しない");
    assert.match(out, /GEMINI\.md/, "結果に GEMINI.md 案内が出る");
    assert.match(out, /\/intent-plan/, "結果に主入口 /intent-plan が出る");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- task 2.3 (b) --agent 未指定: claude 配置 (.claude/skills, AGENTS.md なし) ----
test("no --agent installs claude (.claude/skills, no AGENTS.md)", () => {
  const dir = tmpDir();
  try {
    runCli([dir]);
    assert.ok(
      fs.existsSync(path.join(dir, ".claude", "skills", "intent-discover")),
      ".claude/skills/intent-discover が配置される",
    );
    assert.ok(fs.existsSync(path.join(dir, ".intent")), ".intent が配置される");
    assert.ok(!fs.existsSync(path.join(dir, "AGENTS.md")), "AGENTS.md は配置されない");
    assert.ok(!fs.existsSync(path.join(dir, ".agents")), ".agents は配置されない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 未対応 agent (cursor): 非ゼロ終了 + エラー文言 + 無配置 (gemini 追加後は cursor で封じ存置) ----
test("--agent cursor exits non-zero, prints error, places nothing", () => {
  const dir = tmpDir();
  try {
    const res = runCliResult([dir, "--agent", "cursor"]);
    assert.notEqual(res.status, 0, "非ゼロ終了する");
    assert.match(res.stderr, /対応していないエージェント/, "未対応 agent の旨を表示する");
    assert.match(res.stderr, /cursor/, "指定された cursor に言及する");
    // 何も配置されない
    assert.ok(!fs.existsSync(path.join(dir, ".claude")), ".claude を配置しない");
    assert.ok(!fs.existsSync(path.join(dir, ".agents")), ".agents を配置しない");
    assert.ok(!fs.existsSync(path.join(dir, "AGENTS.md")), "AGENTS.md を配置しない");
    assert.ok(!fs.existsSync(path.join(dir, ".intent")), ".intent を配置しない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 3.3 --help: --agent 説明 (claude, codex, gemini) ----
test("--help shows --agent supporting claude, codex and gemini", () => {
  const out = runCli(["--help"]);
  const agentLine = out.split("\n").find((l) => l.includes("--agent"));
  assert.ok(agentLine, "--agent の説明行が存在する");
  assert.match(agentLine, /claude/, "--agent 説明に claude を含む");
  assert.match(agentLine, /codex/, "--agent 説明に codex を含む");
  assert.match(agentLine, /gemini/, "--agent 説明に gemini を含む");
});

// ---- task 2.3: --agent=codex (= 形式) も同様に codex 配置 ----
test("--agent=codex (equals form) installs codex", () => {
  const dir = tmpDir();
  try {
    runCli([dir, "--agent=codex"]);
    assert.ok(fs.existsSync(path.join(dir, "AGENTS.md")), "AGENTS.md が配置される");
    assert.ok(!fs.existsSync(path.join(dir, ".claude")), ".claude は配置されない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- task 4.2 --enforce: フック配置サマリ (6.1, 6.7, 6.8) ----
// install は .git の existsSync しか見ないため、mkdir で git リポジトリ相当の配置先を作る。
function gitTmpDir() {
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, ".git"));
  return dir;
}

// install.mjs の plan が返す relative と同じ形（path.join 由来）で照合する。
const HOOK_RELATIVE = path.join(".git", "hooks", "pre-push");

// (a) --help に --enforce の説明行がある
test("--help shows --enforce line", () => {
  const out = runCli(["--help"]);
  const enforceLine = out.split("\n").find((l) => l.includes("--enforce"));
  assert.ok(enforceLine, "--enforce の説明行が存在する");
  assert.match(enforceLine, /pre-push/, "--enforce 説明に pre-push を含む");
});

// (b) 6.1: git リポジトリで --enforce → 配置一覧にフック + mode.md 案内、0o755 で実配置
test("--enforce in git repo lists hook placement, prints mode note, installs 0o755 hook", () => {
  const dir = gitTmpDir();
  try {
    // 既定はファイル列挙を畳むため、フックが配置一覧に出ることの検証は --verbose 経由で行う。
    const out = runCli([dir, "--enforce", "--verbose"]);
    assert.ok(out.includes(HOOK_RELATIVE), "配置一覧に .git/hooks/pre-push が出る");
    assert.match(out, /\.intent\/mode\.md/, "mode.md の案内が出る");
    assert.match(out, /enforcement/, "enforcement 設定で有効化される旨が出る");
    const hookPath = path.join(dir, ".git", "hooks", "pre-push");
    assert.ok(fs.existsSync(hookPath), "フックが実配置される");
    assert.equal(fs.statSync(hookPath).mode & 0o777, 0o755, "実行ビット 0o755 が付く");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (c) .git 不在で --enforce → 配置せず告知 + git init 後の再実行案内、.git を作らない
test("--enforce without .git prints notice + git init guidance, creates no .git", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--enforce"]);
    assert.match(out, /pre-push フックは配置しませんでした/, "フック未配置の告知が出る");
    assert.match(out, /git init 後に/, "git init 後の再実行案内が出る");
    assert.equal(fs.existsSync(path.join(dir, ".git")), false, ".git を作らない");
    assert.ok(!out.includes(HOOK_RELATIVE), "フックは配置一覧に出ない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (d) 6.8: --enforce --dry-run → 配置予定一覧にフックが含まれ、書き込みは発生しない
test("--enforce --dry-run lists hook in 配置予定 and writes nothing", () => {
  const dir = gitTmpDir();
  try {
    const out = runCli([dir, "--enforce", "--dry-run"]);
    assert.match(out, /配置予定/, "dry-run の配置予定見出しが出る");
    assert.ok(out.includes(HOOK_RELATIVE), "配置予定一覧に .git/hooks/pre-push が出る");
    assert.equal(
      fs.existsSync(path.join(dir, ".git", "hooks", "pre-push")),
      false,
      "フックは書き込まれない",
    );
    assert.equal(fs.existsSync(path.join(dir, ".intent")), false, "dry-run では何も書かない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (e) 6.7: 既存フックは SKIP 一覧に出て、手動統合（intent-check 呼び出し追記）の案内が出る
test("--enforce with existing hook shows skip + manual integration guidance", () => {
  const dir = gitTmpDir();
  const hookPath = path.join(dir, ".git", "hooks", "pre-push");
  fs.mkdirSync(path.dirname(hookPath), { recursive: true });
  fs.writeFileSync(hookPath, "#!/bin/sh\n# user hook\nexit 0\n");
  try {
    // スキップ一覧のファイル列挙は既定で畳むため --verbose で確認する。
    const out = runCli([dir, "--enforce", "--verbose"]);
    assert.ok(out.includes(`  = ${HOOK_RELATIVE}`), "スキップ一覧にフックが出る");
    assert.match(out, /intent-check\.mjs/, "手動統合の案内に intent-check 呼び出しが出る");
    assert.match(out, /追記/, "既存フックへの追記を案内する");
    assert.equal(
      fs.readFileSync(hookPath, "utf8"),
      "#!/bin/sh\n# user hook\nexit 0\n",
      "既存フックの内容は無変更",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- fix F1: 引数バリデーション (値を取るフラグの値欠落・未知フラグ) ----

// 何も配置されていないこと（ディレクトリが空のまま）を検証するヘルパ。
function assertNothingWritten(dir) {
  assert.deepEqual(fs.readdirSync(dir), [], "配置先に何も書き込まれない");
}

// (a) --lang の直後が別フラグ: 値を飲み込まず非ゼロ終了 + stderr 案内 + 無配置
test("--lang followed by another flag exits non-zero, prints error, writes nothing", () => {
  const dir = tmpDir();
  try {
    const res = runCliResult([dir, "--lang", "--force"]);
    assert.notEqual(res.status, 0, "非ゼロ終了する");
    assert.match(res.stderr, /--lang/, "stderr が --lang に言及する");
    assert.match(res.stderr, /値/, "値が必要な旨を表示する");
    assertNothingWritten(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (a') --lang が末尾で値が無い: 同様にエラー終了
test("--lang as last argument exits non-zero with error", () => {
  const dir = tmpDir();
  try {
    const res = runCliResult([dir, "--lang"]);
    assert.notEqual(res.status, 0, "非ゼロ終了する");
    assert.match(res.stderr, /--lang/, "stderr が --lang に言及する");
    assertNothingWritten(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (a'') --agent も同じ規則: 直後が別フラグならエラー終了
test("--agent followed by another flag exits non-zero with error", () => {
  const dir = tmpDir();
  try {
    const res = runCliResult([dir, "--agent", "--dry-run"]);
    assert.notEqual(res.status, 0, "非ゼロ終了する");
    assert.match(res.stderr, /--agent/, "stderr が --agent に言及する");
    assertNothingWritten(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (b) 未知フラグ --froce: 非ゼロ終了 + stderr がフラグ名を挙げ --help を案内 + 無配置
test("unknown flag --froce exits non-zero, names the flag, suggests --help, writes nothing", () => {
  const dir = tmpDir();
  try {
    const res = runCliResult([dir, "--froce"]);
    assert.notEqual(res.status, 0, "非ゼロ終了する");
    assert.match(res.stderr, /--froce/, "stderr が --froce を名指しする");
    assert.match(res.stderr, /--help/, "--help の参照を案内する");
    assertNothingWritten(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (c) = 形式と通常形式は引き続き動く
test("--lang=en (equals form) still works without fallback notice", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--lang=en"]);
    assert.doesNotMatch(out, /注意:/, "--lang=en でフォールバック告知が出ない");
    assert.ok(fs.existsSync(path.join(dir, ".intent")), ".intent が配置される");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("--lang ja --force (value then flag) still works", () => {
  const dir = tmpDir();
  try {
    const res = runCliResult([dir, "--lang", "ja", "--force"]);
    assert.equal(res.status, 0, "正常終了する");
    assert.ok(fs.existsSync(path.join(dir, ".intent")), ".intent が配置される");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- fix F1: codex の AGENTS.md 告知が実態 (copied/skipped/dry-run) に一致する ----

// (d) 既存 AGENTS.md がある codex 再実行: 「配置しました」と偽らずスキップを告知する
test("codex with existing AGENTS.md does not claim placement, says skipped", () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# user file\n");
  try {
    const out = runCli([dir, "--agent", "codex"]);
    assert.doesNotMatch(out, /AGENTS\.md を配置しました/, "配置していないのに配置済みと言わない");
    assert.match(out, /AGENTS\.md/, "AGENTS.md には言及する");
    assert.match(out, /スキップ/, "スキップした旨を告知する");
    assert.equal(fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8"), "# user file\n", "既存ファイルは無変更");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (d') codex --dry-run (新規): 「配置しました」ではなく配置予定の文言になる
test("codex --dry-run says 配置予定 for AGENTS.md, not 配置しました", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--agent", "codex", "--dry-run"]);
    assert.doesNotMatch(out, /AGENTS\.md を配置しました/, "dry-run で配置済みと言わない");
    assert.match(out, /AGENTS\.md を配置予定/, "配置予定の文言になる");
    assertNothingWritten(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (d'') codex 通常配置: 引き続き「配置しました」と告知する (回帰)
test("codex fresh install still announces AGENTS.md placement", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir, "--agent", "codex"]);
    assert.match(out, /AGENTS\.md を配置しました/, "実配置時は配置済みと告知する");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- task 5.2 gitignore 結果表示と追跡解除案内 (export-dirs Req 4.4, 4.5) ----

// (a) 4.5: --dry-run → gitignore 計画 (作成予定) が表示され、.gitignore は書き込まれない
test("--dry-run shows gitignore plan and writes no .gitignore", () => {
  const dir = gitTmpDir();
  try {
    const out = runCli([dir, "--dry-run"]);
    assert.match(out, /\.gitignore を作成予定/, "gitignore 計画 (作成予定) が表示される");
    assert.doesNotMatch(out, /\.gitignore を作成しました/, "dry-run で作成済みと言わない");
    assert.equal(fs.existsSync(path.join(dir, ".gitignore")), false, ".gitignore は書き込まれない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (b) 4.1/4.4: git リポジトリで実行 → 作成メッセージ + .gitignore 実配置。既存ありなら追記メッセージ。
//     2 回目 (整備済み・変更なし) も黙らず告知する。
test("real run in git dir prints create message; existing .gitignore prints append message", () => {
  // create: .gitignore 不在
  const dirCreate = gitTmpDir();
  try {
    const out = runCli([dirCreate]);
    assert.match(out, /\.gitignore を作成しました/, "作成メッセージが出る");
    assert.ok(fs.existsSync(path.join(dirCreate, ".gitignore")), ".gitignore が実配置される");

    // 2 回目 (冪等): 整備済み (変更なし) は毎回同文の no-op 報告のため、既定サマリでは畳まれ
    // --verbose で告知される (install-output-brevity・INV117。作成/追記/スキップの3アクションは
    // 変化・警告なので既定でも出る)。
    const outSecond = runCli([dirCreate]);
    assert.doesNotMatch(
      outSecond,
      /整備済みです/,
      "2 回目の既定サマリでは整備済み (変更なし) を畳む",
    );
    const outSecondVerbose = runCli([dirCreate, "--verbose"]);
    assert.match(
      outSecondVerbose,
      /\(\.intent\/cc-sdd\/ の除外記述は \.gitignore に整備済みです\)/,
      "2 回目の --verbose では整備済み (変更なし) メッセージが出る",
    );
    assert.doesNotMatch(outSecond, /\.gitignore を作成しました/, "2 回目に作成済みと言わない");
  } finally {
    fs.rmSync(dirCreate, { recursive: true, force: true });
  }
  // append: 既存 .gitignore あり (該当記述なし)
  const dirAppend = gitTmpDir();
  fs.writeFileSync(path.join(dirAppend, ".gitignore"), "node_modules/\n");
  try {
    const out = runCli([dirAppend]);
    assert.match(out, /\.gitignore に除外記述を追記しました/, "追記メッセージが出る");
    assert.match(out, /既存内容は変更していません/, "既存内容を変更しない旨が出る");
    assert.ok(
      fs.readFileSync(path.join(dirAppend, ".gitignore"), "utf8").startsWith("node_modules/\n"),
      "既存内容は先頭に残る",
    );
  } finally {
    fs.rmSync(dirAppend, { recursive: true, force: true });
  }
});

// (c) 4.4: 追跡済み cc-sdd 下書き → git rm --cached の案内のみ表示し、追跡解除を自動実行しない
test("tracked cc-sdd draft prints git rm --cached guidance without executing it", () => {
  const dir = tmpDir();
  const git = (...args) =>
    execFileSync(
      "git",
      ["-c", "user.email=test@example.com", "-c", "user.name=test", ...args],
      { cwd: dir, encoding: "utf8" },
    );
  const draftRel = ".intent/cc-sdd/requirements.md";
  try {
    // 本物の git リポジトリで cc-sdd 下書きを追跡済みにする。
    git("init");
    fs.mkdirSync(path.join(dir, ".intent", "cc-sdd"), { recursive: true });
    fs.writeFileSync(path.join(dir, draftRel), "## Source Packet\nlegacy-packet\n");
    git("add", draftRel);
    git("commit", "-m", "track legacy draft");

    // 既定は存在・件数・結論の警告のみ (install-output-brevity・INV117)。
    const out = runCli([dir]);
    assert.match(out, /注意: Git 追跡中の cc-sdd 下書きがあります \(1 件\):/, "既定でも警告の存在・件数が出る");
    // 追跡解除コマンドの案内・ファイル列挙・出所の全文は --verbose で出る。
    const verbose = runCli([dir, "--verbose"]);
    assert.match(verbose, /git rm --cached/, "追跡解除コマンドの案内が出る (--verbose)");
    assert.ok(verbose.includes(draftRel), "追跡中のファイルパスが列挙される (--verbose)");
    assert.match(verbose, /intent-export-cc-sdd/, "下書きの出所として /intent-export-cc-sdd を案内する (--verbose)");
    // 案内のみ: コマンドは実行されず、ファイルは追跡されたまま。
    const lsAfter = git("ls-files", "--", ".intent/cc-sdd");
    assert.ok(lsAfter.includes(draftRel), "CLI 実行後も下書きは追跡されたまま (自動解除しない)");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (d) 4.6: 非 git ディレクトリ → スキップ告知が出て .gitignore を作らない
test("non-git target prints gitignore skip notice and creates no .gitignore", () => {
  const dir = tmpDir();
  try {
    const out = runCli([dir]);
    assert.match(out, /git リポジトリではないため \.gitignore 整備をスキップしました/, "スキップ告知が出る");
    assert.equal(fs.existsSync(path.join(dir, ".gitignore")), false, ".gitignore は作成されない");
    assert.doesNotMatch(out, /git rm --cached/, "非リポジトリでは追跡解除案内が出ない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// (f) 6.2: --enforce なしの既定経路は不変（フック未配置・enforcement 言及なし）
test("no --enforce places no hook and prints no enforcement notes", () => {
  const dir = gitTmpDir();
  try {
    const out = runCli([dir]);
    assert.equal(
      fs.existsSync(path.join(dir, ".git", "hooks", "pre-push")),
      false,
      "フックは配置されない",
    );
    assert.ok(!out.includes(HOOK_RELATIVE), ".git/hooks/pre-push に言及しない");
    assert.doesNotMatch(out, /enforcement/, "enforcement の案内が出ない");
    assert.doesNotMatch(out, /git init/, "git init 案内が出ない");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
