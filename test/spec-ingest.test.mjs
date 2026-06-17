// intent-from-spec (spec-ingest) 専用テスト (node:test 標準・依存ゼロ)。
// Req 1.1 / 1.2 / 1.3 / 2.1 / 3.1 / 4.1 / 4.3 / 5.1 / 5.2 / 5.3 / 5.4 / 5.5 / 5.6。
//
// 範囲: 既に実装・コミット済みの intent-from-spec 成果物 (4系統の SKILL.md + rules、
//   install の gitignore 登録、scaffold README) のプロパティを READ-ONLY で検証する。
//   本ファイルはテンプレートも install.mjs も他テストも変更しない。検証は次の8群:
//     1. 4系統 (ja/en × claude/codex) の SKILL.md + 4 rules が全て存在する (5.5)。
//     2. intent-from-spec サブツリーの en/ja ファイル集合が agent 毎に 1:1 一致 (5.5)。
//     3. claude SKILL.md frontmatter が必須5フィールドを持ち allowed-tools に Write を含み name が一致 (5.6)。
//     4. codex SKILL.md frontmatter は name+description のみ (claude 専用フィールドは不在)。
//     5. install の gitignore 登録: temp dir 実インストールで spec-ingest 2パターンが書かれ scaffold README が配置される (5.3)。
//     6. SKILL.md の書込み境界が `.intent/spec-ingest/` 限定で canonical 正本へ書かない (4.3 / 5.2)。
//     7. gap-readout / load-bearing が物差し (validate-checks.md / decision-slots.md) を参照する (2.1 / 3.1 / 1.1)。
//     8. byte-lock 台帳 (standard-invariance) に intent-from-spec ファイルが混入していない (5.4)。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { install } from "../src/install.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];
const SKILL = "intent-from-spec";
const RULE_NAMES = ["extract-intent", "gap-readout", "load-bearing", "omission-recap"];

// claude SKILL.md frontmatter の必須フィールド (structure-pack.test.mjs と同一契約)。
// intent-from-spec は auto-invocable のため disable-model-invocation は必須から除外。
const REQUIRED_CLAUDE_FIELDS = [
  "name",
  "description",
  "allowed-tools",
  "argument-hint",
];

// claude 固有 (codex frontmatter には現れてはならない) フィールド。
const CLAUDE_ONLY_FIELDS = ["allowed-tools", "argument-hint", "disable-model-invocation"];

// intent-from-spec スキルディレクトリの絶対パス。
function skillDir(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", SKILL);
}

// 先頭 `---` フェンス間を frontmatter として読み `key: value` を素朴抽出する (yaml 依存なし)。
// 解析方式は structure-pack.test.mjs の parseFrontmatter と同じ。
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

// dir 配下の全ファイルを相対パスで列挙する (任意ネスト・隠しファイル含む)。
// install.test.mjs / structure-pack.test.mjs の列挙ヘルパと同一方式。
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

function tmpDir(prefix = "ip-spec-ingest-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ---- 群1: 4系統の SKILL.md + 4 rules が全て存在する (Req 5.5) ----
// 期待: 4 SKILL.md + 16 rule files = 20 ファイル。1つでも欠ければ落ちる。

test("群1: 4系統 (ja/en × claude/codex) に SKILL.md + 4 rules が全て存在する (5.5)", () => {
  let skillCount = 0;
  let ruleCount = 0;
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const dir = skillDir(lang, agent);
      const skillPath = path.join(dir, "SKILL.md");
      assert.ok(fs.existsSync(skillPath), `SKILL.md が実在する: ${lang}/${agent}`);
      skillCount++;
      for (const rule of RULE_NAMES) {
        const rulePath = path.join(dir, "rules", `${rule}.md`);
        assert.ok(fs.existsSync(rulePath), `rule が実在する: ${lang}/${agent}/rules/${rule}.md`);
        ruleCount++;
      }
    }
  }
  assert.equal(skillCount, 4, "SKILL.md は4系統ちょうど");
  assert.equal(ruleCount, 16, "rule は 4系統 × 4種 = 16 ちょうど");
});

// ---- 群2: en/ja のファイル集合が agent 毎に 1:1 一致 (Req 5.5) ----
// intent-from-spec サブツリーに範囲を限定し、ja↔en の相対パス集合が翻訳漏れ・余剰なく一致することを検証する。

for (const agent of AGENTS) {
  test(`群2: ${agent} の intent-from-spec サブツリーが ja/en で 1:1 一致 (5.5)`, () => {
    const jaRel = listRel(skillDir("ja", agent));
    const enRel = listRel(skillDir("en", agent));
    assert.ok(jaRel.length > 0, `${agent}: ja サブツリーにファイルがある`);

    const jaSet = new Set(jaRel);
    const enSet = new Set(enRel);
    const missingInEn = jaRel.filter((f) => !enSet.has(f));
    const missingInJa = enRel.filter((f) => !jaSet.has(f));
    assert.deepEqual(missingInEn, [], `${agent}: en に欠落 (ja にあって en にない): ${missingInEn.join(", ")}`);
    assert.deepEqual(missingInJa, [], `${agent}: ja に欠落 (en にあって ja にない): ${missingInJa.join(", ")}`);
    assert.deepEqual(enRel, jaRel, `${agent}: ja/en の相対パス集合が完全一致`);
    // SKILL.md と 4 rules が確かに含まれる (空集合の偽陽性防止)。
    assert.ok(jaRel.includes("SKILL.md"), `${agent}: 集合に SKILL.md を含む`);
    for (const rule of RULE_NAMES) {
      assert.ok(
        jaRel.includes(path.join("rules", `${rule}.md`)),
        `${agent}: 集合に rules/${rule}.md を含む`,
      );
    }
  });
}

// ---- 群3: claude SKILL.md frontmatter 必須フィールド + Write (Req 5.6) ----

for (const lang of LANGS) {
  test(`群3: ${lang}/claude SKILL.md は必須5フィールドを持ち allowed-tools に Write を含む (5.6)`, () => {
    const skillPath = path.join(skillDir(lang, "claude"), "SKILL.md");
    const fm = parseFrontmatter(skillPath);

    for (const field of REQUIRED_CLAUDE_FIELDS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(fm, field),
        `${lang}/claude: frontmatter に ${field} がある`,
      );
      assert.ok(fm[field].length > 0, `${lang}/claude: ${field} が空でない`);
    }

    // name はスキルディレクトリ名と一致する。
    assert.equal(fm.name, SKILL, `${lang}/claude: name が ${SKILL} と一致する`);

    // allowed-tools に Write がトークンとして含まれる (Write 権限付与の確認)。
    const tools = fm["allowed-tools"].split(",").map((t) => t.trim());
    assert.ok(
      tools.includes("Write"),
      `${lang}/claude: allowed-tools に Write を含む (実値: ${fm["allowed-tools"]})`,
    );
  });
}

// ---- 群4: codex SKILL.md frontmatter は最小化 (name + description のみ) ----
// claude 専用フィールド (allowed-tools / argument-hint / disable-model-invocation) は不在であること。

for (const lang of LANGS) {
  test(`群4: ${lang}/codex SKILL.md frontmatter は name+description のみ (claude 専用フィールド不在)`, () => {
    const skillPath = path.join(skillDir(lang, "codex"), "SKILL.md");
    const fm = parseFrontmatter(skillPath);

    // name と description は存在し空でない。
    for (const field of ["name", "description"]) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(fm, field),
        `${lang}/codex: frontmatter に ${field} がある`,
      );
      assert.ok(fm[field].length > 0, `${lang}/codex: ${field} が空でない`);
    }
    assert.equal(fm.name, SKILL, `${lang}/codex: name が ${SKILL} と一致する`);

    // claude 専用フィールドは1つも存在しない (最小化の核心)。
    for (const field of CLAUDE_ONLY_FIELDS) {
      assert.ok(
        !Object.prototype.hasOwnProperty.call(fm, field),
        `${lang}/codex: frontmatter に claude 専用フィールド ${field} を含まない`,
      );
    }
    // frontmatter のキーは name と description の2つちょうど (余剰キーなし)。
    assert.deepEqual(
      Object.keys(fm).sort(),
      ["description", "name"],
      `${lang}/codex: frontmatter キーは name と description のみ`,
    );
  });
}

// ---- 群5: install の gitignore 登録と scaffold README 配置 (Req 5.3) ----
// install.test.mjs と同じ install() エントリポイントを使い、temp dir に実インストールする。
// git リポジトリ相当 (.git 存在) で .gitignore に spec-ingest の 2 パターンが書かれ、
// scaffold README が配置されることを検証する。

test("群5: 実インストールで .gitignore に spec-ingest 2パターンが登録され scaffold README が配置される (5.3)", () => {
  const tgt = tmpDir();
  try {
    // .git を置くことで gitignore 整備が走る (install.test.mjs の gitignore テストと同じ前提)。
    fs.mkdirSync(path.join(tgt, ".git"));

    const result = install(tgt, {});
    assert.equal(result.gitignore, "create", ".gitignore 不在なので create");

    const gi = fs.readFileSync(path.join(tgt, ".gitignore"), "utf8");
    assert.ok(
      gi.includes("\n.intent/spec-ingest/*\n") || gi.includes(".intent/spec-ingest/*\n"),
      `.gitignore に除外行 .intent/spec-ingest/* がある: \n${gi}`,
    );
    assert.ok(
      gi.includes("!.intent/spec-ingest/README.md\n"),
      `.gitignore に再包含行 !.intent/spec-ingest/README.md がある: \n${gi}`,
    );
    // 除外行 → 再包含行の順序 (再包含は除外の後でなければ効かない)。
    assert.ok(
      gi.indexOf(".intent/spec-ingest/*") < gi.indexOf("!.intent/spec-ingest/README.md"),
      "除外行が README 再包含行より前にある",
    );

    // scaffold README が配置される (再包含されるファイルが実在する)。
    const readme = path.join(tgt, ".intent", "spec-ingest", "README.md");
    assert.ok(fs.existsSync(readme), "scaffold README (.intent/spec-ingest/README.md) が配置される");
    assert.ok(fs.statSync(readme).size > 0, "scaffold README が空でない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- 群6: SKILL.md の書込み境界 (Req 4.3 / 5.2) ----
// 全4系統の SKILL.md が書込み先を `.intent/spec-ingest/` 配下に限定し、
// canonical 正本 (intent-tree.md / intent-compass.md) へ書く指示を持たないことをテキスト検査する。

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群6: ${lang}/${agent} SKILL.md の書込み先は .intent/spec-ingest/ 限定で canonical 正本へ書かない (4.3/5.2)`, () => {
      const skillPath = path.join(skillDir(lang, agent), "SKILL.md");
      const content = fs.readFileSync(skillPath, "utf8");

      // 書込み境界として `.intent/spec-ingest/` を明示している。
      assert.ok(
        content.includes(".intent/spec-ingest/"),
        `${lang}/${agent}: SKILL.md が .intent/spec-ingest/ を書込み先として明示する`,
      );

      // canonical な正本ファイル名への書込み指示が現れない (read-only 規律)。
      // ファイル名が本文に一切現れないことで「canonical へ書く」導線が無いことを示す。
      assert.ok(
        !content.includes("intent-tree.md"),
        `${lang}/${agent}: SKILL.md に canonical intent-tree.md への言及がない`,
      );
      assert.ok(
        !content.includes("intent-compass.md"),
        `${lang}/${agent}: SKILL.md に canonical intent-compass.md への言及がない`,
      );
    });
  }
}

// ---- 群7: gap-readout / load-bearing が物差しを参照する (Req 2.1 / 3.1 / 1.1) ----
// 物差し (validate-checks.md / decision-slots.md) を再実装せず、ファイル名で参照していることを検証する。

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群7: ${lang}/${agent} gap-readout は validate-checks.md と decision-slots.md を参照する (2.1)`, () => {
      const rulePath = path.join(skillDir(lang, agent), "rules", "gap-readout.md");
      const content = fs.readFileSync(rulePath, "utf8");
      assert.ok(
        content.includes("validate-checks.md"),
        `${lang}/${agent}: gap-readout が validate-checks.md を参照する`,
      );
      assert.ok(
        content.includes("decision-slots.md"),
        `${lang}/${agent}: gap-readout が decision-slots.md を参照する`,
      );
    });

    test(`群7: ${lang}/${agent} load-bearing は decision-slots.md を参照する (3.1)`, () => {
      const rulePath = path.join(skillDir(lang, agent), "rules", "load-bearing.md");
      const content = fs.readFileSync(rulePath, "utf8");
      assert.ok(
        content.includes("decision-slots.md"),
        `${lang}/${agent}: load-bearing が decision-slots.md を参照する`,
      );
    });
  }
}

// ---- 群8: byte-lock 台帳に intent-from-spec が混入していない (Req 5.4) ----
// standard-invariance.test.mjs の BYTE_LOCKED_FILES / FRONTMATTER_LOCKED / INSTALLER_LOCKED_FILES /
// SKILL_BODY_LOCKED に intent-from-spec のファイルが登録されていないことを構造的に確認する。
// (既存スキル・rules の byte-lock 群に新スキルを混ぜないことの確認。実 enforcement は
//  standard-invariance 自体が green であることが担う。)

test("群8: standard-invariance の byte-lock 台帳に intent-from-spec ファイルが混入していない (5.4)", () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, "test", "standard-invariance.test.mjs"), "utf8");

  // 各 lock 台帳ブロックを抽出し、その中に登録された「キー (lock 対象の相対パス文字列リテラル)」を
  // 取り出して検査する。説明コメントには spec-ingest 等の語が現れる (install.mjs の gitignore 追記の
  // 由来説明) ため、コメントではなく実際の lock キーのみを対象にする。
  // ブロックは `const NAME = {` から対応する `};` までを素朴に切り出す。
  const LEDGER_NAMES = [
    "BYTE_LOCKED_FILES",
    "FRONTMATTER_LOCKED",
    "INSTALLER_LOCKED_FILES",
    "SKILL_BODY_LOCKED",
  ];

  function ledgerKeys(name) {
    const start = src.indexOf(`const ${name} = {`);
    assert.notEqual(start, -1, `${name} 台帳がソースに存在する (前提)`);
    const end = src.indexOf("\n};", start);
    assert.notEqual(end, -1, `${name} 台帳の閉じ }; がある (前提)`);
    const block = src.slice(start, end);
    // キーは `"<rel path>":` 形式のダブルクオート文字列リテラル。コメント (// 始まり) は除く。
    const keys = [];
    for (const line of block.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("//")) continue;
      const m = trimmed.match(/^"([^"]+)":/);
      if (m) keys.push(m[1]);
    }
    return keys;
  }

  for (const name of LEDGER_NAMES) {
    const keys = ledgerKeys(name);
    assert.ok(keys.length > 0, `${name} に lock キーが1件以上ある (抽出が機能している前提)`);
    const offenders = keys.filter(
      (k) => k.includes("intent-from-spec") || k.includes("spec-ingest"),
    );
    assert.deepEqual(
      offenders,
      [],
      `${name} に intent-from-spec / spec-ingest の lock キーが混入していない (新スキルを既存 byte-lock に混ぜない): ${offenders.join(", ")}`,
    );
  }
});
