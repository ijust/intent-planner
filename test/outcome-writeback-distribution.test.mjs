// 成果を書き戻す機能の配布面と公開文書の同期契約。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relative) {
  const absolute = path.join(ROOT, relative);
  assert.ok(fs.existsSync(absolute), `ファイルが実在する: ${relative}`);
  return fs.readFileSync(absolute, "utf8");
}

const RULES = [
  "intent-discover/rules/designer-questions.md",
  "intent-writeback/rules/writeback-protocol.md",
  "intent-validate/rules/validate-checks.md",
  "intent-overview/rules/aggregate-sources.md",
  "intent-overview/rules/progress-readout.md",
];

const SKILLS = [
  "intent-writeback/SKILL.md",
  "intent-validate/SKILL.md",
  "intent-status/SKILL.md",
  "intent-overview/SKILL.md",
];

test("配布契約: 同じ言語のrulesはClaude/Codexでバイト一致する", () => {
  for (const lang of ["ja", "en"]) {
    for (const relative of RULES) {
      assert.equal(
        read(`templates/${lang}/claude/skills/${relative}`),
        read(`templates/${lang}/codex/skills/${relative}`),
        `${lang}/${relative} がエージェント間で一致する`,
      );
    }
  }
});

test("配布契約: 4系統が記録・承認・警告・結果表示の同じ境界を案内する", () => {
  const expectations = {
    ja: [
      /成果についての学び/,
      /人の承認/,
      /outcome-provenance-missing/,
      /リリース後の結果待ち/,
    ],
    en: [
      /outcome learning/i,
      /human approval/i,
      /outcome-provenance-missing/,
      /awaiting post-release results/i,
    ],
  };

  for (const lang of ["ja", "en"]) {
    for (const agent of ["claude", "codex"]) {
      const body = SKILLS.map((relative) =>
        read(`templates/${lang}/${agent}/skills/${relative}`)
      ).join("\n");
      for (const expected of expectations[lang]) {
        assert.match(body, expected, `${lang}/${agent} に ${expected} の案内がある`);
      }
    }
  }
});

test("dogfood: 公式テンプレート由来の日本語skillがClaude/Codex配置物と一致する", () => {
  for (const agent of ["claude", "codex"]) {
    const destination = agent === "claude" ? ".claude/skills" : ".agents/skills";
    for (const relative of [...RULES, ...SKILLS]) {
      assert.equal(
        read(`${destination}/${relative}`),
        read(`templates/ja/${agent}/skills/${relative}`),
        `${destination}/${relative} がテンプレートと一致する`,
      );
    }
  }
});

test("公開文書: READMEは入口、guideは手順、theoryは考え方を日英で説明する", () => {
  const readmeJa = read("README.md");
  const readmeEn = read("README.en.md");
  assert.match(readmeJa, /成果の物さし.*docs\/guide\.md/s);
  assert.match(readmeJa, /工程の完了.*利用者成果.*別/s);
  assert.match(readmeEn, /Outcome measure.*docs\/guide\.en\.md/is);
  assert.match(readmeEn, /process completion.*user outcome.*separate/is);

  const guideJa = read("docs/guide.md");
  const guideEn = read("docs/guide.en.md");
  assert.match(guideJa, /^### リリース後の成果を記録する$/m);
  assert.match(guideJa, /価値が出た.*価値が出なかった.*まだ分からない/s);
  assert.match(guideJa, /誰が計測したか.*いつ計測したか.*どこで計測したか/s);
  assert.match(guideJa, /outcome-provenance-missing.*出所不足を知らせる警告/s);
  assert.match(guideJa, /外部.*自動取得.*自動判定.*行わない/s);
  assert.match(guideEn, /^### Record post-release outcomes$/m);
  assert.match(guideEn, /value delivered.*value not delivered.*not known yet/is);
  assert.match(guideEn, /Who measured.*When measured.*Where measured/is);
  assert.match(guideEn, /outcome-provenance-missing.*warning for missing provenance/is);
  assert.match(guideEn, /does not.*fetch.*external.*automatically judge/is);

  const theoryJa = read("docs/theory.md");
  const theoryEn = read("docs/theory.en.md");
  assert.match(theoryJa, /工程の完了.*利用者成果.*別/s);
  assert.match(theoryJa, /成果についての学び.*delta.*人の承認.*L1/s);
  assert.match(theoryEn, /process completion.*user outcome.*separate/is);
  assert.match(theoryEn, /outcome learning.*delta.*human approval.*L1/is);
});
