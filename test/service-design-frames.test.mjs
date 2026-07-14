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
