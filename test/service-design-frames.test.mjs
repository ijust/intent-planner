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
