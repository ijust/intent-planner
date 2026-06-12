// PoC カバレッジ (intent-planner-poc-coverage) の構造検証 (task 6.1)。
// designer-questions opt-in ゲートへの改訂 (task 13.1) に追従済み。
// node:test 標準・依存ゼロ (INV2)。
//
// 範囲分担 (重複回避):
//   - 新規 rules の配布・npm pack 同梱・ja/en ファイル集合パリティは
//     install.test / structure-pack.test の動的列挙がカバーする。
//   - ただし既存テストは「codex ツリーからの列挙」「言語間のパス集合比較」であり、
//     4面 (ja/en × claude/codex) すべての存在保証は本ファイルの項目1が単独で担う
//     (codex 側コピー漏れは既存テストをすり抜ける。design Testing Strategy Integration 2)。
//   - 本ファイルは design Testing Strategy「Unit / Structural Tests」項目 1〜5 に集中する:
//       1. rule 配置と対称性: designer-questions.md / walking-skeleton.md が4面に存在し、
//          同一言語内で claude/codex が byte 等価。旧名 (purpose-poc.md /
//          poc-walking-skeleton.md) が4面のどこにも残っていない (Req 7.1)
//       2. scaffold 形式: mode.md の designer-questions / purpose 行、
//          intent-tree.md「PoC 実験定義」配下3見出しと独立した「画面ラフ参照」セクション、
//          packets/plan.md「Walking Skeleton」が ja/en 双方に存在し見出し構造が 1:1 (Req 7.2)
//          (intent-planner-packet-files task 2 で packets.md → packets/plan.md へ付け替え)
//       3. 配線: discover SKILL.md (4面) が rules/designer-questions.md を、
//          packets SKILL.md (4面) が rules/walking-skeleton.md を無条件 (条件語の共起なし)
//          で参照している (Req 7.1、発火経路保証)
//       4. 規範検査: validate-checks.md (4面) に区分「規範」6行・3深刻度ラベル・降格規則・
//          告知2行 (designer-questions 未記録 / purpose 未記録)・2系統条件
//          (designer-questions=on かつ purpose=poc / designer-questions=on 単独) が存在する (Req 7.1)
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
  "intent-discover": "designer-questions.md",
  "intent-packets": "walking-skeleton.md",
};

// 改名前の旧 rule 名 (skill → 旧ファイル名)。改名波及漏れの検出に使う。
const OLD_POC_RULES = {
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

// 旧名不在: purpose-poc.md / poc-walking-skeleton.md が4面のどこにも残っていないこと
// (designer-questions opt-in への改訂に伴う改名の波及漏れ検出)。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    for (const [skill, oldRule] of Object.entries(OLD_POC_RULES)) {
      test(`rule 配置: ${lang}/${agent}/${skill}/rules/${oldRule} (旧名) が存在しない (7.1)`, () => {
        const oldPath = path.join(skillDir(lang, agent, skill), "rules", oldRule);
        assert.ok(
          !fs.existsSync(oldPath),
          `旧名 rule が残っていない (改名波及漏れ): ${oldPath}`,
        );
      });
    }
  }
}

// ---- 項目2: scaffold 形式 (Req 7.2) ----
// 期待見出しは実テンプレートの確定リテラル (tasks.md Implementation Notes が正)。

const TREE_POC_SECTION = {
  ja: "## PoC 実験定義（purpose: poc のとき記入）",
  en: "## PoC Experiment Definition (fill in when purpose: poc)",
};
const TREE_POC_SUBHEADINGS = {
  ja: ["### 仮説", "### 反証条件", "### GO/NO-GO 基準"],
  en: ["### Hypothesis", "### Falsification Criteria", "### GO-NO-GO Criteria"],
};
const TREE_SCREEN_ROUGH_SECTION = {
  ja: "## 画面ラフ参照（designer-questions: on のとき記入）",
  en: "## Screen Rough Reference (fill in when designer-questions: on)",
};
const TREE_OPEN_QUESTIONS_SECTION = {
  ja: "## Open Questions",
  en: "## Open Questions",
};
const L1_METRIC_NOTATION = {
  ja: "計測基準:",
  en: "Measurement criteria:",
};
const PACKETS_WS_HEADING = {
  ja: "## Walking Skeleton（designer-questions: on のとき記入）",
  en: "## Walking Skeleton (fill in when designer-questions: on)",
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

  test(`scaffold mode.md: ${lang} に designer-questions 行 (on / off) がある (7.2)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "mode.md"));
    const m = content.match(/^- \*\*designer-questions\*\*: (.+)$/m);
    assert.ok(m, `${lang}/intent/mode.md に「- **designer-questions**: 」行がある`);
    assert.ok(
      m[1].includes("on / off"),
      `${lang}: designer-questions 行に取り得る値 (on / off) が示されている (実際: ${m[1]})`,
    );
  });

  test(`scaffold intent-tree.md: ${lang} に PoC 実験定義セクションと配下3見出しが順序どおりある (7.2)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "intent-tree.md"));
    const headings = extractHeadings(content);
    const texts = headings.map((h) => h.text);

    const sectionIdx = texts.indexOf(TREE_POC_SECTION[lang]);
    assert.notEqual(sectionIdx, -1, `${lang}: 「${TREE_POC_SECTION[lang]}」見出しがある`);

    // セクション直下の見出し3つが、レベル3の規定サブ見出しと順序込みで一致する。
    assert.deepEqual(
      texts.slice(sectionIdx + 1, sectionIdx + 4),
      TREE_POC_SUBHEADINGS[lang],
      `${lang}: PoC 実験定義の直下に規定の3見出しが順序どおり並ぶ`,
    );
    for (let i = sectionIdx + 1; i <= sectionIdx + 3; i++) {
      assert.equal(headings[i].level, 3, `${lang}: 「${headings[i].text}」がレベル3 (###) である`);
    }
  });

  // 画面ラフ参照は purpose ゲートから独立した designer-questions ゲートの独立セクション。
  // PoC 実験定義より後・Open Questions より前に位置する。
  test(`scaffold intent-tree.md: ${lang} に独立した画面ラフ参照セクションが規定位置にある (7.2)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "intent-tree.md"));
    const texts = extractHeadings(content).map((h) => h.text);

    const pocIdx = texts.indexOf(TREE_POC_SECTION[lang]);
    const roughIdx = texts.indexOf(TREE_SCREEN_ROUGH_SECTION[lang]);
    const openIdx = texts.indexOf(TREE_OPEN_QUESTIONS_SECTION[lang]);
    assert.notEqual(roughIdx, -1, `${lang}: 「${TREE_SCREEN_ROUGH_SECTION[lang]}」見出しがある`);
    assert.notEqual(openIdx, -1, `${lang}: 「${TREE_OPEN_QUESTIONS_SECTION[lang]}」見出しがある`);
    assert.ok(
      pocIdx < roughIdx,
      `${lang}: 画面ラフ参照が PoC 実験定義セクションより後にある (poc=${pocIdx}, rough=${roughIdx})`,
    );
    assert.ok(
      roughIdx < openIdx,
      `${lang}: 画面ラフ参照が Open Questions より前にある (rough=${roughIdx}, open=${openIdx})`,
    );
  });

  test(`scaffold intent-tree.md: ${lang} の L1 説明に計測基準の表記 (${L1_METRIC_NOTATION[lang]}) がある (7.2)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "intent-tree.md"));
    assert.ok(
      content.includes(L1_METRIC_NOTATION[lang]),
      `${lang}/intent/intent-tree.md に L1 計測基準の表記「${L1_METRIC_NOTATION[lang]}」がある`,
    );
  });

  test(`scaffold packets/plan.md: ${lang} に Walking Skeleton 見出しがある (7.2)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "packets", "plan.md"));
    const texts = extractHeadings(content).map((h) => h.text);
    assert.ok(
      texts.includes(PACKETS_WS_HEADING[lang]),
      `${lang}/intent/packets/plan.md に「${PACKETS_WS_HEADING[lang]}」見出しがある`,
    );
  });
}

// ja/en 見出し構造 1:1 (レベル列の順序付き一致)。新セクション追加後も翻訳での欠落・余剰が無いことを
// ファイル全体で固定する (lifecycle.test の deltas.md 検査と同方式)。
// packets.md は intent-planner-packet-files task 2 で packets/plan.md へ分解された。
for (const rel of ["intent-tree.md", path.join("packets", "plan.md")]) {
  const relPosix = rel.split(path.sep).join("/");
  test(`scaffold ${relPosix}: ja/en の見出し構造 (レベル列) が 1:1 (7.2)`, () => {
    const headingsByLang = {};
    for (const lang of LANGS) {
      const content = read(path.join(TEMPLATES, lang, "intent", rel));
      headingsByLang[lang] = extractHeadings(content);
      assert.ok(headingsByLang[lang].length > 0, `${lang}/intent/${relPosix} に見出しがある`);
    }
    assert.deepEqual(
      headingsByLang.en.map((h) => h.level),
      headingsByLang.ja.map((h) => h.level),
      `${relPosix}: ja/en の見出しレベル列 (順序含む) が一致する (翻訳での見出し欠落・余剰なし)`,
    );
  });
}

// ---- 項目3: 配線 (Req 7.1、発火経路保証) ----
// SKILL.md (4面) が新規 rule を相対パスで参照していること。
// さらに参照は無条件であること: rule を参照する行に条件語 (ja「の場合」「のとき」 /
// en「if 」「when 」) が共起しない。条件判定は rule 側の適用条件に委ねる設計のため、
// SKILL.md 側で発火を条件分岐させる書き方が紛れ込んでいないことを固定する。

const CONDITIONAL_MARKERS = {
  ja: ["の場合", "のとき"],
  en: ["if ", "when "],
};

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

      test(`配線: ${lang}/${agent}/${skill}/SKILL.md の rules/${rule} 参照行が無条件である (7.1)`, () => {
        const content = read(path.join(skillDir(lang, agent, skill), "SKILL.md"));
        const refLines = content.split(/\r?\n/).filter((l) => l.includes(`rules/${rule}`));
        assert.ok(refLines.length > 0, `${lang}/${agent}/${skill}/SKILL.md に rules/${rule} の参照行がある`);
        for (const line of refLines) {
          // en は大文字小文字の揺れを吸収するため小文字化して比較する。
          const haystack = lang === "en" ? line.toLowerCase() : line;
          for (const marker of CONDITIONAL_MARKERS[lang]) {
            assert.ok(
              !haystack.includes(marker),
              `${lang}/${agent}/${skill}/SKILL.md: 参照行に条件語「${marker}」が共起しない (無条件配線): ${line}`,
            );
          }
        }
      });
    }
  }
}

// ---- 項目4: 規範検査 (validate-checks.md 4面) ----
// 区分「規範」6行 (表のデータ行を数える)・3深刻度ラベル・降格規則・告知2行・2系統条件。
// 4面それぞれを直接検査する (claude/codex 等価は別 spec の lifecycle.test が担うが、
// design Testing Strategy 4 は「4面」を明示するため面ごとに検査する)。

// ID セルは kebab-case (l1-metric-missing のように数字を含み得るため [a-z0-9-])。
const NORMATIVE_CATEGORY_ROW = {
  ja: /^\| [a-z0-9-]+ \| 規範 \|/gm,
  en: /^\| [a-z0-9-]+ \| Normative \|/gm,
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
// 告知2行: 未記録時に規範検査をスキップし、情報として本行のみ告知する行。
// ① designer-questions 未記録 (規範すべてをスキップ)
// ② designer-questions=on かつ purpose 未記録 (poc 条件の検査のみスキップ)
const DQ_UNRECORDED_ROW = {
  ja: /^\| [a-z0-9-]+ \| 規範 \| designer-questions が未記録.*\| designer-questions 未記録 \| 情報 \|$/m,
  en: /^\| [a-z0-9-]+ \| Normative \| designer-questions is unrecorded.*\| designer-questions unrecorded \| info \|$/m,
};
const PURPOSE_UNRECORDED_ROW = {
  ja: /^\| [a-z0-9-]+ \| 規範 \| purpose が未記録.*\| designer-questions=on かつ purpose 未記録 \| 情報 \|$/m,
  en: /^\| [a-z0-9-]+ \| Normative \| purpose is unrecorded.*\| designer-questions=on and purpose unrecorded \| info \|$/m,
};
// 2系統条件: poc 条件 (designer-questions=on かつ purpose=poc) と
// designer-questions=on 単独条件の両方が条件セルとして存在すること。
const TWO_TRACK_CONDITION_CELLS = {
  ja: [/\| designer-questions=on かつ purpose=poc \|/, /\| designer-questions=on \|/],
  en: [/\| designer-questions=on and purpose=poc \|/, /\| designer-questions=on \|/],
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`規範検査: ${lang}/${agent} validate-checks.md に規範6行・3深刻度・降格規則・告知2行・2系統条件がある (7.1)`, () => {
      const content = read(
        path.join(skillDir(lang, agent, "intent-validate"), "rules", "validate-checks.md"),
      );

      // 区分「規範」のデータ行がちょうど6行 (4つの designer-questions ゲート検査 + 告知2行)。
      const rows = [...content.matchAll(NORMATIVE_CATEGORY_ROW[lang])];
      assert.equal(
        rows.length,
        6,
        `${lang}/${agent}: 区分「規範」の表データ行が6行ある (実際: ${rows.length})`,
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

      // 告知2行: designer-questions 未記録 / purpose 未記録 (いずれも深刻度は情報)。
      assert.match(
        content,
        DQ_UNRECORDED_ROW[lang],
        `${lang}/${agent}: designer-questions 未記録の告知行 (規範 / 情報) が存在する`,
      );
      assert.match(
        content,
        PURPOSE_UNRECORDED_ROW[lang],
        `${lang}/${agent}: purpose 未記録の告知行 (規範 / 情報) が存在する`,
      );

      // 2系統条件: poc 条件の行と designer-questions=on 単独条件の行が両方存在する。
      for (const re of TWO_TRACK_CONDITION_CELLS[lang]) {
        assert.match(content, re, `${lang}/${agent}: 条件セル ${re} を持つ行が存在する`);
      }
    });
  }
}

// ---- 項目5: 表が正 (検査数・行番号ハードコードの不在、Req 7.5 の陳腐化防止) ----
// intent-validate の SKILL.md ×4 + validate-checks.md ×4 = 計8ファイル。
// 「8検査」「8 checks」「8行目」「row 8」等の固定数表現が残っていないこと
// (任意の数字で検査する — 検査追加後の「14検査」「行9」等の再発も検出する。
// 英語パターンは大文字小文字を区別しない)。

const FORBIDDEN_PATTERNS = [/\d+\s*検査/, /\d+ checks/i, /\d+\s*行目/, /row \d+/i];

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
