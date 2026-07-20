// 質問の確認範囲と終了条件（pkt-20260720-質問の確認範囲と終了条件をintent-planning全工程へ適用する-wsq5）の判別テスト。
// 固定質問数やモデルの感覚ではなく、対象×観点、選んだ深さ、確認状態から質問の継続と終了を決めることを検査する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const VARIANTS = [
  ["ja", "claude"],
  ["ja", "codex"],
  ["en", "claude"],
  ["en", "codex"],
];

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function skill(lang, agent, relative) {
  return read(path.join("templates", lang, agent, "skills", relative));
}

test("共通契約が質問数でなく対象×観点と状態で終了を決める", () => {
  const ja = read(".agents/skills/CONTRACT.md");
  assert.match(ja, /## 質問の確認範囲と終了条件/);
  assert.match(ja, /確認対象.*確認観点/s);
  for (const state of ["回答済み", "今回の範囲外", "理由付きで後回し", "未確認"]) {
    assert.match(ja, new RegExp(state), `日本語契約: ${state}`);
  }
  assert.match(ja, /1回.*最大4問/);
  assert.match(ja, /案件全体.*(?:質問数|往復回数).*上限.*(?:しない|置かない)/s);
  assert.match(ja, /確定した.*残る.*(?:質問束|確認)/s);
  assert.match(ja, /目的.*利用者.*範囲.*成功条件.*守る約束.*全体構成.*後戻りしにくい判断/s);
  assert.match(ja, /主要機能.*振る舞い.*成立条件.*(?:境界例|エッジケース).*反例.*性能.*運用/s);
  assert.match(ja, /利用者が.*終了.*新しい質問.*(?:出さない|止める)/s);
  assert.match(ja, /重要.*未確認.*影響.*次工程.*(?:渡さない|止める)/s);
  assert.match(ja, /選んだ深さ.*読めた資料.*採用した観点/s);

  for (const [lang, agent] of VARIANTS) {
    const contract = skill(lang, agent, "CONTRACT.md");
    if (lang === "ja") {
      assert.match(contract, /## 質問の確認範囲と終了条件/);
      assert.match(contract, /1回.*最大4問/);
    } else {
      assert.match(contract, /## Question coverage and completion conditions/);
      assert.match(contract, /at most 4 questions per batch/i);
      assert.match(contract, /do not use.*total.*(?:question|round).*limit/is);
    }
  }
});

test("discover・compass・packetsが共通契約に工程固有の確認だけを追加する", () => {
  for (const [lang, agent] of VARIANTS) {
    const discover = skill(lang, agent, "intent-discover/rules/designer-questions.md");
    const compass = skill(lang, agent, "intent-compass/rules/algo-qoc.md");
    const packets = skill(lang, agent, "intent-packets/rules/decision-slots.md");

    if (lang === "ja") {
      assert.match(discover, /共通契約.*確認範囲/);
      assert.match(discover, /L0.*L1.*L2.*L3.*L4/s);
      assert.match(compass, /共通契約.*確認範囲/);
      assert.match(compass, /North Star.*Invariant.*Decision Rule.*Anti-direction/s);
      assert.match(packets, /共通契約.*確認範囲/);
      assert.match(packets, /decision slot.*Expected Behavior.*Validation/s);
      assert.doesNotMatch(discover, /(?:1回|1バッチ).*最大4問/);
      assert.doesNotMatch(compass, /(?:1回|1バッチ).*最大4問/);
      assert.doesNotMatch(packets, /(?:1回|1バッチ).*最大4問/);
    } else {
      assert.match(discover, /shared contract.*question coverage/i);
      assert.match(discover, /L0.*L1.*L2.*L3.*L4/s);
      assert.match(compass, /shared contract.*question coverage/i);
      assert.match(compass, /North Star.*Invariant.*Decision Rule.*Anti-direction/s);
      assert.match(packets, /shared contract.*question coverage/i);
      assert.match(packets, /decision slot.*Expected Behavior.*Validation/is);
      assert.doesNotMatch(discover, /at most 4 questions per batch/i);
      assert.doesNotMatch(compass, /at most 4 (?:questions )?per batch/i);
      assert.doesNotMatch(packets, /at most 4 (?:questions )?per batch/i);
    }
  }
});

test("packet固有の4状態を共通状態へ写し、未定とADR候補だけでreadyにしない", () => {
  for (const [lang, agent] of VARIANTS) {
    const packets = skill(lang, agent, "intent-packets/rules/decision-slots.md");
    if (lang === "ja") {
      assert.match(packets, /`未定`.*理由.*再確認条件.*影響しない根拠.*`理由付きで後回し`.*欠ければ.*`未確認`/s);
      assert.match(packets, /`ADR候補へ送る`.*解決.*反映.*`未確認`.*送ったこと自体では確認を閉じない/s);
      assert.match(packets, /ready 判定.*共通状態/s);
    } else {
      assert.match(packets, /`undetermined`.*`deferred with a reason`.*reason.*Revisit when.*non-impact.*missing.*`unconfirmed`/is);
      assert.match(packets, /`send to ADR candidate`.*`unconfirmed`.*resolved.*reflected.*does not close/is);
      assert.match(packets, /packet readiness.*mapped shared state/is);
    }
  }
});

test("Open Questionsへの記録は重要未確認の影響枝を進める許可にしない", () => {
  for (const [lang, agent] of VARIANTS) {
    const discover = skill(lang, agent, "intent-discover/rules/designer-questions.md");
    const deep = discover.match(/^6\.6\.[\s\S]*?(?=^7\.)/m)?.[0] ?? "";
    if (lang === "ja") {
      assert.match(deep, /記録しただけで未確認を解決扱いにせず.*重要な未確認事項が影響する枝は止め.*影響しない.*枝だけ planning を続ける/s);
      assert.doesNotMatch(deep, /Open Questions[^\n]*planning は止めない/);
    } else {
      assert.match(deep, /Recording an item does not resolve it.*stop branches affected by an important unconfirmed concern.*continue planning only branches shown to be unaffected/is);
      assert.doesNotMatch(deep, /Open Questions[^\n]*Do not stop planning/i);
    }
  }
});

test("designer-questions=offではdeepと追加質問の工程を発火しない", () => {
  for (const [lang, agent] of VARIANTS) {
    const discover = skill(lang, agent, "intent-discover/rules/designer-questions.md");
    if (lang === "ja") {
      assert.match(discover, /designer-questions.*off[\s\S]*手順 6\.6.*発火しない/);
      assert.match(discover, /off.*question-depth=deep[\s\S]*(?:発火しない|参照しない)/s);
    } else {
      assert.match(discover, /When designer-questions is off[\s\S]*step 6\.6.*do not fire/i);
      assert.match(discover, /off[\s\S]*question-depth=deep[\s\S]*(?:neither confirmed nor fired|not consulted)/i);
    }
  }
});

test("対象rulesは配布テンプレートとdogfoodでbyte一致する", () => {
  const rules = [
    "intent-discover/rules/designer-questions.md",
    "intent-compass/rules/algo-qoc.md",
    "intent-packets/rules/decision-slots.md",
  ];
  for (const rule of rules) {
    const jaClaude = skill("ja", "claude", rule);
    const jaCodex = skill("ja", "codex", rule);
    const enClaude = skill("en", "claude", rule);
    const enCodex = skill("en", "codex", rule);
    assert.equal(jaClaude, jaCodex, `${rule}: 日本語テンプレート`);
    assert.equal(enClaude, enCodex, `${rule}: 英語テンプレート`);
    assert.equal(read(path.join(".claude/skills", rule)), jaClaude, `${rule}: Claude dogfood`);
    assert.equal(read(path.join(".agents/skills", rule)), jaCodex, `${rule}: Codex dogfood`);
    for (const [lang, agent] of VARIANTS) {
      assert.equal(
        skill(lang, agent, path.join("intent-plan/generated/sources", rule)),
        skill(lang, agent, rule),
        `${rule}: ${lang}/${agent} intent-plan generated`,
      );
    }
    assert.equal(
      read(path.join(".claude/skills/intent-plan/generated/sources", rule)),
      jaClaude,
      `${rule}: Claude generated dogfood`,
    );
    assert.equal(
      read(path.join(".agents/skills/intent-plan/generated/sources", rule)),
      jaCodex,
      `${rule}: Codex generated dogfood`,
    );
  }
});

test("intent-planが各工程の確認完了を質問の往復数から推測しない", () => {
  const dogfood = read(".agents/skills/intent-plan/SKILL.md");
  assert.match(dogfood, /質問の確認範囲と終了条件/);
  assert.match(dogfood, /各工程.*完了.*固定.*(?:質問数|往復回数)/s);
  assert.match(dogfood, /確定した内容.*残る内容/s);

  for (const [lang, agent] of VARIANTS) {
    const plan = skill(lang, agent, "intent-plan/SKILL.md");
    if (lang === "ja") {
      assert.match(plan, /質問の確認範囲と終了条件/);
    } else {
      assert.match(plan, /question coverage and completion conditions/i);
    }
  }
});

test("一度だけの確認手順は確認事項の発見元であり全体の終了条件ではない", () => {
  const files = [
    ".agents/skills/intent-discover/rules/designer-questions.md",
    ".agents/skills/intent-discover/rules/question-pack-surfacing.md",
    ".agents/skills/intent-discover/rules/design-frame-surfacing.md",
    ".agents/skills/intent-discover/rules/role-perspective-review.md",
  ];
  for (const file of files) {
    const content = read(file);
    assert.match(content, /共通.*未確認|共通契約.*確認範囲/s, `${file}: 共通の確認範囲へ接続`);
    assert.match(content, /終了条件.*(?:しない|ではない)|全体.*完了.*(?:しない|扱わない)/s,
      `${file}: 一度きりの手順を全体完了にしない`);
  }
});

test("4段階の依頼例が固定質問表でなく段階的な確認量を判別する", () => {
  const fixture = read("test/fixtures/question-completion-condition/cases.md");
  const rows = fixture.split("\n").filter((line) => /^\| (漠然とした依頼|意味の幅が広い機能名|具体例はあるが[^|]*|細部修正) /.test(line));
  assert.equal(rows.length, 4);
  assert.match(fixture, /固定質問表ではない/);
  assert.match(fixture, /最初の4問だけで計画へ進む/);
  assert.match(fixture, /機能名から典型仕様を補完せず/);
  assert.match(fixture, /共通点、例外、優先関係/);
  assert.match(fixture, /質問0件/);
  assert.match(fixture, /重要な未確認事項が影響する範囲は次工程へ渡さず/);
});

test("公開説明が可変の質問量を説明し、ルート文書は詳細を共通契約へ委譲する", () => {
  const guideJa = read("docs/guide.md");
  assert.match(guideJa, /standard.*目的.*利用者.*範囲.*成功条件/s);
  assert.match(guideJa, /deep.*成立条件.*反例.*性能.*運用/s);
  assert.match(guideJa, /質問数.*(?:固定|先に決め)/);

  const guideEn = read("docs/guide.en.md");
  assert.match(guideEn, /standard.*purpose.*target user.*scope.*success/is);
  assert.match(guideEn, /deep.*preconditions.*counterexamples.*performance.*operations/is);
  assert.match(guideEn, /number of questions.*(?:fixed|set in advance)/i);

  const rootDocs = [
    "AGENTS.md",
    "CLAUDE_intent.md",
    "templates/ja/agents/claude/CLAUDE_intent.md",
    "templates/ja/agents/codex/AGENTS.md",
    "templates/ja/agents/gemini/GEMINI_intent.md",
    "templates/en/agents/claude/CLAUDE_intent.md",
    "templates/en/agents/codex/AGENTS.md",
    "templates/en/agents/gemini/GEMINI_intent.md",
  ];
  for (const file of rootDocs) {
    const content = read(file);
    assert.match(
      content,
      /共通契約.*質問内容の最低品質.*質問の確認範囲と終了条件|Minimum quality for question content.*Question coverage and completion conditions.*common contract/is,
      `${file}: 質問の詳細を共通契約へ委譲する合図`,
    );
    assert.doesNotMatch(
      content,
      /質問を出すときは1回最大4問|Ask at most 4 questions per batch/i,
      `${file}: 共通契約の具体的な上限を常時層へ重複しない`,
    );
  }
});
