// 非プログラム射影 (walking skeleton) の R4 degrade と E2E 受容オラクルの
// 受容オラクルテスト (node:test 標準・依存ゼロ)。Req 4.1 / 4.2 / 4.3 / 5.1 / 5.2 / 5.3。
//
// このリポジトリは skill/scaffold の **コンテンツと構造** を検証する (skill を実行時に
// 走らせない)。よって本テストはテンプレートファイルの内容プロパティを assert する。
//
// 検証する2系統:
//   A. steering 不在 degrade (4.1/4.2/4.3) — 既存挙動の固定。
//      source-scope.md が steering を opt-in (無指定なら読まない) と明文化し、
//      intent-to-spec/SKILL.md の fail-fast ゲートが intent-tree/compass/packet の
//      不在で発火し steering 不在では発火しない (= intent+packets 二層への degrade) こと。
//      これらは既存設計で成立済みのため、本テスト時点で GREEN になる。
//   B. E2E 受容オラクル (5.1/5.2/5.3) — foundation-RED。
//      非プログラム経路が端から端まで疎通するには、format-nonprogram.md に実際の
//      非プログラム向け **写像 rule** が、non-code.md に **充填済み algo 表** が必要。
//      seam が置いた空骨格 (空の器 / 空の algo 表) のままでは疎通しないため、本テスト
//      時点では RED になる。これらは tasks 2.1 / 2.2 で空骨格→充填へ移ると GREEN に閉じる。
//      併せて、射影が `.intent/nl-spec/` のみへ書き export/canonical に触れない派生出力
//      規律 (5.2/5.3) が SKILL.md に明文化されていることを固定する (既存・GREEN)。
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
const SKILL = "intent-to-spec";

function skillDir(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", SKILL);
}
function ruleFile(lang, agent, rule) {
  return path.join(skillDir(lang, agent), "rules", `${rule}.md`);
}
function skillFile(lang, agent) {
  return path.join(skillDir(lang, agent), "SKILL.md");
}
function nonCodeMode(lang) {
  return path.join(TEMPLATES, lang, "intent", "modes", "non-code.md");
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}

// 言語別マーカー (非プログラム射影 / non-code 周りで言語間に差がある語のみ持つ)。
const MARKERS = {
  ja: {
    // source-scope: steering を opt-in (無指定なら読まない) と書く語。
    steeringOptIn: ["含めない", "明示指定", "+steering"],
    steeringNotRead: "無指定なら読まない",
    // fail-fast ゲートが対象とする成果物 (intent-tree/compass/packet)。
    failFastArtifacts: ["intent-tree", "compass", "packet"],
    // non-code algo 表の見出しと、空骨格プレースホルダ語。
    algoTableHeading: "## このモードが組み合わせるアルゴリズム",
    algoEmptyPlaceholder: "まだ空です",
    // format-nonprogram 空骨格プレースホルダ語。
    formatEmptyContainer: "空の器",
    formatLaterSlice: "後続の add スライス",
    // format-nonprogram が「写像 rule」であることを示す語 (充填後に現れる)。
    mappingWord: "写像",
    // 派生出力先 / read-only 規律。
    derivedDir: ".intent/nl-spec/",
    readOnly: ["read-only", "読み取りのみ"],
  },
  en: {
    steeringOptIn: ["Do not include", "explicitly specified", "+steering"],
    steeringNotRead: "do not read",
    failFastArtifacts: ["intent-tree", "compass", "packet"],
    algoTableHeading: "## The algorithms this mode combines",
    algoEmptyPlaceholder: "still empty",
    formatEmptyContainer: "empty container",
    formatLaterSlice: "later add slice",
    mappingWord: "mapping",
    derivedDir: ".intent/nl-spec/",
    readOnly: ["read-only", "read only"],
  },
};

// algo 組み合わせ表の節本文 (見出し以降、次の `## ` 見出しまで) を切り出す。
function algoTableSection(content, lang) {
  const marker = MARKERS[lang].algoTableHeading;
  const start = content.indexOf(marker);
  if (start < 0) return "";
  const after = content.slice(start + marker.length);
  const nextHeading = after.search(/\n## /);
  return nextHeading < 0 ? after : after.slice(0, nextHeading);
}

// 指定見出しの本文を「次の ## 見出し」までに限定して切り出す (slice-to-EOF を避け、
// 後続節の本文が誤って合格判定に混ざるのを防ぐ)。見出し不在なら空文字。
function sectionBody(content, heading) {
  const start = content.indexOf(heading);
  if (start < 0) return "";
  const after = content.slice(start + heading.length);
  const nextHeading = after.search(/\n## /);
  return nextHeading < 0 ? after : after.slice(0, nextHeading);
}

// =====================================================================
// A. steering 不在 degrade (4.1 / 4.2 / 4.3) — 既存 opt-in 挙動の固定 (GREEN 想定)
// =====================================================================

// (4.1/4.3) source-scope.md が steering を opt-in と明文化する。
// steering 制約は「無指定なら読まない・明示指定 (+steering) のときだけ含める」=
// steering 不在でも Intent + packets の二層へ degrade する (新ゲート不要)。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`A-degrade(${lang}/${agent}): source-scope.md が steering を opt-in と明文化する (4.1/4.3)`, () => {
      const content = read(ruleFile(lang, agent, "source-scope"));
      const m = MARKERS[lang];

      // opt-in を示す語が揃っている (含めない / 明示指定 / +steering)。
      for (const token of m.steeringOptIn) {
        assert.ok(
          content.includes(token),
          `${lang}/${agent}: source-scope が steering opt-in 語「${token}」を含む`,
        );
      }
      // 「無指定なら読まない」= steering 不在時は二層へ degrade する根拠。
      assert.ok(
        content.includes(m.steeringNotRead),
        `${lang}/${agent}: source-scope が「無指定なら steering を読まない (${m.steeringNotRead})」を明文化する (4.1: 二層 degrade の根拠)`,
      );

      // Intent (intent-tree/compass) と packets の二層は steering 指定の有無に依らず常に読む素材として表に固定されている。
      assert.ok(
        content.includes("intent-tree") && content.includes("compass"),
        `${lang}/${agent}: source-scope が Intent 層 (intent-tree/compass) を素材に固定する`,
      );
      assert.ok(
        content.includes("packets"),
        `${lang}/${agent}: source-scope が packets 層を素材に固定する (steering 不在でも二層成立)`,
      );
    });
  }
}

// (4.2/4.3) SKILL.md の fail-fast ゲートが intent-tree/compass/packet の不在で発火し、
// steering 不在「だけ」では発火しない (= source 真不在のみ停止・steering 不在は区別)。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`A-failfast(${lang}/${agent}): fail-fast ゲートが intent-tree/compass/packet を対象とし steering 不在では発火しない (4.2/4.3)`, () => {
      const content = read(skillFile(lang, agent));
      const m = MARKERS[lang];

      // fail-fast ゲートが intent-tree / compass / packet の不在を対象にしている (4.2: source 真不在で停止)。
      for (const artifact of m.failFastArtifacts) {
        assert.ok(
          content.includes(artifact),
          `${lang}/${agent}: SKILL.md fail-fast ゲートが「${artifact}」の不在を対象にする (4.2)`,
        );
      }
      // ゲートが「生成しない」「不在」を条件として扱う (Req 1.3 番号での明示も確認)。
      assert.ok(
        content.includes("1.3"),
        `${lang}/${agent}: SKILL.md が fail-fast を Req 1.3 として明示する (source 真不在の停止)`,
      );

      // steering 不在「だけ」を理由に停止しない (4.3): fail-fast ゲート条件は intent/compass/packet で、
      // steering は opt-in (指定時のみ読む) として扱われ、ゲート発火条件に steering 単独不在が含まれない。
      // SKILL.md の三層読取が steering を「指定時のみ」と書いていること (= 不在を許容) を固定する。
      assert.ok(
        /steering[^\n]*(指定時のみ|only when)/.test(content) ||
          content.includes("steering 級の制約（指定時のみ"),
        `${lang}/${agent}: SKILL.md が steering を「指定時のみ」読む (steering 不在を許容・4.3)`,
      );
    });
  }
}

// =====================================================================
// B. E2E 受容オラクル (5.1 / 5.2 / 5.3) — foundation-RED + 派生出力規律 (GREEN)
// =====================================================================

// (5.1 E2E・RED) non-code.md の algo 組み合わせ表が **充填済み** である。
// 非プログラムモードで意図を詰める端 (E2E の入口) が成立するには、空骨格ではなく
// 実テーブル行 + 太字 algo 名が必要。seam の空骨格 (まだ空です) のままでは RED になり、
// task 2.1 で algo 表を充填すると GREEN に閉じる。
for (const lang of LANGS) {
  test(`B-e2e(${lang}): non-code.md の algo 組み合わせ表が充填済みである (空骨格でない・5.1)`, () => {
    const content = read(nonCodeMode(lang));
    const m = MARKERS[lang];
    const table = algoTableSection(content, lang);

    // 空骨格プレースホルダ (まだ空です / still empty) が残っていない。
    assert.ok(
      !table.includes(m.algoEmptyPlaceholder),
      `${lang}: non-code.md の algo 表に空骨格プレースホルダ「${m.algoEmptyPlaceholder}」が残っていない (充填済み・5.1)`,
    );
    // 実テーブル行 (| ... |) と太字 algo 名 (**Name**) がある (standard.md と同じ実体)。
    assert.ok(
      table.includes("|"),
      `${lang}: non-code.md の algo 表に表行 (| ...) がある (5.1)`,
    );
    assert.ok(
      /\*\*[^*]+\*\*/.test(table),
      `${lang}: non-code.md の algo 表に太字 algo 名 (**...**) がある (5.1)`,
    );
  });
}

// (5.1 E2E・RED) format-nonprogram.md が実際の非プログラム向け **写像 rule** を持つ。
// 非プログラム向け format で読める成果物が1つ出る端 (E2E の出口) が成立するには、
// 空の器ではなく、素材をどの順で・どの見出しへ配置するかの写像規則本体が必要。
// seam の空の器 (空の器 / empty container, 後続の add スライス) のままでは RED になり、
// task 2.2 で写像 rule を記述すると GREEN に閉じる。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`B-e2e(${lang}/${agent}): format-nonprogram.md が非プログラム向け写像 rule を持つ (空骨格でない・5.1)`, () => {
      const content = read(ruleFile(lang, agent, "format-nonprogram"));
      const m = MARKERS[lang];

      // 空の器プレースホルダ (空の器 / empty container) が残っていない。
      assert.ok(
        !content.includes(m.formatEmptyContainer),
        `${lang}/${agent}: format-nonprogram.md に空骨格マーカー「${m.formatEmptyContainer}」が残っていない (写像 rule 充填済み・5.1)`,
      );
      // 「後続の add スライスで確定する」という先送りプレースホルダが残っていない。
      assert.ok(
        !content.includes(m.formatLaterSlice),
        `${lang}/${agent}: format-nonprogram.md に先送りプレースホルダ「${m.formatLaterSlice}」が残っていない (5.1)`,
      );
      // 構成節 (## 構成 / ## Composition) に「写像 rule の実体」(素材をどの見出しへ配置するかの
      // 表行 or 箇条書き) があり、先送り文だけでないこと。本文を次の ## 見出しまでに限定して切り出し、
      // 後続の不変条件節の箇条書きが誤って合格させるのを防ぐ (reviewer 指摘の false-green 経路を塞ぐ)。
      const compHeading = lang === "ja" ? "## 構成" : "## Composition";
      const compBody = sectionBody(content, compHeading);
      assert.ok(compBody.length > 0, `${lang}/${agent}: format-nonprogram.md に構成節がある`);
      assert.ok(
        compBody.includes("|") || /\n- /.test(compBody),
        `${lang}/${agent}: format-nonprogram.md の構成節 (## 構成/## Composition) 本体に素材配置の実体 (表行 or 箇条書き) がある (5.1)`,
      );
    });
  }
}

// (5.2/5.3 派生出力規律・GREEN) E2E 生成は export を経由せず canonical を書き換えない。
// SKILL.md が書込み先を `.intent/nl-spec/` 限定とし、map-cc-sdd を呼ばず canonical を read-only に扱う旨を
// 明文化していることを固定する (既存規律・本テスト時点で GREEN)。
for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`B-derived(${lang}/${agent}): SKILL.md が nl-spec 限定書込み・export 非経由・canonical read-only を明文化 (5.2/5.3)`, () => {
      const content = read(skillFile(lang, agent));
      const m = MARKERS[lang];

      // 派生出力先が .intent/nl-spec/ 限定 (5.1/5.2: 読める成果物はここに1つ・export 非経由)。
      assert.ok(
        content.includes(m.derivedDir),
        `${lang}/${agent}: SKILL.md が派生出力先 ${m.derivedDir} を明示する (5.1/5.2)`,
      );
      // export(cc-sdd) 経路を経由しない: map-cc-sdd を呼ばない旨を宣言する (5.2)。
      assert.ok(
        content.includes("map-cc-sdd"),
        `${lang}/${agent}: SKILL.md が map-cc-sdd の非呼出 (export 非経由) を宣言する (5.2)`,
      );
      // canonical (intent-tree/compass/packets) を read-only に扱う (5.3: canonical 不変)。
      assert.ok(
        m.readOnly.some((t) => content.includes(t)),
        `${lang}/${agent}: SKILL.md が射影元の read-only 規律を明示する (5.3: canonical 不変)`,
      );
      // canonical 正本へ書く導線がない (intent-tree/compass へ Write しない)。
      const writesCanonical =
        /Write[^\n]*intent-tree\.md/.test(content) ||
        /Write[^\n]*intent-compass\.md/.test(content);
      assert.ok(
        !writesCanonical,
        `${lang}/${agent}: SKILL.md が canonical (intent-tree/compass) への書込み導線を持たない (5.3)`,
      );
    });
  }
}
