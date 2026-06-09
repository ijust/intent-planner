// intent-planner installer
//
// 知能は core 側 (skill) にあり、このモジュールはファイル配置に徹する。
// 非破壊性は computeCopyPlan の純粋関数で構造的に保証する:
// 計画に現れるパスは templates/ 由来のものだけなので、.kiro/ や kiro-* は触れられない。
// fs.cpSync は使わない (ファイル単位のスキップ判定と両立しないため)。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

// 1 つの単一ファイルを計画エントリ化する純粋ヘルパ。ソースが無ければ null。
// 配置先既存かつ !force なら SKIP、それ以外 COPY（既存判定ロジック不変）。
function planFile(from, to, relative, force) {
  if (!fs.existsSync(from)) return null;
  const action = fs.existsSync(to) && !force ? "SKIP" : "COPY";
  return { from, to, relative, action };
}

// srcRoot 配下を再帰走査し destRoot へ相対パス保持でマップした計画エントリ群を返す（純粋）。
function planTree(srcRoot, targetDir, destRoot, force) {
  const entries = [];
  for (const rel of listFilesRecursive(srcRoot)) {
    const from = path.join(srcRoot, rel);
    const to = path.join(targetDir, destRoot, rel);
    const exists = fs.existsSync(to);
    const action = exists && !force ? "SKIP" : "COPY";
    entries.push({ from, to, relative: path.join(destRoot, rel), action });
  }
  return entries;
}

// agent を考慮した COPY/SKIP 計画を合成する純粋関数。ファイルシステムを変更しない。
// agentEntry は options に入れる（位置引数を増やさない）。省略時は claude 既定 =
// 既存3引数呼び出し computeCopyPlan(langRoot, targetDir, {force}) と完全後方互換。
// 構成順序は固定: skill 計画 → intent 計画 → rootDoc 計画。
//   - skill 計画 : <langRoot>/<skillSubdir>/skills/ を <skillDest>/ へ相対保持でマップ。
//                  （claude は <langRoot>/claude/skills/ → .claude/skills/ で現行と一致）
//   - intent 計画: 共有 <langRoot>/intent/ を .intent/ へマップ（agent 不問・常に同じ）。
//   - rootDoc 計画: rootDoc が非 null なら <langRoot>/agents/<agentName>/<rootDoc> を
//                   配置先ルートの <rootDoc> へマップ。
// 返り値: [{ from, to, relative, action: "COPY" | "SKIP" }]
export function computeCopyPlan(
  langRoot,
  targetDir,
  { force = false, agentEntry = AGENT_REGISTRY.claude } = {},
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

  return plan;
}

// 計画を適用する (副作用)。COPY のみ 1 ファイルずつ書き、SKIP は触れない。
// fs.cpSync は使わず、mkdirSync(recursive) + copyFileSync で書く。
// 返り値: { copied: string[], skipped: string[] } (いずれも relative パス)
export function applyPlan(plan) {
  const copied = [];
  const skipped = [];
  for (const entry of plan) {
    if (entry.action === "COPY") {
      fs.mkdirSync(path.dirname(entry.to), { recursive: true });
      fs.copyFileSync(entry.from, entry.to);
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

// インストールのオーケストレーション。
// dryRun 時は計画のみで書き込まない。lang から言語別ルートを解決し、
// 対応言語（ja, en）以外は ja にフォールバックする（langFallback=true・非停止）。
// agent は AGENT_REGISTRY に無ければエラーを投げる（不正 agent はエラー停止・lang の
// ja フォールバックと非対称: agent 違いは想定と異なる形式の配置という破壊的誤りになりうる）。
// 返り値: { copied, skipped, plan, ccSddDetected, langFallback, resolvedLang, agent }
export function install(
  targetDir,
  { force = false, dryRun = false, lang = "ja", agent = "claude", templatesDir } = {},
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
  const plan = computeCopyPlan(langRoot, targetDir, { force, agentEntry });

  let copied = [];
  let skipped = plan.map((e) => e.relative);
  if (!dryRun) {
    const applied = applyPlan(plan);
    copied = applied.copied;
    skipped = applied.skipped;
  } else {
    // dry-run: 適用はしないが、実行時と同じ COPY/SKIP 判定を提示する。
    copied = plan.filter((e) => e.action === "COPY").map((e) => e.relative);
    skipped = plan.filter((e) => e.action === "SKIP").map((e) => e.relative);
  }

  return {
    copied,
    skipped,
    plan,
    ccSddDetected: detectCcSdd(targetDir),
    langFallback,
    resolvedLang,
    agent: agentEntry.agentName,
  };
}
