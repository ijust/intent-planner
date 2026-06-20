// drift-watch スキーマ / パース / 4系統同期のガード・特性テスト (node:test 標準・依存ゼロ)。
// Req 1.5 / 2.1 / 3.1 / 3.2 / 3.3 / 3.7 / 10.1 / 11.3。
//
// 設計上の前提（重要）: drift-watch には実行スクリプトが存在しない（enforcement の
//   intent-check.mjs に相当するものが無い）。検知ロジックは skill prompt 側に宿る。
//   よって本テストは production モジュールから parse 関数を import できない。
//   代わりに、配布されるテンプレート（.md）の「内容そのもの」を読み、正規表現 /
//   文字列 / バイト一致で検証する。これは本リポジトリの内容・パリティガードの確立した
//   手法（standard-invariance.test.mjs の hash ロック等）に倣ったものである。
//
//   成果物は既に scaffold 済み（task 1.1〜3.1）なので、本テストは現状で green になる。
//   これは想定どおりで正しい（将来のスキーマ・パリティ回帰に対するガードである）。
//   feature-flag の切り替えはここには無い。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeCopyPlan,
  defaultTemplatesDir,
  resolveLangRoot,
} from "../src/install.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(HERE, "..");
const JA_INTENT = path.join(REPO_ROOT, "templates", "ja", "intent");
const EN_INTENT = path.join(REPO_ROOT, "templates", "en", "intent");

function readUtf8(...segs) {
  return fs.readFileSync(path.join(...segs), "utf8");
}
function readBytes(...segs) {
  return fs.readFileSync(path.join(...segs));
}

// drift-log.md の `<!-- -->`（HTML コメント）で囲われた記入見本ブロックの行を取り出す。
function extractSchemaSampleLines(content) {
  // 行頭の <!-- だけを記入見本ブロックの開始とみなす。
  // （本文には説明用に `<!-- -->` を inline で言及する箇所があるため indexOf では誤マッチする）
  const m = content.match(/^<!--\r?\n([\s\S]*?)\r?\n-->/m);
  assert.ok(m, "drift-log.md に行頭の <!-- ... --> 記入見本ブロックがある");
  return m[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));
}

// ---------------------------------------------------------------------------
// A. Drift-watch セクションのパース（Req 1.5）
// ---------------------------------------------------------------------------
// drift-watch には共有モジュールが無いため、ここでローカルに寛容パーサを実装する。
// これは「ドキュメント化されたパース規則の、テスト側での仕様エンコード」であり
// （design の Testing Strategy が示唆する手法）、enforcement の寛容パース意味論
// （colon 区切りの config 行のみを解釈・大小無視・未知/不在は既定値）に忠実に倣う。
// production からの import ではない点に注意（検知は skill prompt 側に宿るため）。
function parseDriftWatch(modeContent) {
  if (modeContent == null) return "off";
  for (const raw of String(modeContent).split("\n")) {
    const line = raw.trim();
    // 説明行（em-dash 区切り `- **drift-watch** — ...`）は config 行ではない。
    // colon 区切りの設定行だけを解釈する。
    const m = line.match(/^-\s*\*{0,2}drift-watch\*{0,2}\s*:\s*(\S+)/i);
    if (m) {
      const value = m[1].toLowerCase();
      return value === "on" ? "on" : "off";
    }
  }
  return "off"; // drift-watch 行が無い（未記載 / 節不在）
}

test("A: parseDriftWatch — on のみ on、それ以外（off/未記載/不正値/節不在/null）は off", () => {
  // on（bold あり / なし、前後空白・大小無視）
  assert.equal(parseDriftWatch("- **drift-watch**: on"), "on");
  assert.equal(parseDriftWatch("- drift-watch: on"), "on");
  assert.equal(parseDriftWatch("-   **drift-watch** :  ON  "), "on");

  // off（明示）
  assert.equal(parseDriftWatch("- **drift-watch**: off"), "off");

  // 未記載（drift-watch 行が無い本文）
  assert.equal(parseDriftWatch("# Active Mode\n- mode: standard\n"), "off");

  // 不正値（onn / gate などの未知値はすべて off へ無効化）
  assert.equal(parseDriftWatch("- **drift-watch**: onn"), "off");
  assert.equal(parseDriftWatch("- **drift-watch**: gate"), "off");
  assert.equal(parseDriftWatch("- **drift-watch**: remind"), "off");
  assert.equal(parseDriftWatch("- **drift-watch**: true"), "off");

  // 節不在 / 空 / null|undefined
  assert.equal(parseDriftWatch(""), "off");
  assert.equal(parseDriftWatch(null), "off");
  assert.equal(parseDriftWatch(undefined), "off");
});

test("A: parseDriftWatch — em-dash の説明行を config 行と誤認しない", () => {
  // 説明行だけがあり config 行が無いとき off（説明行の `on` 字句に釣られない）
  const descOnly =
    "- **drift-watch** — strength of drift monitoring. Two values: `off` | `on`:";
  assert.equal(parseDriftWatch(descOnly), "off");
  // 説明行 + off の config 行 → off（説明行は無視され config が効く）
  assert.equal(parseDriftWatch(`- **drift-watch**: off\n${descOnly}`), "off");
});

test("A: 実 scaffold の mode.md (ja/en) は drift-watch=off（既定 off / Req 1.5 baseline）", () => {
  for (const intentDir of [JA_INTENT, EN_INTENT]) {
    const content = readUtf8(intentDir, "mode.md");
    assert.equal(parseDriftWatch(content), "off");
  }
});

// ---------------------------------------------------------------------------
// B. drift-log スキーマ（Req 3.1 / 3.2 / 3.3 / 10.1 / 3.7）
// ---------------------------------------------------------------------------

const NINE_KEYS = [
  "pattern",
  "stage",
  "packet",
  "mechanism",
  "outcome",
  "user-verdict",
  "recorded_at",
  "commit",
  "note",
];

for (const [lang, intentDir] of [
  ["ja", JA_INTENT],
  ["en", EN_INTENT],
]) {
  test(`B[${lang}]: drift-log 記入見本に 9 キーが固定順で並ぶ（Req 3.1）`, () => {
    const content = readUtf8(intentDir, "drift-log.md");
    const lines = extractSchemaSampleLines(content);
    const keys = lines.map((l) => l.replace(/^-\s*/, "").split(":")[0].trim());
    assert.deepEqual(keys, NINE_KEYS, `9 キーが ${NINE_KEYS.join(",")} の順`);
  });

  test(`B[${lang}]: outcome enum が 5 値ちょうど（Req 3.2）`, () => {
    const content = readUtf8(intentDir, "drift-log.md");
    const lines = extractSchemaSampleLines(content);
    const outcomeLine = lines.find((l) => l.startsWith("- outcome:"));
    assert.ok(outcomeLine, "outcome 行がある");
    // 字句どおり 5 値・固定順。値の欠落 / 増殖 / 綴り違いはここで落ちる。
    assert.match(
      outcomeLine,
      /^- outcome: <prevented \| caught \| missed \| false-positive \| not-applicable>$/,
    );
  });

  test(`B[${lang}]: outcome の対称表に eff(prevented/caught) と ineff(missed/false-positive/not-applicable)（Req 3.2）`, () => {
    const content = readUtf8(intentDir, "drift-log.md");
    for (const v of [
      "prevented",
      "caught",
      "missed",
      "false-positive",
      "not-applicable",
    ]) {
      // 対称表のセル（`code` 囲み）に各 outcome 値が現れる
      assert.ok(
        content.includes("`" + v + "`"),
        `対称表に \`${v}\` が現れる`,
      );
    }
    // 効いた系 / 効かなかった系の2列であること（表ヘッダ）
    assert.ok(
      /\|\s*(効いた系|Worked)\s*\|\s*(効かなかった系|Did not work)\s*\|/.test(content),
      "outcome 対称表のヘッダ（効いた系/効かなかった系）がある",
    );
  });

  test(`B[${lang}]: stage(3) / user-verdict(3) / mechanism(5) enum（Req 3.3）`, () => {
    const content = readUtf8(intentDir, "drift-log.md");
    const lines = extractSchemaSampleLines(content);
    const stage = lines.find((l) => l.startsWith("- stage:"));
    const verdict = lines.find((l) => l.startsWith("- user-verdict:"));
    const mechanism = lines.find((l) => l.startsWith("- mechanism:"));
    assert.match(stage, /^- stage: <discover \| export \| improve>$/);
    assert.match(verdict, /^- user-verdict: <valid \| false-alarm \| unjudged>$/);
    // mechanism は scope-2nd-defense（DR9 第二防御）で packet-scope-overflow を加算（4→5値）。
    assert.match(
      mechanism,
      /^- mechanism: <compass-anti-direction \| compass-invariant \| pattern-catalog \| packet-scope-overflow \| none>$/,
    );
  });

  test(`B[${lang}]: commit は取得不可で - にフォールバックする旨が明記（Req 10.1）`, () => {
    const content = readUtf8(intentDir, "drift-log.md");
    const lines = extractSchemaSampleLines(content);
    const commit = lines.find((l) => l.startsWith("- commit:"));
    assert.ok(commit, "commit 行がある");
    // フォールバック値 - を持つ（`<短縮ハッシュ | ->` / `<short hash | ->`）
    assert.match(commit, /\|\s*->/, "commit が | -> のフォールバックを持つ");
    // コメントに「取得不可時は -」相当が明記
    assert.ok(
      /取得不可時は -|when unavailable/.test(commit),
      "取得不可時のフォールバックが説明されている",
    );
  });

  test(`B[${lang}]: recorded_at が ISO 8601（transaction time）として明記（Req 10.1）`, () => {
    const content = readUtf8(intentDir, "drift-log.md");
    const lines = extractSchemaSampleLines(content);
    const recorded = lines.find((l) => l.startsWith("- recorded_at:"));
    assert.ok(recorded, "recorded_at 行がある");
    assert.ok(recorded.includes("ISO 8601"), "recorded_at が ISO 8601 と明記");
    assert.ok(
      /transaction time/.test(recorded),
      "recorded_at が transaction time と明記",
    );
  });

  test(`B[${lang}]: append-only 契約が運用説明に明記（Req 10.1）`, () => {
    const content = readUtf8(intentDir, "drift-log.md");
    assert.ok(
      content.includes("**append-only**"),
      "append-only 契約が明記されている",
    );
  });
}

// ---------------------------------------------------------------------------
// C. drift-patterns seed（Req 2.1）
// ---------------------------------------------------------------------------

const SEED_IDS = [
  "microservice-over-split",
  "premature-abstraction",
  "layer-leak",
  "coinage-proliferation", // ubiquitous-language add（造語が増えやすい地形）— wire で回帰の明示対象に追加
];

for (const [lang, intentDir] of [
  ["ja", JA_INTENT],
  ["en", EN_INTENT],
]) {
  test(`C[${lang}]: seed 4 件の id（kebab-case）が存在する（Req 2.1）`, () => {
    const content = readUtf8(intentDir, "drift-patterns.md");
    for (const id of SEED_IDS) {
      assert.ok(
        content.includes(`## id: ${id}`),
        `seed id "## id: ${id}" がある`,
      );
      assert.match(id, /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, `${id} は kebab-case`);
    }
  });

  test(`C[${lang}]: 各 seed 型に name / symptom / Anti-direction / Invariant がある（Req 2.1）`, () => {
    const content = readUtf8(intentDir, "drift-patterns.md");
    // 各 seed の見出し以降〜次の `## ` 直前までを型ブロックとして切り出す
    for (const id of SEED_IDS) {
      const head = `## id: ${id}`;
      const startIdx = content.indexOf(head);
      assert.notEqual(startIdx, -1, `${head} がある`);
      const rest = content.slice(startIdx + head.length);
      const nextIdx = rest.indexOf("\n## ");
      const block = nextIdx === -1 ? rest : rest.slice(0, nextIdx);
      assert.match(block, /-\s*name:/, `${id} に name フィールド`);
      assert.match(block, /-\s*symptom:/, `${id} に symptom フィールド`);
      assert.match(block, /Anti-direction:/, `${id} に Anti-direction`);
      assert.match(block, /Invariant:/, `${id} に Invariant`);
    }
  });

  test(`C[${lang}]: カタログ冒頭が「網羅ではない / 利用者が育てる」と明記（Req 2.1）`, () => {
    const content = readUtf8(intentDir, "drift-patterns.md");
    assert.ok(
      /これは網羅ではありません|This is not exhaustive/.test(content),
      "非網羅（user-grown）であることが明記されている",
    );
  });
}

// ---------------------------------------------------------------------------
// D. 4系統 / 言語非依存のバイト同期（Req 3.7 / 11.3）
// ---------------------------------------------------------------------------

test("D: drift-log の言語非依存スキーマ行が ja/en でバイト一致（Req 3.7）", () => {
  const ja = extractSchemaSampleLines(readUtf8(JA_INTENT, "drift-log.md"));
  const en = extractSchemaSampleLines(readUtf8(EN_INTENT, "drift-log.md"));
  // enum を持つ言語非依存 4 行は ja/en で完全一致しなければならない（翻訳差は持たない）。
  const langIndependent = [
    "- stage: <discover | export | improve>",
    "- mechanism: <compass-anti-direction | compass-invariant | pattern-catalog | packet-scope-overflow | none>",
    "- outcome: <prevented | caught | missed | false-positive | not-applicable>",
    "- user-verdict: <valid | false-alarm | unjudged>",
  ];
  for (const expected of langIndependent) {
    assert.ok(ja.includes(expected), `ja drift-log に "${expected}"`);
    assert.ok(en.includes(expected), `en drift-log に "${expected}"`);
  }
});

test("D: drift-patterns の seed id 見出しが ja/en でバイト一致（Req 3.7）", () => {
  const ja = readUtf8(JA_INTENT, "drift-patterns.md");
  const en = readUtf8(EN_INTENT, "drift-patterns.md");
  for (const id of SEED_IDS) {
    const head = `## id: ${id}`;
    assert.ok(ja.includes(head), `ja に "${head}"`);
    assert.ok(en.includes(head), `en に "${head}"`);
  }
});

test("D: drift-terrain.md の規則が claude==codex でバイト一致（ja / en 各々）（Req 11.3）", () => {
  const rel = (lang, agent) =>
    path.join(
      REPO_ROOT,
      "templates",
      lang,
      agent,
      "skills",
      "intent-discover",
      "rules",
      "drift-terrain.md",
    );
  for (const lang of ["ja", "en"]) {
    const claude = fs.readFileSync(rel(lang, "claude"));
    const codex = fs.readFileSync(rel(lang, "codex"));
    assert.ok(claude.length > 0, `${lang}/claude drift-terrain が空でない`);
    assert.ok(
      claude.equals(codex),
      `${lang} の drift-terrain.md は claude/codex でバイト一致`,
    );
  }
});

// ===========================================================================
// E. off 時バイト等価の構造ロック（Req 11.2）
// ===========================================================================
//
// 「off 時バイト等価」の機械的な意味（重要）:
//   SKILL.md は Step 3.5 の追加で実際にバイトが変化している。よって SKILL.md を
//   変更前バージョンと直接バイト比較することはできない（その手段は INV-D5 / R11.2
//   を表現できない）。drift 検知には実行スクリプトが存在せず（enforcement の
//   intent-check.mjs に相当するものが drift には無い。本テスト冒頭の前提を参照）、
//   検知は skill prompt 側に宿る。したがって R11.2「off 時バイト等価」の機械検証は
//   構造的でなければならない:
//     1) すべての drift Step（discover Step 3.5 / status Step 3.5）が、その Step の
//        最初の指示として off-guard を持つ。guard は mode.md の Drift-watch セクションを
//        参照し、`on` でないとき（off / 未記載 / 不正値 / セクション不在 / mode.md 不在）は
//        「何もしない / 現行どおり続行」することを述べる。
//     2) scaffold の mode.md は drift-watch を既定 off で配布する（箱出しの動作が不変）。
//   この2点を構造的に固定すれば、「runtime prompt が drift 出力を出す前に off-guard が
//   短絡する」=「off 時は現行動作とバイト等価」を機械的に保証できる。これが prompt 検知
//   方式における R11.2 の正しい機械プロキシである（intent-check.mjs は不変＝drift 検知は
//   スクリプト経路に決して入らない。Block F で別途固定する）。

// discover Step 3.5（地形診断）を持つ 4 SKILL.md
const DISCOVER_SKILLS = [];
for (const lang of ["ja", "en"]) {
  for (const agent of ["claude", "codex"]) {
    DISCOVER_SKILLS.push([
      `${lang}/${agent}`,
      path.join(
        REPO_ROOT,
        "templates",
        lang,
        agent,
        "skills",
        "intent-discover",
        "SKILL.md",
      ),
    ]);
  }
}
// status Step 3.5（drift 併記）を持つ 4 SKILL.md
const STATUS_SKILLS = [];
for (const lang of ["ja", "en"]) {
  for (const agent of ["claude", "codex"]) {
    STATUS_SKILLS.push([
      `${lang}/${agent}`,
      path.join(
        REPO_ROOT,
        "templates",
        lang,
        agent,
        "skills",
        "intent-status",
        "SKILL.md",
      ),
    ]);
  }
}

// `### Step 3.5` 見出しから次の `### ` 直前までを Step 本体として切り出す。
function extractStep35Body(content) {
  const m = content.match(/^### Step 3\.5\b.*$/m);
  assert.ok(m, "`### Step 3.5` 見出しが存在する");
  const startIdx = content.indexOf(m[0]) + m[0].length;
  const rest = content.slice(startIdx);
  const nextIdx = rest.search(/^### /m);
  const body = nextIdx === -1 ? rest : rest.slice(0, nextIdx);
  // 本文行（`- ` 始まりの bullet）だけを抽出する。
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));
  assert.ok(lines.length > 0, "Step 3.5 本体に bullet 行がある");
  return { bodyText: body, lines };
}

// off-guard 行か（mode.md の Drift-watch を参照し `on` でないとき何もしない旨）。
// ja/en 両方の文言に寛容。`on` でない判定＋無動作の両方を要求する。
function isOffGuardLine(line) {
  const refsModeDriftWatch =
    /drift-watch/i.test(line) &&
    (/Drift-watch/.test(line) || /mode\.md/.test(line));
  const notOn = /`on`\s*でない|not\s+`on`|でないとき|When it is not `on`/i.test(
    line,
  );
  const doesNothing =
    /現行どおり|現行動作|byte-identical|current behavior|do not perform|本 Step を行わない|何もしない|continue/i.test(
      line,
    );
  return refsModeDriftWatch && notOn && doesNothing;
}

// drift アクション行か（地形診断の適用 / drift-log 集計・併記など、off では出してはならない出力）。
function isDriftActionLine(line) {
  return (
    /drift-terrain|drift-log|地形診断|併記|tally|集計|drift block|terrain/i.test(
      line,
    ) && !isOffGuardLine(line)
  );
}

for (const [label, file] of [...DISCOVER_SKILLS, ...STATUS_SKILLS]) {
  test(`E[${label}]: Step 3.5 の最初の content 行が off-guard で、いかなる drift アクション行よりも前にある（Req 11.2）`, () => {
    const content = fs.readFileSync(file, "utf8");
    const { lines } = extractStep35Body(content);

    // off-guard は Step 3.5 の最初の content 行であること。
    const guardIndex = lines.findIndex(isOffGuardLine);
    assert.notEqual(guardIndex, -1, `${label}: off-guard 行が存在する`);
    assert.equal(
      guardIndex,
      0,
      `${label}: off-guard は Step 3.5 の最初の content 行である`,
    );

    // off / 未記載 / 不正値 / セクション不在 / mode.md 不在 を網羅している。
    const guard = lines[0];
    assert.match(
      guard,
      /off/i,
      `${label}: guard が off を覆う`,
    );
    assert.match(
      guard,
      /未記載|unspecified|unstated/i,
      `${label}: guard が未記載/unspecified を覆う`,
    );
    assert.match(
      guard,
      /不正値|invalid/i,
      `${label}: guard が不正値/invalid を覆う`,
    );
    assert.match(
      guard,
      /セクション不在|missing section|section absent|the section absent/i,
      `${label}: guard がセクション不在を覆う`,
    );
    assert.match(
      guard,
      /mode\.md\s*不在|missing mode\.md|mode\.md absent/i,
      `${label}: guard が mode.md 不在を覆う`,
    );

    // guardIndex < （最初の drift アクション行の index）。
    const firstActionIndex = lines.findIndex(isDriftActionLine);
    assert.notEqual(
      firstActionIndex,
      -1,
      `${label}: Step 3.5 に drift アクション行が存在する（on 時の出力）`,
    );
    assert.ok(
      guardIndex < firstActionIndex,
      `${label}: off-guard はいかなる drift アクション行よりも前にある（guard=${guardIndex} < action=${firstActionIndex}）`,
    );
  });
}

test("E: scaffold の mode.md (ja/en) は drift-watch を既定 off で配布する（箱出し不変・Req 11.2）", () => {
  for (const intentDir of [JA_INTENT, EN_INTENT]) {
    const content = readUtf8(intentDir, "mode.md");
    assert.equal(parseDriftWatch(content), "off");
  }
});

// ===========================================================================
// F. drift 検知は skill prompt 側に宿り、スクリプトを起動しない（Req 11.4）
// ===========================================================================
//
// 注意: status の Step 3.5 本体には「Bash は既存の intent-check 起動に限る原則を
//   変えない」という *否定的な* 文言があり、`intent-check` の語が出現する。よって
//   「intent-check の語が無い」ことは正しい不変条件ではない。正しい不変条件は
//   「drift のためにスクリプトを *起動* しない」= drift Step が `node .intent/scripts/...`
//   等のスクリプト呼び出しを drift 目的で行わないことである。これにより drift 検知が
//   intent-check.mjs（不変。Block A 前提）の経路に入らず prompt 側に宿ることを固定する。
for (const [label, file] of [...DISCOVER_SKILLS, ...STATUS_SKILLS]) {
  test(`F[${label}]: Step 3.5 は drift のためにスクリプト（node .intent/scripts/...）を起動しない（Req 11.4）`, () => {
    const content = fs.readFileSync(file, "utf8");
    const { bodyText } = extractStep35Body(content);
    // drift 目的でのスクリプト起動が無い（node .intent/scripts や intent-check.mjs の起動が無い）。
    assert.ok(
      !/node\s+\.intent\/scripts\//.test(bodyText),
      `${label}: Step 3.5 に node .intent/scripts/ の起動が無い`,
    );
    assert.ok(
      !/node\s+[^\n`]*intent-check(\.mjs)?/.test(bodyText),
      `${label}: Step 3.5 に intent-check スクリプトの起動が無い`,
    );
    // drift-log を直接読む Step（status の併記）は Read / Grep で読むのみと明記する。
    // discover はその手順を rule（drift-terrain.md）へ委譲するため Read/Grep を本体に持たない
    // ことがあり、ここでは要求しない（スクリプト非起動が R11.4 の核心であるため）。
    const readsDriftLogDirectly = /drift-log\.md/i.test(bodyText);
    if (readsDriftLogDirectly) {
      assert.ok(
        /Read|Grep/.test(bodyText),
        `${label}: drift-log.md の読み取りが Read / Grep で行われる`,
      );
    }
  });
}

// ===========================================================================
// G. 新規 scaffold（drift-patterns.md / drift-log.md）とセクションが実インストールに届く（Req 11.5）
// ===========================================================================
const TEMPLATES = defaultTemplatesDir();
const G_JA_ROOT = resolveLangRoot(TEMPLATES, "ja").langRoot;
const G_EN_ROOT = resolveLangRoot(TEMPLATES, "en").langRoot;

for (const [lang, langRoot] of [
  ["ja", G_JA_ROOT],
  ["en", G_EN_ROOT],
]) {
  test(`G[${lang}]: copy plan が .intent/drift-patterns.md / drift-log.md と Drift-watch 節付き mode.md を配置する（Req 11.5）`, () => {
    const tgt = fs.mkdtempSync(path.join(os.tmpdir(), "ip-drift-install-"));
    try {
      const plan = computeCopyPlan(langRoot, tgt, {});
      const rels = plan.map((e) => e.relative);

      assert.ok(
        rels.includes(path.join(".intent", "drift-patterns.md")),
        `${lang}: plan に .intent/drift-patterns.md がある`,
      );
      assert.ok(
        rels.includes(path.join(".intent", "context-cost-cues.md")),
        `${lang}: plan に .intent/context-cost-cues.md がある（全プロジェクト配布）`,
      );
      assert.ok(
        rels.includes(path.join(".intent", "drift-log.md")),
        `${lang}: plan に .intent/drift-log.md がある`,
      );

      const modeEntry = plan.find(
        (e) => e.relative === path.join(".intent", "mode.md"),
      );
      assert.ok(modeEntry, `${lang}: plan に .intent/mode.md がある`);
      // mode.md の配布元内容に Drift-watch セクションが含まれる（節が実インストールに届く）。
      const modeContent = fs.readFileSync(modeEntry.from, "utf8");
      assert.ok(
        /##\s*Drift-watch/.test(modeContent),
        `${lang}: 配布される mode.md に Drift-watch セクションがある`,
      );
      assert.equal(
        parseDriftWatch(modeContent),
        "off",
        `${lang}: 配布される mode.md の drift-watch は既定 off`,
      );
    } finally {
      fs.rmSync(tgt, { recursive: true, force: true });
    }
  });
}

// ===========================================================================
// H. 未変更ファイルの非接触（Req 11.4）
// ===========================================================================
// 未変更ファイルへの非接触（byte-lock / frontmatter-lock / installer-lock）は
// standard-invariance.test.mjs の既存ロック（BYTE_LOCKED_FILES / FRONTMATTER_LOCKED /
// INSTALLER_LOCKED_FILES）が既に強制しており、いずれも green である。ここで重複実装しない。

// ===========================================================================
// Phase B（export 水際照合）— 関所順序・off-guard・append スキーマ・パリティ
// ===========================================================================
// 設計上の前提（Block A 冒頭と同じ）: drift 検知には実行スクリプトが無く、検知は
//   skill prompt 側に宿る。よって export 側も「配布される SKILL.md / rule の内容」を
//   読んで検証する（block E/F の手法を export Step 1.6 / rule へ拡張する）。
//   export SKILL.md の golden hash は task 7.2 で standard-invariance.test.mjs に
//   正規更新済み（claude=INSTALLER_LOCKED_FILES・codex=SKILL_BODY_LOCKED）。未変更
//   ファイルへの非接触はその既存ロックが機械証明しており（Req 11.5）、ここで再実装しない。

// export 工程の drift Step（Step 1.6・compass 水際照合）を持つ 4 SKILL.md
const EXPORT_SKILLS = [];
for (const lang of ["ja", "en"]) {
  for (const agent of ["claude", "codex"]) {
    EXPORT_SKILLS.push([
      `${lang}/${agent}`,
      path.join(
        REPO_ROOT,
        "templates",
        lang,
        agent,
        "skills",
        "intent-export-cc-sdd",
        "SKILL.md",
      ),
    ]);
  }
}
// export 工程の drift rule（drift-export-check.md）を持つ 4 ファイル
const EXPORT_RULES = [];
for (const lang of ["ja", "en"]) {
  for (const agent of ["claude", "codex"]) {
    EXPORT_RULES.push([
      `${lang}/${agent}`,
      path.join(
        REPO_ROOT,
        "templates",
        lang,
        agent,
        "skills",
        "intent-export-cc-sdd",
        "rules",
        "drift-export-check.md",
      ),
    ]);
  }
}

// `### Step 1.6` 見出しから次の `### ` 直前までを Step 本体として切り出す
// （block E の extractStep35Body の export 版。Step 番号だけ差し替えた同型）。
function extractStep16Body(content) {
  const m = content.match(/^### Step 1\.6\b.*$/m);
  assert.ok(m, "`### Step 1.6` 見出しが存在する");
  const startIdx = content.indexOf(m[0]) + m[0].length;
  const rest = content.slice(startIdx);
  const nextIdx = rest.search(/^### /m);
  const body = nextIdx === -1 ? rest : rest.slice(0, nextIdx);
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));
  assert.ok(lines.length > 0, "Step 1.6 本体に bullet 行がある");
  return { bodyText: body, lines };
}

// 文書順の `### Step 1.x` 見出しの 1.x ラベル列を返す。
function step1Labels(content) {
  const labels = [];
  for (const m of content.matchAll(/^### Step (1(?:\.\d+)?)\b/gm)) {
    labels.push(m[1]);
  }
  return labels;
}

// ---------------------------------------------------------------------------
// I. export 関所順序 Step 1.5 → 1.6 → 1.7 と 3関所の順序・直交（Req 5.1 / 9.1）
// ---------------------------------------------------------------------------
for (const [label, file] of EXPORT_SKILLS) {
  test(`I[${label}]: export 見出し順が Step 1.5 → 1.6 → 1.7（Req 9.1）`, () => {
    const content = fs.readFileSync(file, "utf8");
    const labels = step1Labels(content);
    const i15 = labels.indexOf("1.5");
    const i16 = labels.indexOf("1.6");
    const i17 = labels.indexOf("1.7");
    assert.notEqual(i15, -1, `${label}: Step 1.5 がある`);
    assert.notEqual(i16, -1, `${label}: Step 1.6 がある`);
    assert.notEqual(i17, -1, `${label}: Step 1.7 がある`);
    assert.ok(
      i15 < i16 && i16 < i17,
      `${label}: 文書順が 1.5(${i15}) < 1.6(${i16}) < 1.7(${i17})`,
    );
  });

  test(`I[${label}]: Step 1.6 は drift step（drift 照合 + drift-watch を参照）（Req 5.1）`, () => {
    const content = fs.readFileSync(file, "utf8");
    const { bodyText } = extractStep16Body(content);
    // drift step である（drift / 照合 と drift-watch の双方を含む）。
    assert.ok(
      /drift/i.test(bodyText) || /照合/.test(bodyText),
      `${label}: Step 1.6 が drift / 照合 を含む`,
    );
    assert.ok(
      /drift-watch/i.test(bodyText),
      `${label}: Step 1.6 が drift-watch を参照する`,
    );
  });

  test(`I[${label}]: Step 1.6 が 3関所の順序 enforcement→drift-watch→Open Questions と直交を明記（Req 9.1）`, () => {
    const content = fs.readFileSync(file, "utf8");
    const { lines } = extractStep16Body(content);
    // 3関所の順序を述べる bullet（3関所名が同一行に揃う行）を順序の検証アンカーにする。
    // off-guard 行にも drift-watch は現れるため、本体全体での first-occurrence では誤る。
    const orderLine = lines.find(
      (l) =>
        /enforcement/i.test(l) &&
        /drift-watch/i.test(l) &&
        /Open Questions/i.test(l),
    );
    assert.ok(
      orderLine,
      `${label}: 3関所名が同一 bullet に揃う順序行がある`,
    );
    const iEnf = orderLine.search(/enforcement/i);
    const iDw = orderLine.search(/drift-watch/i);
    const iOq = orderLine.search(/Open Questions/i);
    assert.ok(
      iEnf < iDw && iDw < iOq,
      `${label}: 順序行が enforcement(${iEnf}) → drift-watch(${iDw}) → Open Questions(${iOq}) の順`,
    );
    const bodyText = orderLine;
    // 直交（手続き / 方向 / 期限）が明記される。
    assert.ok(
      /手続き/.test(bodyText) || /procedure/i.test(bodyText),
      `${label}: 直交の「手続き / procedure」が明記`,
    );
    assert.ok(
      /方向/.test(bodyText) || /direction/i.test(bodyText),
      `${label}: 直交の「方向 / direction」が明記`,
    );
    assert.ok(
      /期限/.test(bodyText) || /deadline/i.test(bodyText),
      `${label}: 直交の「期限 / deadline」が明記`,
    );
    // 直交である旨（orthogonal / 直交）。
    assert.ok(
      /直交/.test(bodyText) || /orthogonal/i.test(bodyText),
      `${label}: 検査対象が直交である旨が明記`,
    );
  });
}

// ---------------------------------------------------------------------------
// J. export Step 1.6 の off-guard-first + 停止文言を持たない監査（Req 5.5 / 11.2）
// ---------------------------------------------------------------------------
for (const [label, file] of EXPORT_SKILLS) {
  test(`J[${label}]: Step 1.6 の最初の content 行が off-guard（off/未記載/不正値/節不在/mode.md不在 → Step 1.7 へ続行）（Req 11.2）`, () => {
    const content = fs.readFileSync(file, "utf8");
    const { lines } = extractStep16Body(content);

    // off-guard は Step 1.6 の最初の content 行（block E と同型）。
    const guard = lines[0];
    assert.ok(
      /drift-watch/i.test(guard) &&
        (/Drift-watch/.test(guard) || /mode\.md/.test(guard)),
      `${label}: 先頭行が mode.md の Drift-watch を参照する`,
    );
    assert.match(
      guard,
      /`on`\s*でない|not\s+`on`/i,
      `${label}: 先頭行が on でない判定を持つ`,
    );
    // off / 未記載 / 不正値 / セクション不在 / mode.md 不在 を網羅する。
    assert.match(guard, /off/i, `${label}: guard が off を覆う`);
    assert.match(
      guard,
      /未記載|unspecified|unstated/i,
      `${label}: guard が未記載/unspecified を覆う`,
    );
    assert.match(guard, /不正値|invalid/i, `${label}: guard が不正値/invalid を覆う`);
    assert.match(
      guard,
      /セクション不在|missing section|section absent/i,
      `${label}: guard がセクション不在を覆う`,
    );
    assert.match(
      guard,
      /mode\.md\s*不在|missing mode\.md|mode\.md absent/i,
      `${label}: guard が mode.md 不在を覆う`,
    );
    // 「本照合を行わず・Step 1.7 へ続行（現行どおり / byte-identical）」=現行動作不変。
    assert.match(
      guard,
      /行わ(ず|ない)|do not perform/i,
      `${label}: guard が「本照合を行わない / do not perform」を述べる`,
    );
    assert.match(
      guard,
      /Step 1\.7/i,
      `${label}: guard が Step 1.7 へ続行する旨を持つ`,
    );
    assert.match(
      guard,
      /現行どおり|現行動作|byte-identical|current behavior/i,
      `${label}: guard が現行動作（byte-identical）を述べる`,
    );
  });

  test(`J[${label}]: Step 1.6 本体に肯定的な drift 停止文言が無い（停止語は否定 or Step 1.5 帰属に限る）（Req 5.5）`, () => {
    const content = fs.readFileSync(file, "utf8");
    const { bodyText, lines } = extractStep16Body(content);

    // warn-only / 停止しない の明示があること。
    assert.ok(
      /export を停止しない|does not stop the export|warn のみ|warn-only/i.test(
        bodyText,
      ),
      `${label}: Step 1.6 が warn-only / 停止しない を明示する`,
    );

    // 停止語（停止 / 止め / stop / block）を含む各行は、否定（しない/never/only…enforcement）
    // または Step 1.5 への帰属のいずれかでなければならない。肯定的な「export を停止する /
    // stop export」が裸で現れたらここで落ちる（将来の affirmative-stop 編集を検知する）。
    const stopWord = /停止|止め(る|ない)|\bstop\b|\bblock\b/i;
    const negationOrAttribution =
      /しない|させない|never|do not|does not|warn[\s-]?only|only\b.*enforcement|enforcement\b.*(だけ|ゲートだけ|can stop|only)|Step 1\.5/i;
    for (const line of lines) {
      if (!stopWord.test(line)) continue;
      assert.ok(
        negationOrAttribution.test(line),
        `${label}: 停止語を含む行は否定 or Step 1.5 帰属に限る（裸の停止文言を検知）: "${line}"`,
      );
    }

    // 肯定的な「export を停止する / stop the export」が否定なしに現れていないこと。
    assert.ok(
      !/export を停止する(?!ことはしない)/.test(bodyText),
      `${label}: 「export を停止する」が裸で現れない`,
    );
    assert.ok(
      !/\bstop the export\b(?!\s*\(only)/i.test(bodyText) ||
        /does not stop the export/i.test(bodyText),
      `${label}: 「stop the export」が肯定文として裸で現れない`,
    );
  });
}

// ---------------------------------------------------------------------------
// K. export append スキーマ — rule が stage:export + compass mechanism + 9キーを文書化（Req 5.5 / 9.1）
// ---------------------------------------------------------------------------
for (const [label, file] of EXPORT_RULES) {
  test(`K[${label}]: drift-export-check rule が stage: export の append を文書化する（Req 5.5）`, () => {
    const content = fs.readFileSync(file, "utf8");
    // stage は export 固定。
    assert.match(
      content,
      /`?stage`?:\s*`?export`?/,
      `${label}: rule が stage: export を文書化する`,
    );
  });

  test(`K[${label}]: mechanism は compass 系の2値に限り pattern-catalog を取らない（Req 9.1）`, () => {
    const content = fs.readFileSync(file, "utf8");
    // export の mechanism は compass-anti-direction | compass-invariant のみ。
    assert.ok(
      /compass-anti-direction/.test(content),
      `${label}: rule が mechanism compass-anti-direction を文書化する`,
    );
    assert.ok(
      /compass-invariant/.test(content),
      `${label}: rule が mechanism compass-invariant を文書化する`,
    );
    // export は型カタログ（pattern-catalog）を mechanism にしない（discover との直交）。
    assert.ok(
      !/mechanism[^\n]*pattern-catalog/i.test(content) &&
        !/`pattern-catalog`/.test(content),
      `${label}: export の append は pattern-catalog を mechanism にしない`,
    );
  });

  // scope-2nd-defense（DR9 第二防御・packet-scope-overflow）の発火条件を rule が文書化する
  test(`K[${label}]: scope 超過照合（packet-scope-overflow）が文書化される（DR9 第二防御）`, () => {
    const content = fs.readFileSync(file, "utf8");
    // 第二防御の mechanism 新値。
    assert.ok(
      /packet-scope-overflow/.test(content),
      `${label}: rule が mechanism packet-scope-overflow を文書化する`,
    );
    // 照合根拠＝対象 packet の宣言スコープ（## Scope / ## Non-scope）。
    assert.ok(
      /##\s*Scope/.test(content) && /##\s*Non-scope/.test(content),
      `${label}: 照合根拠に packet の ## Scope / ## Non-scope を明記する`,
    );
    // read-only 規律: コード差分・実装結果を読まない（INV5/INV6・DR14）。
    assert.ok(
      /INV5\/INV6|code diff|コード差分/.test(content),
      `${label}: 照合入力は指示文面のみ・コード差分は読まない旨を明記する`,
    );
    // stage は既存3値（discover|export|improve）を増やさない（後段照合も stage:export を用いる）。
    assert.ok(
      !/stage:\s*implement(ation|ing)?\b/i.test(content),
      `${label}: 新 stage 値を増やさない（既存 discover|export|improve のまま）`,
    );
  });

  test(`K[${label}]: append が 9キーを固定順で文書化する（Req 5.5）`, () => {
    const content = fs.readFileSync(file, "utf8");
    for (const key of NINE_KEYS) {
      assert.ok(
        content.includes("`" + key + "`") || new RegExp(`\\b${key}\\b`).test(content),
        `${label}: 9キーの "${key}" が文書化される`,
      );
    }
    // 固定順（pattern → … → note）の明記がある。
    assert.ok(
      /`pattern`\s*(→|->)\s*`stage`\s*(→|->)\s*`packet`\s*(→|->)\s*`mechanism`\s*(→|->)\s*`outcome`\s*(→|->)\s*`user-verdict`\s*(→|->)\s*`recorded_at`\s*(→|->)\s*`commit`\s*(→|->)\s*`note`/.test(
        content,
      ),
      `${label}: 9キーが固定順（pattern → … → note）で明記される`,
    );
  });

  test(`K[${label}]: outcome 経路 caught/missed/false-positive と recorded_at + commit を文書化する（Req 5.5）`, () => {
    const content = fs.readFileSync(file, "utf8");
    for (const v of ["caught", "missed", "false-positive"]) {
      assert.ok(
        content.includes("`" + v + "`"),
        `${label}: outcome 経路 \`${v}\` が文書化される`,
      );
    }
    // recorded_at（ISO 8601）と commit（取得不可時 -）の append 規約。
    assert.ok(/ISO 8601/.test(content), `${label}: recorded_at が ISO 8601 と明記`);
    assert.ok(
      /git rev-parse --short HEAD/.test(content),
      `${label}: commit が git rev-parse --short HEAD と明記`,
    );
    assert.ok(
      /\*\*append-only\*\*/.test(content),
      `${label}: append-only 契約が明記される`,
    );
  });
}

test("K: drift-export-check.md が claude==codex でバイト一致（ja / en 各々）（Req 9.1）", () => {
  for (const lang of ["ja", "en"]) {
    const claude = readBytes(
      REPO_ROOT,
      "templates",
      lang,
      "claude",
      "skills",
      "intent-export-cc-sdd",
      "rules",
      "drift-export-check.md",
    );
    const codex = readBytes(
      REPO_ROOT,
      "templates",
      lang,
      "codex",
      "skills",
      "intent-export-cc-sdd",
      "rules",
      "drift-export-check.md",
    );
    assert.ok(claude.length > 0, `${lang}/claude drift-export-check が空でない`);
    assert.ok(
      claude.equals(codex),
      `${lang} の drift-export-check.md は claude/codex でバイト一致`,
    );
  }
});

// ---------------------------------------------------------------------------
// L. export off 時等価の補強 — drift のためにスクリプトを起動しない（Req 11.2 / 9.4）
// ---------------------------------------------------------------------------
// drift 検知は prompt 側に宿る（block F の export 版）。Step 1.6 は drift のために
//   スクリプト（node .intent/scripts/... / intent-check）を起動しない。これにより off 時の
//   現行動作（enforcement の intent-check 経路を含む）に drift が一切干渉しないことを固定する。
// 未変更ファイルへの非接触（Req 11.5）は standard-invariance.test.mjs の既存ロック
//   （claude=INSTALLER_LOCKED_FILES・codex=SKILL_BODY_LOCKED。export SKILL.md の golden
//   hash は task 7.2 で正規更新済み）が機械証明しており、ここで再実装しない。
for (const [label, file] of EXPORT_SKILLS) {
  test(`L[${label}]: Step 1.6 は drift のためにスクリプト（node .intent/scripts/... / intent-check）を起動しない（Req 9.4）`, () => {
    const content = fs.readFileSync(file, "utf8");
    const { bodyText } = extractStep16Body(content);
    assert.ok(
      !/node\s+\.intent\/scripts\//.test(bodyText),
      `${label}: Step 1.6 に node .intent/scripts/ の起動が無い`,
    );
    assert.ok(
      !/node\s+[^\n`]*intent-check(\.mjs)?/.test(bodyText),
      `${label}: Step 1.6 に intent-check スクリプトの起動が無い`,
    );
  });
}

// ===========================================================================
// Phase C（improve 事後記録・集計）— append スキーマ・pattern×outcome レポート・
//   誠実さ注記・off-guard が drift bullet のみを覆う（5分類は無条件）
// ===========================================================================
// 設計上の前提（Block A 冒頭と同じ）: drift 検知には実行スクリプトが無く、検知は
//   skill prompt 側に宿る。よって improve 側も「配布される SKILL.md / rule の内容」を
//   読んで検証する（block E/F/K/L の手法を improve Step 3 / rule へ拡張する）。
//   重要: intent-improve SKILL.md / rules/improve-axes.md は standard-invariance.test.mjs
//   のどの lock 表（BYTE_LOCKED_FILES / FRONTMATTER_LOCKED / SKILL_BODY_LOCKED /
//   INSTALLER_LOCKED_FILES）にも入っていない（design の選択。export と異なり improve は
//   unlocked）。したがって「変更スキルの golden hash を正規更新」は Phase C では no-op で
//   あり、ここで improve を lock 表へ追加しない（それは scope creep であり design に反する）。
//   `grep -nE "intent-improve|improve-axes" standard-invariance.test.mjs` は no-match。

// improve 工程の drift Step（Step 3・分類して報告する）を持つ 4 SKILL.md
const IMPROVE_SKILLS = [];
for (const lang of ["ja", "en"]) {
  for (const agent of ["claude", "codex"]) {
    IMPROVE_SKILLS.push([
      `${lang}/${agent}`,
      path.join(
        REPO_ROOT,
        "templates",
        lang,
        agent,
        "skills",
        "intent-improve",
        "SKILL.md",
      ),
    ]);
  }
}
// improve 工程の drift rule（improve-axes.md）を持つ 4 ファイル
const IMPROVE_RULES = [];
for (const lang of ["ja", "en"]) {
  for (const agent of ["claude", "codex"]) {
    IMPROVE_RULES.push([
      `${lang}/${agent}`,
      path.join(
        REPO_ROOT,
        "templates",
        lang,
        agent,
        "skills",
        "intent-improve",
        "rules",
        "improve-axes.md",
      ),
    ]);
  }
}

// `### Step 3:` 見出しから次の `### ` 直前までを Step 本体として切り出す
// （block E の extractStep35Body の improve 版。Step 番号だけ差し替えた同型）。
// Step 3 の本体は段落型の長い bullet が並ぶ（5分類 bullet / writeback 誘導 bullet /
// gated drift bullet の 3 本）。`- ` 始まりの行だけを content 行として返す。
function extractStep3Body(content) {
  const m = content.match(/^### Step 3:.*$/m);
  assert.ok(m, "`### Step 3:` 見出しが存在する");
  const startIdx = content.indexOf(m[0]) + m[0].length;
  const rest = content.slice(startIdx);
  const nextIdx = rest.search(/^### /m);
  const body = nextIdx === -1 ? rest : rest.slice(0, nextIdx);
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));
  assert.ok(lines.length > 0, "Step 3 本体に bullet 行がある");
  return { bodyText: body, lines };
}

// improve の drift bullet（drift-log への記録 / drift-watch on を述べる gated bullet）か。
function isImproveDriftBullet(line) {
  return (
    /drift-watch/i.test(line) &&
    (/drift-log/i.test(line) || /記録/.test(line) || /record/i.test(line))
  );
}

// improve の off-guard 句か（mode.md の Drift-watch を参照し `on` でないとき何もしない）。
// block E の isOffGuardLine と同型だが、improve の Step 3 では off-guard が drift bullet
// 内にインライン埋め込みのため、行頭一致ではなく句の有無で判定する。
function hasImproveOffGuard(line) {
  const refsModeDriftWatch =
    /drift-watch/i.test(line) &&
    (/Drift-watch/.test(line) || /mode\.md/.test(line));
  // not-on の判定: 明示の「on でない」系、または「on のときのみ + off などは何もしない」系。
  const notOn =
    /`on`\s*でない|not\s+`on`|でないとき|When it is not `on`|on でない|on`?\s*のときのみ|only when it is `on`/i.test(
      line,
    );
  const doesNothing =
    /現行どおり|現行動作|byte-equivalent|byte-identical|current behavior|何もしない|do nothing|proceed as before/i.test(
      line,
    );
  return refsModeDriftWatch && notOn && doesNothing;
}

// ---------------------------------------------------------------------------
// M. improve append スキーマ — rule が stage:improve + compass mechanism + 9キーを文書化（Req 6.6）
// ---------------------------------------------------------------------------
for (const [label, file] of IMPROVE_RULES) {
  test(`M[${label}]: improve-axes が stage: improve の drift-log append を文書化する（Req 6.6）`, () => {
    const content = fs.readFileSync(file, "utf8");
    // stage は improve 固定。
    assert.match(
      content,
      /`?stage`?:\s*`?improve`?/,
      `${label}: rule が stage: improve を文書化する`,
    );
    // outcome は missed が下書き既定（draft / 下書き）。
    assert.match(
      content,
      /`?outcome`?:\s*`?missed`?/,
      `${label}: rule が outcome: missed を文書化する`,
    );
    assert.ok(
      /下書き|draft/i.test(content),
      `${label}: outcome: missed が下書き（draft）として明記される`,
    );
  });

  test(`M[${label}]: mechanism は compass 系の2値に限り pattern-catalog を取らない（Req 6.6）`, () => {
    const content = fs.readFileSync(file, "utf8");
    // improve の mechanism は compass-invariant | compass-anti-direction のみ。
    assert.ok(
      /compass-invariant/.test(content),
      `${label}: rule が mechanism compass-invariant を文書化する`,
    );
    assert.ok(
      /compass-anti-direction/.test(content),
      `${label}: rule が mechanism compass-anti-direction を文書化する`,
    );
    // improve は型カタログ（pattern-catalog）を mechanism にしない（discover との直交）。
    assert.ok(
      !/mechanism[^\n]*pattern-catalog/i.test(content) &&
        !/`pattern-catalog`/.test(content),
      `${label}: improve の append は pattern-catalog を mechanism にしない`,
    );
  });

  test(`M[${label}]: append が 9キーを固定順で文書化し user-verdict 3値・recorded_at+commit・append-only を持つ（Req 6.6）`, () => {
    const content = fs.readFileSync(file, "utf8");
    for (const key of NINE_KEYS) {
      assert.ok(
        content.includes("`" + key + "`") || new RegExp(`\\b${key}\\b`).test(content),
        `${label}: 9キーの "${key}" が文書化される`,
      );
    }
    // 固定順（pattern → … → note）の明記がある。
    assert.ok(
      /`pattern`\s*(→|->)\s*`stage`\s*(→|->)\s*`packet`\s*(→|->)\s*`mechanism`\s*(→|->)\s*`outcome`\s*(→|->)\s*`user-verdict`\s*(→|->)\s*`recorded_at`\s*(→|->)\s*`commit`\s*(→|->)\s*`note`/.test(
        content,
      ),
      `${label}: 9キーが固定順（pattern → … → note）で明記される`,
    );
    // user-verdict の 3 値（valid | false-alarm | unjudged）が現れる。
    for (const v of ["valid", "false-alarm", "unjudged"]) {
      assert.ok(
        content.includes(v),
        `${label}: user-verdict 値 "${v}" が文書化される`,
      );
    }
    // recorded_at（ISO 8601）と commit（取得不可時 -）の append 規約。
    assert.ok(/ISO 8601/.test(content), `${label}: recorded_at が ISO 8601 と明記`);
    assert.ok(
      /git rev-parse --short HEAD/.test(content),
      `${label}: commit が git rev-parse --short HEAD と明記`,
    );
    assert.match(
      content,
      /\|\s*->/,
      `${label}: commit が | -> のフォールバックを持つ`,
    );
    assert.ok(
      /\*\*append-only\*\*/.test(content),
      `${label}: append-only 契約が明記される`,
    );
  });
}

test("M: improve-axes.md が claude==codex でバイト一致（ja / en 各々）（Req 6.6）", () => {
  for (const lang of ["ja", "en"]) {
    const claude = readBytes(
      REPO_ROOT,
      "templates",
      lang,
      "claude",
      "skills",
      "intent-improve",
      "rules",
      "improve-axes.md",
    );
    const codex = readBytes(
      REPO_ROOT,
      "templates",
      lang,
      "codex",
      "skills",
      "intent-improve",
      "rules",
      "improve-axes.md",
    );
    assert.ok(claude.length > 0, `${lang}/claude improve-axes が空でない`);
    assert.ok(
      claude.equals(codex),
      `${lang} の improve-axes.md は claude/codex でバイト一致`,
    );
  }
});

// ---------------------------------------------------------------------------
// N. pattern×outcome 改善度レポート + 誠実さ注記 + 群間比較は型 id + commit のみ（Req 11.5）
// ---------------------------------------------------------------------------
for (const [label, file] of IMPROVE_RULES) {
  test(`N[${label}]: improve-axes が pattern × outcome クロス集計レポートを文書化する（Req 11.5）`, () => {
    const content = fs.readFileSync(file, "utf8");
    assert.ok(
      /pattern\s*[×x]\s*outcome/i.test(content),
      `${label}: pattern × outcome クロス集計が文書化される`,
    );
    assert.ok(
      /クロス集計|cross-tabulat/i.test(content),
      `${label}: クロス集計（cross-tabulation）が明記される`,
    );
    // 集計キーは型（pattern）に揃える。
    assert.ok(
      /集計キー[^\n]*型|aggregation keys[^\n]*type/i.test(content),
      `${label}: 集計キーが型（pattern）に揃えられる旨が明記`,
    );
  });

  test(`N[${label}]: 誠実さ注記（missed=0 → 記録漏れ / false-positive 多発 → anti-direction 過広）を含む（Req 11.5）`, () => {
    const content = fs.readFileSync(file, "utf8");
    // missed=0 → 記録漏れの疑い。
    assert.ok(
      /missed=0/.test(content),
      `${label}: 注記が "missed=0" に言及する`,
    );
    assert.ok(
      /記録漏れ|missing records|under-recording|suspect/i.test(content),
      `${label}: missed=0 を記録漏れの疑いと読む注記がある`,
    );
    // false-positive 多発 → anti-direction が広すぎる疑い。
    assert.ok(
      /false-positive/.test(content),
      `${label}: 注記が "false-positive" に言及する`,
    );
    assert.ok(
      /anti-direction[^\n]*(広すぎ|too broad)/i.test(content),
      `${label}: false-positive 多発を anti-direction が広すぎる疑いと読む注記がある`,
    );
  });

  test(`N[${label}]: 群間比較は型 id と commit 列のみで成立し追加機構を作らない（Req 11.5）`, () => {
    const content = fs.readFileSync(file, "utf8");
    // 型 id と drift-log の commit 列のみ（追加の比較機構を作らない）。
    assert.ok(
      /型 id[^\n]*commit|type id[^\n]*commit/i.test(content),
      `${label}: 群間比較が型 id + commit 列のみで成立する旨が明記`,
    );
    assert.ok(
      /追加の比較機構[^\n]*(作らない|しない)|do not create an additional comparison mechanism/i.test(
        content,
      ),
      `${label}: 追加の比較機構を作らない旨が明記`,
    );
  });
}

test("N: improve SKILL.md の Output Description が drift-watch=on で 改善度レポート 行を持つ（全 4）（Req 11.5）", () => {
  for (const [label, file] of IMPROVE_SKILLS) {
    const content = fs.readFileSync(file, "utf8");
    // Output Description セクションを切り出す。
    const m = content.match(/^## Output Description.*$/m);
    assert.ok(m, `${label}: Output Description セクションがある`);
    const startIdx = content.indexOf(m[0]) + m[0].length;
    const rest = content.slice(startIdx);
    const nextIdx = rest.search(/^## /m);
    const section = nextIdx === -1 ? rest : rest.slice(0, nextIdx);
    // 改善度レポート行が drift-watch=on にゲートされて存在する。
    assert.ok(
      /改善度レポート|Improvement report/i.test(section),
      `${label}: Output に 改善度レポート 行がある`,
    );
    assert.ok(
      /drift-watch\s*=?\s*on|drift-watch が on|drift-watch is on/i.test(section),
      `${label}: 改善度レポートが drift-watch=on にゲートされる`,
    );
    // pattern × outcome クロス集計であることが Output 行に現れる。
    assert.ok(
      /pattern\s*[×x]\s*outcome/i.test(section),
      `${label}: Output の改善度レポートが pattern × outcome である`,
    );
  }
});

// ---------------------------------------------------------------------------
// O. improve off 時等価 — off-guard は drift bullet のみを覆い 5分類は無条件（Req 11.2）
// ---------------------------------------------------------------------------
// これが Phase C の off 等価ロックの核心。Step 3 の本体は段落型 bullet が 3 本:
//   (1) 5分類 bullet（無条件） (2) writeback 誘導 bullet（無条件）
//   (3) gated drift bullet（off-guard を内包）。
// off-guard 句が drift bullet にのみ閉じ込められ、5分類 bullet には off-guard が
// 付かないことを固定する。これにより drift-watch=off のとき 5分類報告は依然として
// 走る（従来動作とバイト等価）＝ drift bullet だけが短絡することを証明する。
// mutation-probe: Step 3 全体を off-guard で包む / 5分類 bullet を gated drift bullet
// の内側へ移すと、この block は落ちる。
for (const [label, file] of IMPROVE_SKILLS) {
  test(`O[${label}]: Step 3 の drift bullet が off-guard を内包し off/未記載/不正値/節不在/mode.md不在を覆う（Req 11.2）`, () => {
    const content = fs.readFileSync(file, "utf8");
    const { lines } = extractStep3Body(content);

    // drift bullet（drift-watch on を述べ drift-log へ記録する gated bullet）を特定する。
    const driftBullets = lines.filter(isImproveDriftBullet);
    assert.equal(
      driftBullets.length,
      1,
      `${label}: Step 3 に gated drift bullet が 1 本だけある`,
    );
    const driftBullet = driftBullets[0];

    // drift bullet が off-guard 句（mode.md の Drift-watch を参照し on でないとき何もしない）を内包する。
    assert.ok(
      hasImproveOffGuard(driftBullet),
      `${label}: drift bullet が off-guard 句を内包する`,
    );
    // off / 未記載 / 不正値 / 節不在 / mode.md 不在 を網羅する。
    assert.match(driftBullet, /off/i, `${label}: guard が off を覆う`);
    assert.match(
      driftBullet,
      /未記載|missing\b|unspecified|unstated/i,
      `${label}: guard が未記載/missing を覆う`,
    );
    assert.match(
      driftBullet,
      /不正値|invalid/i,
      `${label}: guard が不正値/invalid を覆う`,
    );
    assert.match(
      driftBullet,
      /節不在|missing section|section absent/i,
      `${label}: guard が節不在/missing section を覆う`,
    );
    assert.match(
      driftBullet,
      /mode\.md\s*不在|missing mode\.md|mode\.md absent/i,
      `${label}: guard が mode.md 不在を覆う`,
    );
    // 「現行どおり / byte-equivalent」=現行動作不変。
    assert.match(
      driftBullet,
      /現行どおり|現行動作|byte-equivalent|byte-identical|current behavior/i,
      `${label}: guard が現行動作（byte-equivalent）を述べる`,
    );
  });

  test(`O[${label}]: 5分類報告 bullet が off-guard なしで Step 3 に無条件で存在する（off でも 5分類は走る）（Req 11.2）`, () => {
    const content = fs.readFileSync(file, "utf8");
    const { lines } = extractStep3Body(content);

    // 5分類（aligned / invariant 違反 など分類語）を述べる bullet を特定する。
    // drift bullet（gated）以外で 5分類を述べる行であること。
    const classifyBullet = lines.find(
      (l) =>
        !isImproveDriftBullet(l) &&
        (/5分類|5 classifications/i.test(l) ||
          (/分類|classif/i.test(l) &&
            (/aligned/i.test(l) || /invariant/i.test(l)))),
    );
    assert.ok(
      classifyBullet,
      `${label}: Step 3 に 5分類報告 bullet がある（gated drift bullet ではない）`,
    );
    // CRITICAL: 5分類 bullet は off-guard を持たない（無条件）。
    assert.ok(
      !hasImproveOffGuard(classifyBullet),
      `${label}: 5分類報告 bullet は off-guard を持たない（drift-watch の値によらず常に走る）`,
    );
    // mutation-probe の意味づけ: もし誰かが Step 3 全体を off-guard で包んだら、
    // 5分類 bullet に off-guard 句が乗り、ここで落ちる。
    assert.ok(
      !/drift-watch/i.test(classifyBullet) ||
        !/`on`\s*でない|not\s+`on`/i.test(classifyBullet),
      `${label}: 5分類 bullet が drift-watch off 判定に巻き込まれていない`,
    );
  });

  test(`O[${label}]: drift bullet は drift のためにスクリプト（node .intent/scripts/... / intent-check）を起動しない（Req 11.2）`, () => {
    const content = fs.readFileSync(file, "utf8");
    const { bodyText } = extractStep3Body(content);
    assert.ok(
      !/node\s+\.intent\/scripts\//.test(bodyText),
      `${label}: Step 3 に node .intent/scripts/ の起動が無い`,
    );
    assert.ok(
      !/node\s+[^\n`]*intent-check(\.mjs)?/.test(bodyText),
      `${label}: Step 3 に intent-check スクリプトの起動が無い`,
    );
  });
}

// ---------------------------------------------------------------------------
// CC. context-cost-cues カタログ（コンテキストコストの気づき）
//   spec: intent-planner-context-cost-cues（seam）
//   - 型カタログは drift-patterns と同型だが別カタログ（症状=コンテキストを食う場面）
//   - 既存 drift-watch gate を相乗り・どのログにも結びつかない（INV22）
//   - 気づきまでで矯正・否定しない（INV21）
// ---------------------------------------------------------------------------

const CC_SEED_IDS = [
  "full-compass-load",
  "whole-tree-read",
  "steering-bloat",
  "redundant-reread",
];

for (const [lang, intentDir] of [
  ["ja", JA_INTENT],
  ["en", EN_INTENT],
]) {
  test(`CC[${lang}]: seed 4 件の id（kebab-case）が存在する（Req 1.1, 1.3, 5.1）`, () => {
    const content = readUtf8(intentDir, "context-cost-cues.md");
    for (const id of CC_SEED_IDS) {
      assert.ok(
        content.includes(`## id: ${id}`),
        `seed id "## id: ${id}" がある`,
      );
      assert.match(id, /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, `${id} は kebab-case`);
    }
  });

  test(`CC[${lang}]: 各 seed 型に name / symptom / 代替ブロックがある（Req 1.2）`, () => {
    const content = readUtf8(intentDir, "context-cost-cues.md");
    for (const id of CC_SEED_IDS) {
      const head = `## id: ${id}`;
      const startIdx = content.indexOf(head);
      assert.notEqual(startIdx, -1, `${head} がある`);
      const rest = content.slice(startIdx + head.length);
      const nextIdx = rest.indexOf("\n## ");
      const block = nextIdx === -1 ? rest : rest.slice(0, nextIdx);
      assert.match(block, /-\s*name:/, `${id} に name フィールド`);
      assert.match(block, /-\s*symptom:/, `${id} に symptom フィールド`);
      // 任意の軽い代替ブロック（drift-patterns の「先に書かせるもの」に対応）
      assert.match(
        block,
        /もし意図せず効いていれば|If this is unintentional/,
        `${id} に代替ブロック（もし意図せず効いていれば / If this is unintentional）`,
      );
    }
  });

  test(`CC[${lang}]: カタログ冒頭が「網羅ではない / 利用者が育てる」と明記（Req 1.4）`, () => {
    const content = readUtf8(intentDir, "context-cost-cues.md");
    assert.ok(
      /これは網羅ではありません|This is not exhaustive/.test(content),
      "非網羅（user-grown）であることが明記されている",
    );
  });

  // stance 肯定オラクル（Req 2.1, 2.2, 2.3）: ヘッダに 3 点の stance が存在する
  test(`CC[${lang}]: stance（否定/矯正しない・高コスト選択を断じない・記録しない）がヘッダにある（Req 2.1, 2.2, 2.3）`, () => {
    const content = readUtf8(intentDir, "context-cost-cues.md");
    // 否定・矯正をしない
    assert.ok(
      /否定・矯正はしません|do not deny or correct you/i.test(content),
      "否定・矯正をしない旨が明記されている",
    );
    // 正当な高コスト選択を断じない（大量スキル/全文投入はありうる）
    assert.ok(
      /正当な選択でありえます|legitimate choice/i.test(content),
      "高コスト選択が正当でありうる旨が明記されている",
    );
    // どのログにも記録しない
    assert.ok(
      /どのログにも記録しません|Nothing is recorded to any log/i.test(content),
      "ログに記録しない旨が明記されている",
    );
  });

  // stance 否定オラクル（Req 2.4・discriminative）: seed 本文に矯正・断定の禁止語が出現しない。
  //   検査対象は seed ブロック（## id: 以降）に限る。ヘッダの stance 説明は「『直せ』とは言いません」の
  //   ように禁止語を否定文脈で引用してよい（矯正ではないため）。守りたいのは seed の症状・代替が命令口調に
  //   なること（Anti-direction 54）であり、それを seed ブロック限定の検査で落とす。
  test(`CC[${lang}]: seed 本文に矯正・断定の禁止語が出現しない（Req 2.4・discriminative）`, () => {
    const content = readUtf8(intentDir, "context-cost-cues.md");
    // 最初の実 seed（CC_SEED_IDS[0]）以降を seed 領域とみなす。スキーマ説明セクションの
    // コードフェンス例（## id: <kebab-case ...>）や「書き方」説明文（禁止語の否定的引用を含む）を
    // 検査対象から外し、実際の seed の症状・代替だけを矯正口調検査にかける。
    const firstSeedIdx = content.indexOf(`## id: ${CC_SEED_IDS[0]}`);
    assert.notEqual(firstSeedIdx, -1, "実 seed ブロックが存在する");
    const seedBody = content.slice(firstSeedIdx);
    // 代表的な命令/断定語。気づき口調（〜かもしれない / もし意図せず効いていれば）を阻害しない範囲に留める。
    const forbiddenJa = ["直せ", "やめろ", "無駄", "べきでない", "禁止"];
    const forbiddenEn = [
      /\bmust\b/i,
      /\bshould not\b/i,
      /\bdon't\b/i,
      /\bwasteful\b/i,
      /\bforbidden\b/i,
    ];
    if (lang === "ja") {
      for (const word of forbiddenJa) {
        assert.ok(
          !seedBody.includes(word),
          `seed 本文に矯正・断定語 "${word}" が出現しない（気づき口調を保つ）`,
        );
      }
    } else {
      for (const re of forbiddenEn) {
        assert.ok(
          !re.test(seedBody),
          `seed 本文に矯正・断定語 ${re} が出現しない（気づき口調を保つ）`,
        );
      }
    }
  });

  // ログ非結合の静的検査（Req 4.3）: カタログ本文にログ列キーが出現しない
  test(`CC[${lang}]: カタログがログ列キー（drift-log 等）を持たない（Req 4.3・INV22）`, () => {
    const content = readUtf8(intentDir, "context-cost-cues.md");
    // drift-log のスキーマ列キーが行頭スキーマとして現れないこと（ログへの結びつけを静的に排除）。
    assert.ok(!/^\s*-\s*pattern:/m.test(content), "行頭 pattern: が無い");
    assert.ok(!/^\s*-\s*mechanism:/m.test(content), "行頭 mechanism: が無い");
    assert.ok(!/^\s*-\s*outcome:/m.test(content), "行頭 outcome: が無い");
    assert.ok(!/drift-log/.test(content), "drift-log への参照が無い");
  });
}

// 言語非依存（ja/en バイト一致）: seed id 見出しは両言語で同一
test("CC: context-cost-cues の seed id 見出しが ja/en でバイト一致（Req 5.1）", () => {
  const ja = readUtf8(JA_INTENT, "context-cost-cues.md");
  const en = readUtf8(EN_INTENT, "context-cost-cues.md");
  for (const id of CC_SEED_IDS) {
    const head = `## id: ${id}`;
    assert.ok(ja.includes(head), `ja に "${head}"`);
    assert.ok(en.includes(head), `en に "${head}"`);
  }
});

// ---------------------------------------------------------------------------
// CC-terrain. discover 地形診断 rule（drift-terrain.md）への気づき照合節
//   spec: intent-planner-context-cost-cues-add（add）
//   - drift-terrain.md 末尾に「コンテキストコストの気づき」自己 gate 節を追記。
//   - 既存 drift-patterns 照合は drift-log へ append するが、context-cost-cues 照合は
//     どのログにも append しない（INV22）。検査は新節スライス（見出し→EOF）に限定して
//     既存 append 節の誤検知を避ける（design レビュー Issue 2）。
//   - R1 の照合挙動の実行時実証は wire（SKILL 結線後）の責務。add は構造検査まで
//     （design レビュー Issue 1・射程の正直な限定）。
// ---------------------------------------------------------------------------

// drift-terrain.md（lang/agent）の絶対パス。
function terrainPath(lang, agent) {
  return path.join(
    REPO_ROOT,
    "templates",
    lang,
    agent,
    "skills",
    "intent-discover",
    "rules",
    "drift-terrain.md",
  );
}

// 新節（コンテキストコストの気づき）の見出しから EOF までをスライスする。
// 新節は rule 末尾に追記される設計のため、見出し→EOF で既存 drift-patterns
// append 節を確実に除外できる（範囲限定で誤検知を防ぐ）。
function ccTerrainSlice(lang) {
  const content = fs.readFileSync(terrainPath(lang, "claude"), "utf8");
  const heading =
    lang === "ja"
      ? "## コンテキストコストの気づき"
      : "## Context cost cues";
  const idx = content.indexOf(heading);
  return { content, heading, idx, slice: idx === -1 ? "" : content.slice(idx) };
}

for (const lang of ["ja", "en"]) {
  test(`CC-terrain[${lang}]: drift-terrain.md 末尾に気づき照合節が在り、既存 drift-patterns 照合も保持（Req 1.1, 4.2）`, () => {
    const { content, idx } = ccTerrainSlice(lang);
    assert.notEqual(idx, -1, "気づき照合節の見出しが在る");
    // 既存 drift-patterns 照合（drift-patterns.md を読む手順）が保持されている＝置換していない。
    assert.ok(
      /drift-patterns\.md/.test(content),
      "既存 drift-patterns 照合節が保持されている（併記）",
    );
  });

  test(`CC-terrain[${lang}]: 気づき照合節はどのログにも append しない（新節スライス・Req 3.1, 3.2, 3.4, 5.3）`, () => {
    const { slice } = ccTerrainSlice(lang);
    assert.ok(slice.length > 0, "新節スライスが取得できる");
    // 新節スライスに drift-log の append 手順への参照・ログ列キーが出現しない。
    // 既存 drift-patterns append 節は新節より前にあるためスライス外（誤検知しない）。
    assert.ok(!/drift-log/.test(slice) || /append しない|not.*append|not be appended|not appended to/i.test(slice), "drift-log 参照は否定文脈のみ");
    assert.ok(!/^\s*-\s*pattern:/m.test(slice), "新節スライスに行頭 pattern: が無い");
    assert.ok(!/^\s*-\s*mechanism:/m.test(slice), "新節スライスに行頭 mechanism: が無い");
    assert.ok(!/^\s*-\s*outcome:/m.test(slice), "新節スライスに行頭 outcome: が無い");
  });

  test(`CC-terrain[${lang}]: 気づき照合節に照合手順が記述されている（構造検査・Req 1.1, 1.2, 1.3, 1.4）`, () => {
    const { slice } = ccTerrainSlice(lang);
    // context-cost-cues を読む手順がある。
    assert.ok(/context-cost-cues\.md/.test(slice), "カタログを読む手順がある");
    // 自己 gate（drift-watch: on のときだけ）がある。
    assert.ok(/drift-watch: on|drift-watch.*on/i.test(slice), "自己 gate（on のときだけ）がある");
    // 不在スキップがある。
    assert.ok(/不在|absent/i.test(slice), "カタログ不在時のスキップがある");
  });

  test(`CC-terrain[${lang}]: 気づき照合節に矯正・断定の禁止語が出現しない（新節スライス・discriminative・Req 2.1, 2.2, 2.3）`, () => {
    const { slice } = ccTerrainSlice(lang);
    // 新節は禁止語を引用しない文面にしているため、引用例外を作らず素の禁止語検査をかけられる。
    // 矯正口調の seed/指示文を書く誤実装を落とす（seam の否定オラクルと同水準）。
    const forbidden =
      lang === "ja"
        ? ["直せ", "やめろ", "無駄", "べきでない", "禁止する"]
        : [/\bfix it\b/i, /\bstop it\b/i, /\bwasteful\b/i, /\byou must\b/i, /\bshould not\b/i];
    if (lang === "ja") {
      for (const w of forbidden) {
        assert.ok(!slice.includes(w), `新節スライスに矯正語 "${w}" が無い`);
      }
    } else {
      for (const re of forbidden) {
        assert.ok(!re.test(slice), `新節スライスに矯正語 ${re} が無い`);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// CC-wire. improve 改善ループへの結線 + SKILL 結線（wire スライス）
//   spec: intent-planner-context-cost-cues-wire
//   - improve-axes.md（4系統）coherence 軸末尾に自己 gate 照合節（add の drift-terrain.md と同型）。
//   - 既存 coherence 逸脱は drift-log へ append し pattern×outcome 集計するが、context-cost-cues は
//     どのログにも append せず集計にも含めない（INV22）。検査は新節スライス（見出し→EOF）に限定。
//   - discover/improve SKILL を結線（既存 on-bullet に追記・off-guard 順序を壊さない）。
// ---------------------------------------------------------------------------

// improve-axes.md（lang/agent）の絶対パス。
function improveAxesPath(lang, agent) {
  return path.join(
    REPO_ROOT,
    "templates",
    lang,
    agent,
    "skills",
    "intent-improve",
    "rules",
    "improve-axes.md",
  );
}

// improve-axes.md の新節（コンテキストコストの気づき）の見出しから EOF までをスライスする。
function ccImproveSlice(lang) {
  const content = fs.readFileSync(improveAxesPath(lang, "claude"), "utf8");
  const heading =
    lang === "ja" ? "## コンテキストコストの気づき" : "## Context cost cues";
  const idx = content.indexOf(heading);
  return { content, idx, slice: idx === -1 ? "" : content.slice(idx) };
}

for (const lang of ["ja", "en"]) {
  test(`CC-wire[${lang}]: improve-axes.md 末尾に気づき照合節が在り、既存5分類/集計節も保持（Req 1.1, 4.2）`, () => {
    const { content, idx } = ccImproveSlice(lang);
    assert.notEqual(idx, -1, "improve 気づき照合節の見出しが在る");
    assert.ok(
      /drift-log|pattern × outcome|pattern×outcome/i.test(content),
      "既存の drift-log 記録／集計節が保持されている（併記）",
    );
  });

  test(`CC-wire[${lang}]: improve 気づき照合節はどのログにも append しない（新節スライス・Req 3.1, 3.4, 6.3）`, () => {
    const { slice } = ccImproveSlice(lang);
    assert.ok(slice.length > 0, "improve 新節スライスが取得できる");
    assert.ok(!/^\s*-\s*pattern:/m.test(slice), "新節スライスに行頭 pattern: が無い");
    assert.ok(!/^\s*-\s*mechanism:/m.test(slice), "新節スライスに行頭 mechanism: が無い");
    assert.ok(!/^\s*-\s*outcome:/m.test(slice), "新節スライスに行頭 outcome: が無い");
  });

  test(`CC-wire[${lang}]: improve 気づきは pattern×outcome 集計に含めないと明示（Req 3.3）`, () => {
    const { slice } = ccImproveSlice(lang);
    assert.ok(
      /集計にも含めず|集計にも含めない|not include it in the pattern|not included in the pattern/i.test(slice),
      "pattern×outcome 集計に含めない旨が明示されている",
    );
  });

  test(`CC-wire[${lang}]: improve 気づき照合節に矯正・断定の禁止語が出現しない（新節スライス・Req 2.x）`, () => {
    const { slice } = ccImproveSlice(lang);
    const forbidden =
      lang === "ja"
        ? ["直せ", "やめろ", "無駄", "べきでない", "禁止する"]
        : [/\bfix it\b/i, /\bstop it\b/i, /\bwasteful\b/i, /\byou must\b/i, /\bshould not\b/i];
    if (lang === "ja") {
      for (const w of forbidden) {
        assert.ok(!slice.includes(w), `improve 新節スライスに矯正語 "${w}" が無い`);
      }
    } else {
      for (const re of forbidden) {
        assert.ok(!re.test(slice), `improve 新節スライスに矯正語 ${re} が無い`);
      }
    }
  });
}

// improve-axes.md の4系統 claude↔codex byte 等価（Req 6.1）。
test("CC-wire: improve-axes.md が claude==codex でバイト一致（ja / en 各々）（Req 6.1）", () => {
  for (const lang of ["ja", "en"]) {
    const claude = fs.readFileSync(improveAxesPath(lang, "claude"));
    const codex = fs.readFileSync(improveAxesPath(lang, "codex"));
    assert.ok(
      claude.equals(codex),
      `${lang} の improve-axes.md は claude/codex でバイト一致`,
    );
  }
});

// SKILL 結線存在検査（Req 2.1, 2.2, 2.4）。improve SKILL は hash lock 対象外・parity 自動ガードが
// 無いため、結線言及の存在を4系統で明示検査する（packet Decisions の targeted assertion）。
for (const lang of ["ja", "en"]) {
  for (const agent of ["claude", "codex"]) {
    test(`CC-wire[${lang}/${agent}]: discover SKILL が context-cost-cues 照合に言及（Req 2.1, 2.4）`, () => {
      const p = path.join(REPO_ROOT, "templates", lang, agent, "skills", "intent-discover", "SKILL.md");
      assert.ok(/context-cost-cues/.test(fs.readFileSync(p, "utf8")), "discover SKILL に言及がある");
    });
    test(`CC-wire[${lang}/${agent}]: improve SKILL が context-cost-cues 照合に言及（Req 2.2, 2.4）`, () => {
      const p = path.join(REPO_ROOT, "templates", lang, agent, "skills", "intent-improve", "SKILL.md");
      assert.ok(/context-cost-cues/.test(fs.readFileSync(p, "utf8")), "improve SKILL に言及がある");
    });
  }
}
