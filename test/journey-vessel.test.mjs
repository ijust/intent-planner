// ジャーニーの置き場と書き手（pkt-20260717-journey-vessel-writer-y2pm）の判別検証。
//
// 判別オラクル（packet Validation (1)〜(5) の静的側）:
//   (a) スキーマ正本 README が ja/en templates に実在し、dogfood は ja と byte 一致
//   (b) README の frontmatter 例が 7キー固定（journey_id/name/lifecycle/packets/created_at/updated_at/summary）
//       — キーの追加（例: 進捗 state の混入＝DR200 違反）も欠落も落とす（deepEqual）
//   (c) README の実質: 進捗は構成 packet から導出 / 参照は journey→packet の一方向 /
//       無い・空なら従来どおり（INV103）/ 単発案件に作らない（Anti-554）/ 閉じるのは人（INV91）
//   (d) installer: journeys/README は user-data 分類（コンテナ README の既存前例と同型）かつ
//       computeCopyPlan の配布計画に載る（新規 repo へ届く）
//   (e) 書き手 rule journey-plan.md が5系統（dogfood .claude/.agents + templates ja×2/en×2）に実在し
//       ja/en 各群 byte 等価。実質: 単発では提案しない・利用者承認・README 不在では発火しない・
//       進捗 state を書かない・packet 側 frontmatter へ足さない（意味反転変異はこれらの正規表現で落ちる）
//   (f) SKILL.md（6系統）が rules/journey-plan.md を参照する
//   (g) CONTRACT（6系統）にジャーニーの読み取り契約があり、スキーマ7キーが README と一致（クロスファイル契約・
//       cross-file-contract-parse-schema の教訓）・plan.md 経路の恒久フォールバックを明記
//   (h) packet-format.md の frontmatter は12キー固定のままで journey キーを含まない（DR203・packet 側非改変）
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");

const EXPECTED_KEYS = ["journey_id", "name", "lifecycle", "packets", "created_at", "updated_at", "summary"];

// yaml コード fence（```yaml ... ```）の先頭ブロックからキー列を決定的に抽出する。
function frontmatterExampleKeys(content) {
  const m = content.match(/```yaml\n---\n([\s\S]*?)\n---\n```/);
  assert.ok(m, "frontmatter の yaml 例が見つからない");
  return m[1]
    .split("\n")
    .map((l) => l.match(/^([a-z_]+):/))
    .filter(Boolean)
    .map((mm) => mm[1]);
}

// ---- (a)(b)(c) スキーマ正本 README ----
const README_JA = "templates/ja/intent/packets/journeys/README.md";
const README_EN = "templates/en/intent/packets/journeys/README.md";

test("journeys README: ja/en templates に実在し dogfood は ja と byte 一致", () => {
  const ja = read(README_JA);
  const en = read(README_EN);
  const dogfood = read(".intent/packets/journeys/README.md");
  assert.ok(ja.length > 0 && en.length > 0);
  assert.equal(dogfood, ja, "dogfood README が ja template と byte 一致していない");
});

for (const [label, rel] of [["ja", README_JA], ["en", README_EN]]) {
  test(`journeys README(${label}): frontmatter 例が7キー固定（進捗 state の混入・キー欠落を落とす）`, () => {
    assert.deepEqual(frontmatterExampleKeys(read(rel)), EXPECTED_KEYS);
  });
}

test("journeys README(ja): 導出・一方向・後方互換・単発非作成・人が閉じる の実質を持つ", () => {
  const c = read(README_JA);
  assert.match(c, /進捗[^\n]*frontmatter に持ちません（DR200）/, "進捗を frontmatter に持たない宣言");
  assert.match(c, /構成 packet の `state`[^\n]*から\*\*毎回導出\*\*/, "構成 packet からの導出");
  assert.match(c, /journey→packet の一方向/, "一方向参照 (DR203)");
  assert.match(c, /packet 側の frontmatter[^\n]*足しません/, "packet 側非改変");
  assert.match(c, /無い・空でも、すべてのスキルは従来どおり動きます/, "恒久フォールバック (INV103)");
  assert.match(c, /packet が1つで足りる案件には作りません/, "単発案件に作らない (Anti-554)");
  assert.match(c, /機械は自動で閉じません/, "閉じるのは人 (INV91)");
  assert.match(c, /「見つからない」と明示して飛ばします/, "実在しない packet_id の扱い");
});

test("journeys README(en): 同じ実質を持つ（弱文面への一様弱体化を落とす）", () => {
  const c = read(README_EN);
  assert.match(c, /never held in the frontmatter \(DR200\)/);
  assert.match(c, /derived every time/i);
  assert.match(c, /one way only, journey->packet \(DR203\)/);
  assert.match(c, /absent or empty, every skill behaves exactly as before/);
  assert.match(c, /Never create one for a case that a single packet covers/);
  assert.match(c, /a machine never closes a journey automatically/);
});

// ---- (d) installer 分類と配布計画 ----
test("installer: journeys/README は user-data 分類かつ配布計画に載る", async () => {
  const { classifyFile, computeCopyPlan } = await import(
    pathToFileUrl(path.join(REPO_ROOT, "src", "install.mjs"))
  );
  assert.equal(classifyFile(".intent/packets/journeys/README.md"), "user-data");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "journey-vessel-"));
  try {
    const plan = computeCopyPlan(path.join(REPO_ROOT, "templates", "ja"), tmp, {});
    const entry = plan.find(
      (e) => e.relative.split(path.sep).join("/") === ".intent/packets/journeys/README.md",
    );
    assert.ok(entry, "配布計画に journeys/README が無い（新規 repo に届かない）");
    assert.equal(entry.kind, "user-data");
    assert.equal(entry.action, "COPY", "新規配置で COPY にならない");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
function pathToFileUrl(p) {
  return new URL(`file://${p}`);
}

// ---- (e) 書き手 rule journey-plan.md（5系統・byte 等価・実質） ----
const JA_RULE_ROOTS = [".claude", ".agents", "templates/ja/claude", "templates/ja/codex"];
const EN_RULE_ROOTS = ["templates/en/claude", "templates/en/codex"];
const RULE_REL = "skills/intent-packets/rules/journey-plan.md";

test("journey-plan rule: ja 4系統 byte 等価（dogfood 3系統同期を含む）", () => {
  const [head, ...rest] = JA_RULE_ROOTS.map((r) => read(`${r}/${RULE_REL}`));
  for (const [i, c] of rest.entries()) {
    assert.equal(c, head, `${JA_RULE_ROOTS[i + 1]} が ${JA_RULE_ROOTS[0]} と byte 不一致`);
  }
});

test("journey-plan rule: en 2系統 byte 等価", () => {
  assert.equal(read(`${EN_RULE_ROOTS[0]}/${RULE_REL}`), read(`${EN_RULE_ROOTS[1]}/${RULE_REL}`));
});

test("journey-plan rule(ja): 発火条件・禁止事項の実質（意味反転変異を落とす）", () => {
  const c = read(`.claude/${RULE_REL}`);
  assert.match(c, /\*\*単発 packet 案件では提案しない\*\*/, "単発非提案（『でも提案する』への反転は落ちる）");
  assert.match(c, /packet が2つ以上/, "複数 packet 条件");
  assert.match(c, /README\.md` が存在する（無い旧環境では発火せず/, "README 不在では発火しない（後方互換）");
  assert.match(c, /承認されたら起案する/, "利用者承認が堰");
  assert.match(c, /不要・保留なら何も作らず従来どおり進む/, "非承認時は無変更");
  assert.match(c, /進捗の state を frontmatter に書かない/, "DR200 の負の空間");
  assert.match(c, /packet 側の frontmatter（12キー固定）へジャーニーのキーを足さない/, "DR203 の負の空間");
  assert.match(c, /機械が自動で閉じない/, "INV91");
  assert.match(c, /黙って上書きせず/, "同名スラッグの確認");
  for (const key of EXPECTED_KEYS) {
    assert.ok(c.includes(key), `rule が README スキーマのキー ${key} を参照していない（クロスファイル契約）`);
  }
});

// 独立レビュー指摘（2026-07-17・Critical）: フレーズ存在検査だけでは「全系統へ一様に足した
// 同意迂回の一文」（例: 「回答を待たずに起案してよい」「無回答は承認とみなす」）を落とせない。
// 対策は2段: (1) 負の空間検査＝同意を迂回する句が「無い」ことを直接アサートする。
// (2) 構造検査＝提案手順の行（同意の関門を担う行）を完全一致で固定し、同一行への追記改変を落とす。
const JA_STEP1_EXPECTED =
  "1. **利用者に1問で提案する**: 「この案件は複数の packet に分かれるので、束ねるジャーニーを `.intent/packets/journeys/` に起案しますか」（承認／不要／後で確認 を選べる形・回答を強制しない）。**不要・保留なら何も作らず従来どおり進む**（plan.md への記録は従来のまま）。";
const EN_STEP1_EXPECTED =
  '1. **Propose to the user in one question**: "This case splits into multiple packets — shall I draft a journey bundling them into `.intent/packets/journeys/`?" (offer approve / no need / decide later; never force an answer). **On "no need" or deferral, create nothing and proceed as before** (plan.md recording stays as-is).';

for (const r of JA_RULE_ROOTS) {
  test(`journey-plan rule(${r}): 同意迂回の句が無い（負の空間）＋提案行の完全一致`, () => {
    const c = read(`${r}/${RULE_REL}`);
    assert.doesNotMatch(c, /回答を待たず/, "同意の関門を迂回する句（回答を待たずに起案等）が混入");
    assert.doesNotMatch(c, /無回答[^\n]{0,20}承認/, "「無回答は承認」型の迂回句が混入");
    assert.doesNotMatch(c, /承認とみな/, "みなし承認の句が混入");
    assert.doesNotMatch(c, /確認(を|は)省(い|略)/, "確認省略の句が混入");
    const step1 = c.split("\n").find((l) => l.startsWith("1. **利用者に1問で提案する**"));
    assert.equal(step1, JA_STEP1_EXPECTED, "提案手順の行が期待文と不一致（追記・改変を検出）");
  });
}
for (const r of EN_RULE_ROOTS) {
  test(`journey-plan rule(${r}): no consent-bypass phrases + step-1 line equality`, () => {
    const c = read(`${r}/${RULE_REL}`);
    assert.doesNotMatch(c, /without waiting for the user/i);
    assert.doesNotMatch(c, /silence counts as approval/i);
    assert.doesNotMatch(c, /implicit(ly)? approv/i);
    assert.doesNotMatch(c, /skip the confirmation/i);
    const step1 = c.split("\n").find((l) => l.startsWith("1. **Propose to the user in one question**"));
    assert.equal(step1, EN_STEP1_EXPECTED);
  });
}

test("journey-plan rule(en): 同じ実質を持つ", () => {
  const c = read(`${EN_RULE_ROOTS[0]}/${RULE_REL}`);
  assert.match(c, /\*\*Never propose one for a single-packet case\*\*/);
  assert.match(c, /two or more packets/);
  assert.match(c, /do not fire and record to plan\.md only/);
  assert.match(c, /Never write a progress state into the frontmatter/);
  assert.match(c, /Never add a journey key to the packet-side frontmatter/);
  assert.match(c, /A machine never closes a journey automatically/);
});

// ---- (f) SKILL.md の参照（6系統） ----
const SKILL_ROOTS_JA = [".claude", ".agents", "templates/ja/claude", "templates/ja/codex"];
for (const r of SKILL_ROOTS_JA) {
  test(`intent-packets SKILL(${r}): rules/journey-plan.md を参照する`, () => {
    const c = read(`${r}/skills/intent-packets/SKILL.md`);
    assert.match(c, /rules\/journey-plan\.md/, "rule 参照");
    assert.match(c, /複数 packet 案件でのみ/, "発火条件の要約");
  });
}
for (const r of EN_RULE_ROOTS) {
  test(`intent-packets SKILL(${r}): references rules/journey-plan.md`, () => {
    const c = read(`${r}/skills/intent-packets/SKILL.md`);
    assert.match(c, /rules\/journey-plan\.md/);
    assert.match(c, /multi-packet case/);
  });
}

// ---- (g) CONTRACT のジャーニー読み取り契約（6系統・スキーマのクロスファイル一致） ----
const CONTRACT_JA = [".claude", ".agents", "templates/ja/claude", "templates/ja/codex"];
for (const r of CONTRACT_JA) {
  test(`CONTRACT(${r}): ジャーニーの読み取り契約（導出・一方向・恒久フォールバック・7キー一致）`, () => {
    const c = read(`${r}/skills/CONTRACT.md`);
    const bullet = c.split("\n").find((l) => l.includes("ジャーニー（`.intent/packets/journeys/`）の読み取り契約"));
    assert.ok(bullet, "ジャーニー契約の bullet が無い");
    assert.match(bullet, /毎回導出/, "進捗の導出 (DR200)");
    assert.match(bullet, /journey→packet の一方向/, "一方向 (DR203)");
    assert.match(bullet, /無い・空なら従来どおり plan\.md 経路を読む/, "恒久フォールバック (INV103)");
    assert.match(bullet, /機械が自動で閉じない/, "INV91");
    for (const key of EXPECTED_KEYS) {
      assert.ok(bullet.includes(key), `CONTRACT がスキーマのキー ${key} を欠いている（README とのクロスファイル契約）`);
    }
  });
}
for (const r of EN_RULE_ROOTS) {
  test(`CONTRACT(${r}): the journey reading contract`, () => {
    const c = read(`${r}/skills/CONTRACT.md`);
    const bullet = c.split("\n").find((l) => l.includes("The journey (`.intent/packets/journeys/`) reading contract"));
    assert.ok(bullet, "journey contract bullet missing");
    assert.match(bullet, /derive progress\/completion every time/);
    assert.match(bullet, /one way, journey->packet/);
    assert.match(bullet, /absent or empty, read via the plan\.md route as before/);
    for (const key of EXPECTED_KEYS) {
      assert.ok(bullet.includes(key), `CONTRACT(en) lacks schema key ${key}`);
    }
  });
}

// ---- (h) packet-format.md の frontmatter は12キー固定のまま（DR203・packet 側非改変） ----
test("packet-format: frontmatter 例は12キーのままで journey キーを含まない", () => {
  const c = read("templates/ja/claude/skills/intent-packets/rules/packet-format.md");
  const m = c.match(/```yaml\n---\n([\s\S]*?)\n---\n```/);
  assert.ok(m, "packet-format の yaml 例が見つからない");
  const keys = m[1]
    .split("\n")
    .map((l) => l.match(/^([a-z_]+):/))
    .filter(Boolean)
    .map((mm) => mm[1]);
  assert.equal(keys.length, 12, "packet frontmatter が12キーでない");
  assert.ok(!keys.some((k) => /journey/.test(k)), "packet frontmatter に journey キーが混入");
});
