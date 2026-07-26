import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const langs = ["ja", "en"];
const agents = ["claude", "codex"];

function read(...parts) {
  return fs.readFileSync(path.join(repoRoot, ...parts), "utf8");
}

function skillFile(lang, agent, skill, ...parts) {
  return read("templates", lang, agent, "skills", skill, ...parts);
}

test("packet の共通写像節は特定の spec ツール名やセッション引き継ぎに依存しない", () => {
  for (const lang of langs) {
    for (const agent of agents) {
      const surfaces = [
        skillFile(lang, agent, "intent-packets", "SKILL.md"),
        skillFile(lang, agent, "intent-packets", "rules", "packet-format.md"),
        skillFile(lang, agent, "intent-packets", "rules", "algo-example-mapping.md"),
        skillFile(lang, agent, "intent-packets", "rules", "algo-migration-slicing.md"),
        skillFile(lang, agent, "intent-packets", "rules", "algo-additive-slicing.md"),
        skillFile(lang, agent, "intent-packets", "rules", "algo-characterization-test.md"),
      ];

      for (const body of surfaces) {
        assert.doesNotMatch(
          body,
          /(?:\*\*|`## )cc-sdd Mapping(?:\*\*|`)\s*[:—-]/,
          `${lang}/${agent}: legacy heading is not defined as the current section`,
        );
        assert.doesNotMatch(
          body,
          /(?:\*\*|`## )Handoff(?:\*\*|`)\s*[:—-]/,
          `${lang}/${agent}: session-handoff wording is not defined as the current section`,
        );
        assert.match(
          body,
          /Next-stage Mapping/,
          `${lang}/${agent}: target-neutral Next-stage Mapping is present`,
        );
      }
    }
  }
});

test("nl-spec は共通写像節と旧名称を顧客向け本文へ写さない", () => {
  for (const lang of langs) {
    for (const agent of agents) {
      const body = skillFile(lang, agent, "intent-to-spec", "rules", "source-scope.md");
      assert.match(body, /`## Next-stage Mapping`/);
      assert.match(body, /`## Handoff`/);
      assert.match(body, /`## cc-sdd Mapping`/);
      assert.match(
        body,
        lang === "ja" ? /生成文書の素材に含めない/ : /exclude.*generated document/i,
      );
    }
  }
});

test("nl-spec の内部運用注記は既定で非表示になり、明示指定時だけ許可される", () => {
  for (const lang of langs) {
    for (const agent of agents) {
      const body = skillFile(lang, agent, "intent-to-spec", "SKILL.md");
      assert.match(
        body,
        lang === "ja"
          ? /既定では出力しない[\s\S]*明示的に求めた場合だけ/
          : /do not output.*by default[\s\S]*only when the user explicitly requests/i,
      );
      assert.match(
        body,
        lang === "ja"
          ? /正本ではありません/
          : /not (?:the )?canonical source/i,
      );
    }
  }
});

test("共通の進捗表示は cc-sdd だけを標準経路として扱わない", () => {
  for (const lang of langs) {
    for (const agent of agents) {
      const status = skillFile(lang, agent, "intent-status", "SKILL.md");
      const progress = skillFile(lang, agent, "intent-overview", "rules", "progress-readout.md");

      assert.ok(!status.includes("まだ cc-sdd へ export していない"));
      assert.ok(!status.includes("not yet exported to cc-sdd"));
      assert.ok(!status.includes("the work unit before handing off to cc-sdd"));
      assert.ok(!progress.includes("実装(cc-sdd)"));
      assert.ok(!progress.includes("implementation (cc-sdd)"));
      assert.match(status, /\.intent\/openspec\//);
      assert.match(status, /\.intent\/speckit\//);
    }
  }
});
