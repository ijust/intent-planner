// tree-normalize（intent-tree.md の案件記録＝機能追記/機能撤去/履歴/再起案 を
//   1案件=1ファイルの分割収納 .intent/tree/ へ正規化・INV80 / DR133 / DR194 /
//   federated-governance P-fed6）の不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: compass は canonical-normalization で 1記号=1ファイルへ正規化済みだが、
//   intent-tree の案件記録だけが単一ファイル末尾追記のまま残り＝並行 discover が同じ
//   末尾を同時に書く衝突の最後の火元（O1）だった。本 packet は案件記録を分割収納へ
//   move し（骨格 L0–L4 は本体に残す）、読み手には「分割が在ればそれ・無ければ本体末尾
//   （恒久フォールバック）」の契約を配る。
//
// ここで落とす誤実装（discriminative oracle・独立レビュー 2026-07-15 の教訓＝見出し語
//   一致でなく実質を検査する・byte 保全を実測する）:
//   - tree README scaffold が ja/en のどちらかに無い（配布漏れ）
//   - README が compass 型（全 git 追跡）でなく discovery/domains 型（gitignore）を謳う
//   - CONTRACT の tree 読み手契約が「分割が在れば分割・無ければ本体（恒久フォールバック）」
//     を落とす（DR133 違反＝旧形式 repo が壊れる）
//   - writeback の履歴退避促しが分割収納を見ずに本体末尾だけを見る（移行後に対象を見失う）
//   - installer が .intent/tree/* を gitignore してしまう（canonical の追跡漏れ＝データ消失級・
//     packet Safety「追跡型の取り違え禁止」）
//   - dogfood の案件記録が move でなく edit された（byte 保全違反・INV80「失ってはいけない4点」①）
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

function treeReadme(lang) {
  return path.join(TEMPLATES, lang, "intent", "tree", "README.md");
}
function contractPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "CONTRACT.md");
}
function writebackPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-writeback", "rules", "writeback-protocol.md");
}

// ---- 1. tree README scaffold が ja/en 両方に在り、compass 型（全追跡）の実質を持つ ----
for (const lang of LANGS) {
  test(`1: ${lang} の tree/README が分割収納の実質（1案件1ファイル・全 git 追跡）を持つ`, () => {
    const p = treeReadme(lang);
    assert.ok(fs.existsSync(p), `${p} が存在する`);
    const c = fs.readFileSync(p, "utf8");
    // 1案件=1ファイル・feature スラッグ命名。
    assert.ok(/<feature>\.md/.test(c), `${lang}: <feature>.md（1案件=1ファイル）に触れる`);
    // INV80 正規化収納・compass と同型。
    assert.ok(/INV80/.test(c), `${lang}: INV80（正規化収納）に触れる`);
    // compass 型（全 git 追跡）＝discovery/domains 型（gitignore）を踏襲しない。
    assert.ok(
      /(git 追跡|git-tracked)/i.test(c) && /(全部|all)/i.test(c),
      `${lang}: 全部 git 追跡（compass 型）旨に触れる`,
    );
    // move であって edit でない（INV80 の失ってはいけない4点）。
    assert.ok(
      /(move であって edit|move, not an edit)/i.test(c),
      `${lang}: move であって edit でない旨に触れる`,
    );
    // 恒久フォールバック: tree 収納が不在・空なら本体で従来動作（DR133）。
    assert.ok(
      /DR133/.test(c) && /(従来どおり|as before|fallback|フォールバック)/i.test(c),
      `${lang}: 分割収納が無ければ本体で従来動作（恒久フォールバック・DR133）旨に触れる`,
    );
  });
}

// ---- 2. README が discovery/domains 型（gitignore）を謳っていない（追跡型の取り違え禁止） ----
//   packet Safety「追跡型の取り違え禁止」＝分割ファイルを gitignore に入れたら canonical の
//   追跡漏れ（データ消失級）。README が「tree を gitignore する」と読める記述を持たないこと。
for (const lang of LANGS) {
  test(`2: ${lang} の tree/README が「tree を gitignore する」型を採らない`, () => {
    const c = fs.readFileSync(treeReadme(lang), "utf8");
    // .intent/tree/ を丸ごと ignore する趣旨の記述が無い（追跡型の取り違え）。
    assert.ok(
      !/\.intent\/tree\/\*\s*(を|is|are)?\s*(gitignore|ignore|非追跡|untrack)/i.test(c),
      `${lang}: .intent/tree/ を gitignore する型を謳っていない（compass 型＝全追跡）`,
    );
    // むしろ「gitignore に入れない/踏襲しない」旨を明示している（予防の明文化）。
    assert.ok(
      /(gitignore に入れ|never added to .*gitignore|踏襲しない|do not follow)/i.test(c),
      `${lang}: discovery/domains 型（gitignore）を踏襲しない旨を明示している`,
    );
  });
}

// ---- 3. installer が .intent/tree/* を gitignore しない（compass 型＝全追跡） ----
test("3: installer が .intent/tree/* を gitignore しない（compass 型・追跡型の取り違え禁止）", () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, "src", "install.mjs"), "utf8");
  // .intent/tree/* を無視するパターンを置いていないこと（compass 同様・全追跡）。
  assert.ok(
    !/"\.intent\/tree\/\*"/.test(src),
    "installer が .intent/tree/* を gitignore していない（canonical の追跡漏れを防ぐ・DR192 同型の逆）",
  );
});

// ---- 4. CONTRACT の tree 読み手契約が全 variant + dogfood に在り、実質を持つ ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`4: ${lang}/${agent} の CONTRACT が tree 案件記録の読み手契約の実質を持つ`, () => {
      const c = fs.readFileSync(contractPath(lang, agent), "utf8");
      assert.ok(/\.intent\/tree\//.test(c), `${lang}/${agent}: tree 読み手契約がある`);
      // 骨格（L0–L4）は本体・案件記録は分割収納、の役割分離。
      assert.ok(/L0.{0,4}L4/.test(c), `${lang}/${agent}: 骨格 L0–L4 は本体に残る旨に触れる`);
      // 恒久フォールバック（分割が無ければ本体末尾で従来動作・DR133）。
      assert.ok(
        /DR133/.test(c) && /(従来|as before|fallback|フォールバック|legacy)/i.test(c),
        `${lang}/${agent}: 分割収納が無ければ本体で従来動作（恒久フォールバック・DR133）旨に触れる`,
      );
      // DB を入れない（DR194・INV2）＝レコード=ファイル/トランザクション=git commit の対応。
      assert.ok(/DR194/.test(c), `${lang}/${agent}: DB ライク（DR194）の対応に触れる`);
    });
  }
}

// ---- 5. writeback の履歴退避促しが分割収納を見る（移行後に対象を見失わない） ----
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`5: ${lang}/${agent} の writeback-protocol が分割収納 .intent/tree/ を対象に見る`, () => {
      const c = fs.readFileSync(writebackPath(lang, agent), "utf8");
      assert.ok(
        /\.intent\/tree\//.test(c) && /tree-normalize/.test(c),
        `${lang}/${agent}: 案件記録が分割収納に在れば対象に見る（tree-normalize）旨に触れる`,
      );
      // 恒久フォールバック（分割が無ければ本体末尾・DR133）。
      assert.ok(
        /DR133/.test(c),
        `${lang}/${agent}: 分割が無ければ本体末尾を見る（恒久フォールバック・DR133）旨に触れる`,
      );
    });
  }
}

// ---- 5b. 軽い一行注を持つ4読み手（status/validate/compass/overview）の全 variant 追随 ----
//   独立レビュー 2026-07-15 の WARNING: これら4ファイルは L0–L4 骨格しか読まないため機能変更は
//   不要だが、「案件記録は .intent/tree/ にもありうる」の一行注を配った。単一 variant 欠落
//   （.agents だけ抜ける等の dogfood-omission トラップ）を恒久ガードする。各 variant に
//   `.intent/tree/` と tree-normalize（または DR133 のフォールバック明示）が在ること。
const LIGHT_NOTE_READERS = [
  ["intent-status", "SKILL.md"],
  ["intent-validate", "SKILL.md"],
  ["intent-compass", "SKILL.md"],
  ["intent-overview", "rules/aggregate-sources.md"],
];
for (const [skill, rel] of LIGHT_NOTE_READERS) {
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      test(`5b: ${lang}/${agent} の ${skill}/${rel} が tree 分割収納の一行注を持つ`, () => {
        const p = path.join(TEMPLATES, lang, agent, "skills", skill, rel);
        const c = fs.readFileSync(p, "utf8");
        assert.ok(/\.intent\/tree\//.test(c), `${lang}/${agent} ${skill}: .intent/tree/ に触れる`);
        // 恒久フォールバック（分割が無ければ本体・DR133）または tree-normalize の由来明示。
        assert.ok(
          /(tree-normalize|DR133)/.test(c),
          `${lang}/${agent} ${skill}: 分割収納の由来（tree-normalize / 恒久フォールバック DR133）に触れる`,
        );
      });
    }
  }
}

// dogfood の4読み手も templates ja と byte 同一（.agents 欠落トラップの恒久ガード）。
for (const [skill, rel] of LIGHT_NOTE_READERS) {
  test(`5c: dogfood の ${skill}/${rel} が templates ja と byte 同一（存在すれば）`, () => {
    const claudeDog = path.join(REPO_ROOT, ".claude", "skills", skill, rel);
    const agentsDog = path.join(REPO_ROOT, ".agents", "skills", skill, rel);
    if (fs.existsSync(claudeDog)) {
      assert.equal(
        fs.readFileSync(claudeDog, "utf8"),
        fs.readFileSync(path.join(TEMPLATES, "ja", "claude", "skills", skill, rel), "utf8"),
        `.claude/${skill}/${rel} は ja/claude と byte 同一`,
      );
    }
    if (fs.existsSync(agentsDog)) {
      assert.equal(
        fs.readFileSync(agentsDog, "utf8"),
        fs.readFileSync(path.join(TEMPLATES, "ja", "codex", "skills", skill, rel), "utf8"),
        `.agents/${skill}/${rel} は ja/codex と byte 同一`,
      );
    }
  });
}

// ---- 6. dogfood パリティ: CONTRACT/writeback が ja/claude・ja/codex と byte 同一（self-apply） ----
test("6: dogfood CONTRACT/writeback が templates ja と byte 同一（存在すれば検査）", () => {
  const pairs = [
    [path.join(REPO_ROOT, ".claude", "skills", "CONTRACT.md"), contractPath("ja", "claude")],
    [path.join(REPO_ROOT, ".agents", "skills", "CONTRACT.md"), contractPath("ja", "codex")],
    [path.join(REPO_ROOT, ".claude", "skills", "intent-writeback", "rules", "writeback-protocol.md"), writebackPath("ja", "claude")],
    [path.join(REPO_ROOT, ".agents", "skills", "intent-writeback", "rules", "writeback-protocol.md"), writebackPath("ja", "codex")],
  ];
  for (const [dogfood, tmpl] of pairs) {
    if (!fs.existsSync(dogfood)) continue;
    assert.equal(
      fs.readFileSync(dogfood, "utf8"),
      fs.readFileSync(tmpl, "utf8"),
      `${path.relative(REPO_ROOT, dogfood)} は ${path.relative(REPO_ROOT, tmpl)} と byte 同一`,
    );
  }
});

// ---- 7. dogfood 移行の byte 保全（self-apply・move であって edit でない） ----
//   .intent/tree/ が在れば、各案件ファイルは frontmatter（feature/status/kind）+ 本文で構成され、
//   本文には元の `## 機能追記:`（等）見出しが byte のまま残る。要約・言い換えを混ぜていないこと。
//   discriminative: frontmatter を剥いだ本文が案件見出しで始まる（move の証跡）。移行前後の全文
//   byte 同一は開発時オラクル（scratchpad の frozen snapshot 照合）で担保済み・本テストはその
//   構造的証跡（見出し保全・派生 index の存在）を恒久検査する。
test("7: dogfood .intent/tree/ の案件ファイルが move の証跡（案件見出し保全・派生 index）を持つ", () => {
  const treeDir = path.join(REPO_ROOT, ".intent", "tree");
  if (!fs.existsSync(treeDir)) return; // 収納が無ければ従来動作（恒久フォールバック）
  const files = fs.readdirSync(treeDir).filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "index.md");
  assert.ok(files.length >= 1, "案件ファイルが1件以上ある");
  const caseHeadRe = /^## (機能追記|機能撤去|履歴|再起案):/m;
  // 分割された派生ファイル（compass-category-tag の A39/A42 相当）は合成見出しを持つが、
  //   それも案件見出しの形（## 機能追記:）に揃える。全ファイルが案件見出しを1つ以上持つ。
  for (const f of files) {
    const c = fs.readFileSync(path.join(treeDir, f), "utf8");
    // frontmatter を持つ（feature/status/kind の最小スキーマ）。
    assert.ok(/^---\nfeature: .+\nstatus: .+\nkind: .+\n---/.test(c), `${f}: 最小 frontmatter（feature/status/kind）を持つ`);
    // 案件見出しが本文に byte のまま残る（move の証跡・要約でなく移動）。
    assert.ok(caseHeadRe.test(c), `${f}: 案件見出し（## 機能追記: 等）が本文に残る（move の証跡）`);
  }
  // 派生 index が在り、手編集しない旨を持つ。
  const idx = path.join(treeDir, "index.md");
  assert.ok(fs.existsSync(idx), "派生 index.md が在る");
  const idxc = fs.readFileSync(idx, "utf8");
  assert.ok(/(derived|派生)/i.test(idxc) && /(do not edit|手編集しない)/i.test(idxc), "index.md は派生・手編集しない旨を持つ");
});
