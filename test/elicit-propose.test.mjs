// pkt-20260717-discoverの呼び水と複数案起案-nmka（elicit-propose-mode 群0+1+2）の構造オラクル。
//
// 背景: 白紙で問われても出てこない・AI から案が出てこない、という既定体験の症状（2026-07-17 利用者確認）に対し、
//   discover の問いで AI が推測と明示した仮の答えと複数案を示す動作（C79/C80）を既定 on（DR196・
//   オプトアウト= mode.md の proposals: off）で重ねた。anchoring 回避は「値を置かない」から「単一の推奨アンカーを
//   置かない（複数案の対等提示は可）」へ再定義（DR199。decision-slots / algo-qoc / designer-questions 6.6 を同時改訂）。
//   境界は INV102（起案しても決めない＝採否を経ずに canonical へ昇格しない）。
// 判別オラクル:
//   (a) AI が示す仮の答えへの推測標識（Anti-553 の裏返し）
//   (b) off 縮退（proposals: off で全レーン停止・未記載=on・書き手=discover のみ）
//   (c) 4択超の網羅は「文書+要約」側へ倒す（DR198）
//   (d) INV58 歯止め文の非破壊（まとめて少数・最大4問・尋問調にしない・deep opt-in）
//   (e) 誤実装注入で赤化: 「AI の仮の答えを canonical へ直書き」「off でも発火」「単一推奨だけ提示」
//   (f) 旧 anchoring 文言（対称並列は保留・値を提示しない）の再混入検知
//   (g) proposals 行の読み手契約が CONTRACT.md に在る
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const VARIANTS = [
  ["ja", "claude"], ["en", "claude"], ["ja", "codex"], ["en", "codex"],
];

function dqPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-discover", "rules", "designer-questions.md");
}
function slotsPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-packets", "rules", "decision-slots.md");
}
function qocPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-compass", "rules", "algo-qoc.md");
}
function contractPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "CONTRACT.md");
}
const DOGFOOD_DQ = path.join(ROOT, ".agents", "skills", "intent-discover", "rules", "designer-questions.md");
const JA_DQ_FILES = [
  ["ja/claude", dqPath("ja", "claude")],
  ["ja/codex", dqPath("ja", "codex")],
  ["repository rule", DOGFOOD_DQ],
];
const EN_DQ_FILES = [
  ["en/claude", dqPath("en", "claude")],
  ["en/codex", dqPath("en", "codex")],
];

function read(p) {
  return fs.readFileSync(p, "utf8");
}

// AI が仮の答えと複数案を示す規則のセクションを抽出する（無ければ fail）。
function laneSection(text, lang) {
  const heading = lang === "ja" ? "## AI が仮の答えと複数案を示すときの規則" : "## Elicit-propose lane";
  const next = lang === "ja" ? "## 問いの平易さ点検" : "## Plainness check";
  const i = text.indexOf(heading);
  const j = text.indexOf(next);
  assert.ok(i >= 0, `AI が仮の答えと複数案を示す規則のセクション（${heading}）がある`);
  assert.ok(j > i, `レーンの後に平易さ点検（${next}）が続く`);
  return text.slice(i, j);
}

// レーン本文の契約検査（違反ラベルの配列を返す・空なら適合）。誤実装注入テスト (e) と共用する。
function laneViolations(section, lang) {
  const checks = lang === "ja" ? [
    ["AI の仮の答えに推測標識", /AI の推測であると明示した仮の答え/],
    ["詰まりに問いだけ返さない（Anti-553）", /問いだけを繰り返さない/],
    ["順序・遠慮の条件を課さない（DR197）", /提示の順序・遠慮の条件は課さない/],
    ["実質的に異なる選択肢の網羅", /実質的に異なる選択肢を網羅/],
    ["単一の推奨アンカーを置かない", /単一の推奨アンカーを置かない/],
    ["推しは明示する（Anti-550）", /「推し」と明示/],
    ["言い換え水増しの禁止（Anti-552）", /別案として数を膨らませない/],
    ["4択超は文書+要約へ（DR198）", /最大4択[^\n]*超える網羅は、自動的に「文書\+要約」側へ倒す/],
    ["迷ったら文書側", /迷ったら文書側/],
    ["採否なしに canonical 昇格しない（INV102）", /採否を経ずに canonical[^\n]*へ昇格しない/],
    ["無反応=承認の禁止（Anti-551）", /無反応・話題の流れ・時間経過を承認として扱わない/],
    ["off で全体を発火しない", /`off` のときはこのセクション全体を発火しない/],
    ["未記載=on の後方互換", /未記載・行なし・旧 scaffold は on 扱い/],
    ["要求量を増やさない（INV58 非接触）", /要求量を増やさない/],
  ] : [
    ["priming cue with inference tag", /priming cue with an inference tag/i],
    ["no question-only response to a stuck user (Anti-553)", /without offering a cue or an option/i],
    ["no ordering/restraint conditions (DR197)", /Impose no ordering or restraint conditions/i],
    ["cover substantively different options", /cover the substantively different options/i],
    ["place no single recommended anchor", /Place no single recommended anchor/i],
    ["say my pick explicitly (Anti-550)", /say "my pick" explicitly/i],
    ["no padded exhaustiveness (Anti-552)", /Do not pad the count/i],
    ["over 4 choices tips to document+summary (DR198)", /at most 4 choices[^\n]*automatically tips to the "document \+ summary" side/i],
    ["when unsure tip to the document side", /when unsure, tip to the document side/i],
    ["never promotes to canonical without adoption (INV102)", /never promotes to canonical[^\n]*without the user's adoption/i],
    ["silence is not approval (Anti-551)", /Do not treat the user's silence[^\n]*as approval/i],
    ["off: the entire section does not fire", /`off`, this entire section does not fire/i],
    ["missing line = on", /missing value, a missing line, or an older scaffold is treated as on/i],
    ["does not increase user demand (INV58 untouched)", /does not increase what is \*\*demanded of the user\*\*/i],
  ];
  return checks.filter(([, rx]) => !rx.test(section)).map(([label]) => label);
}

// ---- (a)(b)(c) レーン本文の契約（4系統+dogfood） ----
test("elicit-propose: 日本語の規則が仮の答え・対等網羅・重さ出し分け・採否ゲート・off 縮退を持つ", () => {
  for (const [label, file] of JA_DQ_FILES) {
    const section = laneSection(read(file), "ja");
    assert.deepEqual(laneViolations(section, "ja"), [], `${label}: レーン契約`);
  }
});

test("elicit-propose: English lane carries cues, equal coverage, weight routing, adoption gate, off degrade", () => {
  for (const [label, file] of EN_DQ_FILES) {
    const section = laneSection(read(file), "en");
    assert.deepEqual(laneViolations(section, "en"), [], `${label}: lane contract`);
  }
});

// ---- (b) proposals 行の記録手順（2.3）: 書き手一元・設定質問を増やさない・明示オプトアウトのみ ----
test("elicit-propose: 手順2.3 が proposals 行を discover 一元で記録し、毎回の設定質問を増やさない（DR196）", () => {
  for (const [label, file] of JA_DQ_FILES) {
    const t = read(file);
    assert.match(t, /2\.3\. \*\*AI が仮の答えと複数案を示す設定（proposals）のオプトアウト記録/, `${label}: 手順2.3 がある`);
    assert.match(t, /`proposals:` 行/, `${label}: proposals: 行を扱う`);
    assert.match(t, /要否の確認質問はしない/, `${label}: 設定質問を増やさない`);
    assert.match(t, /明示したときだけ[^\n]*`off` を記録/s, `${label}: 明示オプトアウトのみ記録`);
    assert.match(t, /書き手は discover のみ/, `${label}: 書き手の一元化（DR26 同型）`);
    assert.match(t, /未記載・行なし・未知値は on 扱い/, `${label}: 未記載=on の後方互換`);
  }
  for (const [label, file] of EN_DQ_FILES) {
    const t = read(file);
    assert.match(t, /2\.3\. \*\*Opt-out recording of the elicit-propose posture/, `${label}: step 2.3 exists`);
    assert.match(t, /no confirmation question is asked about them/i, `${label}: no settings question`);
    assert.match(t, /Only when the user explicitly states/i, `${label}: explicit opt-out only`);
    assert.match(t, /only discover is the writer/i, `${label}: single writer`);
    assert.match(t, /missing line or unknown value is treated as on/i, `${label}: missing = on`);
  }
});

// ---- (d) INV58 歯止め文の非破壊（AI の仮の答え・複数案は利用者への要求を増やさない） ----
test("elicit-propose: INV58 の歯止め文（まとめて少数・最大4問・尋問調にしない・deep opt-in）が無傷", () => {
  for (const [label, file] of JA_DQ_FILES) {
    const t = read(file);
    for (const [name, rx] of [
      ["まとめて少数", /まとめて少数/],
      ["最大4問を定める共通契約の表示上限", /共通契約の表示上限/],
      ["尋問調にしない", /尋問調にしない/],
      ["後で確認／不明／該当なし", /後で確認／不明／該当なし/],
      ["deep は question-depth=deep のときのみ", /question-depth=deep のときのみ/],
      ["deep は明示 opt-in", /明示的に \*\*deep（深掘り）\*\* を選んだとき/],
    ]) {
      assert.match(t, rx, `${label}: INV58 歯止め「${name}」が残る`);
    }
  }
  for (const [label, file] of EN_DQ_FILES) {
    const t = read(file);
    assert.match(t, /few at a time/i, `${label}: few at a time`);
    assert.match(t, /shared contract's display limit/i, `${label}: shared contract's display limit`);
    assert.match(t, /not an interrogation/i, `${label}: not an interrogation`);
    assert.match(t, /explicitly chooses \*\*deep\*\*/i, `${label}: deep is explicit opt-in`);
  }
  for (const [lang, agent] of VARIANTS) {
    const contract = read(contractPath(lang, agent));
    if (lang === "ja") assert.match(contract, /1回に出すのは最大4問/, `${lang}/${agent}: 共通契約が最大4問を定める`);
    else assert.match(contract, /at most 4 questions per batch/i, `${lang}/${agent}: shared contract sets at most 4 questions per batch`);
  }
  assert.match(read(path.join(ROOT, ".agents", "skills", "CONTRACT.md")), /1回に出すのは最大4問/, "repository contract: 共通契約が最大4問を定める");
});

// ---- (e) 誤実装注入で赤化（3種・Validation の名指し） ----
test("elicit-propose: 3種の誤実装（canonical 直書き・off でも発火・単一推奨だけ）を注入すると契約検査が落ちる", () => {
  const jaSection = laneSection(read(dqPath("ja", "claude")), "ja");
  const mutations = [
    ["AI の仮の答えを canonical へ直書き",
      jaSection.replace(/利用者の採否を経ずに canonical（intent-tree \/ compass \/ packet の確定内容）へ昇格しない/,
        "AI の仮の答え・複数案はそのまま canonical へ書いてよい"),
      "採否なしに canonical 昇格しない（INV102）"],
    ["off でも発火",
      jaSection.replace(/`off` のときはこのセクション全体を発火しない/,
        "`off` のときもこのセクションを発火してよい"),
      "off で全体を発火しない"],
    ["単一推奨だけ提示",
      jaSection.replace(/\*\*単一の推奨アンカーを置かない\*\*/,
        "**妥当な推奨案を1つだけ先に提示する**"),
      "単一の推奨アンカーを置かない"],
  ];
  for (const [label, mutated, expected] of mutations) {
    assert.notEqual(mutated, jaSection, `${label}: 注入が本文を実際に変えている`);
    const violations = laneViolations(mutated, "ja");
    assert.ok(violations.includes(expected),
      `${label}: 契約検査が「${expected}」で落ちる（got: ${violations.join(", ") || "none"}）`);
  }
});

// ---- (f) 旧 anchoring 文言の再混入検知（DR199 の再定義を巻き戻す退行を落とす） ----
test("elicit-propose: 旧 anchoring 文言（対称並列は保留・値を提示しない）が再混入していない", () => {
  const targets = [];
  for (const [lang, agent] of VARIANTS) {
    targets.push([`${lang}/${agent} designer-questions`, dqPath(lang, agent), lang]);
    targets.push([`${lang}/${agent} decision-slots`, slotsPath(lang, agent), lang]);
    targets.push([`${lang}/${agent} algo-qoc`, qocPath(lang, agent), lang]);
  }
  targets.push(["repository designer-questions", DOGFOOD_DQ, "ja"]);
  targets.push(["repository decision-slots", path.join(ROOT, ".agents", "skills", "intent-packets", "rules", "decision-slots.md"), "ja"]);
  targets.push(["repository algo-qoc", path.join(ROOT, ".agents", "skills", "intent-compass", "rules", "algo-qoc.md"), "ja"]);
  const oldPhrases = {
    ja: [
      ["複数案の対称並列の保留（DR199 で実行済み）", /複数案の対称並列は将来の拡張候補として保留/],
      ["deep でも値は提示しない（旧6.6）", /deep でも\*\*値は提示しない\*\*/],
      ["問いはするが値は置かない（旧 decision-slots）", /問いはするが値は置かない/],
      ["値を先に提示しない（旧 algo-qoc）", /\*\*値を先に提示しない\*\*/],
      ["既定値を出さない（旧3規律①見出し）", /\*\*既定値を出さない（anchoring 回避）\*\*/],
    ],
    en: [
      ["symmetric presentation reserved (executed by DR199)", /reserved as a future extension candidate/i],
      ["Even in deep, do not present values (old 6.6)", /Even in deep, \*\*do not present values\*\*/],
      ["Ask, but place no value (old decision-slots)", /Ask, but place no value\./i],
      ["do not present values first (old algo-qoc)", /\*\*do not present values first\*\*/],
      ["Do not offer defaults (old rule-1 heading)", /\*\*Do not offer defaults \(anchoring avoidance\)\*\*/],
    ],
  };
  for (const [label, file, lang] of targets) {
    const t = read(file);
    for (const [name, rx] of oldPhrases[lang]) {
      assert.doesNotMatch(t, rx, `${label}: 旧文言「${name}」が再混入していない`);
    }
  }
});

// ---- (g) proposals 行の読み手契約（CONTRACT.md・4系統+dogfood） ----
test("elicit-propose: CONTRACT.md に proposals 行の読み手契約（書き手=discover・未記載=on・off で縮退）がある", () => {
  const files = [
    ["ja/claude", contractPath("ja", "claude"), "ja"],
    ["ja/codex", contractPath("ja", "codex"), "ja"],
    ["repository CONTRACT", path.join(ROOT, ".agents", "skills", "CONTRACT.md"), "ja"],
    ["en/claude", contractPath("en", "claude"), "en"],
    ["en/codex", contractPath("en", "codex"), "en"],
  ];
  for (const [label, file, lang] of files) {
    const t = read(file);
    if (lang === "ja") {
      assert.match(t, /`proposals:` 行）の読み取り契約/, `${label}: proposals 契約がある`);
      assert.match(t, /`proposals:` 行）の読み取り契約[^\n]*書き手は intent-discover のみ/s, `${label}: 書き手の一元化`);
      assert.match(t, /未記載・行なし・未知値・旧 scaffold は on 扱い/, `${label}: 未記載=on`);
    } else {
      assert.match(t, /`proposals:` line\) reading contract/i, `${label}: proposals contract exists`);
      assert.match(t, /missing line, a missing or unknown value, and older scaffolds are treated as on/i, `${label}: missing = on`);
    }
  }
});

// ---- パリティ: 触った rule が claude⇔codex で byte 等価（designer-questions は question-depth 側で担保済み） ----
test("elicit-propose: decision-slots / algo-qoc が claude⇔codex で byte 等価", () => {
  for (const lang of ["ja", "en"]) {
    assert.equal(read(slotsPath(lang, "claude")), read(slotsPath(lang, "codex")),
      `${lang}: decision-slots.md が claude⇔codex で byte 等価`);
    assert.equal(read(qocPath(lang, "claude")), read(qocPath(lang, "codex")),
      `${lang}: algo-qoc.md が claude⇔codex で byte 等価`);
  }
});
