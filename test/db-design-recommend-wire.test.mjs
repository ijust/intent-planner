// intent-db-design-recommend-wire のおすすめ結線テスト（pkt④・node:test 標準・依存ゼロ）。
//
// 背景: intent-status / intent-packets は agent 向け指示文書（rule）であり実行体ではない。
//   ゆえに「DB 設計おすすめの手がかり・報告専用で first-match を奪わない・自動起動しない・
//   対象外で promote しない・read-only」を rule がそれぞれ明文化していることをテキスト検査で固定する
//   （db-design-seam.test.mjs と同型の手法）。検査は4系統すべてに掛ける。
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

function decisionTable(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-status", "rules", "decision-table.md");
}
function packetFormat(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-packets", "rules", "packet-format.md");
}

// ---- 1. status(decision-table) に DB おすすめの手がかりがある（4系統） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の decision-table に DB 設計おすすめ（/intent-db-design）の手がかりがある`, () => {
      const c = fs.readFileSync(decisionTable(lang, agent), "utf8");
      assert.ok(c.includes("intent-db-design"), `${lang}/${agent}: /intent-db-design のおすすめに言及`);
      // 永続データモデルの責務判定の手がかり（テーブル/スキーマ/永続等）。
      const lower = c.toLowerCase();
      assert.ok(
        (c.includes("永続データモデル") && c.includes("スキーマ")) ||
          (lower.includes("persistent data model") && lower.includes("schema")),
        `${lang}/${agent}: 永続データモデルの責務判定の手がかりがある`,
      );
    });
  }
}

// ---- 2. 報告専用で first-match（次の一手1つ）を奪わない ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の DB おすすめは報告専用で first-match を奪わない（既存挙動を壊さない）`, () => {
      const c = fs.readFileSync(decisionTable(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        c.includes("報告専用") || /report-only/i.test(c),
        `${lang}/${agent}: 報告専用と明記`,
      );
      assert.ok(
        c.includes("first-match") && (c.includes("奪わない") || /does not steal|do not steal/i.test(c)),
        `${lang}/${agent}: first-match（次の一手1つ）を奪わない`,
      );
      // どの row も発火させない。
      assert.ok(
        /row も発火させ|fires none of the .*rows/i.test(c),
        `${lang}/${agent}: 決定表のどの row も発火させない`,
      );
    });
  }
}

// ---- 3. 自動起動しない・状態機械/新コマンドを増やさない（A3） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の DB おすすめは自動起動しない・状態機械/新コマンドを増やさない（A3）`, () => {
      const c = fs.readFileSync(decisionTable(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(c.includes("A3"), `${lang}/${agent}: A3（read-only 案内・状態機械を持たない）を参照`);
      assert.ok(
        c.includes("自動起動しない") || /never auto-launch|does not auto-launch|do not auto-launch/i.test(c),
        `${lang}/${agent}: /intent-db-design を自動起動しない`,
      );
      assert.ok(
        c.includes("手動") || /manual/i.test(c),
        `${lang}/${agent}: 発動は人間手動のまま`,
      );
    });
  }
}

// ---- 4. 対象外で promote しない（揮発のみ・フロント専任） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の DB おすすめは対象外（揮発のみ・フロント専任）で promote しない`, () => {
      const c = fs.readFileSync(decisionTable(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        c.includes("対象外") || /out of scope/i.test(c),
        `${lang}/${agent}: 対象外（promote しない）の基準がある`,
      );
      assert.ok(
        c.includes("揮発") || c.includes("フロント専任") || /volatile|front-end-only/i.test(c),
        `${lang}/${agent}: 揮発のみ・フロント専任を対象外に挙げる`,
      );
      // 機械スコアリングに寄せない（INV2・テキスト照合の手がかり）。
      assert.ok(
        c.includes("INV2") && (c.includes("機械スコアリング") || /mechanical score/i.test(c)),
        `${lang}/${agent}: 機械スコアリングに寄せない（INV2・テキスト照合の手がかり）`,
      );
    });
  }
}

// ---- 5. packets(packet-format) に補助注記があり status を主・packets を補とする ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の packet-format に DB おすすめの補助注記があり status 主/packets 補`, () => {
      const c = fs.readFileSync(packetFormat(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(c.includes("intent-db-design"), `${lang}/${agent}: /intent-db-design の補助注記に言及`);
      // status を主・packets を補とする分業。
      assert.ok(
        (c.includes("status") && (c.includes("補") || c.includes("主"))) ||
          /status .*primary|packets .*auxiliary/i.test(c),
        `${lang}/${agent}: status 主・packets 補の分業に言及`,
      );
      // 自動起動しない（補助注記もテキストを添えるだけ）。
      assert.ok(
        c.includes("自動起動しない") || c.includes("自動実行しない") || /does not auto-launch|does not auto-run/i.test(c),
        `${lang}/${agent}: 補助注記も /intent-db-design を自動実行しない`,
      );
    });
  }
}
