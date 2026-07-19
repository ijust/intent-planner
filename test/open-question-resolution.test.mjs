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
