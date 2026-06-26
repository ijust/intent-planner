// intent-planner-constraint-starters-seam の構造オラクル。
// 同梱定石カタログ（constraint-starters.md）と個人制約蓄積台帳（constraint-library.md）の
// scaffold が、出典必須・静的性・別カタログ分離・repo 内蓄積境界を満たすことを read-only で検査する。
// 配置・ja/en パリティ・分類は既存テスト（structure-pack / install / classifyFile）が担保するため、
// ここではそれらが見ない「カタログ内容のオラクル」に絞る。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const LANGS = ["ja", "en"];

function catalogPath(lang) {
  return path.join(ROOT, "templates", lang, "intent", "constraint-starters.md");
}
// カタログは領域別ファイルに分割されている（constraint-catalog-split-seam）。
// 親カタログ（領域インデックス）＋ constraint-starters/ 配下の領域ファイル群を、
// 定石の本体が載るカタログ面として束ねる。後方互換: 領域ディレクトリが無い
// （旧 scaffold の単一ファイル）ときは親カタログ単体を返す。
function catalogFiles(lang) {
  const files = [catalogPath(lang)];
  const domainDir = path.join(ROOT, "templates", lang, "intent", "constraint-starters");
  if (fs.existsSync(domainDir)) {
    for (const name of fs.readdirSync(domainDir).sort()) {
      if (name.endsWith(".md")) files.push(path.join(domainDir, name));
    }
  }
  return files;
}
function libraryPath(lang) {
  return path.join(ROOT, "templates", lang, "intent", "constraint-library.md");
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}
// カタログ面（親＋領域ファイル）から全 seed ブロックを集める。
function allSeedBlocks(lang) {
  return catalogFiles(lang).flatMap((p) => extractSeedBlocks(read(p)));
}

// seed 定石ブロック（`## id:` 見出しから次の `## ` または EOF まで）を抽出する。
function extractSeedBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^## id:\s*(\S+)/);
    if (m) {
      if (cur) blocks.push(cur);
      cur = { id: m[1], body: [] };
    } else if (cur) {
      if (/^## /.test(line)) {
        blocks.push(cur);
        cur = null;
      } else {
        cur.body.push(line);
      }
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

// ---- 1.1/1.3: カタログが存在し seed を最小2件（コード/非コード各1件）持つ ----
// 分割後はカタログ面（親＋領域ファイル）全体で seed 件数を数える。
test("constraint-starters: ja/en が存在し seed 定石を2件以上持つ", () => {
  for (const lang of LANGS) {
    const p = catalogPath(lang);
    assert.ok(fs.existsSync(p), `${lang}: constraint-starters.md が存在する`);
    const blocks = allSeedBlocks(lang);
    assert.ok(blocks.length >= 2, `${lang}: seed 定石が2件以上 (実際 ${blocks.length})`);
  }
});

test("constraint-starters: コード領域と非コード領域の seed を各1件以上持つ", () => {
  for (const lang of LANGS) {
    const blocks = allSeedBlocks(lang);
    const text = blocks.map((b) => b.body.join("\n")).join("\n");
    // 領域フィールド（ja: `領域:` / en: `domain:`）に code / non-code が現れる。
    assert.match(text, /\bcode\b/, `${lang}: code 領域の seed がある`);
    assert.match(text, /non-code/, `${lang}: non-code 領域の seed がある`);
  }
});

// ---- 6.1/6.2: 出典必須（discriminative）。各 seed が出典フィールドを持つ ----
// 出典なし定石を注入したら（= 出典フィールドの無いブロックがあれば）この検査が落ちる。
test("constraint-starters: 全 seed が出典フィールドを持つ (出典必須・出典なしを落とせる)", () => {
  for (const lang of LANGS) {
    const blocks = allSeedBlocks(lang);
    const srcKey = lang === "ja" ? "出典:" : "source:";
    for (const b of blocks) {
      const body = b.body.join("\n");
      assert.match(
        body,
        new RegExp(srcKey),
        `${lang}: seed '${b.id}' が出典フィールド (${srcKey}) を持つ`,
      );
      // 出典が空でない（キーの後に実体がある）。
      const m = body.match(new RegExp(`${srcKey}\\s*(\\S.*)`));
      assert.ok(m && m[1].trim().length > 0, `${lang}: seed '${b.id}' の出典が空でない`);
    }
  }
});

// ---- 3.1/3.2/3.3: 静的性。カタログ・台帳が実行時に外部呼び出し・コードを含まない ----
// scaffold は Markdown のみ。実行可能なネットワーク/DB 呼び出しのコード片を持たない。
test("constraint-starters/library: 静的 Markdown で実行時の外部呼び出し片を含まない", () => {
  const forbidden = [
    /\bfetch\s*\(/,
    /\brequire\s*\(\s*['"]https?/,
    /\bimport\s+.*from\s+['"]https?/,
    /\bnew\s+XMLHttpRequest\b/,
    /\bsqlite/i,
    /\bcreateConnection\b/,
    /https?:\/\/[^\s)]*\?(?:[^\s)]*=)/, // クエリ付き URL（API エンドポイント臭）
  ];
  for (const lang of LANGS) {
    for (const p of [...catalogFiles(lang), libraryPath(lang)]) {
      const text = read(p);
      // コードフェンス内も含め、実行時呼び出しの語を持たない（出典の URL は素のリンクのみ許容）。
      for (const re of forbidden) {
        assert.ok(
          !re.test(text),
          `${path.basename(p)} (${lang}): 外部呼び出し/動的コード片を含まない (${re})`,
        );
      }
    }
  }
});

// ---- 5.1/5.2: 別カタログ分離。drift-log の集計キーに混入しない ----
// 本カタログは drift-patterns / drift-log とは別ファイル（別 id 体系）。drift-log への
// 追記や drift-patterns の集計キー参照を持たない（混ぜない）。
test("constraint-starters: drift-log/drift-patterns の集計へ混入しない", () => {
  for (const lang of LANGS) {
    for (const p of catalogFiles(lang)) {
      const text = read(p);
      assert.ok(
        !/drift-log\.md/.test(text),
        `${lang}/${path.basename(p)}: constraint-starters が drift-log を参照しない（集計に混ぜない）`,
      );
      // 別ファイルであることの確認（drift-patterns 本体ではない）。
      assert.ok(
        !/# Drift Patterns/.test(text),
        `${lang}/${path.basename(p)}: drift-patterns 本体と別ファイル`,
      );
    }
  }
});

// ---- 2.3/2.4: repo 内蓄積境界。台帳が repo 外永続・横断共有を示唆しない ----
test("constraint-library: repo 外永続・横断共有の経路を持たない", () => {
  for (const lang of LANGS) {
    const text = read(libraryPath(lang));
    // ホームディレクトリ・グローバル設定パスへの書き出しを示唆しない。
    assert.ok(!/~\/\.intent/.test(text), `${lang}: ホーム配下グローバル台帳を示唆しない`);
    assert.ok(
      !/\$HOME|homedir\(\)|os\.homedir/.test(text),
      `${lang}: HOME 配下への永続を示唆しない`,
    );
    // 「このプロジェクト内に閉じる / stays within this project」旨の明示がある（repo 内境界）。
    const phrase = lang === "ja" ? /プロジェクト(内|の外へ|をまたいで)/ : /within this project|across projects/;
    assert.match(text, phrase, `${lang}: repo 内に閉じる境界が明示されている`);
  }
});
