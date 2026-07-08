// question-packs (案件種別の質問パック) 専用テスト (node:test 標準・依存ゼロ)。
// packet: pkt-20260708-question-packs-catalog-vuli (C52 / A59 / DR115 / INV74)。
//
// 範囲: 静的カタログ (templates/{ja,en}/intent/question-packs.md) と discover の照合 rule
//   (question-pack-surfacing.md) の規範文の判別オラクルを READ-ONLY で検証する:
//     群A: カタログが ja/en に実在し、スキーマ (適合する状況 / なぜ聞くか) と seed 4 pack を持つ。
//     群B: カタログ冒頭に「候補提示のみ・自動転記しない・不在なら何も起きない」の規範文がある。
//          出典規律 (ハイブリッド: 一次情報=出典必須・経験則=由来) が明記され、各 pack が
//          出典/由来 行を持つ (出所不明の定石を断定調で配らない)。
//     群C: 照合 rule が4系統に実在し、規範文 (候補提示のみ / 弱ければ黙る / 不在なら沈黙 /
//          チェックリスト化しない) を持ち、claude↔codex byte 同一・agent 中立。
//     群D: designer-questions.md が照合 rule への結線 (手順 2.45) を持つ (4系統)。
//     群E: 器の分離と SKILL 非接触 — constraint-starters (親カタログ) と discover SKILL.md
//          (SKILL_BODY_LOCKED) が question-pack に言及しない (別カタログ原則 DR30/DR115・
//          rules 層拡張で golden 非随伴の証拠)。
//     群F: dogfood (.claude/skills の rule / .intent のカタログ) が templates ja と byte 同一。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"];
const RULE = "question-pack-surfacing";

const SEED_PACK_IDS = [
  "proposal-planning",
  "research-summary",
  "article-outline",
  "event-planning",
];

function catalogPath(lang) {
  return path.join(TEMPLATES, lang, "intent", "question-packs.md");
}
function rulePath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-discover", "rules", `${RULE}.md`);
}
function dqPath(lang, agent) {
  return path.join(
    TEMPLATES, lang, agent, "skills", "intent-discover", "rules", "designer-questions.md",
  );
}

// ---- 群A: カタログの実在・スキーマ・seed 4 pack ----

const SCHEMA_TOKENS = {
  ja: { fits: "適合する状況", why: "なぜ聞くか" },
  en: { fits: "fits when", why: "why we ask" },
};

for (const lang of LANGS) {
  test(`群A: ${lang} カタログが実在しスキーマと seed 4 pack を持つ`, () => {
    const p = catalogPath(lang);
    assert.ok(fs.existsSync(p), `${lang}: templates/${lang}/intent/question-packs.md が実在する`);
    const content = fs.readFileSync(p, "utf8");
    const tok = SCHEMA_TOKENS[lang];
    assert.ok(content.includes(tok.fits), `${lang}: スキーマに ${tok.fits} がある`);
    assert.ok(content.includes(tok.why), `${lang}: 各問に「${tok.why}」を添える規約がある`);
    for (const id of SEED_PACK_IDS) {
      assert.ok(content.includes(`## id: ${id}`), `${lang}: seed pack ${id} がある`);
    }
  });
}

// ---- 群B: カタログの堰の規範文と出典規律 (ハイブリッド) ----

const CATALOG_ANCHORS = {
  ja: [
    // 候補提示のみ・採否は人 (INV74 の堰)
    "提示は候補まで",
    // 自動転記しない
    "自動で書き込まれることはありません",
    // 不在なら何も起きない (後方互換)
    "このカタログが無い環境では何も起きません",
    // チェックリスト化しない (推論+確認の既定を置き換えない)
    "推論+確認",
    // 出典規律 (ハイブリッド)
    "一次情報のある問い",
    "経験則の問い",
    // 静的 (実行時外部呼び出しなし)
    "静的な文書",
  ],
  en: [
    "Presentation stops at **candidates**",
    "auto-written",
    "Where this catalog is absent, nothing happens",
    "infer + confirm",
    "primary sources",
    "Rule-of-thumb questions",
    "static document",
  ],
};

for (const lang of LANGS) {
  test(`群B: ${lang} カタログが堰の規範文と出典規律を持つ`, () => {
    const content = fs.readFileSync(catalogPath(lang), "utf8");
    for (const anchor of CATALOG_ANCHORS[lang]) {
      assert.ok(content.includes(anchor), `${lang}: カタログにアンカー「${anchor}」がある`);
    }
    // 各 seed pack が 出典/由来 行を持つ (出所を正直に書く規律の実効)。
    const originToken = lang === "ja" ? "出典/由来:" : "source/origin:";
    const count = content.split(originToken).length - 1;
    assert.ok(
      count >= SEED_PACK_IDS.length,
      `${lang}: 出典/由来 行が seed 数 (${SEED_PACK_IDS.length}) 以上ある (実数 ${count})`,
    );
  });
}

// ---- 群C: 照合 rule の実在・規範文・byte 同一・agent 中立 ----

const RULE_ANCHORS = {
  ja: ["候補提示のみ", "当てはまりが弱ければ黙る", "不在ならスキップして沈黙", "チェックリスト化・ゲート化をしない"],
  en: ["Candidates only", "Stay silent on a weak fit", "skip silently", "checklist or a gate"],
};

for (const lang of LANGS) {
  test(`群C: ${lang} 照合 rule が実在し規範文を持ち claude↔codex byte 同一・agent 中立`, () => {
    for (const agent of AGENTS) {
      const p = rulePath(lang, agent);
      assert.ok(fs.existsSync(p), `${lang}/${agent}: rules/${RULE}.md が実在する`);
      const content = fs.readFileSync(p, "utf8");
      for (const anchor of RULE_ANCHORS[lang]) {
        assert.ok(content.includes(anchor), `${lang}/${agent}: rule にアンカー「${anchor}」がある`);
      }
      assert.ok(
        !content.includes("AskUserQuestion"),
        `${lang}/${agent}: rule に agent 固有語 AskUserQuestion を含まない`,
      );
    }
    const claudeBuf = fs.readFileSync(rulePath(lang, "claude"));
    const codexBuf = fs.readFileSync(rulePath(lang, "codex"));
    assert.ok(claudeBuf.equals(codexBuf), `${lang}: rule が claude↔codex で byte 同一`);
  });
}

// ---- 群D: designer-questions.md の結線 (手順 2.45) ----

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群D: ${lang}/${agent} designer-questions.md が question-pack-surfacing への結線を持つ`, () => {
      const content = fs.readFileSync(dqPath(lang, agent), "utf8");
      assert.ok(
        content.includes("question-pack-surfacing.md"),
        `${lang}/${agent}: designer-questions.md が rules/question-pack-surfacing.md を参照する`,
      );
      assert.ok(content.includes("2.45"), `${lang}/${agent}: 手順 2.45 として結線されている`);
    });
  }
}

// ---- 群E: 器の分離と discover SKILL 非接触 ----
// 別カタログ原則: constraint-starters (親カタログ) は問いのカタログに言及しない。
// SKILL_BODY_LOCKED の discover SKILL.md に触れずに rules 層だけで届いている証拠。

for (const lang of LANGS) {
  test(`群E: ${lang} constraint-starters 親カタログと discover SKILL.md が question-pack に言及しない`, () => {
    const starters = fs.readFileSync(
      path.join(TEMPLATES, lang, "intent", "constraint-starters.md"), "utf8",
    );
    assert.ok(
      !starters.includes("question-pack"),
      `${lang}: constraint-starters.md に question-pack への言及が無い (別カタログ原則)`,
    );
    for (const agent of AGENTS) {
      const skill = fs.readFileSync(
        path.join(TEMPLATES, lang, agent, "skills", "intent-discover", "SKILL.md"), "utf8",
      );
      assert.ok(
        !skill.includes("question-pack"),
        `${lang}/${agent}: discover SKILL.md (ロック対象) に question-pack への言及が無い (rules 層拡張)`,
      );
    }
  });
}

// ---- 群F: dogfood 同期 (byte 同一・反映漏れ防止) ----

test("群F: dogfood の照合 rule とカタログが templates ja と byte 同一", () => {
  const dogfoodRule = path.join(
    REPO_ROOT, ".claude", "skills", "intent-discover", "rules", `${RULE}.md`,
  );
  assert.ok(fs.existsSync(dogfoodRule), "dogfood に question-pack-surfacing.md が実在する");
  assert.ok(
    fs.readFileSync(dogfoodRule).equals(fs.readFileSync(rulePath("ja", "claude"))),
    "dogfood rule と templates/ja/claude が byte 同一",
  );

  const dogfoodCatalog = path.join(REPO_ROOT, ".intent", "question-packs.md");
  assert.ok(fs.existsSync(dogfoodCatalog), "dogfood に .intent/question-packs.md が実在する");
  assert.ok(
    fs.readFileSync(dogfoodCatalog).equals(fs.readFileSync(catalogPath("ja"))),
    "dogfood カタログと templates/ja/intent が byte 同一",
  );

  const dogfoodDq = path.join(
    REPO_ROOT, ".claude", "skills", "intent-discover", "rules", "designer-questions.md",
  );
  assert.ok(
    fs.readFileSync(dogfoodDq).equals(fs.readFileSync(dqPath("ja", "claude"))),
    "dogfood designer-questions.md と templates/ja/claude が byte 同一",
  );
});
