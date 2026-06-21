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

// 結線の遷移: seam では intent-packets SKILL は export-route を参照しなかった（behavior-preserving）が、
// add（出口分岐）でその参照を結線した。seam 段階の「参照しない」テストは add 結線で意図的に陳腐化する前提で
// 張られていたもので、add 完了時に「参照する」側へ反転する（参照の有無検査自体は add-1.1 が担う）。
for (const variant of ["ja/claude", "ja/codex", "en/claude", "en/codex"]) {
  test(`add-1.1 [${variant}] intent-packets SKILL.md は export-route を参照する（add で結線済み）`, () => {
    const skillPath = path.join(ROOT, `templates/${variant}/skills/intent-packets/SKILL.md`);
    const body = fs.readFileSync(skillPath, "utf8");
    assert.ok(
      body.includes("export-route"),
      `${variant}: SKILL.md 本文は export-route を参照する（add スライスで結線）`,
    );
  });
}

// ---- 4.1 出口判定レーン rule に「未指定の3形態」が網羅明記されている ----
for (const lang of ["ja", "en"]) {
  test(`4.1 [${lang}] rule に未指定の3形態（行不在・プレースホルダ・値域外）が明記されている`, () => {
    const body = fs.readFileSync(ROUTE_RULE[`${lang}/claude`], "utf8");
    if (lang === "ja") {
      assert.match(body, /行(が)?無い|不在/, "ja: 行不在の形態");
      assert.match(body, /プレースホルダ/, "ja: プレースホルダの形態");
      assert.match(body, /値域(外|外の値)/, "ja: 値域外の形態");
    } else {
      assert.match(body, /absent/i, "en: absent form");
      assert.match(body, /placeholder/i, "en: placeholder form");
      assert.match(body, /outside the range/i, "en: out-of-range form");
    }
  });
}

// ---- 4.2 behavior-preserving と既存契約の保護 ----

// R4.5: mode.local.md スキーマ変更は format 1行のみ（既存キーの構造を壊さない・mode.md 非接触）
for (const lang of ["ja", "en"]) {
  test(`4.2 [${lang}] mode.local.md の既存キー（mode/designer-questions/purpose）が保全されている`, () => {
    const body = fs.readFileSync(MODE_LOCAL[lang], "utf8");
    for (const key of ["mode", "selected", "reason", "definition", "designer-questions", "purpose"]) {
      assert.match(
        body,
        new RegExp(`^- \\*\\*${key}\\*\\*:`, "m"),
        `${lang}: 既存キー '- **${key}**:' が保全されている`,
      );
    }
  });

  test(`4.2 [${lang}] mode.local.md に Enforcement/Drift-watch を持ち込んでいない（mode.md 側のまま・INV19）`, () => {
    const body = fs.readFileSync(MODE_LOCAL[lang], "utf8");
    // 共有ポリシーキーを mode.local.md の箇条書きキーとして追加していないこと
    assert.ok(
      !/^- \*\*(enforcement|drift-watch)\*\*:/im.test(body),
      `${lang}: Enforcement/Drift-watch を mode.local.md のキーに持ち込んでいない（INV19）`,
    );
  });
}

// R4.3: 外部ツール非改造（変更が intent-* プロダクト層に閉じ、kiro 等を触らない）
test("4.2 変更は intent-* プロダクト層に閉じ、外部ツール（.kiro/ 本体・kiro-* skill）を変更しない", () => {
  // この seam の変更対象は templates/ 配下と test のみ。
  // .kiro/specs/ は spec ドキュメント（intent 計画の成果物）で外部ツール本体ではない。
  // ここでは「export-route rule / mode.local.md が外部ツールのファイルを書き換える記述を持たない」
  // ＝rule が read-only 観測に徹する旨を再確認する（INV1）。
  for (const lang of ["ja", "en"]) {
    const body = fs.readFileSync(ROUTE_RULE[`${lang}/claude`], "utf8");
    const mentionsExternalReadOnly =
      lang === "ja"
        ? /観測であって|変更ではない|read-only/.test(body)
        : /observation, not a change|read-only/i.test(body);
    assert.ok(
      mentionsExternalReadOnly,
      `${lang}: .kiro/ 等の参照は read-only 観測であって外部ツール変更でない旨を明記（INV1）`,
    );
  }
});

// ============================================================
// add スライス（出口分岐 + export preflight warn）
// ============================================================

const PACKETS_SKILL = {
  "ja/claude": "templates/ja/claude/skills/intent-packets/SKILL.md",
  "ja/codex": "templates/ja/codex/skills/intent-packets/SKILL.md",
  "en/claude": "templates/en/claude/skills/intent-packets/SKILL.md",
  "en/codex": "templates/en/codex/skills/intent-packets/SKILL.md",
};
const CCSDD_SKILL = {
  "ja/claude": "templates/ja/claude/skills/intent-export-cc-sdd/SKILL.md",
  "ja/codex": "templates/ja/codex/skills/intent-export-cc-sdd/SKILL.md",
  "en/claude": "templates/en/claude/skills/intent-export-cc-sdd/SKILL.md",
  "en/codex": "templates/en/codex/skills/intent-export-cc-sdd/SKILL.md",
};
const OPENSPEC_SKILL = {
  "ja/claude": "templates/ja/claude/skills/intent-export-openspec/SKILL.md",
  "ja/codex": "templates/ja/codex/skills/intent-export-openspec/SKILL.md",
  "en/claude": "templates/en/claude/skills/intent-export-openspec/SKILL.md",
  "en/codex": "templates/en/codex/skills/intent-export-openspec/SKILL.md",
};

// ---- add 1.1 intent-packets の次の一手を案件別分岐へ ----
for (const [variant, rel] of Object.entries(PACKETS_SKILL)) {
  test(`add-1.1 [${variant}] intent-packets が export-route 判定レーンを参照する`, () => {
    const body = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.match(
      body,
      /export-route/,
      `${variant}: intent-packets SKILL が出口判定レーン rule（export-route）を参照する`,
    );
  });

  test(`add-1.1 [${variant}] cc-sdd を無条件の唯一の出口として決め打ちしていない`, () => {
    const body = fs.readFileSync(path.join(ROOT, rel), "utf8");
    // 「次は /intent-export-cc-sdd」という無条件ハードコードが残っていないこと（決め打ち除去の discriminative）。
    // 出口判定レーンへの参照文脈・openspec/to-spec への言及があれば分岐化されたとみなす。
    const mentionsAllExits =
      body.includes("/intent-export-openspec") &&
      body.includes("/intent-to-spec");
    assert.ok(
      mentionsAllExits,
      `${variant}: cc-sdd 決め打ちでなく3出口（openspec/to-spec を含む）に言及する分岐になっている`,
    );
  });
}

// ---- add 2.1 export-cc-sdd preflight warn（.kiro/ 不在） ----
for (const [variant, rel] of Object.entries(CCSDD_SKILL)) {
  test(`add-2.1 [${variant}] cc-sdd SKILL が .kiro/ 不在の preflight warn を持つ`, () => {
    const body = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.match(body, /\.kiro\//, `${variant}: .kiro/ への言及（前提検知）`);
    // 読める成果物の出口への誘導（既存の非接触規律 Req5.3 を守るため /intent-to-spec のコマンド名は名指ししない・
    // 「format 軸の射影/読める Spec への出口」という一般化した誘導で検査する）
    const mentionsReadableExit =
      variant.startsWith("ja")
        ? /読める成果物|読める Spec|format 軸の射影/.test(body)
        : /readable artifact|readable Spec|format-axis projection/i.test(body);
    assert.ok(mentionsReadableExit, `${variant}: 読める成果物の出口への誘導がある（コマンド名は名指ししない）`);
    // export-cc-sdd は intent-to-spec のコマンド名を参照しない（nl-spec-export Req5.3 非接触）
    assert.ok(
      !body.includes("/intent-to-spec"),
      `${variant}: export-cc-sdd SKILL は /intent-to-spec を名指し参照しない（非接触・Req5.3）`,
    );
    const mentionsPreflight =
      variant.startsWith("ja")
        ? /前提|preflight|見当たら/.test(body)
        : /prerequisite|preflight|not found|absent/i.test(body);
    assert.ok(mentionsPreflight, `${variant}: 前提不在の warn 記述がある`);
  });
}

// ---- add 3.1 export-openspec preflight warn（repo 直下 openspec/） ----
for (const [variant, rel] of Object.entries(OPENSPEC_SKILL)) {
  test(`add-3.1 [${variant}] openspec SKILL が repo 直下 openspec/ 不在の preflight warn を持つ`, () => {
    const body = fs.readFileSync(path.join(ROOT, rel), "utf8");
    // 読める成果物の出口への誘導（cc-sdd と同様コマンド名は名指ししない一般化誘導）
    const mentionsReadableExit =
      variant.startsWith("ja")
        ? /読める成果物|読める Spec|format 軸の射影/.test(body)
        : /readable artifact|readable Spec|format-axis projection/i.test(body);
    assert.ok(mentionsReadableExit, `${variant}: 読める成果物の出口への誘導がある（コマンド名は名指ししない）`);
    const mentionsPreflight =
      variant.startsWith("ja")
        ? /前提|preflight|見当たら/.test(body)
        : /prerequisite|preflight|not found|absent/i.test(body);
    assert.ok(mentionsPreflight, `${variant}: 前提不在の warn 記述がある`);
    // .intent/openspec/（自分の出力先）を前提目印に誤認していないこと＝
    // 「repo 直下の openspec/」を目印にする旨が読み取れる（出力先と区別）
    const distinguishesOutputDir =
      variant.startsWith("ja")
        ? /出力先|\.intent\/openspec|リポジトリ直下|repo 直下|プロジェクト直下/.test(body)
        : /output|\.intent\/openspec|repository root|project root/i.test(body);
    assert.ok(
      distinguishesOutputDir,
      `${variant}: repo 直下 openspec/ と .intent/openspec/（出力先）を区別している`,
    );
  });
}

// ---- wire 1.1 discover の format 推奨→追認→記録の結線 ----
const DISCOVER_SKILL = {
  "ja/claude": "templates/ja/claude/skills/intent-discover/SKILL.md",
  "ja/codex": "templates/ja/codex/skills/intent-discover/SKILL.md",
  "en/claude": "templates/en/claude/skills/intent-discover/SKILL.md",
  "en/codex": "templates/en/codex/skills/intent-discover/SKILL.md",
};

for (const [variant, rel] of Object.entries(DISCOVER_SKILL)) {
  test(`wire-1.1 [${variant}] discover が format 推奨→追認→記録を結線している`, () => {
    const body = fs.readFileSync(path.join(ROOT, rel), "utf8");
    // format への言及（推奨・記録の結線）
    assert.match(body, /format/, `${variant}: discover SKILL が format に言及する`);
    // mode.local.md の format 行へ記録する旨
    const recordsFormat =
      variant.startsWith("ja")
        ? /format.*記録|記録.*format|format 行/.test(body)
        : /record.*format|format.*line|format.*record/i.test(body);
    assert.ok(recordsFormat, `${variant}: format を mode.local.md へ記録する結線がある`);
    // 3つの出口値域への言及（推奨の選択肢）
    for (const fmt of VALID_FORMATS) {
      assert.match(body, new RegExp(fmt), `${variant}: format 値 "${fmt}" に言及する`);
    }
  });

  test(`wire-1.1 [${variant}] format 推奨は A7 追認規律（任意・保留可・推測で埋めない）に従う`, () => {
    const body = fs.readFileSync(path.join(ROOT, rel), "utf8");
    // 推測で埋めない / 任意 / 保留可 のいずれかの規律記述（format 文脈）
    const a7Discipline =
      variant.startsWith("ja")
        ? /推測で埋めない|任意|保留/.test(body)
        : /not.*infer|optional|defer|leave.*unrecorded/i.test(body);
    assert.ok(a7Discipline, `${variant}: format 推奨が A7 追認規律（任意/保留/推測で埋めない）に従う記述がある`);
  });
  // 注: agent 中立性（共有 rules の byte 等価・agent 固有語非含有）は既存 agents.test /
  //     agent-rules-parity が全 rules を glob で担保する。format 結線は SKILL 本文に置き
  //     共有 rule（mode-selection.md 等）を触らないため、ここで rule の agent 固有語を個別検査しない
  //     （mode-selection.md は既存で AskUserQuestion を含むが、それは claude/codex の扱いが
  //     既存テストで担保済みの別管轄。本 wire の変更対象外）。
}

// ---- wire 2.1 doc-sync（theory / README ja-en に出口の案件別選択） ----
const DOC_FILES = {
  theory: "docs/theory.md",
  readmeJa: "README.md",
  readmeEn: "README.en.md",
};

test("wire-2.1 theory.md に出口の案件別選択が反映されている", () => {
  const body = fs.readFileSync(path.join(ROOT, DOC_FILES.theory), "utf8");
  // 出口が案件種別（mode/format）で変わる旨 + preflight warn-only への言及
  assert.match(body, /出口|export-route|案件種別|format/, "theory: 出口/format への言及");
  const mentionsBranch = /案件.*出口|出口.*選|mode.*format|format.*出口|preflight|warn/.test(body);
  assert.ok(mentionsBranch, "theory: 出口の案件別選択 or preflight warn の説明がある");
});

test("wire-2.1 README.md（ja）に出口選択の説明がある", () => {
  const body = fs.readFileSync(path.join(ROOT, DOC_FILES.readmeJa), "utf8");
  // format による出口選択 or preflight への言及
  const mentions = /format|出口|案件種別|preflight/.test(body);
  assert.ok(mentions, "README.md: 出口選択 or format への言及がある");
});

test("wire-2.1 README.en.md（en）に出口選択の説明がある", () => {
  const body = fs.readFileSync(path.join(ROOT, DOC_FILES.readmeEn), "utf8");
  const mentions = /format|exit|case type|preflight/i.test(body);
  assert.ok(mentions, "README.en.md: 出口選択 or format への言及がある");
});

test("wire-2.1 version は bump されていない（package.json・doc-sync では上げない）", () => {
  // 本 wire は version を変えない。実装前後で package.json の version 行が変わらないことを
  // 「version 行が存在し有効な semver である」ことの確認に留める（具体値は publish 時の管轄）。
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/, "package.json の version が semver である（bump はしない方針）");
});
