// agent 次元の install()-level 統合テスト (task 3.2)。
// node:test 標準・依存ゼロ。
//
// 範囲分担:
//   - claude 既定の回帰 (導入前配置と on-disk 集合 + 内容ハッシュで一致) は
//     install.test.mjs の ja-regression byte テストが既にカバー済み。ここでは重複させない。
//   - 本ファイルは AGENT 固有の統合に集中する:
//       1. codex 実配置 (skill 3階層ネスト + AGENTS.md + .intent)
//       2. 双方向の非干渉 (codex は .claude/ を作らず、claude は .agents//AGENTS.md を作らない)
//       3. .intent の agent 横断 byte 同一性 (共有 scaffold)
//       4. 不正 agent のエラー停止・無配置
//       5. codex の非破壊性 (再 install スキップ・force 上書き)
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

import { install } from "../src/install.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const LANGS = ["ja", "en"];

function tmpDir(prefix = "ip-agents-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// dir 配下の全ファイルを相対パスで列挙する (任意のネスト深さ、隠しファイル含む)。
function listRel(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const parent = e.parentPath ?? e.path;
      return path.relative(dir, path.join(parent, e.name));
    })
    .sort();
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

// ---- 1. codex 実配置 (8.1, 2.1, 2.2) ----

test("install(codex): skill (3階層ネスト含む) + AGENTS.md + .intent が配置される (8.1, 2.1, 2.2)", () => {
  const tgt = tmpDir();
  try {
    const result = install(tgt, { agent: "codex" });
    assert.equal(result.agent, "codex", "解決 agent は codex");

    // skill: .agents/skills/intent-*/SKILL.md (1階層)。
    assert.ok(
      fs.existsSync(path.join(tgt, ".agents", "skills", "intent-discover", "SKILL.md")),
      ".agents/skills/intent-discover/SKILL.md が配置される",
    );
    // skill: 3階層ネストの rules ファイルも相対パス保持で配置される。
    assert.ok(
      fs.existsSync(
        path.join(tgt, ".agents", "skills", "intent-discover", "rules", "algo-gore-lite.md"),
      ),
      ".agents/skills/intent-discover/rules/algo-gore-lite.md (3階層ネスト) が配置される",
    );
    // rootDoc: AGENTS.md がルート直下に配置される。
    assert.ok(fs.existsSync(path.join(tgt, "AGENTS.md")), "AGENTS.md がルート直下に配置される");
    // 共有 intent: .intent/modes/standard.md が配置される。
    assert.ok(
      fs.existsSync(path.join(tgt, ".intent", "modes", "standard.md")),
      ".intent/modes/standard.md が配置される",
    );
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- 2. 双方向の非干渉 (5.1, 5.2, 8.3) ----

test("非干渉: codex 配置は .claude/ を作らない (5.1, 8.3)", () => {
  const tgt = tmpDir();
  try {
    install(tgt, { agent: "codex" });
    assert.ok(fs.existsSync(path.join(tgt, ".agents")), "codex は .agents/ を作る");
    assert.ok(!fs.existsSync(path.join(tgt, ".claude")), "codex は .claude/ を作らない (非干渉)");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

test("非干渉: claude 既定配置は .agents/ も AGENTS.md も作らない (5.2, 8.3)", () => {
  const tgt = tmpDir();
  try {
    const result = install(tgt, {});
    assert.equal(result.agent, "claude", "既定 agent は claude");
    assert.ok(fs.existsSync(path.join(tgt, ".claude", "skills")), "claude は .claude/skills を作る");
    assert.ok(!fs.existsSync(path.join(tgt, ".agents")), "claude は .agents/ を作らない (非干渉)");
    assert.ok(!fs.existsSync(path.join(tgt, "AGENTS.md")), "claude は AGENTS.md を作らない (非干渉)");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- 3. .intent の agent 横断 byte 同一性 (4.3) ----

test(".intent 共有: claude 配置と codex 配置で .intent が byte 同一 (4.3)", () => {
  const tgtClaude = tmpDir("ip-agents-claude-");
  const tgtCodex = tmpDir("ip-agents-codex-");
  try {
    install(tgtClaude, {});
    install(tgtCodex, { agent: "codex" });

    const intentClaude = path.join(tgtClaude, ".intent");
    const intentCodex = path.join(tgtCodex, ".intent");
    const relClaude = listRel(intentClaude);
    const relCodex = listRel(intentCodex);

    assert.ok(relClaude.length > 0, ".intent にファイルがある");
    // 相対パス集合が一致 (順序非依存)。
    assert.deepEqual(relCodex, relClaude, "claude/codex の .intent 相対パス集合が一致");
    // 各ファイルが byte 同一 (内容ハッシュ一致)。
    for (const rel of relClaude) {
      assert.equal(
        sha256(path.join(intentCodex, rel)),
        sha256(path.join(intentClaude, rel)),
        `.intent/${rel} が claude/codex 間で byte 同一 (共有 scaffold)`,
      );
    }
  } finally {
    fs.rmSync(tgtClaude, { recursive: true, force: true });
    fs.rmSync(tgtCodex, { recursive: true, force: true });
  }
});

// ---- 4. 不正 agent のエラー停止・無配置 (1.3) ----

test("不正 agent: install(cursor) は throw し何も配置しない (1.3 / gemini 追加後は cursor で封じ存置)", () => {
  const tgt = tmpDir();
  try {
    assert.throws(
      () => install(tgt, { agent: "cursor" }),
      /cursor|agent|エージェント/i,
      "不正 agent はエラーを投げる",
    );
    assert.equal(fs.readdirSync(tgt).length, 0, "配置先は空のまま (1ファイルも配置しない)");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ---- 5. codex の非破壊性: 再 install スキップ・force 上書き (5.3) ----

test("codex 非破壊: 再 install は既存ファイルを SKIP し上書きしない、force で上書きする (5.3)", () => {
  const tgt = tmpDir();
  try {
    // 初回配置。
    install(tgt, { agent: "codex" });

    // 配置済みファイルをユーザ編集に見立てて改変する (rootDoc と skill の 2 つ)。
    const agentsMd = path.join(tgt, "AGENTS.md");
    const skillFile = path.join(tgt, ".agents", "skills", "intent-discover", "SKILL.md");
    const sentinel = "USER-LOCAL-EDIT-DO-NOT-OVERWRITE\n";
    fs.writeFileSync(agentsMd, sentinel);
    fs.writeFileSync(skillFile, sentinel);

    // 再 install (force なし): 既存は SKIP・改変は保たれる。
    const reResult = install(tgt, { agent: "codex" });
    assert.ok(
      reResult.skipped.includes("AGENTS.md"),
      "再 install で AGENTS.md は skipped に入る",
    );
    assert.ok(
      reResult.skipped.some((r) => r.endsWith(path.join("intent-discover", "SKILL.md"))),
      "再 install で codex skill は skipped に入る",
    );
    assert.equal(fs.readFileSync(agentsMd, "utf8"), sentinel, "AGENTS.md のユーザ改変は保持される");
    assert.equal(fs.readFileSync(skillFile, "utf8"), sentinel, "skill のユーザ改変は保持される");

    // force: 既存でも上書きされ、テンプレ内容に戻る (sentinel ではなくなる)。
    const forced = install(tgt, { agent: "codex", force: true });
    assert.ok(forced.copied.includes("AGENTS.md"), "force で AGENTS.md は copied に入る");
    assert.notEqual(fs.readFileSync(agentsMd, "utf8"), sentinel, "force で AGENTS.md は上書きされる");
    assert.notEqual(fs.readFileSync(skillFile, "utf8"), sentinel, "force で skill は上書きされる");
  } finally {
    fs.rmSync(tgt, { recursive: true, force: true });
  }
});

// ============================================================================
// task 3.3: codex 構造・rules byte 等価・パリティ・pack テスト
//
// 範囲分担 (重複回避):
//   - claude SKILL.md の必須5フィールド + en/ja 一般パリティ + npm pack(ja/en, test 除外)
//     は test/structure-pack.test.mjs が既にカバー済み。ここでは重複させない。
//   - 本ブロックは CODEX 固有の検査に集中する:
//       1. codex SKILL.md/CONTRACT.md の最小 frontmatter (claude の逆: 余剰キーを持たない) (2.4)
//       2. codex SKILL.md/CONTRACT.md に AskUserQuestion 不在 (rules/ は byte 等価のため除外) (2.5)
//       3. rules の claude vs codex byte 等価 (ドリフト防止の中核) (2.3)
//       4. codex skill 集合 ⇔ claude skill 集合 の対応
//       5. codex の agent×lang パリティ (ja/codex ⇔ en/codex 相対パス 1:1) (6.2)
//       6. npm pack に codex + AGENTS.md(両言語) 同梱・test 除外 (6.4, 8.4)
// ============================================================================

// 先頭の `---` フェンス間を frontmatter として読み key 集合を抽出する (yaml 依存なし)。
// frontmatter が無い (先頭が `---` でない / 閉じない) 場合は null を返す。
function parseFrontmatterKeys(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  if (lines[0].trim() !== "---") return null;
  const keys = [];
  let closed = false;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closed = true;
      break;
    }
    const m = lines[i].match(/^([A-Za-z][A-Za-z0-9_-]*):/);
    if (m) keys.push(m[1]);
  }
  return closed ? keys : null;
}

// codex skill ディレクトリ配下の SKILL.md 一覧 (lang ごと)。
function codexSkillFiles(lang) {
  const base = path.join(REPO_ROOT, "templates", lang, "codex", "skills");
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(base, e.name, "SKILL.md"))
    .filter((p) => fs.existsSync(p))
    .sort();
}

function contractFile(lang) {
  return path.join(REPO_ROOT, "templates", lang, "codex", "skills", "CONTRACT.md");
}

const FORBIDDEN_FRONTMATTER = ["allowed-tools", "argument-hint", "disable-model-invocation"];

// ---- 3.3-1. codex SKILL.md/CONTRACT.md の最小 frontmatter (2.4) ----
// claude 版は allowed-tools 等を持つが、codex 版は name/description のみ。逆の不変条件。
for (const lang of LANGS) {
  for (const skillFile of codexSkillFiles(lang)) {
    const skillName = path.basename(path.dirname(skillFile));
    test(`codex 最小 frontmatter: ${lang}/${skillName} は name/description のみ・余剰キーを持たない (2.4)`, () => {
      const keys = parseFrontmatterKeys(skillFile);
      assert.ok(keys !== null, `${skillFile}: frontmatter フェンスが閉じている`);
      assert.ok(keys.includes("name"), `${skillFile}: frontmatter に name がある`);
      assert.ok(keys.includes("description"), `${skillFile}: frontmatter に description がある`);
      for (const forbidden of FORBIDDEN_FRONTMATTER) {
        assert.ok(
          !keys.includes(forbidden),
          `${skillFile}: codex frontmatter は ${forbidden} を持たない (claude 版との意図的差分)`,
        );
      }
    });
  }

  test(`codex 最小 frontmatter: ${lang}/CONTRACT.md は余剰 frontmatter キーを持たない (2.4)`, () => {
    // CONTRACT.md は frontmatter を持たない (先頭が見出し) 設計。
    // frontmatter があるならその key 集合に禁止キーが含まれないことを保証する。
    const keys = parseFrontmatterKeys(contractFile(lang));
    if (keys === null) {
      assert.ok(true, "CONTRACT.md に frontmatter は無い (禁止キーも当然無い)");
      return;
    }
    for (const forbidden of FORBIDDEN_FRONTMATTER) {
      assert.ok(
        !keys.includes(forbidden),
        `CONTRACT.md frontmatter は ${forbidden} を持たない`,
      );
    }
  });
}

// ---- 3.3-2. codex SKILL.md/CONTRACT.md に AskUserQuestion 不在 (2.5) ----
// rules/mode-selection.md は claude と byte 等価のため AskUserQuestion を含む → 除外。
// SKILL.md と CONTRACT.md 本文のみを検査する。
for (const lang of LANGS) {
  const files = [...codexSkillFiles(lang), contractFile(lang)];
  for (const f of files) {
    const label = path.relative(path.join(REPO_ROOT, "templates", lang, "codex"), f);
    test(`codex AskUserQuestion 不在: ${lang}/${label} は "AskUserQuestion" を含まない (2.5)`, () => {
      const content = fs.readFileSync(f, "utf8");
      assert.ok(
        !content.includes("AskUserQuestion"),
        `${f}: codex の SKILL/CONTRACT は AskUserQuestion を含まない (rules は別途 byte 等価で許容)`,
      );
    });
  }
}

// ---- 3.3-3. rules の claude vs codex byte 等価 (2.3, ドリフト防止の中核) ----
for (const lang of LANGS) {
  const codexRoot = path.join(REPO_ROOT, "templates", lang, "codex", "skills");
  const claudeRoot = path.join(REPO_ROOT, "templates", lang, "claude", "skills");

  // codex skill ツリー配下の rules ファイルを相対パスで列挙する。
  const rulesRel = listRel(codexRoot).filter((rel) => rel.split(path.sep).includes("rules"));

  test(`codex rules byte 等価: ${lang} の rules が claude 版と byte 一致 (ドリフト防止) (2.3)`, () => {
    assert.ok(rulesRel.length > 0, `${lang}: codex に rules ファイルが存在する`);
    for (const rel of rulesRel) {
      const codexFile = path.join(codexRoot, rel);
      const claudeFile = path.join(claudeRoot, rel);
      assert.ok(fs.existsSync(claudeFile), `claude 側に対応する ${rel} がある`);
      const a = fs.readFileSync(codexFile);
      const b = fs.readFileSync(claudeFile);
      assert.ok(
        a.equals(b),
        `${lang}/skills/${rel} が claude/codex 間で byte 同一 (ドリフトしていない)`,
      );
    }
  });
}

// ---- 3.3-4. codex skill 集合 ⇔ claude skill 集合 の対応 ----
for (const lang of LANGS) {
  test(`codex skill 集合: ${lang} の intent-* skill + CONTRACT.md が claude と一致`, () => {
    const codexBase = path.join(REPO_ROOT, "templates", lang, "codex", "skills");
    const claudeBase = path.join(REPO_ROOT, "templates", lang, "claude", "skills");

    const skillEntries = (base) =>
      fs
        .readdirSync(base, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name.startsWith("intent-"))
        .map((e) => e.name)
        .sort();

    const codexSkills = skillEntries(codexBase);
    const claudeSkills = skillEntries(claudeBase);
    assert.ok(codexSkills.length > 0, "codex に intent-* skill がある");
    assert.deepEqual(codexSkills, claudeSkills, "codex/claude の intent-* skill 集合が一致");

    for (const s of codexSkills) {
      assert.ok(
        fs.existsSync(path.join(codexBase, s, "SKILL.md")),
        `codex ${s}/SKILL.md がある`,
      );
    }
    assert.ok(fs.existsSync(path.join(codexBase, "CONTRACT.md")), "codex CONTRACT.md がある");
    assert.ok(fs.existsSync(path.join(claudeBase, "CONTRACT.md")), "claude CONTRACT.md がある");
  });
}

// ---- 3.3-5. codex の agent×lang パリティ (6.2) ----
test("codex パリティ: templates/ja/codex と templates/en/codex の相対パス集合が 1:1 (6.2)", () => {
  const jaRel = listRel(path.join(REPO_ROOT, "templates", "ja", "codex"));
  const enRel = listRel(path.join(REPO_ROOT, "templates", "en", "codex"));
  assert.ok(jaRel.length > 0, "ja/codex にファイルがある");
  assert.deepEqual(enRel, jaRel, "ja/codex と en/codex の相対パス集合が一致 (翻訳漏れ・余剰なし)");
});

// ---- 3.3-6. npm pack に codex + AGENTS.md(両言語) 同梱・test 除外 (6.4, 8.4) ----
test("npm pack: codex skill ツリーと AGENTS.md(両言語) が同梱され test/ を含まない (6.4, 8.4)", () => {
  // --dry-run --json は files[].path を構造化 JSON で返す (実成果物の検査・ハードコードではない)。
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  const parsed = JSON.parse(raw);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  assert.ok(entry && Array.isArray(entry.files), "pack JSON に files 配列がある");
  const paths = entry.files.map((f) => f.path.split(path.sep).join("/"));

  for (const lang of LANGS) {
    assert.ok(
      paths.some((p) => p.startsWith(`templates/${lang}/codex/`)),
      `成果物に templates/${lang}/codex/ 配下が含まれる`,
    );
    assert.ok(
      paths.includes(`templates/${lang}/agents/codex/AGENTS.md`),
      `成果物に templates/${lang}/agents/codex/AGENTS.md が含まれる`,
    );
  }
  assert.ok(
    !paths.some((p) => p.startsWith("test/")),
    `成果物に test/ 配下を含まない: ${paths.filter((p) => p.startsWith("test/")).join(", ")}`,
  );
});

// ---- task 4.2: intent-db-design の codex frontmatter 検査 + 4系統 install 構造テスト ----
// 既存の 3.3-1〜3.3-4 は全 codex skill を自動列挙して網羅するため intent-db-design も
// 既にカバーされている。ここでは新スキルを名指しで固定し、スキル削除・frontmatter ドリフト・
// 配置漏れを名指しの回帰として落とす（自動列挙は対象消滅時に黙って網羅範囲が縮むため）。
// 末尾の (6.1)/(6.2)/(6.6) は intent-db-design-seam spec の Requirement 番号:
//   R6.1=全 agent への同型配信 / R6.2=codex 最小 frontmatter / R6.6=gemini は codex 経由配信。

// 4.2-1. codex 版 intent-db-design SKILL は禁止 frontmatter キー（allowed-tools/argument-hint/
//        disable-model-invocation）を持たない（claude 版との意図的差分・A25）。
for (const lang of LANGS) {
  const skillFile = path.join(
    REPO_ROOT, "templates", lang, "codex", "skills", "intent-db-design", "SKILL.md",
  );
  test(`codex 最小 frontmatter (名指し): ${lang}/intent-db-design は禁止キーを持たない (6.2)`, () => {
    assert.ok(fs.existsSync(skillFile), `${skillFile} が実在する`);
    const keys = parseFrontmatterKeys(skillFile);
    assert.ok(keys !== null, `${skillFile}: frontmatter フェンスが閉じている`);
    assert.ok(keys.includes("name"), `${skillFile}: frontmatter に name がある`);
    assert.ok(keys.includes("description"), `${skillFile}: frontmatter に description がある`);
    for (const forbidden of FORBIDDEN_FRONTMATTER) {
      assert.ok(
        !keys.includes(forbidden),
        `${skillFile}: codex frontmatter は ${forbidden} を持たない (claude 版との意図的差分)`,
      );
    }
  });
}

// 4.2-2. install 構造: claude は .claude/skills、codex/gemini は共有 .agents/skills へ
//        intent-db-design（SKILL + rules ネスト保持）を配置する。
const DBDESIGN_RULES = [
  "db-design-input.md",
  "db-design-fabrication-guard.md",
  "db-design-projection.md",
];
for (const { agent, dest } of [
  { agent: "claude", dest: ".claude/skills" },
  { agent: "codex", dest: ".agents/skills" },
  { agent: "gemini", dest: ".agents/skills" },
]) {
  test(`install(${agent}): intent-db-design が ${dest} に SKILL + rules ネスト保持で配置される (6.1, 6.6)`, () => {
    const tgt = tmpDir(`ip-dbdesign-${agent}-`);
    try {
      install(tgt, agent === "claude" ? {} : { agent });
      const skillDir = path.join(tgt, ...dest.split("/"), "intent-db-design");
      assert.ok(
        fs.existsSync(path.join(skillDir, "SKILL.md")),
        `${dest}/intent-db-design/SKILL.md が配置される`,
      );
      for (const rule of DBDESIGN_RULES) {
        assert.ok(
          fs.existsSync(path.join(skillDir, "rules", rule)),
          `${dest}/intent-db-design/rules/${rule} (ネスト保持) が配置される`,
        );
      }
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  });
}

// intent-plan は既存の再帰コピー経路だけで、進行役・内包した各段階・補助コマンドを配る。
for (const { agent, dest } of [
  { agent: "claude", dest: ".claude/skills" },
  { agent: "codex", dest: ".agents/skills" },
  { agent: "gemini", dest: ".agents/skills" },
]) {
  test(`install(${agent}): intent-plan と補助コマンドが配置される`, () => {
    const tgt = tmpDir(`ip-intent-plan-${agent}-`);
    try {
      install(tgt, agent === "claude" ? {} : { agent });
      const skillDir = path.join(tgt, ...dest.split("/"), "intent-plan");
      assert.ok(fs.existsSync(path.join(skillDir, "SKILL.md")));
      assert.ok(fs.existsSync(path.join(skillDir, "generated", "sources", "intent-discover", "instruction.md")));
      assert.ok(fs.existsSync(path.join(tgt, ".intent", "scripts", "intent-plan-ops.mjs")));
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  });
}
