# intent-planner の理論的背景

intent-planner は **Intent Driven Development (IDD)** の軽量実装です。Why/What（なぜ・何を＝Intent Tree / Compass / packets）を Source とし、How（どう作るか＝discover→compass→packets→export→writeback の工程レール）を固定されたレールとして持つことで、**意図（Intent）が開発を駆動する**形を成立させます。state（進行段階）は記録しますが、それを自律的に動かす状態機械は内蔵せず、駆動は外側のループ（人手のレビュー、または `/loop` のようなハーネス）に委ねます — それでも次に何を作るかを決めるのは Intent なので、Intent 駆動は成立します（[状態は持つが状態機械は持たない](#進捗の表現--状態は持つが状態機械は持たない)節）。他文脈の Intent-Driven Development と表記が重なりますが、ここでの IDD は「人間が工程（How）を固定で持ち込めば、軽量な skill + scaffold だけで Intent 駆動が回る」という intent-planner 流の実装を指します。

intent-planner の各機能は、要求工学（Requirements Engineering）やソフトウェアアーキテクチャ研究で確立されてきた考え方を、AI コーディングエージェントとの協働向けに軽量化したものです。このドキュメントは「なぜこの手順なのか」を理論の側から説明します。

**読まなくても使えます。** intent-planner は、フローに沿って質問に答えていけば必要な成果物が埋まるように設計されており、理論の予習を前提にしていません。このドキュメントは、各ステップで何を書くべきか迷ったとき、あるいは手順の意図そのものを知りたいときの参照用です。

## 対応表

| intent-planner の概念 | 背後にある考え方 | 主な出典 |
|---|---|---|
| 仕様・意図・コードの相互変換（完全な可換ではなく損失付き射影） | トレーサビリティの限界・本質的複雑さ | Gotel & Finkelstein / Brooks |
| 沈黙（書かれていないこと）の検出には外部の照合枠が要る | 要求完全性検査・外部完全性 | Kassab & AbdElhameed ほか |
| load-bearing な落差の仕分け（ドロップで設計が変わるか） | アーキテクチャ上重要な要求（ASR / AIR）の識別 | Helmi (ARLO) / Anish ほか |
| Intent Tree（L0–L4） | ゴール指向要求工学のゴール階層 | KAOS / i* |
| L1 の計測基準 | 計測可能な要求 | Gilb / GQM |
| Compass: Invariants | 不変条件・契約による設計・fitness function | Meyer / Ford ら |
| Compass: Decision Rules | ADR・設計根拠（design rationale）の記録 | Nygard |
| Compass: Anti-direction | 障害分析・non-goals の明文化 | KAOS obstacle analysis |
| Packets | 垂直スライス・INVEST・振る舞い保存 | Wake / Fowler |
| Walking skeleton | 歩く骸骨・曳光弾 | Cockburn / Hunt & Thomas |
| PoC の仮説・反証条件・GO/NO-GO | 反証可能性・仮説駆動開発 | Popper / Ries |
| Writeback / Improve | 生きたドキュメント・Twin Peaks モデル・ソフトウェア進化の法則 | Martraire / Nuseibeh / Lehman |
| Writeback の承認粒度（効く1件にゲートを集中） | 選択的注意の配分・例外による管理 | Martraire / management by exception |
| behavior-unknown モード | 仕様化テスト（characterization test） | Feathers |
| cc-sdd 連携 | 仕様駆動開発・EARS | Kiro / Mavin ら |
| Decision Rules の Alternatives considered / Revisit when | MADR の considered options・有効期限つき決定 | MADR / Nuseibeh |
| First packet 推薦 | リスク駆動の順序付け・最小の実験 | Boehm / Ries |
| Agent Contract | 制約としての仕様（契約の LLM 適用） | Meyer |
| 検査 ID・stale-assumptions | lint / 静的検査・前提の経年劣化 | — |
| Open Questions の [export まで] タグ | last responsible moment | Poppendieck |
| 1 packet = 1 ファイル + frontmatter | 要求を状態属性つきオブジェクトとして管理 | ISO/IEC/IEEE 29148 / Doorstop / T-Reqs |
| packet の active / archive 分離 | 廃止要求の保存（削除しない） | Wnuk ら |
| 生成 index（canonical から再生成） | docs-as-code の単一情報源 | Cadavid ら |
| Decision Rules の compass-archive 退避 | 設計根拠の劣化・検索性低下への対処 | Grudin / Burge ら |
| 固定カテゴリ枠での Invariant・制約の収集 | 構造化発問・タクソノミーによる網羅性 | Browne & Rogich / Burnay ら |
| 動的例示（2〜3個の弱い手がかり・非網羅明示） | 手がかり再生・encoding specificity と fixation 回避 | Tulving & Thomson / Jansson & Smith |
| 否定形（失敗前提）での Invariant 発問 | 暗黙の前提・default requirements の掘り起こし | Burnay ら |
| omission recap（収集結果の要約と再確認） | LLM 補完の限界（一貫性欠如・hallucination） | LLM4RE 研究 |
| 地形診断（着手前の型名指し） | architectural drift の予防的外在化・fitness function | Perry & Wolf / Ford ら |
| drift-log の outcome 対称記録 | 確証バイアス回避・反証可能性・仮説駆動 | Popper / Ries |
| 逸脱の型カタログ（育てる） | vibe architecting・パターン蓄積 | Konrad ら |
| packet の意図層と完了層の分離 | ゴール（GORE）と作業（WBS）は別単位・必要に応じて traceability で関連づける | van Lamsweerde / PMI WBS / Gotel & Finkelstein |
| packet の Evidence 節 | 受入基準駆動の進捗・post-RS トレーサビリティ | ATDD / Gotel & Finkelstein |
| state の進行段階（宣言的・自動遷移なし） | 状態属性つき要求オブジェクト（state machine ではない） | ISO/IEC/IEEE 29148 |
| depends_on（人が宣言・算出しない） | 依存グラフ・前提順序の宣言的記録 | DAG / 依存管理 |
| 進捗の3軸（意図の安定度 / 実現の完了度 / 証拠の確定度）・自己申告非依存 | 進捗指標の Goodhart 化回避・独立検証 | Goodhart / Campbell |
| 完了の evidence ベース確定 | AI の過大申告（corrupt success）への防御 | エージェント評価研究 |
| overview の派生ビュー（canonical から再生成） | view-based 全体像・materialized view | ISO/IEC/IEEE 42010 / docs-as-code |
| release note（git 履歴 × intent 照合・派生出力） | 変更の why 復元・traceability の逆引き・落差の可視化 | Gotel & Finkelstein / Keep a Changelog |
| 完全性スキーマ（聞き漏らしの目次・横の網羅性） | 要求集合としての完全性・情報項目スキーマ | ISO/IEC/IEEE 29148 / INCOSE GtWR / Volere |
| packet の `## Decisions`（④制約下の意思決定スロット） | ASR・required-how を上流で確定する決定スロット | Bass ら ASR / arc42 |
| 既定値を出さず未決定を明示保持 | アンカリング・デフォルト効果の回避 | Tversky & Kahneman / Johnson & Goldstein |
| consider-the-opposite（高コスト決定の反証） | 確証バイアスの能動的緩和 | Mussweiler ら / Zhou ら(LLM協働バイアス) |
| 投与量（前倒し / 遅延の仕分け） | リアルオプション・可視の設計規則 vs 隠れた決定 | Sullivan ら Real Options / Parnas / Baldwin & Clark |
| 分解の終端（discriminative testability・一packet一concern） | 誤実装を落とせるオラクル・関心の分離 | SWE-bench/UTBoost / Parnas |
| completeness-floor 検査・Requirements Smells | 要求の lint・欠陥指標による品質検査 | Femmer ら Requirements Smells |
| PBR 四観点の静的チェック | 観点別読解による欠陥カバレッジ拡大 | Basili ら PBR |
| 双方向トレース（下流 realized-by/verified-by・pre-RS） | 上流導出と下流割当の追跡・pre-RS トレーサビリティ | NASA SWE-059 / Mäder & Egyed / Gotel & Finkelstein |

## なぜ「spec の手前」に1段挟むのか — 問題空間と解空間

要求工学では、**問題空間**（何を達成したいか・なぜか）と**解空間**（どう実現するか）を区別します。Michael Jackson の Problem Frames が示すように、要求はソフトウェア（machine）の側ではなく、それが作用する世界（world）の側に存在します。spec（requirements → design → tasks）は解空間へ向かって具体化していく工程であり、その入力となる「何を・なぜ」が曖昧なまま spec を書き始めると、**形式は整っているのに方向が違う仕様**ができあがります。`.intent/` は、問題空間の記述を解空間の記述（spec）から分離して保持するレイヤーです。

もう1つの動機は **architectural drift** です。Perry & Wolf（1992）は、設計者の意図したアーキテクチャから実装が徐々に逸れていく現象を drift / erosion として定式化しました。AI エージェントによる大量のコード生成はこの進行を加速させます。各変更は局所的には妥当でも、横断的な意図を参照しないまま積み重なると全体が崩れるからです。古典的な対策は意図を「参照可能な形」で外在化することであり、それを AI が毎回読める文書（steering context）として用意するのが intent-planner の中心的な仕掛けです。

## 損失付き射影 — 仕様・意図・コードは互いに情報を落とす

spec（仕様）・Intent（意図）・code（実装）は、同じ対象の異なる**射影**です。どの射影も対象の全情報を保持しません。各方向の変換で、必ず何かが落ちます。

自然言語の仕様書と構造化された意図を**完全に相互変換できる（可換にできる）**と期待するのは、原理的に無理です。これは観測ではなく確立した結論で、Gotel & Finkelstein（1994）は要求トレーサビリティの全方位的・包括的な解決策は**あり得ない**と述べています。理由は2つ — 自然言語は本質的に曖昧で、形式へ写して戻すと元と同じ意味を保てる保証がないこと。そして「正確なトレースには細部への完全なコミットが要るが、必要な情報そのものが失われていく」ことです。

落差が消せないことには、もっと根本的な理由があります。**もし仕様書が無損失で code に変換できるなら、その仕様書はそれ自体プログラムです** — 記法が違うだけで。実行可能な完全仕様は、最終的に必ずプログラミング言語に潰れます。だから仕様とコードの間の落差は、Brooks の言う**本質的（essential）な複雑さ**であって、ツールの工夫で消せる偶発的（accidental）なものではありません。銀の弾丸が無いのと同じ理由です。

したがって intent-planner は、**仕様を完全にしようとしません**（無理だから、そう謳えば嘘になります）。代わりに、**どの情報が落ちたかを見せ、その落ちた情報が「荷重を支えている（load-bearing）」種類かどうかを仕分けます**。落差そのものは避けられない。避けたいのは、後続の正しさを支えていた情報が黙って落ちることです。

落差は辺ごとに非対称です。

| 辺 | 落ちるもの | intent-planner の対応 |
|---|---|---|
| spec → Intent（内向き） | 仕様書が書かない why / invariant / anti-direction（問題空間のもの） | 既存の外部仕様書を入力に取り、沈黙を物差しに照らしてギャップとして表出する（`/intent-from-spec`） |
| Intent → spec（外向き） | 生成 spec が Intent に無い詳細を流暢に埋める（捏造） | 各記述を射影元へトレースし、根拠の無い記述を inferred と標識して保持照合する（`/intent-to-spec`） |
| Intent → code | 実装が Intent の要求を満たさない・破った | drift として検出する（drift-watch / improve） |

完全性スキーマ（決定スロット）・不変則の固定カテゴリ枠・Requirements Smells・PBR 四観点は、この「落ちたものが load-bearing か」を測る物差しです。落差を仮説として提示し、omission recap を経て人が確認する（警告のみで止めない）のは、本ドキュメントが繰り返し述べる「LLM は補完案の提案者であって完全性の判定者ではない」という規律の、もう一つの適用例です。

ここには要求工学上の含意があります。**「書かれていること」の欠陥（曖昧さ・矛盾）はテキスト内のパターンから検出できますが、「書かれていないこと」（沈黙）は、テキストの中だけを見ても認知できません** — 抜けに気づくには、照合の基準となる外部の枠（ドメインモデル・品質特性のカテゴリ）が要る、というのが完全性検査の研究が繰り返し示してきた点です。固定カテゴリ枠と完全性スキーマは、その「照合枠」を、重い知識ベースを作り込まずに最小化したものです。重い形式化に逆戻りすると Gotel & Finkelstein の形式化ボトルネックに戻ってしまうため、枠は軽いまま、判定は人に残します。load-bearing の判定も同じ姿勢です — 研究側には「ある要求をドロップすると最適なアーキテクチャ選択が変わるか」を数理的に解く試み（ARLO の AIR: architecturally influential requirements）がありますが、intent-planner はその発想を、ソルバーではなく決定スロットと固定カテゴリ枠による定性的な仕分けとして借ります。

spec を挟んだ内向き（取り込み）と外向き（生成）は、同じ三層融合体 — Intent の why / 不変則 / 判断基準・steering 級の制約・requirements の個別要求 — を挟んだ逆操作です。ただし固有の難所が逆向きで、**内向き（`/intent-from-spec`）は沈黙の検出**（書かれていない invariant の炙り出し）、**外向き（`/intent-to-spec`）は捏造の抑制**（射影元に無い詳細を LLM が流暢に埋める hallucination の抑制）が中心になります。物差しが逆なので1機能に統合せず別スキルとし、内向きは固定カテゴリ枠との照合、外向きは生成物↔射影元のトレース照合（drift-watch の Intent↔実装照合と同型）を core に置きます。

> **正直な注記（現状の実装範囲と未確立の主張）**: 上表の3辺はいずれも実装済みです — Intent → code（drift 検出）は drift-watch / improve、spec → Intent（沈黙検出）は `/intent-from-spec`、Intent → spec（捏造抑制つき自然言語 Spec 生成）は `/intent-to-spec`。内向き `/intent-from-spec` は `/intent-discover` の「対話で集める」を「文書から読む」に差し替えた入口で、出力は確定ではなく仮説（Assumptions）として omission recap を経て人が確認します。なお「仕様書が黙って落とした不変則のうち何%が後の実欠陥に対応していたか」は **やれば測れる経験的仮説**であって測った結果ではありません — その測定は git 履歴を使えば設計できる、というところまでが現状です。

外向きの射影は、行き先が spec / code とは限りません。**上流の Intent layer は format 非依存**で、プログラムへの結合は下流に局在しています — export（spec 駆動コーディングツールへの受け渡し）と packets の検証語彙が、プログラム前提を担う層です。したがって非プログラム案件（文書・業務・研究など）への対応は、上流を再設計する問題ではなく、**下流に縫い目を1本足す**問題に縮みます。具体的な経路は2本の併用です — (a) `/intent-to-spec` に非プログラム向けの target format を足し、export を迂回して `.intent/nl-spec/` 配下に読める成果物を出す。(c) 非プログラム専用モード `non-code` を置き、プログラム前提の degrade を切る。これは「損失付き射影」の **外向き拡張** にあたります — spec / code 以外の成果物（文書・業務・研究）へも Intent を射影できるようにする一手であって、別の仕掛けを足しているわけではありません。

外向き射影のもう一つの行き先は **git の履歴**です。`/intent-release-note` は、git のコミット履歴を read-only で読み、各コミットを intent（packet 名 / parent intent / deltas / milestones）とテキスト照合して「**なぜ変わったか**」を補い、changelog 風 / GitHub Releases 風の読み物として `.intent/release-note/` 配下へ射影します。これは「Intent → code」の辺を**逆向きに読む**操作です — code（git 履歴）には「何が変わったか」は残りますが「なぜ・どの意図のために」は落ちています。その落差を、intent と照合して埋め戻すのが release note の射影です。ここでも照合は status と同型の温度に保ちます — テキスト照合のみで機械スコアリングは持たず、断定せず候補として提示し、**意図に紐づかないコミットは黙って捨てず薄い行で残して落差そのものを見せます**（紐づかない変更が多いほど「意図に載っていない実装」が可視化される）。git は読むだけ（commit / tag / push をしない）で、出力は再生成可能な派生物に閉じます。なお「コミットのうち何割が intent に正しく紐づくか」「紐づかない変更の割合がプロジェクトの健全性とどう相関するか」は **やれば測れる経験的仮説**であって、測った結果ではありません — 現状は落差を可視化する射影を置いたところまでです。

## Intent Tree — ゴール指向要求工学

L0–L4 の階層は、ゴール指向要求工学（GORE: Goal-Oriented Requirements Engineering）の**ゴール精化（goal refinement）**を簡略化したものです。KAOS や i* といった手法では、上位ゴール（why）を下位ゴール（what）へ、さらに実現手段（how）へと分解し、どの要素からも「なぜそれが存在するのか」を上位へ辿れるようにします。

| Intent Tree | ゴール指向要求工学での対応 |
|---|---|
| L0: Product Purpose | 最上位ゴール |
| L1: Desired Outcomes | 達成したい状態変化（outcome） |
| L2: Capabilities | ゴールを支える能力（機能要求の母体） |
| L3: Behavioral / Architectural Intents | 品質要求・アーキテクチャ上の制約 |
| L4: Candidate Packets | 実現タスクへの橋渡し |

「下から上へ why を辿れる」ことの実用上の意味は、変更時の判断にあります。ある packet を変更・削除するとき、その parent intent を見れば「何が崩れるか」を機械的に確認できます。`/intent-export-cc-sdd` が packet に上位 intent を添えて渡すのは、この追跡可能性（traceability）を実装段階まで届けるためです。

Intent Tree が canonical（確定）と Assumptions（AI の推測）を分けるのは、要求の**出所（provenance）**の管理です。推測を確定した意図と混ぜると、後からどれを検証すべきか判別できなくなります。

なお KAOS のゴール木は本来**可変深度**で、「単一のエージェントに割り当て可能になるまで」といった停止基準で分解を続けます。L0–L4 という固定の層はその簡略化であり、**粒度の層ではなく役割（目的 / 成果 / 能力 / 設計意図）の層**です。木全体で粒度を揃えることは求めません — GORE の主流文献にもそのような規範はなく、揃えるべきは作業単位（packet）の側で、それは behavior-preserving / testable / rollbackable という操作的基準が担います。

## L1 の計測基準 — 計測できない要求は判定できない

Tom Gilb は、品質要求には尺度（scale）と測定方法（meter）を持たせるべきだと主張し、Planguage という記法に落とし込みました。Basili らの **GQM（Goal-Question-Metric）** も、ゴールを問いに、問いを指標に展開する同系統の手法です。

designer-questions が on のとき `/intent-discover` が各 L1 項目に「計測基準:」を求めるのは、この実践の最小形です。「使いやすくする」のような計測不能な outcome は、実装後に達成・未達成を判定できません。検証目的（PoC）の開発では特に致命的で、判定できない仮説は何も学びを生みません。

## Compass — 判断基準の外在化

### Invariants — 保存される性質で正しさを定義する

Bertrand Meyer の**契約による設計（Design by Contract）**では、クラスは常に保たれるべき不変条件（invariant）を持ちます。これをシステムレベルへ持ち上げたものが、Ford らの **architectural fitness function**（『Building Evolutionary Architectures』）です。共通するのは「変更の正しさを、変更内容そのものではなく、**変更後も保存される性質**で定義する」という発想です。

intent-planner の Invariants は機械検証ではなく文書として AI に渡されますが、発想は同じです。AI に「この変更は良い変更か」を判断させる代わりに、「この性質は保たれているか」というチェック可能な形に判断を変換しています。

### Decision Rules — 軽量 ADR と設計根拠

Compass の Decision Rules（Context / Decision / Why / **Alternatives considered** / Consequences / **Revisit when** の6欄）は、Michael Nygard が2011年に提案した **ADR（Architecture Decision Record）** の軽量版です。さらに遡ると、設計上の決定を「何を選んだか」だけでなく「何と比較して・なぜ選んだか」ごと残すべきだという **design rationale** 研究（Rittel の wicked problems 論に始まる IBIS など）の系譜にあります。

- **Alternatives considered** は、Markdown ベース ADR の標準形である **MADR** が "considered options" として定式化した欄に対応します。不採用案とその理由を残すことで、同じ代替案が後から無自覚に再提案されるループを断ちます。
- **Revisit when**（見直し条件）は、決定を「永久に正しいもの」でなく**有効期限つきの仮説**として扱う欄です。Twin Peaks モデルが言う要求と設計の往復を、「どんな観測があればこの決定を再訪するか」という条件の形で前もって書き残します。`/intent-improve` がこの条件の成立を検出するのは、Living Documentation の「文書が読者に働きかける」発想の実装です。

根拠を残さない決定は、後続の変更者 — 人間でも AI でも — に無自覚に覆されます。決定を意図的に覆すときは、新しいエントリを追加し、旧エントリへ superseded と後継参照を付けて `compass-archive.md` へ退避します（前述の保管構造の節を参照）。

### Agent Contract — 制約としての仕様

`.intent/` の README が実装エージェント向けに掲げる実行契約（読むべきもの・守るべき不変則・してはならないこと）は、仕様を「生成の指示」ではなく**生成の制約**として渡す発想です。契約による設計が呼び出し側と実装側の責務を契約で固定するように、LLM エージェントに対しても「何をしてよく・何をしてはならないか」を実行のたびに参照可能な短い契約として外在化します。長大な文脈より少数の硬い制約のほうが拘束として機能しやすい、という運用知見に基づきます。

### Anti-direction — 「やらないこと」の明文化

ゴール指向要求工学の **obstacle analysis**（ゴール達成を阻害するシナリオの分析）や、スコープ定義における non-goals の慣行に対応します。生成 AI は「もっともらしいが全体意図に反する局所最適」を選びやすいため、進んではいけない方向を明示しておく価値は、人間のチーム相手よりさらに大きくなります。

### teaching の二軸 — 対人間は受動・対 AI は能動

「使い方をどう伝えるか」は、相手が人間か AI コーディングツールかで方針が分かれます。**対人間**は「教える」より「流れに沿えば仕様が詰まる」受動の導出を理想とします（質問カバレッジでフローが設計者役の詰めの問いを立てる）。一方**対 AI** は、ツールが起動時に読む規約文書で intent-planner の使い方（workflow・入口・rules）を**能動的に教える**（push 型オンボーディング）。両者は矛盾せず、対象別の二軸として両立します。

### 最小コスト原則 — 能動的に教えることと、全部を常時ロードすることは違う

対 AI への「能動的に教える」を「Spec・不変則の全文を常時ロードさせる」と取り違えると、責務が増えるたび固定の読み込みコストが線形に膨らみ、ツールのトークン上限を食い潰します。そこで規約文書は**薄い入口**に徹し（存在・workflow・入口・最小 rules・行動を促す短い指示まで）、Spec/不変則の本体は実装の直前に**必要な範囲だけを取りに行かせる**（pull / JIT 供給）。「常時全ロードされる前提の文書」を増やすのではなく、「作業単位ごとに必要な制約だけが渡る」設計に寄せます——これは損失付き射影（必要な射影だけを必要なときに作る）と同じ発想を、AI への文脈供給に適用したものです。

この薄い入口は、利用する AI ツールごとに対応するルート規約文書として配られます（Claude Code には `CLAUDE.md`、Codex には `AGENTS.md`、Gemini CLI には `GEMINI.md`）。新しい AI ツールへの対応は、配置先と root doc を表す **1 エントリをインストーラの agent レジストリへ足すだけ**で閉じます——配置経路（skill / scaffold / root doc）は agent 非依存に共通化されているため、ツールごとに分岐ロジックを増やしません。たとえば Gemini CLI は `.agents/skills/` を Agent Skills として読むため、Codex と同じ配置先を共有して届きます。「知能は skill・配置はインストーラ」という責務分離が、対応 AI ツールを増やすコストを線形に抑えます。

## 発問設計 — 聞くべきことを想起させ、見落としを補正する

intent-planner は「推論で埋める」前に「ユーザーに聞く」発問を各フェーズに束ねて挟みます（compass の Invariant 収集、discover の目的・成功・想定ユーザーの追認、packets の優先順位）。この聞き方 — 何を・どの順で・どんな言い回しで聞くか — は、要求工学・認知科学・LLM 応用研究の交差点から設計しています。

### 固定カテゴリ枠 — 網羅性は安定した枠で担保する

要求抽出には古くから「カテゴリ枠を先に置く」発想があり、Volere のチェックリスト、ISO/IEC 25010 の品質特性、NFR Framework、SQUARE などが確立しています。compass が Invariant・制約を「データ/個人情報・外部依存・運用/障害時・セキュリティ/プライバシー/法令・性能/可用性・技術的制約・不変条件」という固定カテゴリ枠で毎回聞くのは、この「抜け漏れ防止の外骨格」を最小化したものです。

構造化された問いが自由な聞き取りより多くの要求を引き出すことには実証があります。Browne & Rogich は prompting technique の比較実験で構造化された問いがより多くの要求を引き出すことを、Burnay らは6つの context category を elicitation checklist として使うと意思決定に有意な影響が出ることを示しました。重要度の高いカテゴリ（データ/個人情報・外部依存）を先に提示するのは、認知負荷の制御です。

正直な注記: Volere や ISO 25010 といった**個別名義の手法そのもの**が欠落を何%減らすか、という head-to-head の強い実証は乏しいままです。Carrizo らのレビューでも、技法効果を比較した実証研究はごく少数でした。実証が相対的に強いのは手法名よりも「カテゴリ化された問い・決定木・トリガ質問」という構造化発問の側であり、固定カテゴリ枠は「枠を見せれば自動的に網羅される」ものではありません。だからこそ枠を単なる見出しに留めず、各カテゴリで具体的に問う設計にしています。

この枠が技術的制約（使わねばならない/使ってはいけない技術スタック・基盤・ライセンス）を含むのは、**要求としての How** と **解としての How** を分けるためです。会社標準や契約・規制が外から課す技術的制約は world（問題空間）の側にあり、上位の Invariant として上流で固定します。一方「キャッシュで速くする」のような実装方針は machine（解空間）の側の選択で、cc-sdd へ委譲します（[cc-sdd 連携](#cc-sdd-連携--仕様駆動開発と-ears)節）。両者を分ける基準は、**破ると外的に問題になる制約か（＝要求 How）／実装の都合で選んだだけか（＝解 How）** です。Michael Jackson の Problem Frames（[問題空間と解空間](#なぜspec-の手前に1段挟むのか--問題空間と解空間)節）では、要求は machine ではなくそれが作用する world の側に置かれるため、外的に課された技術的制約は world 側＝problem space に属します。だから技術スタックを上流で聞くことは How を解空間から逆流させることにはならず、要求 How と解 How の線を引き直すことで両者の混同を防ぎます。

### 動的例示と fixation の回避 — 例は手がかりであって答えの空間ではない

カテゴリの例示を scaffold に固定文字列で埋め込まず、プロジェクト文脈（技術スタック・ドメイン・既存コード）から動的生成するのは、認知科学の **encoding specificity**（Tulving & Thomson）に基づきます。手がかりが有効なのは、それが記憶の符号化文脈と一致する場合であり、文脈に合わない一般的な強い手がかりは自由想起より逆効果になりうる、というのが要点です。雑な一般例を外から与えるより、本人の文脈に沿う手がかりのほうが想起を助けます。

例示を「1個の強い代表例」でなく「性質の異なる2〜3個の弱い手がかり」とし、必ず「これは網羅ではない、他にあれば」と非網羅を明示するのは、**fixation** への対策です。Jansson & Smith の設計固着研究以来、提示された例に思考が引っ張られて他の解を探索しなくなる現象が繰り返し示されてきました。ソフトウェア工学でも、要求の提示の仕方が後続の設計・テストの探索空間を狭めることが問題化されています。文脈から例を生成できない場合にカテゴリの枠（見出し）だけを出す fallback も、誤った例で誘導しないための同じ配慮です。

### 解収束度 — 解 How が world 側でほぼ一意なら解を先に当てる

前述の「要求 How / 解 How の線引き」は、外的に課された技術的制約（要求 How）を world 側で固定し、実装の都合で選んだだけの方針（解 How）を解空間へ委ねる区別でした。だが解 How のすべてが解空間で発散しているわけではありません。確立パターン — cron 化・CLI 化・ワンショット化 等 — のように、要望そのものが target architecture をほぼ一意に含意するとき、解 How は machine 側で選ぶより前に world 側でほぼ一意に決まっています。これを **解収束度（solution convergence）** と呼び、`/intent-discover` の designer-questions は要望を受け取った段階で、その要望が解を一意に含意する（収束）か、複数の妥当な解を許す（発散）かを LLM の読解で見分けます（外部解析ツールや機械的スコアリングには依らず、読解で判断できないときは推測で確定せず発散として扱い Open Questions へ逃がします）。

収束しているときは、中立な選択肢を並べて利用者に回り道をさせるより、推論した構成を「目指す構成はこれですよね」と1問で先に当てるほうが速く、誤っていれば即座に訂正できます。これは本ツールの **推論+確認（infer + confirm）** の哲学の正系であり、目的・成功・想定ユーザーの捉え方を推論して追認に回す手順（discover の根の追認）と同型です — 解の形もまた「意図の根」であり、推論して当て、追認・訂正・保留のいずれかで閉じます。むしろ中立な選択肢提示のほうが、推論できる解をわざわざ伏せる点でこの哲学から逸脱していました。当てた構成は確認・記録までに留め、実装やコード生成には踏み込みません（discover は実装しない、という規律の維持）。

この整理から、**anchoring 回避は「解が発散している設計判断」に限定して課される**ことが理論側でも明確になります。複数の妥当な解が並ぶ局所では、提示した既定値が「推奨・標準」として無批判に採用される anchoring（[既定値を出さない](#既定値を出さない--アンカリングの回避)節）を避け、中立に問います。だが解が world 側で収束しているときに同じ規律を適用すると、自明な解を伏せて回り道を強いるだけで、避けるべき害（誤ったアンカーへの固定）は生じません。anchoring 回避は発散の局所で効く規律であって、収束した解にまで一律に広げるものではない、というのが適用範囲の線引きです。

### 否定形の発問 — 暗黙の前提を失敗シナリオから掘り起こす

Invariant を「〜は必要か」という肯定形ではなく「これを完全に無視したら最悪何が起きるか」「外部依存が落ちても守るべきことは何か」「絶対に消してはいけないデータは何か」という失敗前提・否定形で問うのは、Burnay らの **default requirements**（ステークホルダーが当然視して語らない暗黙の前提）研究に対応します。「絶対に壊してはいけない制約」「運用上の不文律」は、肯定形の確認では思考停止の追認になりがちで、損失シナリオから逆算したほうが想起されやすいためです。

「実際の要求はインタビュー後にアナリストが補い、特に security と privacy が後から追加されていた」という How do requirements evolve during elicitation? の実証は、これらが自由な会話だけでは自発的に想起されにくいことを示します。否定形で得た回答のうち**真に守るべきものだけ**を Invariant 化し過剰な前提を混ぜないのは、掘り起こしと過剰生成は表裏だからです。

### omission recap — LLM の補完は提案には向くが「完全」の判定には向かない

発問の最後に、収集した制約・非機能要件・不変条件を短く要約して返し「抜け・過剰はないか」を1回確認する omission recap を置きます。これは LLM を発問・補完に使うことの限界に対する防御策です。近年の LLM4RE 研究は、LLM が同じ prompt でも出力が一貫しないこと、keywords や personas が scope を狭めて重要な観点を落としうること、hallucination が信頼性を損なうことを指摘しています。

ここから導かれる役割分担は明確です。LLM の推論補完は「質問案・抜け漏れ案の提案」には向きますが「これで完全だ」と判定する役には向きません。だから intent-planner は機能要件を全面的な能動質問へは振らず「推論+確認」の哲学を維持しつつ、確認を受動的な追認で終わらせないために recap を機能要件（discover の L0–L3）にも適用します。第一パスで質問・収集、最後のパスで要約と欠落検査、という役割分離は LLM 向けの prompt engineering 研究とも整合します。

正直な注記: LLM4RE は2023年以降に急増した若い領域で、評価の多くは controlled environment に偏り industry-scale の長期評価はまだ限られます。omission recap は「LLM は補完案の提案者であって完全性の判定者ではない」という確度の高い区別に立つ防御設計であり、特定手法の優位を主張するものではありません。

## 意図の単位と完了の単位 — 分けて、トレースで結ぶ

packet は「意図の単位」と「実装作業の完了単位」という、本来別系統の役割を1つの ID で束ねています。この2つを**潰さず分けて持つ**のが、packet に進捗・依存・証拠を足すときの設計の柱です。

要求工学では、両者は異なるライフサイクルに属します。**ゴール指向要求工学（GORE / KAOS）のゴール**は「何を・なぜ達成すべきか（why / what）」を記述し、時間やスケジュール、特定の実装に依存しません。一方 **WBS（Work Breakdown Structure）のワークパッケージ**は「どう作業するか（how）」を記述し、担当・見積もり・実行順序という動的な実行コンテキストを持ちます。KAOS では、**要求はあるゴールを達成する一つの方法**（"A requirement represents one particular way of achieving some specific goal"）として位置づけられるため一般に要求のほうが変わりやすく、**とくに上位ゴールほど安定的**（"The higher level a goal is, the more stable it will be"）だと van Lamsweerde は述べています。この性質を packet に当てはめると、意図は比較的安定し、作業状態は変わりやすい。だからこそ意図（安定）と作業（揮発）を同じフィールドに混ぜると、作業が頓挫したときに意図まで巻き添えで失われる、別の実装アプローチ（OR 分解）を探索する自由が消える、「関数をマージした」という作業完了を「決済が安全に完了する」というゴール充足と取り違える（サロゲーション）、といった破綻を招きます。

intent-planner はこの分離を、packet を別エンティティに割らずに**packet 内のセクションと frontmatter の層**で実現します。意図層（Parent Intent / Why / Scope / Safety-Invariants）は変えず、完了の状態（`state` の進行段階）と検証の証拠（`## Evidence`）と工程の依存（`depends_on`）を足します。両者を結ぶのは **traceability** です。Gotel & Finkelstein (1994) は、**要求以前の起源側を追う traceability と、要求以後の設計・実装・検証側を追う traceability を区別する古典的出典**として扱われ、後続研究でこれが pre-RS / post-RS と略記されるようになりました。intent-planner では、北極星・不変条件・決定ルールが pre-RS（意図の由来）、packet の実装・検証・完了が post-RS（完了の実態）にあたり、両者を packet の ID と `spec_refs`（下流 spec への参照）で繋ぎます。

なお、goal/need → requirement → design/code/test という製品アーティファクト連鎖の traceability が RE で広く扱われてきたものであり、goal（GORE）と work package（WBS）のような**作業側の単位**まで含めたリンクは標準と矛盾しないものの、それを中核 doctrine として明示する主要文献までは確認されていません。本ツールが意図と作業の単位を分けてリンクするのは、この標準的 traceability の射程に収まる範囲での設計判断です（「別種の単位なので、必要なら明示的にリンクを張る」）。

work-item の明細（packet 内の下位タスク単位の進捗）を intent-planner に持たず下流（cc-sdd / kiro の tasks.md）へ委ねるのも、この分離の延長です。意図と完了の単位は分けたうえで、work の明細はさらに下流に置き、`spec_refs` でリンクするに留めます。同じ情報を二箇所で正本化しない（single source of truth）ためです。

## Packets — 小さく・縦に・戻せる単位

packet に求められる性質（behavior-preserving / testable / rollbackable、Scope と Non-scope の明記）は、アジャイル開発のストーリー分割の知見に対応します。

- **INVEST**（Bill Wake）— 良い作業単位は Independent / Negotiable / Valuable / Estimable / Small / Testable
- **垂直スライス** — レイヤー単位（DB だけ・UI だけ）ではなく、観測可能な振る舞いを貫く単位で切る
- **behavior-preserving** — Martin Fowler の『Refactoring』における定義。「外から見た振る舞いを変えずに内部構造を変える」を変更の単位に保つことで、検証が「振る舞いが保たれたか」という観測可能な問いになる
- **rollbackable** — 継続的デリバリーにおける小さなバッチの原則。失敗時に戻せる単位で進めることが、AI に大きな変更を任せる際の安全装置になる

packet の**個数は固定ではありません**。「3〜7 個に収める」といった目標個数を立てて数合わせをするのではなく、**改修の見込みの大きさ**で可変に切ります（1〜7 を緩い目安に・ごく小さな改修なら 1 packet で良い）。大きさは工数やストーリーポイント・行数といった数値メトリクスではなく、**触れる concern の数 × 既存境界への波及の広さ**という質的な軸で測ります。INVEST の Small は「小さく」を求めますが、何個に割るかは規模が決めるのであって、規模に対して数を水増しすると 1 packet = 1 concern（垂直スライス）の単位が壊れます。

分解の終端は、ある packet が複数の条件をすべて満たした時点です — (1) 一つの packet が一つの主要 concern に対応する、(2) 受入基準が観測可能な入力・条件・期待結果に還元される、(3) 解空間の境界（固定/裁量/禁止）が明示される、(4) **cheap-to-reverse（戻すのが安い）**、(5) トレース先（parent intent / spec_refs）が辿れる、(6) **単体完結（standalone completeness）** — packet 単体の done が、利用者・呼び出し側から見て中途半端でない一貫した振る舞いの区切りになっている。(6) は (4) とは別の独立条件です。(4) が「**作る側**のロールバック安全性（途中状態を戻せる）」を見るのに対し、(6) は「**呼び出し側**から見た完了形の意味的一貫性（half-done な振る舞いの done を作らない）」を見ます — 観測する主体が違うため、(6) を (4) に畳み込みません。

`/intent-packets` が「最初に着手すべき packet」を定性的な理由つきでちょうど1つ推薦するのは、**リスク駆動の順序付け**（Boehm のスパイラルモデル以来の「最大の不確実性から先に潰す」）と、Lean の**最小の実験**（PoC では仮説を最も安く反証できる packet を先に）の適用です。順序の根拠を明文化することで、「作りやすいものから着手して核心の不確実性が最後まで残る」という典型的な失敗を避けます。

## Walking Skeleton と画面ラフ

**Walking skeleton** は Alistair Cockburn による用語で、システムの全レイヤーを最小限に貫く E2E 実装を最初に作るプラクティスです。Hunt & Thomas（『達人プログラマー』）の**曳光弾（tracer bullet）**も同型の考え方です。狙いは統合リスク — 部品は個々に動くのに繋がらない — を最初に潰すことにあります。`/intent-packets` が designer-questions on のとき「最初の packet は E2E を貫くか」を確認するのはこのためです。

**画面ラフ**の確認は、要求工学における**プロトタイピング**（要求の獲得と妥当性確認の手段）に対応します。低忠実度のスケッチは「書かれた要求からは出てこない要求」を引き出す最も安価な手段の1つで、UI を持つプロダクトでは文章の要求だけで進むことが手戻りの主要因になります。

## PoC の仮説・反証条件・GO/NO-GO — 反証可能性

purpose が poc のときに問われる3点は、科学哲学とリーン開発の実践に根ざしています。

- **仮説と反証条件** — Karl Popper の**反証可能性**: 何が観測されたら棄却するかを言えない仮説は検証になりません。「動いた部分だけを見て成功と判断する」確証バイアスへの対策として、棄却条件を実装前に書き残します。
- **GO/NO-GO 基準** — Eric Ries の『リーン・スタートアップ』が説く validated learning と同じく、判定基準を**結果を見る前に**固定します。結果を見た後に基準を作ると、サンクコスト（ここまで作ったのだから）が判定を歪めるためです。

## Writeback / Improve — ドキュメントを生かし続ける

- **Lehman のソフトウェア進化の法則**(1980) — 実際に使われるソフトウェアは変化し続け、意識的に手を打たなければ構造は劣化していきます。ドキュメントも同様で、実装と同期し続ける**仕組み**がなければ必ず陳腐化します。
- **Twin Peaks モデル**（Nuseibeh, 2001） — 要求とアーキテクチャは「要求 → 設計」の一方通行ではなく、互いに行き来しながら並行して詳細化されます。`/intent-writeback` は、この「実装から要求側への登り」を毎 packet 後の手続きとして固定したものです。
- **Living Documentation**（Martraire） — ドキュメントの価値は鮮度に比例します。deltas への記録 → 人間の承認 → 本体への反映、という2段構えは、自動反映による意図文書の汚染を防ぎつつ鮮度を保つための折衷です。承認の粒度は学びの種類で変えます — 実装で得た学びの大半は「実装が既にそう振る舞っている事実の記録」であって yes/no の余地がなく、全件を一律に一件ずつ問うと承認が儀式化します。そこで判断基準（Decision Rules）や不変条件に影響する学び（invariant 違反の発見、Decision Rules の変更を伴う決定）だけを項目ごとの明示承認ゲートにかけ、それ以外（Intent Tree への追記に留まる学びや未解決 Question の転記）は反映先を一覧で示して「止めたい項目だけ指定すれば残りは一括反映」とします。全件が第1段で delta として記録され、止める機会が必ず1回提示されることで「承認なしには本体を書き換えない」根幹は保たれます。これは承認ゲートを「効く1件」に集中させ、儀式を排して人の注意を希少資源として配分する設計です。なおこの「delta 経由でしか canonical を書き換えない」制約は**実装後の逆抽出フェーズ（writeback）に限った規律**であり、実装前に判断基準や作業単位を起こす起草フェーズ（`/intent-compass` が North Star・Anti-direction・Invariants・Decision Rules を、`/intent-packets` が packet ファイルを直接書く）はこの制約の対象外です。同じ canonical でも、実装の**前**に意図を据える起草と、実装の**後**に現実から学びを登らせる writeback はフェーズが逆向きであり、後者だけが「自動反映による意図文書の汚染」のリスクを負うため delta ゲートを課します。この境界を曖昧にすると、起草フェーズでの正規の compass 直接編集を writeback 規律の違反と誤認する取り違えが起きます（実際、自己ドッグフーディングで観測されました）。
- `/intent-improve` の3軸 **completeness / correctness / coherence** は、要求仕様の古典的な品質特性（ISO/IEC/IEEE 29148 などにおける完全性・正確性・無矛盾性）に対応します。packet 単位の writeback が拾えない全体レベルの乖離を、節目にまとめて検査します。coherence 軸が Decision Rules の **Revisit when 条件の成立**を検出するのも同じ発想で、「見直し条件を書かせる」だけでなく「成立したら知らせる」ところまでを仕組みにしています。

## Validate — 意図文書の lint と、問いの期限

`/intent-validate` の各検査が安定した**検査 ID**（invariant-conflict, stale-assumptions, …）を持つのは、コードに対する lint・静的解析の設計をそのまま意図文書へ持ち込んだものです。指摘が ID で参照できると、報告の再現・抑制・追跡が可能になり、検査の追加・変更も互換性として管理できます。

このうち **stale-assumptions** は、AI が推測した前提（Assumptions）が検証されないまま滞留することへの検査です。前提は時間とともに「検証されていない」から「事実として扱われている」へ静かに昇格してしまうため、未検証のまま古びた前提を明示的に報せます（canonical と推測を分ける provenance 管理の、時間軸方向の補完です）。

### compass conformance — 憲法が効いているかを後から照合する

compass（Invariants と Decision Rules を束ねた「プロジェクトの憲法」）には、不変条件と判断基準を**書く場所**が整っており、packet 起案時に `/intent-packets` がそれを各 packet の `## Safety / Invariants` へ反映する一方向のプッシュも存在します。しかし「反映されたか」「compass を後から更新したとき既存 packet が追随しているか」「packet の決定が Decision Rules に反していないか」を後から**照合する場所**は弱いままでした。憲法は書く場所より効いているかを照合する場所が肝だ、という観点（BMAD-METHOD の project-context.md＝全フェーズの不変入力として常に効く "constitution" との比較から得たもの）に基づき、`/intent-validate` は read-only の照合軸を3つ持ちます。いずれも宣言の突合のみで、算出・採点・自動修正・自動継承を行いません。

- **`invariant-uninherited`（継承欠落）** — compass のプロジェクト普遍 invariant のうち、各 packet の `## Safety / Invariants` に継がれていないものを列挙します。これは要求工学の **requirements traceability**、とりわけ Gotel & Finkelstein の pre-RS トレーサビリティ（意図→要求の変換が最初の切断点）を、「憲法→packet の継承トレース」へ当てはめたものです。既存の `invariant-conflict`（packet が compass invariant と**衝突**する＝矛盾）とは検出観点が異なり、本軸は「衝突ではなく**沈黙の欠落**」を対象とします — テキスト内のパターンから検出できる矛盾と違い、欠落（沈黙）は照合の基準となる外部の枠（ここでは compass の Invariants 集合）がなければ認知できない、という[損失付き射影](#損失付き射影--仕様意図コードは互いに情報を落とす)の節で述べた完全性検査の含意の、compass↔packet 辺への適用です。
- **`invariant-stale-vs-compass`（compass 更新の遡及漏れ）** — compass の節更新日（Invariants 節 / Decision Rules 節）が packet の `updated_at` より新しい packet を stale 候補として提示します。これは Lehman のソフトウェア進化の法則（憲法も実装も使われる限り変化し続け、放置すれば乖離する）と、Twin Peaks の往復（要求↔設計の相互更新）が**遡及されないまま取り残される**断面を、stale-assumptions の時間軸検査と同型に捉えたものです。compass のどの項目が当該 packet に効くかを機械同定できないため要修正と断定せず、人に追随確認を促す安全側（推奨以下）で出し、両側の更新日が実打刻されたペアのみを比較します（断定より未検証対象の明示を優先する fail-safe）。
- **`decision-rule-mismatch`（ADR 乖離）** — compass の Decision Rules（Context / Decision / Why / Alternatives considered / Consequences / Revisit when の軽量 **ADR**）と各 packet の `## Decisions` 節を突合し、Decision Rules に反する packet 決定を報告します。突合面は ADR の `Decision`（採る選択肢の主文）対 packet スロットの確定値に限定し、Why / Alternatives は根拠の引用元に使うに留めます。既存の `l3-intent-mismatch`（intent-tree L3 との突合）とは突合相手が異なり、本軸は compass の Decision Rules との突合のみを対象とします。

3軸とも invariant / Decision Rules に機械的 ID が無い自由文を相手にするため、`l3-intent-mismatch` で確立した**意味照合＋人ゲート**の粒度に倒します — 機械的完全一致を前提にせず、明示記述と直接矛盾＝要修正／解釈の余地がある乖離＝推奨／迷ったら推奨に倒し根拠引用を添えて人に委ねる、推論禁止（packet 内容から該当性を推論しない）。これらは単なる lint ではなく、**compass＝意図の射影**と**packet＝完了の射影**の間の落差を観測可能にする装置です。[損失付き射影](#損失付き射影--仕様意図コードは互いに情報を落とす)の節が述べたとおり、落差そのものは避けられない — 避けたいのは、後続の正しさを支えていた憲法の制約が黙って継承漏れ・追随漏れ・乖離を起こすことです。この落差の検出こそが、本ツールが「仕様を完全にする」のではなく「落ちたものを見せて人に仕分けさせる」という一貫した姿勢の、compass↔packet 辺への延長です。

#### 決定の波及先を列挙し直す — 決定を取り巻く4方向

決定（compass の Decision Rules / packet の `## Decisions`）は**記録**できても、その決定が前提とする上流・成立トリガ・文体に紛れた未確定・名指しする下流コードへ、影響を**展開し直す**機構は弱いままでした。これは前述の継承照合（compass→packet の1辺）を、決定を中心とした4方向へ広げる延長です。いずれも read-only の宣言突合に徹し、canonical を自動書き換えしません。

- **上流＝起票漏れ（discover スキップ）** — `.kiro/specs/` に進行/完了 spec があるのに `.intent/intent-tree.md` の L0〜L4 とテキスト照合できないものを、`/intent-status` が「Packet を経ずに実装が進んだ疑い」として候補提示します。これは前述の[孤児 spec 検査](#横の網羅性--完全性スキーマ--観点別レビュー--トレース)（Packet 層・writeback-phase-boundary で導入した起票漏れ⇔writeback漏れの双対）を**最上流（intent-tree 層）へ1段押し上げた**もので、tree 層 / packet 層 / writeback 層の3階層で棲み分け、同一 spec の二重警告を避けます。
- **トリガ＝Revisit when 発火の拾い上げ** — Decision Rules の `Revisit when`（[有効期限つき決定](#decision-rules--軽量-adr-と設計根拠)）は「成立したら知らせる」ところまでを仕組みにする欄でした。既存の `/intent-improve` coherence 軸は実装の現実・deltas から成立を読み取りますが、本 spec は新成果物 `.intent/milestones.md`（節目イベントの append-only 記録・利用者が宣言的に記入・自動検出しない）の各 event を全 Decision Rule の `Revisit when` と substring 照合する経路を併記しました。「未定」明示の欄は照合対象外とし、合致は見直し再提案として報告のみ行います。
- **文体＝未確定動詞の繰延タスク化** — 「想定 / 流用 / 予定 / TBD / 暫定」のような未確定動詞が確定の文体に紛れ込むと、決定の未確定性が黙って失われます。起草フェーズ（`/intent-packets` / `/intent-compass`）はこれを推測で確定せず Open Questions / 理由付き未定スロット（[投与量](#縦の深度--可視の設計規則を固定し規則の内側を委譲する)の遅延側）への変換案として提示し、`/intent-validate` の `ambiguous-deferred-phrasing` 軸が `## Decisions` の区分外・Revisit when 併記なしの同種表現を「情報」severity で引用します（言い換えは正本へ書き戻さない read-only 報告）。これは Requirements Smells（[横の網羅性](#横の網羅性--完全性スキーマ--観点別レビュー--トレース)）と同型の表層検査を、決定の未確定性へ向けたものです。
- **下流＝決定↔コード乖離** — `/intent-validate` の `decision-rule-code-alignment` 軸は、Decision Rule の主文/Context がコードモジュール（ファイル名・モジュール名）を名指すとき、そのモジュールを Grep で読み、Rule 主文と実装の意味的乖離を検出します。これは**read-only 検査層で唯一、限定的な AI 意味照合（推論）を許す軸**です — 代償（誤検知の再現性低下）を、出力に「AI による意味照合の推定」ラベルを付し断定しない一方向報告・推奨 severity 止まり・名指し起点限定で補償し、この例外を他軸へ波及させません。突合面はコード実装の意味で、packet スロット値のテキスト突合に限る `decision-rule-mismatch` とは分離します。同じ視野は `/intent-writeback` §2 の `[invariant-violation]` 抽出にも明示し、名指しモジュールの grep 突合を含めます。

この4方向はいずれも「[損失付き射影](#損失付き射影--仕様意図コードは互いに情報を落とす)の落差を観測可能にして人に仕分けさせる」一貫した姿勢の適用であり、決定という1点を起点に上流・トリガ・文体・下流の各辺へ広げたものです。

この3軸を「いつ走らせるか」には固有の問題があります。`/intent-validate` は read-only の照合で、これまで起動契機は「export の前に1回」だけでした。export しない期間が続くと照合が一度も走らず、上記の遡及漏れ（`invariant-stale-vs-compass`）が黙って溜まります — 検査があっても**呼ばれなければ効かない**。そこで現在地を案内する `/intent-status` に、Lehman の進化の法則が予言する陳腐化の「頃合い」を read-only で概算させ、`/intent-validate` の実行を促す軸を足しました。status は compass の節更新日と各 packet の `updated_at` を（`invariant-stale-vs-compass` と同型の更新日比較で）突き合わせ、「compass 更新後に未追随」の packet が閾値件数以上なら validate を次の一手として推奨します。確定診断はせず**頃合いの概算にとどめ**（狼少年化を避けるため両端実打刻のペアのみ・閾値ゲート付き）、診断は validate に委ねます。同じ橋渡しを `/intent-improve` にも置き、Decision Rules / invariant に影響する反映が生じた回にだけ validate 追従確認へ誘導します。これは検査自体ではなく**検査が呼ばれる契機**を設計する層であり、「偽陽性の多いゲートは迂回の習慣を生む」（後述の staleness 既定 off の論拠と同じ）という検査理論の警句を、提案の温度（停止せず推奨にとどめる）として引き継いでいます。status・improve・validate のいずれも canonical を書き換えない read-only の関係を保つため、「最後に validate した時点」を記録するマーカーは置かず、compass が packet より新しいかという観測可能な代理指標で近似します。

Open Questions の **`[export まで]` タグ**は、Lean ソフトウェア開発の **last responsible moment**（決定はそれを下すべき最後の責任ある瞬間まで遅らせる）の実装です。すべての問いに即答を求めると planning が止まり、放置すると未決定のまま実装に流れ込みます。「いつまでに答えればよいか」を問いに付けることで、遅延してよい決定と、export という不可逆点の前に必要な決定を区別します。export 前にタグ付きの未回答を確認するのは、この期限の執行です。

## 完全性の床 — 横の網羅性と縦の深度

AI コーディングエージェントへ実装を委譲するとき、最大の失敗要因は「タスクの分解が粗い（縦）」よりも「そもそも触れられていない話題（横）」です。エラー時の挙動・整合性・冪等性・認可・後方互換などが仕様に書かれないまま委譲されると、エージェントは**暗黙の（多くは安直な）デフォルト**でコードを埋め、本番で深刻な不具合を生みます。intent-planner はこれを**横の網羅性**と**縦の深度**の二軸で抑えます。この二軸の設計指針は、前提を伏せた中立な調査でも独立に支持されました（要求工学・アーキテクチャ・認知科学の一次情報との突合）。

### 横の網羅性 — 完全性スキーマ × 観点別レビュー × トレース

要求品質の標準（ISO/IEC/IEEE 29148・INCOSE GtWR）は、完全性を「よく書けた一文」ではなく**要求集合が必要な関心事を十分に含むこと**として扱います。したがって横漏れは「よい質問」だけでは防げず、**関心事スキーマ（聞き漏らしの目次）× 観点別レビュー × トレーサビリティ**の複合でしか安定して防げません。

- **完全性スキーマ（決定スロット）** — 聞き漏らしやすい技術的決定を packet の `## Decisions` に**スロット**として列挙します（整合性・冪等性・エラー意味論・認可など）。これは Bass らの **ASR（Architecturally Significant Requirements）** を「required-how を上流で確定する」形に落としたもので、固定リストではなくモード別差分で文脈に合わせます。各スロットは「回答済み / 未定（理由付き）/ 非該当 / ADR候補」のいずれかで必ず閉じ、「黙って飛ばす」を構造的に防ぎます。スロットの正本は単一ファイル（`decision-slots.md`）に集約し、「表に行を足すだけ」で拡張します。
- **観点別レビュー（PBR）** — Basili らの **Perspective-Based Reading** は、利用者・運用・テスト・保守など異なる視点から読むと、同人数の通常読解より広い欠陥カバレッジを達成すると実証しました。`/intent-validate` は四観点の静的チェックとして、各観点で「破綻条件が記述されているか」を read-only で確認します（対話的監査は別途のレビューに委ね、新たな自律ループは作りません）。
- **Requirements Smells** — Femmer らの研究に基づき、曖昧語・主観語・比較級・弱い語・未定義代名詞といった表層欠陥を機械的に拾います。これは「書かれ方」を直す二次防衛線で、「そもそも書かれていない」を補う完全性スキーマとは別の層です。
- **トレース** — NASA SWE-059 や Mäder & Egyed（双方向トレースが保守作業を有意に速く・正確にする）に基づき、上流（親意図）に加え下流（realized-by / verified-by）への最小十分なリンクを張ります。Gotel & Finkelstein が指摘した **pre-RS トレーサビリティ**（意図→要求の変換が最初の切断点）を踏まえ、parent_intents 欠落を検査します。

横の網羅性は「漏れを拾う仕組み」を持つだけでは足りず、**いま何が完了し・何が反映待ちで・何が未着手かを人間が一目で掴める射影**を伴って初めて運用に乗ります。`/intent-overview` と `/intent-status` の**工程レール**は、全 packet を `state` × export 履歴 × delta の突合から5信号（反映済 / 今ここ / 未着手 / 反映漏れ / 統合済）に畳んで縦に並べた、横の網羅性の人間可読な射影です。とりわけ「実装は完了したのに意図へ書き戻されていない」取り残し（writeback 漏れ）を、別の警告ではなく**レール上のズレ**として浮かせます。これは Gotel & Finkelstein の pre-RS 切断（実装→意図の逆方向の切断点）を運用面で可視化する装置であり、レール自体は状態を算出・推論しない read-only な射影に徹します（正本は packet・export-log・deltas のまま）。writeback 漏れが「export 済みなのに意図へ戻されていない」取り残しなのに対し、その双対として「**Packet を経ずに実装が進んだ**」取り残し ── 起草フェーズそのもののスキップ ── も `/intent-status` の孤児 spec 検査が拾います。`.kiro/specs/` に進行/完了 spec があるのに対応する packet・delta とテキスト照合できない場合、「起草されていない実装の可能性」として候補提示します。照合不能は構造的に常態（export は feature 名を記録しないため）なので断定せず、次の一手の決定は奪わない read-only な警告に徹します。enforcement が「export 後の writeback 漏れ」を見るのに対し、これは「export 前の起草漏れ」を見る ── 両者でパイプラインの入口と出口の双方の切断点を可視化します。

5信号は「反映の進捗」を映しますが、それだけでは「いま **どの packet が・どの工程に居て・この後どの工程を通るか**」が読めません。そこでレールの各行には、信号に続けて `[現在の工程 → 次に通る工程]` を併記します。これは新たな観測・推論ではなく、すでに進捗軸で読み取る packet `state` を、固定パイプライン（discover → compass → packets → export → 実装 → verify → writeback）上の位置として読み替えた射影にすぎません。これにより「今ここ」は packet 単位の指し示しから、**工程単位での現在地と残工程の連なり**へと解像度が上がります。あわせて、各スキルの出力は「読み手（人間開発者）が最初に掴むべき結論＝今どこ・次に何をするか」を筆頭に置き、内部規律（派生・正本ではない旨・検査 ID 等）は詳細へ退避する構成に統一しています。出力の読みやすさは、トレーサビリティの可視化が運用に乗るための前提条件です。

### 縦の深度 — 可視の設計規則を固定し、規則の内側を委譲する

縦は「どこまで深く決め・どこで止め・上下をどう繋ぐか」です。指針は **「人間は可視の設計規則（visible design rules）を先に固定し、規則の内側の局所探索はエージェントに委譲する」** という二層化で、Parnas の情報隠蔽・Baldwin & Clark の visible rules / hidden modules・Sullivan らの **Real Options** が支えます。

- **投与量（前倒し / 遅延）** — 不可逆・外部契約・品質トレードオフ・受入オラクルに効く決定は前倒しで固定し、可逆で局所的・探索可能な決定は「未定（遅延中・再訪条件付き）」としてエージェントに委ねます。Real Options の語彙では、遅延してよいのは「可逆で情報価値が増える決定」だけで、選択肢が消える前（last responsible moment）には固定します。
- **分解の終端** — 「テストが書ける（testability）」だけでは不十分で、**誤った実装を落とせるオラクルがある（discriminative testability）**まで降ります（SWE-bench Verified / UTBoost が、弱いテストでは誤実装が通ることを実証）。粒度は「一 packet = 一 concern」を停止条件とし、how の完全指定はせず what + constraints + oracle に留めます。

### 既定値を出さない — アンカリングの回避

ツールがスロットに「妥当な既定値」を提示すると意思決定は速くなりますが、Tversky & Kahneman の**アンカリング**、Johnson & Goldstein の**デフォルト効果**が示すとおり、提示値が「推奨・標準」として無批判に採用され、本当の要求から乖離します。Zhou ら（LLM 協働開発のバイアス研究）は、開発者アクションの約半数が認知バイアスの影響下にあり、その多くが LLM との相互作用に起因することを報告しています。そこで intent-planner は**既定値を埋めず、未決定を理由付きで明示保持**します。さらに高コストな決定（認可・整合性・エラー意味論・後方互換）に限り、Mussweiler らの **consider-the-opposite**（その選択が不適切になりうる条件を能動的に挙げさせる）で確証バイアスを緩和します。全スロットに摩擦を課さないのは、意思決定疲労を避けるためです。

## 保管構造 — 1単位1ファイルと「現役 / 履歴」の物理分離

packet を `.intent/packets/active/` の個別ファイルとして保持し、完了後は削除せず `archive/` へ移す構造は、要求管理と文書工学の複数の知見に対応します。

- **廃止要求は削除せず保存する** — Wnuk らの実証研究（2013）は、廃れた要求（obsolete software requirements）が現場の深刻な問題でありながら、回答者の7割超が処理プロセスを持たないことを示し、削除ではなく「obsolete とタグ付けして保存し将来の意思決定に再利用する」ことを推奨しています。done / superseded の packet を archive へ移して**消さない**のはこの実践です。過去の判断の監査と、書き戻し漏れの突合（export-log × 残存下書き × deltas）の材料にもなります。
- **要求は状態を持つオブジェクト** — ISO/IEC/IEEE 29148 や SEBoK は、要求に status・rationale・owner などの管理属性を持たせることを標準としています。packet ファイルの frontmatter（packet_id / name / state / spec_refs …）はその最小形で、`name` を export-log・cc-sdd 下書き・deltas を貫く照合キーの正本に固定することで、トレーサビリティ研究が指摘する**リンクの腐敗（link decay）**に備えています。
- **テキスト小単位 + バージョン管理** — Doorstop や、Ericsson の大規模アジャイル開発で使われた T-Reqs は、要求を Git 管理下の小さなテキスト単位として扱うことで、行単位の差分レビュー・並行編集・履歴追跡を成立させました。1 packet = 1 ファイルは同じ設計です。単一ファイルへの全件蓄積は、実務ツールの調査（OpenSpec / Backlog.md / ADR 等）でも主流ではありません。
- **canonical と生成ビューの分離** — docs-as-code の実証研究（Cadavid ら）は、機械可読な正本から索引やビューを自動生成する構成が single source of truth と保守コストの両面で有効なことを示しています。`packets/index.md` が「読み専用の生成物」であり、各コマンドが index + 対象 packet だけを読むのはこの構成です。
- **設計根拠は放置すると劣化する** — Grudin は設計根拠の記録が散逸・検索不能になりやすいことを早くから指摘し、Burge らは根拠の保守には変化の伝播が必要だと論じました。覆された Decision Rules を6欄のまま `compass-archive.md` へ退避し、**常時読み込まれる compass には現役の判断基準だけを残す**運用は、この劣化への対処です（ADR の superseded 慣行を、毎回全文を読む LLM という読者に合わせて物理分離まで進めたもの）。
- **追記式の記録は衝突を構造で消す** — append-only な記録（deltas / export-log / drift-log / milestones / compass-archive の5ファイル）は、単一ファイルの末尾へ全件を貯め続けると、並行作業で同じ末尾を奪い合って衝突し、肥大化して通読性も落ちます。これを「1単位1ファイルの**自然キー分割**（packet 由来は packet 単位・事象由来は日付+slug 単位。中央採番カウンタを持たない）」で構造的に解きます — 別の単位は別のファイルを触るので、末尾衝突が原理的に起きません。**履歴は git と `archive/` に委ね、active 面（現在の薄い射影）だけを残す**。そして分割で散らばった記録の**通読は `/intent-overview` が派生として機械生成**し（active 面と archive を見せ分ける）、canonical を増やしません。読み手（status / improve / writeback / overview）は「分割形（あれば正本）→ 無ければ旧単一ミラーへ fallback」の順で横断読みし、分割前後で同じ集計・突合・判定を返します（behavior-preserving。`merge=union` は順序が意味を持つ記録には使わない — 衝突を消す代わりに順序を静かに壊すため）。

正直な注記を1つ: 「active 集合を小さく保つことがレビュー品質を改善する」ことの直接の実証は、要求工学にはまだ薄いままです。この設計は周辺研究（情報過多が意思決定を劣化させる・廃止要求の放置が管理を劣化させる）からの推論であり、運用で検証すべき設計仮説として扱っています。

## Drift-watch — 外れきる前に捕まえる軽いフック

drift-watch は、intent を立てた後の各工程で実装が意図から逸れていく現象を、外れきる前に捕まえるための軽量な層です。enforcement と同じく `.intent/` の任意レイヤーであり、discover / export / improve に薄いフックを差して逸脱の兆候を観察します。

- **drift / erosion への接続** — Perry & Wolf（1992）の drift / erosion（[「なぜ『spec の手前』」](#なぜspec-の手前に1段挟むのか--問題空間と解空間)節で導入済み）は、設計者の意図したアーキテクチャから実装が徐々に逸れていく現象でした。これを intent-planner の文脈に置き直すと、intent を立てた後で spec 工程が進み実装が積み上がるほど、横断的な意図から離れていく現象として捉えられます。drift-watch は、その逸脱を**外れきる前に**捕まえる軽いフックを工程に差す層です。
- **fitness function への接続** — Ford ら（『進化的アーキテクチャ』）の **fitness function**（アーキテクチャ特性を継続的に検査する関数）の発想を借りています。ただし機械的な計測ではなく、LLM 文脈での**意味的な照合**として軽量化したものです。決定的な違いは、drift-watch は**停止しない**点です。fitness function が自動ゲートとして CI を止めうるのに対し、drift-watch は gate を持たず、誤検知を前提として観察と記録に留まります。
- **vibe architecting への接続** — Konrad ら "Architecture Without Architects"（arXiv:2604.04990, 2026）は、**vibe architecting** を "architecture shaped by natural-language prompts rather than by deliberate, recorded design"（自然言語プロンプトに形作られる、熟慮され記録された設計によらないアーキテクチャ）と定義します。論文は5つのメカニズム — model selection / task decomposition / default configuration / scaffolding and autonomous generation / integration protocols — を挙げています。drift-watch はこれを、AI エージェント協働における drift の**発生機序**として位置づけ、どのメカニズムから逸脱が生じうるかの見取り図に使います。
- **outcome 対称記録の誠実さ** — drift-log は逸脱の outcome を、効いた系（prevented / caught）と効かなかった系（missed / false-positive / not-applicable）の**両側**に対称に列挙します。これは**確証バイアスの構造的な回避**です。Popper の反証可能性に接続し、「効かなかった瞬間」= 反証の機会を捨てません。Ries の仮説駆動にも接続し、missed を記録することで設計仮説そのものを検証にかけます。したがって `missed=0` は「効いた証拠」ではなく「**記録漏れの疑い**」として読みます。
- **/intent-improve との分業** — drift-watch は逸脱を**記録するだけ**です。是正は `/intent-improve`（既存の5分類）の責務であり、記録と是正を混ぜません。writeback にはフックを差しません。観察する層と、直す層を分けておくことで、記録が「直す前提」に汚染されることを防ぎます。

正直な注記を2つ:

1. **論文は microservice 過剰分割を例示していない。** 同梱 seed の `microservice-over-split` は、我々の実プロジェクトでの実観測です。これを Konrad らの task decomposition / default configuration メカニズムの下に**我々が位置づけた**近接報告にすぎず、論文自身が報告した発見ではありません。論文の発見と現場の観測を混同しないでください。
2. **地形診断の有効性は未実証。** 「着手前に逸脱の型を名指しすると逸脱が減る」ことの直接の実証は薄く、周辺研究と近接報告からの推論です。drift-log 自身が、この設計仮説を検証する装置として設計されています（だから missed を記録します）。

**スコープ超過の検知（packet-scope-overflow）— 第一防御の効きを測る計器** — export 後にユーザーが、export 済み packet の宣言スコープ（`## Scope`）を超える実装指示を出すことがあります（フロント専用 packet にバック実装を頼む等）。このとき、新領域でこそ必要になる **packet 固有の不変則**（認可・データ整合性・トランザクション境界・冪等性）が cc-sdd 成果物に不在のまま実装が進みます。これに対する防御は二段です。第一防御は規約文書（CLAUDE.md/AGENTS.md）に「スコープ超過なら `/intent-packets` で intent に戻る」規律を書くこと——ただしこれは**想起の入口で強制力がありません**（AI が思い出せるだけ）。第二防御が drift-watch の発火条件で、`drift-watch: on` のとき、実装指示の文面と packet の `## Scope` / `## Non-scope` を意味的に照合し（**コード差分は読まない**——read-only 検査層の射程を実装層へ広げないため）、超過を `mechanism: packet-scope-overflow` として drift-log に記録します。compass 普遍 Invariant 照合とは**照合根拠が別物**（こちらは packet 固有不変則の不在）です。重要なのは、第二防御が**第一防御の効きを測る計器**でもある点です。`outcome: missed`（警告を無視して押し切った）が溜まることで初めて「第一防御がどれだけ効いていないか」=意図流動率が観測できます。鶏卵構造——第一防御の効きを測る機構そのものが第二防御の中にあります。これも [損失付き射影](#損失付き射影と荷重を支える落差) の落差検出系譜（export スナップショットと実装現実の落差の内向き検出）の一つで、`missed=0` は「効いた」ではなく「記録漏れの疑い」として読みます。

**コンテキストコストの気づき（context-cost-cues）** — drift-watch の gate（`on`）に相乗りする、もう一つの軽い照合です。意図逸脱（drift-patterns）とは別カタログで、「コンテキスト（トークン）を食う進め方」の型を `.intent/context-cost-cues.md` に溜め、discover（着手前）と improve（振り返り）で照合して**利用者本人に気づかせます**。これは fitness function の意味的照合の発想を借りつつ、二つの点で drift-watch 本体と性質が異なります。第一に、これは**規範ではなく気づき**です。判断基準1点に判断基準文書を全文ロードする、大量のスキルを常時読み込む——こうした選択は精度向上のための**正当な高コスト選択でありうる**ため、「無駄」と断じず矯正もせず、判断は利用者に委ねます。第二に、**正直な注記: 消費量は計測不能ゆえ、drift-log と違い意図的に log も outcome 集計も持ちません。** drift-log の `pattern × outcome` 集計が誠実に成立するのは逸脱の outcome が事後に観測できるからですが、トークン消費量は read-only の検査層では計測できず outcome を評価できません。計測できない値をログに混ぜれば集計を推測値で汚し、何が文脈を食うかは人により正当に異なるため記録すればプライバシーにも踏み込みます。ゆえに「ログを持たない」ことが計測不能という制約に対する唯一誠実な設計です。これは [損失付き射影](#損失付き射影と荷重を支える落差) の落差検出系譜の中で、**意図的に計測を持たない**例外として位置づけられます。

**制約の叩き台の供給と蓄積（constraint-starters）** — compass の Anti-direction / Invariant 導出（C2）は、影響リスト→Invariant 化・プレモータム→Anti-direction という**ゼロから起こす**手順です。これは正しい一方、ドメインの定石（「SQL は必ずプレースホルダで組む」「スライドは結論から書く」等）を毎回ゼロから思い出す負荷を利用者に強います。constraint-starters は、この導出を**置き換えない補助**として、文脈に合う定石を叩き台候補として前段に差し込む層です。同梱の静的カタログ（`.intent/constraint-starters.md`・出典付き seed）と、利用者が育てる個人台帳（`.intent/constraint-library.md`）の二つを read-only で照合し、`/intent-compass` の導出の手前に候補を供給します。既存の判断基準づくりはそのまま走り、定石はあくまで叩き台として供されるだけです。設計上、二つの規律で性質を縛ります。第一に、**提示は read-only の堰に留めます。** 合致した定石を Anti-direction / Invariants へ自動で書き込まず、compass への転記は利用者が採否を選んでから人の手で行います（自動転記しない＝局所最適の抑止器である compass を、機械的な自動充填で汚さないため）。採用した制約を個人台帳へ蓄積する経路も同じ堰の下にあり、台帳への追記は人が手動か明示承認のもとでのみ行い、自動蓄積しません。第二に、**蓄積はこのプロジェクト内にのみ閉じます。** 個人台帳の追記先は当該プロジェクトの `.intent/` 配下の内側のみとし、プロジェクトをまたいで制約を共有・永続する仕組みは提供しません。これは「横断的に蓄積すれば資産が育つ」誘惑をあえて手放す選択で、機密案件で資産を外へ出せない利用者でも安全に使えること（repo 外漏れを起こさないこと）を、横断再利用の利便より優先した判断です。同梱カタログは静的で実行時の外部呼び出しを持たず、照合は意味的に行い機械的スコアリングに寄せません。これも [損失付き射影](#損失付き射影と荷重を支える落差) の系譜の中で、**意図の器（compass）を人の判断で満たし続けるための前段供給**として位置づけられます。

## 造語の管理 — ユビキタス言語を保ち、AI が増やす新語を減らす

使い込むほど、AI コーディングエージェントは「正規語彙（ubiquitous language＝そのプロジェクトで合意された正しい用語の集合）に無い新造の語＝**造語**」を増やしがちです。語彙が分裂すると、intent-planner の核である「意図の擦り合わせ」そのものが崩れます。造語管理は、これを**予防・検出・正規語彙の管理・言い換え**の4軸で扱い、造語を減らす層です。

- **既存の用語作法との境界** — intent-planner は当初、術語を英語のまま保ち初出に一行説明を添える「用語の作法」を持っていました（読みやすさと検索性のため、訳語へ置換しない）。造語管理はその作法が**引いた境界の外側**＝「AI が増やす造語そのものを管理する」を扱います。両者は地続きで、用語作法（初出説明済みの正当な新語）は造語検出の**除外条件**として再利用されます。
- **正規語彙の台帳（β）** — 「これが正しい用語」という母集合を、軽量な canonical 台帳 `.intent/glossary.md`（正規語＋表記ゆれ・同義語＋一行説明）として持ちます。訳語への一括置換はせず（可読性を損なわないため）、人が編集する canonical で、skill は read のみ・自動改変しません。台帳を明示することで、「既出語＝正規」とみなす雑音を避け、誤検出を抑えます。
- **検出は read-only・gate を持たない** — `/intent-validate` が台帳に無い語を「造語の疑い」として read-only で名指しし、正規語への言い換え案を添えます。判定は意味的（LLM 文脈）で機械検査スクリプトには寄せません。drift-watch と同じく**誤検知を前提に候補提示へ留め、停止しません**（gate を持たず既定 off の温度）。固有名詞・既存の英語技術用語・初出一行説明済みの正当な新語は除外します。
- **言い換えは提示まで** — 検出した造語を正規語へ寄せる更新案は**提示**するに留め、intent-tree / compass / packets / 台帳のいずれも自動では書き換えません。反映は人が承認してからの別アクションです（read-only 規律）。
- **地形としての予防** — 「造語が増えやすい地形」を drift-watch の型カタログに seed として持ち、着手前の地形診断でも名指しできます（drift-watch が on のときのみ・既定 off では何もしません）。

これは [Drift-watch](#drift-watch--外れきる前に捕まえる軽いフック) と同じ「外れきる前に捕まえる・停止しない」思想の、語彙という軸への適用です。意図と語彙の落差を検出する点で、本ドキュメント全体を貫く「損失付き射影の落差検出」とも接続します。

## Enforcement — 手続きの実行だけを検査する

enforcement が保証するのは「writeback という**手続きが実行されたこと**」だけで、書き戻した内容の正しさではありません。これはプロセス品質とプロダクト品質の古典的な区別で、lint や CI ゲートと同じ設計です: 機械的に安く検査できる範囲に検査を限定し、内容の正しさは `/intent-improve` と人間レビューに委ねます。

staleness 検知の誤検知を認めたうえで既定を off にしているのも、検査理論の定石に沿っています。偽陽性の多いゲートは「ゲートを常に迂回する習慣」（`--no-verify` の常用）を生み、検査自体を無効化するためです。

## 進捗の表現 — 状態は持つが、状態機械は持たない

packet に「今どこまで作ったか」を持たせるとき、intent-planner は **state を記録**しますが **state machine は持ちません**。この区別が、進捗を扱う設計の中心です。

- **state を持つ**（記録する）= 現在の進行段階（draft / ready / implementing / verifying / done）を宣言的に書き出すこと。これは要求を**状態属性つきのオブジェクト**として扱う ISO/IEC/IEEE 29148 の標準的な発想（[保管構造](#保管構造--1単位1ファイルと現役--履歴の物理分離)節）の延長です。
- **state machine を持つ**（駆動する）= 遷移規則・ガード・自動進行を持つランタイムで状態を自律的に動かすこと。intent-planner はこれを**持ちません**（steering のアンチパターン「状態機械・ラベル管理・自律ループの再発明」）。

進行段階は、AI の自己申告ではなく、人の確認または検査（intent-validate / drift-watch）の結果を根拠に記入します。`state=done` は `## Evidence` 節に確定した検証結果があることを前提にします。これは「テストが通ったら自動で done にする」自動遷移ではなく、「人/検査が確認 → 記入 → done」という宣言的な順序です。

この区別が、intent-planner を **Intent Driven Development (IDD)** たらしめている核です。ここで「状態機械を持たない」を「状態を持たない」と読まないでください — intent-planner は **state（進行段階）を確かに記録します**（frontmatter の `state`・export-log・drift-log・milestones）。工程を持つ以上、状態は記録されます。持たないのは、その state を**自律的に遷移させるエンジン（遷移規則・ガード・自動進行を内蔵したランタイム）**の方です。

そして重要なのは、**state を次へ進める駆動力は、製品に内蔵しなくてよい**ということです。駆動は外側のループに委ねられます — 人が `/intent-status` を見て次の一手を投げてもよいし、`/loop` のようなハーネスで `/intent-discover` を回し続けても、外側のループが駆動力になって工程が自律的に進みます。どちらでも、**次に何を作るかを決めているのは Intent（Intent Tree / Compass / packets と、status が出す「次の一手」）**です。すなわち Intent が開発を駆動する — これが IDD の成立条件であり、駆動エンジンを製品の中に置くか外（人・Loop）に置くかは、その条件を左右しません。むしろ駆動を外側へ委ねられることが、人が任意のタイミングでレビューを挟める軽さ（[read-only の進行レール](#進捗の表現--状態は持つが状態機械は持たない)・状態属性つきオブジェクトとしての state）を保ったまま IDD を成立させる、intent-planner の設計判断です（PoC の仮説2「軽量レイヤーで成立する」）。

図にすると、駆動エンジンは製品の外側（破線の枠）にあり、製品（実線の枠）は state を記録し「次の一手」を指すだけです。

```
        ┌─────────── 外側のループ（駆動エンジン）───────────┐
        │     人手のレビュー  ／  /loop 等のハーネス        │
        │                                                  │
        │   次の一手を拾って実行 ──┐          ┌── 学びを戻す │
        └──────────────────────────┼──────────┼────────────┘
                                    ▼          │
   ┌──────────────────── intent-planner（製品）─────────────────┐
   │                                                            │
   │   Intent ──> /intent-status ──> 「次の一手」を1つ指す        │
   │  (tree/compass/packets)              │                     │
   │      ▲                               ▼                     │
   │      └──── /intent-writeback <── 実装（export 先で進む）     │
   │                                                            │
   │   製品が持つもの: state の記録（frontmatter・log）＋次の一手  │
   │   製品が持たないもの: 遷移を自律実行する状態機械             │
   └────────────────────────────────────────────────────────────┘
```

遷移（次の packet へ進む・state を `done` にする）を**実行**するのは外側のループ＝人または `/loop` です。製品は state を記録し、Intent から「次に何をすべきか」を指すところまでを担います。この分担が「状態は持つが状態機械は持たない」の実体であり、駆動を外へ出せること自体が IDD を軽量に成立させています。

状態の**ストレージ**も同じ規律に立ちます。state を frontmatter（YAML）のスキーマ — キー固定・値域固定・未確定キーは空値保持 — で持つのは、実質「スキーマ付きレコード」であり、DB を導入せずに state を規律する形です。grep / git diff / 人の可読性を保ち、依存ゼロ原則（INV2）を守ります。「state を正式に持つ」とは DB 化することではなく、スキーマと制約で規律することだ、という立場です。

### 進捗は単一の％にしない — 完成度と流れを分ける

進捗には単一の万能指標がありません。要求の充足、実装の完了、証拠の有無、依存の解消は、それぞれ別のものを測っています。intent-planner の俯瞰（`/intent-overview`）は進捗を1つの総合％に圧縮せず、**意図の安定度 / 実現の完了度 / 証拠の確定度**という性質の異なる軸に分けて提示します。これにより「実装は進んでいるが証拠が未確定」「証拠は揃ったが上位意図とのギャップがある」といった、潰すと見えなくなる状態を表現できます。

軸を分けるもう1つの理由は **Goodhart / Campbell の法則**（代理指標を目標化すると本来の目的から乖離しうる）への配慮です。AI エージェント文脈では reward hacking / overoptimization として一次文献があります（不完全な proxy reward を最適化しすぎると本来の性能が悪化する）。ソフトウェア進捗指標への適用は、法則の厳密な引用というより、測定・管理の一般理論を現場へ適用した解釈として読んでください — 「進捗速度を目標にすると指標がハックされる」ことを法則名つきで定式化した定番の一次文献までは確認されていません。それでも、単一の進捗速度を目標化すれば容易な作業を量産して数値を水増しする誘因が生まれる、という誘因は十分に想定できるため、少なくとも1つは独立に検証可能な軸（証拠の確定度）を持ち、自己申告を完了判断の一次根拠にしません。

## AI に進捗・完了を委ねるときの落とし穴 — 自己申告を信じない

AI エージェントに工程・完了の管理を委ねると、人間同士の開発では目立たなかった固有の失敗様式が現れます。intent-planner の進捗・完了の設計は、これらへの防御として組まれています。

- **進捗のでっち上げ・完了の過大申告（hallucinated progress）** — エージェント評価では、終端状態が成功でも手続き違反を含むケースが報告されており、未実装やバグがあっても完了と書きうる。Cao ら（2026）の手続き考慮型評価（Procedure-Aware Evaluation）は、τ-bench 上で GPT-5 / Kimi-K2-Thinking / Mistral-Large-3 を評価し、**通常の成功と見なされる結果のうち約 27–78% が、手続き遵守の観点では "corrupt success"（終端状態は成功だが手続き違反を含む）だった**と報告しています。この 27–78% は six-dimension gating で絞ったときに消える成功の割合（条件つきの成功率差）で、GPT-5 で約 27%、Mistral/Airline で約 78% です。対策は、完了の確定を**自己申告でなく外部化された検査と evidence に紐づける**ことです。intent-planner では `state=done` を `## Evidence`（検査結果・人確認）に基づかせ、その **Evidence の記録内容とその出所を完了判断の一次根拠**にします。validate-checks の安定 ID は、各 evidence をどの検査軸で確かめたかを指す参照キーであって（ID 単独は検査結果そのものではない）、evidence を検査軸へ紐づける役割を担います。
- **状態の外部化が解くもの・解かないもの** — 状態を会話コンテキストの中だけに持つ設計は、セッションを跨ぐと意図や決定を失います。`.intent/*.md` への外部化はこれを解きますが、外部化が保証するのは**永続性・共有性・参照性**までで、**真実性・鮮度・唯一性**は別問題です。後者への対策として、単一の書き込み可能な正本（canonical）と、そこから再生成される読み取り用ビュー（derived view）の分離、read-only での再生成、人間の承認ゲートを置きます。`/intent-overview` が canonical を変えず派生ビューを再生成するのは、この materialized view と single source of truth の発想です。
- **human-in-the-loop の承認ゲート** — 完了・採択・whole-spec 更新のような節目は、AI の発話ではなく独立した検査か人のレビューで通します。writeback の deltas → 承認 → 本体反映（[Writeback / Improve](#writeback--improve--ドキュメントを生かし続ける)節）も、enforcement が手続きの実行だけを検査し内容は人に委ねるのも、同じ「自己申告を一次根拠にしない」設計です。この承認姿勢は、スキルの起動方式の非対称として frontmatter にも刻まれています — canonical を書き換えるスキル（discover / compass / packets / writeback / improve / export）は明示起動（スラッシュ）のみに固定し、エージェントの文脈起動を禁じます。一方、canonical を書き換えない read-only / 派生ビュー系（status / validate / overview / from-spec / to-spec）は文脈からの自動起動を許します。これは利便と安全の折衷で、自動起動は「正本を汚さない読み取り・検査・派生」に限定されるため、起動の自動化が承認ゲートを侵食しません。すなわち「人の承認なしに canonical を書き換えない」根幹は、自動起動を非書き換えスキルに閉じることで保たれます。

正直な注記: この節の AI 固有の失敗様式は、2024 年以降に増えたエージェント評価研究に基づく若い知見です。corrupt success の 27–78% は **τ-bench 上で six-dimension gating を適用したときの条件つきの値**であり、ドメイン・モデル依存です（一般則として「成功の 27–78% は常に corrupt」という意味ではありません）。intent-planner の防御設計は「AI の自己申告を完了の一次根拠にしない」という、この節で参照した研究から直接にはみ出しにくい区別に立つもので、特定の数値や手法の優位を主張するものではありません。

## モード — 状況に応じた方法の組み替え

単一の手順を万能とせず、状況に応じて手順を組み替える発想は、要求工学で **situational method engineering** と呼ばれる領域に対応します。各モードにも個別の理論的背景があります。

- **behavior-unknown** — Michael Feathers（『レガシーコード改善ガイド』）の**仕様化テスト（characterization test）**: 仕様が失われたシステムでは、現在の観測可能な振る舞いを記録し、それを暫定的な仕様として固定します。「観測できる振る舞いから意図を逆算する」はこの文書版です。
- **refactor** — Fowler の behavior-preserving と、Perry & Wolf の drift 是正。「正しく動くが設計意図からズレる」変更を防ぐには、保存すべき意図を先に言語化しておく必要があります。
- **feature-growth** — 既存システムへの変更が及ぼす影響の分析（impact analysis）。追加単位の分解は、既存の invariant を壊さない範囲で切ることが中心になります。

### mode 状態のスコープ分離 — 作業の詰め方はローカル、共有ポリシーは共有

mode には「作業の詰め方（選択した mode・purpose・designer-questions などの状態）」と「チームで合意した共有ポリシー（Enforcement / Drift-watch の設定）」という性質の異なる2つの情報が含まれます。前者は開発者ごと・セッションごとに異なりうる個人の作業状態であり、後者は全員が同じ状態を見る必要があるチーム合意です。これを同一ファイルに混在させると、並行セッションや複数開発者の間で mode 状態が上書き衝突します。

intent-planner では mode 状態（作業の詰め方）を `.intent/mode.local.md`（Git 非追跡・ローカル専用）に、共有ポリシーを `.intent/mode.md`（Git 追跡・チーム共有）に物理分離します。インストーラが `.gitignore` を自動整備するため、`mode.local.md` が誤ってコミットされる心配はありません。個人の作業状態が共有履歴を汚さず、チームのポリシー変更はコミット経由で全員に届きます。

## cc-sdd 連携 — 仕様駆動開発と EARS

**仕様駆動開発（spec-driven development）**は、AI エージェントに requirements → design → tasks の段階的な成果物を作らせ、人間が各段階でレビュー・承認してから次へ進む方式です。AWS の Kiro（2025）が広め、[cc-sdd](https://github.com/gotalab/cc-sdd) はその Claude Code / Codex 向け実装です。cc-sdd の requirements が用いる **EARS（Easy Approach to Requirements Syntax）** は、Rolls-Royce の Alistair Mavin らが提案した（RE'09）、自然言語要求の曖昧さを少数の構文テンプレートで抑える記法です。

intent-planner が spec そのものを生成せず「下書きまで」に留めるのは、冒頭で述べた問題空間と解空間の責務分離です。1つのツールが両方を担うと、解の都合（実装のしやすさ）が問題定義の側へ逆流しやすくなります。

export 先は cc-sdd に固定されません。`/intent-export-cc-sdd` と並ぶ2例目の export ターゲットとして [OpenSpec](https://github.com/Fission-AI/OpenSpec)（`/intent-export-openspec`）に対応し、選んだ packet を OpenSpec の proposal 下書き（Why / What Changes / Impact）+ delta spec ヒント（ADDED/MODIFIED/REMOVED + Requirement / Scenario）へ写し、`/opsx:propose` の change-proposal フローへ片方向で橋渡しします。両ターゲットは骨格を共有し（入力源を 1 packet + compass に限定する低トークン契約・enforcement ゲート・export 記録・代行は起動まで）、target 固有なのはマッピング規則と出力フォーマットだけです。これは「下書きまで」という同じ責務境界を、複数の spec ツールに対して横展開する設計です — どの export 先でも、parent intent と invariant を下流の生成物へ伝播させる traceability の届け先が増えるだけで、問題空間／解空間の線は動きません。

**出口は案件種別で選ぶ（決め打たない）。** 複数の出口があるとき、どこへ進むかは案件の性質で変わります。`/intent-packets` の「次の一手」は cc-sdd を一律に推さず、**target format**（`.intent/mode.local.md` の任意 `format` 行＝ `cc-sdd` / `openspec` / `to-spec`）と mode・前提（`.kiro/` や repository-root `openspec/` の有無）から出口を選びます。format が明示されていればその出口（OpenSpec 案件なら OpenSpec を、文書など読める成果物が目的なら `/intent-to-spec` を）を推し、未指定なら案件種別から推論し、一意に決まらなければ候補を列挙します（出口は利用者の意図次第なので断定より提示）。判定の正本は出口判定レーン（`intent-packets/rules/export-route.md`）に1つだけ置き、各 export スキルはそれを参照します。format の書き手は `/intent-discover` のみで、mode/designer-questions/purpose と同じ追認規律（任意・保留可・推測で埋めない）に従います。さらに各 export スキルは前提が見当たらないとき（cc-sdd=`.kiro/` 不在 / OpenSpec=repository-root `openspec/` 不在）に **warn だけして止めません**（drift-watch と同じ誤検知前提の warn-only。前提を後から入れる経路を潰さない）。これは「出口が1つに決め打たれて案件と噛み合わない」という落差を、判定の単一正本と warn-only の案内で吸収する設計です。

## 設計姿勢 — 理論はフローに埋め込む

intent-planner は要求工学を**教える**ツールではありません。経験のある設計者・要求アナリストなら自然に問うこと — 成功をどう計測するか、最初に E2E を貫くか、何が観測されたら仮説を棄却するか — を、フロー上の質問と検査として埋め込み、理論を知らなくても流れに沿えば同じ問いを通過するように作られています。このドキュメントは、その埋め込まれた問いの出典を示すものです。

## 参考文献

### 要求工学・ゴール指向

- Axel van Lamsweerde, "Goal-Oriented Requirements Engineering: A Guided Tour," *Proc. RE'01*, 2001（KAOS の概観）
- Eric Yu, "Towards Modelling and Reasoning Support for Early-Phase Requirements Engineering," *Proc. RE'97*, 1997（i*）
- Michael Jackson, *Problem Frames: Analyzing and Structuring Software Development Problems*, Addison-Wesley, 2001
- Alistair Mavin et al., "Easy Approach to Requirements Syntax (EARS)," *Proc. RE'09*, 2009
- Karl Wiegers & Joy Beatty, *Software Requirements* (3rd ed.), Microsoft Press, 2013（邦訳『ソフトウェア要求 第3版』）
- ISO/IEC/IEEE 29148: Systems and software engineering — Life cycle processes — Requirements engineering
- INCOSE, *Guide to Writing Requirements (GtWR)*（要求集合の完全性と最小属性: rationale / trace / verification success criteria）
- Suzanne & James Robertson, *Mastering the Requirements Process* / Volere テンプレート（atomic requirement shell・fit criterion）
- Daniel Méndez Fernández, Henning Femmer et al., "Rapid Quality Assurance with Requirements Smells," *Journal of Systems and Software*, 2017（要求の lint。precision/recall の実証）
- Mohamad Kassab & Marwan AbdElhameed, "Detecting and Repairing Incomplete Software Requirements with Multi-LLM Ensembles," *ASE 2025 (NIER)*, 2025（要求完全性検査。生成したドメインモデルと要求を突き合わせる「外部完全性」検査で沈黙を検出。沈黙の検出には外部の照合枠が要るという含意）

### アーキテクチャ・設計判断

- Frederick P. Brooks, "No Silver Bullet: Essence and Accidents of Software Engineering," *IEEE Computer*, 1987（essential / accidental complexity。本質的な複雑さは表現の工夫では消せない）
- Dewayne Perry & Alexander Wolf, "Foundations for the Study of Software Architecture," *ACM SIGSOFT Software Engineering Notes*, 1992（architectural drift / erosion）
- Bashar Nuseibeh, "Weaving Together Requirements and Architectures," *IEEE Computer*, 2001（Twin Peaks モデル）
- Michael Nygard, ["Documenting Architecture Decisions"](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), 2011（ADR）
- Bertrand Meyer, *Object-Oriented Software Construction* (2nd ed.), Prentice Hall, 1997（Design by Contract）
- Neal Ford, Rebecca Parsons & Patrick Kua, *Building Evolutionary Architectures*, O'Reilly, 2017（fitness function。邦訳『進化的アーキテクチャ』）
- M. Konrad, S. Adam, T. Terrenzi & A. Ayvaz, *Architecture Without Architects: Vibe Architecting in Modern Software Systems*, arXiv:2604.04990, 2026（vibe architecting。自然言語プロンプトに形作られるアーキテクチャと、その5つのメカニズム）
- Len Bass, Paul Clements & Rick Kazman, *Software Architecture in Practice*, Addison-Wesley（ASR: Architecturally Significant Requirements・品質シナリオ）
- Tooraj Helmi, "ARLO: A Tailorable Approach for Transforming Natural Language Software Requirements into Architecture using LLMs," arXiv:2504.06143, 2025（AIR: architecturally influential requirements。ある要求をドロップすると最適なアーキテクチャ選択が変わるかで load-bearing 度を定量化する試み）
- arc42 — アーキテクチャ文書テンプレート（constraints / decisions / quality / cross-cutting concepts）
- Kevin Sullivan et al., "The Structure and Value of Modularity in Software Design," *Proc. ESEC/FSE'01*, 2001（real options による設計判断の遅延価値）
- David Parnas, "On the Criteria To Be Used in Decomposing Systems into Modules," *CACM*, 1972（情報隠蔽・難しい/変わりやすい決定の隠蔽）
- Carliss Baldwin & Kim Clark, *Design Rules: The Power of Modularity*, MIT Press, 2000（visible design rules / hidden modules）

### 進化・保守・ドキュメント

- Meir Lehman, "Programs, Life Cycles, and Laws of Software Evolution," *Proc. IEEE*, 1980
- Cyrille Martraire, *Living Documentation*, Addison-Wesley, 2019
- Michael Feathers, *Working Effectively with Legacy Code*, Prentice Hall, 2004（邦訳『レガシーコード改善ガイド』。characterization test）
- Martin Fowler, *Refactoring* (2nd ed.), Addison-Wesley, 2018（邦訳『リファクタリング 第2版』）

### 保管構造・トレーサビリティ・設計根拠

- Krzysztof Wnuk, Tony Gorschek & Showayb Zahda, "Obsolete Software Requirements," *Information and Software Technology*, 2013（廃止要求の実態と保存の推奨）
- Jace Browning & Robert Adams, "Doorstop: Text-Based Requirements Management Using Version Control," *Journal of Software Engineering and Applications*, 2014
- Eric Knauss et al., "T-Reqs: Tool Support for Managing Requirements in Large-Scale Agile System Development," *Proc. RE'18*, 2018
- Héctor Cadavid et al. による docs-as-code パイプラインの実証研究, *Empirical Software Engineering*（canonical からの自動生成と中央索引）
- Orlena Gotel & Anthony Finkelstein, "An Analysis of the Requirements Traceability Problem," *Proc. RE'94*, 1994（pre-RS / post-RS トレーサビリティ）
- Patrick Mäder & Alexander Egyed, "Do Developers Benefit from Requirements Traceability when Evolving and Maintaining a Software System?," *Empirical Software Engineering*, 2015（双方向トレースが保守を有意に高速・正確化する実証）
- NASA SWE-059（要求と設計の双方向トレーサビリティ）
- Victor Basili et al., "The Empirical Investigation of Perspective-Based Reading," *Empirical Software Engineering*, 1996（PBR。観点別読解による欠陥カバレッジ拡大）
- Thomas Moran & John Carroll (eds.), *Design Rationale: Concepts, Techniques, and Use*, Lawrence Erlbaum, 1996（Grudin の design capture 論を収録）
- Janet Burge, John Carroll, Raymond McCall & Ivan Mistrík, *Rationale-Based Software Engineering*, Springer, 2008

### 進め方・検証

- Alistair Cockburn, *Crystal Clear*, Addison-Wesley, 2004（walking skeleton）
- Andrew Hunt & David Thomas, *The Pragmatic Programmer*, Addison-Wesley, 1999（tracer bullet。邦訳『達人プログラマー』）
- Bill Wake, ["INVEST in Good Stories, and SMART Tasks"](https://xp123.com/articles/invest-in-good-stories-and-smart-tasks/), 2003
- Eric Ries, *The Lean Startup*, Crown Business, 2011（邦訳『リーン・スタートアップ』）
- Karl Popper, *The Logic of Scientific Discovery*, 1959（反証可能性。邦訳『科学的発見の論理』）
- Barry Boehm, "A Spiral Model of Software Development and Enhancement," *IEEE Computer*, 1988（リスク駆動の順序付け）
- Mary Poppendieck & Tom Poppendieck, *Lean Software Development*, Addison-Wesley, 2003（last responsible moment。邦訳『リーンソフトウエア開発』）
- [MADR](https://adr.github.io/madr/) — Markdown Architectural Decision Records（considered options 欄）

### 発問設計・認知科学・LLM 応用

- Glenn J. Browne & Michael B. Rogich, "An Empirical Investigation of User Requirements Elicitation: Comparing the Effectiveness of Prompting Techniques," *Journal of Management Information Systems*, 2001（構造化された prompting が要求引き出し量を増やす実証）
- Corentin Burnay, Ivan J. Jureta & Stéphane Faulkner, "What Stakeholders Will or Will Not Say: A Theoretical and Empirical Study of Topic Importance in Requirements Engineering Elicitation Interviews," *Information Systems*, 2014（default requirements・暗黙の前提の6カテゴリと実証）
- Endel Tulving & Donald M. Thomson, "Encoding Specificity and Retrieval Processes in Episodic Memory," *Psychological Review*, 1973（手がかり再生・encoding specificity）
- David G. Jansson & Steven M. Smith, "Design Fixation," *Design Studies*, 1991（提示された例による設計固着）
- Carrizo, Dieste & Juristo, "Systematizing Requirements Elicitation Technique Selection," *Information and Software Technology*, 2014（技法選択フレームワークと、効果比較の実証が少ないことの指摘）
- Krishna Ronanki et al. ほか, LLM for Requirements Engineering（LLM4RE）の系統的文献レビュー, 2024–2025（elicitation/validation への偏り・controllability と一貫性・hallucination の限界）
- Amos Tversky & Daniel Kahneman, "Judgment under Uncertainty: Heuristics and Biases," *Science*, 1974（アンカリング）
- Eric Johnson & Daniel Goldstein, "Do Defaults Save Lives?," *Science*, 2003（デフォルト効果）
- Thomas Mussweiler, Fritz Strack & Tim Pfeiffer, "Overcoming the Inevitable Anchoring Effect: Considering the Opposite Compensates for Selective Accessibility," *Personality and Social Psychology Bulletin*, 2000（consider-the-opposite による緩和）
- Zhou et al., *Cognitive Biases in LLM-Assisted Software Development*, arXiv 2026（開発者アクションの約半数がバイアスの影響下・多くが LLM 相互作用起因）
- Lisanne Bainbridge, "Ironies of Automation," *Automatica*, 1983（自動化が進むほど人間の監視能力が痩せるパラドックス。AI が「欠落なし」と報告するほど人が索敵をやめる不作為エラーの根拠）
- SWE-bench Verified / UTBoost（弱いテストオラクルが誤実装を通す問題。discriminative testability の根拠）

### 進捗・完了・AI エージェント評価

- Hongliu Cao, Ilias Driouich & Eoin Thomas, "Beyond Task Completion: Revealing Corrupt Success in LLM Agents through Procedure-Aware Evaluation," arXiv:2603.03116, 2026（τ-bench 上で通常成功の約 27–78% が手続き違反を含む corrupt success。six-dimension gating による条件つき値）
- Leo Gao, John Schulman & Jacob Hilton, "Scaling Laws for Reward Model Overoptimization," 2022（proxy reward の過最適化が ground-truth performance を損なう＝Goodhart's law の明示適用）
- Joar Skalse et al., "Defining and Characterizing Reward Hacking," 2022（proxy reward 最適化が true reward を損なう reward hacking の形式化）
- Charles Goodhart, 1975（Goodhart's law の原典。流通する短縮表現 "When a measure becomes a target…" は Strathern 1997 による後年の再定式化）
- Donald T. Campbell, *Assessing the Impact of Planned Social Change*, 1976（Campbell's law。量的指標が意思決定に使われるほど歪曲圧力が強まる）
- PMI, *PMBOK / Practice Standard for Work Breakdown Structures*（work package = WBS 最下位の、コストと期間を見積もり・管理する作業単位）

### 仕様駆動開発

- [Kiro](https://kiro.dev) — AWS による spec-driven development IDE
- [cc-sdd](https://github.com/gotalab/cc-sdd) — Claude Code / Codex 向け spec-driven development ツール
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) — change-proposal（proposal + delta spec）方式の spec-driven 開発ツール（2例目の export ターゲット）
