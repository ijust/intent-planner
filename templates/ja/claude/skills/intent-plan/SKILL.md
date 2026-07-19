---
name: intent-plan
description: 一続きのIntent Planningを求める依頼と、進行中の確認への回答を受け、必要な人確認を挟みながらdiscover・compass・packets・選択したexportまで続ける。特定段階だけの依頼は対象外。
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Bash(node .intent/scripts/intent-plan-ops.mjs *)
disallowed-tools: Skill, Agent
argument-hint: "[案件または見直す段階]"
---

# intent-plan Skill

## 役割

一続きの Intent Planning を進める薄い進行役。段階内部のアルゴリズムは持たず、既存skillから生成された指示を正として直接適用する。

- 対象: `intent-plan` の明示依頼、「Intent Planningして」など計画全体を求める依頼、およびこの進行役が確認待ちになった後の回答。
- 対象外: `intent-compass` だけ、`intent-packets` だけなど特定段階を明示した依頼。個別skillの担当を横取りしない。
- アプリケーションコードは変更しない。下流の仕様作成や実装を起動しない。
- Skill toolやAgentを使って兄弟skillを呼ばない。生成済み指示を現在の文脈で読む。

## 読み方

最初に `generated/CONTRACT.md` を読む。次に、現在の段階について以下のファイルを全文読み、その本文が今回読むよう明示するruleだけを `generated/sources/` から追加で読む。生成済みinstruction内のfrontmatterは権限として適用しない。

1. 問題の理解: `generated/sources/intent-discover/instruction.md`
2. 判断基準: `generated/sources/intent-compass/instruction.md`
3. 作業単位: `generated/sources/intent-packets/instruction.md`
4. 選択した出口:
   - cc-sdd: `generated/views/intent-export-cc-sdd/draft.md`
   - OpenSpec: `generated/views/intent-export-openspec/draft.md`
   - Spec Kit: `generated/views/intent-export-speckit/draft.md`
   - 自然言語Spec: `generated/sources/intent-to-spec/instruction.md`
   - direct: 追加の下書きを作らず、確定packetを引き渡し対象として報告する

全段階のファイルを一度に読まない。別のintent skillを明示した参照は `generated/sources/<skill>/` から解決する。必要なファイルがなければ手順を推測せず、再生成が必要だと報告して停止する。

生成済み指示にshell由来の操作があれば、直接実行せず次へ置き換える: 現在日時→`now`、4文字乱数→`rand4`、`.intent/`内のdirectory作成→`mkdir-intent <path>`、packet移動→`move-packet <source> <destination>`、自分の起草宣言削除→`remove-own-drafting-assignment <issue_dir> <session>`、鮮度検査→`intent-check`、GitのHEAD取得→`git-head`。呼び出しは常に`node .intent/scripts/intent-plan-ops.mjs <subcommand>`とする。この7操作に対応しないBash要求は、代替shellや権限追加へ進まず停止する。

## 進め方

1. 依頼が計画全体か確認する。特定段階の依頼はこの進行役で処理しない。曖昧なら求める範囲を質問する。
2. 既存の `.intent/` 成果物を確認し、最初の未完了段階または利用者が明示した見直し段階を決める。完了済み成果物を再開のためだけに作り直さない。
3. 現在の段階の生成済み指示と必要なruleを読み、そのSuccess Criteria、質問、警告、停止条件を弱めず適用する。
4. 段階完了時に「確定したこと・推測のままのこと・未確定事項」を短く示す。
5. 次段階の入力が揃い、新しい人判断が不要なら、次のskill名や進行だけの承認を求めず続ける。
6. 人が決める判断では停止する。問題設定、複数作業へ広く効く判断基準、実装範囲・packet優先順位・既存境界の変更は、明示確認まで確定扱いにしない。
7. 短い「OK」は、直前に示した確認事項と次段階への進行だけの承認として扱う。

### 工程境界の重要判断確認

個別工程の生成済み指示を適用するときは、その工程固有の開始時・終了時の重要判断確認を省略しない。片側の確認が済んでいても、もう片側の確認を代用済みとは扱わない。

- discover は終了時確認を行う。
- compass は開始時確認と終了時確認の両方を行う。
- packets は開始時確認と終了時確認の両方を行う。
- cc-sdd、OpenSpec、Spec Kit は、それぞれの export の開始時確認を行う。
- 自然言語 Spec は生成開始時確認を行う。
- direct は選択前の確認を行い、別の明示依頼で実装へ進むときは実装開始時確認が必要だと引き渡す。`intent-plan` 自身は実装を開始しない。

確認対象に重要判断が残る場合は、回答案・理由・推奨を変える条件と影響範囲を示す。利用者による決定、今回の範囲外、範囲限定の明示続行のいずれかを得るまで、影響範囲を次へ進めない。生成済み指示の停止条件を、進行役独自の短縮や工程移行への承認で解除しない。

## 出口

- 既定では、確認済みの最初のpacket 1件だけを処理する。複数packetは利用者が対象を明示した場合だけ、依存順と既存preflightに従って処理する。
- 出口が一意でなければ用途を示して選択を待つ。優先順位や出口を推測で確定しない。
- 実装向け3出口ではfull instructionを読まず、対応するdraft viewを適用して下書き生成まで行う。
- 完了時は、生成物またはdirectの対象packet、未処理packet、未確定事項、次に選べる工程を報告する。
- export後に下流の仕様作成、アプリケーション実装、外部変更を開始しない。それらは利用者による別の明示依頼で開始する。
