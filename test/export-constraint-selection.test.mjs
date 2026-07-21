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
