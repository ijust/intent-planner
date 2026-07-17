#!/usr/bin/env node
// intent-planner CLI
//
// npx intent-planner [dir] [--force] [--update-shared] [--dry-run] [--lang <v>] [--agent <v>] [--enforce] [--with-ci] [--with-term-drift] [--help]
// 知能は core 側 (skill) にあり、この CLI は引数を解釈して install を呼び結果を表示するだけ。

import path from "node:path";
import process from "node:process";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { install, AGENT_REGISTRY, makeRootDocConfirm, makeForceOverwriteConfirm } from "../src/install.mjs";
import {
  TERM_DRIFT_COMPATIBILITY,
  runTermDriftIntegration,
} from "../src/term-drift.mjs";
import {
  runHandoffBridgeIntegration,
} from "../src/handoff-bridge.mjs";

// install の plan が返すフックの relative（path.join 由来）と同じ形で照合する。
const HOOK_RELATIVE = path.join(".git", "hooks", "pre-push");

// 次アクション表示で使う、agent → 使う AI ツールの表示名。AGENT_REGISTRY（配置の縫い目）は
// byte-lock 対象なので触らず、表示名だけを cli 側に持つ（skillDest 等の配置情報とは別関心）。
// 未知 agent はここに来ない（parseArgs で未対応値はエラー終了する）が、保険で agent 名を返す。
const AGENT_TOOL_NAME = { claude: "Claude Code", codex: "Codex", gemini: "Gemini CLI" };
function toolNameOf(agent) {
  return AGENT_TOOL_NAME[agent] ?? agent;
}

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
  --dry-run        書き込まず、配置/スキップ予定の一覧だけ表示する (全一覧を表示)
  --verbose        配置/スキップしたファイルを1件ずつ全て列挙する (既定は件数サマリのみ)
  --lang <value>   言語を指定する (ja, en 対応。他は ja にフォールバック)
  --agent <value>  配置先エージェントを指定する (claude, codex, gemini 対応。既定: claude。
                   未対応の値はエラー終了し配置しない)
  --enforce        pre-push フック (.git/hooks/pre-push) を配置する (既定: 配置しない)
  --with-ci        CI 検査テンプレート (.github/workflows/intent-planner-check.yml) を配置する
                   (既定: 配置しない。スクリプト検査のみ・API キー不要。通常の再実行では既存ファイルを上書きしない)
  --with-term-drift term-drift 0.3.3 は標準導入される。この旧flagは互換性のため受理する
  --yes, -y        既存ルート文書 (CLAUDE.md 等) への quickstart 追記の確認を省いて同意する
                   (非対話環境では既定で追記をスキップ)
  --help, -h       このヘルプを表示する

配置されるもの:
  .claude/skills/intent-*/   Intent Planning の skill 群 (claude) + ルート CLAUDE.md
  .agents/skills/intent-*/   Intent Planning の skill 群 (codex / gemini) + ルート AGENTS.md / GEMINI.md
  .intent/                   Intent Tree / Compass / Packets などの scaffold (共有)
  .term-drift/               term-drift自身のowner installerが標準でproject-localに配置
  skills/handoff-bridge/     handoff-bridge自身のowner installerが標準で選択agent向けに配置

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
導入済みのプロジェクトでは、/intent-status が現在地と次の一手を1つ案内してくれます。
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
  --dry-run        Show what would be placed/skipped without writing anything (full list)
  --verbose        List every placed/skipped file one by one (default: counts only)
  --lang <value>   Language (ja and en are supported; others fall back to ja)
  --agent <value>  Target agent (claude, codex, gemini; default: claude.
                   Unsupported values exit with an error and place nothing)
  --enforce        Install the pre-push hook (.git/hooks/pre-push) (default: off)
  --with-ci        Install the CI check template (.github/workflows/intent-planner-check.yml)
                   (default: off; script-based checks only, no API keys; a normal re-run never overwrites an existing file)
  --with-term-drift term-drift 0.3.3 is installed by default; this legacy flag remains accepted
  --yes, -y        Skip the confirmation for appending the quickstart to an existing
                   root document (CLAUDE.md etc.) and consent up front
                   (the append is skipped by default in non-interactive environments)
  --help, -h       Show this help

What gets placed:
  .claude/skills/intent-*/   Intent Planning skills (claude) + root CLAUDE.md
  .agents/skills/intent-*/   Intent Planning skills (codex / gemini) + root AGENTS.md / GEMINI.md
  .intent/                   Scaffold for the Intent Tree / Compass / Packets (shared)
  .term-drift/               Placed project-locally by term-drift's owner installer by default
  skills/handoff-bridge/     Placed for the selected agent by handoff-bridge's owner installer

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
In a project that already uses intent-planner, /intent-status tells you where you are and the single next step.
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
  termDriftOutput: {
    heading: `\nterm-drift:\n`,
    statusNotInstalled: `  状態: 未導入（互換な一式はまだありません）\n`,
    statusAdditiveCompatible:
      `  状態: 部分導入または不整合（安全に追加可能: 既存物は互換で、不足だけがあります）\n`,
    statusUpdateAttemptable:
      `  状態: 部分導入または不整合（信頼済みの旧版または混在状態で、公式更新を試行できます）\n`,
    statusBlocked:
      `  状態: 部分導入または不整合（自動修復できない競合または不一致があります）\n`,
    statusReady: (version) => `  状態: 利用可能（term-drift ${version} の互換な一式を確認済み）\n`,
    statusInstallFailed:
      `  状態: 導入失敗（今回の導入試行は完了していません。下記の確認結果が現在の状態です）\n`,
    statusUpdateFailed:
      `  状態: 更新失敗（今回の更新試行は完了していません。下記の確認結果が現在の状態です）\n`,
    postHealthInstall: `  導入後の確認:\n`,
    postHealthUpdate: `  更新後の確認:\n`,
    warning: `  警告: term-drift の配置に不整合があります（owner 処理は実行していません）。\n`,
    plan: ({ version, agent, action, mode, reason }) =>
      `  計画: term-drift ${version} / agent: ${agent}\n` +
      `  action: ${action} / mode: ${mode}\n` +
      `  理由: ${reason}\n`,
    actionRun: `実行予定`,
    operationInstall: `新規導入`,
    operationUpdate: `公式更新`,
    actionSuppressed: `実行抑止`,
    modeFresh: `新規導入`,
    modeAdditive: `不足分のみ安全に追加`,
    modeReady: `再導入なし`,
    modeBlocked: `自動修復対象外`,
    reasonFresh: `term-drift が未導入のため、新規導入できます`,
    reasonAdditive: `既存物は互換で、不足分のみを公式 installer に委譲できます`,
    reasonUpdate: `信頼できる既存状態のため、変更は公式 updater に委譲できます`,
    reasonReady: `すでに互換な一式が利用可能なため、再導入は不要です`,
    reasonBlocked: `既存物に不一致または安全でない path があり、自動修復できないためです`,
    issue: ({ path: issuePath, code }) => `  問題: ${issuePath} (${code})\n`,
    agentMismatchHint: (installedAgent) =>
      `  既存の term-drift は ${installedAgent} 用です。intent-planner も同じ配置先へ更新するには --agent ${installedAgent} を付けて再実行してください。\n`,
    readyEntry: (skillFile) =>
      `  本格的な用語点検は、選択中の agent で term-drift 専用 skill ${skillFile} から開始してください。\n`,
    installed: `  導入と互換性確認が完了しました。\n`,
    updated: `  更新と互換性確認が完了しました。\n`,
    failureReasons: {
      "spawn-error": `owner installer を開始できませんでした`,
      "nonzero-exit": `installer が正常終了しませんでした`,
      "invalid-json": `installer の応答を読み取れませんでした`,
      "contract-mismatch": `installer の応答が互換性契約と一致しませんでした`,
      "postcheck-failed": `導入後の互換性確認に失敗しました`,
    },
    failureUnknown: `installer の実行に失敗しました`,
    failure: ({ kind, reason }) => `  失敗原因: ${reason} (${kind})\n`,
    retry: ({ command, targetDir }) =>
      `  再実行コマンド: ${command}\n` + `  対象ディレクトリ: ${targetDir}\n`,
    retryIntro: `  安全な次の操作: 同じ対象で公式処理を再実行してください。\n`,
    retryAfterResolution: ({ command, targetDir }) =>
      `  解消後の再実行コマンド: ${command}\n` + `  対象ディレクトリ: ${targetDir}\n`,
    manualResolution:
      `  安全な次の操作: 先に上記の問題を手動で確認・解消してください。intent-planner は term-drift 所有物を自動修復しません。\n`,
    contractAnomaly: `  ファイルは利用可能ですが、installer の応答契約を確認してください。\n`,
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
  trackedCcSddHeader: (n) => `\n注意: Git 追跡中の cc-sdd 下書きがあります (${n} 件):\n`,
  trackedCcSddMore: (n) => `  … ほか ${n} 件 (--verbose を付けると全件表示されます)\n`,
  trackedCcSddNote:
    `  cc-sdd 下書き (/intent-export-cc-sdd の生成物) は、既定ではローカル専用 (Git 非追跡)\n` +
    `  とする方針です。意図して Git で共有しているなら、このままで問題ありません。\n` +
    `  ローカル専用へ戻す場合は \`git rm --cached <パス>\` で追跡だけ解除できます\n` +
    `  (ローカルのファイルは消えません)。\n`,
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
  ciTemplatePlaced:
    `\nCI 検査テンプレート: PR ごとに書き戻し漏れ検査 (warning のみ・PR は落ちません) が動きます。\n` +
    `  テストで PR を落とすには .github/workflows/intent-planner-check.yml の\n` +
    `  「project tests」ステップを1行書き換えてください (テスト赤 = fail)。\n`,
  ciTemplateExisting:
    `\nCI 検査テンプレートは既存のため上書きしませんでした (.github/workflows/intent-planner-check.yml)。\n`,
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
  // 既定サマリ時に「1行ずつの列挙は --verbose で見られる」ことを一度だけ添える。
  // （列挙のあった見出しが1つ以上あるときだけ表示する。dry-run/verbose では列挙するので出さない）
  verboseHint: `  (ファイル1件ずつの一覧は --verbose を付けると表示されます)\n`,
  // 末尾の具体的な次アクション。Codex は slash command ではなくスキル名を含む自然文で
  // 呼びかけるため、agent ごとに実行文だけを出し分ける。
  nextAction: (agent) => {
    const toolName = toolNameOf(agent);
    const invoke =
      agent === "codex"
        ? "プロンプトに「intent-discover を実行して」と入力する（意図の詰めがここから始まります）"
        : "プロンプトに /intent-discover と入力して実行する（意図の詰めがここから始まります）";
    return (
    `\n次にやること:\n` +
    `  1. ${toolName} を開く\n` +
    `  2. ${invoke}\n`
    );
  },
  // 再訪（既存 .intent/ の成果物を保護スキップした再実行）向けの次アクション。
  // 「続きは /intent-status」を先頭に置き、新規案件の入口も1行添える
  // （結論先行＝コマンド名を冒頭に・user-guidance-onboarding 2026-07-10）。
  nextActionResume: (agent) => {
    const toolName = toolNameOf(agent);
    const resume = agent === "codex" ? "「intent-status を実行して」" : "/intent-status";
    const discover = agent === "codex" ? "「intent-discover を実行して」" : "/intent-discover";
    return (
    `\n次にやること（このプロジェクトには作業中の .intent/ があります）:\n` +
    `  続きから再開する: ${toolName} のプロンプトで ${resume}（現在地と次の一手を1つ案内します）\n` +
    `  新しい案件を始める: ${discover}\n`
    );
  },
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
  termDriftOutput: {
    heading: `\nterm-drift:\n`,
    statusNotInstalled: `  Status: not installed (no compatible set is available yet)\n`,
    statusAdditiveCompatible:
      `  Status: partial or inconsistent (safe additive completion: existing files are compatible and only components are missing)\n`,
    statusUpdateAttemptable:
      `  Status: partial or inconsistent (a trusted older or mixed state can be passed to the official updater)\n`,
    statusBlocked:
      `  Status: partial or inconsistent (a conflict or mismatch blocks automatic repair)\n`,
    statusReady: (version) => `  Status: ready (a compatible term-drift ${version} set was verified)\n`,
    statusInstallFailed:
      `  Status: installation failed (this attempt did not complete; the post-check below is the current state)\n`,
    statusUpdateFailed:
      `  Status: update failed (this attempt did not complete; the post-check below is the current state)\n`,
    postHealthInstall: `  Post-install check:\n`,
    postHealthUpdate: `  Post-update check:\n`,
    warning: `  Warning: the term-drift files are inconsistent (the owner operation was not run).\n`,
    plan: ({ version, agent, action, mode, reason }) =>
      `  Plan: term-drift ${version} / agent: ${agent}\n` +
      `  action: ${action} / mode: ${mode}\n` +
      `  Reason: ${reason}\n`,
    actionRun: `would run`,
    operationInstall: `fresh install`,
    operationUpdate: `official update`,
    actionSuppressed: `suppressed`,
    modeFresh: `fresh install`,
    modeAdditive: `add missing components only`,
    modeReady: `no reinstall`,
    modeBlocked: `automatic repair unavailable`,
    reasonFresh: `term-drift is not installed, so a fresh install can run`,
    reasonAdditive:
      `existing files are compatible, so the official installer can add missing components only`,
    reasonUpdate: `the existing state is trusted, so changes can be delegated to the official updater`,
    reasonReady: `a compatible set is already available, so no reinstall is needed`,
    reasonBlocked: `existing files mismatch or use an unsafe path, so automatic repair is blocked`,
    issue: ({ path: issuePath, code }) => `  Issue: ${issuePath} (${code})\n`,
    agentMismatchHint: (installedAgent) =>
      `  The existing term-drift installation targets ${installedAgent}. Re-run with --agent ${installedAgent} to update the same agent target.\n`,
    readyEntry: (skillFile) =>
      `  Start the full terminology inspection from the dedicated term-drift skill ${skillFile} in the selected agent.\n`,
    installed: `  Installation and compatibility check completed.\n`,
    updated: `  Update and compatibility check completed.\n`,
    failureReasons: {
      "spawn-error": `could not start the owner installer`,
      "nonzero-exit": `the installer did not exit successfully`,
      "invalid-json": `the installer response could not be read`,
      "contract-mismatch": `the installer response did not match the compatibility contract`,
      "postcheck-failed": `the post-install compatibility check failed`,
    },
    failureUnknown: `the installer failed`,
    failure: ({ kind, reason }) => `  Failure: ${reason} (${kind})\n`,
    retry: ({ command, targetDir }) =>
      `  Retry command: ${command}\n` + `  Target directory: ${targetDir}\n`,
    retryIntro: `  Safe next action: retry the official operation for the same target.\n`,
    retryAfterResolution: ({ command, targetDir }) =>
      `  Command after resolution: ${command}\n` + `  Target directory: ${targetDir}\n`,
    manualResolution:
      `  Safe next action: manually review and resolve the issues above first. intent-planner does not automatically repair term-drift-owned files.\n`,
    contractAnomaly: `  The files are ready, but the installer response contract needs verification.\n`,
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
  trackedCcSddMore: (n) => `  ... and ${n} more (add --verbose to list them all)\n`,
  trackedCcSddNote:
    `  cc-sdd drafts (generated by /intent-export-cc-sdd) are local-only (untracked)\n` +
    `  by default. If you track them in Git on purpose, they are fine as they are.\n` +
    `  To make them local-only again, \`git rm --cached <path>\` untracks them\n` +
    `  without deleting your local files.\n`,
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
  ciTemplatePlaced:
    `\nCI check template: the writeback-staleness check runs on every PR (warning only; it never fails the PR).\n` +
    `  To make your tests fail the PR, rewrite one line in the "project tests" step of\n` +
    `  .github/workflows/intent-planner-check.yml (red tests = fail).\n`,
  ciTemplateExisting:
    `\nThe CI check template already exists, so it was not overwritten (.github/workflows/intent-planner-check.yml).\n`,
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
  verboseHint: `  (add --verbose to see the per-file list)\n`,
  nextAction: (agent) => {
    const toolName = toolNameOf(agent);
    const invoke =
      agent === "codex"
        ? 'Say "run intent-discover" at the prompt (this is where pinning down intent begins)'
        : "Type /intent-discover at the prompt and run it (this is where pinning down intent begins)";
    return (
    `\nWhat to do next:\n` +
    `  1. Open ${toolName}\n` +
    `  2. ${invoke}\n`
    );
  },
  nextActionResume: (agent) => {
    const toolName = toolNameOf(agent);
    const resume = agent === "codex" ? 'say "run intent-status"' : "type /intent-status";
    const discover = agent === "codex" ? 'say "run intent-discover"' : "run /intent-discover";
    return (
    `\nWhat to do next (this project already has work in progress under .intent/):\n` +
    `  Resume where you left off: ${resume} at the ${toolName} prompt (it tells you where you are and the single next step)\n` +
    `  Start something new: ${discover}\n`
    );
  },
};

const MESSAGES = { ja: MSG_JA, en: MSG_EN };

const HANDOFF_BRIDGE_MESSAGES = {
  ja: {
    heading: "\nhandoff-bridge:\n",
    absent: "  状態: 未導入\n",
    ready: (version) => `  状態: 利用可能（handoff-bridge ${version} の互換な skill を確認済み）\n`,
    planned: (version, agent) => `  計画: handoff-bridge ${version} を ${agent} 向けに公式 installer で配置します\n`,
    blocked: "  状態: 既存の handoff-bridge skill に不足または相違があり、自動変更しません。\n",
    failed: (kind) => `  状態: 導入失敗（${kind}）\n`,
    issue: (issue) => `  問題: ${issue.path} (${issue.code})\n`,
    entry: (skill) => `  明示的に引き継ぎを作るときは ${skill} の skill を呼び出してください。\n`,
  },
  en: {
    heading: "\nhandoff-bridge:\n",
    absent: "  Status: not installed\n",
    ready: (version) => `  Status: ready (compatible handoff-bridge ${version} skill verified)\n`,
    planned: (version, agent) => `  Plan: use the owner installer for handoff-bridge ${version} and ${agent}\n`,
    blocked: "  Status: the existing handoff-bridge skill is incomplete or differs; no automatic change was made.\n",
    failed: (kind) => `  Status: installation failed (${kind})\n`,
    issue: (issue) => `  Issue: ${issue.path} (${issue.code})\n`,
    entry: (skill) => `  Invoke the skill at ${skill} when you explicitly want to create a handoff.\n`,
  },
};

function safeDisplay(value) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/gu, "?");
}

export function renderHandoffBridgeResult(result, { lang = "ja", agentEntry } = {}) {
  if (!result) return "";
  const T = HANDOFF_BRIDGE_MESSAGES[msgLangOf(lang)];
  let output = T.heading;
  if (result.action === "planned") {
    return output + T.absent + T.planned(safeDisplay(result.version), safeDisplay(result.agent));
  }
  if (result.action === "already-ready") {
    output += T.ready(safeDisplay(result.health.version));
  } else if (result.action === "installed") {
    output += T.ready(safeDisplay(result.health.version));
  } else if (result.action === "blocked-inconsistent") {
    output += T.blocked;
  } else if (result.action === "failed") {
    output += T.failed(safeDisplay(result.failure?.kind));
  }
  for (const issue of result.health?.issues ?? []) {
    output += T.issue({ path: safeDisplay(issue.path), code: safeDisplay(issue.code) });
  }
  if (result.health?.state === "ready") {
    output += T.entry(`${safeDisplay(result.health.skillPath ?? agentEntry?.handoffBridgeSkillDest)}/SKILL.md`);
  }
  return output;
}

export function handoffBridgeExitCode(result) {
  return result?.action === "failed" || result?.action === "blocked-inconsistent" ? 2 : 0;
}

function escapeTermDriftDisplayValue(value) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/gu, (character) => {
    if (character === "\n") return "\\n";
    if (character === "\r") return "\\r";
    if (character === "\t") return "\\t";
    const code = character.codePointAt(0);
    return code <= 0xff
      ? `\\x${code.toString(16).padStart(2, "0")}`
      : `\\u${code.toString(16).padStart(4, "0")}`;
  });
}

function termDriftHealthText(T, health) {
  if (health?.state === "not-installed") return T.statusNotInstalled;
  if (health?.state === "ready") return T.statusReady(escapeTermDriftDisplayValue(health.version));
  if (health?.state === "inconsistent" && health.repairability === "additive-compatible") {
    return T.statusAdditiveCompatible;
  }
  if (health?.state === "inconsistent" && health.repairability === "update-attemptable") {
    return T.statusUpdateAttemptable;
  }
  if (health?.state === "inconsistent" && health.repairability === "blocked") {
    return T.statusBlocked;
  }
  return "";
}

function termDriftIssueText(T, health) {
  return Array.isArray(health?.issues)
    ? health.issues
        .map((issue) =>
          T.issue({
            path: escapeTermDriftDisplayValue(issue?.path),
            code: escapeTermDriftDisplayValue(issue?.code),
          }),
        )
        .join("")
    : "";
}

function termDriftAgentMismatchHint(T, health, selectedAgent) {
  const installedAgent = health?.installedAgent;
  const hasAgentMismatch = health?.issues?.some((issue) => issue?.code === "agent-mismatch");
  if (
    !hasAgentMismatch ||
    typeof installedAgent !== "string" ||
    installedAgent === selectedAgent ||
    !Object.hasOwn(AGENT_REGISTRY, installedAgent)
  ) {
    return "";
  }
  return T.agentMismatchHint(escapeTermDriftDisplayValue(installedAgent));
}

/** Coordinatorの構造化結果だけを、選択言語のhealth/plan表示へ写す。 */
export function renderTermDriftResult(
  result,
  {
    lang = "ja",
    requested = true,
    dryRun = false,
    agentEntry,
    version = TERM_DRIFT_COMPATIBILITY.version,
  } = {},
) {
  const T = MESSAGES[msgLangOf(lang)].termDriftOutput;
  if (!result || result.action === "skipped") {
    // 旧形式の skipped 結果に架空のplanを足さない。
    if (
      result?.health?.state === "inconsistent"
    ) {
      return (
        T.heading +
        T.warning +
        termDriftHealthText(T, result.health) +
        termDriftIssueText(T, result.health)
      );
    }
    return "";
  }

  let output = T.heading;
  const operation = result.operation ?? result.failure?.operation ?? "install";
  output +=
    result.action === "failed"
      ? (operation === "update" ? T.statusUpdateFailed : T.statusInstallFailed) +
        (operation === "update" ? T.postHealthUpdate : T.postHealthInstall) +
        termDriftHealthText(T, result.health)
      : termDriftHealthText(T, result.health);

  if (result.action === "planned") {
    output += T.plan({
      version: escapeTermDriftDisplayValue(result.version),
      agent: escapeTermDriftDisplayValue(result.agent),
      action: `${T.actionRun}: ${operation === "update" ? T.operationUpdate : T.operationInstall}`,
      mode:
        operation === "update"
          ? T.operationUpdate
          : result.mode === "fresh-install"
            ? T.modeFresh
            : T.modeAdditive,
      reason:
        operation === "update"
          ? T.reasonUpdate
          : result.mode === "fresh-install"
            ? T.reasonFresh
            : T.reasonAdditive,
    });
    return output + termDriftIssueText(T, result.health);
  }

  if (result.action === "already-ready") {
    if (requested && dryRun) {
      output += T.plan({
        version: escapeTermDriftDisplayValue(result.health.version ?? version),
        agent: escapeTermDriftDisplayValue(agentEntry?.agentName ?? "unknown"),
        action: T.actionSuppressed,
        mode: T.modeReady,
        reason: T.reasonReady,
      });
    }
    const skillRoot = result.health.skillPath ?? agentEntry?.termDriftSkillDest;
    if (skillRoot) output += T.readyEntry(`${escapeTermDriftDisplayValue(skillRoot)}/SKILL.md`);
    return output;
  }

  if (result.action === "blocked-inconsistent") {
    if (requested) {
      output += T.plan({
        version: escapeTermDriftDisplayValue(version),
        agent: escapeTermDriftDisplayValue(agentEntry?.agentName ?? "unknown"),
        action: T.actionSuppressed,
        mode: T.modeBlocked,
        reason: T.reasonBlocked,
      });
    } else {
      output += T.warning;
    }
    output += termDriftIssueText(T, result.health);
    return output + termDriftAgentMismatchHint(T, result.health, agentEntry?.agentName);
  }

  if (result.action === "installed") {
    output += T.installed;
    const skillRoot = result.health.skillPath ?? agentEntry?.termDriftSkillDest;
    if (skillRoot) output += T.readyEntry(`${escapeTermDriftDisplayValue(skillRoot)}/SKILL.md`);
    return output;
  }

  if (result.action === "updated") {
    output += T.updated;
    const skillRoot = result.health.skillPath ?? agentEntry?.termDriftSkillDest;
    if (skillRoot) output += T.readyEntry(`${escapeTermDriftDisplayValue(skillRoot)}/SKILL.md`);
    return output;
  }

  if (result.action === "failed") {
    const failureKind = escapeTermDriftDisplayValue(result.failure?.kind);
    output += T.failure({
      kind: failureKind,
      reason: T.failureReasons[result.failure?.kind] ?? T.failureUnknown,
    });
    output += termDriftIssueText(T, result.health);
    const guidance = result.failure?.guidance;
    if (guidance?.kind === "retry") {
      output += T.retryIntro;
      output += T.retry({
        command: escapeTermDriftDisplayValue(guidance.command),
        targetDir: escapeTermDriftDisplayValue(guidance.targetDir),
      });
    } else if (guidance?.kind === "manual-resolution") {
      output += T.manualResolution;
      output += T.retryAfterResolution({
        command: escapeTermDriftDisplayValue(guidance.afterResolutionCommand),
        targetDir: escapeTermDriftDisplayValue(guidance.targetDir),
      });
    } else if (guidance?.kind === "contract-anomaly-ready") {
      output += T.contractAnomaly;
    }
    return output;
  }

  return output;
}

/** core install成功後の標準term-drift結果をexitへ合成する。 */
export function termDriftExitCode(result) {
  if (result?.action === "failed") return 2;
  if (result?.action === "blocked-inconsistent") return 2;
  return 0;
}

// 引数を解釈する。不正な入力 (値欠落・未知フラグ) は opts.error にメッセージを入れて
// 即座に返し、main が stderr 表示 + 非ゼロ終了する (黙ってデフォルトに倒さない)。
function parseArgs(argv) {
  // update は既定 ON: 引数なしの再実行で code を安全に最新化する。--no-update で旧来の全スキップ、
  // --force で全上書き（force は update より強い）。
  const opts = { targetDir: ".", force: false, update: true, updateShared: false, dryRun: false, verbose: false, lang: "ja", agent: "claude", enforce: false, withCi: false, yes: false, withTermDrift: false, help: false, error: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--force") opts.force = true;
    else if (arg === "--update-shared") opts.updateShared = true;
    else if (arg === "--no-update") opts.update = false;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--verbose") opts.verbose = true;
    else if (arg === "--enforce") opts.enforce = true;
    else if (arg === "--with-ci") opts.withCi = true;
    else if (arg === "--with-term-drift") opts.withTermDrift = true;
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

export function main() {
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
      withCi: opts.withCi,
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

  const { copied, skipped, backedUp, update, plan, ccSddDetected, langFallback, agent, enforceHookSkippedNoGit, ciTemplate, gitignore, trackedCcSdd, trackedModeLocal, rootDoc } = result;
  const entry = AGENT_REGISTRY[agent];
  const termDriftResult = runTermDriftIntegration(opts.targetDir, {
    agentEntry: entry,
    dryRun: opts.dryRun,
  });
  const termDriftCode = termDriftExitCode(termDriftResult);
  const handoffBridgeResult = runHandoffBridgeIntegration(opts.targetDir, {
    agentEntry: entry,
    dryRun: opts.dryRun,
  });
  const handoffBridgeCode = handoffBridgeExitCode(handoffBridgeResult);

  if (langFallback) {
    process.stdout.write(T.langFallback(opts.lang));
  }

  if (opts.dryRun) {
    process.stdout.write(T.dryRunBanner);
  }

  // 既定はカテゴリ別の件数サマリ（見出しに件数を出し、ファイル1件ずつの列挙は畳む）。
  // --verbose と --dry-run（確認用途）のときだけ従来どおり全列挙する。
  // 見出し・注記・警告は要約せず常に出す（安全側）— 畳むのはファイル1行ずつの列挙だけ。
  const showList = opts.verbose || opts.dryRun;
  // 既定サマリで列挙を1つ以上畳んだら、末尾近くで --verbose の一言を一度だけ添える。
  let listCollapsed = false;
  // 書き込み系 (新規配置/更新) は「何に書いたか」が読み手の最大の関心なので、
  // 件数が少なければ既定サマリでもファイル名を出す (見出しだけで中身が見えないと不安を残す)。
  // スキップ系 (no-op) は従来どおり件数のみに畳む。
  const INLINE_LIST_MAX = 5;

  // copied を「新規配置」と「更新 (既存 code / shared の上書き)」に分けて告知する。
  // 更新分 = backup を取ったエントリ (= 既存を上書きしたもの)。残りが新規配置。
  const updatedSet = new Set(backedUp);
  const placed = copied.filter((f) => !updatedSet.has(f));
  const updated = copied.filter((f) => updatedSet.has(f));

  if (placed.length > 0) {
    process.stdout.write(T.placedHeader(placed.length, opts.dryRun));
    if (showList || placed.length <= INLINE_LIST_MAX) for (const f of placed) process.stdout.write(`  + ${f}\n`);
    else listCollapsed = true;
  }
  if (updated.length > 0) {
    process.stdout.write(T.updatedHeader(updated.length, opts.dryRun));
    if (showList || updated.length <= INLINE_LIST_MAX) for (const f of updated) process.stdout.write(`  ^ ${f}\n`);
    else listCollapsed = true;
    process.stdout.write(T.bakNote(opts.dryRun));
  }

  // 配置計画の分類 (relative → kind)。skip 理由の仕分け（下）と、末尾の次アクションの
  // 再訪判定（user-guidance-onboarding・DR126）の両方で使うためここで一度だけ作る。
  const kindOf = new Map(plan.map((e) => [e.relative, e.kind]));

  if (skipped.length > 0) {
    if (update) {
      // update モードの skip は3つの理由に分かれる。理由ごとに分けて告知し、
      // 「あなたのデータ保護」と「単に最新だった code」を混同させない。
      //   - user-data : ユーザー成果物・ログ・状態（保護）
      //   - shared    : ユーザー領域共有ファイル（既存を尊重・AGENTS.md / pre-push）
      //   - code      : 既にソースと byte 一致＝最新なので更新不要
      const userData = skipped.filter((f) => kindOf.get(f) === "user-data");
      const shared = skipped.filter((f) => kindOf.get(f) === "shared");
      const upToDate = skipped.filter((f) => kindOf.get(f) === "code");

      if (userData.length > 0) {
        process.stdout.write(T.userDataHeader(userData.length));
        if (showList) for (const f of userData) process.stdout.write(`  = ${f}\n`);
        else listCollapsed = true;
        // データ保護の注記文は要約せず常に全文出す（安全側）。
        process.stdout.write(T.userDataNote);
      }
      if (shared.length > 0) {
        process.stdout.write(T.sharedHeader(shared.length));
        if (showList) for (const f of shared) process.stdout.write(`  = ${f}\n`);
        else listCollapsed = true;
        // 案内は安全な経路 (--update-shared) へ向ける。全上書きの --force を更新の正規経路として
        // 案内しない (INV56: 危険側の操作に言及するときは何が失われるかの明示と安全な代替を伴う)。
        // 注記文（--update-shared 案内）は要約せず常に全文出す。
        process.stdout.write(opts.updateShared ? T.sharedNoteUpToDate : T.sharedNoteGuide);
      }
      if (upToDate.length > 0) {
        process.stdout.write(T.upToDateHeader(upToDate.length));
        if (showList) for (const f of upToDate) process.stdout.write(`  = ${f}\n`);
        else listCollapsed = true;
        process.stdout.write(T.upToDateNote);
      }
    } else {
      // --no-update (旧来の全スキップ): 理由を分けず既存スキップとして告知する。
      process.stdout.write(T.skippedExistingHeader(skipped.length));
      if (showList) for (const f of skipped) process.stdout.write(`  = ${f}\n`);
      else listCollapsed = true;
      if (!opts.force) {
        process.stdout.write(T.skippedExistingHint);
      }
    }
  }

  // 既定サマリでファイル列挙を畳んだときは、全一覧の見方 (--verbose) を配置/スキップ告知の
  // 直後に一度だけ添える（列挙のあった見出しの近くに置く）。
  if (listCollapsed) {
    process.stdout.write(T.verboseHint);
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
  // 件数が多いと壁のような列挙になり読み手を驚かせるため、既定では先頭数件 + 残数に畳む
  // (--verbose / --dry-run では全件)。注記文は常に全文出す (安全側)。
  if (trackedCcSdd.length > 0) {
    process.stdout.write(T.trackedCcSddHeader(trackedCcSdd.length));
    const shown = showList ? trackedCcSdd : trackedCcSdd.slice(0, INLINE_LIST_MAX);
    for (const f of shown) process.stdout.write(`  - ${f}\n`);
    if (shown.length < trackedCcSdd.length) {
      process.stdout.write(T.trackedCcSddMore(trackedCcSdd.length - shown.length));
    }
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

  // --with-ci のサマリ (x958)。雛形の行自体は上の配置/スキップ一覧に出るので、ここでは補足だけ表示する。
  if (ciTemplate === "placed") {
    process.stdout.write(T.ciTemplatePlaced);
  } else if (ciTemplate === "existing") {
    process.stdout.write(T.ciTemplateExisting);
  }

  if (ccSddDetected) {
    process.stdout.write(T.ccSddDetected);
  }

  const termDriftOutput = renderTermDriftResult(termDriftResult, {
    lang: opts.lang,
    requested: true,
    dryRun: opts.dryRun,
    agentEntry: entry,
  });
  if (termDriftOutput) process.stdout.write(termDriftOutput);
  process.stdout.write(
    renderHandoffBridgeResult(handoffBridgeResult, {
      lang: opts.lang,
      agentEntry: entry,
    }),
  );

  // 配置したエージェント・配置先を告知する。配置先 (skillDest) とルート doc は
  // AGENT_REGISTRY から引く（agent 名で分岐するロジックを増やさない＝INV26/DR34）。
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

  // 末尾に「どのツールで何を打つか」の具体的な次アクションを置く（従来の1行を置き換え）。
  // 再訪（既存 .intent/ の成果物を「あなたのデータ保護」でスキップした再実行）では、新規向けの
  // /intent-discover 固定でなく「続きは /intent-status」を先に案内する（user-guidance-onboarding・DR126）。
  // 判定材料は install が返した配置計画の分類（kind=user-data の skip）だけで、新しい検出・状態を
  // 持たない（A64）。--force は user-data も上書き（copied 側）になるため自然に新規扱いとなり、
  // データ初期化直後に status を薦めない。plan の形が想定外で判定できないときは kindOf が
  // user-data を返さず、従来の discover 案内へ倒れる（fail-open）。
  const isResume = skipped.some((f) => kindOf.get(f) === "user-data");
  process.stdout.write(isResume ? T.nextActionResume(agent) : T.nextAction(agent));

  // 正常完了後に GitHub スターを促す。色は端末が色対応 (TTY) のときだけ付け、
  // パイプ/リダイレクト先には生のエスケープを混ぜない。
  // dry-run は「書き込みしないプレビュー」なので広報 CTA を混ぜない（実際に配置したときだけ出す）。
  if (!opts.dryRun && termDriftCode === 0 && handoffBridgeCode === 0) {
    const useColor = Boolean(process.stdout.isTTY);
    const cyan = useColor ? "\x1b[36m" : "";
    const yellow = useColor ? "\x1b[33m" : "";
    const reset = useColor ? "\x1b[0m" : "";
    process.stdout.write(
      `\n${yellow}🌟 If this tool saved your time, please support us with a star on GitHub!${reset}\n` +
        `${cyan}👉 https://github.com/ijust/intent-planner${reset}\n`,
    );
  }

  if (termDriftCode !== 0) process.exitCode = termDriftCode;
  if (handoffBridgeCode !== 0) process.exitCode = handoffBridgeCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main();
}
