// pkt-20260704-intent-coverage-map-fe7a（意図の空白地帯マップ・overview の1面）の
//   不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: 意図⇔実装の双方向トレースは「繋がっている所」の実線化だけでは完結しない — 意図が存在しない
//   領域は逆引きにも観測にも引っかからず盲点のまま残る。intent-overview に「対象範囲を指定したときだけ
//   生成する面」として coverage-map を足し、(a) packet Scope / (b) Invariant 影響パス / (c) release-note
//   派生出力のコミット紐づき の3面で突合して空白地帯を根拠付きで列挙する（C38 面(5)・A49・INV63）。
//   置き場は overview の1面 + 誘導（利用者確定 2026-07-05・新スキルは立てない）。
//   overview は SKILL 本文を hash lock しない（非 SKILL_BODY_LOCKED）ので本文を正当に編集できる。
//
// ここでは packet の Validation 判別オラクル (a)〜(e) をアンカーで discriminative に守る:
//   (a) 空白領域が根拠付きで列挙される規約（見逃さない）
//   (b) いずれかの面に当たる領域を空白と報告しない規約（誤指定しない・3面突合の定義）
//   (c) スコア・ランク・合否の語彙を出力に使わない規約（Anti-direction 302 の判別オラクル）
//   (d) canonical 不変（書込は .intent/overview/ 配下限定）
//   (e) overview の誘導からこの面に辿り着ける（誘導1行が既定出力の規約にある）
//   + 既定実行では生成しない（behavior-preserving）・git を直接読まない（tool 契約不変）・
//     実線/推測の区別を映す（INV63）・4系統パリティ・dogfood 同期
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

function rulePath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-overview", "rules", "coverage-map.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-overview", "SKILL.md");
}

// ---- 1. rule が4系統に存在し、3面（packet / Invariant 影響パス / release-note 出力）の突合を定義する（(a)(b)） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`1(a)(b): ${lang}/${agent} の coverage-map rule が存在し3面の突合を定義する`, () => {
      const p = rulePath(lang, agent);
      assert.ok(fs.existsSync(p), `${lang}/${agent}: rules/coverage-map.md が存在する`);
      const c = fs.readFileSync(p, "utf8");
      // 3面の定義（(b) の「いずれかに当たれば空白でない」判定の土台）。
      assert.ok(/\(a\)/.test(c) && /\(b\)/.test(c) && /\(c\)/.test(c), `${lang}/${agent}: 3面 (a)(b)(c) の定義がある`);
      assert.ok(/Scope/.test(c), `${lang}/${agent}: (a) packet Scope 面がある`);
      const impactPath = lang === "ja" ? /影響パス/ : /impact path/i;
      assert.ok(impactPath.test(c), `${lang}/${agent}: (b) Invariant 影響パス面がある（A38 記法の再利用）`);
      assert.ok(/release-note/.test(c), `${lang}/${agent}: (c) release-note 派生出力面がある`);
      // (a) 空白の列挙は根拠付き。
      const grounds = lang === "ja" ? /根拠/ : /grounds/i;
      assert.ok(grounds.test(c), `${lang}/${agent}: 空白地帯は根拠付きで列挙する規約`);
    });
  }
}

// ---- 2(c). スコア化・通信簿化しない（Anti-direction 302 の判別オラクル） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`2(c): ${lang}/${agent} の coverage-map がスコア・ランク・合否の語彙を禁じる（AD302）`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      assert.ok(/302/.test(c), `${lang}/${agent}: Anti-direction 302 に触れる`);
      const noScore = lang === "ja" ? /スコア|ランク/ : /score|rank/i;
      assert.ok(noScore.test(c), `${lang}/${agent}: スコア/ランクを付けない旨の明記`);
      const notBad = lang === "ja" ? /空白＝悪.*断定.*語彙を使わない|「空白＝悪」と断定する語彙/ : /blank = bad/i;
      assert.ok(notBad.test(c), `${lang}/${agent}: 「空白＝悪」と断定しない明記（正当な空白がある）`);
    });
  }
}

// ---- 3(d). 書込境界: .intent/overview/ 配下限定・canonical を書き換えない ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`3(d): ${lang}/${agent} の coverage-map の書込が .intent/overview/ 配下限定`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      assert.ok(c.includes(".intent/overview/coverage-map.md"), `${lang}/${agent}: 出力先が overview 配下の別ファイル`);
      const boundary = lang === "ja" ? /canonical へ書かない|canonical を書き換えない/ : /never (write to|rewrite) the canonical/i;
      assert.ok(boundary.test(c), `${lang}/${agent}: canonical へ書かない明記`);
    });
  }
}

// ---- 4. 既定実行では生成しない（behavior-preserving）・git を直接読まない（tool 契約不変） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の coverage-map が既定実行で走らず git を直接読まない`, () => {
      const c = fs.readFileSync(rulePath(lang, agent), "utf8");
      const optIn = lang === "ja" ? /指定したときだけ|既定にしない/ : /only when the user specif|Never scan the whole repo by default/i;
      assert.ok(optIn.test(c), `${lang}/${agent}: 対象範囲の指定があるときだけ生成（既定で走らない）`);
      const noGit = lang === "ja" ? /git を直接読まない/ : /Never read git directly/i;
      assert.ok(noGit.test(c), `${lang}/${agent}: git を直接読まない（tool 契約 Read\/Glob\/Grep\/Write のまま）`);
      // INV63: 実線/推測の区別を映す。
      const mirror = lang === "ja" ? /実線.*推測.*区別|区別.*映し/ : /solid link.*guess|mirror/i;
      assert.ok(mirror.test(c), `${lang}/${agent}: (c) 面で実線/推測の区別を映す（INV63）`);
    });
  }
}

// ---- 5(e). SKILL が委譲と誘導を持つ（既定出力に誘導1行・対象範囲指定で生成） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5(e): ${lang}/${agent} の overview SKILL が coverage-map への委譲と誘導を持つ`, () => {
      const c = fs.readFileSync(skillPath(lang, agent), "utf8");
      assert.ok(c.includes("rules/coverage-map.md"), `${lang}/${agent}: Step 2 に coverage-map への委譲がある`);
      assert.ok(c.includes(".intent/overview/coverage-map.md"), `${lang}/${agent}: 出力先の明記がある`);
      // 誘導（既定出力の Output Description に毎回出す1行）。
      const pointer = lang === "ja" ? /誘導/ : /pointer/i;
      assert.ok(pointer.test(c), `${lang}/${agent}: Output に誘導の規約がある`);
      // 既定実行は従来どおり（behavior-preserving）。
      const bp = /behavior-preserving/i;
      assert.ok(bp.test(c), `${lang}/${agent}: 既定実行の出力・所要が従来どおりの明記`);
    });
  }
}

// ---- 6. rule が claude⇔codex で byte 等価（パリティ） ----
for (const lang of LANGS) {
  test(`6: ${lang} の coverage-map rule が claude⇔codex で byte 等価`, () => {
    assert.equal(
      fs.readFileSync(rulePath(lang, "claude"), "utf8"),
      fs.readFileSync(rulePath(lang, "codex"), "utf8"),
      `${lang}: coverage-map rule が claude⇔codex で byte 等価`,
    );
  });
}

// ---- 7. dogfood（.claude）が parent と同期している ----
test("7: dogfood .claude に coverage-map が同期されている（存在すれば検査）", () => {
  const dogfoodRule = path.join(REPO_ROOT, ".claude", "skills", "intent-overview", "rules", "coverage-map.md");
  const dogfoodSkill = path.join(REPO_ROOT, ".claude", "skills", "intent-overview", "SKILL.md");
  if (fs.existsSync(dogfoodRule)) {
    assert.equal(
      fs.readFileSync(dogfoodRule, "utf8"),
      fs.readFileSync(rulePath("ja", "claude"), "utf8"),
      "dogfood coverage-map rule は ja/claude と byte 同一",
    );
  }
  if (fs.existsSync(dogfoodSkill)) {
    assert.ok(fs.readFileSync(dogfoodSkill, "utf8").includes("rules/coverage-map.md"), "dogfood SKILL が委譲を含む");
  }
});
