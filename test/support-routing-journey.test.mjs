import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = "test/fixtures/support-routing/journeys.md";
const VARIANTS = [["ja", "claude"], ["ja", "codex"], ["en", "claude"], ["en", "codex"]];
const DOGFOOD = [[".claude", "claude"], [".agents", "codex"]];
const ROUTING_RESULTS = ["AvailableSupport", "SupportCandidate", "ClarificationQuestion", "ExistingFlow"];

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function parseJourneys(markdown) {
  return markdown.split(/^## /m).slice(1).map((block) => {
    const [id, ...lines] = block.trim().split("\n");
    const values = Object.fromEntries(lines.filter((line) => /^- [a-z-]+: /.test(line)).map((line) => {
      const match = line.match(/^- ([a-z-]+): (.*)$/);
      return [match[1], match[2]];
    }));
    return { id: id.trim(), ...values };
  });
}

function productDocuments(lang, agent, prefix = `templates/${lang}/${agent}/skills`) {
  return {
    lang,
    contract: read(`${prefix}/CONTRACT.md`),
    routing: read(`${prefix}/intent-discover/rules/support-routing.md`),
    mode: read(`${prefix}/intent-discover/rules/mode-selection.md`),
    fromSpec: read(`${prefix}/intent-from-spec/SKILL.md`),
    toSpec: read(`${prefix}/intent-to-spec/SKILL.md`),
    upstream: read(`${prefix}/intent-to-spec/rules/format-upstream.md`),
  };
}

function semantics(documents) {
  const { lang, contract, routing, mode, fromSpec, toSpec, upstream } = documents;
  if (lang === "ja") {
    return {
      fourSignals: /目的[^\n]*成果物[^\n]*指定資料[^\n]*次の判断/.test(routing),
      clarificationOne: /候補によって成果が変わり[^\n]*一問だけ/.test(routing),
      materialGuideOnly: /intent-from-spec[^\n]*案内に限る[^\n]*自動実行しない/.test(routing),
      fromSpecAvailable: /name: intent-from-spec/.test(fromSpec),
      rfpOutputAvailable: /name: intent-to-spec/.test(toSpec) && /RFP \/ 提案書ふうの体裁/.test(upstream),
      noProcurementLeak: /発注文脈のない[^\n]*発注質問[^\n]*RFP[^\n]*追加しない/.test(routing),
      noFixedDomainRead: /個別分野の詳しい規則[^\n]*ここで読まず/.test(routing),
      noDetailWithoutMaterial: /資料がない[^\n]*詳しい指示[^\n]*読まない/.test(routing),
      repeatReuse: /同じ指定元[^\n]*同じ版[^\n]*再利用[^\n]*追加しない/.test(routing),
      onceBeforeMode: /支援選択を一度だけ先に適用する/.test(mode),
      modeContinues: /既存の mode[^\n]*上書きしない[^\n]*mode選定を続ける/.test(mode),
      knownNotReasked: /`既知`[^\n]*質問候補から外して聞き直さない/.test(contract),
      conflictImpact: /`食い違い`[^\n]*結果への影響/.test(contract),
      unresolvedImpact: /`成果を変える未決事項`[^\n]*結果への影響/.test(contract),
      partialApproval: /一部だけ[^\n]*承認[^\n]*承認された範囲だけ/.test(contract),
      noUnapprovedCanonical: /未承認[^\n]*会話内[^\n]*正本へ書かない/.test(contract),
      pocLimited: /PoC[^\n]*学ぶ対象を未決のまま保持/.test(contract),
      publishStopsAffected: /公開、実装、発注[^\n]*影響する範囲だけを止める/.test(contract),
    };
  }
  return {
    fourSignals: /purpose[^\n]*artifact[^\n]*specified material[^\n]*next decision/i.test(routing),
    clarificationOne: /candidates would make the outcome differ[^\n]*one question/i.test(routing),
    materialGuideOnly: /intent-from-spec[^\n]*guidance only[^\n]*Do not auto-run/i.test(routing),
    fromSpecAvailable: /name: intent-from-spec/.test(fromSpec),
    rfpOutputAvailable: /name: intent-to-spec/.test(toSpec) && /RFP \/ proposal-style layout/i.test(upstream),
    noProcurementLeak: /non-procurement[^\n]*procurement questions[^\n]*RFP format[^\n]*do not add/i.test(routing),
    noFixedDomainRead: /Do not load detailed specialist rules here/i.test(routing),
    noDetailWithoutMaterial: /no material[^\n]*detailed instructions[^\n]*do not load/i.test(routing),
    repeatReuse: /same source[^\n]*same version[^\n]*Reuse[^\n]*without adding/i.test(routing),
    onceBeforeMode: /Apply support routing once before mode selection/i.test(mode),
    modeContinues: /must not overwrite[^\n]*Continue the mode selection/i.test(mode),
    knownNotReasked: /Remove `known` items from question candidates and do not ask them again/i.test(contract),
    conflictImpact: /`conflict`[^\n]*impact on the result/i.test(contract),
    unresolvedImpact: /`outcome-changing unresolved`[^\n]*impact on the result/i.test(contract),
    partialApproval: /approves only part[^\n]*only the approved scope/i.test(contract),
    noUnapprovedCanonical: /unapproved[^\n]*conversation[^\n]*do not write[^\n]*canonical/i.test(contract),
    pocLimited: /PoC[^\n]*keep the learning target unresolved/i.test(contract),
    publishStopsAffected: /Before publish, implementation, or order decisions, stop only the affected scope/i.test(contract),
  };
}

function add(state, collection, value, reuse) {
  if (!reuse || !state[collection].includes(value)) state[collection].push(value);
}

function executeJourney(item, documents, priorState = undefined) {
  const rules = semantics(documents);
  const state = priorState ?? { routes: [], questions: [], candidates: [], canonical: [], evaluations: 0 };
  const trace = { loaded: ["support-routing", "CONTRACT", "mode-selection"], userFacing: [], supportApplications: 0 };

  let routing = "ExistingFlow";
  if (!rules.onceBeforeMode || !rules.fourSignals) {
    routing = "MissingRouting";
  } else {
    trace.supportApplications = 1;
    const negatedRfp = /RFPは作らない|do not (?:make|create) an RFP/i.test(item.purpose);
    const ambiguous = item.artifact === "undecided" || item["next-decision"] === "undecided";
    const requestsRfp = !negatedRfp && /RFP/i.test(item.artifact)
      && /ベンダー|vendor/i.test(item.purpose) && /提案|proposal/i.test(item["next-decision"]);

    if (ambiguous && rules.clarificationOne) routing = "ClarificationQuestion";
    else if (item.material === "detailed-needed" && rules.materialGuideOnly && rules.fromSpecAvailable) {
      routing = "AvailableSupport";
      trace.loaded.push("intent-from-spec");
    } else if (requestsRfp && rules.rfpOutputAvailable) {
      routing = "AvailableSupport";
      trace.loaded.push("intent-to-spec");
    }
  }

  let question = routing === "ClarificationQuestion" ? "routing-clarification" : "none";
  if (item.known === "yes" && !rules.knownNotReasked) question = "known-reasked";
  if (item.conflict === "yes") question = rules.conflictImpact ? "conflict-with-impact" : "conflict-without-impact";
  if (item.unresolved === "yes") question = rules.unresolvedImpact ? "unresolved-with-impact" : "unresolved-without-impact";

  let progress = rules.modeContinues ? "mode-selection" : "routing-overrode-mode";
  if (item.unresolved === "yes" && item.stage === "poc") {
    progress = rules.pocLimited ? "limited-learning" : "unbounded-learning";
  }
  if (item.unresolved === "yes" && item.stage === "publish") {
    progress = rules.publishStopsAffected ? "affected-scope-stopped" : "affected-scope-passed";
  }

  if (item.approval === "partial") {
    add(state, "candidates", `${item.id}:change-a`, rules.repeatReuse);
    add(state, "candidates", `${item.id}:change-b`, rules.repeatReuse);
    add(state, "canonical", `${item.id}:change-a`, rules.repeatReuse);
    if (!rules.partialApproval || !rules.noUnapprovedCanonical) {
      add(state, "canonical", `${item.id}:change-b`, rules.repeatReuse);
    }
  }
  if (item.context === "non-procurement") {
    if (!rules.noProcurementLeak) trace.userFacing.push("vendor-question", "RFP-format");
    if (!rules.noFixedDomainRead) trace.loaded.push("procurement-domain-rules");
    if (!rules.noDetailWithoutMaterial) trace.loaded.push("detailed-material-instructions");
  }

  add(state, "routes", `${item.id}:${routing}`, rules.repeatReuse);
  if (question !== "none") add(state, "questions", `${item.id}:${question}`, rules.repeatReuse);
  state.evaluations += 1;
  return { routing, question, progress, state, trace };
}

function validateJourney(item, documents) {
  const first = executeJourney(item, documents);
  assert.equal(first.routing, item["expected-routing"], `${item.id}: routing`);
  assert.equal(first.question, item["expected-question"], `${item.id}: question`);
  assert.equal(first.progress, item["expected-progress"], `${item.id}: progress`);
  assert.equal(first.trace.supportApplications, 1, `${item.id}: routingをmode前に一度だけ適用`);

  const sizes = Object.fromEntries(["routes", "questions", "candidates", "canonical"]
    .map((key) => [key, first.state[key].length]));
  const second = executeJourney(item, documents, first.state);
  assert.deepEqual(Object.fromEntries(["routes", "questions", "candidates", "canonical"]
    .map((key) => [key, second.state[key].length])), sizes, `${item.id}: 再処理で状態を重複しない`);

  if (item.approval === "partial") {
    assert.ok(second.state.canonical.includes(`${item.id}:change-a`), `${item.id}: 承認分を反映`);
    assert.ok(!second.state.canonical.includes(`${item.id}:change-b`), `${item.id}: 未承認分を正本へ書かない`);
  }
  if (item.context === "non-procurement") {
    assert.deepEqual(first.trace.userFacing, [], `${item.id}: vendor質問やRFP形式を表示しない`);
    assert.deepEqual(first.trace.loaded, ["support-routing", "CONTRACT", "mode-selection"],
      `${item.id}: 発注・個別分野・資料取込の詳しい規則を固定読込しない`);
  }
  return first;
}

function validateAllJourneys(journeys, documents) {
  for (const item of journeys) validateJourney(item, documents);
}

function replaceRule(documents, field, before, after = "") {
  const changed = documents[field].replace(before, after);
  assert.notEqual(changed, documents[field], `${field}: 変異対象が存在する`);
  return { ...documents, [field]: changed };
}

test("入力から独立に導いた結果で、支援選択から既存modeまでの代表旅程を検査する", () => {
  const journeys = parseJourneys(read(FIXTURE));
  assert.equal(journeys.length, 11);
  assert.deepEqual(new Set(journeys.map((item) => item.id)), new Set([
    "explicit-rfp", "explicit-rfp-role-procurement", "explicit-rfp-negated-purpose",
    "material-prd", "ambiguous-request", "known-only", "conflict", "unresolved-poc",
    "unresolved-publish", "partial-approval", "non-procurement-role-counterexample",
  ]));
  for (const [lang, agent] of VARIANTS) validateAllJourneys(journeys, productDocuments(lang, agent));
});

test("役割だけの変更は結果を変えず、同じ役割でも目的が変われば依頼全体に従う", () => {
  const byId = new Map(parseJourneys(read(FIXTURE)).map((item) => [item.id, item]));
  const base = byId.get("explicit-rfp");
  const roleOnly = byId.get("explicit-rfp-role-procurement");
  const purposeOnly = byId.get("explicit-rfp-negated-purpose");
  for (const field of ["purpose", "artifact", "material", "next-decision", "context"]) {
    assert.equal(roleOnly[field], base[field], `role-only pair: ${field}`);
  }
  assert.notEqual(roleOnly.role, base.role);
  for (const field of ["role", "artifact", "material", "next-decision", "context"]) {
    assert.equal(purposeOnly[field], base[field], `purpose-only pair: ${field}`);
  }
  assert.notEqual(purposeOnly.purpose, base.purpose);
  const documents = productDocuments("ja", "claude");
  assert.equal(executeJourney(roleOnly, documents).routing, executeJourney(base, documents).routing);
  assert.notEqual(executeJourney(purposeOnly, documents).routing, executeJourney(base, documents).routing);
});

test("通常案件のmode接続は発注固有のrule・質問・RFP形式・個別分野読込を持たない", () => {
  const journeys = parseJourneys(read(FIXTURE));
  const ordinary = journeys.filter((item) => item.context === "non-procurement");
  assert.equal(ordinary.length, 2);
  for (const [lang, agent] of VARIANTS) {
    const documents = productDocuments(lang, agent);
    assert.doesNotMatch(documents.mode, /RFP|vendor|ベンダー|procurement|発注質問|調達/i,
      `${lang}/${agent}: mode-selection自体に発注固有分岐を置かない`);
    assert.doesNotMatch(documents.routing, /rules\/[\w./-]*(?:rfp|vendor|procurement|発注|調達)/i,
      `${lang}/${agent}: 個別分野ruleを固定参照しない`);
    for (const item of ordinary) {
      const result = validateJourney(item, documents);
      assert.deepEqual(result.trace.userFacing, [], `${item.id}: 発注固有の質問・形式なし`);
      assert.ok(result.trace.loaded.every((name) => !/vendor|procurement|rfp|発注|調達/i.test(name)),
        `${item.id}: 個別分野を固定読込しない`);
    }
  }
});

test("fixtureの期待routingを一件ずつ改変すると、入力由来の実行結果が全件拒否する", () => {
  const journeys = parseJourneys(read(FIXTURE));
  const documents = productDocuments("ja", "claude");
  for (const item of journeys) {
    const replacement = ROUTING_RESULTS.find((result) => result !== item["expected-routing"]);
    assert.throws(() => validateJourney({ ...item, "expected-routing": replacement }, documents),
      new RegExp(`${item.id}: routing`), `${item.id}: fixture期待値の改変を拒否`);
  }
});

test("製品Markdownの主要境界を削除・反転すると、入力からの横断結果が拒否する", () => {
  const journeys = parseJourneys(read(FIXTURE));
  const baseline = productDocuments("ja", "claude");
  validateAllJourneys(journeys, baseline);
  const mutations = [
    ["mode前の一度だけを反転", replaceRule(baseline, "mode", "支援選択を一度だけ先に適用する", "支援選択を何度でも適用する")],
    ["mode継続を反転", replaceRule(baseline, "mode", "既存の mode の推奨、確認、記録を上書きしない", "既存の mode の推奨、確認、記録を上書きする")],
    ["四入力を削除", replaceRule(baseline, "routing", "目的、成果物、指定資料、次の判断", "職種")],
    ["曖昧時の一問を削除", replaceRule(baseline, "routing", "一問だけ", "質問しない")],
    ["資料案内限定を反転", replaceRule(baseline, "routing", "支援選択へ戻るための案内に限る。資料取り込みを自動実行しない", "資料取り込みを自動実行する")],
    ["通常案件への発注漏出防止を反転", replaceRule(baseline, "routing", "発注質問や RFP 形式を追加しない", "発注質問や RFP 形式を追加する")],
    ["個別分野の遅延読込を反転", replaceRule(baseline, "routing", "個別分野の詳しい規則はここで読まず", "個別分野の詳しい規則を常にここで読み")],
    ["資料なし時の遅延読込を反転", replaceRule(baseline, "routing", "資料取り込み工程の詳しい指示を読まない", "資料取り込み工程の詳しい指示を常に読む")],
    ["RFP出力工程の実在根拠を削除", replaceRule(baseline, "upstream", "RFP / 提案書ふうの体裁", "上流向けの体裁")],
    ["資料取込工程の実在根拠を削除", replaceRule(baseline, "fromSpec", "name: intent-from-spec", "name: removed-from-spec")],
    ["再利用を反転", replaceRule(baseline, "routing", "同じ項目を追加しない", "同じ項目を追加する")],
    ["既知の再質問防止を反転", replaceRule(baseline, "contract", "質問候補から外して聞き直さない", "質問候補へ戻して聞き直す")],
    ["食い違いの影響を削除", replaceRule(baseline, "contract", "`食い違い` または `成果を変える未決事項` を問うときは、回答による結果への影響を質問とともに示す", "食い違いをそのまま質問する")],
    ["部分承認を反転", replaceRule(baseline, "contract", "利用者が一部だけを承認した場合は、承認された範囲だけを", "利用者が一部だけを承認した場合も、候補全体を")],
    ["未承認の正本保護を反転", replaceRule(baseline, "contract", /正本へ書かない/g, "正本へ書く")],
    ["PoCの範囲限定を反転", replaceRule(baseline, "contract", "学ぶ対象を未決のまま保持し", "学ぶ対象を確定扱いにし")],
    ["公開前の影響範囲停止を反転", replaceRule(baseline, "contract", "影響する範囲だけを止める", "影響する範囲も通過させる")],
  ];
  for (const [label, mutated] of mutations) {
    assert.throws(() => validateAllJourneys(journeys, mutated), undefined, label);
  }
});

test("日本語dogfoodも同じ入力由来の旅程を通り、テンプレートとbyte一致する", () => {
  const journeys = parseJourneys(read(FIXTURE));
  for (const [tree, agent] of DOGFOOD) {
    validateAllJourneys(journeys, productDocuments("ja", agent, `${tree}/skills`));
    assert.equal(read(`${tree}/skills/CONTRACT.md`), read(`templates/ja/${agent}/skills/CONTRACT.md`));
    for (const rule of ["support-routing.md", "mode-selection.md"]) {
      assert.equal(read(`${tree}/skills/intent-discover/rules/${rule}`),
        read(`templates/ja/${agent}/skills/intent-discover/rules/${rule}`));
    }
  }
});
