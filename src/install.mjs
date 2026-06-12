// intent-planner installer
//
// 知能は core 側 (skill) にあり、このモジュールはファイル配置に徹する。
// 非破壊性は computeCopyPlan の純粋関数で構造的に保証する:
// 計画に現れるパスは templates/ 由来のものだけなので、.kiro/ や kiro-* は触れられない。
// fs.cpSync は使わない (ファイル単位のスキップ判定と両立しないため)。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// agent → 配置の対応を保持する縫い目（AGENT_REGISTRY）。
// 新 agent は1エントリ追加 + templates/<lang>/<agent>/ テンプレ追加で拡張できる。
//   - agentName : このエントリの agent 名。rootDoc ソースパス解決に使う。
//   - skillSubdir: skill ツリーの言語ルート相対サブディレクトリ（templates/<lang>/<skillSubdir>/skills/）。
//   - skillDest  : skill の配置先（配置先ルート相対）。
//   - rootDoc    : ルート memory doc のファイル名（null なら配置しない）。
//                  ソースは templates/<lang>/agents/<agentName>/<rootDoc>。
// claude エントリは現行挙動（skill→.claude/skills、rootDoc なし）を表現し、回帰を保証する。
export const AGENT_REGISTRY = {
  claude: { agentName: "claude", skillSubdir: "claude", skillDest: ".claude/skills", rootDoc: null },
  codex: { agentName: "codex", skillSubdir: "codex", skillDest: ".agents/skills", rootDoc: "AGENTS.md" },
};

// 共有 intent scaffold の対応（agent 不問・常に同じ）。
// templates/<lang>/intent/...  -> <target>/.intent/...
const INTENT_SUBDIR = "intent";
const INTENT_DEST = ".intent";

// templates/ の絶対パス。npx 実行時の cwd に依存せず、このファイルからの相対で解決する。
export function defaultTemplatesDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, "..", "templates");
}

// 対応言語の集合。言語追加はここと templates/<lang>/ の追加のみ（拡張点）。
const SUPPORTED_LANGS = ["ja", "en"];
const DEFAULT_LANG = "ja";

// 言語コードから配置元の言語別ルートを解決する純粋関数。
// 対応集合に含まれれば templates/<lang> を、含まれなければ既定 templates/ja を返す。
// 対応集合外でも例外を投げず langFallback を立てて続行する（非停止・2.3）。
// 返り値: { langRoot, langFallback, resolvedLang }
export function resolveLangRoot(templatesDir, lang = DEFAULT_LANG) {
  const supported = SUPPORTED_LANGS.includes(lang);
  const resolvedLang = supported ? lang : DEFAULT_LANG;
  return {
    langRoot: path.join(templatesDir, resolvedLang),
    langFallback: !supported,
    resolvedLang,
  };
}

// あるディレクトリ配下の全ファイルを相対パスで列挙する (任意のネスト深さ、隠しファイル含む)。
// ディレクトリ自体は返さない (COPY 時に親を作る)。存在しなければ空配列。
function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      // Node 18/20 の Dirent.path と 22 の parentPath の差を吸収する。
      const parent = entry.parentPath ?? entry.path;
      return path.relative(dir, path.join(parent, entry.name));
    });
}

// 配置先パスに「何らかのエントリ」が存在するかを symlink を辿らず判定する (INV1 の核心)。
// fs.existsSync はリンクを辿るため、リンク先が消えた dangling symlink を「存在しない」と
// 誤判定し、COPY → リンク越しに配置先ツリー外へ書き込んでしまう。
// lstat はリンク自体を見るので、file / dir / symlink (dangling 含む) すべて「既存」になる。
function entryExists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

// 1 つの単一ファイルを計画エントリ化する純粋ヘルパ。ソースが無ければ null。
// 配置先既存 (symlink 含む・lstat 判定) かつ !force なら SKIP、それ以外 COPY。
function planFile(from, to, relative, force) {
  if (!fs.existsSync(from)) return null;
  const action = entryExists(to) && !force ? "SKIP" : "COPY";
  return { from, to, relative, action };
}

// srcRoot 配下を再帰走査し destRoot へ相対パス保持でマップした計画エントリ群を返す（純粋）。
function planTree(srcRoot, targetDir, destRoot, force) {
  const entries = [];
  for (const rel of listFilesRecursive(srcRoot)) {
    const from = path.join(srcRoot, rel);
    const to = path.join(targetDir, destRoot, rel);
    const exists = entryExists(to);
    const action = exists && !force ? "SKIP" : "COPY";
    entries.push({ from, to, relative: path.join(destRoot, rel), action });
  }
  return entries;
}

// agent を考慮した COPY/SKIP 計画を合成する純粋関数。ファイルシステムを変更しない。
// agentEntry は options に入れる（位置引数を増やさない）。省略時は claude 既定 =
// 既存3引数呼び出し computeCopyPlan(langRoot, targetDir, {force}) と完全後方互換。
// enforce も options（既定 false）。false なら plan は従来と完全同一（mode キーも現れない）。
// 構成順序は固定: skill 計画 → intent 計画 → rootDoc 計画 →（enforce 時のみ）フック計画。
//   - skill 計画 : <langRoot>/<skillSubdir>/skills/ を <skillDest>/ へ相対保持でマップ。
//                  （claude は <langRoot>/claude/skills/ → .claude/skills/ で現行と一致）
//   - intent 計画: 共有 <langRoot>/intent/ を .intent/ へマップ（agent 不問・常に同じ）。
//   - rootDoc 計画: rootDoc が非 null なら <langRoot>/agents/<agentName>/<rootDoc> を
//                   配置先ルートの <rootDoc> へマップ。
//   - フック計画 : enforce かつ <targetDir>/.git が存在するときのみ、plan 末尾に
//                  <langRoot>/intent/scripts/pre-push → .git/hooks/pre-push を1エントリ追加
//                  （mode: 0o755 付き。実行ビットは applyPlan が chmod で付与する）。
//                  既存フックは SKIP（force 時は既存原則どおり COPY）。.git 不在なら足さない（6.1–6.2, 6.7）。
// 返り値: [{ from, to, relative, action: "COPY" | "SKIP", mode? }]
export function computeCopyPlan(
  langRoot,
  targetDir,
  { force = false, agentEntry = AGENT_REGISTRY.claude, enforce = false } = {},
) {
  const plan = [];

  // (a) skill 計画: agent 別 skill ツリー → skillDest。
  const skillSrc = path.join(langRoot, agentEntry.skillSubdir, "skills");
  plan.push(...planTree(skillSrc, targetDir, agentEntry.skillDest, force));

  // (b) intent 計画: 共有 → .intent（agent 不問）。
  const intentSrc = path.join(langRoot, INTENT_SUBDIR);
  plan.push(...planTree(intentSrc, targetDir, INTENT_DEST, force));

  // (c) rootDoc 計画: rootDoc があるときのみ。ソースは agents/<agentName>/<rootDoc>。
  if (agentEntry.rootDoc) {
    const docFrom = path.join(langRoot, "agents", agentEntry.agentName, agentEntry.rootDoc);
    const docTo = path.join(targetDir, agentEntry.rootDoc);
    const entry = planFile(docFrom, docTo, agentEntry.rootDoc, force);
    if (entry) plan.push(entry);
  }

  // (d) フック計画: --enforce かつ配置先が git リポジトリのときだけ pre-push を計画する。
  // .git/hooks 配下は非破壊許可リストの唯一の例外（enforce 明示時のみ・1ファイル固定）。
  if (enforce && fs.existsSync(path.join(targetDir, ".git"))) {
    const hookFrom = path.join(langRoot, INTENT_SUBDIR, "scripts", "pre-push");
    const hookTo = path.join(targetDir, ".git", "hooks", "pre-push");
    const entry = planFile(hookFrom, hookTo, path.join(".git", "hooks", "pre-push"), force);
    if (entry) plan.push({ ...entry, mode: 0o755 });
  }

  return plan;
}

// 計画を適用する (副作用)。COPY のみ 1 ファイルずつ書き、SKIP は触れない。
// fs.cpSync は使わず、mkdirSync(recursive) + copyFileSync で書く。
// 配置先に既存エントリ (force 時の上書き対象・symlink 含む) があれば copy 前に rm して
// 「リンク自体の置換」にする。copyFileSync はリンクを辿って書くため、rm しないと
// リンク先 (配置先ツリー外かもしれない) を上書きしてしまう (INV1 破り)。
// mode 付きエントリ（pre-push フック）は copy 後に chmod で権限を確定する。
// 途中失敗 (EACCES/ENOSPC 等) は copiedSoFar (配置済み relative の配列) を付与した
// エラーで報告する。メッセージは配置済み件数と再実行の安全性 (冪等) を自己完結で伝える。
// 返り値: { copied: string[], skipped: string[] } (いずれも relative パス)
export function applyPlan(plan) {
  const copied = [];
  const skipped = [];
  for (const entry of plan) {
    if (entry.action === "COPY") {
      try {
        fs.mkdirSync(path.dirname(entry.to), { recursive: true });
        if (entryExists(entry.to)) fs.rmSync(entry.to, { force: true });
        fs.copyFileSync(entry.from, entry.to);
        if (entry.mode !== undefined) fs.chmodSync(entry.to, entry.mode);
      } catch (cause) {
        const err = new Error(
          `配置中にエラーが発生しました (${copied.length} 件配置済み、${entry.relative} で失敗): ${cause.message}\n` +
            "このインストーラは冪等です。原因を解消して再実行すれば、配置済みファイルはスキップされ、続きから安全に配置されます。",
        );
        err.copiedSoFar = [...copied];
        err.cause = cause;
        throw err;
      }
      copied.push(entry.relative);
    } else {
      skipped.push(entry.relative);
    }
  }
  return { copied, skipped };
}

// 配置先に cc-sdd (.kiro/) が存在するかを返す。改変しない (読み取りのみ)。
export function detectCcSdd(targetDir) {
  return fs.existsSync(path.join(targetDir, ".kiro"));
}

// ---- gitignore 整備 (export 下書きの Git 非追跡化・4.1-4.6) ----
//
// 非破壊原則の明示的例外: .gitignore への「既存内容を変更しない末尾追記」のみを許す
// (--enforce のフック配置と同族)。計画 (planGitignore) と適用 (applyGitignore) を
// 分離し、dry-run では計画のみ返して書き込まない。

// 追記ブロック (3行固定: コメント1 + パターン2)。
// `!.intent/cc-sdd/README.md` の再包含は親ディレクトリ自体を除外していないため有効。
const GITIGNORE_COMMENT = "# intent-planner: cc-sdd export drafts are local-only";
const GITIGNORE_PATTERNS = [".intent/cc-sdd/*", "!.intent/cc-sdd/README.md"];

/**
 * @typedef {Object} GitignorePlan
 * @property {"create"|"append"|"none"|"skipped-not-git"} action
 * @property {string} path           .gitignore の絶対パス
 * @property {string[]} blockLines   追記する行 (コメント + 欠落パターン。最大3行)
 */

// .gitignore 整備の計画を返す純粋関数。書き込みは行わない。
//   - <targetDir>/.git が無い → skipped-not-git (非 git リポジトリでは何もしない・4.6)
//   - .gitignore 不在 → create (3行ブロック全体)
//   - 既存あり → パターン2行を trim 後完全一致で独立に判定し、欠落行のみ append。
//     コメント行は両パターン欠落 (= fresh block) のときだけ付ける。
//     除外行だけが先に存在する不完全な状態でも、欠けた再包含行を補える (4.2-4.3)。
//   - 両方あり → none (再実行で重複しない・冪等)
/** @returns {GitignorePlan} 書き込みは行わない（純粋な計画） */
export function planGitignore(targetDir) {
  const gitignorePath = path.join(targetDir, ".gitignore");
  if (!fs.existsSync(path.join(targetDir, ".git"))) {
    return { action: "skipped-not-git", path: gitignorePath, blockLines: [] };
  }
  if (!entryExists(gitignorePath)) {
    return { action: "create", path: gitignorePath, blockLines: [GITIGNORE_COMMENT, ...GITIGNORE_PATTERNS] };
  }
  const existingLines = fs
    .readFileSync(gitignorePath, "utf8")
    .split("\n")
    .map((line) => line.trim());
  const missing = GITIGNORE_PATTERNS.filter((p) => !existingLines.includes(p));
  if (missing.length === 0) {
    return { action: "none", path: gitignorePath, blockLines: [] };
  }
  // コメント行は両パターン欠落 (新規ブロック) のときのみ。片方だけの補完では付けない。
  const blockLines =
    missing.length === GITIGNORE_PATTERNS.length ? [GITIGNORE_COMMENT, ...missing] : missing;
  return { action: "append", path: gitignorePath, blockLines };
}

// 計画を適用する (副作用)。create / append のときだけ書き込む。
// append は既存内容のバイト列を一切変更せず末尾に追記するのみ。
// 既存末尾に改行が無ければ改行を補ってからブロックを足す (既存行と結合させない・4.2)。
/** @param {GitignorePlan} plan @returns {void} action が create/append のときのみ書き込む */
export function applyGitignore(plan) {
  if (plan.action === "create") {
    fs.writeFileSync(plan.path, plan.blockLines.join("\n") + "\n");
  } else if (plan.action === "append") {
    const existing = fs.readFileSync(plan.path, "utf8");
    const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
    fs.appendFileSync(plan.path, separator + plan.blockLines.join("\n") + "\n");
  }
  // none / skipped-not-git: 何もしない。
}

/**
 * Git 追跡中の .intent/cc-sdd/ 配下ファイル (README.md を除く) を返す。
 * 読み取り専用の `git ls-files` のみを使い、追跡解除は行わない (案内は cli 側・4.4)。
 * git 実行不可・非リポジトリ・非ゼロ終了では [] を返す (フェイルオープン)。
 * cwd 指定必須 (intent-check.mjs の先例に従う)。
 * @returns {string[]}
 */
export function detectTrackedCcSdd(targetDir) {
  try {
    const r = spawnSync("git", ["ls-files", "--", ".intent/cc-sdd"], {
      cwd: targetDir,
      encoding: "utf8",
    });
    if (r.error || r.status !== 0 || typeof r.stdout !== "string") return [];
    return r.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line !== ".intent/cc-sdd/README.md");
  } catch {
    return [];
  }
}

// インストールのオーケストレーション。
// dryRun 時は計画のみで書き込まない。lang から言語別ルートを解決し、
// 対応言語（ja, en）以外は ja にフォールバックする（langFallback=true・非停止）。
// agent は AGENT_REGISTRY に無ければエラーを投げる（不正 agent はエラー停止・lang の
// ja フォールバックと非対称: agent 違いは想定と異なる形式の配置という破壊的誤りになりうる）。
// enforce（既定 false）は computeCopyPlan へ素通しする。enforce 指定でも .git 不在なら
// フックは計画されず、その事実を enforceHookSkippedNoGit で返す（cli サマリ用・additive）。
// gitignore 整備は配置とは独立に計画し、dry-run では計画 (action) のみ返して書き込まない。
// 返り値: { copied, skipped, plan, ccSddDetected, langFallback, resolvedLang, agent,
//          enforceHookSkippedNoGit, gitignore, trackedCcSdd }
export function install(
  targetDir,
  {
    force = false,
    dryRun = false,
    lang = "ja",
    agent = "claude",
    templatesDir,
    enforce = false,
  } = {},
) {
  const tmpl = templatesDir ?? defaultTemplatesDir();
  if (!fs.existsSync(tmpl)) {
    throw new Error(
      `templates が見つかりません: ${tmpl}\nパッケージが壊れている可能性があります。再インストールしてください。`,
    );
  }

  // agent を検証する。未登録 agent はエラー停止（配置しない）。
  const agentEntry = AGENT_REGISTRY[agent];
  if (!agentEntry) {
    const supported = Object.keys(AGENT_REGISTRY).join(", ");
    throw new Error(
      `対応していないエージェントです: ${agent}\n対応エージェント: ${supported}`,
    );
  }

  // 言語別ルートを解決し、解決済みルートと agent エントリをコピー計画算出に渡す。
  // langFallback は resolveLangRoot 由来（対応集合外なら true。旧 lang !== "ja" を置換）。
  const { langRoot, langFallback, resolvedLang } = resolveLangRoot(tmpl, lang);
  const plan = computeCopyPlan(langRoot, targetDir, { force, agentEntry, enforce });

  let copied = [];
  let skipped = [];
  if (!dryRun) {
    const applied = applyPlan(plan);
    copied = applied.copied;
    skipped = applied.skipped;
  } else {
    // dry-run: 適用はしないが、実行時と同じ COPY/SKIP 判定を提示する。
    copied = plan.filter((e) => e.action === "COPY").map((e) => e.relative);
    skipped = plan.filter((e) => e.action === "SKIP").map((e) => e.relative);
  }

  // gitignore 整備: 計画は常に算出し (dry-run でも action を提示・4.5)、適用は非 dry-run のみ。
  const gitignorePlan = planGitignore(targetDir);
  if (!dryRun) applyGitignore(gitignorePlan);

  return {
    copied,
    skipped,
    plan,
    ccSddDetected: detectCcSdd(targetDir),
    langFallback,
    resolvedLang,
    agent: agentEntry.agentName,
    // --enforce なのに .git が無くフックを計画できなかったか（cli の案内表示用・6.1 系）。
    enforceHookSkippedNoGit: enforce && !fs.existsSync(path.join(targetDir, ".git")),
    // gitignore 整備の結果 (dry-run では計画のみ): "create" | "append" | "none" | "skipped-not-git"。
    gitignore: gitignorePlan.action,
    // Git 追跡済みの cc-sdd 下書き (README.md 除く)。cli が追跡解除手順を案内のみ表示する (4.4)。
    trackedCcSdd: detectTrackedCcSdd(targetDir),
  };
}
