import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// ---- 契約意味の構造fixture: 乖離照合の運用形 ----
// declaration: { nature, sizeBand } | null / mode: off|warn|gate|undefined / signs: [{type, grounds}]
function runGapCheck(declaration, mode, signs, priorWarnings = []) {
  if (!declaration) return { checked: false, warnings: [], stopped: false };
  const effective = ["off", "warn", "gate"].includes(mode) ? mode : "warn";
  if (effective === "off") return { checked: false, warnings: [], stopped: false };
  const warnings = [];
  for (const sign of signs) {
    const dup = priorWarnings.concat(warnings).some((w) => w.grounds === sign.grounds);
    if (dup) continue;
    warnings.push({
      target: sign.target,
      grounds: sign.grounds,
      responses: ["continue", "shrink", "independent-review"],
      recommendIndependentReview: true,
    });
  }
  return {
    checked: true,
    warnings,
    stopped: effective === "gate" && warnings.length > 0,
    stopScope: effective === "gate" && warnings.length > 0 ? "affected-work-unit-only" : null,
    mutatedImplementation: false,
  };
}

function buildGapRecord(kind, note) {
  return {
    pattern: kind === "thin" ? "uncatalogued:declaration-gap-thin" : "uncatalogued:declaration-gap",
    stage: "export",
    packet: "pkt-example",
    mechanism: "declaration-gap",
    outcome: "caught",
    "user-verdict": "unjudged",
    recorded_at: "2026-07-23T00:00:00Z",
    commit: "-",
    note,
  };
}

const SIGN_TYPES = ["kind-not-declared", "size-band-exceeded", "thin-realization"];

test("the gap check stays silent without a declaration and follows the three-level strength", () => {
  const decl = { nature: "事前確認のみ", sizeBand: "小" };
  const sign = { type: "kind-not-declared", target: "契約", grounds: "宣言に無い送信・削除の詳細契約が増えた" };
  assert.deepEqual(runGapCheck(null, "warn", [sign]), { checked: false, warnings: [], stopped: false },
    "no declaration means no check and no output");
  assert.deepEqual(runGapCheck(decl, "off", [sign]), { checked: false, warnings: [], stopped: false },
    "off disables the check entirely");
  const warn = runGapCheck(decl, "warn", [sign]);
  assert.equal(warn.warnings.length, 1);
  assert.equal(warn.stopped, false, "warn never stops the implementation");
  assert.equal(warn.mutatedImplementation, false, "the check never modifies the implementation");
  const undefined_ = runGapCheck(decl, "unknown-value", [sign]);
  assert.equal(undefined_.warnings.length, 1, "unknown or absent strength falls back to warn");
  assert.equal(undefined_.stopped, false);
  const gate = runGapCheck(decl, "gate", [sign]);
  assert.equal(gate.stopped, true, "gate stops until the user responds");
  assert.equal(gate.stopScope, "affected-work-unit-only", "gate stops only the affected work unit");
});

test("warnings carry grounds and selectable responses, and the same grounds never warn twice", () => {
  const decl = { nature: "契約と検査", sizeBand: "小" };
  const sign = { type: "size-band-exceeded", target: "変更量", grounds: "宣言帯を大きく超える変更が継続" };
  const first = runGapCheck(decl, "warn", [sign]);
  assert.deepEqual(first.warnings[0].responses, ["continue", "shrink", "independent-review"]);
  assert.equal(first.warnings[0].recommendIndependentReview, true, "signs recommend an independent review");
  const second = runGapCheck(decl, "warn", [sign], first.warnings);
  assert.equal(second.warnings.length, 0, "the same grounds warn at most once per work unit");
  const both = runGapCheck(decl, "warn", [
    sign,
    { type: "thin-realization", target: "検査", grounds: "宣言した振る舞いに対して検査が薄い" },
  ], first.warnings);
  assert.equal(both.warnings.length, 1, "a different grounds may still warn");
});

test("gap records use the existing nine drift-log keys in fixed order", () => {
  const record = buildGapRecord("over", "実装段の乖離照合（作りすぎ側）");
  assert.deepEqual(Object.keys(record),
    ["pattern", "stage", "packet", "mechanism", "outcome", "user-verdict", "recorded_at", "commit", "note"],
    "exactly the nine keys in the fixed order");
  assert.equal(record.pattern, "uncatalogued:declaration-gap");
  assert.equal(buildGapRecord("thin", "n").pattern, "uncatalogued:declaration-gap-thin");
  assert.equal(record.stage, "export", "the existing three stage values are kept");
  assert.match(record.note, /実装段/, "the note marks this as an implementation-stage check");
});

test("the execution contract carries the gap-check section on all surfaces with the fixed semantics", () => {
  const surfaces = {
    ja: ["templates/ja/intent/execution-contract.md", ".intent/execution-contract.md"],
    en: ["templates/en/intent/execution-contract.md"],
  };
  assert.equal(read(".intent/execution-contract.md"), read("templates/ja/intent/execution-contract.md"),
    "dogfood execution contract equals the Japanese canonical template");
  for (const [lang, files] of Object.entries(surfaces)) {
    const body = read(files[0]);
    const anchors = lang === "ja" ? [
      /## 宣言と実装の乖離照合（oversize-guard）/,
      /節が無ければ何もしません/,
      /節目は2点/,
      /機械閾値・スコアを判定条件にしません/,
      /代表3型/,
      /同一根拠の再警告はしません（1作業単位1回まで）/,
      /`off`＝照合しない／`warn`（既定・未記載・不正値を含む）＝警告のみ/,
      /当該作業単位の実装だけを止める（他の作業単位・並行作業は止めない）/,
      /実装内容を自動で変更・削除・差し戻ししません/,
      /独立レビュー（subagent 等の別視点）を推奨します（必須にしません）/,
    ] : [
      /## Declaration-implementation gap check \(oversize-guard\)/,
      /without the section, do nothing/,
      /Two checkpoints/,
      /never act as mechanical thresholds or scores/,
      /Three representative signs/,
      /Never repeat a warning for the same grounds/,
      /`off` = no check; `warn` \(default, including absent or invalid values\) = warning only/,
      /stop only the implementation of the affected work unit until the user responds/,
      /never modify, delete, or revert the implementation automatically/,
      /Recommend an independent review .* never mandatory/,
    ];
    for (const anchor of anchors) assert.match(body, anchor, `${lang}: ${anchor}`);
  }
});

test("mode scaffold and dogfood carry the oversize-guard setting with warn default", () => {
  for (const rel of ["templates/ja/intent/mode.md", ".intent/mode.md"]) {
    const body = read(rel);
    assert.match(body, /## Oversize-guard（ユーザー管理）/, `${rel}: section exists`);
    assert.match(body, /- \*\*oversize-guard\*\*: warn/, `${rel}: default is warn`);
    assert.match(body, /`off` \| `warn` \| `gate`/, `${rel}: three levels`);
    assert.match(body, /「## 想定規模」の宣言が無ければ、値に関わらず何もしません/, `${rel}: silent without declaration`);
  }
  const en = read("templates/en/intent/mode.md");
  assert.match(en, /## Oversize-guard \(user managed\)/);
  assert.match(en, /- \*\*oversize-guard\*\*: warn/);
});

test("the packet format declares the optional expected-size section on all six rule surfaces", () => {
  const ja = [
    "templates/ja/claude/skills/intent-packets/rules/packet-format.md",
    "templates/ja/codex/skills/intent-packets/rules/packet-format.md",
    ".claude/skills/intent-packets/rules/packet-format.md",
    ".agents/skills/intent-packets/rules/packet-format.md",
  ];
  const en = [
    "templates/en/claude/skills/intent-packets/rules/packet-format.md",
    "templates/en/codex/skills/intent-packets/rules/packet-format.md",
  ];
  for (const rel of ja) {
    const body = read(rel);
    assert.match(body, /- `## 想定規模` — \*\*任意\*\*/, `${rel}: optional declaration`);
    assert.match(body, /節が無い packet では照合は行われない/, `${rel}: silent without the section`);
    assert.match(body, /必須化・既存 packet への遡及記入はしない/, `${rel}: never mandatory nor backfilled`);
  }
  for (const rel of en) {
    const body = read(rel);
    assert.match(body, /- `## Expected size` — \*\*Optional\*\*/, `${rel}: optional declaration`);
    assert.match(body, /Packets without the section are never checked/, `${rel}: silent without the section`);
  }
});

test("public documents mention the gap warning in one meaning-equivalent line", () => {
  for (const rel of ["README.md", "docs/theory.md", "docs/guide.md"]) {
    assert.match(read(rel), /想定規模を宣言しておくと.*1回だけ警告します/s, `${rel}: ja mention`);
  }
  for (const rel of ["README.en.md", "docs/theory.en.md", "docs/guide.en.md"]) {
    assert.match(read(rel), /declares its expected size.*warned exactly once/is, `${rel}: en mention`);
  }
});
