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
  {
    // 質問束の直前つなぎ本文（INV86）。アンカーは規律の実質（直前の回答への具体的な受け止め＋
    // 次の問いの理由）を突く語に絞る — 見出し・固定句だけの表面マーカー照合にしない。
    name: "question-lead-in（質問束の直前つなぎ本文・A69/INV86）",
    anchors: {
      ja: ["直前の回答への具体的な受け止め", "次の問いの理由"],
      en: ["acknowledgment of the previous answers", "reason for the next question"],
    },
  },
  {
    // 利用者の確定範囲（INV97・C68）。アンカーは実質を突く2点 — 短い承認を製品判断へ広げない／
    // 否定的反応は症状として受け取り原因・解決策と分ける。拘束力を落とす書き換えで落ちる。
    name: "confirmation-scope（利用者が確定したのは言った範囲まで・INV97）",
    anchors: {
      ja: ["利用者が言った範囲まで", "症状だけの確認を、原因・解決策の確定として記録しない"],
      en: ["only what the user actually said", "as if the cause or the solution had been settled"],
    },
  },
  {
    // 診断バイアス防止（DR185・Anti-534/535/536）＋ 上位再診断への脱出（INV99）。
    // アンカーは4つの実質 — 上位再診断へ戻る／閾値自体を疑う／過去の解釈を検証する／非対称を手がかりにする。
    name: "diagnosis-bias-guard（原因の層を取り違えていないか疑う・DR185/INV99）",
    anchors: {
      ja: [
        "再評価を拒む理由にしない",
        "この閾値・この検査自体が間違っている",
        "同じ壁に2度ぶつかったら、壁ではなく地図を疑う",
        "原因を指す手がかりとして診断の起点にする",
      ],
      en: [
        "reason to refuse re-evaluation",
        "this threshold, or this check itself, is wrong",
        "doubt the map, not the wall",
        "strongest pointer to where the cause lives",
      ],
    },
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

// ---- 2. dogfood（repo 直下 CLAUDE_intent.md / AGENTS.md）が ja の template と同期している ----
// dogfood は配布対象でなく自リポ適用結果。parent が同期したことを存在で確認する。
// AGENTS.md（codex 適用結果）も現に会話規律を持つので同じ射程で検査する — 片方だけ検査から漏れると、
// そこだけ規律が消えても green のまま通る（非対称は穴の在り処を指す・2026-07-15 に塞いだ）。
for (const rel of ["CLAUDE_intent.md", "AGENTS.md"]) {
  test(`2: dogfood repo 直下 ${rel} が全規律のアンカー語を含む`, () => {
    const dogfood = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(dogfood)) return; // 環境により未配置でも green
    const text = fs.readFileSync(dogfood, "utf8");
    for (const rule of RULES) {
      for (const anchor of rule.anchors.ja) {
        assert.ok(text.includes(anchor), `dogfood ${rel}: 「${rule.name}」のアンカー語「${anchor}」を含む`);
      }
    }
  });
}
