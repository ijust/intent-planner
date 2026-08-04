// architecture-quality 領域が、抽象的な標語ではなく四つの独立判断として
// 日英・親索引・自己適用へ結線されていることを判別する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOMAIN_FILE = "code-architecture.md";
const LANGS = ["ja", "en"];
const EXPECTED_IDS = [
  "architecture-boundary-conformance-check",
  "architecture-decision-rationale-tradeoffs",
  "information-hiding-around-likely-change",
  "quality-attribute-scenario-measurable-response",
];

function domainPath(lang) {
  return path.join(ROOT, "templates", lang, "intent", "constraint-starters", DOMAIN_FILE);
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function seedIds(text) {
  return text.split("\n").map((line) => line.match(/^## id:\s*(\S+)/)).filter(Boolean).map((match) => match[1]);
}

function seedBlock(text, id) {
  const marker = `## id: ${id}\n`;
  const start = text.indexOf(marker);
  if (start < 0) return "";
  const bodyStart = start + marker.length;
  const next = text.indexOf("\n## id: ", bodyStart);
  return text.slice(bodyStart, next < 0 ? text.length : next);
}

test("code-architecture: 日英に四つの代表定石が過不足なく存在する", () => {
  for (const lang of LANGS) {
    assert.ok(fs.existsSync(domainPath(lang)), `${lang}: ${DOMAIN_FILE} が存在する`);
    assert.deepEqual(seedIds(read(domainPath(lang))).sort(), EXPECTED_IDS, `${lang}: 代表定石 ID が一致する`);
  }
});

test("code-architecture: 各定石が固有の判断と検証根拠を持つ", () => {
  const required = {
    "quality-attribute-scenario-measurable-response": [
      ["刺激の発生元", "source"], ["環境", "environment"], ["応答の測定方法", "response measure"],
    ],
    "information-hiding-around-likely-change": [
      ["設計判断", "design decision"], ["必要最小限", "smallest stable contract"], ["変更シナリオ", "change scenario"],
    ],
    "architecture-decision-rationale-tradeoffs": [
      ["代替案", "alternatives"], ["トレードオフ", "tradeoffs"], ["再検討条件", "reconsideration conditions"],
    ],
    "architecture-boundary-conformance-check": [
      ["許可依存", "allowed"], ["禁止依存", "forbidden"], ["見逃し", "false-negative"],
    ],
  };

  for (const [langIndex, lang] of LANGS.entries()) {
    const text = read(domainPath(lang));
    for (const id of EXPECTED_IDS) {
      const block = seedBlock(text, id);
      assert.ok(block, `${lang}: ${id} の本文がある`);
      for (const pair of required[id]) {
        assert.ok(block.includes(pair[langIndex]), `${lang}: ${id} が ${pair[langIndex]} を含む`);
      }
      const sourceKey = lang === "ja" ? "出典:" : "source:";
      assert.match(block, new RegExp(`${sourceKey}\\s*\\S`), `${lang}: ${id} が空でない出典を持つ`);
    }
  }
});

test("code-architecture: 親索引と自己適用側へ同じ領域が結線される", () => {
  for (const lang of LANGS) {
    const parent = read(path.join(ROOT, "templates", lang, "intent", "constraint-starters.md"));
    assert.ok(parent.includes(`constraint-starters/${DOMAIN_FILE}`), `${lang}: 親索引が領域ファイルを指す`);
  }
  assert.equal(
    read(path.join(ROOT, ".intent", "constraint-starters", DOMAIN_FILE)),
    read(domainPath("ja")),
    "自己適用側は日本語テンプレートと一致する",
  );
  assert.ok(
    read(path.join(ROOT, ".intent", "constraint-starters.md")).includes(`constraint-starters/${DOMAIN_FILE}`),
    "自己適用側の親索引が領域ファイルを指す",
  );
});

test("code-architecture: 既存テスト領域と射程を分け、様式・固定閾値を強制しない", () => {
  for (const lang of LANGS) {
    const text = read(domainPath(lang));
    assert.ok(text.includes("specification-partitions-boundaries-oracle"), `${lang}: 挙動テストとの境界を示す`);
    assert.doesNotMatch(text, /\b(?:clean|hexagonal|microservices?) architecture\b/i, `${lang}: 特定様式を標準解にしない`);
    assert.doesNotMatch(text, /\b\d+\s*(?:layers?|層)\b/i, `${lang}: 層数を固定しない`);
    const conformance = seedBlock(text, "architecture-boundary-conformance-check");
    assert.doesNotMatch(conformance, /Invariant:.*(?:all cycles|全循環)/i, `${lang}: 全循環禁止を不変条件にしない`);
  }
});

test("code-architecture: 静的 Markdown で実行時の外部呼び出し片を含まない", () => {
  const forbidden = [/\bfetch\s*\(/, /\bnew\s+XMLHttpRequest\b/, /\bcreateConnection\b/];
  for (const lang of LANGS) {
    const text = read(domainPath(lang));
    for (const pattern of forbidden) assert.ok(!pattern.test(text), `${lang}: 外部呼び出し片を含まない (${pattern})`);
  }
});
