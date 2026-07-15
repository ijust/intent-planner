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
