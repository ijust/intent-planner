#!/usr/bin/env node
// intent-planner CLI
//
// npx intent-planner [dir] [--force] [--dry-run] [--lang <v>] [--agent <v>] [--help]
// 知能は core 側 (skill) にあり、この CLI は引数を解釈して install を呼び結果を表示するだけ。

import process from "node:process";
import { install } from "../src/install.mjs";

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
  --help, -h       このヘルプを表示する

配置されるもの:
  .claude/skills/intent-*/   Intent Planning の skill 群 (claude)
  .agents/skills/intent-*/   Intent Planning の skill 群 (codex) + ルート AGENTS.md
  .intent/                   Intent Tree / Compass / Packets などの scaffold (共有)

導入後は /intent-discover から始めてください。
`;

function parseArgs(argv) {
  const opts = { targetDir: ".", force: false, dryRun: false, lang: "ja", agent: "claude", help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--force") opts.force = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--lang") opts.lang = argv[++i] ?? "ja";
    else if (arg.startsWith("--lang=")) opts.lang = arg.slice("--lang=".length);
    else if (arg === "--agent") opts.agent = argv[++i] ?? "claude";
    else if (arg.startsWith("--agent=")) opts.agent = arg.slice("--agent=".length);
    else if (!arg.startsWith("-")) opts.targetDir = arg;
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

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
    });
  } catch (err) {
    process.stderr.write(`エラー: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  const { copied, skipped, ccSddDetected, langFallback, agent } = result;

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

  if (ccSddDetected) {
    process.stdout.write(
      `\ncc-sdd 連携を検出しました (.kiro/)。\n` +
        `  /intent-export-cc-sdd の成果物 (.intent/cc-sdd/) を cc-sdd の /kiro-spec-init に渡せます。\n`,
    );
  }

  // 配置したエージェント・配置先を告知する。
  if (agent === "codex") {
    process.stdout.write(
      `\n配置エージェント: codex\n` +
        `  skill: .agents/skills/intent-*/\n` +
        `  ルート doc: AGENTS.md を配置しました。\n`,
    );
  } else {
    process.stdout.write(
      `\n配置エージェント: ${agent}\n` + `  skill: .claude/skills/intent-*/\n`,
    );
  }

  process.stdout.write(`\n次のステップ: /intent-discover から始めてください。\n`);
}

main();
