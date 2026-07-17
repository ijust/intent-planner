---
name: intent-overview
description: 散在する .intent/ 成果物を read-only で読み、整形済みの通読・俯瞰ビューを .intent/overview/ 配下に派生（derived）として生成する集約スキル。canonical な成果物は一切変更しない。
---

# intent-overview Skill

書込み先は `.intent/overview/` 配下限定である。canonical `.intent/*.md` は read-only とし、生成物は派生（derived）として扱う。

## Core Mission
- **Success Criteria**:
  - 散在する `.intent/` の既存成果物（intent-tree / intent-compass / packets の index・active / packets/plan / export-log / deltas / mode / drift-log）を read-only で読み、人間とエージェントが一度に通読できる整形済み俯瞰ビューを `.intent/overview/overview.md` に生成している（R1.1）
  - 再実行時は最新の成果物から俯瞰ビューを全置換で再生成し、正本との二重化を生んでいない（冪等な再生成。R1.3）
  - `.intent/` または必須成果物（intent-tree など）が存在しないとき、何も書き込まず不在を明示し、先に実行すべき該当スキル（例: `/intent-discover`）を案内している（R1.4）
  - 生成物が派生・再生成可能であり正本ではないこと（および Git 非追跡であること）を明示している（読み手の関心を優先し、ビュー末尾に退避してよい。R1.5）
  - 関心ごとの派生ビュー（意図ビュー / 依存・ブロックビュー / 進捗ビュー）として整理し、進捗を単一％でなく性質の異なる軸で映している
  - 利用者が自然言語で「理解地図」「着手前ブリーフ」「理解ギャップ整理」などを求めたとき、`.intent/overview/agent-understanding-map.md` / `.intent/overview/active-packet-briefing.md` / `.intent/overview/understanding-gaps.md` を派生ビューとして生成し、canonical な `.intent/*.md` には書き込んでいない
  - ビュー最上段の状態3区分と人間判断候補（最大1件）の直後に、全 packet の進行状況を1つの一覧に並べ、各行を ✅ 反映済 / 🔵 今ここ / ⚪ 未着手 / 🔴 反映漏れ / ◻ 統合済 のいずれかで示し、`[現在の工程 → 次に通る工程]` を併記する（状態表示と `state` を read-only で映すのみで、状態を算出・推論しない）
  - canonical な意図と inferred（推測）な意図、設計意図と実装実態を区別したまま集約し、欠落・未観測は「未記入／未観測」と明示して推測で埋めていない
  - 他スキルを直接呼ばず、scaffold ファイル（`.intent/*.md`）を介した読み取りと出力テキストの案内のみで連携している（R6.5）。状態機械・自律ループ・常駐プロセスを持たず、外部依存ゼロを維持している（R6.1 / R6.2）

## Execution Steps

### Step 1: `.intent/` と必須成果物の存在を確認する（fail-fast）
- 利用者が俯瞰ビューの生成を要求したとき、まず `.intent/` ディレクトリの存在を確認する。
- `.intent/` または必須成果物（少なくとも `.intent/intent-tree.md`）が存在しない場合は、**何も書き込まず**に不在を明示し、先に実行すべき該当スキル（例: `/intent-discover`）を案内して終了する（fail-fast。R1.4）。この時点では `.intent/overview/overview.md` を生成・更新しない。
- `.intent/mode.md` を読む（無くても停止しない。enforcement / drift-watch の値は後続 Step で参照する。読み取りのみで変更しない）。

### Step 2: ソースを読み取り、4 つの rules に委譲して集約する
- 本スキルは独自の解析・逆算・検査ロジックを持たない。各観点の正確な読み取り規則は以下 4 つの rules に委譲する（相対パスで参照）。各 rules が指定する正確な見出し・キー・列名に従い、canonical と inferred を区別し、欠落・未観測は明示する（推測で埋めない）。
- `rules/aggregate-sources.md` — 意図ドキュメント集約（intent-tree の L0–L4 / intent-compass の North Star・Anti-direction・Invariants・Decision Rules / packets の index・active / plan / export-log / deltas）。canonical な意図と inferred（intent-tree の Assumptions / Open Questions 由来）を分離する。逆算は refactor モードの `algo-intent-recovery` 出力を読むのみで、独自の AST / スキャナ逆算は行わない。逆算が未取得なら不在を明示し該当 algo を案内する（R2.x / R4.x）。
- `rules/mermaid-tree.md` — intent-tree の L0→L4 を純 Mermaid `graph` として描画し、対応するテキスト階層を正本として併記する。intent-tree が空／未生成なら Mermaid を省略し理由を明示する（R3.x）。
- `rules/gap-readout.md` — drift-log と intent-validate の検査軸を**再実装せず読み取り**、「設計意図 vs 実装実態」のギャップとして集約する。`mode.md` の `## Drift-watch（ユーザー管理）` が `on` かつ `drift-log.md` が存在するときのみ drift を集約し、`off`／未記載／不在のときは当該ブロックを省略して未観測を明示する。validate 軸は `validate-checks.md` の安定 kebab-case ID カタログに紐づける。`## Enforcement（ユーザー管理）` / `## Drift-watch（ユーザー管理）` は読取のみ・変更しない（R5.x）。
- `rules/progress-readout.md` — 進捗を単一％でなく 3 軸（意図の安定度 / 実現の完了度 / 証拠の確定度）に分け、各軸を既存成果物の読み取りから導いて出所を明示する。軸間のズレは潰さずそのまま提示する。packet frontmatter の `depends_on` を読んでブロック状態を read-only 導出し（依存は宣言を読むだけで推論・算出しない）、循環・未解決依存があれば明示する。関心別の派生ビュー（意図 / 依存・ブロック / 進捗）として整理する。対応成果物が無い軸・ビューは「未観測／未生成」と明示し省略する（R8.x / R9.x）。
- 分岐方針: inferred の有無、drift-watch の on/off で分岐し、不在なら該当ブロックを省略してその状態を明示する（推測で埋めない）。後方互換として、`depends_on` 不在の既存 packet は「依存なし」、`## Evidence` 不在は「未記入」、旧 3 値 state（`draft|active|done`）の `active` は「進行中（実装中相当）」として読む（rules の規則に従う）。
- `rules/coverage-map.md` — **コードから意図を逆引きできない領域一覧（利用者が対象範囲を指定したときだけ生成する面・C38/A49）**: 指定範囲のコード領域を (a) packet の Scope / (b) Invariant の影響パス / (c) release-note 派生出力のコミット紐づき（記録に基づく対応／推測による対応の区別を映す）の3面で突合し、いずれの記録からも対応する意図を確認できなかった領域を根拠付きで `.intent/overview/coverage-map.md` へ派生出力する（別ファイル・生成時点明記・手動再生成のみ）。**無指定の既定実行では生成せず**、既定の俯瞰ビューの出力・所要は従来と変わらない（behavior-preserving）。判定・スコア化はしない（観測の列挙まで・Anti-direction 302）。
- `rules/aggregate-sources.md` / `rules/progress-readout.md` — **理解支援ビュー（自然言語トリガ時だけ生成）**: 「理解地図」「agent understanding map」等では tree / compass / active packet を、正本と inferred を分けたまま `.intent/overview/agent-understanding-map.md` へ再配置する。「着手前ブリーフ」では active packet の frontmatter と本文見出しから、開始前に読むべき Why / Scope / Safety / Decisions / Evidence を `.intent/overview/active-packet-briefing.md` へ要約する。「理解ギャップ整理」ではユーザーまたはエージェントが挙げた未理解点を `.intent/overview/understanding-gaps.md` へ候補整理する。いずれも派生・read-only mirror であり、packet 起票・優先度付け・Open Questions への書き戻しは行わない。
- `rules/decision-inbox.md` — **判断待ちインボックス（自然言語トリガ時だけ生成・C34/DR92）**: 利用者が「判断待ち」「未回答の問いを集めて」等を求めたときだけ、散在する未回答 Open Questions・承認待ち delta（未昇格）・追跡された warn を「いま人の判断を待っている問い」として `.intent/overview/decision-inbox.md` へ横断集約する（各項目に出所リンクと、レンズ記録があれば観点名）。**無指定の既定実行では生成せず**、Output の誘導1行に留める（behavior-preserving）。回答は本面でせず既存の編集・承認フローへ返す（read-only・INV62/INV60）。
- `rules/roadmap-projection.md` — **ロードマップ射影（自然言語トリガ時だけ生成・C34/DR92）**: 利用者が「ロードマップ」「作業順序」等を求めたときだけ、active packets の順序（`depends_on` の前後関係）・状態・ブロッカー連鎖・保留区分・最近進んだ目印・リスク集約・体験段階の束ねを `.intent/overview/roadmap-projection.md` へ射影する。**日付・進捗％・ベロシティを持たない**（INV62）。**無指定の既定実行では生成せず**、Output の誘導1行に留める（behavior-preserving）。`index.md` でなく各 packet frontmatter を正本に読み、`state` を算出せず映すのみ。
- `rules/assignment-view.md` — **割当ビュー（自然言語トリガ時だけ生成・C40/A52/INV66）**: 利用者が「割当」「誰が実装中」「二重着手」等を求めたときだけ、`.intent/assignments/` の割当宣言を read-only で読み、割当済み/未割当の一覧・同一 packet への二重宣言 warn（名指しのみ・止めない）・放置宣言の経過観測（機械閾値なし）・archive 済み packet への宣言残存を `.intent/overview/assignment-view.md` へ導出する。**無指定の既定実行では生成せず**、Output の誘導1行に留める（behavior-preserving）。宣言と `state` は別レイヤ（DR99・`state` を書き換えず読み替えない）・宣言ゼロで既存出力が不変。
- `rules/mermaid-views.md` — **Mermaid 図射影（自然言語トリガ時だけ生成・C51/DR116）**: 利用者が「マインドマップ」「図で見せて」「ロードマップを図で」等を求めたときだけ、(1) 意図の全体像のマインドマップ系 Mermaid 図（intent tree の L0–L2 中心・掴むための図）と (2) ロードマップ図（packet の順序と `depends_on` の閉塞・日付なし）を `.intent/overview/mermaid-views.md` へ派生する。**日付・進捗％・ガント・ベロシティを図にも持ち込まない**（INV62 の図適用）。GitHub / VSCode 標準描画の記法に閉じる（実験的記法を混ぜない）。既存 `mermaid-tree.md`（graph TD の既定 tree 図）とは目的が違い本文非接触。**無指定の既定実行では生成せず**、Output の誘導1行に留める（behavior-preserving）。
- `rules/newcomer-onboarding.md` — **新メンバー向けオンボーディングビュー（自然言語トリガ時だけ生成・DR106/A54）**: 利用者が「新メンバー向け」「オンボーディング」等を求めたときだけ、5点構成（①目的・成功の要約（L0/L1）②主要な横断 Invariant の抜粋 ③進行中の作業単位と着手状況（assignments の割当があれば併記）④正規語彙の主要語 ⑤読み順ガイド）の1枚を `.intent/overview/newcomer-onboarding.md` へ派生する。⑤を含む**参照先はすべて実在確認済みに限る**（dangling を作らない）。素材が薄くても止まらず「該当なし」を明示した縮退版を出す。**無指定の既定実行では生成せず**、Output の誘導1行に留める（behavior-preserving）。

### Step 3: 俯瞰ビューを最後に書き込む（全置換・派生）
- すべての読み取りと集約が終わってから、**最後に** `.intent/overview/overview.md` を**全置換**で書き込む（再生成の冪等性。R1.3）。canonical な `.intent/*.md` には一切書き込まない。
- 自然言語トリガで追加派生ビューが要求された場合のみ、同じ書込み境界で `.intent/overview/agent-understanding-map.md` / `.intent/overview/active-packet-briefing.md` / `.intent/overview/understanding-gaps.md` を全置換する。既定実行ではこれらを生成してもよいが、正本ではない旨と生成時点を必ず明示し、正本との差分として扱わない。
- 書き込む内容の構成順は「Output Description」に従う（最上段に状態3区分と人間判断候補、続いて作業単位ごとの進行状況と関心別ビュー、**末尾に派生・正本ではない旨の注記**）。
- 本ビュー全体および各派生ビューが派生（derived）・再生成可能・正本ではなく・Git 非追跡であることを末尾の注記で明示する（R1.2 / R1.3 / R1.5 / R9.5）。

## Output Description

> **出力先はターミナルである。** 出力には raw HTML（`<details>` / `<summary>` 等の折りたたみ UI）を使わず、詳細は素の Markdown 見出しで区切って退避する（ターミナルでは生タグがそのまま表示され読めなくなるため）。`[[...]]`（memory / delta 用の wikilink 等）の内部記法は、delta / memory ファイルへの記録では正当だが、人向けのターミナル出力ではそのまま出さず普通の語に開く（リンク先の名前を自然文で綴る）。

**読み手**: `.intent/` 全体を通読したい人間開発者（と、後続で読む AI）。
**この出力で最初に掴ませること**: 工程の状態・未決の設計判断・利用者成果の3区分と、明示的に読める場合だけ人間判断候補1件。その後に作業単位ごとの進行状況を示す。

ビュー冒頭は次の順で構成する（人間が「今どこ・この先どうなる」に最短で辿り着く順）。

冒頭ではまず、**工程の状態**、**未決の設計判断**、**利用者成果**を別々に短く示す。工程の状態は packet と作業単位ごとの進行状況、未決の設計判断は明示された Open Questions / 判断候補、利用者成果は成果の明示的な証拠だけを出所にする。成果の証拠が無ければ「未観測」とし、工程が進んでいることから成果を推測しない。3区分を**総合PASS**・総合スコア・「すべて正常」に畳まない。overview は独自の次の一手を増やさず、明示的な人間判断を一意に読める場合だけ最大1件を先頭に添え、読めなければ `/intent-status` の「次に人が決めること」1件へ案内する。

1. **作業単位ごとの進行状況（3区分の直後）**: 全 packet を縦に並べ、各行を ✅ 反映済 / 🔵 今ここ / ⚪ 未着手 / 🔴 反映漏れ / ◻ 統合済 のいずれかで示し、それに続けて `[現在の工程 → 次に通る工程]` を併記する（`progress-readout.md`「各行に `[現在の工程 → 次に通る工程]` を併記する」に従う）。これにより「P いくつが今ここで、この後どの工程が残るか」「どこに反映漏れ・残工程があるか」を1枚で一望させる。
2. **関心別の派生ビュー**（一覧の内訳）:
   - **意図ビュー**: intent-tree（L0–L4）の Mermaid 図 + テキスト階層、intent-compass、packets 一覧（plan / export-log / deltas を文脈として併記）。canonical と inferred を区別。
   - **依存・ブロックビュー**: packet 間の `depends_on` に基づく依存関係とブロック状態（あれば循環・未解決依存も明示）。
   - **進捗ビュー**: 3 軸（意図の安定度 / 実現の完了度 / 証拠の確定度）と各軸の出所、軸間のズレ、設計意図 vs 実装実態のギャップ集約（作業単位ごとの進行状況は 1. で先頭に出すため、ここでは3軸の内訳に集中する）。
3. **末尾の注記**: 本ビュー全体および各ビューが派生（derived）・再生成可能・Git 非追跡であり正本ではないこと（R1.2 / R1.3 / R1.5 / R9.5）。素材が無いビュー・軸は省略し理由（未観測／未生成）を明示する。
4. **コードから意図を逆引きできない領域一覧への誘導（1行・毎回出す）**: 「対象範囲（ディレクトリ等）を指定して `/intent-overview` を実行すると、各コード領域を起点に3種類の記録から対応する意図を探し、確認できない領域の一覧を `.intent/overview/coverage-map.md` に生成できます」を末尾の注記に添える（既に生成済みの coverage-map.md が在ればその生成時点も添える）。対象範囲が指定された実行では、この誘導の代わりにマップ生成の結果（空白の件数・出力先）を関心別ビューの後に示す。
5. **理解支援ビューへの誘導（自然言語トリガ時）**: 「理解地図」「着手前ブリーフ」「理解ギャップ整理」が要求された実行では、生成した派生ビューの出力先（`.intent/overview/agent-understanding-map.md` / `.intent/overview/active-packet-briefing.md` / `.intent/overview/understanding-gaps.md`）と、そこに含めた根拠ファイルを短く示す。未生成の場合は、どの素材が足りないかを明示する。
6. **判断待ちインボックス・ロードマップ射影への誘導（1行・毎回出す）**: 「『判断待ち』を指定して `/intent-overview` を実行すると未回答の問い・承認待ちの学び・警告を横断した判断待ちインボックス（`.intent/overview/decision-inbox.md`）を、『ロードマップ』を指定すると日付なしの作業順序とブロッカー連鎖のロードマップ射影（`.intent/overview/roadmap-projection.md`）を生成できます」を末尾の注記に添える。判断待ち／ロードマップが要求された実行では、この誘導の代わりに生成結果（件数・出力先）を関心別ビューの後に示す。
7. **割当ビュー・Mermaid 図射影への誘導（1行・毎回出す）**: 「『割当』を指定して `/intent-overview` を実行するとどの packet を誰が実装中か・二重着手の割当ビュー（`.intent/overview/assignment-view.md`）を、『マインドマップ』『ロードマップを図で』を指定すると意図の全体像・作業順序を GitHub / VSCode がそのまま描画する Mermaid 図射影（`.intent/overview/mermaid-views.md`）を生成できます」を末尾の注記に添える。割当／図が要求された実行では、この誘導の代わりに生成結果（件数・出力先）を関心別ビューの後に示す。
8. **新メンバー向けオンボーディングビューへの誘導（1行・毎回出す）**: 「『新メンバー向け』を指定して `/intent-overview` を実行すると、目的・判断基準・進行中の作業・主要語・読み順を5点で束ねた新メンバー向けの入口1枚（`.intent/overview/newcomer-onboarding.md`）を生成できます」を末尾の注記に添える。新メンバー向けが要求された実行では、この誘導の代わりに生成結果（出力先・素材の在否）を関心別ビューの後に示す。

### 報告の平易さ点検（利用者向け報告・出力直前・共通）

利用者へ向けた報告（進捗・完了・確認事項の提示。ターン末尾の要約を含む）を出す直前に、次を点検する（INV105・DR208）。対象は利用者向けの報告文だけで、内部の記録（`.intent/` 配下の canonical・ログ）の書き方には適用しない。

- **内部文書の文をそのまま転写しない**: 直前に読んだ・書いた内部成果物（tree・compass・packet・Open Questions）の文面は内部の語彙で書かれている。報告では、その内容を初見の読み手に通じる言葉で言い直す（事実・意味は変えない）。
- **識別子を本文の主語にしない**: 確認事項・作業単位を示すときは、まず「何を・なぜ」が単体で通じる一文を置き、識別子（Open Question 番号・packet 名・記号・工程名）はその後ろに参照として添える（例: 「…を確かめてから始めてください（整理番号: OQ-xxx-1）」）。平易化のために識別子・記録への参照を削らない（記録へ辿れなくなる）。
- **通じるかの合図**: 1文に未説明の内部語が3つ以上並んだら詰め込みすぎの合図（機械カウントではなく意味の読みで）。単体で通じなければ、平易に書き直してから出す（事実・意味は変えない）。
- **比喩・曖昧な言い方だけで意味を渡さない**: 報告の土台は正確さ（意味が一意に読める記述。平易さはそれを保ったまま易しく書く手段）。基準のない程度語（「かなり」「うまく」等）だけで結果を伝えず、観測できる事実で書く。比喩を使うなら直後に正確な言い直しを必ず併記する（確立された専門用語・世間の意味のままの一般語は無理に開かない）。
- この点検は事後の記録と対で働く（予防だけで閉じない）: 報告が通じなかった実例は、drift-watch が on のとき drift-log へ症例として残し、次の予防に使う。

## Safety & Fallback
- **他スキルを直接呼ばない**: 連携は scaffold ファイル（`.intent/*.md`）を介した読み取りと、出力テキストでの案内のみで行う（R6.5）。逆算（`algo-intent-recovery`）／検査（intent-validate）／drift（drift-watch）の判定ロジックは持たず、それらが残した出力・定義を読むだけである。
- **状態機械・自律ループ・常駐プロセスを持たない**（R6.1）。出力ビュー自体が読み取り時点のスナップショットとして機能する。
- **外部依存ゼロ**（INV2 / R6.2）。外部パッケージを導入せず、Node 標準と自然言語ヒューリスティクスに限定する。
- **アプリケーションコードを変更しない**（INV6 / R6.3）。
- **前提不在時**: `.intent/` または必須成果物が無いとき、何も書き込まず不在を明示し、先に実行すべきスキル（例: `/intent-discover`）を案内して終了する（R1.4）。
- **部分欠落時**: inferred 未取得 / drift-watch off / intent-tree 空などは、当該ブロックを省略し「未取得／未観測／未生成」を明示する（推測で埋めない）。Mermaid 生成不能のときはテキスト階層を正本として提示し図を省略、理由を注記する。
- **理解支援ビューの安全境界**: 理解地図・着手前ブリーフ・理解ギャップ整理は、既存成果物の並べ替えと候補提示に限定する。優先順位の決定、packet state の変更、Open Questions への追記、実装タスク化は行わない。
