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
  // packet-slicing-by-scope (task 2.4) で正規更新: packet 数文言「3〜7 個」を
  // 「規模に応じて可変・数合わせをしない（1〜7 緩い目安）」へ置換（アルゴリズム表・他の本文は不変）。
  "templates/ja/intent/modes/standard.md":
    "4969ed95078bf865bfc5bba14f5e448e45dbbb4daf204fa283915e01458e1cf0",
  "templates/en/intent/modes/standard.md":
    "11a4d345be93ab53f450912a8c2833b9d5a19d532ba53d8bd275cd27482ed50e",
  // 既存 algo rules (ja/en): algo-gore-lite / algo-qoc / algo-example-mapping / map-cc-sdd
  // corrective-intent (pkt②, 2026-06-29) で正規更新: algo-gore-lite に「結論に根拠を併走させる」
  //   read-only promptlet を追加（L3 ステップに rationale 併走サブ項目・規律に「結論と根拠を分けて
  //   持つ（訂正可能性）」を追加）。結論だけ残し根拠を捨てると後から否定する事実が来ても訂正できない
  //   （brittle memory）ため、根拠を既存構造（本文の意図記述/Assumptions/Open Questions）へ併走させ、
  //   辿れないものは Open Questions へ逃がす。新必須フィールドは設けず（OQ-CI1=B+ハイブリッド）、
  //   AI が根拠を捏造して結論を後付け正当化しない。本 spec が algo-gore-lite を正当に変更する spec。
  //   codex/dogfood 側は agent-rules-parity の byte 等価で追随。diff review 済み。
  "templates/ja/claude/skills/intent-discover/rules/algo-gore-lite.md":
    "27b898efbcb02752cb55cd866f6ba54c70d384257b3e69fb8fc6e977b5d1b960",
  "templates/en/claude/skills/intent-discover/rules/algo-gore-lite.md":
    "f5f623fa0298659f3bca52761053fcd763c597b2c63ccad7360edd2237a58fb3",
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
  // question-lanes-deep (pkt-20260704-question-lanes-deep-2pk0, A46/DR86/INV58, 2026-07-04) で正規更新:
  //   Anti-direction 手順3（プレモータム）に「深掘りの問いレーン（question-depth=deep のときだけ発火・
  //   プレモータム/影響リストを利用者への問いとして向ける・歯止め INV58・値を先に置かない・A30
  //   decision-probe とレーン分離）」を1つ追記。standard/未記載/off では発火せず既定挙動は不変（後方互換）。
  //   codex 側は agent-rules-parity の byte 等価で追随。
  "templates/ja/claude/skills/intent-compass/rules/algo-qoc.md":
    "537d7c615fa6bc377a9861697cfa91e0a5224db0d1fb325cc6f41ac45315776e",
  "templates/en/claude/skills/intent-compass/rules/algo-qoc.md":
    "07d159ed80710d5f3a7f2f580b66393d2f5897a02bb0c35833a0c6ff29c5bbb5",
  // intent-planner-packet-files (task 4) で正規更新: 出力先言及を「packets.md の更新案」から
  // 「packet ファイル（active/ 配下）の更新案」へ、Deferred 節の所在を plan.md へ文言追従
  // （アルゴリズム本体は不変。codex 側は agent-rules-parity の byte 等価で追随）。
  // packet-slicing-by-scope (task 2.3) で正規更新: packet 数文言「3〜7 個に収める」を
  // 「数は規模に応じて可変・数合わせをしない（1〜7 緩い目安）」へ置換（slicing 切り口は不変）。
  "templates/ja/claude/skills/intent-packets/rules/algo-example-mapping.md":
    "ee331be08333c9ce1ac12f99315d04733d034783e877876ccaa29f1a93b5b490",
  "templates/en/claude/skills/intent-packets/rules/algo-example-mapping.md":
    "266add5a98d9e16851f0662b581fc2ca7cbcae6813f4a31a0552553041d19f57",
  // intent-planner-export-dirs (task 1) で正規更新: 出力3パスを `.intent/cc-sdd/<スラッグ>/` 配下へ
  // 変更し、スラッグ規則（決定的正規化）・衝突規則・requirements 下書きの必須見出し
  // (Source Packet / Parent Intent / Invariants) を出力契約として明文化（本 spec が map-cc-sdd.md を
  // 正当に変更する spec。codex 側は agent-rules-parity の byte 等価で追随）。
  // intent-planner-required-how (task 2.1) で正規更新: design ヒント節 (`### …/design.md`) の
  // 観点リストに技術制約転記を追加し、由来に compass の技術制約 Invariant を明示追加（skill 全体の
  // 入力範囲は不変。design ヒント節の由来契約のみ拡張）。codex 側は agent-rules-parity の byte 等価で追随。
  // export-starter-attach (pkt-20260704-export-starter-attach-y2kt, A40/DR83 宿主②/DR85, 2026-07-04) で
  //   正規更新: requirements.md 末尾に「関係定石（候補・未採用）」の任意独立節を追加（参照方式・全文転記
  //   しない・採用済み/否認済みは器を読んで載せない・合致ゼロなら節ごと省略＝任意で後方互換）。既存の
  //   requirements/design/tasks 下書き生成の契約は不変（additive な任意節の追加のみ）。openspec/speckit の
  //   map ルールにも同型節を足したが両者は非ロック。codex 側は agent-rules-parity の byte 等価で追随。
  "templates/ja/claude/skills/intent-export-cc-sdd/rules/map-cc-sdd.md":
    "81e1030a8a5df4ae29aaac0b72711d866249eae9ea9e38923aea7cca2412371e",
  "templates/en/claude/skills/intent-export-cc-sdd/rules/map-cc-sdd.md":
    "dadc784b1b8de7e60d114e7cece70c5b9ce595e8f1dac594dfd07e5fcc28a6a4",
  // ---- intent-planner-feature-growth (Req 5.2 / 7.2) で追加: 既存モード定義 (ja/en) ----
  // 用語の未説明初出の解消で正規更新: Mikado pre-pass に手法の一行説明を追加（モード戦略は不変）。
  // packet-slicing-by-scope (task 2.4) で正規更新: packet 数文言「3〜7 個」を
  // 「規模に応じて可変・数合わせをしない（1〜7 緩い目安）」へ置換（モード戦略は不変）。
  "templates/ja/intent/modes/refactor.md":
    "76a620170829b4834e1af67be195709821364cfe042b14cab7414ffe4cf1cf08",
  "templates/en/intent/modes/refactor.md":
    "0b854360cf751827aa8cd18b574338f41e3346a6f110e7e49dee35fe6c179a79",
  // intent-planner-packet-files (task 8) で正規更新: Deferred 節の記録先言及を
  // `packets.md` から `.intent/packets/plan.md` へ文言追従（アルゴリズム表・他の本文は不変）。
  // packet-slicing-by-scope (task 2.4) で正規更新: packet 数文言「3〜7 個」を
  // 「規模に応じて可変・数合わせをしない（1〜7 緩い目安）」へ置換（モード戦略は不変）。
  "templates/ja/intent/modes/behavior-unknown.md":
    "5e71c045c8a80b162f97312bdc2fcf76385fd9f36c550ec466d99b7dcedf501c",
  "templates/en/intent/modes/behavior-unknown.md":
    "f8f61678bfcb812a32de2acca42b98ba221642f9f1b8eb695af5fef859650991",
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
  // packet-slicing-by-scope (task 2.3) で正規更新: packet 数文言「3〜7 個に収める」を
  // 「数は規模に応じて可変・数合わせをしない（1〜7 緩い目安）」へ置換（slicing 切り口は不変）。
  "templates/ja/claude/skills/intent-packets/rules/algo-migration-slicing.md":
    "ac8ac92be3fc6b3e290a33f3ce4c15652d56e909c0b324a2ebf28a0bc9b5a6b2",
  "templates/en/claude/skills/intent-packets/rules/algo-migration-slicing.md":
    "845d5d020b38da34ace6cd92442b86d742a9d566076ef5afb1240e653159470e",
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
  // intent-db-design-seam (task 4.1): 新スキル intent-db-design の frontmatter（4系統）を正規登録。
  //   claude 側は name/description/allowed-tools(Read,Glob,Grep,Write,AskUserQuestion)/argument-hint、
  //   codex 側は最小 frontmatter（allowed-tools/argument-hint 無し＝A25）。意図しない変更から保護する。
  "templates/ja/claude/skills/intent-db-design/SKILL.md":
    "cdbd3c14431c1e03d6b46cfddd1bd5aaff2546f773b3e35318fee696d4bdba43",
  "templates/en/claude/skills/intent-db-design/SKILL.md":
    "47c092b46ec03ac2fa5afb4cbb6f979a83f75eb617d1319fdeb3c5268b3ede59",
  "templates/ja/codex/skills/intent-db-design/SKILL.md":
    "6f48b813e18c1fe1e872c51d9717214d791e1720b34c0afac19321576e7bd869",
  "templates/en/codex/skills/intent-db-design/SKILL.md":
    "6317cc69957e52d839ace62ea381fdcbc63530ca9e23737d58d8b4dd9256c21f",
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
  // append-log-discipline-add (task 2.3, 2026-06-22): export SKILL.md の Step 3 export-log 追記を
  //   「packet 単位分割ファイル `export-log/<packet-slug>.md` へ書く + 旧 export-log.md を exported_at 昇順
  //   連結の生成 active ミラーとして再生成する」へ作り替えたため INSTALLER golden hash を正規更新
  //   （CONTRACT 分割・archive 規約の export-log への適用。記録の中身=列は不変・frontmatter 不変。diff review 済み）。
  "templates/ja/claude/skills/intent-export-cc-sdd/SKILL.md":
    "4758bf22721e23565f4180acc4d86f7b3f6b935a65d2203c414e3affb0576698",
  "templates/en/claude/skills/intent-export-cc-sdd/SKILL.md":
    "9c3086eec168dbbc19d1282ef47ad310e4ebf4bc94e3cc8a26f329948ce6b3c7",
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
  // gemini-cli-support (task 1.1, 2026-06-22) で正規更新: AGENT_REGISTRY に gemini エントリを1件追加
  //   （agentName=gemini, skillSubdir=codex 共有, skillDest=.agents/skills, rootDoc=GEMINI.md）。
  //   computeCopyPlan の汎用 rootDoc 分岐をそのまま使い、agent 名で分岐するロジックは足していない
  //   （INV26/DR34・本 spec が install.mjs を正当に変更する spec）。claude/codex 既定の配置結果は byte 不変。
  //   skillSubdir は codex 共有で確定済み（task 3.2・実機 smoke 済み。当初の「暫定」表現は 2026-06-28 に追従更新）。diff review 済み。
  // gemini-cli-support (task 3.1, 2026-06-22) で再更新: SHARED_RELATIVES に "GEMINI.md" を1件追加。
  //   AGENTS.md / CLAUDE.md と同性質（リポジトリ直下でユーザーが追記しうる）として update 時に既存を
  //   上書きせず SKIP で保護する（INV12 の gemini 版実装担保）。既存集合へのデータ行加算のみで配置
  //   ロジック・分類関数は不変（INV2/INV3 非破壊）。diff review 済み。
  // shared-rootdoc-append (pkt-20260624-shared-rootdoc-append-hri5, 2026-06-24) で正規更新:
  //   既存ルート文書 (CLAUDE.md/AGENTS.md/GEMINI.md) があると decideAction が shared+既存→SKIP で
  //   quickstart が一度も届かない欠陥を、planGitignore/applyGitignore 同型の append/参照レーン
  //   (planRootDoc/applyRootDoc/makeRootDocConfirm) として install 側に外付けして修正する (INV33/DR51)。
  //   AGENT_REGISTRY に rootDocImport フラグを1キー追加 (claude/gemini=true=A2 参照・codex=false=A1 append)。
  //   既存本文は1バイト不変・参照行/セクション既在で冪等 SKIP・ユーザー資産への書込は y/n 確認 (非対話は
  //   既定スキップ＋案内・--yes で前渡し)。SHARED 核 (shared+既存→SKIP)・新規 COPY・既存返り値キーは不変、
  //   rootDoc キーを加えるのみ (INV33・INV3 非破壊)。diff review 済み。
  // intent-db-design-seam (task 1.2) で正規更新: GITIGNORE_PATTERNS に db-design 派生領域の
  //   Git 非追跡化のため `.intent/db-design/*` と `!.intent/db-design/README.md` の 2 パターンを
  //   nl-spec ブロック直後・release-note の前に追記（nl-spec/overview/spec-ingest と同型のデータ行
  //   追加のみ・新規ロジックなし。design Modified Files で明示的に追記が許可された変更。diff review 済み）。
  // coinage-discipline writeback の付随整理 (2026-06-28): AGENT_REGISTRY の gemini エントリの
  //   コメントを「skillSubdir は暫定で codex 共有・実機 smoke の結果で task 3.2 が最終確定する」から
  //   「codex 共有で確定済み（task 3.2・実機 smoke で gemini CLI v0.24.0 が読むことを確証）」へ更新したため
  //   golden hash を正規更新。コメントのみの変更で AGENT_REGISTRY の値・配置ロジックは不変（skillSubdir:
  //   "codex" のまま）。gemini-cli-support の確定実態にコメントを追従させた文言整理。diff review 済み。
  // canonical-slimming (pkt-20260629-slim-history-archive-7lin, 2026-06-29) で正規更新:
  //   USER_DATA_RELATIVES に履歴退避先 2 ファイル `.intent/intent-tree.history.md` と
  //   `.intent/compass-history.md` を追加（DR64・完結機能の履歴を本体から move する退避先で、履歴を
  //   貯めるため user-data 分類＝upgrade で上書きしない）。既存分類セットへのデータ行加算のみで配置
  //   ロジック・分類関数は不変（INV2/INV3 非破壊・scaffold 配布は planTree の recursive walk で自動配布）。
  //   compass-archive.md（superseded DR 専用）とは別ファイル。diff review 済み。
  // mode-local-concurrent-conflict (pkt-20260630-mode-local-session-scope-seam-vjzv, 2026-06-30) で正規更新:
  //   mode 状態の同マシン並行衝突（A34）を packet 同型の発行ディレクトリで塞ぐため、(1) GITIGNORE_PATTERNS
  //   に `.intent/discovery/*` と `!.intent/discovery/README.md` の 2 パターンを mode.local.md 行直後に
  //   追加（発行ディレクトリ `.intent/discovery/<スラッグ>-<rand>/` を非追跡化・README は追跡。cc-sdd/
  //   overview 等と同型のデータ行追加）、(2) USER_DATA_RELATIVES に `.intent/discovery/README.md` を追加
  //   （upgrade で上書きしない・コンテナ説明）。既存セットへのデータ行加算のみで配置ロジック・分類関数は
  //   不変（INV2/INV3 非破壊・scaffold 配布は recursive walk で自動配布）。diff review 済み。
  // install-path-defects (pkt-20260704-force-update-trap-pphb, A45/INV56/DR82, 2026-07-04) で正規更新:
  //   (1) 安全な更新経路 --update-shared を additive に追加 — decideAction / isIdenticalIfRelevant /
  //   planFile / planTree / computeCopyPlan / install に updateShared（既定 false）を通し、
  //   shared 分類のみ「一致→SKIP・不一致→COPY+.bak 退避」。user-data はこのフラグでも COPY にならず、
  //   既定 false のとき全経路が従来とバイト等価（既存分岐・分類集合の意味は不変＝Anti-direction 271）。
  //   (2) makeForceOverwriteConfirm を新設 — --force の実行前確認（対話のみ確認・非対話は明示＝同意で
  //   従来どおり実行＝CI 互換・readLine 注入可）。(3) updateShared がルート文書を配布版へ上書きする
  //   ときは追記/参照レーンを通さない（重ね書き防止・force 経路は非接触）。diff review 済み。
  // install-path-defects (pkt-20260704-english-install-path-q8qx, A45/DR82, 2026-07-04) で正規更新:
  //   確認プロンプト2種（makeForceOverwriteConfirm / makeRootDocConfirm）に表示文言の差し替え口
  //   （prompt / promptFor・省略時は従来の日本語文言）を追加。cli が --lang 連動の主要メッセージを
  //   渡すための注入口のみで、同意判定 (y/N)・非対話時の既定・配置ロジックは不変。diff review 済み。
  "src/install.mjs":
    "54a15931c015170f961547bba8bdc9b1d9176232d10d4f04889d1b705b900ff4",
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
  // gemini-cli-support (task 3.3, 2026-06-22) で正規更新: 配置後告知を AGENT_REGISTRY 駆動へ一般化
  //   （codex 専用分岐を廃し、skillDest と rootDoc を registry から引いて告知する）。これにより gemini
  //   が `.agents/skills` + GEMINI.md を実態どおり告知し、claude も rootDoc=CLAUDE.md を告知する
  //   （agent 名で分岐するロジックを増やさない＝INV26/DR34）。ヘルプの --agent 対応列挙に gemini を
  //   追加し、配置されるもの節に CLAUDE.md / GEMINI.md を反映。出力文言と告知の一般化のみ・配置
  //   ロジックは install.mjs 側で不変。diff review 済み。
  // shared-rootdoc-append (pkt-20260624-shared-rootdoc-append-hri5, 2026-06-24) で正規更新:
  //   既存ルート文書への append/参照レーンの cli 結線。makeRootDocConfirm を import し、--yes / isTTY を
  //   見て confirmRootDoc を install へ渡す。配置後告知に rootDoc アクション (create/reference/append/none/
  //   skipped-no-tty/skipped-no-doc) の各文言を追加し、追記/参照していないのに「配置しました」と言わない。
  //   出力文言と confirm 結線のみ・配置ロジックは install.mjs 側 (INV33)。diff review 済み。
  // github-star-cta (2026-06-26) で正規更新: 正常完了の最終出力 (次のステップ案内) の直後に、
  //   GitHub スターを促す CTA を追加。TTY のときだけ ANSI 色 (yellow/cyan) を付け、パイプ/リダイレクト
  //   先には生エスケープを混ぜない。--help / エラーの早期 return には出ない（正常完了時のみ）。
  //   出力文言の追加のみ・配置ロジックは不変。diff review 済み。
  // star-cta-dry-run-guard (2026-06-28) で正規更新: dry-run は「書き込みしないプレビュー」なので
  //   スター CTA を出さないよう `if (!opts.dryRun)` でガード（旧コメントの「dry-run の早期 return には
  //   出ない」は事実誤認で、dry-run は早期 return せず CTA が出ていた＝それを実態として抑止）。
  //   --help / エラーは従来どおり早期 return で出ない。出力条件の調整のみ・配置ロジックは不変。diff review 済み。
  // install-path-defects (pkt-20260704-force-update-trap-pphb, A45/INV56/DR82, 2026-07-04) で正規更新:
  //   (1) --update-shared フラグを追加（parseArgs・install への配線・ヘルプ）。(2) --force の実行前確認を
  //   結線 — 対話環境では「何が失われるか」を明示して y/N を取り、拒否なら何も書かず中止。非対話では
  //   従来どおり確認なしで実行（CI 互換・--yes で前渡し可・dry-run は書き込まないため確認しない）。
  //   (3) 共有ファイルのスキップ告知を安全な経路へ向け直し — 「最新版へ更新するには --force」をやめ、
  //   --update-shared（.bak 退避付き）を案内（INV56: 危険側の操作を正規の更新経路として案内しない）。
  //   (4) --update-shared で上書き更新対象が無いときは「対象なし」を告知。出力文言とフラグ結線のみ・
  //   配置ロジックは install.mjs 側。diff review 済み。
  // install-path-defects (pkt-20260704-english-install-path-q8qx, A45/DR82, 2026-07-04) で正規更新:
  //   主要メッセージ（--help・インストール結果の告知・次のステップ・警告・確認プロンプト）を
  //   ja/en のメッセージカタログ（MSG_JA / MSG_EN・静的文字列のみ＝INV3 依存ゼロ）へ再編し、
  //   --lang 連動で英語を出せるようにした（対応外 lang は resolveLangRoot と同じく ja へ）。
  //   --lang ja / 未指定の全出力は従来とバイト等価（fresh/update/dry-run/help/update-shared/
  //   fallback の6系統スナップショット比較で確認）。エラーメッセージは対象外（④-3 の範囲は主要まで）。
  //   出力文言の再編のみ・配置ロジックは install.mjs 側。diff review 済み。
  // install-output-summary (pkt-20260704-install-output-next-action-ufz4, A45 系統, 2026-07-05) で正規更新:
  //   既定のインストール出力をカテゴリ別件数サマリへ変更し、ファイル1件ずつの列挙は --verbose へ退避
  //   （--dry-run は確認用途のため従来どおり全列挙）。末尾に agent 別の具体的な次アクションブロック
  //   （使うツールを開いて /intent-discover と打つ）を置き、従来の「次のステップ」1行を置き換えた。
  //   警告・データ保護/共有の注記文は既定でも全文のまま（安全側・畳むのはファイル列挙だけ）。
  //   --verbose フラグの追加（parseArgs・ヘルプ ja/en）と出力文言の再編のみ・配置ロジックは install.mjs 側。
  "bin/cli.mjs":
    "80eb8b36fd09d953998b761fd7c94e89e1ef0ae7d3f653a59ee1dbd376cf1cfe",
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
  // intent-planner-design-doc-vocabulary (task 2.1): discover SKILL 本文の比喩語
  //   「地形診断」→「逸脱しやすい場面の事前チェック」/「気づき口調」→「指図せず気づかせる言い方」
  //   （en: Terrain Diagnosis→Drift-Prone-Situation Pre-Check / noticing tone→non-directive, noticing way）
  //   の言い換えのため SKILL_BODY hash を正規更新。識別子（drift-watch・drift-terrain.md・# Drift Terrain 見出し）
  //   は不変。frontmatter 不変。挙動不変の wording 改修（DR45/DR46/INV30）。diff review 済み。
  // writeback-target-by-route (A25, 2026-06-26): discover Step 1 の target format 追認に値域
  //   `direct`（ツール不使用の直接実装）を1値追加したため SKILL_BODY hash を正規更新（出口4値化・
  //   DR53/INV34。frontmatter 不変。挙動拡張＝format 値域の追加。diff review 済み）。
  // mode-local-concurrent-conflict (pkt-20260630-mode-local-session-scope-seam-vjzv, 2026-06-30) で
  //   discover/compass/packets/export-cc-sdd（×ja/en×claude/codex）の SKILL_BODY hash と export-cc-sdd
  //   claude の installer-lock hash を正規更新: mode 状態の同マシン並行衝突（A34）を packet 同型の発行
  //   ディレクトリ `.intent/discovery/<スラッグ>-<rand>/mode.md` で塞ぐため、(1) discover の記録ステップを
  //   「発行ディレクトリを作り mode.md に記録・発行名を Output で明示」へ、(2) 読み手（compass/packets/
  //   export 系/status/improve/validate）の mode 状態読み取り行を「引き継がれた発行ディレクトリの mode.md
  //   → 無ければ単一 mode.local.md（legacy）→ 旧 mode.md → standard」の read fallback へ配線（INV41/INV18・
  //   CONTRACT.md が正本）。読み取りの最終段（mode.md → standard）・不在フォールバック・Enforcement/
  //   Drift-watch の据え置きは不変（後方互換）。frontmatter は不変。drift-watch/mode-scope と同じ「機能 spec
  //   による正当な本文変更」前例に乗る。status/improve/validate/export-openspec は SKILL_BODY 非ロックゆえ
  //   本文配線のみで golden 随伴なし。diff review 済み。
  // discover-starters-always (pkt-20260704-discover-starters-always-9woc, A40/DR83 宿主④, 2026-07-04) で
  //   discover SKILL.md ×4 の Step 3.5 に「定石の叩き台照合だけは drift-watch の値に関わらず常時行う」1文を
  //   追記したため SKILL_BODY hash を正規更新。逸脱チェック（drift-patterns 照合）とコンテキストコストの
  //   気づきは従来どおり on 限定で不変（常時化するのは定石照合だけ）。drift-watch=off 環境でも定石照合が
  //   走るようになる挙動拡張＝現行の on 環境の挙動は不変（定石照合が常時側へ移るだけで二重照合しない）。
  //   frontmatter は不変。diff review 済み。
  "templates/ja/claude/skills/intent-discover/SKILL.md":
    "67d12b3f160b2ef57b6e46dc1b925ec0dc269d0347e90a985dec58671c66f53a",
  "templates/en/claude/skills/intent-discover/SKILL.md":
    "7fb926b35ac5ff8445b8e5b8a0346a59f5f9c32596f5087cdf46728b1ad3906e",
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
  // intent-planner-constraint-starters-add (task 2.1, 2026-06-21) で正規更新: Step 3 冒頭に
  //   「導出の前段で `rules/constraint-surfacing.md` を読み適用（叩き台候補を read-only 提示・自動転記しない・
  //   既存導出を置き換えない・カタログ不在なら沈黙）」の薄い1行参照を追記。提示ロジック本体は新 rule に局所化し
  //   algo-qoc.md（byte-lock）は不変。drift-watch 等と同じ「機能 spec による正当な本文変更」前例に乗る。
  "templates/ja/claude/skills/intent-compass/SKILL.md":
    "49e16d73e7b1838a19057f60bf3c93e360b3e393c71c79a0a087c83ffe43bece",
  "templates/en/claude/skills/intent-compass/SKILL.md":
    "e672fbf3539a035679f99f24e2467375ab4d7803893eef35d3b5a52f45d6ab66",
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
  // packet-slicing-by-scope (task 2.1, 2.2): Step 4 終端判定を5→6条件にし⑥単体完結（half-done な done を
  //   作らない・④rollbackable とは別の独立条件）を追記、Success Criteria / Step 3 / Output の「3〜7」数文言を
  //   「規模に応じて可変・数合わせをしない（1〜7 緩い目安）・質的に測る」へ置換。本文のみ変更で SKILL_BODY hash を
  //   正規更新（frontmatter 不変・FRONTMATTER_LOCKED 無変更で green。diff review 済み）。
  // decision-probe-packets (A30): 投与量の仕分けブロックの直後（state 行の前）に rules/decision-probe.md を
  //   読み適用する1行を結線（意図版 Self-Probing＝load-bearing な決定地点で仮説を .intent/ の証拠で裁き
  //   read-only で名指し・絞り込みゲート・warn-only）。本文のみ変更で SKILL_BODY hash を正規更新
  //   （frontmatter 不変・FRONTMATTER_LOCKED 無変更で green。diff review 済み）。
  "templates/ja/claude/skills/intent-packets/SKILL.md":
    "11a763947b93c1276af57ae61ca2a7e257ac249a99d32e96a76b144ed75cf6a7",
  "templates/en/claude/skills/intent-packets/SKILL.md":
    "c7a7403df36c2f7b64d15b3d44e1b4844f9a4c0fd266a5809cef337ee65dfe1f",
  // intent-planner-drift-watch (task 2.2): codex 側も claude と同じ Step 3.5（地形診断・off ガード）+
  // Success Criteria 1行追加のため正規更新（本文は claude と byte 等価のまま）。
  // 出力可読性改善: codex 側も claude と同じ Output Description 結論筆頭化のため正規更新（本文は
  // claude と byte 等価のまま）。
  // intent-planner-context-cost-cues-wire (task 2.1, 2026-06-20): codex 側も claude と同じ
  //   Step 3.5 on-bullet 追記 + Core Mission success-criteria 追加のため正規更新（同言語内で本文一致）。
  // export-route-wire (task 1.1): codex 側も discover Step 1 に format 推奨→追認→記録を結線（claude と
  //   同内容・SKILL は agent 別可で AskUserQuestion 不使用の中立表現・SKILL_BODY hash 随伴・frontmatter 不変）。
  // intent-planner-design-doc-vocabulary (task 2.1): codex 側も claude と同じ discover SKILL 本文の
  //   比喩語言い換え（地形診断/気づき口調 → 普通の記述語）のため SKILL_BODY hash を正規更新。
  //   識別子・frontmatter 不変。挙動不変の wording 改修。diff review 済み。
  // writeback-target-by-route (A25, 2026-06-26): codex 側も claude と同じ discover Step 1 の
  //   target format 追認への値域 `direct` 追加のため SKILL_BODY hash を正規更新（同言語内で本文一致・
  //   frontmatter 不変・DR53/INV34。diff review 済み）。
  // discover-starters-always (2026-07-04): codex 側も claude と同じ Step 3.5 常時照合1文を追記のため
  //   正規更新（codex は frontmatter 薄型 + AskUserQuestion→自然言語問い の置換ゆえ claude と別 hash）。
  "templates/ja/codex/skills/intent-discover/SKILL.md":
    "a0fc2d0ab399a8277c09b94ea149ab24f4e3b19034cc104e40afa50aaf58c7e4",
  "templates/en/codex/skills/intent-discover/SKILL.md":
    "c04ad1c3b5e4c4f75ebe58fd7561b44e83c3cca6f55e908e5e300a0be3c99ffd",
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
  // intent-planner-constraint-starters-add (task 2.1, 2026-06-21): codex 側も claude と同じ Step 3 冒頭の
  //   constraint-surfacing.md 参照1行追記のため正規更新（追記行は AskUserQuestion / Bash を含まないため claude と
  //   byte 等価。frontmatter は不変・FRONTMATTER_LOCKED 無変更で green）。
  "templates/ja/codex/skills/intent-compass/SKILL.md":
    "003160bff442287f742fdbeaa7201aaf0d7d6f4a4724673ff8b312e4e4536e62",
  "templates/en/codex/skills/intent-compass/SKILL.md":
    "c4464814c8958a6c580813dc6f34c3f816259296ce37e7ab319e810f5901fc60",
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
  // packet-slicing-by-scope (task 2.1, 2.2): codex 側も claude と同じ Step 4 終端判定への⑥単体完結追記と
  //   「3〜7」数文言の可変・質的への置換のため SKILL_BODY hash を正規更新（追記/置換は AskUserQuestion / Bash を
  //   含まないため claude と同言語内で本文一致。frontmatter は不変・FRONTMATTER_LOCKED 無変更で green）。
  // decision-probe-packets (A30): codex 側も claude と同じ decision-probe 結線1行の追記のため
  //   SKILL_BODY hash を正規更新（追記行は AskUserQuestion / Bash を含まないため claude と同言語内で本文一致。
  //   frontmatter は不変・FRONTMATTER_LOCKED 無変更で green。diff review 済み）。
  "templates/ja/codex/skills/intent-packets/SKILL.md":
    "93313e63776813002dd258f5335fde41cc084dbeb8176311c5c3804dc3f9c61d",
  "templates/en/codex/skills/intent-packets/SKILL.md":
    "da7ed6ffb9b0ad8883fdf485a64e231b2e4bce598493d3d2500de0b8b77a2100",
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
  // append-log-discipline-add (task 2.3, 2026-06-22): codex 側も claude と同じ Step 3 の export-log
  //   分割書き込み + 生成ミラー再生成への作り替えのため SKILL_BODY hash を正規更新（記録の中身=列は不変・
  //   frontmatter 不変。diff review 済み）。
  "templates/ja/codex/skills/intent-export-cc-sdd/SKILL.md":
    "85946366aa9e0c747cbe4d50b912d0e0f970c2805ff6773f4802323a6454d15d",
  "templates/en/codex/skills/intent-export-cc-sdd/SKILL.md":
    "c35f7b85dfcb8cb458e83e7d45ed6a1d085ee127eef685ad0ed87990539a379e",
  // intent-db-design-seam (task 4.1): 新スキル intent-db-design SKILL.md（4系統）を機能 spec に
  //   よる正当な新設として SKILL_BODY hash に正規登録（lock 対象外の rules・dogfood は登録しない）。
  //   射影骨格 SKILL は手動発動・read-only・能動起動ループ無しで固定（意図しないドリフトから保護）。
  // intent-db-design-inspect-oracle (task 3.x): SKILL に `### Step 3.5: DB 固有検査オラクル`（5検査軸・
  //   invariant 適合照合・不可逆性警告・warn-only/read-only）を Step 3 と Step 4 の間に挿入し、Step 4・
  //   Output Description・Safety に検査所見の併走と warn-only を追記したため SKILL_BODY hash を正規更新。
  //   frontmatter は不変（FRONTMATTER_LOCKED は無変更で green のまま）。diff review 済み。
  "templates/ja/claude/skills/intent-db-design/SKILL.md":
    "d83e43c1ef6eabb7acb2751e7c4e4825abe3babc0e1c7628f400657ec004a3c2",
  "templates/en/claude/skills/intent-db-design/SKILL.md":
    "a6dbe52a479d49f3955d7deaa1a559d2aa8db241fc9d33cca55ed88816b70f83",
  "templates/ja/codex/skills/intent-db-design/SKILL.md":
    "c4fecc41c87368e0a68dc79db0dd3dfc4c4bb0688758e5c25779695c8806826a",
  "templates/en/codex/skills/intent-db-design/SKILL.md":
    "3022b715013b79a13220456888328e8b1df2c9caf336d3194c304d165ae27aca",
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
