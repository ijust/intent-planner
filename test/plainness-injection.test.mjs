// plainness-injection（予防の注入・pkt-20260711-plainness-injection-f6in・C63/A68/DR151/A33）の
//   不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: 常駐指示は文脈が深くなると発火しない（flyer で実証: 規律ロード済みでも「Task 6（App 配線）で…」
//   が利用者に通じないまま出た）。失敗が起きる2時点に仕掛けを置く: (a) export 下書きへ言葉の規律を
//   同梱して下流の spec 生成へ運ぶ（JIT・`## Acceptance Material` 相乗り・生存は draft-content-dropped
//   が突合）(b) 利用者へ問いを出す skill 群の rules に出力直前の平易さ点検（3点）を埋める。
//   ここでは「同梱の固定文が map-cc-sdd に規定される（既存4見出し契約は不変）」「点検3点の実質が
//   問いを組み立てる rules 群に載る（4系統・ブロックはファイル間で同一）」「draft-content-dropped が
//   言葉の規律の落ちを突合対象に含める」「フィクスチャ（flyer 失敗質問→赤・平易な言い換え→緑）の
//   正解が rules の規定と一致する」を実質検査する（test-asserts-substance-not-surface-marker・
//   誤実装〔点検が字面マーカーだけ見る・対の片割れ欠落・同梱の省略可化〕を注入して赤化を実証してから畳む）。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"]; // gemini は codex ツリー共有（専用ファイル無し）。

// 問いを組み立てる rules 群（AskUserQuestion / 相当の確認を持つ skill を grep 実測で確定・2026-07-11）。
// improve / to-spec は問いを定義する rules を持たないため対象外（常駐規律 A33 と rootdoc 対化が覆う）。
const QUESTION_RULES = [
  "intent-discover/rules/designer-questions.md",
  "intent-discover/rules/mode-selection.md",
  "intent-discover/rules/question-pack-surfacing.md",
  "intent-compass/rules/algo-qoc.md",
  "intent-compass/rules/constraint-surfacing.md",
  "intent-packets/rules/decision-probe.md",
  "intent-db-design/rules/db-design-input.md",
  "intent-export-cc-sdd/rules/export-questions.md",
  "intent-export-openspec/rules/export-questions.md",
  "intent-export-speckit/rules/export-questions.md",
  "intent-writeback/rules/writeback-protocol.md",
];

function p(lang, agent, rel) {
  return path.join(TEMPLATES, lang, agent, "skills", rel);
}
function heading(lang) {
  return lang === "ja" ? "## 問いの平易さ点検（出力直前・共通）" : "## Plainness check for questions (right before output; shared)";
}
function block(content, lang) {
  const i = content.indexOf(heading(lang));
  return i >= 0 ? content.slice(i) : null;
}

// ---- 1. map-cc-sdd: 言葉の規律の同梱が固定文つきで規定され、既存4見出し契約が不変（4系統） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の map-cc-sdd が言葉の規律の同梱を固定文つきで規定する（4見出し契約は不変）`, () => {
      const c = fs.readFileSync(p(lang, agent, "intent-export-cc-sdd/rules/map-cc-sdd.md"), "utf8");
      if (lang === "ja") {
        // 同梱 bullet の実質: Acceptance Material 末尾・毎回・省略しない・固定文。
        assert.ok(/言葉の規律の同梱/.test(c), "同梱の bullet がある");
        assert.ok(/`## Acceptance Material` の末尾に/.test(c), "置き場が Acceptance Material 末尾である");
        assert.ok(/毎回1行で置く（同文・省略しない）/.test(c), "毎回・同文・省略しないが明記される");
        // 固定文の実質（初見に通じる・読み手宣言・内輪語を開く・識別子の言い換え）。
        assert.ok(/初見に通じる言葉で書く/.test(c), "固定文: 初見に通じる言葉");
        assert.ok(/読み手が誰かを宣言し/.test(c), "固定文: 読み手の宣言");
        assert.ok(/内輪語・比喩の転用語は引用せず普通の言葉に開き/.test(c), "固定文: 内輪語を開く");
        assert.ok(/識別子は初出で一行の言い換えを添える/.test(c), "固定文: 識別子の言い換え");
        // 受入基準の材料と混同させない。
        assert.ok(/受入基準の材料ではなく/.test(c), "受入条件として解釈させない旨がある");
        // 検査との対（draft-content-dropped が突合）。
        assert.ok(/draft-content-dropped が突合/.test(c), "生存の突合先が名指しされる");
        // 既存4見出し契約は不変。
        assert.ok(
          /`## Source Packet`・`## Parent Intent`・`## Invariants`・`## Acceptance Material` の4見出しを必ず含める/.test(c),
          "既存の必須4見出し契約が保たれる",
        );
      } else {
        assert.ok(/Bundle the language discipline/.test(c), "同梱の bullet がある");
        assert.ok(/at the end of `## Acceptance Material`/.test(c), "置き場が Acceptance Material 末尾である");
        assert.ok(/same wording every time; never omit/.test(c), "毎回・同文・省略しないが明記される");
        assert.ok(/words a first-time reader understands/.test(c), "固定文: 初見に通じる言葉");
        assert.ok(/Declare who the reader is/.test(c), "固定文: 読み手の宣言");
        assert.ok(/open in-group terms and borrowed metaphors into plain words/.test(c), "固定文: 内輪語を開く");
        assert.ok(/one-line gloss to every identifier at first mention/.test(c), "固定文: 識別子の言い換え");
        assert.ok(/not acceptance material/.test(c), "受入条件として解釈させない旨がある");
        assert.ok(/draft-content-dropped/.test(c), "生存の突合先が名指しされる");
        assert.ok(
          /always include the four headings `## Source Packet`, `## Parent Intent`, `## Invariants`, and `## Acceptance Material`/.test(c),
          "既存の必須4見出し契約が保たれる",
        );
      }
    });
  }
}

// ---- 2. 問いの rules 群: 点検3点の実質が載り、ブロックは同一言語内で byte 同一（4系統×11ファイル） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の問い rules ${QUESTION_RULES.length}ファイルに平易さ点検ブロックが同一内容で載る`, () => {
      let reference = null;
      for (const rel of QUESTION_RULES) {
        const c = fs.readFileSync(p(lang, agent, rel), "utf8");
        const b = block(c, lang);
        assert.ok(b, `${rel}: 点検ブロックの見出しがある`);
        if (reference === null) reference = b;
        assert.equal(b, reference, `${rel}: ブロックが他ファイルと byte 同一（規律の分岐を防ぐ）`);
      }
      // 実質アンカー（字面マーカーでなく点検の中身を突く）。
      if (lang === "ja") {
        assert.ok(/単体で通じるか/.test(reference), "点検1: 単体で意味が通るか");
        assert.ok(/語彙をそのまま転写していないか/.test(reference), "点検1: 内部文書語彙の転写チェック");
        assert.ok(/3つ以上並んでいたら詰め込みすぎ/.test(reference), "点検2: 未説明用語3つ以上=詰め込みすぎ");
        assert.ok(/初出に一行の普通の言葉の言い換えを添える/.test(reference), "点検3: 識別子の初出言い換え");
        assert.ok(/平易に書き直してから出す/.test(reference), "通らなければ書き直す");
        assert.ok(/問いの意味・選択肢は変えない/.test(reference), "書き直しの安全条件（意味・選択肢を変えない）");
        // Anti 451: 検査と対（予防だけで閉じない）。
        assert.ok(/事後検査（`\/intent-validate` の造語検査）と対で働く/.test(reference), "事後検査と対である明記");
      } else {
        assert.ok(/stand on its own/i.test(reference), "点検1: 単体で意味が通るか");
        assert.ok(/transcribing vocabulary straight from the internal documents/i.test(reference), "点検1: 内部文書語彙の転写チェック");
        assert.ok(/Three or more unexplained technical terms/i.test(reference), "点検2: 未説明用語3つ以上");
        assert.ok(/one-line plain-words gloss at first mention/i.test(reference), "点検3: 識別子の初出言い換え");
        assert.ok(/rewrite (the question )?in plain words before sending/i.test(reference), "通らなければ書き直す");
        assert.ok(/must not change the question's meaning or options/i.test(reference), "書き直しの安全条件");
        assert.ok(/works as a pair with the after-the-fact check/i.test(reference), "事後検査と対である明記");
      }
    });
  }
}

// ---- 3. draft-content-dropped が「言葉の規律の落ち」を突合対象に含める（4系統・後方互換つき） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の draft-content-dropped が言葉の規律の落ちを突合し旧下書きは黙ってスキップする`, () => {
      const c = fs.readFileSync(p(lang, agent, "intent-validate/rules/validate-checks.md"), "utf8");
      if (lang === "ja") {
        assert.ok(/言葉の規律の落ち/.test(c), "突合対象(3) 言葉の規律の落ちがある");
        assert.ok(/同梱の無い旧下書きでは本観点を黙ってスキップ/.test(c), "旧下書きの後方互換（黙ってスキップ）がある");
        assert.ok(/逐語一致を要求しない/.test(c), "趣旨の生存でよい（逐語一致を要求しない）");
      } else {
        assert.ok(/dropped language discipline/i.test(c), "突合対象(3) 言葉の規律の落ちがある");
        assert.ok(/older drafts without the bundle, silently skip/i.test(c), "旧下書きの後方互換（黙ってスキップ）がある");
        assert.ok(/no verbatim match required/i.test(c), "趣旨の生存でよい（逐語一致を要求しない）");
      }
    });
  }
}

// ---- 4. 判別フィクスチャ: flyer の失敗質問→赤・平易な言い換え→緑 の正解が rules の点検と対応する ----
test("4: フィクスチャの失敗質問が赤・平易な言い換えが緑で、根拠が点検3点と対応する", () => {
  const c = fs.readFileSync(path.join(__dirname, "fixtures", "plainness-injection", "questions.md"), "utf8");
  const rows = c.split("\n").filter((l) => /^\| \d /.test(l));
  assert.equal(rows.length, 2, "例文が2つある（赤1・緑1）");
  const red = rows.find((l) => l.includes("App 配線"));
  assert.ok(red, "flyer の失敗質問（App 配線・組版プレビュー・EventInfo・公開面）が例文にある");
  assert.ok(/赤（書き直し）/.test(red), "失敗質問の期待判定が赤（書き直し）である");
  assert.ok(/詰め込みすぎ/.test(red), "赤の根拠が点検2（未説明用語の詰め込み）と対応する");
  const green = rows.find((l) => l !== red);
  assert.ok(/緑（そのまま出せる）/.test(green), "平易な言い換えの期待判定が緑である");
  assert.ok(!/赤/.test(green), "緑の行に赤の期待が混ざらない");
  // 機械カウントのゲートにしない（意味の読み）が明記される。
  assert.ok(/機械カウントではなく/.test(c), "3つ以上は合図であって機械閾値でない旨がある");
});

// ---- 5. dogfood（.claude）が parent と同期している（存在すれば検査） ----
test("5: dogfood の問い rules / map-cc-sdd / validate-checks が ja/claude と同期している（存在すれば検査）", () => {
  for (const rel of [...QUESTION_RULES, "intent-export-cc-sdd/rules/map-cc-sdd.md", "intent-validate/rules/validate-checks.md"]) {
    const dogfood = path.join(REPO_ROOT, ".claude", "skills", rel);
    if (fs.existsSync(dogfood)) {
      assert.equal(
        fs.readFileSync(dogfood, "utf8"),
        fs.readFileSync(p("ja", "claude", rel), "utf8"),
        `dogfood ${rel} は ja/claude と byte 同一`,
      );
    }
  }
});

// ---- 7. root doc の対化: A33 の出力直前点検に「事後検査と対」が織り込まれる（7ファイル・言語内同文） ----
const ROOTDOCS = {
  ja: [
    path.join(TEMPLATES, "ja", "agents", "claude", "CLAUDE_intent.md"),
    path.join(TEMPLATES, "ja", "agents", "codex", "AGENTS.md"),
    path.join(TEMPLATES, "ja", "agents", "gemini", "GEMINI_intent.md"),
    path.join(REPO_ROOT, "CLAUDE_intent.md"), // dogfood
  ],
  en: [
    path.join(TEMPLATES, "en", "agents", "claude", "CLAUDE_intent.md"),
    path.join(TEMPLATES, "en", "agents", "codex", "AGENTS.md"),
    path.join(TEMPLATES, "en", "agents", "gemini", "GEMINI_intent.md"),
  ],
};
const PAIR_CLAUSE = {
  ja: "この出力直前の点検は、事後検査（`/intent-validate` の造語検査）と対で働く（予防だけで閉じない）。",
  en: "This right-before-output check works as a pair with the after-the-fact check (`/intent-validate`'s coinage check) — prevention alone is never enough.",
};
for (const lang of LANGS) {
  test(`7: ${lang} の root doc の A33 点検に「事後検査と対」の同文が織り込まれる（新節を立てない）`, () => {
    for (const f of ROOTDOCS[lang]) {
      if (!fs.existsSync(f)) continue; // dogfood は存在すれば検査
      const c = fs.readFileSync(f, "utf8");
      assert.ok(c.includes(PAIR_CLAUSE[lang]), `${path.relative(REPO_ROOT, f)}: 対化の同文が載る`);
      // 既存の出力直前3点点検の実質が保たれている（織り込みであって置換でない）。
      const anchor = lang === "ja" ? /3つ以上並んだら詰め込みすぎ/ : /Three or more unexplained technical terms/;
      assert.ok(anchor.test(c), `${path.relative(REPO_ROOT, f)}: 既存の3点点検の実質が保たれる`);
      // 新節（見出し）を立てず既存行への織り込みである（対化の文が見出し行に無い）。
      const line = c.split("\n").find((l) => l.includes(PAIR_CLAUSE[lang]));
      assert.ok(line && !line.startsWith("#"), `${path.relative(REPO_ROOT, f)}: 織り込み先は既存の箇条書き行`);
    }
  });
}

// ---- 6. パリティ: 対象 rules は言語内で claude=codex byte 等価 ----
test("6: 対象 rules が ja/en とも claude=codex で byte 等価", () => {
  for (const lang of LANGS) {
    for (const rel of [...QUESTION_RULES, "intent-export-cc-sdd/rules/map-cc-sdd.md"]) {
      assert.equal(
        fs.readFileSync(p(lang, "claude", rel), "utf8"),
        fs.readFileSync(p(lang, "codex", rel), "utf8"),
        `${lang}: ${rel} が claude/codex で byte 等価`,
      );
    }
  }
});
