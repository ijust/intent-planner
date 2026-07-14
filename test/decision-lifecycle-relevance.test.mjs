// pkt-20260713-decision-lifecycle-relevance-y2qi
//
// lifecycle / relevance contract の test-local oracle。製品 runtime や
// canonical data を変更せず、後続 task が配布 contract へ接続する前の
// 判別ケースと変異対を固定する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

const QOC_RULE_PATHS = {
  jaClaude: "templates/ja/claude/skills/intent-compass/rules/algo-qoc.md",
  jaCodex: "templates/ja/codex/skills/intent-compass/rules/algo-qoc.md",
  enClaude: "templates/en/claude/skills/intent-compass/rules/algo-qoc.md",
  enCodex: "templates/en/codex/skills/intent-compass/rules/algo-qoc.md",
  dogfoodClaude: ".claude/skills/intent-compass/rules/algo-qoc.md",
  dogfoodCodex: ".agents/skills/intent-compass/rules/algo-qoc.md",
};

const EXECUTION_CONTRACT_PATHS = {
  jaTemplate: "templates/ja/intent/execution-contract.md",
  enTemplate: "templates/en/intent/execution-contract.md",
  dogfood: ".intent/execution-contract.md",
};

const IMPROVE_RULE_PATHS = {
  jaClaude: "templates/ja/claude/skills/intent-improve/rules/improve-axes.md",
  jaCodex: "templates/ja/codex/skills/intent-improve/rules/improve-axes.md",
  enClaude: "templates/en/claude/skills/intent-improve/rules/improve-axes.md",
  enCodex: "templates/en/codex/skills/intent-improve/rules/improve-axes.md",
  dogfoodClaude: ".claude/skills/intent-improve/rules/improve-axes.md",
  dogfoodCodex: ".agents/skills/intent-improve/rules/improve-axes.md",
};

const STATUS_RULE_PATHS = {
  jaClaude: "templates/ja/claude/skills/intent-status/rules/decision-table.md",
  jaCodex: "templates/ja/codex/skills/intent-status/rules/decision-table.md",
  enClaude: "templates/en/claude/skills/intent-status/rules/decision-table.md",
  enCodex: "templates/en/codex/skills/intent-status/rules/decision-table.md",
  dogfoodClaude: ".claude/skills/intent-status/rules/decision-table.md",
  dogfoodCodex: ".agents/skills/intent-status/rules/decision-table.md",
};

const VALIDATE_RULE_PATHS = {
  jaClaude: "templates/ja/claude/skills/intent-validate/rules/validate-checks.md",
  jaCodex: "templates/ja/codex/skills/intent-validate/rules/validate-checks.md",
  enClaude: "templates/en/claude/skills/intent-validate/rules/validate-checks.md",
  enCodex: "templates/en/codex/skills/intent-validate/rules/validate-checks.md",
  dogfoodClaude: ".claude/skills/intent-validate/rules/validate-checks.md",
  dogfoodCodex: ".agents/skills/intent-validate/rules/validate-checks.md",
};

const STATUS_BASELINE_ROW_NUMBERS = Array.from({ length: 14 }, (_, index) => String(index + 1));
const STATUS_BASELINE_ROW_HASHES = {
  ja: "9a3451041477c48abad126bd4d95c483691a4cff7f1c56f3b200e4c1e9d7f3ca",
  en: "309b9f4bf9afd5804fb52d5566426d613037772ada68aa94dfd38550bee45fc7",
};

function readQocRule(path) {
  return fs.readFileSync(path, "utf8");
}

const FIXTURES = [
  { id: "active-relevant", status: "active", relevance: "relevant", revisitSatisfied: false, expected: "pull" },
  { id: "active-irrelevant", status: "active", relevance: "irrelevant", revisitSatisfied: false, expected: "exclude" },
  { id: "superseded", status: "superseded", relevance: "relevant", revisitSatisfied: false, expected: "exclude" },
  { id: "revisit-satisfied", status: "active", relevance: "relevant", revisitSatisfied: true, expected: "revisit" },
  { id: "relevance-unknown", status: "active", relevance: "unknown", revisitSatisfied: false, expected: "confirm" },
];

function createOracle() {
  return {
    evaluate(fixture) {
      if (fixture.status === "superseded" || fixture.status === "archive") return "exclude";
      if (fixture.status !== "active") return "confirm";
      if (fixture.relevance === "unknown" || fixture.relevance == null) return "confirm";
      if (fixture.relevance === "irrelevant") return "exclude";
      if (fixture.relevance !== "relevant") return "confirm";
      return fixture.revisitSatisfied ? "revisit" : "pull";
    },
  };
}

function createSubject() {
  const oracle = createOracle();
  return {
    outcomes: Object.fromEntries(FIXTURES.map((fixture) => [fixture.id, oracle.evaluate(fixture)])),
    binding: {
      preference: "preference-heuristic",
      packetConstraint: "packet-constraint",
      unknown: "confirm",
    },
    lifecycle: {
      revisitMutatesCanonical: false,
      revisitStopsExport: false,
      preserveHistory: true,
      revisitBundle: ["old-decision", "new-fact", "matched-condition", "qoc-entry"],
    },
    compat: {
      legacyFourFieldDecisionValid: true,
      legacyFallback: true,
      autoMigrates: false,
    },
    invariantReconciliation: {
      options: ["decision", "packet", "supersede"],
      mutatesOriginal: false,
    },
    validation: {
      mode: "read-only",
      severity: "warn-only",
    },
  };
}

function collectViolations(subject) {
  const violations = [];
  const rejectUnless = (condition, id) => {
    if (!condition) violations.push(id);
  };

  rejectUnless(subject.binding.preference === "preference-heuristic", "binding.preference-promoted");
  rejectUnless(subject.binding.packetConstraint === "packet-constraint", "binding.packet-promoted");
  rejectUnless(subject.binding.unknown === "confirm", "binding.unknown-promoted");
  rejectUnless(subject.outcomes["active-relevant"] === "pull", "relevance.active-relevant-dropped");
  rejectUnless(subject.outcomes["active-irrelevant"] === "exclude", "relevance.irrelevant-pulled");
  rejectUnless(subject.outcomes.superseded === "exclude", "relevance.superseded-pulled");
  rejectUnless(subject.outcomes["relevance-unknown"] === "confirm", "relevance.unknown-silenced");
  rejectUnless(subject.outcomes["revisit-satisfied"] === "revisit", "lifecycle.revisit-candidate-dropped");
  rejectUnless(!subject.lifecycle.revisitMutatesCanonical, "lifecycle.revisit-auto-change");
  rejectUnless(!subject.lifecycle.revisitStopsExport, "lifecycle.revisit-stops-export");
  rejectUnless(subject.lifecycle.preserveHistory, "lifecycle.history-deleted");
  rejectUnless(
    ["old-decision", "new-fact", "matched-condition", "qoc-entry"].every((item) =>
      subject.lifecycle.revisitBundle.includes(item)),
    "lifecycle.revisit-bundle-incomplete",
  );
  rejectUnless(subject.compat.legacyFourFieldDecisionValid, "compat.legacy-decision-invalidated");
  rejectUnless(subject.compat.legacyFallback, "compat.legacy-fallback-cut");
  rejectUnless(!subject.compat.autoMigrates, "compat.auto-migration-enabled");
  rejectUnless(!subject.invariantReconciliation.mutatesOriginal, "invariant.original-mutated");
  rejectUnless(
    ["decision", "packet", "supersede"].every((option) => subject.invariantReconciliation.options.includes(option)),
    "invariant.options-narrowed",
  );
  rejectUnless(subject.validation.mode === "read-only", "validation.write-enabled");
  rejectUnless(subject.validation.severity === "warn-only", "validation.gate-enabled");

  return violations;
}

function assertLifecyclePolicy(subject) {
  const violations = collectViolations(subject);
  if (violations.length > 0) assert.fail(`lifecycle policy violations: ${violations.join(", ")}`);
}

const MUTATIONS = [
  ["Preference・Heuristic の誤昇格", "binding.preference-promoted", (subject) => {
    subject.binding.preference = "invariant";
  }],
  ["packet 固有制約の誤昇格", "binding.packet-promoted", (subject) => {
    subject.binding.packetConstraint = "invariant";
  }],
  ["拘束力不明候補の強制分類", "binding.unknown-promoted", (subject) => {
    subject.binding.unknown = "invariant";
  }],
  ["関係する active 判断の欠落", "relevance.active-relevant-dropped", (subject) => {
    subject.outcomes["active-relevant"] = "exclude";
  }],
  ["無関係判断の現行関門への混入", "relevance.irrelevant-pulled", (subject) => {
    subject.outcomes["active-irrelevant"] = "pull";
  }],
  ["superseded 判断の現行関門への混入", "relevance.superseded-pulled", (subject) => {
    subject.outcomes.superseded = "pull";
  }],
  ["relevance 不明の黙殺", "relevance.unknown-silenced", (subject) => {
    subject.outcomes["relevance-unknown"] = "exclude";
  }],
  ["Revisit 成立時の自動変更", "lifecycle.revisit-auto-change", (subject) => {
    subject.lifecycle.revisitMutatesCanonical = true;
  }],
  ["Revisit 成立時の export 自動停止", "lifecycle.revisit-stops-export", (subject) => {
    subject.lifecycle.revisitStopsExport = true;
  }],
  ["Revisit 提示 bundle の欠落", "lifecycle.revisit-bundle-incomplete", (subject) => {
    subject.lifecycle.revisitBundle = subject.lifecycle.revisitBundle.filter((item) => item !== "qoc-entry");
  }],
  ["旧判断の履歴削除", "lifecycle.history-deleted", (subject) => {
    subject.lifecycle.preserveHistory = false;
  }],
  ["旧4欄 Decision の無効化", "compat.legacy-decision-invalidated", (subject) => {
    subject.compat.legacyFourFieldDecisionValid = false;
  }],
  ["旧形式 fallback の切断", "compat.legacy-fallback-cut", (subject) => {
    subject.compat.legacyFallback = false;
  }],
  ["既存成果物の自動 migration", "compat.auto-migration-enabled", (subject) => {
    subject.compat.autoMigrates = true;
  }],
  ["Invariant 整理候補による原本変更", "invariant.original-mutated", (subject) => {
    subject.invariantReconciliation.mutatesOriginal = true;
  }],
  ["Invariant 整理候補の不足", "invariant.options-narrowed", (subject) => {
    subject.invariantReconciliation.options = ["supersede"];
  }],
  ["read-only 検査から writer への変異", "validation.write-enabled", (subject) => {
    subject.validation.mode = "write";
  }],
  ["warn-only 検査から gate への変異", "validation.gate-enabled", (subject) => {
    subject.validation.severity = "gate";
  }],
];

test("5 fixture を pull / exclude / confirm / revisit に判別する", () => {
  const oracle = createOracle();
  for (const fixture of FIXTURES) {
    assert.equal(oracle.evaluate(fixture), fixture.expected, fixture.id);
  }
});

test("正しい lifecycle policy は read-only の自己検査を通過する", () => {
  const subject = createSubject();
  const before = structuredClone(subject);
  assert.deepEqual(collectViolations(subject), []);
  assert.doesNotThrow(() => assertLifecyclePolicy(subject));
  assert.deepEqual(subject, before, "checker は入力を変更しない");
});

function assertQocDistribution(files) {
  assert.equal(files.jaClaude, files.jaCodex, "日本語 Claude/Codex template は byte 一致する");
  assert.equal(files.enClaude, files.enCodex, "英語 Claude/Codex template は byte 一致する");

  for (const content of [files.jaClaude, files.jaCodex, files.dogfoodClaude, files.dogfoodCodex]) {
    assert.match(content, /外的な破壊可能性/);
    assert.match(content, /普遍性/);
    assert.match(content, /選択判断か局所解法か/);
    assert.match(content, /Invariant[\s\S]*Decision[\s\S]*packet 固有制約[\s\S]*Preference・Heuristic[\s\S]*`unknown`/);
    assert.match(content, /理由・検討した代替案・見直し条件/);
    assert.match(content, /人の確認なしにより強い分類へ昇格しない/);
    assert.match(content, /新しい必須フィールドを追加しない/);

    // 規律が成立する前提の併記（DR186）。アンカーは規律の実質を突く語に絞る —
    // 「前提を書く」という見出しだけでなく、(1) 何を書くか (2) 書かないと何が起きるか
    // (3) 必須化しない・新しい欄を作らない、の3点が骨抜きにされたら落ちる。
    assert.match(content, /成立するために何が真である必要があるか/);
    assert.match(content, /空振り/);
    assert.match(content, /新しい必須項目・新しい欄は設けない/);
    assert.match(content, /推測で埋めず省いてよい/);
  }

  for (const content of [files.enClaude, files.enCodex]) {
    assert.match(content, /External harm if broken/);
    assert.match(content, /Universality/);
    assert.match(content, /Choice versus local solution/);
    assert.match(content, /Invariant[\s\S]*Decision[\s\S]*packet-specific constraint[\s\S]*Preference \/ Heuristic[\s\S]*`unknown`/);
    assert.match(content, /reason, alternatives considered, and revisit condition/);
    assert.match(content, /without human confirmation/);
    assert.match(content, /does not add a new required field/);

    // Premise a rule stands on (DR186). Same three substance anchors as the ja side.
    assert.match(content, /what must be true for that rule to hold/);
    assert.match(content, /fires at nothing/);
    assert.match(content, /Do not add a new required field or a new section/);
    assert.match(content, /leave it out rather than filling it in by guesswork/);
  }
}

test("algo-qoc のtemplate parityと全利用面の拘束力分類契約を保つ", () => {
  const files = Object.fromEntries(
    Object.entries(QOC_RULE_PATHS).map(([key, path]) => [key, readQocRule(path)]),
  );

  assertQocDistribution(files);
});

function extractOutcomeRow(content, outcome) {
  const row = content.split("\n").find((line) => line.startsWith(`| \`${outcome}\` |`));
  assert.ok(row, `${outcome} outcome row must exist`);
  return row;
}

function extractBaselineParagraph(content, marker) {
  const paragraph = content.split("\n").find((line) => line.startsWith(marker));
  assert.ok(paragraph, `${marker} baseline paragraph must exist`);
  return paragraph;
}

function assertExecutionContractSource(content, locale) {
  const pull = extractOutcomeRow(content, "pull");
  const exclude = extractOutcomeRow(content, "exclude");
  const confirm = extractOutcomeRow(content, "confirm");

  if (locale === "ja") {
    assert.match(pull, /status が `active`[\s\S]*\*\*かつ\*\*[\s\S]*案件の area または impact に関係する[\s\S]*\*\*または\*\*[\s\S]*area が `always`/);
    assert.match(exclude, /status が `active` ではない[\s\S]*area が `always`[\s\S]*`superseded`[\s\S]*archive 済み[\s\S]*案件と無関係[\s\S]*前提不成立/);
    assert.match(confirm, /status、area、impact、relevance[\s\S]*不足・曖昧[\s\S]*値を推測せず[\s\S]*人の確認/);

    const baseline = extractBaselineParagraph(content, "5つの基準ケースは");
    assert.match(baseline, /active で関係あり=`pull`/);
    assert.match(baseline, /active で無関係=`exclude`/);
    assert.match(baseline, /superseded=`exclude`/);
    assert.match(baseline, /`Revisit when` が成立した active で関係あり=`pull` のまま人主導の見直し/);
    assert.match(baseline, /relevance 不明=`confirm`/);
    assert.match(baseline, /成立だけで判断を自動除外・supersede しません/);
    return;
  }

  assert.match(pull, /status is `active`[\s\S]*\*\*and\*\*[\s\S]*relevant to the work's area or impact[\s\S]*\*\*or\*\*[\s\S]*area is `always`/);
  assert.match(exclude, /status is not `active`[\s\S]*`superseded`[\s\S]*archived[\s\S]*area is `always`[\s\S]*irrelevant[\s\S]*prerequisite is false/);
  assert.match(confirm, /status, area, impact, or relevance[\s\S]*missing or ambiguous[\s\S]*Do not infer a value[\s\S]*human confirmation/);

  const baseline = extractBaselineParagraph(content, "The five baseline cases are:");
  assert.match(baseline, /active and relevant=`pull`/);
  assert.match(baseline, /active and irrelevant=`exclude`/);
  assert.match(baseline, /superseded=`exclude`/);
  assert.match(baseline, /active and relevant with a satisfied `Revisit when`=`pull`[\s\S]*human-led review/);
  assert.match(baseline, /unknown relevance=`confirm`/);
  assert.match(baseline, /does not automatically exclude or supersede/);
}

test("execution contract の全配布面が outcome 表と5基準ケースを固定する", () => {
  const files = Object.fromEntries(
    Object.entries(EXECUTION_CONTRACT_PATHS).map(([key, path]) => [key, fs.readFileSync(path, "utf8")]),
  );

  assert.equal(files.jaTemplate, files.dogfood, "Japanese template と canonical dogfood は byte 一致する");

  assertExecutionContractSource(files.jaTemplate, "ja");
  assertExecutionContractSource(files.enTemplate, "en");

  assert.match(files.jaTemplate, /area が `always` でも、`superseded` または archive 済みなら選びません/);
  assert.match(files.jaTemplate, /旧形式の Intent Compass へ恒久 fallback/);
  assert.match(files.jaTemplate, /自動移行・上書き・全件再分類は行いません/);

  assert.match(files.enTemplate, /Even when the area is `always`, do not select a `superseded` or archived candidate/);
  assert.match(files.enTemplate, /permanently fall back to the legacy Intent Compass/);
  assert.match(files.enTemplate, /do not automatically migrate, overwrite, or reclassify all existing data/);
});

test("execution contract の outcome 入替・irrelevant 欠落・unknown 黙殺を拒否する", () => {
  const source = fs.readFileSync(EXECUTION_CONTRACT_PATHS.jaTemplate, "utf8");
  const mutations = [
    source
      .replace("| `pull` |", "| `temporary` |")
      .replace("| `exclude` |", "| `pull` |")
      .replace("| `temporary` |", "| `exclude` |"),
    source.replace("、案件と無関係、", "、"),
    source.replace("値を推測せず、読めた根拠と関係候補を提示して人の確認へ送る", "黙って除外する"),
  ];

  for (const mutated of mutations) {
    assert.notEqual(mutated, source, "mutation fixture must change the source");
    assert.throws(() => assertExecutionContractSource(mutated, "ja"), assert.AssertionError);
  }
});

function assertImproveLifecycleSource(content, locale) {
  if (locale === "ja") {
    assert.match(content, /旧 Decision、新事実、成立した `Revisit when` 条件、既存 QOC 入口を一組の bundle/);
    assert.match(content, /自動で canonical を変更せず、自動 supersede・削除・失効・export 停止を行わない/);
    assert.match(content, /承認されていない間は canonical と旧判断の現行状態を変更しない/);
    assert.match(content, /人が置換を承認した場合だけ、既存の writeback 経路[^]*active な後継[^]*旧判断[^]*履歴/);
    assert.match(content, /旧4欄 Decision[^]*有効[^]*警告・遡及更新しない/);
    assert.match(content, /Decision 化[^]*packet 固有化[^]*supersede[^]*三候補[^]*根拠/);
    assert.match(content, /判断不能[^]*未確認候補[^]*原本を削除・上書きしない/);
    assert.match(content, /既存全 Invariant \/ Decision の一括意味レビューへ拡張しない/);
    return;
  }

  assert.match(content, /old Decision, the new fact, the satisfied `Revisit when` condition, and the existing QOC entry as one bundle/);
  assert.match(content, /does not automatically change canonical data, supersede, delete, expire, or stop export/);
  assert.match(content, /Until a person approves a replacement, leave canonical data and the old decision's current state unchanged/);
  assert.match(content, /Only after human approval, use the existing writeback path[^]*active successor[^]*old decision[^]*history/);
  assert.match(content, /Legacy four-field Decisions remain valid[^]*do not warn about or retroactively update/);
  assert.match(content, /Decision[^]*packet-specific constraint[^]*supersede[^]*three candidates[^]*evidence/);
  assert.match(content, /cannot be determined[^]*unconfirmed candidate[^]*do not delete or overwrite the original/);
  assert.match(content, /Do not use one candidate as a trigger to expand it into a semantic review of every existing Invariant or Decision/);
}

test("improve の全配布面が Revisit と不要 Invariant の人主導契約を固定する", () => {
  const files = Object.fromEntries(
    Object.entries(IMPROVE_RULE_PATHS).map(([key, path]) => [key, fs.readFileSync(path, "utf8")]),
  );

  assert.equal(files.jaClaude, files.jaCodex, "日本語 Claude/Codex template は byte 一致する");
  assert.equal(files.enClaude, files.enCodex, "英語 Claude/Codex template は byte 一致する");
  assert.equal(files.jaClaude, files.dogfoodClaude, "Claude dogfood は日本語 template と byte 一致する");
  assert.equal(files.jaClaude, files.dogfoodCodex, "Codex dogfood は日本語 template と byte 一致する");

  assertImproveLifecycleSource(files.jaClaude, "ja");
  assertImproveLifecycleSource(files.enClaude, "en");
});

test("improve lifecycle の bundle・履歴・三候補・非自動境界の欠落を個別に拒否する", () => {
  const source = fs.readFileSync(IMPROVE_RULE_PATHS.jaClaude, "utf8");
  const mutations = [
    ["Revisit bundle", "旧 Decision、新事実、成立した `Revisit when` 条件、既存 QOC 入口を一組の bundle", "旧 Decision だけ"],
    ["非自動変更", "自動で canonical を変更せず、自動 supersede・削除・失効・export 停止を行わない", "自動で supersede する"],
    ["未承認時不変", "承認されていない間は canonical と旧判断の現行状態を変更しない", "未承認でも状態を変更する"],
    ["承認済み履歴", "active な後継として追加し、旧判断を後継参照付きで履歴に残す", "旧判断を置換する"],
    ["旧4欄互換", "旧4欄 Decision は有効なまま扱い、欄の不足を警告・遡及更新しない", "旧4欄 Decision は無効"],
    ["三整理候補", "Decision 化・packet 固有化・supersede の三候補を根拠付きで提示する", "supersede だけを提示する"],
    ["不明候補非変更", "判断不能なら未確認候補のまま提示し、元の Invariant 原本を削除・上書きしない", "判断不能なら削除する"],
    ["全件レビュー禁止", "既存全 Invariant / Decision の一括意味レビューへ拡張しない", "既存全件をレビューする"],
  ];

  for (const [label, needle, replacement] of mutations) {
    const mutated = source.replace(needle, replacement);
    assert.notEqual(mutated, source, `${label}: mutation fixture must change the source`);
    assert.throws(() => assertImproveLifecycleSource(mutated, "ja"), assert.AssertionError, label);
  }
});

function extractStatusDecisionRows(content) {
  return content
    .split("\n")
    .filter((line) => /^\| (?:[1-9]|1[0-4]) \|/.test(line));
}

function assertStatusLifecycleHintSource(content, locale) {
  const rows = extractStatusDecisionRows(content);
  assert.equal(rows.length, 14, "既存 decision table は14行のまま");
  assert.deepEqual(rows.map((row) => row.match(/^\| (\d+) \|/)[1]), STATUS_BASELINE_ROW_NUMBERS);
  assert.equal(
    crypto.createHash("sha256").update(rows.join("\n")).digest("hex"),
    STATUS_BASELINE_ROW_HASHES[locale],
    "変更前14行の条件・優先順位・推奨文言を byte 固定する",
  );

  if (locale === "ja") {
    assert.match(content, /判断ライフサイクル候補[^]*詳細面[^]*report-only/);
    assert.match(content, /明示的なファイル根拠[^]*場合だけ/);
    assert.match(content, /対象 Decision \/ Invariant ID[^]*根拠[^]*新事実または前提変化[^]*次に人が選ぶ必要がある判断/);
    assert.match(content, /最大1件/);
    assert.match(content, /曖昧[^]*複数[^]*一意に絞れない[^]*沈黙/);
    assert.match(content, /推測しない/);
    assert.match(content, /新しい state[^]*再提示抑制記録[^]*追加しない/);
    assert.match(content, /first-match[^]*高優先の「次の一手」[^]*置換も追加もしない/);
    return;
  }

  assert.match(content, /decision-lifecycle candidate[^]*report-only[^]*detail/i);
  assert.match(content, /explicit file evidence[^]*only/i);
  assert.match(content, /target Decision \/ Invariant ID[^]*evidence[^]*new fact or changed premise[^]*next decision a person must make/i);
  assert.match(content, /at most one/i);
  assert.match(content, /ambiguous[^]*multiple[^]*cannot be narrowed to one[^]*omit/i);
  assert.match(content, /Do not infer/i);
  assert.match(content, /do not add a new state or repeat-suppression record/i);
  assert.match(content, /first-match[^]*higher-priority[^]*neither replace nor add/i);
}

test("status の全配布面が14行を保ち lifecycle 人判断候補を report-only 最大1件にする", () => {
  const files = Object.fromEntries(
    Object.entries(STATUS_RULE_PATHS).map(([key, path]) => [key, fs.readFileSync(path, "utf8")]),
  );

  assert.equal(files.jaClaude, files.jaCodex, "日本語 Claude/Codex template は byte 一致する");
  assert.equal(files.enClaude, files.enCodex, "英語 Claude/Codex template は byte 一致する");
  assert.equal(files.jaClaude, files.dogfoodClaude, "Claude dogfood は日本語 template と byte 一致する");
  assert.equal(files.jaClaude, files.dogfoodCodex, "Codex dogfood は日本語 template と byte 一致する");

  assertStatusLifecycleHintSource(files.jaClaude, "ja");
  assertStatusLifecycleHintSource(files.enClaude, "en");
});

test("status lifecycle hint の明示根拠・最大1件・沈黙・非永続境界の欠落を拒否する", () => {
  const source = fs.readFileSync(STATUS_RULE_PATHS.jaClaude, "utf8");
  const mutations = [
    ["明示根拠", "明示的なファイル根拠", "推測した根拠"],
    ["最大1件", "最大1件", "複数件"],
    ["曖昧時沈黙", "一意に絞れない場合は沈黙", "一意に絞れなくても全件表示"],
    ["推測禁止", "推測しない", "推測してよい"],
    ["非永続", "新しい state や再提示抑制記録を追加しない", "新しい state を追加する"],
    ["first-match 保持", "置換も追加もしない", "置換して追加する"],
  ];

  for (const [label, needle, replacement] of mutations) {
    const mutated = source.replace(needle, replacement);
    assert.notEqual(mutated, source, `${label}: mutation fixture must change the source`);
    assert.throws(() => assertStatusLifecycleHintSource(mutated, "ja"), assert.AssertionError, label);
  }
});

function extractValidateCatalogRow(content, id) {
  const row = content.split("\n").find((line) => line.startsWith(`| ${id} |`));
  assert.ok(row, `${id} catalog row must exist`);
  return row;
}

function assertValidateLifecycleSource(content, locale) {
  const lifecycleRow = extractValidateCatalogRow(content, "decision-lifecycle-relevance");
  const decayRow = extractValidateCatalogRow(content, "compass-rule-decay");

  if (locale === "ja") {
    assert.match(lifecycleRow, /Preference・Heuristic[^]*Invariant \/ MUST \/ acceptance[^]*強度昇格/);
    assert.match(lifecycleRow, /関係する active 判断の欠落/);
    assert.match(lifecycleRow, /無関係・superseded 判断の現行関門への混入/);
    assert.match(lifecycleRow, /不明判断の黙殺/);
    assert.match(lifecycleRow, /逐語的な根拠[^]*候補または `unconfirmed` の温度/);
    assert.match(lifecycleRow, /read-only \/ warn-only/);
    assert.match(lifecycleRow, /疑いが無ければ軸ごと沈黙/);
    assert.match(content, /各所見[^]*`decision-lifecycle-relevance`[^]*逐語的な根拠[^]*候補または `unconfirmed` の温度/);
    assert.match(content, /`compass-rule-decay`[^]*`decision-rule-mismatch`[^]*`draft-content-dropped`[^]*突合面を分け[^]*所見を混ぜない/);
    assert.match(content, /read-only[^]*warn-only[^]*export・実装を止めない/);
    assert.match(content, /旧4欄 Decision[^]*旧 Compass fallback[^]*canonical data[^]*status[^]*自動変更しない/);
    assert.match(content, /旧4欄 Decision は `Revisit when` 欄の不足だけを理由に警告しない/);
    assert.match(content, /疑いが無ければ軸ごと沈黙/);
    assert.match(decayRow, /Decision 化[^]*packet 固有化[^]*supersede/);
    assert.match(decayRow, /原本を変更しない/);
    assert.match(content, /`compass-rule-decay`[^]*Decision 化[^]*packet 固有化[^]*supersede[^]*原本を変更しない/);
    return;
  }

  assert.match(lifecycleRow, /Preference \/ Heuristic[^]*Invariant \/ MUST \/ acceptance[^]*strength promotion/i);
  assert.match(lifecycleRow, /missing relevant active decision/i);
  assert.match(lifecycleRow, /irrelevant or `superseded` decision[^]*current gate/i);
  assert.match(lifecycleRow, /silencing an unknown decision/i);
  assert.match(lifecycleRow, /verbatim evidence[^]*candidate or `unconfirmed` temperature/i);
  assert.match(lifecycleRow, /read-only and warn-only/i);
  assert.match(lifecycleRow, /keep the whole axis silent when there is no suspicion/i);
  assert.match(content, /Each finding[^]*`decision-lifecycle-relevance`[^]*verbatim evidence[^]*candidate or `unconfirmed` temperature/i);
  assert.match(content, /matching surfaces separate[^]*`compass-rule-decay`[^]*`decision-rule-mismatch`[^]*`draft-content-dropped`[^]*do not mix findings/i);
  assert.match(content, /read-only[^]*warn-only[^]*does not stop export or implementation/i);
  assert.match(content, /does not automatically change[^]*legacy four-field Decisions[^]*legacy Compass fallback[^]*canonical data[^]*status/i);
  assert.match(content, /Legacy four-field Decisions are not warned about solely because the `Revisit when` field is missing/i);
  assert.match(content, /When there is no suspicion, keep the whole axis silent/i);
  assert.match(decayRow, /convert to a Decision[^]*make packet-specific[^]*supersede/i);
  assert.match(decayRow, /do not change the original/i);
  assert.match(content, /`compass-rule-decay`[^]*convert to a Decision[^]*make packet-specific[^]*supersede[^]*does not change the original/i);
}

test("validate の全配布面が独立 lifecycle 検査と三整理候補を固定する", () => {
  const files = Object.fromEntries(
    Object.entries(VALIDATE_RULE_PATHS).map(([key, path]) => [key, fs.readFileSync(path, "utf8")]),
  );

  assert.equal(files.jaClaude, files.jaCodex, "日本語 Claude/Codex template は byte 一致する");
  assert.equal(files.enClaude, files.enCodex, "英語 Claude/Codex template は byte 一致する");
  assert.equal(files.jaClaude, files.dogfoodClaude, "Claude dogfood は日本語 template と byte 一致する");
  assert.equal(files.jaClaude, files.dogfoodCodex, "Codex dogfood は日本語 template と byte 一致する");

  assertValidateLifecycleSource(files.jaClaude, "ja");
  assertValidateLifecycleSource(files.enClaude, "en");
});

test("validate lifecycle の独立ID・4所見・根拠温度・非変更境界の欠落を拒否する", () => {
  const source = fs.readFileSync(VALIDATE_RULE_PATHS.jaClaude, "utf8");
  const mutations = [
    ["独立 ID", "| decision-lifecycle-relevance |", "| compass-rule-decay |"],
    ["強度昇格", "Preference・Heuristic の Invariant / MUST / acceptance への強度昇格", "Preference・Heuristic"],
    ["active 欠落", "関係する active 判断の欠落", "active 判断"],
    ["current gate 混入", "無関係・superseded 判断の現行関門への混入", "判断の混入"],
    ["unknown 黙殺", "不明判断の黙殺", "不明判断"],
    ["逐語根拠", "ファイル名を伴う逐語的な根拠", "要約した根拠"],
    ["温度", "候補または `unconfirmed` の温度", "断定"],
    ["軸分離", "突合面を分け、所見を混ぜない", "所見を統合する"],
    ["warn-only", "read-only / warn-only", "write-enabled / gate"],
    ["非自動変更", "旧4欄 Decision、旧 Compass fallback、canonical data、status を自動変更しない", "canonical data を自動変更する"],
    ["旧4欄の不足を非警告", "旧4欄 Decision は `Revisit when` 欄の不足だけを理由に警告しない", "旧4欄 Decision は `Revisit when` 欄の不足だけを理由に警告する"],
    ["沈黙", "疑いが無ければ軸ごと沈黙", "疑いが無くても報告"],
    ["三整理候補", "Decision 化・packet 固有化・supersede", "supersede"],
    ["原本不変", "原本を変更しない", "原本を変更する"],
  ];

  for (const [label, needle, replacement] of mutations) {
    const mutated = source.replace(needle, replacement);
    assert.notEqual(mutated, source, `${label}: mutation fixture must change the source`);
    assert.throws(() => assertValidateLifecycleSource(mutated, "ja"), assert.AssertionError, label);
  }
});

function readDistribution(paths, overrides = {}) {
  return Object.fromEntries(
    Object.entries(paths).map(([key, path]) => [
      key,
      Object.hasOwn(overrides, path) ? overrides[path] : fs.readFileSync(path, "utf8"),
    ]),
  );
}

function collectDistributionIntegrationViolations(overrides = {}) {
  const violations = [];
  const verify = (surface, assertion) => {
    try {
      assertion();
    } catch (error) {
      violations.push(`${surface}: ${error.message}`);
    }
  };

  const qoc = readDistribution(QOC_RULE_PATHS, overrides);
  const execution = readDistribution(EXECUTION_CONTRACT_PATHS, overrides);
  const improve = readDistribution(IMPROVE_RULE_PATHS, overrides);
  const status = readDistribution(STATUS_RULE_PATHS, overrides);
  const validate = readDistribution(VALIDATE_RULE_PATHS, overrides);

  verify("C1 binding classification / agent parity", () => assertQocDistribution(qoc));
  verify("golden lock", () => {
    const manifest = JSON.parse(fs.readFileSync("test/golden-locks.manifest.json", "utf8"));
    const entries = manifest.groups.byteLocked.entries;
    for (const path of [QOC_RULE_PATHS.jaClaude, QOC_RULE_PATHS.enClaude]) {
      assert.equal(
        crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex"),
        entries[path],
        `${path} は承認済み golden lock と一致する`,
      );
    }
  });
  verify("C2 execution contract", () => {
    assert.equal(execution.jaTemplate, execution.dogfood);
    assertExecutionContractSource(execution.jaTemplate, "ja");
    assertExecutionContractSource(execution.enTemplate, "en");
  });
  verify("C3 lifecycle reconciliation / agent parity", () => {
    assert.equal(improve.jaClaude, improve.jaCodex);
    assert.equal(improve.enClaude, improve.enCodex);
    assert.equal(improve.jaClaude, improve.dogfoodClaude);
    assert.equal(improve.jaClaude, improve.dogfoodCodex);
    assertImproveLifecycleSource(improve.jaClaude, "ja");
    assertImproveLifecycleSource(improve.enClaude, "en");
  });
  verify("C4 status 14-row first-match / agent parity", () => {
    assert.equal(status.jaClaude, status.jaCodex);
    assert.equal(status.enClaude, status.enCodex);
    assert.equal(status.jaClaude, status.dogfoodClaude);
    assert.equal(status.jaClaude, status.dogfoodCodex);
    assertStatusLifecycleHintSource(status.jaClaude, "ja");
    assertStatusLifecycleHintSource(status.enClaude, "en");
  });
  verify("C5 validate catalog / agent parity", () => {
    assert.equal(validate.jaClaude, validate.jaCodex);
    assert.equal(validate.enClaude, validate.enCodex);
    assert.equal(validate.jaClaude, validate.dogfoodClaude);
    assert.equal(validate.jaClaude, validate.dogfoodCodex);
    assertValidateLifecycleSource(validate.jaClaude, "ja");
    assertValidateLifecycleSource(validate.enClaude, "en");
  });

  return violations;
}

test("Core contracts の全配布面を一括統合検証する", () => {
  assert.deepEqual(collectDistributionIntegrationViolations(), []);

  const staleAgent = collectDistributionIntegrationViolations({
    [QOC_RULE_PATHS.jaCodex]: `${fs.readFileSync(QOC_RULE_PATHS.jaCodex, "utf8")}\n<!-- stale -->\n`,
  });
  assert.equal(staleAgent.length, 1);
  assert.match(staleAgent[0], /^C1 binding classification \/ agent parity:/);

  const missingCatalog = collectDistributionIntegrationViolations({
    [VALIDATE_RULE_PATHS.enCodex]: "",
  });
  assert.equal(missingCatalog.length, 1);
  assert.match(missingCatalog[0], /^C5 validate catalog \/ agent parity:/);
});

test("INV10 doc-sync: guide / theory / README が decision lifecycle を ja/en で案内する", () => {
  const documents = {
    guideJa: fs.readFileSync("docs/guide.md", "utf8"),
    guideEn: fs.readFileSync("docs/guide.en.md", "utf8"),
    theoryJa: fs.readFileSync("docs/theory.md", "utf8"),
    theoryEn: fs.readFileSync("docs/theory.en.md", "utf8"),
    readmeJa: fs.readFileSync("README.md", "utf8"),
    readmeEn: fs.readFileSync("README.en.md", "utf8"),
  };

  assert.match(documents.guideJa, /関係する `active` な Invariant \/ Decision/);
  assert.match(documents.guideJa, /自動で失効・削除せず/);
  assert.match(documents.guideEn, /only the `active` Invariants and Decisions relevant/);
  assert.match(documents.guideEn, /not automatically expired or deleted/);
  assert.match(documents.theoryJa, /working set だけを小さくする/);
  assert.match(documents.theoryEn, /Decision lifecycle and relevant working sets/);
  assert.match(documents.readmeJa, /Decision の関係判断と見直し/);
  assert.match(documents.readmeEn, /decision relevance and revisiting/);
});

for (const [label, expectedViolation, mutate] of MUTATIONS) {
  test(`変異を個別に拒否する: ${label} -> ${expectedViolation}`, () => {
    const subject = createSubject();
    mutate(subject);

    assert.deepEqual(collectViolations(subject), [expectedViolation]);
    assert.throws(
      () => assertLifecyclePolicy(subject),
      (error) => error instanceof assert.AssertionError && error.message.includes(expectedViolation),
    );
  });
}
