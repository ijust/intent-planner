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
  // intent-planner-packet-files (task 7) で Step 1 を index.md 経由の候補提示 + 確定した対象
  // packet ファイルのみ読む方式へ変更（index 不在は active/ から直接構成 + 再生成案内・
  // packets/ 不在は停止案内・draft ガード: 利用者確認のうえ active 化 + index 再生成）、
  // Step 2 の入力範囲を「対象 packet ファイル + compass のプロジェクト普遍 Invariants/
  // Anti-direction」へ更新、Output / Safety を追随させたため golden hash を再更新
  // （Step 1.5/1.7/1.8・Step 3/4・frontmatter は不変。diff review 済み）。
  // intent-planner-drift-watch (task 7.2): export SKILL.md に Step 1.6（drift 照合・off ガード・3関所順序 1.5→1.6→1.7・停止しない）を挿入したため golden hash を正規更新（drift-watch=off で現行動作とバイト等価。task 8 で off 時バイト等価を別途固定。frontmatter は不変）。
  "templates/ja/claude/skills/intent-export-cc-sdd/SKILL.md":
    "5cd610de95a0f023687a6ba27368258ca7abc43f6452a72526dabc8de1fb8706",
  "templates/en/claude/skills/intent-export-cc-sdd/SKILL.md":
    "7134ddbfcc1d72edaba48a3e3e1b31f8c54a0cc32152e82dc289741f5147a9bb",
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
  "src/install.mjs":
    "71d1f3c8853247f02a846e9640d7bbcfc41425abf5cd53fcb9da2c1d326d947c",
  // intent-planner-export-dirs (task 5.2) で正規更新: gitignore 結果表示 (作成 / 追記 /
  // 変更なし=整備済み / スキップの 4 アクション告知) と追跡解除案内
  // intent-planner-safe-upgrade で正規更新: update を既定 ON (--no-update で旧来の全スキップ)。
  //   配置を「新規配置 / 更新 (既存上書き・.bak退避) / スキップ (user-data保護 / 共有尊重 /
  //   既に最新)」に分けて告知。ヘルプに安全バージョンアップ節を追加。
  //   レビュー反映: 「既に最新」スキップ群に説明行を追加。
  "bin/cli.mjs":
    "0bb6cee4fcb49353d785ce86dce0cf086c4155f65dd95ec3153e4815921f5dc6",
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
  "templates/ja/claude/skills/intent-discover/SKILL.md":
    "d23a8b9d0f45a6422a9250e6636fa428f068edd845f810e251a634b29b73237d",
  "templates/en/claude/skills/intent-discover/SKILL.md":
    "1905bba1d340883734afd7fc99f38e7961b577b8c10414184c6b01e966566b16",
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
  // intent-planner-elicitation (task 4.2) で Step 3 の invariant 反映導線を延長し、compass の
  // `## Open Questions` に「packet 固有制約（候補）」として保留された制約のうち当該 packet の
  // 作業範囲に合致するものを packet ファイルの Safety / Invariants へ転記し、転記済みエントリを
  // compass の Open Questions から除く手順を追加したため golden hash を正規更新（claude は
  // AskUserQuestion での確認。frontmatter は不変 — FRONTMATTER_LOCKED は無変更で green のまま）。
  "templates/ja/claude/skills/intent-packets/SKILL.md":
    "f5d4f09afab8d0aacdaf622c3dbbdadef61c780e7802a296100eecc8bb987238",
  "templates/en/claude/skills/intent-packets/SKILL.md":
    "e2eb388358422759634fe1e2cbde2274ec1d8ec4a8221b5ad584c3ef49c51cc1",
  // intent-planner-drift-watch (task 2.2): codex 側も claude と同じ Step 3.5（地形診断・off ガード）+
  // Success Criteria 1行追加のため正規更新（本文は claude と byte 等価のまま）。
  "templates/ja/codex/skills/intent-discover/SKILL.md":
    "4b41e96c76796d2f8bbbe6aa86f0e16cc6aee80dc6ce7b28d19eba98530b7107",
  "templates/en/codex/skills/intent-discover/SKILL.md":
    "30f43c8da750202bd9610fe0e85aa7165946598e687341b267dd465621b33808",
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
  // intent-planner-elicitation (task 4.2): codex 側も claude と同じ Step 3 の保留制約転記導線を
  // 追加したため正規更新（確認は AskUserQuestion でなく自然言語確認という codex 慣行を維持）。
  "templates/ja/codex/skills/intent-packets/SKILL.md":
    "286acad699b81cda0044df6bc2b1db8a3a39e2ccf206cebf028439ce673f29c4",
  "templates/en/codex/skills/intent-packets/SKILL.md":
    "f62e679f9f85dcfa4dc905eedf2bc59c9d472114ac603b8d6c66951ec6fd423b",
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
  "templates/ja/codex/skills/intent-export-cc-sdd/SKILL.md":
    "8fc1bb677f08802c2618cf0ae7fe17660c16fa22410a831ff465ea17686963bb",
  "templates/en/codex/skills/intent-export-cc-sdd/SKILL.md":
    "87ca0f95a0c92a6981faaa4adb3bdee8e1a4280d27fc0ac114f3a506d9f2baf1",
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
