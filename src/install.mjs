// intent-planner installer
//
// 知能は core 側 (skill) にあり、このモジュールはファイル配置に徹する。
// 非破壊性は computeCopyPlan の純粋関数で構造的に保証する:
// 計画に現れるパスは templates/ 由来のものだけなので、.kiro/ や kiro-* は触れられない。
// fs.cpSync は使わない (ファイル単位のスキップ判定と両立しないため)。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// templates/ をコピー元 → 配置先サブディレクトリへ対応づける。
// templates/claude/...  -> <target>/.claude/...
// templates/intent/...  -> <target>/.intent/...
const COPY_ROOTS = [
  { src: "claude", dest: ".claude" },
  { src: "intent", dest: ".intent" },
];

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

// コピー計画を算出する純粋関数。ファイルシステムを変更しない。
// 返り値: [{ from, to, relative, action: "COPY" | "SKIP" }]
export function computeCopyPlan(templatesDir, targetDir, { force = false } = {}) {
  const plan = [];
  for (const root of COPY_ROOTS) {
    const srcRoot = path.join(templatesDir, root.src);
    for (const rel of listFilesRecursive(srcRoot)) {
      const from = path.join(srcRoot, rel);
      const to = path.join(targetDir, root.dest, rel);
      const exists = fs.existsSync(to);
      const action = exists && !force ? "SKIP" : "COPY";
      plan.push({ from, to, relative: path.join(root.dest, rel), action });
    }
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
// 返り値: { copied, skipped, plan, ccSddDetected, langFallback, resolvedLang }
export function install(targetDir, { force = false, dryRun = false, lang = "ja", templatesDir } = {}) {
  const tmpl = templatesDir ?? defaultTemplatesDir();
  if (!fs.existsSync(tmpl)) {
    throw new Error(
      `templates が見つかりません: ${tmpl}\nパッケージが壊れている可能性があります。再インストールしてください。`,
    );
  }

  // 言語別ルートを解決し、解決済みルートをコピー計画算出に渡す。
  // langFallback は resolveLangRoot 由来（対応集合外なら true。旧 lang !== "ja" を置換）。
  const { langRoot, langFallback, resolvedLang } = resolveLangRoot(tmpl, lang);
  const plan = computeCopyPlan(langRoot, targetDir, { force });

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
  };
}
