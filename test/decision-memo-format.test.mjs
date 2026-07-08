// decision-memo format (意思決定メモ・迷いごと比較シート) 専用テスト (node:test 標準・依存ゼロ)。
// packet: pkt-20260708-decision-memo-format-xnf7 (C48 / A59 / DR114 / INV74)。
//
// 範囲: intent-to-spec へ付加した decision-memo format の規範文の判別オラクルを
//   READ-ONLY で検証する。存在・数・claude/codex byte 一致・ja/en 構造一致は
//   nl-spec-export.test.mjs (RULE_NAMES に format-decision-memo を追加済み) が担うため、
//   本ファイルは「規範が落ちた/書き換わったら赤くなる」内容アンカーに絞る:
//     群A: SKILL.md Step 3 が decision-memo の委譲行を持つ (4系統)。
//     群B: format-decision-memo.md が packet の判別オラクル対象の規範文を持つ
//          (採否先行 / 素材は既存 intent 成果物に閉じる=対話取材なし / 評価・採否を発明しない /
//           記録が無い欄は「記録なし」 / 不採用の理由を省かない / 素材不在は生成しない fail-fast /
//           出力先 decision-memo.md)。
//     群C: rule が agent 中立 (AskUserQuestion を含まない) — claude↔codex byte 共有の前提。
//     群D: 既存 format rules に decision-memo が混入していない (既存 byte 不変の支え。
//          既存 format を書き換えて辻褄を合わせる実装を落とす)。
//     群E: dogfood (.claude/skills) の rule が templates ja/claude と byte 同一 (反映漏れ防止)。
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
const SKILL = "intent-to-spec";
const RULE = "format-decision-memo";

function skillDir(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", SKILL);
}
function readRule(lang, agent, rule = RULE) {
  return fs.readFileSync(path.join(skillDir(lang, agent), "rules", `${rule}.md`), "utf8");
}
function readSkill(lang, agent) {
  return fs.readFileSync(path.join(skillDir(lang, agent), "SKILL.md"), "utf8");
}

// ---- 群A: SKILL.md Step 3 の委譲行 (値域に decision-memo が現れ、委譲先が実在 rule を指す) ----

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群A: ${lang}/${agent} SKILL.md が decision-memo の委譲行を持つ`, () => {
      const content = readSkill(lang, agent);
      assert.ok(
        content.includes("format-decision-memo.md"),
        `${lang}/${agent}: 委譲先 format-decision-memo.md を指す`,
      );
      // Output Description にも decision-memo の構成が現れる (委譲行だけの片付けを落とす)。
      const token = lang === "ja" ? "意思決定メモ" : "Decision memo";
      assert.ok(content.includes(token), `${lang}/${agent}: Output Description に ${token} がある`);
    });
  }
}

// ---- 群B: format-decision-memo.md の規範文アンカー (packet Validation の判別オラクル) ----
// アンカーは言語ごとに定義する。規範文が落ちる・言い換えで骨抜きになる実装を落とす。

const RULE_ANCHORS = {
  ja: [
    // 名トークンと出力先 (呼び出しの一意性)
    "`decision-memo`",
    ".intent/nl-spec/decision-memo.md",
    // 素材は既存 intent 成果物に閉じる (対話取材を足さない = DR114 の核)
    "対話取材を足さない",
    // 評価・採否を発明しない (Anti 369 の判別)
    "評価・採否を発明しない",
    // 記録が無い欄の明示 (セル埋め補完の禁止)
    "記録なし",
    // 不採用の理由を同じ紙面に残す (蒸し返し防止 = L1-a 計測基準の核)
    "不採用の選択肢と理由",
    // 採否先行 (bluf-message 採用)
    "採否（結論）を最初",
    // 素材不在の fail-fast
    "生成しない",
    // 見直し条件 (Revisit when の写像先)
    "見直し条件",
  ],
  en: [
    "`decision-memo`",
    ".intent/nl-spec/decision-memo.md",
    "no interviewing",
    "Never invent evaluations or verdicts",
    "no record",
    "rejected options and their reasons",
    "verdict first",
    "fail fast",
    "Revisit conditions",
  ],
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群B: ${lang}/${agent} format-decision-memo.md が規範文アンカーを持つ`, () => {
      const content = readRule(lang, agent);
      for (const anchor of RULE_ANCHORS[lang]) {
        assert.ok(
          content.includes(anchor),
          `${lang}/${agent}: format-decision-memo.md にアンカー「${anchor}」がある`,
        );
      }
    });
  }
}

// ---- 群C: rule の agent 中立性 (claude↔codex byte 共有の前提) ----

for (const lang of LANGS) {
  test(`群C: ${lang} format-decision-memo.md は agent 固有語を含まず claude↔codex byte 同一`, () => {
    for (const agent of AGENTS) {
      const content = readRule(lang, agent);
      assert.ok(
        !content.includes("AskUserQuestion"),
        `${lang}/${agent}: rule に agent 固有語 AskUserQuestion を含まない`,
      );
    }
    const claudeBuf = fs.readFileSync(path.join(skillDir(lang, "claude"), "rules", `${RULE}.md`));
    const codexBuf = fs.readFileSync(path.join(skillDir(lang, "codex"), "rules", `${RULE}.md`));
    assert.ok(claudeBuf.equals(codexBuf), `${lang}: claude↔codex で byte 同一`);
  });
}

// ---- 群D: 既存 format rules に decision-memo が混入していない (既存 byte 不変の支え) ----
// 既存 format を書き換えて新 format の辻褄を合わせる実装 (Anti-direction 373 系) を落とす。

const EXISTING_FORMAT_RULES = [
  "format-upstream",
  "format-integrated",
  "format-nonprogram",
  "format-stakeholder-onepager",
  "format-status-report",
];

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群D: ${lang}/${agent} 既存 format rules に decision-memo が混入していない`, () => {
      for (const rule of EXISTING_FORMAT_RULES) {
        const content = readRule(lang, agent, rule);
        assert.ok(
          !content.includes("decision-memo"),
          `${lang}/${agent}: ${rule}.md に decision-memo への言及が無い (既存 rule 非接触)`,
        );
      }
    });
  }
}

// ---- 群E: dogfood の rule が templates ja/claude と byte 同一 (反映漏れ防止) ----
// 直近の drift-log (dogfood-parity-desync) の再発防止: templates を直して dogfood を忘れる実装を落とす。

test("群E: dogfood (.claude/skills) の format-decision-memo.md が templates ja/claude と byte 同一", () => {
  const dogfood = path.join(REPO_ROOT, ".claude", "skills", SKILL, "rules", `${RULE}.md`);
  assert.ok(fs.existsSync(dogfood), "dogfood に format-decision-memo.md が実在する");
  const dogfoodBuf = fs.readFileSync(dogfood);
  const templateBuf = fs.readFileSync(
    path.join(skillDir("ja", "claude"), "rules", `${RULE}.md`),
  );
  assert.ok(dogfoodBuf.equals(templateBuf), "dogfood と templates/ja/claude が byte 同一");
});
