// intent-db-design-seam の安全不変条件テスト (task 4.4・node:test 標準・依存ゼロ)。
//
// 背景: intent-db-design は射影スキル（agent 向け指示文書）であり、実行体ではない。
//   ゆえに read-only・出力先限定・衝突非破壊・永続ストア/外部接続なしの不変条件は、
//   SKILL.md / rules がそれらを明文化していることをテキスト検査で固定する
//   （nl-spec-export.test.mjs の群6・群9 と同型の手法）。検査は4系統すべてに掛ける。
//
// 検証する4つの安全性 (R3.2 / R3.3 / R3.4 / R6.5):
//   1. 書込み境界が `.intent/db-design/` 限定で、canonical 正本・既存スキーマ・export 下書きへ書かない。
//   2. 出力を `.intent/cc-sdd/`・`.intent/openspec/`（export 物）に書かない（叩き台 ≠ 要件）。
//   3. スラッグ衝突時は連番別名（`-2` 起点）で別ディレクトリにし、黙って上書きしない。
//   4. 実行時に永続ストア・外部サービス接続を持たない。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"]; // gemini は codex ツリー共有（専用ファイル無し）。

function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-db-design", "SKILL.md");
}
function readSkill(lang, agent) {
  return fs.readFileSync(skillPath(lang, agent), "utf8");
}

// ---- 1. 書込み境界: .intent/db-design/ 限定で canonical/既存スキーマ/export へ書かない ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4.4-1: ${lang}/${agent} の書込み先は .intent/db-design/ 限定・read-only 規律を明示 (R3.1/R3.2)`, () => {
      const c = readSkill(lang, agent);
      assert.ok(
        c.includes(".intent/db-design/"),
        `${lang}/${agent}: 書込み先 .intent/db-design/ を明示する`,
      );
      assert.ok(
        c.includes("read-only") || c.includes("read only") || c.includes("読み取りのみ"),
        `${lang}/${agent}: 射影元の read-only 規律を明示する`,
      );
      // canonical 正本（intent-tree / intent-compass）への Write 導線を持たない（素材としてのみ言及）。
      const writesCanonical =
        /Write[^\n]*intent-tree\.md/.test(c) ||
        /Write[^\n]*intent-compass\.md/.test(c) ||
        /intent-tree\.md[^\n]*(へ|に)[^\n]*書/.test(c) ||
        /intent-compass\.md[^\n]*(へ|に)[^\n]*書/.test(c);
      assert.ok(
        !writesCanonical,
        `${lang}/${agent}: canonical (intent-tree/compass) への書込み導線を持たない`,
      );
    });
  }
}

// ---- 2. export 物に混ぜない: cc-sdd / openspec へ書かない（叩き台 ≠ 要件） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4.4-2: ${lang}/${agent} は出力を .intent/cc-sdd/・.intent/openspec/ に書かない (R3.3)`, () => {
      const c = readSkill(lang, agent);
      // cc-sdd / openspec は「書込み先ではない（混ぜない）」否定文脈でのみ現れることを担保する。
      // どちらも言及はあるが、Write 対象としては現れない。
      assert.ok(
        c.includes(".intent/cc-sdd/") && c.includes(".intent/openspec/"),
        `${lang}/${agent}: cc-sdd/openspec が少なくとも1行に登場する（否定文脈であることは後続ループで検証）`,
      );
      // cc-sdd / openspec を含む行はすべて否定（書かない）文脈であること。
      // 1 行でも肯定の書込み導線として現れたら R3.3 違反（叩き台を要件に混ぜている）。
      // 英語の否定語は語境界で固定し（`not` が annotation/notable に誤マッチしないよう）、
      // 日本語の `ず` は先行文字を制限して `まず`（副詞）に誤マッチしないようにする。
      const negation =
        /\bnot\b|\bnever\b|don't|\bdo not\b|ない|まない|混ぜない|(?<![まずぐかこそとのにはもをり])ず(?![かに])/i;
      for (const line of c.split("\n")) {
        if (line.includes(".intent/cc-sdd/") || line.includes(".intent/openspec/")) {
          assert.ok(
            negation.test(line),
            `${lang}/${agent}: cc-sdd/openspec は否定（書かない）文脈でのみ現れる — 違反行: ${line.trim()}`,
          );
        }
      }
    });
  }
}

// ---- 3. スラッグ衝突: 連番別名（-2 起点）で黙って上書きしない ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4.4-3: ${lang}/${agent} はスラッグ衝突時に連番別名で別ディレクトリにし黙って上書きしない (R3.4)`, () => {
      const c = readSkill(lang, agent);
      // 衝突判定キー（source_packet が異なる packet を指す）と連番起点（-2）を明示する。
      assert.ok(c.includes("source_packet"), `${lang}/${agent}: 衝突判定キー source_packet を明示する`);
      assert.ok(c.includes("-2"), `${lang}/${agent}: 連番別名の起点 -2 を明示する`);
      // 「黙って上書きしない」旨（ja/en 双方の語）を明示する。
      assert.ok(
        c.includes("黙って上書き") || /overwrite[^\n]*silent|silent[^\n]*overwrite/i.test(c),
        `${lang}/${agent}: 黙って上書きしない旨を明示する`,
      );
    });
  }
}

// ---- 4. 永続ストア・外部接続なし（実行時に外部を叩かない・INV2） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4.4-4: ${lang}/${agent} は永続ストア・外部サービス接続を持たない (R6.5/INV2)`, () => {
      const c = readSkill(lang, agent);
      assert.ok(
        c.includes("永続ストア") || /persistent store/i.test(c),
        `${lang}/${agent}: 永続ストアを導入しない旨を明示する`,
      );
      assert.ok(
        /外部.*接続|外部サービス|external service|external connection/i.test(c),
        `${lang}/${agent}: 実行時に外部サービスへ接続しない旨を明示する`,
      );
    });
  }
}
