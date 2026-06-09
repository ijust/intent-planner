// standard 不変・実効不変テスト (node:test 標準・依存ゼロ)。
// Req 5.1 / 5.3 / 5.4 / 7.3 / 7.4。
//
// 目的: 本 spec (intent-planner-modes) のモード追加・SKILL.md 汎用化が、
//   standard モードの定義と既存 algo rules、generalized SKILL.md の frontmatter、
//   および intent-export-cc-sdd / インストーラコードを byte 単位で変えていないことを保証する。
//
// 手法: golden-hash 方式。各対象ファイル (および frontmatter ブロック) の SHA-256 を
//   「現在の正しい内容」から計算し、本テストに固定リテラルとして埋め込む。
//   これらは「standard 不変 / 汎用化前 と一致すべきロック値」であり、
//   将来いずれかのファイルが 1 byte でも変われば該当テストが落ちる (回帰ガード)。
//   - standard.md と既存 algo rules は本 spec で一切変更していない (task 2.3 review で確認済) ため、
//     現在のハッシュ = spec 導入前のハッシュ。
//   - generalized SKILL.md は本文を汎用化したが frontmatter は不変。frontmatter ブロック
//     (最初の `---` から 2 つ目の `---` まで) のハッシュをロックして「frontmatter 不変」を固定する。
//
// 検証する4領域:
//   1. standard.md + 既存 algo rules (ja/en) の byte ロック。
//   2. standard 実効挙動の保持: generalized SKILL.md が standard フェーズの algo を依然参照する。
//   3. generalized SKILL.md の frontmatter byte ロック。
//   4. intent-export-cc-sdd SKILL.md + インストーラコード (install.mjs / cli.mjs) の byte ロック。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

function abs(rel) {
  return path.join(REPO_ROOT, rel);
}

// ファイル全体の SHA-256 (byte ベース)。
function fileHash(rel) {
  return crypto.createHash("sha256").update(fs.readFileSync(abs(rel))).digest("hex");
}

// frontmatter ブロック (最初の `---` から 2 つ目の `---` の末尾まで) の SHA-256。
function frontmatterHash(rel) {
  const c = fs.readFileSync(abs(rel), "utf8");
  const first = c.indexOf("---");
  assert.notEqual(first, -1, `${rel} に frontmatter 開始 (---) がある`);
  const second = c.indexOf("---", first + 3);
  assert.notEqual(second, -1, `${rel} に frontmatter 終了 (---) がある`);
  const block = c.slice(first, second + 3);
  return crypto.createHash("sha256").update(block).digest("hex");
}

// ---- 領域1: standard.md + 既存 algo rules byte ロック (Req 5.1 / 7.3) ----
// これらは本 spec 導入前と byte 同一であるべきファイル。golden hash は導入前 = 現在の内容。

const BYTE_LOCKED_FILES = {
  // standard モード定義 (ja/en)
  "templates/ja/intent/modes/standard.md":
    "b2892cf61185e900a32b9328cf7ac5fcd35606af590e61459e1345f962c95367",
  "templates/en/intent/modes/standard.md":
    "499b24f4e8775ebf0055efeaa70669d535659e8fd666efc8521cf47c8731de97",
  // 既存 algo rules (ja/en): algo-gore-lite / algo-qoc / algo-example-mapping / map-cc-sdd
  "templates/ja/claude/skills/intent-discover/rules/algo-gore-lite.md":
    "2fc073beec2f9344bad7315d0a3641e95dcc2d346aea9c9eab2a3bc5b09c42bf",
  "templates/en/claude/skills/intent-discover/rules/algo-gore-lite.md":
    "cca95f3b274fe17d3140cad083e4da1d605b3998f2e01a763fe41a22fc0fda24",
  "templates/ja/claude/skills/intent-compass/rules/algo-qoc.md":
    "5581ffa8817b70fc2caec3b66e88db9423e2bf1cefc33b031bb02c22b9a6702b",
  "templates/en/claude/skills/intent-compass/rules/algo-qoc.md":
    "8e2194593114c8a06545320cbcca493df91ad174ae0698b9b616ecffe59009b0",
  "templates/ja/claude/skills/intent-packets/rules/algo-example-mapping.md":
    "e4754fbb364afce13669f6a818616fc79864e052545e3aee3d9add6f608f5625",
  "templates/en/claude/skills/intent-packets/rules/algo-example-mapping.md":
    "4f082f2cbada4f9d47de710a5582fc47788d9e0c51dceefd210fcbf8fb749126",
  "templates/ja/claude/skills/intent-export-cc-sdd/rules/map-cc-sdd.md":
    "ecab2647b44342638a35364a5b9a6d45ef38e0a12beb21ab5fa4164b4ded7db3",
  "templates/en/claude/skills/intent-export-cc-sdd/rules/map-cc-sdd.md":
    "13905a42892ae6006ff8ac01aa87aece3e5d10ba7ec4e3616dbbc0cbfc70b3c8",
};

for (const [rel, expected] of Object.entries(BYTE_LOCKED_FILES)) {
  test(`byte-lock: ${rel} が standard 不変 golden hash と一致する`, () => {
    assert.ok(fs.existsSync(abs(rel)), `対象ファイルが実在する: ${rel}`);
    assert.equal(
      fileHash(rel),
      expected,
      `${rel} が本 spec 導入前と byte 同一でない (golden hash 不一致)`,
    );
  });
}

// ---- 領域2: standard 実効挙動の保持 (Req 5.3 / 7.4) ----
// generalized SKILL.md (discover/compass/packets, ja/en) は汎用化後も、standard 選択時に
// 従来と同一の algo を参照する記述を保つ。content-contains で「standard フェーズ algo」を確認する。

const STANDARD_ALGO_REFS = {
  "intent-discover": "algo-gore-lite",
  "intent-compass": "algo-qoc",
  "intent-packets": "algo-example-mapping",
};
const SKILL_LANGS = ["ja", "en"];

for (const lang of SKILL_LANGS) {
  for (const [skill, algo] of Object.entries(STANDARD_ALGO_REFS)) {
    test(`standard-effective(${lang}): ${skill}/SKILL.md が standard algo ${algo} を依然参照する`, () => {
      const rel = `templates/${lang}/claude/skills/${skill}/SKILL.md`;
      const content = fs.readFileSync(abs(rel), "utf8");
      assert.ok(
        content.includes(algo),
        `${rel} に standard フェーズ algo 参照 (${algo}) が残っている`,
      );
    });
  }
}

// ---- 領域3: generalized SKILL.md の frontmatter byte ロック (Req 5.5 / 7.4) ----
// 本文は汎用化したが frontmatter (name / allowed-tools 等) は不変であることを固定する。

const FRONTMATTER_LOCKED = {
  "templates/ja/claude/skills/intent-discover/SKILL.md":
    "bb69b7daa26aa037c99e1c6e13e584345fefab1746a41006e94955c01a65e39a",
  "templates/en/claude/skills/intent-discover/SKILL.md":
    "6350f3f14e1df3696cf4870b91793a9b9974387d44eb4a1dc8a9f5ffe24c97a3",
  "templates/ja/claude/skills/intent-compass/SKILL.md":
    "789a1e9c77412f456fbd9c46bb83df307d251e2596ccd37b36e1a6ef42efae61",
  "templates/en/claude/skills/intent-compass/SKILL.md":
    "9a857994f65bc0115b690682335264b33c13c8c3a426e9c637a87978680e2996",
  "templates/ja/claude/skills/intent-packets/SKILL.md":
    "715c3b5ba413c0594b1d05271dfbb00e3ee69ed11d0b71ea50a8ec93da7eb16e",
  "templates/en/claude/skills/intent-packets/SKILL.md":
    "5e0a5c4291612e8e38b1e4b1847ff4b1acd0b8b0a388833929d82ac04eef7fec",
};

for (const [rel, expected] of Object.entries(FRONTMATTER_LOCKED)) {
  test(`frontmatter-lock: ${rel} の frontmatter が汎用化前と byte 同一である`, () => {
    assert.equal(
      frontmatterHash(rel),
      expected,
      `${rel} の frontmatter が変更されている (golden hash 不一致)`,
    );
  });
}

// ---- 領域4: intent-export-cc-sdd SKILL.md + インストーラコード byte ロック (Req 5.4) ----
// export skill とインストーラのアプリケーションコードは本 spec で変更しない。
// 将来これらを正当に変更する spec はこの golden hash を更新する想定。

const INSTALLER_LOCKED_FILES = {
  "templates/ja/claude/skills/intent-export-cc-sdd/SKILL.md":
    "2f60b382955ec07f61eb59affa87c803c46396e2b0cb5082d2eae0833c36df9f",
  "templates/en/claude/skills/intent-export-cc-sdd/SKILL.md":
    "23187a533c27e058b66e91e4a5f254a06760477af1447b514ec9dd253797b5e0",
  // intent-planner-agents (task 1.1) で AGENT_REGISTRY 追加 + computeCopyPlan の
  // agent 一般化 + install の agent 引数を加えたため golden hash を更新（本 spec が
  // install.mjs を正当に変更する spec）。Claude 既定の配置結果は byte 不変のまま。
  "src/install.mjs":
    "8aba192d7e4d790d25241492ef93b8de9d13872b4d517448de1731ee142490ed",
  "bin/cli.mjs":
    "4bee7c79befd0e08c5effc82025b05029a2deebe0be04cdd22a9bc8143ef13af",
};

for (const [rel, expected] of Object.entries(INSTALLER_LOCKED_FILES)) {
  test(`installer-lock: ${rel} が本 spec で未変更 (golden hash) である`, () => {
    assert.ok(fs.existsSync(abs(rel)), `対象ファイルが実在する: ${rel}`);
    assert.equal(
      fileHash(rel),
      expected,
      `${rel} が本 spec で変更されている (golden hash 不一致)`,
    );
  });
}
