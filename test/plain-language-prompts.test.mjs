// rootdoc 4系統に足した「ユーザーと接する会話の振る舞い」2 規律の存在・系統間パリティを守る回帰テスト。
//
// 背景: A33 plain-language-discipline（7492c482）と A31 派生物ズレ非衝突視（64dd64c2）は、配布される
//   rootdoc を 3 形式 ×2 言語 = 6 ファイル（claude=CLAUDE_intent.md / codex=AGENTS.md / gemini=GEMINI_intent.md）
//   ＋ dogfood の repo 直下 CLAUDE_intent.md へ同趣旨の 1 行を足した。これらは behavioral prompt なので
//   install/append 機構テスト（shared-rootdoc-append / root-doc-onboarding）の射程外で、追加文言が誤って
//   1 系統から消えても・系統間でズレても全テスト green のまま漏れる（監査で指摘された穴）。
//   ここでは「2 規律のアンカー語が 6 系統すべてに存在する」を discriminative に名指しし、欠落・ドリフトを
//   回帰として落とす。文言を逐語で固定すると正当な推敲を阻むため、識別子に近い不変アンカー語だけを照合する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

// 配布される rootdoc 6 系統（3 形式 ×2 言語）。形式ごとにファイル名が異なる。
function rootdocPaths() {
  const out = [];
  for (const lang of ["ja", "en"]) {
    out.push({ id: `${lang}/claude`, p: path.join(TEMPLATES, lang, "agents", "claude", "CLAUDE_intent.md") });
    out.push({ id: `${lang}/codex`, p: path.join(TEMPLATES, lang, "agents", "codex", "AGENTS.md") });
    out.push({ id: `${lang}/gemini`, p: path.join(TEMPLATES, lang, "agents", "gemini", "GEMINI_intent.md") });
  }
  return out;
}

// 各規律を「言語別の不変アンカー語の集合」で同定する。推敲で揺れにくい語に絞る。
const RULES = [
  {
    name: "plain-language（普通の言葉で話す・A33）",
    anchors: { ja: ["普通の言葉", "識別子"], en: ["plain language", "identifier"] },
  },
  {
    name: "derived-not-conflict（派生物のズレを衝突視しない・A31）",
    anchors: { ja: ["派生物", "再生成", "正本"], en: ["derived", "regenerat", "source of truth"] },
  },
];

// ---- 1. 6 系統すべてが、両規律のアンカー語をすべて含む（欠落・系統間ズレを落とす） ----
for (const rule of RULES) {
  for (const { id, p } of rootdocPaths()) {
    const lang = id.split("/")[0];
    test(`1: ${id} の rootdoc が「${rule.name}」のアンカー語をすべて含む`, () => {
      assert.ok(fs.existsSync(p), `${id}: rootdoc が存在する`);
      const text = fs.readFileSync(p, "utf8");
      const hay = lang === "ja" ? text : text.toLowerCase();
      for (const anchor of rule.anchors[lang]) {
        const needle = lang === "ja" ? anchor : anchor.toLowerCase();
        assert.ok(
          hay.includes(needle),
          `${id}: 「${rule.name}」のアンカー語「${anchor}」を含む（系統間パリティ）`,
        );
      }
    });
  }
}

// ---- 2. dogfood（repo 直下 CLAUDE_intent.md）が ja/claude と同期している ----
// dogfood は配布対象でなく自リポ適用結果。parent が同期したことを存在で確認する。
test("2: dogfood repo 直下 CLAUDE_intent.md が両規律のアンカー語を含む", () => {
  const dogfood = path.join(REPO_ROOT, "CLAUDE_intent.md");
  if (!fs.existsSync(dogfood)) return; // 環境により未配置でも green
  const text = fs.readFileSync(dogfood, "utf8");
  for (const rule of RULES) {
    for (const anchor of rule.anchors.ja) {
      assert.ok(text.includes(anchor), `dogfood: 「${rule.name}」のアンカー語「${anchor}」を含む`);
    }
  }
});
