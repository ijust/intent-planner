// 読み込み予算（バイト上限）の静的検査。
// spec: token-diet（A79・C96）/ INV118（読み込み予算の二重上限）/ DR232（enforcement は静的テスト1本のみ）。
//
// 【狙い】ルート規約文書は行数上限（test/root-doc-onboarding.test.mjs の MAX_LINES=90）を守ったまま
// 1行が水平に伸びてバイトが肥大した実績がある（2026-07-18 実測 86行/15,593B・単一指標の抜け穴＝Anti-590）。
// 行数に加えてバイトの予算を機械検査し、無自覚な肥大をコミット時に赤で顕在化させる。
//
// 【上限値の決め方】2026-07-18 の圧縮着地実測 × 1.10 を 100B 単位で切り上げ（c4fj の実装裁量・Evidence に記録）。
// 余裕幅は「正当な追記（新規律1〜2件）は通し、無自覚な線形肥大は止める」幅。
// 上限を上げるときは、上げる理由（新しい規律・新しい検査軸など）を人が判断して意図的に上げる（Anti-595:
// テスト側を黙って緩めて数値達成を装わない）。実行時に働く仕組みはこのテスト以外に持たない（DR232・Anti-593）。
//
// 【対象】常時ロードされるルート文書6系統と、呼び出し時に載る非ロックの大型スキル本体
// （intent-validate / intent-status）。dogfood 配置コピーは別テストが templates とのバイト同一を
// 検査しているためここでは対象にしない（二重検査を避ける）。

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

// path → 上限バイト（着地実測 +10%・100B 切り上げ・2026-07-18 固定）。
// 2026-07-20: 質問の最低品質を常時効かせる要約を6配布面へ追加したため、各面の実測を
// 次の100Bへ切り上げてルート文書6件だけを意図的に更新した（pkt-20260720-質問の最低品質をintent-planning全体へ適用する-6j4z）。
// 2026-07-21: 最終同期後の実測が上記の値を超えていたため、内容の短縮で指示の意味を変えることを避け、
// 利用者確認のもとで実測を次の100Bへ切り上げた。
const BYTE_BUDGET = new Map([
  // 常時ロード層: ルート規約文書（本体）
  ["templates/ja/agents/claude/CLAUDE_intent.md", 15900],
  ["templates/ja/agents/codex/AGENTS.md", 15700],
  ["templates/ja/agents/gemini/GEMINI_intent.md", 15700],
  ["templates/en/agents/claude/CLAUDE_intent.md", 15200],
  ["templates/en/agents/codex/AGENTS.md", 14900],
  ["templates/en/agents/gemini/GEMINI_intent.md", 14900],
  // 呼び出し時層: 非ロックの大型スキル本体（現状サイズの凍結。正当な軸追加時は人が上限を意図的に上げる）
  ["templates/ja/claude/skills/intent-validate/SKILL.md", 80300],
  ["templates/ja/codex/skills/intent-validate/SKILL.md", 80200],
  ["templates/en/claude/skills/intent-validate/SKILL.md", 77900],
  ["templates/en/codex/skills/intent-validate/SKILL.md", 77900],
  ["templates/ja/claude/skills/intent-status/SKILL.md", 50500],
  ["templates/ja/codex/skills/intent-status/SKILL.md", 50400],
  ["templates/en/claude/skills/intent-status/SKILL.md", 50400],
  ["templates/en/codex/skills/intent-status/SKILL.md", 50300],
]);

test("読み込み予算: 対象ファイルが存在する（予算対象の移動・改名は上限表の追随が要る）", () => {
  for (const rel of BYTE_BUDGET.keys()) {
    assert.ok(
      fs.existsSync(path.join(REPO_ROOT, rel)),
      `予算対象が見つからない: ${rel}（移動・改名したなら BYTE_BUDGET を追随更新する）`,
    );
  }
});

for (const [rel, maxBytes] of BYTE_BUDGET) {
  test(`読み込み予算: ${rel} が ${maxBytes}B 以内`, () => {
    const actual = fs.statSync(path.join(REPO_ROOT, rel)).size;
    assert.ok(
      actual <= maxBytes,
      `${rel} が読み込み予算を超過: 実測 ${actual}B > 上限 ${maxBytes}B（INV118）。` +
        `対処は (a) 遅延読み込み化・重複相殺で予算内へ戻す（DR231: 削除でなく移動・導線を残す）、または ` +
        `(b) 正当な追記（新しい規律・検査軸）なら理由を添えて人がこの上限を意図的に上げる（Anti-595: 黙って緩めない）`,
    );
  });
}
