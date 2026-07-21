// export-speckit (intent-export-speckit / 第3の export 出口) の受け入れ検証。
// node:test 標準・依存ゼロ (INV2/INV3)。
//
// 範囲分担 (重複回避):
//   - claude↔codex の rules byte 等価 (map-speckit / drift-export-check / export-questions) は
//     agent-rules-parity が両起点の和集合で担うため、本ファイルでは再検査しない。
//   - ja↔en のファイル集合 1:1 は structure-pack が担う。
//   - codex SKILL の禁止 frontmatter (allowed-tools/argument-hint/disable-model-invocation 不持) は
//     agents.test が glob 自動で担う。
//   - en SKILL の frontmatter 必須検査は structure-pack の EN_SKILL_NAMES 追記が担う。
//
// 本ファイルは speckit 出口固有の構造・契約に集中する:
//   1. 新スキル4系統 × 4ファイルと scaffold 4枚の存在
//   2. scaffold spec-hints の必須見出し (Parent Intent 参照 / Invariant 参照 / constitution 一行案内)
//      = 判別オラクル (規約部を削ると赤化する)
//   3. map-speckit の出力レイアウト literal (per-slug パス .intent/speckit/<スラッグ>/ ・2枚構成)
//   4. 4系統 SKILL/rules に他射影スキルのコマンド名が現れないこと (名指し禁止)
//   5. SKILL に speckit 契約 (/speckit.specify ・ .specify/ 目印 ・ .intent/speckit/ 出力先) が有ること
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
const SKILL = "intent-export-speckit";
const RULE_FILES = ["map-speckit.md", "drift-export-check.md", "export-questions.md"];

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

function skillFile(lang, agent, rel) {
  return path.join(TEMPLATES, lang, agent, "skills", SKILL, rel);
}

function scaffoldFile(lang, rel) {
  return path.join(TEMPLATES, lang, "intent", "speckit", rel);
}

// 他射影スキルのコマンド名 (自スキル /intent-export-speckit は許容・これは対象外)。
const FOREIGN_COMMANDS = [
  "/opsx:propose",
  "/kiro-spec-init",
  "/intent-export-cc-sdd",
  "/intent-export-openspec",
  "/intent-to-spec",
];

test("1. 新スキル4系統 × 4ファイルが存在する", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      assert.ok(fs.existsSync(skillFile(lang, agent, "SKILL.md")), `${lang}/${agent} SKILL.md`);
      for (const rf of RULE_FILES) {
        assert.ok(
          fs.existsSync(skillFile(lang, agent, path.join("rules", rf))),
          `${lang}/${agent} rules/${rf}`,
        );
      }
    }
  }
});

test("1b. scaffold 4枚 (ja/en × specify-input・spec-hints) が存在する", () => {
  for (const lang of LANGS) {
    assert.ok(fs.existsSync(scaffoldFile(lang, "specify-input.md")), `${lang} specify-input.md`);
    assert.ok(fs.existsSync(scaffoldFile(lang, "spec-hints.md")), `${lang} spec-hints.md`);
  }
});

test("2. scaffold spec-hints が必須要素を持つ (判別オラクル)", () => {
  // ja: Parent Intent 参照 / Invariant 参照 / constitution 一行案内。
  const ja = read(scaffoldFile("ja", "spec-hints.md"));
  assert.match(ja, /## Parent Intent 参照/, "ja spec-hints: Parent Intent 参照 見出し");
  assert.match(ja, /## Invariant 参照/, "ja spec-hints: Invariant 参照 見出し");
  assert.match(
    ja,
    /constitution 反映は利用者判断/,
    "ja spec-hints: constitution 反映は利用者判断 の一行案内",
  );
  assert.match(ja, /constitution\.md へ書き込まない/, "ja spec-hints: 非書き込みの明記");
  // en: 対応する必須要素。
  const en = read(scaffoldFile("en", "spec-hints.md"));
  assert.match(en, /## Parent Intent Reference/, "en spec-hints: Parent Intent Reference");
  assert.match(en, /## Invariant Reference/, "en spec-hints: Invariant Reference");
  assert.match(
    en,
    /Constitution reflection is the user's call/,
    "en spec-hints: constitution reflection note",
  );
});

test("3. map-speckit が出力レイアウト literal を持つ (4系統)", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const body = read(skillFile(lang, agent, path.join("rules", "map-speckit.md")));
      // per-slug パス (2枚構成)。
      assert.match(
        body,
        /\.intent\/speckit\/<packet(スラッグ|-slug)>\/specify-input\.md/,
        `${lang}/${agent} map-speckit: specify-input per-slug パス`,
      );
      assert.match(
        body,
        /\.intent\/speckit\/<packet(スラッグ|-slug)>\/spec-hints\.md/,
        `${lang}/${agent} map-speckit: spec-hints per-slug パス`,
      );
      // 入力範囲契約 (対象 packet 1つ + 共通選別結果。旧環境だけ packet + Compass)。
      assert.match(
        body,
        /(対象 packet 1つ|the one target packet)/,
        `${lang}/${agent} map-speckit: 入力範囲契約`,
      );
      assert.match(
        body,
        /(共通選別結果|common selection result)/i,
        `${lang}/${agent} map-speckit: 共通選別結果を使う`,
      );
      assert.match(body, /`selected`/, `${lang}/${agent} map-speckit: selectedを配置する`);
      assert.match(
        body,
        /`selection_status: legacy-not-applied`/,
        `${lang}/${agent} map-speckit: 旧環境を区別する`,
      );
      assert.doesNotMatch(
        body,
        /^- (?:読むのは|Read only)[^\n]+intent-compass/m,
        `${lang}/${agent} map-speckit: Compassを無条件入力にしない`,
      );
    }
  }
});

test("4. 4系統 SKILL/rules に他射影スキルのコマンド名が現れない", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const files = ["SKILL.md", ...RULE_FILES.map((r) => path.join("rules", r))];
      for (const rel of files) {
        const body = read(skillFile(lang, agent, rel));
        for (const cmd of FOREIGN_COMMANDS) {
          assert.ok(
            !body.includes(cmd),
            `${lang}/${agent} ${rel} に他出口コマンド名 ${cmd} が現れない`,
          );
        }
      }
    }
  }
});

test("5. SKILL が Spec Kit 契約を持つ (4系統)", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const body = read(skillFile(lang, agent, "SKILL.md"));
      // 受け渡し先。
      assert.match(body, /\/speckit\.specify/, `${lang}/${agent} SKILL: /speckit.specify`);
      // 導入目印 (repo 直下 .specify/) と出力先 (.intent/speckit/) の区別。
      assert.match(body, /`\.specify\/`/, `${lang}/${agent} SKILL: .specify/ 目印`);
      assert.match(body, /\.intent\/speckit\//, `${lang}/${agent} SKILL: .intent/speckit/ 出力先`);
      // 目印と出力先が別物であることの明記。
      assert.match(
        body,
        /(別物|distinct from)/,
        `${lang}/${agent} SKILL: 目印と出力先の区別の明記`,
      );
    }
  }
});
