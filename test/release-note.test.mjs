// intent-release-note (release note) 専用テスト (node:test 標準・依存ゼロ)。
// release-note wire packet: Req 1.x / 2.x / 3.x / 4.x / 6.x。
//
// 範囲: 既に実装・コミット済みの release-note 成果物 (seam: scaffold + format rules +
//   install gitignore 結線 / skill: SKILL.md 4変種本実装 + source-scope/format-select rules) の
//   プロパティを READ-ONLY で検証する。本ファイルはテンプレートも install.mjs も他テストも変更しない。
//   nl-spec-export.test.mjs の群構成をミラーする:
//     1.  4系統 (ja/en × claude/codex) の SKILL.md + 4 rules + scaffold README が存在する。
//     2.  release-note サブツリーの en/ja ファイル集合が agent 毎に 1:1 一致。
//     6.  SKILL.md の書込み境界が .intent/release-note/ 限定で canonical / git へ書かない
//         (read-only 担保。書き込み系 git コマンド名の「叩かない」禁止文脈を誤検出しない設計)。
//     8.  source-scope / format-select / format-* が同一言語内 claude/codex byte 一致・agent 中立。
//     10. byte-lock 台帳 (standard-invariance) に release-note ファイルが lock キーとして混入していない。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];
const SKILL = "intent-release-note";
// seam 設置の format-* (出力構造) + skill 新設の source-scope/format-select (range/format 選択)。
const RULE_NAMES = ["source-scope", "format-select", "format-changelog", "format-github-releases"];

// release-note スキルディレクトリの絶対パス。
function skillDir(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", SKILL);
}

// scaffold README (配布側) の絶対パス。
function scaffoldReadme(lang) {
  return path.join(TEMPLATES, lang, "intent", "release-note", "README.md");
}

// 先頭 `---` フェンス間を frontmatter として読み `key: value` を素朴抽出する (yaml 依存なし)。
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

// dir 配下の全ファイルを相対パスで列挙する。
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

// ---- 群1: 4系統の SKILL.md + 4 rules + scaffold README が全て存在する (Req 1.1/1.2/1.3) ----
// 期待: 4 SKILL.md + 16 rule files + 2 scaffold README (ja/en)。1つでも欠ければ落ちる。

test("群1: 4系統 (ja/en × claude/codex) に SKILL.md + 4 rules が全て存在する (1.1/1.2)", () => {
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

test("群1: scaffold README が ja/en の配布側に存在する (1.3)", () => {
  for (const lang of LANGS) {
    assert.ok(
      fs.existsSync(scaffoldReadme(lang)),
      `${lang}: templates/${lang}/intent/release-note/README.md が実在する`,
    );
  }
});

// ---- 群2: en/ja のファイル集合が agent 毎に 1:1 一致 (Req 2.3 構造一致) ----

for (const agent of AGENTS) {
  test(`群2: ${agent} の release-note サブツリーが ja/en で 1:1 一致 (2.3)`, () => {
    const jaRel = listRel(skillDir("ja", agent));
    const enRel = listRel(skillDir("en", agent));
    assert.ok(jaRel.length > 0, `${agent}: ja サブツリーにファイルがある`);

    const jaSet = new Set(jaRel);
    const enSet = new Set(enRel);
    const missingInEn = jaRel.filter((f) => !enSet.has(f));
    const missingInJa = enRel.filter((f) => !jaSet.has(f));
    assert.deepEqual(missingInEn, [], `${agent}: en に欠落: ${missingInEn.join(", ")}`);
    assert.deepEqual(missingInJa, [], `${agent}: ja に欠落: ${missingInJa.join(", ")}`);
    assert.deepEqual(enRel, jaRel, `${agent}: ja/en の相対パス集合が完全一致`);
    assert.ok(jaRel.includes("SKILL.md"), `${agent}: 集合に SKILL.md を含む`);
    for (const rule of RULE_NAMES) {
      assert.ok(
        jaRel.includes(path.join("rules", `${rule}.md`)),
        `${agent}: 集合に rules/${rule}.md を含む`,
      );
    }
  });
}

// ---- 群3 (frontmatter): claude は必須5フィールド (read-only系=disable-model-invocation 除外)
//      + allowed-tools に Bash、codex は name/description のみ (Req 2.2/3 + skill packet の Bash 追加) ----

const REQUIRED_CLAUDE_FIELDS = ["name", "description", "allowed-tools", "argument-hint"];
const CLAUDE_ONLY_FIELDS = ["allowed-tools", "argument-hint", "disable-model-invocation"];

for (const lang of LANGS) {
  test(`群3: ${lang}/claude SKILL.md は必須5フィールドを持ち allowed-tools に Bash を含む (2.2/3.x)`, () => {
    const fm = parseFrontmatter(path.join(skillDir(lang, "claude"), "SKILL.md"));
    for (const field of REQUIRED_CLAUDE_FIELDS) {
      assert.ok(Object.prototype.hasOwnProperty.call(fm, field), `${lang}/claude: ${field} がある`);
      assert.ok(fm[field].length > 0, `${lang}/claude: ${field} が空でない`);
    }
    assert.equal(fm.name, SKILL, `${lang}/claude: name が ${SKILL}`);
    // git を read-only で読むため Bash を持つ (intent-status 同型)。
    assert.ok(fm["allowed-tools"].includes("Bash"), `${lang}/claude: allowed-tools に Bash がある`);
    // auto-invocable (canonical 非書換) のため disable-model-invocation を持たない。
    assert.ok(
      !("disable-model-invocation" in fm),
      `${lang}/claude: auto-invocable は disable-model-invocation を持たない`,
    );
  });

  test(`群3: ${lang}/codex SKILL.md は name/description のみ・claude 専用フィールドを持たない (2.2)`, () => {
    const fm = parseFrontmatter(path.join(skillDir(lang, "codex"), "SKILL.md"));
    assert.ok("name" in fm, `${lang}/codex: name がある`);
    assert.ok("description" in fm, `${lang}/codex: description がある`);
    for (const forbidden of CLAUDE_ONLY_FIELDS) {
      assert.ok(
        !(forbidden in fm),
        `${lang}/codex: claude 専用 ${forbidden} を frontmatter に持たない`,
      );
    }
  });
}

// ---- 群6: read-only 担保 (Req 3.1/3.2/3.3/3.4) ----
// SKILL.md の書込み境界が .intent/release-note/ 限定で canonical / git へ書かないことを検査する。
// 申し送り: 書き込み系 git コマンド名は「叩かない」禁止文脈で列挙されているため、素朴 grep では
//   誤検出する。allowlist の肯定検査 (主) + 書き込み系コマンド名は禁止文脈行にのみ現れる確認 (補) で
//   「禁止の言及 ≠ 実行」を区別する。既存 nl-spec 群6 の canonical Write 導線否定検査と同型の温度。

// 書き込み系 git コマンドの動詞 (本文中に裸の実行記述として現れてはならない)。
// frontmatter を除外した本文に対して検査し、"git commit history" のような名詞句 (description) を
// 誤検出しない。本文に現れる書き込み系は「禁止文脈の言及」に限ることを確認する。
const WRITE_GIT_VERBS = [
  "commit", "push", "checkout", "switch",
  "reset", "restore", "merge", "rebase", "cherry-pick",
];
// "git <verb>" が、直後に英字を続けない (= 名詞句 "git commit history" を除外) 形で現れる行を拾う。
function lineHasWriteGit(line) {
  return WRITE_GIT_VERBS.some((v) => new RegExp(`git ${v}(?![a-z])`, "i").test(line));
}
// frontmatter (先頭 --- フェンス間) を除いた本文を返す (description の名詞句を検査対象外にする)。
function bodyAfterFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return content;
  let i = 1;
  while (i < lines.length && lines[i].trim() !== "---") i++;
  return lines.slice(i + 1).join("\n");
}
// 禁止文脈を示す語 (この語が同一行にあれば「禁止としての言及」であり実行記述ではない)。
// 明示的な禁止語に絞る (「しない」等の緩い語は実行記述を誤って通すため使わない)。
const FORBID_CONTEXT = ["叩かない", "禁止", "never invoke", "forbidden"];

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群6: ${lang}/${agent} SKILL.md の書込み先は .intent/release-note/ 限定・canonical/git へ書かない (3.1/3.2)`, () => {
      const content = fs.readFileSync(path.join(skillDir(lang, agent), "SKILL.md"), "utf8");

      // (a) 書込み境界として .intent/release-note/ を明示する。
      assert.ok(
        content.includes(".intent/release-note/"),
        `${lang}/${agent}: SKILL.md が .intent/release-note/ を書込み先として明示する`,
      );
      // (b) read-only 規律を明示する。
      assert.ok(
        content.includes("read-only") || content.includes("読み取りのみ") || content.includes("read only"),
        `${lang}/${agent}: SKILL.md が git/射影元の read-only 規律を明示する`,
      );
      // (c) canonical (intent-tree/compass) への Write 導線を持たない (既存群6 と同型の否定検査)。
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

    test(`群6: ${lang}/${agent} SKILL.md の書き込み系 git コマンド言及は全て禁止文脈にある (3.3・誤検出回避)`, () => {
      const content = fs.readFileSync(path.join(skillDir(lang, agent), "SKILL.md"), "utf8");
      // frontmatter (description の "the git commit history" 等の名詞句) は検査対象外。
      // 本文の手順記述のみを対象に、書き込み系 git が「禁止文脈の言及」に限ることを確認する。
      const lines = bodyAfterFrontmatter(content).split(/\r?\n/);
      for (const line of lines) {
        if (!lineHasWriteGit(line)) continue;
        // 書き込み系コマンドを含む行は、禁止文脈語を同一行に持たねばならない (裸の実行記述でない)。
        // 英語の "Never invoke" / "Forbidden" 等を拾うため case-insensitive で判定する。
        const lower = line.toLowerCase();
        const inForbidContext = FORBID_CONTEXT.some((w) => lower.includes(w.toLowerCase()));
        assert.ok(
          inForbidContext,
          `${lang}/${agent}: 書き込み系 git を含む行が禁止文脈 (叩かない/禁止/never invoke 等) にある: 「${line.trim()}」`,
        );
      }
    });
  }
}

// source-scope が read-only allowlist を持ち書き込み系を禁止していることの肯定検査 (Req 3.4)。
const READ_ONLY_GIT_ALLOWLIST = ["git log", "git tag", "git describe", "git rev-list", "git rev-parse", "git show"];

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群6: ${lang}/${agent} source-scope が read-only allowlist を明示し書き込みを禁止する (3.4)`, () => {
      const content = fs.readFileSync(
        path.join(skillDir(lang, agent), "rules", "source-scope.md"), "utf8",
      );
      // allowlist の肯定検査: 読み取り系コマンドが allowlist として明記されている。
      assert.ok(content.includes("allowlist"), `${lang}/${agent}: source-scope に allowlist の語がある`);
      for (const cmd of READ_ONLY_GIT_ALLOWLIST) {
        assert.ok(content.includes(cmd), `${lang}/${agent}: source-scope に許可コマンド ${cmd} がある`);
      }
      // read-only / 書き込み禁止の規律を明示する。
      assert.ok(
        content.includes("read-only") || content.includes("読むだけ") || content.includes("変更しない"),
        `${lang}/${agent}: source-scope が read-only 規律を明示する`,
      );
    });
  }
}

// ---- 群8: rules が同一言語内 claude/codex byte 一致・agent 中立 (Req 2.1/2.2) ----

for (const lang of LANGS) {
  for (const rule of RULE_NAMES) {
    test(`群8: ${lang} ${rule}.md が claude↔codex で byte 同一 (共有 rules) (2.1)`, () => {
      const claudeFile = path.join(skillDir(lang, "claude"), "rules", `${rule}.md`);
      const codexFile = path.join(skillDir(lang, "codex"), "rules", `${rule}.md`);
      const a = fs.readFileSync(claudeFile);
      const b = fs.readFileSync(codexFile);
      assert.ok(a.equals(b), `${lang}: ${rule}.md が claude/codex 間で byte 同一`);
    });

    test(`群8: ${lang} codex ${rule}.md が agent 固有語 (AskUserQuestion) を含まない (2.2)`, () => {
      const content = fs.readFileSync(
        path.join(skillDir(lang, "codex"), "rules", `${rule}.md`), "utf8",
      );
      assert.ok(
        !content.includes("AskUserQuestion"),
        `${lang}: codex ${rule}.md が AskUserQuestion を含まない (agent 中立)`,
      );
    });
  }

  // codex SKILL.md 本文も AskUserQuestion を含まない (codex 規律)。
  test(`群8: ${lang} codex SKILL.md が AskUserQuestion を含まない (2.2)`, () => {
    const content = fs.readFileSync(path.join(skillDir(lang, "codex"), "SKILL.md"), "utf8");
    assert.ok(
      !content.includes("AskUserQuestion"),
      `${lang}: codex SKILL.md が AskUserQuestion を含まない (agent 中立)`,
    );
  });
}

// ---- 群10: byte-lock 台帳に release-note ファイルが lock キーとして混入していない (Req 4.2) ----
// standard-invariance の各 lock 台帳のキー (lock 対象の相対パス文字列リテラル) のみを抽出して検査する。
// 説明コメントには release-note の語が現れる (install.mjs gitignore 追記の由来説明) ため、
// コメントではなく実際の lock キーのみを対象にする (既存 nl-spec 群10 と同方式)。

test("群10: standard-invariance の byte-lock 台帳に release-note ファイルが混入していない (4.2)", () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, "test", "standard-invariance.test.mjs"), "utf8");
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
    const offenders = keys.filter((k) => k.includes("intent-release-note") || k.includes("release-note"));
    assert.deepEqual(
      offenders,
      [],
      `${name} に release-note の lock キーが混入していない (新スキルを既存 byte-lock に混ぜない): ${offenders.join(", ")}`,
    );
  }
});

// ---- packaging: release-note の skill/rules が配布対象 templates/ 配下にあり test/ を含まない (Req 4.3) ----
// npm pack の実 dry-run は structure-pack.test.mjs が担うため、ここでは配置の構造的確認に絞る。

test("packaging: release-note の skill/rules が templates/ 配下にあり test/ を含まない (4.3)", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const rel = path.relative(REPO_ROOT, skillDir(lang, agent));
      assert.ok(
        rel.startsWith(path.join("templates", lang, agent)),
        `${lang}/${agent}: skill が templates/ 配下にある (配布対象): ${rel}`,
      );
      assert.ok(!rel.includes("test"), `${lang}/${agent}: skill パスが test/ を含まない`);
    }
  }
});
