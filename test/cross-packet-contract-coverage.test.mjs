import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");

const paths = {
  impact: ["intent-discover", "rules", "algo-impact-analysis.md"],
  slicing: ["intent-packets", "rules", "algo-additive-slicing.md"],
  overview: ["intent-overview", "rules", "aggregate-sources.md"],
  validate: ["intent-validate", "rules", "validate-checks.md"],
};

function template(lang, agent, parts) {
  return read("templates", lang, agent, "skills", ...parts);
}

test("shared contracts flow from Impact Analysis to packet Safety and the existing plan", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const impact = template(lang, agent, paths.impact);
      const slicing = template(lang, agent, paths.slicing);

      assert.match(impact, /shared contract|共有契約/i, `${lang}/${agent}: Impact Analysis names shared contracts`);
      assert.match(impact, /two or more packets|複数 packet|複数の packet/i, `${lang}/${agent}: only cross-packet boundaries are marked`);
      assert.match(slicing, /Safety \/ Invariants/i, `${lang}/${agent}: the protection terminates in packet Safety`);
      assert.match(slicing, /plan\.md/i, `${lang}/${agent}: the existing plan carries the mapping`);
      assert.match(slicing, /integration oracle|統合時オラクル/i, `${lang}/${agent}: the integration oracle remains traceable`);
      assert.match(slicing, /no shared contract|共有契約が(?:無い|ない|なければ)/i, `${lang}/${agent}: single-packet work stays silent`);
    }
  }
});

test("overview reuses existing derived views and names all three cross-packet gaps", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const body = template(lang, agent, paths.overview);
      assert.match(body, /shared contract|共有契約/i, `${lang}/${agent}: shared-contract view exists`);
      assert.match(body, /unassigned|未担当/i, `${lang}/${agent}: unassigned contracts are named`);
      assert.match(body, /conflict|contradict|矛盾/i, `${lang}/${agent}: conflicting protection is named`);
      assert.match(body, /integration[^\n]*(unverified|not verified)|統合未確認/i, `${lang}/${agent}: missing integration verification is named`);
      assert.match(body, /coverage-map\.md/i, `${lang}/${agent}: the existing coverage map is reused`);
      assert.match(body, /agent-understanding-map\.md/i, `${lang}/${agent}: the existing understanding map is reused`);
      assert.match(body, /no shared contract|共有契約が(?:無い|ない|なければ)/i, `${lang}/${agent}: no extra section is emitted for single-packet work`);
    }
  }
});

test("validate adds one warn-only, non-retroactive cross-packet contract check", () => {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const body = template(lang, agent, paths.validate);
      const row = body.split("\n").find((line) => line.includes("cross-packet-contract-coverage")) ?? "";
      assert.ok(row, `${lang}/${agent}: check id exists`);
      assert.match(row, /shared contract|共有契約/i, `${lang}/${agent}: check follows shared contracts`);
      assert.match(row, /Safety \/ Invariants/i, `${lang}/${agent}: check requires a protecting packet`);
      assert.match(row, /integration oracle|統合時オラクル/i, `${lang}/${agent}: check requires an integration oracle`);
      assert.match(row, /recommend|推奨|warn/i, `${lang}/${agent}: findings are warning-only`);

      assert.match(body, /new or updated packets|新規・更新対象/i, `${lang}/${agent}: rollout is non-retroactive`);
      assert.match(body, /archive[^\n]*(?:do not|not|除外|触れ)|archive.*非接触/i, `${lang}/${agent}: archived packets are untouched`);
      assert.match(body, /no shared contract|共有契約が(?:無い|ない|なければ)/i, `${lang}/${agent}: no-contract fixtures stay silent`);
    }
  }
});

test("all four template variants and Japanese dogfood stay synchronized", () => {
  for (const lang of LANGS) {
    for (const [, parts] of Object.entries(paths)) {
      assert.equal(template(lang, "claude", parts), template(lang, "codex", parts), `${lang}/${parts.join("/")}: agents match`);
    }
  }

  for (const [dogfoodRoot, agent] of [[".claude", "claude"], [".agents", "codex"]]) {
    for (const [, parts] of Object.entries(paths)) {
      assert.equal(
        read(dogfoodRoot, "skills", ...parts),
        template("ja", agent, parts),
        `${dogfoodRoot}/${parts.join("/")}: Japanese dogfood matches`,
      );
    }
  }
});
