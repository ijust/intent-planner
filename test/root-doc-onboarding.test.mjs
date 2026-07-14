// ルート規約文書のオンボーディング検査。
// spec: claude-md-onboarding-doc。
//
// 【構造】agent ごとに「利用者が実際に読む実体」の置き場が違う（Anti-533・2026-07-14）:
//   - claude / gemini（rootDocImport=true）: 実体は本体（CLAUDE_intent.md / GEMINI_intent.md）。
//     ルート文書（CLAUDE.md / GEMINI.md）は本体への参照1行だけの薄い入口で、install は
//     新規リポ・既存リポのどちらでも本体を必ず配る（配布レーンで中身を変えない）。
//   - codex（rootDocImport=false）: @import 記法が無いため AGENTS.md が入口と本体を兼ねる。
//
// 【検査の狙い】
//   - 実体（本体 / AGENTS.md）に quickstart の中身が揃う: workflow ステップ・入口 skill 名・
//     能動温度（行動促し）・pull 規律・steering 生成非推奨。ja ↔ en・agent 間のパリティ。
//   - 実体に Spec/Invariant 本体を転記しない（DR6/INV14・固定ロードコストの線形増を防ぐ）。
//   - 入口（CLAUDE.md / GEMINI.md）は参照1行に徹する（Anti-460）。全文を写すと本体と置き場が
//     割れ、片方だけ更新される取りこぼしが構造的に起きる（実際に起きた＝Anti-533 の Annex）。

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const LANGS = ["ja", "en"];

// 利用者が実際に読む実体（quickstart の中身がここに揃う）。
const BODY_DOCS = LANGS.flatMap((lang) => [
  { lang, agent: "claude", rel: path.join("templates", lang, "agents", "claude", "CLAUDE_intent.md") },
  { lang, agent: "codex", rel: path.join("templates", lang, "agents", "codex", "AGENTS.md") },
  { lang, agent: "gemini", rel: path.join("templates", lang, "agents", "gemini", "GEMINI_intent.md") },
]);

// 参照1行だけの薄い入口（rootDocImport=true の agent のみ。codex は AGENTS.md が実体を兼ねる）。
const ENTRY_DOCS = LANGS.flatMap((lang) => [
  {
    lang,
    agent: "claude",
    rel: path.join("templates", lang, "agents", "claude", "CLAUDE.md"),
    refLine: "@CLAUDE_intent.md",
  },
  {
    lang,
    agent: "gemini",
    rel: path.join("templates", lang, "agents", "gemini", "GEMINI.md"),
    refLine: "@./GEMINI_intent.md",
  },
]);

// 実体の薄さの閾値。守るのは INV14（常時ロードを際限なく太らせない）。Spec/Invariant 本体の
// 転記を禁じるのが要点で、下の MAX_INV_DR_LISTINGS と対で効く。
const MAX_LINES = 90;
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

// ---- 入口（CLAUDE.md / GEMINI.md）: 参照1行に徹する（Anti-460 / Anti-533） ----
//
// 入口が quickstart 全文を抱えると、同じ内容の置き場が本体と2つに割れ、片方だけ更新される
// 取りこぼしが構造的に起きる。実際に 2026-07-14 まで新規リポの利用者には本体が配られず、
// 入口にしか中身が無かったため、本体にだけ注入していた横断会話規律（平易さ・造語しない等）が
// 1つも届いていなかった。入口を1行に保つことが、その再発を構造的に防ぐ。
for (const doc of ENTRY_DOCS) {
  test(`薄い入口は参照1行に徹する: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    const lines = body.split("\n").filter((l) => l.trim() !== "");
    assert.deepEqual(
      lines,
      [doc.refLine],
      `${doc.rel} は本体への参照1行（${doc.refLine}）だけ。quickstart 全文を写さない` +
        `（写すと本体と置き場が割れ、片方だけ更新される取りこぼしが起きる・Anti-533）`,
    );
  });
}

// ---- 実体（本体 / AGENTS.md）: quickstart の中身が揃い、Spec/Invariant 本体は転記しない ----

for (const doc of BODY_DOCS) {
  test(`実体が存在する: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する（利用者が実際に読む実体）`);
  });

  test(`薄さ（行数上限 ${MAX_LINES}）: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    const lines = body.split("\n").length;
    assert.ok(
      lines <= MAX_LINES,
      `${doc.rel} は ${lines} 行。実体の上限 ${MAX_LINES} 行以内（Spec/Invariant 本体を盛りすぎない・DR6/INV14）`,
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

  test(`参照先案内がある（本体転記の代替）: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    assert.ok(
      body.includes(".intent/"),
      `${doc.rel} は .intent/ 配下（intent-compass.md 等）の参照先を案内する（本体を転記しない）`,
    );
  });

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

  test(`能動的な行動促しを含む（discover/status 案内）: ${doc.rel}`, () => {
    const body = readDoc(doc.rel);
    assert.ok(body !== null, `${doc.rel} が存在する`);
    assert.ok(
      body.includes("intent-discover") && body.includes("intent-status"),
      `${doc.rel} は実装前 /intent-discover・迷ったら /intent-status の行動促しを含む`,
    );
  });

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

// 構造パリティ: 全実体が同じ workflow ステップ・入口 skill 名を持つ（agent 間・ja/en 間）。
test("構造パリティ: 全実体が workflow ステップ・入口 skill 名を共通に含む", () => {
  const bodies = BODY_DOCS.map((d) => ({ rel: d.rel, body: readDoc(d.rel) }));
  for (const { rel, body } of bodies) {
    assert.ok(body !== null, `${rel} が存在する（パリティの前提）`);
  }
  for (const marker of [...WORKFLOW_STEPS, ...ENTRY_SKILLS]) {
    const missing = bodies.filter(({ body }) => body !== null && !body.includes(marker)).map((b) => b.rel);
    assert.equal(
      missing.length,
      0,
      `マーカー ${marker} を全実体が含む（欠落: ${missing.join(", ")}）`,
    );
  }
});

// ---- 横断会話規律が実体に届く（Anti-460: 規律は本体に置く・入口には置かない） ----
//
// 2026-07-14 まで、この検査は存在せず、かつ新規リポには本体が配られていなかったため、
// 本体に注入した規律が新規リポの利用者へ1つも届かない状態を誰も検知できなかった。
// install の修正（本体を常に配る・Anti-533）と対で、規律が実体に在ることをここで固定する。
const CROSS_CUTTING_ANCHORS = {
  ja: [
    { name: "普通の言葉で話す", pattern: /普通の言葉で話す/ },
    { name: "出力直前に点検する", pattern: /出力する直前に(必ず)?点検する/ },
    { name: "新しい用語を造らない", pattern: /新しい用語を造らず/ },
  ],
  en: [
    { name: "speak in plain language", pattern: /speak in plain language/i },
    { name: "check right before sending output", pattern: /right before (you send|sending) output/i },
    { name: "do not coin new terms", pattern: /do not coin new terms/i },
  ],
};

for (const doc of BODY_DOCS) {
  for (const anchor of CROSS_CUTTING_ANCHORS[doc.lang]) {
    test(`横断規律「${anchor.name}」が実体に届く: ${doc.rel}`, () => {
      const body = readDoc(doc.rel);
      assert.ok(body !== null, `${doc.rel} が存在する`);
      assert.ok(
        anchor.pattern.test(body),
        `${doc.rel} は横断規律「${anchor.name}」を含む（利用者が実際に読む実体に無いと規律が届かない）`,
      );
    });
  }
}
