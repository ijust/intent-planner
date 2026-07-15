// domain-vessel（federated-governance の入れ物＝領域定義 + owner 宣言の seam・
//   C-fed1 / DR192 / DR193 / INV101）の不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: 領域ガバナンスの読み手（improve/validate の領域スコープ・writeback/compass の
//   気づき）が立つには、その前に「領域定義（追跡・共有）と owner 宣言（非追跡・ローカル）」
//   の置き場が要る。本 packet はその seam（接合面）だけを確立し、読み手が未実装の間は
//   全挙動不変（付加前 behavior-preserving）。
//
// ここで落とす誤実装（discriminative oracle・独立レビュー 2026-07-15 の教訓＝見出し語
//   一致でなく実質を検査する）:
//   - domains README scaffold が ja/en のどちらかに無い（配布漏れ）
//   - 領域定義が記号目録を持ってしまう（DR193 違反＝タグと二重管理・食い違いの温床）
//   - owner 宣言を git 追跡にしてしまう（DR192 違反＝組織情報を共有物に載せる）
//   - installer が domains/README を user-data に分類しない（upgrade で上書き）
//   - installer が owners/ を gitignore しない（owner 宣言が追跡される）
//   - CONTRACT の読み手契約が「gate にしない/従来動作」を落とす（INV101 違反）
//   - パリティ崩れ（片方の variant だけ契約が抜ける）
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

function domainsReadme(lang) {
  return path.join(TEMPLATES, lang, "intent", "domains", "README.md");
}
function contractPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "CONTRACT.md");
}

// ---- 1. domains README scaffold が ja/en 両方に在り、DR192/DR193 の実質を持つ ----
for (const lang of LANGS) {
  test(`1: ${lang} の domains/README が領域定義 + owner 宣言の実質を持つ`, () => {
    const p = domainsReadme(lang);
    assert.ok(fs.existsSync(p), `${p} が存在する`);
    const c = fs.readFileSync(p, "utf8");
    // 領域定義（追跡・共有）と owner 宣言（非追跡・ローカル）の2種を持つ。
    assert.ok(/owners\//.test(c), `${lang}: owner 宣言のディレクトリ owners/ に触れる`);
    // DR193 の実質: 記号→領域の正はタグだけ・宣言は記号目録を持たない。
    assert.ok(
      /DR193/.test(c) && /(タグ|tags?)/i.test(c),
      `${lang}: 記号→領域の正はタグだけ（DR193・宣言が記号目録を持たない）旨に触れる`,
    );
    // DR192 の実質: owner は非追跡（組織情報を共有物に載せない）。
    assert.ok(
      /DR192/.test(c) && /(非追跡|untracked|ローカル|local)/i.test(c),
      `${lang}: owner 宣言は非追跡・ローカル（DR192）旨に触れる`,
    );
    // INV91 の実質: 削除は人手・止めない。
    assert.ok(
      /INV91/.test(c) && /(削除は人手|deletion is manual|止め|stop)/i.test(c),
      `${lang}: owner 宣言の削除は人手・止めない（INV91）旨に触れる`,
    );
    // 恒久フォールバック: domains 不在なら従来動作。
    assert.ok(
      /(従来動作|behave as before|legacy behavior|フォールバック|fallback)/i.test(c) && /INV101/.test(c),
      `${lang}: domains 不在なら従来動作（恒久フォールバック・INV101）旨に触れる`,
    );
  });
}

// ---- 2. 領域定義が記号目録を持たない（DR193 の実質・空洞化を落とす） ----
//   独立レビュー教訓: 「記号目録を持たない」と書くだけでなく、実際に記号（INV/DR/Anti + 番号）
//   の列挙表になっていないことを検査する。領域定義表に記号 ID がずらりと並んでいたら DR193 違反。
for (const lang of LANGS) {
  test(`2: ${lang} の domains/README が記号目録を持たない（表・散文・箇条書き問わず）`, () => {
    const c = fs.readFileSync(domainsReadme(lang), "utf8");
    // DR193 の実質: 「記号→領域の対応の正はタグだけ」ゆえ、領域定義はどこにも compass 記号
    //   （INV/DR/Anti + 番号）の目録を持たない。独立レビュー 2026-07-15 の Medium 指摘＝当初
    //   テーブル行だけを見ていたため、散文・箇条書きで書かれた記号目録を見逃した。
    //   実質を検査する: 目録化の徴候は「記号 ID が塊で列挙される」こと（表の1セル・1行・1箇条書き項目に
    //   多数の番号付き記号が並ぶ）。正当な規律参照は1文に高々2個（「タグ（INV47）…対応の正はタグだけ・DR193」
    //   「従来動作・INV101/DR133 と同型」等）に留まるが、記号→領域の対応表は3個以上を1行に並べる
    //   （`always: INV1, INV2, INV3, INV9`）。フェンス付きコード例（frontmatter サンプル）を除いた本文を
    //   行単位で走査し、1行に compass 記号が3個以上並ぶ行を「目録化の疑い」として落とす（形不問）。
    //   さらに、ドメイン名+コロン/矢印の直後に記号が2個以上並ぶ「対応表の行」も落とす（少数記号の目録も捕らえる）。
    const body = c.replace(/```[\s\S]*?```/g, "");
    const symRe = /\b(?:INV|DR|Anti-?)\d+\b/g;
    const flagged = body.split("\n").filter((line) => {
      const n = (line.match(symRe) || []).length;
      if (n >= 3) return true; // 3個以上の塊＝目録
      // ドメイン名（既知9領域）+ 区切り（: / → / -）の後に記号が2個以上＝対応表の行
      if (n >= 2 && /(always|詰め|派生|記録|出口|語彙|配布|検査|並行)\s*[:：→\-]/.test(line)) return true;
      return false;
    });
    assert.ok(
      flagged.length === 0,
      `${lang}: 記号→領域の目録化の疑いがある行（DR193・形不問・実測 ${flagged.length} 行: ${flagged.map((l) => l.trim().slice(0, 50)).join(" / ")}）`,
    );
  });
}

// ---- 3. installer が domains/README を user-data に分類し owners/ を gitignore する ----
test("3: installer が domains/README を user-data に分類する", async () => {
  const mod = await import(path.join(REPO_ROOT, "src", "install.mjs"));
  assert.equal(
    mod.classifyFile(path.join(".intent", "domains", "README.md")),
    "user-data",
    "domains/README.md は user-data（upgrade で上書きしない）",
  );
});

test("4: installer の gitignore が owners/ を非追跡・README を追跡する", () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, "src", "install.mjs"), "utf8");
  // owners/ 配下を gitignore する。
  assert.ok(
    /"\.intent\/domains\/owners\/\*"/.test(src),
    "installer が .intent/domains/owners/* を gitignore する（owner 宣言=非追跡・DR192）",
  );
  // README.md（=領域定義）は gitignore の除外にしない＝追跡される。owners/* だけを無視するので
  //   README.md は自然に追跡対象（negation エントリを別途置く必要はない）。README を丸ごと無視する
  //   パターン（.intent/domains/*）を置いていないことを確認。
  assert.ok(
    !/"\.intent\/domains\/\*"/.test(src),
    "領域定義 README.md を丸ごと無視していない（README は追跡・DR192）",
  );
});

// ---- 5. CONTRACT の読み手契約が全 variant + dogfood に在り、実質を持つ ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の CONTRACT が domains 読み手契約の実質を持つ`, () => {
      const c = fs.readFileSync(contractPath(lang, agent), "utf8");
      assert.ok(/\.intent\/domains\//.test(c), `${lang}/${agent}: domains 読み手契約がある`);
      // gate にしない・止めない（INV101/INV91 の実質）。
      assert.ok(
        /(gate にしない|not a gate|止めない|do not stop)/i.test(c),
        `${lang}/${agent}: gate にしない・止めない旨に触れる`,
      );
      // 従来動作（恒久フォールバック）。
      assert.ok(
        /(従来動作|behave as before|後方互換|backward compat)/i.test(c),
        `${lang}/${agent}: domains 不在なら従来動作旨に触れる`,
      );
    });
  }
}

// ---- 6. dogfood CONTRACT が ja/claude と byte 同一（存在すれば・self-apply） ----
test("6: dogfood CONTRACT が ja/claude と同期している（存在すれば検査）", () => {
  const dogfood = path.join(REPO_ROOT, ".claude", "skills", "CONTRACT.md");
  if (!fs.existsSync(dogfood)) return;
  assert.equal(
    fs.readFileSync(dogfood, "utf8"),
    fs.readFileSync(contractPath("ja", "claude"), "utf8"),
    "dogfood CONTRACT は ja/claude と byte 同一",
  );
});
