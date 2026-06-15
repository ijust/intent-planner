// decision-slots カタログの構造検証 (completeness-floor / task 6.1)。
// node:test 標準・依存ゼロ。
//
// 範囲 (R11.1, 11.2, 11.4 / design Testing Strategy「Unit/構造テスト」):
//   1. decision-slots.md が4ツリー (ja/en × claude/codex) すべてに存在する (R11.1, 11.2)。
//   2. 各 decision-slots.md が共通コア8 ID をすべて含む (research T1.1 の確定集合)。
//
// 重複回避: claude↔codex の byte 等価は agent-rules-parity.test.mjs が rules/*.md 全体で、
// ja↔en のファイル集合一致は structure-pack.test.mjs が既にカバーしている。よって本ファイルは
// それらが検査しない固有の関心「共通コア8 ID が各正本に実在する」に集中する。
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

// research T1.1 で確定した共通コアスロット ID の集合 (安定 kebab-case)。
// この8 ID は decision-slots.md (T1.2)・packets 播種・validate decision-slot-unsown が
// 単一参照する。ID の改名・欠落は床の崩壊なので構造テストで強制する。
const CORE_SLOT_IDS = [
  "decision-consistency",
  "decision-idempotency",
  "decision-error-semantics",
  "decision-authz",
  "decision-quality-priority",
  "decision-fit-criterion",
  "decision-exception-flow",
  "decision-downstream-trace",
];

function decisionSlotsPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-packets", "rules", "decision-slots.md");
}

// ---- R11.1, 11.2: decision-slots.md が4ツリーすべてに存在する ----

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`decision-slots: ${lang}/${agent} に decision-slots.md が存在する (R11.1, 11.2)`, () => {
      const p = decisionSlotsPath(lang, agent);
      assert.ok(fs.existsSync(p), `decision-slots.md が実在する: ${p}`);
    });
  }
}

// ---- R11.4: 各 decision-slots.md が共通コア8 ID をすべて含む (T1.1 確定集合) ----

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`decision-slots: ${lang}/${agent} の decision-slots.md が共通コア8 ID をすべて含む (R11.4, T1.1)`, () => {
      const p = decisionSlotsPath(lang, agent);
      assert.ok(fs.existsSync(p), `decision-slots.md が実在する: ${p}`);
      const content = fs.readFileSync(p, "utf8");
      const missing = CORE_SLOT_IDS.filter((id) => !content.includes(`\`${id}\``));
      assert.deepEqual(
        missing,
        [],
        `${lang}/${agent}: 共通コアスロット ID が decision-slots.md に欠落 (改名/削除): ${missing.join(", ")}`,
      );
    });
  }
}
