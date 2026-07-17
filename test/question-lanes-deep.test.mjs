// pkt-20260704-question-lanes-deep-2pk0（A46・DR86・INV58）の構造オラクル。
//
// 背景: 問いのレーンが discover に偏在し、compass（プレモータム）・packets（decision slot）に利用者へ
//   問いを向ける仕組みがほぼ無かった。compass の algo-qoc.md 手順3 と packets の decision-slots.md に
//   deep 連動の問いレーンを足した。既定（standard）は不変・deep は明示 opt-in。ここでは「両レーンが
//   question-depth=deep 連動」「standard で発火しない明文」「歯止め INV58」「anchoring 回避継承（値を置かない）」
//   「A30 decision-probe とレーン分離」を discriminative に名指しし、standard でも発火させる退化を落とす。
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

function qocPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-compass", "rules", "algo-qoc.md");
}
function slotsPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-packets", "rules", "decision-slots.md");
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}

// 共通: deep 連動レーンの検査（compass / packets どちらのファイルにも同じ性質を要求する）。
function assertDeepLane(t, lang, label) {
  // question-depth=deep 連動。
  assert.match(t, /question-depth/, `${label}: question-depth を読む`);
  assert.match(t, /deep/, `${label}: deep 連動`);
  // standard/未記載/off では発火しない（既定不変）。
  const noFireDefault = lang === "ja"
    ? /(standard.*発火しない|発火しない.*（従来|既定|後方互換）|standard・未記載)/
    : /does not fire.*(standard|absent|off)|on standard \/ absent/i;
  assert.match(t, noFireDefault, `${label}: standard/未記載/off で発火しない`);
  // 歯止め INV58（少数・理由一行）。
  assert.match(t, /INV58/, `${label}: INV58 の歯止めに帰属`);
  // anchoring 回避継承（単一の推奨アンカーを置かない・DR199 で「値を置かない」から再定義）。
  const noSingleAnchor = lang === "ja"
    ? /単一(の推奨)?アンカー(を|は)置かない/
    : /place no single (recommended )?anchor/i;
  assert.match(t, noSingleAnchor, `${label}: 単一の推奨アンカーを置かない（anchoring 回避継承）`);
  // A30 decision-probe とレーン分離。
  assert.match(t, /decision-probe/, `${label}: decision-probe とレーンを分ける`);
}

// ---- 1: compass の algo-qoc プレモータム手順に deep の問いレーンがある ----
test("question-lanes-deep: compass のプレモータムに deep 連動の問いレーンがある（DR86・INV58）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(qocPath(lang, agent));
    assertDeepLane(t, lang, `${lang}/${agent} algo-qoc`);
    // プレモータムを利用者へ問いとして向ける。
    const askUser = lang === "ja"
      ? /利用者(にも|へ).*問い/
      : /questions for the user|turn them into questions for the user/i;
    assert.match(t, askUser, `${lang}/${agent} algo-qoc: プレモータムを利用者へ問いとして向ける`);
  }
});

// ---- 2: packets の decision-slots に deep の聞き切りレーンがある ----
test("question-lanes-deep: packets の decision-slots に deep 連動の聞き切りレーンがある（DR86・INV58）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(slotsPath(lang, agent));
    assertDeepLane(t, lang, `${lang}/${agent} decision-slots`);
    // 聞き切り（まとめて提示・「後で」込み）。
    const throughLane = lang === "ja"
      ? /(聞き切る|まとめて提示)/
      : /(question.*through|present them grouped)/i;
    assert.match(t, throughLane, `${lang}/${agent} decision-slots: 決定スロットを聞き切る`);
  }
});

// ---- 3: 4系統パリティ（claude ⇔ codex byte 等価）----
test("question-lanes-deep: 触った2 rule が claude⇔codex で byte 等価（4系統パリティ）", () => {
  for (const lang of ["ja", "en"]) {
    for (const fn of [qocPath, slotsPath]) {
      const claude = read(fn(lang, "claude"));
      const codex = read(fn(lang, "codex"));
      assert.equal(claude, codex, `${lang}: ${path.basename(fn(lang, "claude"))} が claude⇔codex で byte 等価`);
    }
  }
});
