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
  // intent-planner-review-adoption (task 1.2) で ADR エントリを6欄化（Alternatives considered /
  // Revisit when 追加・「未定」明示）、手順5 に [export まで] / [by export] タグ規律、
  // 規律に旧4欄エントリの後方互換を加えたため golden hash を正規更新（本 spec が algo-qoc.md を
  // 正当に変更する spec。codex 側は agent-rules-parity の byte 等価で追随）。
  "templates/ja/claude/skills/intent-compass/rules/algo-qoc.md":
    "cc4e5c186d49e88cc7ceb68956408d09e9c3d71ed96e7e76987ec600b84b1c72",
  "templates/en/claude/skills/intent-compass/rules/algo-qoc.md":
    "d43fe6d29fcbccef82490581f3e7a270a28ce561cf4b1332d4859868beb22870",
  // intent-planner-packet-files (task 4) で正規更新: 出力先言及を「packets.md の更新案」から
  // 「packet ファイル（active/ 配下）の更新案」へ、Deferred 節の所在を plan.md へ文言追従
  // （アルゴリズム本体は不変。codex 側は agent-rules-parity の byte 等価で追随）。
  "templates/ja/claude/skills/intent-packets/rules/algo-example-mapping.md":
    "55c2fee35c25f07e95eaeaac630a43b2801e13b7363e0bce8f824a460d9bc718",
  "templates/en/claude/skills/intent-packets/rules/algo-example-mapping.md":
    "344b00080d8bfa948a00b171fc1d3e9a2892cccc561ee745907d48259903c107",
  // intent-planner-export-dirs (task 1) で正規更新: 出力3パスを `.intent/cc-sdd/<スラッグ>/` 配下へ
  // 変更し、スラッグ規則（決定的正規化）・衝突規則・requirements 下書きの必須見出し
  // (Source Packet / Parent Intent / Invariants) を出力契約として明文化（本 spec が map-cc-sdd.md を
  // 正当に変更する spec。codex 側は agent-rules-parity の byte 等価で追随）。
  "templates/ja/claude/skills/intent-export-cc-sdd/rules/map-cc-sdd.md":
    "b27ee3b2cb10b14b7e606b3f03b419a1a4a2128bf00bab50c1b990a3dd65cf6d",
  "templates/en/claude/skills/intent-export-cc-sdd/rules/map-cc-sdd.md":
    "d2bf0eca376353f3c3256db25cf177809c76072ca6cb77d5c5fcf590df00731f",
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
  // intent-planner-packet-files (task 4) で正規更新: 出力先言及を「packets.md の更新案」から
  // 「packet ファイル（active/ 配下）の更新案」へ文言追従（アルゴリズム本体は不変。
  // codex 側は agent-rules-parity の byte 等価で追随）。
  "templates/ja/claude/skills/intent-packets/rules/algo-migration-slicing.md":
    "6aa8ac95f90d44db833c74e4765e013ac6bc81393addd2f25749794081283bae",
  "templates/en/claude/skills/intent-packets/rules/algo-migration-slicing.md":
    "97127f7ab9611ab32e6cb37ef396e49d37e84c0312dfee6614c556f40acf206e",
  "templates/ja/claude/skills/intent-packets/rules/algo-characterization-test.md":
    "67bad8095dca486ad907db6eb11d8e5c2cc677bb4dcb8b15e6e106e4a11df9ca",
  "templates/en/claude/skills/intent-packets/rules/algo-characterization-test.md":
    "85f44644a395755c387b3b315c8ed468a67215d88558bc4fb9e2c1be662ea336",
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
  // intent-planner-packet-files (task 3.2) で intent-packets SKILL.md（ja/en claude）の
  // allowed-tools に Bash を追加（用途は日時取得・`.intent/packets/` 配下の mkdir と移動・
  // 移行時の旧 packets.md の後始末に本文で限定。アプリコード非変更の invariant は維持）したため
  // golden hash を正規更新（本 spec が packets SKILL の frontmatter を正当に変更する spec。
  // codex 系統は frontmatter 最小構成のため変更なし — 本文の自然言語表現で同等。diff review 済み）。
  "templates/ja/claude/skills/intent-packets/SKILL.md":
    "a95441c18a6e367cae2d9ec6b0a8199db86c48639a2bcec64106777c7117ee48",
  "templates/en/claude/skills/intent-packets/SKILL.md":
    "0c01a46e445aa14809723eeba1341964d8af910d67684231aac8b8a72024aaa7",
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
  // intent-planner-review-adoption (task 5.2) で Step 1.7（rules/export-questions.md の
  // 無条件参照）・Output Description の確認結果行・Safety の「停止ではなく確認」1行を
  // 加えたため golden hash を再更新（frontmatter は不変。diff review 済み）。
  // intent-planner-export-dirs (task 3) で Step 3/4 の出力・読み戻しパスを packet 毎の
  // `.intent/cc-sdd/<スラッグ>/` 配下へ変更（スラッグ規則は rules/map-cc-sdd.md 参照）、
  // Step 1.8（旧形式下書きの移行: Source Packet 見出しで移動・判別不能時は利用者確認）を追加、
  // Output / Safety を追随させたため golden hash を再更新（export-log 追記手順と frontmatter は不変）。
  "templates/ja/claude/skills/intent-export-cc-sdd/SKILL.md":
    "53114549506489553a57a916b2701346c3348e8ad8f8d9241d6e57d31f371232",
  "templates/en/claude/skills/intent-export-cc-sdd/SKILL.md":
    "0595c70ed53ee9ff1dc3a094329a19f106326b176fafb81019902ba8019bb97d",
  // intent-planner-agents (task 1.1) で AGENT_REGISTRY 追加 + computeCopyPlan の
  // agent 一般化 + install の agent 引数を加えたため golden hash を更新（本 spec が
  // install.mjs を正当に変更する spec）。Claude 既定の配置結果は byte 不変のまま。
  // intent-planner-enforcement (task 4.1 / 4.2) で enforce オプション・pre-push フック計画・
  // chmod 適用 (install.mjs) と --enforce フラグ・ヘルプ・サマリ出力 (cli.mjs) を加えたため再更新。
  // コードレビュー修正 (2026-06-12) で再更新: symlink 安全な存在判定 + copiedSoFar 付き
  // 部分失敗報告 (install.mjs)、引数バリデーション + codex 告知の実態一致 (cli.mjs)。
  // intent-planner-export-dirs (task 5.1) で正規更新: gitignore 整備の追加
  // (planGitignore / applyGitignore / detectTrackedCcSdd + install 戻り値の
  // gitignore / trackedCcSdd 拡張。既存 .gitignore へは末尾追記のみ・dry-run 非書込)。
  "src/install.mjs":
    "c4114c4f5fb3a50a2140548f44af6f636a34a81a96c4d8d9cff9425e2fa1f3b9",
  // intent-planner-export-dirs (task 5.2) で正規更新: gitignore 結果表示 (作成 / 追記 /
  // 変更なし=整備済み / スキップの 4 アクション告知) と追跡解除案内
  "bin/cli.mjs":
    "21811f3cf3be393ca9fd2028a765bdf45992d7ae9dab513c17015b936543f7ab",
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
    "d2b252891f94578a64dff327b18f8dffcd19d30d172ce9c81aa4c09710003b8c",
  "templates/en/claude/skills/intent-discover/SKILL.md":
    "fe4591c6236c1c6688a4315420cc23fd05fde15d03536e39c76b5df934d4487a",
  // intent-planner-review-adoption (task 1.2) で intent-compass SKILL.md ×4 の Step 3 の
  // インライン欄列挙を「エントリの欄構成は rules/algo-qoc.md が正」へ置換したため golden hash を
  // 正規更新（本 spec が compass SKILL.md 本文を正当に変更する spec。frontmatter は不変 —
  // FRONTMATTER_LOCKED は無変更で green のまま）。
  // intent-planner-packet-files (task 6) で Invariants 二層解消（Step 3: 普遍は compass 保持 +
  // steering 推奨提示の維持・packet 固有は packet ファイルの Safety / Invariants に直接起案で
  // compass には書かない、Success Criteria も追従）のため golden hash を正規更新
  // （frontmatter は不変 — FRONTMATTER_LOCKED は無変更で green のまま。diff review 済み）。
  "templates/ja/claude/skills/intent-compass/SKILL.md":
    "e29a837de4cd767ca9367d8675bd390a5ef9e7f94ee99d9db2732228bf520e87",
  "templates/en/claude/skills/intent-compass/SKILL.md":
    "ee7c1783d884bf34a7acb02425e1fe86a981594c3a35b4f69c471cf8710252d0",
  // intent-planner-review-adoption (task 3.2) で intent-packets SKILL.md ×4 の Step 4 に
  // rules/first-packet.md の無条件参照行を追加し、Output Description に「最初に着手すべき
  // packet の推薦（理由付き）」行を追加（既存の「次に export すべき packet」行は推薦と同一で
  // ある旨を補足）したため golden hash を正規更新（本 spec が packets SKILL.md 本文を正当に
  // 変更する spec。frontmatter は不変 — FRONTMATTER_LOCKED は無変更で green のまま）。
  // intent-planner-packet-files (task 3.1 / 3.2) で intent-packets SKILL.md ×4 を per-packet
  // ファイル構造へ改修（Step 3/4: active/ 配下の個別ファイル起案・非破壊差分更新・draft→active 化 +
  // index 再生成・supersede + in-flight ガード、Step 1: 旧 install 対応）し、Step 1.5（旧
  // packets.md の移行: 節分割 + name 逐語転記・終端 delta 基準の分類・compass 移設案・一括確認・
  // plan.md 節単位追記・git 追跡なら削除 / 非追跡なら .migrated 退避）と Safety / Output の追記、
  // claude 系統の frontmatter Bash 追加を行ったため golden hash を正規更新（diff review 済み）。
  "templates/ja/claude/skills/intent-packets/SKILL.md":
    "ecda4217ca5cd9d8c315aa33941bb8a95af2f9114161f0269380f2dec72dfd6e",
  "templates/en/claude/skills/intent-packets/SKILL.md":
    "84e3c5a205507402479e2fafa9fa6b68763ee357cdbae7574901bad20059543b",
  "templates/ja/codex/skills/intent-discover/SKILL.md":
    "07239cfae915bf8fe4c8da9acabc5f7eec13d6324f51af81917d6ec0c315fb52",
  "templates/en/codex/skills/intent-discover/SKILL.md":
    "d3be91fde831292106d7512428ba0c081bac4f39a56c361d4e8e6735dddd8901",
  // intent-planner-review-adoption (task 1.2): codex 側も claude と同じ Step 3 置換のため正規更新。
  // intent-planner-packet-files (task 6): codex 側も claude と同じ Invariants 二層解消のため正規更新
  // （本文は claude と byte 等価のまま）。
  "templates/ja/codex/skills/intent-compass/SKILL.md":
    "f644b58c1fb94e52f9a929a37b7b773546c73ec1c622fb41700dfcc656f01df7",
  "templates/en/codex/skills/intent-compass/SKILL.md":
    "18e0f9493d340830c60ce8adac03a1343bdc6df59aedcf2ab7866fd940ef2ea0",
  // intent-planner-review-adoption (task 3.2): codex 側も claude と同じ Step 4 / Output 追記のため正規更新。
  // intent-planner-packet-files (task 3.1 / 3.2): codex 側も claude と同じ per-packet 構造改修・
  // Step 1.5 移行・Safety / Output 追記のため正規更新（確認は AskUserQuestion でなく自然言語確認、
  // Bash は frontmatter でなく本文のシェルコマンド用途限定という codex 慣行を維持）。
  "templates/ja/codex/skills/intent-packets/SKILL.md":
    "e7d836298a7ac2f1a66d28e52ae2016ac5285cf6c19b3503c299f4d2747aa0b0",
  "templates/en/codex/skills/intent-packets/SKILL.md":
    "960550889d0d15da4cfbc8443a253a1d5887d6ea4bad89e430cdb4633f9597ed",
  // codex export SKILL.md (claude 側は INSTALLER_LOCKED_FILES で lock 済み)
  // intent-planner-enforcement (task 5.2) で Step 1.5 enforcement ゲート・判定行解釈規則・
  // export-log 追記・fail-open Safety を加えたため golden hash を更新（diff review 済み）。
  // intent-planner-review-adoption (task 5.2): codex 側も claude と同じ Step 1.7 配線・
  // Output / Safety 追記のため正規更新。
  // intent-planner-export-dirs (task 3): codex 側も claude と同じ Step 3/4 パス変更・
  // Step 1.8 追加・Output / Safety 追随のため正規更新（確認は AskUserQuestion でなく
  // 自然言語確認という codex 慣行を維持）。
  "templates/ja/codex/skills/intent-export-cc-sdd/SKILL.md":
    "54b0ecd7b6661fbcf63fe570a3c325e86b55970d824a4cba59c401fd6bcc7a4d",
  "templates/en/codex/skills/intent-export-cc-sdd/SKILL.md":
    "58a8af69eb85252af71bc3275494c143549fe67961383fe9ba78837c5069b25f",
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
