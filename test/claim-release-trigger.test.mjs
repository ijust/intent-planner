// pkt-20260712-claim-release-trigger-4non の判別テスト。
// 起草宣言の削除の契機（packets 工程の完了処理）と、やめた起草の扱い（既存の放置観測に委ねる）を4系統で固定する。
// 誤実装を落とす: 経過日数で自動削除した／宣言が無いときエラーにした／作成側(discover)へ波及した／
//                掃除機構を新設した／契約の助言性(止めない)を壊した、のいずれでも赤くなる。
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

const read = (...seg) => fs.readFileSync(path.join(ROOT, ...seg), "utf8");
const skill = (lang, agent, name) => read("templates", lang, agent, "skills", name, "SKILL.md");
const contract = (lang, agent) => read("templates", lang, agent, "skills", "CONTRACT.md");

test("packets の完了処理に、起草宣言を消す契機が4系統で明文化されている", () => {
  for (const [lang, agent] of variants) {
    const s = skill(lang, agent, "intent-packets");
    const phrases =
      lang === "ja"
        ? ["起草の割当宣言を消す", "issue_dir"]
        : ["deletes the drafting claim", "issue_dir"];
    for (const p of phrases) {
      assert.ok(s.includes(p), `${lang}/${agent} intent-packets: ${p}`);
    }
  }
});

test("削除は冪等（宣言が無ければ何もしない・エラーにしない）", () => {
  for (const [lang, agent] of variants) {
    const s = skill(lang, agent, "intent-packets");
    const phrase =
      lang === "ja"
        ? "宣言が無ければ何もしない"
        : "If no claim exists, do nothing";
    assert.ok(s.includes(phrase), `${lang}/${agent}: ${phrase}`);
  }
});

test("機械閾値による自動解放を持たない（経過日数で勝手に消さない）", () => {
  for (const [lang, agent] of variants) {
    const s = skill(lang, agent, "intent-packets");
    const c = contract(lang, agent);
    // packets 側: 契機は工程の節目であって経過日数ではない
    const packetsPhrase =
      lang === "ja"
        ? "経過日数などの機械閾値で自動削除しない"
        : "Never auto-delete on a machine threshold such as elapsed days";
    assert.ok(s.includes(packetsPhrase), `${lang}/${agent} intent-packets: ${packetsPhrase}`);
    // CONTRACT 側: 既存の禁止（自動解放しない）が残存
    const contractPhrase =
      lang === "ja"
        ? "機械閾値で自動判定・自動解放しない"
        : "no machine threshold on elapsed days, no auto-release";
    assert.ok(c.includes(contractPhrase), `${lang}/${agent} CONTRACT（既存の禁止の残存）: ${contractPhrase}`);
  }
});

test("CONTRACT が起草宣言の削除の契機を定める（packets 工程の完了）", () => {
  for (const [lang, agent] of variants) {
    const c = contract(lang, agent);
    const phrase =
      lang === "ja"
        ? "packets 工程で packet を起こしたとき"
        : "when the packets step has created a packet";
    assert.ok(c.includes(phrase), `${lang}/${agent} CONTRACT: ${phrase}`);
  }
});

test("CONTRACT の助言性（止めない・ロックなし）が改定後も残る", () => {
  for (const [lang, agent] of variants) {
    const c = contract(lang, agent);
    const phrases =
      lang === "ja"
        ? ["警告のみ・停止/拒否しない", "ロック・排他・自動割当・状態機械を持たない"]
        : ["warning only; never stops or refuses", "no lock, mutual exclusion, auto-assignment, or state machine"];
    for (const p of phrases) {
      assert.ok(c.includes(p), `${lang}/${agent} CONTRACT（助言性の保持）: ${p}`);
    }
  }
});

test("やめた起草は既存の放置観測に委ねる（新しい掃除機構を作らない）", () => {
  for (const [lang, agent] of variants) {
    const s = skill(lang, agent, "intent-status");
    // 起草の宣言（packet_id が空・issue_dir を鍵）も放置観測の対象に含む
    const phrase = lang === "ja" ? "起草中の宣言" : "drafting claim";
    assert.ok(s.includes(phrase), `${lang}/${agent} intent-status: ${phrase}`);
    // 掃除機構（自動削除・期限・自動アーカイブ）を新設していない
    const forbidden =
      lang === "ja"
        ? ["宣言を自動削除する", "期限切れの宣言を削除"]
        : ["automatically delete the claim", "delete expired claims"];
    for (const f of forbidden) {
      assert.ok(!s.includes(f), `${lang}/${agent} intent-status: 掃除機構を新設してはいけない（${f}）`);
    }
  }
});

test("作成側（discover の起草宣言の作成）は変更されていない", () => {
  for (const [lang, agent] of variants) {
    const s = skill(lang, agent, "intent-discover");
    const phrases =
      lang === "ja"
        ? ["phase: drafting", "作るのは自動・消すのは人手"]
        : ["phase: drafting", "Creation is automatic; deletion is manual"];
    for (const p of phrases) {
      assert.ok(s.includes(p), `${lang}/${agent} intent-discover（作成側は不可侵）: ${p}`);
    }
  }
});
