// review-adoption (intent-planner-review-adoption) の構造検証 (task 7.1)。
// node:test 標準・依存ゼロ (INV2)。
//
// 範囲分担 (重複回避):
//   - claude↔codex の rules byte 等価・集合一致は agent-rules-parity が、
//     ja/en scaffold の構造一致は structure-pack が、hash lock は standard-invariance が担う。
//   - 本ファイルは design Testing Strategy「Unit (test/review-adoption.test.mjs 新設)」の6項目に集中する:
//       1. ID 列の整合: 4象限の validate-checks.md 検査カタログで全データ行が一意な
//          kebab-case ID を持ち、stale-assumptions 行 (カバレッジ・常時・情報) が存在する (Req 4.1, 5.1)
//       2. ADR 6欄ドリフト防護: scaffold intent-compass.md / compass-archive.md /
//          algo-qoc.md / writeback-protocol.md / improve-axes.md で **Context** と **Decision** を
//          同一行に含む全行が6欄の完全な並びを持つ。どこか1行のマッチや
//          2リテラルの単独存在では合格にしない (Req 1.1–1.5 の形式面)
//       3. first-packet 配線: rule の4象限存在 + SKILL.md の無条件参照 +
//          packets/plan.md scaffold の Recommended First Packet 節 (Req 3.1, 3.5)
//          (intent-planner-packet-files task 2 で packets.md → packets/plan.md へ付け替え)
//       4. Agent Contract: intent/README.md の見出しと実装フェーズ小見出し配下の
//          5項目キーワード (散在では合格にしない) (Req 2.1, 2.2)
//       5. README 実例: リポジトリ README.md の Before / After 節 (Req 6.1)
//       6. Open Questions 注記とタグ規約: scaffold 注記のタグリテラル +
//          export-questions.md の4象限存在 + export SKILL.md の無条件参照 (Req 8.1, 8.2, 8.4)
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

function skillDir(lang, agent, skill) {
  return path.join(TEMPLATES, lang, agent, "skills", skill);
}

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

// 指定したレベル2見出し行から次のレベル2見出し (## ) 直前までを節として切り出す。
// startsWith("## ") は "### " に誤マッチしない (3文字目が '#' のため)。
function sliceSection(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

// 参照行の無条件性検査に使う条件マーカー (poc-coverage の配線検査と同形)。
const CONDITIONAL_MARKERS = {
  ja: ["のとき", "の場合"],
  en: ["if ", "when "],
};

// SKILL.md が rule を参照し、参照行に条件マーカーが共起しないことを検査する。
function assertUnconditionalWiring(lang, agent, skill, rule) {
  const content = read(path.join(skillDir(lang, agent, skill), "SKILL.md"));
  const refLines = content.split(/\r?\n/).filter((l) => l.includes(`rules/${rule}`));
  assert.ok(refLines.length > 0, `${lang}/${agent}/${skill}/SKILL.md に rules/${rule} の参照行がある`);
  for (const line of refLines) {
    // en は大文字小文字の揺れを吸収するため小文字化して比較する。
    const haystack = lang === "en" ? line.toLowerCase() : line;
    for (const marker of CONDITIONAL_MARKERS[lang]) {
      assert.ok(
        !haystack.includes(marker),
        `${lang}/${agent}/${skill}/SKILL.md: 参照行に条件マーカー「${marker}」が共起しない (無条件配線): ${line}`,
      );
    }
  }
}

// ---- 項目1: ID 列の整合 (Req 4.1, 5.1) ----
// 検査カタログ表の全データ行が第1列に一意な kebab-case ID を持ち、
// stale-assumptions 行が区分=カバレッジ・実施条件=常時・深刻度=情報で存在すること。
// ID の一覧・個数は表が正の原則に従い、本テストには列挙しない (形式と特定1行のみ検査)。

const KEBAB_CASE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CATALOG_HEADING = {
  ja: "## 検査カタログ",
  en: "## Check catalog",
};
// stale-assumptions 行の期待セル値 (区分 / 実施条件 / 深刻度)。
const STALE_ASSUMPTIONS_CELLS = {
  ja: { category: "カバレッジ", condition: "常時", severity: "情報" },
  en: { category: "Coverage", condition: "always", severity: "info" },
};

// 検査カタログ節から表のデータ行 (ヘッダ行・区切り行を除く) をセル配列で返す。
function catalogRows(content, lang) {
  const section = sliceSection(content, CATALOG_HEADING[lang]);
  assert.ok(section !== null, `「${CATALOG_HEADING[lang]}」見出しがある`);
  const tableLines = section.split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  assert.ok(tableLines.length >= 3, "検査カタログにヘッダ + 区切り + データ行がある");
  // 先頭2行 (ヘッダ・区切り) を除いたデータ行をセル分解する。
  return tableLines.slice(2).map((line) => line.split("|").slice(1, -1).map((c) => c.trim()));
}

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`ID 列: ${lang}/${agent} validate-checks.md の全データ行が一意な kebab-case ID を持つ (4.1)`, () => {
      const content = read(
        path.join(skillDir(lang, agent, "intent-validate"), "rules", "validate-checks.md"),
      );
      const rows = catalogRows(content, lang);
      const ids = rows.map((cells) => cells[0]);
      for (const id of ids) {
        assert.match(
          id,
          KEBAB_CASE_ID,
          `${lang}/${agent}: 検査カタログの第1列が kebab-case ID である (実際: 「${id}」)`,
        );
      }
      assert.equal(
        new Set(ids).size,
        ids.length,
        `${lang}/${agent}: 検査 ID に重複が無い (実際: ${ids.join(", ")})`,
      );
    });

    test(`ID 列: ${lang}/${agent} validate-checks.md に stale-assumptions 行 (カバレッジ・常時・情報) がある (5.1)`, () => {
      const content = read(
        path.join(skillDir(lang, agent, "intent-validate"), "rules", "validate-checks.md"),
      );
      const rows = catalogRows(content, lang);
      const row = rows.find((cells) => cells[0] === "stale-assumptions");
      assert.ok(row, `${lang}/${agent}: 検査カタログに ID「stale-assumptions」の行がある`);
      const expected = STALE_ASSUMPTIONS_CELLS[lang];
      // 列構成: ID | 区分 | 検査 | 実施条件 | 深刻度の目安
      assert.equal(row[1], expected.category, `${lang}/${agent}: stale-assumptions の区分が「${expected.category}」`);
      assert.equal(row[3], expected.condition, `${lang}/${agent}: stale-assumptions の実施条件が「${expected.condition}」`);
      assert.equal(row[4], expected.severity, `${lang}/${agent}: stale-assumptions の深刻度が「${expected.severity}」`);
    });
  }
}

// ---- 項目2: ADR 6欄ドリフト防護 (Req 1.1–1.5 の形式面) ----
// 6欄の完全な並び (Context → Decision → Why → Alternatives considered → Consequences →
// Revisit when) が bold リテラルでこの順に同一行内に出現すること。
// 「どこか1行がマッチすれば合格」にはしない: scaffold には欄列挙1行 + 記入例2行の計3本の
// 完全列があり、欄列挙行だけを旧4欄へ退行させても記入例がマッチして偽陰性になるため、
// **Context** と **Decision** を同一行に含む全行を ADR エントリ行とみなし、
// その全行に完全列を要求する (欄列挙・記入例いずれの退行も検出する)。
// codex 側は agent-rules-parity の byte 等価が追随を保証するため claude のみ検査する。

const ADR_SIX_FIELD_LINE =
  /\*\*Context\*\*[^\n]*\*\*Decision\*\*[^\n]*\*\*Why\*\*[^\n]*\*\*Alternatives considered\*\*[^\n]*\*\*Consequences\*\*[^\n]*\*\*Revisit when\*\*/;

const ADR_FILES = (lang) => [
  path.join(TEMPLATES, lang, "intent", "intent-compass.md"),
  path.join(TEMPLATES, lang, "intent", "compass-archive.md"),
  path.join(skillDir(lang, "claude", "intent-compass"), "rules", "algo-qoc.md"),
  path.join(skillDir(lang, "claude", "intent-writeback"), "rules", "writeback-protocol.md"),
  path.join(skillDir(lang, "claude", "intent-improve"), "rules", "improve-axes.md"),
];

for (const lang of LANGS) {
  for (const filePath of ADR_FILES(lang)) {
    const rel = path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
    test(`ADR 6欄: ${rel} の全 ADR エントリ行が6欄の完全な並びを持つ (1.1–1.5)`, () => {
      const content = read(filePath);
      const adrLines = content
        .split(/\r?\n/)
        .filter((l) => l.includes("**Context**") && l.includes("**Decision**"));
      assert.ok(
        adrLines.length > 0,
        `${rel}: **Context** と **Decision** を同一行に含む ADR エントリ行が1行以上ある`,
      );
      for (const line of adrLines) {
        assert.match(
          line,
          ADR_SIX_FIELD_LINE,
          `${rel}: ADR エントリ行は **Context** → **Decision** → **Why** → **Alternatives considered** → **Consequences** → **Revisit when** をこの順で同一行内に持つ (退行した行: ${line})`,
        );
      }
    });
  }
}

// ---- 項目3: first-packet 配線 (Req 3.1, 3.5) ----
// rule の4象限存在 + SKILL.md の無条件参照 + packets/plan.md scaffold の節。

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`first-packet: ${lang}/${agent}/intent-packets/rules/first-packet.md が存在する (3.1)`, () => {
      const rulePath = path.join(skillDir(lang, agent, "intent-packets"), "rules", "first-packet.md");
      assert.ok(fs.existsSync(rulePath), `rule が存在する: ${rulePath}`);
    });

    test(`first-packet: ${lang}/${agent}/intent-packets/SKILL.md が rules/first-packet.md を無条件で参照する (3.1)`, () => {
      assertUnconditionalWiring(lang, agent, "intent-packets", "first-packet.md");
    });
  }

  test(`first-packet: ${lang}/intent/packets/plan.md に Recommended First Packet 節がある (3.5)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "packets", "plan.md"));
    assert.match(
      content,
      /^## Recommended First Packet$/m,
      `${lang}/intent/packets/plan.md に「## Recommended First Packet」見出しがある`,
    );
  });
}

// ---- 項目4: Agent Contract (Req 2.1, 2.2) ----
// README は薄い入口に留め、実装契約の本文は execution-contract.md の1正本で検査する。

const AGENT_CONTRACT = {
  ja: {
    heading: "## エージェント向けルール",
    implPrefix: "### 実装フェーズ",
    keywords: ["Invariant", "Scope / Acceptance", "Decision", "Preference / Heuristic", "superseded", "Anti-direction", "delta", "A.", "B.", "C."],
  },
  en: {
    heading: "## Rules for Agents",
    implPrefix: "### Implementation Phase",
    keywords: ["Invariant", "Scope / Acceptance", "Decision", "Preference / Heuristic", "superseded", "Anti-direction", "delta", "A.", "B.", "C."],
  },
};

for (const lang of LANGS) {
  test(`Agent Contract: ${lang}/intent/README.md は実装契約の1正本を参照する (2.1, 2.2)`, () => {
    const spec = AGENT_CONTRACT[lang];
    const content = read(path.join(TEMPLATES, lang, "intent", "README.md"));
    const lines = content.split(/\r?\n/);

    const headingIdx = lines.findIndex((l) => l.trim() === spec.heading);
    assert.notEqual(headingIdx, -1, `${lang}/intent/README.md に「${spec.heading}」見出しがある`);

    // 当該 ## 節の終端 = headingIdx より後の次のレベル2見出し (## ) 直前。
    let sectionEnd = lines.length;
    for (let i = headingIdx + 1; i < lines.length; i++) {
      if (lines[i].startsWith("## ")) {
        sectionEnd = i;
        break;
      }
    }

    const implIdx = lines.findIndex(
      (l, i) => i > headingIdx && i < sectionEnd && l.startsWith(spec.implPrefix),
    );
    assert.notEqual(
      implIdx,
      -1,
      `${lang}/intent/README.md: 「${spec.heading}」節の内側に「${spec.implPrefix}」で始まる小見出しがある (節の外では不合格)`,
    );

    // 小見出し配下 = implIdx の次行から次のレベル2見出し (## ) 直前まで。
    let end = lines.length;
    for (let i = implIdx + 1; i < lines.length; i++) {
      if (lines[i].startsWith("## ")) {
        end = i;
        break;
      }
    }
    const section = lines.slice(implIdx + 1, end).join("\n");
    assert.ok(
      section.includes(".intent/execution-contract.md"),
      `${lang}/intent/README.md: 実装フェーズは execution-contract.md を参照する`,
    );

    const contract = read(path.join(TEMPLATES, lang, "intent", "execution-contract.md"));
    for (const keyword of spec.keywords) {
      assert.ok(
        contract.includes(keyword),
        `${lang}/intent/execution-contract.md: 実装契約にキーワード「${keyword}」がある`,
      );
    }
  });
}

// ---- 項目5: README 実例 (Req 6.1) ----
// リポジトリ README.md に「## Before / After」で始まる見出しがあること。

test("README 実例: リポジトリ README.md に Before / After 節がある (6.1)", () => {
  const content = read(path.join(REPO_ROOT, "README.md"));
  // README は入口へ再構成され、Before / After 実例は ②節配下の小見出し
  // 「### …（Before / After）」として現存する（見出しレベル・前置きが付くだけで実例は健在）。
  // 守りたいのは「曖昧依頼→具体化の実例が README にある」ことなので、
  // 「Before / After」を含む見出し行の存在で検査する。
  assert.match(
    content,
    /^#{2,3} .*Before \/ After/m,
    "README.md に「Before / After」を含む見出しがある",
  );
});

// ---- 項目6: Open Questions 注記とタグ規約 (Req 8.1, 8.2, 8.4) ----
// scaffold の Open Questions 節の注記 (blockquote) にタグリテラルがあること +
// export-questions.md の4象限存在 + export SKILL.md の無条件参照。

const EXPORT_TAG = {
  ja: "[export まで]",
  en: "[by export]",
};

for (const lang of LANGS) {
  for (const name of ["intent-tree", "intent-compass"]) {
    test(`Open Questions: ${lang}/intent/${name}.md の Open Questions 節注記にタグ「${EXPORT_TAG[lang]}」がある (8.1, 8.2)`, () => {
      const content = read(path.join(TEMPLATES, lang, "intent", `${name}.md`));
      const section = sliceSection(content, "## Open Questions");
      assert.ok(section !== null, `${lang}/intent/${name}.md に「## Open Questions」見出しがある`);
      const tagLines = section
        .split(/\r?\n/)
        .filter((l) => l.includes(EXPORT_TAG[lang]));
      assert.ok(
        tagLines.length > 0,
        `${lang}/intent/${name}.md: Open Questions 節にタグリテラル「${EXPORT_TAG[lang]}」がある`,
      );
      // 規約は記入例ではなく注記 (blockquote) として運ばれること。
      assert.ok(
        tagLines.some((l) => l.trimStart().startsWith(">")),
        `${lang}/intent/${name}.md: タグリテラルが blockquote 注記 (>) の行にある`,
      );
    });
  }

  for (const agent of AGENTS) {
    test(`Open Questions: ${lang}/${agent}/intent-export-cc-sdd/rules/export-questions.md が存在する (8.4)`, () => {
      const rulePath = path.join(
        skillDir(lang, agent, "intent-export-cc-sdd"),
        "rules",
        "export-questions.md",
      );
      assert.ok(fs.existsSync(rulePath), `rule が存在する: ${rulePath}`);
    });

    test(`Open Questions: ${lang}/${agent}/intent-export-cc-sdd/SKILL.md が rules/export-questions.md を無条件で参照する (8.4)`, () => {
      assertUnconditionalWiring(lang, agent, "intent-export-cc-sdd", "export-questions.md");
    });
  }
}
