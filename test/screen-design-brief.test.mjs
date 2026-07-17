import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { install } from "../src/install.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const LANGS = ["ja", "en"];

function rulePath(lang, agent, skill, file) {
  return path.join(ROOT, "templates", lang, agent, "skills", skill, "rules", file);
}

function readRule(lang, agent, skill, file) {
  return fs.readFileSync(rulePath(lang, agent, skill, file), "utf8");
}

// ---------------------------------------------------------------------------
// 1. 画面デザイン rule 本体の契約（検査軸: test-asserts-substance-not-surface-marker）
// ---------------------------------------------------------------------------

function screenDesignRuleErrors(text, lang) {
  const patterns = lang === "ja"
    ? [
        [/案件が利用者向け画面（UI）を含む/, "発火条件に UI を含む案件がある"],
        [/designer-questions が on/, "発火条件に designer-questions=on がある"],
        [/deep、\*\*または\*\*ロールレンズで「画面を設計する観点」が採用/, "deep または画面設計観点の採用で発火する"],
        [/UI 非該当の案件、designer-questions が off の案件、standard で画面検討を選ばなかった案件では、質問も下書きも増やさず、従来の処理を続ける/, "対象外・off・standard 未選択では沈黙して継続する"],
        [/1バッチ最大4問/, "まとめて少数（最大4問）の歯止めを継承する"],
        [/「後で確認／不明／該当なし」を選べる形/, "回答を強制しない"],
        [/通常・空（データなし）・読込中・失敗・権限不足・完了/, "主要状態6種を確認する"],
        [/情報の優先順位（最初に目に入るべきもの/, "情報の優先順位を確認する"],
        [/「シンプル」「モダン」のような曖昧な言葉だけで確認を終えない/, "曖昧語だけで終えない"],
        [/情報の密度、余白、色の役割、強調の順番/, "曖昧語を具体へ開く"],
        [/素材と矛盾する推測を追加しない/, "既存素材と矛盾する推測を足さない"],
        [/「参照先未確認」とし、内容を推測で代替しない/, "読めない参照は未確認とする"],
        [/code-frontend\.md` があれば read-only で照合/, "frontend 定石を read-only 照合する"],
        [/採否は利用者が決める/, "定石の採否は利用者が決める"],
        [/constraint-ledger\.md/, "採否を既存の台帳へ記録する"],
        [/否認済みの定石は蒸し返さない/, "否認済みを再提示しない"],
        [/スキップし、停止しない/, "器が無くても停止しない"],
        [/照合を工程のゲートにしない/, "照合をゲートにしない"],
        [/\.intent\/nl-spec\/screen-design-brief\.md/, "所定の派生出力先を使う"],
        [/「推測を含む」「派生」「再生成可能」「正本ではない」の4点を明記/, "冒頭に4つの派生標識を置く"],
        [/\*\*確定／推測（inferred）／未確認\*\*のいずれかの標識付き/, "確定・推測・未確認を分けて残す"],
        [/推測（inferred）標識付きの複数候補または未確認として残す/, "参考なしの見た目は推測候補か未確認に留める"],
        [/流行の見た目やブランド表現を事実のように確定しない/, "ブランドを勝手に確定しない"],
        [/画像、デザインシステム、ブランドガイドを自動生成しない/, "画像・デザインシステム等を自動生成しない"],
        [/利用者が望んだときだけ生成する（頼まれていないのに自動生成しない）/, "モックは頼まれたときだけ生成する"],
        [/同じ案件の再実行では同じパスを全置換し、重複追記しない/, "再実行は同じパスを全置換する"],
        [/「見て触れるモックも作るか」を\*\*1問で\*\*追認する/, "モックは1問追認で始める"],
        [/断られたら何も増やさず従来の処理を続ける/, "モックを断られたら沈黙して続行する"],
        [/自己完結の単一 HTML 1ファイル\*\*（ブラウザで開くだけで見られる）/, "既定形式は開くだけで見られる単一HTML"],
        [/形式を Web\/HTML に固定しない/, "モック形式を固定しない"],
        [/\.intent\/nl-spec\/screen-design-mock\.html/, "モックの所定の派生出力先を使う"],
        [/外部リソース（CDN・外部フォント・外部画像・外部 API）に依存させず/, "モックは外部リソースに依存しない"],
        [/端末枠のビューポートで画面を表現する/, "非Web案件は端末枠で表現する"],
        [/依頼者が見たいものをモック内で切り替えて見られる/, "主要状態を切り替えて見られる"],
        [/\*\*利用者の合意または明示の終了だけ\*\*で終える/, "往復の終了は利用者に属する"],
        [/「満足したはず」と AI が自己宣言して打ち切らない/, "満足を自己宣言しない"],
        [/モックのパスを、下書きと同じく intent-tree の「画面ラフ参照」へ併記する/, "モック参照を画面ラフ参照へ併記する"],
        [/アプリのソースツリーへ書かない/, "モックをソースツリーへ書かない"],
        [/「本実装にそのまま使える品質」と約束しない/, "実装品質を約束しない"],
        [/知覚（画面に何があるか）→解釈（各要素が何を意味し、何をするか）→判断（どの基準に、どう未達か）/, "批評の関門が3段で点検する"],
        [/採点スクリプト・機械スコアリング・総合点を持ち込まない/, "採点スクリプトを持ち込まない"],
        [/公開規格が計算式を定める確認（WCAG のコントラスト比等）に限り/, "規格計算の補助は公開規格に限る"],
        [/Baymard Institute の可読性ガイドライン/, "タイポグラフィ基準に出典がある"],
        [/WCAG 2\.1 AA。規格計算の補助可/, "コントラスト基準に出典がある"],
        [/直しきれない未達は隠さず、どの基準に・なぜ未達か・その出典を明示してモックと一緒に提示する/, "未達を出典付きで明示して提示する"],
        [/提示を保留して自動再生成を繰り返さない/, "提示を保留した自動再生成をしない"],
        [/「基準→ギャップ→解決策」の順で書く/, "批評の文を基準→ギャップ→解決策で書く"],
        [/出典付きの指摘を1回だけ添え、以後はその選好を尊重して生成する/, "選好との衝突は指摘1回に留める"],
        [/批評の関門は依頼者の判断を上書きしない/, "関門が依頼者の判断を上書きしない"],
        [/「画面ラフ参照」へ参照として記録/, "下書き参照を画面ラフ参照へ記録する"],
        [/置き換えず下書きの参照を併記/, "既存ラフ参照を置き換えない"],
        [/Intent Compass、packet、mode の記録は変更しない/, "canonical を変更しない"],
        [/派生下書きは canonical な intent の代わりにしない/, "派生を正本の代わりにしない"],
        [/書き込みに失敗した場合は対象パスを報告/, "書き込み失敗時に対象パスを報告する"],
        [/巻き戻さない/, "失敗しても正本・採否記録を巻き戻さない"],
      ]
    : [
        [/The case includes user-facing screens \(UI\)/, "fires only for UI cases"],
        [/designer-questions is on/, "requires designer-questions=on"],
        [/deep, \*\*or\*\* the role lens adopted "the perspective that designs the screens"/, "fires on deep or the adopted screen-design perspective"],
        [/cases with no applicable UI, cases where designer-questions is off, and standard cases where screen examination was not chosen, add no question and no draft and continue the existing flow/i, "stays silent for non-UI / off / standard"],
        [/at most 4 questions per batch/, "keeps the few-at-a-time guardrail"],
        [/"check later \/ unknown \/ not applicable"/, "does not force an answer"],
        [/normal, empty \(no data\), loading, failure, insufficient permission, and completed/, "confirms the six key states"],
        [/"simple" or "modern" alone/, "does not end on vague words"],
        [/information density, whitespace, the role of color, the order of emphasis/, "opens vague words into concrete choices"],
        [/add no inference that contradicts the material/, "does not contradict existing material"],
        [/"reference unverified" and do not substitute inferred content/, "marks unreadable references unverified"],
        [/code-frontend\.md` exists, match against it read-only/, "matches the frontend starters read-only"],
        [/the user decides adoption/i, "adoption is the user's decision"],
        [/constraint-ledger\.md/, "records decisions in the existing ledger"],
        [/Do not resurface declined starters/, "does not resurface declined starters"],
        [/skip the matching or recording and do not stop/, "does not stop without the container"],
        [/never a gate on the process/, "matching is not a gate"],
        [/\.intent\/nl-spec\/screen-design-brief\.md/, "uses the designated derived destination"],
        [/inferred, derived, regenerable, and not a source of truth/, "puts four provenance labels in the header"],
        [/\*\*confirmed \/ inferred \/ unverified\*\*/, "separates confirmed / inferred / unverified"],
        [/multiple inferred candidates or as unverified/, "keeps unreferenced visual direction inferred or unverified"],
        [/Do not fix trendy looks or brand expressions as if they were facts/, "does not fix a brand on its own"],
        [/Do not automatically generate images, a design system, or a brand guide/, "does not generate images or design systems"],
        [/only when the user wants it, in "Generating the mock and the feedback loop" below \(never generated unasked\)/, "generates the mock only when asked"],
        [/fully replaces the same path and never appends duplicates/, "reruns fully replace the same path"],
        [/ask \*\*one question\*\* to confirm whether to also build a viewable, clickable mock/, "starts the mock with a one-question confirmation"],
        [/if declined, add nothing and continue the existing flow/, "stays silent when the mock is declined"],
        [/\*\*a single self-contained HTML file\*\* \(viewable just by opening it in a browser\)/, "defaults to a single self-contained HTML file"],
        [/do not fix the format to web\/HTML/, "does not fix the mock format"],
        [/\.intent\/nl-spec\/screen-design-mock\.html/, "uses the designated mock destination"],
        [/depends on no external resources \(CDNs, external fonts, external images, external APIs\)/, "the mock depends on no external resources"],
        [/present the screens inside a device-frame viewport/, "represents non-web cases in a device frame"],
        [/switch the mock between the key states settled in the draft/, "lets the requester switch key states"],
        [/ends \*\*only on the requester's agreement or an explicit stop\*\*/, "the loop ends only with the requester"],
        [/never cuts it off by declaring on its own that the user must be satisfied/, "never self-declares satisfaction"],
        [/Record the mock's path alongside the draft in the intent-tree's "Screen Rough Reference"/, "records the mock reference alongside"],
        [/never write it into the app's source tree/, "never writes the mock into the source tree"],
        [/do not promise that the mock's code is "ready to use as-is"/, "does not promise implementation-grade code"],
        [/perception \(what is on the screen\) → comprehension \(what each element means and does\) → judgment \(which criterion it falls short of, and how\)/, "the critique gate checks in three stages"],
        [/do not introduce scoring scripts, mechanical scoring, or aggregate scores/, "no scoring scripts"],
        [/checks whose formula is defined by a public standard \(such as the WCAG contrast ratio\)/, "formula aid limited to public standards"],
        [/Baymard Institute's readability guidelines/, "typography criterion cites its source"],
        [/WCAG 2\.1 AA; the standard's calculation may assist/, "contrast criterion cites its source"],
        [/Never hide what cannot be fixed — present the mock together with which criterion it falls short of, why, and the source/, "presents shortfalls with sources"],
        [/Do not hold back the presentation to regenerate repeatedly/, "no presentation-withholding regeneration"],
        [/in the order criterion → gap → remedy/, "critique written as criterion, gap, remedy"],
        [/add a sourced note once, then respect that preference/, "preference conflicts get one sourced note"],
        [/The critique gate never overrides the requester's judgment/, "the gate never overrides the requester"],
        [/as a reference in the intent-tree's "Screen Rough Reference"/, "records the draft reference in the existing section"],
        [/do not replace it; record the draft reference alongside it/, "keeps the existing rough reference"],
        [/Do not change the Intent Compass, any packet, or the mode records/, "does not change canonical artifacts"],
        [/never substitutes for canonical intent/, "derived draft never substitutes for intent"],
        [/If the write fails, report the target path/, "reports the target path on write failure"],
        [/do not roll back any source of truth or the decision ledger/, "does not roll back on failure"],
      ];

  return patterns.filter(([pattern]) => !pattern.test(text)).map(([, message]) => message);
}

test("ScreenDesignRule: 4面に発火条件・質問領域・素材優先・派生生成・結線・境界の契約がある", () => {
  for (const lang of LANGS) {
    const claude = readRule(lang, "claude", "intent-discover", "screen-design-brief.md");
    const codex = readRule(lang, "codex", "intent-discover", "screen-design-brief.md");
    assert.equal(claude, codex, `${lang}: Claude/Codex ruleがbyte一致する`);
    assert.deepEqual(screenDesignRuleErrors(claude, lang), [], `${lang}: 画面デザイン契約が揃う`);
  }
});

test("ScreenDesignRule: 沈黙条件の逆転・標識の削除・出力先の変更などの誤実装を判別する", () => {
  const source = readRule("ja", "claude", "intent-discover", "screen-design-brief.md");
  const mutations = [
    ["off でも発火へ逆転", "UI 非該当の案件、designer-questions が off の案件、standard で画面検討を選ばなかった案件では、質問も下書きも増やさず、従来の処理を続ける", "どの案件でも常に画面の質問と下書きを行う"],
    ["主要状態の一覧を削除", "通常・空（データなし）・読込中・失敗・権限不足・完了", "通常時の見え方"],
    ["曖昧語の具体化を削除", "「シンプル」「モダン」のような曖昧な言葉だけで確認を終えない", "「シンプル」「モダン」といった回答をそのまま記録する"],
    ["素材優先を逆転", "素材と矛盾する推測を追加しない", "素材より新しい推測を優先する"],
    ["三区分標識を削除", "**確定／推測（inferred）／未確認**のいずれかの標識付き", "自然な文章"],
    ["派生先を canonical へ変更", ".intent/nl-spec/screen-design-brief.md", ".intent/intent-tree.md"],
    ["全置換を追記へ逆転", "同じ案件の再実行では同じパスを全置換し、重複追記しない", "同じ案件の再実行では同じパスへ追記する"],
    ["既存ラフ参照の置換へ逆転", "置き換えず下書きの参照を併記", "下書きの参照で置き換え"],
    ["照合をゲートへ逆転", "照合を工程のゲートにしない", "照合を通過するまで先へ進まない"],
    ["ブランド確定へ逆転", "流行の見た目やブランド表現を事実のように確定しない", "流行を踏まえた見た目を確定する"],
    ["モックを追認なし自動生成へ逆転", "「見て触れるモックも作るか」を**1問で**追認する", "下書きの確定後は常にモックを自動生成する"],
    ["モック拒否時も生成へ逆転", "断られたら何も増やさず従来の処理を続ける", "断られても参考としてモックを生成しておく"],
    ["満足の自己宣言へ逆転", "「満足したはず」と AI が自己宣言して打ち切らない", "十分な品質と判断したら AI の判断で往復を終了する"],
    ["ソースツリー配置へ逆転", "アプリのソースツリーへ書かない", "アプリのソースツリーへ配置してよい"],
    ["外部CDN依存へ逆転", "外部リソース（CDN・外部フォント・外部画像・外部 API）に依存させず", "CDN の CSS フレームワークを読み込んで"],
    ["Web固定へ逆転", "端末枠のビューポートで画面を表現する", "デスクトップ幅で画面を表現する"],
    ["モック出力先を canonical へ変更", ".intent/nl-spec/screen-design-mock.html", ".intent/intent-tree.md"],
    ["未達時の提示保留へ逆転", "提示を保留して自動再生成を繰り返さない", "未達が解消するまで提示せず再生成を繰り返す"],
    ["採点スクリプト導入へ逆転", "採点スクリプト・機械スコアリング・総合点を持ち込まない", "採点スクリプトで各基準を数値評価し総合点を出す"],
    ["関門の検閲化へ逆転", "批評の関門は依頼者の判断を上書きしない", "基準に反する要望は理論違反として受け付けず修正する"],
    ["基準の出典を削除", "（Baymard Institute の可読性ガイドライン）", "（一般的な知見）"],
    ["3段の批評を削除", "知覚（画面に何があるか）→解釈（各要素が何を意味し、何をするか）→判断（どの基準に、どう未達か）の順に点検する", "気になった点を順不同で点検する"],
  ];

  assert.deepEqual(screenDesignRuleErrors(source, "ja"), [], "基準ruleは契約を満たす");
  for (const [label, before, after] of mutations) {
    const mutated = source.replaceAll(before, after);
    assert.notEqual(mutated, source, `${label}: 違反を注入できる`);
    assert.notDeepEqual(screenDesignRuleErrors(mutated, "ja"), [], `${label}: 構造検査が違反を検出する`);
  }
});

// ---------------------------------------------------------------------------
// 2. designer-questions への接続（手順 6.1・ロールレンズ例示・off で非発火）
// ---------------------------------------------------------------------------

function hookErrors(text, lang) {
  const patterns = lang === "ja"
    ? [
        [/6\.1\. \*\*画面デザインを実装前に詰める対話と下書き/, "手順6.1がある"],
        [/6\.1[\s\S]{0,400}`rules\/screen-design-brief\.md` を読み/, "手順6.1が専用ruleを読む"],
        [/6\.1[\s\S]{0,600}発火条件を満たさない案件では質問も下書きも増やさない/, "手順6.1が沈黙規律を委ねる"],
        [/\*\*画面を設計する観点\*\*（各画面の目的・情報の優先順位・主要状態・見た目の方向。体験を設計する観点とは別）も候補に挙げてよい（これも例示であり、固定リスト化しない）/, "ロールレンズに画面設計観点の例示がある"],
        [/手順 6\.1（画面デザインの詰めと下書き）[^\n]*は発火しない/, "off のとき手順6.1が発火しない"],
      ]
    : [
        [/6\.1\. \*\*Probe screen design before implementation/, "step 6.1 exists"],
        [/6\.1[\s\S]{0,400}read `rules\/screen-design-brief\.md`/, "step 6.1 reads the dedicated rule"],
        [/6\.1[\s\S]{0,700}add no question and no draft/, "step 6.1 defers to the silence discipline"],
        [/\*\*the perspective that designs the screens\*\* \(each screen's purpose, information priority, key states, and visual direction — distinct from the perspective that designs the experience\) as a candidate \(this too is an example, never a fixed list\)/, "the role lens lists the screen-design perspective as an example"],
        [/step 6\.1 \(probing screen design with a draft\)[^\n]*do not fire/, "step 6.1 does not fire when off"],
      ];

  return patterns.filter(([pattern]) => !pattern.test(text)).map(([, message]) => message);
}

test("DesignerQuestionsHook: 4面で手順6.1と画面設計観点の例示が接続され off では発火しない", () => {
  for (const lang of LANGS) {
    const claude = readRule(lang, "claude", "intent-discover", "designer-questions.md");
    const codex = readRule(lang, "codex", "intent-discover", "designer-questions.md");
    assert.equal(claude, codex, `${lang}: Claude/Codexの接続がbyte一致する`);
    assert.deepEqual(hookErrors(claude, lang), [], `${lang}: 接続契約が揃う`);
  }
});

test("DesignerQuestionsHook: rule参照の削除・off発火・固定リスト化を判別する", () => {
  const source = readRule("ja", "claude", "intent-discover", "designer-questions.md");
  const mutations = [
    ["rule参照を削除", /[^\n]*`rules\/screen-design-brief\.md` を読み[^\n]*\n/, ""],
    ["offでも発火へ逆転", "手順 6.1（画面デザインの詰めと下書き）・手順 6.5", "手順 6.5"],
    ["例示を固定リストへ変更", "も候補に挙げてよい（これも例示であり、固定リスト化しない）", "を必ず観点一覧に含める"],
  ];

  assert.deepEqual(hookErrors(source, "ja"), [], "基準ruleは契約を満たす");
  for (const [label, before, after] of mutations) {
    const mutated = source.replace(before, after);
    assert.notEqual(mutated, source, `${label}: 違反を注入できる`);
    assert.notDeepEqual(hookErrors(mutated, "ja"), [], `${label}: 構造検査が違反を検出する`);
  }
});

// ---------------------------------------------------------------------------
// 3. export 3ターゲットへの引き継ぎ（ピンポイント例外・推測標識維持・無ければ従来どおり）
// ---------------------------------------------------------------------------

const EXPORT_MAPS = [
  ["intent-export-cc-sdd", "map-cc-sdd.md"],
  ["intent-export-openspec", "map-openspec.md"],
  ["intent-export-speckit", "map-speckit.md"],
];

function exportHandoffErrors(text, lang) {
  const patterns = lang === "ja"
    ? [
        [/例外（画面デザイン下書きの引き継ぎ・UI 案件のみ）/, "UI 案件限定の例外として宣言する"],
        [/「画面ラフ参照」セクションを L0–L1 と同じ要領でピンポイント参照/, "画面ラフ参照だけをピンポイント参照する"],
        [/\.intent\/nl-spec\/screen-design-brief\*\.md/, "画面デザイン下書きの参照を対象にする"],
        [/推測（inferred）標識は落とさず、確定へ昇格させない/, "推測標識を維持し昇格させない"],
        [/参照が無ければ[^\n]*従来どおり/, "参照が無ければ従来どおり続ける"],
      ]
    : [
        [/Exception \(carrying the screen-design draft; UI cases only\)/, "declares the UI-only exception"],
        [/"Screen Rough Reference" section in the same pinpoint manner as L0–L1/, "reads only the Screen Rough Reference pinpoint"],
        [/\.intent\/nl-spec\/screen-design-brief\*\.md/, "targets the screen-design draft reference"],
        [/Do not drop the inferred markers and do not promote them to confirmed/, "keeps inferred markers unpromoted"],
        [/When there is no reference, read nothing[\s\S]{0,80}continue as before|When there is no reference, write nothing for this item \(as before\)/, "continues as before without a reference"],
      ];

  return patterns.filter(([pattern]) => !pattern.test(text)).map(([, message]) => message);
}

test("ExportHandoff: 3ターゲット×ja/enで画面デザイン下書きの引き継ぎ契約が揃い Claude/Codex が一致する", () => {
  for (const lang of LANGS) {
    for (const [skill, file] of EXPORT_MAPS) {
      const claude = readRule(lang, "claude", skill, file);
      const codex = readRule(lang, "codex", skill, file);
      assert.equal(claude, codex, `${lang}/${skill}: Claude/Codexがbyte一致する`);
      assert.deepEqual(exportHandoffErrors(claude, lang), [], `${lang}/${skill}: 引き継ぎ契約が揃う`);
    }
  }
});

test("ExportHandoff: UI限定の削除・標識昇格・常時読取への逆転を判別する", () => {
  const source = readRule("ja", "claude", "intent-export-cc-sdd", "map-cc-sdd.md");
  const mutations = [
    ["UI限定を削除", "例外（画面デザイン下書きの引き継ぎ・UI 案件のみ）", "画面デザイン下書きの引き継ぎ（全案件）"],
    ["推測を確定へ昇格", "推測（inferred）標識は落とさず、確定へ昇格させない", "推測は確定として整形してよい"],
    ["無くても書くへ逆転", "参照が無ければこの項を書かない（従来どおり）", "参照が無くても Tree 全文から画面の記述を探して書く"],
  ];

  assert.deepEqual(exportHandoffErrors(source, "ja"), [], "基準ruleは契約を満たす");
  for (const [label, before, after] of mutations) {
    const mutated = source.replaceAll(before, after);
    assert.notEqual(mutated, source, `${label}: 違反を注入できる`);
    assert.notDeepEqual(exportHandoffErrors(mutated, "ja"), [], `${label}: 構造検査が違反を検出する`);
  }
});

// ---------------------------------------------------------------------------
// 4. intent-tree テンプレートの画面ラフ参照注記（結線の受け皿）
// ---------------------------------------------------------------------------

test("TreeTemplateNote: ja/en テンプレートの画面ラフ参照が下書き参照の併記を案内する", () => {
  const cases = [
    ["ja", /画面デザイン下書き（`\.intent\/nl-spec\/screen-design-brief\*\.md`・派生・推測標識付き）への参照もここに記録します（既存のラフ参照があれば置き換えず併記）/],
    ["en", /the generated screen-design draft \(`\.intent\/nl-spec\/screen-design-brief\*\.md`; derived, with inference markers\) — alongside, not replacing, any existing rough reference/],
  ];
  for (const [lang, pattern] of cases) {
    const text = fs.readFileSync(path.join(ROOT, "templates", lang, "intent", "intent-tree.md"), "utf8");
    assert.match(text, pattern, `${lang}: テンプレート注記がある`);
  }
});

// ---------------------------------------------------------------------------
// 5. install() が新 rule を配布する（4配布面）
// ---------------------------------------------------------------------------

test("InstallDelivery: install()が screen-design-brief rule を4配布面へ届ける", () => {
  for (const lang of LANGS) {
    for (const agent of ["claude", "codex"]) {
      const target = fs.mkdtempSync(path.join(os.tmpdir(), `ip-screen-design-${lang}-${agent}-`));
      try {
        install(target, { lang, agent, confirmRootDoc: () => false });
        const skillRoot = path.join(target, agent === "claude" ? ".claude/skills" : ".agents/skills");
        const installed = path.join(skillRoot, "intent-discover", "rules", "screen-design-brief.md");
        assert.equal(
          fs.readFileSync(installed, "utf8"),
          readRule(lang, agent, "intent-discover", "screen-design-brief.md"),
          `${lang}/${agent}: screen-design-brief.md が所定位置へ届く`,
        );
      } finally {
        fs.rmSync(target, { recursive: true, force: true });
      }
    }
  }
});

// ---------------------------------------------------------------------------
// 6. dogfood 同期（この案件が触ったファイル）
// ---------------------------------------------------------------------------

test("DogfoodSync: dogfood の screen-design-brief と接続ファイルが templates ja/claude と一致する", () => {
  const files = [
    ["intent-discover", "screen-design-brief.md"],
    ["intent-discover", "designer-questions.md"],
    ["intent-export-cc-sdd", "map-cc-sdd.md"],
    ["intent-export-openspec", "map-openspec.md"],
    ["intent-export-speckit", "map-speckit.md"],
  ];
  for (const [skill, file] of files) {
    const source = readRule("ja", "claude", skill, file);
    for (const root of [".claude/skills", ".agents/skills"]) {
      const dogfood = path.join(ROOT, root, skill, "rules", file);
      if (!fs.existsSync(dogfood)) continue;
      assert.equal(fs.readFileSync(dogfood, "utf8"), source, `${root}/${skill}/${file}: dogfood が同期されている`);
    }
  }
});

// ---------------------------------------------------------------------------
// 7. doc-sync（README / guide / theory の日英）
// ---------------------------------------------------------------------------

test("DocSync: README と guide と theory の日英が画面デザインの詰めを案内する", () => {
  const readmeJa = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const readmeEn = fs.readFileSync(path.join(ROOT, "README.en.md"), "utf8");
  const guideJa = fs.readFileSync(path.join(ROOT, "docs", "guide.md"), "utf8");
  const guideEn = fs.readFileSync(path.join(ROOT, "docs", "guide.en.md"), "utf8");
  const theoryJa = fs.readFileSync(path.join(ROOT, "docs", "theory.md"), "utf8");
  const theoryEn = fs.readFileSync(path.join(ROOT, "docs", "theory.en.md"), "utf8");

  assert.match(readmeJa, /\[画面デザインの詰めと下書き\]\(docs\/guide\.md#画面デザインの詰めと下書き\)/, "README ja が guide の実在節へリンクする");
  assert.match(readmeEn, /\[Screen-design probing and draft\]\(docs\/guide\.en\.md#screen-design-probing-and-draft\)/, "README en が guide の実在節へリンクする");

  assert.match(guideJa, /^## 画面デザインの詰めと下書き$/m, "guide ja に独立節がある");
  assert.match(guideJa, /deep（深掘り）を選んだか、ロールレンズで「画面を設計する観点」を採用した案件だけ/, "guide ja が発火条件を示す");
  assert.match(guideJa, /`\.intent\/nl-spec\/screen-design-brief\.md`/, "guide ja が出力先を示す");
  assert.match(guideJa, /画像、デザインシステム、ブランドガイドは生成しません/, "guide ja が対象外境界を示す");
  assert.match(guideJa, /`\.intent\/nl-spec\/screen-design-mock\.html`/, "guide ja がモックの出力先を示す");
  assert.match(guideJa, /望んだときだけ|望まれたときだけ/, "guide ja がモックの希望時限定を示す");
  assert.match(guideJa, /依頼者の合意|明示の終了/, "guide ja が往復の終了条件を示す");

  assert.match(guideEn, /^## Screen-design probing and draft$/m, "guide en に独立節がある");
  assert.match(guideEn, /chose deep or adopted "the perspective that designs the screens"/, "guide en が発火条件を示す");
  assert.match(guideEn, /`\.intent\/nl-spec\/screen-design-brief\.md`/, "guide en が出力先を示す");
  assert.match(guideEn, /does not generate images, a design system, or a brand guide/i, "guide en が対象外境界を示す");
  assert.match(guideEn, /`\.intent\/nl-spec\/screen-design-mock\.html`/, "guide en がモックの出力先を示す");
  assert.match(guideEn, /only when the user wants it|only when asked/i, "guide en がモックの希望時限定を示す");
  assert.match(guideEn, /requester's agreement|explicit stop/i, "guide en が往復の終了条件を示す");

  assert.match(theoryJa, /画面デザインの詰め[\s\S]{0,700}screen-design-brief\.md/, "theory ja が射影の位置づけを示す");
  assert.match(theoryEn, /Screen-design probing[\s\S]{0,700}screen-design-brief\.md/, "theory en が射影の位置づけを示す");

  assert.match(readmeJa, /批評の関門/, "README ja が批評の関門に触れる");
  assert.match(readmeEn, /critique gate/, "README en が批評の関門に触れる");
  assert.match(guideJa, /批評の関門[\s\S]{0,400}採点スクリプトは持ち込みません/, "guide ja が関門と非採点を示す");
  assert.match(guideJa, /直しきれない未達は隠さず出典付きで明示/, "guide ja が未達の明示を示す");
  assert.match(guideEn, /critique gate[\s\S]{0,500}no scoring scripts/, "guide en が関門と非採点を示す");
  assert.match(guideEn, /never hidden but stated explicitly with its source/, "guide en が未達の明示を示す");
  assert.match(theoryJa, /批評の関門[\s\S]{0,200}採点スクリプトを内蔵しません/, "theory ja が関門の位置づけを示す");
  assert.match(theoryEn, /critique gate[\s\S]{0,400}embeds no scoring scripts/, "theory en が関門の位置づけを示す");
});
