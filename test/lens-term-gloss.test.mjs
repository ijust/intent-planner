// overloaded-ordinary-terms 5lp5（問い文言の初出言い換えと台帳登録・C83/C85・INV104/DR205/DR206/DR207 A+C層）
//   の判別テスト（node:test 標準・依存ゼロ）。
//
// 背景: discover のロールレンズ確認が「代行」「本人」「観点」を説明なしに利用者へ出し、
//   利用者が意味を聞き返す実症状が出た（2026-07-17）。問い文言へ初出の一行言い換えを直書きし、
//   症例4語を glossary へ言い換え例付きで登録した。
//
// ここで落とす誤実装（discriminative oracle）:
//   - 「言い換えを添える」と書くだけで、そのまま使える言い換えの実文（あなた自身が答える／仮の答えを置き…）が無い
//   - 代行の言い換えに「採否は利用者」の要（決定権の所在）が無い
//   - 毎出現に添える（初出1回＝DR206 の限定が無い）
//   - templates だけ・dogfood だけの片肺反映（4面+en 2面の取りこぼし）
//   - glossary 登録に言い換え例列が無い（初見の読み手に使える形になっていない）
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(REPO_ROOT, p), "utf8");

const JA_BASES = [
  "templates/ja/claude/skills/",
  "templates/ja/codex/skills/",
  ".claude/skills/",
  ".agents/skills/",
];
const EN_BASES = ["templates/en/claude/skills/", "templates/en/codex/skills/"];
const DQ = "intent-discover/rules/designer-questions.md";
const RPR = "intent-discover/rules/role-perspective-review.md";

test("ja: ロールレンズ確認の問い文言に本人・代行・観点の初出言い換えが直書きされている", () => {
  for (const b of JA_BASES) {
    const t = read(b + DQ);
    // 実文（そのまま使える言い換え）が直書きされていること
    assert.ok(t.includes("本人＝その観点の問いにはあなた自身が答える"), `${b}${DQ}: 本人の言い換え実文が無い`);
    assert.ok(t.includes("代行＝その観点で答える人がいないため"), `${b}${DQ}: 代行の言い換え実文が無い`);
    assert.ok(/仮の答えを置き、あなたは採否・修正だけする/.test(t), `${b}${DQ}: 代行の言い換えに決定権の所在（採否）が無い`);
    assert.ok(t.includes("どの職能の目でこの案件を問うか"), `${b}${DQ}: 観点の言い換えが無い`);
    // 初出1回の限定（DR206）
    assert.ok(t.includes("同じ対話の2回目以降は添えない"), `${b}${DQ}: 初出1回の限定が無い`);
  }
});

test("ja: 観点の名乗り側でも代行の初出が開かれ、2回目以降は省略できる", () => {
  for (const b of JA_BASES) {
    const t = read(b + RPR);
    assert.ok(t.includes("（代行＝この観点で答える人がいないため"), `${b}${RPR}: 名乗りの初出言い換えが無い`);
    assert.ok(t.includes("2回目以降は「（代行）」だけでよい"), `${b}${RPR}: 2回目以降の省略規定が無い`);
    assert.ok(t.includes("採否は利用者が行う"), `${b}${RPR}: 決定権の所在が無い`);
  }
});

test("en: 同じ言い換えが英語側にもある", () => {
  for (const b of EN_BASES) {
    const dq = read(b + DQ);
    assert.ok(dq.includes("you answer that perspective's questions yourself"), `${b}${DQ}: person gloss missing`);
    assert.ok(dq.includes("you only approve or correct"), `${b}${DQ}: stand-in gloss (decision stays with user) missing`);
    assert.ok(dq.includes("which profession's eye asks about this case"), `${b}${DQ}: perspective gloss missing`);
    assert.ok(dq.includes("do not repeat the gloss later in the same conversation"), `${b}${DQ}: once-per-conversation limit missing`);
    const rpr = read(b + RPR);
    assert.ok(rpr.includes("(stand-in = nobody on this case answers for that perspective"), `${b}${RPR}: first-use opening missing`);
    assert.ok(rpr.includes('"(stand-in)" alone is enough afterwards'), `${b}${RPR}: afterwards shortening missing`);
  }
});

test("glossary: 症例4語が言い換え例付きで登録されている（追加のみ・dogfood 台帳）", () => {
  const g = read(".intent/glossary.md");
  for (const w of ["代行", "本人", "観点", "配布"]) {
    const row = g.split("\n").find((l) => l.startsWith(`| ${w} |`));
    assert.ok(row, `glossary: ${w} の行が無い`);
    const cols = row.split("|").map((c) => c.trim()).filter((c, i, a) => !(i === 0 || i === a.length - 1));
    assert.ok(cols.length >= 5, `glossary: ${w} の行に状態・言い換え例の列が無い`);
    assert.ok(cols[4].length > 5, `glossary: ${w} の言い換え例が空`);
  }
});

test("symbol-labels: 問い文言が参照する INV104/DR206 の短名が台帳にある", () => {
  const sl = JSON.parse(read("scripts/symbol-labels.json"));
  for (const k of ["INV104", "DR206"]) {
    assert.ok(sl[k]?.ja && sl[k]?.en, `symbol-labels: ${k} の ja/en 短名が無い`);
  }
});

test("パリティ: 挿入後も designer-questions / role-perspective-review は言語内で byte 同一", () => {
  for (const rule of [DQ, RPR]) {
    const ja = JA_BASES.map((b) => read(b + rule));
    assert.ok(ja.every((t) => t === ja[0]), `${rule}: ja 4面が一致しない`);
    const en = EN_BASES.map((b) => read(b + rule));
    assert.ok(en[0] === en[1], `${rule}: en 2面が一致しない`);
  }
});
