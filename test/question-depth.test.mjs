// pkt-20260704-question-depth-dial-qq38（A46・DR86・INV58）の構造オラクル。
//
// 背景: 意図を引き出す問いは designer-questions の on/off 2値しかなく「もっと掘ってほしい」に応える段階が
//   無かった。独立行 question-depth: standard|deep を足し（書き手=discover のみ）、要否確認を「質問が必要か」
//   ストレート形＋トレードオフ明記（正確性 vs 速度と仕様乖離リスク）へ直し、deep の質問群を designer-questions.md
//   に足した。既定体験（standard）は不変。ここでは「トレードオフ明記」「question-depth 記録」「deep 質問群と歯止め」
//   「standard 不変の明文」を discriminative に名指しし、これらを消す退化（旧 on/off 4点説明先出しへ戻す等）を落とす。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const VARIANTS = [
  ["ja", "claude"], ["en", "claude"], ["ja", "codex"], ["en", "codex"],
];
const JA_DEEP_RULES = [
  ["ja/claude", dqPath("ja", "claude")],
  ["ja/codex", dqPath("ja", "codex")],
  ["repository rule", path.join(ROOT, ".agents", "skills", "intent-discover", "rules", "designer-questions.md")],
];
const EN_DEEP_RULES = [
  ["en/claude", dqPath("en", "claude")],
  ["en/codex", dqPath("en", "codex")],
];

function dqPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-discover", "rules", "designer-questions.md");
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}

function deepSection(p) {
  const text = read(p);
  const match = text.match(/^6\.6\.[\s\S]*?(?=^7\.|^## designer-questions)/m);
  assert.ok(match, `${p}: 手順6.6を抽出できる`);
  return match[0];
}

// ---- 1: 要否確認がストレート形＋トレードオフ明記（DR86-(3)）----
// 旧「4点説明→on/off」から「質問が必要か」ストレート＋トレードオフ（正確性 vs 速度と仕様乖離リスク）へ。
test("question-depth: 要否確認にトレードオフ明記がある（正確性 vs 速度と仕様乖離・DR86）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(dqPath(lang, agent));
    // 質問を受ける＝正確性が増す。
    const accuracy = lang === "ja"
      ? /正確性が増す/
      : /result becomes more accurate/i;
    assert.match(t, accuracy, `${lang}/${agent}: 質問を受ける＝正確性が増す`);
    // 質問を飛ばす＝開発速度が上がる。
    const speed = lang === "ja"
      ? /開発速度が上がる/
      : /development speed goes up/i;
    assert.match(t, speed, `${lang}/${agent}: 質問を飛ばす＝開発速度が上がる`);
    // デメリット＝AI が思い描く仕様と異なるものを作る可能性。
    const risk = lang === "ja"
      ? /思い描く仕様と異なるもの.*作って/
      : /differs from the user's intended spec|builds something that differs/i;
    assert.match(t, risk, `${lang}/${agent}: 飛ばすと仕様と異なるものを作るリスク明記`);
  }
});

// ---- 2: question-depth 行の記録（書き手=discover のみ・未記載=standard・deep は on のみ）----
test("question-depth: 独立行 question-depth を discover が記録する（standard|deep・後方互換）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(dqPath(lang, agent));
    assert.match(t, /question-depth/, `${lang}/${agent}: question-depth を扱う`);
    // standard / deep の2トークン。
    assert.match(t, /standard/, `${lang}/${agent}: standard トークン`);
    assert.match(t, /deep/, `${lang}/${agent}: deep トークン`);
    // 未記載・未知値は standard（後方互換）。
    const fallback = lang === "ja"
      ? /(未記載・未知値|未知値).*standard/
      : /missing or unknown value.*standard/i;
    assert.match(t, fallback, `${lang}/${agent}: 未記載/未知値は standard`);
    // deep は designer-questions=on のときのみ。
    const onlyOnDq = lang === "ja"
      ? /designer-questions=on の(とき|帰結)/
      : /(only when designer-questions=on|consequence of designer-questions=on|a consequence of on)/i;
    assert.match(t, onlyOnDq, `${lang}/${agent}: deep は on のときのみ`);
  }
});

// ---- 3: deep の質問群と歯止め（INV58）----
test("question-depth: deep の質問群に歯止め（少数・理由一行・後で・値提示しない）がある（INV58）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(dqPath(lang, agent));
    // deep 質問群の観点（中身・前提・エッジケース・反例・非機能）。
    const scope = lang === "ja"
      ? /(エッジケース|反例)/
      : /(edge case|counterexample)/i;
    assert.match(t, scope, `${lang}/${agent}: deep の観点（エッジケース/反例）`);
    // まとめて少数（1バッチ最大4問）。
    const fewAtATime = lang === "ja"
      ? /(まとめて少数|最大4問|1バッチ)/
      : /(few at a time|at most 4|per batch)/i;
    assert.match(t, fewAtATime, `${lang}/${agent}: まとめて少数`);
    // 値を提示しない（anchoring 回避継承）。
    const noValues = lang === "ja"
      ? /値(は|を)?提示しない/
      : /do not (present|put) (a )?(value|reasonable default)/i;
    assert.match(t, noValues, `${lang}/${agent}: deep でも値を提示しない`);
  }
});

// ---- 4: standard の既定体験は不変（deep は明示 opt-in の例外）----
test("question-depth: standard の既定体験を変えない明文がある（deep は opt-in 例外・INV58）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(dqPath(lang, agent));
    // 既定 standard の挙動・体験は変えない。
    const unchanged = lang === "ja"
      ? /(既定 standard の(挙動|体験)|既定の挙動・体験は(一切)?変えない|standard の挙動・体験は(一切)?変えない)/
      : /default `?standard`? (behavior|behavior\/experience) is unchanged/i;
    assert.match(t, unchanged, `${lang}/${agent}: standard の既定を変えない`);
    // deep は明示 opt-in の例外。
    const optIn = lang === "ja"
      ? /(明示的に.*deep|deep（深掘り）を選んだ)/
      : /explicitly chooses \*\*deep\*\*|user explicitly chooses deep/i;
    assert.match(t, optIn, `${lang}/${agent}: deep は明示 opt-in`);
  }
});

// ---- 5: 4系統パリティ（claude ⇔ codex byte 等価）----
test("question-depth: designer-questions が claude⇔codex で byte 等価（4系統パリティ）", () => {
  for (const lang of ["ja", "en"]) {
    const claude = read(dqPath(lang, "claude"));
    const codex = read(dqPath(lang, "codex"));
    assert.equal(claude, codex, `${lang}: designer-questions.md が claude⇔codex で byte 等価`);
  }
});

// ---- 6: deep は固定往復数でなく、必要論点の状態で完了する（INV58・INV61）----
test("question-depth: 日本語deepは未確認がなくなるまで最大4問ずつ継続する", () => {
  for (const [label, file] of JA_DEEP_RULES) {
    const section = deepSection(file);
    assert.match(section, /未確認/, `${label}: 未確認状態を持つ`);
    for (const terminal of ["回答済み", "後で確認", "不明", "該当なし"]) {
      assert.match(section, new RegExp(terminal), `${label}: 終端状態「${terminal}」を持つ`);
    }
    assert.match(section, /未確認.*残る.*次の質問束|未確認.*なくなるまで.*質問束/s,
      `${label}: 未確認が残る間の継続条件`);
    assert.match(section, /未確認.*なくな.*完了|すべて.*終端.*完了/s,
      `${label}: 全件終端時の完了条件`);
    assert.doesNotMatch(section, /最大2往復/, `${label}: 固定2往復を終了条件にしない`);
    assert.match(section, /9(?:件|論点).*4[^\n]*4[^\n]*1.*3回目/s,
      `${label}: 9論点を4+4+1で3回目まで扱う`);
    assert.match(section, /全(?:件|論点).*終端.*不要な.*質問束.*出さない|未確認.*なければ.*次の質問束.*出さない/s,
      `${label}: 全件終端後は不要な質問束を出さない`);
  }
});

test("question-depth: 日本語deepは利用者の終了と残件記録をすべての質問束で扱う", () => {
  for (const [label, file] of JA_DEEP_RULES) {
    const section = deepSection(file);
    assert.match(section, /すべての質問束|毎回/, `${label}: 終了選択を毎回提示する`);
    assert.match(section, /その場で終了|終了する選択肢/, `${label}: 明示終了を選べる`);
    assert.match(section, /終了.*新しい質問束.*(?:提示しない|出さない)/s,
      `${label}: 終了後は質問を継続しない`);
    assert.match(section, /終了.*(?:残る|未確認).*Open Questions/s,
      `${label}: 終了時の残件をOpen Questionsへ記録する`);
    assert.match(section, /2回目以降.*(?:確定|変更).*次に.*理由.*1[〜-]3文/s,
      `${label}: 次の質問束の前に反映内容と理由を示す`);
  }
});

// ---- 7: 固定上限を外しても論点が自己増殖しない ----
test("question-depth: 日本語deepは終端済みの再質問と根拠なし・同義の論点追加を禁止する", () => {
  for (const [label, file] of JA_DEEP_RULES) {
    const section = deepSection(file);
    assert.match(section, /終端.*言い換えて再質問しない|終端.*再質問しない/s,
      `${label}: 終端済み論点を再質問しない`);
    assert.match(section, /利用者の回答.*既存資料.*(?:出所|根拠)/s,
      `${label}: 新論点の出所を利用者回答か既存資料に限る`);
    assert.match(section, /(?:出所|根拠).*示せない.*追加しない/s,
      `${label}: 根拠なしの論点を追加しない`);
    assert.match(section, /同じ意味.*追加しない|同義.*追加しない/s,
      `${label}: 同義の論点を重複追加しない`);
    assert.match(section, /新しい.*論点.*同じ終了条件/s,
      `${label}: 根拠付き新論点にも同じ終了条件を適用する`);
  }
});

test("question-depth: 日本語guideとtheoryが論点基準の終了契約を説明する", () => {
  const guide = read(path.join(ROOT, "docs", "guide.md"));
  assert.match(guide, /deep（深掘り）.*明示的に選/s, "guide: deepは明示選択");
  assert.match(guide, /1回(?:の質問束は)?最大4問|一度に尋ねるのは最大4問/,
    "guide: 質問束は最大4問");
  assert.match(guide, /必要な論点.*(?:回答済み|後で確認).*すべて.*(?:片付|終端)/s,
    "guide: 必要論点の状態で完了する");
  assert.match(guide, /終了.*残る.*Open Questions/s, "guide: 明示終了時の残件記録");

  const theory = read(path.join(ROOT, "docs", "theory.md"));
  assert.match(theory, /固定.*(?:往復|回数).*終了条件.*しない/s,
    "theory: 固定往復数を終了条件にしない理由");
  assert.match(theory, /利用者の回答.*既存資料.*(?:根拠|出所)/s,
    "theory: 新論点を根拠付きに限定して収束させる");
  assert.match(theory, /同じ意味.*追加し(?:ない|ません)|同義.*追加し(?:ない|ません)/s,
    "theory: 同義重複を追加しない");
});

// ---- 8: English distribution has the same completion contract ----
function englishDeepContractViolations(section) {
  const checks = [
    ["unresolved state", /unresolved/i],
    ["answered terminal state", /answered/i],
    ["later terminal state", /later/i],
    ["unsure terminal state", /unsure/i],
    ["n\/a terminal state", /n\/a/i],
    ["continue while unresolved", /while[^.\n]*unresolved[^.\n]*(?:remain|left)[^.\n]*next (?:question )?batch/i],
    ["complete without unresolved concerns", /(?:when|once)[^.\n]*(?:no|zero)[^.\n]*unresolved[^.\n]*(?:complete|finished)/i],
    ["no fixed total round cap", /do not use[^.\n]*(?:fixed|total)[^.\n]*(?:round|batch)[^.\n]*(?:cap|limit|completion|stopping)/i],
    ["nine concerns use 4+4+1", /9 concerns[^.\n]*4\s*\+\s*4\s*\+\s*1[^.\n]*third (?:question )?batch/i],
    ["no batch after all concerns terminate", /(?:all concerns|no unresolved concerns)[^.\n]*(?:do not|no)[^.\n]*(?:unnecessary |next )?(?:question )?batch/i],
    ["stop is available in every batch", /every (?:question )?batch[^.\n]*(?:stop|end)/i],
    ["do not continue after stop", /(?:stop|end)[^.\n]*(?:do not|no)[^.\n]*(?:new|next) (?:question )?batch/i],
    ["record remaining concerns", /(?:stop|end)[^.\n]*(?:remaining|unresolved)[^.\n]*Open Questions/i],
    ["recap before later batches", /(?:second|subsequent) (?:question )?batch[^.\n]*(?:confirmed|changed)[^.\n]*reason[^.\n]*1(?:-|–)3 sentences/i],
    ["do not re-ask terminal concerns", /terminal[^.\n]*(?:do not|never)[^.\n]*re-ask/i],
    ["new concern needs an allowed source", /new concern[^.\n]*(?:user's answer|user answer)[^.\n]*existing (?:material|source)[^.\n]*(?:source|basis|ground)/i],
    ["do not add an unsourced concern", /(?:source|basis|ground)[^.\n]*(?:cannot|can't)[^.\n]*(?:do not|never)[^.\n]*add/i],
    ["do not add semantic duplicates", /(?:same meaning|semantic(?:ally)? (?:duplicate|equivalent))[^.\n]*(?:do not|never)[^.\n]*add/i],
    ["new concerns use the same completion rule", /new concern[^.\n]*same completion (?:condition|rule)/i],
  ];
  return checks.filter(([, pattern]) => !pattern.test(section)).map(([label]) => label);
}

test("question-depth: English deep continues in batches until every concern terminates", () => {
  for (const [label, file] of EN_DEEP_RULES) {
    const section = deepSection(file);
    assert.deepEqual(englishDeepContractViolations(section), [],
      `${label}: English deep completion contract`);
    assert.doesNotMatch(section, /at most 2 (?:round trips|rounds|batches)/i,
      `${label}: a fixed two-round cap is not the completion condition`);
    assert.match(section, /at most 4 questions per batch/i,
      `${label}: each batch contains at most four questions`);
  }
});

test("question-depth: English guide explains concern-based completion and explicit stop", () => {
  const guide = read(path.join(ROOT, "docs", "guide.en.md"));
  assert.match(guide, /explicitly (?:select|choose)[^\n.]*deep/i,
    "guide.en: deep is explicitly selected");
  assert.match(guide, /at most 4 questions per batch/i,
    "guide.en: each batch contains at most four questions");
  assert.match(guide, /(?:answered|later)[^\n.]*unsure[^\n.]*n\/a[^\n.]*(?:all|every)[^\n.]*(?:complete|finished|settled)|all[^\n.]*concerns[^\n.]*(?:answered|later)[^\n.]*unsure[^\n.]*n\/a/i,
    "guide.en: terminal concern states determine completion");
  assert.match(guide, /(?:stop|end)[^\n.]*remaining[^\n.]*Open Questions/i,
    "guide.en: explicit stop records remaining concerns");
});

test("question-depth: English deep oracle rejects six representative regressions", () => {
  const section = deepSection(dqPath("en", "claude"));
  const mutations = [
    ["fixed two-round cap", section.replace(/do not use[^.\n]*(?:fixed|total)[^.\n]*(?:round|batch)[^.\n]*(?:cap|limit|completion|stopping)[^.\n]*\./i,
      "Stop after at most 2 rounds.")],
    ["five questions", section.replace(/at most 4 questions per batch/i, "at most 5 questions per batch")],
    ["continue after stop", section.replace(/(?:stop|end)[^.\n]*(?:do not|no)[^.\n]*(?:new|next) (?:question )?batch[^.\n]*\./i,
      "After the user stops, continue with the next question batch.")],
    ["discard remaining concerns", section.replace(/(?:stop|end)[^.\n]*(?:remaining|unresolved)[^.\n]*Open Questions[^.\n]*\./i,
      "When the user stops, discard every remaining concern.")],
    ["allow unsourced additions", section.replace(/(?:source|basis|ground)[^.\n]*(?:cannot|can't)[^.\n]*(?:do not|never)[^.\n]*add[^.\n]*\./i,
      "If no source can be shown, add the concern anyway.")],
    ["repeat terminal concern", section.replace(/terminal[^.\n]*(?:do not|never)[^.\n]*re-ask[^.\n]*\./i,
      "Re-ask terminal concerns using different words.")],
  ];
  const expectedViolations = [
    "no fixed total round cap",
    "each batch contains at most four questions",
    "do not continue after stop",
    "record remaining concerns",
    "do not add an unsourced concern",
    "do not re-ask terminal concerns",
  ];
  for (let index = 0; index < mutations.length; index += 1) {
    const [label, mutated] = mutations[index];
    assert.notEqual(mutated, section, `${label}: mutation must alter the fixture`);
    const violations = englishDeepContractViolations(mutated);
    if (index === 1) {
      assert.doesNotMatch(mutated, /at most 4 questions per batch/i,
        `${label}: four-question guard rejects the mutation`);
    } else {
      assert.ok(violations.includes(expectedViolations[index]),
        `${label}: oracle must reject with ${expectedViolations[index]}; got ${violations.join(", ")}`);
    }
  }
});
