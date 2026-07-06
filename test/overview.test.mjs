// intent-overview (intent-planner-overview) の受け入れ検証 (task 4.1)。
// node:test 標準・依存ゼロ。
//
// 本 spec は実行可能な検証エンジンを持たず、集約・後方互換・read-only の規律は自然言語の
// 正本 (SKILL.md / rules/*.md) に宣言的に置かれる (実行は intent-overview skill)。よって
// 「後方互換 fixture」「fail-fast fixture」はこの repo の確立パターン (packet-progress.test.mjs)
// に従い、正本に当該規律が一意に記述されていることを文言として機械検査する形で実装する:
//
//   - 4系統パリティ: templates/{ja,en}/{claude,codex}/skills/intent-overview/ に
//     SKILL.md + 同名 7 rules が 1:1 で存在 (R7.1, R7.2)。
//     (coverage-map は pkt-20260704-intent-coverage-map-fe7a で追加 — 対象範囲指定時のみ生成する面。
//      既定実行の挙動は不変で、rule 枚数の固定はこの正規更新で 4→5 に追随した)
//   - frontmatter 差分: claude 版が allowed-tools に Write を含み disable-model-invocation を持たない
//     (auto-invocable)、codex 版は name/description のみ (R6.4, R6.1)。
//   - read-only / 派生書込み境界: SKILL.md 本文が canonical への書込みを宣言せず、書込み先が
//     .intent/overview/ 配下限定であること (R1.2, R6.5)、scaffold README (ja/en) が pack 同梱 (R7.1)。
//   - 後方互換 fixture: depends_on 不在=依存なし / ## Evidence 不在=未記入 / 旧 active=進行中 が
//     aggregate-sources・progress-readout 両方に矛盾なく記述されていること (R2.5, R8.4, R9.4)。
//   - fail-fast fixture: .intent/ または intent-tree.md 欠落時に overview.md を生成せず
//     先行スキルを案内する規律が SKILL.md に記述されていること (R1.4, R1.5)。
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
const AGENTS = ["claude", "codex"];
const SKILL = "intent-overview";
const RULES = ["aggregate-sources", "mermaid-tree", "gap-readout", "progress-readout", "coverage-map", "decision-inbox", "roadmap-projection"];

function skillRoot(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", SKILL);
}
function read(p) {
  assert.ok(fs.existsSync(p), `対象ファイルが実在する: ${p}`);
  return fs.readFileSync(p, "utf8");
}
// 先頭 `---` フェンス間の key 集合を抽出する (yaml 依存なし)。フェンスが無ければ null。
function frontmatterKeys(p) {
  const lines = read(p).split(/\r?\n/);
  if (lines[0].trim() !== "---") return null;
  const keys = [];
  let closed = false;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closed = true;
      break;
    }
    const m = lines[i].match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (m) keys.push([m[1], m[2].trim()]);
  }
  return closed ? Object.fromEntries(keys) : null;
}

// ---- 4系統パリティ: SKILL.md + 同名 7 rules が 1:1 で存在 (R7.1, R7.2) ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4系統パリティ: ${lang}/${agent} に SKILL.md + 7 rules が存在する`, () => {
      const root = skillRoot(lang, agent);
      assert.ok(fs.existsSync(path.join(root, "SKILL.md")), `${lang}/${agent}: SKILL.md が実在する`);
      for (const r of RULES) {
        assert.ok(
          fs.existsSync(path.join(root, "rules", `${r}.md`)),
          `${lang}/${agent}: rules/${r}.md が実在する`,
        );
      }
      // 余剰の rules が無い (7 枚ちょうど)。
      const present = fs
        .readdirSync(path.join(root, "rules"))
        .filter((f) => f.endsWith(".md"))
        .sort();
      assert.deepEqual(present, RULES.map((r) => `${r}.md`).sort(), `${lang}/${agent}: rules は 7 枚ちょうど`);
    });
  }
}

// rules は claude/codex で byte 等価 (ドリフト防止。agents.test と独立に新スキル単体で固定)。
for (const lang of LANGS) {
  test(`rules byte 等価: ${lang} の intent-overview rules が claude/codex で一致する`, () => {
    for (const r of RULES) {
      const c = fs.readFileSync(path.join(skillRoot(lang, "claude"), "rules", `${r}.md`));
      const x = fs.readFileSync(path.join(skillRoot(lang, "codex"), "rules", `${r}.md`));
      assert.ok(c.equals(x), `${lang}: rules/${r}.md が claude/codex で byte 一致`);
    }
  });
}

// ---- frontmatter 差分: claude は Write・disable は持たない (auto-invocable)、codex は name/description のみ (R6.4, R6.1) ----
for (const lang of LANGS) {
  test(`frontmatter (claude): ${lang} は Write を含み disable-model-invocation を持たない (auto-invocable)・name 一致`, () => {
    const fm = frontmatterKeys(path.join(skillRoot(lang, "claude"), "SKILL.md"));
    assert.ok(fm !== null, `${lang}/claude: frontmatter フェンスが閉じている`);
    assert.equal(fm.name, SKILL, `${lang}/claude: name が ${SKILL}`);
    assert.ok((fm["allowed-tools"] ?? "").split(",").map((s) => s.trim()).includes("Write"),
      `${lang}/claude: allowed-tools に Write を含む`);
    assert.ok(!("disable-model-invocation" in fm), `${lang}/claude: auto-invocable のため disable-model-invocation を持たない`);
    assert.ok((fm.description ?? "").length > 0, `${lang}/claude: description が空でない`);
    assert.ok("argument-hint" in fm, `${lang}/claude: argument-hint がある`);
  });

  test(`frontmatter (codex): ${lang} は name/description のみ・禁止キーを持たない`, () => {
    const fm = frontmatterKeys(path.join(skillRoot(lang, "codex"), "SKILL.md"));
    assert.ok(fm !== null, `${lang}/codex: frontmatter フェンスが閉じている`);
    assert.equal(fm.name, SKILL, `${lang}/codex: name が ${SKILL}`);
    assert.ok((fm.description ?? "").length > 0, `${lang}/codex: description が空でない`);
    for (const forbidden of ["allowed-tools", "argument-hint", "disable-model-invocation"]) {
      assert.ok(!(forbidden in fm), `${lang}/codex: frontmatter は ${forbidden} を持たない (claude との意図的差分)`);
    }
    // codex 版は対話ツール名を本文に持たない (agents.test と同規律)。
    assert.ok(
      !read(path.join(skillRoot(lang, "codex"), "SKILL.md")).includes("AskUserQuestion"),
      `${lang}/codex: SKILL.md は AskUserQuestion を含まない`,
    );
  });
}

// ---- read-only / 派生書込み境界: SKILL.md 本文が書込み先を .intent/overview/ 配下限定と宣言 (R1.2, R6.5) ----
// 言語ごとに実在する文言で検査する (ja/en で表現が異なる)。
const SKILL_LITERALS = {
  ja: {
    writeBoundary: ".intent/overview/` 配下限定",
    derived: "派生",
    failFast: "/intent-discover",
    noCanonicalWrite: "canonical な `.intent/*.md`",
  },
  en: {
    writeBoundary: "writes are limited to under `.intent/overview/`",
    derived: "derived",
    failFast: "/intent-discover",
    noCanonicalWrite: "canonical `.intent/*.md`",
  },
};
for (const lang of LANGS) {
  const L = SKILL_LITERALS[lang];
  for (const agent of AGENTS) {
    test(`read-only 境界: ${lang}/${agent} SKILL.md が書込み先を .intent/overview/ 配下限定と宣言する`, () => {
      const body = read(path.join(skillRoot(lang, agent), "SKILL.md"));
      assert.ok(body.includes(L.writeBoundary), `${lang}/${agent}: 書込み先 .intent/overview/ 配下限定の宣言がある`);
      assert.ok(body.includes(L.noCanonicalWrite), `${lang}/${agent}: canonical を read-only 扱いする宣言がある`);
      assert.ok(body.includes(L.derived), `${lang}/${agent}: 生成物を派生 (derived) と扱う宣言がある`);
      // canonical 成果物への Write を宣言していない (overview/ 限定の裏返し)。
      assert.ok(
        !/intent-tree\.md` に(書き込|更新|生成)|write to .*intent-tree\.md/i.test(body),
        `${lang}/${agent}: canonical 成果物への書込みを宣言していない`,
      );
    });

    test(`fail-fast: ${lang}/${agent} SKILL.md が前提不在時に overview を生成せず先行スキルを案内する`, () => {
      const body = read(path.join(skillRoot(lang, agent), "SKILL.md"));
      assert.ok(body.includes(L.failFast), `${lang}/${agent}: 先行スキル (/intent-discover) を案内する`);
      assert.ok(
        body.includes(".intent/intent-tree.md") || body.includes("intent-tree"),
        `${lang}/${agent}: 必須成果物 (intent-tree) の存在確認に言及する`,
      );
    });
  }
}

// ---- 理解支援ビュー: 自然言語トリガで派生ビューを生成し canonical へ書かない ----
const UNDERSTANDING_VIEW_LITERALS = {
  ja: {
    skill: ["理解地図", "着手前ブリーフ", "理解ギャップ整理"],
    aggregate: ["エージェント理解地図", "C31 / C38", "A48-A49", "agent-understanding-map.md"],
    progress: ["active packet の着手前ブリーフ", "理解ギャップ整理", "understanding-gaps.md"],
  },
  en: {
    skill: ["understanding map", "pre-start briefing", "understanding gap sorting"],
    aggregate: ["agent understanding map", "C31 / C38", "A48-A49", "agent-understanding-map.md"],
    progress: ["Active packet pre-start briefing", "Understanding gap sorting", "understanding-gaps.md"],
  },
};
const UNDERSTANDING_VIEW_FILES = [
  ".intent/overview/agent-understanding-map.md",
  ".intent/overview/active-packet-briefing.md",
  ".intent/overview/understanding-gaps.md",
];
for (const lang of LANGS) {
  const U = UNDERSTANDING_VIEW_LITERALS[lang];
  for (const agent of AGENTS) {
    test(`理解支援ビュー: ${lang}/${agent} SKILL が3つの派生ファイルと自然言語トリガを宣言する`, () => {
      const body = read(path.join(skillRoot(lang, agent), "SKILL.md"));
      for (const file of UNDERSTANDING_VIEW_FILES) {
        assert.ok(body.includes(file), `${lang}/${agent}: ${file} に言及する`);
      }
      for (const needle of U.skill) {
        assert.ok(body.includes(needle), `${lang}/${agent}: 自然言語トリガ「${needle}」に言及する`);
      }
      assert.ok(
        /canonical な `\.intent\/\*\.md` には書き込|without writing to any canonical `\.intent\/\*\.md`/.test(body),
        `${lang}/${agent}: canonical へ書かない境界がある`,
      );
    });
  }

  test(`理解支援ビュー: ${lang}/aggregate-sources が理解地図の素材を固定する`, () => {
    const body = read(path.join(skillRoot(lang, "claude"), "rules", "aggregate-sources.md"));
    for (const needle of U.aggregate) {
      assert.ok(body.includes(needle), `${lang}/aggregate-sources: 「${needle}」がある`);
    }
    assert.ok(body.includes("Open Questions"), `${lang}/aggregate-sources: Open Questions を読む`);
    assert.ok(/canonical.*inferred|canonical と inferred/.test(body), `${lang}/aggregate-sources: canonical と inferred を分ける`);
  });

  test(`理解支援ビュー: ${lang}/progress-readout がブリーフとギャップ整理を固定する`, () => {
    const body = read(path.join(skillRoot(lang, "claude"), "rules", "progress-readout.md"));
    for (const needle of U.progress) {
      assert.ok(body.includes(needle), `${lang}/progress-readout: 「${needle}」がある`);
    }
    assert.ok(body.includes("product-hole"), `${lang}/progress-readout: product-hole 分類がある`);
    assert.ok(
      /Open Questions へ書き戻さない|not written back to Open Questions/.test(body),
      `${lang}/progress-readout: Open Questions へ直接書き戻さない`,
    );
  });
}

// ---- 後方互換 fixture (文言検査): depends_on 不在 / ## Evidence 不在 / 旧 active の読み替え (R2.5, R8.4, R9.4) ----
// aggregate-sources (R2.x) と progress-readout (R8/R9) の両方に矛盾なく記述されていること。
const COMPAT_LITERALS = {
  ja: { dependsOnAbsent: "依存なし", evidenceAbsent: "未記入", legacyActive: "active" },
  en: { dependsOnAbsent: "no dependencies", evidenceAbsent: "not filled in", legacyActive: "active" },
};
for (const lang of LANGS) {
  const C = COMPAT_LITERALS[lang];
  for (const ruleName of ["aggregate-sources", "progress-readout"]) {
    test(`後方互換: ${lang}/${ruleName} が depends_on 不在=依存なし / Evidence 不在=未記入 / 旧 active を記述する`, () => {
      // claude/codex は byte 等価なので claude 版で検査すれば足りる。
      const body = read(path.join(skillRoot(lang, "claude"), "rules", `${ruleName}.md`));
      assert.ok(body.includes("depends_on"), `${lang}/${ruleName}: depends_on に言及する`);
      assert.ok(body.includes(C.dependsOnAbsent), `${lang}/${ruleName}: depends_on 不在を「依存なし」と読む`);
      assert.ok(body.includes("Evidence"), `${lang}/${ruleName}: ## Evidence に言及する`);
      assert.ok(body.includes(C.evidenceAbsent), `${lang}/${ruleName}: Evidence 不在を「未記入」と読む`);
      assert.ok(body.includes(C.legacyActive), `${lang}/${ruleName}: 旧 3 値 active の読み替えに言及する`);
      // 推測で埋めない規律。
      assert.ok(
        /推測で(埋め|補完)|fill .*by guessing|fill the gap by guessing/i.test(body),
        `${lang}/${ruleName}: 欠落を推測で埋めない規律がある`,
      );
    });
  }
}

// ---- scaffold 同梱: intent/overview/README.md (ja/en) が存在し「派生・再生成可能・正本でない」を明示 (R1.5, R7.1) ----
for (const lang of LANGS) {
  test(`scaffold: ${lang}/intent/overview/README.md が派生・再生成可能・正本でないを明示する`, () => {
    const p = path.join(TEMPLATES, lang, "intent", "overview", "README.md");
    const body = read(p);
    if (lang === "ja") {
      assert.ok(body.includes("派生"), "ja: 派生 (derived) を明示する");
      assert.ok(body.includes("再生成"), "ja: 再生成可能を明示する");
      assert.ok(body.includes("正本では") || body.includes("正本ではありません"), "ja: 正本ではないを明示する");
      assert.ok(body.includes("Git 非追跡") || body.includes("非追跡"), "ja: Git 非追跡を明示する");
    } else {
      assert.ok(/derived/i.test(body), "en: derived を明示する");
      assert.ok(/regenerab/i.test(body), "en: regenerable を明示する");
      assert.ok(/not the source of truth/i.test(body), "en: not the source of truth を明示する");
      assert.ok(/not tracked by git|untracked/i.test(body), "en: Git 非追跡を明示する");
    }
  });
}

// ---- pack 同梱: npm pack に intent-overview の 4系統 + scaffold README が含まれる (R7.1, R7.4) ----
test("npm pack に intent-overview の 4系統スキルと overview scaffold README が同梱される", () => {
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: REPO_ROOT, encoding: "utf8" });
  const parsed = JSON.parse(raw);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  assert.ok(entry && Array.isArray(entry.files), "pack JSON に files 配列がある");
  const paths = entry.files.map((f) => f.path.split(path.sep).join("/"));

  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const base = `templates/${lang}/${agent}/skills/intent-overview`;
      assert.ok(paths.includes(`${base}/SKILL.md`), `pack に ${base}/SKILL.md`);
      for (const r of RULES) {
        assert.ok(paths.includes(`${base}/rules/${r}.md`), `pack に ${base}/rules/${r}.md`);
      }
    }
    assert.ok(
      paths.includes(`templates/${lang}/intent/overview/README.md`),
      `pack に templates/${lang}/intent/overview/README.md`,
    );
  }
});

// ---- 工程レール (progress rail): progress-readout に5信号と read-only mirror 規律が一意に記述される ----
// 信号絵文字は語彙の正本 (ja/en・claude/codex で共通)。3軸の「前」に置く俯瞰として記述されること。
const RAIL_SIGNALS = ["✅", "🔵", "⚪", "🔴", "◻"];
const RAIL_LITERALS = {
  ja: {
    section: "工程レール",
    beforeAxes: "進捗の3軸",
    notStarted: "未着手",
    unreflected: "反映漏れ",
    youAreHere: "今ここ",
    readOnly: /算出・推論|算出.*推論|read-only mirror/,
    reuseRule: /新しい突合規則を作らない|既存正本の規律/,
  },
  en: {
    section: "Progress rail",
    beforeAxes: "The three progress axes",
    notStarted: "not started",
    unreflected: "unreflected",
    youAreHere: "you are here",
    readOnly: /does \*\*not compute, infer, or score\*\*|read-only mirror/,
    reuseRule: /Do \*\*not invent a new matching rule|existing canonical discipline/,
  },
};
for (const lang of LANGS) {
  const R = RAIL_LITERALS[lang];
  // claude/codex は byte 等価なので claude 版で検査すれば足りる (上の byte 等価テストが裏取り)。
  test(`工程レール: ${lang}/progress-readout が「${R.section}」セクションと5信号を一意に記述する`, () => {
    const body = read(path.join(skillRoot(lang, "claude"), "rules", "progress-readout.md"));
    // セクション見出しが 1 つだけ存在する。
    const headingCount = body.split("\n").filter((l) => l.startsWith("## ") && l.includes(R.section)).length;
    assert.equal(headingCount, 1, `${lang}: 「${R.section}」セクション見出しがちょうど 1 つ`);
    // 5信号がすべて語彙として登場する。
    for (const sig of RAIL_SIGNALS) {
      assert.ok(body.includes(sig), `${lang}: 信号 ${sig} が登場する`);
    }
    // レールは3軸の「前」に置く (俯瞰 → 内訳の順)。
    const railIdx = body.indexOf(R.section);
    const axesIdx = body.indexOf(R.beforeAxes);
    assert.ok(railIdx >= 0 && axesIdx >= 0 && railIdx < axesIdx, `${lang}: 工程レールは進捗3軸の前に置かれる`);
    // 残工程 (⚪) と反映漏れ (🔴) の意味語彙がある。
    assert.ok(body.includes(R.notStarted), `${lang}: 未着手 (残工程) の語彙がある`);
    assert.ok(body.includes(R.unreflected), `${lang}: 反映漏れ (writeback 漏れ) の語彙がある`);
    assert.ok(body.includes(R.youAreHere), `${lang}: 今ここ (現行 Source Packet) の語彙がある`);
    // read-only mirror / 算出・推論しない規律。
    assert.ok(R.readOnly.test(body), `${lang}: レールが算出・推論しない (read-only mirror) 規律がある`);
    // 突合規則を新設せず既存正本を流用する規律。
    assert.ok(R.reuseRule.test(body), `${lang}: 新しい突合規則を作らず既存正本を流用する規律がある`);
  });
}

// ---- 工程レール語彙パリティ: SKILL.md (4系統) の進捗ビューがレールと5信号に言及する ----
for (const lang of LANGS) {
  const R = RAIL_LITERALS[lang];
  for (const agent of AGENTS) {
    test(`工程レール: ${lang}/${agent} SKILL.md の進捗ビューがレールと5信号に言及する`, () => {
      const body = read(path.join(skillRoot(lang, agent), "SKILL.md"));
      // SKILL.md は本文 (progress rail 小文字) で言及、rules は見出し (Progress rail) で言及するため
      // SKILL.md 側はケース非依存で照合する。
      assert.ok(
        body.toLowerCase().includes(R.section.toLowerCase()),
        `${lang}/${agent}: SKILL.md が「${R.section}」に言及する`,
      );
      for (const sig of RAIL_SIGNALS) {
        assert.ok(body.includes(sig), `${lang}/${agent}: SKILL.md に信号 ${sig} が登場する`);
      }
    });
  }
}
