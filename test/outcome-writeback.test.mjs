// 成果の物さしと成果を書き戻す経路の機能固有契約テスト。
// node:test 標準・依存ゼロ。タスクごとに対象契約を追加する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

function read(...parts) {
  const filePath = path.join(TEMPLATES, ...parts);
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

const treeJa = read("ja", "intent", "intent-tree.md");
const treeEn = read("en", "intent", "intent-tree.md");

test("Intent Tree: 成果の物さし・既存の計測基準・承認済み現在結果を同じL1で独立して保持できる", () => {
  for (const label of ["計測基準:", "成果の物さし:", "成果についての学び:"]) {
    assert.ok(treeJa.includes(label), `日本語L1契約に ${label} がある`);
  }
  assert.match(treeJa, /成果の物さし.*任意の独立した1行/);
  assert.match(treeJa, /成果についての学び.*人が承認した現在の結果/);
  assert.match(treeJa, /計測基準.*自動転用しない/);
  assert.ok(
    treeJa.includes(
      "成果についての学び: <価値が出た | 価値が出なかった | まだ分からない> — <生データを含まない要約>（記録: <delta参照>）",
    ),
    "日本語の現在結果行が結果3値・要約・delta参照を保持する",
  );
  assert.match(treeJa, /成果についての学び.*L1 ごとに最大1行/);
});

test("Intent Tree: 成果の物さしと検査オラクルの用途を区別して説明する", () => {
  assert.match(treeJa, /`成果の物さし:`.*利用者価値/);
  assert.match(treeJa, /`検査オラクル:`.*守る約束.*破損/);
  assert.match(treeJa, /別の欄/);
});

test("Intent Tree英語版: 日本語版と同じ3つの独立行と非転用契約を持つ", () => {
  for (const label of ["Measurement criteria:", "Outcome measure:", "Outcome learning:"]) {
    assert.ok(treeEn.includes(label), `英語L1契約に ${label} がある`);
  }
  assert.match(treeEn, /Outcome measure.*optional, independent line/);
  assert.match(treeEn, /Outcome learning.*current human-approved result/);
  assert.ok(
    treeEn.includes(
      "Outcome learning: <value delivered | value not delivered | not known yet> — <summary without raw data> (record: <delta reference>)",
    ),
    "英語の現在結果行が結果3値・要約・delta参照を保持する",
  );
  assert.match(treeEn, /Outcome learning.*at most one line per L1/);
  assert.match(treeEn, /must not be automatically reused/);
  assert.match(treeEn, /`Outcome measure:`.*user value/);
  assert.match(treeEn, /`Verification oracle:`.*protected promise.*broken/);
});

const DISCOVER_RULE = ["skills", "intent-discover", "rules", "designer-questions.md"];

test("discover日本語版: 人が明示した成果の物さしだけを独立行へ記録する", () => {
  const claude = read("ja", "claude", ...DISCOVER_RULE);
  const codex = read("ja", "codex", ...DISCOVER_RULE);
  assert.equal(codex, claude, "日本語のdiscover規則がclaude/codex間で一致する");
  assert.match(claude, /利用者が明示した場合にだけ/);
  assert.match(claude, /`成果の物さし:` という任意の独立行/);
  assert.match(claude, /`計測基準:`.*推測.*自動転用しない/);
  assert.match(claude, /`検査オラクル:`.*混ぜない/);
});

test("discover英語版: 人が明示した成果の物さしだけを独立行へ記録する", () => {
  const claude = read("en", "claude", ...DISCOVER_RULE);
  const codex = read("en", "codex", ...DISCOVER_RULE);
  assert.equal(codex, claude, "英語のdiscover規則がclaude/codex間で一致する");
  assert.match(claude, /only when the user explicitly states it/);
  assert.match(claude, /optional, independent `Outcome measure:` line/);
  assert.match(claude, /must not infer or automatically reuse `Measurement criteria:`/);
  assert.match(claude, /[Dd]o not mix it with `Verification oracle:`/);
});
