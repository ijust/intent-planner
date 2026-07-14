// pkt-20260713-jit-revalidation-survival-rzd9
//
// JIT input is split into confirmed material, non-binding implementation-time
// revalidation candidates, and explicitly excluded bulk context. The contract
// is prose, so these tests pin the discriminative clauses across all shipped
// variants and exercise mutations that remove or strengthen those clauses.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];
const MAPS = [
  ["intent-export-cc-sdd", "map-cc-sdd.md"],
  ["intent-export-openspec", "map-openspec.md"],
  ["intent-export-speckit", "map-speckit.md"],
];

const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");

function assertRuntimeContract(body, lang) {
  const markers = lang === "ja"
    ? ["## JIT 入力の分け方", "確定材料", "実装時の再確認候補", "明示的に読まない情報"]
    : ["## Classifying JIT inputs", "confirmed material", "implementation-time revalidation candidates", "explicitly excluded information"];
  const searchable = lang === "ja" ? body : body.toLowerCase();
  for (const marker of markers) {
    const expected = lang === "ja" ? marker : marker.toLowerCase();
    assert.ok(searchable.includes(expected), `runtime contract includes ${marker}`);
  }
  assert.match(body, /Agent-discretion/);
  assert.match(body, /Revisit when/);
  assert.match(body, lang === "ja" ? /候補自体は非拘束/ : /candidate itself is non-binding/i);
  assert.match(body, lang === "ja" ? /境界内.*確認を増やさ/ : /inside the boundary.*without adding confirmation/i);
  assert.match(body, /Tree.*Compass.*archive/i);
}

function assertExportMap(body, lang) {
  assert.ok(body.includes("### Revalidation Candidates"), "map carries a labeled candidate subsection");
  assert.match(body, /Agent-discretion/);
  assert.match(body, /Revisit when/);
  assert.match(body, lang === "ja" ? /非拘束/ : /non-binding/i);
  assert.match(body, lang === "ja" ? /MUST.*SHALL.*Invariant.*受入条件/ : /MUST.*SHALL.*Invariant.*acceptance/i);
  assert.match(body, lang === "ja" ? /同一項目.*1回/ : /same item.*once/i);
  assert.match(body, lang === "ja" ? /候補がなければ.*省略/ : /no candidate.*omit/i);
  assert.match(body, lang === "ja" ? /Tree.*Compass.*archive.*全文/ : /full.*Tree.*Compass.*archive/i);
}

function assertWriteback(body, lang) {
  const section = body.match(/## 2\.5[^\n]*\n([\s\S]*?)\n## 3\./)?.[1] ?? "";
  assert.match(section, /Agent-discretion/);
  assert.match(section, /Revisit when/);
  assert.match(section, lang === "ja" ? /対象 packet.*同一項目/ : /target packet.*same item/i);
  assert.match(section, lang === "ja" ? /現実化しなければ.*delta/ : /does not materialize.*delta/i);
  assert.match(section, lang === "ja" ? /境界内.*確認を増やさ/ : /inside the boundary.*without adding confirmation/i);
  assert.match(section, /A\/B\/C/);
}

function draftContentDroppedRow(body) {
  return body.split("\n").find((line) => line.trim().startsWith("| draft-content-dropped |")) ?? "";
}

function assertValidatePolicy(checks, skill, lang) {
  const row = draftContentDroppedRow(checks);
  assert.ok(row, "draft-content-dropped row exists");
  const required = lang === "ja"
    ? ["確定材料の欠落", "再確認候補の拘束力昇格", "Tree / Compass / archive の全量注入"]
    : ["missing confirmed material", "binding-strength promotion of a revalidation candidate", "bulk injection of Tree / Compass / archive"];
  for (const marker of required) {
    assert.ok(checks.includes(marker), `catalog guidance includes ${marker}`);
    assert.ok(skill.includes(marker), `skill step includes ${marker}`);
  }
  assert.ok(checks.includes("export-draft-mismatch"), "packet-to-draft responsibility stays separate");
  assert.match(checks, lang === "ja" ? /全文と分かる.*証拠/ : /evidence.*clearly shows.*full content/i);
  assert.match(checks, lang === "ja" ? /単一の必要参照.*誤検出しない/ : /single necessary reference.*not.*false positive/i);
}

test("runtime contract classifies JIT inputs and Japanese dogfood stays synchronized", () => {
  for (const lang of LANGS) assertRuntimeContract(read("templates", lang, "intent", "execution-contract.md"), lang);
  assert.equal(read(".intent", "execution-contract.md"), read("templates", "ja", "intent", "execution-contract.md"));
});

test("all three exports carry each target-packet candidate once and never promote it", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      for (const [skill, file] of MAPS) {
        assertExportMap(read("templates", lang, agent, "skills", skill, "rules", file), lang);
      }
    }
  }
});

test("writeback consumes realized candidates without turning candidates into automatic changes", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      assertWriteback(read("templates", lang, agent, "skills", "intent-writeback", "rules", "writeback-protocol.md"), lang);
    }
  }
});

test("draft-content-dropped distinguishes missing material, strength promotion, and bulk injection", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const base = ["templates", lang, agent, "skills", "intent-validate"];
      assertValidatePolicy(read(...base, "rules", "validate-checks.md"), read(...base, "SKILL.md"), lang);
    }
  }
});

test("dogfood readers stay synchronized with Japanese templates", () => {
  for (const agent of AGENTS) {
    const dogfood = agent === "claude" ? ".claude" : ".agents";
    for (const [skill, file] of MAPS) {
      assert.equal(
        read(dogfood, "skills", skill, "rules", file),
        read("templates", "ja", agent, "skills", skill, "rules", file),
      );
    }
    assert.equal(
      read(dogfood, "skills", "intent-writeback", "rules", "writeback-protocol.md"),
      read("templates", "ja", agent, "skills", "intent-writeback", "rules", "writeback-protocol.md"),
    );
    assert.equal(
      read(dogfood, "skills", "intent-validate", "rules", "validate-checks.md"),
      read("templates", "ja", agent, "skills", "intent-validate", "rules", "validate-checks.md"),
    );
  }
});

test("mutations that drop or strengthen a candidate are rejected by the oracle", () => {
  const contract = read("templates", "ja", "intent", "execution-contract.md");
  assert.throws(
    () => assertRuntimeContract(contract.replace("候補自体は非拘束", "候補は必須要件"), "ja"),
  );

  const map = read("templates", "ja", "claude", "skills", "intent-export-cc-sdd", "rules", "map-cc-sdd.md");
  assert.throws(() => assertExportMap(map.replace("非拘束", "必須"), "ja"));
  assert.throws(() => assertExportMap(map.replace("同一項目を1回", "同一項目を必要なだけ複製"), "ja"));

  const checks = read("templates", "ja", "claude", "skills", "intent-validate", "rules", "validate-checks.md");
  const skill = read("templates", "ja", "claude", "skills", "intent-validate", "SKILL.md");
  assert.throws(
    () => assertValidatePolicy(checks.replace("Tree / Compass / archive の全量注入", "記述量の点数化"), skill, "ja"),
  );
});
