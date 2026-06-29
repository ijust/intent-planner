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

// ---- 蓄積トリガ実効化（library-accrual-compass）: 手順5 が採用直後に蓄積を確実に問う ----
// 個人台帳は「読む経路はあるが貯まる経路が働いていない」状態に陥りやすい。手順5 が
// 「採用の直後に library へ残すか read-only で問う」「スキーマ下書きを見せる」「既載は再提示しない」
// を明示していることを検査する。これらのアンカーを消す（蓄積を素通りする退化）と落ちる discriminative 設計。
test("constraint-surfacing: 採用した制約の蓄積を採用直後に read-only で確実に問う（library-accrual-compass）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    // 個人台帳への蓄積を問う対象である。
    assert.match(t, /constraint-library\.md/, `${lang}/${agent}: 個人台帳 constraint-library.md を参照する`);
    // 採用の直後に確実に問う（蓄積を素通りしない）。
    const askAfterAdopt = lang === "ja"
      ? /採用.*直後.*(問う|残しますか)/s
      : /(right after|after that adoption).*(ask|keep this)/is;
    assert.match(t, askAfterAdopt, `${lang}/${agent}: 採用直後に蓄積を確実に問う`);
    // スキーマの下書きを見せる。
    const showDraft = lang === "ja"
      ? /下書き.*(提示|見せる)|スキーマ.*下書き/s
      : /(draft).*(present|show)|schema draft/is;
    assert.match(t, showDraft, `${lang}/${agent}: 記入スキーマの下書きを見せる`);
    // 既載は再提示しない（重複排除）。
    const dedup = lang === "ja"
      ? /既載.*再提示しない|再提示しない（重複排除）|重複排除/s
      : /already in the ledger.*(do not|dedup)|dedup/is;
    assert.match(t, dedup, `${lang}/${agent}: 既載の制約は再提示しない（重複排除）`);
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

// ---- constraint-library-firing（A32）: 意図 vs 手段の読み分けと実装フェーズ発火 ----
// 個人台帳は「貯めても読む（マッチして発火する）経路が弱い」穴を持つ。手順2 が
// 「意図向きか手段向きかを読み分ける」、手順6 が「手段向きは実装フェーズ（decision-probe 相乗）で発火」
// を明示し、発火点を広げても read-only 堰・弱ければ黙る・repo 内のみを継承していることを検査する。
// これらのアンカーを消す（compass 一回固定に戻す退化）と落ちる discriminative 設計。
function probePath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-packets", "rules", "decision-probe.md");
}

test("constraint-surfacing: 個人台帳の制約を意図 vs 手段で読み分ける（A32・手順2）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    // 意図向き/手段向きの読み分けを明示する。
    const sorting = lang === "ja"
      ? /(意図向き|意図ベース).*(手段向き|手段ベース)|(手段向き|手段ベース).*(意図向き|意図ベース)/s
      : /(intent-oriented|intent-based).*(means-oriented|means-based)|(means-oriented|means-based).*(intent-oriented|intent-based)/is;
    assert.match(t, sorting, `${lang}/${agent}: 意図向きか手段向きかを読み分ける`);
    // 読み分けの対象は個人台帳由来の制約に限る（同梱 starters は対象外）。
    assert.match(t, /constraint-library\.md/, `${lang}/${agent}: 個人台帳由来の制約を読み分ける`);
    // 新フィールドを増やさず既存 `適合する状況` で吸収（最小性）。
    const minimality = lang === "ja"
      ? /(新しい記入項目|新フィールド).*(増やさない|足さない)|既存\s*`?適合する状況`?\s*の書き方で吸収/s
      : /add no new field|absorb it in (how `?fits when`? is written|the existing `?fits when`?)/is;
    assert.match(t, minimality, `${lang}/${agent}: 新フィールドを増やさず既存記法で吸収`);
  }
});

test("constraint-surfacing: 手段向きの制約を実装フェーズで発火させる（A32・手順6）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    // 実装フェーズでも発火させる（compass 一回固定に戻す退化を許さない）。
    const implPhaseFiring = lang === "ja"
      ? /実装フェーズ.*(発火|候補提示|read)/s
      : /implementation phase.*(fir|surfac|candidate)/is;
    assert.match(t, implPhaseFiring, `${lang}/${agent}: 手段向きを実装フェーズで発火させる`);
    // 宿主は decision-probe に相乗（新発火点を別に作らない）。
    const ride = lang === "ja"
      ? /decision-probe\.md.*(相乗|加える|証拠)/s
      : /decision-probe\.md.*(rid|add|evidence)/is;
    assert.match(t, ride, `${lang}/${agent}: decision-probe へ相乗させる`);
    // 発火点を広げても堰を継承する（弱ければ黙る・repo 内のみ）。
    const inheritGate = lang === "ja"
      ? /(弱ければ黙る|台帳全件を読まない).*(repo 内|外部証拠源を読まない)|(repo 内|外部証拠源を読まない).*(弱ければ黙る|台帳全件を読まない)/s
      : /(stay silent if the fit is weak|do not load the whole ledger).*(in-repo|do not read external)|(in-repo|do not read external).*(stay silent|do not load the whole ledger)/is;
    assert.match(t, inheritGate, `${lang}/${agent}: 発火点を広げても read-only 堰を継承する`);
  }
});

test("decision-probe: 個人台帳の手段ベース制約を証拠源に加える（A32・read-only 堰継承）", () => {
  for (const [lang, agent] of VARIANTS) {
    const p = probePath(lang, agent);
    assert.ok(fs.existsSync(p), `${lang}/${agent}: decision-probe.md が存在する`);
    const t = read(p);
    // 個人台帳を証拠源に加える。
    assert.match(t, /constraint-library\.md/, `${lang}/${agent}: 個人台帳を証拠源に加える`);
    // A32/constraint-library-firing への帰属を明示する。
    const attribution = lang === "ja"
      ? /constraint-library-firing|A32/
      : /constraint-library-firing|A32/;
    assert.match(t, attribution, `${lang}/${agent}: A32 への帰属を明示する`);
    // 不在/非合致で沈黙（後方互換）。
    const silent = lang === "ja"
      ? /(不在|合致が無|手段ベースの合致).*(沈黙|何も出さない|出さない)/s
      : /(absent|no means-based match).*(silence|emit nothing|nothing)/is;
    assert.match(t, silent, `${lang}/${agent}: 不在/非合致で沈黙する`);
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
