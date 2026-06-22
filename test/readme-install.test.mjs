// README 簡易インストールの固定検査（INV27 / gemini-cli-support Req 6.3, 6.4, 6.5）。
//
// 狙い: README から簡易インストールが落ちる・対応 agent の列挙が漏れる回帰を機械検出する。
//   readme-audience-restructure のような README 全面改修で install 節が静かに消えるのを防ぐ。
//
// 検査述語（意味解釈に寄せない素朴な存在検査・INV2/A1）:
//   1. 安定見出しアンカー: 簡易インストール節の見出し（ja `## インストール` を含む見出し /
//      en `## Install`）が README 本文に存在する。
//   2. 3 agent 名の存在: claude / codex / gemini の3つがすべて README 本文に出現する。
//
// discriminative: gemini を抜いた / 見出しアンカーを消した README で fail することを別途確認する
//   （検査が緩い＝欠落を見逃す誤実装を落とせる）。

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

// 対象 README とその install 見出しアンカー（現 README の見出し文字列で固定）。
const README_SPEC = [
  { rel: "README.md", anchor: "### インストール" },
  { rel: "README.en.md", anchor: "### Install" },
];

// 対応 agent 名（AGENT_REGISTRY のキー集合と対応・列挙漏れを防ぐ）。
const AGENTS = ["claude", "codex", "gemini"];

function read(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

// install アンカーの存在を素朴に判定する純関数（行頭の見出しを完全一致で探す）。
function hasInstallAnchor(body, anchor) {
  return body.split(/\r?\n/).some((line) => line.trim() === anchor);
}

// 全 agent 名が本文に出現するかを判定する純関数（大文字小文字を無視＝"Claude Code" も拾う）。
function hasAgent(body, agent) {
  return body.toLowerCase().includes(agent);
}
function hasAllAgents(body) {
  return AGENTS.every((a) => hasAgent(body, a));
}

for (const { rel, anchor } of README_SPEC) {
  // 6.3/6.1: 簡易インストール見出しアンカーが存在する。
  test(`README install: ${rel} に簡易インストール見出し「${anchor}」がある (6.1, 6.3)`, () => {
    const body = read(rel);
    assert.ok(
      hasInstallAnchor(body, anchor),
      `${rel} に install 見出しアンカー「${anchor}」が無い（README 改修で install 節が落ちた疑い）`,
    );
  });

  // 6.1: 対応 agent（claude/codex/gemini）がすべて列挙される。
  test(`README install: ${rel} が claude/codex/gemini を列挙する (6.1)`, () => {
    const body = read(rel);
    for (const agent of AGENTS) {
      assert.ok(
        hasAgent(body, agent),
        `${rel} に対応 agent 名「${agent}」が無い（列挙漏れ）`,
      );
    }
  });
}

// 6.4/6.5: discriminative — 偽陽性なし（現 README で pass）＋偽陰性なし（欠落で fail）。
test("README install: 検査は偽陽性なし・偽陰性なし（discriminative・6.4, 6.5）", () => {
  for (const { rel, anchor } of README_SPEC) {
    const body = read(rel);
    // 偽陽性なし: 現 README は両条件を満たす。
    assert.ok(hasInstallAnchor(body, anchor), `現 ${rel} は install アンカーを持つ`);
    assert.ok(hasAllAgents(body), `現 ${rel} は3 agent を列挙する`);

    // 偽陰性なし: gemini を抜いた本文では agent 検査が fail する（大文字小文字無視で除去）。
    const withoutGemini = body.replace(/gemini/gi, "XXXX");
    assert.ok(
      !hasAllAgents(withoutGemini),
      `${rel}: gemini を抜くと agent 検査が fail する（欠落を落とせる）`,
    );

    // 偽陰性なし: 見出しアンカーを消した本文では anchor 検査が fail する。
    const withoutAnchor = body.split(/\r?\n/).filter((l) => l.trim() !== anchor).join("\n");
    assert.ok(
      !hasInstallAnchor(withoutAnchor, anchor),
      `${rel}: 見出しアンカーを消すと anchor 検査が fail する（欠落を落とせる）`,
    );
  }
});
