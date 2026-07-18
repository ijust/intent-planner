import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildIntentPlanSnapshots,
  collectInstructionSnapshot,
  discoverSourceSkills,
} from "../scripts/build-intent-plan.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "intent-plan-build-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function put(root, relativePath, content) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

test("対象skill全体をbyte複製し、SKILL.mdだけをinstruction.mdへ写像する", (t) => {
  const root = fixture(t);
  put(root, "CONTRACT.md", "# contract\n");
  put(root, "intent-main/SKILL.md", "# main\n`rules/a.md`\n");
  put(root, "intent-main/rules/a.md", "# a\n");
  put(root, "intent-main/assets/note.txt", "plain\n");

  const { files } = collectInstructionSnapshot({ skillsRoot: root, seedSkills: ["intent-main"] });
  assert.deepEqual(files.map(({ source }) => source), [
    "CONTRACT.md",
    "intent-main/SKILL.md",
    "intent-main/assets/note.txt",
    "intent-main/rules/a.md",
  ]);
  assert.deepEqual(files.map(({ target }) => target), [
    "CONTRACT.md",
    "sources/intent-main/instruction.md",
    "sources/intent-main/assets/note.txt",
    "sources/intent-main/rules/a.md",
  ]);
  assert.equal(files[1].bytes.toString("utf8"), "# main\n`rules/a.md`\n");
  assert.equal(files.some(({ target }) => target.endsWith("/SKILL.md")), false);
});

test("Markdown参照の書き方をbuild境界にしない", (t) => {
  const root = fixture(t);
  put(root, "CONTRACT.md", "# contract\n");
  put(root, "intent-main/SKILL.md", [
    "plain rules/a.md",
    "[title](rules/a.md \"A\")",
    "``intent-other/rules/b.md``",
    "```md",
    "rules/missing.md",
    "```",
    "",
  ].join("\n"));
  put(root, "intent-main/rules/a.md", "# a\n");

  const { files } = collectInstructionSnapshot({ skillsRoot: root, seedSkills: ["intent-main"] });
  assert.equal(files.length, 3);
});

test("seed順序と重複に依らず決定的に並ぶ", (t) => {
  const root = fixture(t);
  put(root, "CONTRACT.md", "# contract\n");
  put(root, "intent-a/SKILL.md", "# a\n");
  put(root, "intent-z/SKILL.md", "# z\n");

  const first = collectInstructionSnapshot({
    skillsRoot: root,
    seedSkills: ["intent-z", "intent-a", "intent-z"],
  });
  const second = collectInstructionSnapshot({
    skillsRoot: root,
    seedSkills: ["intent-a", "intent-z"],
  });
  assert.deepEqual(first.files, second.files);
});

test("不正なseed、欠落seed、生成先衝突を拒否する", (t) => {
  const root = fixture(t);
  put(root, "CONTRACT.md", "# contract\n");
  put(root, "intent-main/SKILL.md", "# main\n");
  put(root, "intent-main/instruction.md", "# collision\n");

  assert.throws(
    () => collectInstructionSnapshot({ skillsRoot: root, seedSkills: ["../intent-main"] }),
    /不正なseed skill名/,
  );
  assert.throws(
    () => collectInstructionSnapshot({ skillsRoot: root, seedSkills: ["intent-missing"] }),
    /seed skillが見つかりません/,
  );
  assert.throws(
    () => collectInstructionSnapshot({ skillsRoot: root, seedSkills: ["intent-plan"] }),
    /生成元から除外されたskill/,
  );
  assert.throws(
    () => collectInstructionSnapshot({ skillsRoot: root, seedSkills: ["intent-main"] }),
    /生成先が衝突/,
  );
});

test("SKILL.mdを欠く、または通常ファイルでないintent directoryを拒否する", (t) => {
  const root = fixture(t);
  put(root, "CONTRACT.md", "# contract\n");
  put(root, "intent-broken/rules/a.md", "# a\n");
  assert.throws(() => collectInstructionSnapshot({ skillsRoot: root }), /SKILL\.mdが見つかりません/);

  fs.mkdirSync(path.join(root, "intent-broken", "SKILL.md"));
  assert.throws(
    () => collectInstructionSnapshot({ skillsRoot: root }),
    /SKILL\.mdは通常ファイルである必要があります/,
  );

  fs.rmdirSync(path.join(root, "intent-broken", "SKILL.md"));
  fs.symlinkSync("rules/a.md", path.join(root, "intent-broken", "SKILL.md"));
  assert.throws(
    () => collectInstructionSnapshot({ skillsRoot: root }),
    /SKILL\.mdにsymlinkは使えません/,
  );
});

test("skills rootとseed内のsymlinkを拒否する", (t) => {
  const root = fixture(t);
  put(root, "CONTRACT.md", "# contract\n");
  put(root, "intent-main/SKILL.md", "# main\n");
  fs.symlinkSync("SKILL.md", path.join(root, "intent-main", "linked.md"));

  assert.throws(
    () => collectInstructionSnapshot({ skillsRoot: root, seedSkills: ["intent-main"] }),
    /symlink はseed内に置けません/,
  );

  const linkedRoot = `${root}-link`;
  fs.symlinkSync(root, linkedRoot);
  t.after(() => fs.rmSync(linkedRoot, { force: true }));
  assert.throws(
    () => collectInstructionSnapshot({ skillsRoot: linkedRoot, seedSkills: ["intent-main"] }),
    /skills root に symlink は使えません/,
  );
});

test("通常ファイル以外の生成元を拒否する", { skip: process.platform === "win32" }, (t) => {
  const root = fixture(t);
  put(root, "CONTRACT.md", "# contract\n");
  put(root, "intent-main/SKILL.md", "# main\n");
  const fifo = path.join(root, "intent-main", "pipe");
  const result = spawnSync("mkfifo", [fifo]);
  if (result.error) t.skip("mkfifo is unavailable");

  assert.throws(
    () => collectInstructionSnapshot({ skillsRoot: root, seedSkills: ["intent-main"] }),
    /通常ファイルまたはdirectoryではない/,
  );
});

test("全intent skillを自動発見し、intent-plan自身と他のdirectoryを除外する", (t) => {
  const root = fixture(t);
  put(root, "CONTRACT.md", "# contract\n");
  put(root, "intent-a/SKILL.md", "# a\n");
  put(root, "intent-overview/SKILL.md", "# overview\n");
  put(root, "intent-plan/SKILL.md", "# generated entry\n");
  put(root, "kiro-review/SKILL.md", "# unrelated\n");

  assert.deepEqual(discoverSourceSkills(root), ["intent-a", "intent-overview"]);
  const { files } = collectInstructionSnapshot({ skillsRoot: root });
  assert.deepEqual(files.map(({ source }) => source), [
    "CONTRACT.md",
    "intent-a/SKILL.md",
    "intent-overview/SKILL.md",
  ]);
});

test("4公開面では計画を構成する7 skillだけをbyte複製する", () => {
  const surfaces = [
    "templates/ja/claude/skills",
    "templates/ja/codex/skills",
    "templates/en/claude/skills",
    "templates/en/codex/skills",
  ];
  for (const relativeRoot of surfaces) {
    const skillsRoot = path.resolve(relativeRoot);
    const generated = path.join(skillsRoot, "intent-plan", "generated", "sources");
    for (const skillName of [
      "intent-discover",
      "intent-compass",
      "intent-packets",
      "intent-export-cc-sdd",
      "intent-export-openspec",
      "intent-export-speckit",
      "intent-to-spec",
    ]) assert.equal(fs.existsSync(path.join(generated, skillName, "instruction.md")), true, relativeRoot);
    assert.equal(fs.existsSync(path.join(generated, "intent-status")), false, relativeRoot);
    assert.equal(
      fs.existsSync(path.join(generated, "intent-overview", "instruction.md")),
      false,
      relativeRoot,
    );
    assert.equal(
      fs.existsSync(path.join(generated, "intent-overview", "rules", "mermaid-tree.md")),
      true,
      relativeRoot,
    );
  }
});

function makeFixedSurfaceFixture(t) {
  const root = fixture(t);
  const surfaces = ["ja/claude", "ja/codex", "en/claude", "en/codex"];
  for (const surface of surfaces) {
    const skills = path.join(root, "templates", surface, "skills");
    put(skills, "CONTRACT.md", "# contract\n");
    put(skills, "intent-discover/SKILL.md", "# discover\n");
    put(skills, "intent-compass/SKILL.md", "# compass\n");
    put(skills, "intent-packets/SKILL.md", "# packets\n");
    put(skills, "intent-to-spec/SKILL.md", "# to spec\n");
    put(skills, "intent-overview/rules/mermaid-tree.md", "# diagram rule\n");
    for (const name of ["intent-export-cc-sdd", "intent-export-openspec", "intent-export-speckit"]) {
      put(skills, `${name}/SKILL.md`, [
        `# ${name}`,
        "before",
        "<!-- intent-plan:downstream-start -->",
        "### Step 4: Launch downstream",
        "launch downstream",
        "<!-- intent-plan:downstream-end -->",
        "## Output Description",
        "after",
        "## Safety & Fallback",
        "",
      ].join("\n"));
    }
  }
  return root;
}

test("固定4公開面を生成し、checkはファイル集合とbytesだけを比較する", (t) => {
  const root = makeFixedSurfaceFixture(t);
  buildIntentPlanSnapshots({ mode: "write", repositoryRoot: root });
  assert.doesNotThrow(() => buildIntentPlanSnapshots({ mode: "check", repositoryRoot: root }));

  const generated = path.join(root, "templates/ja/codex/skills/intent-plan/generated");
  assert.equal(fs.existsSync(path.join(generated, "manifest.json")), false);
  assert.equal(fs.existsSync(path.join(generated, "sources/intent-discover/instruction.md")), true);
  const draft = fs.readFileSync(
    path.join(generated, "views/intent-export-cc-sdd/draft.md"),
    "utf8",
  );
  assert.equal(draft.includes("launch downstream"), false);
  assert.equal(draft.includes("before"), true);
  assert.equal(draft.includes("after"), true);

  put(generated, "extra.md", "extra\n");
  assert.throws(
    () => buildIntentPlanSnapshots({ mode: "check", repositoryRoot: root }),
    /余剰|extra/,
  );
});

test("checkは生成元変更によるbyte差を検出し、書き込まない", (t) => {
  const root = makeFixedSurfaceFixture(t);
  buildIntentPlanSnapshots({ mode: "write", repositoryRoot: root });
  const generated = path.join(root, "templates/en/claude/skills/intent-plan/generated");
  const before = fs.readFileSync(path.join(generated, "sources/intent-discover/instruction.md"));
  put(
    path.join(root, "templates/en/claude/skills"),
    "intent-discover/SKILL.md",
    "# changed\n",
  );

  assert.throws(
    () => buildIntentPlanSnapshots({ mode: "check", repositoryRoot: root }),
    /byte差/,
  );
  assert.deepEqual(
    fs.readFileSync(path.join(generated, "sources/intent-discover/instruction.md")),
    before,
  );
});

test("intent-plan親symlinkを拒否し、外部を変更しない", (t) => {
  const root = makeFixedSurfaceFixture(t);
  const skills = path.join(root, "templates/ja/claude/skills");
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "intent-plan-parent-link-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  put(outside, "generated/sentinel.txt", "keep\n");
  fs.symlinkSync(outside, path.join(skills, "intent-plan"));

  assert.throws(
    () => buildIntentPlanSnapshots({ mode: "write", repositoryRoot: root }),
    /intent-planにsymlink/,
  );
  assert.equal(fs.readFileSync(path.join(outside, "generated/sentinel.txt"), "utf8"), "keep\n");
});

test("単一依存ファイルの親symlinkを拒否する", { skip: process.platform === "win32" }, (t) => {
  const root = makeFixedSurfaceFixture(t);
  const skills = path.join(root, "templates/ja/codex/skills");
  const outside = fixture(t);
  put(outside, "rules/mermaid-tree.md", "outside\n");
  fs.rmSync(path.join(skills, "intent-overview"), { recursive: true });
  fs.symlinkSync(outside, path.join(skills, "intent-overview"));

  assert.throws(
    () => buildIntentPlanSnapshots({ mode: "write", repositoryRoot: root }),
    /symlink は生成元に使えません/,
  );
});

test("export markerがStep 4全体を囲まなければ生成を拒否する", (t) => {
  const root = makeFixedSurfaceFixture(t);
  const skills = path.join(root, "templates/en/codex/skills");
  put(skills, "intent-export-cc-sdd/SKILL.md", [
    "# export",
    "<!-- intent-plan:downstream-start -->",
    "### Step 4: Launch downstream",
    "<!-- intent-plan:downstream-end -->",
    "still launches downstream",
    "## Output Description",
    "## Safety & Fallback",
    "",
  ].join("\n"));

  assert.throws(
    () => buildIntentPlanSnapshots({ mode: "write", repositoryRoot: root }),
    /Step 4全体/,
  );
});
