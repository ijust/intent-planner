// pr-description format (PR 説明の下書き) 専用テスト (node:test 標準・依存ゼロ)。
// packet: pkt-20260706-pr-description-format-vazb (A55 / C41 / DR101 / INV67)。
//
// 範囲: intent-release-note へ付加した pr-description format の規範文の判別オラクルを
//   READ-ONLY で検証する。存在・数・claude/codex byte 一致・ja/en 構造一致は
//   release-note.test.mjs (RULE_NAMES に format-pr-description を追加済み) が担うため、
//   本ファイルは「規範が落ちた/書き換わったら赤くなる」内容アンカーに絞る:
//     群A: format-select が pr-description の委譲行を持つ (値域に現れる)。
//     群B: format-pr-description.md が packet の判別オラクル対象の規範文を持つ
//          (INV67 要約+識別子・転記禁止 / 薄い行 / 薄い下書き=エラーにしない /
//           目印1行 / gh を呼ばない / 4部構成 / 出力先 pr-description.md 分離)。
//     群C: gh への言及が禁止文脈に限る (外部書き込みゼロの判別・release-note 群6 と同型)。
//     群D: SKILL.md が pr-description を値域と出力先分岐に持つ。
//     群E: 既存3 format の rule に pr-description が混入していない (byte 不変の支え。
//          既存 format を書き換えて辻褄を合わせる実装=Anti-direction 334 を落とす)。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];
const SKILL = "intent-release-note";

function skillDir(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", SKILL);
}
function readRule(lang, agent, rule) {
  return fs.readFileSync(path.join(skillDir(lang, agent), "rules", `${rule}.md`), "utf8");
}
function readSkill(lang, agent) {
  return fs.readFileSync(path.join(skillDir(lang, agent), "SKILL.md"), "utf8");
}

// ---- 群A: format-select の委譲行 (値域に pr-description が現れ、委譲先が実在 rule を指す) ----

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群A: ${lang}/${agent} format-select が pr-description の委譲行を持つ`, () => {
      const content = readRule(lang, agent, "format-select");
      assert.ok(content.includes("`pr-description`"), `${lang}/${agent}: 値域に pr-description がある`);
      assert.ok(
        content.includes("format-pr-description.md"),
        `${lang}/${agent}: 委譲先 format-pr-description.md を指す`,
      );
    });
  }
}

// ---- 群B: format-pr-description.md の規範文アンカー (packet Validation の判別オラクル) ----
// アンカーは言語ごとに定義する。規範文が落ちる・言い換えで骨抜きになる実装を落とす。

const RULE_ANCHORS = {
  ja: [
    // 出力先分離 (既存 release-note.md を上書きして消さない)
    ".intent/release-note/pr-description.md",
    // INV67: 要約+識別子まで・本文転記禁止
    "要約+識別子",
    "INV67",
    "転記しない",
    // 紐づかないコミットは薄い行 (推測で埋めない)
    "薄い行",
    // trailer ゼロ = 薄い下書き・エラーにしない
    "薄い下書き",
    "エラーにしない",
    // 外部書き込みゼロ
    "gh を呼ばない",
    // 末尾のツール目印は1行だけ
    "1行だけ",
    // 4部構成の見出し
    "意図の要約",
    "関係する判断基準",
    "レビューの見どころ",
    "コミット↔意図の対応一覧",
  ],
  en: [
    ".intent/release-note/pr-description.md",
    "summary plus identifiers",
    "INV67",
    "transcribe",
    "thin line",
    "thin draft",
    "not an error",
    "invoke gh",
    "one line",
    "Intent summary",
    "Relevant decision criteria",
    "Review focus",
    "Commit-to-intent mapping",
  ],
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群B: ${lang}/${agent} format-pr-description.md が規範文アンカーを全て持つ`, () => {
      const content = readRule(lang, agent, "format-pr-description");
      for (const anchor of RULE_ANCHORS[lang]) {
        assert.ok(content.includes(anchor), `${lang}/${agent}: アンカー「${anchor}」がある`);
      }
    });
  }
}

// ---- 群C: gh への言及は禁止文脈に限る (外部書き込みゼロの判別) ----
// "gh pr create" 等の書き込み系 gh コマンド名を含む行は、禁止文脈語 (呼ばない / never / no `gh)
// を同一行に持たねばならない (裸の実行記述として現れたら落とす)。release-note.test.mjs 群6 と同型。

const GH_WRITE_MENTION = /gh pr create|gh issue create|gh api/i;
const GH_FORBID_CONTEXT = /呼ばない|書き込みを一切しない|never|no `gh/i;

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群C: ${lang}/${agent} format-pr-description.md の gh 言及が禁止文脈に限る`, () => {
      const lines = readRule(lang, agent, "format-pr-description").split(/\r?\n/);
      let mentions = 0;
      for (const line of lines) {
        if (!GH_WRITE_MENTION.test(line)) continue;
        mentions++;
        assert.ok(
          GH_FORBID_CONTEXT.test(line),
          `${lang}/${agent}: gh 書き込み系を含む行が禁止文脈にある: 「${line.trim()}」`,
        );
      }
      // 禁止の明示そのものは存在する (言及ゼロ = 禁止規範が消えた実装も落とす)。
      assert.ok(mentions > 0, `${lang}/${agent}: gh 書き込み禁止の明示が存在する`);
    });
  }
}

// ---- 群D: SKILL.md が pr-description を値域 (Step 4) と出力先分岐 (Step 5) に持つ ----

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群D: ${lang}/${agent} SKILL.md が pr-description の値域と出力先分岐を持つ`, () => {
      const content = readSkill(lang, agent);
      assert.ok(content.includes("`pr-description`"), `${lang}/${agent}: SKILL に値域 pr-description がある`);
      assert.ok(
        content.includes(".intent/release-note/pr-description.md"),
        `${lang}/${agent}: SKILL に出力先 pr-description.md の分岐がある`,
      );
      assert.ok(
        content.includes("format-pr-description.md"),
        `${lang}/${agent}: SKILL が委譲先 rule を列挙している`,
      );
    });
  }
}

// ---- 群E: 既存3 format の rule に pr-description が混入していない (Anti-direction 334) ----
// pr-description の追加は pure addition であり、既存 format の出力構造 rule を書き換えて
// 辻褄を合わせる実装 (byte 不変破り) をキーワード混入で検出する。

const EXISTING_FORMATS = ["format-changelog", "format-github-releases", "format-changelog-customer"];

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    for (const rule of EXISTING_FORMATS) {
      test(`群E: ${lang}/${agent} ${rule}.md に pr-description が混入していない`, () => {
        const content = readRule(lang, agent, rule);
        assert.ok(
          !content.includes("pr-description"),
          `${lang}/${agent}: 既存 format ${rule}.md は pr-description に言及しない (pure addition)`,
        );
      });
    }
  }
}

// ---- dogfood 同期: .claude/skills の rule が ja/claude テンプレと byte 一致 ----

test("dogfood: .claude/skills の format-pr-description.md / format-select.md が ja/claude と byte 一致", () => {
  for (const rule of ["format-pr-description", "format-select"]) {
    const tpl = fs.readFileSync(
      path.join(skillDir("ja", "claude"), "rules", `${rule}.md`),
    );
    const dogfood = fs.readFileSync(
      path.join(REPO_ROOT, ".claude", "skills", SKILL, "rules", `${rule}.md`),
    );
    assert.ok(tpl.equals(dogfood), `dogfood ${rule}.md が ja/claude テンプレと byte 一致`);
  }
});
