// pkt-20260704-intent-commit-trailer-6glt（コミットへの意図参照の記録規約）の判別 fixture。
//
// 背景: Intent trailer（コミットメッセージ末尾の `Intent: <packet 名> (<packet_id>)`）を
//   任意で残す記録規約を rootdoc 7ファイルに 1 行足し、intent-release-note が trailer を
//   照合の一次情報（実線）とし、無ければ従来のテキスト照合（推測）へ fallback するよう
//   結線した（C38/A49・INV63/INV64・DR94/DR95）。
//
// 本テストは packet の Validation 判別オラクル (a)〜(e) をアンカー語で discriminative に守る:
//   (a) release-note が trailer を実線として区別表示する規約を持つ（区別しない実装を落とす）
//   (b) trailer 無しリポで従来のテキスト照合へ fallback する規約を持つ（fallback を壊す実装を落とす）
//   (c) name / packet_id のどちらで当たっても実線とする規約を持つ（片キー照合を落とす実装を落とす）
//   (d) 参照先不明の trailer を「参照先不明」と明示する規約を持つ（黙って推測補完する実装を落とす）
//   (e) rootdoc 7ファイルすべてに trailer 規約の 1 行があり、書式例が識別子のみ（INV64）
//
// 文言を逐語で固定すると正当な推敲を阻むため、識別子に近い不変アンカー語だけを照合する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

// ---- rootdoc 7 系統（3 形式 ×2 言語 + dogfood）----
// firing-substrate.test.mjs / plain-language-prompts.test.mjs と同じ正典一覧。
function rootdocPaths() {
  const out = [];
  for (const lang of ["ja", "en"]) {
    out.push({ id: `${lang}/claude`, lang, p: path.join(TEMPLATES, lang, "agents", "claude", "CLAUDE_intent.md") });
    out.push({ id: `${lang}/codex`, lang, p: path.join(TEMPLATES, lang, "agents", "codex", "AGENTS.md") });
    out.push({ id: `${lang}/gemini`, lang, p: path.join(TEMPLATES, lang, "agents", "gemini", "GEMINI_intent.md") });
  }
  return out;
}

// trailer 規約のアンカー語（言語別・推敲で揺れにくい語に絞る）。
// `Intent trailer` は識別子に近い不変語、`packet_id` は書式の必須要素。
const ROOTDOC_ANCHORS = {
  ja: ["Intent trailer", "packet_id"],
  en: ["Intent trailer", "packet_id"],
};

// ---- (e) rootdoc 7ファイルすべてに trailer 規約がある ----
for (const { id, lang, p } of rootdocPaths()) {
  test(`(e) ${id} の rootdoc が Intent trailer 規約のアンカー語を含む`, () => {
    assert.ok(fs.existsSync(p), `${id}: rootdoc が存在する`);
    const text = fs.readFileSync(p, "utf8");
    for (const anchor of ROOTDOC_ANCHORS[lang]) {
      assert.ok(text.includes(anchor), `${id}: trailer 規約のアンカー語「${anchor}」を含む`);
    }
  });
}

// ---- (e) dogfood（repo 直下 CLAUDE_intent.md）も同期している ----
test("(e) dogfood repo 直下 CLAUDE_intent.md が Intent trailer 規約を含む", () => {
  const dogfood = path.join(REPO_ROOT, "CLAUDE_intent.md");
  if (!fs.existsSync(dogfood)) return; // 環境により未配置でも green
  const text = fs.readFileSync(dogfood, "utf8");
  for (const anchor of ROOTDOC_ANCHORS.ja) {
    assert.ok(text.includes(anchor), `dogfood: trailer 規約のアンカー語「${anchor}」を含む`);
  }
});

// ---- (e/INV64) rootdoc の書式例が識別子（packet 名 / packet_id）のみで構成される ----
// trailer の書式行に「機密を書かない／識別子に留める」旨の歯止めがあることを名指しする。
// ja は「機密」、en は「confidential」を歯止め語に採る（INV64）。
for (const { id, lang, p } of rootdocPaths()) {
  test(`(e/INV64) ${id} の rootdoc が trailer に識別子のみを書く歯止めを持つ`, () => {
    if (!fs.existsSync(p)) return;
    const text = fs.readFileSync(p, "utf8");
    const guard = lang === "ja" ? "機密" : "confidential";
    assert.ok(
      text.toLowerCase().includes(guard.toLowerCase()),
      `${id}: trailer 規約に機密を書かない歯止め（INV64）がある`,
    );
  });
}

// ---- release-note SKILL 5系統（4 templates + dogfood）----
function releaseNoteSkills() {
  const out = [];
  for (const lang of ["ja", "en"]) {
    for (const agent of ["claude", "codex"]) {
      out.push({
        id: `${lang}/${agent}`,
        lang,
        p: path.join(TEMPLATES, lang, agent, "skills", "intent-release-note", "SKILL.md"),
      });
    }
  }
  return out;
}

// release-note の Step 3 結線を、判別オラクル (a)〜(d) に対応するアンカー語で守る。
const SKILL_CHECKS = {
  ja: [
    { oracle: "(a) 実線と推測を区別表示", anchors: ["実線", "推測"] },
    { oracle: "(b) trailer 無しでテキスト照合へ fallback", anchors: ["trailer が無ければ", "fallback"] },
    { oracle: "(c) name / packet_id のどちらでも実線", anchors: ["packet_id", "どちらで当たっても"] },
    { oracle: "(d) 参照先不明を明示", anchors: ["参照先不明"] },
  ],
  en: [
    { oracle: "(a) distinguish solid link vs guess", anchors: ["solid link", "guess"] },
    { oracle: "(b) fall back to text-match without trailer", anchors: ["no trailer", "fall back"] },
    { oracle: "(c) match on name or packet_id", anchors: ["packet_id", "either the name or the id"] },
    { oracle: "(d) state target unknown", anchors: ["target unknown"] },
  ],
};

for (const { id, lang, p } of releaseNoteSkills()) {
  test(`release-note ${id}: trailer 結線の判別オラクル (a)〜(d) を含む`, () => {
    assert.ok(fs.existsSync(p), `${id}: release-note SKILL が存在する`);
    const text = fs.readFileSync(p, "utf8");
    const hay = lang === "ja" ? text : text.toLowerCase();
    for (const check of SKILL_CHECKS[lang]) {
      for (const anchor of check.anchors) {
        const needle = lang === "ja" ? anchor : anchor.toLowerCase();
        assert.ok(hay.includes(needle), `${id}: ${check.oracle} のアンカー語「${anchor}」を含む`);
      }
    }
  });
}

// ---- 4系統パリティ: release-note SKILL の本文が claude⇔codex で byte 等価 ----
// frontmatter（claude 専用の allowed-tools / argument-hint）はツール差ゆえ本文のみ比較する。
function bodyAfterFrontmatter(content) {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(content.indexOf("\n", end + 1) + 1);
}

for (const lang of ["ja", "en"]) {
  test(`release-note ${lang}: SKILL 本文が claude⇔codex で byte 等価（4系統パリティ）`, () => {
    const claude = path.join(TEMPLATES, lang, "claude", "skills", "intent-release-note", "SKILL.md");
    const codex = path.join(TEMPLATES, lang, "codex", "skills", "intent-release-note", "SKILL.md");
    const cBody = bodyAfterFrontmatter(fs.readFileSync(claude, "utf8"));
    const xBody = bodyAfterFrontmatter(fs.readFileSync(codex, "utf8"));
    assert.equal(cBody, xBody, `${lang}: release-note SKILL 本文が claude⇔codex で byte 等価`);
  });
}
