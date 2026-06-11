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
//   - standard.md と既存 algo rules は本 spec (intent-planner-modes) では一切変更していない (task 2.3 review で確認済)。
//     その後の正規更新（レビュー承認済みの内容変更時はハッシュも併せて更新する運用）:
//     f0963d8 (モード品質パス: pre-mortem 追加・standard 再定義ほか) /
//     技法検証3者照合パス 2026-06-10 (ADR 形式 Decision Rules・Actor pass・EM 4欄・standard.md 整合)。
//   - generalized SKILL.md は本文を汎用化したが frontmatter は不変。frontmatter ブロック
//     (最初の `---` から 2 つ目の `---` まで) のハッシュをロックして「frontmatter 不変」を固定する。
//   - intent-planner-feature-growth (task 3.2) で lock 対象を拡張:
//     既存モード定義 (refactor / behavior-unknown) と refactor 系 algo 4種を BYTE_LOCKED_FILES へ追加
//     (feature-growth Req 5.2 / 7.2 — 従来 lock 非対象だった既存不変を恒久検証化)、
//     SKILL.md 本文 (frontmatter 込み全体) の hash lock を新設 (feature-growth Req 5.3 / 7.3)。
//
// 検証する5領域:
//   1. standard.md + 既存モード定義 (refactor / behavior-unknown) + 既存 algo rules (ja/en) の byte ロック。
//   2. standard 実効挙動の保持: generalized SKILL.md が standard フェーズの algo を依然参照する。
//   3. generalized SKILL.md の frontmatter byte ロック。
//   4. intent-export-cc-sdd SKILL.md + インストーラコード (install.mjs / cli.mjs) の byte ロック。
//   5. SKILL.md 本文 (全体) の hash ロック: 「SKILL.md 無変更でモードが追加できる」の恒久実証。
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

// ---- 領域1: standard.md + 既存モード定義 + 既存 algo rules byte ロック (Req 5.1 / 7.3) ----
// これらは意図しない変更から byte 単位で保護するファイル。golden hash は「最後に正規承認された内容」
// (modes spec 導入時 → f0963d8 → 技法検証3者照合パスで正規更新済み)。
// intent-planner-feature-growth (Req 5.2 / 7.2) で refactor / behavior-unknown モード定義と
// refactor 系 algo 4種 (drift-analysis / intent-recovery / migration-slicing / characterization-test) を
// ja/en で追加 (hash は feature-growth spec が一切変更していない現コミット済み内容を正規ベースラインとして算出)。

const BYTE_LOCKED_FILES = {
  // standard モード定義 (ja/en)
  "templates/ja/intent/modes/standard.md":
    "f564591827e8c4a58bb08128b1ce1f29f5faebc24c4c13ce04de90f799c27044",
  "templates/en/intent/modes/standard.md":
    "a004120481da6b6de4331ab6d72f0ffeda46ebd7b356423ed7c2b0adc7442c6a",
  // 既存 algo rules (ja/en): algo-gore-lite / algo-qoc / algo-example-mapping / map-cc-sdd
  "templates/ja/claude/skills/intent-discover/rules/algo-gore-lite.md":
    "f8d62758d80b4ebe93a53c7e2c33b9feb38fdc4098f9e7bf313bb4c0e4ddd332",
  "templates/en/claude/skills/intent-discover/rules/algo-gore-lite.md":
    "bdba01d5b4b225d5946b588724f91c3cda7e4053dcf331b1e450780017baf3d2",
  "templates/ja/claude/skills/intent-compass/rules/algo-qoc.md":
    "60f9ef78bcb3ef5be5dbfee622622eb92c935a183e08f942e9be79c0bb00ec50",
  "templates/en/claude/skills/intent-compass/rules/algo-qoc.md":
    "8f72a4f5ef99f655e9288c49ded08dd8ce8990cb8684b80651a2277cefe97b1b",
  "templates/ja/claude/skills/intent-packets/rules/algo-example-mapping.md":
    "15ce0f102464a81860a7c2e9550f6fd82d3ad9790fedd5a3931ef08a7a7ddb6f",
  "templates/en/claude/skills/intent-packets/rules/algo-example-mapping.md":
    "010adfb6b587590de27c396bdbbcfe777dfe473f9d2e742de5420ca9db086370",
  "templates/ja/claude/skills/intent-export-cc-sdd/rules/map-cc-sdd.md":
    "ecab2647b44342638a35364a5b9a6d45ef38e0a12beb21ab5fa4164b4ded7db3",
  "templates/en/claude/skills/intent-export-cc-sdd/rules/map-cc-sdd.md":
    "13905a42892ae6006ff8ac01aa87aece3e5d10ba7ec4e3616dbbc0cbfc70b3c8",
  // ---- intent-planner-feature-growth (Req 5.2 / 7.2) で追加: 既存モード定義 (ja/en) ----
  "templates/ja/intent/modes/refactor.md":
    "f378a17dff1faaa6d1f6c10dccabc159498e49f0ce62ed7878fad6a1dac39c5b",
  "templates/en/intent/modes/refactor.md":
    "84cc77ddc2c7e3947aab41bf0c4359c613c48ed0ed0da6984df4e5d142973a27",
  "templates/ja/intent/modes/behavior-unknown.md":
    "5be80449de16fe839ab323251f3669d5814ec8926edfe54bcd461df01840189c",
  "templates/en/intent/modes/behavior-unknown.md":
    "49d94b0a78d354131d318dee9c27d1230a806b72b25789cec793a8b0c30024e3",
  // ---- intent-planner-feature-growth (Req 5.2 / 7.2) で追加: refactor 系 algo rules (ja/en) ----
  "templates/ja/claude/skills/intent-discover/rules/algo-drift-analysis.md":
    "f90fa9990c32e3840465c634d28c7115ca80cf7fa6c885db0085a81e91ea2735",
  "templates/en/claude/skills/intent-discover/rules/algo-drift-analysis.md":
    "954b1aace5d76be18d4afa611d77d4071cc5b23ea4bcce267aa3ae6f36d148f0",
  "templates/ja/claude/skills/intent-discover/rules/algo-intent-recovery.md":
    "6971b96abec828f38903852fccbcc8a8c4e4fb9877ff7e6478f55ed82c71cffb",
  "templates/en/claude/skills/intent-discover/rules/algo-intent-recovery.md":
    "e937f57f5a2c02d01059f0582ea7a690d538523328d7af6bb4ee4ad226017abc",
  "templates/ja/claude/skills/intent-packets/rules/algo-migration-slicing.md":
    "46f882b35c8a43712f8893f2c0b2d357503fb44064d182548d5d162ba1441f4c",
  "templates/en/claude/skills/intent-packets/rules/algo-migration-slicing.md":
    "6496cfbf79c17084e1c97b8e0ff7f00793a14547cc17285256fa47d5c670e0e1",
  "templates/ja/claude/skills/intent-packets/rules/algo-characterization-test.md":
    "ee2b91c7972b832f39c2cac0a4b8cb960bc63574c70846139c4dadf3f751e1a4",
  "templates/en/claude/skills/intent-packets/rules/algo-characterization-test.md":
    "2250cd83abafab6ab8fb76ce4544c2dc963d7e7b83c8481f5abd650081e48a8c",
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
  // intent-planner-enforcement (task 5.2) で export SKILL.md に Step 1.5 enforcement ゲート・
  // 判定行解釈規則・export-log 追記・fail-open Safety・frontmatter Bash 追加を加えたため
  // golden hash を更新（本 spec が export SKILL.md を正当に変更する spec。diff review 済み）。
  "templates/ja/claude/skills/intent-export-cc-sdd/SKILL.md":
    "0bb880402864c642f2deecb2d72b262a0a6b24acac78ae4e68139220bea9e7e6",
  "templates/en/claude/skills/intent-export-cc-sdd/SKILL.md":
    "1dc02f75b2ee0b1b2d507150f38178b2cb91d73da30681e47223f4ddd7b5fa12",
  // intent-planner-agents (task 1.1) で AGENT_REGISTRY 追加 + computeCopyPlan の
  // agent 一般化 + install の agent 引数を加えたため golden hash を更新（本 spec が
  // install.mjs を正当に変更する spec）。Claude 既定の配置結果は byte 不変のまま。
  // intent-planner-enforcement (task 4.1 / 4.2) で enforce オプション・pre-push フック計画・
  // chmod 適用 (install.mjs) と --enforce フラグ・ヘルプ・サマリ出力 (cli.mjs) を加えたため再更新。
  // コードレビュー修正 (2026-06-12) で再更新: symlink 安全な存在判定 + copiedSoFar 付き
  // 部分失敗報告 (install.mjs)、引数バリデーション + codex 告知の実態一致 (cli.mjs)。
  "src/install.mjs":
    "d93b86d7e4a0745a925ead58c6a00a93ee2ee5a9a98f6e9154a4428d4d45117c",
  "bin/cli.mjs":
    "3aabd2c19085bc2fb9700062638378abe3beee4a3ffa7e2045448410feb3499c",
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

// ---- 領域5: SKILL.md 本文 (全体) hash ロック (feature-growth Req 5.3 / 7.3) ----
// intent-planner-feature-growth が SKILL.md を一切変更せずにモードを追加できたことの恒久実証。
// frontmatter ロック (領域3) と異なり、frontmatter 込みのファイル全体を hash lock する。
// 「例は網羅でなく表が正」の恒久対策により、新モードは SKILL.md 改修なしで機能する —
// 以後のモード追加 spec はこの lock が green のままであることが「SKILL.md 無変更で追加できた」実証になる。
// 対象: discover/compass/packets の SKILL.md × claude/codex × ja/en (12) + codex export SKILL.md × ja/en (2)。
// claude export SKILL.md は INSTALLER_LOCKED_FILES で既存 lock 済みのため重複させない。
// hash は feature-growth spec が変更していない現コミット済み内容を正規ベースラインとして算出。

const SKILL_BODY_LOCKED = {
  "templates/ja/claude/skills/intent-discover/SKILL.md":
    "de9e6a9331d823d8f8ebf733c844d17de31517162b045c9b53daecdc8e289052",
  "templates/en/claude/skills/intent-discover/SKILL.md":
    "eae219ab46363971c28b2dca1dd1e9705933057243ada8c3d24137c92f628025",
  "templates/ja/claude/skills/intent-compass/SKILL.md":
    "3312be3243425defc04544a1dde38bef9936708904330b2baee7a14baa9b47f1",
  "templates/en/claude/skills/intent-compass/SKILL.md":
    "75e6951514b3055c4d4f1096221464e1b9eff7e0ec61073e453f0161aac5c458",
  "templates/ja/claude/skills/intent-packets/SKILL.md":
    "d649a78679bce0609d2e845f6dac03a6f2a3d0f464afb44ee24e1b91faaf1e72",
  "templates/en/claude/skills/intent-packets/SKILL.md":
    "93d0e077c6e33fbd04d444be0b1b278b129771a1cdecc35c134f4ad5c15da2c2",
  "templates/ja/codex/skills/intent-discover/SKILL.md":
    "d57d27b41528ea4d8d1b5525a9bbddfbb055ad64f5ffa0e83254d5c41a4ca59f",
  "templates/en/codex/skills/intent-discover/SKILL.md":
    "781e3a471e66539ed2bff5304d1b2fc37c4725f456ac740ff738030176b3eb2d",
  "templates/ja/codex/skills/intent-compass/SKILL.md":
    "110ef5550d89892e294ba3819a717d4f066cc662dc254a2ec4d9e8eafdb0d1db",
  "templates/en/codex/skills/intent-compass/SKILL.md":
    "7f3f09982342838e2cb63166d9c90629b7f75791a7b5eeabe332f711558a3402",
  "templates/ja/codex/skills/intent-packets/SKILL.md":
    "33f635e2e15868c23364d61334ed3c18de8f85721c9e3b85edc0805400b470e8",
  "templates/en/codex/skills/intent-packets/SKILL.md":
    "53db0cc3f4c609b1b435ffc70ac9348ac9ff0440ecb78afb756c6f81ceb94f28",
  // codex export SKILL.md (claude 側は INSTALLER_LOCKED_FILES で lock 済み)
  // intent-planner-enforcement (task 5.2) で Step 1.5 enforcement ゲート・判定行解釈規則・
  // export-log 追記・fail-open Safety を加えたため golden hash を更新（diff review 済み）。
  "templates/ja/codex/skills/intent-export-cc-sdd/SKILL.md":
    "4036509cdc30f95028f2b308e2d286813506a61dd57c25150abc01148fb034a9",
  "templates/en/codex/skills/intent-export-cc-sdd/SKILL.md":
    "397b4ddbd2742141c9ef88f7dc67d3ad1dd32d0bde6875c52582542371ff2973",
};

for (const [rel, expected] of Object.entries(SKILL_BODY_LOCKED)) {
  test(`skill-body-lock: ${rel} 全体がモード追加前と byte 同一である (SKILL.md 無変更の恒久実証)`, () => {
    assert.ok(fs.existsSync(abs(rel)), `対象ファイルが実在する: ${rel}`);
    assert.equal(
      fileHash(rel),
      expected,
      `${rel} が変更されている (golden hash 不一致) — モード追加は SKILL.md 無変更で行う設計`,
    );
  });
}
