import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXPECTED = {
  "code-data.md": [
    "temporal-valid-and-transaction-time",
    "temporal-half-open-nonoverlap",
    "immutable-append-correct-replay",
    "immutable-selective-adoption",
  ],
  "code-backend.md": [
    "state-machine-explicit-transition-contract",
    "state-machine-path-and-failure-testing",
  ],
  "non-code-document.md": [
    "rfp-outcome-requirement-evaluation-alignment",
    "rfp-lifecycle-cost-and-exit",
    "effort-estimate-basis-and-range",
    "effort-estimate-update-with-actuals",
  ],
};

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

test("modeling/procurement/estimation starters: ja/en の期待領域に同じ ID がある", () => {
  for (const [file, ids] of Object.entries(EXPECTED)) {
    for (const lang of ["ja", "en"]) {
      const text = read(`templates/${lang}/intent/constraint-starters/${file}`);
      for (const id of ids) assert.match(text, new RegExp(`^## id: ${id}$`, "m"));
    }
  }
});

test("modeling/procurement/estimation starters: 親索引が5テーマを案内する", () => {
  const ja = read("templates/ja/intent/constraint-starters.md");
  const en = read("templates/en/intent/constraint-starters.md");
  for (const term of ["Temporal Data model", "Immutable Data model", "State Machine", "RFP", "工数見積もり"]) {
    assert.match(ja, new RegExp(term));
  }
  for (const term of ["temporal data model", "immutable data model", "state machine", "RFP", "effort estimation"]) {
    assert.match(en, new RegExp(term, "i"));
  }
});

test("modeling/procurement/estimation starters: dogfood は日本語テンプレートと一致する", () => {
  const files = ["constraint-starters.md", ...Object.keys(EXPECTED).map((file) => `constraint-starters/${file}`)];
  for (const file of files) {
    assert.equal(read(`.intent/${file}`), read(`templates/ja/intent/${file}`), file);
  }
});
