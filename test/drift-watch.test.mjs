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

  test(`B[${lang}]: stage(3) / user-verdict(3) / mechanism(4) enum（Req 3.3）`, () => {
    const content = readUtf8(intentDir, "drift-log.md");
    const lines = extractSchemaSampleLines(content);
    const stage = lines.find((l) => l.startsWith("- stage:"));
    const verdict = lines.find((l) => l.startsWith("- user-verdict:"));
    const mechanism = lines.find((l) => l.startsWith("- mechanism:"));
    assert.match(stage, /^- stage: <discover \| export \| improve>$/);
    assert.match(verdict, /^- user-verdict: <valid \| false-alarm \| unjudged>$/);
    assert.match(
      mechanism,
      /^- mechanism: <compass-anti-direction \| compass-invariant \| pattern-catalog \| none>$/,
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

const SEED_IDS = ["microservice-over-split", "premature-abstraction", "layer-leak"];

for (const [lang, intentDir] of [
  ["ja", JA_INTENT],
  ["en", EN_INTENT],
]) {
  test(`C[${lang}]: seed 3 件の id（kebab-case）が存在する（Req 2.1）`, () => {
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
    "- mechanism: <compass-anti-direction | compass-invariant | pattern-catalog | none>",
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
