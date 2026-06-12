#!/usr/bin/env node
// intent-planner CLI
//
// npx intent-planner [dir] [--force] [--dry-run] [--lang <v>] [--agent <v>] [--enforce] [--help]
// 知能は core 側 (skill) にあり、この CLI は引数を解釈して install を呼び結果を表示するだけ。

import path from "node:path";
import process from "node:process";
import { install } from "../src/install.mjs";

// install の plan が返すフックの relative（path.join 由来）と同じ形で照合する。
const HOOK_RELATIVE = path.join(".git", "hooks", "pre-push");

const HELP = `intent-planner — 軽量 Intent Planning workflow を配置します

使い方:
  npx intent-planner [dir] [options]

引数:
  dir              配置先ディレクトリ (既定: カレントディレクトリ)

オプション:
  --force          同名ファイルがあっても上書きする (既定: スキップ)
  --dry-run        書き込まず、配置/スキップ予定の一覧だけ表示する
  --lang <value>   言語を指定する (ja, en 対応。他は ja にフォールバック)
  --agent <value>  配置先エージェントを指定する (claude, codex 対応。既定: claude。
                   未対応の値はエラー終了し配置しない)
  --enforce        pre-push フック (.git/hooks/pre-push) を配置する (既定: 配置しない)
  --help, -h       このヘルプを表示する

配置されるもの:
  .claude/skills/intent-*/   Intent Planning の skill 群 (claude)
  .agents/skills/intent-*/   Intent Planning の skill 群 (codex) + ルート AGENTS.md
  .intent/                   Intent Tree / Compass / Packets などの scaffold (共有)

導入後は /intent-discover から始めてください。
`;

// 引数を解釈する。不正な入力 (値欠落・未知フラグ) は opts.error にメッセージを入れて
// 即座に返し、main が stderr 表示 + 非ゼロ終了する (黙ってデフォルトに倒さない)。
function parseArgs(argv) {
  const opts = { targetDir: ".", force: false, dryRun: false, lang: "ja", agent: "claude", enforce: false, help: false, error: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--force") opts.force = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--enforce") opts.enforce = true;
    else if (arg === "--lang" || arg === "--agent") {
      // 値を取るフラグ: 次トークンが無い、または別のフラグなら値欠落エラー (値として飲み込まない)。
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("-")) {
        const example = arg === "--lang" ? "ja" : "claude";
        opts.error = `${arg} には値が必要です (例: ${arg} ${example})`;
        return opts;
      }
      if (arg === "--lang") opts.lang = next;
      else opts.agent = next;
      i++;
    } else if (arg.startsWith("--lang=")) opts.lang = arg.slice("--lang=".length);
    else if (arg.startsWith("--agent=")) opts.agent = arg.slice("--agent=".length);
    else if (arg.startsWith("-")) {
      // 未知フラグは黙殺せずエラー終了する (typo の取りこぼし防止)。
      opts.error = `不明なオプションです: ${arg}\n  使い方は --help を参照してください。`;
      return opts;
    } else opts.targetDir = arg;
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.error) {
    process.stderr.write(`エラー: ${opts.error}\n`);
    process.exitCode = 1;
    return;
  }

  if (opts.help) {
    process.stdout.write(HELP);
    return;
  }

  let result;
  try {
    result = install(opts.targetDir, {
      force: opts.force,
      dryRun: opts.dryRun,
      lang: opts.lang,
      agent: opts.agent,
      enforce: opts.enforce,
    });
  } catch (err) {
    process.stderr.write(`エラー: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  const { copied, skipped, ccSddDetected, langFallback, agent, enforceHookSkippedNoGit, gitignore, trackedCcSdd } = result;

  if (langFallback) {
    process.stdout.write(
      `注意: 指定された言語 "${opts.lang}" は対応していないため、日本語 (ja) テンプレートを配置します。\n\n`,
    );
  }

  if (opts.dryRun) {
    process.stdout.write(`[dry-run] 書き込みは行いません。以下が配置/スキップ予定です。\n\n`);
  }

  if (copied.length > 0) {
    process.stdout.write(`${opts.dryRun ? "配置予定" : "配置しました"} (${copied.length}):\n`);
    for (const f of copied) process.stdout.write(`  + ${f}\n`);
  }
  if (skipped.length > 0) {
    process.stdout.write(`\nスキップ (既存) (${skipped.length}):\n`);
    for (const f of skipped) process.stdout.write(`  = ${f}\n`);
    if (!opts.force) {
      process.stdout.write(`  (上書きするには --force を付けてください)\n`);
    }
  }

  // gitignore 整備の結果 (4.4)。dry-run では計画として表示する (書き込みは install 側で行われない・4.5)。
  // none (整備済み) も含め、4 アクション (作成 / 追記 / 変更なし / スキップ) すべてを告知する。
  if (gitignore === "create") {
    process.stdout.write(
      opts.dryRun
        ? `\n.gitignore を作成予定です (.intent/cc-sdd/ の下書きを Git 非追跡化)\n`
        : `\n.gitignore を作成しました (.intent/cc-sdd/ の下書きを Git 非追跡化)\n`,
    );
  } else if (gitignore === "append") {
    process.stdout.write(
      opts.dryRun
        ? `\n.gitignore に除外記述を追記予定です (既存内容は変更しません)\n`
        : `\n.gitignore に除外記述を追記しました (既存内容は変更していません)\n`,
    );
  } else if (gitignore === "none") {
    // 整備済み (変更なし) も告知する。no-op の事実報告なので dry-run と実行で同文。
    process.stdout.write(`\n(.intent/cc-sdd/ の除外記述は .gitignore に整備済みです)\n`);
  } else if (gitignore === "skipped-not-git") {
    process.stdout.write(`\n(git リポジトリではないため .gitignore 整備をスキップしました)\n`);
  }

  // Git 追跡済みの cc-sdd 下書きの案内 (4.4)。案内のみで、追跡解除は決して自動実行しない。
  if (trackedCcSdd.length > 0) {
    process.stdout.write(`\n注意: Git 追跡中の cc-sdd 下書きがあります (${trackedCcSdd.length}):\n`);
    for (const f of trackedCcSdd) process.stdout.write(`  - ${f}\n`);
    process.stdout.write(
      `  下書きはローカル専用 (Git 非追跡) の方針です。旧形式 (cc-sdd 直下のファイル) は\n` +
        `  次回 /intent-export-cc-sdd が packet ディレクトリへ移行します。その移行後に\n` +
        `  (packet ディレクトリ配下のものはいつでも) \`git rm --cached <パス>\` を手動で実行して追跡を解除してください。\n`,
    );
  }

  // --enforce のサマリ。フック行自体は上の配置/スキップ一覧に出るので、ここでは補足だけ表示する。
  if (opts.enforce) {
    if (enforceHookSkippedNoGit) {
      // .git 不在: フックは計画されない。git init 後の再実行を案内する (6.1)。
      process.stdout.write(
        `\n注意: --enforce が指定されましたが .git が見つからないため、pre-push フックは配置しませんでした。\n` +
          `  git init 後にもう一度 --enforce 付きで実行してください。\n`,
      );
    } else if (copied.includes(HOOK_RELATIVE)) {
      // 配置 (予定) 済み: 強度は mode.md 側で決まる旨を軽く添える。
      process.stdout.write(
        `\npre-push フック: gate / remind は .intent/mode.md の enforcement 設定で有効化されます。\n`,
      );
    } else if (skipped.includes(HOOK_RELATIVE)) {
      // 既存フックは SKIP (6.7)。手動統合の方法を案内する。
      process.stdout.write(
        `\npre-push フックは既存のため上書きしませんでした。手動で統合するには、\n` +
          `  既存の .git/hooks/pre-push に \`node .intent/scripts/intent-check.mjs\` の呼び出しを追記してください。\n`,
      );
    }
  }

  if (ccSddDetected) {
    process.stdout.write(
      `\ncc-sdd 連携を検出しました (.kiro/)。\n` +
        `  /intent-export-cc-sdd の成果物 (.intent/cc-sdd/) を cc-sdd の /kiro-spec-init に渡せます。\n`,
    );
  }

  // 配置したエージェント・配置先を告知する。
  if (agent === "codex") {
    // AGENTS.md の告知は実態 (copied/skipped/dry-run) に合わせる。配置していないのに
    // 「配置しました」と言わない。
    const ROOT_DOC = "AGENTS.md";
    let docNote;
    if (copied.includes(ROOT_DOC)) {
      docNote = opts.dryRun ? `${ROOT_DOC} を配置予定です。` : `${ROOT_DOC} を配置しました。`;
    } else if (skipped.includes(ROOT_DOC)) {
      docNote = opts.dryRun
        ? `${ROOT_DOC} は既存のためスキップ予定です。`
        : `${ROOT_DOC} は既存のためスキップしました。`;
    } else {
      // 計画に現れなかった場合 (テンプレ欠落など)。配置済みとは告知しない。
      docNote = `${ROOT_DOC} は配置されませんでした。`;
    }
    process.stdout.write(
      `\n配置エージェント: codex\n` +
        `  skill: .agents/skills/intent-*/\n` +
        `  ルート doc: ${docNote}\n`,
    );
  } else {
    process.stdout.write(
      `\n配置エージェント: ${agent}\n` + `  skill: .claude/skills/intent-*/\n`,
    );
  }

  process.stdout.write(`\n次のステップ: /intent-discover から始めてください。\n`);
}

main();
