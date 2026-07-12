// pkt-20260712-draft-phase-claim-h0wx の判別テスト。
// 起草フェーズの割当宣言（discover が作成のみ自動化）と、読まれる契機（first-packet）を4系統で固定する。
// 誤実装を落とす: 削除まで自動化した／gate 化して止めた／後方互換を落とした／片系統だけ直した、のいずれでも赤くなる。
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
const skill = (lang, agent, name) =>
  read("templates", lang, agent, "skills", name, "SKILL.md");
const contract = (lang, agent) => read("templates", lang, agent, "skills", "CONTRACT.md");
const firstPacket = (lang, agent) =>
  read("templates", lang, agent, "skills", "intent-packets", "rules", "first-packet.md");

test("discover が起草の割当宣言を作る手順を4系統で持つ（作成のみ自動）", () => {
  for (const [lang, agent] of variants) {
    const s = skill(lang, agent, "intent-discover");
    const phrases =
      lang === "ja"
        ? ["phase: drafting", "issue_dir", ".intent/assignments/discovery-", "作るのは自動・消すのは人手"]
        : ["phase: drafting", "issue_dir", ".intent/assignments/discovery-", "Creation is automatic; deletion is manual"];
    for (const p of phrases) {
      assert.ok(s.includes(p), `${lang}/${agent} discover: ${p}`);
    }
  }
});

test("起草の宣言は packet_id を捏造しない（起草時点で packet は未存在）", () => {
  for (const [lang, agent] of variants) {
    const s = skill(lang, agent, "intent-discover");
    const phrase = lang === "ja" ? "架空の ID を捏造しない" : "never fabricate an ID";
    assert.ok(s.includes(phrase), `${lang}/${agent}: ${phrase}`);
  }
});

test("CONTRACT は「作成のみ自動・削除は人手」を定め、後方互換を明記する", () => {
  for (const [lang, agent] of variants) {
    const c = contract(lang, agent);
    const phrases =
      lang === "ja"
        ? ["phase: drafting", "「削除」は自動化しない", "`phase` を持たない既存の宣言は `implementing` として読む"]
        : ["phase: drafting", "Deletion is never automated", "an existing claim with no `phase` is read as `implementing`"];
    for (const p of phrases) {
      assert.ok(c.includes(p), `${lang}/${agent} CONTRACT: ${p}`);
    }
  }
});

test("CONTRACT の助言性（止めない・機械閾値で自動解放しない・ロックなし）が改定後も残る", () => {
  for (const [lang, agent] of variants) {
    const c = contract(lang, agent);
    const phrases =
      lang === "ja"
        ? ["警告のみ・停止/拒否しない", "機械閾値で自動判定・自動解放しない", "ロック・排他・自動割当・状態機械を持たない"]
        : ["warning only; never stops or refuses", "no machine threshold on elapsed days, no auto-release", "no lock, mutual exclusion, auto-assignment, or state machine"];
    for (const p of phrases) {
      assert.ok(c.includes(p), `${lang}/${agent} CONTRACT（助言性の保持）: ${p}`);
    }
  }
});

test("first-packet が割当宣言を読み、自セッションには警告せず、止めない", () => {
  for (const [lang, agent] of variants) {
    const f = firstPacket(lang, agent);
    const phrases =
      lang === "ja"
        ? [".intent/assignments/", "自セッションの宣言は自分に対して示さない", "止めない・拒否しない", "phase: drafting"]
        : [".intent/assignments/", "Never show a session its own claim", "Never stop, refuse, or machine-rank", "drafting"];
    for (const p of phrases) {
      assert.ok(f.includes(p), `${lang}/${agent} first-packet: ${p}`);
    }
  }
});

test("first-packet の宣言読みは工程計画の有無に関わらず発火する（宣言ゼロなら従来動作）", () => {
  for (const [lang, agent] of variants) {
    const f = firstPacket(lang, agent);
    const phrase =
      lang === "ja"
        ? "不在・空なら何もせず従来どおり"
        : "if absent or empty, do nothing and behave as before";
    assert.ok(f.includes(phrase), `${lang}/${agent}: ${phrase}`);
  }
});
