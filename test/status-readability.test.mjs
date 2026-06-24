// status-readability (intent-planner-status-readability) の防護テスト (task 4.1)。
// node:test 標準・依存ゼロ (INV2)。
//
// design「Testing Strategy」に対応。検査対象は本 spec が intent-status へ着地させた
// 「用語常時併記ルール」「用語説明一覧」(SKILL.md) と「コマンド一言説明」(decision-table.md)、
// および read-only 不変・判定先 (row→command) 不変。
//
// 範囲分担 (重複回避):
//   - rules byte 等価 (claude⇔codex) は agent-rules-parity が、frontmatter 5フィールドと
//     ja↔en 見出しレベル列一致は structure-pack / export-dirs が担うため再検査しない。
//   - export-log 解決順序の文言は export-dirs.test.mjs が担うため再検査しない。
//
// アンカー原則 (design Risk 対応): アンカーは「意味を担保する最小の固定句」に限定し、
// 長文完全一致で脆くしない。ja/en は別リテラルを用いる。
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

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

function statusSkill(lang, agent) {
  return read(path.join(TEMPLATES, lang, agent, "skills", "intent-status", "SKILL.md"));
}

function decisionTable(lang, agent) {
  return read(
    path.join(TEMPLATES, lang, agent, "skills", "intent-status", "rules", "decision-table.md"),
  );
}

// 表のデータ行 (先頭セルが裸の数字 = row) のみを抽出する。
// 脚注のコマンド対応表はキーが `/intent-xxx` で先頭が数字でないためマッチしない。
function tableRows(text) {
  return text.split(/\r?\n/).filter((l) => /^\| \d+ \|/.test(l));
}

function rowByNumber(text, n) {
  return tableRows(text).find((l) => new RegExp(`^\\| ${n} \\|`).test(l));
}

// ---- 項目1: 常時併記ルールの存在 (Req 7.2) ----

// 2層併記ルール (status-legibility-candidate-display で導入): 冒頭=初出/見出しのみ・詳細=毎回。
// 用語併記を全廃せず詳細側で毎回保つこと (status-readability の価値を巻き戻さない) を discriminative に固定する。
const ANNOTATE_RULE = {
  ja: [
    "2層併記ルール",
    "冒頭（既定のスリムな要点）では併記を初出・表見出しのみに絞る",
    "詳細（折りたたみ位置）では、その術語が出力に現れるたびに毎回併記する",
    "用語説明一覧そのものは維持し、術語併記を全廃しない",
    "訳語に置換しない",
  ],
  en: [
    "Two-layer annotation rule",
    "the annotation is limited to the first occurrence and table headers only",
    "the term is annotated every time it appears",
    "The glossary itself is kept and the annotation is not abolished",
    "never replaced by a translation",
  ],
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`併記ルール: ${lang}/${agent} intent-status SKILL に常時併記ルールのアンカーがある (7.2)`, () => {
      const content = statusSkill(lang, agent);
      for (const needle of ANNOTATE_RULE[lang]) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 併記ルール「${needle}」がある`);
      }
    });
  }
}

// ---- 項目2: 成果物名の説明 (Req 7.2) ----
// Intent Tree / Intent Compass / Packets / Source Packet / delta の一行説明アンカー。

const DELIVERABLE_DESC = {
  ja: [
    "やりたいことの階層マップ",
    "局所最適を防ぐための判断基準",
    "cc-sdd に渡す前の作業単位",
    "その下書きの元になった packet",
    "canonical 成果物を事後更新するための差分記録",
  ],
  en: [
    "the hierarchical map of what you want to do",
    "the decision criteria for preventing local optimizations",
    "the work unit before handing off to cc-sdd",
    "the packet a draft originated from",
    "the diff record used to update a canonical deliverable after the fact",
  ],
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`成果物名: ${lang}/${agent} intent-status SKILL に成果物名の一行説明がある (7.2)`, () => {
      const content = statusSkill(lang, agent);
      for (const needle of DELIVERABLE_DESC[lang]) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 成果物名説明「${needle}」がある`);
      }
    });
  }
}

// ---- 項目3: 状態・検査語の説明 (Req 7.2) ----
// state 5値・stale・enforcement・drift 4語の説明アンカー。

const STATE_CHECK_DESC = {
  ja: {
    state: ["起案中・未確定", "着手可（依存解決済み・実装待ち）", "実装中", "実装済み・検証待ち（Evidence 未確定）", "証拠取得済み・完了"],
    check: ["書き戻し漏れの強制度", "書き戻しが古い", "意図からのズレ（drift）の監視"],
    drift: ["export 時にズレを捕捉できた", "ズレを防げず通してしまった", "誤検知だった"],
  },
  en: {
    state: [
      "drafting / undetermined",
      "ready to start (dependencies resolved, awaiting implementation)",
      "under implementation",
      "implemented, awaiting verification (Evidence undetermined)",
      "evidence obtained / complete",
    ],
    check: ["the strength of writeback enforcement", "the writeback is out of date", "monitoring of drift (deviation) from intent"],
    drift: ["the drift was captured at export", "the drift could not be prevented and got through", "it was a false alarm"],
  },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`状態・検査語: ${lang}/${agent} intent-status SKILL に state 5値・stale・enforcement・drift の説明がある (7.2)`, () => {
      const content = statusSkill(lang, agent);
      const spec = STATE_CHECK_DESC[lang];
      for (const needle of [...spec.state, ...spec.check, ...spec.drift]) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 状態・検査語説明「${needle}」がある`);
      }
    });
  }
}

// ---- 項目4: unjudged の区別 (Req 6.3 検証) ----
// unjudged が user-verdict として説明され、outcome として取り違えられていないこと。
// 用語説明一覧の unjudged 行 (`| unjudged | ...`) を切り出し、その行が user-verdict を
// 種別として持ち outcome を種別としていないことを assert する。

const UNJUDGED_VERDICT = {
  ja: "まだ人がそのズレの妥当性を判定していない",
  en: "a human has not yet judged the validity of the drift",
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`unjudged 区別: ${lang}/${agent} intent-status SKILL で unjudged が user-verdict として説明されている (6.3)`, () => {
      const content = statusSkill(lang, agent);
      const unjudgedRow = content
        .split(/\r?\n/)
        .find((l) => /^\|\s*unjudged\s*\|/.test(l));
      assert.ok(unjudgedRow, `${lang}/${agent}: 用語説明一覧に unjudged のデータ行がある`);
      assert.ok(
        unjudgedRow.includes("user-verdict"),
        `${lang}/${agent}: unjudged 行に種別 user-verdict がある`,
      );
      assert.ok(
        !/\|\s*outcome\s*\|/.test(unjudgedRow),
        `${lang}/${agent}: unjudged 行は種別を outcome としていない (取り違え検出)`,
      );
      assert.ok(
        unjudgedRow.includes(UNJUDGED_VERDICT[lang]),
        `${lang}/${agent}: unjudged 行に user-verdict 相当の説明「${UNJUDGED_VERDICT[lang]}」がある`,
      );
    });
  }
}

// ---- 項目5: コマンド一言説明 (Req 7.2) ----
// decision-table.md の脚注に主要コマンドの一言説明アンカーがある。

const COMMAND_DESC = {
  ja: {
    "/intent-discover": "最初の意図整理",
    "/intent-packets": "作業単位への分割",
    "/intent-writeback": "実装結果を意図へ反映",
    "/intent-export-cc-sdd": "cc-sdd へ受け渡し",
  },
  en: {
    "/intent-discover": "First intent organization",
    "/intent-packets": "Splitting into work units",
    "/intent-writeback": "Reflecting implementation results into intent",
    "/intent-export-cc-sdd": "Handing off to cc-sdd",
  },
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`コマンド一言: ${lang}/${agent} decision-table にコマンド一言説明がある (7.2)`, () => {
      const content = decisionTable(lang, agent);
      for (const [cmd, desc] of Object.entries(COMMAND_DESC[lang])) {
        assert.ok(content.includes(cmd), `${lang}/${agent}: 脚注に ${cmd} がある`);
        assert.ok(content.includes(desc), `${lang}/${agent}: ${cmd} の一言説明「${desc}」がある`);
      }
    });
  }
}

// ---- 項目6: 推奨先不変 (Req 6.2) ----
// 表本体のデータ行 (^| \d+ |) を抽出し、特定 row が特定コマンド literal を含む固定検査。
// 脚注のコマンド対応表は数字始まりでないため非衝突 (tableRows がマッチしない)。
// row 2 → /intent-discover、row 4 → /intent-packets、row 6 → /intent-writeback、
// row 9 → /intent-writeback。いずれも推奨セルにコマンドが直書きの安定行。

const ROW_COMMAND = [
  [2, "/intent-discover"],
  [4, "/intent-packets"],
  [6, "/intent-writeback"],
  [9, "/intent-writeback"],
];

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`推奨先不変: ${lang}/${agent} decision-table の固定 row が想定コマンドを推す (6.2)`, () => {
      const content = decisionTable(lang, agent);
      const rows = tableRows(content);
      // 脚注表が row 検査に混ざっていないことの自己検算 (先頭数字行のみが抽出される)。
      assert.ok(rows.length >= 12, `${lang}/${agent}: 表本体のデータ行が12行以上ある (実際: ${rows.length})`);
      for (const [n, cmd] of ROW_COMMAND) {
        const row = rowByNumber(content, n);
        assert.ok(row, `${lang}/${agent}: row ${n} が存在する`);
        assert.ok(
          row.includes(cmd),
          `${lang}/${agent}: row ${n} が ${cmd} を推す (推奨先不変)`,
        );
      }
    });
  }
}

// ---- 項目7: read-only 不変 (Req 6.4) ----
// SKILL.md に read-only 宣言・「Bash は intent-check 起動に限る」既存文言が残存する。
// ja は「read-only」「intent-check」、en は "read-only" / "intent-check" を別アンカーで検査。

const READONLY_ANCHORS = {
  ja: ["read-only 宣言", "ファイルの作成・変更・削除を一切行わない", "intent-check"],
  en: ["Read-only declaration", "never create, modify, or delete any file", "intent-check"],
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`read-only 不変: ${lang}/${agent} intent-status SKILL に read-only 宣言と intent-check 限定がある (6.4)`, () => {
      const content = statusSkill(lang, agent);
      for (const needle of READONLY_ANCHORS[lang]) {
        assert.ok(content.includes(needle), `${lang}/${agent}: read-only アンカー「${needle}」がある`);
      }
    });
  }
}

// ---- 項目8: 冒頭ミニ工程レール (progress rail) ----
// 報告冒頭に5信号のミニレールを置き、残工程 (⚪) と書き戻し漏れ (🔴) を一望させる。
// レールは表示層であり decision-table の first-match ロジックを変えない (項目6 が裏取り)。
// 5信号の絵文字は ja/en・claude/codex 共通の語彙正本。

const RAIL_SIGNALS = ["✅", "🔵", "⚪", "🔴", "◻"];
const RAIL_STATUS = {
  ja: {
    railTerm: "工程レール",
    nextMoveOneLine: "1行",
    detailsFolded: "詳細",
    notStarted: "未着手",
    unreflected: "反映漏れ",
    presentationLayer: "表示層",
  },
  en: {
    railTerm: "Progress rail",
    nextMoveOneLine: "one line",
    detailsFolded: "Details",
    notStarted: "not started",
    unreflected: "unreflected",
    presentationLayer: "presentation layer",
  },
};

for (const lang of LANGS) {
  const R = RAIL_STATUS[lang];
  for (const agent of AGENTS) {
    test(`ミニレール: ${lang}/${agent} intent-status SKILL の Step 5 が5信号レールを冒頭に置く`, () => {
      const content = statusSkill(lang, agent);
      assert.ok(content.includes(R.railTerm), `${lang}/${agent}: 「${R.railTerm}」に言及する`);
      for (const sig of RAIL_SIGNALS) {
        assert.ok(content.includes(sig), `${lang}/${agent}: 信号 ${sig} が登場する`);
      }
      assert.ok(content.includes(R.notStarted), `${lang}/${agent}: 未着手 (残工程) の語彙がある`);
      assert.ok(content.includes(R.unreflected), `${lang}/${agent}: 反映漏れ (writeback 漏れ) の語彙がある`);
      // レールが「次の一手」より前に出る (俯瞰 → 次の一手 → 詳細の順)。
      const railIdx = content.indexOf(R.railTerm);
      const detailIdx = content.lastIndexOf(R.detailsFolded);
      assert.ok(railIdx >= 0, `${lang}/${agent}: 工程レールの記述位置が取れる`);
      assert.ok(
        detailIdx === -1 || railIdx < detailIdx,
        `${lang}/${agent}: 工程レールは詳細 (折りたたみ) より前に置かれる`,
      );
    });
  }
}

// 項目8b: decision-table の脚注6 がレールを表示層と位置づけ、ロジック不変を明示する。
for (const lang of LANGS) {
  const R = RAIL_STATUS[lang];
  for (const agent of AGENTS) {
    test(`レール表示層: ${lang}/${agent} decision-table がレールを表示層と位置づけロジック不変を明示する`, () => {
      const content = decisionTable(lang, agent);
      assert.ok(content.includes(R.railTerm), `${lang}/${agent}: 脚注がレールに言及する`);
      assert.ok(content.includes(R.presentationLayer), `${lang}/${agent}: レールを表示層と位置づける`);
      for (const sig of RAIL_SIGNALS) {
        assert.ok(content.includes(sig), `${lang}/${agent}: 脚注に信号 ${sig} が登場する`);
      }
    });
  }
}

// ---- 項目9: status-legibility-candidate-display (A23/INV31) の新挙動を discriminative に固定 ----
// 既定スリム化・次の一手1行強調・Candidate Packets 常設・Ice box オプション・危険な知らせ既定保持。
// 各 needle はその挙動を落とした実装 (旧 SKILL や regression) を実際に落とすアンカー。

// 9-1: 既定の3層構成 (既定/詳細/オプション) のアンカー。
const LAYER_ANCHORS = {
  ja: ["既定（折りたたまない）", "詳細（折りたたみ位置）", "オプション（自然言語トリガ時のみ）"],
  en: [
    "default (never folded)",
    "details (the folded position)",
    "option (only on a natural-language trigger)",
  ],
};

// 9-2: 次の一手の要約1行を折りたたまず常に強調するアンカー。
const NEXT_MOVE_EMPHASIS = {
  ja: ["この1行は折りたたまず常に出す", "first-match 選定ロジックは変えない"],
  en: [
    "this one line is never folded and is always shown",
    "the first-match selection logic for which move to recommend is not changed",
  ],
};

// 9-3: Candidate Packets 常設表示のアンカー (件数+名前・未消化・read-only・凍結除外)。
const CANDIDATE_ANCHORS = {
  ja: [
    "Candidate Packets（packet 化されていない候補プール）",
    "未消化（packet 化も実装もされていない）候補",
    "件数＋名前",
    "凍結マーク付きの候補（後述 Ice box）は件数＋名前から除外する",
  ],
  en: [
    "Candidate Packets (the pool of not-yet-packeted candidates)",
    "unconsumed (neither packeted nor implemented) candidates",
    "count + names",
    "Candidates with a frozen mark (the Ice box below) are excluded from the count + names",
  ],
};

// 9-4: Ice box オプション表示のアンカー (既定非表示・案内文1行・自然言語トリガ)。
const ICEBOX_ANCHORS = {
  ja: [
    "凍結中（Ice box）: N 件。『icebox も見せて』で表示できます",
    "既定では本体を出さず",
    "Ice box 展開",
  ],
  en: [
    "Frozen (Ice box): N. Show them with 'show me the icebox'",
    "are not shown in the body in the default",
    "Ice box expansion",
  ],
};

// 9-5: 危険な知らせ (鮮度・整合・反映漏れ) を既定にフル保持し詳細にサマリ1行のアンカー。
const DANGER_ANCHORS = {
  ja: ["危険な知らせ", "既定にフル表示したまま保持し", "「⚠ N 件あり（詳細参照）」のサマリ1行"],
  en: [
    "Dangerous notices",
    "keep them shown in full in the default and do not fold them",
    'a one-line summary "⚠ N present (see details)"',
  ],
};

const A23_GROUPS = [
  ["3層構成", LAYER_ANCHORS],
  ["次の一手1行強調", NEXT_MOVE_EMPHASIS],
  ["Candidate 常設", CANDIDATE_ANCHORS],
  ["Ice box オプション", ICEBOX_ANCHORS],
  ["危険な知らせ既定保持", DANGER_ANCHORS],
];

for (const [groupName, anchors] of A23_GROUPS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`A23 ${groupName}: ${lang}/${agent} intent-status SKILL にアンカーがある`, () => {
        const content = statusSkill(lang, agent);
        for (const needle of anchors[lang]) {
          assert.ok(content.includes(needle), `${lang}/${agent}: 「${needle}」がある`);
        }
      });
    }
  }
}

// 9-6: read-only 不変 (Candidate/Ice box を読むのも Read/Glob/Grep のみ・Write を持たない)。
const READONLY_A23 = {
  ja: ["Read / Glob / Grep のみ", "status は何も変更しない"],
  en: ["Read / Glob / Grep only", "status changes nothing"],
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`A23 read-only 不変: ${lang}/${agent} intent-status SKILL が Candidate/Ice box も read-only で読む`, () => {
      const content = statusSkill(lang, agent);
      for (const needle of READONLY_A23[lang]) {
        assert.ok(content.includes(needle), `${lang}/${agent}: 「${needle}」がある`);
      }
    });
  }
}

// ---- 項目10: status-warning-glyph-toning (A24/INV32/DR50) の挙動を discriminative に固定 ----
// 警告信号は「実害がある場面だけ裸・説明の場面はトーンダウン」で出し分ける。
// 実害時の裸表示規律（INV31 既定フル保持）を消す実装を落とすアンカーと、トーンダウン規律のアンカー。

// 10-1: 出し分け規律（実害=裸・説明=トーンダウン）の明文アンカー。
const GLYPH_SPLIT = {
  ja: ["警告信号の見た目の出し分け（INV32）", "裸の絵文字で目立たせる", "説明の場面では裸で出さずインラインコード"],
  en: [
    "Warning-signal display split (INV32)",
    "emphasized as bare glyphs",
    "in the explanatory context",
  ],
};

// 10-2: 凡例の信号がインラインコード化されている（裸の表セルでない）。
const LEGEND_INLINE_CODE = {
  ja: ["`🔴` 反映漏れ", "`⚪` 未着手"],
  en: ["`🔴` unreflected", "`⚪` not started"],
};

// 10-3: 実害時の裸表示規律（INV31）が残っている（トーンダウンが実害時まで及んでいない）。
const IMPACT_BARE = {
  ja: ["実際に該当 packet がある実害の場面では INV31 どおり裸の絵文字でフル表示"],
  en: ["they are shown in full as bare glyphs per INV31"],
};

const A24_GROUPS = [
  ["出し分け規律", GLYPH_SPLIT],
  ["凡例インラインコード", LEGEND_INLINE_CODE],
  ["実害時裸表示の保持", IMPACT_BARE],
];

for (const [groupName, anchors] of A24_GROUPS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`A24 ${groupName}: ${lang}/${agent} intent-status SKILL にアンカーがある`, () => {
        const content = statusSkill(lang, agent);
        for (const needle of anchors[lang]) {
          assert.ok(content.includes(needle), `${lang}/${agent}: 「${needle}」がある`);
        }
      });
    }
  }
}
