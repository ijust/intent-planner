// dialogue-precision（ユーザーへ向く文章の正確さ原則・C88-C90/INV107/DR213/DR214）の判別テスト
//   （node:test 標準・依存ゼロ）。packet: pkt-20260717-正確さ原則の敷設と会話層の骨格-1tl4
//
// 背景: 既存の平易さ規律群は「通じるか」軸で、比喩単独・基準のない曖昧語という「書き方」を見る
//   項目が無かった（局所解の再演・2026-07-17 利用者指摘）。rootdoc の出力直前点検へ第5項目と
//   「土台は正確さ」の原則文を追加した（DR213: 平易さは正確さを保ったままの手段・呼び名は改名しない）。
//
// ここで落とす誤実装（discriminative oracle）:
//   - 第5項目の番号だけ足して実質（言い直し併記・確立用語を無理に開かない）が無い
//   - 原則文（正確さが土台・意味を粗くしない）が無い、または一部の系統だけ更新（片肺）
//   - 全系統を一様に弱める書き換え（凍結文字列との逐語照合で落とす＝
//     parity-check-alone-misses-uniform-weakening）
//   - 既存の (1)〜(4) を置換・削除する（追加であって置換でない）
//   - 新記号（INV107 等）の短名台帳（symbol-labels.json）の追記漏れ
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(REPO_ROOT, p), "utf8");

const JA_ROOTDOCS = [
  "CLAUDE_intent.md",
  "AGENTS.md",
  "templates/ja/agents/claude/CLAUDE_intent.md",
  "templates/ja/agents/codex/AGENTS.md",
  "templates/ja/agents/gemini/GEMINI_intent.md",
];
const EN_ROOTDOCS = [
  "templates/en/agents/claude/CLAUDE_intent.md",
  "templates/en/agents/codex/AGENTS.md",
  "templates/en/agents/gemini/GEMINI_intent.md",
];

// ---- 凍結文字列（frozen snapshot）。全系統がこの逐語を含む＝一様な弱体化・片肺更新の両方を落とす。
//      文言を推敲するときは、この期待値とrootdoc を同じ変更で更新する（contract-wording-is-test-guarded-verbatim）。
const JA_PRINCIPLE =
  "土台は正確さ: 意味が一意に読める正確な記述で書き、平易さは正確さを保ったまま易しく書くための手段とする（易しさのために意味を粗くしない）。";
const JA_CHECK5 =
  "(5) 比喩や、基準のない曖昧な言い方（「かなり」「うまく」等）だけで意味を渡していないか（比喩を使うなら直後に正確な言い直しを必ず併記する。逆に、確立された専門用語・世間の意味のままの一般語を無理に普通の言葉へ開かない＝かえって曖昧になる）。";
const EN_PRINCIPLE =
  "The foundation is precision: write so the meaning reads unambiguously; plain language is a means of staying easy to read while preserving that precision (never coarsen the meaning for the sake of easiness).";
const EN_CHECK5 =
  '(5) Are you conveying meaning only through a metaphor or an ungrounded vague qualifier (e.g. "significantly", "nicely")? (If you use a metaphor, always pair it immediately with a precise restatement. Conversely, do not force established technical terms or ordinary words in their everyday sense into strained plain-word paraphrases — that makes things more ambiguous.)';

test("ja rootdoc 全系統に原則文と第5項目が逐語で存在する", () => {
  for (const f of JA_ROOTDOCS) {
    const t = read(f);
    assert.ok(t.includes(JA_PRINCIPLE), `${f}: 原則文（土台は正確さ）が無い/改変されている`);
    assert.ok(t.includes(JA_CHECK5), `${f}: 第5項目が無い/改変されている`);
  }
});

test("en rootdoc 全系統に原則文と第5項目が逐語で存在する", () => {
  for (const f of EN_ROOTDOCS) {
    const t = read(f);
    assert.ok(t.includes(EN_PRINCIPLE), `${f}: principle sentence missing/altered`);
    assert.ok(t.includes(EN_CHECK5), `${f}: 5th check missing/altered`);
  }
});

test("既存の点検 (1)〜(4) は残っている（追加であって置換でない）", () => {
  for (const f of JA_ROOTDOCS) {
    const t = read(f);
    for (const s of [
      "それ単体で読み手に意味が通るか",
      "初出の言い換えを省いていないか",
      "語彙をそのまま転写していないか",
      "(4) 字面が普通の言葉",
    ]) {
      assert.ok(t.includes(s), `${f}: 既存の点検項目が消えている: ${s}`);
    }
  }
  for (const f of EN_ROOTDOCS) {
    const t = read(f);
    assert.ok(t.includes("(4) Even when a word looks ordinary"), `${f}: existing 4th check lost`);
  }
});

// ---- フィクスチャ（実例由来・赤/緑の正解つき）と点検の対応
test("判別フィクスチャが実在し、赤/緑の正解が第5項目の実質と対応する", () => {
  const fx = read("test/fixtures/dialogue-precision/dialogue.md");
  const rows = fx.split("\n").filter((l) => /^\| \d+ \|/.test(l));
  assert.ok(rows.length >= 6, `例文が少なすぎる: ${rows.length}`);
  const red = rows.filter((l) => l.includes("赤（書き直し）"));
  const green = rows.filter((l) => l.includes("緑（そのまま出せる）"));
  assert.ok(red.length >= 3 && green.length >= 3, `赤${red.length}/緑${green.length}: 対の正解が欠けている`);

  // 赤の3類型（程度語だけ・比喩単独・確立用語の過剰言い換え）が実例として揃い、
  // それぞれの規範が rootdoc の第5項目に規定されている（フィクスチャと点検が同じ判定を規定する）
  const typeToNorm = [
    [/基準のない程度語|程度語/, "基準のない曖昧な言い方"],
    [/比喩単独/, "直後に正確な言い直しを必ず併記"],
    [/確立された専門用語/, "無理に普通の言葉へ開かない"],
  ];
  const rootdoc = read("CLAUDE_intent.md");
  for (const [redType, norm] of typeToNorm) {
    assert.ok(red.some((l) => redType.test(l)), `赤の実例に類型が無い: ${redType}`);
    assert.ok(rootdoc.includes(norm), `rootdoc の第5項目に規範が無い: ${norm}`);
  }
  // 緑側: 比喩＋言い直し併記の合格例（比喩自体は禁止しない）が固定されている
  assert.ok(
    green.some((l) => l.includes("言い直しが併記")),
    "緑の実例に「比喩＋言い直し併記」の合格例が無い"
  );
});

// ---- packet xeom: 問い・報告の点検ブロックの第5項目（凍結文字列・代表宿主で逐語照合） ----
//      宿主間の byte 同一は plainness-injection / report-plainness テストが所有するため、
//      ここでは代表宿主（ja/claude・en/claude）に凍結文字列が在ることを固定する（一様弱体化を落とす）。
const JA_Q5 =
  "5. **比喩や曖昧な言い方だけで意味を渡していないか**: 土台は正確さ（意味が一意に読める記述。平易さはそれを保ったまま易しく書く手段）。基準のない曖昧な言い方（「かなり」「うまく」等）や比喩単独で意味を渡さない。比喩を使うなら直後に正確な言い直しを必ず併記する（確立された専門用語・世間の意味のままの一般語は無理に普通の言葉へ開かない＝かえって曖昧になる）。";
const EN_Q5 =
  '5. **Are you conveying meaning only through a metaphor or a vague qualifier?** The foundation is precision: write so the meaning reads unambiguously (plain language is a means of staying easy to read while preserving it). Do not convey meaning only through an ungrounded vague qualifier (e.g. "significantly", "nicely") or a bare metaphor — if you use a metaphor, pair it immediately with a precise restatement (do not force established technical terms, or ordinary words in their everyday sense, into strained paraphrases — that makes things more ambiguous).';
const JA_R5 =
  "- **比喩・曖昧な言い方だけで意味を渡さない**: 報告の土台は正確さ（意味が一意に読める記述。平易さはそれを保ったまま易しく書く手段）。基準のない程度語（「かなり」「うまく」等）だけで結果を伝えず、観測できる事実で書く。比喩を使うなら直後に正確な言い直しを必ず併記する（確立された専門用語・世間の意味のままの一般語は無理に開かない）。";
const EN_R5 =
  '- **Do not convey meaning only through a metaphor or a vague qualifier**: the foundation of a report is precision — write so the meaning reads unambiguously (plain language is a means of staying easy to read while preserving it). Do not report results only with ungrounded qualifiers (e.g. "significantly", "nicely"); state observable facts. If you use a metaphor, pair it immediately with a precise restatement (do not force established technical terms, or ordinary words in their everyday sense, into strained paraphrases).';

test("問いの平易さ点検に第5項目（正確さ）が逐語で載り、5点宣言になっている", () => {
  for (const [f, q5, count] of [
    ["templates/ja/claude/skills/intent-discover/rules/designer-questions.md", JA_Q5, "次の5点を点検する"],
    ["templates/en/claude/skills/intent-discover/rules/designer-questions.md", EN_Q5, "check these 5 points"],
    [".claude/skills/intent-discover/rules/designer-questions.md", JA_Q5, "次の5点を点検する"],
  ]) {
    const t = read(f);
    assert.ok(t.includes(q5), `${f}: 第5項目が無い/改変されている`);
    assert.ok(t.includes(count), `${f}: 5点宣言が無い`);
  }
});

test("報告の平易さ点検に正確さの項目が逐語で載っている", () => {
  for (const [f, r5] of [
    ["templates/ja/claude/skills/intent-discover/SKILL.md", JA_R5],
    ["templates/en/claude/skills/intent-discover/SKILL.md", EN_R5],
    [".claude/skills/intent-status/SKILL.md", JA_R5],
  ]) {
    const t = read(f);
    assert.ok(t.includes(r5), `${f}: 報告点検の正確さ項目が無い/改変されている`);
  }
});

// ---- packet sve8: 内部記録の書き方注記（packet-format.md・全6ファイル逐語） ----
const JA_NOTE =
  "これらの節を書くときの言葉は正確さを土台にする（INV107。これから書く記録に適用し、過去の記録へ遡及しない）: 比喩や基準のない曖昧な言い方（「かなり」等）だけで意味を渡さず、意味が一意に読める記述で書く。比喩を使うなら直後に正確な言い直しを併記する。識別子・検索性優先の内部語彙は従来どおり（対象は書き方だけ）。";
const EN_NOTE =
  'Write these sections with precision as the foundation (INV107; applies to records written from now on — never retroactively): do not convey meaning only through metaphors or ungrounded vague qualifiers (e.g. "significantly"); write so the meaning reads unambiguously. If you use a metaphor, pair it immediately with a precise restatement. Identifiers and search-friendly internal vocabulary stay as they are (only the writing style is in scope).';

test("packet-format.md（記録書式の正本）に書き方注記が逐語で載っている（6ファイル）", () => {
  const jaFiles = [
    "templates/ja/claude/skills/intent-packets/rules/packet-format.md",
    "templates/ja/codex/skills/intent-packets/rules/packet-format.md",
    ".claude/skills/intent-packets/rules/packet-format.md",
    ".agents/skills/intent-packets/rules/packet-format.md",
  ];
  const enFiles = [
    "templates/en/claude/skills/intent-packets/rules/packet-format.md",
    "templates/en/codex/skills/intent-packets/rules/packet-format.md",
  ];
  for (const f of jaFiles) assert.ok(read(f).includes(JA_NOTE), `${f}: 書き方注記が無い/改変されている`);
  for (const f of enFiles) assert.ok(read(f).includes(EN_NOTE), `${f}: writing-style note missing/altered`);
  // 遡及しない・語彙は対象外の2つの歯止めが注記の実質に含まれる（表面マーカーでない）
  assert.ok(JA_NOTE.includes("遡及しない") && JA_NOTE.includes("内部語彙は従来どおり"), "注記の歯止めの実質");
});

// ---- 新記号の短名台帳（INV59・記号 gate と対）
test("symbol-labels.json に本案件の新記号 8 つの短名（ja/en）がある", () => {
  const labels = JSON.parse(read("scripts/symbol-labels.json"));
  for (const id of ["INV107", "DR213", "DR214", "DR215", "Anti-569", "Anti-570", "Anti-571", "Anti-572"]) {
    assert.ok(labels[id], `symbol-labels.json に ${id} が無い`);
    assert.ok(labels[id].ja && labels[id].en, `${id}: ja/en の短名が欠けている`);
  }
});
