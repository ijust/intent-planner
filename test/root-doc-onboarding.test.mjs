// ルート規約文書（CLAUDE.md / AGENTS.md × ja/en）のオンボーディング検査。
// spec: claude-md-onboarding-doc。
//
// 検査の狙い（DR6/INV14・最小コスト原則）:
//   - 薄い入口を保つ＝Spec/Invariant 本体を文書に転記しない（固定ロードコストの増大＝
//     トークン上限事故の再発を防ぐ）。
//   - CLAUDE.md ↔ AGENTS.md・ja ↔ en の構造パリティ（workflow ステップ・入口 skill 名）。
//   - 能動温度（行動促し）・pull 規律・steering 生成非推奨が本文に含まれる。
//
// TDD 順序（task 1.1 = 検査先行）: 本検査は task 2.1（CLAUDE.md 新設）・2.2（AGENTS.md 引き上げ）
//   より先に置かれる。CLAUDE.md テンプレが未整備の現時点では意図的に FAIL し、2.1/2.2 で GREEN になる。

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const LANGS = ["ja", "en"];

// 検査対象の6文書（ツール × 言語）。gemini-cli-support (task 3.1) で GEMINI.md を追加。
const ROOT_DOCS = LANGS.flatMap((lang) => [
  { lang, agent: "claude", rel: path.join("templates", lang, "agents", "claude", "CLAUDE.md") },
  { lang, agent: "codex", rel: path.join("templates", lang, "agents", "codex", "AGENTS.md") },
  { lang, agent: "gemini", rel: path.join("templates", lang, "agents", "gemini", "GEMINI.md") },
]);

// 薄さの閾値（design で確定: 既存 AGENTS.md ~47行 + pull 規律/steering 非推奨の追記許容）。
const MAX_LINES = 70;
// compass の Invariant/Decision Rule をブロック列挙してよい上限（3件以上＝本体盛り込みのサイン）。
const MAX_INV_DR_LISTINGS = 2;

// workflow 4 ステップ（discover→compass→packets→export）の構造マーカー。
const WORKFLOW_STEPS = ["intent-discover", "intent-compass", "intent-packets", "intent-export"];
// 入口 skill 名（維持系の代表。文化伝達の核）。
const ENTRY_SKILLS = ["intent-status", "intent-validate", "intent-writeback"];

function readDoc(rel) {
  const abs = path.join(REPO_ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

// 「INVxx」「DRx」のブロック列挙（行頭に箇条書きで現れる Invariant/DR 参照）の件数を数える。
// 少数の例示・本文参照は可だが、3件以上の列挙は本体転記（薄さ違反）のサイン。
function countInvDrListings(body) {
  const lines = body.split("\n");
  return lines.filter((l) => /^\s*[-*]\s.*\b(INV\d{1,2}|DR\d{1,2})\b/.test(l)).length;
}

// 各文書が存在し、ファイルとして読めること（1.1）。
for (const doc of ROOT_DOCS) {
  test(`ルート規約文書が存在する: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する（task 2.1/2.2 で新設・引き上げ）`);
  });
}

// 薄さ（2.1）: 行数上限・本体非転記（INV/DR ブロック列挙の上限）。
for (const doc of ROOT_DOCS) {
  test(`薄い入口（行数上限 ${MAX_LINES}）: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    const lines = body.split("\n").length;
    assert.ok(
      lines <= MAX_LINES,
      `${doc.rel} は ${lines} 行。薄い入口の上限 ${MAX_LINES} 行以内（本体を盛りすぎない・DR6/INV14）`,
    );
  });

  test(`本体非転記（Invariant/DR 列挙 ${MAX_INV_DR_LISTINGS} 件以内）: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    const n = countInvDrListings(body);
    assert.ok(
      n <= MAX_INV_DR_LISTINGS,
      `${doc.rel} は INV/DR を ${n} 件ブロック列挙。本体転記のサイン（${MAX_INV_DR_LISTINGS} 件以内に・参照先案内で代替・DR6/INV14）`,
    );
  });

  // 参照先案内（2.2）: Spec/Invariant 本体の代わりに参照先パスを案内している。
  test(`参照先案内がある（本体転記の代替）: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    assert.ok(
      body.includes(".intent/"),
      `${doc.rel} は .intent/ 配下（intent-compass.md 等）の参照先を案内する（本体を転記しない）`,
    );
  });
}

// 構造マーカー包含（1.2, 4.2, 4.3）: workflow 4 ステップ・入口 skill 名を含む。
for (const doc of ROOT_DOCS) {
  test(`workflow 4 ステップを含む: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    for (const step of WORKFLOW_STEPS) {
      assert.ok(body.includes(step), `${doc.rel} は workflow ステップ ${step} を含む`);
    }
  });

  test(`入口 skill 名を含む: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    for (const skill of ENTRY_SKILLS) {
      assert.ok(body.includes(skill), `${doc.rel} は入口 skill ${skill} を含む`);
    }
  });
}

// 能動温度（1.3, 1.4, 4.1）: 行動促し（discover/status 案内）を含む。
for (const doc of ROOT_DOCS) {
  test(`能動的な行動促しを含む（discover/status 案内）: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    assert.ok(
      body.includes("intent-discover") && body.includes("intent-status"),
      `${doc.rel} は実装前 /intent-discover・迷ったら /intent-status の行動促しを含む`,
    );
  });
}

// pull 規律・steering 生成非推奨（2.3, 3.1, 3.2）。
for (const doc of ROOT_DOCS) {
  test(`pull 規律を含む（該当 packet＋関係 Invariant だけ読む）: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    assert.ok(
      body.includes("packet") && /Invariant|invariant/.test(body),
      `${doc.rel} は pull 規律（実装前に該当 packet と関係する Invariant だけ読む）を含む`,
    );
  });

  test(`steering 生成非推奨を含む: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    assert.ok(
      /steering/i.test(body),
      `${doc.rel} は steering 生成非推奨（必要な制約は export で JIT 供給）を含む`,
    );
  });
}

// 構造パリティ（4.2, 4.3）: CLAUDE.md ↔ AGENTS.md・ja ↔ en が同じ workflow ステップ・入口 skill 名を持つ。
// （存在前提。全文書が同じマーカー集合を含むことを上の包含検査が担保するため、
//  ここでは「全4文書が揃って存在し、いずれも同マーカーを持つ」ことを横断確認する。）
test("構造パリティ: 全4文書が workflow ステップ・入口 skill 名を共通に含む (4.2, 4.3)", () => {
  const bodies = ROOT_DOCS.map((d) => ({ rel: d.rel, body: readDoc(d.rel) }));
  for (const { rel, body } of bodies) {
    assert.ok(body !== null, `${rel} が存在する（パリティの前提）`);
  }
  for (const marker of [...WORKFLOW_STEPS, ...ENTRY_SKILLS]) {
    const missing = bodies.filter(({ body }) => body !== null && !body.includes(marker)).map((b) => b.rel);
    assert.equal(
      missing.length,
      0,
      `マーカー ${marker} を全文書が含む（欠落: ${missing.join(", ")}）`,
    );
  }
});
