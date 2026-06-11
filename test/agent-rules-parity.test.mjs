// claude ⇔ codex の skill ツリー汎用パリティテスト (node:test 標準・依存ゼロ)。
//
// 背景 (code-review finding F3):
//   codex ツリーから rules ファイルを ja/en 両言語で対称に削除しても全 suite が green になる
//   穴が実証されていた。理由は既存テストの列挙起点の偏りにある:
//     - agents.test.mjs (3.3-3): rules byte 等価を「codex 起点」で列挙 → codex 側の削除は不可視
//     - structure-pack.test.mjs: ja ⇔ en の比較 → 両言語対称の削除はすり抜ける
//     - lifecycle.test.mjs / poc-coverage.test.mjs: claude 起点の集合一致はあるが
//       対象スキルが lifecycle 4 スキル / poc rules に限定 (piecemeal)
//
// 本ファイルの範囲 (重複させず、起点の偏りを汎用に塞ぐ):
//   1. 各言語で claude/skills と codex/skills の相対パス集合が完全一致
//      (どちら側の追加漏れ・削除も両方向で検出する。SKILL.md / CONTRACT.md は
//       本文が設計上異なるがファイル自体は両側に存在するため集合等価は成立する —
//       2026-06 時点の実態を検証済み: 例外なしの厳密等価)
//   2. 全スキルの rules/*.md について claude ⇔ codex の byte 等価
//      (規約: rules は agent 間で正本共有。claude/codex 両起点の和集合で列挙し、
//       どちら側の片置き・ドリフトも検出する)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const LANGS = ["ja", "en"];

// claude ⇔ codex で byte 差分が設計上許容される rules ファイル (skills ルートからの相対パス)。
// 2026-06 時点で該当なし (全 rules が byte 一致であることを検証済み)。
// 将来 agent 固有の rules 差分を意図的に導入する場合のみ、根拠コメントつきでここへ追加する。
const RULES_BYTE_EQUALITY_EXCEPTIONS = new Set([]);

function skillsRoot(lang, agent) {
  return path.join(REPO_ROOT, "templates", lang, agent, "skills");
}

// dir 配下の全ファイルを相対パスで列挙する (任意のネスト深さ、隠しファイル含む)。
function listRel(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const parent = e.parentPath ?? e.path;
      return path.relative(dir, path.join(parent, e.name));
    })
    .sort();
}

// ---- 1. claude ⇔ codex の相対パス集合の完全一致 (両方向・例外なし) ----

for (const lang of LANGS) {
  test(`agent パリティ: ${lang} の claude/skills と codex/skills の相対パス集合が完全一致`, () => {
    const claudeRel = listRel(skillsRoot(lang, "claude"));
    const codexRel = listRel(skillsRoot(lang, "codex"));
    assert.ok(claudeRel.length > 0, `${lang}/claude/skills にファイルがある`);
    assert.ok(codexRel.length > 0, `${lang}/codex/skills にファイルがある`);

    // 不足/余剰を双方向で名指しする (deepEqual だけより失敗時の診断が速い)。
    const claudeSet = new Set(claudeRel);
    const codexSet = new Set(codexRel);
    const missingInCodex = claudeRel.filter((f) => !codexSet.has(f));
    const missingInClaude = codexRel.filter((f) => !claudeSet.has(f));
    assert.deepEqual(
      missingInCodex,
      [],
      `${lang}: codex 側に欠落 (claude にあって codex にない): ${missingInCodex.join(", ")}`,
    );
    assert.deepEqual(
      missingInClaude,
      [],
      `${lang}: claude 側に欠落 (codex にあって claude にない): ${missingInClaude.join(", ")}`,
    );
    // 念のため集合として完全一致。
    assert.deepEqual(codexRel, claudeRel, `${lang}: claude/codex の相対パス集合が完全一致`);
  });
}

// ---- 2. 全スキルの rules/*.md の claude ⇔ codex byte 等価 (両起点の和集合で列挙) ----

function isRulesFile(rel) {
  return rel.split(path.sep).includes("rules") && rel.endsWith(".md");
}

for (const lang of LANGS) {
  test(`agent パリティ: ${lang} の全 rules/*.md が claude/codex 間で byte 同一`, () => {
    const claudeRoot = skillsRoot(lang, "claude");
    const codexRoot = skillsRoot(lang, "codex");

    // 和集合で列挙: 片側だけに rules を置いた (= もう片側へ置き忘れた) ケースも
    // 「対応物の不在」としてここで検出する。
    const rulesRel = [
      ...new Set([...listRel(claudeRoot), ...listRel(codexRoot)].filter(isRulesFile)),
    ].sort();
    assert.ok(rulesRel.length > 0, `${lang}: rules ファイルが存在する`);

    for (const rel of rulesRel) {
      if (RULES_BYTE_EQUALITY_EXCEPTIONS.has(rel)) continue;
      const claudeFile = path.join(claudeRoot, rel);
      const codexFile = path.join(codexRoot, rel);
      assert.ok(fs.existsSync(claudeFile), `${lang}: claude 側に rules 対応物がある: ${rel}`);
      assert.ok(fs.existsSync(codexFile), `${lang}: codex 側に rules 対応物がある: ${rel}`);
      const a = fs.readFileSync(claudeFile);
      const b = fs.readFileSync(codexFile);
      assert.ok(
        a.equals(b),
        `${lang}/skills/${rel} が claude/codex 間で byte 同一 (ドリフトしていない)`,
      );
    }
  });
}
