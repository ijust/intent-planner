// lifecycle 4スキル (status/validate/improve/writeback) の検証 (task 4.1)。
// node:test 標準・依存ゼロ。
//
// 範囲分担 (重複回避):
//   - en claude frontmatter 必須5フィールド + en/ja 一般パリティ + npm pack(ja/en, test 除外)
//     は structure-pack.test.mjs (EN_SKILL_NAMES 拡張済み) がカバー。
//   - codex 最小 frontmatter / AskUserQuestion 不在 / codex 起点 rules byte 等価は
//     agents.test.mjs の動的列挙が新スキルにも自動適用される。
//   - 本ファイルは lifecycle 固有の検査に集中する (design Testing Strategy 2, 4, 5, 5b, 6, 11):
//       a. claude frontmatter を ja/en 両言語で検査 (既存の en-only 起点を踏襲しない、Req 7.1)
//          + status/validate の allowed-tools に Write / AskUserQuestion が無い (Req 1.4, 2.5)
//          + improve/writeback の allowed-tools に Write がある (sanity)
//       b. rules の claude 起点 byte 等価 + 両方向の集合一致
//          (agents.test の codex→claude 片方向では claude 側のみの置き忘れを検出できない、Req 7.1)
//       c. deltas.md の ja/en 見出し構造 1:1 (Req 7.1)
//       d. map-cc-sdd (ja/en × claude/codex) の「## Source Packet」出力契約 + <slug>/ パス
//          + scaffold cc-sdd README.md (ja/en) の存在 (lifecycle 層の P0 依存固定の移設先、export-dirs 1.4, 5.1)
//       e. writeback-protocol.md 内包テンプレート (正本) と scaffold deltas.md (写し) の見出し構造一致 (Req 4.2)
//       f. decision-table / validate-checks の content 検証 (Req 1.2, 2.4 の骨格)
//       g. npm pack に新規 34 ファイル全件同梱 (Req 7.2, 5.5)
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];

// lifecycle 4スキルと、各スキルが持つ rules 正本ファイル (1:1)。
const LIFECYCLE_SKILLS = ["intent-status", "intent-validate", "intent-improve", "intent-writeback"];
const RULE_FILES = {
  "intent-status": "decision-table.md",
  "intent-validate": "validate-checks.md",
  "intent-improve": "improve-axes.md",
  "intent-writeback": "writeback-protocol.md",
};
// read-only スキル (Write / AskUserQuestion を持たない) と write スキル。
const READ_ONLY_SKILLS = ["intent-status", "intent-validate"];
const WRITE_SKILLS = ["intent-improve", "intent-writeback"];

// frontmatter 必須フィールド (core 契約、structure-pack と同一)。
const REQUIRED_FRONTMATTER_FIELDS = [
  "name",
  "description",
  "allowed-tools",
  "argument-hint",
  "disable-model-invocation",
];

function skillDir(lang, agent, skill) {
  return path.join(TEMPLATES, lang, agent, "skills", skill);
}

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

// allowed-tools をツール名トークンの配列にする (部分文字列誤判定の回避)。
function allowedToolTokens(fm) {
  return (fm["allowed-tools"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

// dir 配下の全ファイルを相対パスで列挙する (任意のネスト深さ)。
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

// markdown テキストから見出し (#〜###) を順序付きで抽出する。fenced code block 内は除外。
function extractHeadings(text) {
  const headings = [];
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,3}) /);
    if (m) headings.push({ level: m[1].length, text: line.trim() });
  }
  return headings;
}

// ---- a. claude frontmatter: ja/en 両言語検査 + read-only 制約の機械検証 (Req 1.4, 2.5, 7.1) ----
// design Testing Strategy 2: 既存 structure-pack の frontmatter 検査は en のみ起点のため、
// lifecycle スキルは ja/en 両言語の claude 版を検査対象とする。

for (const lang of LANGS) {
  for (const skill of LIFECYCLE_SKILLS) {
    test(`claude frontmatter: ${lang}/${skill} は必須5フィールドを持ち name が一致する (7.1)`, () => {
      const skillPath = path.join(skillDir(lang, "claude", skill), "SKILL.md");
      assert.ok(fs.existsSync(skillPath), `SKILL.md が実在する: ${skillPath}`);
      const fm = parseFrontmatter(skillPath);
      for (const field of REQUIRED_FRONTMATTER_FIELDS) {
        assert.ok(
          Object.prototype.hasOwnProperty.call(fm, field),
          `${lang}/${skill}: frontmatter に ${field} がある`,
        );
        assert.ok(fm[field].length > 0, `${lang}/${skill}: ${field} が空でない`);
      }
      assert.equal(fm.name, skill, `${lang}/${skill}: name がディレクトリ名と一致する`);
      assert.equal(
        fm["disable-model-invocation"],
        "true",
        `${lang}/${skill}: disable-model-invocation が true`,
      );
    });
  }

  for (const skill of READ_ONLY_SKILLS) {
    test(`read-only 制約: ${lang}/${skill} の allowed-tools に Write / AskUserQuestion が無い (1.4, 2.5)`, () => {
      const fm = parseFrontmatter(path.join(skillDir(lang, "claude", skill), "SKILL.md"));
      const tools = allowedToolTokens(fm);
      assert.ok(tools.length > 0, `${lang}/${skill}: allowed-tools 行が存在し空でない`);
      assert.ok(
        !tools.includes("Write"),
        `${lang}/${skill}: read-only スキルの allowed-tools に Write を含まない (実際: ${tools.join(", ")})`,
      );
      assert.ok(
        !tools.includes("AskUserQuestion"),
        `${lang}/${skill}: read-only スキルの allowed-tools に AskUserQuestion を含まない (実際: ${tools.join(", ")})`,
      );
    });
  }

  for (const skill of WRITE_SKILLS) {
    test(`write スキル sanity: ${lang}/${skill} の allowed-tools に Write がある (3.4, 4.3)`, () => {
      const fm = parseFrontmatter(path.join(skillDir(lang, "claude", skill), "SKILL.md"));
      const tools = allowedToolTokens(fm);
      assert.ok(
        tools.includes("Write"),
        `${lang}/${skill}: 承認後反映のため allowed-tools に Write を含む (実際: ${tools.join(", ")})`,
      );
    });
  }
}

// ---- b. rules の claude 起点 byte 等価 + 両方向の集合一致 (Req 7.1) ----
// design Testing Strategy 4: 既存 agents.test の rules 等価検査は codex→claude の片方向で、
// claude 側のみに置いた新 rules の codex 置き忘れを検出できない。
// ここでは claude 側を起点に列挙し、codex 対応物の存在 + byte 一致 + 集合一致 (余剰なし) を検査する。

for (const lang of LANGS) {
  for (const skill of LIFECYCLE_SKILLS) {
    test(`rules byte 等価 (claude 起点): ${lang}/${skill} の rules が codex 側に存在し byte 一致 (7.1)`, () => {
      const claudeRules = path.join(skillDir(lang, "claude", skill), "rules");
      const codexRules = path.join(skillDir(lang, "codex", skill), "rules");

      const claudeRel = listRel(claudeRules);
      assert.ok(claudeRel.length > 0, `${lang}/${skill}: claude 側に rules ファイルが存在する`);
      assert.ok(
        claudeRel.includes(RULE_FILES[skill]),
        `${lang}/${skill}: rules に正本 ${RULE_FILES[skill]} がある`,
      );

      // 両方向の集合一致 (claude 側起点の不足検出 + codex 側余剰の検出)。
      assert.deepEqual(
        listRel(codexRules),
        claudeRel,
        `${lang}/${skill}: claude/codex の rules ファイル集合が一致する`,
      );

      for (const rel of claudeRel) {
        const a = fs.readFileSync(path.join(claudeRules, rel));
        const b = fs.readFileSync(path.join(codexRules, rel));
        assert.ok(
          a.equals(b),
          `${lang}/${skill}/rules/${rel} が claude/codex 間で byte 同一 (ドリフトしていない)`,
        );
      }
    });
  }
}

// ---- c. deltas.md の ja/en 見出し構造 1:1 (Req 7.1) ----
// 見出しテキストは言語で異なるため、レベル列 (順序付き) の一致を契約とする。

test("deltas.md: ja/en の見出し構造 (レベル列) が 1:1 (7.1)", () => {
  const headingsByLang = {};
  for (const lang of LANGS) {
    const file = path.join(TEMPLATES, lang, "intent", "deltas.md");
    assert.ok(fs.existsSync(file), `deltas.md が実在する: ${file}`);
    headingsByLang[lang] = extractHeadings(fs.readFileSync(file, "utf8"));
    assert.ok(headingsByLang[lang].length > 0, `${lang}/intent/deltas.md に見出しがある`);
  }
  assert.deepEqual(
    headingsByLang.en.map((h) => h.level),
    headingsByLang.ja.map((h) => h.level),
    "ja/en の見出しレベル列 (順序含む) が一致する (翻訳での見出し欠落・余剰なし)",
  );
});

// ---- d. map-cc-sdd の「## Source Packet」出力契約 + <slug>/ パス (旧 scaffold 3ファイル検査の移設先) ----
// 下書きは export skill が `.intent/cc-sdd/<slug>/` 配下に packet ごとに生成するため、scaffold は
// README.md 1枚のみ (export-dirs 5.1)。writeback の対象特定が依存する「## Source Packet」見出しの
// 保証は、scaffold 雛形ではなく map-cc-sdd の出力契約 (必須見出し) として固定する (export-dirs 1.4)。

// <slug>/requirements.md 出力パスの言語別表記 (map-cc-sdd の実テキストに合わせる)。
const SLUG_PATH_PATTERNS = {
  ja: /cc-sdd\/<packetスラッグ>\/requirements\.md/,
  en: /cc-sdd\/<packet-slug>\/requirements\.md/,
};
// 必須見出し (出力契約) の節を示す言語別文言。
const REQUIRED_HEADINGS_LITERALS = {
  ja: "必須見出し",
  en: "Required headings",
};

for (const lang of LANGS) {
  for (const agent of ["claude", "codex"]) {
    test(`map-cc-sdd: ${lang}/${agent} が「## Source Packet」出力義務と <slug>/requirements.md パスを記載する (export-dirs 1.4)`, () => {
      const file = path.join(
        skillDir(lang, agent, "intent-export-cc-sdd"),
        "rules",
        "map-cc-sdd.md",
      );
      assert.ok(fs.existsSync(file), `map-cc-sdd が実在する: ${file}`);
      const content = fs.readFileSync(file, "utf8");
      assert.ok(
        content.includes("## Source Packet"),
        `${lang}/${agent}: map-cc-sdd が「## Source Packet」見出しに言及する`,
      );
      assert.ok(
        content.includes(REQUIRED_HEADINGS_LITERALS[lang]),
        `${lang}/${agent}: map-cc-sdd に必須見出し (出力契約) の規定がある`,
      );
      assert.match(
        content,
        SLUG_PATH_PATTERNS[lang],
        `${lang}/${agent}: map-cc-sdd に <slug>/requirements.md の出力パスがある`,
      );
    });
  }

  test(`cc-sdd scaffold: ${lang}/intent/cc-sdd/README.md が存在する (export-dirs 5.1)`, () => {
    const file = path.join(TEMPLATES, lang, "intent", "cc-sdd", "README.md");
    assert.ok(fs.existsSync(file), `scaffold README が実在する: ${file}`);
  });
}

// ---- e. writeback-protocol.md 内包テンプレート (正本) と scaffold deltas.md の見出し構造一致 (Req 4.2) ----
// design Testing Strategy 5: 内包が正本・scaffold は写し (単一ソースのドリフト防止)。
// 検証方式の選択: byte 完全一致ではなく「見出し列 (レベル + テキスト) の一致」を契約として検証する。
// 設計上の契約は見出し構造の一致であり (現状は byte 一致でもあるがそれは実装状態)、
// 同一言語内の比較のためテキストまで含めて比較できる (レベルのみより強い)。

for (const lang of LANGS) {
  test(`deltas 正本/写し: ${lang} writeback-protocol.md 内包テンプレートと scaffold deltas.md の見出し列が一致 (4.2)`, () => {
    const rulesFile = path.join(
      skillDir(lang, "claude", "intent-writeback"),
      "rules",
      "writeback-protocol.md",
    );
    const scaffoldFile = path.join(TEMPLATES, lang, "intent", "deltas.md");
    const rulesText = fs.readFileSync(rulesFile, "utf8");

    // 内包テンプレートは ```markdown フェンスで囲まれた唯一のブロック。
    // 唯一性も assert する (将来テンプレートより前に別の markdown フェンスが追加された場合に
    // 誤ったブロックを比較する余地を塞ぐ)。
    const blocks = [...rulesText.matchAll(/```markdown\r?\n([\s\S]*?)\r?\n```/g)];
    assert.equal(
      blocks.length,
      1,
      `${lang}: writeback-protocol.md の \`\`\`markdown 内包テンプレートはちょうど1つ (実際: ${blocks.length})`,
    );
    const embedded = blocks[0][1];

    const embeddedHeadings = extractHeadings(embedded);
    const scaffoldHeadings = extractHeadings(fs.readFileSync(scaffoldFile, "utf8"));
    assert.ok(embeddedHeadings.length > 0, `${lang}: 内包テンプレートに見出しがある`);
    assert.deepEqual(
      scaffoldHeadings,
      embeddedHeadings,
      `${lang}: scaffold deltas.md の見出し列 (レベル + テキスト) が内包正本と一致する (ドリフトなし)`,
    );
  });
}

// ---- f. content 検証: decision-table / validate-checks (Req 1.2, 2.4 の骨格) ----
// design Testing Strategy 11。4変種間ドリフトは項目 b の byte 一致 + structure-pack の en/ja 1:1 で
// 防止されるため、ここでは各言語の claude 版のみを検査する。

const DECISION_TABLE_LITERALS = {
  ja: "ちょうど1つ",
  en: "exactly one",
};

for (const lang of LANGS) {
  test(`decision-table content: ${lang} に first-match の「ちょうど1つ」規定と 12 行の決定表がある (1.2)`, () => {
    const file = path.join(
      skillDir(lang, "claude", "intent-status"),
      "rules",
      "decision-table.md",
    );
    const content = fs.readFileSync(file, "utf8");
    assert.ok(
      content.includes(DECISION_TABLE_LITERALS[lang]),
      `${lang}: 「${DECISION_TABLE_LITERALS[lang]}」(推奨をちょうど1つ) の規定がある`,
    );
    assert.ok(content.includes("first-match"), `${lang}: first-match の規定がある`);

    // 決定表のデータ行は `| <番号> |` 形式。1〜12 が過不足なく存在する。
    // (intent-planner-enforcement で staleness 行が row 9 として挿入され 12 行になった)
    const rows = [...content.matchAll(/^\| (\d+) \|/gm)].map((r) => Number(r[1]));
    assert.deepEqual(
      rows,
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      `${lang}: 決定表が 12 行 (1〜12) を順序どおり持つ`,
    );
  });

  test(`validate-checks content: ${lang} に深刻度3分類のラベルがある (2.4)`, () => {
    const file = path.join(
      skillDir(lang, "claude", "intent-validate"),
      "rules",
      "validate-checks.md",
    );
    const content = fs.readFileSync(file, "utf8");
    const labels = lang === "ja" ? ["要修正", "推奨", "情報"] : ["must-fix", "recommended", "info"];
    for (const label of labels) {
      assert.ok(content.includes(label), `${lang}: 深刻度ラベル「${label}」が存在する`);
    }
  });
}

// ---- g. npm pack に新規 34 ファイル全件同梱 (Req 7.2, 5.5) ----
// 16 SKILL.md (4 skill × 2 lang × 2 agent) + 16 rules (同) + 2 deltas.md (2 lang) = 34。

test("npm pack: lifecycle 新規 34 ファイル (16 SKILL.md + 16 rules + 2 deltas.md) が全件同梱される (7.2, 5.5)", () => {
  const expected = [];
  for (const lang of LANGS) {
    expected.push(`templates/${lang}/intent/deltas.md`);
    for (const agent of ["claude", "codex"]) {
      for (const skill of LIFECYCLE_SKILLS) {
        expected.push(`templates/${lang}/${agent}/skills/${skill}/SKILL.md`);
        expected.push(`templates/${lang}/${agent}/skills/${skill}/rules/${RULE_FILES[skill]}`);
      }
    }
  }
  assert.equal(expected.length, 34, "期待ファイル数の自己検算 (16 + 16 + 2 = 34)");

  // --dry-run --json は files[].path を構造化 JSON で返す (実成果物の検査・ハードコードではない)。
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  const parsed = JSON.parse(raw);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  assert.ok(entry && Array.isArray(entry.files), "pack JSON に files 配列がある");
  const paths = new Set(entry.files.map((f) => f.path.split(path.sep).join("/")));

  const missing = expected.filter((p) => !paths.has(p)).sort();
  assert.deepEqual(missing, [], `pack 成果物に欠落なし (欠落: ${missing.join(", ")})`);
});
