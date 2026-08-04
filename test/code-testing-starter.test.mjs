// constraint-starters の新領域 code-testing が、実際の判断内容を保ったまま
// 日英・親索引・自己適用へ結線されていることを判別する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const DOMAIN_FILE = "code-testing.md";
const LANGS = ["ja", "en"];
const EXPECTED_IDS = [
  "property-based-testing-when-properties-exist",
  "selective-mutation-testing-for-suite-efficacy",
  "specification-partitions-boundaries-oracle",
];

function domainPath(lang) {
  return path.join(ROOT, "templates", lang, "intent", "constraint-starters", DOMAIN_FILE);
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function seedIds(text) {
  return text
    .split("\n")
    .map((line) => line.match(/^## id:\s*(\S+)/))
    .filter(Boolean)
    .map((match) => match[1]);
}

function seedBlock(text, id) {
  const marker = `## id: ${id}\n`;
  const start = text.indexOf(marker);
  if (start < 0) return "";
  const bodyStart = start + marker.length;
  const next = text.indexOf("\n## id: ", bodyStart);
  return text.slice(bodyStart, next < 0 ? text.length : next);
}

test("code-testing: 日英に三つの代表定石が過不足なく存在する", () => {
  for (const lang of LANGS) {
    assert.ok(fs.existsSync(domainPath(lang)), `${lang}: ${DOMAIN_FILE} が存在する`);
    assert.deepEqual(seedIds(read(domainPath(lang))).sort(), EXPECTED_IDS, `${lang}: 代表定石 ID が一致する`);
  }
});

test("code-testing: 各定石が名前だけでなく固有の判断内容と出典を持つ", () => {
  const required = {
    "specification-partitions-boundaries-oracle": [
      ["同値クラス", "equivalence classes"],
      ["境界", "boundar"],
      ["オラクル", "oracle"],
    ],
    "property-based-testing-when-properties-exist": [
      ["入力生成器", "generator"],
      ["縮小", "shrinking"],
      ["具体例", "example"],
    ],
    "selective-mutation-testing-for-suite-efficacy": [
      ["選び", "Select"],
      ["生き残った変異", "surviving mutants"],
      ["単一スコア", "one score"],
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

test("code-testing: 親索引と自己適用側へ同じ領域が結線される", () => {
  for (const lang of LANGS) {
    const parent = read(path.join(ROOT, "templates", lang, "intent", "constraint-starters.md"));
    assert.ok(parent.includes(`constraint-starters/${DOMAIN_FILE}`), `${lang}: 親索引が領域ファイルを指す`);
  }

  const ja = read(domainPath("ja"));
  const dogfood = read(path.join(ROOT, ".intent", "constraint-starters", DOMAIN_FILE));
  assert.equal(dogfood, ja, "自己適用側は日本語テンプレートと一致する");
  assert.ok(
    read(path.join(ROOT, ".intent", "constraint-starters.md")).includes(`constraint-starters/${DOMAIN_FILE}`),
    "自己適用側の親索引が領域ファイルを指す",
  );
});

test("code-testing: 既存定石との境界を明示し、固定数値目標を持ち込まない", () => {
  for (const lang of LANGS) {
    const text = read(domainPath(lang));
    assert.ok(text.includes("current-time-injectable-clock"), `${lang}: 時刻制御との境界を示す`);
    assert.ok(text.includes("state-machine-path-and-failure-testing"), `${lang}: 状態遷移テストとの境界を示す`);
    assert.doesNotMatch(text, /\b\d+(?:\.\d+)?\s*%/, `${lang}: 共通の達成率を数値で固定しない`);
  }
});

test("code-testing: 静的 Markdown で実行時の外部呼び出し片を含まない", () => {
  const forbidden = [/\bfetch\s*\(/, /\bnew\s+XMLHttpRequest\b/, /\bcreateConnection\b/];
  for (const lang of LANGS) {
    const text = read(domainPath(lang));
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(text), `${lang}: 外部呼び出し片を含まない (${pattern})`);
    }
  }
});
