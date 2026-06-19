// intent-to-spec (nl-spec-export) 専用テスト (node:test 標準・依存ゼロ)。
// Req 3.1 / 3.4 / 4.1 / 4.3 / 5.1 / 5.2 / 5.3 / 5.4 / 5.5。
//
// 範囲: 既に実装・コミット済みの intent-to-spec 成果物 (4系統の SKILL.md + rules、
//   install の gitignore 登録、scaffold README) のプロパティを READ-ONLY で検証する。
//   本ファイルはテンプレートも install.mjs も他テストも変更しない。検証は次の10群:
//     1.  4系統 (ja/en × claude/codex) の SKILL.md + 5 rules が全て存在する (5.4)。
//     2.  intent-to-spec サブツリーの en/ja ファイル集合が agent 毎に 1:1 一致 (5.4)。
//     3.  claude SKILL.md frontmatter が必須5フィールドを持ち allowed-tools に Write を含み name が一致 (5.5)。
//     4.  codex SKILL.md frontmatter は name+description のみ (claude 専用フィールドは不在)。
//     5.  install の gitignore 登録: temp dir 実インストールで nl-spec 2パターンが書かれ scaffold README が配置される (5.1)。
//     6.  SKILL.md の書込み境界が `.intent/nl-spec/` 限定で canonical 正本へ書かない (4.1 / 4.3)。
//     7.  fabrication-guard が「トレース付与・inferred 標識・不変則保持」を要求する (3.1 / 3.4)。
//     8.  source-scope / fabrication-guard が agent 固有語 (AskUserQuestion 等) を含まず agent 中立 (rules byte 同一の前提)。
//     9.  map-cc-sdd.md と export-cc-sdd SKILL.md が本機能に触れられていない (intent-to-spec を参照しない。5.3)。
//     10. byte-lock 台帳 (standard-invariance) に intent-to-spec / nl-spec ファイルが混入していない (5.2)。
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
const SKILL = "intent-to-spec";
const RULE_NAMES = ["source-scope", "format-upstream", "format-integrated", "format-nonprogram", "fabrication-guard"];

// claude SKILL.md frontmatter の必須フィールド (spec-ingest.test.mjs と同一契約)。
// intent-to-spec は auto-invocable のため disable-model-invocation は必須から除外。
const REQUIRED_CLAUDE_FIELDS = [
  "name",
  "description",
  "allowed-tools",
  "argument-hint",
];

// claude 固有 (codex frontmatter には現れてはならない) フィールド。
const CLAUDE_ONLY_FIELDS = ["allowed-tools", "argument-hint", "disable-model-invocation"];

// intent-to-spec スキルディレクトリの絶対パス。
function skillDir(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", SKILL);
}

// 先頭 `---` フェンス間を frontmatter として読み `key: value` を素朴抽出する (yaml 依存なし)。
// 解析方式は spec-ingest.test.mjs の parseFrontmatter と同じ。
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
// install.test.mjs / spec-ingest.test.mjs の列挙ヘルパと同一方式。
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

function tmpDir(prefix = "ip-nl-spec-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ---- 群1: 4系統の SKILL.md + 5 rules が全て存在する (Req 5.4) ----
// 期待: 4 SKILL.md + 20 rule files = 24 ファイル。1つでも欠ければ落ちる。

test("群1: 4系統 (ja/en × claude/codex) に SKILL.md + 5 rules が全て存在する (5.4)", () => {
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
  assert.equal(ruleCount, 20, "rule は 4系統 × 5種 = 20 ちょうど");
});

// ---- 群2: en/ja のファイル集合が agent 毎に 1:1 一致 (Req 5.4) ----
// intent-to-spec サブツリーに範囲を限定し、ja↔en の相対パス集合が翻訳漏れ・余剰なく一致することを検証する。

for (const agent of AGENTS) {
  test(`群2: ${agent} の intent-to-spec サブツリーが ja/en で 1:1 一致 (5.4)`, () => {
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
    // SKILL.md と 5 rules が確かに含まれる (空集合の偽陽性防止)。
    assert.ok(jaRel.includes("SKILL.md"), `${agent}: 集合に SKILL.md を含む`);
    for (const rule of RULE_NAMES) {
      assert.ok(
        jaRel.includes(path.join("rules", `${rule}.md`)),
        `${agent}: 集合に rules/${rule}.md を含む`,
      );
    }
  });
}

// ---- 群3: claude SKILL.md frontmatter 必須フィールド + Write (Req 5.5) ----

for (const lang of LANGS) {
  test(`群3: ${lang}/claude SKILL.md は必須5フィールドを持ち allowed-tools に Write を含む (5.5)`, () => {
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

    // allowed-tools に Write がトークンとして含まれる (派生 Write 権限付与の確認・本機能の核心)。
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

// ---- 群5: install の gitignore 登録と scaffold README 配置 (Req 5.1) ----
// install.test.mjs と同じ install() エントリポイントを使い、temp dir に実インストールする。
// git リポジトリ相当 (.git 存在) で .gitignore に nl-spec の 2 パターンが書かれ、
// scaffold README が配置されることを検証する (spec-ingest.test.mjs 群5 と同型)。

test("群5: 実インストールで .gitignore に nl-spec 2パターンが登録され scaffold README が配置される (5.1)", () => {
  const tgt = tmpDir();
  try {
    // .git を置くことで gitignore 整備が走る (install.test.mjs の gitignore テストと同じ前提)。
    fs.mkdirSync(path.join(tgt, ".git"));

    const result = install(tgt, {});
    assert.equal(result.gitignore, "create", ".gitignore 不在なので create");

    const gi = fs.readFileSync(path.join(tgt, ".gitignore"), "utf8");
    assert.ok(
      gi.includes("\n.intent/nl-spec/*\n") || gi.includes(".intent/nl-spec/*\n"),
      `.gitignore に除外行 .intent/nl-spec/* がある: \n${gi}`,
    );
    assert.ok(
      gi.includes("!.intent/nl-spec/README.md\n"),
      `.gitignore に再包含行 !.intent/nl-spec/README.md がある: \n${gi}`,
    );
    // 除外行 → 再包含行の順序 (再包含は除外の後でなければ効かない)。
    assert.ok(
      gi.indexOf(".intent/nl-spec/*") < gi.indexOf("!.intent/nl-spec/README.md"),
      "除外行が README 再包含行より前にある",
    );

    // scaffold README が配置される (再包含されるファイルが実在する)。
    const readme = path.join(tgt, ".intent", "nl-spec", "README.md");
    assert.ok(fs.existsSync(readme), "scaffold README (.intent/nl-spec/README.md) が配置される");
    assert.ok(fs.statSync(readme).size > 0, "scaffold README が空でない");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- 群6: SKILL.md の書込み境界 (Req 4.1 / 4.3) ----
// 全4系統の SKILL.md が書込み先を `.intent/nl-spec/` 配下に限定し、
// canonical 正本 (intent-tree.md / intent-compass.md / packets) へ書く指示を持たないことをテキスト検査する。

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群6: ${lang}/${agent} SKILL.md の書込み先は .intent/nl-spec/ 限定で canonical 正本へ書かない (4.1/4.3)`, () => {
      const skillPath = path.join(skillDir(lang, agent), "SKILL.md");
      const content = fs.readFileSync(skillPath, "utf8");

      // 書込み境界として `.intent/nl-spec/` を明示している。
      assert.ok(
        content.includes(".intent/nl-spec/"),
        `${lang}/${agent}: SKILL.md が .intent/nl-spec/ を書込み先として明示する`,
      );

      // canonical な正本ツリーを「書込み先」として宣言する指示が現れないことを、否定文脈とともに確認する。
      // intent-tree / intent-compass / packets は read-only 素材としてのみ言及され、書込み対象にしない。
      // (read-only 規律: これらへの作成・変更・削除を行わない旨が明文化されている。)
      assert.ok(
        content.includes("read-only") || content.includes("読み取りのみ") || content.includes("read only"),
        `${lang}/${agent}: SKILL.md が射影元の read-only (読み取りのみ) 規律を明示する`,
      );
      // canonical へ書き込む導線がないこと: 「全置換で書き込む」対象が nl-spec 配下のみであることを確認。
      // SKILL.md が `.intent/intent-tree.md` / `.intent/intent-compass.md` へ Write する指示を持たない。
      // (これらは素材として読まれるが、書込み対象としては現れない。)
      const writesCanonical =
        /Write[^\n]*intent-tree\.md/.test(content) ||
        /Write[^\n]*intent-compass\.md/.test(content) ||
        /intent-tree\.md[^\n]*(へ|に)[^\n]*書/.test(content) ||
        /intent-compass\.md[^\n]*(へ|に)[^\n]*書/.test(content);
      assert.ok(
        !writesCanonical,
        `${lang}/${agent}: SKILL.md が canonical (intent-tree/compass) への書込み導線を持たない`,
      );
    });
  }
}

// ---- 群7: fabrication-guard が3機構を要求する (Req 3.1 / 3.4) ----
// 捏造抑制ルールが「トレース付与・inferred 標識・不変則保持」を要求していることをテキスト検査する。
// 言語別トークン: ja=トレース/inferred/不変則, en=trace/inferred/invariant。

const FABRICATION_TOKENS = {
  ja: { trace: "トレース", inferred: "inferred", invariant: "不変則" },
  en: { trace: "trace", inferred: "inferred", invariant: "invariant" },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群7: ${lang}/${agent} fabrication-guard はトレース付与・inferred 標識・不変則保持を要求する (3.1/3.4)`, () => {
      const rulePath = path.join(skillDir(lang, agent), "rules", "fabrication-guard.md");
      const content = fs.readFileSync(rulePath, "utf8");
      const lower = content.toLowerCase();
      const tok = FABRICATION_TOKENS[lang];

      // トレース付与 (Req 3.1): 各記述を射影元へ辿れる形にする要求。
      assert.ok(
        content.includes(tok.trace) || lower.includes(tok.trace.toLowerCase()),
        `${lang}/${agent}: fabrication-guard がトレース付与 (${tok.trace}) を要求する`,
      );
      // inferred 標識 (Req 3.2 系・捏造抑制の核): 根拠のない記述を inferred として標識。
      assert.ok(
        lower.includes(tok.inferred),
        `${lang}/${agent}: fabrication-guard が inferred 標識を要求する`,
      );
      // 不変則保持 (Req 3.4): 射影元の不変則・制約を省略・改変せず保持する要求。
      assert.ok(
        content.includes(tok.invariant) || lower.includes(tok.invariant.toLowerCase()),
        `${lang}/${agent}: fabrication-guard が不変則保持 (${tok.invariant}) を要求する`,
      );
      // Req 番号での明示参照 (3.1 と 3.4 の両方を取り扱う)。
      assert.ok(content.includes("3.1"), `${lang}/${agent}: fabrication-guard が Req 3.1 を扱う`);
      assert.ok(content.includes("3.4"), `${lang}/${agent}: fabrication-guard が Req 3.4 を扱う`);
    });
  }
}

// ---- 群8: source-scope / fabrication-guard の agent 中立性 ----
// これらの rules は claude↔codex で byte 同一に共有されるため、agent 固有の語
// (AskUserQuestion 等のツール呼び出し構文) を含んではならない。
// claude SKILL.md は AskUserQuestion を使うが、共有 rules には漏らさないことを確認する。

const AGENT_SPECIFIC_TOKENS = ["AskUserQuestion"];

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    for (const ruleName of ["source-scope", "fabrication-guard"]) {
      test(`群8: ${lang}/${agent} ${ruleName} は agent 固有語を含まず agent 中立 (rules byte 同一の前提)`, () => {
        const rulePath = path.join(skillDir(lang, agent), "rules", `${ruleName}.md`);
        const content = fs.readFileSync(rulePath, "utf8");
        for (const token of AGENT_SPECIFIC_TOKENS) {
          assert.ok(
            !content.includes(token),
            `${lang}/${agent}: ${ruleName} に agent 固有語 ${token} を含まない (共有 rules は agent 中立)`,
          );
        }
      });
    }
  }

  // 補強: source-scope / fabrication-guard が claude↔codex で byte 同一であること
  // (agent 中立に書けている前提が実際に守られている直接証拠)。
  for (const ruleName of ["source-scope", "fabrication-guard"]) {
    test(`群8: ${lang} ${ruleName} は claude↔codex で byte 同一 (共有 rules)`, () => {
      const claudeBuf = fs.readFileSync(path.join(skillDir(lang, "claude"), "rules", `${ruleName}.md`));
      const codexBuf = fs.readFileSync(path.join(skillDir(lang, "codex"), "rules", `${ruleName}.md`));
      assert.ok(
        claudeBuf.equals(codexBuf),
        `${lang}: ${ruleName} が claude↔codex で byte 同一 (agent 中立の実証)`,
      );
    });
  }
}

// ---- 群9: map-cc-sdd.md と export-cc-sdd SKILL.md が本機能に触れられていない (Req 5.3) ----
// 本機能は別スキル (intent-to-spec) として追加され、cc-sdd 写像 (map-cc-sdd) や
// export-cc-sdd SKILL.md の振る舞いを変更しない。これらが実在し、かつ intent-to-spec を
// 参照していない (＝本機能の責務を取り込んでいない) ことを確認する。
// (実 enforcement のバイト等価性は standard-invariance の byte-lock が担う。ここでは非接触の補強。)

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群9: ${lang}/${agent} export-cc-sdd SKILL.md / map-cc-sdd.md が実在し intent-to-spec を参照しない (5.3)`, () => {
      const exportSkill = path.join(
        TEMPLATES, lang, agent, "skills", "intent-export-cc-sdd", "SKILL.md",
      );
      const mapRule = path.join(
        TEMPLATES, lang, agent, "skills", "intent-export-cc-sdd", "rules", "map-cc-sdd.md",
      );
      assert.ok(fs.existsSync(exportSkill), `${lang}/${agent}: export-cc-sdd SKILL.md が実在する`);
      assert.ok(fs.existsSync(mapRule), `${lang}/${agent}: map-cc-sdd.md が実在する`);

      const exportContent = fs.readFileSync(exportSkill, "utf8");
      const mapContent = fs.readFileSync(mapRule, "utf8");
      assert.ok(
        !exportContent.includes("intent-to-spec"),
        `${lang}/${agent}: export-cc-sdd SKILL.md が intent-to-spec を参照しない (非接触)`,
      );
      assert.ok(
        !mapContent.includes("intent-to-spec"),
        `${lang}/${agent}: map-cc-sdd.md が intent-to-spec を参照しない (非接触)`,
      );
      // 逆向きの境界: intent-to-spec の SKILL.md は map-cc-sdd を呼ばない旨を明示する
      // (cc-sdd 写像は export-cc-sdd の所有である、という所有境界の宣言)。
      const ourSkill = fs.readFileSync(path.join(skillDir(lang, agent), "SKILL.md"), "utf8");
      assert.ok(
        ourSkill.includes("map-cc-sdd"),
        `${lang}/${agent}: intent-to-spec SKILL.md が map-cc-sdd の所有境界 (呼ばない旨) を宣言する`,
      );
    });
  }
}

// ---- 群10: byte-lock 台帳に intent-to-spec / nl-spec が混入していない (Req 5.2) ----
// standard-invariance.test.mjs の BYTE_LOCKED_FILES / FRONTMATTER_LOCKED / INSTALLER_LOCKED_FILES /
// SKILL_BODY_LOCKED に intent-to-spec / nl-spec のファイルが登録されていないことを構造的に確認する。
// (既存スキル・rules の byte-lock 群に新スキルを混ぜないことの確認。実 enforcement は
//  standard-invariance 自体が green であることが担う。)

test("群10: standard-invariance の byte-lock 台帳に intent-to-spec / nl-spec ファイルが混入していない (5.2)", () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, "test", "standard-invariance.test.mjs"), "utf8");

  // 各 lock 台帳ブロックを抽出し、その中に登録された「キー (lock 対象の相対パス文字列リテラル)」を
  // 取り出して検査する。説明コメントには nl-spec 等の語が現れる (install.mjs の gitignore 追記の
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
      (k) => k.includes("intent-to-spec") || k.includes("nl-spec"),
    );
    assert.deepEqual(
      offenders,
      [],
      `${name} に intent-to-spec / nl-spec の lock キーが混入していない (新スキルを既存 byte-lock に混ぜない): ${offenders.join(", ")}`,
    );
  }
});
