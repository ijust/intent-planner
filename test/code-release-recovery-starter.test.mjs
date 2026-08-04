// release/configuration/recovery 領域が四つの独立判断として
// 日英・親索引・自己適用へ結線され、固定値や無条件rollbackへ退行しないことを判別する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOMAIN_FILE = "code-release-recovery.md";
const LANGS = ["ja", "en"];
const EXPECTED_IDS = [
  "backup-restore-data-function-verification",
  "configuration-semantic-validation-before-activation",
  "progressive-delivery-observe-before-expansion",
  "version-skew-upgrade-downgrade-safety",
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

test("code-release-recovery: 日英に四つの代表定石が過不足なく存在する", () => {
  for (const lang of LANGS) {
    assert.ok(fs.existsSync(domainPath(lang)), `${lang}: ${DOMAIN_FILE} が存在する`);
    assert.deepEqual(seedIds(read(domainPath(lang))).sort(), EXPECTED_IDS, `${lang}: 代表定石 ID が一致する`);
  }
});

test("code-release-recovery: 各定石が表面的成功を退ける固有の判断を持つ", () => {
  const required = {
    "configuration-semantic-validation-before-activation": [
      ["参照の解決", "reference resolution"], ["値域と単位", "ranges and units"], ["以前の有効な構成", "previously active valid configuration"],
    ],
    "progressive-delivery-observe-before-expansion": [
      ["限定した利用者", "bounded set of users"], ["帰属できる信号", "attributable to the change"], ["一時停止", "pause"],
    ],
    "version-skew-upgrade-downgrade-safety": [
      ["直列化形式", "serialization formats"], ["新旧共存", "mixed versions"], ["downgrade", "downgrade"],
    ],
    "backup-restore-data-function-verification": [
      ["隔離された場所", "isolated destination"], ["データの完全性", "recovered-data completeness"], ["主要な読書き", "critical read, write"],
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

test("code-release-recovery: 親索引と自己適用側へ同じ領域が結線される", () => {
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

test("code-release-recovery: 既存定石との境界を示し、固定値や製品を強制しない", () => {
  for (const lang of LANGS) {
    const text = read(domainPath(lang));
    for (const id of ["input-validation-boundary", "backward-compatible-migration", "remote-call-"]) {
      assert.ok(text.includes(id), `${lang}: ${id} との境界を示す`);
    }
    assert.doesNotMatch(text, /\b(?:Argo Rollouts|Flagger|Spinnaker|CodeDeploy)\b/i, `${lang}: 特定製品を標準解にしない`);
    assert.doesNotMatch(text, /\b\d+(?:\.\d+)?\s*%/, `${lang}: 公開比率を固定しない`);
    assert.doesNotMatch(text, /Invariant:.*(?:always|常に).*rollback/i, `${lang}: 無条件rollbackを不変条件にしない`);
    const recovery = seedBlock(text, "backup-restore-data-function-verification");
    assert.doesNotMatch(recovery, /\b(?:RTO|RPO)\s*(?:=|:|は)\s*\d+/i, `${lang}: RTO/RPOを固定しない`);
  }
});

test("code-release-recovery: 静的 Markdown で実行時の外部呼び出し片を含まない", () => {
  const forbidden = [/\bfetch\s*\(/, /\bnew\s+XMLHttpRequest\b/, /\bcreateConnection\b/];
  for (const lang of LANGS) {
    const text = read(domainPath(lang));
    for (const pattern of forbidden) assert.ok(!pattern.test(text), `${lang}: 外部呼び出し片を含まない (${pattern})`);
  }
});
