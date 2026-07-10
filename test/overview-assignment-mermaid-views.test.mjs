// pkt-20260706-assignment-visibility-y6h3（wire の overview 半分＝割当ビュー）と
// pkt-20260708-overview-mermaid-views-i7dd（C51・Mermaid 図射影）の不変条件テスト
//   （node:test 標準・依存ゼロ）。
//
// 背景: どちらも intent-overview 系譜の「自然言語トリガ時だけ生成する派生ビュー」（C34/DR92）を
//   1枚ずつ足す。既定の俯瞰ビューには自動同梱せず、既定実行は byte 不変（behavior-preserving）。
//   overview は SKILL 本文を hash lock しない（非 SKILL_BODY_LOCKED）ので本文を正当に編集できる。
//
// 割当ビュー（assignment-view）の判別オラクル（y6h3 Validation (a)〜(f)）:
//   (a) 同一 packet_id への2宣言＝二重宣言 warn（名指し・止めない・見逃しの違反検知）
//   (b) 別 packet への宣言は二重宣言としない（混同の違反検知）
//   (c) 宣言ゼロ＝「割当なし」明示で既存挙動不変（後方互換の違反検知）
//   (d) assignments 不在で停止しない（不在で落ちる実装の違反検知）
//   (e) read-only・warn-only・機械閾値なし（INV66）・宣言と state は別レイヤ（DR99）
//
// Mermaid 図射影（mermaid-views）の判別オラクル（i7dd Validation (1)〜(4)）:
//   (1) 2図（マインドマップ系＋ロードマップ図）と規範文（トリガ時のみ・日付なし・描画互換の床）
//   (2) 既存 mermaid-tree（graph TD の既定 tree 図）本文を改変しない宣言（pure addition）
//   (3) 図に日付・進捗％・ガント・ベロシティを持ち込まない（INV62 の図適用・最重要オラクル）
//   (4) 書込み境界 .intent/overview/ 限定・GitHub/VSCode 標準描画の記法に閉じる
//   + 4系統パリティ・dogfood 同期・既定実行では生成しない（behavior-preserving）
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

function rulePath(lang, agent, name) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-overview", "rules", `${name}.md`);
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-overview", "SKILL.md");
}

// ---- 割当ビュー: rule が4系統に存在し、二重宣言 warn・後方互換・read-only を定義する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`assignment-view: ${lang}/${agent} の rule が存在し二重宣言 warn+後方互換+read-only を定義する`, () => {
      const p = rulePath(lang, agent, "assignment-view");
      assert.ok(fs.existsSync(p), `${lang}/${agent}: rules/assignment-view.md が存在する`);
      const c = fs.readFileSync(p, "utf8");
      // (a) 割当宣言を .intent/assignments/ から read-only で読む
      assert.ok(/\.intent\/assignments\//.test(c), `${lang}/${agent}: (a) .intent/assignments/ を読む`);
      // (a) 同一 packet_id が2つ以上＝二重宣言 warn（名指し）
      const dbl = lang === "ja"
        ? /2\s*つ以上|二重宣言|二重着手/
        : /two or more|double.declaration|double.booking/i;
      assert.ok(dbl.test(c), `${lang}/${agent}: (a) 同一 packet への二重宣言 warn を定義する`);
      // warn のみ・止めない（gate 化しない）
      const warnOnly = lang === "ja" ? /止めない|停止.*しない|警告のみ/ : /does not stop|warn only|warn-only/i;
      assert.ok(warnOnly.test(c), `${lang}/${agent}: warn のみ・止めない（gate 化しない）`);
      // (c)(d) 宣言ゼロ・assignments 不在で「割当なし」明示・停止しない（後方互換）
      const empty = lang === "ja" ? /割当なし/ : /no assignments/i;
      assert.ok(empty.test(c), `${lang}/${agent}: (c)(d) 宣言ゼロで「割当なし」明示（後方互換）`);
      // (e) INV66（read-only・機械閾値なし）と DR99（宣言と state は別レイヤ）
      assert.ok(/INV66/.test(c), `${lang}/${agent}: (e) INV66 に触れる（read-only・warn-only・機械閾値なし）`);
      assert.ok(/DR99/.test(c), `${lang}/${agent}: (e) DR99 に触れる（宣言と state は別レイヤ）`);
      // 書込み境界 .intent/overview/ 限定
      assert.ok(/\.intent\/overview\/assignment-view\.md/.test(c), `${lang}/${agent}: 書込み先が .intent/overview/assignment-view.md`);
    });

    test(`assignment-view: ${lang}/${agent} の rule が放置宣言を機械閾値で自動判定しない（INV2）`, () => {
      const c = fs.readFileSync(rulePath(lang, agent, "assignment-view"), "utf8");
      // 放置宣言＝経過観測まで・機械閾値で自動解放しない
      assert.ok(/INV2/.test(c), `${lang}/${agent}: INV2 に触れる（機械閾値を持たない）`);
      const stale = lang === "ja" ? /機械閾値|自動解放|自動判定/ : /mechanical threshold|auto-release|auto-judge/i;
      assert.ok(stale.test(c), `${lang}/${agent}: 放置宣言を機械閾値で自動判定・自動解放しない`);
    });
  }
}

// ---- Mermaid 図射影: rule が4系統に存在し、2図・INV62 の図適用・描画互換の床を定義する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`mermaid-views: ${lang}/${agent} の rule が存在し2図+描画互換の床を定義する`, () => {
      const p = rulePath(lang, agent, "mermaid-views");
      assert.ok(fs.existsSync(p), `${lang}/${agent}: rules/mermaid-views.md が存在する`);
      const c = fs.readFileSync(p, "utf8");
      // (1) 2図: マインドマップ系＋ロードマップ図
      const mindmap = lang === "ja" ? /マインドマップ/ : /mindmap/i;
      const roadmapFig = lang === "ja" ? /ロードマップ図/ : /roadmap figure/i;
      assert.ok(mindmap.test(c), `${lang}/${agent}: (1) マインドマップ系の図を定義する`);
      assert.ok(roadmapFig.test(c), `${lang}/${agent}: (1) ロードマップ図を定義する`);
      // (4) 描画互換の床: GitHub / VSCode 標準描画・graph 系フォールバック
      assert.ok(/GitHub/.test(c) && /VSCode/.test(c), `${lang}/${agent}: (4) GitHub / VSCode 標準描画の床`);
      const graphFloor = lang === "ja" ? /graph TD|graph LR|graph 系/ : /graph TD|graph LR|graph family/;
      assert.ok(graphFloor.test(c), `${lang}/${agent}: (4) graph 系の記法床（mindmap の割れを避ける）`);
      // 書込み境界
      assert.ok(/\.intent\/overview\/mermaid-views\.md/.test(c), `${lang}/${agent}: 書込み先が .intent/overview/mermaid-views.md`);
      // (2) 既存 mermaid-tree を本文改変しない（pure addition）
      assert.ok(/mermaid-tree/.test(c), `${lang}/${agent}: (2) 既存 mermaid-tree との別ビュー宣言がある`);
    });

    test(`mermaid-views: ${lang}/${agent} の rule が図に日付・進捗％・ガントを持ち込まない（INV62・最重要）`, () => {
      const c = fs.readFileSync(rulePath(lang, agent, "mermaid-views"), "utf8");
      // (3) INV62 の図適用: 日付・進捗％・ガント・ベロシティを図にも出さない
      assert.ok(/INV62/.test(c), `${lang}/${agent}: (3) INV62 に触れる（図適用）`);
      const noDates = lang === "ja"
        ? /日付.*(持ち込ま|出さ)ない|日付・進捗/
        : /no dates|does not? put.*dates|no date/i;
      assert.ok(noDates.test(c), `${lang}/${agent}: (3) 図に日付を持ち込まない`);
      const noGantt = lang === "ja" ? /ガント/ : /Gantt/;
      assert.ok(noGantt.test(c), `${lang}/${agent}: (3) 図にガントを持ち込まない`);
    });
  }
}

// ---- 既存 mermaid-tree.md（graph TD の既定 tree 図）本文を改変しない（pure addition の対比）----
for (const lang of LANGS) {
  test(`pure addition: ${lang} の既定 mermaid-tree が graph TD 規約を保つ（新図射影で改変しない）`, () => {
    const c = fs.readFileSync(rulePath(lang, "claude", "mermaid-tree"), "utf8");
    // 既定 tree 図は graph TD（新 mermaid-views は別ファイル・別目的）
    assert.ok(/graph TD/.test(c), `${lang}: 既定 mermaid-tree は graph TD 規約を保つ`);
  });
}

// ---- 4系統パリティ: 両 rule が claude/codex で byte 等価 ----
for (const lang of LANGS) {
  for (const name of ["assignment-view", "mermaid-views"]) {
    test(`パリティ: ${lang} の ${name} が claude/codex で byte 一致`, () => {
      const c = fs.readFileSync(rulePath(lang, "claude", name));
      const x = fs.readFileSync(rulePath(lang, "codex", name));
      assert.ok(c.equals(x), `${lang}: rules/${name}.md が claude/codex で byte 一致`);
    });
  }
}

// ---- dogfood（.claude）が parent（ja/claude）と同期している（存在すれば検査）----
test("dogfood: .claude/intent-overview に両 rule が ja/claude と byte 同一（存在すれば）", () => {
  for (const name of ["assignment-view", "mermaid-views"]) {
    const dog = path.join(REPO_ROOT, ".claude", "skills", "intent-overview", "rules", `${name}.md`);
    if (fs.existsSync(dog)) {
      assert.ok(
        fs.readFileSync(dog).equals(fs.readFileSync(rulePath("ja", "claude", name))),
        `dogfood ${name} は ja/claude と byte 同一`,
      );
    }
  }
  const dogSkill = path.join(REPO_ROOT, ".claude", "skills", "intent-overview", "SKILL.md");
  if (fs.existsSync(dogSkill)) {
    assert.ok(
      fs.readFileSync(dogSkill).equals(fs.readFileSync(skillPath("ja", "claude"))),
      "dogfood SKILL.md は ja/claude と byte 同一",
    );
  }
});

// ---- SKILL Step2 委譲＋Output 誘導に両ビューが結線されている（既定実行では生成しない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`結線: ${lang}/${agent} SKILL が両ビューを Step2 委譲＋Output 誘導に持つ（トリガ時のみ）`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(/rules\/assignment-view\.md/.test(c), `${lang}/${agent}: assignment-view を Step2 で委譲する`);
      assert.ok(/rules\/mermaid-views\.md/.test(c), `${lang}/${agent}: mermaid-views を Step2 で委譲する`);
      // 既定実行では生成しない（トリガ時のみ）の規範
      const triggerOnly = lang === "ja"
        ? /無指定の既定実行では生成せず|自然言語トリガ時だけ生成/
        : /A default run does not generate|generated only on a natural-language trigger/i;
      assert.ok(triggerOnly.test(c), `${lang}/${agent}: 既定実行では生成しない（behavior-preserving）`);
    });
  }
}
