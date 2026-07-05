// constraint-starters の新領域 code-ai-llm の構造オラクル。
//
// 背景: LLM・生成 AI をプロダクトへ組み込む案件に固有のリスク（プロンプトインジェクション・
//   LLM 出力の未検証実行・エージェントの過剰権限・プロンプト経由の機微情報漏えい）は、既存の
//   code-security（古典的な OWASP 系）に無い横断関心のため、独立領域ファイル
//   constraint-starters/code-ai-llm.md として新設し親カタログ（領域インデックス）へ登録した。
//   汎用テスト（constraint-starters.test.mjs）は seed の床（件数・出典必須・静的性・別カタログ分離）
//   を見るが、この領域ファイルの存在・領域登録・seed を名指ししないため、領域ファイルが消えても・
//   親カタログから索引が外れても全テスト green のまま漏れる（code-vcs-hygiene 前例と同型の薄さ）。
//   ここでは「領域ファイルが ja/en に在る・親カタログがそれを索引する・seed を持ち各 seed が出典を
//   持つ・code-security と射程を分ける」を discriminative に名指しし、欠落・索引外れを落とす。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const LANGS = ["ja", "en"];
const DOMAIN_FILE = "code-ai-llm.md";

function domainPath(lang) {
  return path.join(ROOT, "templates", lang, "intent", "constraint-starters", DOMAIN_FILE);
}
function parentCatalogPath(lang) {
  return path.join(ROOT, "templates", lang, "intent", "constraint-starters.md");
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}

// seed 定石ブロック（`## id:` 見出し）の id を抽出する。
function seedIds(text) {
  return text
    .split("\n")
    .map((l) => l.match(/^## id:\s*(\S+)/))
    .filter(Boolean)
    .map((m) => m[1]);
}

// ---- 1. 領域ファイルが ja/en に存在し seed を2件以上持つ ----
test("code-ai-llm: ja/en に領域ファイルが存在し seed を2件以上持つ", () => {
  for (const lang of LANGS) {
    const p = domainPath(lang);
    assert.ok(fs.existsSync(p), `${lang}: ${DOMAIN_FILE} が存在する`);
    const ids = seedIds(read(p));
    assert.ok(ids.length >= 2, `${lang}: seed 定石が2件以上 (実際 ${ids.length})`);
  }
});

// ---- 2. ja/en で seed id 集合が一致する（系統間パリティ） ----
test("code-ai-llm: ja/en の seed id 集合が一致する", () => {
  const ja = seedIds(read(domainPath("ja"))).sort();
  const en = seedIds(read(domainPath("en"))).sort();
  assert.deepEqual(ja, en, "ja/en の seed id 集合が一致する（取りこぼし無し）");
});

// ---- 3. 親カタログ（領域インデックス）が本領域ファイルを索引する ----
// 索引が外れると遅延ロードの入口を失い、領域が事実上死ぬ。これを落とす。
test("code-ai-llm: 親カタログが領域ファイルを索引する", () => {
  for (const lang of LANGS) {
    const parent = read(parentCatalogPath(lang));
    assert.ok(
      parent.includes(`constraint-starters/${DOMAIN_FILE}`),
      `${lang}: 親カタログが ${DOMAIN_FILE} へのパスを索引する`,
    );
  }
});

// ---- 4. 各 seed が出典フィールドを持つ（出典必須・出典なしを落とせる） ----
test("code-ai-llm: 全 seed が空でない出典フィールドを持つ", () => {
  for (const lang of LANGS) {
    const text = read(domainPath(lang));
    const srcKey = lang === "ja" ? "出典:" : "source:";
    // seed ブロックごとに出典を確認する。`## id:` で分割して各ブロックを見る。
    const blocks = text.split(/^## id:/m).slice(1);
    assert.ok(blocks.length >= 1, `${lang}: seed ブロックがある`);
    for (const b of blocks) {
      const m = b.match(new RegExp(`${srcKey}\\s*(\\S.*)`));
      assert.ok(m && m[1].trim().length > 0, `${lang}: 各 seed が空でない ${srcKey} を持つ`);
    }
  }
});

// ---- 5. code-security と射程を分ける明文がある（重複領域の棲み分け） ----
// 眼目: 古典的なインジェクション対策(code-security) と LLM 固有の入出力・権限経路(本領域)を分け、
// LLM 出力の下流利用では code-security の定石と併走させる旨を明文で持つ。
test("code-ai-llm: code-security と射程を分ける明文を持つ", () => {
  for (const lang of LANGS) {
    const text = read(domainPath(lang));
    assert.ok(
      text.includes("code-security.md"),
      `${lang}: code-security.md を名指しして棲み分けを述べる`,
    );
  }
});

// ---- 6. 静的 Markdown（実行時の外部呼び出し片を含まない） ----
test("code-ai-llm: 静的 Markdown で実行時の外部呼び出し片を含まない", () => {
  const forbidden = [/\bfetch\s*\(/, /\bnew\s+XMLHttpRequest\b/, /\bcreateConnection\b/];
  for (const lang of LANGS) {
    const text = read(domainPath(lang));
    for (const re of forbidden) {
      assert.ok(!re.test(text), `${lang}: 外部呼び出し片を含まない (${re})`);
    }
  }
});
