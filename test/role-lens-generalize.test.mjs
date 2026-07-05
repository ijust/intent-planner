// ロールレンズの観点一般化と利用者向け文言の平易化 (pkt-20260705-role-lens-generalize-xyce, DR94/DR95/A48)。
// node:test 標準・依存ゼロ (INV2)。
//
// 範囲分担: role-lens.test.mjs が土台（2.4 の存在・記録先・歯止め・dogfood 同期）を検査済み。
// 本ファイルは一般化の差分だけを検査する（重複させない）。
//
// 判別オラクル (packet Validation 由来):
//   (a) 観点が「固定リストではない（閉じた値域にしない）」と明文で宣言され、専門領域の観点の推論
//       （法務などの例）が存在する（固定3値列挙へ戻る実装を落とす）
//   (b) 観点呼称が普通語主体で、職種略語（PdM 等）は「いわゆる」形の括弧別名に降格している
//   (c) lens 行の記入例が普通語の観点名になっている
//   (d) CONTRACT の lens 契約が例示化され、出し分けが観点名に依存しないと明文
//   (e) 平易さの床「その職種の初見の人」(DR95) が問いの歯止めに明文
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

const dqJa = read(path.join(TEMPLATES, "ja", "claude", "skills", "intent-discover", "rules", "designer-questions.md"));
const dqEn = read(path.join(TEMPLATES, "en", "claude", "skills", "intent-discover", "rules", "designer-questions.md"));

test("designer-questions ja: 観点は閉じた値域にしない・専門領域観点の推論 (a)", () => {
  assert.match(dqJa, /観点は\*\*固定リストではない（閉じた値域にしない・DR94）\*\*/);
  assert.match(dqJa, /その案件の専門領域の観点\*\*（例: 法務・医療・営業・教育/);
  assert.match(dqJa, /よくある例は3つ/);
});

test("designer-questions ja: 呼称は普通語主体・略語は括弧の別名 (b)(c)(e)", () => {
  assert.match(dqJa, /\*\*製品を決める観点\*\*（誰の問題か・価値・優先順位。いわゆる PdM）/);
  assert.match(dqJa, /\*\*進行を管理する観点\*\*（見積もり・リスク・依存。いわゆる PjM）/);
  assert.match(dqJa, /\*\*体験を設計する観点\*\*（導線・接点・使い勝手。いわゆるサービスデザイン）/);
  // lens 行の例が普通語の観点名
  assert.match(dqJa, /`- \*\*lens\*\*: 製品を決める観点=代行 \/ 法務の観点=本人`/);
  assert.match(dqJa, /観点名は普通語の自由記述・旧来の略語表記も正当な値/);
  // 平易さの床 (DR95)
  assert.match(dqJa, /床は「その職種の初見の人」に通じること\*\*（DR95）/);
  assert.match(dqJa, /職種略語（PdM 等）は括弧の別名に留める/);
  // 出し分けは観点名に依存しない
  assert.match(dqJa, /観点の\*\*名前に依存しない\*\*/);
});

test("designer-questions en: the same generalization (a)(b)(c)(e)", () => {
  assert.match(dqEn, /\*\*not a fixed list \(never a closed value domain; DR94\)\*\*/);
  assert.match(dqEn, /the perspective of the case's specialist domain\*\* \(e\.g\., legal, medical, sales, education/);
  assert.match(dqEn, /the perspective that decides the product\*\* \(whose problem, value, priority — a\.k\.a\. PdM\)/);
  assert.match(dqEn, /the perspective that decides the product=stand-in \/ the legal perspective=person/);
  assert.match(dqEn, /perspective names are plain-word free text; legacy abbreviation values are also valid/);
  assert.match(dqEn, /the floor is that a first-time reader of that profession understands them\*\* \(DR95\)/);
  assert.match(dqEn, /does not depend on the perspective's name/);
});

// (d) CONTRACT 4系統: 例示化 + 観点名に依存しない出し分け
const CONTRACT_VARIANTS = [
  ["ja", "claude", /固定リストではなく普通語の自由記述\*\*/, /出し分けは観点の名前に依存しない\*\*/],
  ["ja", "codex", /固定リストではなく普通語の自由記述\*\*/, /出し分けは観点の名前に依存しない\*\*/],
  ["en", "claude", /\*\*not a fixed list; plain-word free text\*\*/, /the routing does not depend on the perspective's name\*\*/],
  ["en", "codex", /\*\*not a fixed list; plain-word free text\*\*/, /the routing does not depend on the perspective's name\*\*/],
];

for (const [lang, agent, ...patterns] of CONTRACT_VARIANTS) {
  test(`CONTRACT ${lang}/${agent}: lens 契約が例示化され観点名に依存しない (d)`, () => {
    const body = read(path.join(TEMPLATES, lang, agent, "skills", "CONTRACT.md"));
    for (const p of patterns) assert.match(body, p);
    // 固定3値の閉じた列挙（旧文言）へ戻っていないこと（判別: 一般化を巻き戻す実装を落とす）
    const oldClosed = lang === "ja" ? "案件に必要な観点（PdM／PjM／サービスデザイン）と" : "the perspectives this case needs (PdM / PjM / service design) and";
    assert.ok(!body.includes(oldClosed), `${lang}/${agent}: 旧固定3値の閉じた列挙が残っていない`);
  });
}
