---
name: intent-writeback
description: export 済み packet の実装完了後、実装で得た学びを delta として deltas.md に記録し、承認された項目だけを canonical 成果物（intent-tree / intent-compass / packets）へ昇格する。canonical を直接書き換えない。
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Bash
argument-hint: <対象 packet 名（任意）>
---

# intent-writeback Skill

## Core Mission
- **Success Criteria**:
  - 対象 packet を5段優先順（引数 → export-log 最新行 → Source Packet 見出し → 直接実装ルート〔出口の明示記録 `format=direct` 一次・3条件 AND 推論フォールバック〕→ テキスト照合 + 確認）で1つに特定している
  - 実装の現実と packet 定義・compass の突き合わせから5観点の学びを抽出・提示している
  - 学びをまず deltas.md に delta として記録し、canonical 成果物を直接書き換えていない
  - 承認された項目だけを canonical へ反映し、delta に Status と反映先を記録している
  - 見送り項目に「却下（再提案不要） | 保留（次回 writeback で再提案）」の2値タグを付している
  - writeback が完了した packet に state: done・closed_at・spec_refs を記入し、archive/<年>/ へ移動して index.md を再生成している
  - 利用者が「成果についての学び」を明示した場合だけ成果分岐を選び、pending観測の追記時はPacket完了処理を行っていない
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 0: 操作種別を確定する
- 利用者が「成果についての学び」を明示したときだけ成果分岐を選ぶ。通常の実装学習か成果記録かが曖昧なら、操作種別を普通の言葉で確認し、回答を待つ（rules §0）。

### Step 1: 対象 packet を特定する
- `rules/writeback-protocol.md` を読み、5段優先順（①引数 → ②export-log.md 最新行の packet 名（正典）→ ③下書きの「## Source Packet」見出し（packet ディレクトリが1つのみ存在する場合に限る）→ ④直接実装ルート〔cc-sdd/openspec を経ない案件。出口の明示記録 `format=direct` を一次情報に、無ければ `spec_refs 空 + export-log 行なし + state=done` の3条件 AND 推論にフォールバックし、`name` 照合で一意化〕→ ⑤テキスト照合 + 利用者確認）で対象を1つに特定する。フォールバック（③以降）で特定した場合はその旨を告知し、それでも特定できなければ指定を求めて停止する（rules 参照）。
- 対象 packet のファイルを `.intent/packets/` の index.md / `active/` 配下の `name` 照合で特定する。`active/` に無ければ `archive/` を明示参照して特定し、done / superseded である事実を報告する（通常 archive/ を読まない原則の唯一の明示例外。rules 参照）。
- `.intent/mode.md` を読む。無ければ standard 既定で続行し告知する。
- 対象 packet の過去 delta エントリ一覧（「保留」タグ付き見送り項目を含む）を提示する。同一 packet の再書き戻しは新エントリとする（rules 参照）。
- 成果分岐では、対象L1を逐語引用で特定する。同じ引用が複数あれば候補を示し、利用者の選択を待つ（rules §1.5）。

### Step 2: 学びを抽出して提示する
- 実装の現実（コードベース・テスト・`.kiro/specs/`。すべて読み取りのみ）と、packet 定義（対象 packet ファイル）・cc-sdd 下書き・intent-compass.md を突き合わせる。
- rules の5観点（[decision] / [invariant-violation] / [implicit-behavior] / [deferred-resolved] / [question]）で学びを抽出し、タグ付きの一覧で提示する。各学びは `[tag] <平易な要約一文（必須）>`（承認者がそのまま読んで意味の取れる平易な文）で示し、背景・根拠・含意が要るときだけ任意の `解説:` を添える（解説は必須でなく、要約のみが正規形。rules §2/§9 参照）。

### Step 3: delta を記録する（canonical 不可侵）
- 抽出した学びを `.intent/deltas.md` に新規エントリ（Status: pending）として記録する。
- 成果分岐では、Packet単位deltaに新しいpending観測だけを追記する。物さしや出所の不足は知らせても受け付け、重複疑いを自動統合しない。生データは貼らず要約するよう案内する（rules §1.5）。
- deltas.md が無ければ、rules 内包の正規テンプレートから新規作成する（既存ファイルは上書きしない）。
- この段階では canonical（intent-tree.md / intent-compass.md / `.intent/packets/` 配下）を一切書き換えない。

### Step 4: 昇格を確認する（承認の粒度を分ける）
- 成果分岐は人の承認が得られるまで `intent-tree.md` を変更しない。観測内容と対象L1へ反映する予定の1行を示し、承認するか見送るかを確認する（rules §1.6）。
- 承認の粒度は学びの種類で分ける（rules §3 第2段）。全件を一律に一件ずつ問わない。承認の一次情報は各学びの平易な要約一文であり、解説は要るときだけ補う二次情報として扱う。
- **ゲート対象**（`[invariant-violation]` と Decision Rules を変える `[decision]`）は項目ごとに承認を確認する。
- **それ以外（L3 追記系・`[question]` 転記）**は反映先を一覧で提示し、止めたい項目があれば指定を求めたうえで、無指定なら一括昇格する。
- 止めた（承認されない）項目には「却下（再提案不要） | 保留（次回 writeback で再提案）」のどちらかを確認する。
- canonical 昇格に続けて、**個人台帳（constraint-library）への昇格**を確認する（rules §3 第3段）。`[decision]` / `[invariant-violation]` の学びのうち再利用したい制約を `.intent/constraint-library.md` へ残すかを read-only で問う（スキーマ下書きを見せ採否は人・既載は再提示しない・自動追記しない・台帳不在ならスキップ）。
- **compass の記号（Invariant / Decision Rule）を昇格するとき、および `.intent/domains/` が在る repo では、`rules/domain-write.md` を読み、適用する**（昇格先の area を案件文脈から導出して一問確認・黙って always にしない・書き込む領域に他セッションの owner 宣言があれば read-only の一言を添える＝止めない・INV91/INV101。domains 不在なら従来どおり）。

### Step 5: 承認分を昇格し、記録を確定する
- 成果分岐では、人が承認した場合だけ対象L1の `成果についての学び:` を追加または置換し、観測を `promoted` にする。見送った場合は観測を `closed` にし、その観測を削除しないで `intent-tree.md` を変更しない。対象L1が一意でなければ反映せず、利用者の選択を待つ（rules §1.6）。
- 承認された項目だけを canonical へ反映する。Decision Rules の変更を伴う昇格は ADR 形式（Context / Decision / Why / Consequences）の新エントリ追加 + 旧エントリへの superseded 注記 + 旧エントリの compass-archive/<rule-slug>.md（rule 単位ファイル）への6欄のままの退避（CONTRACT 分割・archive 規約・rules 参照）。
- [question] の学びは intent-tree.md の Open Questions へ転記し、転記先を反映先に記録する。
- delta エントリに Status（promoted / closed）と反映先、見送り項目の2値タグを記録する。保留項目の再提案結果（昇格 / 却下確定 / 継続保留）のタグ確定更新もここで行う。

### Step 6: packet の完了処理を行う
- writeback の完了時、対象 packet の完了処理を一連の操作として行う（rules 参照）: ① frontmatter に `state: done`・`closed_at`・`spec_refs`（`.kiro/specs/` の進行 spec と照合し、利用者確認で確定）を記入 → ② `archive/<closed_at の年>/` へ移動 → ③ index.md を `active/` の frontmatter から再生成する。
- 完了処理の後、その packet がジャーニー（`.intent/packets/journeys/*.md` の `packets` 列挙・在れば）に属するかを read-only で確認し、構成 packet がすべて done かつ統合時の検査が green と読めるときは「このジャーニーは閉じられます」と一言促す（`lifecycle: archived` の記入と `journeys/archive/<年>/` への移動は人の宣言＝機械は閉じない・INV91。ジャーニーが無ければ何も出さない＝従来どおり・INV103）。
- **成果分岐の例外**: pending記録、承認、見送り、反復承認のどの経路でもStep 6のPacket完了処理を実行しない。state、closed_at、spec_refs、配置場所、indexをそのままにする。

## Output Description

> **出力先はターミナルである。** 出力には raw HTML（`<details>` / `<summary>` 等の折りたたみ UI）を使わず、詳細は素の Markdown 見出しで区切って退避する（ターミナルでは生タグがそのまま表示され読めなくなるため）。`[[...]]`（memory / delta 用の wikilink 等）の内部記法は、delta / memory ファイルへの記録では正当だが、人向けのターミナル出力ではそのまま出さず普通の語に開く（リンク先の名前を自然文で綴る）。

**読み手**: 実装の学びを意図へ昇格させ、packet を締める人間開発者。
**この出力で最初に掴ませること**: 「**canonical に昇格したのはこれ / 保留はこれ**。対象 packet は done になり archive へ移った」。学びの抽出・delta 記録の過程は、昇格結果に至る詳細。

出力は結論（昇格結果と完了処理）を先頭に立てる。

- **昇格結果（先頭）**: 何が canonical（intent-tree / intent-compass / packets）へ昇格したか、反映先明細つき。止めた項目は「却下（再提案不要） / 保留（次回再提案）」の見送りタグで区別して示す。
- **完了処理の結果（次）**: 対象 packet の `state: done`・`closed_at`・`spec_refs` 記入、`archive/<年>/` への移動、index.md 再生成。「この packet はこれで締まった」と分かる形。
- **乗り換えの促し（任意・末尾1行・INV82-(2)/DR143）**: writeback は工程の切れ目なので、完了報告の末尾に「このまま続けることも、ここで新しいセッションに乗り換えることもできます」という趣旨の read-only の案内を1行だけ添えてよい（任意・結論〔選択肢〕を先に置く＝bluf）。**ただし添えるのは「文脈が長い」という AI の定性的な自己感覚があるときだけ**（工程の切れ目 × 長さの自覚の AND・短いセッションでは黙る）。さらに、出す前に損得を自問する（DR159）: (1) 残作業の性質＝設計判断が残るか・書いてある通りにやるだけか (2) 引き継ぎで失われるセッション固有の暗黙知の量 (3) この切れ目の自然さ。「引き継がない方が得」と見積もったら推奨せず黙る（または「続ける方が得」と一言添える）。見積もれないときも黙る側に倒す。推奨するときは見積もりの一言（定性・数値なし）を案内に添える。会話ログ・トークン量は読まず数値も出さない（INV82-(2)・INV22 の制約）。現在の agent 面で互換確認済みの `handoff-bridge` skill が利用できる場合だけ、利用者がその skill を明示起動し、未使用の完全な保存先 `.intent/handoff/<名前>.md` を指定できると案内する。生成後の次セッションには、handoff の `source` と `read_for` を確認して locator の正本を読み、`authority` / `provenance` と照合するよう案内する。未配置・非互換・確認失敗の場合は生成の案内を出さないで静かに縮退し、内部 generator や overview へ fallback しない。これは read-only の案内であり、自動でセッションを切らない・ブリーフを勝手に書き出さない・「続ける」を矯正しない（役割境界は不変）。
- **昇格提案**（承認を求める段で出ていれば）: ゲート対象（invariant 違反・Decision Rules 変更）は項目ごとに確認、L3 追記系は一覧提示 + 止める項目の指定。
- **詳細**: 抽出した学び一覧（5観点 [decision]/[invariant-violation]/[implicit-behavior]/[deferred-resolved]/[question] のタグ付き。各行は平易な要約一文を主情報とし、必要なときだけ任意の解説を添える）、delta 記録結果（deltas.md のエントリ）。

### 報告の平易さ点検（利用者向け報告・出力直前・共通）

利用者へ向けた報告（進捗・完了・確認事項の提示。ターン末尾の要約を含む）を出す直前に、次を点検する（INV105・DR208）。対象は利用者向けの報告文だけで、内部の記録（`.intent/` 配下の canonical・ログ）の書き方には適用しない。

- **内部文書の文をそのまま転写しない**: 直前に読んだ・書いた内部成果物（tree・compass・packet・Open Questions）の文面は内部の語彙で書かれている。報告では、その内容を初見の読み手に通じる言葉で言い直す（事実・意味は変えない）。
- **識別子を本文の主語にしない**: 確認事項・作業単位を示すときは、まず「何を・なぜ」が単体で通じる一文を置き、識別子（Open Question 番号・packet 名・記号・工程名）はその後ろに参照として添える（例: 「…を確かめてから始めてください（整理番号: OQ-xxx-1）」）。平易化のために識別子・記録への参照を削らない（記録へ辿れなくなる）。
- **通じるかの合図**: 1文に未説明の内部語が3つ以上並んだら詰め込みすぎの合図（機械カウントではなく意味の読みで）。単体で通じなければ、平易に書き直してから出す（事実・意味は変えない）。
- **比喩・曖昧な言い方だけで意味を渡さない**: 報告の土台は正確さ（意味が一意に読める記述。平易さはそれを保ったまま易しく書く手段）。基準のない程度語（「かなり」「うまく」等）だけで結果を伝えず、観測できる事実で書く。比喩を使うなら直後に正確な言い直しを必ず併記する（確立された専門用語・世間の意味のままの一般語は無理に開かない）。
- この点検は事後の記録と対で働く（予防だけで閉じない）: 報告が通じなかった実例は、drift-watch が on のとき drift-log へ症例として残し、次の予防に使う。

## Safety & Fallback
- 対象 packet が特定できなければ、状況を提示して書き戻し対象の指定を求めて停止する。
- packet ファイルは削除しない（archive への移動のみ）。Bash の用途は、日時取得・`.intent/packets/` 配下のディレクトリ作成（mkdir）と archive への移動に限る（アプリケーションコードを変更しない invariant は維持）。
- deltas.md 不在時は rules 内包テンプレートから新規作成する（既存ファイルは上書きしない）。
- 承認なしに canonical を書き換えない。承認が無ければ pending のまま保持して終了する。
- `.kiro/specs/` とコードベースは読み取りのみ。`.kiro/` へは書き込まない。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- アプリケーションコードは変更しない（INV6）。
