// plan.md 既存ジャーニー3節の一括移行（pkt-20260717-journey-plan-migration-tguh）の判別検証。
//
// 判別オラクル（移行の構造的証跡・開発時の凍結スナップショット byte 照合は scratchpad の使い捨て＝
// live 自己再導出のトートロジーを恒久テストに埋めない・tree-normalize の教訓）:
//   (a) 3つのジャーニー正本が実在し、7キー固定の frontmatter と、移送された案件見出し（### <案件> ジャーニー（…追加））を保つ
//   (b) 各節に固有の記述が「journeys/ 側に在り・plan.md 側に無い」＝コピーでも消失でもなく move である
//   (c) plan.md の当該4節は参照スタブで、指す先のファイルが実在する（参照整合）
//   (d) plan.md の他の住人（Walking Skeleton 見出し・過去案件の節・工程計画節）は残存する（Anti-559）
//   (e) 書き手 rule は併記終了（旧文言の不在＝負の空間）
//   (f) writeback の「閉じられます」の一言は行等価＋隣接行固定（一様注入の教訓＝行とその近傍まで固定）
//   (g) INV81 / DR140 に座の移動の注記がある（黙って反転しない）
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(REPO_ROOT, rel));

const EXPECTED_KEYS = ["journey_id", "name", "lifecycle", "packets", "created_at", "updated_at", "summary"];
const frontmatterKeys = (content) => {
  const m = content.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, "frontmatter が無い");
  return m[1].split("\n").map((l) => l.match(/^([a-z_]+):/)).filter(Boolean).map((mm) => mm[1]);
};

// 案件ごとの「移送先・保全見出し・固有記述（move の証拠）」
// 独立レビュー指摘（2026-07-17・Critical・7回目）: 中腹のマーカーだけでは移送本文の**末尾切り**を
// 落とせない（最終行を削っても 19/19 通過を実証された）。対策＝各節の**末尾の行**（tailMarker）も
// 「journeys/ 側に在り・plan.md 側に無い」で固定する。ジャーニーの本文は今後も追記で育つため、
// 「ファイルの最終行」でなく「移送された節の末尾行の存在」を固定する（将来の正当な追記を壊さない）。
const CASES = [
  {
    file: ".intent/packets/journeys/nl-spec-reader-experience.md",
    heading: "### nl-spec-reader-experience ジャーニー（2026-07-15 追加）",
    marker: "packet ⑤ の特殊性（調査先行）",
    tailMarker: "新記号を templates 参照する際は `scripts/symbol-labels.json` 追記が随伴（INV59）。",
  },
  {
    file: ".intent/packets/journeys/diagnosis-bias-guard.md",
    heading: "### diagnosis-bias-guard ジャーニー（2026-07-15 追加）",
    marker: "残り6行",
    tailMarker: "「rule だから非ロック」と一般化しない）。",
  },
  {
    file: ".intent/packets/journeys/drift-lessons-uptake.md",
    heading: "### drift-lessons-uptake ジャーニー（2026-07-14 追加）",
    marker: "担い手は4者",
    tailMarker: "早期提示 1回目（2026-07-14）。",
  },
  {
    file: ".intent/packets/journeys/ジャーニーの正式化.md",
    heading: "### journey-formalize ジャーニー（2026-07-17 追加）",
    marker: "plan.md 手書きジャーニー記録」の最後の世代",
    // 移送した塊の末尾（共有契約表の最終行）はジャーニー本文の表と同文のため、出現回数=2 で固定する
    // （末尾切りで 2→1 に落ちて赤化。本文側の表が動けば意識的にこの検査を更新する）。
    tailCount: { needle: "| Impact Analysis「symbol-labels（INV59）」", count: 2 },
  },
];

const plan = read(".intent/packets/plan.md");

// 閉じたジャーニーは `journeys/archive/<年>/` へ移る（journeys/README 規約・人の宣言でのみ）。
// 移送保全の検査は「置き場」でなく「ファイル」を追う——active に無ければ archive 配下を探し、
// どこにも無ければ従来どおり元パスの不在として名指しで赤化する（検出力は落とさない）。
function resolveJourneyFile(rel) {
  if (exists(rel)) return rel;
  const archiveDir = path.join(REPO_ROOT, ".intent/packets/journeys/archive");
  if (fs.existsSync(archiveDir)) {
    for (const year of fs.readdirSync(archiveDir)) {
      const cand = path.join(".intent/packets/journeys/archive", year, path.basename(rel));
      if (exists(cand)) return cand;
    }
  }
  return rel;
}

for (const c of CASES) {
  test(`移行: ${path.basename(c.file)} が案件見出しと固有記述を保ち、plan.md 側から消えている（move の証拠）`, () => {
    const file = resolveJourneyFile(c.file);
    assert.ok(exists(file), `${c.file} が実在しない（journeys/ にも archive/ にも無い）`);
    const j = read(file);
    assert.ok(j.includes(c.heading), "移送された案件見出しが保全されていない");
    assert.ok(j.includes(c.marker), "節固有の記述が journeys/ 側に無い（移送漏れ）");
    assert.ok(!plan.includes(c.marker), "節固有の記述が plan.md に残っている（move でなくコピー、または縮小漏れ）");
    if (c.tailMarker) {
      assert.ok(j.includes(c.tailMarker), "移送された節の末尾行が journeys/ 側に無い（末尾切りを検出）");
      assert.ok(!plan.includes(c.tailMarker), "移送された節の末尾行が plan.md に残っている");
    }
    if (c.tailCount) {
      const n = j.split(c.tailCount.needle).length - 1;
      assert.equal(n, c.tailCount.count, "移送した塊の末尾（共有契約表の最終行）の出現回数が期待と不一致（末尾切りを検出）");
    }
    if (!c.file.endsWith("ジャーニーの正式化.md")) {
      assert.deepEqual(frontmatterKeys(j), EXPECTED_KEYS, "frontmatter が7キー固定でない");
    }
  });
}

test("plan.md: 4節が参照スタブになり、指す先が実在する（参照整合）", () => {
  const stubs = plan.split("\n").filter((l) => l.includes("正本へ移送済み（2026-07-17・DR202・byte 保全）") || l.includes("起草時の記録も 2026-07-17 に移送済み"));
  assert.equal(stubs.length, 4, `スタブが4行でない（実際: ${stubs.length}）`);
  for (const s of stubs) {
    const m = s.match(/`(\.intent\/packets\/journeys\/[^`]+\.md)`/);
    assert.ok(m, `スタブに正本パスが無い: ${s.slice(0, 60)}`);
    assert.ok(exists(resolveJourneyFile(m[1])), `スタブの指す先が実在しない: ${m[1]}`);
  }
});

test("plan.md: 他の住人は残存する（Anti-559・ついで移行の禁止）", () => {
  assert.ok(plan.includes("## Walking Skeleton（designer-questions: on のとき記入）"), "Walking Skeleton 見出し");
  assert.ok(plan.includes("### term-drift-agent-entry ジャーニー"), "過去案件の節（対象外）");
  assert.ok(plan.includes("## 工程計画（任意・グループ分けと着手順）"), "工程計画節");
  assert.ok(plan.includes("## Deferred（切り出し）"), "Deferred 節");
});

// ---- (e) 書き手 rule の併記終了（6系統・負の空間） ----
const JA_ROOTS = [".claude", ".agents", "templates/ja/claude", "templates/ja/codex"];
const EN_ROOTS = ["templates/en/claude", "templates/en/codex"];
const RULE = "skills/intent-packets/rules/journey-plan.md";
for (const r of JA_ROOTS) {
  test(`journey-plan rule(${r}): 併記終了（旧文言の不在）`, () => {
    const c = read(`${r}/${RULE}`);
    assert.match(c, /plan\.md への併記はしない（2026-07-17 の移行で終了）/);
    assert.doesNotMatch(c, /従来記録は続ける（暫定並走）/, "旧の暫定並走文言が残存");
    assert.match(c, /恒久フォールバックとして残る（INV103）/);
  });
}
for (const r of EN_ROOTS) {
  test(`journey-plan rule(${r}): dual-write ended`, () => {
    const c = read(`${r}/${RULE}`);
    assert.match(c, /Do not also record to plan\.md \(the parallel run ended with the 2026-07-17 migration\)/);
    assert.doesNotMatch(c, /Keep recording to plan\.md as before/);
  });
}

// ---- (f) writeback の一言（行等価＋隣接行固定） ----
const WB_JA =
  "- 完了処理の後、その packet がジャーニー（`.intent/packets/journeys/*.md` の `packets` 列挙・在れば）に属するかを read-only で確認し、構成 packet がすべて done かつ統合時の検査が green と読めるときは「このジャーニーは閉じられます」と一言促す（`lifecycle: archived` の記入と `journeys/archive/<年>/` への移動は人の宣言＝機械は閉じない・INV91。ジャーニーが無ければ何も出さない＝従来どおり・INV103）。";
const WB_EN =
  '- After completion processing, check read-only whether the packet belongs to a journey (the `packets` list in `.intent/packets/journeys/*.md`, when present); when all member packets are done and the integration checks read green, add one line: "this journey can now be closed" (writing `lifecycle: archived` and moving the file to `journeys/archive/<year>/` are a human\'s declaration — a machine never closes one; INV91. With no journeys, output nothing = as before; INV103).';
for (const r of JA_ROOTS) {
  test(`writeback(${r}): ジャーニーを閉じる促しが行等価で、直後が成果分岐の例外行`, () => {
    const lines = read(`${r}/skills/intent-writeback/SKILL.md`).split("\n");
    const idx = lines.findIndex((l) => l.includes("このジャーニーは閉じられます"));
    assert.notEqual(idx, -1, "促しの行が無い");
    assert.equal(lines[idx], WB_JA, "促しの行が期待文と不一致（追記・改変を検出）");
    assert.ok(lines[idx + 1].startsWith("- **成果分岐の例外**"), "直後の行が既知の次行でない（隣接注入を検出）");
  });
}
for (const r of EN_ROOTS) {
  test(`writeback(${r}): journey-close nudge line-equal with known next line`, () => {
    const lines = read(`${r}/skills/intent-writeback/SKILL.md`).split("\n");
    const idx = lines.findIndex((l) => l.includes("this journey can now be closed"));
    assert.notEqual(idx, -1);
    assert.equal(lines[idx], WB_EN);
    assert.ok(lines[idx + 1].startsWith("- **Outcome branch exception**"));
  });
}

// ---- (g) INV81 / DR140 の座の移動の注記 ----
test("compass: INV81 / DR140 に座の移動の注記（superseded の明示）がある", () => {
  for (const rel of [".intent/compass/INV81.md", ".intent/compass/DR140.md"]) {
    const c = read(rel);
    assert.match(c, /注記（2026-07-17・DR202・journey-formalize/, `${rel}: 注記が無い`);
    assert.match(c, /恒久フォールバック/, `${rel}: フォールバックの明示が無い`);
    assert.match(c, /superseded/, `${rel}: superseded の明示が無い`);
  }
});
