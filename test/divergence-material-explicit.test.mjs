// pkt-20260712-divergence-material-explicit-rjo1 の判別テスト。
// 発散用の材料が、4系統すべてで条件付き・暫定・既存 depth 利用として明文化されることを固定する。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const variants = [
  ["ja", "claude"],
  ["ja", "codex"],
  ["en", "claude"],
  ["en", "codex"],
];

function skill(lang, agent) {
  return fs.readFileSync(path.join(ROOT, "templates", lang, agent, "skills", "intent-discover", "SKILL.md"), "utf8");
}

test("発散の探索材料は4系統で条件付き・暫定として明文化される", () => {
  for (const [lang, agent] of variants) {
    const content = skill(lang, agent);
    const ja = lang === "ja";
    for (const phrase of ja
      ? ["解が複数あり得る案件のときだけ", "対立する仮説", "反例", "別の問題設定", "canonical へ昇格させず", "question-depth", "解が自明な案件ではこの儀式を走らせない"]
      : ["Only when multiple solutions are plausible", "competing hypotheses", "counterexamples", "alternative problem framings", "do not promote them to canonical", "question-depth", "Do not run this ritual for a self-evident case"]) {
      assert.ok(content.includes(phrase), `${lang}/${agent}: ${phrase}`);
    }
  }
});

test("発散時の出力は compass への未決境界の引き継ぎだけを定める", () => {
  for (const [lang, agent] of variants) {
    const content = skill(lang, agent);
    const ja = lang === "ja";
    for (const phrase of ja
      ? ["compass への引き継ぎ（発散時は必須）", "未決の境界は Open Questions のまま渡し", "確定した境界内だけで自律する"]
      : ["Compass handoff (required when divergent)", "Hand unresolved boundaries over as Open Questions", "acts autonomously only within the boundaries confirmed by that compass and its packets"]) {
      assert.ok(content.includes(phrase), `${lang}/${agent}: ${phrase}`);
    }
  }
});
