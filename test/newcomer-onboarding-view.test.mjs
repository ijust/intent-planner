// pkt-20260706-newcomer-overview-preset-cyk5（DR106・A54・C34）の不変条件テスト
//   （node:test 標準・依存ゼロ）。
//
// 背景: intent-overview の読み手別ビュー（C34/DR92 の「自然言語トリガ時だけ生成する派生ビュー」系譜）に
//   「新規参加メンバー向け」プリセットを1種追加する pure addition。既定実行は behavior-preserving。
//   overview は SKILL 本文を hash lock しない（非 SKILL_BODY_LOCKED）ので本文を正当に編集できる。
//
// 判別オラクル（cyk5 Validation）:
//   (a) 5点構成（①L0/L1 要約 ②横断 Invariant 抜粋 ③進行中の作業単位と着手状況 ④正規語彙の主要語
//       ⑤読み順ガイド）を rule が定義する（構成欠落の違反検知・DR106）
//   (b) dangling 禁止: 参照先は実在確認済みに限る規範（実在しない参照を出す実装の違反検知）
//   (c) derived-only 契約の継承: 書込み先 .intent/overview/newcomer-onboarding.md 限定・canonical 非接触
//       （C34・正本へ書く実装の違反検知）
//   (d) 縮退版: 素材ゼロでも止まらず「該当なし」明示（停止・捏造実装の違反検知）
//   (e) 既存プリセット非改変（pure addition）: 既存の派生ビュー rule 群の本文を本 packet が触らない
//   (f) 機械スコアリングなし（INV2）・トリガ時のみ生成（behavior-preserving）
//   + 4系統パリティ・dogfood 同期・SKILL Step2 委譲＋Output 誘導への結線
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

// ---- (a) 5点構成: rule が4系統に存在し、DR106 の5点をすべて定義する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`newcomer-onboarding: ${lang}/${agent} の rule が存在し5点構成（DR106）を定義する`, () => {
      const p = rulePath(lang, agent, "newcomer-onboarding");
      assert.ok(fs.existsSync(p), `${lang}/${agent}: rules/newcomer-onboarding.md が存在する`);
      const c = fs.readFileSync(p, "utf8");
      // ① 目的・成功の要約（L0/L1）
      assert.ok(/L0\/L1|L0.*L1/.test(c), `${lang}/${agent}: ① L0/L1 の要約を定義する`);
      // ② 横断 Invariant の抜粋
      const inv = lang === "ja" ? /横断.*Invariant|Invariant.*抜粋/ : /cross-cutting Invariant/i;
      assert.ok(inv.test(c), `${lang}/${agent}: ② 横断 Invariant の抜粋を定義する`);
      // ③ 進行中の作業単位と着手状況（assignments を読む）
      assert.ok(/\.intent\/packets\/active\//.test(c), `${lang}/${agent}: ③ active packets を読む`);
      assert.ok(/\.intent\/assignments\//.test(c), `${lang}/${agent}: ③ assignments の割当を併記する`);
      // ④ 正規語彙の主要語（glossary）
      assert.ok(/glossary/.test(c), `${lang}/${agent}: ④ glossary から主要語を抜粋する`);
      // ⑤ 読み順ガイド
      const order = lang === "ja" ? /読み順/ : /reading[- ]order/i;
      assert.ok(order.test(c), `${lang}/${agent}: ⑤ 読み順ガイドを定義する`);
    });

    // ---- (b) dangling 禁止 + (c) derived-only + (d) 縮退版 + (f) INV2 ----
    test(`newcomer-onboarding: ${lang}/${agent} の rule が dangling 禁止・derived-only・縮退版・INV2 を定義する`, () => {
      const c = fs.readFileSync(rulePath(lang, agent, "newcomer-onboarding"), "utf8");
      // (b) 参照先は実在確認済みに限る（dangling を作らない）
      const dangling = lang === "ja" ? /dangling|実在.*(確かめ|確認)/ : /dangling|verified.to.exist/i;
      assert.ok(dangling.test(c), `${lang}/${agent}: (b) dangling を作らない規範がある`);
      // (c) 書込み先が .intent/overview/newcomer-onboarding.md 限定
      assert.ok(
        /\.intent\/overview\/newcomer-onboarding\.md/.test(c),
        `${lang}/${agent}: (c) 書込み先が .intent/overview/newcomer-onboarding.md`,
      );
      const noCanon = lang === "ja" ? /canonical.*(書き換えない|書かない)|正本非接触/ : /never (re)?write.*canonical|no touching the source of truth/i;
      assert.ok(noCanon.test(c), `${lang}/${agent}: (c) canonical へ書かない（derived-only 契約の継承）`);
      // (d) 素材ゼロでも止まらず「該当なし」明示の縮退版
      const degraded = lang === "ja" ? /縮退/ : /degraded/i;
      const none = lang === "ja" ? /該当なし/ : /"none"/;
      assert.ok(degraded.test(c), `${lang}/${agent}: (d) 縮退版を定義する`);
      assert.ok(none.test(c), `${lang}/${agent}: (d) 「該当なし」の明示を定義する`);
      const noStop = lang === "ja" ? /止(まら|め)ない|停止.*しない|エラーにしない/ : /do(es)? not stop|no error/i;
      assert.ok(noStop.test(c), `${lang}/${agent}: (d) 素材が薄くても停止しない`);
      // (f) 機械スコアリングなし（INV2）
      assert.ok(/INV2/.test(c), `${lang}/${agent}: (f) INV2 に触れる（機械スコアリングを持たない）`);
      const noScore = lang === "ja" ? /スコアリング|機械スコア/ : /scoring|scores/i;
      assert.ok(noScore.test(c), `${lang}/${agent}: (f) スコアリングを入れない規範がある`);
      // (f) トリガ時のみ生成（behavior-preserving）
      const triggerOnly = lang === "ja"
        ? /無指定の既定実行では.*生成せず|指定があるときだけ/
        : /default run.*does not generate|only when requested/i;
      assert.ok(triggerOnly.test(c), `${lang}/${agent}: (f) 既定実行では生成しない（behavior-preserving）`);
    });
  }
}

// ---- (e) 既存プリセット非改変（pure addition）: 既存の読み手別ビュー rule が骨格規範を保つ ----
// 「既存プリセット2種の出力 fixture 不変」の静的レイヤ実装: 新 rule の追加が既存 rule の
// 中核規範（トリガ時のみ生成・書込み先）を壊していないことを検査する（byte snapshot は
// 並行案件が正当に既存 rule を編集する余地を奪うため、規範の生存で見る）。
for (const lang of LANGS) {
  for (const name of ["decision-inbox", "roadmap-projection"]) {
    test(`pure addition: ${lang} の既存プリセット ${name} が中核規範を保つ`, () => {
      const c = fs.readFileSync(rulePath(lang, "claude", name), "utf8");
      // 既存2ビューの中核: トリガ時のみ生成 + 自分の出力先へ書く
      const triggerOnly = lang === "ja"
        ? /指定があるときだけ|求めたときだけ/
        : /only when|generated only/i;
      assert.ok(triggerOnly.test(c), `${lang}: ${name} はトリガ時のみ生成の規範を保つ`);
      assert.ok(
        new RegExp(`\\.intent/overview/${name}\\.md`).test(c),
        `${lang}: ${name} の書込み先が .intent/overview/${name}.md のまま`,
      );
      // 新 rule への言及を既存 rule に書き足していない（既存本文への侵食の検知）
      assert.ok(
        !/newcomer-onboarding/.test(c),
        `${lang}: ${name} は newcomer-onboarding に言及しない（pure addition）`,
      );
    });
  }
}

// ---- 4系統パリティ: 新 rule が claude/codex で byte 等価 ----
for (const lang of LANGS) {
  test(`パリティ: ${lang} の newcomer-onboarding が claude/codex で byte 一致`, () => {
    const c = fs.readFileSync(rulePath(lang, "claude", "newcomer-onboarding"));
    const x = fs.readFileSync(rulePath(lang, "codex", "newcomer-onboarding"));
    assert.ok(c.equals(x), `${lang}: rules/newcomer-onboarding.md が claude/codex で byte 一致`);
  });
}

// ---- dogfood（.claude）が parent（ja/claude）と同期している（存在すれば検査）----
test("dogfood: .claude/intent-overview の newcomer-onboarding が ja/claude と byte 同一（存在すれば）", () => {
  const dog = path.join(REPO_ROOT, ".claude", "skills", "intent-overview", "rules", "newcomer-onboarding.md");
  if (fs.existsSync(dog)) {
    assert.ok(
      fs.readFileSync(dog).equals(fs.readFileSync(rulePath("ja", "claude", "newcomer-onboarding"))),
      "dogfood newcomer-onboarding は ja/claude と byte 同一",
    );
  }
});

// ---- SKILL Step2 委譲＋Output 誘導に結線されている（既定実行では生成しない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`結線: ${lang}/${agent} SKILL が newcomer-onboarding を Step2 委譲＋Output 誘導に持つ`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(
        /rules\/newcomer-onboarding\.md/.test(c),
        `${lang}/${agent}: newcomer-onboarding を Step2 で委譲する`,
      );
      // Output 誘導（毎回出す1行）にも出力先が現れる（委譲行と合わせて2箇所以上）
      const hits = c.match(/newcomer-onboarding/g) || [];
      assert.ok(hits.length >= 2, `${lang}/${agent}: Output 誘導にも newcomer-onboarding が現れる（2箇所以上）`);
      // 委譲行がトリガ時のみ生成を明記する
      const triggerOnly = lang === "ja"
        ? /自然言語トリガ時だけ生成・DR106/
        : /generated only on a natural-language trigger; DR106/;
      assert.ok(triggerOnly.test(c), `${lang}/${agent}: 委譲行がトリガ時のみ生成（DR106）を明記する`);
    });
  }
}
