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
const deltasJa = read("ja", "intent", "deltas.md");
const deltasEn = read("en", "intent", "deltas.md");
const deltasReadmeJa = read("ja", "intent", "deltas", "README.md");
const deltasReadmeEn = read("en", "intent", "deltas", "README.md");

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

test("delta日本語版: 成果の観測を必要な項目と既存状態で反復記録できる", () => {
  assert.match(deltasJa, /### 成果についての学び（任意・観測ごとに追記）/);
  assert.match(deltasJa, /#### 観測: <ISO 8601 日時または人が区別できる名前>/);
  for (const field of [
    "Status: pending | promoted (<昇格日>) | closed (<クローズ日>)",
    "対象L1: <Intent Tree の L1 項目の逐語引用>",
    "対象L1の位置: <同じ逐語引用が複数ある場合の周辺見出しまたは位置 | 不要>",
    "結果: 価値が出た | 価値が出なかった | まだ分からない",
    "要約: <生データを貼らない結果の要約>",
    "誰が計測したか: <計測者または確認者>",
    "いつ計測したか: <観測日時>",
    "どこで計測したか: <計測元または参照元>",
  ]) {
    assert.ok(deltasJa.includes(field), `日本語の成果ブロックに ${field} がある`);
  }
  assert.match(deltasJa, /成果の物さし.*未記入.*記録を受け付け/);
  assert.match(deltasJa, /過去の観測を上書きせず/);
  assert.match(deltasJa, /ユーザビリティ検証.*単一の利用者の声.*同じ観測ブロック/);
});

test("delta英語版: 日本語版と同じ成果項目と反復履歴を持つ", () => {
  assert.match(deltasEn, /### Outcome learning \(optional; append once per observation\)/);
  assert.match(deltasEn, /#### Observation: <ISO 8601 datetime or a human-readable distinguishing name>/);
  for (const field of [
    "Status: pending | promoted (<promotion date>) | closed (<close date>)",
    "Target L1: <verbatim quote of the L1 item in Intent Tree>",
    "Target L1 location: <surrounding heading or location when the same quote appears more than once | not needed>",
    "Result: value delivered | value not delivered | not known yet",
    "Summary: <summary of the result without pasting raw data>",
    "Who measured: <measurer or reviewer>",
    "When measured: <observation datetime>",
    "Where measured: <measurement source or reference source>",
  ]) {
    assert.ok(deltasEn.includes(field), `英語の成果ブロックに ${field} がある`);
  }
  assert.match(deltasEn, /outcome measure.*missing.*accept the record/i);
  assert.match(deltasEn, /without overwriting past observations/i);
  assert.match(deltasEn, /usability study.*single user's feedback.*same observation block/i);
});

test("delta分割規約: packet単位ファイルで観測を追記し、生データは要約する", () => {
  assert.match(deltasReadmeJa, /同じ意図.*観測.*追記/);
  assert.match(deltasReadmeJa, /過去の記録を上書きしない/);
  assert.match(deltasReadmeJa, /生データ.*要約/);
  assert.match(deltasReadmeEn, /same intent.*append.*outcome observation/i);
  assert.match(deltasReadmeEn, /never overwrite past records/i);
  assert.match(deltasReadmeEn, /raw data.*summary/i);
});
