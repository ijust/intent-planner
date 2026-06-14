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
import path from "node:path";
import { fileURLToPath } from "node:url";

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
