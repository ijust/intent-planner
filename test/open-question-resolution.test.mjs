import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

// This feature is implemented as Markdown contracts. Keep the complete set of
// boundary checks in one table so later tests can attach the real source text
// without maintaining a second, partial route list.
const ROUTE_MATRIX = Object.freeze([
  route("discover.exit", "stage", "producer-exit", [
    "templates/{lang}/{agent}/skills/intent-discover/rules/designer-questions.md",
  ]),
  route("compass.entry", "stage", "consumer-entry", [
    "templates/{lang}/{agent}/skills/intent-compass/SKILL.md",
  ]),
  route("compass.exit", "stage", "producer-exit", [
    "templates/{lang}/{agent}/skills/intent-compass/rules/algo-qoc.md",
  ]),
  route("packets.entry", "stage", "consumer-entry", [
    "templates/{lang}/{agent}/skills/intent-packets/SKILL.md",
  ]),
  route("packets.exit", "stage", "producer-exit", [
    "templates/{lang}/{agent}/skills/intent-packets/rules/decision-slots.md",
    "templates/{lang}/{agent}/skills/intent-packets/rules/export-route.md",
  ]),
  route("exit.cc-sdd", "exit", "route-entry", [
    "templates/{lang}/{agent}/skills/intent-export-cc-sdd/rules/export-questions.md",
  ]),
  route("exit.openspec", "exit", "route-entry", [
    "templates/{lang}/{agent}/skills/intent-export-openspec/rules/export-questions.md",
  ]),
  route("exit.speckit", "exit", "route-entry", [
    "templates/{lang}/{agent}/skills/intent-export-speckit/rules/export-questions.md",
  ]),
  route("exit.nl-spec", "exit", "route-entry", [
    "templates/{lang}/{agent}/skills/intent-to-spec/SKILL.md",
  ]),
  route("exit.direct", "exit", "route-entry", [
    "templates/{lang}/{agent}/skills/intent-packets/rules/export-route.md",
    "templates/{lang}/agents/{surface}/{rootDoc}",
  ]),
  route("intent-plan", "orchestrator", "orchestrated-boundaries", [
    "templates/{lang}/{agent}/skills/intent-plan/SKILL.md",
    "templates/{lang}/{agent}/skills/intent-plan/generated/**",
  ]),
  route("implementation.entry", "implementation", "implementation-entry", [
    "templates/{lang}/intent/execution-contract.md",
    "templates/{lang}/agents/{surface}/{rootDoc}",
  ]),
  route("implementation.reentry", "implementation", "implementation-reentry", [
    "templates/{lang}/intent/execution-contract.md",
  ]),
]);

const REQUIRED_MEANINGS = Object.freeze([
  ["important-decision", /重要判断|important decision/i],
  ["answer-proposal", /回答案|proposed answer|answer proposal/i],
  ["human-decision", /人(?:が|の)決定|human decision/i],
  ["out-of-scope", /今回の範囲外|out[- ]of[- ]scope/i],
  ["explicit-continuation", /明示続行|explicit continuation/i],
  ["affected-scope-only", /影響範囲だけ|affected scope only/i],
]);

const FORBIDDEN_BEHAVIORS = Object.freeze([
  ["short-approval-is-continuation", /短い承認を明示続行として扱う|(?:shall|may|must|can|should) treat (?:a )?short approval as explicit continuation/i],
  ["unknown-link-stops-everything", /紐付け不能(?:だけ)?で案件全体を停止する|(?:shall|may|must|can|should) stop the entire project (?:only )?because (?:the )?link(?:age)? is unknown/i],
  ["continuation-erased-as-resolved", /明示続行を解決済みとして(?:扱う|消去する)|(?:shall|may|must|can|should) mark explicit continuation as resolved/i],
  ["bulk-migrate-untouched", /未接触(?:の旧項目)?を一括(?:変更|移行)する|(?:shall|may|must|can|should) bulk migrate untouched/i],
]);

const CHECKPOINT_MEANINGS = Object.freeze({
  "producer-exit": /終了時に確認|check at (?:the )?(?:producer )?exit/i,
  "consumer-entry": /開始時に確認|check at (?:the )?(?:consumer )?entry/i,
  "route-entry": /開始時に確認|check at (?:the )?route entry/i,
  "orchestrated-boundaries": /各工程の開始時と終了時に確認|check at every stage entry and exit/i,
  "implementation-entry": /実装開始時に確認|check at implementation entry/i,
  "implementation-reentry": /実装中.+discover.+compass.+packets|during implementation.+discover.+compass.+packets/is,
});

function route(id, group, checkpoint, sourcePatterns) {
  return Object.freeze({ id, group, checkpoint, sourcePatterns: Object.freeze(sourcePatterns) });
}

function makeRouteTable() {
  return ROUTE_MATRIX;
}

function contractViolations(text) {
  const violations = [];
  for (const [id, pattern] of REQUIRED_MEANINGS) {
    if (!pattern.test(text)) violations.push(`missing:${id}`);
  }
  for (const [id, pattern] of FORBIDDEN_BEHAVIORS) {
    if (pattern.test(text)) violations.push(`forbidden:${id}`);
  }
  return violations;
}

function routeViolations(routeDefinition, text) {
  if (!routeDefinition) return ["missing:route-definition"];
  if (typeof text !== "string" || text.trim() === "") return [`missing:route-source:${routeDefinition.id}`];

  const violations = contractViolations(text);
  const checkpointPattern = CHECKPOINT_MEANINGS[routeDefinition.checkpoint];
  if (!checkpointPattern) violations.push(`missing:checkpoint-oracle:${routeDefinition.checkpoint}`);
  else if (!checkpointPattern.test(text)) violations.push(`missing:checkpoint:${routeDefinition.id}`);
  return violations;
}

function injectMutation(source, search, replacement, label) {
  const mutated = source.replace(search, replacement);
  assert.notEqual(mutated, source, `${label}: mutation fixture must change the source`);
  return mutated;
}

function validFixture(routeDefinition) {
  const checkpoint = {
    "producer-exit": "終了時に確認する。",
    "consumer-entry": "開始時に確認する。",
    "route-entry": "開始時に確認する。",
    "orchestrated-boundaries": "各工程の開始時と終了時に確認する。",
    "implementation-entry": "実装開始時に確認する。",
    "implementation-reentry": "実装中の判断を discover、compass、packets へ戻す。",
  }[routeDefinition.checkpoint];
  return [
    checkpoint,
    "重要判断には回答案を示し、人が決定するまで確定しない。",
    "許される結果は、人の決定、今回の範囲外、明示続行である。",
    "未決の間は影響範囲だけを停止する。",
  ].join("\n");
}

test("全経路表は工程境界、五出口、intent-plan、実装入口・実装中を重複なく列挙する", () => {
  const routes = makeRouteTable();
  assert.equal(routes.length, 13);
  assert.equal(new Set(routes.map(({ id }) => id)).size, routes.length, "route ids are unique");
  assert.deepEqual(
    [...new Set(routes.filter(({ group }) => group === "stage").map(({ id }) => id.split(".")[0]))],
    ["discover", "compass", "packets"],
  );
  assert.deepEqual(
    routes.filter(({ group }) => group === "exit").map(({ id }) => id),
    ["exit.cc-sdd", "exit.openspec", "exit.speckit", "exit.nl-spec", "exit.direct"],
  );
  assert.deepEqual(
    routes.filter(({ group }) => group === "implementation").map(({ id }) => id),
    ["implementation.entry", "implementation.reentry"],
  );
  assert.ok(routes.some(({ id }) => id === "intent-plan"));
  for (const candidate of routes) {
    assert.ok(candidate.sourcePatterns.length > 0, `${candidate.id}: source ownership is declared`);
    assert.ok(CHECKPOINT_MEANINGS[candidate.checkpoint], `${candidate.id}: checkpoint oracle exists`);
  }
});

test("共通 helper は全経路の正しい契約 fixture を受け入れる", () => {
  for (const candidate of makeRouteTable()) {
    assert.deepEqual(routeViolations(candidate, validFixture(candidate)), [], candidate.id);
  }
});

test("未実装の経路は経路固有の欠落として検出される", () => {
  for (const candidate of makeRouteTable()) {
    assert.deepEqual(
      routeViolations(candidate, ""),
      [`missing:route-source:${candidate.id}`],
      candidate.id,
    );
  }
  assert.deepEqual(routeViolations(undefined, ""), ["missing:route-definition"]);
});

const DISCOVER_EXIT_RULES = Object.freeze([
  ["ja/claude", "templates/ja/claude/skills/intent-discover/rules/designer-questions.md", "ja"],
  ["ja/codex", "templates/ja/codex/skills/intent-discover/rules/designer-questions.md", "ja"],
  ["en/claude", "templates/en/claude/skills/intent-discover/rules/designer-questions.md", "en"],
  ["en/codex", "templates/en/codex/skills/intent-discover/rules/designer-questions.md", "en"],
]);

const DISCOVER_EXIT_MEANINGS = Object.freeze({
  ja: [
    ["終了時確認", /discover の終了時に確認/s],
    ["次工程への影響", /次工程へ影響する重要判断/s],
    ["回答案と停止範囲", /回答案.+理由.+推奨を変える条件.+停止範囲.+影響(?:する|を受ける)根拠/s],
    ["許される結果", /決定.+今回の範囲外.+範囲限定の明示続行/s],
    ["影響範囲を渡さない", /いずれかを得るまで.+影響範囲.+次工程へ渡さない/s],
    ["軽微な未決は継続", /重要判断ではない.+「後で確認」「不明」.+従来どおり.+進行/s],
    ["重要判断では継続扱いにしない", /重要判断.+「後で確認」「不明」.+進行許可.+扱わない/s],
    ["無関係な作業は継続", /停止範囲に含まれない.+作業.+継続/s],
  ],
  en: [
    ["exit check", /check at the discover exit/is],
    ["downstream effect", /important decision.+affects the next stage/is],
    ["proposal and stop scope", /answer proposal.+rationale.+condition that would change the recommendation.+stop scope.+evidence/is],
    ["allowed outcomes", /decision.+out-of-scope for this work.+scope-limited explicit continuation/is],
    ["do not hand off affected scope", /until one of these outcomes.+do not hand off.+affected scope.+next stage/is],
    ["minor unresolved work continues", /not an important decision.+“check later”.+“unknown”.+continue.+as before/is],
    ["important decision is not progress permission", /important decision.+“check later”.+“unknown”.+not.+permission to proceed/is],
    ["unrelated work continues", /outside the stop scope.+continue/is],
  ],
});

test("discover の終了時は重要判断だけを止め、重要でない未決事項は従来どおり進める", () => {
  for (const [label, relativePath, language] of DISCOVER_EXIT_RULES) {
    const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    for (const [meaning, pattern] of DISCOVER_EXIT_MEANINGS[language]) {
      assert.match(text, pattern, `${label}: ${meaning}`);
    }
  }
});

const COMPASS_BOUNDARY_RULES = Object.freeze([
  ["ja/claude", "templates/ja/claude/skills/intent-compass/SKILL.md", "templates/ja/claude/skills/intent-compass/rules/algo-qoc.md", "ja"],
  ["ja/codex", "templates/ja/codex/skills/intent-compass/SKILL.md", "templates/ja/codex/skills/intent-compass/rules/algo-qoc.md", "ja"],
  ["en/claude", "templates/en/claude/skills/intent-compass/SKILL.md", "templates/en/claude/skills/intent-compass/rules/algo-qoc.md", "en"],
  ["en/codex", "templates/en/codex/skills/intent-compass/SKILL.md", "templates/en/codex/skills/intent-compass/rules/algo-qoc.md", "en"],
]);

const COMPASS_ENTRY_MEANINGS = Object.freeze({
  ja: [
    ["開始時確認", /compass の開始時に確認/s],
    ["discover からの持ち越し", /discover から持ち越された重要判断/s],
    ["記録だけでは進行不可", /Open Question へ移しただけ.+停止解除.+みなさない/s],
    ["入口単独ではない", /discover の終了時確認.+済んでいても.+開始時確認.+省略しない/s],
    ["影響範囲だけ停止", /許された結果.+得るまで.+影響範囲だけ.+Compass の構築.+開始しない/s],
    ["解決後の限定再開", /解決後.+影響する成果物.+確認.+範囲だけ.+再開/s],
  ],
  en: [
    ["entry check", /check at the compass entry/is],
    ["carryover from discover", /important decision.+carried over from discover/is],
    ["recording is not permission", /moving.+Open Question alone.+does not release.+stop/is],
    ["entry is independent", /even if the discover exit check.+completed.+do not skip.+entry check/is],
    ["affected scope only", /until an allowed outcome.+obtained.+do not start.+Compass construction.+affected scope/is],
    ["bounded resume", /after resolution.+recheck.+affected artifacts.+resume only.+scope/is],
  ],
});

const COMPASS_EXIT_MEANINGS = Object.freeze({
  ja: [
    ["終了時確認", /compass の終了時に確認/s],
    ["Compass からの持ち越し", /Compass から次工程へ持ち越される重要判断/s],
    ["保留だけでは進行不可", /保留.+Open Question へ移しただけ.+停止解除.+みなさない/s],
    ["出口単独ではない", /開始時確認.+済んでいても.+終了時確認.+省略しない/s],
    ["影響範囲を渡さない", /許された結果.+得るまで.+影響範囲.+次工程へ渡さない/s],
    ["解決後の限定再開", /解決後.+影響する成果物.+確認.+範囲だけ.+再開/s],
  ],
  en: [
    ["exit check", /check at the compass exit/is],
    ["carryover from Compass", /important decision.+carried from the Compass to the next stage/is],
    ["deferral is not permission", /deferring.+moving.+Open Question alone.+does not release.+stop/is],
    ["exit is independent", /even if the entry check.+completed.+do not skip.+exit check/is],
    ["do not hand off affected scope", /until an allowed outcome.+obtained.+do not hand off.+affected scope.+next stage/is],
    ["bounded resume", /after resolution.+recheck.+affected artifacts.+resume only.+scope/is],
  ],
});

test("compass は開始時と終了時の両方で重要判断を確認する", () => {
  for (const [label, entryPath, exitPath, language] of COMPASS_BOUNDARY_RULES) {
    const entry = fs.readFileSync(path.join(ROOT, entryPath), "utf8");
    const exit = fs.readFileSync(path.join(ROOT, exitPath), "utf8");
    for (const [meaning, pattern] of COMPASS_ENTRY_MEANINGS[language]) {
      assert.match(entry, pattern, `${label} entry: ${meaning}`);
    }
    for (const [meaning, pattern] of COMPASS_EXIT_MEANINGS[language]) {
      assert.match(exit, pattern, `${label} exit: ${meaning}`);
    }
  }
});

test("compass の入口か出口の片方を削ると二重確認を満たさない", () => {
  const [label, entryPath, exitPath] = COMPASS_BOUNDARY_RULES[0];
  const entry = fs.readFileSync(path.join(ROOT, entryPath), "utf8");
  const exit = fs.readFileSync(path.join(ROOT, exitPath), "utf8");
  assert.ok(COMPASS_ENTRY_MEANINGS.ja.every(([, pattern]) => pattern.test(entry)), `${label}: entry baseline`);
  assert.ok(COMPASS_EXIT_MEANINGS.ja.every(([, pattern]) => pattern.test(exit)), `${label}: exit baseline`);

  const withoutEntry = injectMutation(entry, "compass の開始時に確認", "compass の対象を確認", "compass entry deletion");
  const withoutExit = injectMutation(exit, "compass の終了時に確認", "compass の対象を確認", "compass exit deletion");
  assert.equal(COMPASS_ENTRY_MEANINGS.ja.every(([, pattern]) => pattern.test(withoutEntry)), false);
  assert.equal(COMPASS_EXIT_MEANINGS.ja.every(([, pattern]) => pattern.test(withoutExit)), false);
});

test("必須意味の削除と禁止動作への反転を、注入確認後に拒否する", () => {
  const candidate = makeRouteTable().find(({ id }) => id === "exit.cc-sdd");
  const baseline = validFixture(candidate);
  assert.deepEqual(routeViolations(candidate, baseline), []);

  const withoutProposal = injectMutation(
    baseline,
    "重要判断には回答案を示し",
    "重要判断を示し",
    "answer proposal deletion",
  );
  assert.ok(routeViolations(candidate, withoutProposal).includes("missing:answer-proposal"));

  const shortApproval = injectMutation(
    baseline,
    "未決の間は影響範囲だけを停止する。",
    "短い承認を明示続行として扱う。未決の間は影響範囲だけを停止する。",
    "short approval expansion",
  );
  assert.ok(routeViolations(candidate, shortApproval).includes("forbidden:short-approval-is-continuation"));

  const globalStop = injectMutation(
    baseline,
    "未決の間は影響範囲だけを停止する。",
    "紐付け不能で案件全体を停止する。",
    "unknown linkage global stop",
  );
  const globalStopViolations = routeViolations(candidate, globalStop);
  assert.ok(globalStopViolations.includes("missing:affected-scope-only"));
  assert.ok(globalStopViolations.includes("forbidden:unknown-link-stops-everything"));

  const erasedContinuation = injectMutation(
    baseline,
    "未決の間は影響範囲だけを停止する。",
    "明示続行を解決済みとして扱う。未決の間は影響範囲だけを停止する。",
    "explicit continuation erasure",
  );
  assert.ok(routeViolations(candidate, erasedContinuation).includes("forbidden:continuation-erased-as-resolved"));

  const bulkMigration = injectMutation(
    baseline,
    "未決の間は影響範囲だけを停止する。",
    "未接触の旧項目を一括移行する。未決の間は影響範囲だけを停止する。",
    "untouched legacy bulk migration",
  );
  assert.ok(routeViolations(candidate, bulkMigration).includes("forbidden:bulk-migrate-untouched"));

  const withoutEntryCheck = injectMutation(
    baseline,
    "開始時に確認する。",
    "対象を確認する。",
    "route entry check deletion",
  );
  assert.ok(routeViolations(candidate, withoutEntryCheck).includes("missing:checkpoint:exit.cc-sdd"));
});

const DISTRIBUTED_CONTRACTS = Object.freeze([
  ["ja/claude", "templates/ja/claude/skills/CONTRACT.md", "ja"],
  ["ja/codex", "templates/ja/codex/skills/CONTRACT.md", "ja"],
  ["en/claude", "templates/en/claude/skills/CONTRACT.md", "en"],
  ["en/codex", "templates/en/codex/skills/CONTRACT.md", "en"],
]);

const DECISION_CONTRACT_MEANINGS = Object.freeze({
  ja: [
    ["重要判断の分類", /目的・対象者・成果・範囲・受入条件・守る約束・外部契約・後戻りが難しい変更・複数 packet への影響/],
    ["軽微な判断", /合意済みの範囲内.+局所.+元に戻しやす.+受入条件や複数 packet を変えない/s],
    ["回答案の三要素", /暫定回答案.+理由.+推奨を変える条件/s],
    ["複数案と推奨", /実質的に異なる選択肢.+主な違い.+推奨案/s],
    ["暫定扱い", /利用者が.+採用または修正.+確定内容として扱わない/s],
    ["proposals off の例外", /`proposals: off`.+重要判断.+回答案.+省略しない/s],
    ["許される結果", /決定.+今回の範囲外.+範囲限定の明示続行/s],
    ["停止解除の限定", /(?:この3つ|三つ).+だけ.+停止.+解除/s],
    ["短い承認の禁止", /「OK」「次」.+明示続行.+(?:扱わない|読み替えない)/s],
    ["一覧だけの一括承認", /一覧.+一括承認.+一覧に含まれる項目だけ/s],
  ],
  en: [
    ["important classification", /purpose, audience, outcome, scope, acceptance criteria, promises to preserve, external contracts, hard-to-reverse changes, or effects on multiple packets/i],
    ["minor decision", /within the agreed scope.+local.+easy to reverse.+does not change acceptance criteria or multiple packets/is],
    ["proposal evidence", /provisional answer proposal.+rationale.+condition that would change the recommendation/is],
    ["options and recommendation", /materially different options.+main differences.+recommended option/is],
    ["provisional status", /user adopts or revises.+not treat.+confirmed content/is],
    ["proposals off exception", /`proposals: off`.+important decision.+must not omit.+answer proposal/is],
    ["allowed outcomes", /decision.+out-of-scope for this work.+scope-limited explicit continuation/is],
    ["release is limited", /only these three.+release.+stop/is],
    ["short approval prohibition", /bare (?:“OK”|"OK").+(?:“next”|"next").+(?:is neither|not).+explicit continuation/is],
    ["bounded bulk approval", /bulk approval.+visible list.+only the items in that list/is],
  ],
});

const OPEN_QUESTION_RECORD_MEANINGS = Object.freeze({
  ja: [
    ["既存形式の拡張", /既存の Open Question 項目.+重要.+必要な欄.+追加/s],
    ["決定期限と担当工程", /決定期限.+担当工程/s],
    ["暫定回答案の根拠", /暫定回答案.+理由.+推奨を変える条件/s],
    ["明示続行の必須項目", /続行日.+対象項目.+許可(?:する|された)作業範囲.+残る危険.+再確認条件/s],
    ["確定内容への移動", /決定.+確定内容.+移し.+Open Question.+重複.+(?:残さない|保持しない)/s],
    ["範囲外の後続先", /今回の範囲外.+後続先/s],
    ["明示続行は未決", /明示続行.+未決のまま.+保持/s],
    ["触れた旧項目だけ分類", /今回.+触れた.+重要.+既存 Open Question.+決定期限あり.+後続工程が担当.+今回の範囲外/s],
    ["未接触項目を移行しない", /触れていない.*既存 Open Questions.+一括(?:変更|移行).+(?:しない|行わない)/s],
    ["parser を作らない", /parser.+新設しない/s],
  ],
  en: [
    ["extend existing format", /add the required fields.+existing Open Question item.+important/is],
    ["deadline and owning stage", /decision deadline.+owning stage/is],
    ["proposal evidence", /provisional answer proposal.+rationale.+condition that would change the recommendation/is],
    ["continuation details", /continuation date.+item.+authorized work scope.+remaining risk.+revisit condition/is],
    ["move resolved answer", /decision.+move.+confirmed content.+do not.+duplicat.+Open Question/is],
    ["out-of-scope destination", /out-of-scope for this work.+follow-up destination/is],
    ["continuation stays unresolved", /explicit continuation.+keep.+unresolved/is],
    ["classify touched legacy only", /important existing Open Question.+touched.+decision deadline.+owned by a later stage.+out-of-scope for this work/is],
    ["do not migrate untouched", /untouched existing Open Questions.+(?:must not be|do not|never).+bulk (?:change|migrat)/is],
    ["no parser", /do not introduce.+parser/is],
  ],
});

const AFFECTED_SCOPE_MEANINGS = Object.freeze({
  ja: [
    ["影響根拠から範囲を求める", /intent.+判断基準.+packet.+編集対象.+(?:根拠|関係).+(?:停止範囲|影響範囲).+(?:求める|決める)/s],
    ["範囲と根拠を提示", /停止(?:する)?範囲.+根拠.+利用者.+提示/s],
    ["複数対象だけを停止", /複数.+intent.+判断基準.+packet.+列挙.+対象だけ.+停止/s],
    ["紐付け不能時の最小停止", /紐付け(?:先)?(?:を)?(?:確定|特定)できない.+現在の項目.+現在の packet または編集対象.+案件全体.+停止しない/s],
    ["無関係な作業は継続", /停止対象に含まれない packet.+並行作業.+継続.+妨げない/s],
    ["明示続行の許可範囲", /明示続行.+許可された項目と範囲.+限.+継続/s],
    ["根拠変更時の再計算", /根拠.+変わ.+停止範囲.+(?:見直|再計算).+無関係.+(?:解放|停止し続けない)/s],
    ["限定再開と根拠提示", /再開.+範囲.+根拠.+利用者.+提示/s],
  ],
  en: [
    ["derive scope from evidence", /intent.+decision criteria.+packet.+edit target.+evidence.+(?:stop|affected) scope.+(?:derive|determine)/is],
    ["show scope and evidence", /present.+(?:stop|stopped) scope.+evidence.+user/is],
    ["stop enumerated targets only", /multiple intents.+decision criteria.+packets.+enumerate.+stop only/is],
    ["minimum fallback scope", /cannot (?:determine|identify).+link.+current item.+current packet or edit target.+do not stop the entire (?:case|project)/is],
    ["unrelated work continues", /packets? outside the stopped scope.+parallel work.+continue/is],
    ["explicit continuation remains bounded", /explicit continuation.+only.+authorized item and scope.+continue/is],
    ["recalculate after evidence changes", /evidence changes.+recalculate.+stop scope.+release.+unrelated/is],
    ["show resumed scope and evidence", /present.+resumed scope.+evidence.+user/is],
  ],
});

test("配布正本は重要判断と軽微で元に戻しやすい判断を同じ条件で区別する", () => {
  for (const [label, relativePath, language] of DISTRIBUTED_CONTRACTS) {
    const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    for (const [meaning, pattern] of DECISION_CONTRACT_MEANINGS[language]) {
      assert.match(text, pattern, `${label}: ${meaning}`);
    }
  }
});

test("重要判断の停止解除は三つの結果だけで、短い承認や通常の提案設定に読み広げない", () => {
  for (const [label, relativePath, language] of DISTRIBUTED_CONTRACTS) {
    const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    if (language === "ja") {
      assert.doesNotMatch(text, /`proposals: off` のときは重要判断の回答案を省略する/, `${label}: off must not suppress important proposals`);
      assert.doesNotMatch(text, /「OK」「次」を明示続行として扱う(?:。|$)/m, `${label}: short approval must not authorize continuation`);
    } else {
      assert.doesNotMatch(text, /with `proposals: off`, omit the answer proposal for an important decision/i, `${label}: off must not suppress important proposals`);
      assert.doesNotMatch(text, /treat (?:“OK”|"OK") or (?:“next”|"next") as explicit continuation/i, `${label}: short approval must not authorize continuation`);
    }
  }
});

test("重要な Open Question は期限・担当・回答案・明示続行を一つの既存記録で読める", () => {
  for (const [label, relativePath, language] of DISTRIBUTED_CONTRACTS) {
    const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    for (const [meaning, pattern] of OPEN_QUESTION_RECORD_MEANINGS[language]) {
      assert.match(text, pattern, `${label}: ${meaning}`);
    }
  }
});

test("決定・範囲外・明示続行は重複や解決済みへの読み替えを起こさない", () => {
  for (const [label, relativePath, language] of DISTRIBUTED_CONTRACTS) {
    const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    if (language === "ja") {
      assert.match(text, /決定.+確定内容.+Open Question.+重複.+残さない/s, `${label}: decided content must move without duplication`);
      assert.match(text, /今回の範囲外.+後続先/s, `${label}: out-of-scope content must name its destination`);
      assert.match(text, /明示続行.+未決のまま.+保持/s, `${label}: continuation must remain unresolved`);
      assert.doesNotMatch(text, /明示続行[^\n]+(?:回答済み|解決済み)[^\n]+(?:扱う|消去する)/, `${label}: continuation must remain unresolved`);
      assert.doesNotMatch(text, /触れていない[^\n]*既存 Open Questions[^\n]+一括(?:変更|移行)する/, `${label}: untouched records must remain untouched`);
    } else {
      assert.match(text, /decision.+move.+confirmed content.+do not.+duplicat.+Open Question/is, `${label}: decided content must move without duplication`);
      assert.match(text, /out-of-scope for this work.+follow-up destination/is, `${label}: out-of-scope content must name its destination`);
      assert.match(text, /explicit continuation.+keep.+unresolved/is, `${label}: continuation must remain unresolved`);
      assert.doesNotMatch(text, /(?:mark|treat)[^\n]+explicit continuation[^\n]+resolved/i, `${label}: continuation must remain unresolved`);
      assert.doesNotMatch(text, /bulk (?:change|migrat\w*)[^\n]+untouched existing Open Questions/i, `${label}: untouched records must remain untouched`);
    }
  }
});

test("配布正本は根拠が示す影響範囲だけを停止・再開する", () => {
  for (const [label, relativePath, language] of DISTRIBUTED_CONTRACTS) {
    const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    for (const [meaning, pattern] of AFFECTED_SCOPE_MEANINGS[language]) {
      assert.ok(pattern.test(text), `${label}: ${meaning}`);
    }
  }
});

test("紐付け不能でも案件全体を止めず、無関係な作業を継続できる", () => {
  for (const [label, relativePath, language] of DISTRIBUTED_CONTRACTS) {
    const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    if (language === "ja") {
      assert.doesNotMatch(text, /紐付け(?:先)?(?:を)?(?:確定|特定)できない[^\n]+案件全体を停止する/, `${label}: unknown linkage must not stop the whole case`);
      assert.ok(/停止対象に含まれない packet.+並行作業.+継続.+妨げない/s.test(text), `${label}: unrelated work must continue`);
    } else {
      assert.doesNotMatch(text, /cannot (?:determine|identify)[^\n]+link[^\n]+(?:must|shall|will) stop the entire (?:case|project)/i, `${label}: unknown linkage must not stop the whole case`);
      assert.ok(/packets? outside the stopped scope.+parallel work.+continue/is.test(text), `${label}: unrelated work must continue`);
    }
  }
});

const PACKETS_BOUNDARY_RULES = Object.freeze([
  ["ja/claude", "templates/ja/claude/skills/intent-packets/SKILL.md", "templates/ja/claude/skills/intent-packets/rules/decision-slots.md", "templates/ja/claude/skills/intent-packets/rules/export-route.md", "ja"],
  ["ja/codex", "templates/ja/codex/skills/intent-packets/SKILL.md", "templates/ja/codex/skills/intent-packets/rules/decision-slots.md", "templates/ja/codex/skills/intent-packets/rules/export-route.md", "ja"],
  ["en/claude", "templates/en/claude/skills/intent-packets/SKILL.md", "templates/en/claude/skills/intent-packets/rules/decision-slots.md", "templates/en/claude/skills/intent-packets/rules/export-route.md", "en"],
  ["en/codex", "templates/en/codex/skills/intent-packets/SKILL.md", "templates/en/codex/skills/intent-packets/rules/decision-slots.md", "templates/en/codex/skills/intent-packets/rules/export-route.md", "en"],
]);

const PACKETS_BOUNDARY_MEANINGS = Object.freeze({
  ja: {
    entry: [
      ["開始時確認", /packets の開始時に確認/s],
      ["Tree と Compass の持ち越し", /Tree と Compass から持ち越された重要判断/s],
      ["別セッションでも確認", /別セッション.+packet から開始.+省略しない/s],
    ],
    slots: [
      ["重要な未定は ready 不可", /重要判断.+未定.+packet.+`?ready`? にしない/s],
      ["対象と影響根拠を提示", /対象 packet.+影響(?:する|を受ける)根拠.+提示/s],
      ["三つの許可結果", /決定.+今回の範囲外.+範囲限定の明示続行/s],
      ["無関係な packet は継続", /無関係な packet.+ready.+export.+継続/s],
      ["重要でない未定は停止しない", /重要判断ではない.*未定.+停止理由にしない/s],
    ],
    route: [
      ["出口選択前確認", /出口選択前に確認/s],
      ["packet 起点でも確認", /packet.+別セッション.+開始.+確認.+省略しない/s],
      ["影響 packet だけ export 不可", /許された結果.+得るまで.*影響(?:する|を受ける) packet.+export 対象にしない/s],
      ["解決後の限定再開", /影響する成果物.+再確認.+影響範囲だけ.+再開/s],
    ],
  },
  en: {
    entry: [
      ["entry check", /check at the packets entry/is],
      ["Tree and Compass carryover", /important decisions?.+carried over from the Tree and Compass/is],
      ["separate session check", /separate session.+starts from (?:an existing )?packet.+do not skip/is],
    ],
    slots: [
      ["important undecided is not ready", /important decision.+undecided.+do not mark.+packet.+`?ready`?/is],
      ["target and evidence", /present.+affected packet.+evidence/is],
      ["three allowed outcomes", /decision.+out-of-scope for this work.+scope-limited explicit continuation/is],
      ["unrelated packets continue", /unrelated packets?.+(?:continue.+ready.+export|ready.+export.+continue)/is],
      ["non-important undecided does not stop", /not an important decision.+undecided.+not.+reason to stop/is],
    ],
    route: [
      ["pre-route check", /check before selecting an exit/is],
      ["packet start check", /starts?.+packet.+separate session.+do not skip.+check/is],
      ["affected packets only excluded", /until an allowed outcome.+obtained.+affected packets?.+not eligible for export/is],
      ["bounded resume", /recheck.+affected artifacts.+resume only.+affected scope/is],
    ],
  },
});

test("packets は開始時、ready 化前、出口選択前に重要判断を確認する", () => {
  for (const [label, skillPath, slotsPath, routePath, language] of PACKETS_BOUNDARY_RULES) {
    const sources = {
      entry: fs.readFileSync(path.join(ROOT, skillPath), "utf8"),
      slots: fs.readFileSync(path.join(ROOT, slotsPath), "utf8"),
      route: fs.readFileSync(path.join(ROOT, routePath), "utf8"),
    };
    for (const [source, checks] of Object.entries(PACKETS_BOUNDARY_MEANINGS[language])) {
      for (const [meaning, pattern] of checks) {
        assert.match(sources[source], pattern, `${label} ${source}: ${meaning}`);
      }
    }
  }
});

test("packets の重要判断だけが影響する packet の ready と export を止める", () => {
  const [, skillPath, slotsPath, routePath] = PACKETS_BOUNDARY_RULES[0];
  const combined = [skillPath, slotsPath, routePath]
    .map((relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8"))
    .join("\n");
  assert.match(combined, /重要判断.+未定.+packet.+`?ready`? にしない/s);
  assert.match(combined, /無関係な packet.+ready.+export.+継続/s);

  const baseline = fs.readFileSync(path.join(ROOT, skillPath), "utf8");

  const withoutReadyGate = injectMutation(
    baseline,
    "重要判断に当たる未定スロットが残る packet は `ready` にしない",
    "未定スロットが残る packet も `ready` にする",
    "packets ready gate deletion",
  );
  assert.doesNotMatch(withoutReadyGate, /重要判断.+未定.+packet.+`?ready`? にしない/s);
});

const EXTERNAL_EXPORT_ROUTE_RULES = Object.freeze(
  ["cc-sdd", "openspec", "speckit"].flatMap((routeName) => [
    [`${routeName}/ja/claude`, `templates/ja/claude/skills/intent-export-${routeName}/rules/export-questions.md`, "ja"],
    [`${routeName}/ja/codex`, `templates/ja/codex/skills/intent-export-${routeName}/rules/export-questions.md`, "ja"],
    [`${routeName}/en/claude`, `templates/en/claude/skills/intent-export-${routeName}/rules/export-questions.md`, "en"],
    [`${routeName}/en/codex`, `templates/en/codex/skills/intent-export-${routeName}/rules/export-questions.md`, "en"],
  ]),
);

const EXTERNAL_EXPORT_ROUTE_MEANINGS = Object.freeze({
  ja: [
    ["開始時確認", /export の開始時に.*確認/s],
    ["三つの確認元", /Intent Tree.+Intent Compass.+対象 packet/s],
    ["重要判断の分類", /重要判断.+分類/s],
    ["回答案と根拠", /暫定回答案.+理由.+推奨を変える条件/s],
    ["三つの許可結果", /決定.+今回の範囲外.+範囲限定の明示続行/s],
    ["影響範囲だけ停止", /いずれかを得るまで.+影響範囲だけ.+export.+開始しない/s],
    ["一般 OQ は継続可能", /重要判断ではない.*Open Question.*従来どおり.*続行/s],
    ["外部ツールは対象外", /外部.+(?:spec|仕様).+ツール.+変更しない/s],
  ],
  en: [
    ["entry check", /check[^\n.]*at the start of the export/is],
    ["three sources", /Intent Tree.+Intent Compass.+selected packet/is],
    ["important classification", /classif.+important decision/is],
    ["proposal evidence", /provisional answer proposal.+rationale.+condition that would change the recommendation/is],
    ["three allowed outcomes", /decision.+out-of-scope for this work.+scope-limited explicit continuation/is],
    ["affected scope only", /until one of these outcomes.+do not start.+export.+affected scope/is],
    ["ordinary OQs continue", /Open Question.+not an important decision.+continue.+as before/is],
    ["external tool boundary", /do not change.+external spec tool/is],
  ],
});

test("三つの外部 spec 出口は開始時に Tree、Compass、対象 packet の重要判断を確認する", () => {
  for (const [label, relativePath, language] of EXTERNAL_EXPORT_ROUTE_RULES) {
    const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    for (const [meaning, pattern] of EXTERNAL_EXPORT_ROUTE_MEANINGS[language]) {
      assert.match(text, pattern, `${label}: ${meaning}`);
    }
  }
});

test("外部 spec 出口では一般的な Open Question は継続でき、重要判断だけが影響範囲を止める", () => {
  for (const [label, relativePath, language] of EXTERNAL_EXPORT_ROUTE_RULES) {
    const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    if (language === "ja") {
      const importantDecisionSection = text.match(/1\. \*\*重要判断がある場合\*\*[\s\S]*?(?=\n\s*2\. \*\*)/)?.[0] ?? "";
      assert.match(text, /重要判断ではない.*Open Question.*従来どおり.*続行/s, `${label}: ordinary questions continue`);
      assert.doesNotMatch(importantDecisionSection, /このまま続行.+export を実行/s, `${label}: important decision must not bypass the gate`);
    } else {
      const importantDecisionSection = text.match(/1\. \*\*When there is an important decision\*\*[\s\S]*?(?=\n\s*2\. \*\*)/i)?.[0] ?? "";
      assert.match(text, /Open Question.+not an important decision.+continue.+as before/is, `${label}: ordinary questions continue`);
      assert.doesNotMatch(importantDecisionSection, /proceed as is.+run the export/is, `${label}: important decision must not bypass the gate`);
    }
  }
});

test("日本語 dogfood の三出口ルールは日本語 Codex 配布正本と一致する", () => {
  for (const routeName of ["cc-sdd", "openspec", "speckit"]) {
    const canonical = fs.readFileSync(
      path.join(ROOT, `templates/ja/codex/skills/intent-export-${routeName}/rules/export-questions.md`),
      "utf8",
    );
    const dogfood = fs.readFileSync(
      path.join(ROOT, `.agents/skills/intent-export-${routeName}/rules/export-questions.md`),
      "utf8",
    );
    assert.equal(dogfood, canonical, `${routeName}: Japanese dogfood must be synchronized`);
  }
});
