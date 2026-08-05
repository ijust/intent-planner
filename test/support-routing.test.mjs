// 目的と資料から支援を選ぶ規則の RED テスト基盤。
// 製品ruleが実装される前でも、fixture schema と検査oracle自体の判別力は検証できる。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_PATH = "test/fixtures/support-routing/cases.md";
const OUTCOMES = new Set([
  "AvailableSupport",
  "SupportCandidate",
  "ClarificationQuestion",
  "ExistingFlow",
]);
const RULE_PATHS = [
  "templates/ja/claude/skills/intent-discover/rules/support-routing.md",
  "templates/ja/codex/skills/intent-discover/rules/support-routing.md",
  "templates/en/claude/skills/intent-discover/rules/support-routing.md",
  "templates/en/codex/skills/intent-discover/rules/support-routing.md",
];

const CASE_EXPECTATIONS = Object.freeze({
  "artifact-rfp": ["AvailableSupport", /RFP作成支援/, /職種を質問/],
  "unavailable-specialty": ["SupportCandidate", /足りない工程/, /利用可能と表現/],
  "ambiguous-output": ["ClarificationQuestion", /一問だけ/, /二問以上/],
  "normal-bugfix": ["ExistingFlow", /従来のmode選定/, /発注質問.*RFP形式/],
  "profession-counterexample": ["ExistingFlow", /目的と成果物/, /職種だけ/],
  "profession-purpose-pair": ["AvailableSupport", /成果物と次の判断/, /職種だけ/],
  "keyword-counterexample": ["ExistingFlow", /否定を含む依頼全体/, /単語だけ/],
  "filename-counterexample": ["ExistingFlow", /資料が不要/, /ファイル名だけ.*全資料/],
  "unreadable-needed-material": ["ClarificationQuestion", /読めた内容と読めない制約/, /推測.*読めたと主張.*確定/],
  "detailed-ingest-needed": ["AvailableSupport", /用途.*既存の資料取り込み工程.*次の操作.*戻る先/, /自動実行.*先読み/],
  "selective-material-scope": ["AvailableSupport", /必要箇所だけ.*必要になるまで読まない/, /全資料を読む.*読了/],
  "same-source-version": ["AvailableSupport", /選定結果.*質問.*変更候補.*再利用/, /重複取り込み.*同じ質問.*同じ変更候補/],
  "changed-version": ["AvailableSupport", /別資料.*再評価/, /v3の結果.*全資料/],
  "unknown-identity-impactful": ["ClarificationQuestion", /版または変更有無.*一問/, /処理済み.*別資料.*fingerprint/],
  "unknown-identity-irrelevant": ["ExistingFlow", /版を質問せず/, /同一性不明.*詳しい取り込み/],
  "no-material-needed": ["ExistingFlow", /質問0件/, /詳しい指示.*発注支援/],
  "empty-input": ["ClarificationQuestion", /足りない情報.*少数/, /推測.*属性データベース.*機械スコア/],
});

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function parseCases(markdown) {
  const lines = markdown.split("\n");
  const headerIndex = lines.findIndex((line) => line.startsWith("| ID |"));
  assert.notEqual(headerIndex, -1, "fixtureにID列を持つ表がある");
  const headers = lines[headerIndex].slice(1, -1).split("|").map((cell) => cell.trim());
  assert.deepEqual(headers, [
    "ID",
    "目的",
    "成果物",
    "指定資料",
    "次の判断",
    "根拠となる文脈",
    "期待する結果",
    "必要な扱い",
    "禁止する扱い",
  ]);

  return lines.slice(headerIndex + 2)
    .filter((line) => line.startsWith("| "))
    .map((line) => {
      const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
      assert.equal(cells.length, headers.length, `fixture行の列数: ${line}`);
      return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
    });
}

function validateCaseContracts(cases) {
  const byId = new Map(cases.map((item) => [item.ID, item]));
  assert.equal(byId.size, Object.keys(CASE_EXPECTATIONS).length, "定義済みケースだけを過不足なく持つ");
  for (const [id, [outcome, required, forbidden]] of Object.entries(CASE_EXPECTATIONS)) {
    const item = byId.get(id);
    assert.ok(item, `${id}: fixture行がある`);
    assert.equal(item["期待する結果"], outcome, `${id}: 期待結果`);
    assert.match(item["必要な扱い"], required, `${id}: 必要な扱い`);
    assert.match(item["禁止する扱い"], forbidden, `${id}: 禁止する扱い`);
  }
}

const ORACLE_CHECKS = [
  ["四つの入力", /目的[^\n]*(?:成果物|作りたいもの)[^\n]*(?:指定資料|手元の資料)[^\n]*(?:次の判断|次に行いたい判断)/i],
  ["四結果", /AvailableSupport[\s\S]*SupportCandidate[\s\S]*ClarificationQuestion[\s\S]*ExistingFlow/i],
  ["排他的な結果", /(?:四つ|4つ|four)[^\n]*(?:一つだけ|exactly one|one and only one)/i],
  ["実在確認済みだけAvailableSupport", /(?:実在|availability)[^\n]*(?:確認|verif)[^\n]*AvailableSupport/i],
  ["未実装支援は候補", /SupportCandidate[^\n]*(?:利用可能と表現しない|not (?:claim|present)[^\n]*available)/i],
  ["結果を変える場合だけ一問", /(?:成果|結果|outcome)[^\n]*(?:変わ|differ)[^\n]*ClarificationQuestion[^\n]*(?:一問|one question)/i],
  ["既存flowへ戻る", /ExistingFlow[^\n]*(?:既存|existing)[^\n]*(?:mode|flow)/i],
  ["属性や字面だけで固定しない", /(?:職種|profession|role)[^\n]*(?:経験|experience)[^\n]*(?:単語|keyword|word)[^\n]*(?:ファイル名|file name)[^\n]*(?:だけ|alone)[^\n]*(?:固定しない|確定しない|must not fix|do not determine)/i],
  ["読取不能を推測しない", /(?:読めた内容|readable content)[^\n]*(?:読めない制約|unreadable constraint)[^\n]*(?:推測しない|do not infer|must not infer)/i],
  ["同じ指定元と版を再利用", /(?:同じ指定元|same source)[^\n]*(?:同じ版|same version)[^\n]*(?:再利用|reuse)[^\n]*(?:追加しない|do not add|without adding)/i],
  ["版変更を再評価", /(?:版変更|異なる版|version change|different version)[^\n]*(?:再評価|re-evaluate|reevaluate)/i],
  ["同一性不明を推測しない", /(?:同一性|identity)[^\n]*(?:不明|unknown)[^\n]*(?:推測しない|do not assume|must not assume)/i],
  ["同一性確認も結果が変わる場合だけ", /(?:版|version|変更有無)[^\n]*(?:結果|支援|質問|outcome)[^\n]*(?:変わ|change)[^\n]*(?:一問|one question)/i],
  ["必要時だけ資料取り込みを案内", /(?:詳しい資料取り込み|detailed material ingestion)[^\n]*(?:必要|needed)[^\n]*(?:用途|purpose)[^\n]*(?:既存工程|existing flow)[^\n]*(?:復帰先|return)/i],
  ["資料取り込みを自動実行しない", /(?:資料取り込み|material ingestion)[^\n]*(?:自動実行しない|do not auto|must not auto)/i],
  ["最初の判断に必要な範囲だけ扱う", /(?:最初の重要な判断|first important decision)[^\n]*(?:必要な範囲だけ|only the scope needed|only what is needed)/i],
  ["全資料の読了を開始条件にしない", /(?:全資料|all materials)[^\n]*(?:読了|finish reading|read completion)[^\n]*(?:条件にしない|not a prerequisite|must not require)/i],
  ["不要時は詳しい指示を読まない", /(?:資料がない|no material|不要|not needed)[^\n]*(?:詳しい指示|detailed instructions)[^\n]*(?:読まない|do not load|must not load)/i],
  ["通常案件へ発注支援を漏らさない", /(?:発注文脈のない|non-procurement)[^\n]*(?:発注質問|procurement questions)[^\n]*(?:RFP)[^\n]*(?:追加しない|do not add|must not add)/i],
  ["新しい永続分類を作らない", /(?:利用者属性データベース|user attribute database)[^\n]*(?:職種分類|role classification)[^\n]*(?:機械スコア|machine scor)[^\n]*(?:質問台帳|question ledger)[^\n]*(?:作らない|要求しない|must not require|do not create)/i],
];

function validateRoutingRule(subject) {
  for (const [label, pattern] of ORACLE_CHECKS) {
    assert.match(subject, pattern, label);
  }
}

const VALID_ORACLE_SUBJECT = `
目的・成果物・指定資料・次の判断を意味で組み合わせる。
結果は AvailableSupport、SupportCandidate、ClarificationQuestion、ExistingFlow の四つから一つだけ返す。
実在を確認した支援だけを AvailableSupport とする。
SupportCandidate は利用可能と表現しない。
成果が変わり選べない場合だけ ClarificationQuestion で一問を出す。
ExistingFlow は既存の mode または flow へ戻る。
職種、経験、単語、ファイル名だけでは支援を固定しない。
読めた内容と読めない制約を分け、推測しない。
同じ指定元と同じ版なら既存結果を再利用し、同じ項目を追加しない。
版変更があれば再評価する。
同一性が不明なら処理済みと推測しない。
版または変更有無で結果や質問が変わる場合だけ一問を出す。
詳しい資料取り込みが必要な場合だけ、用途、既存工程、復帰先を案内する。
資料取り込みは自動実行しない。
最初の重要な判断に必要な範囲だけを扱う。
全資料の読了は質問開始の条件にしない。
資料がない、または不要なら詳しい指示を読まない。
発注文脈のない通常案件には発注質問や RFP 形式を追加しない。
利用者属性データベース、職種分類、機械スコア、質問台帳を作らない。
`;

test("意味fixtureが入力、四結果、反例、資料再利用、通常案件を網羅する", () => {
  const cases = parseCases(read(FIXTURE_PATH));
  assert.equal(cases.length, 17);
  assert.equal(new Set(cases.map((item) => item.ID)).size, cases.length, "fixture IDは一意");
  for (const item of cases) {
    assert.ok(OUTCOMES.has(item["期待する結果"]), `${item.ID}: 四結果の一つだけを持つ`);
    for (const field of ["目的", "成果物", "指定資料", "次の判断", "必要な扱い", "禁止する扱い"]) {
      assert.ok(item[field], `${item.ID}: ${field}が空でない`);
    }
  }
  assert.deepEqual(new Set(cases.map((item) => item["期待する結果"])), OUTCOMES);
  validateCaseContracts(cases);

  const fixture = read(FIXTURE_PATH);
  for (const required of [
    "profession-counterexample",
    "keyword-counterexample",
    "filename-counterexample",
    "unreadable-needed-material",
    "selective-material-scope",
    "same-source-version",
    "changed-version",
    "unknown-identity-impactful",
    "unknown-identity-irrelevant",
    "normal-bugfix",
    "no-material-needed",
  ]) {
    assert.match(fixture, new RegExp(`\\| ${required} \\|`), required);
  }
});

test("fixtureは同じ属性の別目的と、別属性の同じ成果物を区別する", () => {
  const byId = new Map(parseCases(read(FIXTURE_PATH)).map((item) => [item.ID, item]));
  assert.notEqual(byId.get("profession-counterexample")["期待する結果"], byId.get("profession-purpose-pair")["期待する結果"]);
  assert.equal(byId.get("artifact-rfp")["期待する結果"], byId.get("profession-purpose-pair")["期待する結果"]);
  assert.match(byId.get("normal-bugfix")["禁止する扱い"], /発注質問.*RFP形式/);
  assert.match(byId.get("keyword-counterexample")["根拠となる文脈"], /否定文/);
});

test("検査oracleが主要な誤実装と要件欠落を拒否する", () => {
  validateRoutingRule(VALID_ORACLE_SUBJECT);
  const mutations = [
    ["四結果の統合", "四つから一つだけ返す", "候補を複数返してよい", /排他的な結果/],
    ["職種固定", "だけでは支援を固定しない", "だけで支援を固定する", /属性や字面だけ/],
    ["読取不能の推測", "推測しない。\n同じ指定元", "推測で補う。\n同じ指定元", /読取不能/],
    ["再利用時の重複", "同じ項目を追加しない", "同じ項目を再追加する", /同じ指定元と版/],
    ["不明な同一性の決め打ち", "処理済みと推測しない", "処理済みと推測する", /同一性不明/],
    ["通常案件への漏出", "発注質問や RFP 形式を追加しない", "発注質問や RFP 形式を追加する", /通常案件/],
    ["SupportCandidateの欠落", "SupportCandidate は利用可能と表現しない。", "", /未実装支援/],
    ["版変更の再評価漏れ", "版変更があれば再評価する。", "", /版変更/],
    ["必要範囲を全資料へ拡大", "最初の重要な判断に必要な範囲だけを扱う", "最初の重要な判断の前に全資料を扱う", /最初の判断に必要な範囲/],
    ["全資料読了を開始条件化", "全資料の読了は質問開始の条件にしない", "全資料の読了を質問開始の条件にする", /全資料の読了/],
  ];

  for (const [label, before, after, expectedFailure] of mutations) {
    const mutated = VALID_ORACLE_SUBJECT.replace(before, after);
    assert.notEqual(mutated, VALID_ORACLE_SUBJECT, `${label}: 変異が入力を変更した`);
    assert.throws(() => validateRoutingRule(mutated), expectedFailure, `${label}: oracleが拒否する`);
  }
});

test("case別oracleが個々の結果改変と必要・禁止動作の欠落を拒否する", () => {
  const cases = parseCases(read(FIXTURE_PATH));
  validateCaseContracts(cases);

  for (const [id, [expectedOutcome]] of Object.entries(CASE_EXPECTATIONS)) {
    const replacement = [...OUTCOMES].find((outcome) => outcome !== expectedOutcome);
    const outcomeMutation = cases.map((item) => item.ID === id
      ? { ...item, "期待する結果": replacement }
      : item);
    assert.throws(() => validateCaseContracts(outcomeMutation), new RegExp(`${id}: 期待結果`), `${id}: 結果改変を拒否`);

    const requiredOmission = cases.map((item) => item.ID === id
      ? { ...item, "必要な扱い": "記載なし" }
      : item);
    assert.throws(() => validateCaseContracts(requiredOmission), new RegExp(`${id}: 必要な扱い`), `${id}: 必要動作の欠落を拒否`);

    const forbiddenOmission = cases.map((item) => item.ID === id
      ? { ...item, "禁止する扱い": "記載なし" }
      : item);
    assert.throws(() => validateCaseContracts(forbiddenOmission), new RegExp(`${id}: 禁止する扱い`), `${id}: 禁止動作の欠落を拒否`);
  }
});

test("四配布面に支援選択ruleがあり、同じ意味契約を満たす", () => {
  for (const relative of RULE_PATHS) {
    assert.ok(fs.existsSync(path.join(ROOT, relative)), `${relative}: 製品ruleが未実装`);
    validateRoutingRule(read(relative));
  }
});
