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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

import { install } from "../src/install.mjs";

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

test("不正 agent: install(gemini) は throw し何も配置しない (1.3)", () => {
  const tgt = tmpDir();
  try {
    assert.throws(
      () => install(tgt, { agent: "gemini" }),
      /gemini|agent|エージェント/i,
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
