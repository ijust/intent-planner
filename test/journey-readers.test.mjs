// ジャーニーの読み手接続（pkt-20260717-journey-readers-ty8n）の判別検証。
//
// 判別オラクル（packet Validation の静的側）:
//   (a) status SKILL（6系統）: Step 2 のジャーニー読み取り bullet が**行の完全一致**で固定される
//       （前 packet の教訓＝全系統への一様な意味反転・追記はフレーズ存在検査もパリティも素通りする
//        → 最初から行等価で固定する）。⑤詳細のジャーニー進捗ブロック文の存在。
//   (b) overview roadmap-projection（6系統）: ジャーニー束ね bullet の行完全一致
//       （archived 除外・導出のみ・恒久フォールバック・純粋な追加、を行ごと固定）。
//   (c) validate validate-checks（6系統）: cross-packet-contract-coverage / capability-starvation の
//       2行が「既存の読み先を残したまま」（検出力不変の静的表現＝置き換え変異で赤化）journeys を
//       追加の読み先として持ち、無ければ従来どおりのフォールバックを明記する。
//   (d) クロスファイル契約: 読み手の追記が CONTRACT の契約名「ジャーニーの読み取り契約」を参照する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");

const JA_ROOTS = [".claude", ".agents", "templates/ja/claude", "templates/ja/codex"];
const EN_ROOTS = ["templates/en/claude", "templates/en/codex"];

const findLine = (content, prefix) => content.split("\n").find((l) => l.trimStart().startsWith(prefix));

// ---- (a) status SKILL: Step 2 bullet の行完全一致 + ⑤ の進捗ブロック文 ----
const JA_STATUS_BULLET =
  "- ジャーニー正本（`.intent/packets/journeys/*.md`・README.md と archive/ を除く・在れば）を frontmatter のみ read-only で読む。ジャーニーの進捗・完了は各ファイルの `packets` 列挙と packet の `state`（per-packet frontmatter が正本）から毎回導出し、ジャーニー側へ書き戻さない（DR200・読み手契約は skills/CONTRACT.md「ジャーニーの読み取り契約」）。列挙の packet_id が見つからなければ「見つからない」と明示して飛ばす（推測で紐づけない）。`lifecycle: archived` のジャーニーは（`archive/` へ移す前でも）進捗の併記に出さない（roadmap の束ねと同じ判定＝場所でなく `lifecycle` 欄で見る）。`journeys/` が無い・空なら本読み取りを行わず従来どおり（恒久フォールバック・INV103・既定出力は変わらない）。";
const EN_STATUS_BULLET =
  '- Read the canonical journey files (`.intent/packets/journeys/*.md`, excluding README.md and archive/, when present) frontmatter-only and read-only. Derive each journey\'s progress/completion every time from its `packets` list and the packets\' `state` (each packet\'s frontmatter is canonical), and never write back to the journey side (DR200; the reader contract is "The journey reading contract" in skills/CONTRACT.md). If a listed packet_id cannot be found, state "not found" and skip it (never guess a match). Journeys with `lifecycle: archived` are not shown in the progress block (even before they are moved to `archive/`; the same field-based judgment as the roadmap bundling). With `journeys/` absent or empty, skip this reading and behave as before (a permanent fallback; INV103; the default output is unchanged).';
// 独立レビュー指摘（2026-07-17・High×2）: ⑤の文は行末尾への矛盾追記を、roadmap は直後への
// 矛盾 bullet 挿入を素通りした。対策＝⑤は「行がこの文で終わる」を固定し、roadmap は
// 「束ね bullet の直後の行」を既知の次行に固定する（隣接注入を落とす）。
const JA_S5_TAIL =
  "Step 2 でジャーニー正本（`.intent/packets/journeys/`）を読んだ場合は、ジャーニーごとの進捗（構成 packet のうち done の数・いま進行中の packet）を、割当の併記と同じ位置・温度感で1ブロック併記する（構成 packet の `state` からの導出のみ・ジャーニーへ書き戻さない・ジャーニーが1件も無ければこのブロックを出さない＝従来どおり）。";
const EN_S5_TAIL =
  " When Step 2 read the canonical journey files (`.intent/packets/journeys/`), include one block of per-journey progress (how many member packets are done, which are underway) at the same position and temperature as the claims block (derived from the member packets' `state` only; never written back to the journey; with no journeys at all this block is not shown = unchanged).";

for (const r of JA_ROOTS) {
  test(`status(${r}): ジャーニー読み取り bullet が行完全一致（一様改変を落とす）`, () => {
    const c = read(`${r}/skills/intent-status/SKILL.md`);
    assert.equal(findLine(c, "- ジャーニー正本（"), JA_STATUS_BULLET);
    const s5 = c.split("\n").find((l) => l.includes("ジャーニーごとの進捗"));
    assert.ok(s5, "⑤ の進捗ブロック文が無い");
    assert.ok(s5.endsWith(JA_S5_TAIL), "⑤ の行がこの文で終わっていない（末尾への矛盾追記を検出）");
  });
}
for (const r of EN_ROOTS) {
  test(`status(${r}): journey reading bullet is line-equal`, () => {
    const c = read(`${r}/skills/intent-status/SKILL.md`);
    assert.equal(findLine(c, "- Read the canonical journey files"), EN_STATUS_BULLET);
    const s5 = c.split("\n").find((l) => l.includes("per-journey progress"));
    assert.ok(s5, "the ⑤ per-journey progress sentence is missing");
    assert.ok(s5.endsWith(EN_S5_TAIL.trim()) || s5.endsWith(EN_S5_TAIL), "the ⑤ line does not end with the expected sentence");
  });
}

// ---- (b) roadmap-projection: ジャーニー束ね bullet の行完全一致 ----
const JA_RM_BULLET =
  "   - **ジャーニーの束ね（あれば反映・無ければ従来どおり）**: ジャーニー正本 `.intent/packets/journeys/*.md`（README.md・archive/ を除く。読み手契約は skills/CONTRACT.md「ジャーニーの読み取り契約」）があれば、各ジャーニーの `packets` 列挙で構成 packet をジャーニー単位でも束ねて示せる。進捗は構成 packet の `state` から毎回導出し、ジャーニー側へ書き戻さない（DR200）。`lifecycle: archived` のジャーニーは束ねに出さない。列挙の packet_id が active に見つからないときは「見つからない」と明示して飛ばす（推測で紐づけない）。`journeys/` が無い・空なら従来どおり（恒久フォールバック・INV103）。既存の工程計画の束ね・既定の表示は変えない（純粋な追加）。";
const EN_RM_BULLET =
  '   - **journey bundling (reflect if present; behave as before if absent)**: if the canonical journey files `.intent/packets/journeys/*.md` exist (excluding README.md and archive/; the reader contract is "The journey reading contract" in skills/CONTRACT.md), the member packets can additionally be bundled per journey using each journey\'s `packets` list. Derive progress every time from the member packets\' `state` and never write back to the journey side (DR200). Journeys with `lifecycle: archived` are not shown in the bundling. If a listed packet_id is not found among active packets, state "not found" and skip it (never guess a match). With `journeys/` absent or empty, behave as before (a permanent fallback; INV103). The existing work-plan bundling and the default output stay unchanged (a pure addition).';

for (const r of JA_ROOTS) {
  test(`roadmap(${r}): ジャーニー束ね bullet が行完全一致`, () => {
    const c = read(`${r}/skills/intent-overview/rules/roadmap-projection.md`);
    const lines = c.split("\n");
    const idx = lines.findIndex((l) => l.startsWith("   - **ジャーニーの束ね"));
    assert.notEqual(idx, -1, "ジャーニー束ね bullet が無い");
    assert.equal(lines[idx], JA_RM_BULLET);
    assert.equal(lines[idx + 1], "3. **進行実績と横断の束ねを添える**:", "束ね bullet の直後が既知の次行でない（隣接への矛盾挿入を検出）");
    assert.match(c, /工程計画のグループのまとまり/, "既存の工程計画束ねが残存（置き換えでない）");
  });
}
for (const r of EN_ROOTS) {
  test(`roadmap(${r}): journey bundling bullet is line-equal`, () => {
    const c = read(`${r}/skills/intent-overview/rules/roadmap-projection.md`);
    const lines = c.split("\n");
    const idx = lines.findIndex((l) => l.startsWith("   - **journey bundling"));
    assert.notEqual(idx, -1, "journey bundling bullet missing");
    assert.equal(lines[idx], EN_RM_BULLET);
    assert.equal(lines[idx + 1], "3. **Add progress actuals and cross-cutting bundles**:", "the line right after the bundling bullet is not the known next line (adjacent contradiction injection)");
    assert.match(c, /work-plan group bundling/, "existing work-plan bundling remains");
  });
}

// ---- (c) validate-checks: 2行が既存読み先を残したまま journeys を追加 ----
for (const r of JA_ROOTS) {
  test(`validate(${r}): 2軸が journeys を追加の読み先に持ち既存読み先を残す（検出力不変）`, () => {
    const c = read(`${r}/skills/intent-validate/rules/validate-checks.md`);
    const cp = c.split("\n").find((l) => l.includes("| cross-packet-contract-coverage |"));
    assert.ok(cp, "cross-packet-contract-coverage 行が無い");
    assert.match(cp, /共有契約がない案件は軸ごと沈黙/, "既存の沈黙条件が残存");
    assert.match(cp, /plan\.md の共有契約表に加えて在ればジャーニー正本/, "journeys の追加読み先");
    assert.match(cp, /読み先の追加であって置き換えではない・INV103/, "置き換え禁止の明記");
    const cs = c.split("\n").find((l) => l.includes("| capability-starvation |"));
    assert.ok(cs, "capability-starvation 行が無い");
    assert.match(cs, /`packets\/plan\.md` の工程計画 \/ Walking Skeleton/, "既存の plan.md 読み先が残存（置き換え変異で赤化）");
    assert.match(cs, /在ればジャーニー正本 `\.intent\/packets\/journeys\/\*\.md` の工程計画も同格の読み先に加える・無ければ従来どおり・INV103/, "journeys の同格読み先とフォールバック");
  });
}
for (const r of EN_ROOTS) {
  test(`validate(${r}): both axes add journeys while keeping existing sources`, () => {
    const c = read(`${r}/skills/intent-validate/rules/validate-checks.md`);
    const cp = c.split("\n").find((l) => l.includes("| cross-packet-contract-coverage |"));
    assert.ok(cp);
    assert.match(cp, /keep the entire check silent/);
    assert.match(cp, /in addition to the plan\.md shared-contract table, the canonical journey files/);
    assert.match(cp, /an added source, not a replacement; INV103/);
    const cs = c.split("\n").find((l) => l.includes("| capability-starvation |"));
    assert.ok(cs);
    assert.match(cs, /the work plan \/ Walking Skeleton in `packets\/plan\.md`/);
    assert.match(cs, /counts as an equal source; absent, behave as before; INV103/);
  });
}

// ---- (d) クロスファイル契約: CONTRACT の契約名を読み手が参照し、CONTRACT 側に実体がある ----
test("クロスファイル: 読み手が参照する契約名「ジャーニーの読み取り契約」が CONTRACT に実在する", () => {
  for (const r of JA_ROOTS) {
    const contract = read(`${r}/skills/CONTRACT.md`);
    assert.match(contract, /ジャーニー（`\.intent\/packets\/journeys\/`）の読み取り契約/, `${r}: CONTRACT に契約実体`);
  }
  for (const r of EN_ROOTS) {
    const contract = read(`${r}/skills/CONTRACT.md`);
    assert.match(contract, /The journey \(`\.intent\/packets\/journeys\/`\) reading contract/, `${r}: CONTRACT (en)`);
  }
});
