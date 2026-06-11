// PoC カバレッジ (intent-planner-poc-coverage) の構造検証 (task 6.1)。
// node:test 標準・依存ゼロ (INV2)。
//
// 範囲分担 (重複回避):
//   - 新規 rules の配布・npm pack 同梱・ja/en ファイル集合パリティは
//     install.test / structure-pack.test の動的列挙がカバーする。
//   - ただし既存テストは「codex ツリーからの列挙」「言語間のパス集合比較」であり、
//     4面 (ja/en × claude/codex) すべての存在保証は本ファイルの項目1が単独で担う
//     (codex 側コピー漏れは既存テストをすり抜ける。design Testing Strategy Integration 2)。
//   - 本ファイルは design Testing Strategy「Unit / Structural Tests」項目 1〜5 に集中する:
//       1. rule 配置と対称性: purpose-poc.md / poc-walking-skeleton.md が4面に存在し、
//          同一言語内で claude/codex が byte 等価 (Req 7.1)
//       2. scaffold 形式: mode.md の purpose 行、intent-tree.md「PoC 実験定義」配下4見出し、
//          packets.md「Walking Skeleton」が ja/en 双方に存在し見出し構造が 1:1 (Req 7.2)
//       3. 配線: discover SKILL.md (4面) が purpose-poc.md を、packets SKILL.md (4面) が
//          poc-walking-skeleton.md を参照している (Req 7.1、発火経路保証)
//       4. 規範検査: validate-checks.md (4面) に区分「規範」5行・3深刻度ラベル・降格規則・
//          purpose 未記録の扱いが存在する (Req 7.1)
//       5. 表が正: intent-validate の SKILL.md / validate-checks.md (計8ファイル) に
//          検査数・行番号のハードコードが残っていない (Req 7.5 の陳腐化防止)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];

// 新規 rule 正本 (skill → rule ファイル名)。
const POC_RULES = {
  "intent-discover": "purpose-poc.md",
  "intent-packets": "poc-walking-skeleton.md",
};

function skillDir(lang, agent, skill) {
  return path.join(TEMPLATES, lang, agent, "skills", skill);
}

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

// ファイル全体の SHA-256 (byte ベース)。
function fileHash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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

// ---- 項目1: rule 配置と対称性 (Req 7.1) ----
// 4面すべての存在 + 同一言語内 claude/codex の byte 等価 (hash 比較)。
// 4面存在保証は本テストが単独で担う (design Testing Strategy Integration 2)。

for (const lang of LANGS) {
  for (const [skill, rule] of Object.entries(POC_RULES)) {
    test(`rule 配置: ${lang}/${skill}/rules/${rule} が claude/codex 両面に存在し byte 等価 (7.1)`, () => {
      const claudePath = path.join(skillDir(lang, "claude", skill), "rules", rule);
      const codexPath = path.join(skillDir(lang, "codex", skill), "rules", rule);
      assert.ok(fs.existsSync(claudePath), `claude 面に rule が存在する: ${claudePath}`);
      assert.ok(fs.existsSync(codexPath), `codex 面に rule が存在する: ${codexPath}`);
      assert.equal(
        fileHash(claudePath),
        fileHash(codexPath),
        `${lang}/${skill}/rules/${rule} が claude/codex 間で byte 同一 (hash 一致・ドリフトしていない)`,
      );
    });
  }
}

// ---- 項目2: scaffold 形式 (Req 7.2) ----
// 期待見出しは実テンプレートの確定リテラル (tasks.md Implementation Notes が正)。

const TREE_POC_SECTION = {
  ja: "## PoC 実験定義（purpose: poc のとき記入）",
  en: "## PoC Experiment Definition (fill in when purpose: poc)",
};
const TREE_POC_SUBHEADINGS = {
  ja: ["### 仮説", "### 反証条件", "### GO/NO-GO 基準", "### 画面ラフ参照"],
  en: [
    "### Hypothesis",
    "### Falsification Criteria",
    "### GO-NO-GO Criteria",
    "### Screen Rough Reference",
  ],
};
const L1_METRIC_NOTATION = {
  ja: "計測基準:",
  en: "Measurement criteria:",
};
const PACKETS_WS_HEADING = {
  ja: "## Walking Skeleton（purpose: poc のとき記入）",
  en: "## Walking Skeleton (fill in when purpose: poc)",
};

for (const lang of LANGS) {
  test(`scaffold mode.md: ${lang} に purpose 行 (poc / product) がある (7.2)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "mode.md"));
    const m = content.match(/^- \*\*purpose\*\*: (.+)$/m);
    assert.ok(m, `${lang}/intent/mode.md に「- **purpose**: 」行がある`);
    assert.ok(
      m[1].includes("poc / product"),
      `${lang}: purpose 行に取り得る値 (poc / product) が示されている (実際: ${m[1]})`,
    );
  });

  test(`scaffold intent-tree.md: ${lang} に PoC 実験定義セクションと配下4見出しが順序どおりある (7.2)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "intent-tree.md"));
    const headings = extractHeadings(content);
    const texts = headings.map((h) => h.text);

    const sectionIdx = texts.indexOf(TREE_POC_SECTION[lang]);
    assert.notEqual(sectionIdx, -1, `${lang}: 「${TREE_POC_SECTION[lang]}」見出しがある`);

    // セクション直下の見出し4つが、レベル3の規定サブ見出しと順序込みで一致する。
    assert.deepEqual(
      texts.slice(sectionIdx + 1, sectionIdx + 5),
      TREE_POC_SUBHEADINGS[lang],
      `${lang}: PoC 実験定義の直下に規定の4見出しが順序どおり並ぶ`,
    );
    for (let i = sectionIdx + 1; i <= sectionIdx + 4; i++) {
      assert.equal(headings[i].level, 3, `${lang}: 「${headings[i].text}」がレベル3 (###) である`);
    }
  });

  test(`scaffold intent-tree.md: ${lang} の L1 説明に計測基準の表記 (${L1_METRIC_NOTATION[lang]}) がある (7.2)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "intent-tree.md"));
    assert.ok(
      content.includes(L1_METRIC_NOTATION[lang]),
      `${lang}/intent/intent-tree.md に L1 計測基準の表記「${L1_METRIC_NOTATION[lang]}」がある`,
    );
  });

  test(`scaffold packets.md: ${lang} に Walking Skeleton 見出しがある (7.2)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "packets.md"));
    const texts = extractHeadings(content).map((h) => h.text);
    assert.ok(
      texts.includes(PACKETS_WS_HEADING[lang]),
      `${lang}/intent/packets.md に「${PACKETS_WS_HEADING[lang]}」見出しがある`,
    );
  });
}

// ja/en 見出し構造 1:1 (レベル列の順序付き一致)。新セクション追加後も翻訳での欠落・余剰が無いことを
// ファイル全体で固定する (lifecycle.test の deltas.md 検査と同方式)。
for (const name of ["intent-tree", "packets"]) {
  test(`scaffold ${name}.md: ja/en の見出し構造 (レベル列) が 1:1 (7.2)`, () => {
    const headingsByLang = {};
    for (const lang of LANGS) {
      const content = read(path.join(TEMPLATES, lang, "intent", `${name}.md`));
      headingsByLang[lang] = extractHeadings(content);
      assert.ok(headingsByLang[lang].length > 0, `${lang}/intent/${name}.md に見出しがある`);
    }
    assert.deepEqual(
      headingsByLang.en.map((h) => h.level),
      headingsByLang.ja.map((h) => h.level),
      `${name}.md: ja/en の見出しレベル列 (順序含む) が一致する (翻訳での見出し欠落・余剰なし)`,
    );
  });
}

// ---- 項目3: 配線 (Req 7.1、発火経路保証) ----
// SKILL.md (4面) が新規 rule を相対パスで参照していること。

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    for (const [skill, rule] of Object.entries(POC_RULES)) {
      test(`配線: ${lang}/${agent}/${skill}/SKILL.md が rules/${rule} を参照する (7.1)`, () => {
        const content = read(path.join(skillDir(lang, agent, skill), "SKILL.md"));
        assert.ok(
          content.includes(`rules/${rule}`),
          `${lang}/${agent}/${skill}/SKILL.md に rules/${rule} への参照がある`,
        );
      });
    }
  }
}

// ---- 項目4: 規範検査 (validate-checks.md 4面) ----
// 区分「規範」5行 (表のデータ行を数える)・3深刻度ラベル・降格規則・purpose 未記録の扱い。
// 4面それぞれを直接検査する (claude/codex 等価は別 spec の lifecycle.test が担うが、
// design Testing Strategy 4 は「4面」を明示するため面ごとに検査する)。

const NORMATIVE_CATEGORY_ROW = {
  ja: /^\| 規範 \|/gm,
  en: /^\| Normative \|/gm,
};
// 深刻度3分類は定義表のデータ行 (行頭セル) として存在すること
// (en の "info" 等は素朴な includes だと他語にマッチし得るためセル形式で検査する)。
const SEVERITY_LABEL_ROWS = {
  ja: [/^\| 要修正 \|/m, /^\| 推奨 \|/m, /^\| 情報 \|/m],
  en: [/^\| must-fix \|/m, /^\| recommended \|/m, /^\| info \|/m],
};
const DEMOTION_RULE_MARKERS = {
  ja: ["### 降格規則", "「情報」に下げて報告"],
  en: ["### Demotion rule", 'lowered to "info"'],
};
const PURPOSE_UNRECORDED_ROW = {
  ja: /^\| 規範 \| purpose が未記録.*\| purpose 未記録 \| 情報 \|$/m,
  en: /^\| Normative \| purpose is unrecorded.*\| purpose unrecorded \| info \|$/m,
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`規範検査: ${lang}/${agent} validate-checks.md に規範5行・3深刻度・降格規則・purpose 未記録の扱いがある (7.1)`, () => {
      const content = read(
        path.join(skillDir(lang, agent, "intent-validate"), "rules", "validate-checks.md"),
      );

      // 区分「規範」のデータ行がちょうど5行 (4つの poc 検査 + purpose 未記録の告知行)。
      const rows = [...content.matchAll(NORMATIVE_CATEGORY_ROW[lang])];
      assert.equal(
        rows.length,
        5,
        `${lang}/${agent}: 区分「規範」の表データ行が5行ある (実際: ${rows.length})`,
      );

      // 深刻度3分類のラベルが定義表のデータ行として存在する。
      for (const re of SEVERITY_LABEL_ROWS[lang]) {
        assert.match(content, re, `${lang}/${agent}: 深刻度ラベル行 ${re} が存在する`);
      }

      // 降格規則 (理由付き見送り記録があれば「情報」へ降格)。
      for (const marker of DEMOTION_RULE_MARKERS[lang]) {
        assert.ok(
          content.includes(marker),
          `${lang}/${agent}: 降格規則のマーカー「${marker}」が存在する`,
        );
      }

      // purpose 未記録の扱い: poc 条件の規範検査をスキップし、情報として本行のみ告知する行。
      assert.match(
        content,
        PURPOSE_UNRECORDED_ROW[lang],
        `${lang}/${agent}: purpose 未記録の扱い (規範 / 情報) の行が存在する`,
      );
    });
  }
}

// ---- 項目5: 表が正 (検査数・行番号ハードコードの不在、Req 7.5 の陳腐化防止) ----
// intent-validate の SKILL.md ×4 + validate-checks.md ×4 = 計8ファイル。
// 「8検査」「8 checks」「8行目」「row 8」等の固定数表現が残っていないこと
// (英語パターンは大文字小文字を区別しない)。

const FORBIDDEN_PATTERNS = [/8\s*検査/, /8 checks/i, /8\s*行目/, /row 8/i];

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    for (const rel of ["SKILL.md", path.join("rules", "validate-checks.md")]) {
      const relPosix = rel.split(path.sep).join("/");
      test(`表が正: ${lang}/${agent}/intent-validate/${relPosix} に検査数・行番号のハードコードが無い (7.5)`, () => {
        const content = read(path.join(skillDir(lang, agent, "intent-validate"), rel));
        for (const re of FORBIDDEN_PATTERNS) {
          assert.doesNotMatch(
            content,
            re,
            `${lang}/${agent}/intent-validate/${relPosix}: 固定数表現 ${re} が残っていない (表が正)`,
          );
        }
      });
    }
  }
}
