// export-route-seam: 出口選択の縫い目（target format の正本 + 出口判定レーン）
// spec: .kiro/specs/export-route-seam/
//
// 検証対象:
//   1.1 mode.local.md（ja/en）の format プレースホルダ行（既定値なし）
//   1.2 mode.local.md の format 読み取り契約（不在/プレースホルダ/値域外＝未指定）
//   2.1 出口判定レーン rule（export-route.md）の規約（4系統・判定テーブル全象限）
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const MODE_LOCAL = {
  ja: path.join(ROOT, "templates/ja/intent/mode.local.md"),
  en: path.join(ROOT, "templates/en/intent/mode.local.md"),
};

const VALID_FORMATS = ["cc-sdd", "openspec", "to-spec"];

// ---- 1.1 format プレースホルダ行（既定値なし・ja/en 構造一致） ----
for (const lang of ["ja", "en"]) {
  test(`1.1 [${lang}] mode.local.md に format 行がある`, () => {
    const body = fs.readFileSync(MODE_LOCAL[lang], "utf8");
    // 箇条書きキーとして format 行が存在する（- **format**: ...）
    assert.match(
      body,
      /^- \*\*format\*\*:/m,
      `${lang}: '- **format**:' 行が mode.local.md に存在すること`,
    );
  });

  test(`1.1 [${lang}] format 行は有効な既定値を初期注入していない（プレースホルダ）`, () => {
    const body = fs.readFileSync(MODE_LOCAL[lang], "utf8");
    const line = body.split("\n").find((l) => /^- \*\*format\*\*:/.test(l));
    assert.ok(line, `${lang}: format 行が取得できること`);
    const value = line.replace(/^- \*\*format\*\*:\s*/, "").trim();
    // 既定値（cc-sdd / openspec / to-spec の裸の有効値）が単独で入っていないこと。
    // プレースホルダ（括弧書き等）は可。値域語が説明文中に列挙されるのは可だが、
    // 「値そのもの」として確定設定されていないことを検査する。
    const isBareValidValue = VALID_FORMATS.includes(value);
    assert.ok(
      !isBareValidValue,
      `${lang}: format に有効値が初期注入されていない（実際: "${value}"）`,
    );
    // プレースホルダであることの確認（未確定マーカーを含む）
    assert.match(
      value,
      /未確定|undetermined/,
      `${lang}: format はプレースホルダ（未確定マーカー）であること`,
    );
  });

  test(`1.1 [${lang}] format 行は mode 系区画（purpose の後）にある`, () => {
    const body = fs.readFileSync(MODE_LOCAL[lang], "utf8");
    const lines = body.split("\n");
    const purposeIdx = lines.findIndex((l) => /^- \*\*purpose\*\*:/.test(l));
    const formatIdx = lines.findIndex((l) => /^- \*\*format\*\*:/.test(l));
    assert.ok(purposeIdx >= 0, `${lang}: purpose 行がある`);
    assert.ok(formatIdx >= 0, `${lang}: format 行がある`);
    assert.ok(
      formatIdx > purposeIdx,
      `${lang}: format 行は purpose 行より後（mode 系区画の隣）`,
    );
  });
}

test("1.1 ja/en の format 行は両方に存在する（ファイル集合 1:1・片側のみ追加でない）", () => {
  for (const lang of ["ja", "en"]) {
    const body = fs.readFileSync(MODE_LOCAL[lang], "utf8");
    assert.match(body, /^- \*\*format\*\*:/m, `${lang} に format 行がある`);
  }
});

// ---- 1.2 format 読み取り契約（不在/プレースホルダ/値域外＝未指定） ----
for (const lang of ["ja", "en"]) {
  test(`1.2 [${lang}] 「このファイルの扱い」規約に format 読み取り契約がある`, () => {
    const body = fs.readFileSync(MODE_LOCAL[lang], "utf8");
    // format に言及した読み取り契約段落があること
    assert.match(
      body,
      /format/,
      `${lang}: 規約に format への言及がある`,
    );
    // 3形態（不在・プレースホルダ・値域外）が「未指定」として扱われる旨
    const mentionsUnspecified =
      lang === "ja"
        ? /未指定/.test(body)
        : /unspecified|not specified/i.test(body);
    assert.ok(
      mentionsUnspecified,
      `${lang}: format の「未指定」扱いが規約に明文化されている`,
    );
  });

  // R4.5 非破壊: format 契約の追加が既存「ローカル専用の理由」見出しを潰していないこと
  // （ja で format 段落に Why-local-only 本文が融合したバグの回帰防止）
  test(`1.2 [${lang}] 既存の「ローカル専用の理由」見出しが保全されている`, () => {
    const body = fs.readFileSync(MODE_LOCAL[lang], "utf8");
    const whyLocalHeading =
      lang === "ja" ? /^- \*\*ローカル専用の理由\*\*:/m : /^- \*\*Why local-only\*\*:/m;
    assert.match(
      body,
      whyLocalHeading,
      `${lang}: format 契約追加後も「ローカル専用の理由」見出しが独立した箇条として残っている`,
    );
    // format 契約と Why-local-only が別々の箇条であること（同一行に融合していない）
    const formatContractLine = body
      .split("\n")
      .find((l) => /^- \*\*(format の読み取り契約|The format read contract)/.test(l));
    assert.ok(formatContractLine, `${lang}: format 読み取り契約の箇条がある`);
    const whyLocalToken = lang === "ja" ? "ローカル専用の理由" : "Why local-only";
    assert.ok(
      !formatContractLine.includes(whyLocalToken),
      `${lang}: format 契約の箇条に「ローカル専用の理由」本文が融合していない`,
    );
  });
}
