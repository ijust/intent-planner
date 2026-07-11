// glossary-lifecycle（台帳の語のライフサイクル・pkt-20260711-glossary-lifecycle-7vpa・C63/A68/INV84/DR152）の
//   不変条件テスト（node:test 標準・依存ゼロ）。
//
// 背景: 実開発（flyer）で内輪語が生成文書と質問に染み込み利用者に通じなかった（user-facing-plainness）。
//   語の3分類（一般語/チーム共通語/勝手語）は台帳の状態＋読み手相対で決める（DR152）ため、glossary に
//   状態（承認済み/暫定/否認済み）と言い換え例を後方互換で足し、coinage-suspect が状態を読むよう追随する。
//   ここでは「スキーマ拡張が後方互換（旧3列は挙動不変・既存行は無変更）」「状態→出力の対応づけが正しい
//   （承認済み→沈黙／否認済み→再発明の名指し／明示の暫定→合意未了の候補提示）」「登録関門（1語ずつ・
//   一括登録は成立しない・否認済みは削除せず残す）」を4系統＋dogfood で実質検査する。
//   アンカーは字面マーカーでなく対応づけ（状態セグメント→帰結）を突く（test-asserts-substance-not-surface-marker・
//   誤実装〔状態を無視する読み・対応の入れ替え・旧形式の挙動変更〕を注入して赤化を実証してから畳む）。
//
// 注: validate-checks.md は ja（claude=codex=dogfood）/ en（claude=codex）で byte 等価。
//   SKILL.md は本文等価で codex は frontmatter 2 行差分。dogfood（.intent/.claude）は gitignore 対象があるため
//   存在すれば検査する（dangling-reference テストと同型）。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");
const LANGS = ["ja", "en"];
const AGENTS = ["claude", "codex"]; // gemini は codex ツリー共有（専用ファイル無し）。

function checksPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "rules", "validate-checks.md");
}
function skillPath(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", "intent-validate", "SKILL.md");
}
function glossaryPath(lang) {
  return path.join(TEMPLATES, lang, "intent", "glossary.md");
}
function coinageRow(content) {
  return content.split("\n").find((l) => l.trim().startsWith("| coinage-suspect |"));
}

// 状態セグメントの抽出: 「**<状態>**＝<帰結>」（ja）/「**<status>** = <帰結>」（en）の帰結部を取り出す。
// 対応づけそのものを検査することで、状態を無視する読み・帰結の入れ替えを赤化する。
function jaSegment(text, status) {
  const m = text.match(new RegExp(`\\*\\*${status}\\*\\*＝([^／|]*)`));
  return m ? m[1] : null;
}
function enSegment(text, status) {
  const m = text.match(new RegExp(`\\*\\*${status}\\*\\* = ([^/|]*)`));
  return m ? m[1] : null;
}

// ---- 1. 検査カタログ: coinage-suspect の行が「状態→帰結」の対応づけを正しく規定する（4系統） ----
for (const agent of AGENTS) {
  test(`1: ja/${agent} の coinage-suspect 行が 承認済み→沈黙／暫定→合意未了の候補提示／否認済み→再発明 を対応づける`, () => {
    const row = coinageRow(fs.readFileSync(checksPath("ja", agent), "utf8"));
    assert.ok(row, `ja/${agent}: catalog に coinage-suspect の行がある`);
    // 承認済み → 沈黙（名指ししない）。
    const approved = jaSegment(row, "承認済み");
    assert.ok(approved, `ja/${agent}: 行に「承認済み＝…」の対応づけがある`);
    assert.ok(/沈黙/.test(approved), `ja/${agent}: 承認済みの帰結が沈黙である`);
    assert.ok(!/名指し|疑い/.test(approved), `ja/${agent}: 承認済みの帰結に名指し・疑いが混ざらない`);
    // 明示の暫定 → チーム合意未了の候補提示（未登録の造語の疑いとは別の言い回し）。
    const provisional = jaSegment(row, "明示の暫定");
    assert.ok(provisional, `ja/${agent}: 行に「明示の暫定＝…」の対応づけがある`);
    assert.ok(/合意が未了|合意はまだ|合意が無い/.test(provisional), `ja/${agent}: 暫定の帰結がチーム合意未了に触れる`);
    assert.ok(/候補提示/.test(provisional), `ja/${agent}: 暫定の帰結が候補提示である`);
    // 否認済み → 沈黙集合から除外し再発明として名指し。
    const rejected = jaSegment(row, "否認済み");
    assert.ok(rejected, `ja/${agent}: 行に「否認済み＝…」の対応づけがある`);
    assert.ok(/再発明/.test(rejected), `ja/${agent}: 否認済みの帰結が再発明の名指しである`);
    assert.ok(/沈黙集合に入れず/.test(rejected), `ja/${agent}: 否認済みが沈黙集合から除外される`);
    assert.ok(/名指し/.test(rejected), `ja/${agent}: 否認済みの帰結が名指しである`);
  });
  test(`1e: en/${agent} の coinage-suspect 行が approved→silent／provisional→候補提示／rejected→reinvention を対応づける`, () => {
    const row = coinageRow(fs.readFileSync(checksPath("en", agent), "utf8"));
    assert.ok(row, `en/${agent}: catalog に coinage-suspect の行がある`);
    const approved = enSegment(row, "approved");
    assert.ok(approved, `en/${agent}: 行に「approved = …」の対応づけがある`);
    assert.ok(/silent/i.test(approved), `en/${agent}: approved の帰結が silent である`);
    const provisional = enSegment(row, "explicitly provisional");
    assert.ok(provisional, `en/${agent}: 行に「explicitly provisional = …」の対応づけがある`);
    assert.ok(/without team agreement/i.test(provisional), `en/${agent}: provisional の帰結が合意未了に触れる`);
    assert.ok(/candidate/i.test(provisional), `en/${agent}: provisional の帰結が候補提示である`);
    const rejected = enSegment(row, "rejected");
    assert.ok(rejected, `en/${agent}: 行に「rejected = …」の対応づけがある`);
    assert.ok(/reinvention/i.test(rejected), `en/${agent}: rejected の帰結が再発明の名指しである`);
    assert.ok(/excluded from the silence set/i.test(rejected), `en/${agent}: rejected が沈黙集合から除外される`);
  });
}

// ---- 2. 後方互換: 旧3列・状態未記載は「暫定として読むが検出出力は従来どおり（登録済み＝沈黙）」（4系統） ----
// 旧形式で挙動が変わる実装（暫定扱い→通知を出す 等）を赤化する discriminative oracle。
for (const agent of AGENTS) {
  test(`2: ja/${agent} が旧3列・状態未記載の後方互換（暫定として読む・出力は従来どおり沈黙）を規定する`, () => {
    const c = fs.readFileSync(checksPath("ja", agent), "utf8");
    assert.ok(
      /状態が書かれていない行・状態列の無い旧3列の台帳は「暫定」として読む/.test(c),
      `ja/${agent}: 未記載＝暫定の読み規則がある`,
    );
    assert.ok(
      /検出の出力は従来どおり（登録済み＝沈黙）/.test(c),
      `ja/${agent}: 旧形式の検出出力が従来どおり（登録済み＝沈黙）である`,
    );
    assert.ok(
      /旧3列の台帳で挙動が変わる実装は誤り/.test(c),
      `ja/${agent}: 旧3列で挙動が変わる実装を誤りと明記する`,
    );
    // 新しい検出軸を立てない（既存軸の母集合解釈の拡張）。
    assert.ok(/新しい検出軸は立てず/.test(c), `ja/${agent}: 新軸を立てないことを明記する`);
  });
  test(`2e: en/${agent} が旧3列・状態未記載の後方互換を規定する`, () => {
    const c = fs.readFileSync(checksPath("en", agent), "utf8");
    assert.ok(/read as provisional/i.test(c), `en/${agent}: 未記載＝provisional の読み規則がある`);
    assert.ok(/detection output stays as before \(registered = silent\)/i.test(c), `en/${agent}: 旧形式の検出出力が従来どおりである`);
    assert.ok(/behavior changes on an older 3-column ledger is (treated as )?wrong/i.test(c), `en/${agent}: 旧3列で挙動が変わる実装を誤りと明記する`);
    assert.ok(/no new detection axis/i.test(c), `en/${agent}: 新軸を立てないことを明記する`);
  });
}

// ---- 3. 注記: 承認洗浄の回避理由と登録関門（1語ずつ・一括登録は成立しない・台帳を書き換えない）（4系統） ----
for (const agent of AGENTS) {
  test(`3: ja/${agent} の注記が承認洗浄の回避理由と登録関門を持つ`, () => {
    const c = fs.readFileSync(checksPath("ja", agent), "utf8");
    assert.ok(/造語の疑い検査の台帳状態の注記/.test(c), `ja/${agent}: 専用の注記節がある`);
    // 「未記載を通知しない」設計の理由＝一括昇格（承認洗浄）の誘発を避ける。
    assert.ok(/承認洗浄/.test(c), `ja/${agent}: 承認洗浄の回避が理由として書かれている`);
    // 登録・昇格は人が1語ずつ・一括登録は成立しない・検査層は台帳を書き換えない。
    assert.ok(/1語ずつ個別承認/.test(c), `ja/${agent}: 1語ずつの個別承認を明記する`);
    assert.ok(/一括登録.*成立しない/.test(c), `ja/${agent}: 一括登録が成立しないことを明記する`);
    assert.ok(/検査層は台帳を書き換えない/.test(c), `ja/${agent}: 検査層が台帳を書き換えないことを明記する`);
    // 否認済みを削除せず残す目的（再発明の防止）に触れる。
    assert.ok(/削除せず残す.*再発明/.test(c), `ja/${agent}: 否認済みを残す目的（再発明の防止）に触れる`);
  });
  test(`3e: en/${agent} の注記が承認洗浄の回避理由と登録関門を持つ`, () => {
    const c = fs.readFileSync(checksPath("en", agent), "utf8");
    assert.ok(/Note on the ledger term status/i.test(c), `en/${agent}: 専用の注記節がある`);
    assert.ok(/approval laundering/i.test(c), `en/${agent}: 承認洗浄の回避が理由として書かれている`);
    assert.ok(/one term at a time/i.test(c), `en/${agent}: 1語ずつの個別承認を明記する`);
    assert.ok(/[Bb]ulk registration.*do not count as registration/s.test(c), `en/${agent}: 一括登録が成立しないことを明記する`);
    assert.ok(/never rewrites the ledger/i.test(c), `en/${agent}: 検査層が台帳を書き換えないことを明記する`);
  });
}

// ---- 4. SKILL Step 3.6 が状態の読みを結線する（4系統・本文アンカー） ----
for (const agent of AGENTS) {
  test(`4: ja/${agent} の SKILL Step 3.6 が台帳の状態を母集合の解釈に反映する`, () => {
    const c = fs.readFileSync(skillPath("ja", agent), "utf8");
    assert.ok(/台帳の状態を母集合の解釈に反映する/.test(c), `ja/${agent}: 状態反映の bullet がある`);
    assert.ok(/一度否認された語の再発明の疑い/.test(c), `ja/${agent}: 否認済み→再発明の名指しがある`);
    assert.ok(/検出の出力は従来どおり（登録済み＝沈黙）/.test(c), `ja/${agent}: 旧3列の挙動不変がある`);
    assert.ok(/本スキルは台帳を書き換えない/.test(c), `ja/${agent}: 台帳を書き換えないことを明記する`);
  });
  test(`4e: en/${agent} の SKILL Step 3.6 が台帳の状態を母集合の解釈に反映する`, () => {
    const c = fs.readFileSync(skillPath("en", agent), "utf8");
    assert.ok(/Reflect the ledger status in how the mother-set is read/i.test(c), `en/${agent}: 状態反映の bullet がある`);
    assert.ok(/suspected reinvention of a once-rejected term/i.test(c), `en/${agent}: rejected→再発明の名指しがある`);
    assert.ok(/detection output stays as before \(registered = silent\)/i.test(c), `en/${agent}: 旧3列の挙動不変がある`);
    assert.ok(/never rewrites the ledger/i.test(c), `en/${agent}: 台帳を書き換えないことを明記する`);
  });
}

// ---- 5. 配布 scaffold の glossary: スキーマ拡張が後方互換（既存行は無変更・任意2項目・3値・登録関門） ----
for (const lang of LANGS) {
  test(`5: ${lang} の scaffold glossary が拡張スキーマ（状態3値＋言い換え例・後方互換）を持つ`, () => {
    const c = fs.readFileSync(glossaryPath(lang), "utf8");
    if (lang === "ja") {
      // 5列ヘッダ（先頭3列は不変）。
      assert.ok(
        c.includes("| 正規語 | 別表記・同義語 | 一行説明 | 状態 | 言い換え例 |"),
        "ja: 5列ヘッダ（先頭3列不変＋状態＋言い換え例）がある",
      );
      // 3値と、未記載＝暫定の読み規則。
      assert.ok(/承認済み/.test(c) && /暫定/.test(c) && /否認済み/.test(c), "ja: 状態の3値が書かれている");
      assert.ok(/状態が書かれていない行（旧来の3列の行を含む）は「暫定」として読みます/.test(c), "ja: 未記載＝暫定の読み規則がある");
      // 旧3列の台帳・行の後方互換（移行不要）。
      assert.ok(/旧来の3列の台帳もそのまま有効/.test(c), "ja: 旧3列の台帳が有効なままである");
      assert.ok(/一括の移行は不要/.test(c), "ja: 一括移行が不要である");
      // 登録関門（INV84 継承）: 1語ずつ・一括登録は成立しない・否認済みは削除せず残す。
      assert.ok(/登録・昇格は1語ずつ/.test(c), "ja: 1語ずつの登録関門がある");
      assert.ok(/一括登録.*成立しません/s.test(c), "ja: 一括登録が成立しないことを明記する");
      assert.ok(/否認済みの語は削除せず残します/.test(c), "ja: 否認済みを削除せず残す規約がある");
      // DR80 の登録関門の文言を保持（普通の言葉で説明できない語は登録を見直す）。
      assert.ok(
        /普通の言葉で説明できない語は、その語を登録すること自体を見直してください/.test(c),
        "ja: DR80 の登録関門の文言が保持されている",
      );
      // 規約改訂: 人承認済みの代筆は可・承認なしの自動改変はしない。
      assert.ok(/代筆/.test(c), "ja: 人承認済みの代筆を認める規約がある");
      assert.ok(/承認なしの自動改変はしません/.test(c), "ja: 承認なしの自動改変をしない規約がある");
    } else {
      assert.ok(
        c.includes("| Canonical term | Aliases & synonyms | One-line explanation | Status | Rewording example |"),
        "en: 5列ヘッダ（先頭3列不変＋Status＋Rewording example）がある",
      );
      assert.ok(/approved/.test(c) && /provisional/.test(c) && /rejected/.test(c), "en: 状態の3値が書かれている");
      assert.ok(/Rows without a status \(including older 3-field rows\) are read as `provisional`/.test(c), "en: 未記載＝provisional の読み規則がある");
      assert.ok(/older 3-column ledgers — remain valid/.test(c), "en: 旧3列の台帳が有効なままである");
      assert.ok(/no bulk migration needed/.test(c), "en: 一括移行が不要である");
      assert.ok(/one term at a time/i.test(c), "en: 1語ずつの登録関門がある");
      assert.ok(/[Bb]ulk registration.*do not count as registration/s.test(c), "en: 一括登録が成立しないことを明記する");
      assert.ok(/Rejected terms stay in the ledger; do not delete them/.test(c), "en: 否認済みを削除せず残す規約がある");
      assert.ok(/reconsider whether to register that term at all/.test(c), "en: DR80 の登録関門の文言が保持されている");
      assert.ok(/No automatic modification without approval/.test(c), "en: 承認なしの自動改変をしない規約がある");
    }
  });

  // Non-scope の discriminative oracle: 既存行へ状態の一括判定・セル追加をしない（行は3セルのまま）。
  test(`5b: ${lang} の scaffold glossary の既存データ行が3セルのまま（状態の一括判定をしていない）`, () => {
    const c = fs.readFileSync(glossaryPath(lang), "utf8");
    const lines = c.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| 正規語") && !l.startsWith("| Canonical term") && !/^\|[-\s|]+\|$/.test(l.trim()));
    assert.ok(lines.length > 0, `${lang}: データ行がある`);
    for (const l of lines) {
      const cells = l.split("|").length - 2; // 先頭と末尾の空要素を除いたセル数
      assert.equal(cells, 3, `${lang}: 既存データ行は3セルのまま（一括の状態判定・セル追加をしない）: ${l.slice(0, 40)}…`);
    }
  });
}

// ---- 6. 判別フィクスチャ: 3例文（承認済み→沈黙/未登録→疑い/否認済み→再発明）の正解が rules の対応づけと一致する ----
test("6: 判別フィクスチャ（台帳2種＋3例文）が存在し、期待判定が状態と正しく対応する", () => {
  const dir = path.join(__dirname, "fixtures", "glossary-lifecycle");
  const ledger = fs.readFileSync(path.join(dir, "ledger-status.md"), "utf8");
  const old3 = fs.readFileSync(path.join(dir, "ledger-old3col.md"), "utf8");
  const sentences = fs.readFileSync(path.join(dir, "sentences.md"), "utf8");
  // 状態つき台帳: 3値が1行ずつある。
  for (const status of ["承認済み", "暫定", "否認済み"]) {
    assert.ok(
      ledger.split("\n").some((l) => l.includes(`| ${status} |`)),
      `ledger-status.md に状態 ${status} の行がある`,
    );
  }
  // 旧3列台帳: 状態列を持たない。
  assert.ok(old3.includes("| 正規語 | 別表記・同義語 | 一行説明 |"), "ledger-old3col.md は3列ヘッダである");
  assert.ok(!/\| 状態 \|/.test(old3), "ledger-old3col.md に状態列が無い");
  // 3例文の期待判定: 承認済み→沈黙／未登録→造語の疑い／否認済み→再発明。
  const rows = sentences.split("\n").filter((l) => /^\| \d /.test(l));
  assert.equal(rows.length, 3, "sentences.md に3例文がある");
  const byStatus = (kw) => rows.find((l) => l.includes(kw));
  assert.ok(/沈黙/.test(byStatus("承認済み")), "承認済み語の例文の期待判定が沈黙である");
  assert.ok(/造語の疑い/.test(byStatus("未登録")), "未登録語の例文の期待判定が造語の疑いである");
  assert.ok(/再発明/.test(byStatus("否認済み")), "否認済み語の例文の期待判定が再発明の名指しである");
  // 取り違えの赤化: 承認済みの例文に名指しの期待を書いたら落ちる。
  assert.ok(!/名指し/.test(byStatus("承認済み")), "承認済み語の例文に名指しの期待が混ざらない");
});

// ---- 7. パリティ: validate-checks は言語内 byte 等価・SKILL は本文等価（codex は frontmatter 差分のみ） ----
test("7: validate-checks が ja（claude=codex）/ en（claude=codex）で byte 等価", () => {
  for (const lang of LANGS) {
    assert.equal(
      fs.readFileSync(checksPath(lang, "claude"), "utf8"),
      fs.readFileSync(checksPath(lang, "codex"), "utf8"),
      `${lang}: claude と codex の validate-checks が byte 等価`,
    );
  }
});
test("7b: SKILL 本文が言語内で等価（codex は frontmatter のみ差分）", () => {
  for (const lang of LANGS) {
    const claude = fs.readFileSync(skillPath(lang, "claude"), "utf8").split("\n");
    const codex = fs.readFileSync(skillPath(lang, "codex"), "utf8").split("\n");
    // claude frontmatter 6行 / codex 4行の直後から本文比較。
    assert.deepEqual(claude.slice(6), codex.slice(4), `${lang}: SKILL 本文が claude/codex で等価`);
  }
});

// ---- 8. dogfood（.intent / .claude）が parent と同期している（存在すれば検査） ----
test("8: dogfood の validate-checks / SKILL / glossary が同期されている（存在すれば検査）", () => {
  const dogfoodChecks = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "rules", "validate-checks.md");
  const dogfoodSkill = path.join(REPO_ROOT, ".claude", "skills", "intent-validate", "SKILL.md");
  const dogfoodGlossary = path.join(REPO_ROOT, ".intent", "glossary.md");
  if (fs.existsSync(dogfoodChecks)) {
    assert.equal(
      fs.readFileSync(dogfoodChecks, "utf8"),
      fs.readFileSync(checksPath("ja", "claude"), "utf8"),
      "dogfood validate-checks は ja/claude と byte 同一",
    );
  }
  if (fs.existsSync(dogfoodSkill)) {
    assert.equal(
      fs.readFileSync(dogfoodSkill, "utf8"),
      fs.readFileSync(skillPath("ja", "claude"), "utf8"),
      "dogfood SKILL は ja/claude と byte 同一",
    );
  }
  if (fs.existsSync(dogfoodGlossary)) {
    const g = fs.readFileSync(dogfoodGlossary, "utf8");
    assert.ok(
      g.includes("| 正規語 | 別表記・同義語 | 一行説明 | 状態 | 言い換え例 |"),
      "dogfood glossary が拡張スキーマ（5列ヘッダ）を持つ",
    );
    assert.ok(/状態が書かれていない行（旧来の3列の行を含む）は「暫定」として読みます/.test(g), "dogfood glossary に未記載＝暫定の読み規則がある");
  }
});
