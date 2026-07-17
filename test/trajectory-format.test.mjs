// trajectory format (変遷ノート) 専用テスト (node:test 標準・依存ゼロ)。
// packet: pkt-20260708-thinking-trajectory-note-yhjy (C50 / A59 / DR117 / INV74)。
//
// 範囲: intent-release-note へ付加した trajectory format の規範文の判別オラクルを
//   READ-ONLY で検証する。存在・数・claude/codex byte 一致・ja/en 構造一致は
//   release-note.test.mjs (RULE_NAMES に format-trajectory を追加済み) が担うため、
//   本ファイルは「規範が落ちた/書き換わったら赤くなる」内容アンカーに絞る:
//     群A: format-select が trajectory の委譲行を持つ (値域に現れる)。
//     群B: format-trajectory.md が packet の判別オラクル対象の規範文を持つ
//          (.intent/ 履歴主体・コード diff を読まない=DR117 / 理由の記録なし明示=非捏造 /
//           時系列新しい順・束ねる / 出力先 trajectory.md 分離 / INV67 要約+識別子 /
//           履歴ゼロ fail-fast)。
//     群C: SKILL.md が trajectory を値域と出力先分岐に持つ。
//     群D: 既存4 format の rule に trajectory が混入していない (byte 不変の支え。
//          既存 format を書き換えて辻褄を合わせる実装を落とす)。
//     群E: dogfood (.claude / .agents) の rule が対応テンプレと byte 一致。
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

// ---- 群A: format-select の委譲行 (値域に trajectory が現れ、委譲先が実在 rule を指す) ----

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群A: ${lang}/${agent} format-select が trajectory の委譲行を持つ`, () => {
      const content = readRule(lang, agent, "format-select");
      assert.ok(content.includes("`trajectory`"), `${lang}/${agent}: 値域に trajectory がある`);
      assert.ok(
        content.includes("format-trajectory.md"),
        `${lang}/${agent}: 委譲先 format-trajectory.md を指す`,
      );
      // 委譲表の同一行に値域と委譲先が並ぶ（表を崩して散文で言及しただけの実装を落とす）
      assert.ok(
        /\|[^\n]*`trajectory`[^\n]*format-trajectory\.md[^\n]*\|/.test(content),
        `${lang}/${agent}: 委譲表の同一行に trajectory と format-trajectory.md が並ぶ`,
      );
    });
  }
}

// ---- 群B: format-trajectory.md の規範文アンカー (packet Validation の判別オラクル) ----
// アンカーは言語ごとに定義する。規範文が落ちる・言い換えで骨抜きになる実装を落とす。

const RULE_ANCHORS = {
  ja: [
    // 出力先分離 (既存 release-note.md を上書きして消さない)
    ".intent/release-note/trajectory.md",
    "全置換",
    // 素材: .intent/ 履歴主体・コード diff を読まない (DR117)
    "`.intent/` 配下",
    "アプリケーションコードの diff は読まない",
    "DR117",
    // Intent trailer は補助照合
    "Intent trailer",
    "補助照合",
    // 理由の非捏造 (履歴に無い理由を語らない)
    "理由の記録なし",
    "推測で物語化しない",
    // 人間向けの書きぶり (コミット羅列にしない・新しい順)
    "コミット羅列にしない",
    "新しい順",
    // 機密の線引き
    "要約+識別子",
    "INV67",
    // 履歴ゼロは fail-fast
    "fail-fast",
    // 紐づかない変更は薄い行
    "薄い行",
  ],
  en: [
    ".intent/release-note/trajectory.md",
    "full replacement",
    "under `.intent/`",
    "application-code diff",
    "DR117",
    "Intent trailer",
    "auxiliary matching",
    "no recorded reason",
    "never narrativize by guessing",
    "Not a commit listing",
    "newest first",
    "summary plus identifiers",
    "INV67",
    "fail-fast",
    "Thin lines",
  ],
};

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群B: ${lang}/${agent} format-trajectory.md が規範文アンカーを全て持つ`, () => {
      const content = readRule(lang, agent, "format-trajectory");
      for (const anchor of RULE_ANCHORS[lang]) {
        assert.ok(content.includes(anchor), `${lang}/${agent}: アンカー「${anchor}」がある`);
      }
    });
  }
}

// ---- 群C: SKILL.md が trajectory を値域 (Step 4) と出力先分岐 (Step 5) に持つ ----

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群C: ${lang}/${agent} SKILL.md が trajectory の値域と出力先分岐を持つ`, () => {
      const content = readSkill(lang, agent);
      assert.ok(content.includes("`trajectory`"), `${lang}/${agent}: SKILL に値域 trajectory がある`);
      assert.ok(
        content.includes(".intent/release-note/trajectory.md"),
        `${lang}/${agent}: SKILL に出力先 trajectory.md の分岐がある`,
      );
      assert.ok(
        content.includes("format-trajectory.md"),
        `${lang}/${agent}: SKILL が委譲先 rule を列挙している`,
      );
      // 非捏造規範が SKILL 側の出力説明からも落ちていない（rule 側だけの一点持ちにしない）
      const noReason = lang === "ja" ? "理由の記録なし" : "no recorded reason";
      assert.ok(
        content.includes(noReason),
        `${lang}/${agent}: SKILL の出力説明に「${noReason}」がある`,
      );
    });
  }
}

// ---- 群D: 既存4 format の rule に trajectory が混入していない (pure addition) ----
// trajectory の追加は pure addition であり、既存 format の出力構造 rule を書き換えて
// 辻褄を合わせる実装 (byte 不変破り) をキーワード混入で検出する。

const EXISTING_FORMATS = [
  "format-changelog",
  "format-github-releases",
  "format-changelog-customer",
  "format-pr-description",
];

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    for (const rule of EXISTING_FORMATS) {
      test(`群D: ${lang}/${agent} ${rule}.md に trajectory が混入していない`, () => {
        const content = readRule(lang, agent, rule);
        assert.ok(
          !content.includes("trajectory"),
          `${lang}/${agent}: 既存 format ${rule}.md は trajectory に言及しない (pure addition)`,
        );
      });
    }
  }
}

// ---- 群E: dogfood 同期 (.claude=ja/claude・.agents=ja/codex の rule byte 一致) ----

const DOGFOODS = [
  { dir: ".claude", tplLang: "ja", tplAgent: "claude" },
  { dir: ".agents", tplLang: "ja", tplAgent: "codex" },
];

for (const { dir, tplLang, tplAgent } of DOGFOODS) {
  test(`群E: ${dir}/skills の format-trajectory.md / format-select.md が ${tplLang}/${tplAgent} と byte 一致`, () => {
    for (const rule of ["format-trajectory", "format-select"]) {
      const tpl = fs.readFileSync(
        path.join(skillDir(tplLang, tplAgent), "rules", `${rule}.md`),
      );
      const dogfood = fs.readFileSync(
        path.join(REPO_ROOT, dir, "skills", SKILL, "rules", `${rule}.md`),
      );
      assert.ok(tpl.equals(dogfood), `${dir} ${rule}.md が ${tplLang}/${tplAgent} テンプレと byte 一致`);
    }
  });
}
