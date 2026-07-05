// intent-from-code (code-ingest) 判別テスト (node:test 標準・依存ゼロ・INV3)。
// Req 6.1 の判別オラクル: 規律を破壊した実装を検出して赤くなる 5 系統の「規律アンカー」を固定する。
// 姉妹テスト spec-ingest.test.mjs 同型 (path 定数・4系統 iteration・frontmatter helper・アサーション様式)。
//
// 範囲: 対象スキル intent-from-code (4系統の SKILL.md + rules) の「規律本文」プロパティを
//   READ-ONLY で検査する。本ファイルはテンプレートも install.mjs も他テストも変更しない。
//   RED-first: 対象スキルは未実装 (ファイル不在) のため、5アンカーはいま全て赤 (対象ファイル不在)。
//   実装後は各アンカーが「規律 PHRASE の消失」を捕らえる判別テストとして残る (discriminative)。
//
// 検査は次の 2 系統 (規律アンカー 5 群 + 構造・パリティ 4 群)。
//
// 規律アンカー (design.md 「Testing Strategy 判別テスト」の 5 アンカー・Req 6.1):
//   1. 抽出規律アンカー   — extract-code-intent 本文に「全項目 inferred 標識必須」の規律文言 (3.1)。
//   2. 機微転写禁止アンカー — sensitive-info-guard 本文に「秘密/資格情報/個人情報を生転写しない」(4.2)。
//   3. 範囲統制アンカー   — read-scope 本文に「全リポ走査を既定にしない」「範囲外を読まない」(2.1/2.4)。
//   4. 正本参照アンカー   — extract-code-intent 本文が抽出規律の正本 algo-intent-recovery を名指し (3.5)。
//   5. write 境界アンカー — SKILL 本文が write 先を .intent/code-ingest/ 限定と宣言 (4.1)。
//     5b. claude SKILL frontmatter allowed-tools に Write がある (4.1 の frontmatter 面)。
//
// 構造・パリティ (design.md 「Testing Strategy 構造・パリティテスト」・Req 5.1 / 6.2):
//   6. 4系統存在      — 4系統 (ja/en × claude/codex) に SKILL.md + 4 rules が全て存在する (5.1)。
//   7. en/ja 1:1      — intent-from-code サブツリーの en/ja ファイル集合が agent 毎に 1:1 一致 (5.1)。
//   8. frontmatter 契約 — claude=4フィールド (disable-model-invocation なし)・codex=name+description のみ (5.1)。
//   9. パリティ        — rules が claude⇔codex で byte 等価 (同一言語内)・description が claude⇔codex で byte 同一 (5.1)。
// (パリティ軸は「同一言語内・claude vs codex」。ja↔en は翻訳ゆえ byte 一致しない。)
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
const SKILL = "intent-from-code";
const RULE_NAMES = ["extract-code-intent", "read-scope", "recap-and-promotion", "sensitive-info-guard"];

// claude SKILL.md frontmatter の必須フィールド。
// intent-from-code は canonical を書き換えない read-only スキル (auto-invocable) のため
// disable-model-invocation は必須から除外し 4 フィールド契約とする (design.md line 51 / 250)。
const REQUIRED_CLAUDE_FIELDS = ["name", "description", "allowed-tools", "argument-hint"];

// claude 固有 (codex frontmatter には現れてはならない) フィールド。
const CLAUDE_ONLY_FIELDS = ["allowed-tools", "argument-hint", "disable-model-invocation"];

// intent-from-code スキルディレクトリの絶対パス。
function skillDir(lang, agent) {
  return path.join(TEMPLATES, lang, agent, "skills", SKILL);
}

// SKILL.md 本文を読む (frontmatter 込みの全文)。ファイル不在なら明示的に赤にする。
function readSkill(lang, agent) {
  const p = path.join(skillDir(lang, agent), "SKILL.md");
  assert.ok(fs.existsSync(p), `SKILL.md が実在する: ${lang}/${agent} (${p})`);
  return fs.readFileSync(p, "utf8");
}

// rule 本文を読む。ファイル不在なら明示的に赤にする。
function readRule(lang, agent, rule) {
  const p = path.join(skillDir(lang, agent), "rules", `${rule}.md`);
  assert.ok(fs.existsSync(p), `rule が実在する: ${lang}/${agent}/rules/${rule}.md (${p})`);
  return fs.readFileSync(p, "utf8");
}

// 先頭 `---` フェンス間を frontmatter として素朴抽出する (yaml 依存なし)。
// 解析方式は spec-ingest.test.mjs / structure-pack.test.mjs の parseFrontmatter と同じ。
function parseFrontmatter(text, label) {
  const lines = text.split(/\r?\n/);
  assert.equal(lines[0].trim(), "---", `${label}: 先頭が --- フェンス`);
  const fields = {};
  let closed = false;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closed = true;
      break;
    }
    const m = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  assert.ok(closed, `${label}: 閉じ --- フェンスが存在する`);
  return fields;
}

// dir 配下の全ファイルを相対パスで列挙する (任意ネスト・隠しファイル含む)。
// spec-ingest.test.mjs / structure-pack.test.mjs の列挙ヘルパと同一方式。
function listRel(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const parent = e.parentPath ?? e.path;
      return path.relative(dir, path.join(parent, e.name));
    })
    .sort();
}

// ---- 群1: 抽出規律アンカー — 全項目 inferred 標識必須 (Req 3.1) ----
// extract-code-intent.md 本文が「すべての抽出項目に inferred (推測) 標識を付す/標識なしを出さない」
// という規律を持つことを検査する。この文言を消すとテストが赤くなる (捏造意図の混入を防ぐ規律)。

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群1: ${lang}/${agent} extract-code-intent は「全項目 inferred 標識必須」を規律として持つ (3.1)`, () => {
      const content = readRule(lang, agent, "extract-code-intent");
      // 「inferred (推測) 標識」概念が本文にある。
      assert.match(
        content,
        /inferred/i,
        `${lang}/${agent}: extract-code-intent に inferred 標識の概念がある`,
      );
      // load-bearing かつ discriminative: 「欠落禁止の動詞形」（標識なしを出さない / emit no unmarked）
      // を必須にする。見出し等の名詞句（「各項目の必須表記」/「Mandatory notation」）では満たされず、
      // 規律文（付す＋出さない / attach＋emit-not）だけが満たす。ja / en 双方を受理（bilingual）。
      // en 配布物に ja トークンを埋めさせない。この分岐は規律文を削ると赤くなる（1.3 の判別性の要）。
      const requiresAllMarkedJa =
        // 網羅義務（全項目/すべて/各項目）＋ 標識を「付す/付ける」動詞
        (/(全(?:て|ての)?項目|すべての(?:抽出)?項目|各(?:抽出)?項目)[^\n]*(inferred|推測)[^\n]*標識[^\n]*(付す|付ける)/.test(
          content,
        ) ||
          /標識[^\n]*(全(?:て|ての)?項目|すべて|各項目)[^\n]*(付す|付ける)/.test(content)) &&
        // かつ「標識の無い記述を出さない/出力しない」の欠落禁止形が本文にある
        /(標識|印|マーク)[^\n]*(無い|ない|欠)[^\n]*(1件|一件|出さない|出力しない)/.test(content);
      const requiresAllMarkedEn =
        /(every|all|each)[^\n]*(item|entry|extraction|candidate)[^\n]*inferred[^\n]*(marker|mark|tag|label)/i.test(
          content,
        ) &&
        /(emit|output|leave|produce)[^\n]*(no|not|never)[^\n]*(single|one|item|description|entry|unmarked|un-marked)/i.test(
          content,
        );
      assert.ok(
        requiresAllMarkedJa || requiresAllMarkedEn,
        `${lang}/${agent}: extract-code-intent が「全項目 inferred 標識必須（標識なしを出さない）」の規律文言を持つ（ja/en いずれか）`,
      );
    });
  }
}

// ---- 群2: 機微転写禁止アンカー — 秘密/資格情報/個人情報を生転写しない (Req 4.2) ----
// sensitive-info-guard.md 本文が「秘密鍵・資格情報・個人情報を生のまま転写しない」規律を持つ。
// この禁止文言を消すと赤くなる (機微情報の staging 漏洩を防ぐ規律)。

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群2: ${lang}/${agent} sensitive-info-guard は「機微情報を生転写しない」を規律として持つ (4.2)`, () => {
      const content = readRule(lang, agent, "sensitive-info-guard");
      // 機微情報の種別 (秘密/資格情報/個人情報 のいずれか) が語られる。
      assert.match(
        content,
        /(秘密|資格情報|個人情報|credential|secret|personal|sensitive)/i,
        `${lang}/${agent}: sensitive-info-guard に機微情報の概念がある`,
      );
      // 「生のまま転写しない/そのまま書かない」= 生転写の禁止が load-bearing。
      const forbidsRawTranscription =
        /(生(?:の)?まま|そのまま|verbatim|raw)[^\n]*(転写|書き写|出力|書か|write|copy|transcrib)[^\n]*(しない|禁止|ない|not|never|avoid|prohibit)/i.test(
          content,
        ) ||
        /(転写|書き写|write|copy|transcrib)[^\n]*(しない|禁止|ない|not|never|avoid)[^\n]*(生|そのまま|verbatim|raw)/i.test(
          content,
        );
      assert.ok(
        forbidsRawTranscription,
        `${lang}/${agent}: sensitive-info-guard が「機微情報を生のまま転写しない」の禁止文言を持つ`,
      );
    });
  }
}

// ---- 群3: 範囲統制アンカー — 全リポ走査を既定にしない / 範囲外を読まない (Req 2.1 / 2.4) ----
// read-scope.md 本文が「全リポジトリ走査を既定にしない」と「指定範囲外を読まない/入力にしない」の
// 2 規律を持つ。どちらかを消すと赤くなる (コンテキスト浪費・範囲逸脱を防ぐ規律)。
// design.md の指示どおり、除外要素の個別列挙 (node_modules 等) はアンカーに焼き込まない。

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群3: ${lang}/${agent} read-scope は「全リポ走査を既定にしない」「範囲外を読まない」を規律として持つ (2.1/2.4)`, () => {
      const content = readRule(lang, agent, "read-scope");
      // 規律A: 全リポジトリ走査を既定にしない (未指定でも全量走査へ倒さない)。
      const noWholeRepoByDefault =
        /(全(?:リポ|リポジトリ|量|体)|whole[ -]?repo|entire[ -]?repo|all[ -]?files?)[^\n]*(走査|スキャン|読み|読む|scan|read|traverse)[^\n]*(既定|デフォルト|default|しない|行わない|not|never|avoid)/i.test(
          content,
        ) ||
        /(既定|デフォルト|default|自動的|automatically)[^\n]*(全(?:リポ|リポジトリ|量|体)|whole[ -]?repo|entire[ -]?repo|all[ -]?files?)[^\n]*(走査|スキャン|読|scan|read|traverse)/i.test(
          content,
        );
      assert.ok(
        noWholeRepoByDefault,
        `${lang}/${agent}: read-scope が「全リポ走査を既定にしない」の規律文言を持つ`,
      );
      // 規律B: 指定範囲外のファイルを読まない / 意図抽出の入力に用いない。
      const noOutOfScope =
        /(範囲外|指定範囲の外|外の(?:ファイル)?|out[ -]?of[ -]?scope|outside[^\n]*scope)[^\n]*(読ま|読み込ま|入力|使わ|用い|read|use|input)[^\n]*(ない|しない|not|never|avoid|禁止)/i.test(
          content,
        ) ||
        /(範囲外|out[ -]?of[ -]?scope|outside)[^\n]*(ない|しない|not|never)/i.test(content);
      assert.ok(
        noOutOfScope,
        `${lang}/${agent}: read-scope が「指定範囲外を読まない/入力に用いない」の規律文言を持つ`,
      );
    });
  }
}

// ---- 群4: 正本参照アンカー — extract-code-intent が algo-intent-recovery を正本として名指し (Req 3.5) ----
// spec-ingest.test.mjs 群7 (gap-readout が validate-checks.md を参照) と同型の跨ぎ参照検査。
// extract-code-intent.md 本文が抽出規律の「正本」として algo-intent-recovery を名指しすること。
// 名指しを消す (規律を自前再定義する) と赤くなる (二重正本化を防ぐ規律)。

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群4: ${lang}/${agent} extract-code-intent は algo-intent-recovery を抽出規律の正本として名指しする (3.5)`, () => {
      const content = readRule(lang, agent, "extract-code-intent");
      // 正本ファイル名を本文が参照している (spec-ingest.test.mjs のファイル名参照様式)。
      assert.match(
        content,
        /algo-intent-recovery/,
        `${lang}/${agent}: extract-code-intent が algo-intent-recovery を名指しする`,
      );
      // 「正本/canonical/source of truth」として位置づけている (単なる言及でなく正本参照)。
      assert.ok(
        /(正本|canonical|source of truth|準拠|再定義しない|再実装しない)/i.test(content),
        `${lang}/${agent}: extract-code-intent が algo-intent-recovery を正本 (準拠先) として位置づける`,
      );
    });
  }
}

// ---- 群5: write 境界アンカー — SKILL が write 先を .intent/code-ingest/ に限定宣言 (Req 4.1) ----
// spec-ingest.test.mjs 群6 (書込み境界) と同型。SKILL.md 本文が write 先を staging に限定する。
// claude 版は frontmatter allowed-tools に Write を持ち、Safety で staging 限定を宣言する。
// canonical (intent-tree.md / intent-compass.md) への書込み導線が本文に現れないことも検査。

for (const lang of LANGS) {
  for (const agent of AGENTS) {
    test(`群5: ${lang}/${agent} SKILL は write 先を .intent/code-ingest/ に限定宣言する (4.1)`, () => {
      const content = readSkill(lang, agent);
      // 書込み先として staging ディレクトリを明示している。
      assert.ok(
        content.includes(".intent/code-ingest/"),
        `${lang}/${agent}: SKILL が .intent/code-ingest/ を書込み先として明示する`,
      );
      // canonical 正本ファイル名への書込み導線が本文に現れない (read-only 規律)。
      assert.ok(
        !content.includes("intent-tree.md"),
        `${lang}/${agent}: SKILL に canonical intent-tree.md への言及がない`,
      );
      assert.ok(
        !content.includes("intent-compass.md"),
        `${lang}/${agent}: SKILL に canonical intent-compass.md への言及がない`,
      );
    });
  }
}

// ---- 群5b: claude SKILL は allowed-tools に Write を持つ (write 境界アンカーの frontmatter 面・4.1) ----
// staging へ書くための Write 権限が claude frontmatter にあること。task 1.3 の write 境界アンカーの
// 「frontmatter allowed-tools に Write があり」条件をここで固定する。

for (const lang of LANGS) {
  test(`群5b: ${lang}/claude SKILL の frontmatter allowed-tools に Write がある (4.1)`, () => {
    const content = readSkill(lang, "claude");
    const fm = parseFrontmatter(content, `${lang}/claude SKILL.md`);
    assert.ok(
      Object.prototype.hasOwnProperty.call(fm, "allowed-tools"),
      `${lang}/claude: frontmatter に allowed-tools がある`,
    );
    const tools = fm["allowed-tools"].split(",").map((t) => t.trim());
    assert.ok(
      tools.includes("Write"),
      `${lang}/claude: allowed-tools に Write を含む (実値: ${fm["allowed-tools"]})`,
    );
  });
}

// ==== 構造・パリティテスト (design.md 「Testing Strategy 構造・パリティテスト」・Req 5.1 / 6.2) ====
// spec-ingest.test.mjs 群1-4 と同型。4系統の存在・en/ja 1:1・frontmatter 契約・claude⇔codex パリティを検査する。

// ---- 群6: 4系統の SKILL.md + 4 rules が全て存在する (Req 5.1) ----
// 期待: 4 SKILL.md + 16 rule files = 20 ファイル。1つでも欠ければ落ちる。

test("群6: 4系統 (ja/en × claude/codex) に SKILL.md + 4 rules が全て存在する (5.1)", () => {
  let skillCount = 0;
  let ruleCount = 0;
  for (const lang of LANGS) {
    for (const agent of AGENTS) {
      const dir = skillDir(lang, agent);
      const skillPath = path.join(dir, "SKILL.md");
      assert.ok(fs.existsSync(skillPath), `SKILL.md が実在する: ${lang}/${agent}`);
      skillCount++;
      for (const rule of RULE_NAMES) {
        const rulePath = path.join(dir, "rules", `${rule}.md`);
        assert.ok(fs.existsSync(rulePath), `rule が実在する: ${lang}/${agent}/rules/${rule}.md`);
        ruleCount++;
      }
    }
  }
  assert.equal(skillCount, 4, "SKILL.md は4系統ちょうど");
  assert.equal(ruleCount, 16, "rule は 4系統 × 4種 = 16 ちょうど");
});

// ---- 群7: en/ja のファイル集合が agent 毎に 1:1 一致 (Req 5.1) ----
// intent-from-code サブツリーに範囲を限定し、ja↔en の相対パス集合が翻訳漏れ・余剰なく一致することを検証する。

for (const agent of AGENTS) {
  test(`群7: ${agent} の intent-from-code サブツリーが ja/en で 1:1 一致 (5.1)`, () => {
    const jaRel = listRel(skillDir("ja", agent));
    const enRel = listRel(skillDir("en", agent));
    assert.ok(jaRel.length > 0, `${agent}: ja サブツリーにファイルがある`);

    const jaSet = new Set(jaRel);
    const enSet = new Set(enRel);
    const missingInEn = jaRel.filter((f) => !enSet.has(f));
    const missingInJa = enRel.filter((f) => !jaSet.has(f));
    assert.deepEqual(missingInEn, [], `${agent}: en に欠落 (ja にあって en にない): ${missingInEn.join(", ")}`);
    assert.deepEqual(missingInJa, [], `${agent}: ja に欠落 (en にあって ja にない): ${missingInJa.join(", ")}`);
    assert.deepEqual(enRel, jaRel, `${agent}: ja/en の相対パス集合が完全一致`);
    // SKILL.md と 4 rules が確かに含まれる (空集合の偽陽性防止)。
    assert.ok(jaRel.includes("SKILL.md"), `${agent}: 集合に SKILL.md を含む`);
    for (const rule of RULE_NAMES) {
      assert.ok(
        jaRel.includes(path.join("rules", `${rule}.md`)),
        `${agent}: 集合に rules/${rule}.md を含む`,
      );
    }
  });
}

// ---- 群8: SKILL.md frontmatter 契約 — claude 4フィールド / codex 2フィールド (Req 5.1) ----
// claude=read-only スキル契約 (name / description / allowed-tools / argument-hint の 4 フィールド・
//   disable-model-invocation を持たない=積極不在検査)。codex=name+description のみ。
// design.md line 51 / 250 の二者択一で intent-from-code は前者 (auto-invocable・4フィールド)。

for (const lang of LANGS) {
  test(`群8: ${lang}/claude SKILL.md frontmatter は4フィールドで disable-model-invocation を持たない (5.1)`, () => {
    const content = readSkill(lang, "claude");
    const fm = parseFrontmatter(content, `${lang}/claude SKILL.md`);

    for (const field of REQUIRED_CLAUDE_FIELDS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(fm, field),
        `${lang}/claude: frontmatter に ${field} がある`,
      );
      assert.ok(fm[field].length > 0, `${lang}/claude: ${field} が空でない`);
    }
    // name はスキルディレクトリ名と一致する。
    assert.equal(fm.name, SKILL, `${lang}/claude: name が ${SKILL} と一致する`);

    // read-only スキルゆえ disable-model-invocation は持たない (積極不在検査・auto-invocable)。
    assert.ok(
      !Object.prototype.hasOwnProperty.call(fm, "disable-model-invocation"),
      `${lang}/claude: read-only スキルゆえ disable-model-invocation を持たない`,
    );
    // frontmatter キーは必須4フィールドちょうど (余剰キーなし)。
    assert.deepEqual(
      Object.keys(fm).sort(),
      [...REQUIRED_CLAUDE_FIELDS].sort(),
      `${lang}/claude: frontmatter キーは4フィールドちょうど`,
    );
  });

  test(`群8: ${lang}/codex SKILL.md frontmatter は name+description のみ (claude 専用フィールド不在) (5.1)`, () => {
    const content = readSkill(lang, "codex");
    const fm = parseFrontmatter(content, `${lang}/codex SKILL.md`);

    for (const field of ["name", "description"]) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(fm, field),
        `${lang}/codex: frontmatter に ${field} がある`,
      );
      assert.ok(fm[field].length > 0, `${lang}/codex: ${field} が空でない`);
    }
    assert.equal(fm.name, SKILL, `${lang}/codex: name が ${SKILL} と一致する`);

    // claude 専用フィールドは1つも存在しない (最小化の核心)。
    for (const field of CLAUDE_ONLY_FIELDS) {
      assert.ok(
        !Object.prototype.hasOwnProperty.call(fm, field),
        `${lang}/codex: frontmatter に claude 専用フィールド ${field} を含まない`,
      );
    }
    // frontmatter キーは name と description の2つちょうど (余剰キーなし)。
    assert.deepEqual(
      Object.keys(fm).sort(),
      ["description", "name"],
      `${lang}/codex: frontmatter キーは name と description のみ`,
    );
  });
}

// ---- 群9: claude⇔codex パリティ — rules byte 等価・description byte 同一 (Req 5.1) ----
// パリティ軸は「同一言語内・claude vs codex」。ja↔en は翻訳ゆえ byte 一致しない (誤軸を排す)。
// rules は agent 間で byte 等価コピー・SKILL の description も agent 間で byte 同一。SKILL 本文のみ agent 別編集。

for (const lang of LANGS) {
  test(`群9: ${lang} の rules が claude⇔codex で byte 等価 (同一言語内・5.1)`, () => {
    for (const rule of RULE_NAMES) {
      const claudeBuf = fs.readFileSync(
        path.join(skillDir(lang, "claude"), "rules", `${rule}.md`),
      );
      const codexBuf = fs.readFileSync(
        path.join(skillDir(lang, "codex"), "rules", `${rule}.md`),
      );
      assert.ok(
        claudeBuf.equals(codexBuf),
        `${lang}: rules/${rule}.md が claude⇔codex で byte 等価 (claude ${claudeBuf.length}B / codex ${codexBuf.length}B)`,
      );
    }
  });

  test(`群9: ${lang} の SKILL description が claude⇔codex で byte 同一 (同一言語内・5.1)`, () => {
    const claudeFm = parseFrontmatter(readSkill(lang, "claude"), `${lang}/claude SKILL.md`);
    const codexFm = parseFrontmatter(readSkill(lang, "codex"), `${lang}/codex SKILL.md`);
    assert.ok(claudeFm.description.length > 0, `${lang}: claude description が空でない`);
    assert.equal(
      claudeFm.description,
      codexFm.description,
      `${lang}: description が claude⇔codex で byte 同一`,
    );
  });
}
