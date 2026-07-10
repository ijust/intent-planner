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
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 対象 packet を特定する
- `rules/writeback-protocol.md` を読み、5段優先順（①引数 → ②export-log.md 最新行の packet 名（正典）→ ③下書きの「## Source Packet」見出し（packet ディレクトリが1つのみ存在する場合に限る）→ ④直接実装ルート〔cc-sdd/openspec を経ない案件。出口の明示記録 `format=direct` を一次情報に、無ければ `spec_refs 空 + export-log 行なし + state=done` の3条件 AND 推論にフォールバックし、`name` 照合で一意化〕→ ⑤テキスト照合 + 利用者確認）で対象を1つに特定する。フォールバック（③以降）で特定した場合はその旨を告知し、それでも特定できなければ指定を求めて停止する（rules 参照）。
- 対象 packet のファイルを `.intent/packets/` の index.md / `active/` 配下の `name` 照合で特定する。`active/` に無ければ `archive/` を明示参照して特定し、done / superseded である事実を報告する（通常 archive/ を読まない原則の唯一の明示例外。rules 参照）。
- `.intent/mode.md` を読む。無ければ standard 既定で続行し告知する。
- 対象 packet の過去 delta エントリ一覧（「保留」タグ付き見送り項目を含む）を提示する。同一 packet の再書き戻しは新エントリとする（rules 参照）。

### Step 2: 学びを抽出して提示する
- 実装の現実（コードベース・テスト・`.kiro/specs/`。すべて読み取りのみ）と、packet 定義（対象 packet ファイル）・cc-sdd 下書き・intent-compass.md を突き合わせる。
- rules の5観点（[decision] / [invariant-violation] / [implicit-behavior] / [deferred-resolved] / [question]）で学びを抽出し、タグ付きの一覧で提示する。各学びは `[tag] <平易な要約一文（必須）>`（承認者がそのまま読んで意味の取れる平易な文）で示し、背景・根拠・含意が要るときだけ任意の `解説:` を添える（解説は必須でなく、要約のみが正規形。rules §2/§9 参照）。

### Step 3: delta を記録する（canonical 不可侵）
- 抽出した学びを `.intent/deltas.md` に新規エントリ（Status: pending）として記録する。
- deltas.md が無ければ、rules 内包の正規テンプレートから新規作成する（既存ファイルは上書きしない）。
- この段階では canonical（intent-tree.md / intent-compass.md / `.intent/packets/` 配下）を一切書き換えない。

### Step 4: 昇格を確認する（承認の粒度を分ける）
- 承認の粒度は学びの種類で分ける（rules §3 第2段）。全件を一律に一件ずつ問わない。承認の一次情報は各学びの平易な要約一文であり、解説は要るときだけ補う二次情報として扱う。
- **ゲート対象**（`[invariant-violation]` と Decision Rules を変える `[decision]`）は項目ごとに承認を確認する。
- **それ以外（L3 追記系・`[question]` 転記）**は反映先を一覧で提示し、止めたい項目があれば指定を求めたうえで、無指定なら一括昇格する。
- 止めた（承認されない）項目には「却下（再提案不要） | 保留（次回 writeback で再提案）」のどちらかを確認する。
- canonical 昇格に続けて、**個人台帳（constraint-library）への昇格**を確認する（rules §3 第3段）。`[decision]` / `[invariant-violation]` の学びのうち再利用したい制約を `.intent/constraint-library.md` へ残すかを read-only で問う（スキーマ下書きを見せ採否は人・既載は再提示しない・自動追記しない・台帳不在ならスキップ）。

### Step 5: 承認分を昇格し、記録を確定する
- 承認された項目だけを canonical へ反映する。Decision Rules の変更を伴う昇格は ADR 形式（Context / Decision / Why / Consequences）の新エントリ追加 + 旧エントリへの superseded 注記 + 旧エントリの compass-archive/<rule-slug>.md（rule 単位ファイル）への6欄のままの退避（CONTRACT 分割・archive 規約・rules 参照）。
- [question] の学びは intent-tree.md の Open Questions へ転記し、転記先を反映先に記録する。
- delta エントリに Status（promoted / closed）と反映先、見送り項目の2値タグを記録する。保留項目の再提案結果（昇格 / 却下確定 / 継続保留）のタグ確定更新もここで行う。

### Step 6: packet の完了処理を行う
- writeback の完了時、対象 packet の完了処理を一連の操作として行う（rules 参照）: ① frontmatter に `state: done`・`closed_at`・`spec_refs`（`.kiro/specs/` の進行 spec と照合し、利用者確認で確定）を記入 → ② `archive/<closed_at の年>/` へ移動 → ③ index.md を `active/` の frontmatter から再生成する。

## Output Description

> **出力先はターミナルである。** 出力には raw HTML（`<details>` / `<summary>` 等の折りたたみ UI）を使わず、詳細は素の Markdown 見出しで区切って退避する（ターミナルでは生タグがそのまま表示され読めなくなるため）。`[[...]]`（memory / delta 用の wikilink 等）の内部記法は、delta / memory ファイルへの記録では正当だが、人向けのターミナル出力ではそのまま出さず普通の語に開く（リンク先の名前を自然文で綴る）。

**読み手**: 実装の学びを意図へ昇格させ、packet を締める人間開発者。
**この出力で最初に掴ませること**: 「**canonical に昇格したのはこれ / 保留はこれ**。対象 packet は done になり archive へ移った」。学びの抽出・delta 記録の過程は、昇格結果に至る詳細。

出力は結論（昇格結果と完了処理）を先頭に立てる。

- **昇格結果（先頭）**: 何が canonical（intent-tree / intent-compass / packets）へ昇格したか、反映先明細つき。止めた項目は「却下（再提案不要） / 保留（次回再提案）」の見送りタグで区別して示す。
- **完了処理の結果（次）**: 対象 packet の `state: done`・`closed_at`・`spec_refs` 記入、`archive/<年>/` への移動、index.md 再生成。「この packet はこれで締まった」と分かる形。
- **節目の記録案内（任意・末尾1行・INV78/DR124）**: 完了報告の末尾に「今回の実装が節目イベント（例: 本番構成の確定・外部公開）にあたるなら、`.intent/milestones.md` へ event を1行記入すると `/intent-improve` の Revisit 照合が効くようになります（書くのは利用者）」という read-only の案内を1行だけ添えてよい（任意）。AI は milestones.md へ書き込まず、記入を必須化せず、未記入でも何も止めない。これは**案内であって記録ではない** — drift 等の記録の書き込みを writeback 経路に差さない既存の役割境界（improve-axes の「役割境界」節）は不変。
- **乗り換えの促し（任意・末尾1行・INV82-(2)/DR143）**: writeback は工程の切れ目なので、完了報告の末尾に「このまま続けることも、ここで新しいセッションに乗り換えることもできます。乗り換えるなら `/intent-overview` で引き継ぎブリーフを生成できます」という趣旨の read-only の案内を1行だけ添えてよい（任意・結論〔選択肢〕を先に置く＝bluf）。**ただし添えるのは「文脈が長い」という AI の定性的な自己感覚があるときだけ**（工程の切れ目 × 長さの自覚の AND・短いセッションでは黙る）。会話ログ・トークン量は読まず数値も出さない（INV82-(2)・INV22 の制約）。引き継ぎブリーフ機能が未配置の環境では生成トリガの案内を出さない（宙吊りコマンドを案内しない）。これは milestone 案内と同型の read-only の案内であり、自動でセッションを切らない・ブリーフを勝手に書き出さない・「続ける」を矯正しない（役割境界は不変）。
- **昇格提案**（承認を求める段で出ていれば）: ゲート対象（invariant 違反・Decision Rules 変更）は項目ごとに確認、L3 追記系は一覧提示 + 止める項目の指定。
- **詳細**: 抽出した学び一覧（5観点 [decision]/[invariant-violation]/[implicit-behavior]/[deferred-resolved]/[question] のタグ付き。各行は平易な要約一文を主情報とし、必要なときだけ任意の解説を添える）、delta 記録結果（deltas.md のエントリ）。

## Safety & Fallback
- 対象 packet が特定できなければ、状況を提示して書き戻し対象の指定を求めて停止する。
- packet ファイルは削除しない（archive への移動のみ）。Bash の用途は、日時取得・`.intent/packets/` 配下のディレクトリ作成（mkdir）と archive への移動に限る（アプリケーションコードを変更しない invariant は維持）。
- deltas.md 不在時は rules 内包テンプレートから新規作成する（既存ファイルは上書きしない）。
- 承認なしに canonical を書き換えない。承認が無ければ pending のまま保持して終了する。
- `.kiro/specs/` とコードベースは読み取りのみ。`.kiro/` へは書き込まない。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- アプリケーションコードは変更しない（INV6）。
