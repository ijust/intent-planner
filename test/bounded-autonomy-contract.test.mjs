// bounded-autonomy-risk-control: one runtime contract, five readers, thin entry points.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");
const exists = (...parts) => fs.existsSync(path.join(ROOT, ...parts));
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];

function section(body, heading, nextHeading) {
  const start = body.indexOf(heading);
  assert.notEqual(start, -1, `section exists: ${heading}`);
  const end = nextHeading ? body.indexOf(nextHeading, start + heading.length) : body.length;
  return body.slice(start, end === -1 ? body.length : end);
}

function validateContractSemantics(body) {
  const preferenceRow = body.split("\n").find((line) => line.includes("| Preference / Heuristic |")) ?? "";
  assert.ok(preferenceRow, "Preference / Heuristic row exists");
  assert.doesNotMatch(preferenceRow, /\bMUST\b|\bSHALL\b|承認必須|approval required/i);

  const decisions = section(body, body.includes("## 実装中の判断") ? "## 実装中の判断" : "## Decisions during implementation", body.includes("## direct 実装レビュー") ? "## direct 実装レビュー" : "## Direct implementation review");
  for (const choice of ["A.", "B.", "C."]) assert.ok(decisions.includes(choice), `decision section contains ${choice}`);
  assert.match(decisions, /wait|待ち|待つ/i, "the boundary-crossing decision itself waits");
  assert.match(decisions, /silently discard|黙って捨て/i, "the decision section forbids silent discard");

  const direct = section(body, body.includes("## direct 実装レビュー") ? "## direct 実装レビュー" : "## Direct implementation review", body.includes("## 下流と旧環境") ? "## 下流と旧環境" : "## Downstream and legacy environments");
  assert.match(direct, /before editing|編集前/i);
  assert.match(direct, /after editing|編集後/i);
  assert.ok(direct.includes("direct-review.md"));
}

function resolveContract(readerBody, contractBody) {
  assert.ok(readerBody.includes(".intent/execution-contract.md"), "reader references the shared contract");
  assert.ok(contractBody.length > 0, "referenced contract exists");
  validateContractSemantics(contractBody);
}

test("execution contract scaffold exists in both languages and Japanese dogfood is synchronized", () => {
  for (const lang of LANGS) {
    assert.ok(exists("templates", lang, "intent", "execution-contract.md"), `${lang}: scaffold exists`);
    const body = read("templates", lang, "intent", "execution-contract.md");
    for (const marker of [
      "Invariant",
      "Scope / Acceptance",
      "Decision",
      "Preference / Heuristic",
      "A.",
      "B.",
      "C.",
      "direct-review.md",
    ]) {
      assert.ok(body.includes(marker), `${lang}: execution contract contains ${marker}`);
    }
    assert.match(body, /new fact|新事実/i, `${lang}: proposal includes the new fact`);
    assert.match(body, /benefit|利益/i, `${lang}: proposal includes benefit`);
    assert.match(body, /risk|リスク/i, `${lang}: proposal includes risk`);
    assert.match(body, /wait|待つ/i, `${lang}: boundary crossing waits for a human`);
    assert.match(body, /unknown|不明/i, `${lang}: unknown strength is not guessed`);
    assert.match(body, /without asking|確認を増やさない/i, `${lang}: preference choices do not add confirmation`);
    assert.match(body, /silently discard|黙って捨て/i, `${lang}: a useful deviation is not silently discarded`);
    assert.match(body, /legacy|旧環境/i, `${lang}: legacy absence has a fallback`);
    assert.match(body, /before editing|編集前/i, `${lang}: direct pre-review exists`);
    assert.match(body, /after editing|編集後/i, `${lang}: direct post-review exists`);
    assert.match(body, /independent viewpoint|別視点/i, `${lang}: separate review is preferred`);
    assert.match(body, /self-review|自己レビュー/i, `${lang}: self-review fallback exists`);
    validateContractSemantics(body);
  }

  assert.equal(
    read(".intent", "execution-contract.md"),
    read("templates", "ja", "intent", "execution-contract.md"),
    "dogfood contract is byte-identical to the Japanese scaffold",
  );
});

test("all four skill contracts point to the runtime contract without copying its decision menu", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const body = read("templates", lang, agent, "skills", "CONTRACT.md");
      assert.ok(body.includes(".intent/execution-contract.md"), `${lang}/${agent}: shared contract is referenced`);
      assert.ok(!body.includes("A. Maintain the agreed design"), `${lang}/${agent}: English menu is not copied`);
      assert.ok(!body.includes("A. 合意済み設計を維持"), `${lang}/${agent}: Japanese menu is not copied`);
    }
  }
});

// 検査対象は「利用者が実際に読む実体」。claude / gemini は本体 (*_intent.md)、codex は
// AGENTS.md（@import 記法が無く入口と本体を兼ねる）。入口 CLAUDE.md / GEMINI.md は本体への
// 参照1行に徹するため、規律の実体はそこには置かない（Anti-460 / Anti-533・2026-07-14）。
test("direct root documents keep a thin JIT reference to the execution contract", () => {
  const docs = LANGS.flatMap((lang) => [
    ["templates", lang, "agents", "claude", "CLAUDE_intent.md"],
    ["templates", lang, "agents", "codex", "AGENTS.md"],
    ["templates", lang, "agents", "gemini", "GEMINI_intent.md"],
  ]);
  for (const parts of docs) {
    const body = read(...parts);
    assert.ok(body.includes(".intent/execution-contract.md"), `${parts.join("/")}: JIT reference exists`);
    assert.ok(!body.includes("A. Maintain the agreed design"), `${parts.join("/")}: menu is not copied`);
    assert.ok(!body.includes("A. 合意済み設計を維持"), `${parts.join("/")}: menu is not copied`);
  }
  assert.ok(read("AGENTS.md").includes(".intent/execution-contract.md"), "Codex dogfood root doc is wired");
  assert.ok(read("CLAUDE_intent.md").includes(".intent/execution-contract.md"), "Claude dogfood imported root doc is wired");
});

test("cc-sdd, OpenSpec, and Spec Kit maps carry the same execution-contract reference", () => {
  const maps = [
    ["intent-export-cc-sdd", "map-cc-sdd.md"],
    ["intent-export-openspec", "map-openspec.md"],
    ["intent-export-speckit", "map-speckit.md"],
  ];
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      for (const [skill, filename] of maps) {
        const body = read("templates", lang, agent, "skills", skill, "rules", filename);
        assert.ok(body.includes(".intent/execution-contract.md"), `${lang}/${agent}/${skill}: source is referenced`);
        assert.ok(body.includes("## Execution Contract"), `${lang}/${agent}/${skill}: handoff heading is fixed`);
        assert.match(body, /fail-open|fail open/i, `${lang}/${agent}/${skill}: contract absence is fail-open`);
        assert.ok(!body.includes("A. Maintain the agreed design"), `${lang}/${agent}/${skill}: menu is not copied`);
        assert.ok(!body.includes("A. 合意済み設計を維持"), `${lang}/${agent}/${skill}: menu is not copied`);
      }
    }
  }
});

test("writeback treats boundary crossing as a three-way human decision before canonical promotion", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const body = read(
        "templates",
        lang,
        agent,
        "skills",
        "intent-writeback",
        "rules",
        "writeback-protocol.md",
      );
      assert.ok(body.includes(".intent/execution-contract.md"), `${lang}/${agent}: writeback reads the contract`);
      const section = body.match(/## 2\.5[^\n]*\n([\s\S]*?)\n## 3\./)?.[1] ?? "";
      assert.ok(section.includes("A/B/C"), `${lang}/${agent}: the contract's three choices are invoked`);
      assert.match(section, /canonical/i, `${lang}/${agent}: canonical promotion is named`);
      assert.match(section, /pending/i, `${lang}/${agent}: unresolved deviation remains pending`);
      assert.match(section, /do not redefine|再定義しない/i, `${lang}/${agent}: shared decision semantics are not copied`);
      assert.doesNotMatch(section, /new fact|新事実/i, `${lang}/${agent}: decision material is not duplicated`);
      assert.match(section, /fail-open|fail open/i, `${lang}/${agent}: missing contract is fail-open`);
    }
  }
});

test("one boundary-crossing fixture resolves to the same contract through all five readers", () => {
  const contract = read("templates", "ja", "intent", "execution-contract.md");
  const readers = [
    read("templates", "ja", "agents", "codex", "AGENTS.md"),
    read("templates", "ja", "claude", "skills", "intent-export-cc-sdd", "rules", "map-cc-sdd.md"),
    read("templates", "ja", "claude", "skills", "intent-export-openspec", "rules", "map-openspec.md"),
    read("templates", "ja", "claude", "skills", "intent-export-speckit", "rules", "map-speckit.md"),
    read("templates", "ja", "claude", "skills", "intent-writeback", "rules", "writeback-protocol.md"),
  ];
  for (const reader of readers) resolveContract(reader, contract);
});

test("mutations catch contract deletion, one-reader disconnection, Preference promotion, and removed waiting", () => {
  const contract = read("templates", "en", "intent", "execution-contract.md");
  const directReader = read("templates", "en", "agents", "codex", "AGENTS.md");

  assert.throws(() => resolveContract(directReader, ""), /exists/);
  const disconnectedReader = directReader.replaceAll(
    ".intent/execution-contract.md",
    ".intent/missing.md",
  );
  assert.notEqual(disconnectedReader, directReader, "reader-disconnection mutation changes the fixture");
  assert.doesNotMatch(
    disconnectedReader,
    /\.intent\/execution-contract\.md/,
    "reader-disconnection mutation removes every shared-contract reference",
  );
  assert.throws(
    () => resolveContract(disconnectedReader, contract),
    /references/,
  );

  const preferenceMust = contract.replace(
    /\| Preference \/ Heuristic \|[^\n]+/,
    "| Preference / Heuristic | guidance | MUST obtain approval |",
  );
  assert.throws(() => validateContractSemantics(preferenceMust), /regular expression|match/i);

  const decisions = section(contract, "## Decisions during implementation", "## Direct implementation review");
  const noWait = contract.replace(decisions, decisions.replace(/Present the following decision material and wait for the human's answer:/, "Present the following decision material:"));
  assert.throws(() => validateContractSemantics(noWait), /wait/i);
});

test("Japanese dogfood readers stay synchronized with their template sources", () => {
  const rules = [
    ["intent-export-cc-sdd", "map-cc-sdd.md"],
    ["intent-export-openspec", "map-openspec.md"],
    ["intent-export-speckit", "map-speckit.md"],
    ["intent-writeback", "writeback-protocol.md"],
    // 領域スコープ実行の読み手 rule（federated-governance / C-fed2）。dogfood(.claude/.agents)が
    //   template から drift すると、その dogfood で回す CLI が silently 領域スコープを失う。
    //   独立レビュー 2026-07-15 の High 指摘（.agents 側の domain-scope.md 欠落が無検査）への対応。
    ["intent-improve", "domain-scope.md"],
    ["intent-validate", "domain-scope.md"],
  ];
  // dogfood と template で byte 同期を要求する SKILL.md（rules だけでなく本体の drift も捕らえる）。
  const skills = ["intent-improve", "intent-validate"];
  for (const agent of AGENTS) {
    const dogfoodRoot = agent === "claude" ? ".claude" : ".agents";
    assert.equal(
      read(dogfoodRoot, "skills", "CONTRACT.md"),
      read("templates", "ja", agent, "skills", "CONTRACT.md"),
      `${agent}: shared skill contract is synchronized`,
    );
    for (const [skill, filename] of rules) {
      assert.equal(
        read(dogfoodRoot, "skills", skill, "rules", filename),
        read("templates", "ja", agent, "skills", skill, "rules", filename),
        `${agent}/${skill}: rule is synchronized`,
      );
    }
    for (const skill of skills) {
      assert.equal(
        read(dogfoodRoot, "skills", skill, "SKILL.md"),
        read("templates", "ja", agent, "skills", skill, "SKILL.md"),
        `${agent}/${skill}: SKILL body is synchronized`,
      );
    }
  }
});
