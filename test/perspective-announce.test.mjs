// pkt-20260717-観点の名乗りと常時の気づき-o0jn（elicit-propose-mode 群3・C81）の構造オラクル。
//
// 背景: ロールレンズで観点を確定しても、現行は deep 限定の確認論点生成のみで、standard では観点が
//   「見えない」（症状(3) 観点の存在感がない・2026-07-17 利用者確認）。role-perspective-review.md へ
//   「名乗りと常時の気づき」節を**追加**し（詳細レビュー=deep 限定の既存契約は不変）、standard でも
//   名乗り+短い気づき（少数・推測標識付き）を supply する。proposals: off で縮退（DR196）。
// 判別オラクル:
//   (a) standard での名乗り・気づきの発火（depth に関わらず適用・名乗り様式・少数・推測標識）
//   (b) off 縮退（proposals: off で適用しない・未記載=on・旧環境 fail-open）
//   (c) deep の従来量の非破壊（詳細レビュー deep 限定の文・6.6 接続・全量生成は deep のみ）
//   (d) 誤実装注入で赤化: 「standard で確認論点の全量を出す（問い増加）」「off でも発火」「採否なしで反映」
//   (e) designer-questions 手順2.4 の結線（デザインフレーム接続の直後・2.45 の前）
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");

function rulePath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-discover", "rules", "role-perspective-review.md");
}
function dqPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-discover", "rules", "designer-questions.md");
}
const DOGFOOD_RULE = path.join(ROOT, ".agents", "skills", "intent-discover", "rules", "role-perspective-review.md");
const DOGFOOD_DQ = path.join(ROOT, ".agents", "skills", "intent-discover", "rules", "designer-questions.md");

function read(p) {
  return fs.readFileSync(p, "utf8");
}

// 「名乗りと常時の気づき」節を抽出する（無ければ fail）。
function announceSection(text, lang) {
  const heading = lang === "ja" ? "## 名乗りと常時の気づき" : "## Announcing the perspective and always-on observations";
  const i = text.indexOf(heading);
  assert.ok(i >= 0, `名乗り節（${heading}）がある`);
  const j = text.indexOf("\n## ", i + heading.length);
  assert.ok(j > i, "名乗り節の後に別の節が続く");
  return text.slice(i, j);
}

// 名乗り節の契約検査（違反ラベルの配列を返す・空なら適合）。誤実装注入テスト (d) と共用する。
function announceViolations(section, lang) {
  const checks = lang === "ja" ? [
    ["standard でも適用（depth 非依存）", /designer-questions \/ question-depth の値に関わらず適用する/],
    ["deep 限定でない宣言", /深掘り（deep）限定ではない/],
    ["off 縮退", /`proposals:` 行が `off` のときは適用しない/],
    ["未記載=on", /未記載=on/],
    ["旧環境 fail-open", /旧環境では何もしない（従来どおり・fail-open）/],
    ["名乗り様式", /「製品を決める観点から見ています」のように\*\*観点名の名乗り\*\*/],
    ["代行の明示", /「（代行）」を添え/],
    ["気づきは少数", /観点あたり1〜2個が目安/],
    ["推測標識付きの叩き台", /推測標識付きの叩き台/],
    ["根拠4区分に従う", /根拠を示せなければ `未確認`/],
    ["全量生成・新質問束の禁止", /確認論点の全量生成や新しい質問束は行わない/],
    ["深掘り論点は deep のみ", /深掘りの確認論点は deep のときだけ/],
    ["要求量を増やさない（INV58）", /利用者への要求量を増やさない/],
    ["採否ゲート（INV102）", /利用者の採否を経る/],
    ["無反応≠承認", /無反応を承認として扱わない/],
  ] : [
    ["applies regardless of depth", /regardless of the designer-questions \/ question-depth values/],
    ["not limited to deep", /not limited to deep/i],
    ["off degrade", /`proposals:` line is `off`/],
    ["missing = on", /missing = on/i],
    ["fail-open in older environments", /do nothing \(behave as before; fail-open\)/i],
    ["announcement style", /"looking from the product-decision perspective,?" to questions/i],
    ["stand-in disclosure", /add "\(stand-in\)"/],
    ["a few observations", /one or two per perspective as a guide/i],
    ["inference-tagged drafts", /inference-tagged drafts/i],
    ["evidence classes", /if no basis can be shown, `unverified`/i],
    ["no full concern generation or new batches", /no full concern generation and no new question batches/i],
    ["detailed concerns stay deep-only", /remain deep-only/i],
    ["does not increase user demand (INV58)", /does not increase what is demanded of the user/i],
    ["adoption gate (INV102)", /requires the user's adoption/i],
    ["silence is not approval", /silence is not approval/i],
  ];
  return checks.filter(([, rx]) => !rx.test(section)).map(([label]) => label);
}

const JA_RULES = [
  ["ja/claude", rulePath("ja", "claude")],
  ["ja/codex", rulePath("ja", "codex")],
  ["repository rule", DOGFOOD_RULE],
];
const EN_RULES = [
  ["en/claude", rulePath("en", "claude")],
  ["en/codex", rulePath("en", "codex")],
];

// ---- (a)(b) 名乗り節の契約（4系統+dogfood） ----
test("perspective-announce: 日本語の名乗り節が standard 発火・off 縮退・少数・推測標識・採否ゲートを持つ", () => {
  for (const [label, file] of JA_RULES) {
    const section = announceSection(read(file), "ja");
    assert.deepEqual(announceViolations(section, "ja"), [], `${label}: 名乗り節の契約`);
  }
});

test("perspective-announce: English announce section carries standard firing, off degrade, few observations, adoption gate", () => {
  for (const [label, file] of EN_RULES) {
    const section = announceSection(read(file), "en");
    assert.deepEqual(announceViolations(section, "en"), [], `${label}: announce contract`);
  }
});

// ---- (c) deep の従来量の非破壊（群9 の詳細レビュー契約はそのまま） ----
test("perspective-announce: 詳細レビュー=deep 限定の既存契約が無傷（群9 非破壊）", () => {
  for (const [, file] of EN_RULES) {
    const t = read(file);
    assert.match(t, /Apply this detailed review only when designer questions are enabled and `deep` is selected/,
      "EN rule: 詳細レビューは deep 限定のまま");
    assert.match(t, /Do not apply the detailed review when designer questions are not enabled or the selected depth is `standard`/,
      "EN rule: standard では詳細レビューを適用しない文が残る");
  }
  for (const [label, file] of [["ja/claude", dqPath("ja", "claude")], ["ja/codex", dqPath("ja", "codex")], ["repository rule", DOGFOOD_DQ]]) {
    const t = read(file);
    assert.match(t, /`deep` のときだけ[^\n]*standard・未記載・未知値・designer-questions=off では発火しない/,
      `${label}: 6.6 の deep 限定発火が残る`);
    assert.match(t, /`rules\/role-perspective-review\.md` を正確に1回だけ読み、適用する/,
      `${label}: 6.6 の接続行が残る`);
  }
});

// ---- (d) 誤実装注入で赤化（3種） ----
test("perspective-announce: 3種の誤実装（standard で全量・off でも発火・採否なし反映）を注入すると契約検査が落ちる", () => {
  const jaSection = announceSection(read(rulePath("ja", "claude")), "ja");
  const mutations = [
    ["standard でも確認論点の全量を出す（問い増加）",
      jaSection.replace(/確認論点の全量生成や新しい質問束は行わない/, "standard でも確認論点の全量を生成してよい"),
      "全量生成・新質問束の禁止"],
    ["off でも発火",
      jaSection.replace(/`proposals:` 行が `off` のときは適用しない/, "`proposals:` 行が `off` でも適用する"),
      "off 縮退"],
    ["採否なしで反映",
      jaSection.replace(/利用者の採否を経る/, "AI の判断でそのまま反映してよい"),
      "採否ゲート（INV102）"],
  ];
  for (const [label, mutated, expected] of mutations) {
    assert.notEqual(mutated, jaSection, `${label}: 注入が本文を実際に変えている`);
    const violations = announceViolations(mutated, "ja");
    assert.ok(violations.includes(expected),
      `${label}: 契約検査が「${expected}」で落ちる（got: ${violations.join(", ") || "none"}）`);
  }
});

// ---- (e) designer-questions 手順2.4 の結線（位置と内容） ----
test("perspective-announce: 手順2.4 にデザインフレーム接続直後の結線があり 2.45 より前にある", () => {
  const jaConn = "**観点の名乗りと常時の気づきへの接続（C81・DR196・INV102）**";
  for (const [label, file] of [["ja/claude", dqPath("ja", "claude")], ["ja/codex", dqPath("ja", "codex")], ["repository rule", DOGFOOD_DQ]]) {
    const t = read(file);
    const lens = t.indexOf("2.4. **ロールレンズ");
    const frame = t.indexOf("**デザインフレーム候補への接続**");
    const conn = t.indexOf(jaConn);
    const packs = t.indexOf("2.45. **案件種別の質問パック");
    assert.ok(lens >= 0 && frame > lens && conn > frame && packs > conn,
      `${label}: 結線がデザインフレーム接続の後・2.45 の前にある`);
    assert.match(t, /standard の深さでも各観点から短い気づき・見直し提案が推測標識付きで少数出る/, `${label}: standard の気づきを明記`);
    assert.match(t, /`proposals: off` の発行では発火しない/, `${label}: off 縮退を明記`);
  }
  const enConn = "**Connect perspective announcements and always-on observations (C81; DR196; INV102)**";
  for (const [label, file] of [["en/claude", dqPath("en", "claude")], ["en/codex", dqPath("en", "codex")]]) {
    const t = read(file);
    const lens = t.indexOf("2.4. **Role lens");
    const frame = t.indexOf("**Connect design-frame candidates**");
    const conn = t.indexOf(enConn);
    const packs = t.indexOf("2.45. **Match the case-type question packs");
    assert.ok(lens >= 0 && frame > lens && conn > frame && packs > conn,
      `${label}: connection sits after the design-frame line and before 2.45`);
    assert.match(t, /even at standard depth each perspective offers a few short inference-tagged observations/i,
      `${label}: standard observations stated`);
  }
});

// ---- パリティ: 触ったファイルが claude⇔codex（+dogfood）で byte 等価 ----
test("perspective-announce: role-perspective-review が全配布面で byte 等価", () => {
  const jaClaude = read(rulePath("ja", "claude"));
  assert.equal(read(rulePath("ja", "codex")), jaClaude, "ja: claude⇔codex byte 等価");
  assert.equal(read(DOGFOOD_RULE), jaClaude, "dogfood が ja/claude と byte 等価");
  assert.equal(read(rulePath("en", "codex")), read(rulePath("en", "claude")), "en: claude⇔codex byte 等価");
});
