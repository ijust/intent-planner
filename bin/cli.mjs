#!/usr/bin/env node
// intent-planner CLI
//
// npx intent-planner [dir] [--force] [--update-shared] [--dry-run] [--lang <v>] [--agent <v>] [--enforce] [--help]
// 知能は core 側 (skill) にあり、この CLI は引数を解釈して install を呼び結果を表示するだけ。

import path from "node:path";
import process from "node:process";
import { install, AGENT_REGISTRY, makeRootDocConfirm, makeForceOverwriteConfirm } from "../src/install.mjs";

// install の plan が返すフックの relative（path.join 由来）と同じ形で照合する。
const HOOK_RELATIVE = path.join(".git", "hooks", "pre-push");

// ---- メッセージカタログ (ja / en) ----
//
// 主要メッセージ (--help・インストール結果の告知・次のステップ・警告・確認プロンプト) を
// --lang に連動して出す (A45/④-3・2026-07-04 利用者確定「主要メッセージを英語化」)。
//   - 静的な ja/en 文字列の対のみ。翻訳ライブラリ・ロケール自動検出は入れない (INV3 依存ゼロ)。
//   - エラーメッセージ (引数エラー・install の例外) は対象外 (④-3 の範囲は「主要」まで)。
//   - 対応外の lang は resolveLangRoot と同じく ja に倒す (msgLangOf)。--lang ja / 未指定の
//     出力は従来とバイト等価 (後方互換の判別オラクル)。
function msgLangOf(lang) {
  return lang === "en" ? "en" : "ja";
}

const HELP_JA = `intent-planner — 軽量 Intent Planning workflow を配置します

使い方:
  npx intent-planner [dir] [options]

引数:
  dir              配置先ディレクトリ (既定: カレントディレクトリ)

オプション:
  --force          同名ファイルがあっても全て上書きする (.intent/ のあなたのデータも含まれ、
                   失われます。対話環境では実行前に確認します)
  --update-shared  共有ファイル (CLAUDE.md / AGENTS.md / GEMINI.md / pre-push) も配布版へ
                   更新する (上書き前に <ファイル>.bak へ退避。.intent/ のあなたのデータには触れません)
  --no-update      既存ファイルは一切上書きせず全てスキップする (旧来の既定挙動)
  --dry-run        書き込まず、配置/スキップ予定の一覧だけ表示する
  --lang <value>   言語を指定する (ja, en 対応。他は ja にフォールバック)
  --agent <value>  配置先エージェントを指定する (claude, codex, gemini 対応。既定: claude。
                   未対応の値はエラー終了し配置しない)
  --enforce        pre-push フック (.git/hooks/pre-push) を配置する (既定: 配置しない)
  --yes, -y        既存ルート文書 (CLAUDE.md 等) への quickstart 追記の確認を省いて同意する
                   (非対話環境では既定で追記をスキップ。--yes で前渡しできる)
  --help, -h       このヘルプを表示する

配置されるもの:
  .claude/skills/intent-*/   Intent Planning の skill 群 (claude) + ルート CLAUDE.md
  .agents/skills/intent-*/   Intent Planning の skill 群 (codex / gemini) + ルート AGENTS.md / GEMINI.md
  .intent/                   Intent Tree / Compass / Packets などの scaffold (共有)

  既にルート文書 (CLAUDE.md / AGENTS.md / GEMINI.md) がある場合は、確認のうえ非破壊で
  追記します (既存内容は変更しません)。claude / gemini は quickstart 本体を別ファイル
  (CLAUDE_intent.md / GEMINI_intent.md) に置き、ルート文書へ参照1行を足します。codex は
  ルート文書の末尾に quickstart セクションを追記します。

バージョンアップ (既定の挙動):
  引数なしで再実行すると、skill やスクリプトなど intent-planner が所有するファイル
  (code) だけを安全に最新へ更新します。あなたが書いた .intent/ の成果物・ログ・状態
  (intent-tree.md / intent-compass.md / 各ログ / mode.md / packets の index・plan など)
  は上書きしません。更新で上書きする code は <ファイル>.bak に退避してから書きます。
  共有ファイル (ルート文書等) も配布版へ揃えたいときは --update-shared を。
  一切上書きしたくないときは --no-update を。

導入後は /intent-discover から始めてください。
`;

const HELP_EN = `intent-planner — sets up a lightweight Intent Planning workflow

Usage:
  npx intent-planner [dir] [options]

Arguments:
  dir              Target directory (default: current directory)

Options:
  --force          Overwrite every file even if it exists (this includes YOUR data
                   under .intent/, which will be lost. In an interactive terminal
                   you will be asked to confirm before it runs)
  --update-shared  Also refresh the shared files (CLAUDE.md / AGENTS.md / GEMINI.md /
                   pre-push) to the distributed version (the current file is saved
                   to <file>.bak first; your data under .intent/ is never touched)
  --no-update      Never overwrite existing files; skip them all (the old default)
  --dry-run        Show what would be placed/skipped without writing anything
  --lang <value>   Language (ja and en are supported; others fall back to ja)
  --agent <value>  Target agent (claude, codex, gemini; default: claude.
                   Unsupported values exit with an error and place nothing)
  --enforce        Install the pre-push hook (.git/hooks/pre-push) (default: off)
  --yes, -y        Skip the confirmation for appending the quickstart to an existing
                   root document (CLAUDE.md etc.) and consent up front
                   (in non-interactive environments the append is skipped by default)
  --help, -h       Show this help

What gets placed:
  .claude/skills/intent-*/   Intent Planning skills (claude) + root CLAUDE.md
  .agents/skills/intent-*/   Intent Planning skills (codex / gemini) + root AGENTS.md / GEMINI.md
  .intent/                   Scaffold for the Intent Tree / Compass / Packets (shared)

  If a root document (CLAUDE.md / AGENTS.md / GEMINI.md) already exists, the quickstart
  is appended non-destructively after confirmation (existing content is left unchanged).
  claude / gemini place the body in a separate file (CLAUDE_intent.md / GEMINI_intent.md)
  and add a one-line reference; codex appends a section at the end of the root document.

Upgrading (the default behavior):
  Re-running with no arguments safely updates only the files intent-planner owns
  (code: skills, scripts, reference docs). Your deliverables, logs and state under
  .intent/ (intent-tree.md / intent-compass.md / logs / mode.md / packets index & plan)
  are never overwritten. Updated code files are saved to <file>.bak before writing.
  To also align the shared files (root documents etc.) with the distributed version,
  use --update-shared. To avoid overwriting anything, use --no-update.

After installing, start with /intent-discover.
`;

const MSG_JA = {
  help: HELP_JA,
  forcePrompt:
    `警告: --force は全てのファイルを上書きします (.intent/ のあなたの作業データも含まれ、失われます)。\n` +
    `  続行しますか? [y/N]: `,
  forceAborted: `中止しました (何も書き込んでいません)。\n`,
  rootDocPromptFor: (rel, action) => {
    const what =
      action === "reference"
        ? `既存の ${rel} の末尾に参照行を1行追記し、quickstart 本体を別ファイルで配置します`
        : `既存の ${rel} の末尾に intent-planner の quickstart セクションを追記します`;
    return `${what}\n  追記してよいですか? [y/N]: `;
  },
  langFallback: (lang) =>
    `注意: 指定された言語 "${lang}" は対応していないため、日本語 (ja) テンプレートを配置します。\n\n`,
  dryRunBanner: `[dry-run] 書き込みは行いません。以下が配置/スキップ予定です。\n\n`,
  placedHeader: (n, dry) => `${dry ? "新規配置予定" : "新規配置しました"} (${n}):\n`,
  updatedHeader: (n, dry) =>
    `\n${dry ? "更新予定 (既存を上書き)" : "更新しました (既存を上書き)"} (${n}):\n`,
  bakNote: (dry) =>
    dry
      ? `  (上書き前の現物は <ファイル>.bak に退避予定です)\n`
      : `  (上書き前の現物は <ファイル>.bak に退避しました。問題なければ削除して構いません)\n`,
  userDataHeader: (n) => `\nスキップ (あなたのデータを保護) (${n}):\n`,
  userDataNote:
    `  (あなたが書いた成果物・ログ・状態です。上書きしません。\n` +
    `   ※ --force を付けるとこれらも全て上書きされ、データが失われます)\n`,
  sharedHeader: (n) => `\nスキップ (既存を尊重・共有ファイル) (${n}):\n`,
  sharedNoteUpToDate: `  (配布版と同一の最新です。書き込みは行いません)\n`,
  sharedNoteGuide:
    `  (あなたが追記・統合しているかもしれないため上書きしません。\n` +
    `   配布版へ更新するには --update-shared を付けてください (上書き前に <ファイル>.bak へ退避します))\n`,
  upToDateHeader: (n) => `\nスキップ (既に最新) (${n}):\n`,
  upToDateNote: `  (テンプレートと同一の最新版です。書き込みは行いません)\n`,
  skippedExistingHeader: (n) => `\nスキップ (既存) (${n}):\n`,
  skippedExistingHint: `  (code を更新するには引数なしで再実行、全上書きには --force を付けてください)\n`,
  updateSharedNoTargets: `\n(--update-shared: 上書き更新が必要な共有ファイルはありませんでした)\n`,
  gitignoreCreate: (dry) =>
    dry
      ? `\n.gitignore を作成予定です (.intent/cc-sdd/ の下書きを Git 非追跡化)\n`
      : `\n.gitignore を作成しました (.intent/cc-sdd/ の下書きを Git 非追跡化)\n`,
  gitignoreAppend: (dry) =>
    dry
      ? `\n.gitignore に除外記述を追記予定です (既存内容は変更しません)\n`
      : `\n.gitignore に除外記述を追記しました (既存内容は変更していません)\n`,
  gitignoreNone: `\n(.intent/cc-sdd/ の除外記述は .gitignore に整備済みです)\n`,
  gitignoreSkippedNotGit: `\n(git リポジトリではないため .gitignore 整備をスキップしました)\n`,
  trackedCcSddHeader: (n) => `\n注意: Git 追跡中の cc-sdd 下書きがあります (${n}):\n`,
  trackedCcSddNote:
    `  下書きはローカル専用 (Git 非追跡) の方針です。cc-sdd 下書き\n` +
    `  (/intent-export-cc-sdd が packet ディレクトリ配下に生成するもの) は\n` +
    `  \`git rm --cached <パス>\` を手動で実行して追跡を解除してください。\n`,
  trackedModeLocal:
    `\n注意: .intent/mode.local.md が Git 追跡中です。\n` +
    `  mode 状態 (mode.local.md) はローカル専用ファイルです。チームや並行セッションと\n` +
    `  共有すると mode の衝突が起きるため、Git 追跡から外すことを推奨します。\n` +
    `  ローカルの内容を消さずに追跡だけ解除するには:\n` +
    `    git rm --cached .intent/mode.local.md\n`,
  enforceNoGit:
    `\n注意: --enforce が指定されましたが .git が見つからないため、pre-push フックは配置しませんでした。\n` +
    `  git init 後にもう一度 --enforce 付きで実行してください。\n`,
  enforceHookPlaced:
    `\npre-push フック: gate / remind は .intent/mode.md の enforcement 設定で有効化されます。\n`,
  enforceHookExisting:
    `\npre-push フックは既存のため上書きしませんでした。手動で統合するには、\n` +
    `  既存の .git/hooks/pre-push に \`node .intent/scripts/intent-check.mjs\` の呼び出しを追記してください。\n`,
  ccSddDetected:
    `\ncc-sdd 連携を検出しました (.kiro/)。\n` +
    `  /intent-export-cc-sdd の成果物 (.intent/cc-sdd/) を cc-sdd の /kiro-spec-init に渡せます。\n`,
  agentHeader: (agent, skillDest) => `\n配置エージェント: ${agent}\n  skill: ${skillDest}/intent-*/\n`,
  docNoteCreate: (doc, dry) => (dry ? `${doc} を配置予定です。` : `${doc} を配置しました。`),
  docNoteReference: (doc, dry) =>
    dry
      ? `既存の ${doc} へ参照1行を追記し、quickstart 本体を別ファイルで配置予定です（既存内容は変更しません）。`
      : `既存の ${doc} へ参照1行を追記し、quickstart 本体を別ファイルで配置しました（既存内容は変更していません）。`,
  docNoteAppend: (doc, dry) =>
    dry
      ? `既存の ${doc} の末尾へ quickstart セクションを追記予定です（既存内容は変更しません）。`
      : `既存の ${doc} の末尾へ quickstart セクションを追記しました（既存内容は変更していません）。`,
  docNoteNone: (doc) => `既存の ${doc} には quickstart が既に追記済みです（変更なし）。`,
  docNoteSkippedNoTty: (doc) =>
    `既存の ${doc} への quickstart 追記を見送りました（確認できない非対話環境）。\n` +
    `    追記するには対話環境で再実行するか --yes を付けてください。`,
  docNoteSkippedNoDoc: (doc) => `${doc} 追記用テンプレートが見つからず追記できませんでした。`,
  docNoteNotPlaced: (doc) => `${doc} は配置されませんでした。`,
  rootDocLabel: (docNote) => `  ルート doc: ${docNote}\n`,
  nextStep: `\n次のステップ: /intent-discover から始めてください。\n`,
};

const MSG_EN = {
  help: HELP_EN,
  forcePrompt:
    `Warning: --force overwrites EVERY file (including your own work under .intent/, which will be lost).\n` +
    `  Continue? [y/N]: `,
  forceAborted: `Aborted (nothing was written).\n`,
  rootDocPromptFor: (rel, action) => {
    const what =
      action === "reference"
        ? `This will append one reference line to your existing ${rel} and place the quickstart body in a separate file`
        : `This will append the intent-planner quickstart section to the end of your existing ${rel}`;
    return `${what}\n  Append it? [y/N]: `;
  },
  langFallback: (lang) =>
    `Note: the language "${lang}" is not supported, so the Japanese (ja) templates will be placed.\n\n`,
  dryRunBanner: `[dry-run] Nothing will be written. The following would be placed/skipped.\n\n`,
  placedHeader: (n, dry) => `${dry ? "Would place" : "Placed"} (${n}):\n`,
  updatedHeader: (n, dry) =>
    `\n${dry ? "Would update (overwriting existing)" : "Updated (overwrote existing)"} (${n}):\n`,
  bakNote: (dry) =>
    dry
      ? `  (the current file would be saved to <file>.bak before overwriting)\n`
      : `  (the previous file was saved to <file>.bak. You can delete it once you are happy)\n`,
  userDataHeader: (n) => `\nSkipped (protecting your data) (${n}):\n`,
  userDataNote:
    `  (These are deliverables, logs and state that you wrote. They are never overwritten.\n` +
    `   Note: --force WOULD overwrite all of them and your data would be lost)\n`,
  sharedHeader: (n) => `\nSkipped (respecting existing shared files) (${n}):\n`,
  sharedNoteUpToDate: `  (identical to the distributed version; nothing to write)\n`,
  sharedNoteGuide:
    `  (not overwritten because you may have appended or merged your own content.\n` +
    `   To refresh them to the distributed version, add --update-shared (the current file is saved to <file>.bak first))\n`,
  upToDateHeader: (n) => `\nSkipped (already up to date) (${n}):\n`,
  upToDateNote: `  (identical to the templates; nothing to write)\n`,
  skippedExistingHeader: (n) => `\nSkipped (existing) (${n}):\n`,
  skippedExistingHint: `  (re-run with no arguments to update code; add --force to overwrite everything)\n`,
  updateSharedNoTargets: `\n(--update-shared: no shared files needed refreshing)\n`,
  gitignoreCreate: (dry) =>
    dry
      ? `\nWould create .gitignore (keeps .intent/cc-sdd/ drafts out of Git)\n`
      : `\nCreated .gitignore (keeps .intent/cc-sdd/ drafts out of Git)\n`,
  gitignoreAppend: (dry) =>
    dry
      ? `\nWould append ignore entries to .gitignore (existing content is not changed)\n`
      : `\nAppended ignore entries to .gitignore (existing content was not changed)\n`,
  gitignoreNone: `\n(the .intent/cc-sdd/ ignore entries are already present in .gitignore)\n`,
  gitignoreSkippedNotGit: `\n(not a git repository, so .gitignore setup was skipped)\n`,
  trackedCcSddHeader: (n) => `\nNote: some cc-sdd drafts are tracked by Git (${n}):\n`,
  trackedCcSddNote:
    `  Drafts are meant to stay local (untracked). For cc-sdd drafts\n` +
    `  (generated under the packet directories by /intent-export-cc-sdd), run\n` +
    `  \`git rm --cached <path>\` manually to untrack them.\n`,
  trackedModeLocal:
    `\nNote: .intent/mode.local.md is tracked by Git.\n` +
    `  The mode state (mode.local.md) is a local-only file. Sharing it with your team or\n` +
    `  parallel sessions causes mode conflicts, so we recommend untracking it.\n` +
    `  To untrack it while keeping your local content:\n` +
    `    git rm --cached .intent/mode.local.md\n`,
  enforceNoGit:
    `\nNote: --enforce was given but no .git was found, so the pre-push hook was not installed.\n` +
    `  Run again with --enforce after git init.\n`,
  enforceHookPlaced:
    `\npre-push hook: gate / remind are enabled via the enforcement setting in .intent/mode.md.\n`,
  enforceHookExisting:
    `\nThe pre-push hook already exists, so it was not overwritten. To integrate manually,\n` +
    `  add a call to \`node .intent/scripts/intent-check.mjs\` in your existing .git/hooks/pre-push.\n`,
  ccSddDetected:
    `\nDetected cc-sdd (.kiro/).\n` +
    `  You can pass the output of /intent-export-cc-sdd (.intent/cc-sdd/) to cc-sdd's /kiro-spec-init.\n`,
  agentHeader: (agent, skillDest) => `\nAgent: ${agent}\n  skills: ${skillDest}/intent-*/\n`,
  docNoteCreate: (doc, dry) => (dry ? `${doc} would be placed.` : `${doc} was placed.`),
  docNoteReference: (doc, dry) =>
    dry
      ? `Would append one reference line to your existing ${doc} and place the quickstart body in a separate file (existing content is not changed).`
      : `Appended one reference line to your existing ${doc} and placed the quickstart body in a separate file (existing content was not changed).`,
  docNoteAppend: (doc, dry) =>
    dry
      ? `Would append the quickstart section to the end of your existing ${doc} (existing content is not changed).`
      : `Appended the quickstart section to the end of your existing ${doc} (existing content was not changed).`,
  docNoteNone: (doc) => `Your existing ${doc} already contains the quickstart (no change).`,
  docNoteSkippedNoTty: (doc) =>
    `Skipped appending the quickstart to your existing ${doc} (non-interactive environment, no confirmation possible).\n` +
    `    Re-run in an interactive terminal or pass --yes to append it.`,
  docNoteSkippedNoDoc: (doc) => `Could not append: the template for ${doc} was not found.`,
  docNoteNotPlaced: (doc) => `${doc} was not placed.`,
  rootDocLabel: (docNote) => `  root doc: ${docNote}\n`,
  nextStep: `\nNext step: start with /intent-discover.\n`,
};

const MESSAGES = { ja: MSG_JA, en: MSG_EN };

// 引数を解釈する。不正な入力 (値欠落・未知フラグ) は opts.error にメッセージを入れて
// 即座に返し、main が stderr 表示 + 非ゼロ終了する (黙ってデフォルトに倒さない)。
function parseArgs(argv) {
  // update は既定 ON: 引数なしの再実行で code を安全に最新化する。--no-update で旧来の全スキップ、
  // --force で全上書き（force は update より強い）。
  const opts = { targetDir: ".", force: false, update: true, updateShared: false, dryRun: false, lang: "ja", agent: "claude", enforce: false, yes: false, help: false, error: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--force") opts.force = true;
    else if (arg === "--update-shared") opts.updateShared = true;
    else if (arg === "--no-update") opts.update = false;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--enforce") opts.enforce = true;
    else if (arg === "--yes" || arg === "-y") opts.yes = true;
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

  // 主要メッセージの言語 (--lang 連動・対応外は ja)。エラーメッセージは対象外 (ja のまま)。
  const T = MESSAGES[msgLangOf(opts.lang)];

  if (opts.error) {
    process.stderr.write(`エラー: ${opts.error}\n`);
    process.exitCode = 1;
    return;
  }

  if (opts.help) {
    process.stdout.write(T.help);
    return;
  }

  // --force の実行前確認（A45/④-1・INV56）。書き込みが起きる実行のときだけ確認する
  // (dry-run は書き込まないので確認不要)。対話環境では「何が失われるか」を明示して y/n を取り、
  // 非対話環境では --force の明示自体を同意とみなし従来どおり実行する (CI 互換・後方互換)。
  if (opts.force && !opts.dryRun) {
    const confirmForce = makeForceOverwriteConfirm({
      yes: opts.yes,
      isTTY: Boolean(process.stdin.isTTY),
      prompt: T.forcePrompt,
    });
    if (!confirmForce()) {
      process.stdout.write(T.forceAborted);
      return;
    }
  }

  let result;
  try {
    result = install(opts.targetDir, {
      force: opts.force,
      // force は全上書きなので update は無効化（decideAction でも force 優先だが意図を明示）。
      update: opts.update && !opts.force,
      updateShared: opts.updateShared && !opts.force,
      dryRun: opts.dryRun,
      lang: opts.lang,
      agent: opts.agent,
      enforce: opts.enforce,
      // 既存ルート文書への追記同意。--yes で前渡し、未指定なら対話 (非対話ではスキップ)。
      confirmRootDoc: makeRootDocConfirm({
        yes: opts.yes,
        isTTY: Boolean(process.stdin.isTTY),
        promptFor: T.rootDocPromptFor,
      }),
    });
  } catch (err) {
    process.stderr.write(`エラー: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  const { copied, skipped, backedUp, update, plan, ccSddDetected, langFallback, agent, enforceHookSkippedNoGit, gitignore, trackedCcSdd, trackedModeLocal, rootDoc } = result;

  if (langFallback) {
    process.stdout.write(T.langFallback(opts.lang));
  }

  if (opts.dryRun) {
    process.stdout.write(T.dryRunBanner);
  }

  // copied を「新規配置」と「更新 (既存 code / shared の上書き)」に分けて告知する。
  // 更新分 = backup を取ったエントリ (= 既存を上書きしたもの)。残りが新規配置。
  const updatedSet = new Set(backedUp);
  const placed = copied.filter((f) => !updatedSet.has(f));
  const updated = copied.filter((f) => updatedSet.has(f));

  if (placed.length > 0) {
    process.stdout.write(T.placedHeader(placed.length, opts.dryRun));
    for (const f of placed) process.stdout.write(`  + ${f}\n`);
  }
  if (updated.length > 0) {
    process.stdout.write(T.updatedHeader(updated.length, opts.dryRun));
    for (const f of updated) process.stdout.write(`  ^ ${f}\n`);
    process.stdout.write(T.bakNote(opts.dryRun));
  }

  if (skipped.length > 0) {
    if (update) {
      // update モードの skip は3つの理由に分かれる。理由ごとに分けて告知し、
      // 「あなたのデータ保護」と「単に最新だった code」を混同させない。
      //   - user-data : ユーザー成果物・ログ・状態（保護）
      //   - shared    : ユーザー領域共有ファイル（既存を尊重・AGENTS.md / pre-push）
      //   - code      : 既にソースと byte 一致＝最新なので更新不要
      const kindOf = new Map(plan.map((e) => [e.relative, e.kind]));
      const userData = skipped.filter((f) => kindOf.get(f) === "user-data");
      const shared = skipped.filter((f) => kindOf.get(f) === "shared");
      const upToDate = skipped.filter((f) => kindOf.get(f) === "code");

      if (userData.length > 0) {
        process.stdout.write(T.userDataHeader(userData.length));
        for (const f of userData) process.stdout.write(`  = ${f}\n`);
        process.stdout.write(T.userDataNote);
      }
      if (shared.length > 0) {
        process.stdout.write(T.sharedHeader(shared.length));
        for (const f of shared) process.stdout.write(`  = ${f}\n`);
        // 案内は安全な経路 (--update-shared) へ向ける。全上書きの --force を更新の正規経路として
        // 案内しない (INV56: 危険側の操作に言及するときは何が失われるかの明示と安全な代替を伴う)。
        process.stdout.write(opts.updateShared ? T.sharedNoteUpToDate : T.sharedNoteGuide);
      }
      if (upToDate.length > 0) {
        process.stdout.write(T.upToDateHeader(upToDate.length));
        for (const f of upToDate) process.stdout.write(`  = ${f}\n`);
        process.stdout.write(T.upToDateNote);
      }
    } else {
      // --no-update (旧来の全スキップ): 理由を分けず既存スキップとして告知する。
      process.stdout.write(T.skippedExistingHeader(skipped.length));
      for (const f of skipped) process.stdout.write(`  = ${f}\n`);
      if (!opts.force) {
        process.stdout.write(T.skippedExistingHint);
      }
    }
  }

  // --update-shared の更新対象が無かったときの告知 (A45・異常系を沈黙させない)。
  // 「上書き更新」= 既存の共有ファイルを配布版へ置き換えたエントリ (backup 付き COPY)。
  // 新規配置 (共有ファイル不在→COPY) は上の新規配置一覧に出るため、ここでは数えない。
  if (opts.updateShared && !opts.force) {
    const sharedRefreshed = plan.filter((e) => e.kind === "shared" && e.action === "COPY" && e.backup);
    if (sharedRefreshed.length === 0) {
      process.stdout.write(T.updateSharedNoTargets);
    }
  }

  // gitignore 整備の結果 (4.4)。dry-run では計画として表示する (書き込みは install 側で行われない・4.5)。
  // none (整備済み) も含め、4 アクション (作成 / 追記 / 変更なし / スキップ) すべてを告知する。
  if (gitignore === "create") {
    process.stdout.write(T.gitignoreCreate(opts.dryRun));
  } else if (gitignore === "append") {
    process.stdout.write(T.gitignoreAppend(opts.dryRun));
  } else if (gitignore === "none") {
    // 整備済み (変更なし) も告知する。no-op の事実報告なので dry-run と実行で同文。
    process.stdout.write(T.gitignoreNone);
  } else if (gitignore === "skipped-not-git") {
    process.stdout.write(T.gitignoreSkippedNotGit);
  }

  // Git 追跡済みの cc-sdd 下書きの案内 (4.4)。案内のみで、追跡解除は決して自動実行しない。
  if (trackedCcSdd.length > 0) {
    process.stdout.write(T.trackedCcSddHeader(trackedCcSdd.length));
    for (const f of trackedCcSdd) process.stdout.write(`  - ${f}\n`);
    process.stdout.write(T.trackedCcSddNote);
  }

  // Git 追跡済みの .intent/mode.local.md の移行案内 (DR12・INV3)。案内のみ・自動実行しない。
  if (trackedModeLocal) {
    process.stdout.write(T.trackedModeLocal);
  }

  // --enforce のサマリ。フック行自体は上の配置/スキップ一覧に出るので、ここでは補足だけ表示する。
  if (opts.enforce) {
    if (enforceHookSkippedNoGit) {
      // .git 不在: フックは計画されない。git init 後の再実行を案内する (6.1)。
      process.stdout.write(T.enforceNoGit);
    } else if (copied.includes(HOOK_RELATIVE)) {
      // 配置 (予定) 済み: 強度は mode.md 側で決まる旨を軽く添える。
      process.stdout.write(T.enforceHookPlaced);
    } else if (skipped.includes(HOOK_RELATIVE)) {
      // 既存フックは SKIP (6.7)。手動統合の方法を案内する。
      process.stdout.write(T.enforceHookExisting);
    }
  }

  if (ccSddDetected) {
    process.stdout.write(T.ccSddDetected);
  }

  // 配置したエージェント・配置先を告知する。配置先 (skillDest) とルート doc は
  // AGENT_REGISTRY から引く（agent 名で分岐するロジックを増やさない＝INV26/DR34）。
  const entry = AGENT_REGISTRY[agent];
  let note = T.agentHeader(agent, entry.skillDest);
  if (entry.rootDoc) {
    // ルート doc の告知は実態 (rootDoc アクション・dry-run) に合わせる。配置/追記していないのに
    // 「配置しました」と言わない。rootDoc キーが append/参照レーンの結果を表す:
    //   create        : ルート文書が不在 → 従来 COPY が全文配置 (copied に出る)
    //   reference     : 既存ルート文書へ参照1行追記 + 別ファイル配置 (A2: claude/gemini)
    //   append        : 既存ルート文書の末尾へ quickstart セクション追記 (A1: codex)
    //   none          : 参照行/セクションが既在で追記不要 (冪等)
    //   skipped-no-tty: 既存ルート文書への追記が必要だが非対話で同意を取れずスキップ
    //   skipped-no-doc: 別ファイル/本文テンプレ欠落で追記不能 (通常は起きない)
    const ROOT_DOC = entry.rootDoc;
    const dry = opts.dryRun;
    let docNote;
    if (rootDoc === "create") {
      docNote = T.docNoteCreate(ROOT_DOC, dry);
    } else if (rootDoc === "reference") {
      docNote = T.docNoteReference(ROOT_DOC, dry);
    } else if (rootDoc === "append") {
      docNote = T.docNoteAppend(ROOT_DOC, dry);
    } else if (rootDoc === "none") {
      docNote = T.docNoteNone(ROOT_DOC);
    } else if (rootDoc === "skipped-no-tty") {
      docNote = T.docNoteSkippedNoTty(ROOT_DOC);
    } else if (rootDoc === "skipped-no-doc") {
      docNote = T.docNoteSkippedNoDoc(ROOT_DOC);
    } else {
      docNote = T.docNoteNotPlaced(ROOT_DOC);
    }
    note += T.rootDocLabel(docNote);
  }
  process.stdout.write(note);

  process.stdout.write(T.nextStep);

  // 正常完了後に GitHub スターを促す。色は端末が色対応 (TTY) のときだけ付け、
  // パイプ/リダイレクト先には生のエスケープを混ぜない。
  // dry-run は「書き込みしないプレビュー」なので広報 CTA を混ぜない（実際に配置したときだけ出す）。
  if (!opts.dryRun) {
    const useColor = Boolean(process.stdout.isTTY);
    const cyan = useColor ? "\x1b[36m" : "";
    const yellow = useColor ? "\x1b[33m" : "";
    const reset = useColor ? "\x1b[0m" : "";
    process.stdout.write(
      `\n${yellow}🌟 If this tool saved your time, please support us with a star on GitHub!${reset}\n` +
        `${cyan}👉 https://github.com/ijust/intent-planner${reset}\n`,
    );
  }
}

main();
