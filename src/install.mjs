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
//   - rootDocImport: ルート文書が「ファイル内 @import 記法」を持つか（事実調査で確定・憶測で変えない）。
//                  true  → 既存ルート文書には quickstart 本体を別ファイルに置き、ルート文書へ参照1行
//                          （`@<別ファイル>`）だけを冪等追記する（A2）。claude（@CLAUDE_intent.md・
//                          再帰4ホップ）/ gemini（@./GEMINI_intent.md・Memory Import）が該当。
//                  false → import 記法が無いため、既存ルート文書の本文末尾へ quickstart セクションを
//                          冪等 append する（A1）。codex（AGENTS.md は @import 非対応）が該当。
//                  この汎用フラグで import 有無を表現し、computeCopyPlan / planRootDoc 本体に
//                  `if (agent === "codex")` のような agent 名ハードコード分岐を増やさない（INV33/DR51）。
// claude エントリは現行挙動（skill→.claude/skills、rootDoc なし）を表現し、回帰を保証する。
export const AGENT_REGISTRY = {
  claude: { agentName: "claude", skillSubdir: "claude", skillDest: ".claude/skills", rootDoc: "CLAUDE.md", rootDocImport: true },
  codex: { agentName: "codex", skillSubdir: "codex", skillDest: ".agents/skills", rootDoc: "AGENTS.md", rootDocImport: false },
  // gemini は3つ目の agent。Gemini CLI は .agents/skills を cross-tool alias として読むため
  // skillDest を codex と共有する（DR35）。skillSubdir は codex 共有で確定済み（gemini-cli-support
  // task 3.2・実機 smoke で gemini CLI v0.24.0 が .agents/skills の codex skill を読み競合しないことを
  // 確証・専用 .gemini/skills ツリーは設けない）。rootDoc は Gemini CLI 既定の GEMINI.md。配置経路は
  // computeCopyPlan の汎用分岐をそのまま使う（agent 名で分岐するロジックを足さない＝INV26/DR34）。
  gemini: { agentName: "gemini", skillSubdir: "codex", skillDest: ".agents/skills", rootDoc: "GEMINI.md", rootDocImport: true },
};

// 共有 intent scaffold の対応（agent 不問・常に同じ）。
// templates/<lang>/intent/...  -> <target>/.intent/...
const INTENT_SUBDIR = "intent";
const INTENT_DEST = ".intent";

// ---- code / user-data 分類 (安全なバージョンアップの核心) ----
//
// 配置物は3種類に分かれる:
//   - code      : intent-planner 専有ディレクトリ (.claude/skills/ ・ .agents/skills/ ・
//                 .intent/ 配下) にある skill ロジック・スクリプト・参照ドキュメント。
//                 バージョンアップで上書きしてよい（むしろ上書きしたい）。<file>.bak に退避してから書く。
//   - user-data : ユーザー / ワークフローが書き込む成果物・ログ・状態。
//                 バージョンアップで決して上書きしてはいけない（ユーザーの作業が消える）。
//   - shared    : ユーザー領域とテリトリを共有するファイル（リポジトリ直下の AGENTS.md・
//                 .git/hooks/pre-push）。ユーザーが自分の内容を追記・統合している可能性があるため、
//                 update では上書きせず既存を尊重して SKIP する（明示的な --force のときだけ上書き）。
//
// 分類は配置先の relative パスのみで決まる純粋関数 classifyFile で行う。判定基準は
// 各テンプレートファイル冒頭の「誰が書くか」注記に対応する（intent-tree は /intent-discover が、
// drift-log はフックが書く…等）。USER_DATA_RELATIVES / SHARED_RELATIVES に列挙されたものだけが
// それぞれ user-data / shared で、残り（intent-planner 専有ツリー内）は全て code。
const USER_DATA_RELATIVES = new Set([
  ".intent/intent-tree.md", // /intent-discover が書く意図ツリー
  ".intent/intent-tree.history.md", // 完結機能の Impact Analysis・出荷済み L4 等の履歴退避先（DR64）
  ".intent/intent-compass.md", // /intent-compass が書く判断基準
  ".intent/compass-archive.md", // 覆された Decision Rules の退避先
  ".intent/compass-history.md", // 完結機能のプレモータム逆算 Anti-direction の履歴退避先（DR64）
  ".intent/deltas.md", // /intent-writeback が記録する書き戻し delta
  ".intent/drift-log.md", // drift-watch フックが追記するログ
  ".intent/drift-patterns.md", // ユーザーが現場で育てる逸脱の型カタログ
  ".intent/context-cost-cues.md", // ユーザーが現場で育てるコンテキストコストの気づきカタログ
  ".intent/glossary.md", // ユーザーが現場で育てる正規語彙の台帳
  ".intent/constraint-library.md", // ユーザーが現場で育てる制約の台帳（叩き台ライブラリの蓄積側）
  ".intent/export-log.md", // /intent-export-cc-sdd が追記する export 履歴
  ".intent/mode.md", // Enforcement / Drift-watch（共有ポリシー）
  ".intent/mode.local.md", // /intent-discover が書く mode 状態（ローカル専用・upgrade で上書きしない・後方互換の legacy/fallback 読み先）
  ".intent/discovery/README.md", // discover 発行ディレクトリ群のコンテナ説明（A34・発行ごとの <スラッグ>-<rand>/mode.md はここに作られる・upgrade で上書きしない）
  ".intent/milestones.md", // 節目イベント（Decision 確定等）の記録（ユーザー成果物）
  ".intent/packets/index.md", // packet の再生成インデックス（ユーザーの packet を反映）
  ".intent/packets/plan.md", // /intent-packets が書く plan レベルの記録
]);

// ユーザー領域とテリトリを共有するファイル（update では上書きしない・--force でのみ上書き）。
// AGENTS.md / CLAUDE.md はリポジトリ直下のプロジェクト指示でユーザーが追記しうる。pre-push は
// 他ツールと統合されている可能性がある既存フック。どちらも黙って上書きすると高リスクなので尊重する。
const SHARED_RELATIVES = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".git/hooks/pre-push",
]);

// 配置先 relative を "code" | "user-data" | "shared" に分類する純粋関数。
// relative はプラットフォーム差を吸収するため POSIX 区切りへ正規化してから照合する。
export function classifyFile(relative) {
  const posix = relative.split(path.sep).join("/");
  if (USER_DATA_RELATIVES.has(posix)) return "user-data";
  if (SHARED_RELATIVES.has(posix)) return "shared";
  return "code";
}

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

// 配置先の現物がソースと byte 完全一致かを返す（純粋・読み取りのみ）。
// 配置先が無い・読めない・symlink 等で比較不能なら false（= 一致とみなさない＝従来判定に委ねる）。
// 大きいファイルは無いので単純な全読み比較で十分。
function filesIdentical(from, to) {
  try {
    if (!fs.statSync(to).isFile()) return false; // symlink/dir は比較対象外
    return fs.readFileSync(from).equals(fs.readFileSync(to));
  } catch {
    return false;
  }
}

// 配置先既存有無・分類・force/update から COPY/SKIP を決める純粋関数。
// 全ての計画エントリの action はここに集約する（判定ロジックの単一の真実）。
//   - 配置先が存在しない          → 常に COPY（新規ファイルは分類に関わらず配置する）
//   - force                       → 常に COPY（既存原則どおり全上書き。従来の --force と同じ）
//   - update かつ kind === code:
//       既存がソースと byte 一致  → SKIP（更新不要。冪等: 同じ版で再実行しても何も書かない）
//       一致しない                → COPY（バージョンアップ: code を上書きする）
//   - それ以外（既存）            → SKIP（user-data / shared は update でも保護。従来の既定と同じ）
//
// バックアップ（.bak 退避）は「既存の code を実際に上書きするとき」だけ必要なので、その事実を
// backup フラグで返す（applyPlan が COPY 前に退避する）。新規 COPY・force・一致 SKIP では立てない。
function decideAction(exists, kind, { force, update, identical = false }) {
  if (!exists) return { action: "COPY", backup: false };
  if (force) return { action: "COPY", backup: false };
  if (update && kind === "code") {
    if (identical) return { action: "SKIP", backup: false };
    return { action: "COPY", backup: true };
  }
  return { action: "SKIP", backup: false };
}

// 既存 code を update で上書きする候補のときだけ byte 一致を調べる（無駄読みを避ける）。
// 一致なら decideAction が SKIP に倒し、冪等な再実行で何も書かない。
function isIdenticalIfRelevant(exists, kind, from, to, { force, update }) {
  if (!exists || force || !update || kind !== "code") return false;
  return filesIdentical(from, to);
}

// 1 つの単一ファイルを計画エントリ化する純粋ヘルパ。ソースが無ければ null。
// 分類 (code/user-data/shared) を付与し、decideAction で action/backup を決める。
function planFile(from, to, relative, { force, update }) {
  if (!fs.existsSync(from)) return null;
  const kind = classifyFile(relative);
  const exists = entryExists(to);
  const identical = isIdenticalIfRelevant(exists, kind, from, to, { force, update });
  const { action, backup } = decideAction(exists, kind, { force, update, identical });
  return { from, to, relative, action, kind, backup };
}

// srcRoot 配下を再帰走査し destRoot へ相対パス保持でマップした計画エントリ群を返す（純粋）。
function planTree(srcRoot, targetDir, destRoot, { force, update }) {
  const entries = [];
  for (const rel of listFilesRecursive(srcRoot)) {
    const from = path.join(srcRoot, rel);
    const to = path.join(targetDir, destRoot, rel);
    const relative = path.join(destRoot, rel);
    const kind = classifyFile(relative);
    const exists = entryExists(to);
    const identical = isIdenticalIfRelevant(exists, kind, from, to, { force, update });
    const { action, backup } = decideAction(exists, kind, { force, update, identical });
    entries.push({ from, to, relative, action, kind, backup });
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
// update（既定 false）はバージョンアップ挙動: code 種別の既存ファイルを上書きし、user-data は
// 保護する（classifyFile 参照）。各エントリは kind ("code"|"user-data") と backup (bool) を持つ。
// update も force も false なら従来どおり全既存を SKIP し、kind/backup は付くが action は不変
// （後方互換: action 集合は従来と同一）。force は update に優先し全既存を COPY する。
export function computeCopyPlan(
  langRoot,
  targetDir,
  { force = false, update = false, agentEntry = AGENT_REGISTRY.claude, enforce = false } = {},
) {
  const plan = [];
  const opts = { force, update };

  // (a) skill 計画: agent 別 skill ツリー → skillDest。
  const skillSrc = path.join(langRoot, agentEntry.skillSubdir, "skills");
  plan.push(...planTree(skillSrc, targetDir, agentEntry.skillDest, opts));

  // (b) intent 計画: 共有 → .intent（agent 不問）。
  const intentSrc = path.join(langRoot, INTENT_SUBDIR);
  plan.push(...planTree(intentSrc, targetDir, INTENT_DEST, opts));

  // (c) rootDoc 計画: rootDoc があるときのみ。ソースは agents/<agentName>/<rootDoc>。
  if (agentEntry.rootDoc) {
    const docFrom = path.join(langRoot, "agents", agentEntry.agentName, agentEntry.rootDoc);
    const docTo = path.join(targetDir, agentEntry.rootDoc);
    const entry = planFile(docFrom, docTo, agentEntry.rootDoc, opts);
    if (entry) plan.push(entry);
  }

  // (d) フック計画: --enforce かつ配置先が git リポジトリのときだけ pre-push を計画する。
  // .git/hooks 配下は非破壊許可リストの唯一の例外（enforce 明示時のみ・1ファイル固定）。
  if (enforce && fs.existsSync(path.join(targetDir, ".git"))) {
    const hookFrom = path.join(langRoot, INTENT_SUBDIR, "scripts", "pre-push");
    const hookTo = path.join(targetDir, ".git", "hooks", "pre-push");
    const entry = planFile(hookFrom, hookTo, path.join(".git", "hooks", "pre-push"), opts);
    if (entry) plan.push({ ...entry, mode: 0o755 });
  }

  return plan;
}

// 計画を適用する (副作用)。COPY のみ 1 ファイルずつ書き、SKIP は触れない。
// fs.cpSync は使わず、mkdirSync(recursive) + copyFileSync で書く。
// 配置先に既存エントリ (force 時の上書き対象・symlink 含む) があれば copy 前に rm して
// 「リンク自体の置換」にする。copyFileSync はリンクを辿って書くため、rm しないと
// リンク先 (配置先ツリー外かもしれない) を上書きしてしまう (INV1 破り)。
// backup フラグ付きエントリ (update での code 上書き) は、配置先の現物を <to>.bak へ
// 退避してから上書きする。退避は copyFileSync ベース（リンクは辿らず実体をコピーして残す）。
// 既存の .bak は前回退避なので上書きしてよい（最新の「上書き前」を1世代だけ保持）。
// mode 付きエントリ（pre-push フック）は copy 後に chmod で権限を確定する。
// 途中失敗 (EACCES/ENOSPC 等) は copiedSoFar (配置済み relative の配列) を付与した
// エラーで報告する。メッセージは配置済み件数と再実行の安全性 (冪等) を自己完結で伝える。
// 返り値: { copied, skipped, backedUp } (いずれも relative パスの配列)
export function applyPlan(plan) {
  const copied = [];
  const skipped = [];
  const backedUp = [];
  for (const entry of plan) {
    if (entry.action === "COPY") {
      try {
        fs.mkdirSync(path.dirname(entry.to), { recursive: true });
        // 上書き前のバックアップ（update での code 上書き時のみ）。配置先が実在するときだけ退避する。
        if (entry.backup && entryExists(entry.to)) {
          fs.copyFileSync(entry.to, `${entry.to}.bak`);
          backedUp.push(entry.relative);
        }
        if (entryExists(entry.to)) fs.rmSync(entry.to, { force: true });
        fs.copyFileSync(entry.from, entry.to);
        if (entry.mode !== undefined) fs.chmodSync(entry.to, entry.mode);
      } catch (cause) {
        const err = new Error(
          `配置中にエラーが発生しました (${copied.length} 件配置済み、${entry.relative} で失敗): ${cause.message}\n` +
            (entry.backup ? `  上書き前の現物は ${entry.to}.bak に退避済みです（必要なら手動で復元できます）。\n` : "") +
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
  return { copied, skipped, backedUp };
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

// 追記ブロック (コメント1 + パターン群)。新規作成時はコメント込み、欠落補完時はパターンのみ。
// `!.intent/cc-sdd/README.md` の再包含は親ディレクトリ自体を除外していないため有効。
const GITIGNORE_COMMENT = "# intent-planner: local-only files (export drafts / mode state)";
// `*.bak` はバージョンアップ時に code を上書きする前の退避ファイル（applyPlan が作る安全網）。
// ローカル専用なので Git 非追跡にする（git status を汚さない）。intent-planner が書き込む
// ディレクトリ配下に限定する（リポジトリ全体の *.bak を巻き込むと、ユーザーの src/foo.bak 等を
// 黙って除外してしまうため。退避先は code = .claude/skills/ ・ .agents/skills/ ・ .intent/ のみ）。
const GITIGNORE_PATTERNS = [
  ".intent/cc-sdd/*",
  "!.intent/cc-sdd/README.md",
  ".intent/overview/*",
  "!.intent/overview/README.md",
  ".intent/spec-ingest/*",
  "!.intent/spec-ingest/README.md",
  ".intent/nl-spec/*",
  "!.intent/nl-spec/README.md",
  ".intent/db-design/*",
  "!.intent/db-design/README.md",
  ".intent/release-note/*",
  "!.intent/release-note/README.md",
  ".intent/mode.local.md",
  ".intent/discovery/*",
  "!.intent/discovery/README.md",
  ".intent/**/*.bak",
  ".claude/**/*.bak",
  ".agents/**/*.bak",
];

/**
 * @typedef {Object} GitignorePlan
 * @property {"create"|"append"|"none"|"skipped-not-git"} action
 * @property {string} path           .gitignore の絶対パス
 * @property {string[]} blockLines   追記する行 (新規=コメント + 全パターン / 補完=欠落パターンのみ)
 */

// .gitignore 整備の計画を返す純粋関数。書き込みは行わない。
//   - <targetDir>/.git が無い → skipped-not-git (非 git リポジトリでは何もしない・4.6)
//   - .gitignore 不在 → create (コメント + 全パターンのブロック全体)
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

// ---- 既存ルート文書への intent-planner 節の非破壊追記 (INV33・DR51) ----
//
// 非破壊原則の明示的例外その2: 既存ルート文書 (CLAUDE.md / AGENTS.md / GEMINI.md) への
// 「既存内容を変更しない末尾追記」のみを許す (.gitignore / pre-push フックと同族)。
// 既存ルート文書を持つ利用者には decideAction が shared+既存→SKIP を返すため quickstart が
// 一度も届かない。これを直すため、append/参照レーンを install 側に外付けする (SHARED 核は不変)。
//
// import 有無のハイブリッド (AGENT_REGISTRY.rootDocImport・事実調査で確定):
//   - rootDocImport=true  (claude / gemini): A2。quickstart 本体は別ファイル (<base>_intent.md) に
//     配置し、ルート文書へ `@<別ファイル>` 参照1行だけを冪等追記する。再帰 import で読み込まれる。
//   - rootDocImport=false (codex):           A1。@import 記法が無いため、ルート文書の本文末尾へ
//     quickstart セクション (# intent-planner …) を冪等 append する。
//
// 計画 (planRootDoc) と適用 (applyRootDoc) を分離し、dry-run では計画のみ返して書き込まない。
// 既存内容のバイト列は一切変更せず、末尾に改行を補ってからブロックを足す (applyGitignore と同型)。

// 別ファイル参照行 (A2)。claude は `@CLAUDE_intent.md`、gemini は `@./GEMINI_intent.md`。
// `@` の相対パスはルート文書のディレクトリから解決される (claude/gemini いずれも同階層配置)。
// gemini の Memory Import は明示的な相対 (`./`) を好むため prefix を分ける。
function referenceFileName(rootDoc) {
  const ext = path.extname(rootDoc); // ".md"
  const base = rootDoc.slice(0, rootDoc.length - ext.length); // "CLAUDE"
  return `${base}_intent${ext}`; // "CLAUDE_intent.md"
}
function referenceLine(agentEntry) {
  const file = referenceFileName(agentEntry.rootDoc);
  // gemini (.agents 共有) は `./` 明示、claude は素の `@`（どちらも同階層解決で等価だが慣習に合わせる）。
  const prefix = agentEntry.agentName === "gemini" ? "@./" : "@";
  return `${prefix}${file}`;
}

// A1 (codex) で本文へ append する quickstart セクションの冪等判定マーカー (前方一致)。
// テンプレ本文の先頭行が `# intent-planner` で始まる前提に合わせる。
const ROOTDOC_SECTION_MARKER = "# intent-planner";

/**
 * @typedef {Object} RootDocPlan
 * @property {"reference"|"append"|"none"|"create"|"skipped-no-tty"|"skipped-no-doc"} action
 *   reference     : A2。既存ルート文書へ参照1行を追記し、別ファイルを配置する。
 *   append        : A1。既存ルート文書の本文末尾へ quickstart セクションを追記する。
 *   none          : 参照行/セクションが既在 (冪等・再 install で重複しない)。
 *   create        : ルート文書が不在 → 従来の COPY (computeCopyPlan) が全文配置する。本レーンは何もしない。
 *   skipped-no-tty: 既存ルート文書への追記が必要だが非対話環境で同意を取れないためスキップ (案内のみ)。
 *   skipped-no-doc: テンプレ本文/別ファイルが見つからず追記できない (テンプレ欠落・通常は起きない)。
 * @property {string} rootDocPath  ルート文書の絶対パス
 * @property {string} [refFrom]    A2: 配置する別ファイルのソース絶対パス
 * @property {string} [refTo]      A2: 配置する別ファイルの配置先絶対パス
 * @property {string} [refLine]    A2: ルート文書へ追記する参照行
 * @property {string} [appendBody] A1: ルート文書末尾へ追記する本文 (テンプレ全文)
 */

// 既存ルート文書への追記計画を返す純粋関数。書き込みは行わない。
//   - rootDoc が無い (agent に rootDoc 未設定)        → none (何もしない)
//   - ルート文書が不在                                 → create (COPY が配置・本レーンは無関与)
//   - 既に参照行/セクションが存在                       → none (冪等)
//   - rootDocImport=true で別ファイルテンプレ不在       → skipped-no-doc (追記不能・案内)
//   - rootDocImport=false で本文テンプレ不在            → skipped-no-doc
//   - 既存ルート文書あり + 追記が必要                   → reference (A2) / append (A1)
//
// confirm の有無 (対話/--yes) は適用判断であり、計画段階では「追記が必要か」だけを決める。
// 適用 (applyRootDoc) 側で confirm 不成立なら skipped-no-tty に倒す。
/** @param {object} agentEntry @param {string} langRoot @returns {RootDocPlan} 純粋な計画 */
export function planRootDoc(targetDir, agentEntry, langRoot) {
  const rootDoc = agentEntry.rootDoc;
  const rootDocPath = path.join(targetDir, rootDoc ?? "");
  if (!rootDoc) {
    return { action: "none", rootDocPath };
  }
  // ルート文書が不在なら従来 COPY が全文配置する (本レーンは無関与)。
  if (!entryExists(rootDocPath)) {
    return { action: "create", rootDocPath };
  }
  const existing = fs.readFileSync(rootDocPath, "utf8");

  if (agentEntry.rootDocImport) {
    // A2: 参照1行 + 別ファイル配置。
    const refLine = referenceLine(agentEntry);
    const refFrom = path.join(langRoot, "agents", agentEntry.agentName, referenceFileName(rootDoc));
    if (!fs.existsSync(refFrom)) {
      return { action: "skipped-no-doc", rootDocPath };
    }
    // 冪等: 参照行が既存本文に行として存在すれば追記しない (前後空白を除いた行一致)。
    const hasRef = existing.split("\n").some((line) => line.trim() === refLine);
    const refTo = path.join(targetDir, referenceFileName(rootDoc));
    // 別ファイルが既在で参照行もあるなら完全 none。参照行が無ければ追記が必要 (別ファイルも要配置)。
    if (hasRef) {
      return { action: "none", rootDocPath };
    }
    return { action: "reference", rootDocPath, refFrom, refTo, refLine };
  }

  // A1: 本文末尾へ quickstart セクションを append。
  const appendFrom = path.join(langRoot, "agents", agentEntry.agentName, rootDoc);
  if (!fs.existsSync(appendFrom)) {
    return { action: "skipped-no-doc", rootDocPath };
  }
  // 冪等: セクションマーカー (# intent-planner) を既存本文が含むなら追記しない。
  if (existing.includes(ROOTDOC_SECTION_MARKER)) {
    return { action: "none", rootDocPath };
  }
  const appendBody = fs.readFileSync(appendFrom, "utf8");
  return { action: "append", rootDocPath, appendBody };
}

// 計画を適用する (副作用)。reference / append のときだけ書き込む。
// 既存ルート文書 (ユーザー資産) への追記局面でだけ confirm を要求する:
//   - confirm() が true を返した → 追記する
//   - false (非対話で同意なし・ユーザーが n) → 何もせず skipped-no-tty を返す (案内は cli 側)
// confirm は (rootDocPath, action) を受け取り boolean を返す関数。省略時は常に true (テスト/内部利用)。
// 追記は既存内容のバイト列を一切変更せず末尾に追記するのみ (改行が無ければ補う)。
/** @param {RootDocPlan} plan @param {() => boolean} [confirm] @returns {string} 実際に行った action */
export function applyRootDoc(plan, confirm = () => true) {
  if (plan.action !== "reference" && plan.action !== "append") {
    // create / none / skipped-no-doc: 既存ルート文書への書き込みは無い。そのまま返す。
    return plan.action;
  }
  if (!confirm(plan.rootDocPath, plan.action)) {
    return "skipped-no-tty";
  }
  if (plan.action === "reference") {
    // 別ファイル本体を配置 (code 扱い: 既存があれば置換)。
    fs.mkdirSync(path.dirname(plan.refTo), { recursive: true });
    if (entryExists(plan.refTo)) fs.rmSync(plan.refTo, { force: true });
    fs.copyFileSync(plan.refFrom, plan.refTo);
    // 参照行をルート文書末尾へ追記 (既存末尾に改行が無ければ補う)。
    const existing = fs.readFileSync(plan.rootDocPath, "utf8");
    const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
    fs.appendFileSync(plan.rootDocPath, separator + plan.refLine + "\n");
    return "reference";
  }
  // append (A1): 本文末尾へ quickstart セクションを追記。既存と結合させないため空行で区切る。
  const existing = fs.readFileSync(plan.rootDocPath, "utf8");
  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n\n" : "\n";
  fs.appendFileSync(plan.rootDocPath, separator + plan.appendBody.replace(/\n*$/, "\n"));
  return "append";
}

// 既存ルート文書 (ユーザー資産) への追記同意を取る confirm 関数を組み立てる。
//   - yes=true              → 常に同意 (--yes で前渡し。確認を省いて追記)。
//   - 非対話 (isTTY=false)  → 同意を出せないため常に false (= 追記せず skipped-no-tty に倒す)。
//   - 対話 (isTTY=true)     → 標準入力から y/n を1回読み、y 系のみ true。
// 確認は「既存ルート文書への追記」局面に外科的に閉じる。新規 COPY・install 全体は対話化しない。
// install は同期 API なので確認も同期で完結させる。process.stdout への告知と fs.readSync (1行読み)
// だけで同期プロンプトを組み、新 npm 依存を足さない (A5・依存ゼロ)。
export function makeRootDocConfirm({ yes = false, isTTY = false } = {}) {
  if (yes) return () => true;
  if (!isTTY) return () => false;
  return (rootDocPath, action) => {
    const rel = path.basename(rootDocPath);
    const what =
      action === "reference"
        ? `既存の ${rel} の末尾に参照行を1行追記し、quickstart 本体を別ファイルで配置します`
        : `既存の ${rel} の末尾に intent-planner の quickstart セクションを追記します`;
    process.stdout.write(`${what}\n  追記してよいですか? [y/N]: `);
    const answer = readLineSyncFromStdin();
    return /^y(es)?$/i.test(answer.trim());
  };
}

// 標準入力 (fd 0) から1行を同期的に読む。install は同期 API なので確認も同期で完結させる。
// 1 バイトずつ改行 (LF) まで読み、依存を足さずに同期プロンプトを実現する。
// EOF (read が 0) で打ち切る。読めなければ空文字 (= 同意なし扱い)。
function readLineSyncFromStdin() {
  const buf = Buffer.alloc(1);
  let line = "";
  while (true) {
    let bytes;
    try {
      bytes = fs.readSync(0, buf, 0, 1, null);
    } catch (e) {
      // EAGAIN (非ブロッキング fd) や EOF 系は打ち切る。安全側に空文字。
      if (e.code === "EAGAIN") continue;
      break;
    }
    if (bytes === 0) break; // EOF
    const ch = buf.toString("utf8", 0, 1);
    if (ch === "\n") break;
    if (ch === "\r") continue;
    line += ch;
  }
  return line;
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

/**
 * Git 追跡中の .intent/mode.local.md を検出する。
 * mode 状態はローカル専用 (DD1) であり、古い scaffold では git 追跡済みになっている場合がある。
 * 読み取り専用の `git ls-files` のみを使い、追跡解除は行わない (案内は cli 側・DR12・INV3)。
 * git 実行不可・非リポジトリ・非ゼロ終了では false を返す (フェイルオープン)。
 * @returns {boolean}
 */
export function detectTrackedModeLocal(targetDir) {
  try {
    const r = spawnSync("git", ["ls-files", "--", ".intent/mode.local.md"], {
      cwd: targetDir,
      encoding: "utf8",
    });
    if (r.error || r.status !== 0 || typeof r.stdout !== "string") return false;
    return r.stdout.split("\n").some((line) => line.trim() === ".intent/mode.local.md");
  } catch {
    return false;
  }
}

// インストールのオーケストレーション。
// update（既定 false）はバージョンアップ挙動: code 種別の既存ファイル（skill・scripts・参照
// ドキュメント）を上書きし、user-data 種別（intent-tree.md / 各ログ等・classifyFile 参照）は
// 保護する。上書きする code は <file>.bak へ退避してから書く（backedUp に列挙）。force は update に
// 優先し全既存を上書きする（バックアップは取らない・明示的全上書き）。
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
    update = false,
    dryRun = false,
    lang = "ja",
    agent = "claude",
    templatesDir,
    enforce = false,
    // 既存ルート文書への追記同意を取る関数 (rootDocPath, action) => boolean。
    // 省略時は makeRootDocConfirm({ isTTY: process.stdin.isTTY }) を使う (非対話なら追記しない)。
    // --yes は cli が makeRootDocConfirm({ yes: true }) を渡して前渡しする。
    confirmRootDoc,
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
  const plan = computeCopyPlan(langRoot, targetDir, { force, update, agentEntry, enforce });

  // ルート文書追記の計画は applyPlan より「前」に算出する。applyPlan はルート文書が不在のとき
  // COPY で配置してしまうため、ここで「導入前の既存有無」を捉えないと create と reference を
  // 取り違える (既存判定が後ろにずれる)。SHARED 核 (shared+既存→SKIP) は不変のまま、append/参照
  // レーンだけを install 側に外付けする。
  const rootDocPlan = planRootDoc(targetDir, agentEntry, langRoot);

  let copied = [];
  let skipped = [];
  let backedUp = [];
  if (!dryRun) {
    const applied = applyPlan(plan);
    copied = applied.copied;
    skipped = applied.skipped;
    backedUp = applied.backedUp;
  } else {
    // dry-run: 適用はしないが、実行時と同じ COPY/SKIP/backup 判定を提示する。
    copied = plan.filter((e) => e.action === "COPY").map((e) => e.relative);
    skipped = plan.filter((e) => e.action === "SKIP").map((e) => e.relative);
    // backup は「既存の code を上書きする」エントリのみ。dry-run では entryExists 判定済みの
    // backup フラグ（計画段階で配置先存在を加味済み）をそのまま提示する。
    backedUp = plan.filter((e) => e.action === "COPY" && e.backup).map((e) => e.relative);
  }

  // gitignore 整備: 計画は常に算出し (dry-run でも action を提示・4.5)、適用は非 dry-run のみ。
  const gitignorePlan = planGitignore(targetDir);
  if (!dryRun) applyGitignore(gitignorePlan);

  // ルート文書追記: 既存ルート文書があるときだけ confirm を取って追記する (非 dry-run のみ書き込む)。
  // dry-run では「追記が必要か」(reference/append/none/create/skipped-no-doc) の計画 action をそのまま提示。
  // 適用時は confirm 不成立 (非対話で同意なし) なら skipped-no-tty に倒す (案内は cli 側)。
  const confirm =
    confirmRootDoc ?? makeRootDocConfirm({ isTTY: Boolean(process.stdin && process.stdin.isTTY) });
  const rootDoc = dryRun ? rootDocPlan.action : applyRootDoc(rootDocPlan, confirm);

  return {
    copied,
    skipped,
    backedUp,
    update,
    plan,
    ccSddDetected: detectCcSdd(targetDir),
    langFallback,
    resolvedLang,
    agent: agentEntry.agentName,
    // --enforce なのに .git が無くフックを計画できなかったか（cli の案内表示用・6.1 系）。
    enforceHookSkippedNoGit: enforce && !fs.existsSync(path.join(targetDir, ".git")),
    // gitignore 整備の結果 (dry-run では計画のみ): "create" | "append" | "none" | "skipped-not-git"。
    gitignore: gitignorePlan.action,
    // 既存ルート文書への追記結果 (dry-run では計画 action): "reference" | "append" | "none" |
    // "create" | "skipped-no-tty" | "skipped-no-doc"。
    //   reference     : 既存ルート文書へ参照1行を追記し別ファイルを配置 (A2: claude/gemini)
    //   append        : 既存ルート文書の本文末尾へ quickstart セクションを追記 (A1: codex)
    //   none          : 参照行/セクションが既在 (冪等) / agent に rootDoc 無し
    //   create        : ルート文書が不在 → 従来 COPY が全文配置 (本レーンは無関与)
    //   skipped-no-tty: 既存ルート文書への追記が必要だが非対話で同意を取れずスキップ (案内のみ)
    //   skipped-no-doc: 別ファイル/本文テンプレ欠落で追記不能 (通常は起きない)
    rootDoc,
    // ルート文書追記計画の詳細 (cli が「どのルート文書か」を案内するため)。dry-run でも提示。
    rootDocPlan,
    // Git 追跡済みの cc-sdd 下書き (README.md 除く)。cli が追跡解除手順を案内のみ表示する (4.4)。
    trackedCcSdd: detectTrackedCcSdd(targetDir),
    // Git 追跡済みの .intent/mode.local.md。mode 状態はローカル専用 (DD1) だが古い scaffold
    // では追跡済みになっている場合がある。cli が移行手順を案内のみ表示する (DR12・INV3)。
    trackedModeLocal: detectTrackedModeLocal(targetDir),
  };
}
