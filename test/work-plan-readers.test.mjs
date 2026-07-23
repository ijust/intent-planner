// work-plan readers (vdxd) と handoff nudge (lguu) の判別検証。
//
// vdxd 判別オラクル:
//   (a) overview roadmap-projection が工程計画のグループ束ねを持つ（ja3/en2・DR139 共有）
//   (b) status decision-table が候補列挙の並びに工程計画を反映する脚注を持つ（row 構造不変を明記）
//   (c) to-spec source-scope が「適切な体裁のときのみ」の任意反映を持つ（DR140-(5)）
//   (d) discover gore-lite が候補パケットの工程まとまりの任意記載を持つ（DR140-(6)）
//   (e) assignments README が並行選定の工程計画参照案内を持つ
//   (f) いずれも「節が無ければ従来どおり」の後方互換を明記（INV81）
// lguu 判別オラクル:
//   (g) intent-packets/intent-writeback SKILL に乗り換え促しがある（5系統）
//   (h) 促しは「切れ目 × 長さの自己感覚の AND」かつ会話ログ・トークンを読まない（INV82-(2)/Anti 433）
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");

// 系統（dogfood + 4テンプレ）。rules は claude/codex byte 等価なので dogfood+ja/claude+ja/codex(ja群)・en/claude+en/codex(en群)。
const JA_RULE_ROOTS = [".claude", "templates/ja/claude", "templates/ja/codex"];
const EN_RULE_ROOTS = ["templates/en/claude", "templates/en/codex"];

// ---- (a) overview roadmap-projection: 工程計画のグループ束ね ----
for (const r of JA_RULE_ROOTS) {
  test(`vdxd overview roadmap: ${r} が工程計画のグループ束ねを持つ (DR139/DR140)`, () => {
    const c = read(`${r}/skills/intent-overview/rules/roadmap-projection.md`);
    assert.match(c, /工程計画/, `${r}: 工程計画への言及`);
    assert.match(c, /DR139/, `${r}: 導出規則の共有 (DR139)`);
    assert.match(c, /無ければ従来どおり|節が無い/, `${r}: 後方互換 (節不在で従来どおり)`);
  });
}
for (const r of EN_RULE_ROOTS) {
  test(`vdxd overview roadmap: ${r} が work-plan group bundling を持つ`, () => {
    const c = read(`${r}/skills/intent-overview/rules/roadmap-projection.md`);
    assert.match(c, /Work plan|work-plan/, `${r}: work plan への言及`);
    assert.match(c, /DR139/);
    assert.match(c, /absent|behave as before/i, `${r}: 後方互換`);
  });
}

// ---- (b) status decision-table: 候補列挙の並びへの反映・row 構造不変 ----
for (const r of JA_RULE_ROOTS) {
  test(`vdxd status decision-table: ${r} が候補列挙へ工程計画を反映し row 構造不変を明記`, () => {
    const c = read(`${r}/skills/intent-status/rules/decision-table.md`);
    assert.match(c, /工程計画/, `${r}: 工程計画への言及`);
    assert.match(c, /row 構造・first-match.*変え|決定表の row 構造/, `${r}: row 構造不変の明記`);
  });
}
for (const r of EN_RULE_ROOTS) {
  test(`vdxd status decision-table: ${r} reflects work plan, keeps row structure`, () => {
    const c = read(`${r}/skills/intent-status/rules/decision-table.md`);
    assert.match(c, /Work plan|work plan/);
    assert.match(c, /row structure|changes nothing about the decision table/i);
  });
}

// ---- (c) to-spec source-scope: 適切な体裁のときのみの任意反映 ----
for (const r of JA_RULE_ROOTS) {
  test(`vdxd to-spec source-scope: ${r} が工程計画の任意反映（適切な体裁のみ）を持つ`, () => {
    const c = read(`${r}/skills/intent-to-spec/rules/source-scope.md`);
    assert.match(c, /工程計画/);
    assert.match(c, /適切な体裁|必須化しない/, `${r}: 任意・体裁限定`);
  });
}
for (const r of EN_RULE_ROOTS) {
  test(`vdxd to-spec source-scope: ${r} has optional work-plan reflection (fitting format only)`, () => {
    const c = read(`${r}/skills/intent-to-spec/rules/source-scope.md`);
    assert.match(c, /Work plan|work plan/);
    assert.match(c, /fitting format|not mandatory/i, `${r}: optional, format-limited`);
  });
}

// ---- (d) discover gore-lite: 候補パケットの工程まとまりの任意記載 ----
for (const r of JA_RULE_ROOTS) {
  test(`vdxd discover gore-lite: ${r} が工程まとまりの任意記載（DR140-(6)）を持つ`, () => {
    const c = read(`${r}/skills/intent-discover/rules/algo-gore-lite.md`);
    assert.match(c, /工程のまとまり|工程計画/);
    assert.match(c, /必須化しない|任意/, `${r}: 任意記載`);
  });
}
for (const r of EN_RULE_ROOTS) {
  test(`vdxd discover gore-lite: ${r} has optional note of the grouping of work (DR140-(6))`, () => {
    const c = read(`${r}/skills/intent-discover/rules/algo-gore-lite.md`);
    assert.match(c, /grouping of work|work plan/i);
    assert.match(c, /not mandatory|optional/i, `${r}: optional note`);
  });
}

// ---- (e) assignments README: 並行選定の工程計画参照 ----
test("vdxd assignments README(ja): 並行選定の工程計画参照案内がある", () => {
  const c = read(".intent/assignments/README.md");
  assert.match(c, /工程計画/);
  assert.match(c, /他セッションが着手宣言済み/, "他セッション skip を明記");
  assert.match(c, /強制しません|参考/, "参考の案内（強制でない）");
});
test("vdxd assignments README(en): work-plan reference for parallel selection", () => {
  const c = read("templates/en/intent/assignments/README.md");
  assert.match(c, /Work plan|work plan/);
  assert.match(c, /already claimed by another session/i);
});

// ---- (g)(h) lguu: 引き継ぎ案内が packets/writeback SKILL にある（5系統）・契機の規律 ----
const ALL_SKILL_ROOTS = [
  [".claude", "ja"],
  ["templates/ja/claude", "ja"],
  ["templates/ja/codex", "ja"],
  ["templates/en/claude", "en"],
  ["templates/en/codex", "en"],
];
for (const [r, lang] of ALL_SKILL_ROOTS) {
  for (const skill of ["intent-packets", "intent-writeback"]) {
    test(`lguu nudge: ${r}/${skill} SKILL に引き継ぎ案内があり契機の規律を満たす (DR143/INV82)`, () => {
      const c = read(`${r}/skills/${skill}/SKILL.md`);
      const nudge = lang === "ja" ? /引き継ぎの案内/ : /Handoff guidance|hand the work over/;
      assert.match(c, nudge, `${r}/${skill}: 引き継ぎ案内の言及`);
      // 契機: 「文脈が長い」自己感覚のときだけ（AND 条件）。
      const andCond = lang === "ja" ? /文脈が長い|長さの自覚/ : /the context is long|sense of length/;
      assert.match(c, andCond, `${r}/${skill}: 切れ目×長さの自己感覚の AND`);
      // 会話ログ・トークンを読まない（INV82-(2)/Anti 433）。
      const noLog = lang === "ja" ? /会話ログ.*読まず|トークン量は読ま/ : /Do not read the conversation log|token amount/;
      assert.match(c, noLog, `${r}/${skill}: 会話ログ・トークンを読まない`);
      // 損得自問の実質3点（kucl/DR159）: 句だけ残して中身を消す誤実装を落とすため、次元そのものを突く。
      const probeWork = lang === "ja" ? /残作業の性質/ : /nature of the remaining work/;
      assert.match(c, probeWork, `${r}/${skill}: 自問(1) 残作業の性質`);
      const probeTacit = lang === "ja" ? /暗黙知/ : /tacit knowledge/;
      assert.match(c, probeTacit, `${r}/${skill}: 自問(2) 失われる暗黙知`);
      const probeBreak = lang === "ja" ? /切れ目の自然さ/ : /natural this break point/;
      assert.match(c, probeBreak, `${r}/${skill}: 自問(3) 切れ目の自然さ`);
      // 「引き継がない方が得」と見積もったら推奨しない（黙る側に倒す）＝長さだけで推奨する文言への後退を落とす。
      const silentOnLoss =
        lang === "ja"
          ? /引き継がない方が得.*(推奨せず黙る|黙る)/
          : /not handing over is the better deal, do not recommend switching/;
      assert.match(c, silentOnLoss, `${r}/${skill}: 損の見積もりでは黙る`);
      // 推奨時は定性の見積もり一言を添える（数値なし）。
      const estimateLine = lang === "ja" ? /見積もりの一言（定性・数値なし）/ : /one qualitative line \(no numbers\)/;
      assert.match(c, estimateLine, `${r}/${skill}: 推奨時の見積もり一言（定性）`);
    });
  }
}
