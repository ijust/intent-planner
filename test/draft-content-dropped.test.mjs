// draft-content-dropped（export 下書きの中身が下流の spec 生成物で落ちていないか・C54/A60 validate 側）の
//   不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: 下書きは「渡した」だけでは下流の生成過程で静かに落ちる。実測（36 export × 下流 spec の突合・2026-07）では、
//   下書きが引いた意図の参照のうち下流の requirements に残るのは約3分の2、生成された各タスクへ不変則参照が
//   転記される率は1割強だった。写像（受入基準の材料を運ぶ＝INV75）と案内（フェーズごとのヒント手渡し＝DR120）を
//   直しても下流の生成の癖として再発しうるため、減衰を見張る検出軸を1本置く（DR122）。
//   intent-validate は SKILL 本文を hash lock しない（非 SKILL_BODY_LOCKED）ので本文を正当に編集できる
//   （requirement-oracle-check / provisional-carryover 追加時と同じ横断知見）。
//
// ここでは「検査軸が catalog にある（深刻度 推奨/recommended）・SKILL が独立 Step 3.17 を持つ・
//   read-only/no-gate/LLM 文脈（機械検査・スコア化に寄せない）・既存の下書き系軸（export-draft-mismatch /
//   requirement-oracle-check）と軸分離・突合キーは実線（feature 行）優先で推測マッチングしない・
//   .kiro/specs 不在で沈黙・glossary 登録（dogfood）」を4系統で名指し検査し、削除・ドリフトを回帰として落とす
//   （discriminative oracle・既存軸追加時と同型）。
//
// 注: validate-checks.md は ja（claude=codex=dogfood）/ en（claude=codex）で byte 等価。
//   SKILL.md は本文等価で codex は frontmatter 差分。ここでは内容アンカーを名指しする。
//   glossary は配布 scaffold（templates/*/intent/glossary.md）には検査軸を積まない方針（A38/A41/A42 と同じ）ゆえ、
//   本軸の glossary 登録は dogfood（.intent/glossary.md）でのみ検査する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"]; // gemini は codex ツリー共有（専用ファイル無し）。

const CHECK_ID = "draft-content-dropped";

function checksPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "SKILL.md");
}
function catalogRow(lang, agent) {
  const c = fs.readFileSync(checksPath(lang, agent), "utf8");
  return c.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
}

// ---- 1. 検査カタログに draft-content-dropped の行がある（4系統・深刻度 推奨/recommended） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} の validate-checks に ${CHECK_ID} 検査軸の行がある`, () => {
      const row = catalogRow(lang, agent);
      assert.ok(row, `${lang}/${agent}: catalog 表に ${CHECK_ID} のデータ行がある`);
      const cells = row.split("|").map((s) => s.trim());
      const severity = cells[cells.length - 2];
      const ok = lang === "ja" ? severity === "推奨" : severity.toLowerCase() === "recommended";
      assert.ok(ok, `${lang}/${agent}: 深刻度が 推奨/recommended — 実際=「${severity}」`);
    });
  }
}

// ---- 2. read-only・no-gate・意味判断（スコア化・機械照合に寄せない）の不変条件 ----
// 判別性: 生存率のスコア化・閾値判定へ倒した文面、gate 化した文面は落ちる。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の ${CHECK_ID} が read-only・no-gate・意味判断（スコア化に寄せない）`, () => {
      const row = catalogRow(lang, agent);
      assert.ok(/intent-check\.mjs/.test(row), `${lang}/${agent}: scripts/intent-check.mjs に寄せない旨を持つ`);
      assert.ok(/INV2\/A1/.test(row), `${lang}/${agent}: INV2/A1（意味判断・機械検査でない）に触れる`);
      const noScore = lang === "ja" ? /スコア化|閾値判定/ : /scoring|threshold/i;
      assert.ok(noScore.test(row), `${lang}/${agent}: 生存率のスコア化・閾値判定を持たない明記`);
      assert.ok(/INV49/.test(row), `${lang}/${agent}: INV49（warn-only・gate にしない）を継承`);
      const readOnly = lang === "ja" ? /read-only/ : /read-only/i;
      assert.ok(readOnly.test(row), `${lang}/${agent}: read-only の明記`);
    });
  }
}

// ---- 3. 突合キーは実線（feature 行）優先で、同定不能なら推測マッチングしない ----
// 判別性: 「packet 名の推測一致で対応づける」へ倒した文面は落ちる（誤検知を出す設計）。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の ${CHECK_ID} が実線（feature 行）優先・同定不能なら推測で対応づけない`, () => {
      const row = catalogRow(lang, agent);
      assert.ok(row.includes("- feature:"), `${lang}/${agent}: 突合の一次手がかりが export-log の feature 追記行`);
      assert.ok(row.includes("## Source Packet"), `${lang}/${agent}: 補助照合が Source Packet の packet 名`);
      const noGuess = lang === "ja" ? /推測で対応づけない/ : /never pair them by guesswork/i;
      assert.ok(noGuess.test(row), `${lang}/${agent}: 同定不能時に推測で対応づけない明記`);
      const unmatched = lang === "ja" ? /突合不能/ : /cannot be matched/i;
      assert.ok(unmatched.test(row), `${lang}/${agent}: 突合不能を告げる明記`);
    });
  }
}

// ---- 4. 既存の下書き系軸（export-draft-mismatch / requirement-oracle-check）と軸分離する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の ${CHECK_ID} が既存の下書き系軸と軸分離する`, () => {
      const row = catalogRow(lang, agent);
      assert.ok(row.includes("export-draft-mismatch"), `${lang}/${agent}: export-draft-mismatch と軸を分ける`);
      assert.ok(row.includes("requirement-oracle-check"), `${lang}/${agent}: requirement-oracle-check と軸を分ける`);
    });
  }
}

// ---- 5. 後方互換: .kiro/specs 不在（direct 実装案件）では軸をスキップし沈黙する ----
// 判別性: 「.kiro/specs が無ければ落ちなしと報告する」へ倒した文面は落ちる（誤標識）。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の ${CHECK_ID} が .kiro/specs 不在で軸をスキップする（落ちなしと誤標識しない）`, () => {
      const row = catalogRow(lang, agent);
      assert.ok(row.includes(".kiro/specs"), `${lang}/${agent}: 実施条件が .kiro/specs の存在に依る`);
      const skip = lang === "ja" ? /軸をスキップ/ : /Skip the axis/i;
      assert.ok(skip.test(row), `${lang}/${agent}: 不在時は軸をスキップする明記`);
    });
  }
}

// ---- 6. SKILL.md（4系統）が独立 Step 3.17 として本軸を結線する（見出し順も保つ） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の SKILL が独立 Step 3.17 として ${CHECK_ID} を結線する`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(c.includes("### Step 3.17"), `${lang}/${agent}: Step 3.17 見出しがある`);
      assert.ok(c.includes(CHECK_ID), `${lang}/${agent}: SKILL 本文が ${CHECK_ID} を含む`);
      const i316 = c.indexOf("### Step 3.16");
      const i317 = c.indexOf("### Step 3.17");
      const i4 = c.indexOf("### Step 4");
      assert.ok(i316 > 0 && i316 < i317 && i317 < i4, `${lang}/${agent}: Step 3.16 → 3.17 → Step 4 の順`);
    });
  }
}

// ---- 7. SKILL.md（4系統）が .kiro/specs を read-only の突合相手としてのみ観測すると宣言する ----
// 判別性: 外部ツールの成果物を書き換える余地を残した文面（INV1 非言及）は落ちる。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`7: ${lang}/${agent} の SKILL が .kiro/specs を read-only 観測に限ると宣言する（INV1）`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(c.includes(".kiro/specs"), `${lang}/${agent}: SKILL が .kiro/specs を入力として名指す`);
      assert.ok(c.includes("INV1"), `${lang}/${agent}: 外部ツール成果物を書き換えない（INV1）の明記`);
    });
  }
}

// ---- 8. glossary 登録（dogfood のみ・配布 scaffold には検査軸を積まない） ----
test(`8: dogfood の .intent/glossary.md に ${CHECK_ID} が登録されている`, () => {
  const g = fs.readFileSync(path.join(REPO_ROOT, ".intent", "glossary.md"), "utf8");
  const row = g.split("\n").find((l) => l.trim().startsWith(`| ${CHECK_ID} |`));
  assert.ok(row, `dogfood glossary に ${CHECK_ID} の行がある`);
  assert.ok(row.includes("止めない") || row.includes("書き換えない"), "一行説明が read-only/no-gate に触れる");
});

test(`8(b): 配布 scaffold の glossary には検査軸（${CHECK_ID}）を積まない`, () => {
  for (const lang of LANGS) {
    const g = fs.readFileSync(path.join(TEMPLATES, lang, "intent", "glossary.md"), "utf8");
    assert.ok(
      !g.includes(CHECK_ID),
      `templates/${lang}/intent/glossary.md に検査軸を積まない（A38/A41/A42 と同じ方針）`,
    );
  }
});
