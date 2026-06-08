#!/usr/bin/env node
// intent-planner CLI
//
// npx intent-planner [dir] [--force] [--dry-run] [--lang <v>] [--help]
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
  --lang <value>   言語を指定する (現在 ja のみ対応。他は ja にフォールバック)
  --help, -h       このヘルプを表示する

配置されるもの:
  .claude/skills/intent-*/   Intent Planning の skill 群
  .intent/                   Intent Tree / Compass / Packets などの scaffold

導入後は /intent-discover から始めてください。
`;

function parseArgs(argv) {
  const opts = { targetDir: ".", force: false, dryRun: false, lang: "ja", help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--force") opts.force = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--lang") opts.lang = argv[++i] ?? "ja";
    else if (arg.startsWith("--lang=")) opts.lang = arg.slice("--lang=".length);
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
    });
  } catch (err) {
    process.stderr.write(`エラー: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  const { copied, skipped, ccSddDetected, langFallback } = result;

  if (langFallback) {
    process.stdout.write(
      `注意: --lang "${opts.lang}" は現在未対応です。日本語テンプレートを配置します。\n\n`,
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

  process.stdout.write(`\n次のステップ: /intent-discover から始めてください。\n`);
}

main();
