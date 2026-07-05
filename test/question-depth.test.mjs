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

function dqPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-discover", "rules", "designer-questions.md");
}
function read(p) {
  return fs.readFileSync(p, "utf8");
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
