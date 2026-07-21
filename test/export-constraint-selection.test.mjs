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
