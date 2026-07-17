// report-plainness（報告の平易さ点検の注入・pkt-20260717-報告の平易さ点検の注入-0opa・INV105/DR208）の
//   不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: 予防注入「問いの平易さ点検」（plainness-injection.test.mjs 所有）は問いを組み立てる rules 11ファイル
//   限定で、報告（進捗・完了・確認事項の提示）はどのスキルでも予防ゼロだった。常駐指示（rootdoc A33）は
//   減衰することが二度実証済み（flyer・2026-07-17 の実例「残る Open Question は OQ-jny-6 の1件だけ…」）。
//   そこで報告の書式の正本（SKILL の Output Description）へ「報告の平易さ点検」ブロックを同文注入し、
//   判別フィクスチャ（実例→赤・書き直し→緑）とこのテストの所有で対にする（DR208・Anti-451 の回避）。
//   検査の実質: (1) ブロックが計画工程4スキル×4系統に載り言語内 byte 同一 (2) 実質アンカー（転写しない・
//   識別子は参照・削らない・3つ以上は意味の読み・事後の対）が揃う (3) dogfood（.claude/.agents）が同期
//   (4) フィクスチャの赤緑と根拠が点検の規定と対応する（test-asserts-substance-not-surface-marker）。
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

// 報告（利用者向けの Output Description）を持つ intent スキル全16（0opa=計画工程4スキルで型を確立し、
// geqk=残る12スキルへ展開・2026-07-17 実測: 各 SKILL.md に Output Description と Safety & Fallback が
// ちょうど1つずつ在ることを確認してから対象化。kiro-* は層の規律で対象外）。
const REPORT_SKILLS = [
  "intent-discover", "intent-compass", "intent-packets", "intent-status",
  "intent-db-design", "intent-export-cc-sdd", "intent-export-openspec", "intent-export-speckit",
  "intent-from-code", "intent-from-spec", "intent-improve", "intent-overview",
  "intent-release-note", "intent-to-spec", "intent-validate", "intent-writeback",
];

function p(lang, agent, skill) {
  return path.join(TEMPLATES, lang, agent, "skills", skill, "SKILL.md");
}
function heading(lang) {
  return lang === "ja"
    ? "### 報告の平易さ点検（利用者向け報告・出力直前・共通）"
    : "### Plainness check for reports (user-facing reports; right before output; shared)";
}
// ブロック＝見出しから次の見出し行（## または ###）の直前まで。
function block(content, lang) {
  const i = content.indexOf(heading(lang));
  if (i < 0) return null;
  const rest = content.slice(i + heading(lang).length);
  const m = rest.search(/\n#{2,3} /);
  return heading(lang) + (m >= 0 ? rest.slice(0, m) : rest);
}

// ---- 1. 4スキル×4系統にブロックが載り、言語内で byte 同一（規律の分岐を防ぐ） ----
for (const lang of LANGS) {
  test(`1: ${lang} の計画工程4スキル SKILL.md に報告の平易さ点検が同一内容で載る`, () => {
    let reference = null;
    for (const agent of AGENTS) {
      for (const skill of REPORT_SKILLS) {
        const c = fs.readFileSync(p(lang, agent, skill), "utf8");
        const b = block(c, lang);
        assert.ok(b, `${lang}/${agent}/${skill}: ブロックの見出しがある`);
        // 置き場は Output Description 節内（報告の書式の正本・Safety より前）。
        const outIdx = c.indexOf("## Output Description");
        const safetyIdx = c.indexOf("## Safety & Fallback");
        const blkIdx = c.indexOf(heading(lang));
        assert.ok(outIdx >= 0 && blkIdx > outIdx, `${lang}/${agent}/${skill}: ブロックが Output Description 節内にある`);
        assert.ok(safetyIdx < 0 || blkIdx < safetyIdx, `${lang}/${agent}/${skill}: ブロックが Safety & Fallback より前にある`);
        if (reference === null) reference = b;
        assert.equal(b, reference, `${lang}/${agent}/${skill}: ブロックが他ファイルと byte 同一`);
      }
    }
    // 実質アンカー（字面マーカーでなく点検の中身を突く）。
    if (lang === "ja") {
      assert.ok(/内部文書の文をそのまま転写しない/.test(reference), "点検: 内部文書の転写禁止");
      assert.ok(/初見の読み手に通じる言葉で言い直す/.test(reference), "点検: 言い直し（事実・意味は変えない）");
      assert.ok(/識別子を本文の主語にしない/.test(reference), "点検: 識別子は主役にしない");
      assert.ok(/その後ろに参照として添える/.test(reference), "点検: 識別子は文末参照");
      assert.ok(/識別子・記録への参照を削らない/.test(reference), "点検: 削除禁止（Anti-564 の実質）");
      assert.ok(/3つ以上並んだら詰め込みすぎの合図/.test(reference), "点検: 未説明内部語3つ以上の合図");
      assert.ok(/機械カウントではなく意味の読み/.test(reference), "合図は機械閾値でない（INV2 整合）");
      assert.ok(/事後の記録と対で働く（予防だけで閉じない）/.test(reference), "事後の対（drift-log 導線）");
      assert.ok(/内部の記録（`\.intent\/` 配下の canonical・ログ）の書き方には適用しない/.test(reference), "内部文書へ強制しない（Anti-565 の実質）");
    } else {
      assert.ok(/Do not transcribe internal documents verbatim/i.test(reference), "点検: 内部文書の転写禁止");
      assert.ok(/words a first-time reader understands/i.test(reference), "点検: 言い直し");
      assert.ok(/Identifiers must not be the subject/i.test(reference), "点検: 識別子は主役にしない");
      assert.ok(/after it as references/i.test(reference), "点検: 識別子は文末参照");
      assert.ok(/Do not delete identifiers or references/i.test(reference), "点検: 削除禁止");
      assert.ok(/three or more unexplained internal terms/i.test(reference), "点検: 未説明内部語3つ以上の合図");
      assert.ok(/not by mechanical count/i.test(reference), "合図は機械閾値でない");
      assert.ok(/works as a pair with the after-the-fact record/i.test(reference), "事後の対");
      assert.ok(/not to how internal records .*are written/i.test(reference), "内部文書へ強制しない");
    }
  });
}

// ---- 2. dogfood（.claude / .agents）が ja テンプレートのブロックと byte 同一（存在すれば検査） ----
test("2: dogfood の計画工程4スキルに報告の平易さ点検が同期している（存在すれば検査）", () => {
  for (const skill of REPORT_SKILLS) {
    for (const tree of [".claude", ".agents"]) {
      const dogfood = path.join(REPO_ROOT, tree, "skills", skill, "SKILL.md");
      if (!fs.existsSync(dogfood)) continue;
      assert.equal(
        block(fs.readFileSync(dogfood, "utf8"), "ja"),
        block(fs.readFileSync(p("ja", "claude", skill), "utf8"), "ja"),
        `${tree}/skills/${skill}: ブロックが ja/claude と byte 同一`,
      );
    }
  }
});

// ---- 3. 判別フィクスチャ: 実例の報告文→赤・書き直し→緑 の正解が点検の規定と対応する ----
test("3: フィクスチャの実例報告が赤・書き直しが緑で、根拠が点検と対応し識別子が保持される", () => {
  const c = fs.readFileSync(path.join(__dirname, "fixtures", "report-plainness", "reports.md"), "utf8");
  const rows = c.split("\n").filter((l) => /^\| \d /.test(l));
  assert.equal(rows.length, 2, "例文が2つある（赤1・緑1）");
  const red = rows.find((l) => l.includes("OQ-jny-6 の1件だけ"));
  assert.ok(red, "実セッションで通じなかった報告文（OQ-jny-6・読み手接続 packet・俯瞰スキル）が例文にある");
  assert.ok(/赤（書き直し）/.test(red), "実例の期待判定が赤（書き直し）である");
  assert.ok(/転写/.test(red) && /主語/.test(red), "赤の根拠が点検（転写・識別子主役）と対応する");
  const green = rows.find((l) => l !== red);
  assert.ok(/緑（そのまま出せる）/.test(green), "書き直しの期待判定が緑である");
  assert.ok(!/赤/.test(green), "緑の行に赤の期待が混ざらない");
  // 平易化しても識別子は参照として残る（削除で平易化しない＝Anti-564）。
  assert.ok(/OQ-jny-6/.test(green), "緑の書き直しにも識別子が参照として保持される");
  assert.ok(/整理番号/.test(green), "識別子が本文の後ろの参照として添えられている");
  // 機械カウントのゲートにしない（意味の読み）が明記される。
  assert.ok(/機械カウントではなく/.test(c), "3つ以上は合図であって機械閾値でない旨がある");
});

// ---- 4. 問い版ブロックとの分離: 報告版の導入が問い版（plainness-injection 所有）を変えていない ----
test("4: 報告版の注入が問いの平易さ点検ブロック（11 rules）に触れていない", () => {
  // 代表1ファイルで問い版の見出しが従来どおり存在することだけ確認する（所有は plainness-injection.test.mjs）。
  const c = fs.readFileSync(
    path.join(TEMPLATES, "ja", "claude", "skills", "intent-discover", "rules", "designer-questions.md"),
    "utf8",
  );
  assert.ok(c.includes("## 問いの平易さ点検（出力直前・共通）"), "問い版ブロックの見出しが残っている");
});
