// 構造検証 + パッケージング検証 (node:test 標準・依存ゼロ)
// 4.3: en frontmatter 規約 / en・ja ファイル集合 1:1 / npm pack に en・ja 同梱・test 除外。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const EN_ROOT = path.join(TEMPLATES, "en");
const JA_ROOT = path.join(TEMPLATES, "ja");

// en の skill ディレクトリ名 (= name 期待値)。基盤4 + lifecycle 4。
const EN_SKILL_NAMES = [
  "intent-discover",
  "intent-compass",
  "intent-packets",
  "intent-export-cc-sdd",
  "intent-status",
  "intent-validate",
  "intent-improve",
  "intent-writeback",
  "intent-overview",
  "intent-from-spec",
  "intent-to-spec",
];

// frontmatter 必須フィールド (core 契約)。
const REQUIRED_FRONTMATTER_FIELDS = [
  "name",
  "description",
  "allowed-tools",
  "argument-hint",
  "disable-model-invocation",
];

// 先頭の `---` フェンス間を frontmatter として読み、`key: value` を素朴に抽出する (yaml 依存なし)。
function parseFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  assert.equal(lines[0].trim(), "---", `${filePath}: 先頭が --- フェンス`);
  const fields = {};
  let closed = false;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closed = true;
      break;
    }
    const m = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  assert.ok(closed, `${filePath}: 閉じ --- フェンスが存在する`);
  return fields;
}

// 言語ルート配下の全ファイルを相対パスで列挙する (任意ネスト・隠しファイル含む)。
function listFiles(root) {
  return fs
    .readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const parent = entry.parentPath ?? entry.path;
      return path.relative(root, path.join(parent, entry.name));
    });
}

// ---- 4.3 構造: en SKILL.md の frontmatter 規約 (Req 5.2 / 5.3) ----

for (const skillName of EN_SKILL_NAMES) {
  test(`en frontmatter: ${skillName} は必須5フィールドを持ち name が規約に従う`, () => {
    const skillPath = path.join(EN_ROOT, "claude", "skills", skillName, "SKILL.md");
    assert.ok(fs.existsSync(skillPath), `SKILL.md が実在する: ${skillPath}`);

    const fm = parseFrontmatter(skillPath);

    // 必須5フィールドがすべて存在し、空でない。
    for (const field of REQUIRED_FRONTMATTER_FIELDS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(fm, field),
        `${skillName}: frontmatter に ${field} がある`,
      );
      assert.ok(fm[field].length > 0, `${skillName}: ${field} が空でない`);
    }

    // name は intent-* で始まり、ディレクトリ名と一致する。
    assert.ok(fm.name.startsWith("intent-"), `${skillName}: name が intent- で始まる`);
    assert.equal(fm.name, skillName, `${skillName}: name がディレクトリ名と一致する`);

    // name は kiro-* と衝突しない (cc-sdd 非衝突)。
    assert.ok(!fm.name.startsWith("kiro-"), `${skillName}: name が kiro- で始まらない`);
  });
}

// ---- 4.3 構造: en/ja ファイル集合の 1:1 一致 (Req 5.2 / 6.2 — 翻訳漏れ・余剰なし) ----

test("en/ja のファイル集合が 1:1 一致 (翻訳漏れ・余剰なし)", () => {
  const enFiles = new Set(listFiles(EN_ROOT));
  const jaFiles = new Set(listFiles(JA_ROOT));

  const missingInEn = [...jaFiles].filter((f) => !enFiles.has(f)).sort();
  const surplusInEn = [...enFiles].filter((f) => !jaFiles.has(f)).sort();

  assert.deepEqual(missingInEn, [], `en に欠落 (ja にあって en にない): ${missingInEn.join(", ")}`);
  assert.deepEqual(surplusInEn, [], `en に余剰 (en にあって ja にない): ${surplusInEn.join(", ")}`);

  // 念のため集合として完全一致 (件数 > 0)。
  assert.ok(enFiles.size > 0, "en は空でない");
  assert.deepEqual(
    [...enFiles].sort(),
    [...jaFiles].sort(),
    "en/ja の相対パス集合が完全一致",
  );
});

// ---- 4.3 パッケージング: npm pack --dry-run --json に en・ja 同梱 / test 除外 (Req 5.4 / 6.4) ----

test("npm pack の成果物に templates/ja/** と templates/en/** が含まれ test/ を含まない", () => {
  // --dry-run --json は files[].path を構造化 JSON で返す (テキスト走査より堅牢)。
  // 実際に npm pack を起動して実成果物リストを検査する (ハードコードではない)。
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    // npm の進捗/警告は STDERR。JSON は STDOUT に出るので STDOUT のみ解析する。
  });

  const parsed = JSON.parse(raw);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  assert.ok(entry && Array.isArray(entry.files), "pack JSON に files 配列がある");

  // path は posix 区切り正規化されている前提だが、念のため正規化する。
  const paths = entry.files.map((f) => f.path.split(path.sep).join("/"));

  assert.ok(
    paths.some((p) => p.startsWith("templates/ja/")),
    `成果物に templates/ja/ 配下が含まれる: ${paths.join(", ")}`,
  );
  assert.ok(
    paths.some((p) => p.startsWith("templates/en/")),
    `成果物に templates/en/ 配下が含まれる: ${paths.join(", ")}`,
  );
  assert.ok(
    !paths.some((p) => p.startsWith("test/")),
    `成果物に test/ 配下を含まない: ${paths.filter((p) => p.startsWith("test/")).join(", ")}`,
  );
});
