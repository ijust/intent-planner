// pkt-20260704-bug-intent-triage-w7p9（不具合の学びの帰責分類）の
//   不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: バグ修正の学びが「実装の誤り／意図の欠落／意図の誤り」のどれかで戻し先が違うのに、
//   writeback の delta は学びを一律に記録し帰責の別が残らなかった。意図の穴が原因の不具合が
//   繰り返されても構造が記録から見えない。writeback-protocol §2 の既存5タグに帰責3タグ
//   （[bug-impl]/[bug-intent-gap]/[bug-intent-wrong]）を pure addition で足し、分類に応じた
//   戻し先（意図側は無傷／Open Questions・packet 候補／compass 改訂候補）を提案どまりで案内する
//   （C38/L0/C8/C2・A49・INV63・INV29）。
//   writeback は SKILL 本文を hash lock しない（非 SKILL_BODY_LOCKED）ので rules を正当に編集できる。
//
// ここでは packet の Validation 判別オラクル (a)〜(d) をアンカーで discriminative に守る:
//   (a) 分類なしの従来 delta が従来どおり通る（必須化しない・Anti-direction 298）
//   (b) 「意図の誤り」で compass が自動変更されない（人間承認の堰・Anti-direction 303）
//   (c) 分類タグ+根拠が既存の学び行書式に乗る（分類を落とさない）
//   (d) 複合原因は分類保留できる（単一分類を強制しない）
//   + 既存5タグの意味・書式不変（INV29 pure addition）・過去 delta 後埋めなし（AD304）・
//     AI 判定を最終値にしない（AD299）・4系統パリティ・glossary 登録（dogfood）
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

const BUG_TAGS = ["[bug-impl]", "[bug-intent-gap]", "[bug-intent-wrong]"];
const EXISTING_TAGS = ["[decision]", "[invariant-violation]", "[implicit-behavior]", "[deferred-resolved]", "[question]"];

function protoPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-writeback", "rules", "writeback-protocol.md");
}

// ---- 1(c). 帰責3タグが §2 に存在し、既存5タグも不変で残る（pure addition・INV29） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1(c): ${lang}/${agent} の writeback-protocol に帰責3タグがあり既存5タグも不変で残る`, () => {
      const c = fs.readFileSync(protoPath(lang, agent), "utf8");
      for (const tag of BUG_TAGS) {
        assert.ok(c.includes(`\`${tag}\``), `${lang}/${agent}: 帰責タグ ${tag} がある`);
      }
      for (const tag of EXISTING_TAGS) {
        assert.ok(c.includes(`\`${tag}\``), `${lang}/${agent}: 既存タグ ${tag} が残っている（pure addition）`);
      }
      assert.ok(/INV29/.test(c), `${lang}/${agent}: INV29（既存タグ体系を壊さない）に触れる`);
    });
  }
}

// ---- 2(a). 任意であり必須化しない（分類なし delta は従来どおり・Anti-direction 298） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2(a): ${lang}/${agent} の帰責分類が任意（必須化しない・AD298）`, () => {
      const c = fs.readFileSync(protoPath(lang, agent), "utf8");
      const optional = lang === "ja" ? /任意.*必須化しない|付けるかは任意/ : /optional.*never mandatory|Attaching one is optional/is;
      assert.ok(optional.test(c), `${lang}/${agent}: 分類は任意で必須化しない明記`);
      assert.ok(/298/.test(c), `${lang}/${agent}: Anti-direction 298 を継承`);
    });
  }
}

// ---- 3(b). 「意図の誤り」は compass 改訂候補まで（自動変更しない・人間承認の堰・AD303） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3(b): ${lang}/${agent} の [bug-intent-wrong] が compass を自動変更しない（承認の堰・AD303）`, () => {
      const c = fs.readFileSync(protoPath(lang, agent), "utf8");
      assert.ok(/303/.test(c), `${lang}/${agent}: Anti-direction 303（compass 自動書込禁止）を継承`);
      const weir = lang === "ja" ? /人間承認が堰|承認が堰/ : /human approval is the weir/i;
      assert.ok(weir.test(c), `${lang}/${agent}: 人間承認が堰である明記`);
      const candidate = lang === "ja" ? /改訂\*?\*?候補/ : /revision \*?\*?candidate/i;
      assert.ok(candidate.test(c), `${lang}/${agent}: compass への反映は改訂候補どまり（提案）の明記`);
    });
  }
}

// ---- 4(d). 複合原因は分類保留できる（単一分類を強制しない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4(d): ${lang}/${agent} が複合原因の分類保留を許す（単一分類を強制しない）`, () => {
      const c = fs.readFileSync(protoPath(lang, agent), "utf8");
      const hold = lang === "ja" ? /分類保留|単一分類を強制せず/ : /unclassified|do not force a single classification/i;
      assert.ok(hold.test(c), `${lang}/${agent}: 分類保留（単一分類を強制しない）の明記`);
    });
  }
}

// ---- 5. AI 判定を最終値にしない（AD299）・過去 delta の後埋めなし（AD304） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} が AI 判定を最終値にせず（AD299）過去 delta を後埋めしない（AD304）`, () => {
      const c = fs.readFileSync(protoPath(lang, agent), "utf8");
      assert.ok(/299/.test(c), `${lang}/${agent}: Anti-direction 299（AI 判定を最終値にしない）を継承`);
      assert.ok(/304/.test(c), `${lang}/${agent}: Anti-direction 304（過去 delta の後埋めをしない）を継承`);
    });
  }
}

// ---- 6. 3分類それぞれの戻し先が揃っている（意図側無傷 / Open Questions・packet 種 / compass 改訂候補） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`6: ${lang}/${agent} の3分類に戻し先の案内が揃っている`, () => {
      const c = fs.readFileSync(protoPath(lang, agent), "utf8");
      assert.ok(/Open Questions/.test(c), `${lang}/${agent}: [bug-intent-gap] の戻し先に Open Questions がある`);
      const untouched = lang === "ja" ? /意図.*無傷|意図（tree\/compass\/packet）は触らない/ : /intent side is untouched|Do not touch the intent/i;
      assert.ok(untouched.test(c), `${lang}/${agent}: [bug-impl] は意図側無傷の明記`);
    });
  }
}

// ---- 7. rules が claude⇔codex で byte 等価（パリティ） ----
for (const lang of LANGS) {
  test(`7: ${lang} の writeback-protocol が claude⇔codex で byte 等価`, () => {
    assert.equal(
      fs.readFileSync(protoPath(lang, "claude"), "utf8"),
      fs.readFileSync(protoPath(lang, "codex"), "utf8"),
      `${lang}: writeback-protocol が claude⇔codex で byte 等価`,
    );
  });
}

// ---- 8. dogfood（.claude / .intent）が parent と同期している ----
test("8: dogfood .claude/.intent に帰責3タグが同期されている（存在すれば検査）", () => {
  const dogfoodProto = path.join(REPO_ROOT, ".claude", "skills", "intent-writeback", "rules", "writeback-protocol.md");
  const dogfoodGlossary = path.join(REPO_ROOT, ".intent", "glossary.md");
  if (fs.existsSync(dogfoodProto)) {
    const c = fs.readFileSync(dogfoodProto, "utf8");
    for (const tag of BUG_TAGS) {
      assert.ok(c.includes(`\`${tag}\``), `dogfood writeback-protocol が ${tag} を含む`);
    }
    assert.equal(
      c,
      fs.readFileSync(protoPath("ja", "claude"), "utf8"),
      "dogfood writeback-protocol は ja/claude と byte 同一",
    );
  }
  if (fs.existsSync(dogfoodGlossary)) {
    assert.ok(fs.readFileSync(dogfoodGlossary, "utf8").includes("bug-intent-gap"), "dogfood glossary が帰責タグを含む");
  }
});
