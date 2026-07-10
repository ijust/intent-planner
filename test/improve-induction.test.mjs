// improve 誘導の実効化（決定表行 + milestone 記入案内）の判別テスト。
// packet: pkt-20260710-improve-induction-nudges-qb3i（C55・A61/A63・INV77/INV78・DR123/DR124）。
//
// 検査の姿勢（test-asserts-substance-not-surface-marker）:
//   行番号の絶対値（「row 13 がある」等）に固定せず、実質で検査する —
//   「unjudged 蓄積で /intent-improve を推す行が存在し、fallback 行の直前に位置し、
//    fallback 行が表の最終行である」を表の内容キーから判定する。
//   これにより将来行が増減しても、位置規律（既存全条件行の後・fallback 直前）だけを守らせる。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(HERE, "..");

const SYSTEMS = [
  ["ja", "claude"],
  ["ja", "codex"],
  ["en", "claude"],
  ["en", "codex"],
];

function skillFile(lang, agent, rel) {
  return path.join(REPO_ROOT, "templates", lang, agent, "skills", rel);
}
function dogfoodFile(rel) {
  return path.join(REPO_ROOT, ".claude", "skills", rel);
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}

// 決定表の Markdown 表から行（| # | 条件 | 推奨 |）を抽出する
function tableRows(md) {
  return md
    .split("\n")
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => {
      const cells = l.split("|").map((c) => c.trim());
      return { num: cells[1], cond: cells[2], rec: cells[3] };
    });
}

const FALLBACK = { ja: "上記いずれもなし", en: "None of the above" };
const UNJUDGED_KEY = "user-verdict: unjudged";

for (const [lang, agent] of SYSTEMS) {
  const label = `${lang}/${agent}`;

  test(`decision-table: unjudged 蓄積行が fallback 直前に存在する（${label}）`, () => {
    const md = read(skillFile(lang, agent, "intent-status/rules/decision-table.md"));
    const rows = tableRows(md);
    assert.ok(rows.length >= 3, "決定表の行が取れること");
    const last = rows[rows.length - 1];
    const secondLast = rows[rows.length - 2];
    // fallback 行が最終行のまま（誤実装: 新行を fallback の後ろに置く、を落とす）
    assert.ok(last.cond.includes(FALLBACK[lang]), `最終行は fallback（実際: ${last.cond}）`);
    // 直前の行が unjudged 蓄積 → /intent-improve（誤実装: 行が無い・位置が先頭側、を落とす）
    assert.ok(secondLast.cond.includes(UNJUDGED_KEY), `fallback 直前の行の条件が unjudged 蓄積（実際: ${secondLast.cond}）`);
    assert.ok(secondLast.rec.includes("/intent-improve"), "推奨が /intent-improve");
    assert.ok(/3/.test(secondLast.cond), "閾値3が条件に明示されている");
    // unjudged 行はちょうど1行（重複追加を落とす）
    const unjudgedRows = rows.filter((r) => r.cond.includes(UNJUDGED_KEY));
    assert.equal(unjudgedRows.length, 1, "unjudged 蓄積行はちょうど1行");
  });

  test(`decision-table: 新脚注が固定閾値・分割形横断読み・自動実行禁止を持つ（${label}）`, () => {
    const md = read(skillFile(lang, agent, "intent-status/rules/decision-table.md"));
    assert.ok(md.includes(".intent/drift-log/*.md"), "分割形横断読みの読み先が明示されている");
    const fixedThreshold = lang === "ja" ? "固定値3" : "fixed value of 3";
    assert.ok(md.includes(fixedThreshold), "閾値が固定値3（設定キーを増やさない）と明示されている");
    const noAutorun = lang === "ja" ? "自動実行せず" : "never auto-run";
    assert.ok(md.includes(noAutorun), "improve を自動実行しない（INV77）が明示されている");
  });

  test(`decision-table: 既存の DB おすすめ脚注が 11 のまま（packet-format の名指し参照を壊さない）（${label}）`, () => {
    const md = read(skillFile(lang, agent, "intent-status/rules/decision-table.md"));
    const dbKey = lang === "ja" ? "DB 設計おすすめ" : "recommending DB design";
    const m = md.match(/^(\d+)\.\s+\*\*[^*]*(?:DB 設計おすすめ|recommending DB design)/m);
    assert.ok(m, `DB おすすめ脚注が存在する（${dbKey}）`);
    assert.equal(m[1], "11", "DB おすすめ脚注の番号は 11 のまま");
  });

  test(`status SKILL: drift 集計が分割形横断読みで、row 13 該当時の内訳併記を持つ（${label}）`, () => {
    const md = read(skillFile(lang, agent, "intent-status/SKILL.md"));
    assert.ok(md.includes(".intent/drift-log/*.md"), "Step 3.5 が分割形を読む");
    const breakdown = lang === "ja" ? "pattern 内訳" : "per-pattern breakdown";
    assert.ok(md.includes(breakdown), "row 13 該当時の pattern 内訳併記がある");
  });

  test(`writeback SKILL: milestone 記入案内（書くのは利用者・記録ではない）を持つ（${label}）`, () => {
    const md = read(skillFile(lang, agent, "intent-writeback/SKILL.md"));
    assert.ok(md.includes(".intent/milestones.md"), "案内が milestones.md を指す");
    const userWrites = lang === "ja" ? "書くのは利用者" : "the user writes it";
    assert.ok(md.includes(userWrites), "書き手は利用者だけ（INV78）が明示されている");
    const notARecord = lang === "ja" ? "案内であって記録ではない" : "guidance, not a record";
    assert.ok(md.includes(notARecord), "案内と記録の境界（R8 非抵触）が明示されている");
    const noWrite = lang === "ja" ? "milestones.md へ書き込まず" : "never writes to milestones.md";
    assert.ok(md.includes(noWrite), "AI が milestones へ書かないことが明示されている");
  });

  test(`improve-axes: milestones 空検知時の案内（従接点）を持つ（${label}）`, () => {
    const md = read(skillFile(lang, agent, "intent-improve/rules/improve-axes.md"));
    const emptyGuide =
      lang === "ja"
        ? "節目イベント（例: 本番構成の確定）を"
        : "Recording a milestone event";
    assert.ok(md.includes(emptyGuide), "実エントリ0のときの案内文がある");
    const noWrite = lang === "ja" ? "milestones.md へ書き込まない" : "never writes to milestones.md";
    assert.ok(md.includes(noWrite), "AI が milestones へ書かないことが明示されている");
  });
}

test("rules は言語内で claude/codex バイト等価（decision-table / improve-axes）", () => {
  for (const lang of ["ja", "en"]) {
    for (const rel of [
      "intent-status/rules/decision-table.md",
      "intent-improve/rules/improve-axes.md",
    ]) {
      assert.equal(
        read(skillFile(lang, "claude", rel)),
        read(skillFile(lang, "codex", rel)),
        `${lang}: ${rel} が claude/codex で byte 等価`
      );
    }
  }
});

test("dogfood（.claude/skills）が templates ja/claude と一致（触った4ファイル）", () => {
  for (const rel of [
    "intent-status/rules/decision-table.md",
    "intent-status/SKILL.md",
    "intent-writeback/SKILL.md",
    "intent-improve/rules/improve-axes.md",
  ]) {
    assert.equal(
      read(skillFile("ja", "claude", rel)),
      read(dogfoodFile(rel)),
      `dogfood 同期: ${rel}`
    );
  }
});
