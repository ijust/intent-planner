// decision-probe（意図版 Self-Probing・A30 packets 側）の不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: decision-probe.md は packets スキル（agent 向け指示文書）の rule であり実行体ではない。
//   ゆえに「絞り込みゲート（発火 load-bearing 絞り × 問いの証拠裏付け絞り）・3段（Self-Probing/証拠
//   pull/支援ビュー）・反証第一・read-only/warn-only・コールドスタート時スキップ・A29 と軸分離」を
//   rule と SKILL がそれぞれ明文化していることをテキスト検査で固定する（db-design-inspect-oracle と同型）。
//
// 注: rule（decision-probe.md）は claude/codex で byte 同一（agent-rules-parity が別途固定）。
//   ここでは内容アンカーを4系統で名指し検査し、削除・ドリフトを回帰として落とす（discriminative oracle）。
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

function rulePath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-packets", "rules", "decision-probe.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-packets", "SKILL.md");
}

// ---- 1. rule が4系統すべてに存在する ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1: ${lang}/${agent} に decision-probe.md が存在する（4系統配置）`, () => {
      assert.ok(fs.existsSync(rulePath(lang, agent)), `${rulePath(lang, agent)} が実在する`);
    });
  }
}

// ---- 2. 絞り込みゲートの二重の絞り（発火 load-bearing 絞り × 問いの証拠裏付け絞り）が定義される ----
// 効く/効かないを分ける支配的変数（DR61）。この2軸の削除を回帰として落とす。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2: ${lang}/${agent} の rule が絞り込みゲート（発火 load-bearing 絞り × 問いの証拠裏付け絞り）を定義する`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      // (i) 発火地点を load-bearing に絞る。
      assert.ok(c.includes("load-bearing"), `${lang}/${agent}: 発火を load-bearing な決定に絞る`);
      assert.ok(
        c.includes("常時") || lower.includes("every decision") || lower.includes("do not probe at every"),
        `${lang}/${agent}: 全決定・常時 probe を避ける旨に触れる`,
      );
      // (ii) 問いを .intent/ に証拠が実在するものに絞る。
      assert.ok(c.includes(".intent/"), `${lang}/${agent}: 証拠源は .intent/（台帳）`);
      assert.ok(
        /証拠が実在|証拠.*辿れ|evidence.*exist|evidence.*can be (pulled|traced)/i.test(c),
        `${lang}/${agent}: 問いを「.intent/ に証拠が実在するもの」に絞る`,
      );
    });
  }
}

// ---- 3. 3段（Self-Probing / 証拠 pull / 支援ビュー）と pull 規律が定義される ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3: ${lang}/${agent} の rule が3段（仮説と問いの言語化 / 証拠 pull / 支援ビュー）+ pull 規律を定義する`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        c.includes("仮説") || lower.includes("hypothesis") || lower.includes("confirmed pattern"),
        `${lang}/${agent}: 仮説（暫定の確信）の言語化`,
      );
      assert.ok(
        c.includes("問い") || lower.includes("question"),
        `${lang}/${agent}: 問い（open question）の言語化`,
      );
      assert.ok(
        c.includes("pull") || c.includes("証拠を引") || lower.includes("pull"),
        `${lang}/${agent}: 問いを起点に証拠を pull する`,
      );
      // pull 規律（全ロードしない）を守る。
      assert.ok(
        /全.*ロード.*ない|全ロードしない|do not load everything|whole compass/i.test(c),
        `${lang}/${agent}: pull 規律（全ロードしない）を守る`,
      );
    });
  }
}

// ---- 4. 反証を第一に（追認装置にしない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の rule が反証を第一に名指しする（追認装置にしない）`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        c.includes("反証") || lower.includes("refut") || lower.includes("contradic"),
        `${lang}/${agent}: 確信と矛盾する証拠（反証）に言及する`,
      );
      assert.ok(
        c.includes("追認") || lower.includes("rubber-stamp") || lower.includes("corroborat"),
        `${lang}/${agent}: 確信の追認だけに使わない（追認装置にしない）`,
      );
    });
  }
}

// ---- 5. read-only・warn-only・canonical 自動改変なしの不変条件 ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の rule が read-only・warn-only・canonical 自動改変なしを明記する`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(c.includes("warn-only"), `${lang}/${agent}: warn-only（gate でない・止めない）`);
      assert.ok(
        c.includes("read-only") || c.includes("読み取り") || lower.includes("read only"),
        `${lang}/${agent}: read-only`,
      );
      assert.ok(
        /自動.*改変.*ない|自動では?書き換え.*ない|auto-?modif|auto-?reflect/i.test(c),
        `${lang}/${agent}: canonical を自動改変しない`,
      );
      assert.ok(
        c.includes("A7") || c.includes("INV5") || c.includes("INV37"),
        `${lang}/${agent}: read-only 堰の根拠（A7/INV5/INV37）を参照する`,
      );
    });
  }
}

// ---- 6. コールドスタート（証拠 pool が空）でスキップ ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の rule が証拠 pool 空（コールドスタート）でスキップを定義する`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        /pool.*空|空.*pool|evidence pool.*empty|empty/i.test(c),
        `${lang}/${agent}: 証拠 pool が空のときに言及する`,
      );
      assert.ok(
        c.includes("スキップ") || lower.includes("skip"),
        `${lang}/${agent}: 証拠 pool 空のとき probe をスキップする`,
      );
    });
  }
}

// ---- 7. A29(corrective-intent) と軸を分ける（仮説の証拠検証 vs 結論の根拠保存） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`7: ${lang}/${agent} の rule が A29(corrective-intent) と軸を分ける`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const lower = c.toLowerCase();
      assert.ok(
        c.includes("A29") || lower.includes("corrective-intent"),
        `${lang}/${agent}: A29(corrective-intent) との関係に触れる`,
      );
      assert.ok(
        c.includes("rationale") || c.includes("根拠"),
        `${lang}/${agent}: 結論の根拠（rationale）保存との対比を述べる`,
      );
    });
  }
}

// ---- 8. SKILL.md（5系統）が Step 3 で decision-probe を結線する ----
const SKILL_LANGS_AGENTS = [
  ["ja", "claude"], ["ja", "codex"], ["en", "claude"], ["en", "codex"],
];
for (const [lang, agent] of SKILL_LANGS_AGENTS) {
  test(`8: ${lang}/${agent} の SKILL が Step 3 で decision-probe を結線する`, () => {
    const c = fs.readFileSync(skillPath(lang, agent), "utf8");
    assert.ok(c.includes("decision-probe"), `${lang}/${agent}: SKILL が decision-probe rule を参照する`);
    assert.ok(c.includes("load-bearing"), `${lang}/${agent}: SKILL 側にも load-bearing 絞りが明記される`);
    assert.ok(
      c.includes("warn-only") || c.includes("停止しない") || /warn-only|does not stop|do not stop/i.test(c),
      `${lang}/${agent}: SKILL 側にも warn-only（候補提示まで）が明記される`,
    );
  });
}

// ---- 9. dogfood（.claude）にも rule が配置され SKILL が結線される（parent 同期） ----
test("9: dogfood .claude に decision-probe.md が配置され SKILL が結線される", () => {
  const dogfoodRule = path.join(REPO_ROOT, ".claude", "skills", "intent-packets", "rules", "decision-probe.md");
  const dogfoodSkill = path.join(REPO_ROOT, ".claude", "skills", "intent-packets", "SKILL.md");
  assert.ok(fs.existsSync(dogfoodRule), "dogfood に decision-probe.md が配置される");
  // dogfood rule は ja/claude と byte 同一（共有 rule）。
  const ja = fs.readFileSync(rulePath("ja", "claude"), "utf8");
  assert.equal(fs.readFileSync(dogfoodRule, "utf8"), ja, "dogfood rule は ja/claude と byte 同一");
  assert.ok(
    fs.readFileSync(dogfoodSkill, "utf8").includes("decision-probe"),
    "dogfood SKILL が decision-probe を結線する",
  );
});
