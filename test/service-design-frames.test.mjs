import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
