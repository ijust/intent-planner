# intent-planner

![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg) ![node](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen)

README: [日本語](README.md) | [English](README.en.md)

**Pre-spec Steering Layer for AI coding agents**
*— intent-aware steering, one stage before your specs.*

AI コーディングエージェント（Claude Code / Codex）に大きめの変更を頼む前に、「何を作りたいのか」「何を守りたいのか」をエージェントと一緒に整理し、実装中もそれがブレないようにするツールです。

これは **Intent Driven Development (IDD)** の軽量実装です。Why/What（なぜ・何を）を Source とし、工程（discover→compass→packets→export→writeback）を固定されたレールとして持つことで、「意図（Intent）が開発を駆動する」形を成立させます。進行段階（state）は記録しますが、それを自律的に動かす状態機械は内蔵せず、駆動は外側のループ（人手のレビュー、または `/loop` 等のハーネス）に委ねます — それでも次の一手を決めるのは Intent です。重い状態機械を持たない代わりに、工程レールに人が任意のタイミングでレビューを挟める軽さを保ちます。

- **実装前**: 意図を構造化し、判断基準（守るべき不変則・進んではいけない方向）を文書化する
- **実装へ**: 整理した意図を [cc-sdd](https://github.com/gotalab/cc-sdd) の spec 駆動フローへそのまま引き継ぐ
- **実装後**: 実装で得た学びを意図の文書へ書き戻し、「最初に作って終わり」にしない

導入するとスラッシュコマンド（skill）一式と `.intent/` フォルダが追加されるだけです。あなたのアプリケーションコードには一切触れません。

各機能の背後にある考え方（要求工学・ソフトウェアアーキテクチャ研究との対応）は [docs/theory.md](docs/theory.md) で解説しています。理論を知らなくても使えるよう設計していますが、「なぜこの手順なのか」を知りたいときに参照してください。

## こんなときに

| 状況 | intent-planner がやること |
|---|---|
| 新規プロダクト・機能を AI 主導で作り始めたい | 作りたいものの意図と判断基準を実装前に言語化し、最初の1行から steering（プロジェクト全体に常時効く指針コンテキスト）を効かせる |
| PoC・個人開発を1人で作りたい | 設計者役の詰めの問い（計測できる成功基準、walking skeleton、画面ラフ、検証なら仮説と反証条件・GO/NO-GO）を入口で opt-in でき、export 前の検査で漏れを検出する |
| 大規模リファクタを頼みたい | 「正しく動くが設計意図からズレる」変更を防ぐ判断基準を先に作る |
| レガシーで仕様が分からない | 観測できる振る舞いから意図を逆算して文書化する |
| 稼働中システムに機能追加したい | 既存への影響を踏まえた追加単位に分解する |
| AI の変更が毎回少しずつ方向違い | 全体意図を AI が毎回参照できる形（steering context）にする |

## 必要なもの

- **Claude Code** または **Codex**（`--agent` で選択）
- **Node.js**（インストーラの実行に使用。ランタイム依存はゼロ）
- [cc-sdd](https://github.com/gotalab/cc-sdd)（任意。export 先として使う場合）

## クイックスタート

```bash
# プロジェクトのルートで
npx intent-planner

# Codex を使う場合
npx intent-planner --agent codex
```

導入すると、使うエージェントに合わせて**ルート規約文書**が非破壊で配置されます（Claude Code には `CLAUDE.md`、Codex には `AGENTS.md`）。これは intent-planner の使い方（workflow・入口コマンド・最小ルール）をエージェントに能動的に教える「薄い入口」です。Spec や不変則の本体は積まず、実装の直前に必要な分だけを参照させる設計なので、導入で常時の読み込みコストが膨らみません。既存の `CLAUDE.md` / `AGENTS.md` があれば上書きせず尊重します。

導入後、AI コーディングエージェント（Claude Code / Codex）でこの順に実行します。

```
/intent-discover   →  /intent-compass  →  /intent-packets  →  /intent-export-cc-sdd
（意図の全体像）      （判断基準）        （作業単位に分解）    （cc-sdd へ引き継ぎ）
```

最初の `/intent-discover` を実行すると、エージェントがあなたの課題・アイデアについていくつか質問し、意図の全体像を `.intent/intent-tree.md` に書き出します。以降も同様に、各ステップの成果物は `.intent/` 配下の Markdown です。レビューしてから次へ進んでください。**迷ったら `/intent-status`** — 現在地と「次の一手」を教えてくれます。

## コマンド一覧

### 計画（最初にこの順で）

| コマンド | やること |
|---|---|
| `/intent-discover` | 課題やアイデアから Intent Tree（意図の階層 L0–L4）を作り、進め方のモードを確定し、設計者役の詰めの問い（designer-questions）の要否を確認して記録する |
| `/intent-compass` | North Star（目指す姿）/ Anti-direction(進んではいけない方向)/ Invariants（不変則）などの判断基準を作る |
| `/intent-packets` | 実装に渡せる作業単位（packet）に分解する。聞き漏らしやすい技術的決定（整合性・冪等性・エラー意味論・認可など）を packet の `## Decisions` に決定スロットとして播き、未決定は理由付きで保持する |
| `/intent-export-cc-sdd` | 選んだ packet 1つを cc-sdd の下書きに変換する。enforcement 設定時は export 前に書き戻し漏れを検査する（remind=警告 / gate=停止） |
| `/intent-export-openspec` | 選んだ packet 1つを OpenSpec の proposal 下書き + delta spec ヒントに変換し、続行指示で `/opsx:propose` を起動する。enforcement / drift / Open Questions の検査は cc-sdd 版と同型 |

### 維持（実装後に。intent を育て続ける）

| コマンド | いつ | やること |
|---|---|---|
| `/intent-writeback` | packet の実装完了後 | 実装で得た学び（新しい決定・invariant 違反の発見・暗黙挙動・Deferred の解消）を `.intent/deltas.md` に記録し、承認した項目だけを Intent Tree / Compass / Packets へ反映する |
| `/intent-improve` | 数 packet 完了後やリリース前などの節目 | `.intent/` と実装の現実を completeness / correctness / coherence の3軸で突き合わせ、ズレの是正案を提示する（反映は承認後のみ）。`.intent/milestones.md` に記録した節目イベントを各 Decision Rule の `Revisit when` と照合し、合致した決定の見直しを再提案する。Decision Rules / invariant に影響する是正が生じた回は、`/intent-validate` での conformance 追従確認も併せて促す |

### 随時（読み取り専用）

> これらの read-only 系スキル（`/intent-status` / `/intent-validate` / `/intent-overview` / `/intent-from-spec` / `/intent-to-spec` / `/intent-release-note`）は、スラッシュで明示起動できるほか、文脈に応じてエージェントが自動起動することもあります（canonical を書き換えないため）。canonical を書き換えるスキル（discover / compass / packets / writeback / improve / export）は明示起動のみです。

| コマンド | やること |
|---|---|
| `/intent-status` | 現在地の要約と「次の一手」をちょうど1つ推奨する。冒頭に工程レール（全 packet を 反映済 / 今ここ / 未着手 / 反映漏れ / 統合済 の5信号で一覧し、各行に `[現在の工程 → 次に通る工程]` を併記）を表示し、「どの packet が今ここで・この後どの工程が残り・どこに書き戻し漏れがあるか」を一望できる。何も書き換えない。enforcement 設定時は書き戻し漏れの警告も表示する。compass（Invariants / Decision Rules）を更新したのに追随していない packet が溜まってきたら、`/intent-validate` を回す頃合いとして推奨する（read-only の概算。確定診断は validate に委ねる）。`.kiro/specs/` に進行/完了 spec があるのに対応 Packet が無い場合は「Packet を経ずに実装された疑い（起草スキップ）」として、対応する intent-tree の起票が無い場合は「intent-tree 起票漏れ」として候補提示する（断定しない警告）。`.intent/milestones.md` に記録済みだが見直しが消化されていない節目イベント（未消化 milestone 残課題）も表示する |
| `/intent-overview` | Intent Tree・Compass・packets を横断集約し、Mermaid ツリー（L0 を頂点・L4 を末端とする木構造）・工程レール（5信号 + 各行の `[現在の工程 → 次に通る工程]` 併記で残工程と反映漏れを一望）・進捗3軸・ギャップを一覧で読み出す。何も書き換えない |
| `/intent-from-spec` | 既存の自然言語仕様書（PRD・設計仕様・issue など）を入力に取り、書かれていない意図 — invariant・anti-direction・暗黙前提 — を物差しに照らしてギャップとして表出する（内向きの射影）。抽出は Assumptions（仮説）として提示し、`.intent/spec-ingest/` に派生出力する。canonical は書き換えない |
| `/intent-to-spec` | Intent・steering 制約・requirements の三層を、指定した範囲（source scope）と体裁（target format: why 前面の上流向け / requirements 横断の統合仕様書）でひとつの自然言語 Spec へ射影する（外向きの生成）。射影元へのトレースを付与し、根拠の無い記述は inferred と標識して `.intent/nl-spec/` に派生出力する。canonical は書き換えない |
| `/intent-release-note` | git のコミット履歴を read-only で読み、各コミットを intent（packet 名 / parent intent / deltas / milestones）とテキスト照合して「なぜ変わったか」を補い、changelog 風 / GitHub Releases 風の release note を `.intent/release-note/` に派生出力する（外向きの射影）。既定の範囲は直近 tag〜HEAD（`<from>..<to>` 指定可）。意図に紐づかないコミットは薄い行で残して落差を可視化する。git は読むだけ（commit / tag / push をしない）で canonical も書き換えない |
| `/intent-validate` | export 前に意図の文書間の矛盾・漏れ・境界の重複、設計者役の詰めの問い（designer-questions / purpose）の記録に応じた必須記録の欠落（規範検査）を深刻度付きで報告する。完全性の床（決定スロットの未記入）・曖昧語（smells）・観点別レビュー（PBR 四観点）も検査する。さらに憲法の継承照合（compass conformance）として、compass の invariant / Decision Rules が各 packet に継承・追随しているかを read-only で照合する3軸 — 普遍 invariant の継承欠落（`invariant-uninherited`）・compass 更新の packet 遡及漏れ（`invariant-stale-vs-compass`）・Decision Rules と packet 決定の乖離（`decision-rule-mismatch`）— も検査する。さらに、確定の文体に紛れた未確定動詞（`ambiguous-deferred-phrasing`）と、Decision Rule の主文とコード実装の意味的乖離（`decision-rule-code-alignment`）も検査する。何も書き換えない |

## 利用ストーリー

ひとつの機能群を「intent を育てながら」進める具体的な流れです。

1. `/intent-discover` → `/intent-compass` → `/intent-packets` で、意図の全体像・判断基準・作業単位（packet）を作ります。
2. export の前に `/intent-validate` を実行します。たとえば「packet B は Compass の Invariant と矛盾」のような要修正の指摘が出たら、`/intent-packets` を再実行して解消してから先へ進みます。
3. `/intent-export-cc-sdd` で最初の packet を cc-sdd の下書きに変換し、cc-sdd の spec フロー（requirements → design → tasks）で実装します。
4. 実装が完了したら `/intent-writeback` を実行します。実装の現実と packet 定義・Compass を突き合わせて学びを抽出し、まず `.intent/deltas.md` に delta として記録します。この時点では元の文書は書き換えません。
5. 提示された学びを承認すると、delta が Intent Tree / Compass / Packets へ反映されます。承認は学びの種類で粒度が変わります — invariant 違反の発見や判断基準（Compass の Decision Rules）の変更を伴う決定は項目ごとに確認し、それ以外（Intent Tree への追記に留まる学びや未解決 Question の転記）は反映先を一覧で提示して、止めたい項目だけ指定すれば残りは一括で反映されます。Decision Rules の変更を伴う場合は ADR 形式の新しいエントリが追加され、置き換えられる旧エントリには superseded の注記が付きます。なお「delta を経てしか本文書を書き換えない」のは**実装後の書き戻し（writeback）に限った規律**です。実装に入る前の起草 — `/intent-compass` が判断基準を、`/intent-packets` が作業単位を据える段 — では、確認のうえで Intent Tree / Compass / Packets を直接書きます（こちらが正規の動作で、writeback の規律違反ではありません）。
6. `/intent-status` を実行すると、更新後の `.intent/` を読んで「次の一手」── 次の packet の export など ── をちょうど1つ案内してくれます。書き戻しをうっかり飛ばしていた場合も、enforcement（後述）を `remind` 以上に設定していれば、ここや次の export の前に漏れとして指摘されます。
7. 2周目以降、数 packet 回した節目に `/intent-improve` を実行します。packet 単位の書き戻しでは拾えない全体の陳腐化（実装にあるのに intent に無い、intent にあるのに実装と食い違う等）を検出し、是正案を承認ベースで反映します。

学びは `.intent/deltas.md` に貯まり、承認されたものだけが意図の文書に反映されます。これにより `.intent/` は実装の現実と同期し続ける判断基準であり続けます。

## Intent Driven Development（IDD）として一周回す

上の利用ストーリーは、discover → compass → packets → export → 実装 → writeback → status → （次の packet へ）という**一周するループ**です。intent-planner はこのループを **state（進行段階）として記録**しますが、ループを次へ進める**駆動**は製品の中に持たず、外側に委ねます。だから回し方が2通りあります。

**1. 人手で回す（既定・レビューを毎周挟む）**

```
/intent-discover "課題"        ← 意図の全体像
  → /intent-compass             ← 判断基準
  → /intent-packets             ← 作業単位に分解
  → /intent-export-cc-sdd {pkt} ← cc-sdd へ引き継いで実装
  → /intent-writeback {pkt}     ← 学びを deltas へ、承認分だけ反映
  → /intent-status              ← 「次の一手」を1つ受け取る
  → （次の packet の export へ戻る）
```

各段の成果物は `.intent/` 配下の Markdown なので、**任意のタイミングでレビューを挟めます**。次に何をするかは `/intent-status` が指す「次の一手」で決まります — 駆動の判断はあなたが握ります。

**2. 駆動を外側のループに委ねる（`/loop` など）**

「次の一手を受け取って実行する」を人が毎回やる代わりに、`/loop` のようなハーネスに委ねると、工程が自走します。

```
/loop /intent-status
  → status が出す「次の一手」を外側のループが拾い、
    次の packet の export → 実装 → writeback まで進めて、
    また status に戻る — これを繰り返す
```

この2通りで変わるのは**駆動を誰が握るか**だけです。どちらでも、次に何を作るかを決めているのは Intent（Intent Tree / Compass / packets と、status が出す「次の一手」）です。**製品が自律遷移する状態機械を内蔵していなくても、Intent が開発を駆動する**── これが intent-planner の IDD の形です。状態機械を持たないぶん、人がいつでも割り込んでレビューできる軽さが保たれます。理屈は [docs/theory.md の「状態は持つが、状態機械は持たない」節](docs/theory.md)で解説しています。

> **`/loop` で自走させるときの代償（必ず把握してください）**
> intent-planner の書き込み系コマンド（discover / compass / packets / writeback / improve / export）は**意図的に人間の承認を前提**にしています。これは "intent-driven" を名乗るツールに共通する設計で、無監視で走り続ける開発（vibe coding）への歯止めとして承認ゲートを置いているからです。`/loop` で外側ループに駆動を委ねて承認を飛ばすと、auto-loop の速さと引き換えに次を失います:
> - **drift の検知機会** — 各段で人が成果物を見て「意図とズレている」と気づく機会が減る
> - **canonical の保護** — writeback の承認粒度（invariant 違反や Decision Rule 変更は項目ごとに確認）を素通りすると、誤った学びがそのまま意図文書に反映されうる
> - **load-bearing な分岐のレビュー** — discover/compass が投げる「人間が確定すべき Open Questions」を承認なしで埋めると、推測が確定として固定されうる
>
> 推奨は**ハイブリッド**です: 内側の implement→test→fix は `/loop` に委ねて速く回し、**段の切れ目（compass 確定・packet 分解・writeback 承認・load-bearing な Open Questions）では人が割り込む**。read-only 系（status / validate / overview）は承認不要なので、`/loop` の中でも安全に自走の判断材料を出し続けます。「全部を承認レスで回す」より「**効く一点に承認を集中する**」のが、軽さと安全を両立させる intent-planner の使い方です。
>
> **承認ゲートは2段あり、外す主体はあなた（とハーネス）です。** intent-planner 自身は止める力を持たず、堰を2つ用意しているだけです:
> 1. **自動起動ゲート** — 書き込み系スキルは SKILL.md に「明示起動のみ（AI が文脈で勝手に起動しない）」と宣言しています。ユーザーがこの宣言を編集すれば外せますが、配布物は同一性検証（byte/hash lock）されており、`npx intent-planner --force` の再配置で上書きされ得る前提です。＝外すことは想定された使い方ではありません。
> 2. **ツール実行の承認** — スキルが実際にファイルへ書く瞬間の許可は、intent-planner ではなく**ハーネス（Claude Code / Codex）**が握ります。auto-accept や権限スキップに相当する設定で外せますが、それはハーネス側の責任範囲です。
>
> `/loop` で自走させるとは、実質この2段目（ハーネスの Write 承認）を外すことです。1段目まで外すと完全に承認レス（vibe coding）になり、上記の代償がそのまま顕在化します。intent-planner はそれを禁止しませんが、**どちらの堰を外しているのかを意識して**使ってください。

## Before / After（適用例）

曖昧な依頼1行が、intent-planner を通すとどう具体化されるかの対比です（題材: ログイン機能）。

**Before** — エージェントへの依頼はこれだけ:

```
ログイン機能をいい感じに作って
```

「いい感じ」の解釈はエージェント任せになり、独自のパスワード認証を生やす・既存の認証基盤と整合しない実装に進むなど、局所最適に流れがちです。

**After** — `/intent-discover` → `/intent-compass` → `/intent-packets` を通すと、同じ依頼が次の形になります。

- **L1 ゴール（計測基準付き）**: 初回ユーザーが2分以内にログインを完了できる（ログイン開始〜ダッシュボード表示で計測）
- **Invariant（守る不変則）**: 既存 OAuth provider（Google / GitHub）との互換性を壊さない
- **Anti-direction（進んではいけない方向）**: 独自のパスワード認証を追加しない
- **packet 列（実装の作業単位）**:
  1. **P1: OAuth callback の E2E** — ログイン開始〜セッション確立を最小構成で貫通させる（walking skeleton）
  2. **P2: エラー状態と再試行 UI** — provider 拒否・タイムアウト時の表示と再試行
  3. **P3: 監査ログ** — ログイン成否の記録

  最初の推薦は P1。一番細い経路を先に end-to-end で通すことで、最大の不確実性（リダイレクト設定・セッション管理）を最初の packet で解消できるためです。

この L1 / Invariant / Anti-direction が steering context としてエージェントに毎回渡るため、P2 以降の実装でも「独自認証を生やさない」「既存 provider を壊さない」という判断基準が効き続けます。

## ファイル構成（`.intent/`）

intent-planner の成果物はすべて `.intent/` 配下の Markdown です。原則は「**1単位 = 1ファイル、現役と完了を物理的に分ける、共有する正史と個人の作業物を分ける**」。

```
.intent/
├── intent-tree.md        # 意図の階層（L0 目的 〜 L4 packet 候補）
├── intent-compass.md     # 判断基準: North Star / Anti-direction / 不変則 / Decision Rules（現役のみ）
├── compass-archive.md    # 覆された Decision Rules の退避先（履歴。compass は現役だけで薄く保つ）
├── packets/
│   ├── index.md          # active な packet の一覧（自動生成・手動編集しない）
│   ├── plan.md           # 計画レベルの記録（Walking Skeleton / 最初の推薦 / Deferred）
│   ├── active/           # 進行中の packet。1 packet = 1 ファイル
│   └── archive/<年>/     # 完了・置換済みの packet。消えずにここへ移る
├── cc-sdd/<スラッグ>/    # cc-sdd へ渡す下書き（packet ごと。Git 非追跡のローカル作業物）
├── deltas.md             # 実装から得た学びの受け皿（承認後に本文書へ反映）
├── milestones.md         # 節目イベントの記録（append-only。improve の Revisit 照合・status の残課題表示が参照）
├── export-log.md         # export の履歴（1 export = 1行。「最新の packet」の正典）
└── mode.md, modes/       # 進め方モードの記録と定義
```

### あなたが触るもの・コマンドに任せるもの

| 関わり方 | 対象 | やること |
|---|---|---|
| **読んでレビュー・承認する** | packet ファイル（active/）・deltas.md の学び・compass の判断基準 | コマンドが提示する案を承認/修正する。これが人間の主な仕事です |
| **直接書いてもよい** | tree / compass の Open Questions への回答 | ファイルを直接編集するか、会話で伝えれば次のコマンド実行時に反映されます |
| **触らない（自動管理）** | `packets/index.md`（生成物）・`export-log.md`（自動追記）・`cc-sdd/` の下書き | 手動編集は不要です |

現在地が分からなくなったら `/intent-status` — 全体の要約と「次の一手」を1つだけ教えてくれます。

### packet は消えない

packet（作業単位）は `.intent/packets/active/` に1ファイルで生まれ、あなたの承認で active、実装と書き戻しの完了で done になって `archive/<年>/` へ移動します。計画見直しで置き換えた場合も superseded として archive に残ります。**削除はされないので、planning を何度やり直しても過去の判断は失われません。** 全体像は `packets/index.md` 1枚で見られます（コマンドも index + 対象 packet だけを読むため、packet が増えても重くなりません）。

### Git はそのままコミットすればよい

`.intent/` はほぼ全部がコミット対象（チームで共有する正史）です。ローカル作業物である `cc-sdd/` の下書きと mode 状態（`mode.local.md`）はインストーラが `.gitignore` を自動整備するので、**あなたが Git の設定で考えることはありません**。チームでのマージ衝突も起きず、「いまどの packet が export されたか」はコミットされる `export-log.md` で全員が同じ判定になります。

mode 状態（選択中の mode・purpose など作業の詰め方）は開発者ごと・セッションごとに異なるため、`.intent/mode.local.md` にローカル保存されます。チームで共有すべき Enforcement / Drift-watch ポリシーは従来どおり `.intent/mode.md` にコミットされます。これにより並行セッション間での mode 衝突が起きなくなります。

## インストールの詳細

```bash
npx intent-planner ./my-project          # 指定ディレクトリへ
npx intent-planner --dry-run             # 何が起きるか先に確認
npx intent-planner --lang en --agent codex   # 英語 + Codex
```

（npm レジストリには未公開のため GitHub 直接指定。公開後は `npx intent-planner` になります）

| オプション | 説明 |
|---|---|
| `dir` | 配置先ディレクトリ（既定: カレント） |
| `--force` | 同名ファイルがあっても上書きする（既定: スキップ） |
| `--dry-run` | 書き込まず、配置/スキップ予定の一覧だけ表示する |
| `--lang <value>` | 言語指定: `ja`（既定）/ `en` |
| `--agent <value>` | 対象エージェント: `claude`（既定）/ `codex` |
| `--enforce` | pre-push フック（`.git/hooks/pre-push`）を配置する（既定: 配置しない）。「Enforcement」セクション参照 |
| `--help`, `-h` | ヘルプを表示する |

配置されるもの（既存の同名ファイルは上書きしません）:

```
.claude/skills/intent-*/   スラッシュコマンドの実体（--agent codex の場合は .agents/skills/ + AGENTS.md）
.intent/                   Intent Tree / Compass / Packets / deltas / modes などの scaffold（記入用の雛形ファイル群）
```

## モード（進め方の切り替え）

プロジェクトの状況に合わせて、Intent の詰め方を「モード」として切り替えられます。`/intent-discover` が状況を見て推奨し、`.intent/mode.md` に記録されます。

- **standard** — 既定の汎用モード。新規プロダクトにも、既存プロジェクト内の意図がまだ言語化されていない機能群にも
- **refactor** — 既存大規模プロジェクトのリファクタ・再設計に。コードから意図を逆算する手順を含む
- **behavior-unknown** — 仕様文書がなく振る舞いも不明なレガシーに
- **feature-growth** — 稼働中システムへの新機能追加に。既存への影響分析と追加単位の分解を含む
- **non-code** — 非プログラム成果物（文書・業務・研究）向け。コード前提の cc-sdd/openspec を経由せず、読める成果物を生成する経路に切り替える

新しいモードは `.intent/modes/` にファイルを1枚足すだけで追加できます（`.intent/modes/README.md` 参照）。

非プログラムモード `non-code` を選び、非プログラム向けの target format で `/intent-to-spec` を実行すると、cc-sdd/openspec を経由せず `.intent/nl-spec/` 配下に読める成果物（記事構成案・業務手順書・調査ブリーフ等）が派生出力されます。

### 設計者役の詰めの問い（designer-questions）— モードと直交するもう1つの軸

`/intent-discover` は入口で、フローが代わりに問うてくれること（L1 成功基準の計測可能化、最初の packet の E2E 確認 = walking skeleton、UI がある場合の画面ラフ、検証の場合の仮説と完了判定）を説明し、要否（designer-questions: `on` / `off`）を確認して `.intent/mode.md` に記録します。`on` のときは共通3質問（L1 の計測基準・walking skeleton・画面ラフ）と `/intent-validate` の規範検査が有効になり、さらに「検証（PoC）か本番か」（purpose: `poc` / `product`）を確認して、`poc` なら仮説・反証条件・GO/NO-GO の質問が加わります。`off` のときの増分は要否確認の1問だけです。この on/off に関わらず、要望が確立パターン（cron 化・CLI 化・ワンショット化 など）で目指す構成が一意に決まると判定したときは、中立な選択肢で回り道させず、推論した構成を「目指す構成はこれですよね」と1問で先に当てて確認します（発散している判断では従来どおり anchoring を避けます）。

## Enforcement（書き戻し漏れの検査・任意）

実装後の `/intent-writeback` を飛ばしたまま次の packet へ進むと、`.intent/` は実装の現実から静かに乖離していきます。enforcement は、この「writeback の実行漏れ」を機械的に検出する任意のレイヤーです。**既定は off** で、設定しない限り何も変わりません。

強度は3段階あり、`.intent/mode.md` の「Enforcement（ユーザー管理）」セクションを直接編集して切り替えます（スキルはこのセクションを書き換えません）。

| 値 | 動作 |
|---|---|
| `off`（既定） | 検査しない。従来どおりの動作 |
| `remind` | 書き戻し漏れを検出したら警告のみ表示する。停止しない |
| `gate` | 書き戻し漏れを検出したら export / push を停止する |

検査されるのは次の2つです。

- **pending delta の放置（中心）** — `/intent-writeback` で記録したまま、承認・反映されずに残っている delta。enforcement の主目的はこちらの検出です
- **staleness（実験的）** — 最後の書き戻し（または export）以降に `.intent/` 以外を変更したコミット数が閾値（`enforcement-threshold`、既定: 5）を超えた状態。依存更新などの無関係なコミットも数えるため誤検知が残ります。`enforcement-exclude` で計数から除くパスを指定できますが、まず `remind` で試して誤検知の感触を見てから `gate` を検討することを推奨します

検査が効く場所は3つあります。

1. `/intent-export-cc-sdd` の export 前（remind=警告のみ / gate=停止）
2. `/intent-status` の警告表示
3. `--enforce` で導入した pre-push フック（push 直前の関所）

```bash
npx intent-planner --enforce   # 通常の配置に加えて pre-push フックも配置
```

誤検知に備えた逃げ道があります。gate で停止しても、明示的に続行を指示すれば export は実行でき、push は `git push --no-verify` で通せます。

enforcement が強制するのは「writeback という手続きの実行」だけで、書き戻した内容の正しさは保証しません（それは `/intent-improve` と人間レビューの責務です）。誤検知が構造的に残るため、既定を off にしています。

## Drift-watch（逸脱の監視・任意）

意図を立てても、cc-sdd の spec フロー（requirements → design → impl）で作り進めるほど、実装が当初の意図から少しずつ外れていくことがあります（AI が「分割して疎結合に」といった美徳へ過剰適応し、意図より複雑な構造を生むなど）。drift-watch は、この逸脱（drift）を**外れきる前に捕まえる**任意のレイヤーです。enforcement と並ぶクロスカット層で、モードではありません。**既定は off**。`.intent/mode.md` の「Drift-watch（ユーザー管理）」セクションを直接編集して `on` に切り替えます（値は `off` | `on` の2つだけ）。

`on` のとき、既存の3工程に軽いフックが差さります。

| 工程 | 何をするか |
|---|---|
| `/intent-discover` | 着手前に「逸脱しやすい地形」を型カタログ（`.intent/drift-patterns.md`）と照合して名指しし、先に anti-direction / invariant を書かせる（予防） |
| `/intent-export-cc-sdd` | cc-sdd へ渡す直前に compass（Invariant / Anti-direction / North Star）と照合し、外れていれば警告する（水際）。あわせて、export 済み packet の宣言スコープ（`## Scope`）を超える実装指示が来ていないかを照合し、超過していれば新領域の packet 固有不変則（認可・整合性・トランザクション境界・冪等性）の不在を `mechanism: packet-scope-overflow` として警告・記録する（スコープ超過の検知） |
| `/intent-improve` | 節目に逸脱を記録し、`pattern × outcome` で集計した改善度レポートを出す（事後）。`packet-scope-overflow` は「スコープ超過なら intent に戻る」第一防御がどれだけ効いているか（意図流動率）を測る計器として読む |

**いずれも警告のみで、停止はしません**（enforcement の `gate` とは別概念。誤検知を前提とするため止めません）。検知は `.intent/drift-log.md` にローカル記録されるだけで、外部へ送信されることは一切ありません。記録は効いた瞬間（防げた / 捕まえた）と効かなかった瞬間（見逃した / 誤検知だった）を対称に残す設計で、確証バイアスを構造的に避けます。`/intent-status` でも軽い集計が併記されます（読み取りのみ）。

型カタログ（`.intent/drift-patterns.md`）は網羅ではなく、あなたが自分の現場で踏んだ逸脱を型として足して育てる前提のファイルです。背景の考え方と出典は [docs/theory.md](docs/theory.md) にまとめています。

`on` のとき、同じ gate に相乗りして **コンテキストコストの気づき**（context-cost-cues）も働きます。「コンテキスト（トークン）を食う進め方」の型を `.intent/context-cost-cues.md`（あなたが育てるカタログ）と照合し、discover と improve で「これがコンテキストを食っているかもしれない」と**気づかせます**。ただしこれは規範ではなく気づきで、大量スキルの導入や全文ロードは正当な選択でありうるため**否定も矯正もしません**。そして消費量は計測不能なため、**どのログにも記録しません**（drift-log とは異なり集計も持ちません）。判断は利用者に委ねます。

## 造語の管理（ユビキタス言語）

使い込むほど、AI は「正規語彙（そのプロジェクトで合意された正しい用語）に無い新造の語＝造語」を増やしがちで、語彙が分裂すると意図の擦り合わせが崩れます。intent-planner は造語を**予防・検出・言い換え**で管理し、減らします。

- **正規語彙の台帳** — `.intent/glossary.md`（正規語＋表記ゆれ・同義語＋一行説明）に「これが正しい用語」を集約します。あなたが育てる canonical で、コマンドは読むだけ・自動では書き換えません（訳語へ一括置換はしません）。
- **検出と言い換え** — `/intent-validate` が台帳に無い語を「造語の疑い」として読み取り専用で名指しし、正規語への言い換え案を添えます。**警告のみで停止しません**（drift-watch と同じ温度・既定 off の検査）。固有名詞・既存の英語技術用語・初出に一行説明を付けた正当な新語は除外します。言い換えは提示までで、反映はあなたが承認してから行います。
- **予防** — 配布される規約文書（CLAUDE.md / AGENTS.md）の用語作法に「正規語彙に無い新語を勝手に作らない／作るなら初出に一行説明を付ける」規律が含まれます。「造語が増えやすい地形」は drift-watch の型カタログにも入っています（on のときのみ）。

背景の考え方は [docs/theory.md](docs/theory.md) の「造語の管理」節にまとめています。

## cc-sdd 連携

配置先に cc-sdd（`.kiro/`）があると、インストーラが検出して案内します。

`/intent-export-cc-sdd` が生成する下書きを cc-sdd の `/kiro-spec-init` に渡すと、Intent Planning の成果が requirements → design → tasks のフローへそのまま流れます。不変則（invariant）と上位の意図は tasks へ転記されやすい形で渡されるため、実装段階でも全体意図が効き続けます。

intent-planner が作るのは下書きまでです。spec 本体は cc-sdd が生成し、各フェーズであなたがレビューします。

## OpenSpec 連携

cc-sdd と並ぶもう1つの export 先として [OpenSpec](https://github.com/Fission-AI/OpenSpec) に対応します。

`/intent-export-openspec` は、選んだ packet 1つを OpenSpec の **proposal 下書き**（`## Why` / `## What Changes` / `## Impact`）と **delta spec ヒント**（`## ADDED/MODIFIED/REMOVED Requirements` + `### Requirement:` / `#### Scenario:` の骨格）に変換し、続行を指示すると `/opsx:propose` を起動して change-proposal フローへ橋渡しします。compass の Invariants は normative 文（SHALL / MUST）と `## Impact` の制約へ落とし込まれ、parent intent と invariant が OpenSpec の生成物にも引き継がれます。

cc-sdd 版と同じく、入力は対象 packet 1つ + compass に限定する低トークン契約で、enforcement 設定時は export 前に書き戻し漏れを検査します。代行は `/opsx:propose` の起動までで、apply / sync / archive 等の後続には自動で進みません（spec 本体の完成は OpenSpec 側に委ねます）。

## 安心して使うために

- **アプリケーションコードは変更しません**。書くのは `.intent/` 配下の Markdown だけです（writeback / improve も承認した項目しか反映しません）
- **既存ファイルは上書きしません**（`--force` 指定時を除く）。まず `--dry-run` で確認できます
- **enforcement は既定 off** で、設定しない限り動作は何も変わりません。git フックは `--enforce` を明示したときだけ配置し、既存のフックは上書きしません
- **ランタイム依存ゼロ**（Node 標準モジュールのみ）。状態機械・常駐プロセス・GitHub 連携はありません

## 背景: なぜ「spec の手前」が要るのか

AI にリファクタや大規模変更を頼むと、各ファイルの変更は妥当なのに全体の設計意図が少しずつ崩れていくことがあります（architectural drift）。原因は、AI が横断的な意図を持たないまま局所最適に逃げることです。intent-planner は、実装前に「全体の意図」と「守るべき判断基準」を人間と AI で擦り合わせて文書化し、それを AI が毎回参照できる steering context にすることでこれを防ぎます。

これは **Intent Driven Development (IDD)** ── Intent を source of truth に開発を駆動する ── の実装ですが、自律状態機械や常駐ランタイムを内蔵する重量級フレームワークではありません。駆動を外側のループ（人手 or `/loop`）に委ね、spec 駆動フローの手前に挟む軽量なレイヤーとして IDD を成立させます（[「IDD として一周回す」節](#intent-driven-developmentiddとして一周回す)・[docs/theory.md](docs/theory.md)）。

Intent Tree・Compass・Packets・writeback といった各機能が、要求工学（ゴール指向要求工学、EARS、計測可能な要求）やソフトウェアアーキテクチャ研究（architectural drift、ADR、Twin Peaks モデル）のどの知見に根ざしているかは、[docs/theory.md](docs/theory.md) に参考文献付きでまとめています。

## ライセンス

MIT © Yoshishige Tsuji

本プロジェクトの開発には [cc-sdd](https://github.com/gotalab/cc-sdd)（MIT, © 2025 gotalab）由来のツーリングを使用しています。配布物（npm パッケージおよび本リポジトリの `templates/` 等）に cc-sdd 由来のファイルは含まれません。
