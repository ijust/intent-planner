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

// ---- 2.1 出口判定レーン rule（export-route.md・4系統・判定テーブル全象限） ----
const ROUTE_RULE = {
  "ja/claude": path.join(ROOT, "templates/ja/claude/skills/intent-packets/rules/export-route.md"),
  "ja/codex": path.join(ROOT, "templates/ja/codex/skills/intent-packets/rules/export-route.md"),
  "en/claude": path.join(ROOT, "templates/en/claude/skills/intent-packets/rules/export-route.md"),
  "en/codex": path.join(ROOT, "templates/en/codex/skills/intent-packets/rules/export-route.md"),
};

test("2.1 出口判定レーン rule が4系統すべてに存在する", () => {
  for (const [variant, p] of Object.entries(ROUTE_RULE)) {
    assert.ok(fs.existsSync(p), `${variant}: export-route.md が存在する`);
  }
});

test("2.1 ja↔en は翻訳（byte 等価でない）・各言語内 claude⇔codex は byte 等価", () => {
  const jaClaude = fs.readFileSync(ROUTE_RULE["ja/claude"], "utf8");
  const jaCodex = fs.readFileSync(ROUTE_RULE["ja/codex"], "utf8");
  const enClaude = fs.readFileSync(ROUTE_RULE["en/claude"], "utf8");
  const enCodex = fs.readFileSync(ROUTE_RULE["en/codex"], "utf8");
  // 各言語内 claude⇔codex は byte 等価
  assert.equal(jaClaude, jaCodex, "ja: claude⇔codex が byte 等価");
  assert.equal(enClaude, enCodex, "en: claude⇔codex が byte 等価");
  // ja↔en は翻訳ゆえ byte 等価でない（同一なら未翻訳の疑い）
  assert.notEqual(jaClaude, enClaude, "ja↔en は翻訳（byte 等価でない）");
});

// 判定テーブルの内容検査（claude/codex は byte 等価なので claude を代表に読む）
for (const lang of ["ja", "en"]) {
  test(`2.1 [${lang}] format 値→出口の対応関係が正しい（同一行で対応・誤記を落とす）`, () => {
    const body = fs.readFileSync(ROUTE_RULE[`${lang}/claude`], "utf8");
    // 対応関係を「同一テーブル行（| format | exit |）で format 値と出口コマンドが並ぶ」で検査する。
    // 存在チェックだけだと cc-sdd 行に openspec を誤記しても通るため、行単位の対応を見る。
    // 値域3値が判定の入力として書かれている（前提）
    for (const fmt of VALID_FORMATS) {
      assert.match(body, new RegExp(fmt), `${lang}: 値域 "${fmt}" が rule に書かれている`);
    }
    // 各 format → 期待出口の対応（テーブル行 or 同一行で format トークンと出口コマンドが共起）
    const mapping = [
      ["openspec", "/intent-export-openspec"],
      ["cc-sdd", "/intent-export-cc-sdd"],
      ["to-spec", "/intent-to-spec"],
    ];
    const lines = body.split("\n");
    for (const [fmt, exit] of mapping) {
      // `format` 値を含み かつ 対応する出口コマンドを含む行が1つ以上ある
      const hasCorrespondence = lines.some((l) => {
        // テーブル行 A 想定: | `openspec` | `/intent-export-openspec` ... |
        const fmtRe = new RegExp("`" + fmt + "`");
        return fmtRe.test(l) && l.includes(exit);
      });
      assert.ok(
        hasCorrespondence,
        `${lang}: format "${fmt}" が同一行で出口 "${exit}" に対応している（誤記なら落ちる）`,
      );
    }
  });

  test(`2.1 [${lang}] 推論4象限（mode × .kiro/ の有無）が網羅されている`, () => {
    const body = fs.readFileSync(ROUTE_RULE[`${lang}/claude`], "utf8");
    // non-code / standard・.kiro/ の有無への言及（推論の入力）
    assert.match(body, /non-code/, `${lang}: non-code mode への言及`);
    assert.match(body, /\.kiro\//, `${lang}: .kiro/ の有無への言及`);
    // 候補列挙（一意に決まらない象限のフォールバック）の規律
    const mentionsCandidateList =
      lang === "ja" ? /候補列挙|候補を列挙|候補として/.test(body) : /candidat/i.test(body);
    assert.ok(mentionsCandidateList, `${lang}: 候補列挙のフォールバックが書かれている`);
  });

  test(`2.1 [${lang}] read-only・決定的・機械検査非依存の規律が明記されている`, () => {
    const body = fs.readFileSync(ROUTE_RULE[`${lang}/claude`], "utf8");
    // read-only 観測
    const mentionsReadOnly =
      lang === "ja" ? /read-only|読み取り専用|観測のみ/.test(body) : /read-only/i.test(body);
    assert.ok(mentionsReadOnly, `${lang}: read-only 規律が書かれている`);
    // intent-check.mjs に寄せない（機械検査非依存）
    assert.match(body, /intent-check/, `${lang}: 機械検査（intent-check.mjs）に寄せない旨がある`);
  });

  test(`2.1 [${lang}] 共有 rule に agent 固有語（AskUserQuestion）を書かない`, () => {
    const body = fs.readFileSync(ROUTE_RULE[`${lang}/claude`], "utf8");
    assert.ok(
      !body.includes("AskUserQuestion"),
      `${lang}: claude 固有ツール名 AskUserQuestion を含まない（agent 中立・Anti-direction 69）`,
    );
  });
}

// behavior-preserving: seam では intent-packets SKILL.md 本文を触らない（export-route を参照しない）
for (const variant of ["ja/claude", "ja/codex", "en/claude", "en/codex"]) {
  test(`2.1 [${variant}] intent-packets SKILL.md は export-route を参照しない（seam=behavior-preserving）`, () => {
    const skillPath = path.join(ROOT, `templates/${variant}/skills/intent-packets/SKILL.md`);
    const body = fs.readFileSync(skillPath, "utf8");
    assert.ok(
      !body.includes("export-route"),
      `${variant}: SKILL.md 本文は export-route を参照しない（結線は add スライス）`,
    );
  });
}
