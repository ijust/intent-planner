import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const RULE_PATHS = ["claude", "codex"].map((agent) => path.join(
  ROOT,
  "templates",
  "ja",
  agent,
  "skills",
  "intent-discover",
  "rules",
  "role-perspective-review.md",
));

function readRule(file) {
  assert.ok(fs.existsSync(file), `日本語の観点別レビュールールが存在する: ${file}`);
  return fs.readFileSync(file, "utf8");
}

function productAndExperienceErrors(text) {
  const checks = [
    [/解決する問題と、その判断を支える根拠/, "製品: 解決する問題と根拠"],
    [/対象者、利用状況、現在の代替手段/, "製品: 対象者・利用状況・現在の代替手段"],
    [/提供価値と、価値が出たことの見分け方/, "製品: 提供価値と成功の見分け方"],
    [/優先順位、今回の範囲、範囲外、選択に伴う得失/, "製品: 優先順位・範囲・範囲外・得失"],
    [/根拠がなければ[\s\S]*未確認[\s\S]*調査済みの事実として扱わない/, "製品: 根拠なしを未確認に戻す"],
    [/利用前から利用後までの主要な流れと、利用者との接点/, "利用体験: 利用前後の流れと接点"],
    [/利用者から見える部分と、それを支える裏側の作業や仕組み/, "利用体験: 見える部分と裏側"],
    [/待ち時間、引き継ぎ、失敗、離脱、再開/, "利用体験: 待ち・引き継ぎ・失敗・離脱・再開"],
    [/アクセシビリティ、利用者への文言、トーン/, "利用体験: アクセシビリティ・文言・トーン"],
    [/案件に関係のない観点は `非該当` として閉じ、その観点の質問を追加しない/, "非該当の観点を閉じて質問しない"],
    [/この3観点は例であり、固定された全職種一覧ではない[\s\S]*別の専門観点/, "3観点を閉じた値域にしない"],
    [/特定のサービスデザイン手法を採用しなくても、接点、失敗、裏側の支援を省略しない/, "特定手法なしでも必要論点を保つ"],
    [/画面の情報の優先順位、画面間の移動、レイアウト、見た目の方向はこの規則で確定しない/, "画面設計を確定対象にしない"],
  ];
  return checks.filter(([pattern]) => !pattern.test(text)).map(([, label]) => label);
}

const DELIVERY_TRIGGERS = [
  "複数人",
  "複数の作業線",
  "外部依存",
  "期限",
  "承認",
  "引き継ぎ",
  "リリース調整",
];

function deliveryTriggerRows(text) {
  return new Map([...text.matchAll(/^\| (複数人|複数の作業線|外部依存|期限|承認|引き継ぎ|リリース調整) \| ([^|]+) \| `発火` \|$/gm)]
    .map((match) => [match[1], match[2].trim()]));
}

function deliveryErrors(text) {
  const rows = deliveryTriggerRows(text);
  const checks = [
    [DELIVERY_TRIGGERS.every((trigger) => rows.get(trigger) === "この条件だけでも対象"), "7条件を独立したOR条件として定義する"],
    [/条件は OR で判定し、一つでもあれば進行を管理する観点を発火する/, "一条件だけでも発火する"],
    [/単独開発でも、上の条件が一つでもあれば発火する/, "単独開発でも条件付きで発火する"],
    [/7条件がすべてないことを確認できた場合は `非該当` として閉じ、進行を管理する観点からの質問を追加しない/, "全条件なしは非該当かつ質問ゼロ"],
    [/条件の有無を材料から判断できない場合は、発火にも非該当にもせず、「進行を管理する観点が必要か」を一つだけ `未確認` の論点にする/, "曖昧なら適用可否を未確認一件にする"],
    [/判断する役割、作業と判断の依存関係、実施順、承認点/, "判断役割・依存・順序・承認点"],
    [/引き継ぎ、既知のリスク、代替手段、リリース条件、切り戻し/, "引き継ぎ・リスク・代替・リリース・切り戻し"],
    [/判断する役割が不明[^]*循環する依存関係[^]*承認待ち[^]*切り戻しが未定/, "代表的な未解決状態"],
    [/日付を確約しない[^]*ガントチャート[^]*ベロシティ[^]*稼働管理[^]*数値による優先順位の自動計算/, "進行管理機能へ広げない"],
  ];
  return checks
    .filter(([check]) => check instanceof RegExp ? !check.test(text) : !check)
    .map(([, label]) => label);
}

function deliveryApplicability(text, presentTriggers) {
  if (presentTriggers === null) {
    return /一つだけ `未確認` の論点にする/.test(text)
      ? { state: "未確認", questions: 1 }
      : { state: "不定", questions: Number.NaN };
  }
  const rows = deliveryTriggerRows(text);
  if (presentTriggers.some((trigger) => rows.get(trigger) === "この条件だけでも対象")) {
    return { state: "発火", questions: null };
  }
  return /`非該当` として閉じ、進行を管理する観点からの質問を追加しない/.test(text)
    ? { state: "非該当", questions: 0 }
    : { state: "不定", questions: Number.NaN };
}

test("Task 1.1: 日本語の製品・利用体験レビュー契約をClaude/Codexへ同じ内容で配布する", () => {
  const [claude, codex] = RULE_PATHS.map(readRule);
  assert.equal(claude, codex, "日本語のClaude用とCodex用がバイト一致する");
  assert.deepEqual(productAndExperienceErrors(claude), []);
});

test("Task 1.1: 必須論点と禁止境界を削る変異を拒否する", () => {
  const baseline = readRule(RULE_PATHS[0]);
  const mutations = [
    ["解決する問題と、その判断を支える根拠", "解決する問題"],
    ["待ち時間、引き継ぎ、失敗、離脱、再開", "通常時の流れ"],
    ["案件に関係のない観点は `非該当` として閉じ、その観点の質問を追加しない", "案件に関係のない観点も質問する"],
    ["この3観点は例であり、固定された全職種一覧ではない", "この3観点だけを使う"],
    ["特定のサービスデザイン手法を採用しなくても、接点、失敗、裏側の支援を省略しない", "採用した手法の項目だけを確認する"],
    ["画面の情報の優先順位、画面間の移動、レイアウト、見た目の方向はこの規則で確定しない", "画面設計もこの規則で確定する"],
  ];

  assert.deepEqual(productAndExperienceErrors(baseline), [], "基準ルールは全契約を満たす");
  for (const [before, after] of mutations) {
    assert.ok(baseline.includes(before), `変異対象が基準ルールに存在する: ${before}`);
    const mutated = baseline.replace(before, after);
    assert.notEqual(mutated, baseline, `変異が適用される: ${before}`);
    assert.notDeepEqual(productAndExperienceErrors(mutated), [], `意味を削る変異を拒否する: ${before}`);
  }
});

test("Task 1.2: 7つの進行条件をそれぞれ単独の発火条件として扱う", () => {
  const baseline = readRule(RULE_PATHS[0]);
  const rows = deliveryTriggerRows(baseline);

  assert.deepEqual(deliveryErrors(baseline), []);
  for (const trigger of DELIVERY_TRIGGERS) {
    assert.equal(rows.get(trigger), "この条件だけでも対象", `${trigger}だけで発火する`);
    assert.deepEqual(deliveryApplicability(baseline, [trigger]), { state: "発火", questions: null }, `単独開発で${trigger}だけでも発火する`);
  }
  assert.match(baseline, /単独開発でも、上の条件が一つでもあれば発火する/);
});

test("Task 1.2: 非発火・適用未確認と必要な進行論点を区別する", () => {
  const baseline = readRule(RULE_PATHS[0]);
  assert.deepEqual(deliveryErrors(baseline), []);
  assert.deepEqual(deliveryApplicability(baseline, []), { state: "非該当", questions: 0 });
  assert.deepEqual(deliveryApplicability(baseline, null), { state: "未確認", questions: 1 });
  assert.match(baseline, /7条件がすべてないことを確認できた場合は `非該当` として閉じ、進行を管理する観点からの質問を追加しない/);
  assert.match(baseline, /一つだけ `未確認` の論点にする/);
});

test("Task 1.2: 発火・確認論点・禁止境界を削る変異を拒否する", () => {
  const baseline = readRule(RULE_PATHS[0]);
  const mutations = [
    ...DELIVERY_TRIGGERS.map((trigger) => [
      `| ${trigger} | この条件だけでも対象 | \`発火\` |`,
      `| ${trigger} | 他の条件がある場合だけ対象 | \`発火\` |`,
    ]),
    ["単独開発でも、上の条件が一つでもあれば発火する", "チーム開発の場合だけ発火する"],
    ["7条件がすべてないことを確認できた場合は `非該当` として閉じ、進行を管理する観点からの質問を追加しない", "条件がなくても質問する"],
    ["一つだけ `未確認` の論点にする", "複数の進行質問を追加する"],
    ["判断する役割、作業と判断の依存関係、実施順、承認点", "進捗だけ"],
    ["引き継ぎ、既知のリスク、代替手段、リリース条件、切り戻し", "リリース日だけ"],
    ["判断する役割が不明", "判断者を自動決定"],
    ["循環する依存関係", "依存関係"],
    ["承認待ち", "承認"],
    ["切り戻しが未定", "切り戻し"],
    ["日付を確約しない", "日付を確約する"],
    ["ガントチャート", "工程表"],
    ["ベロシティ", "開発速度"],
    ["稼働管理", "担当管理"],
    ["数値による優先順位の自動計算", "数値で優先順位を自動計算する"],
  ];

  assert.deepEqual(deliveryErrors(baseline), [], "基準ルールは進行契約を満たす");
  for (const [before, after] of mutations) {
    assert.ok(baseline.includes(before), `変異対象が基準ルールに存在する: ${before}`);
    const mutated = baseline.replace(before, after);
    assert.notEqual(mutated, baseline, `変異が適用される: ${before}`);
    assert.notDeepEqual(deliveryErrors(mutated), [], `進行契約を壊す変異を拒否する: ${before}`);
  }
});

function evidenceClasses(text) {
  const section = text.match(/## 担当者と根拠の扱い([\s\S]*?)(?=\n## )/)?.[1] ?? "";
  return [...section.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
}

function evidenceAndConflictErrors(text) {
  const checks = [
    [/担当者がいる観点では、その担当者へ必要な問いを直接示す/, "担当者がいれば直接問う"],
    [/担当者がいない観点では、AIがその観点を代行すると明示し、根拠を添えた暫定回答を示す/, "不在ならAI代行と根拠付き暫定回答"],
    [JSON.stringify(evidenceClasses(text)) === JSON.stringify(["確認済みの事実", "根拠付きの推測", "未確認", "非該当"]), "根拠区分は正確に4種類"],
    [/AIの暫定回答に示せる根拠がなければ `未確認` とし、確定事項にも `根拠付きの推測` にもしない/, "根拠なしAI回答は未確認"],
    [/市場調査、利用者インタビュー、利用データの解析を実施したと書かない/, "未実施の外部調査を偽らない"],
    [/人が確認した事実と決定は対応する L1–L3、根拠付きだが未承認の推測は Assumptions、後で確認する事項、不明、未解決の食い違いは Open Questions へ分ける/, "既存成果物への写像"],
    [/`非該当` は新しい成果物を作らず、対話内で閉じる/, "非該当は対話内で閉じる"],
    [/共有の正本には判断が必要な役割だけを残し、個人名や担当者がいるかどうかは書かない/, "共有正本は判断役割だけ"],
    [/観点A、観点Aの判断、根拠Aと、観点B、観点Bの判断、根拠Bを別々に示す/, "食い違う両観点・判断・根拠を分離"],
    [/結論に必要な未確認事項と、判断が必要な役割または「判断する役割が未定」を示す/, "未確認事項と判断役割"],
    [/人の判断が得られる前に、一つの確定仕様へ自動統合しない/, "人の判断前の自動統合禁止"],
    [/重複排除するのは意味が同じ結論だけとし、異なる判断や根拠を重複として捨てない/, "同義結論だけ重複排除"],
  ];
  return checks
    .filter(([check]) => check instanceof RegExp ? !check.test(text) : !check)
    .map(([, label]) => label);
}

test("Task 1.3: 担当者の有無、根拠区分、既存成果物への行き先を区別する", () => {
  const baseline = readRule(RULE_PATHS[0]);
  assert.deepEqual(evidenceAndConflictErrors(baseline), []);
  assert.deepEqual(evidenceClasses(baseline), ["確認済みの事実", "根拠付きの推測", "未確認", "非該当"]);
});

test("Task 1.3: 食い違う観点を人の判断前に統合せず、同義結論だけをまとめる", () => {
  const baseline = readRule(RULE_PATHS[0]);
  assert.deepEqual(evidenceAndConflictErrors(baseline), []);
  assert.match(baseline, /観点A、観点Aの判断、根拠A/);
  assert.match(baseline, /観点B、観点Bの判断、根拠B/);
});

test("Task 1.3: 根拠と食い違いの境界を削除・反転する変異を拒否する", () => {
  const baseline = readRule(RULE_PATHS[0]);
  const mutations = [
    ["担当者がいる観点では、その担当者へ必要な問いを直接示す", "担当者がいてもAIが回答する"],
    ["担当者がいない観点では、AIがその観点を代行すると明示し、根拠を添えた暫定回答を示す", "担当者がいなければ確定回答を示す"],
    ["| `確認済みの事実` |", "| `推測` |"],
    ["| `根拠付きの推測` |", "| `推測` |"],
    ["| `未確認` |", "| `確認済み` |"],
    ["| `非該当` |", "| `対象外候補` |"],
    ["AIの暫定回答に示せる根拠がなければ `未確認` とし、確定事項にも `根拠付きの推測` にもしない", "根拠がなくても確定事項にする"],
    ["市場調査、利用者インタビュー、利用データの解析を実施したと書かない", "市場調査を実施したと書く"],
    ["人が確認した事実と決定は対応する L1–L3、根拠付きだが未承認の推測は Assumptions、後で確認する事項、不明、未解決の食い違いは Open Questions へ分ける", "すべて L1–L3 へ書く"],
    ["`非該当` は新しい成果物を作らず、対話内で閉じる", "`非該当` も新しい成果物へ保存する"],
    ["共有の正本には判断が必要な役割だけを残し、個人名や担当者がいるかどうかは書かない", "共有の正本に個人名と担当者の在否を書く"],
    ["観点A、観点Aの判断、根拠Aと、観点B、観点Bの判断、根拠Bを別々に示す", "一つの判断だけを示す"],
    ["結論に必要な未確認事項と、判断が必要な役割または「判断する役割が未定」を示す", "未確認事項と判断役割を省略する"],
    ["人の判断が得られる前に、一つの確定仕様へ自動統合しない", "人の判断前に一つの確定仕様へ自動統合する"],
    ["重複排除するのは意味が同じ結論だけとし、異なる判断や根拠を重複として捨てない", "異なる判断も重複として捨てる"],
  ];

  assert.deepEqual(evidenceAndConflictErrors(baseline), [], "基準ルールは根拠・食い違い契約を満たす");
  for (const [before, after] of mutations) {
    assert.ok(baseline.includes(before), `変異対象が基準ルールに存在する: ${before}`);
    const mutated = baseline.replace(before, after);
    assert.notEqual(mutated, baseline, `変異が適用される: ${before}`);
    assert.notDeepEqual(evidenceAndConflictErrors(mutated), [], `契約を壊す変異を拒否する: ${before}`);
  }
});
