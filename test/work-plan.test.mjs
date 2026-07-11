// work-plan (packet-phase-priority / C61 / A66 / INV81 / DR138-141) の判別検証。
//
// 判別オラクル（誤った実装を落とす対比）:
//   (a) scaffold: plan.md に「工程計画 / Work plan」節がある（ja/en）
//   (b) 呼び名の自由: 見出しを固定語彙に矯正せず「自由記述・入れ子可」の注記がある（Anti 432）
//   (c) 同順位規約: 「同番号＝同順位」の規約が書かれている（DR138）
//   (d) 導出規則: first-packet.md に「上から順・skip・depends_on 常勝」の読み順が定義（DR139・4系統）
//   (e) 後方互換: 節が無ければ従来どおり、の明示（節不在で挙動不変＝INV81 オラクル）
//   (f) glossary: 「工程計画 / work plan」が登録され、工程フェーズ・state・milestones との区別を明記
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

const read = (p) => fs.readFileSync(p, "utf8");

// ---- (a)(b)(c) scaffold plan.md に工程計画節と規約がある（ja/en） ----
const PLAN_HEADING = { ja: /^## 工程計画/m, en: /^## Work plan/m };
const PLAN_FREEFORM = {
  ja: /自由(に|記述)/,
  en: /freely|in your own words/,
};
const PLAN_SAME_RANK = {
  ja: /同番号.*同順位|同順位/,
  en: /same number.*rank equally|rank equally/,
};

for (const lang of ["ja", "en"]) {
  test(`scaffold plan.md: ${lang} に工程計画節がある (C61・DR138)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "packets", "plan.md"));
    assert.match(content, PLAN_HEADING[lang], `${lang}: 工程計画節の見出しがある`);
  });

  test(`scaffold plan.md: ${lang} に「呼び名は自由記述」の注記がある (Anti 432・固定語彙に矯正しない)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "packets", "plan.md"));
    assert.match(content, PLAN_FREEFORM[lang], `${lang}: 自由記述の注記がある`);
  });

  test(`scaffold plan.md: ${lang} に「同番号＝同順位」の規約がある (DR138・並列を妨げない)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "packets", "plan.md"));
    assert.match(content, PLAN_SAME_RANK[lang], `${lang}: 同順位の規約がある`);
  });
}

// ---- (d)(e) first-packet.md に導出規則がある（4系統） ----
const SYSTEMS = [
  ["ja", "claude"],
  ["ja", "codex"],
  ["en", "claude"],
  ["en", "codex"],
];
const FP_DERIVATION = {
  ja: /上から順に読む/,
  en: /top to bottom/,
};
const FP_DEPENDS_WINS = {
  ja: /`depends_on`（技術的前提）が常に勝つ/,
  en: /`depends_on` \(the technical prerequisite\) always wins/,
};
const FP_BACKCOMPAT = {
  ja: /節が無い・空のときは、この手順を発火せず従来どおり/,
  en: /When the section is absent or empty, do not fire this step and behave as before/,
};

for (const [lang, agent] of SYSTEMS) {
  test(`first-packet.md: ${lang}/${agent} に工程計画の導出規則がある (DR139)`, () => {
    const p = path.join(TEMPLATES, lang, agent, "skills", "intent-packets", "rules", "first-packet.md");
    const content = read(p);
    assert.match(content, FP_DERIVATION[lang], `${lang}/${agent}: 上から順の読み順`);
    assert.match(content, FP_DEPENDS_WINS[lang], `${lang}/${agent}: depends_on 常勝`);
    assert.match(content, FP_BACKCOMPAT[lang], `${lang}/${agent}: 節不在で従来どおり（後方互換）`);
  });
}

// dogfood も同じ導出規則を持つ（templates 正本に追随している）。
test("first-packet.md: dogfood (.claude) に工程計画の導出規則がある (INV9)", () => {
  const p = path.join(REPO_ROOT, ".claude", "skills", "intent-packets", "rules", "first-packet.md");
  const content = read(p);
  assert.match(content, FP_DERIVATION.ja);
  assert.match(content, FP_DEPENDS_WINS.ja);
  assert.match(content, FP_BACKCOMPAT.ja);
});

// ---- (f) glossary に工程計画が登録され、既存の紛らわしい語との区別が明記されている ----
const GLOSSARY_TERM = { ja: /\|\s*工程計画\s*\|/, en: /\|\s*work plan\s*\|/ };

for (const lang of ["ja", "en"]) {
  test(`glossary: ${lang} に工程計画が登録され state/工程フェーズ と区別されている (DR138・語彙の関門)`, () => {
    const content = read(path.join(TEMPLATES, lang, "intent", "glossary.md"));
    assert.match(content, GLOSSARY_TERM[lang], `${lang}: 工程計画/work plan の行がある`);
    // 同じ行に state・工程フェーズ の2区別が現れる（DR138 が要求する区別）。
    // 旧・3区別のうち milestones は milestones-decommission（DR148）で撤去済みのため対象外。
    const line = content.split("\n").find((l) => GLOSSARY_TERM[lang].test(l)) || "";
    const phase = lang === "ja" ? /工程フェーズ/ : /process phases/;
    assert.ok(/state/.test(line) && phase.test(line),
      `${lang}: 工程計画の説明が state・工程フェーズ の2区別を含む`);
    // 撤去済みの milestones への宙吊り参照が残っていない（Anti 448）。
    assert.ok(!/milestone/i.test(line),
      `${lang}: 撤去済みの milestones への参照が残っていない`);
  });
}
