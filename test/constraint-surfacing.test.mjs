// intent-planner-constraint-starters-add の検査。
// compass 提示 rule（constraint-surfacing.md）と discover の自己 gate レーン（drift-terrain.md 追記節）が、
// 三重受容オラクル（該当文脈で提示／非該当で出さない／自動転記しない）・read-only 堰・off ガード・
// 後方互換・C2 非置換を満たすことを read-only で検査する。提示ロジックは自然言語の手順 rule のため、
// 受容オラクルは「手順がその規律を明示しているか」の構造検査 + 違反注入で RED になる discriminative 設計。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const VARIANTS = [
  ["ja", "claude"], ["en", "claude"], ["ja", "codex"], ["en", "codex"],
];

function surfacingPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-compass", "rules", "constraint-surfacing.md");
}
function terrainPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-discover", "rules", "drift-terrain.md");
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}

// ---- 1.1: 提示 rule が4系統に存在し、カタログを read-only で読む手順を持つ ----
test("constraint-surfacing: 4系統に存在しカタログを read-only 照合する", () => {
  for (const [lang, agent] of VARIANTS) {
    const p = surfacingPath(lang, agent);
    assert.ok(fs.existsSync(p), `${lang}/${agent}: constraint-surfacing.md が存在する`);
    const t = read(p);
    assert.match(t, /constraint-starters\.md/, `${lang}/${agent}: カタログを参照する`);
    assert.match(t, /read-only/, `${lang}/${agent}: read-only 照合を明示する`);
  }
});

// ---- 3.1: 該当/非該当を文脈で分ける（2対分岐の根拠＝退化実装を許さない手順）----
// 手順が「適合する状況で照合し、非該当は出さない」を明示していることを検査。
// 「非該当は出さない」を欠く（常に提示する）退化実装は、この検査で落ちる。
test("constraint-surfacing: 該当文脈で提示し非該当文脈では出さない分岐を明示する（3.1）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    const fitsKey = lang === "ja" ? /適合する状況/ : /fits when/;
    assert.match(t, fitsKey, `${lang}/${agent}: 「適合する状況」で照合する`);
    // 非該当は提示しない（常に提示の退化を許さない）。
    const noShowOnMiss = lang === "ja"
      ? /(非該当|当てはまりが弱ければ).*(提示しない|出さない|黙)/s
      : /(non-matching|fit is weak).*(do not surface|stay silent)/is;
    assert.match(t, noShowOnMiss, `${lang}/${agent}: 非該当/弱い適合では提示しない`);
  }
});

// ---- 2.1/2.3/3.2: read-only 堰（自動転記しない・採否は人）----
// 手順が「自動で書き込まない」を明示していることを検査。これを欠く（自動転記する）実装は落ちる。
test("constraint-surfacing: 自動転記しない read-only 堰を明示する（2.1/2.3）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    const noAutoWrite = lang === "ja"
      ? /自動で(は)?書き込まない|自動転記しない/
      : /do not auto-write|not auto-transcribe/i;
    assert.match(t, noAutoWrite, `${lang}/${agent}: compass へ自動転記しないことを明示`);
    const humanAdopts = lang === "ja"
      ? /(採否|採用)(は|するか)?.*(利用者|人)/s
      : /(adopt|adoption).*(user|by hand)/is;
    assert.match(t, humanAdopts, `${lang}/${agent}: 採否は人が行う`);
  }
});

// ---- 1.3/5.1: C2 既存導出を置き換えない・二重化しない（前段差し込み）----
test("constraint-surfacing: 既存導出を置き換えず前段に差し込む（1.3/5.1）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    const noReplace = lang === "ja"
      ? /(置き換えない|前段)/
      : /(do not replace|before)/i;
    assert.match(t, noReplace, `${lang}/${agent}: 既存導出を置き換えず前段に差し込む`);
  }
});

// ---- 5.3: 意味的照合・機械スコアリングに寄せない ----
test("constraint-surfacing: 意味的照合で機械スコアリングに寄せない（5.3）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    const semantic = lang === "ja"
      ? /意味的/
      : /semantical/i;
    assert.match(t, semantic, `${lang}/${agent}: 意味的に照合する`);
    const noMechanical = lang === "ja"
      ? /(文字列スコアリング|正規表現).*(寄せない|しない)/s
      : /(string scoring|regular-expression).*(do not|not)/is;
    assert.match(t, noMechanical, `${lang}/${agent}: 機械的スコアリングに寄せない`);
  }
});

// ---- 6.1: カタログ不在で沈黙（後方互換）----
test("constraint-surfacing: カタログ不在で沈黙する（6.1）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    const silentAbsent = lang === "ja"
      ? /不在.*(スキップ|沈黙|停止しない)/s
      : /absent.*(skip|silent|do not stop)/is;
    assert.match(t, silentAbsent, `${lang}/${agent}: カタログ不在でスキップ/沈黙`);
  }
});

// ---- 4.1/4.2/6.2: discover 自己 gate レーン（off ガード・ログ無し・後方互換）----
test("drift-terrain: 制約叩き台レーンが drift-watch:on ガード下でログを持たない（4.1/4.2/6.2）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(terrainPath(lang, agent));
    // 制約叩き台レーンの節が追記されている。
    const laneHeading = lang === "ja" ? /制約の叩き台の気づき/ : /Constraint starter awareness/i;
    assert.match(t, laneHeading, `${lang}/${agent}: 制約叩き台レーンが追記されている`);
    // 当該レーンに drift-watch: on ガードがある（off で何もしない）。
    assert.match(t, /drift-watch: on/, `${lang}/${agent}: on ガードを持つ`);
    // ログに書かない（context-cost-cues と同型）。
    const noLog = lang === "ja" ? /どのログにも(記録しない|append しない)/ : /no log|append to (no|neither)/i;
    assert.match(t, noLog, `${lang}/${agent}: ログを持たない`);
  }
});

// ---- 5.2: algo-qoc.md は触っていない（byte-lock 不変の独立確認）----
// standard-invariance.test.mjs の byte-lock が正だが、ここでも「提示ロジックを algo-qoc に書いていない」
// を独立に確認する（提示 rule は別ファイルに局在）。
test("algo-qoc.md に提示ロジックを書いていない（5.2・byte-lock を侵さない）", () => {
  for (const [lang, agent] of VARIANTS) {
    const qoc = path.join(ROOT, "templates", lang, agent, "skills", "intent-compass", "rules", "algo-qoc.md");
    const t = read(qoc);
    assert.ok(!/constraint-starters\.md|constraint-surfacing/.test(t),
      `${lang}/${agent}: algo-qoc.md に提示ロジック（カタログ参照）を書いていない`);
  }
});
