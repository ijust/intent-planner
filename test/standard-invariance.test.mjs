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
  // intent-planner-packet-files (task 8) で正規更新: Deferred 節の記録先言及を
  // `packets.md` から `.intent/packets/plan.md` へ文言追従（アルゴリズム表・他の本文は不変）。
  "templates/ja/intent/modes/standard.md":
    "fa41223b45be3501149464b11346357dab9b2905736330de2db94f19fdcd4dc0",
  "templates/en/intent/modes/standard.md":
    "d3b6195a7ef120998c0b0410d1f2f0abd89e505b4ca03c6bff74f1f5a23f1c32",
  // 既存 algo rules (ja/en): algo-gore-lite / algo-qoc / algo-example-mapping / map-cc-sdd
  "templates/ja/claude/skills/intent-discover/rules/algo-gore-lite.md":
    "f8d62758d80b4ebe93a53c7e2c33b9feb38fdc4098f9e7bf313bb4c0e4ddd332",
  "templates/en/claude/skills/intent-discover/rules/algo-gore-lite.md":
    "bdba01d5b4b225d5946b588724f91c3cda7e4053dcf331b1e450780017baf3d2",
  // intent-planner-review-adoption (task 1.2) で ADR エントリを6欄化（Alternatives considered /
  // Revisit when 追加・「未定」明示）、手順5 に [export まで] / [by export] タグ規律、
  // 規律に旧4欄エントリの後方互換を加えたため golden hash を正規更新（本 spec が algo-qoc.md を
  // 正当に変更する spec。codex 側は agent-rules-parity の byte 等価で追随）。
  // intent-planner-elicitation (task 2.1) で手順4 の冒頭に Invariant 収集発問（固定カテゴリ枠・
  // 文脈からの動的例示・非網羅明示・枠のみ fallback・否定形発問・2層振り分け・該当なし/不明/後で確認の
  // 逃がし）を追加し、出力段に手順6 omission recap（抜け→記録先へ追記して再提示・過剰→削除/降格・
  // 最大1往復）を追加したため golden hash を再更新（codex 側は agent-rules-parity の byte 等価で追随）。
  // 用語の未説明初出の解消で正規更新: invariant 初出に「（壊してはいけない制約）」の一行説明を追加
  // （terminology spec の方針: 英語術語 + 一行説明。アルゴリズム本体は不変）。
  // intent-planner-required-how (task 1.1) で正規更新: 手順4 のカテゴリ枠（6→7）に「技術的制約」を
  // 新6番目として挿入（直接形発問・過剰昇格フィルタ・L3 区別を併記）し、「不変条件・禁止事項」を7番目へ
  // 繰り下げ。否定形規律本文に技術制約カテゴリ例外のポインタを1行追加（本 spec が algo-qoc.md を
  // 正当に変更する spec。codex 側は agent-rules-parity の byte 等価で追随）。
  "templates/ja/claude/skills/intent-compass/rules/algo-qoc.md":
    "4bc24293b71000b10b4cb2d03e66d6fea0af2ab41bb57dfc969796e1f82604d4",
  "templates/en/claude/skills/intent-compass/rules/algo-qoc.md":
    "6a07b031e419db06f6fc9da8c9eb39d6f3f9ea1ad9d1f5ebc79667778fc3134b",
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
  // intent-planner-required-how (task 2.1) で正規更新: design ヒント節 (`### …/design.md`) の
  // 観点リストに技術制約転記を追加し、由来に compass の技術制約 Invariant を明示追加（skill 全体の
  // 入力範囲は不変。design ヒント節の由来契約のみ拡張）。codex 側は agent-rules-parity の byte 等価で追随。
  "templates/ja/claude/skills/intent-export-cc-sdd/rules/map-cc-sdd.md":
    "89c603d641e3bde15cbe3f5adb8444d7cc929d263fd02c3e105f91bf0db697a7",
  "templates/en/claude/skills/intent-export-cc-sdd/rules/map-cc-sdd.md":
    "6ec7a8529aa41b22fe6d02548a00dbc2f698fdd4093826b909e229fbdf3627dc",
  // ---- intent-planner-feature-growth (Req 5.2 / 7.2) で追加: 既存モード定義 (ja/en) ----
  // 用語の未説明初出の解消で正規更新: Mikado pre-pass に手法の一行説明を追加（モード戦略は不変）。
  "templates/ja/intent/modes/refactor.md":
    "a3d0d0d2ab27962f7937edc346e71bb9cfff605ad18ab2d4b5d44f2227a108d4",
  "templates/en/intent/modes/refactor.md":
    "747d250abfda6c3abcbf679c330c9fde4fe97b2f53a17108cd4ff25f99926249",
  // intent-planner-packet-files (task 8) で正規更新: Deferred 節の記録先言及を
  // `packets.md` から `.intent/packets/plan.md` へ文言追従（アルゴリズム表・他の本文は不変）。
  "templates/ja/intent/modes/behavior-unknown.md":
    "1a4f7c3d3659bf2aeab04654816d0e5b825f0fc36dcef65e23294382a415abfe",
  "templates/en/intent/modes/behavior-unknown.md":
    "22061681e15e7055ea2c611a9837eb99fe31e5aeff46c84f73b642e34bf0b140",
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
  // intent-planner-compass-conformance (task 3.2) で intent-compass SKILL.md（ja/en claude）の
  // allowed-tools に Bash を追加（用途は節更新日 `Updated (...)` 打刻の日時取得に本文で限定。
  // packet 側と方式を揃える。アプリコード非変更の invariant は維持）したため frontmatter の
  // golden hash を正規更新（本 spec が compass SKILL の frontmatter を正当に変更する spec。
  // codex 系統は frontmatter 最小構成で allowed-tools 行を持たないため変更なし — Bash 利用は
  // 本文の自然言語表現で同等。task 1.4 は独立レビューで APPROVED 済み。diff review 済み）。
  "templates/ja/claude/skills/intent-compass/SKILL.md":
    "5dd79370b08e49bdd50054357dca848cf575b5e8b5bebdd9077e92deb0b700cf",
  "templates/en/claude/skills/intent-compass/SKILL.md":
    "1ec376cefbb0a3bccb65c8bc6aca45c6451a0cfc77c1cebf6fd8783901c2ab20",
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
  // intent-planner-packet-files (task 7) で Step 1 を index.md 経由の候補提示 + 確定した対象
  // packet ファイルのみ読む方式へ変更（index 不在は active/ から直接構成 + 再生成案内・
  // packets/ 不在は停止案内・draft ガード: 利用者確認のうえ active 化 + index 再生成）、
  // Step 2 の入力範囲を「対象 packet ファイル + compass のプロジェクト普遍 Invariants/
  // Anti-direction」へ更新、Output / Safety を追随させたため golden hash を再更新
  // （Step 1.5/1.7/1.8・Step 3/4・frontmatter は不変。diff review 済み）。
  // intent-planner-drift-watch (task 7.2): export SKILL.md に Step 1.6（drift 照合・off ガード・3関所順序 1.5→1.6→1.7・停止しない）を挿入したため golden hash を正規更新（drift-watch=off で現行動作とバイト等価。task 8 で off 時バイト等価を別途固定。frontmatter は不変）。
  // intent-planner-writeback-phase-boundary: export SKILL.md の Step 4 末尾に「戻り先の明示（writeback フェーズの入口）」1行・Output Description に戻り先案内1行を追加したため golden hash を正規更新（起草フェーズと writeback フェーズの境界を利用者に明示する案内のみ。frontmatter は不変。diff review 済み）。
  // 旧バージョン変換の削除 (version 0.10.0): export SKILL.md ×4 から Step 1.8（旧単一スロット形式の
  // cc-sdd 下書きを packet 毎ディレクトリへ自動移行する手順）・関連 Output / Safety 行を削除したため
  // golden hash を正規更新（旧形式変換機能の撤去。Step 1.7→Step 2 が連続。frontmatter は不変。diff review 済み）。
  // intent-planner-mode-scope (task 2.3, 2026-06-19) で正規更新: Step 1 の mode 状態読み取り行を
  //   「`.intent/mode.local.md`（無ければ旧 `.intent/mode.md`）の mode 状態を読む」へ配線（DD2/INV18）。
  //   Enforcement/Drift-watch（Step 1.5/1.6）は mode.md のまま据え置き（INV19・非改変）。frontmatter 不変。
  // export-route-add (task 2.1): Step 1.8 に cc-sdd 前提（.kiro/）の preflight warn を追加（warn のみ・
  //   停止しない・DR25）。本文のみ変更で INSTALLER golden hash を正規更新（frontmatter 不変。diff review 済み）。
  "templates/ja/claude/skills/intent-export-cc-sdd/SKILL.md":
    "c6bd98cacf1a44df1409e7f3b4e5c603d9fc84a6bdbfa2cf8ef0b0c29fb327b8",
  "templates/en/claude/skills/intent-export-cc-sdd/SKILL.md":
    "94e8a4df90fd747ee61afd98e523ba92fdd9e1d893b7dd4393f0815ee8808d6d",
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
  // intent-planner-safe-upgrade で正規更新: 安全なバージョンアップを既定挙動に。
  //   classifyFile (code / user-data / shared 3分類) + update オプション。update 時は
  //   既存 code を上書き (一致なら SKIP・冪等)・user-data / shared は保護。上書き code は
  //   <file>.bak に退避 (applyPlan の backedUp)。gitignore ブロックに *.bak を追加。
  //   レビュー反映: *.bak gitignore をディレクトリ限定 (.intent/.claude/.agents 配下) に絞り、
  //   部分失敗エラーへ .bak 退避先の案内を追加。
  // intent-planner-overview (task 1.2) で正規更新: GITIGNORE_PATTERNS に overview 派生ビューの
  //   Git 非追跡化のため `.intent/overview/*` と `!.intent/overview/README.md` の 2 パターンを
  //   既存 cc-sdd パターンの隣に追記（cc-sdd 下書きと同一機構・新規ロジックなし。design Allowed
  //   Dependencies で明示的に追記が許可された変更。diff review 済み）。
  // intent-planner-spec-ingest (task 1.1) で正規更新: GITIGNORE_PATTERNS に spec-ingest 派生領域の
  //   Git 非追跡化のため `.intent/spec-ingest/*` と `!.intent/spec-ingest/README.md` の 2 パターンを
  //   overview ブロック直後・`.bak` 行群の前に追記（overview と同一機構・新規ロジックなし。design
  //   Modified Files で明示的に追記が許可された変更。diff review 済み）。
  // intent-planner-nl-spec-export (task 1.1) で正規更新: GITIGNORE_PATTERNS に nl-spec 派生領域の
  //   Git 非追跡化のため `.intent/nl-spec/*` と `!.intent/nl-spec/README.md` の 2 パターンを
  //   spec-ingest ブロック直後・`.bak` 行群の前に追記（overview / spec-ingest と同一機構・新規
  //   ロジックなし。design Modified Files で明示的に追記が許可された変更。diff review 済み）。
  // intent-planner-decision-propagation (task 1.2): USER_DATA_RELATIVES に
  //   .intent/milestones.md を追加（節目イベント記録をユーザー成果物として上書き保護）。
  //   INV6 射程＝scaffold 配布設定でありアプリ機能コードの変更ではない。
  // claude-rootdoc-seam (task 1.1, 2026-06-18) で正規更新: Claude エージェントプロファイルの
  //   claude.rootDoc を null → "CLAUDE.md" に変更（rootDoc 配置を Claude にも有効化する継ぎ目）。
  //   本 spec が install.mjs を正当に変更する spec。Codex プロファイル (AGENTS.md) の配置は不変。
  // claude-rootdoc-seam (writeback, 2026-06-18) で正規更新: SHARED_RELATIVES に "CLAUDE.md" を追加。
  //   AGENTS.md と同性質（リポジトリ直下でユーザーが追記しうる）なので update 時に既存を上書きせず
  //   SKIP で保護する（INV12 の実装担保）。writeback の invariant-violation 解消としてコード修正。
  // intent-planner-mode-scope (task 2.4, 2026-06-19) で正規更新: GITIGNORE_PATTERNS に
  //   `.intent/mode.local.md` を1行追加し、GITIGNORE_COMMENT を「local-only files (export
  //   drafts / mode state)」へ更新。mode 状態 (mode.local.md) をローカル専用＝git 非追跡にする
  //   （DD1/INV19）。既存の非破壊 append・冪等・非 git skip 機構を流用し新規ロジックは追加せず
  //   （INV2）、INV6 射程＝scaffold 配布設定の変更。本 spec が install.mjs を正当に変更する spec。
  // intent-planner-context-cost-cues (task 2.1, 2026-06-20) で正規更新: USER_DATA_RELATIVES に
  //   `.intent/context-cost-cues.md` を1行追加。コンテキストコストの気づきカタログ（drift-patterns
  //   と同型・別カタログ）を全プロジェクトへ配布し upgrade で利用者編集を保護する（user-data 分類）。
  //   既存の分類セットへの加算のみで配置ロジック・分類関数は不変（INV2）。INV6 射程＝scaffold 配布設定。
  // intent-planner-ubiquitous-language-add (task 1.2, 2026-06-20) で正規更新: USER_DATA_RELATIVES に
  //   `.intent/glossary.md` を1行追加。ユーザーが現場で育てる正規語彙の台帳（β・人編集 canonical）を
  //   全プロジェクトへ配布し upgrade で利用者編集を保護する（user-data 分類）。既存の分類セットへの
  //   加算のみで配置ロジック・分類関数は不変（INV2/INV3 非破壊）。INV6 射程＝scaffold 配布設定。
  // intent-planner-release-note-seam (task 1.2/1.3, 2026-06-20) で正規更新: GITIGNORE_PATTERNS に
  //   `.intent/release-note/*` と `!.intent/release-note/README.md` を nl-spec の直後に追加。
  //   release note 派生ビュー（後続 skill packet が書く受け皿）を利用者プロジェクトで Git 非追跡化
  //   （README のみ追跡）する。既存の nl-spec/overview/spec-ingest と同型のデータ行追加のみで、
  //   gitignore 整備ロジック（planGitignore/applyGitignore）・配置・分類は不変（INV3 限定緩和=
  //   .gitignore 配布正本の編集に限る）。INV6 射程＝scaffold 配布設定。
  // intent-planner-constraint-starters-seam (task 2.1, 2026-06-21) で正規更新: USER_DATA_RELATIVES に
  //   `.intent/constraint-library.md` を1行追加。ユーザーが現場で育てる制約の台帳（叩き台ライブラリの
  //   蓄積側・人編集 canonical）を全プロジェクトへ配布し upgrade で利用者編集を保護する（user-data 分類）。
  //   同梱定石カタログ `.intent/constraint-starters.md` は登録しない（code 分類＝開発者メンテの定石更新が
  //   再 install で届く）。既存の分類セットへのデータ行加算のみで配置ロジック・分類関数は不変（INV2/INV3
  //   非破壊）。INV6 射程＝scaffold 配布設定。
  "src/install.mjs":
    "75a9e8e78e8e485d889036cc5cf466b714d61340bf5d64f49f266c7ec2cafdae",
  // intent-planner-export-dirs (task 5.2) で正規更新: gitignore 結果表示 (作成 / 追記 /
  // 変更なし=整備済み / スキップの 4 アクション告知) と追跡解除案内
  // intent-planner-safe-upgrade で正規更新: update を既定 ON (--no-update で旧来の全スキップ)。
  //   配置を「新規配置 / 更新 (既存上書き・.bak退避) / スキップ (user-data保護 / 共有尊重 /
  //   既に最新)」に分けて告知。ヘルプに安全バージョンアップ節を追加。
  //   レビュー反映: 「既に最新」スキップ群に説明行を追加。
  // 旧バージョン変換の削除 (version 0.10.0) で正規更新: 追跡済み cc-sdd 下書きの追跡解除案内から
  //   「旧形式 (cc-sdd 直下) を次回 /intent-export-cc-sdd が packet ディレクトリへ移行する」前提の
  //   文言を除去（Step 1.8 撤去で当該自動移行は存在しないため）。下書きはローカル専用方針・
  //   git rm --cached で手動解除という核は維持。出力文言のみ変更（ロジック不変）。diff review 済み。
  "bin/cli.mjs":
    "e01d386e6f11d1051bc8782fd11740e60155f9ffa1a8c01c3bbb03802d417324",
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
  // intent-planner-drift-watch (task 2.2): intent-discover SKILL.md ×4 に Step 3.5（地形診断・off ガード）+
  // Success Criteria 1行を追加したため golden hash を正規更新（drift-watch=off で現行動作とバイト等価。
  // task 6 で off 時バイト等価を別途固定。frontmatter は不変 — FRONTMATTER_LOCKED は無変更で green のまま）。
  // 出力可読性改善 (status/overview/全スキルの Output Description を結論筆頭へ): intent-discover
  // SKILL.md ×4 の Output Description を「次の一手（/intent-compass）→ Open Questions → 詳細」の
  // 結論筆頭構成へ書き直し、読み手・最初に掴ませることの2行を追加したため golden hash を正規更新
  // （frontmatter は不変 — FRONTMATTER_LOCKED は無変更で green のまま。diff review 済み）。
  // intent-planner-context-cost-cues-wire (task 2.1, 2026-06-20) で正規更新: Step 3.5 の既存
  //   on-bullet に context-cost-cues 照合の言及を1行追記（off-guard を bullet[0] に保持・Block E green）
  //   + Core Mission に success-criteria 1行追加。drift-watch=off で現行動作とバイト等価（off-guard
  //   が短絡）。frontmatter は不変。wire は SKILL 本文を触るため SKILL_BODY hash の正規更新が随伴
  //   （add は rule のみで対象外だった対比）。diff review 済み。
  // export-route-wire (task 1.1): discover Step 1 に target format の推奨→追認→記録を結線（DR26 の
  //   書き手・任意/保留可/推測で埋めない A7 追認規律・本文のみ変更で SKILL_BODY hash 随伴・frontmatter 不変）。
  "templates/ja/claude/skills/intent-discover/SKILL.md":
    "0d0f1a4204aecf6d379fbec28938d0eb2a130a77b9886a423f09261e56b1425f",
  "templates/en/claude/skills/intent-discover/SKILL.md":
    "1e22fd3f07ea209a4905f521c994a40868b144cb0510dfc7586b259124747c9b",
  // intent-planner-review-adoption (task 1.2) で intent-compass SKILL.md ×4 の Step 3 の
  // インライン欄列挙を「エントリの欄構成は rules/algo-qoc.md が正」へ置換したため golden hash を
  // 正規更新（本 spec が compass SKILL.md 本文を正当に変更する spec。frontmatter は不変 —
  // FRONTMATTER_LOCKED は無変更で green のまま）。
  // intent-planner-packet-files (task 6) で Invariants 二層解消（Step 3: 普遍は compass 保持 +
  // steering 推奨提示の維持・packet 固有は packet ファイルの Safety / Invariants に直接起案で
  // compass には書かない、Success Criteria も追従）のため golden hash を正規更新
  // （frontmatter は不変 — FRONTMATTER_LOCKED は無変更で green のまま。diff review 済み）。
  // 出力可読性改善: intent-compass SKILL.md ×4 の Output Description を「今回避けるべき局所最適
  // （Anti-direction）を筆頭 → /intent-packets → 詳細」の結論筆頭構成へ書き直し、読み手・最初に
  // 掴ませることの2行を追加したため golden hash を正規更新（frontmatter は不変 — green のまま。
  // diff review 済み）。
  // intent-planner-compass-conformance (task 3.2) で intent-compass SKILL.md ×4 の本文に
  // 節更新日打刻手順を結線したため golden hash を正規更新: Step 3 末尾に当該節（Invariants /
  // Decision Rules）を更新したときのみ該当 `Updated (...)` 行を打刻する手順を追記（task 1.4）。
  // claude(ja/en) は frontmatter の allowed-tools に Bash も追加（FRONTMATTER_LOCKED でも正規更新）。
  // task 1.4 は独立レビューで APPROVED 済み。diff review 済み。
  // intent-planner-decision-propagation (task 2.5): packets/compass SKILL Step 1 に未確定動詞の
  // 変換案提示を最小追記（frontmatter 不変・FRONTMATTER_LOCKED 無変更で green）。
  // intent-planner-mode-scope (task 2.3, 2026-06-19): (A) 読み手スキル（compass/packets/export-cc-sdd
  //   ×claude/codex×ja/en）の mode 状態読み取り行を「`.intent/mode.local.md`（無ければ旧 `.intent/mode.md`）
  //   の mode 状態を読む」へ配線（DD2/INV18・後方互換 fallback）。Enforcement/Drift-watch を読む (B) 行は
  //   mode.md のまま据え置き（INV19・非改変）。frontmatter 不変・FRONTMATTER_LOCKED 無変更で green。
  //   この lock は「新モード追加では SKILL 本文不変」の恒久実証だが、mode-scope は新モード追加ではなく
  //   mode 状態の保存場所を変える機能 spec であり、drift-watch 等と同じ「機能 spec による正当な本文変更」前例に乗る。
  "templates/ja/claude/skills/intent-compass/SKILL.md":
    "7325b5bb0d019078fbb39b626be79e54e0f8406220372f8ddd5e74cd2856cb38",
  "templates/en/claude/skills/intent-compass/SKILL.md":
    "b397b2cb10f201d5aa9aaa93ad59bf1b6db6ebb4736fc460a9312e5edb14fce3",
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
  // intent-planner-elicitation (task 4.2) で Step 3 の invariant 反映導線を延長し、compass の
  // `## Open Questions` に「packet 固有制約（候補）」として保留された制約のうち当該 packet の
  // 作業範囲に合致するものを packet ファイルの Safety / Invariants へ転記し、転記済みエントリを
  // compass の Open Questions から除く手順を追加したため golden hash を正規更新（claude は
  // AskUserQuestion での確認。frontmatter は不変 — FRONTMATTER_LOCKED は無変更で green のまま）。
  // intent-planner-packet-progress (task 2.1 / 3.2) で intent-packets SKILL.md ×4 の本文に
  // 進行段階表現を結線したため golden hash を正規更新: Success Criteria の節列挙に Evidence を追加、
  // Step 3 の「frontmatter 9キー」数値表記を脱数値化（`packet-format.md` に従う）し、細分化 state
  // (5値域)・depends_on・`## Evidence` 節の宣言的記入手順と active→implementing / depends_on:[] の
  // 遅延補完案を追記、Step 4 の draft→active を draft→ready（後続で implementing/verifying/done）へ
  // 更新（frontmatter は不変 — FRONTMATTER_LOCKED は無変更で green のまま。diff review 済み）。
  // intent-planner-completeness-floor (task 4.1) で intent-packets SKILL.md ×4 の本文に
  // スロット播種・投与量仕分けを結線したため golden hash を正規更新: Success Criteria に
  // `## Decisions` 節と4ステータスで閉じる基準を追加、Step 3 に decision-slots.md の共通コア
  // 播種（mode 別差分加算・4ステータスで必ず閉じる・既定値を埋めない・推論しない・discover の
  // tree L3 posture 反映・既存節カバー分は閉じ先参照）と投与量仕分け（前倒し5基準→固定 / 可逆・
  // 局所・探索可→未定[再訪条件付き]・学習/リスク発見/テストオラクル形成の前倒し優先）を追記
  // （frontmatter は不変 — FRONTMATTER_LOCKED は無変更で green のまま。diff review 済み）。
  // intent-planner-completeness-floor (task 4.2) で intent-packets SKILL.md ×4 の Step 4 に
  // 分解の終端条件を結線したため golden hash を正規更新: Step 4 見出しに終端判定を加え、複合
  // 停止条件（①一packet一concern ②観測可能な受入基準 ③解法空間の境界明示 ④cheap-to-reverse
  // ⑤トレース先明確）・discriminative testability（誤実装を落とせるオラクルの床）・複数 concern /
  // 品質トレードオフをまたぐ packet の分割提案・how の完全指定をしない（what+constraints+oracle に
  // 留める）・既存粒度規律（behavior-preserving/testable/rollbackable, 3〜7）維持と「一packet一concern」
  // の終端判定への明示利用を追記（新規追記行は AskUserQuestion / Bash を含まないため claude と codex で
  // byte 等価。frontmatter は不変 — FRONTMATTER_LOCKED は無変更で green のまま。diff review 済み）。
  // 出力可読性改善: intent-packets SKILL.md ×4 の Output Description を「最初に着手すべき packet
  // （＝次に export すべき packet）→ /intent-export-cc-sdd → 詳細 → 移行レポート」の結論筆頭構成へ
  // 書き直し、読み手・最初に掴ませることの2行を追加したため golden hash を正規更新（frontmatter は
  // 不変 — green のまま。diff review 済み）。
  // intent-planner-compass-conformance (task 3.2) で intent-packets SKILL.md ×4 の本文に
  // updated_at 打刻手順を結線したため golden hash を正規更新: packet 新規作成時は `created_at` と
  // 同値・内容更新時はその時点を `updated_at`（11 キー目）に打刻し、内容変更を伴わない再実行では
  // 打刻しない（冪等）、日時取得不能時は推測の日付を書かず報告、という手順を追記（task 1.3）。
  // frontmatter は不変（claude は packet-files で既に Bash 許可済み・本 spec では body のみ変更）
  // — FRONTMATTER_LOCKED は無変更で green のまま。task 1.3 は独立レビューで APPROVED 済み。diff review 済み。
  // intent-planner-writeback-phase-boundary: intent-packets SKILL.md ×4 の Step 1 に「事後起草の判別
  // （実装が先行した場合）」を追記したため golden hash を正規更新: 対応 Packet 無しで実装が進んだ場合も
  // 通常の起草手順で事後 Packet を起こす・確定事実は what+constraints+oracle・未確定仕様は
  // Open Questions/Deferred の器へ・起草→writeback の順序を案内、という手順を追記。新規追記行は
  // AskUserQuestion / Bash を含まないため claude と codex で byte 等価。frontmatter は不変 —
  // FRONTMATTER_LOCKED は無変更で green のまま。diff review 済み。
  // 旧バージョン変換の削除 (version 0.10.0): intent-packets SKILL.md ×4 から Step 1.5（旧
  // `.intent/packets.md` を packets/ 配下へ移行する手順）・Output の移行レポート行・Safety の移行行を
  // 削除し、Bash / シェルコマンドの用途行から移行時の旧 packets.md 後始末への言及を除いたため golden
  // hash を正規更新（旧形式変換機能の撤去。Step 1→Step 2 が連続。frontmatter は不変。diff review 済み）。
  // intent-planner-decision-propagation (task 2.5): packets/compass SKILL Step 1 に未確定動詞の
  // 変換案提示を最小追記（frontmatter 不変・FRONTMATTER_LOCKED 無変更で green）。
  // export-route-add (task 1.1): Output Description の「次の一手」を cc-sdd 決め打ちから
  //   出口判定レーン（rules/export-route.md）参照の案件別分岐へ置換。本文のみ変更で SKILL_BODY hash を
  //   正規更新（frontmatter 不変・FRONTMATTER_LOCKED 無変更で green。diff review 済み）。
  "templates/ja/claude/skills/intent-packets/SKILL.md":
    "c9653a1ced3d44259c87937d8fda9e1fd621605b1d70a63601117b6d27fd617a",
  "templates/en/claude/skills/intent-packets/SKILL.md":
    "26c56f38871cb7124883d7b3316cd0814977267190c6ee3d2b32f7dc5ea60692",
  // intent-planner-drift-watch (task 2.2): codex 側も claude と同じ Step 3.5（地形診断・off ガード）+
  // Success Criteria 1行追加のため正規更新（本文は claude と byte 等価のまま）。
  // 出力可読性改善: codex 側も claude と同じ Output Description 結論筆頭化のため正規更新（本文は
  // claude と byte 等価のまま）。
  // intent-planner-context-cost-cues-wire (task 2.1, 2026-06-20): codex 側も claude と同じ
  //   Step 3.5 on-bullet 追記 + Core Mission success-criteria 追加のため正規更新（同言語内で本文一致）。
  // export-route-wire (task 1.1): codex 側も discover Step 1 に format 推奨→追認→記録を結線（claude と
  //   同内容・SKILL は agent 別可で AskUserQuestion 不使用の中立表現・SKILL_BODY hash 随伴・frontmatter 不変）。
  "templates/ja/codex/skills/intent-discover/SKILL.md":
    "0cf7b63ad369ba76db19d36a1f9ad050e4718a6f26c2d7411a56454d44581787",
  "templates/en/codex/skills/intent-discover/SKILL.md":
    "7411a88911fb03ba18e72f5cbf1126489617bbda83f7132b2adefbb586e7b05f",
  // intent-planner-review-adoption (task 1.2): codex 側も claude と同じ Step 3 置換のため正規更新。
  // intent-planner-packet-files (task 6): codex 側も claude と同じ Invariants 二層解消のため正規更新
  // （本文は claude と byte 等価のまま）。
  // 出力可読性改善: codex 側も claude と同じ Output Description 結論筆頭化（Anti-direction 筆頭）の
  // ため正規更新（本文は claude と byte 等価のまま）。
  // intent-planner-compass-conformance (task 3.2): codex 側も claude と同じ Step 3 末尾の節更新日
  // 打刻手順追記のため正規更新（Bash 利用は本文の自然言語表現＝シェルの date で担保し frontmatter は
  // 持たない codex 慣行を維持。frontmatter-lock 波及なし）。task 1.4 は独立レビューで APPROVED 済み。
  // intent-planner-decision-propagation (task 2.5): codex 側も claude と同じ Step 1 の未確定動詞
  // 変換案提示の最小追記のため正規更新（新規追記行は AskUserQuestion / Bash を含まないため claude と
  // byte 等価。frontmatter は不変・FRONTMATTER_LOCKED 無変更で green）。
  "templates/ja/codex/skills/intent-compass/SKILL.md":
    "c8c5bc1a156788fa291ddc0ee376b1d87e3c29388ef146376e15d00edc4c027b",
  "templates/en/codex/skills/intent-compass/SKILL.md":
    "43b179984be005b8e1ec2f50ef57587d282144116033797d8ad758da0d1feb42",
  // intent-planner-review-adoption (task 3.2): codex 側も claude と同じ Step 4 / Output 追記のため正規更新。
  // intent-planner-packet-files (task 3.1 / 3.2): codex 側も claude と同じ per-packet 構造改修・
  // Step 1.5 移行・Safety / Output 追記のため正規更新（確認は AskUserQuestion でなく自然言語確認、
  // Bash は frontmatter でなく本文のシェルコマンド用途限定という codex 慣行を維持）。
  // intent-planner-elicitation (task 4.2): codex 側も claude と同じ Step 3 の保留制約転記導線を
  // 追加したため正規更新（確認は AskUserQuestion でなく自然言語確認という codex 慣行を維持）。
  // intent-planner-packet-progress (task 2.1 / 3.2): codex 側も claude と同じ進行段階表現の結線
  // （Evidence 節列挙・9キー脱数値化・5値 state / depends_on / `## Evidence` 記入手順・遅延補完案・
  // draft→ready）のため正規更新（本文は claude と同等の自然言語表現。frontmatter は不変）。
  // intent-planner-completeness-floor (task 4.1): codex 側も claude と同じスロット播種・投与量
  // 仕分けの結線（`## Decisions` 節・4ステータスで閉じる・decision-slots.md 共通コア播種 + mode
  // 別差分・前倒し5基準の投与量仕分け）のため正規更新（新規追記行は AskUserQuestion / Bash を
  // 含まないため claude と byte 等価。frontmatter は不変）。
  // intent-planner-completeness-floor (task 4.2): codex 側も claude と同じ Step 4 の終端条件結線
  // （複合停止条件・discriminative testability・複数 concern/トレードオフをまたぐ packet の分割提案・
  // how の完全指定をしない・一packet一concern の終端判定利用）のため正規更新（新規追記行は
  // AskUserQuestion / Bash を含まないため claude と byte 等価。frontmatter は不変）。
  // 出力可読性改善: codex 側も claude と同じ Output Description 結論筆頭化（最初に着手すべき packet
  // 筆頭）のため正規更新（本文は claude と byte 等価のまま）。
  // intent-planner-compass-conformance (task 3.2): codex 側も claude と同じ updated_at 打刻手順
  // 追記のため正規更新（新規追記行は AskUserQuestion / Bash を含まず日時取得は本文のシェル date で
  // 担保するため claude と byte 等価。frontmatter は不変）。task 1.3 は独立レビューで APPROVED 済み。
  // intent-planner-writeback-phase-boundary: codex 側も claude と同じ Step 1 の「事後起草の判別」追記
  // のため正規更新（新規追記行は AskUserQuestion / Bash を含まないため claude と byte 等価。frontmatter は不変）。
  // 旧バージョン変換の削除 (version 0.10.0): codex 側も claude と同じ Step 1.5 移行手順・Output 移行
  // レポート行・Safety 移行行の削除、シェルコマンド用途行からの移行言及除去のため正規更新（旧形式変換
  // 機能の撤去。frontmatter は持たない codex 慣行を維持。diff review 済み）。
  // intent-planner-decision-propagation (task 2.5): codex 側も claude と同じ Step 1 の未確定動詞
  // 変換案提示の最小追記のため正規更新（新規追記行は AskUserQuestion / Bash を含まないため claude と
  // byte 等価。frontmatter は不変・FRONTMATTER_LOCKED 無変更で green）。
  // export-route-add (task 1.1): codex 側も同じ出口分岐への置換のため SKILL_BODY hash を正規更新
  //   （frontmatter 不変・FRONTMATTER_LOCKED 無変更で green。diff review 済み）。
  "templates/ja/codex/skills/intent-packets/SKILL.md":
    "02f7b25c0f729454df52186b6dbe90b2ec640c6f6c9776a341c2606e761230c8",
  "templates/en/codex/skills/intent-packets/SKILL.md":
    "5240dbc88a985074b9f9bab63df6aeb33db1efea3e25ec539f2dfbc102c1a121",
  // codex export SKILL.md (claude 側は INSTALLER_LOCKED_FILES で lock 済み)
  // intent-planner-enforcement (task 5.2) で Step 1.5 enforcement ゲート・判定行解釈規則・
  // export-log 追記・fail-open Safety を加えたため golden hash を更新（diff review 済み）。
  // intent-planner-review-adoption (task 5.2): codex 側も claude と同じ Step 1.7 配線・
  // Output / Safety 追記のため正規更新。
  // intent-planner-export-dirs (task 3): codex 側も claude と同じ Step 3/4 パス変更・
  // Step 1.8 追加・Output / Safety 追随のため正規更新（確認は AskUserQuestion でなく
  // 自然言語確認という codex 慣行を維持）。
  // intent-planner-packet-files (task 7): codex 側も claude と同じ Step 1 の index 経由
  // 選択読み込み + draft ガード・Step 2 入力範囲・Output / Safety 追随のため正規更新
  // （draft ガードの確認は AskUserQuestion でなく自然言語確認という codex 慣行を維持）。
  // intent-planner-drift-watch (task 7.2): codex 側も claude と同じ Step 1.6（drift 照合・off ガード・3関所順序 1.5→1.6→1.7・停止しない）挿入のため正規更新（本文は claude と byte 等価のまま。frontmatter は不変）。
  // intent-planner-writeback-phase-boundary: codex 側も claude と同じ Step 4 末尾の「戻り先の明示」1行・Output の戻り先案内1行を追加したため正規更新（起草/writeback フェーズ境界の明示。diff review 済み）。
  // 旧バージョン変換の削除 (version 0.10.0): codex 側も claude と同じ Step 1.8（旧単一スロット形式の
  // cc-sdd 下書き移行）・関連 Output / Safety 行の削除のため正規更新（旧形式変換機能の撤去。diff review 済み）。
  // export-route-add (task 2.1): codex 側も claude と同じ Step 1.8 cc-sdd 前提 preflight warn の
  //   追加のため SKILL_BODY hash を正規更新（warn のみ・停止しない・DR25。frontmatter 不変。diff review 済み。
  //   旧 version 0.10.0 の Step 1.8〔旧形式変換〕は別物で既に撤去済み）。
  "templates/ja/codex/skills/intent-export-cc-sdd/SKILL.md":
    "8544e8dbc3395d127760d7d952e8573853b10231d612e13b23137e13d64c4d35",
  "templates/en/codex/skills/intent-export-cc-sdd/SKILL.md":
    "672bb67c897f8d48c03dfa5a01d0169d530ec5f4846931a433d3a85443491c8a",
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
