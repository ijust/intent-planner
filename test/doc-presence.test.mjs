// doc-sync 存在検査（discipline-guards / C44 / DR108 / A57）。
//
// 狙い: 新しいスキルを足したのに theory.md / README への記載を忘れる doc-sync 漏れ
//   （Anti-direction 9＝INV10 の人手オラクル）を機械で名指し検出する。
//
// 検査対象は templates の skills ディレクトリ名から導出する（手動マニフェストを持たない
//   ＝DR108。手動リストは「もう一つの記入忘れ台帳」を生むため）。新スキルを templates に
//   足すと、文書追記か理由付き除外まで自動的に検査対象へ入る。
//
// 検査述語（意味解釈に寄せない素朴な文字列包含・INV2/A1・readme-install.test.mjs と同型）:
//   - theory.md（考え方の網羅文書）: 全スキル名が登場する（除外なし＝全スキル必須）。
//   - README.md / README.en.md（導入文書）: 全スキル名が登場する。ただし「導入文書に
//     意図的に載せない」スキルは README_EXCLUDE に理由付きで登録して検査から外す（DR108）。
//
// 受容した限界（Non-scope・Anti-direction 355）: これは存在検査であって、説明の正しさ・
//   粒度の一致は検査しない。機能名が文書に1回でも登場すれば緑になる（説明が誤っていても
//   通る）。意味の一致は人手オラクルのまま残す設計判断であり、この検査の穴ではなく境界。
//
// discriminative: 実在スキル名を1つ文書から欠いた状態で fail することを別途確認する
//   （検査が緩い＝欠落を見逃す誤実装を落とせる）。

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

// 検査対象スキル名の導出元（ja/claude を代表とする。4系統は path-set 等価が別テストで保証済み）。
const SKILLS_DIR = path.join(REPO_ROOT, "templates", "ja", "claude", "skills");

// README（導入文書）に意図的に載せないスキル。除外は理由必須（無審査の一括登録を禁じる＝
//   Anti-direction 356）。theory.md には除外を設けない（全スキル必須）。
//
//   現時点で README に載せないと判断したスキルはない。導入文書の分量都合等で意図的に
//   載せないと決めたスキルが出たら、ここへ `"intent-xxx": "理由"` の形で追加する。
const README_EXCLUDE = {
  // 例: "intent-db-design": "永続データモデル設計者向けの補助ビューで、導入文書の主要導線から外す",
};

// ユーザー向けコマンド名（＝スキル名）を templates の skills ディレクトリ名から導出する。
//   intent-* のみを対象とし、CONTRACT.md 等の非スキルは自然に除外される。
function deriveSkillNames() {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("intent-"))
    .map((d) => d.name)
    .sort();
}

function read(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

// スキル名が本文に literal 登場するかを判定する純関数（素朴な文字列包含）。
function mentions(body, skill) {
  return body.includes(skill);
}

const SKILLS = deriveSkillNames();

// 導出が空なら検査不能（silent pass を避け明示 fail する）。
test("doc-presence: スキル名が templates から導出できる（検査不能を明示 fail）", () => {
  assert.ok(
    SKILLS.length > 0,
    `templates/ja/claude/skills/ から intent-* スキルを導出できない（検査対象ゼロ）: ${SKILLS_DIR}`,
  );
});

// theory.md: 全スキル必須（除外なし）。
test("doc-presence: docs/theory.md に全スキル名が登場する", () => {
  const rel = "docs/theory.md";
  let body;
  try {
    body = read(rel);
  } catch {
    assert.fail(`${rel} が読めない（検査対象文書が不在）`);
  }
  const missing = SKILLS.filter((s) => !mentions(body, s));
  assert.deepEqual(
    missing,
    [],
    `${rel} に登場しないスキル: ${missing.join(", ")}（theory は全スキル必須。追記して直す）`,
  );
});

// README.md / README.en.md: 除外欄で意図的に外したもの以外は全スキル必須。
for (const rel of ["README.md", "README.en.md"]) {
  test(`doc-presence: ${rel} に全スキル名が登場する（README_EXCLUDE を除く）`, () => {
    let body;
    try {
      body = read(rel);
    } catch {
      assert.fail(`${rel} が読めない（検査対象文書が不在）`);
    }
    const targets = SKILLS.filter((s) => !(s in README_EXCLUDE));
    const missing = targets.filter((s) => !mentions(body, s));
    assert.deepEqual(
      missing,
      [],
      `${rel} に登場しないスキル: ${missing.join(", ")}（文書へ追記するか README_EXCLUDE へ理由付きで登録する）`,
    );
  });
}

// 除外欄の健全性: 除外に登録した名前が実在スキルであること（陳腐化した除外を残さない）。
test("doc-presence: README_EXCLUDE のキーは実在スキルである", () => {
  const stale = Object.keys(README_EXCLUDE).filter((s) => !SKILLS.includes(s));
  assert.deepEqual(
    stale,
    [],
    `README_EXCLUDE に実在しないスキル名がある（削除済みスキルの除外が残っている）: ${stale.join(", ")}`,
  );
});

// 除外欄の健全性: 除外の理由が空でないこと（無審査の除外を禁じる＝Anti-direction 356）。
test("doc-presence: README_EXCLUDE の各除外に理由が付いている", () => {
  const reasonless = Object.entries(README_EXCLUDE)
    .filter(([, reason]) => !reason || !String(reason).trim())
    .map(([s]) => s);
  assert.deepEqual(
    reasonless,
    [],
    `README_EXCLUDE に理由の無い除外がある（除外は理由必須）: ${reasonless.join(", ")}`,
  );
});

// discriminative: 実在スキル名を1つ欠いた本文では theory 検査が fail する（欠落を落とせる）。
test("doc-presence: 検査は欠落を落とせる（discriminative）", () => {
  const body = read("docs/theory.md");
  const present = SKILLS.filter((s) => mentions(body, s));
  assert.ok(present.length > 0, "theory に少なくとも1つのスキルが登場している前提");
  const victim = present[0];
  const holed = body.split(victim).join("XXXX");
  assert.ok(
    !mentions(holed, victim),
    `${victim} を抜いた本文で存在検査が fail する（欠落を落とせる）`,
  );
});
