---
name: intent-compass
description: Intent Tree から、今回の変更における判断基準（North Star / Anti-direction / Invariants / Decision Rules）を構築する。Claude が局所最適に逃げるのを防ぐ。実装はしない。
---

# intent-compass Skill

## Core Mission
- **Success Criteria**:
  - North Star / Current Drift / Direction / Anti-direction / Invariants / Decision Rules / Evidence / Open Questions が揃っている
  - Anti-direction に Claude がやりがちな局所最適が明示列挙されている
  - Invariants はプロジェクト普遍のみが compass に保持され、packet 固有は packet ファイル（Safety / Invariants）を正本としている
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 前提を読む
- `.intent/intent-tree.md` を読む。無ければ「先に `/intent-discover` を実行」を案内して停止する。骨格（L0–L4）は本体を読み、案件記録（機能追記/機能撤去/履歴/再起案）は分割収納 `.intent/tree/` が在れば `index.md`→該当 `<feature>.md` を、無ければ本体末尾の旧形式を読む（恒久フォールバック・tree-normalize / DR133）。
- 読み取り時、compass / intent-tree の確定文体に紛れた未確定動詞（想定 / 流用 / 予定 / TBD / 暫定 等）を見たら、推測で確定させず Open Questions または未定スロット（理由・再訪条件（Revisit when）併記）への変換案として提示する。確定値への昇格は利用者の確認に委ねる。既に Open Questions / Deferred / 未定スロットへ記録済みの箇所は重複変換しない。
- 引き継がれた発行ディレクトリの `discovery/<スラッグ>-<rand>/mode.md`（A34・discover が出力した発行名を引き継ぐ）→ 無ければ単一 `.intent/mode.local.md`（legacy）→ 無ければ旧 `.intent/mode.md` の順で mode 状態を読む（CONTRACT.md の read fallback 規約）。無ければ standard を既定とし、Open Questions に「モード未確定・`/intent-discover` 推奨」を併記する（停止しない）。
- 既存の `.intent/intent-compass.md` があれば読む。分割収納 `.intent/compass/`（1記号=1ファイル・INV80）に該当記号があれば `index.md` → 該当ファイルの `## Law` を先に読み、無い記号は従来どおり旧本体を読む（旧経路は恒久フォールバック＝DR133）。

### Step 2: モード定義のアルゴリズムを適用する
- `.intent/mode.local.md`（無ければ `.intent/mode.md`）の `definition` が指すモード定義を開き、Compass 構築フェーズに割り当てられた algo rule（`rules/algo-*.md`）を読み、適用する（現状どのモードも `rules/algo-qoc.md`）。例は網羅ではない。常にモード定義の表を正とする。

### Step 3: Compass を構築する
- 導出の前段で `rules/constraint-surfacing.md` を読み、適用する。同梱のドメイン定石カタログを read-only で照合し、Anti-direction / Invariants の叩き台候補を提示する（候補まで・自動転記しない。既存導出を置き換えない。カタログ不在なら沈黙）。
- QOC に従い North Star を引き、Decision Rules を軽量 ADR として凝縮する（エントリの欄構成は `rules/algo-qoc.md` が正）。
- Anti-direction に Claude がやりがちな局所最適・小手先リファクタを明示列挙する（最重要）。
- Invariants を2層で解消する:
  - **プロジェクト普遍 invariant**（全作業共通・少量）→ compass の Invariants に保持する。`/kiro-steering-custom` で `.kiro/steering/` に置くと全作業で効くことを推奨提示する（自動配置はしない。起動時コンテキスト増を避けるため少量に限る）。
  - **packet 固有 invariant**（特定作業単位）→ packet ファイルの Safety / Invariants に直接起案する（compass には書かない。`/intent-packets` が packet 起案時に記入する）。
- 節更新日の打刻（書き手の責務）: compass を書き込むとき、**実際に内容を更新した節の行だけ**を打刻する。Invariants 節を更新したらその時点を `Updated (Invariants):` に、Decision Rules 節を更新したらその時点を `Updated (Decision Rules):` に記録する（ISO 8601）。両方を常に打つのではなく、当該節を更新したときのみ該当行を打刻する。内容変更を伴わない節の行は変えない（冪等。無変更で打刻しない）。初期マーカー `—`（scaffold 既定）は、その節を実際に更新した時点で日時へ置き換える。日時はシェルの `date` で取得する。日時を取得できない場合は推測の日付を書かず、その旨を報告する。打刻は書き手（本スキル）の責務であり、read-only の検証層（intent-validate）には持たせない。

### Step 4: 提示する
- `.intent/intent-compass.md` の更新案を提示する。実装変更はしない。

## Output Description

**読み手**: これから実装に向かう人間開発者（と、実装を担う AI）。
**この出力で最初に掴ませること**: 「**今回の変更で避けるべき局所最適（Anti-direction）はこれ**。判断基準が揃ったので次は `/intent-packets`」。このスキルの核心は Anti-direction の明示なので、それを筆頭に立てる。

出力は結論を先頭に立てる。

- **今回避けるべき局所最適（Anti-direction・先頭）**: Claude がやりがちな小手先リファクタ・局所最適を名指しで列挙（このスキルの最重要成果）。
- **次の一手（1行）**: `/intent-packets`（作業単位への分割。cc-sdd に渡せる粒度の packet に切り出す）。
- **詳細**: `.intent/intent-compass.md` の更新案（North Star / Direction / Invariants / Decision Rules）、steering 配置を推奨する普遍 invariant（あれば）、判断に必要な不明点（Open Questions）。分割収納 `.intent/compass/` が在る repo では、新規記号（INV/DR/Anti）は本体追記でなく分割収納への新ファイルとして起案し（ファイル作成＝採番宣言・DR131）、処理完了時に `index.md` を再生成する（収納が無ければ従来どおり本体へ・DR133）。**新規記号に領域タグ（`area:` / `[領域: <名前>]`）を付けるとき、および `.intent/domains/` が在る repo では、`rules/domain-write.md` を読み、適用する**（area を案件文脈から導出して一問確認・黙って always にしない・書き込む領域に他セッションの owner 宣言があれば read-only の一言を添える＝止めない・INV91/INV101。domains 不在なら従来どおり）。**`always`（全領域横断）を選ぼうとするときは、続けて `rules/always-gate.md`（always 登録の一問確認）を読み、適用する**（本当に全領域に効くかを一問だけ確認・domain-write の area 確認と二重質問にしない・gate にしない）。

### 報告の平易さ点検（利用者向け報告・出力直前・共通）

利用者へ向けた報告（進捗・完了・確認事項の提示。ターン末尾の要約を含む）を出す直前に、次を点検する（INV105・DR208）。対象は利用者向けの報告文だけで、内部の記録（`.intent/` 配下の canonical・ログ）の書き方には適用しない。

- **内部文書の文をそのまま転写しない**: 直前に読んだ・書いた内部成果物（tree・compass・packet・Open Questions）の文面は内部の語彙で書かれている。報告では、その内容を初見の読み手に通じる言葉で言い直す（事実・意味は変えない）。
- **識別子を本文の主語にしない**: 確認事項・作業単位を示すときは、まず「何を・なぜ」が単体で通じる一文を置き、識別子（Open Question 番号・packet 名・記号・工程名）はその後ろに参照として添える（例: 「…を確かめてから始めてください（整理番号: OQ-xxx-1）」）。平易化のために識別子・記録への参照を削らない（記録へ辿れなくなる）。
- **通じるかの合図**: 1文に未説明の内部語が3つ以上並んだら詰め込みすぎの合図（機械カウントではなく意味の読みで）。単体で通じなければ、平易に書き直してから出す（事実・意味は変えない）。
- **比喩・曖昧な言い方だけで意味を渡さない**: 報告の土台は正確さ（意味が一意に読める記述。平易さはそれを保ったまま易しく書く手段）。基準のない程度語（「かなり」「うまく」等）だけで結果を伝えず、観測できる事実で書く。比喩を使うなら直後に正確な言い直しを必ず併記する（確立された専門用語・世間の意味のままの一般語は無理に開かない）。
- この点検は事後の記録と対で働く（予防だけで閉じない）: 報告が通じなかった実例は、drift-watch が on のとき drift-log へ症例として残し、次の予防に使う。

## Safety & Fallback
- Intent Tree が無ければ停止して `/intent-discover` を案内する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- アプリケーションコードは変更しない。
