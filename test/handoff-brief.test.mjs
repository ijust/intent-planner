// handoff-brief (C-hb2 / INV82 / DR142 / DR144) の判別検証。
//
// 判別オラクル（誤った実装を落とす対比）:
//   (a) rules: intent-overview に handoff-brief.md が全系統＋dogfood に実在（4系統＋dogfood）
//   (b) 6要素: rules が6要素の見出しを列挙している（現在地/残タスク/pull ポインタ/罠/repo 状態/実走オラクル）
//   (c) 派生の注記必須: 「生成時点」と「正本が常に勝つ／派生であって正本ではない」の必須が定義（INV82-(1)）
//   (d) 会話ログ非読取: 「会話ログを読まない・トークンを測らない」の規律が明記（Anti 433・層の分離）
//   (e) 書き出し先: `.intent/handoff/`（git 非追跡）で、canonical へ書かない
//   (f) SKILL 結線: overview SKILL がトリガと委譲行を持つ（4系統＋dogfood）
//   (g) installer: `.intent/handoff/*` gitignore パターンと README 再包含がある
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planGitignore } from "../src/install.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const read = (p) => fs.readFileSync(p, "utf8");

const SYSTEMS = [
  [".claude", null], // dogfood
  ["templates/ja/claude", "ja"],
  ["templates/ja/codex", "ja"],
  ["templates/en/claude", "en"],
  ["templates/en/codex", "en"],
];

// ---- (a)(b)(c)(d)(e) rules ファイルの実在と規律 ----
const RULE_CHECKS = {
  ja: {
    sixElements: [/現在地/, /残タスク/, /pull ポインタ/, /罠/, /repo 状態/, /実走オラクル/],
    canonicalWins: /正本が常に勝つ/,
    generationTime: /生成時点/,
    noConvLog: /会話ログ.*読まない|会話ログ・トークン計測を読まない/,
    handoffDir: /\.intent\/handoff\//,
  },
  en: {
    sixElements: [
      /[Ww]here we are/,
      /[Rr]emaining tasks/,
      /pull pointer/i,
      /[Tt]raps/,
      /[Rr]epo state/,
      /[Ll]ive-run oracle/,
    ],
    canonicalWins: /canonical source always wins/,
    generationTime: /generation time/i,
    noConvLog: /[Dd]o not read the conversation log/,
    handoffDir: /\.intent\/handoff\//,
  },
};

for (const [sys, lang] of SYSTEMS) {
  const effectiveLang = lang || "ja"; // dogfood は ja テキスト
  test(`handoff-brief rules: ${sys} に handoff-brief.md が実在し規律を満たす (C-hb2/INV82)`, () => {
    const p = path.join(REPO_ROOT, sys, "skills", "intent-overview", "rules", "handoff-brief.md");
    assert.ok(fs.existsSync(p), `${sys}: handoff-brief.md が実在する`);
    const c = read(p);
    const checks = RULE_CHECKS[effectiveLang];
    for (const rx of checks.sixElements) {
      assert.match(c, rx, `${sys}: 6要素の見出し ${rx} がある`);
    }
    assert.match(c, checks.canonicalWins, `${sys}: 「正本が常に勝つ」の注記必須 (INV82-(1))`);
    assert.match(c, checks.generationTime, `${sys}: 生成時点の明記必須`);
    assert.match(c, checks.noConvLog, `${sys}: 会話ログを読まない規律 (Anti 433)`);
    assert.match(c, checks.handoffDir, `${sys}: 書き出し先 .intent/handoff/`);
    // canonical へ書かない（tree/compass/packets を書き換えない旨）。
    assert.ok(
      /canonical/i.test(c),
      `${sys}: canonical を書き換えない旨がある`,
    );
  });
}

// ---- (f) overview SKILL がトリガと委譲行を持つ（4系統＋dogfood） ----
for (const [sys, lang] of SYSTEMS) {
  const effectiveLang = lang || "ja";
  test(`handoff-brief SKILL 結線: ${sys} の overview SKILL が handoff-brief を委譲する`, () => {
    const p = path.join(REPO_ROOT, sys, "skills", "intent-overview", "SKILL.md");
    const c = read(p);
    assert.match(c, /rules\/handoff-brief\.md/, `${sys}: handoff-brief.md への委譲行がある`);
    const trigger = effectiveLang === "ja" ? /引き継ぎブリーフ/ : /handoff brief/;
    assert.match(c, trigger, `${sys}: 引き継ぎブリーフのトリガ語がある`);
  });
}

// ---- (g) installer: .intent/handoff/* gitignore パターンと README 再包含 ----
test("handoff-brief installer: .intent/handoff/* が gitignore ブロックに含まれ README 再包含がある (INV82・DR142)", () => {
  const tmp = fs.mkdtempSync(path.join(REPO_ROOT, ".tmp-handoff-test-"));
  try {
    fs.mkdirSync(path.join(tmp, ".git"));
    const plan = planGitignore(tmp);
    assert.equal(plan.action, "create", ".gitignore 不在なので create");
    assert.ok(
      plan.blockLines.includes(".intent/handoff/*"),
      "blockLines に .intent/handoff/* が含まれる",
    );
    assert.ok(
      plan.blockLines.includes("!.intent/handoff/README.md"),
      "blockLines に !.intent/handoff/README.md が含まれる (README 再包含)",
    );
    assert.ok(
      plan.blockLines.indexOf(".intent/handoff/*") <
        plan.blockLines.indexOf("!.intent/handoff/README.md"),
      "除外が再包含より先に並ぶ",
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ---- scaffold README が ja/en に実在（配布される・追跡マーカー） ----
for (const lang of ["ja", "en"]) {
  test(`handoff-brief scaffold: ${lang}/intent/handoff/README.md が実在する (追跡マーカー)`, () => {
    const p = path.join(TEMPLATES, lang, "intent", "handoff", "README.md");
    assert.ok(fs.existsSync(p), `${lang}: handoff/README.md が実在する`);
  });
}
