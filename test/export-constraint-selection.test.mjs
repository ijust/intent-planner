import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");

const CONTRACTS = {
  ja: read("templates", "ja", "intent", "execution-contract.md"),
  en: read("templates", "en", "intent", "execution-contract.md"),
};
const DOGFOOD_CONTRACT = read(".intent", "execution-contract.md");

const RESULT_FIELDS = [
  "selected_at",
  "sources",
  "selection_status",
  "source_mode",
  "degraded_reasons",
  "pull_candidates",
  "selected",
  "confirm",
  "excluded",
];

const SOURCE_MODES = ["split-compass", "mixed-compass", "legacy-compass"];
const DEGRADED_REASONS = [
  "execution-contract-missing",
  "index-missing",
  "split-store-missing",
  "symbol-missing",
];

const DOWNSTREAM_FIELDS = [
  "Identifier",
  "Name",
  "Law",
  "Applicability",
  "Verification",
  "Canonical Reference",
];

function selectionSection(body) {
  const heading = body.includes("### 関係判断の JIT pull")
    ? "### 関係判断の JIT pull"
    : "### JIT pull of relevant decisions";
  const next = body.includes("## 実装中の判断")
    ? "## 実装中の判断"
    : "## Decisions during implementation";
  const start = body.indexOf(heading);
  const end = body.indexOf(next, start + heading.length);
  assert.notEqual(start, -1, `selection heading exists: ${heading}`);
  assert.notEqual(end, -1, `selection section has an end: ${next}`);
  return body.slice(start, end);
}

function validateCommonSelectionContract(body) {
  const section = selectionSection(body);

  for (const field of RESULT_FIELDS) {
    assert.ok(section.includes(`\`${field}\``), `selection result defines ${field}`);
  }
  for (const mode of SOURCE_MODES) {
    assert.ok(section.includes(`\`${mode}\``), `selection result supports ${mode}`);
  }
  for (const reason of DEGRADED_REASONS) {
    assert.ok(section.includes(`\`${reason}\``), `selection result supports ${reason}`);
  }

  assert.match(section, /`selection_status`[^\n]+`applied`[^\n]+`legacy-not-applied`/i);
  assert.match(section, /`## Law`/);
  assert.match(section, /`Revisit when`/);
  assert.match(section, /active[^\n]+relevant[^\n]+`pull`|active[^\n]+関係あり[^\n]+`pull`/i);
  assert.match(section, /superseded[^\n]+`exclude`/i);
  assert.match(section, /prerequisite[^\n]+false|前提不成立/i);
  assert.match(section, /unknown relevance[^\n]+`confirm`|relevance 不明[^\n]+`confirm`/i);
  assert.match(section, /satisfied[^\n]+`Revisit when`[^\n]+`pull`|`Revisit when`[^\n]+成立[^\n]+`pull`/i);
  assert.match(section, /explicit reference|明示参照/i);
  assert.match(section, /area match|領域一致/i);
  assert.match(section, /area[^\n]+`always`/i);
  assert.match(section, /confirmed|確認済み/i);
  assert.match(section, /keyword[^\n]+not|語の一致[^\n]+(ない|しません)/i);
  assert.match(section, /Packet[^\n]+(only|だけ)/i);
  assert.match(section, /unrelated[^\n]+(Tree|Compass|archive)|無関係[^\n]+(Tree|Compass|archive)/i);

  assert.match(section, /`selected`[^\n]+`confirm`[^\n]+`excluded`/i);
  assert.match(section, /disjoint|排他的|重複[^\n]+許さ/i);
  assert.match(section, /`pull_candidates`[^\n]+`selected`[^\n]+`confirm`/i);
  const confirmOutcomeRow = section
    .split("\n")
    .find((line) => line.startsWith("| `confirm` |") && line.includes("status")) ?? "";
  assert.match(confirmOutcomeRow, /(human confirmation|人の確認)/i);
  assert.match(section, /`legacy-not-applied`/i);
  assert.match(section, /(preserve the existing export output|従来のexport出力を維持)/i);

  return section;
}

function validateConstraintProjectionContract(body) {
  const section = selectionSection(body);
  const heading = body.includes("#### 下流制約への写像")
    ? "#### 下流制約への写像"
    : "#### Projection to downstream constraints";
  const start = section.indexOf(heading);
  assert.notEqual(start, -1, `constraint projection heading exists: ${heading}`);
  const projection = section.slice(start);

  for (const field of DOWNSTREAM_FIELDS) {
    assert.ok(projection.includes(`\`${field}\``), `downstream constraint defines ${field}`);
  }

  assert.match(projection, /Packet Scope[\s\S]+Law/i);
  assert.match(projection, /Packet Validation/i);
  assert.match(projection, /observable target[\s\S]+failure condition|観測対象[\s\S]+失敗条件/i);
  assert.match(projection, /new obligation[\s\S]+`confirm`[\s\S]+`projection`|新しい義務[\s\S]+`confirm`[\s\S]+`projection`/i);
  assert.match(projection, /do not include[\s\S]+area match[\s\S]+`always`[\s\S]+explicit reference|含めません[\s\S]+領域一致[\s\S]+`always`[\s\S]+明示参照/i);
  assert.match(projection, /do not include[\s\S]+internal selection record|内部の選別記録[\s\S]+参照[\s\S]+含めません/i);
  assert.match(projection, /applicability condition[\s\S]+constraint conflict[\s\S]+regulatory, audit, or safety assurance|適用条件[\s\S]+制約の衝突[\s\S]+規制・監査・安全保証/i);
  assert.match(projection, /`selected`[\s\S]+zero[\s\S]+do not generate[\s\S]+section[\s\S]+explanation|`selected`[\s\S]+0件[\s\S]+節[\s\S]+説明[\s\S]+生成しません/i);

  return projection;
}

function validateSelectionRecordContract(body) {
  const section = selectionSection(body);
  const heading = body.includes("#### 選別結果の内部記録")
    ? "#### 選別結果の内部記録"
    : "#### Internal selection record";
  const start = section.indexOf(heading);
  assert.notEqual(start, -1, `selection record heading exists: ${heading}`);
  const record = section.slice(start);

  assert.match(record, /`constraint-selection\.md`/);
  for (const field of [
    "selected_at",
    "selection_status",
    "source_mode",
    "degraded_reasons",
    "sources",
  ]) {
    assert.ok(record.includes(field), `selection record defines ${field}`);
  }
  for (const recordHeading of ["Selected", "Confirmation Candidates", "Legacy Output"]) {
    assert.ok(record.includes(`## ${recordHeading}`), `selection record defines ${recordHeading}`);
  }

  assert.match(record, /one-line selection reason|一行の採用理由/i);
  assert.match(record, /kind[^\n]+relevance[^\n]+projection|確認種別[^\n]+relevance[^\n]+projection/i);
  assert.match(record, /evidence[^\n]+missing|根拠[^\n]+不足情報/i);
  assert.match(record, /canonical (path|reference)|正本参照/i);
  assert.match(record, /zero selected[^\n]+`none`|採用0件[^\n]+`なし`/i);

  assert.match(record, /`selection_status: applied`/i);
  assert.match(record, /`none`[^\n]+empty|empty[^\n]+`none`|空[^\n]+`なし`|`なし`[^\n]+空/i);
  assert.match(record, /Legacy Output[^\n]+`not applicable`|Legacy Output[^\n]+`非適用`/i);
  assert.match(record, /`selection_status: legacy-not-applied`[^\n]+Selected[^\n]+Confirmation Candidates[^\n]+`not applicable`|`selection_status: legacy-not-applied`[^\n]+Selected[^\n]+Confirmation Candidates[^\n]+`非適用`/i);
  assert.match(record, /Legacy Output[\s\S]+primary downstream (file|output)|Legacy Output[\s\S]+既存[^\n]+主(?:出力|ファイル)/i);

  assert.match(record, /do not (record|include)[^\n]+all excluded|全(?:件|て)の除外候補[^\n]+記録しない/i);
  assert.match(record, /do not copy any Compass body[^\n]+Law[^\n]+annexes[^\n]+legacy-form body text|Law[^\n]+Compass本文全体[^\n]+Annex[^\n]+旧形式本文[^\n]+複製しない/i);
  assert.match(record, /long comparison|長い比較/i);
  assert.match(record, /sensitive|機密|機微/i);
  assert.match(record, /do not copy selection history into the Packet|選別履歴をPacketへ複製/i);
  assert.match(record, /do not pass[^\n]+downstream|下流[^\n]+渡さない/i);

  assert.match(record, /re-export|再export/i);
  assert.match(record, /replace the entire file|全置換/i);
  assert.match(record, /do not append|append(?:せず|[^\n]+しない)/i);
  assert.match(record, /same run|同じrun/i);
  assert.match(record, /do not treat[^\n]+successful|成功[^\n]+扱わ(?:ない|ず)/i);
  assert.match(record, /Scope[\s\S]+Expected Behavior[\s\S]+Validation[\s\S]+human confirmation|Scope[\s\S]+Expected Behavior[\s\S]+Validation[\s\S]+人の確認/i);
  assert.match(record, /Packet update path|Packet更新経路/i);

  return record;
}

test("日英の共通契約が候補選別の入力・根拠・最終状態を定義する", () => {
  for (const body of Object.values(CONTRACTS)) {
    validateCommonSelectionContract(body);
  }
});

test("日英の共通契約が同じ結果フィールド・読取方式・縮退理由を公開する", () => {
  for (const token of [...RESULT_FIELDS, ...SOURCE_MODES, ...DEGRADED_REASONS]) {
    for (const [lang, body] of Object.entries(CONTRACTS)) {
      assert.ok(selectionSection(body).includes(`\`${token}\``), `${lang}: ${token}`);
    }
  }
});

test("契約検査は不明候補の黙殺・横断規律の欠落・旧経路の新契約偽装を検出する", () => {
  const base = CONTRACTS.en;
  validateCommonSelectionContract(base);

  const unknownSilenced = base.replace(
    /(`confirm` \| status, area, impact, or relevance[^\n]+)human confirmation/i,
    "$1silent exclusion",
  );
  assert.notEqual(unknownSilenced, base, "unknown-relevance mutation changes the contract");
  assert.throws(() => validateCommonSelectionContract(unknownSilenced), /human confirmation/);

  const alwaysDropped = base.replaceAll("`always`", "`sometimes`");
  assert.notEqual(alwaysDropped, base, "always mutation changes the contract");
  assert.throws(() => validateCommonSelectionContract(alwaysDropped), /always/);

  const legacyMisreported = base.replaceAll("`legacy-not-applied`", "`applied`");
  assert.notEqual(legacyMisreported, base, "legacy-status mutation changes the contract");
  assert.throws(() => validateCommonSelectionContract(legacyMisreported), /legacy-not-applied/);
});

test("日英の共通契約が採用制約の最小下流表現と理由分離を定義する", () => {
  for (const body of Object.values(CONTRACTS)) {
    validateConstraintProjectionContract(body);
  }
});

test("下流写像契約は検証情報の欠落と未確認情報の確定化を検出する", () => {
  const base = CONTRACTS.en;
  validateConstraintProjectionContract(base);

  const missingFailureCondition = base.replaceAll("failure condition", "success evidence");
  assert.notEqual(missingFailureCondition, base, "verification mutation changes the contract");
  assert.throws(
    () => validateConstraintProjectionContract(missingFailureCondition),
    /failure condition/,
  );

  const fabricatedProjection = base.replace(
    /to `confirm` with kind `projection`/i,
    "directly to `selected`",
  );
  assert.notEqual(fabricatedProjection, base, "projection mutation changes the contract");
  assert.throws(() => validateConstraintProjectionContract(fabricatedProjection), /confirm/);
});

test("日英の共通契約が選別結果を下流から分離した再生成可能な記録として定義する", () => {
  for (const body of Object.values(CONTRACTS)) {
    validateSelectionRecordContract(body);
  }
});

test("自己適用面が日本語の選別記録契約と同期する", () => {
  assert.equal(DOGFOOD_CONTRACT, CONTRACTS.ja);
  validateSelectionRecordContract(DOGFOOD_CONTRACT);
});

test("内部記録契約は追記更新・Packetへの履歴複製・自動判断を検出する", () => {
  const base = CONTRACTS.en;
  validateSelectionRecordContract(base);

  const appendedRecord = base.replace("replace the entire file", "append to the existing file");
  assert.notEqual(appendedRecord, base, "append mutation changes the contract");
  assert.throws(() => validateSelectionRecordContract(appendedRecord), /replace the entire file/);

  const packetHistory = base.replace(
    /do not copy[^\n]+Packet/i,
    "copy the selection history into the Packet",
  );
  assert.notEqual(packetHistory, base, "Packet-history mutation changes the contract");
  assert.throws(() => validateSelectionRecordContract(packetHistory), /Packet/);

  const compassBodyCopied = base.replace(
    /Do not copy any Compass body[^\n]+legacy-form body text\./i,
    "Copy Compass annexes and legacy-form body text when useful.",
  );
  assert.notEqual(compassBodyCopied, base, "Compass-body mutation changes the contract");
  assert.throws(() => validateSelectionRecordContract(compassBodyCopied), /Compass body/);

  const automaticDecision = base.replace("obtain human confirmation", "apply automatic acceptance");
  assert.notEqual(automaticDecision, base, "human-confirmation mutation changes the contract");
  assert.throws(() => validateSelectionRecordContract(automaticDecision), /human confirmation/);
});

const CC_SDD_SURFACES = [
  ["ja", "claude"],
  ["ja", "codex"],
  ["en", "claude"],
  ["en", "codex"],
].map(([lang, agent]) => ({
  lang,
  agent,
  skill: read("templates", lang, agent, "skills", "intent-export-cc-sdd", "SKILL.md"),
  map: read(
    "templates",
    lang,
    agent,
    "skills",
    "intent-export-cc-sdd",
    "rules",
    "map-cc-sdd.md",
  ),
}));

function validateCcSddSkill(body) {
  assert.match(body, /execution-contract\.md/);
  assert.match(body, /common selection result|共通選別結果/i);
  assert.match(body, /`selected`/);
  assert.match(body, /`constraint-selection\.md`/);
  assert.match(body, /same run|同じrun/i);
  assert.match(body, /replace the entire file|全置換/i);
  assert.match(body, /legacy-not-applied/);
  assert.match(body, /requirements\.md[\s\S]+(?:only|だけ)[\s\S]+kiro-spec-init/i);
  assert.match(body, /do not pass[\s\S]+constraint-selection\.md|constraint-selection\.md[\s\S]+渡さない/i);
  assert.doesNotMatch(
    body,
    /^\s+- (?:入力を対象 packet|Input is limited to the target packet)[^\n]+compass/im,
    "applied cc-sdd skill must not advertise Compass as an unconditional input",
  );
}

function validateCcSddMap(body) {
  assert.match(body, /common selection result|共通選別結果/i);
  assert.match(body, /`selection_status: applied`/);
  assert.match(body, /`selected`/);
  assert.match(body, /requirements\.md[\s\S]+`## Invariants`/i);
  assert.match(body, /design\.md[\s\S]+(?:design constraints|設計制約)/i);
  assert.match(body, /tasks\.md[\s\S]+(?:task constraints|タスク制約)/i);

  for (const field of DOWNSTREAM_FIELDS) {
    assert.ok(body.includes(`\`${field}\``), `cc-sdd map defines ${field}`);
  }

  assert.match(body, /Do not include ordinary selection reasons|通常の選別理由[^\n]+含めない/i);
  assert.match(body, /applicability condition[\s\S]+constraint conflict[\s\S]+regulatory, audit, or safety assurance|適用条件[\s\S]+制約の衝突[\s\S]+規制・監査・安全保証/i);
  assert.match(body, /Do not promote `confirm` candidates[^\n]+(?:MUST|Invariant)[^\n]+acceptance|`confirm` 候補[^\n]+(?:MUST|Invariant)[^\n]+受入[^\n]+昇格させない/i);
  assert.match(body, /`constraint-selection\.md`/);
  assert.match(body, /do not pass[\s\S]+downstream|下流[\s\S]+渡さない/i);
  assert.match(body, /`selection_status: legacy-not-applied`/);
  assert.match(body, /preserve[\s\S]+existing|従来[\s\S]+維持/i);

  assert.match(body, /Acceptance Material/);
  assert.match(body, /Revalidation Candidates/);
  assert.match(body, /candidates, not adopted|候補・未採用/i);
  assert.match(body, /three-phase approval|3フェーズ承認/i);

  for (const unconditionalCompassInput of [
    /^- 読むのは[^\n]+intent-compass/m,
    /^- Read only[^\n]+intent-compass/m,
    /^- 情報源は[^\n]+compass/m,
    /^- The information source is[^\n]+compass/m,
    /^- 由来:[^\n]+compass/m,
    /^- Origin:[^\n]+compass/m,
  ]) {
    assert.doesNotMatch(
      body,
      unconditionalCompassInput,
      "applied cc-sdd placement must not read or transcribe Compass directly",
    );
  }
  assert.match(
    body,
    /`selection_status: applied`[^\n]+(?:`selected`|selected)[^\n]+(?:only|だけ)|(?:`selected`|selected)[^\n]+(?:only|だけ)[^\n]+`selection_status: applied`/i,
  );
  assert.match(
    body,
    /`selection_status: legacy-not-applied`[\s\S]+(?:packet \+ Compass|packet \+ compass|packet と Compass)/i,
  );
}

test("cc-sddの4配布面が共通選別結果と内部記録を同じrunで扱う", () => {
  for (const { skill } of CC_SDD_SURFACES) {
    validateCcSddSkill(skill);
  }
});

test("cc-sddの4配置規則が採用制約だけを既存見出しへ写し、内部情報を下流から分離する", () => {
  for (const { map } of CC_SDD_SURFACES) {
    validateCcSddMap(map);
  }
});

test("cc-sdd配置検査は通常理由の混入・確認候補の確定化・内部記録の受け渡しを検出する", () => {
  const base = CC_SDD_SURFACES.find(({ lang, agent }) => lang === "en" && agent === "codex").map;
  validateCcSddMap(base);

  const leakedReason = base.replace(
    /Do not include ordinary selection reasons/i,
    "Include ordinary selection reasons",
  );
  assert.notEqual(leakedReason, base, "reason-leak mutation changes the map");
  assert.throws(() => validateCcSddMap(leakedReason), /ordinary selection reasons/i);

  const promotedConfirm = base.replace(
    /Do not promote `confirm` candidates/i,
    "Promote `confirm` candidates",
  );
  assert.notEqual(promotedConfirm, base, "confirm-promotion mutation changes the map");
  assert.throws(() => validateCcSddMap(promotedConfirm), /confirm/i);

  const passedRecord = base.replace(
    /Do not pass `constraint-selection\.md` downstream/i,
    "Pass `constraint-selection.md` downstream",
  );
  assert.notEqual(passedRecord, base, "record-handoff mutation changes the map");
  assert.throws(() => validateCcSddMap(passedRecord), /downstream/i);

  const unconditionalCompass = `${base}\n- Read only the target packet and .intent/intent-compass.md Invariants for every export.`;
  assert.throws(
    () => validateCcSddMap(unconditionalCompass),
    /must not read or transcribe Compass directly/,
  );

  const legacyFallbackRemoved = base.replace(
    /packet \+ Compass input and placement/i,
    "selected input and placement",
  );
  assert.notEqual(legacyFallbackRemoved, base, "legacy-fallback mutation changes the map");
  assert.throws(() => validateCcSddMap(legacyFallbackRemoved), /legacy-not-applied/i);
});

const OPENSPEC_SURFACES = [
  ["ja", "claude"],
  ["ja", "codex"],
  ["en", "claude"],
  ["en", "codex"],
].map(([lang, agent]) => ({
  lang,
  agent,
  skill: read("templates", lang, agent, "skills", "intent-export-openspec", "SKILL.md"),
  map: read(
    "templates",
    lang,
    agent,
    "skills",
    "intent-export-openspec",
    "rules",
    "map-openspec.md",
  ),
}));

function validateOpenSpecSkill(body) {
  assert.match(body, /execution-contract\.md/);
  assert.match(body, /common selection result|共通選別結果/i);
  assert.match(body, /`selected`/);
  assert.match(body, /`constraint-selection\.md`/);
  assert.match(body, /same run|同じrun/i);
  assert.match(body, /replace the entire file|全置換/i);
  assert.match(body, /legacy-not-applied/);
  assert.match(body, /proposal\.md[\s\S]+spec-delta\.md[\s\S]+(?:only|だけ)[\s\S]+opsx:propose/i);
  assert.match(body, /do not pass[\s\S]+constraint-selection\.md|constraint-selection\.md[\s\S]+渡さない/i);
  assert.doesNotMatch(
    body,
    /^\s+- (?:入力を対象 packet|The input is only)[^\n]+compass/im,
    "applied OpenSpec skill must not advertise Compass as an unconditional input",
  );
}

function validateOpenSpecMap(body) {
  assert.match(body, /common selection result|共通選別結果/i);
  assert.match(body, /`selection_status: applied`/);
  assert.match(body, /`selected`/);
  assert.match(body, /proposal\.md[\s\S]+`## Impact`/i);
  assert.match(body, /spec-delta\.md[\s\S]+(?:directly related|直接関係)/i);

  for (const field of DOWNSTREAM_FIELDS) {
    assert.ok(body.includes(`\`${field}\``), `OpenSpec map defines ${field}`);
  }

  assert.match(body, /Do not include ordinary selection reasons|通常の選別理由[^\n]+含めない/i);
  assert.match(body, /applicability condition[\s\S]+constraint conflict[\s\S]+regulatory, audit, or safety assurance|適用条件[\s\S]+制約の衝突[\s\S]+規制・監査・安全保証/i);
  assert.match(body, /Do not promote `confirm` candidates[^\n]+(?:MUST|Invariant)[^\n]+acceptance|`confirm` 候補[^\n]+(?:MUST|Invariant)[^\n]+受入[^\n]+昇格させない/i);
  assert.match(body, /`constraint-selection\.md`/);
  assert.match(body, /do not pass[\s\S]+downstream|下流[\s\S]+渡さない/i);
  assert.match(body, /`selection_status: legacy-not-applied`/);
  assert.match(body, /preserve[\s\S]+existing|従来[\s\S]+維持/i);

  assert.match(body, /`## Impact`/);
  assert.match(body, /Revalidation Candidates/);
  assert.match(body, /candidates, not adopted|候補・未採用/i);
  assert.match(body, /approval[\s\S]+OpenSpec|OpenSpec[\s\S]+承認/i);

  for (const unconditionalCompassInput of [
    /^- 読むのは[^\n]+intent-compass/m,
    /^- Read only[^\n]+intent-compass/m,
    /^- 情報源を[^\n]+compass/m,
    /^- Limit the information source[^\n]+compass/m,
    /^- Intent propagation[^\n]+compass/m,
  ]) {
    assert.doesNotMatch(
      body,
      unconditionalCompassInput,
      "applied OpenSpec placement must not read or transcribe Compass directly",
    );
  }
  assert.match(
    body,
    /`selection_status: applied`[^\n]+(?:`selected`|selected)[^\n]+(?:only|だけ)|(?:`selected`|selected)[^\n]+(?:only|だけ)[^\n]+`selection_status: applied`/i,
  );
  assert.match(
    body,
    /`selection_status: legacy-not-applied`[\s\S]+(?:packet \+ Compass|packet \+ compass|packet と Compass)/i,
  );
}

test("OpenSpecの4配布面が共通選別結果と内部記録を同じrunで扱う", () => {
  for (const { skill } of OPENSPEC_SURFACES) {
    validateOpenSpecSkill(skill);
  }
});

test("OpenSpecの4配置規則が採用制約だけをImpactと必要なdeltaヒントへ写し、内部情報を下流から分離する", () => {
  for (const { map } of OPENSPEC_SURFACES) {
    validateOpenSpecMap(map);
  }
});

test("OpenSpec配置検査は通常理由の混入・確認候補の確定化・内部記録の受け渡しを検出する", () => {
  const base = OPENSPEC_SURFACES.find(({ lang, agent }) => lang === "en" && agent === "codex").map;
  validateOpenSpecMap(base);

  const leakedReason = base.replace(
    /Do not include ordinary selection reasons/i,
    "Include ordinary selection reasons",
  );
  assert.notEqual(leakedReason, base, "reason-leak mutation changes the map");
  assert.throws(() => validateOpenSpecMap(leakedReason), /ordinary selection reasons/i);

  const promotedConfirm = base.replace(
    /Do not promote `confirm` candidates/i,
    "Promote `confirm` candidates",
  );
  assert.notEqual(promotedConfirm, base, "confirm-promotion mutation changes the map");
  assert.throws(() => validateOpenSpecMap(promotedConfirm), /confirm/i);

  const passedRecord = base.replace(
    /Do not pass `constraint-selection\.md` downstream/i,
    "Pass `constraint-selection.md` downstream",
  );
  assert.notEqual(passedRecord, base, "record-handoff mutation changes the map");
  assert.throws(() => validateOpenSpecMap(passedRecord), /downstream/i);

  const unconditionalCompass = `${base}\n- Read only the target packet and .intent/intent-compass.md Invariants for every export.`;
  assert.throws(
    () => validateOpenSpecMap(unconditionalCompass),
    /must not read or transcribe Compass directly/,
  );

  const legacyFallbackRemoved = base.replace(
    /packet \+ Compass input and placement/i,
    "selected input and placement",
  );
  assert.notEqual(legacyFallbackRemoved, base, "legacy-fallback mutation changes the map");
  assert.throws(() => validateOpenSpecMap(legacyFallbackRemoved), /legacy-not-applied/i);
});

const SPECKIT_SURFACES = [
  ["ja", "claude"],
  ["ja", "codex"],
  ["en", "claude"],
  ["en", "codex"],
].map(([lang, agent]) => ({
  lang,
  agent,
  skill: read("templates", lang, agent, "skills", "intent-export-speckit", "SKILL.md"),
  map: read(
    "templates",
    lang,
    agent,
    "skills",
    "intent-export-speckit",
    "rules",
    "map-speckit.md",
  ),
}));

function validateSpecKitSkill(body) {
  assert.match(body, /execution-contract\.md/);
  assert.match(body, /common selection result|共通選別結果/i);
  assert.match(body, /`selected`/);
  assert.match(body, /`constraint-selection\.md`/);
  assert.match(body, /same run|同じrun/i);
  assert.match(body, /replace the entire file|全置換/i);
  assert.match(body, /legacy-not-applied/);
  assert.match(body, /specify-input\.md[\s\S]+(?:only|だけ)[\s\S]+speckit\.specify/i);
  assert.match(body, /do not pass[\s\S]+constraint-selection\.md|constraint-selection\.md[\s\S]+渡さない/i);
  assert.doesNotMatch(
    body,
    /^\s+- (?:入力を対象 packet|The input is limited to|The input is only)[^\n]+compass/im,
    "applied Spec Kit skill must not advertise Compass as an unconditional input",
  );
}

function validateSpecKitMap(body) {
  assert.match(body, /common selection result|共通選別結果/i);
  assert.match(body, /`selection_status: applied`/);
  assert.match(body, /`selected`/);
  assert.match(body, /specify-input\.md[\s\S]+(?:feature description|機能記述)/i);
  assert.match(body, /spec-hints\.md[\s\S]+`## (?:Invariant 参照|Invariant Reference)`/i);

  for (const field of DOWNSTREAM_FIELDS) {
    assert.ok(body.includes(`\`${field}\``), `Spec Kit map defines ${field}`);
  }

  assert.match(body, /Do not include ordinary selection reasons|通常の選別理由[^\n]+含めない/i);
  assert.match(body, /applicability condition[\s\S]+constraint conflict[\s\S]+regulatory, audit, or safety assurance|適用条件[\s\S]+制約の衝突[\s\S]+規制・監査・安全保証/i);
  assert.match(body, /Do not promote `confirm` candidates[^\n]+(?:MUST|Invariant)[^\n]+acceptance|`confirm` 候補[^\n]+(?:MUST|Invariant)[^\n]+受入[^\n]+昇格させない/i);
  assert.match(body, /`constraint-selection\.md`/);
  assert.match(body, /do not pass[\s\S]+downstream|下流[\s\S]+渡さない/i);
  assert.match(body, /`selection_status: legacy-not-applied`/);
  assert.match(body, /preserve[\s\S]+existing|従来[\s\S]+維持/i);

  assert.match(body, /Parent Intent (?:参照|Reference)/i);
  assert.match(body, /Invariant (?:参照|Reference)/i);
  assert.match(body, /Revalidation Candidates/);
  assert.match(body, /candidates, not adopted|候補・未採用/i);
  assert.match(body, /constitution[\s\S]+user(?:'s)? (?:decision|call)|constitution[\s\S]+利用者判断/i);
  assert.match(body, /approval[\s\S]+Spec Kit|Spec Kit[\s\S]+承認/i);

  for (const unconditionalCompassInput of [
    /^- 読むのは[^\n]+intent-compass/m,
    /^- Read only[^\n]+intent-compass/m,
    /^- 情報源は[^\n]+compass/m,
    /^- Limit sources[^\n]+compass/m,
    /^- compass の \*\*Invariants\*\*/m,
    /^- Distill the compass's \*\*Invariants\*\*/m,
  ]) {
    assert.doesNotMatch(
      body,
      unconditionalCompassInput,
      "applied Spec Kit placement must not read or transcribe Compass directly",
    );
  }
  assert.match(
    body,
    /`selection_status: applied`[^\n]+(?:`selected`|selected)[^\n]+(?:only|だけ)|(?:`selected`|selected)[^\n]+(?:only|だけ)[^\n]+`selection_status: applied`/i,
  );
  assert.match(
    body,
    /`selection_status: legacy-not-applied`[\s\S]+(?:packet \+ Compass|packet \+ compass|packet と Compass)/i,
  );
}

test("Spec Kitの4配布面が共通選別結果と内部記録を同じrunで扱う", () => {
  for (const { skill } of SPECKIT_SURFACES) {
    validateSpecKitSkill(skill);
  }
});

test("Spec Kitの4配置規則が採用制約だけをspecify投入記述とInvariant参照へ写し、内部情報を下流から分離する", () => {
  for (const { map } of SPECKIT_SURFACES) {
    validateSpecKitMap(map);
  }
});

test("Spec Kit配置検査は通常理由の混入・確認候補の確定化・内部記録の受け渡しを検出する", () => {
  const base = SPECKIT_SURFACES.find(({ lang, agent }) => lang === "en" && agent === "codex").map;
  validateSpecKitMap(base);

  const leakedReason = base.replace(
    /Do not include ordinary selection reasons/i,
    "Include ordinary selection reasons",
  );
  assert.notEqual(leakedReason, base, "reason-leak mutation changes the map");
  assert.throws(() => validateSpecKitMap(leakedReason), /ordinary selection reasons/i);

  const promotedConfirm = base.replace(
    /Do not promote `confirm` candidates/i,
    "Promote `confirm` candidates",
  );
  assert.notEqual(promotedConfirm, base, "confirm-promotion mutation changes the map");
  assert.throws(() => validateSpecKitMap(promotedConfirm), /confirm/i);

  const passedRecord = base.replace(
    /Do not pass `constraint-selection\.md` downstream/i,
    "Pass `constraint-selection.md` downstream",
  );
  assert.notEqual(passedRecord, base, "record-handoff mutation changes the map");
  assert.throws(() => validateSpecKitMap(passedRecord), /downstream/i);

  const unconditionalCompass = `${base}\n- Read only the target packet and .intent/intent-compass.md Invariants for every export.`;
  assert.throws(
    () => validateSpecKitMap(unconditionalCompass),
    /must not read or transcribe Compass directly/,
  );

  const legacyFallbackRemoved = base.replaceAll(
    /packet \+ Compass/gi,
    "selected",
  );
  assert.notEqual(legacyFallbackRemoved, base, "legacy-fallback mutation changes the map");
  assert.throws(() => validateSpecKitMap(legacyFallbackRemoved), /legacy-not-applied/i);
});

function validateExportIntegrationContract(body) {
  const section = selectionSection(body);

  assert.match(
    section,
    /`relevance`[\s\S]+`projection`|`projection`[\s\S]+`relevance`/i,
    "relevance and projection confirmations remain distinct",
  );
  assert.match(
    section,
    /human answer|human confirmation|人の回答|人の確認/i,
    "human confirmation is required before rerunning",
  );
  assert.match(
    section,
    /canonical[\s\S]+rerun|正本[\s\S]+再実行/i,
    "confirmation is reflected through canonical material and a fresh run",
  );
  assert.match(
    section,
    /do not move[^\n]+directly|直接[^\n]*移しません/i,
    "confirmation does not mutate the selected set directly",
  );

  assert.match(
    section,
    /execution contract[\s\S]+legacy-not-applied|実行契約[\s\S]+legacy-not-applied/i,
  );
  const fallbackLines = section.split("\n");
  const indexFallback = fallbackLines.find(
    (line) => /index is absent|indexがない/i.test(line) && line.includes("index-missing"),
  ) ?? "";
  assert.match(
    indexFallback,
    /selection_status: applied/i,
    "index loss degrades an applied run instead of emulating a missing contract",
  );
  assert.match(indexFallback, /source_mode: legacy-compass/i);
  assert.doesNotMatch(
    indexFallback,
    /legacy-not-applied/i,
    "index loss degrades an applied run instead of emulating a missing contract",
  );
  assert.match(
    section,
    /all target symbols|対象記号[のがを]*(?:全部|全て|すべて|全件)/i,
    "all target symbols missing has an explicit fallback",
  );
  assert.match(
    section,
    /some target symbols|一部[のを]対象記号|対象記号[のがを]*一部/i,
    "partial target symbol loss has an explicit fallback",
  );
  assert.match(section, /`symbol-missing`/);
  assert.match(section, /`mixed-compass`/);

  assert.match(
    section,
    /stage[^\n]+all[^\n]+outputs|全(?:出力|ての出力)[^\n]+(?:書き換え|置換)前/i,
    "all outputs are prepared before replacement",
  );
  assert.match(
    section,
    /leave[\s\S]+previous[\s\S]+unchanged|直前[\s\S]+変更しない|既存[\s\S]+変更しない/i,
    "a failed run leaves the previous coherent output set unchanged",
  );
}

function validateTargetIntegrationNonInterference(body) {
  assert.match(body, /drift[^\n]+Open Questions/i);
  assert.match(
    body,
    /do not use[^\n]+common selection result[^\n]+downstream constraints[^\n]+internal record|共通選別結果[^\n]+下流制約[^\n]+内部記録[^\n]+使わない/i,
    "warning and question reads cannot feed selection or its internal record",
  );
  assert.match(
    body,
    /canonical[\s\S]+rerun|正本[\s\S]+再実行/i,
    "only a canonical update can affect a rerun",
  );
}

test("共通契約が通常・確認あり・0件・再export・縮退を同じrun境界で統合する", () => {
  for (const body of Object.values(CONTRACTS)) {
    validateCommonSelectionContract(body);
    validateConstraintProjectionContract(body);
    validateSelectionRecordContract(body);
    validateExportIntegrationContract(body);
  }
});

test("3出口の警告・質問用読み取りは共通選別結果と内部記録へ流入しない", () => {
  for (const surface of [
    ...CC_SDD_SURFACES,
    ...OPENSPEC_SURFACES,
    ...SPECKIT_SURFACES,
  ]) {
    validateTargetIntegrationNonInterference(surface.map);
  }
});

test("統合契約検査は確認候補の直接採用・縮退状態の混同・片側更新を検出する", () => {
  const base = CONTRACTS.en;
  validateExportIntegrationContract(base);

  const directPromotion = base.replace(
    /Do not move[^\n]+directly[^\n]+/i,
    "Move a confirmed candidate directly into selected without rerunning.",
  );
  assert.notEqual(directPromotion, base, "direct-promotion mutation changes the contract");
  assert.throws(
    () => validateExportIntegrationContract(directPromotion),
    /does not mutate the selected set directly/,
  );

  const indexAsLegacy = base.replace(
    /index is absent[^\n]+`selection_status: applied`/i,
    "index is absent, use `selection_status: legacy-not-applied`",
  );
  assert.notEqual(indexAsLegacy, base, "index-status mutation changes the contract");
  assert.throws(
    () => validateExportIntegrationContract(indexAsLegacy),
    /index loss degrades an applied run/,
  );

  const partialPublish = base.replace(
    /leave[^\n]+previous[^\n]+unchanged/i,
    "keep whichever newly written output succeeded",
  );
  assert.notEqual(partialPublish, base, "partial-publish mutation changes the contract");
  assert.throws(
    () => validateExportIntegrationContract(partialPublish),
    /previous coherent output set unchanged/,
  );
});

const CONSTRAINT_SELECTION_THEORY = {
  ja: read("docs", "theory.md"),
  en: read("docs", "theory.en.md"),
};

const CONSTRAINT_SELECTION_OPERATION_DOCS = {
  "guide/ja": read("docs", "guide.md"),
  "guide/en": read("docs", "guide.en.md"),
  "root/ja-claude": read("templates", "ja", "agents", "claude", "CLAUDE.md"),
  "root/ja-codex": read("templates", "ja", "agents", "codex", "AGENTS.md"),
  "root/ja-gemini": read("templates", "ja", "agents", "gemini", "GEMINI.md"),
  "root/en-claude": read("templates", "en", "agents", "claude", "CLAUDE.md"),
  "root/en-codex": read("templates", "en", "agents", "codex", "AGENTS.md"),
  "root/en-gemini": read("templates", "en", "agents", "gemini", "GEMINI.md"),
  "contract/ja": CONTRACTS.ja,
  "contract/en": CONTRACTS.en,
  ...Object.fromEntries(
    [...CC_SDD_SURFACES, ...OPENSPEC_SURFACES, ...SPECKIT_SURFACES].flatMap(
      ({ lang, agent, skill, map }, index) => [
        [`export/${lang}-${agent}-${index}-skill`, skill],
        [`export/${lang}-${agent}-${index}-map`, map],
      ],
    ),
  ),
};

function validateTheoryFreeOperationDocument(body, label) {
  assert.doesNotMatch(
    body,
    /Information Hiding|Requirements Traceability|Assurance Case|Structured Assurance Case Metamodel|PDP\s*\/\s*PEP/,
    `${label}: operation document does not carry theory names or explanations`,
  );
  assert.doesNotMatch(
    body,
    /関係する制約だけを下流へ渡す — 選別・実行・根拠の分離|Passing only relevant constraints downstream — separating selection, execution, and rationale/,
    `${label}: detailed theory section remains in theory documents only`,
  );
}

function constraintSelectionTheorySection(body, lang) {
  const heading = lang === "ja"
    ? "## 関係する制約だけを下流へ渡す — 選別・実行・根拠の分離"
    : "## Passing only relevant constraints downstream — separating selection, execution, and rationale";
  const start = body.indexOf(heading);
  assert.notEqual(start, -1, `${lang}: constraint-selection theory heading exists`);
  const next = body.indexOf("\n## ", start + heading.length);
  return body.slice(start, next === -1 ? body.length : next);
}

function validateConstraintSelectionTheory(body, lang) {
  const section = constraintSelectionTheorySection(body, lang);

  for (const concept of [
    "Information Hiding",
    "Requirements Traceability",
    "Design Rationale",
    "PDP",
    "PEP",
    "Assurance Case",
  ]) {
    assert.ok(section.includes(concept), `${lang}: theory explains ${concept}`);
  }

  assert.match(
    section,
    lang === "ja"
      ? /Packet[^]*制約[^]*(?:射影|写像)[^]*下流/
      : /Packet[^]*(?:project|projection)[^]*constraint[^]*downstream/i,
    `${lang}: theory derives downstream projection from the Packet`,
  );
  assert.match(
    section,
    lang === "ja"
      ? /識別子[^]*正本参照[^]*(?:由来|トレーサビリティ)/
      : /identifier[^]*canonical reference[^]*(?:provenance|traceability)/i,
    `${lang}: theory preserves provenance without copying rationale downstream`,
  );
  assert.match(
    section,
    lang === "ja"
      ? /説明責任[^]*内部[^]*選別記録[^]*(?:一行|短い)/
      : /accountability[^]*internal[^]*selection record[^]*(?:one-line|short)/i,
    `${lang}: theory places reviewable rationale in the internal record`,
  );
  assert.match(
    section,
    lang === "ja"
      ? /未確定[^]*(?:確認候補|分離)[^]*(?:確定制約|採用集合)[^]*(?:混ぜない|含めない)/
      : /unresolved[^]*(?:confirmation candidate|separate)[^]*(?:settled constraint|selected set)[^]*(?:not mix|exclude)/i,
    `${lang}: theory separates unresolved candidates from settled constraints`,
  );
  assert.match(
    section,
    lang === "ja"
      ? /長い[^]*選別理由[^]*下流[^]*(?:渡さない|含めない)[^]*内部[^]*記録/
      : /long[^]*selection rationale[^]*(?:not pass|exclude)[^]*downstream[^]*internal[^]*record/i,
    `${lang}: theory keeps long selection rationale out of downstream input`,
  );

  const exceptionPatterns = lang === "ja"
    ? [/適用条件/, /制約[^]*衝突/, /規制[^]*監査[^]*安全保証/]
    : [/applicability condition/i, /constraint conflict/i, /regulatory[^]*audit[^]*safety assurance/i];
  for (const pattern of exceptionPatterns) {
    assert.match(section, pattern, `${lang}: theory states rationale exception ${pattern}`);
  }
  assert.match(
    section,
    lang === "ja"
      ? /必要最小限[^]*(?:理由|根拠)[^]*下流/
      : /minimum necessary[^]*(?:rationale|reason)[^]*downstream/i,
    `${lang}: exceptions pass only the minimum necessary rationale`,
  );

  const riskPatterns = lang === "ja"
    ? [/過剰選択/, /過少選択/, /局所最適/, /誤った確定/]
    : [/over-selection/i, /under-selection/i, /local optimi[sz]ation/i, /false confirmation/i];
  for (const pattern of riskPatterns) {
    assert.match(section, pattern, `${lang}: theory bounds risk ${pattern}`);
  }
  assert.match(
    section,
    lang === "ja"
      ? /これらの理論は[^。]*AI の実装精度を直接実証[^。]*ものではありません/
      : /These theories do not directly demonstrate AI implementation accuracy/i,
    `${lang}: theory does not claim direct evidence of AI implementation accuracy`,
  );
  assert.match(
    section,
    lang === "ja"
      ? /PDP[^]*PEP[^]*同一視[^]*できません/
      : /PDP[^]*PEP[^]*not identical/i,
    `${lang}: PDP/PEP is an analogy rather than an identity claim`,
  );

  for (const source of ["Parnas", "Gotel", "Finkelstein", "XACML", "SACM"]) {
    assert.ok(section.includes(source), `${lang}: theory cites ${source}`);
  }

  return section;
}

test("制約選別の理論節が五つの理論から下流写像・由来・内部記録の分離を日英で導く", () => {
  for (const [lang, body] of Object.entries(CONSTRAINT_SELECTION_THEORY)) {
    validateConstraintSelectionTheory(body, lang);
  }
});

test("制約選別の理論節が理由を渡す三例外・防止範囲・AI実装精度の未実証を日英で区別する", () => {
  for (const [lang, body] of Object.entries(CONSTRAINT_SELECTION_THEORY)) {
    validateConstraintSelectionTheory(body, lang);
  }
});

test("詳しい理論説明はTheory日英版に留まり、guide・常時参照文書・export手順へ流入しない", () => {
  for (const [label, body] of Object.entries(CONSTRAINT_SELECTION_OPERATION_DOCS)) {
    validateTheoryFreeOperationDocument(body, label);
  }

  assert.throws(
    () => validateTheoryFreeOperationDocument(
      `${CONTRACTS.en}\nInformation Hiding and PDP/PEP explain this operation.`,
      "mutated-contract",
    ),
    /does not carry theory names or explanations/,
  );
});

test("理論検査は責務分離の同一視・理由例外の欠落・実装精度の過大主張を検出する", () => {
  const base = CONSTRAINT_SELECTION_THEORY.en;
  validateConstraintSelectionTheory(base, "en");

  const collapsedResponsibilities = base.replace(
    /PDP \/ PEP is only a responsibility-separation analogy; it is not identical[^\n]+/i,
    "PDP/PEP is identical to Compass and Packet.",
  );
  assert.notEqual(collapsedResponsibilities, base, "PDP/PEP mutation changes the theory");
  assert.throws(
    () => validateConstraintSelectionTheory(collapsedResponsibilities, "en"),
    /analogy rather than an identity claim/,
  );

  const missingConflict = base.replace(/constraint conflict/gi, "ordinary selection");
  assert.notEqual(missingConflict, base, "rationale-exception mutation changes the theory");
  assert.throws(
    () => validateConstraintSelectionTheory(missingConflict, "en"),
    /rationale exception/,
  );

  const overclaimedAccuracy = base.replace(
    /do not directly demonstrate AI implementation accuracy/i,
    "directly proves AI implementation accuracy",
  );
  assert.notEqual(overclaimedAccuracy, base, "accuracy-limit mutation changes the theory");
  assert.throws(
    () => validateConstraintSelectionTheory(overclaimedAccuracy, "en"),
    /does not claim direct evidence/,
  );
});
