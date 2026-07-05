// role-aware-planner product スロット4種 (pkt-20260705-product-slots-jaby, A48/C31) の構造検証。
// node:test 標準・依存ゼロ (INV2)。
//
// 範囲分担: rules の claude/codex byte 等価は agent-rules-parity が担う（本ファイルは claude 面
// + dogfood 同期のみ）。共通コア8 ID の実在は decision-slots.test.mjs が既に担う（重複させない）。
//
// 判別オラクル (packet Validation 由来):
//   (a) product スロット4 ID の新表が decision-slots.md に存在する（pure addition）
//   (b) gap-readout が4 ID を物差しとして参照する（PRD 沈黙検出への波及）
//   (c) 既存の意味不変: decision-slot-unsown は共通コア8のみ判定と明記・既存8表の見出しが不変
//   (d) 閉じ先は既存の入れ物参照（Non-scope 参照・新しい入れ物を作らない）
//   (e) discover の④ posture 確認が product スロットを同じ一度の確認に含める
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

const PRODUCT_SLOT_IDS = [
  "decision-target-user",
  "decision-success-signal",
  "decision-out-of-scope",
  "decision-alternatives",
];

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

for (const lang of ["ja", "en"]) {
  const slots = read(
    path.join(TEMPLATES, lang, "claude", "skills", "intent-packets", "rules", "decision-slots.md"),
  );

  test(`decision-slots ${lang}: product スロット4 ID の新表が存在する (a)`, () => {
    const heading = lang === "ja" ? /## product スロット（第2群・全モードで播く/ : /## Product slots \(second group; seeded in all modes/;
    assert.match(slots, heading);
    for (const id of PRODUCT_SLOT_IDS) {
      assert.ok(slots.includes(`\`${id}\``), `${lang}: ${id} が表に存在する`);
    }
  });

  test(`decision-slots ${lang}: 既存の意味不変 — unsown 検査は共通コア8のみ・既存表見出し不変 (c)`, () => {
    const unsownNote = lang === "ja" ? /`decision-slot-unsown` 検査は従来どおり\*\*共通コア8 ID のみ\*\*を判定/ : /`decision-slot-unsown` check in `intent-validate` keeps judging \*\*only the 8 common-core IDs\*\*/;
    assert.match(slots, unsownNote);
    const coreHeading = lang === "ja" ? /## 共通コアスロット（全モードで播く）/ : /## Common core slots \(seeded in all modes\)/;
    assert.match(slots, coreHeading);
  });

  test(`decision-slots ${lang}: 閉じ先は既存の入れ物を参照する (d)`, () => {
    const nonScopeRef = lang === "ja" ? /packet `## Non-scope`（既存節参照・重複定義しない）/ : /packet `## Non-scope` \(refer to the existing section; do not duplicate\)/;
    assert.match(slots, nonScopeRef);
    const noNewContainer = lang === "ja" ? /新しい入れ物を作らない/ : /create no new container/;
    assert.match(slots, noNewContainer);
  });

  test(`gap-readout ${lang}: product スロット4 ID を物差しとして参照する (b)`, () => {
    const gap = read(
      path.join(TEMPLATES, lang, "claude", "skills", "intent-from-spec", "rules", "gap-readout.md"),
    );
    for (const id of PRODUCT_SLOT_IDS) {
      assert.ok(gap.includes(`\`${id}\``), `${lang}: gap-readout が ${id} を参照する`);
    }
    // 独自 ID を定義しない契約は不変
    const noOwnIds = lang === "ja" ? /独自の検査 ID／スロット ID を\*\*新しく定義することはない\*\*/ : /\*\*never defines new\*\* check IDs or slot IDs/;
    assert.match(gap, noOwnIds);
  });

  test(`designer-questions ${lang}: ④ posture 確認が product スロットを含む (e)`, () => {
    const dq = read(
      path.join(TEMPLATES, lang, "claude", "skills", "intent-discover", "rules", "designer-questions.md"),
    );
    const line = lang === "ja" ? /製品判断（対象ユーザー・成功指標・スコープ外・代替案＝.*product スロット）も同じ一度の確認に含める/ : /Include the product judgments \(target user, success signal, out of scope, alternatives considered — the product slots/;
    assert.match(dq, line);
  });
}

// dogfood 同期 (INV9)
for (const rel of [
  "intent-packets/rules/decision-slots.md",
  "intent-from-spec/rules/gap-readout.md",
  "intent-discover/rules/designer-questions.md",
]) {
  test(`dogfood 同期: .claude/skills/${rel} == templates/ja/claude/skills/${rel}`, () => {
    const dogfood = read(path.join(REPO_ROOT, ".claude", "skills", rel));
    const master = read(path.join(TEMPLATES, "ja", "claude", "skills", rel));
    assert.equal(dogfood, master, `${rel} が dogfood と templates で byte 等価`);
  });
}
