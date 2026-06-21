// intent-planner-constraint-starters-wire の検査（結線スライス＝wire）。
// add が作った提示 rule（constraint-surfacing.md）③の続きに「採用→repo 内個人台帳へ
// 人が手動/承認で追記」する蓄積ステップが結線され、theory.md に思想が追記され、
// README ja-en は不変であることを read-only で検査する。
//
// 蓄積手順は自然言語の手順 rule のため、受容オラクルは「手順がその規律を明示しているか」の
// 構造検査 + 違反注入（自動 Write を意味する文言が現れたら RED）で discriminative に設計する。
// 完全な実行時実証は結線後の実走文脈でのみ可能（context-cost-cues の INV22 実効検証と同型）。
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
function read(p) {
  return fs.readFileSync(p, "utf8");
}

// 蓄積ステップ節を取り出す（手順の④以降＝既存導出へ進む、の周辺に足される蓄積案内）。
// 節が無ければ空文字（＝構造検査が落ちる＝未実装で RED）。
function accumulationSection(t, lang) {
  // 蓄積の見出し語（ja: 「個人台帳」「蓄積」/ en: "personal ledger" "accumulate"）を含む段落以降を素朴に拾う。
  const marker = lang === "ja" ? /個人台帳|蓄積/ : /personal ledger|accumulate/i;
  const lines = t.split("\n");
  const idx = lines.findIndex((l) => marker.test(l));
  return idx === -1 ? "" : lines.slice(idx).join("\n");
}

// ---- 1.1/1.2: 採用→個人台帳へ人が手動/承認で追記する蓄積ステップが4系統に存在する ----
test("constraint-starters-wire: 採用→台帳へ人が手動/承認で追記する蓄積ステップが4系統にある（1.1/1.2）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    const sec = accumulationSection(t, lang);
    assert.notEqual(sec, "", `${lang}/${agent}: 蓄積ステップ節が存在する`);
    // 採用した制約を個人台帳（constraint-library.md）へ追記する案内がある。
    assert.match(sec, /constraint-library\.md/, `${lang}/${agent}: 追記先として個人台帳を参照する`);
    const adopt = lang === "ja" ? /採用/ : /adopt/i;
    assert.match(sec, adopt, `${lang}/${agent}: 採用した制約を対象にする`);
    // 人が手動 or 明示承認のもとでのみ追記する。
    const byHand = lang === "ja"
      ? /(手動|人の手|明示(の)?承認)/
      : /(by hand|manual|explicit (approval|consent))/i;
    assert.match(sec, byHand, `${lang}/${agent}: 人が手動 or 明示承認で追記する`);
  }
});

// ---- 3.1/3.2: read-only 堰の実効（自動蓄積しない・採用なしで追記しない）----
// 蓄積ステップが「自動で追記しない」を明示し、かつ自動 Write を意味する肯定文言が現れない
// ことを違反注入で検査する（add の構造検査繰延を解消＝堰の実効検証）。
test("constraint-starters-wire: 自動蓄積しない read-only 堰を実効で明示する（3.1/3.2）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    const sec = accumulationSection(t, lang);
    assert.notEqual(sec, "", `${lang}/${agent}: 蓄積ステップ節が存在する`);
    // 自動で台帳へ書き込まない、を明示。
    const noAutoAccum = lang === "ja"
      ? /自動で(は)?(台帳に)?(追記|書き込ま|蓄積)(を|し)?ない/
      : /do not auto-(append|write|accumulate)/i;
    assert.match(sec, noAutoAccum, `${lang}/${agent}: 台帳へ自動追記しないことを明示`);
    // 採用しなければ追記しない。
    const noAdoptNoWrite = lang === "ja"
      ? /採用(し)?なけれ?ば.*(追記しない|何も)/s
      : /if .*not adopt.*(do not append|nothing)/is;
    assert.match(sec, noAdoptNoWrite, `${lang}/${agent}: 採用なしで追記しない`);
    // 違反注入: 「自動で台帳に追記する／自動蓄積する」旨の肯定文言が現れたら RED。
    const autoWriteLeak = lang === "ja"
      ? /自動で(台帳に)?(追記する|蓄積する)|自動蓄積する/
      : /auto-(append|accumulate) (the |to )?(constraint|ledger)/i;
    assert.ok(!autoWriteLeak.test(sec),
      `${lang}/${agent}: 自動追記/自動蓄積する旨の文言が混入していない（堰の実効）`);
  }
});

// ---- 4.1/4.2: 蓄積は repo 内のみ・横断共有しない ----
test("constraint-starters-wire: 蓄積先は repo 内のみで横断共有しない（4.1/4.2）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    const sec = accumulationSection(t, lang);
    assert.notEqual(sec, "", `${lang}/${agent}: 蓄積ステップ節が存在する`);
    // 追記先は当該プロジェクトの .intent/ 配下の内側のみ。
    const inRepoOnly = lang === "ja"
      ? /(repo 内|このプロジェクト).*(のみ|内側|だけ)|\.intent\/ 配下.*(のみ|内側)/s
      : /(within|inside) (this )?(project|repo).*(only)|inside .*\.intent\//is;
    assert.match(sec, inRepoOnly, `${lang}/${agent}: 追記先は repo 内のみ`);
    // 横断共有/プロジェクト外永続を案内しない。
    // 語順非依存にするため「局所語句」と「否定動詞」を別 assert に分離する
    // （「do not share across projects」「across projects ... do not share」のどちらの語順でも GREEN）。
    const crossLocus = lang === "ja"
      ? /(横断|プロジェクトを?またい?で|repo 外)/
      : /(across projects|cross-project|outside the repo)/i;
    assert.match(sec, crossLocus, `${lang}/${agent}: 横断/repo 外の局所語句がある`);
    const noProvide = lang === "ja"
      ? /(共有しない|永続しない|案内しない|出さない|提供しない|仕組みを.*持たない)/
      : /(do not|no |never)\s*(share|persist|provide|guide)/i;
    assert.match(sec, noProvide, `${lang}/${agent}: 横断共有/repo 外永続を提供・案内しない`);
  }
});

// ---- 5.1/5.2: 後方互換（台帳不在で沈黙・採用なしで挙動を変えない）----
// 台帳不在のスキップは既存（add）の規律に含まれるため、蓄積ステップでも沈黙が保たれることを確認。
test("constraint-starters-wire: 台帳不在/採用なしで沈黙し既存挙動を変えない（5.1/5.2）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    // 台帳不在で沈黙（add から継承・全文で確認）。
    const silentAbsent = lang === "ja"
      ? /constraint-library\.md.*(不在|無)/s
      : /constraint-library\.md.*(absent|skip)/is;
    assert.match(t, silentAbsent, `${lang}/${agent}: 台帳不在で沈黙（後方互換）`);
    const sec = accumulationSection(t, lang);
    // 採用なしでは何も追記せず既存提示の挙動を変えない。
    const noChange = lang === "ja"
      ? /(採用(し)?なけれ?ば|何も(採用|選ば)なけれ?ば).*(追記しない|変えない|何も)/s
      : /(if .*not adopt|nothing adopted).*(do not append|unchanged|nothing)/is;
    assert.match(sec, noChange, `${lang}/${agent}: 採用なしで挙動を変えない`);
  }
});

// ---- INV9: 蓄積ステップを足した後も 4系統 byte 等価（agent 固有語なし）----
// claude↔codex が byte 等価であることは agent-rules-parity.test.mjs が強制するが、
// ここでも蓄積ステップに agent 固有語（AskUserQuestion 等）が混入していないことを独立に確認する。
test("constraint-starters-wire: 蓄積ステップに agent 固有語が混入していない（INV9）", () => {
  for (const [lang, agent] of VARIANTS) {
    const sec = accumulationSection(read(surfacingPath(lang, agent)), lang);
    assert.notEqual(sec, "", `${lang}/${agent}: 蓄積ステップ節が存在する`);
    assert.ok(!/AskUserQuestion|Bash ツール|\bclaude\b|\bcodex\b/i.test(sec),
      `${lang}/${agent}: 蓄積ステップに agent 固有語がない`);
  }
});

// ---- 6.1: theory.md に constraint-starters 思想が追記されている（doc-sync）----
test("constraint-starters-wire: theory.md に constraint-starters 思想が追記されている（6.1）", () => {
  const theory = read(path.join(ROOT, "docs", "theory.md"));
  // 叩き台の供給・repo 内蓄積・read-only 堰の3点が思想として記述されている。
  assert.match(theory, /constraint-starters|制約.*叩き台/, "theory に constraint-starters 思想の節がある");
  assert.match(theory, /(置き換えない|補助).*(叩き台|定石)/s, "既存の判断基準づくりを置き換えない叩き台供給を述べる");
  assert.match(theory, /(repo 内|このプロジェクト内).*(蓄積|閉じ)/s, "repo 内に閉じる蓄積を述べる");
  assert.match(theory, /(read-only|自動で(は)?書き込まない|自動転記しない).*(堰|留める|叩き台)/s, "read-only 堰を述べる");
});

// ---- 6.2: README ja-en は本 wire で変更されていない（Out of Boundary・並行セッション交差回避）----
// wire は theory.md のみ doc-sync する。README は当面除外（利用者指示）。
// 蓄積ステップ・思想の主要語が README に流入していない（wire による追記が無い）ことで不触を確認する。
test("constraint-starters-wire: README ja-en に wire の追記が流入していない（6.2）", () => {
  for (const name of ["README.md", "README.en.md"]) {
    const readme = read(path.join(ROOT, name));
    // wire 固有の蓄積語彙（個人台帳ファイル名）が README に持ち込まれていない。
    assert.ok(!/constraint-library\.md/.test(readme),
      `${name}: wire の個人台帳参照が README に流入していない（README 不触）`);
  }
});
