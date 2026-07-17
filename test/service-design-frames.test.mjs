import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { install } from "../src/install.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const LANGS = ["ja", "en"];
const EXPECTED_IDS = [
  "persona",
  "jobs-to-be-done",
  "customer-journey-map",
  "service-blueprint",
  "user-story-mapping",
];
const EXPECTED_DETAILS = {
  persona: {
    jaName: "ペルソナ",
    enName: "Persona",
    source: "https://www.nngroup.com/articles/persona/",
  },
  "jobs-to-be-done": {
    jaName: "Jobs to be Done（利用者が達成したいこと）",
    enName: "Jobs to Be Done",
    source: "https://www.christenseninstitute.org/theory/jobs-to-be-done/",
  },
  "customer-journey-map": {
    jaName: "カスタマージャーニーマップ",
    enName: "Customer Journey Map",
    source: "https://www.nngroup.com/articles/journey-mapping-101/",
  },
  "service-blueprint": {
    jaName: "サービスブループリント",
    enName: "Service Blueprint",
    source: "https://www.nngroup.com/articles/service-blueprints-definition/",
  },
  "user-story-mapping": {
    jaName: "ユーザーストーリーマッピング",
    enName: "User Story Mapping",
    source: "https://jpattonassociates.com/story-mapping/",
  },
};

const SERVICE_DESIGN_PACKAGE_BASELINE = {
  version: "0.22.0",
  dependencies: {
    "handoff-bridge": "0.1.3",
    "term-drift": "0.3.3",
  },
};

const SERVICE_DESIGN_ALLOWED_PATHS = [
  /^\.kiro\/specs\/intent-planner-service-design\/(?:design|requirements|research|tasks)\.md$/,
  /^\.kiro\/specs\/intent-planner-service-design\/spec\.json$/,
  /^templates\/(?:ja|en)\/intent\/(?:README\.md|design-frames\.md|constraint-starters\/code-frontend\.md)$/,
  /^templates\/(?:ja|en)\/(?:claude|codex)\/skills\/intent-discover\/rules\/(?:design-frame-surfacing|designer-questions)\.md$/,
  /^templates\/(?:ja|en)\/(?:claude|codex)\/skills\/intent-compass\/rules\/algo-qoc\.md$/,
  /^(?:README(?:\.en)?\.md|docs\/(?:guide|theory)(?:\.en)?\.md)$/,
  /^test\/(?:service-design-frames|role-lens|decision-lifecycle-relevance|plainness-injection)\.test\.mjs$/,
  /^test\/golden-locks\.manifest\.json$/,
];

const SERVICE_DESIGN_DOGFOOD_ARTIFACTS = [
  ".intent/design-frames.md",
  ".intent/nl-spec/design-frame-persona.md",
  ".claude/skills/intent-discover/rules/design-frame-surfacing.md",
  ".agents/skills/intent-discover/rules/design-frame-surfacing.md",
  ".kiro/steering/service-design.md",
  ".kiro/steering/experience-design.md",
];

function packageBoundaryErrors(packageJson) {
  const errors = [];
  if (packageJson.version !== SERVICE_DESIGN_PACKAGE_BASELINE.version) {
    errors.push(`version changed: ${packageJson.version}`);
  }
  if (JSON.stringify(packageJson.dependencies) !== JSON.stringify(SERVICE_DESIGN_PACKAGE_BASELINE.dependencies)) {
    errors.push("dependencies changed");
  }
  return errors;
}

function serviceDesignCommitPaths() {
  const hashes = execFileSync(
    "git",
    ["log", "--format=%H", "--fixed-strings", "--grep=intent-planner-service-design"],
    { cwd: ROOT, encoding: "utf8" },
  ).trim().split("\n").filter(Boolean);
  return [...new Set(hashes.flatMap((hash) => execFileSync(
    "git",
    ["diff-tree", "--no-commit-id", "--name-only", "-r", hash],
    { cwd: ROOT, encoding: "utf8" },
  ).trim().split("\n").filter(Boolean)))];
}

function featureChangeBoundaryErrors(changedPaths = serviceDesignCommitPaths()) {
  return changedPaths
    .filter((file) => !SERVICE_DESIGN_ALLOWED_PATHS.some((pattern) => pattern.test(file)))
    .map((file) => `out-of-bound feature change: ${file}`);
}

function featureArtifactBoundaryErrors(exists = (file) => fs.existsSync(path.join(ROOT, file))) {
  return SERVICE_DESIGN_DOGFOOD_ARTIFACTS
    .filter((file) => exists(file))
    .map((file) => `out-of-bound artifact exists: ${file}`);
}

const PRESERVED_FRONTEND_STARTER_HASHES = {
  ja: {
    "accessibility-wcag": "1233730dd8e73e0350cc8b4e178369d5307cbdcba4e9d2f5ee4c5acb55c1700e",
    "ui-non-happy-states": "342426d3eeb25a9ae41b451e8fb15d1df4d5ab035cf0e74b9e46b2c93e34dbfe",
    "system-status-feedback": "fbcda56c2ab514f74c83f38338b6adf74b1e48dac4248a3bc20c027c68c063e1",
  },
  en: {
    "accessibility-wcag": "a6c67e8e7975ea91ff3b39372f379582cbcc2be9940447c949360a24929a018a",
    "ui-non-happy-states": "d54241b624f02c3eab3bfe7bf33e555063946810cd241fd6b078a29b383d781d",
    "system-status-feedback": "55a9a4f3e8972949a27823952b115d2a9cfa3eb9bdc065df3b84d0c1c57841a7",
  },
};

function catalogPath(lang) {
  return path.join(ROOT, "templates", lang, "intent", "design-frames.md");
}

function readCatalog(lang) {
  return fs.readFileSync(catalogPath(lang), "utf8");
}

function entries(text) {
  return text
    .split(/^## id:\s*/m)
    .slice(1)
    .map((block) => {
      const newline = block.indexOf("\n");
      return { id: block.slice(0, newline).trim(), body: block.slice(newline + 1) };
    });
}

function frontendStarterPath(lang) {
  return path.join(ROOT, "templates", lang, "intent", "constraint-starters", "code-frontend.md");
}

function frontendStarterEntries(lang) {
  const text = fs.readFileSync(frontendStarterPath(lang), "utf8");
  return [...text.matchAll(/^## id: ([^\n]+)\n\n([\s\S]*?)(?=\n## id: |(?![\s\S]))/gm)].map((match) => ({
    id: match[1],
    raw: match[0],
    body: match[2],
  }));
}

function qocRulePath(lang, agent) {
  return path.join(
    ROOT,
    "templates",
    lang,
    agent,
    "skills",
    "intent-compass",
    "rules",
    "algo-qoc.md",
  );
}

const PRESERVED_QOC_CATEGORIES = {
  ja: [
    "データ / 個人情報（PII）",
    "外部依存・既存契約",
    "運用・障害時挙動",
    "セキュリティ / プライバシー / 法令",
    "性能 / 可用性",
    "技術的制約",
    "不変条件・禁止事項",
  ],
  en: [
    "Data / personal information (PII)",
    "External dependencies / existing contracts",
    "Operations / failure-mode behavior",
    "Security / privacy / legal",
    "Performance / availability",
    "Technical constraints",
    "Invariants / prohibitions",
  ],
};

function qocCategoryLines(text) {
  return [...text.matchAll(/^\s{5}(\d+)\. (.+?)(?: — |— )/gm)].map((match) => ({
    number: Number(match[1]),
    label: match[2].trim(),
  }));
}

function experiencePromiseErrors(text, lang) {
  const start = text.search(lang === "ja" ? /^\s*8\. 体験の約束/m : /^\s*8\. Experience promise/m);
  const end = text.search(lang === "ja" ? /^\s*- 各カテゴリの例示/m : /^\s*- For each category/m);
  const section = start >= 0 && end > start ? text.slice(start, end) : "";
  const patterns = lang === "ja"
    ? [
        [/^\s*8\. 体験の約束 —/m, "独立した8番目のカテゴリがある"],
        [/トーンと文体[\s\S]*アクセシビリティ[\s\S]*エラー時の姿勢[\s\S]*体感速度と(?:処理中の)?状態提示/, "4観点を扱う"],
        [/体験の約束[\s\S]*失敗前提/, "失敗前提で問う"],
        [/案件文脈[\s\S]*性質の異なる[\s\S]*弱い例[\s\S]*2〜3/, "文脈由来の弱い例を2〜3件生成する"],
        [/網羅ではない/, "例は非網羅と明記する"],
        [/該当なし／不明／後で確認[\s\S]*回答を強制しない/, "回答を強制しない"],
        [/accessibility-wcag[\s\S]*ui-non-happy-states[\s\S]*system-status-feedback[\s\S]*experience-language-recovery[\s\S]*read-only[\s\S]*重複/, "既存4定石をread-only照合して重複を避ける"],
        [/人が採用した内容だけ[\s\S]*拘束力分類契約/, "採用内容だけを既存分類へ送る"],
        [/不採用[\s\S]*保留[\s\S]*Preference[\s\S]*プロジェクト普遍[\s\S]*Invariant[\s\S]*自動昇格しない/, "不採用・保留・好みを普遍Invariantへ自動昇格しない"],
        [/体験の約束[\s\S]*ロールレンズ/, "既存ロールレンズ経路を使う"],
      ]
    : [
        [/^\s*8\. Experience promise —/m, "has an independent eighth category"],
        [/tone and voice[\s\S]*accessibility[\s\S]*stance during errors[\s\S]*perceived speed and processing-state feedback/i, "covers four perspectives"],
        [/Experience promise[\s\S]*failure premise/i, "asks from a failure premise"],
        [/case context[\s\S]*2–3[\s\S]*weak cues[\s\S]*differing nature/i, "generates 2-3 contextual weak cues"],
        [/not exhaustive/i, "marks examples non-exhaustive"],
        [/not applicable \/ unknown \/ confirm later[\s\S]*do not force/i, "does not force an answer"],
        [/accessibility-wcag[\s\S]*ui-non-happy-states[\s\S]*system-status-feedback[\s\S]*experience-language-recovery[\s\S]*read-only[\s\S]*duplicat/i, "cross-checks four existing starters read-only"],
        [/only content the human adopts[\s\S]*Binding classification contract/i, "sends only adopted content to existing classification"],
        [/do not automatically promote declined[\s\S]*deferred[\s\S]*Preference[\s\S]*project-universal[\s\S]*Invariant/i, "does not auto-promote declined/deferred/preferences"],
        [/Experience promise[\s\S]*role lens/i, "uses the existing role-lens route"],
      ];

  return patterns.filter(([pattern]) => !pattern.test(section)).map(([, message]) => message);
}

test("ExperiencePromiseCategory: 既存7カテゴリを保ち独立した8番目の体験の約束を4面に追加する", () => {
  for (const lang of LANGS) {
    const claude = fs.readFileSync(qocRulePath(lang, "claude"), "utf8");
    const codex = fs.readFileSync(qocRulePath(lang, "codex"), "utf8");
    assert.equal(claude, codex, `${lang}: Claude/Codex QOC ruleがbyte一致する`);

    const categories = qocCategoryLines(claude);
    assert.deepEqual(
      categories.slice(0, 7),
      PRESERVED_QOC_CATEGORIES[lang].map((label, index) => ({ number: index + 1, label })),
      `${lang}: 既存7カテゴリの文字列と順序を保つ`,
    );
    assert.deepEqual(experiencePromiseErrors(claude, lang), [], `${lang}: 体験の約束の契約が揃う`);
  }
});

test("ExperiencePromiseCategory: 4観点、失敗前提、定石照合、採否分類の欠落を判別する", () => {
  const source = fs.readFileSync(qocRulePath("ja", "claude"), "utf8");
  const mutations = [
    ["4観点を削る", "トーンと文体、アクセシビリティ、エラー時の姿勢、体感速度と処理中の状態提示", "体験品質"],
    ["失敗前提を外す", "失敗前提", "成功前提"],
    ["定石照合を削る", /[^\n]*accessibility-wcag[^\n]*\n/, ""],
    ["非網羅を削る", "これは網羅ではない", "これがすべてである"],
    ["採用前に分類へ送る", "人が採用した内容だけ", "推論した内容をすべて"],
    ["不採用を普遍Invariantへ昇格する", "自動昇格しない", "自動昇格する"],
  ];

  assert.deepEqual(experiencePromiseErrors(source, "ja"), [], "基準ruleは契約を満たす");
  for (const [label, before, after] of mutations) {
    const mutated = source.replace(before, after);
    assert.notEqual(mutated, source, `${label}: 違反を注入できる`);
    assert.notDeepEqual(experiencePromiseErrors(mutated, "ja"), [], `${label}: 構造検査が違反を検出する`);
  }
});

test("FrameCatalog: ja/en に同じ5件の一意なidがある", () => {
  for (const lang of LANGS) {
    assert.ok(fs.existsSync(catalogPath(lang)), `${lang}: カタログが存在する`);
    const ids = entries(readCatalog(lang)).map(({ id }) => id);
    assert.equal(new Set(ids).size, 5, `${lang}: idが重複しない`);
    assert.deepEqual([...ids].sort(), [...EXPECTED_IDS].sort(), `${lang}: id集合が一致する`);
  }
});

test("FrameCatalog: 各項目に一般名、適合する状況、Markdown骨格、誤用注意、出典URLがある", () => {
  for (const lang of LANGS) {
    const labels = lang === "ja"
      ? ["一般名", "適合する状況", "下書きの骨格", "誤用注意", "出典"]
      : ["name", "suitable situations", "draft scaffold", "misuse warning", "source"];

    for (const { id, body } of entries(readCatalog(lang))) {
      for (const label of labels) {
        assert.match(body, new RegExp(`^- ${label}:\\s*\\S`, "m"), `${lang}/${id}: ${label}がある`);
      }
      assert.match(body, /^  - `### [^`]+`$/m, `${lang}/${id}: Markdown見出しの骨格がある`);
      assert.match(body, /^- (?:出典|source): .*https:\/\/[^\s）)]+/m, `${lang}/${id}: HTTPSの出典URLがある`);
      const expected = EXPECTED_DETAILS[id];
      const name = lang === "ja" ? expected.jaName : expected.enName;
      const nameLabel = lang === "ja" ? "一般名" : "name";
      assert.match(body, new RegExp(`^- ${nameLabel}: ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"), `${lang}/${id}: 確立した一般名を使う`);
      assert.ok(body.includes(expected.source), `${lang}/${id}: 調査で確認した出典URLを使う`);
    }
  }
});

test("FrameCatalog: 対象外の管理項目、画像生成指示、絵文字を含まない", () => {
  const forbidden = [
    /priority score/i,
    /opportunity score/i,
    /commit(?:ted)? date/i,
    /progress (?:rate|percentage)/i,
    /image generation/i,
    /数値(?:の)?(?:優先度|機会)スコア/,
    /日付コミット/,
    /進捗率/,
    /画像(?:または図)?(?:を)?(?:自動)?生成/,
    /\p{Extended_Pictographic}/u,
  ];

  for (const lang of LANGS) {
    const text = readCatalog(lang);
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, `${lang}: 禁止された構造・指示を含まない (${pattern})`);
    }
  }
});

function suggestionRulePath(lang, agent) {
  return path.join(
    ROOT,
    "templates",
    lang,
    agent,
    "skills",
    "intent-discover",
    "rules",
    "design-frame-surfacing.md",
  );
}

function designerQuestionsPath(lang, agent) {
  return path.join(
    ROOT,
    "templates",
    lang,
    agent,
    "skills",
    "intent-discover",
    "rules",
    "designer-questions.md",
  );
}

function roleLensIntegrationErrors(text, lang) {
  const roleLensHeading = lang === "ja"
    ? /2\.4\.[^\n]*ロールレンズ/
    : /2\.4\.[^\n]*role lens/i;
  const nextStepHeading = /2\.45\./;
  const roleLensStart = text.search(roleLensHeading);
  const nextStepStart = text.search(nextStepHeading);
  const integration = lang === "ja"
    ? /ロールレンズ[^\n]*確定[^\n]*直後[^\n]*designer-questions[^\n]*(?:on|off)[^\n]*関わらず[^\n]*`rules\/design-frame-surfacing\.md`[^\n]*(?:読み|適用)/
    : /immediately after[^\n]*role lens[^\n]*confirmed[^\n]*regardless[^\n]*designer-questions[^\n]*(?:on|off)[^\n]*read and apply[^\n]*`rules\/design-frame-surfacing\.md`/i;
  const roleLensSection = roleLensStart >= 0 && nextStepStart > roleLensStart
    ? text.slice(roleLensStart, nextStepStart)
    : "";
  const personProxy = lang === "ja"
    ? /在=本人[^\n]*不在=代行/
    : /present = the person[^\n]*absent = stand-in/i;
  const freeText = lang === "ja"
    ? /観点名は普通語の自由記述/
    : /perspective names[^\n]*free[- ]text/i;

  return [
    [roleLensStart >= 0, "手順2.4のロールレンズがある"],
    [nextStepStart > roleLensStart, "次の手順より前に統合できる"],
    [integration.test(roleLensSection), "確定直後にon/off共通で提案ruleを読む"],
    [personProxy.test(roleLensSection), "本人／代行の出し分けを保持する"],
    [freeText.test(roleLensSection), "観点名を自由記述のまま扱う"],
  ].filter(([ok]) => !ok).map(([, message]) => message);
}

test("RoleLensIntegration: 4面でロールレンズ確定直後に提案から派生生成までのruleへ接続する", () => {
  for (const lang of LANGS) {
    const claude = fs.readFileSync(designerQuestionsPath(lang, "claude"), "utf8");
    const codex = fs.readFileSync(designerQuestionsPath(lang, "codex"), "utf8");
    assert.equal(claude, codex, `${lang}: Claude/Codexの接続がbyte一致する`);
    assert.deepEqual(roleLensIntegrationErrors(claude, lang), [], `${lang}: 統合契約が揃う`);
  }
});

test("RoleLensIntegration: on/off共通のrule参照と既存ロールレンズ境界の欠落を判別する", () => {
  const source = fs.readFileSync(designerQuestionsPath("ja", "claude"), "utf8");
  const mutations = [
    ["提案rule参照を削除", /[^\n]*`rules\/design-frame-surfacing\.md`[^\n]*\n/, ""],
    ["off経路を除外", "on / off の値に関わらず", "on のときだけ"],
    ["本人／代行を固定値へ変更", "**在=本人**／**不在=代行**", "担当者"],
    ["自由記述を固定値へ変更", "観点名は普通語の自由記述", "観点名は固定値"],
  ];

  for (const [label, before, after] of mutations) {
    const mutated = source.replace(before, after);
    assert.notEqual(mutated, source, `${label}: 違反を注入できる`);
    assert.notDeepEqual(roleLensIntegrationErrors(mutated, "ja"), [], `${label}: 構造検査が違反を検出する`);
  }
});

function suggestionRuleErrors(text, lang) {
  const patterns = lang === "ja"
    ? [
        [/^.*自由記述[^\n]*意味で判断.*$/m, "自由記述を意味で判断する"],
        [/^.*固定された職種名[^\n]*観点名[^\n]*完全一致[^\n]*要求しない.*$/m, "固定名との完全一致を要求しない"],
        [/^.*純バックエンド[^\n]*候補を提示せず[^\n]*下書きも生成せず[^\n]*従来の処理を続ける.*$/m, "純バックエンドでは沈黙して継続する"],
        [/^.*体験を設計する観点[^\n]*読み取れない[^\n]*候補を提示せず[^\n]*下書きも生成せず[^\n]*従来の処理を続ける.*$/m, "体験観点なしでは沈黙して継続する"],
        [/^.*カタログ[^\n]*存在しない[^\n]*候補を提示せず[^\n]*下書きも生成せず[^\n]*従来の処理を続ける.*$/m, "カタログ不在では沈黙して継続する"],
        [/^.*適合が弱い[^\n]*候補を提示せず[^\n]*下書きも生成せず[^\n]*従来の処理を続ける.*$/m, "適合が弱ければ沈黙して継続する"],
        [/^.*体験を設計する観点が必要[^\n]*場合だけ[^\n]*\.intent\/design-frames\.md.*$/m, "必要な場合だけカタログを参照する"],
        [/^.*適合する状況[^\n]*関係する項目だけ[^\n]*読む.*$/m, "関係する項目だけを読む"],
        [/^4\.[^\n]*候補ごと[^\n]*適合理由[^\n]*1行.*$/m, "候補ごとに適合理由を1行で示す"],
      ]
    : [
        [/^.*semantic meaning[^\n]*free-text.*$/im, "judge free text by semantic meaning"],
        [/^.*do not require[^\n]*exact match[^\n]*fixed job title[^\n]*fixed viewpoint name.*$/im, "do not require exact fixed names"],
        [/^.*pure backend[^\n]*present no candidate[^\n]*generate no draft[^\n]*continue the existing flow.*$/im, "stay silent for pure backend work"],
        [/^.*experience-design viewpoint[^\n]*cannot be inferred[^\n]*present no candidate[^\n]*generate no draft[^\n]*continue the existing flow.*$/im, "stay silent without an experience viewpoint"],
        [/^.*catalog[^\n]*does not exist[^\n]*present no candidate[^\n]*generate no draft[^\n]*continue the existing flow.*$/im, "stay silent without a catalog"],
        [/^.*fit is weak[^\n]*present no candidate[^\n]*generate no draft[^\n]*continue the existing flow.*$/im, "stay silent on weak fit"],
        [/^.*only when[^\n]*experience-design viewpoint is needed[^\n]*\.intent\/design-frames\.md.*$/im, "read the catalog only when needed"],
        [/^.*suitable situations[^\n]*only the relevant entries[^\n]*read.*$/im, "read only relevant entries"],
        [/^4\.[^\n]*for each candidate[^\n]*one-line[^\n]*reason.*$/im, "give a one-line reason per candidate"],
      ];

  return patterns
    .filter(([pattern]) => !pattern.test(text))
    .map(([, message]) => message);
}

test("FrameSuggestionRule: 4面に照合、理由付き提示、沈黙、必要時参照の契約がある", () => {
  for (const lang of LANGS) {
    const claude = fs.readFileSync(suggestionRulePath(lang, "claude"), "utf8");
    const codex = fs.readFileSync(suggestionRulePath(lang, "codex"), "utf8");
    assert.equal(claude, codex, `${lang}: Claude/Codex ruleがbyte一致する`);
    assert.deepEqual(suggestionRuleErrors(claude, lang), [], `${lang}: 候補提示契約が揃う`);
  }
});

test("FrameSuggestionRule: 条件の削除と沈黙条件の逆転を判別する", () => {
  const mutations = [
    ["体験観点なしを削除", /体験を設計する観点が読み取れない場合[^\n]*\n/, ""],
    ["純バックエンドで提示へ逆転", "案件が純バックエンドに限定される場合は、候補を提示せず、下書きも生成せず、従来の処理を続ける", "案件が純バックエンドに限定される場合は、候補を提示し、下書きを生成して、従来の処理を止める"],
    ["弱い適合で提示へ逆転", "適合が弱い場合は、候補を提示せず、下書きも生成せず、従来の処理を続ける", "適合が弱い場合も、候補を提示し、下書きを生成して、従来の処理を止める"],
    ["必要時だけの参照を削除", "場合だけ", "場合でも常に"],
    ["関係項目だけの参照を全件へ逆転", "関係する項目だけを読む", "すべての項目を読む"],
    ["理由1行を削除", "4. **理由付きの候補だけを提示する。** 明確に適合するものがある場合、候補ごとに確立した一般名と適合理由を普通の言葉で1行ずつ提示する。", "4. **候補を提示する。** 明確に適合するものがある場合、フレーム名だけを提示する。"],
  ];
  const source = fs.readFileSync(suggestionRulePath("ja", "claude"), "utf8");

  assert.deepEqual(suggestionRuleErrors(source, "ja"), [], "基準ruleは契約を満たす");
  for (const [label, before, after] of mutations) {
    const mutated = source.replace(before, after);
    assert.notEqual(mutated, source, `${label}: 違反を注入できる`);
    assert.notDeepEqual(suggestionRuleErrors(mutated, "ja"), [], `${label}: 構造検査が違反を検出する`);
  }
});

function decisionAdapterErrors(text, lang) {
  const patterns = lang === "ja"
    ? [
        [/^\s*`\| フレームid \| 局面 \| 採否 \| 文脈一行 \| 日付 \|`\s*$/m, "既存の5列形式を使う"],
        [/新しい列[^\n]*足さない/, "新しい列を追加しない"],
        [/採用[^\n]*否認[^\n]*保留/, "採用・否認・保留を記録する"],
        [/同じ発行系列[^\n]*採否[^\n]*再提示しない/, "同一系列の採否済み候補を再提示しない"],
        [/目的[^\n]*文脈[^\n]*意味上[^\n]*変化[^\n]*場合だけ[^\n]*再評価/, "意味上の目的・文脈変化時だけ再評価する"],
        [/日数[^\n]*回数[^\n]*再提示期限[^\n]*追加しない/, "機械的な再提示条件を追加しない"],
        [/発行ディレクトリ[^\n]*constraint-ledger\.md[^\n]*存在しない[^\n]*記録[^\n]*スキップ[^\n]*停止しない/, "記録の器がなくても停止しない"],
        [/対話中[^\n]*採否[^\n]*尊重/, "記録できなくても対話中の判断を尊重する"],
      ]
    : [
        [/^\s*`\| frame id \| host \| decision \| one-line context \| date \|`\s*$/im, "use the existing five-column row"],
        [/add no columns/i, "add no columns"],
        [/adopted[^\n]*declined[^\n]*deferred/i, "record adopted, declined, and deferred"],
        [/same issue series[^\n]*decision[^\n]*does not resurface/i, "do not resurface decided candidates in the same series"],
        [/purpose[^\n]*context[^\n]*semantically changed[^\n]*only[^\n]*re-evaluat/i, "re-evaluate only after semantic purpose/context change"],
        [/days[^\n]*counts[^\n]*resurfacing deadline[^\n]*do not add/i, "add no mechanical resurfacing condition"],
        [/issue directory[^\n]*constraint-ledger\.md[^\n]*(?:does not exist|absent)[^\n]*skip recording[^\n]*do not stop/i, "do not stop without a recording container"],
        [/decision[^\n]*current conversation[^\n]*respect/i, "respect the current-conversation decision"],
      ];

  return patterns
    .filter(([pattern]) => !pattern.test(text))
    .map(([, message]) => message);
}

test("FrameDecisionAdapter: 4面に採否記録、再提示抑止、文脈変化、器なし非停止の契約がある", () => {
  for (const lang of LANGS) {
    const claude = fs.readFileSync(suggestionRulePath(lang, "claude"), "utf8");
    const codex = fs.readFileSync(suggestionRulePath(lang, "codex"), "utf8");
    assert.equal(claude, codex, `${lang}: Claude/Codex ruleがbyte一致する`);
    assert.deepEqual(decisionAdapterErrors(claude, lang), [], `${lang}: 採否接続契約が揃う`);
  }
});

test("FrameDecisionAdapter: 再提示禁止、再評価、器なし非停止の欠落を判別する", () => {
  const mutations = [
    ["採否行へ列を追加", "| フレームid | 局面 | 採否 | 文脈一行 | 日付 |", "| フレームid | 局面 | 採否 | 文脈一行 | 日付 | 再提示期限 |"],
    ["再提示禁止を逆転", "再提示しない", "再提示する"],
    ["意味上の変化条件を削除", "意味上変化した場合だけ", "変化していなくても"],
    ["器なしで停止へ逆転", "記録をスキップし、停止しない", "エラーとして停止する"],
    ["対話中の判断尊重を削除", /対話中の採否を尊重[^。]*。/, ""],
  ];
  const source = fs.readFileSync(suggestionRulePath("ja", "claude"), "utf8");

  assert.deepEqual(decisionAdapterErrors(source, "ja"), [], "基準ruleは契約を満たす");
  for (const [label, before, after] of mutations) {
    const mutated = source.replace(before, after);
    assert.notEqual(mutated, source, `${label}: 違反を注入できる`);
    assert.notDeepEqual(decisionAdapterErrors(mutated, "ja"), [], `${label}: 構造検査が違反を検出する`);
  }
});

function derivedFrameWriterErrors(text, lang) {
  const patterns = lang === "ja"
    ? [
        [/人が明示的に採用[^\n]*カタログに存在する既知のフレームid[^\n]*両方[^\n]*満たす場合だけ/, "明示採用と既知idの両方を生成条件にする"],
        [/採用していない[^\n]*下書きを生成しない/, "未採用では生成しない"],
        [/未知のフレームid[^\n]*生成せず[^\n]*既知id[^\n]*一覧/, "未知idでは生成せず既知idを案内する"],
        [/\.intent\/nl-spec\/design-frame-<frame-id>\.md/, "所定の派生出力先を使う"],
        [/同じフレームid[^\n]*同じパス[^\n]*全置換/, "同じidの再実行は同じパスを全置換する"],
        [/冒頭[^\n]*推測[^\n]*派生[^\n]*再生成可能[^\n]*正本ではない/, "冒頭に4つの派生標識を置く"],
        [/Markdown[^\n]*下書き[^\n]*(?:画像|図)[^\n]*自動生成しない/, "Markdown下書きだけを生成する"],
        [/\.intent\/nl-spec\/[^\n]*以外[^\n]*書き込まない/, "派生領域以外へ書かない"],
        [/Intent Tree[^\n]*Intent Compass[^\n]*packet[^\n]*変更しない/, "canonicalを変更しない"],
        [/書き込みに失敗[^\n]*対象パス[^\n]*報告/, "書き込み失敗時に対象パスを報告する"],
        [/書き込みに失敗[^\n]*正本[^\n]*採否記録[^\n]*巻き戻さない/, "書き込み失敗で正本や採否記録を巻き戻さない"],
      ]
    : [
        [/only when both[^\n]*explicitly adopted[^\n]*known frame id[^\n]*catalog/i, "require explicit adoption and a known catalog id"],
        [/not adopted[^\n]*generate no draft/i, "generate nothing before adoption"],
        [/unknown frame id[^\n]*generate no draft[^\n]*list[^\n]*known ids/i, "reject unknown ids and list known ids"],
        [/\.intent\/nl-spec\/design-frame-<frame-id>\.md/i, "use the designated derived destination"],
        [/same frame id[^\n]*same path[^\n]*full replacement/i, "fully replace the same path on rerun"],
        [/header[^\n]*inferred[^\n]*derived[^\n]*regenerable[^\n]*not (?:a )?source of truth/i, "put four provenance labels in the header"],
        [/Markdown draft[^\n]*do not automatically generate[^\n]*(?:image|diagram)/i, "generate only a Markdown draft"],
        [/write (?:the derived draft )?only[^\n]*\.intent\/nl-spec\/[^\n]*nowhere else/i, "write only in the derived directory"],
        [/do not change[^\n]*Intent Tree[^\n]*Intent Compass[^\n]*packet/i, "do not change canonical artifacts"],
        [/write fails[^\n]*report[^\n]*target path/i, "report the target path on write failure"],
        [/write fails[^\n]*do not roll back[^\n]*(?:source of truth|canonical)[^\n]*decision ledger/i, "do not roll back canonical or ledger state"],
      ];

  return patterns
    .filter(([pattern]) => !pattern.test(text))
    .map(([, message]) => message);
}

test("DerivedFrameWriter: 4面に採用後だけの派生生成と失敗境界がある", () => {
  for (const lang of LANGS) {
    const claude = fs.readFileSync(suggestionRulePath(lang, "claude"), "utf8");
    const codex = fs.readFileSync(suggestionRulePath(lang, "codex"), "utf8");
    assert.equal(claude, codex, lang + ": Claude/Codex ruleがbyte一致する");
    assert.deepEqual(derivedFrameWriterErrors(claude, lang), [], lang + ": 派生生成契約が揃う");
  }
});

test("DerivedFrameWriter: 生成ゲート、出力境界、失敗時非巻き戻しの欠落や逆転を判別する", () => {
  const mutations = [
    ["明示採用ゲートを削除", "人が明示的に採用し、カタログに存在する既知のフレームidである、の両方を満たす場合だけ", "カタログに存在する既知のフレームidなら"],
    ["未採用でも生成へ逆転", "採用していない場合は下書きを生成しない", "採用していない場合も下書きを生成する"],
    ["未知idでも生成へ逆転", "未知のフレームidでは生成せず、カタログから選べる既知idの一覧を示す", "未知のフレームidでも生成する"],
    ["派生先をcanonicalへ変更", ".intent/nl-spec/design-frame-<frame-id>.md", ".intent/intent-tree.md"],
    ["全置換を追記へ逆転", "同じフレームidの再実行では同じパスを全置換する", "同じフレームidの再実行では同じパスへ追記する"],
    ["派生標識を削除", "冒頭に「推測を含む」「派生」「再生成可能」「正本ではない」の4点を明記する", "冒頭に生成物と明記する"],
    ["canonical非変更を削除", /Intent Tree、Intent Compass、packetは変更しない[^。]*。/, ""],
    ["失敗時に巻き戻すへ逆転", "書き込みに失敗しても正本や採否記録を巻き戻さない", "書き込みに失敗したら正本と採否記録を巻き戻す"],
  ];
  const source = fs.readFileSync(suggestionRulePath("ja", "claude"), "utf8");

  assert.deepEqual(derivedFrameWriterErrors(source, "ja"), [], "基準ruleは契約を満たす");
  for (const [label, before, after] of mutations) {
    const mutated = source.replace(before, after);
    assert.notEqual(mutated, source, label + ": 違反を注入できる");
    assert.notDeepEqual(derivedFrameWriterErrors(mutated, "ja"), [], label + ": 構造検査が違反を検出する");
  }
});

test("ExperienceLanguageStarter: 既存3定石を変更せず文体と回復案内の不足だけを1件補う", () => {
  for (const lang of LANGS) {
    const starters = frontendStarterEntries(lang);
    const byId = new Map(starters.map((entry) => [entry.id, entry]));

    for (const [id, expectedHash] of Object.entries(PRESERVED_FRONTEND_STARTER_HASHES[lang])) {
      const entry = byId.get(id);
      assert.ok(entry, `${lang}/${id}: 既存定石が存在する`);
      const actualHash = crypto.createHash("sha256").update(entry.raw).digest("hex");
      assert.equal(actualHash, expectedHash, `${lang}/${id}: 既存本文と義務を変更しない`);
    }

    const additions = starters.filter(({ id }) => id === "experience-language-recovery");
    assert.equal(additions.length, 1, `${lang}: 文体と回復案内の不足定石を1件だけ追加する`);
    const body = additions[0].body;
    assert.match(body, /https:\/\/www\.w3\.org\/TR\/coga-usable\//, `${lang}: W3C COGAを出典にする`);

    const required = lang === "ja"
      ? [/明確/, /文字どおり/, /利用者を責めない/, /次に取れる行動|次の行動/, /回復/, /画面をまたいで/, /声|語調/]
      : [/clear/i, /literal/i, /without blaming the user/i, /next action/i, /recover/i, /across screens/i, /voice|tone/i];
    for (const pattern of required) {
      assert.match(body, pattern, `${lang}: 不足内容 ${pattern} を含む`);
    }

    const excluded = lang === "ja"
      ? [/キーボード/, /コントラスト/, /ローディング/, /空状態/, /進行中/, /status message/i]
      : [/keyboard/i, /contrast/i, /loading/i, /empty state/i, /in progress/i, /status message/i];
    for (const pattern of excluded) {
      assert.doesNotMatch(body, pattern, `${lang}: 既存3定石の義務 ${pattern} を再定義しない`);
    }
  }
});

test("ExperienceLanguageStarter: 必須要素の欠落と既存領域への拡張を判別する", () => {
  const source = frontendStarterEntries("ja").find(({ id }) => id === "experience-language-recovery")?.body ?? "";
  assert.notEqual(source, "", "基準定石が存在する");

  const mutations = [
    ["責めない文体を削除", "利用者を責めない", "利用者の誤りを指摘する"],
    ["次の行動を削除", "次に取れる行動", "情報"],
    ["声の一貫性を削除", "画面をまたいで同じ声と語調", "画面ごとに異なる文体"],
    ["キーボード要件を混入", "回復方法を、", "回復方法とキーボード操作を、"],
  ];

  for (const [label, before, after] of mutations) {
    const mutated = source.replaceAll(before, after);
    assert.notEqual(mutated, source, `${label}: 違反を注入できる`);
    const required = [/明確/, /文字どおり/, /利用者を責めない/, /次に取れる行動/, /回復/, /画面をまたいで/, /声|語調/];
    const excluded = [/キーボード/, /コントラスト/, /ローディング/, /空状態/, /進行中/, /status message/i];
    const errors = [
      ...required.filter((pattern) => !pattern.test(mutated)),
      ...excluded.filter((pattern) => pattern.test(mutated)),
    ];
    assert.notDeepEqual(errors, [], `${label}: 構造検査が違反を検出する`);
  }
});

const DISTRIBUTED_RULES = [
  ["intent-discover", "design-frame-surfacing.md"],
  ["intent-discover", "designer-questions.md"],
  ["intent-compass", "algo-qoc.md"],
];

const CATALOG_MEANING_MARKERS = {
  persona: {
    ja: [/調査[\s\S]*行動[\s\S]*目的/, /確認が必要な推測/],
    en: [/research[\s\S]*behavior[\s\S]*goals/i, /assumptions to verify/i],
  },
  "jobs-to-be-done": {
    ja: [/特定の状況[\s\S]*前進/, /機能名[\s\S]*達成したいこと/],
    en: [/particular circumstance[\s\S]*progress/i, /feature name[\s\S]*job/i],
  },
  "customer-journey-map": {
    ja: [/時間の流れ[\s\S]*接点[\s\S]*感情/, /成功経路だけを描かない/],
    en: [/time-oriented[\s\S]*touchpoints[\s\S]*emotions/i, /not map only an ideal successful path/i],
  },
  "service-blueprint": {
    ja: [/見える接点[\s\S]*内部処理[\s\S]*支援資源/, /受け渡し[\s\S]*失敗点/],
    en: [/user-visible touchpoints[\s\S]*internal processes[\s\S]*supporting resources/i, /handoffs[\s\S]*failure points/i],
  },
  "user-story-mapping": {
    ja: [/活動の流れ[\s\S]*実装範囲/, /機能一覧[\s\S]*背骨/],
    en: [/flow of user activities[\s\S]*implementation scope/i, /feature inventory[\s\S]*backbone/i],
  },
};

function installedSkillRoot(target, agent) {
  return path.join(target, agent === "claude" ? ".claude/skills" : ".agents/skills");
}

function sourceRulePath(lang, agent, skill, file) {
  return path.join(ROOT, "templates", lang, agent, "skills", skill, "rules", file);
}

function catalogParitySignature(lang) {
  return entries(readCatalog(lang)).map(({ id, body }) => ({
    id,
    source: body.match(/^- (?:出典|source): .*?(https:\/\/[^\s）)]+)/m)?.[1],
    scaffoldSlots: [...body.matchAll(/^  - `### [^`]+`$/gm)].length,
  }));
}

test("DistributionParity: ja/enのカタログ意味と各言語内のClaude/Codex ruleが一致する", () => {
  assert.deepEqual(
    catalogParitySignature("ja"),
    catalogParitySignature("en"),
    "ja/enで5つのid、確認済み出典、下書き骨格の要素数が一致する",
  );

  for (const lang of LANGS) {
    for (const { id, body } of entries(readCatalog(lang))) {
      for (const marker of CATALOG_MEANING_MARKERS[id][lang]) {
        assert.match(body, marker, `${lang}/${id}: 適合条件・骨格・誤用境界の必須意味を保つ`);
      }
    }
  }

  for (const lang of LANGS) {
    for (const [skill, file] of DISTRIBUTED_RULES) {
      assert.equal(
        fs.readFileSync(sourceRulePath(lang, "claude", skill, file), "utf8"),
        fs.readFileSync(sourceRulePath(lang, "codex", skill, file), "utf8"),
        `${lang}/${skill}/${file}: Claude/Codexがbyte一致する`,
      );
    }
  }
});

test("DistributionParity: install()が4配布面へ新規物を届け、通常の再導入で利用者編集を上書きしない", () => {
  for (const lang of LANGS) {
    for (const agent of ["claude", "codex"]) {
      const target = fs.mkdtempSync(path.join(os.tmpdir(), `ip-service-design-${lang}-${agent}-`));
      try {
        install(target, { lang, agent, confirmRootDoc: () => false });

        const catalog = path.join(target, ".intent", "design-frames.md");
        assert.equal(
          fs.readFileSync(catalog, "utf8"),
          fs.readFileSync(catalogPath(lang), "utf8"),
          `${lang}/${agent}: 共有カタログが所定位置へ届く`,
        );

        const skillRoot = installedSkillRoot(target, agent);
        for (const [skill, file] of DISTRIBUTED_RULES) {
          const installed = path.join(skillRoot, skill, "rules", file);
          assert.equal(
            fs.readFileSync(installed, "utf8"),
            fs.readFileSync(sourceRulePath(lang, agent, skill, file), "utf8"),
            `${lang}/${agent}: ${skill}/${file}が所定位置へ届く`,
          );
        }

        const editedCatalog = `${fs.readFileSync(catalog, "utf8")}\n利用者の編集\n`;
        const surfacing = path.join(skillRoot, "intent-discover", "rules", "design-frame-surfacing.md");
        const editedSurfacing = `${fs.readFileSync(surfacing, "utf8")}\nuser edit\n`;
        fs.writeFileSync(catalog, editedCatalog);
        fs.writeFileSync(surfacing, editedSurfacing);

        const second = install(target, { lang, agent, confirmRootDoc: () => false });
        assert.equal(fs.readFileSync(catalog, "utf8"), editedCatalog, `${lang}/${agent}: 既存カタログを保持する`);
        assert.equal(fs.readFileSync(surfacing, "utf8"), editedSurfacing, `${lang}/${agent}: 既存ruleを保持する`);
        assert.ok(second.skipped.includes(".intent/design-frames.md"), `${lang}/${agent}: カタログをSKIPする`);
        assert.ok(
          second.skipped.includes(path.relative(target, surfacing)),
          `${lang}/${agent}: 提案ruleをSKIPする`,
        );
      } finally {
        fs.rmSync(target, { recursive: true, force: true });
      }
    }
  }
});

function publicDocPath(name) {
  return path.join(ROOT, name);
}

function publicDocSection(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) return "";
  const rest = text.slice(start + heading.length);
  const next = rest.search(/^## /m);
  return next < 0 ? text.slice(start) : text.slice(start, start + heading.length + next);
}

function publicDocumentationErrors(readme, guide, lang) {
  const heading = lang === "ja"
    ? "## 体験設計のフレーム候補"
    : "## Experience-design frame suggestions";
  const section = publicDocSection(guide, heading);
  const readmePatterns = lang === "ja"
    ? [
        [/\[体験設計のフレーム候補\]\(docs\/guide\.md#体験設計のフレーム候補\)/, "READMEからguideの実在節へリンクする"],
        [/人が採用した場合だけ[^\n]*\.intent\/nl-spec\/design-frame-<frame-id>\.md[^\n]*派生/, "READMEで採用後だけの派生出力を示す"],
        [/画像・図[^\n]*実測[^\n]*体験段階[^\n]*数値の優先度[^\n]*日付コミット[^\n]*進捗率[^\n]*対象外/, "READMEで対象外境界を示す"],
      ]
    : [
        [/\[Experience-design frame suggestions\]\(docs\/guide\.en\.md#experience-design-frame-suggestions\)/, "README links to an existing guide section"],
        [/only after a person adopts[^\n]*derived[^\n]*\.intent\/nl-spec\/design-frame-<frame-id>\.md/i, "README states adopted-only derived output"],
        [/images or diagrams[^\n]*analytics measurement[^\n]*experience-stage[^\n]*numeric priority[^\n]*date commitments[^\n]*progress percentages[^\n]*out of scope/i, "README states the out-of-scope boundary"],
      ];
  const guidePatterns = lang === "ja"
    ? [
        [/案件に体験を設計する観点が合う場合だけ/, "案件に合う場合だけ候補を提示する"],
        [/ペルソナ[\s\S]*Jobs to be Done[\s\S]*カスタマージャーニーマップ[\s\S]*サービスブループリント[\s\S]*ユーザーストーリーマッピング/, "5種の確立したフレームを示す"],
        [/候補ごと[^\n]*理由/, "候補ごとに適合理由を示す"],
        [/人が[^\n]*採用[^\n]*見送り[^\n]*保留/, "人が採否を決める"],
        [/採用前[^\n]*生成しない/, "採用前に生成しない"],
        [/\.intent\/nl-spec\/design-frame-<frame-id>\.md[^\n]*派生[^\n]*下書き/, "派生下書きの出力先を示す"],
        [/Intent Tree[^\n]*Intent Compass[^\n]*packet[^\n]*自動[^\n]*変更し(?:ない|ません)/, "正本を自動変更しない"],
        [/トーンと文体[\s\S]*アクセシビリティ[\s\S]*エラー時の姿勢[\s\S]*体感速度と(?:処理中の)?状態提示/, "体験上の約束の4観点を示す"],
        [/画像(?:や|または)図[^\n]*生成しない/, "画像や図を生成しない"],
        [/アナリティクス[^\n]*実測しない/, "analytics実測をしない"],
        [/体験段階(?:フィールド|や段階ビュー)[^\n]*追加しない/, "体験段階を追加しない"],
        [/数値の優先度[^\n]*日付コミット[^\n]*進捗率[^\n]*追加しない/, "管理指標を追加しない"],
      ]
    : [
        [/only when an experience-design viewpoint fits the case/i, "suggests only when the viewpoint fits"],
        [/Persona[\s\S]*Jobs to Be Done[\s\S]*Customer Journey Map[\s\S]*Service Blueprint[\s\S]*User Story Mapping/, "lists five established frames"],
        [/one-line reason[^\n]*candidate/i, "gives a fit reason per candidate"],
        [/person[^\n]*adopt[^\n]*decline[^\n]*defer/i, "a person makes the decision"],
        [/before adoption[^\n]*does not generate|does not generate[^\n]*before adoption/i, "does not generate before adoption"],
        [/derived[^\n]*draft[^\n]*\.intent\/nl-spec\/design-frame-<frame-id>\.md/i, "states the derived draft destination"],
        [/does not automatically change[^\n]*Intent Tree[^\n]*Intent Compass[^\n]*packet/i, "does not change sources of truth"],
        [/tone and voice[\s\S]*accessibility[\s\S]*stance during errors[\s\S]*perceived speed and processing-state feedback/i, "states four experience-promise perspectives"],
        [/does not generate[^\n]*images or diagrams/i, "does not generate images or diagrams"],
        [/does not measure[^\n]*analytics/i, "does not perform analytics measurement"],
        [/does not add[^\n]*experience-stage fields or views/i, "does not add experience stages"],
        [/does not add[^\n]*numeric priority[^\n]*date commitments[^\n]*progress percentages/i, "does not add project-management fields"],
      ];

  return [
    ...readmePatterns.filter(([pattern]) => !pattern.test(readme)).map(([, message]) => message),
    [section.length > 0, "guideに対応する独立節がある"],
    ...guidePatterns.filter(([pattern]) => !pattern.test(section)).map(([, message]) => message),
  ].filter((entry) => Array.isArray(entry) ? !entry[0] : true).map((entry) => Array.isArray(entry) ? entry[1] : entry);
}

function theoryDocumentationErrors(theory, lang) {
  const patterns = lang === "ja"
    ? [
        [/サービスデザイン[\s\S]*意味[^\n]*照合/, "サービスデザインにも意味照合を広げる"],
        [/適合[^\n]*弱い[^\n]*候補を提示せず[^\n]*沈黙/, "適合が弱ければ沈黙する"],
        [/人[^\n]*採否[^\n]*決める/, "採否を人に残す"],
        [/採用前[^\n]*生成しない/, "採用前には生成しない"],
        [/採用後[^\n]*\.intent\/nl-spec\/design-frame-<frame-id>\.md[^\n]*派生/, "採用後の派生先を示す"],
        [/Intent Tree[^\n]*Intent Compass[^\n]*packet[^\n]*正本[^\n]*変更しない/, "正本を変更しない"],
        [/画像(?:や|・)図[^\n]*アナリティクス[^\n]*体験段階[^\n]*数値の優先度[^\n]*日付コミット[^\n]*進捗率[^\n]*対象外/, "対象外境界を示す"],
      ]
    : [
        [/service design[\s\S]*semantic[^\n]*match/i, "extends semantic matching to service design"],
        [/fit is weak[^\n]*present no candidate[^\n]*silent/i, "stays silent when fit is weak"],
        [/person[^\n]*decides[^\n]*(?:adopt|decline|defer)/i, "leaves the decision to a person"],
        [/before adoption[^\n]*generates? nothing|does not generate[^\n]*before adoption/i, "generates nothing before adoption"],
        [/after adoption[^\n]*derived[^\n]*\.intent\/nl-spec\/design-frame-<frame-id>\.md/i, "states the adopted-only derived destination"],
        [/does not change[^\n]*Intent Tree[^\n]*Intent Compass[^\n]*packet[^\n]*sources? of truth/i, "does not change sources of truth"],
        [/images or diagrams[^\n]*analytics[^\n]*experience stages[^\n]*numeric priorit(?:y|ies)[^\n]*date commitments[^\n]*progress percentages[^\n]*out of scope/i, "states the out-of-scope boundary"],
      ];

  return patterns.filter(([pattern]) => !pattern.test(theory)).map(([, message]) => message);
}

function scaffoldDocumentationErrors(readme, lang) {
  const patterns = lang === "ja"
    ? [
        [/\.intent\/design-frames\.md[^\n]*カタログ/, "配置済みカタログの場所を示す"],
        [/採用前[^\n]*生成しない/, "採用前には生成しない"],
        [/採用後[^\n]*\.intent\/nl-spec\/design-frame-<frame-id>\.md[^\n]*派生/, "採用後の派生先を示す"],
        [/推測[^\n]*派生[^\n]*再生成可能[^\n]*正本ではない/, "派生物の性質を示す"],
        [/Intent Tree[^\n]*Intent Compass[^\n]*packet[^\n]*自動[^\n]*変更しない/, "正本を自動変更しない"],
        [/画像(?:や|・)図[^\n]*アナリティクス[^\n]*体験段階[^\n]*数値の優先度[^\n]*日付コミット[^\n]*進捗率[^\n]*対象外/, "対象外境界を示す"],
      ]
    : [
        [/\.intent\/design-frames\.md[^\n]*catalog/i, "states the installed catalog location"],
        [/before adoption[^\n]*generates? nothing|does not generate[^\n]*before adoption/i, "generates nothing before adoption"],
        [/after adoption[^\n]*derived[^\n]*\.intent\/nl-spec\/design-frame-<frame-id>\.md/i, "states the adopted-only derived destination"],
        [/inferred[^\n]*derived[^\n]*regenerable[^\n]*not (?:a )?source of truth/i, "states the derived artifact properties"],
        [/does not automatically change[^\n]*Intent Tree[^\n]*Intent Compass[^\n]*packet/i, "does not automatically change sources of truth"],
        [/images or diagrams[^\n]*analytics[^\n]*experience stages[^\n]*numeric priorit(?:y|ies)[^\n]*date commitments[^\n]*progress percentages[^\n]*out of scope/i, "states the out-of-scope boundary"],
      ];

  return patterns.filter(([pattern]) => !pattern.test(readme)).map(([, message]) => message);
}

test("PublicDocumentation: READMEとguideの日英で体験設計の利用方法と境界を同期する", () => {
  const docs = {
    ja: {
      readme: fs.readFileSync(publicDocPath("README.md"), "utf8"),
      guide: fs.readFileSync(publicDocPath("docs/guide.md"), "utf8"),
    },
    en: {
      readme: fs.readFileSync(publicDocPath("README.en.md"), "utf8"),
      guide: fs.readFileSync(publicDocPath("docs/guide.en.md"), "utf8"),
    },
  };

  for (const lang of LANGS) {
    assert.deepEqual(
      publicDocumentationErrors(docs[lang].readme, docs[lang].guide, lang),
      [],
      `${lang}: 公開文書の利用方法と境界が揃う`,
    );
  }
});

test("PublicDocumentation: 採用前生成、派生先、対象外の契約欠落を判別する", () => {
  const readme = fs.readFileSync(publicDocPath("README.md"), "utf8");
  const guide = fs.readFileSync(publicDocPath("docs/guide.md"), "utf8");
  const mutations = [
    ["採用前生成禁止を逆転", "採用前には生成しない", "採用前にも生成する"],
    ["派生先を正本へ変更", ".intent/nl-spec/design-frame-<frame-id>.md", ".intent/intent-tree.md"],
    ["画像生成の対象外を逆転", "画像や図は生成しない", "画像や図を生成する"],
    ["実測の対象外を逆転", "アナリティクスで行動を実測しない", "アナリティクスで行動を実測する"],
  ];

  for (const [label, before, after] of mutations) {
    const mutated = guide.replace(before, after);
    assert.notEqual(mutated, guide, `${label}: 違反を注入できる`);
    assert.notDeepEqual(publicDocumentationErrors(readme, mutated, "ja"), [], `${label}: 文書同期検査が違反を検出する`);
  }
});

test("PublicDocumentation: theoryと配置後scaffoldの日英で位置づけと境界を同期する", () => {
  const docs = {
    ja: {
      theory: fs.readFileSync(publicDocPath("docs/theory.md"), "utf8"),
      scaffold: fs.readFileSync(publicDocPath("templates/ja/intent/README.md"), "utf8"),
    },
    en: {
      theory: fs.readFileSync(publicDocPath("docs/theory.en.md"), "utf8"),
      scaffold: fs.readFileSync(publicDocPath("templates/en/intent/README.md"), "utf8"),
    },
  };

  for (const lang of LANGS) {
    assert.deepEqual(theoryDocumentationErrors(docs[lang].theory, lang), [], lang + ": theoryの位置づけと境界が揃う");
    assert.deepEqual(scaffoldDocumentationErrors(docs[lang].scaffold, lang), [], lang + ": scaffold案内と境界が揃う");
  }
});

test("PublicDocumentation: 全8文書の採用前生成、派生、対象外を横断検査する", () => {
  const docs = {
    ja: {
      readme: fs.readFileSync(publicDocPath("README.md"), "utf8"),
      guide: fs.readFileSync(publicDocPath("docs/guide.md"), "utf8"),
      theory: fs.readFileSync(publicDocPath("docs/theory.md"), "utf8"),
      scaffold: fs.readFileSync(publicDocPath("templates/ja/intent/README.md"), "utf8"),
    },
    en: {
      readme: fs.readFileSync(publicDocPath("README.en.md"), "utf8"),
      guide: fs.readFileSync(publicDocPath("docs/guide.en.md"), "utf8"),
      theory: fs.readFileSync(publicDocPath("docs/theory.en.md"), "utf8"),
      scaffold: fs.readFileSync(publicDocPath("templates/en/intent/README.md"), "utf8"),
    },
  };

  for (const lang of LANGS) {
    assert.deepEqual(publicDocumentationErrors(docs[lang].readme, docs[lang].guide, lang), [], lang + ": README/guide");
    assert.deepEqual(theoryDocumentationErrors(docs[lang].theory, lang), [], lang + ": theory");
    assert.deepEqual(scaffoldDocumentationErrors(docs[lang].scaffold, lang), [], lang + ": scaffold");
  }
});

test("PublicDocumentation: theoryとscaffoldの採用前生成、派生、対象外の逆転を判別する", () => {
  const theory = fs.readFileSync(publicDocPath("docs/theory.md"), "utf8");
  const scaffold = fs.readFileSync(publicDocPath("templates/ja/intent/README.md"), "utf8");
  const mutations = [
    ["theoryの採用前生成禁止を逆転", theory, "採用前には何も生成しない", "採用前にも生成する", theoryDocumentationErrors],
    ["theoryの派生先を正本へ変更", theory, ".intent/nl-spec/design-frame-<frame-id>.md", ".intent/intent-tree.md", theoryDocumentationErrors],
    ["scaffoldの採用前生成禁止を逆転", scaffold, "採用前には下書きを生成しない", "採用前にも下書きを生成する", scaffoldDocumentationErrors],
    ["scaffoldの対象外を逆転", scaffold, "進捗率は対象外", "進捗率は対象", scaffoldDocumentationErrors],
  ];

  for (const [label, source, before, after, errors] of mutations) {
    const mutated = source.replace(before, after);
    assert.notEqual(mutated, source, `${label}: 違反を注入できる`);
    assert.notDeepEqual(errors(mutated, "ja"), [], `${label}: 文書同期検査が違反を検出する`);
  }
});

function integrationFixtureErrors(designerQuestions, surfacingRule, fixture) {
  const errors = [];
  const requireMatch = (text, pattern, message) => {
    const index = text.search(pattern);
    if (index < 0) errors.push(message);
    return index;
  };
  const requireOrder = (positions, message) => {
    if (positions.some((position) => position < 0)) return;
    if (!positions.every((position, index) => index === 0 || positions[index - 1] < position)) {
      errors.push(message);
    }
  };

  const roleLens = requireMatch(designerQuestions, /^2\.4\.[^\n]*ロールレンズ/m, "ロールレンズ手順がある");
  const nextStep = requireMatch(designerQuestions, /^2\.45\./m, "次のdiscover手順がある");
  const roleLensSection = roleLens >= 0 && nextStep > roleLens
    ? designerQuestions.slice(roleLens, nextStep)
    : "";
  const callInRoleLens = requireMatch(
    roleLensSection,
    /^[^\n]*ロールレンズを確定・記録した直後[^\n]*`rules\/design-frame-surfacing\.md`\s*を読み、適用する[^\n]*$/m,
    "手順2.4内でロールレンズ確定直後に提案ruleを呼ぶ",
  );
  const call = callInRoleLens >= 0 ? roleLens + callInRoleLens : -1;
  requireOrder([roleLens, call, nextStep], "提案ruleをロールレンズ確定直後かつ次の手順より前に呼ぶ");

  const lensGate = requireMatch(surfacingRule, /^1\. \*\*体験観点を意味で判断する。\*\*/m, "体験観点を意味で判断する");
  const catalogRead = requireMatch(surfacingRule, /^2\. \*\*必要になってからカタログを確認する。\*\*/m, "体験観点の後で必要時だけカタログを読む");
  const ledgerCheck = requireMatch(surfacingRule, /^\*\*採否記録を確認してから候補を提示する。\*\*/m, "候補提示前に採否記録を確認する");
  const present = requireMatch(surfacingRule, /^4\. \*\*理由付きの候補だけを提示する。\*\*/m, "採否記録の後で理由付き候補を提示する");
  const record = requireMatch(surfacingRule, /^5\. \*\*人が決めた採否を `constraint-ledger\.md` に記録する。\*\*/m, "人が決めた採否を既存の器へ記録する");
  const generate = requireMatch(surfacingRule, /^6\. \*\*採用後だけ派生下書きを生成する。\*\*/m, "採用後だけ派生生成へ進む");
  const canonicalBoundary = requireMatch(
    surfacingRule,
    /Intent Tree、Intent Compass、packetは変更しない/,
    "Intent Tree、Intent Compass、packetを変更しない",
  );
  requireOrder(
    [lensGate, catalogRead, ledgerCheck, present, record, generate, canonicalBoundary],
    "観点判定→必要時参照→採否確認→提示→記録→採用後生成→正本非変更の順を保つ",
  );

  if (fixture === "adopted") {
    requireMatch(surfacingRule, /候補ごとに確立した一般名と適合理由[^\n]*1行ずつ提示/, "理由1行付きで候補を提示する");
    requireMatch(surfacingRule, /数値順位やスコアを付けず、人の判断を待つ/, "提示後に人の判断を待つ");
    requireMatch(surfacingRule, /人が明示的に採用し、カタログに存在する既知のフレームidである、の両方を満たす場合だけ生成する/, "明示採用と既知idの両方を生成条件にする");
    requireMatch(surfacingRule, /\.intent\/nl-spec\/design-frame-<frame-id>\.md`?へ書く/, "採用時の派生出力先が所定パスである");
  } else if (fixture === "declined") {
    requireMatch(surfacingRule, /候補に採用、否認、保留のいずれかが付いたら[^\n]*constraint-ledger\.md[^\n]*1行追記/, "見送りをledgerへ記録する");
    requireMatch(surfacingRule, /採用していない場合は下書きを生成しない/, "見送り時は下書きを生成しない");
  } else if (fixture === "declined-rerun") {
    requireMatch(surfacingRule, /同じ発行系列で既に採否が付いたフレームidは再提示しない/, "同じ発行系列の見送り済み候補を再提示しない");
    requireMatch(surfacingRule, /目的・文脈が意味上変化した場合だけ[^\n]*再評価できる/, "目的または文脈が意味上変化した場合だけ再評価する");
    requireMatch(surfacingRule, /日数、回数、再提示期限などの機械条件は追加しない/, "時間や回数で再提示を解禁しない");
    requireMatch(surfacingRule, /採用していない場合は下書きを生成しない/, "再提示しない候補の下書きを生成しない");
  } else if (fixture === "no-experience-lens") {
    const silent = requireMatch(
      surfacingRule,
      /体験を設計する観点が読み取れない場合は、候補を提示せず、下書きも生成せず、従来の処理を続ける/,
      "体験観点なしでは提示・生成せず既存処理を続ける",
    );
    requireOrder([lensGate, silent, catalogRead], "体験観点なしの沈黙をカタログ参照前に判定する");
  } else if (fixture === "no-catalog") {
    const absent = requireMatch(
      surfacingRule,
      /カタログが存在しない場合は、候補を提示せず、下書きも生成せず、従来の処理を続ける/,
      "カタログ不在では提示・生成せず既存処理を続ける",
    );
    requireOrder([catalogRead, absent, ledgerCheck, present], "カタログ不在の沈黙を採否確認と候補提示より前に判定する");
  } else {
    errors.push(`未知のfixture: ${fixture}`);
  }

  return errors;
}

const DESIGN_FRAME_FLOW_FIXTURES = [
  ["体験観点あり＋採用", "adopted"],
  ["体験観点あり＋見送り", "declined"],
  ["見送り後の同一文脈再実行", "declined-rerun"],
  ["体験観点なし", "no-experience-lens"],
  ["カタログ不在", "no-catalog"],
];

test("DesignFrameFlow: 実Markdownをまたぐ5 fixtureの呼び出し順と結果境界が揃う", () => {
  const designerQuestions = fs.readFileSync(designerQuestionsPath("ja", "claude"), "utf8");
  const surfacingRule = fs.readFileSync(suggestionRulePath("ja", "claude"), "utf8");

  for (const [label, fixture] of DESIGN_FRAME_FLOW_FIXTURES) {
    assert.deepEqual(
      integrationFixtureErrors(designerQuestions, surfacingRule, fixture),
      [],
      `${label}: 横断契約が揃う`,
    );
  }
});

test("DesignFrameFlow: 過剰提示、採用前生成、再提示、canonical書き込みを生む逆転を判別する", () => {
  const designerQuestions = fs.readFileSync(designerQuestionsPath("ja", "claude"), "utf8");
  const surfacingRule = fs.readFileSync(suggestionRulePath("ja", "claude"), "utf8");
  const mutations = [
    ["体験観点なしでも提示", "no-experience-lens", "体験を設計する観点が読み取れない場合は、候補を提示せず、下書きも生成せず、従来の処理を続ける", "体験を設計する観点が読み取れない場合も、候補を提示し、下書きを生成する"],
    ["見送りでも生成", "declined", "採用していない場合は下書きを生成しない", "採用していない場合も下書きを生成する"],
    ["同一文脈で再提示", "declined-rerun", "同じ発行系列で既に採否が付いたフレームidは再提示しない", "同じ発行系列で既に採否が付いたフレームidも再提示する"],
    ["canonicalへ書き込む", "adopted", "Intent Tree、Intent Compass、packetは変更しない", "Intent Tree、Intent Compass、packetへ書き込む"],
  ];

  for (const [label, fixture, before, after] of mutations) {
    const mutated = surfacingRule.replace(before, after);
    assert.notEqual(mutated, surfacingRule, `${label}: 違反を注入できる`);
    assert.notDeepEqual(
      integrationFixtureErrors(designerQuestions, mutated, fixture),
      [],
      `${label}: 横断fixtureが違反を検出する`,
    );
  }

  const ruleReference = "`rules/design-frame-surfacing.md` を読み、適用する";
  const movedReference = designerQuestions
    .replace(ruleReference, "提案ruleを適用する")
    .replace(/^2\.45\.[^\n]*$/m, `$&\n   - ${ruleReference}。`);
  assert.notEqual(movedReference, designerQuestions, "rule参照を手順2.45より後へ移せる");
  assert.notDeepEqual(
    integrationFixtureErrors(movedReference, surfacingRule, "adopted"),
    [],
    "手順2.4から外れたrule参照を横断fixtureが検出する",
  );
});

test("BoundaryTests: 公開前のversion・依存と対象外の実装境界を保つ", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.deepEqual(packageBoundaryErrors(packageJson), [], "version・依存をこの機能のために変更しない");
  assert.deepEqual(featureChangeBoundaryErrors(), [], "変更対象を配布template・文書・検査に限定する");
});

test("BoundaryTests: 新しいsteering・正本・dogfood配置物を機能の成果物にしない", () => {
  assert.deepEqual(featureArtifactBoundaryErrors(), [], "新しい常時参照物やdogfoodコピーを追加しない");
});

test("BoundaryTests: version・依存・対象外・dogfood境界の違反を判別する", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.notDeepEqual(
    packageBoundaryErrors({ ...packageJson, version: "0.21.3" }),
    [],
    "version変更を検出する",
  );
  assert.notDeepEqual(
    packageBoundaryErrors({ ...packageJson, dependencies: { ...packageJson.dependencies, analytics: "1.0.0" } }),
    [],
    "行動analytics用依存の追加を検出する",
  );

  const forbiddenChanges = [
    "src/behavior-analytics.mjs",
    "templates/ja/intent/experience-stage-view.md",
    "templates/ja/intent/design-frame-diagram.svg",
    "templates/ja/intent/frame-progress.json",
    ".kiro/steering/service-design.md",
    ".intent/design-frames.md",
    ".claude/skills/intent-discover/rules/design-frame-surfacing.md",
  ];
  for (const file of forbiddenChanges) {
    assert.notDeepEqual(featureChangeBoundaryErrors([file]), [], `${file}: 対象外の変更を検出する`);
  }
  assert.deepEqual(
    featureChangeBoundaryErrors([
      "test/service-design-frames.test.mjs",
      "test/role-lens.test.mjs",
      "test/decision-lifecycle-relevance.test.mjs",
      "test/plainness-injection.test.mjs",
      "test/golden-locks.manifest.json",
    ]),
    [],
    "境界検査と共有QOCの責務修正は許可する",
  );
  assert.notDeepEqual(
    featureArtifactBoundaryErrors((file) => file === ".agents/skills/intent-discover/rules/design-frame-surfacing.md"),
    [],
    "dogfood配置物の追加を検出する",
  );
});
