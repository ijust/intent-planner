// pkt-20260704-firing-substrate-authoring-q1po（A40 スコープ拡大・DR83①/DR84/DR74）の構造オラクル。
//
// 背景: 定石カタログ・個人台帳の発火点を5宿主へ広げるにあたり、その共通基盤として
//   「採否記録の器（constraint-ledger.md）」を発行ディレクトリに設け、packets 起草（decision-probe）と
//   DB 設計局面（db-design-input）で同梱定石も照合する結線を足した。既存の constraint-surfacing.test は
//   個人台帳のみ・器を知らないため、この結線が外れても既存テストは green のまま漏れる。ここでは
//   「①decision-probe が同梱カタログを証拠源に加える ②器の読み書き（採否記録・再提示抑止・文脈変化復活）が
//   明示される ③db-design 局面でデータ層定石を照合する ④器の規約が discovery/README に載る」を
//   discriminative に名指しし、結線が外れたら RED になるようにする。
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

function probePath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-packets", "rules", "decision-probe.md");
}
function surfacingPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-compass", "rules", "constraint-surfacing.md");
}
function dbInputPath(lang, agent) {
  return path.join(ROOT, "templates", lang, agent, "skills", "intent-db-design", "rules", "db-design-input.md");
}
function discoveryReadmePath(lang) {
  return path.join(ROOT, "templates", lang, "intent", "discovery", "README.md");
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}

// ---- 1: decision-probe（宿主①）が同梱定石カタログを証拠源に加える ----
// A40 スコープ拡大の核: 現状 decision-probe は個人台帳の手段ベースのみ。同梱カタログ（starters）を
// 起草局面の証拠源に足すアンカーを名指しする。除去すると「compass 通過後カタログが二度と出ない」穴に戻る。
test("firing-substrate: decision-probe が同梱定石カタログを証拠源に加える（DR83①）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(probePath(lang, agent));
    assert.match(t, /constraint-starters\.md/, `${lang}/${agent}: 同梱カタログ constraint-starters.md を参照する`);
    // 関係領域だけ pull する（全領域ロードしない）。
    const domainPull = lang === "ja"
      ? /関係(しそうな)?(領域|する領域).*(だけ|のみ)|領域インデックス/s
      : /only the domain files that (plausibly )?relate|domain index/is;
    assert.match(t, domainPull, `${lang}/${agent}: 関係領域だけ pull する`);
    // DR83 宿主① への帰属。
    assert.match(t, /DR83/, `${lang}/${agent}: DR83（宿主拡張）へ帰属する`);
  }
});

// ---- 2: 採否記録の器（constraint-ledger）を読み書きし、再提示抑止＋文脈変化復活を明示する ----
// DR84 の核。器の読み込み・採否記録・再提示抑止・文脈変化でのみ復活（機械条件なし）を名指しする。
test("firing-substrate: decision-probe が採否記録の器を読み再提示抑止＋文脈変化復活を明示する（DR84）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(probePath(lang, agent));
    assert.match(t, /constraint-ledger\.md/, `${lang}/${agent}: 採否記録の器 constraint-ledger.md を読む`);
    // 採否済みは再提示しない。
    const suppress = lang === "ja"
      ? /採否.*(付いた|済み).*(再提示しない|再提示せず)/s
      : /(already )?(received a decision|decided).*(not resurface|do not resurface)/is;
    assert.match(t, suppress, `${lang}/${agent}: 採否済みは再提示しない`);
    // 文脈が変わったときのみ否認済みを戻す。
    const revive = lang === "ja"
      ? /(目的|文脈).*(変わった|変化).*(戻して|戻す|候補へ)/s
      : /(purpose|context).*(changed|change).*(return|back)/is;
    assert.match(t, revive, `${lang}/${agent}: 文脈変化時のみ否認済みを戻す`);
    // 機械条件を持たない（日数・回数なし）。
    const noMechanical = lang === "ja"
      ? /(機械条件を持たない|日数.*回数)/
      : /no numeric condition|days or counts/i;
    assert.match(t, noMechanical, `${lang}/${agent}: 機械条件を持たない（INV2）`);
  }
});

// ---- 3: constraint-surfacing（compass 接点）も器へ採否を記録する ----
test("firing-substrate: constraint-surfacing が採否を器へ記録し既存提示ロジックを変えない（DR84）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(surfacingPath(lang, agent));
    assert.match(t, /constraint-ledger\.md/, `${lang}/${agent}: 採否記録の器を参照する`);
    // 提示ロジックを変えず記録先を足すだけ。
    const additive = lang === "ja"
      ? /提示ロジックを変えず|記録先を1つ足す/
      : /without changing the surfacing logic|adds one recording destination/i;
    assert.match(t, additive, `${lang}/${agent}: 提示ロジックを変えず記録先を足すだけ`);
  }
});

// ---- 4: db-design 局面（DR74 第一候補）がデータ層定石を照合する ----
test("firing-substrate: db-design-input がデータ層定石を照合し射影を置き換えない（DR74/DR83）", () => {
  for (const [lang, agent] of VARIANTS) {
    const t = read(dbInputPath(lang, agent));
    // データ層カタログを参照する。
    assert.match(t, /constraint-starters/, `${lang}/${agent}: 定石カタログを参照する`);
    assert.match(t, /code-data/, `${lang}/${agent}: データ層定石 code-data を中心に照合する`);
    // 器を読む。
    assert.match(t, /constraint-ledger\.md/, `${lang}/${agent}: 採否記録の器を読む`);
    // 補助であって射影を置き換えない。
    const auxiliary = lang === "ja"
      ? /補助であって.*(置き換えない|射影)/s
      : /auxiliary and does not replace/i;
    assert.match(t, auxiliary, `${lang}/${agent}: 射影を置き換えない補助`);
  }
});

// ---- 5: 器の規約が discovery/README（ja/en）に載る（正本の所在）----
test("firing-substrate: 器の規約が discovery/README に明文化される（2水準・採否行常時/計器 off）", () => {
  for (const lang of ["ja", "en"]) {
    const t = read(discoveryReadmePath(lang));
    assert.match(t, /constraint-ledger\.md/, `${lang}: 器のファイル名を定義する`);
    // 2水準（採否行は常時・全提示痕跡は既定 off の計器）。
    const alwaysDecision = lang === "ja"
      ? /採否行.*常時/
      : /decision rows.*always/i;
    assert.match(t, alwaysDecision, `${lang}: 採否行は常時記録`);
    const instrumentOff = lang === "ja"
      ? /(既定 off|constraint-firing-trace)/
      : /(off by default|constraint-firing-trace)/i;
    assert.match(t, instrumentOff, `${lang}: 全提示痕跡は既定 off の計器`);
    // git 非追跡（共有物・canonical に書かない）。
    const untracked = lang === "ja"
      ? /git 非追跡/
      : /git-untracked/i;
    assert.match(t, untracked, `${lang}: 器は git 非追跡`);
  }
});

// ---- 5b: export 3出口の map rule が「関係定石（候補・未採用）」節を持つ（DR83②・DR85）----
// export-starter-attach: cc-sdd / openspec / speckit の下書き生成 rule に、関係定石を候補として
// 添付する独立節がある。参照方式（全文転記しない）・「候補であって要件ではない」明記・器の反映を
// 名指しする。3出口どれか1つでも節が欠けたら RED（⑥単体完結＝3出口すべてで節が出せる）。
const EXPORT_MAPS = [
  ["intent-export-cc-sdd", "map-cc-sdd.md"],
  ["intent-export-openspec", "map-openspec.md"],
  ["intent-export-speckit", "map-speckit.md"],
];
function mapPath(lang, agent, skill, file) {
  return path.join(ROOT, "templates", lang, agent, "skills", skill, "rules", file);
}

test("firing-substrate: export 3出口の map rule が関係定石の候補添付節を持つ（DR83②・DR85）", () => {
  for (const [lang, agent] of VARIANTS) {
    for (const [skill, file] of EXPORT_MAPS) {
      const t = read(mapPath(lang, agent, skill, file));
      // 「関係定石（候補・未採用）」節がある。
      const sectionHeading = lang === "ja"
        ? /関係定石（候補・未採用）/
        : /Related conventions \(candidates, not adopted\)/i;
      assert.match(t, sectionHeading, `${lang}/${agent}/${skill}: 候補添付節がある`);
      // 「候補であって要件ではない」明記。
      const notRequirement = lang === "ja"
        ? /候補であって要件ではない/
        : /candidates, not requirements/i;
      assert.match(t, notRequirement, `${lang}/${agent}/${skill}: 候補であって要件ではないと明記`);
      // 参照方式（全文転記しない）。
      const noFullTranscribe = lang === "ja"
        ? /全文転記しない/
        : /[Dd]o not transcribe the convention body in full/;
      assert.match(t, noFullTranscribe, `${lang}/${agent}/${skill}: 定石本文を全文転記しない`);
      // 器を反映する（採用済み・否認済みは載せない）。
      assert.match(t, /constraint-ledger\.md/, `${lang}/${agent}/${skill}: 採否記録の器を反映する`);
      // DR85 帰属。
      assert.match(t, /DR85/, `${lang}/${agent}/${skill}: DR85 へ帰属する`);
    }
  }
});

// ---- 5c: エージェント規約7ファイルに実装開始時の定石照合がある（DR83③・ゲート化しない）----
// impl-start-starter-probe: 実装タイミングの発火点ゼロを塞ぐ。pull 規律段に「実装前に定石を薄く照合・
// 合致なければ黙って進む・ゲート化しない」があるか、7ファイル（CLAUDE_intent/AGENTS/GEMINI × ja/en + dogfood）
// で名指しする。ゲート化禁止の明文を消す退化はこの検査で落ちる。
const AGENT_ROOTDOCS = [
  ["ja", path.join(ROOT, "templates", "ja", "agents", "claude", "CLAUDE_intent.md")],
  ["ja", path.join(ROOT, "templates", "ja", "agents", "codex", "AGENTS.md")],
  ["ja", path.join(ROOT, "templates", "ja", "agents", "gemini", "GEMINI_intent.md")],
  ["ja", path.join(ROOT, "CLAUDE_intent.md")], // dogfood
  ["en", path.join(ROOT, "templates", "en", "agents", "claude", "CLAUDE_intent.md")],
  ["en", path.join(ROOT, "templates", "en", "agents", "codex", "AGENTS.md")],
  ["en", path.join(ROOT, "templates", "en", "agents", "gemini", "GEMINI_intent.md")],
];

test("firing-substrate: エージェント規約に実装開始時の定石照合がある（DR83③・ゲート化しない）", () => {
  for (const [lang, p] of AGENT_ROOTDOCS) {
    assert.ok(fs.existsSync(p), `${p}: 存在する`);
    const t = read(p);
    // 定石カタログを実装前に薄く照合する。
    assert.match(t, /constraint-starters/, `${lang} ${path.basename(p)}: 実装前に定石を照合する`);
    // 合致なければ黙って実装へ進む。
    const silentProceed = lang === "ja"
      ? /合致がなければ黙って実装へ進む/
      : /[Ii]f there is no match, proceed to implementation silently/;
    assert.match(t, silentProceed, `${lang} ${path.basename(p)}: 合致なければ黙って進む`);
    // 実装のゲートにしない。
    const noGate = lang === "ja"
      ? /実装のゲートにしない/
      : /do not make the matching a gate/i;
    assert.match(t, noGate, `${lang} ${path.basename(p)}: 照合をゲート化しない`);
  }
});

// ---- 6: 4系統パリティ（claude ⇔ codex byte 等価）----
test("firing-substrate: 触った3 rule が claude⇔codex で byte 等価（4系統パリティ）", () => {
  for (const lang of ["ja", "en"]) {
    for (const rel of [
      ["intent-packets", "rules", "decision-probe.md"],
      ["intent-compass", "rules", "constraint-surfacing.md"],
      ["intent-db-design", "rules", "db-design-input.md"],
      ["intent-export-cc-sdd", "rules", "map-cc-sdd.md"],
      ["intent-export-openspec", "rules", "map-openspec.md"],
      ["intent-export-speckit", "rules", "map-speckit.md"],
    ]) {
      const claude = read(path.join(ROOT, "templates", lang, "claude", "skills", ...rel));
      const codex = read(path.join(ROOT, "templates", lang, "codex", "skills", ...rel));
      assert.equal(claude, codex, `${lang}: ${rel.join("/")} が claude⇔codex で byte 等価`);
    }
  }
});
