---
name: intent-writeback
description: export 済み packet の実装完了後、実装で得た学びを delta として deltas.md に記録し、承認された項目だけを canonical 成果物（intent-tree / intent-compass / packets）へ昇格する。canonical を直接書き換えない。
---

# intent-writeback Skill

## Core Mission
- **Success Criteria**:
  - 対象 packet を4段優先順（引数 → export-log 最新行 → Source Packet 見出し → テキスト照合 + 確認）で1つに特定している
  - 実装の現実と packet 定義・compass の突き合わせから5観点の学びを抽出・提示している
  - 学びをまず deltas.md に delta として記録し、canonical 成果物を直接書き換えていない
  - 承認された項目だけを canonical へ反映し、delta に Status と反映先を記録している
  - 見送り項目に「却下（再提案不要） | 保留（次回 writeback で再提案）」の2値タグを付している
  - writeback が完了した packet に state: done・closed_at・spec_refs を記入し、archive/<年>/ へ移動して index.md を再生成している
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 対象 packet を特定する
- `rules/writeback-protocol.md` を読み、4段優先順（①引数 → ②export-log.md 最新行の packet 名（正典）→ ③下書きの「## Source Packet」見出し（packet ディレクトリが1つのみ存在する場合に限る）→ ④テキスト照合 + 利用者確認（利用者に自然言語で問い、回答を待つ））で対象を1つに特定する。フォールバック（③以降）で特定した場合はその旨を告知し、それでも特定できなければ指定を求めて停止する（rules 参照）。
- 対象 packet のファイルを `.intent/packets/` の index.md / `active/` 配下の `name` 照合で特定する。`active/` に無ければ `archive/` を明示参照して特定し、done / superseded である事実を報告する（通常 archive/ を読まない原則の唯一の明示例外。rules 参照）。
- `.intent/mode.md` を読む。無ければ standard 既定で続行し告知する。
- 対象 packet の過去 delta エントリ一覧（「保留」タグ付き見送り項目を含む）を提示する。同一 packet の再書き戻しは新エントリとする（rules 参照）。

### Step 2: 学びを抽出して提示する
- 実装の現実（コードベース・テスト・`.kiro/specs/`。すべて読み取りのみ）と、packet 定義（対象 packet ファイル）・cc-sdd 下書き・intent-compass.md を突き合わせる。
- rules の5観点（[decision] / [invariant-violation] / [implicit-behavior] / [deferred-resolved] / [question]）で学びを抽出し、タグ付きの一覧で提示する。

### Step 3: delta を記録する（canonical 不可侵）
- 抽出した学びを `.intent/deltas.md` に新規エントリ（Status: pending）として記録する。
- deltas.md が無ければ、rules 内包の正規テンプレートから新規作成する（既存ファイルは上書きしない）。
- この段階では canonical（intent-tree.md / intent-compass.md / `.intent/packets/` 配下）を一切書き換えない。

### Step 4: 項目ごとに昇格を確認する
- 学びを項目ごとに提示し、昇格の承認を利用者に自然言語で問い、回答を待つ（一括承認を強制しない）。
- 承認されない項目には「却下（再提案不要） | 保留（次回 writeback で再提案）」のどちらかを自然言語で問い、回答を待つ。

### Step 5: 承認分を昇格し、記録を確定する
- 承認された項目だけを canonical へ反映する。Decision Rules の変更を伴う昇格は ADR 形式（Context / Decision / Why / Consequences）の新エントリ追加 + 旧エントリへの superseded 注記 + 旧エントリの compass-archive.md への6欄のままの退避（rules 参照）。
- [question] の学びは intent-tree.md の Open Questions へ転記し、転記先を反映先に記録する。
- delta エントリに Status（promoted / closed）と反映先、見送り項目の2値タグを記録する。保留項目の再提案結果（昇格 / 却下確定 / 継続保留）のタグ確定更新もここで行う。

### Step 6: packet の完了処理を行う
- writeback の完了時、対象 packet の完了処理を一連の操作として行う（rules 参照）: ① frontmatter に `state: done`・`closed_at`・`spec_refs`（`.kiro/specs/` の進行 spec と照合し、利用者確認で確定）を記入 → ② `archive/<closed_at の年>/` へ移動 → ③ index.md を `active/` の frontmatter から再生成する。

## Output Description
- 抽出した学び一覧（5観点のタグ付き）
- delta 記録結果（deltas.md のエントリ）
- 昇格提案（項目ごとの承認確認）
- 昇格結果（反映先明細・見送りタグ）
- 完了処理の結果（state: done・closed_at・spec_refs の記入、archive/<年>/ への移動、index.md 再生成）

## Safety & Fallback
- 対象 packet が特定できなければ、状況を提示して書き戻し対象の指定を求めて停止する。
- packet ファイルは削除しない（archive への移動のみ）。シェルコマンドの用途は、日時取得・`.intent/packets/` 配下のディレクトリ作成（mkdir）と archive への移動に限る（アプリケーションコードを変更しない invariant は維持）。
- deltas.md 不在時は rules 内包テンプレートから新規作成する（既存ファイルは上書きしない）。
- 承認なしに canonical を書き換えない。承認が無ければ pending のまま保持して終了する。
- `.kiro/specs/` とコードベースは読み取りのみ。`.kiro/` へは書き込まない。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- アプリケーションコードは変更しない（INV6）。
