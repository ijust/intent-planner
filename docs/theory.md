# intent-planner の理論的背景

intent-planner の各機能は、要求工学（Requirements Engineering）やソフトウェアアーキテクチャ研究で確立されてきた考え方を、AI コーディングエージェントとの協働向けに軽量化したものです。このドキュメントは「なぜこの手順なのか」を理論の側から説明します。

**読まなくても使えます。** intent-planner は、フローに沿って質問に答えていけば必要な成果物が埋まるように設計されており、理論の予習を前提にしていません。このドキュメントは、各ステップで何を書くべきか迷ったとき、あるいは手順の意図そのものを知りたいときの参照用です。

## 対応表

| intent-planner の概念 | 背後にある考え方 | 主な出典 |
|---|---|---|
| Intent Tree（L0–L4） | ゴール指向要求工学のゴール階層 | KAOS / i* |
| L1 の計測基準 | 計測可能な要求 | Gilb / GQM |
| Compass: Invariants | 不変条件・契約による設計・fitness function | Meyer / Ford ら |
| Compass: Decision Rules | ADR・設計根拠（design rationale）の記録 | Nygard |
| Compass: Anti-direction | 障害分析・non-goals の明文化 | KAOS obstacle analysis |
| Packets | 垂直スライス・INVEST・振る舞い保存 | Wake / Fowler |
| Walking skeleton | 歩く骸骨・曳光弾 | Cockburn / Hunt & Thomas |
| PoC の仮説・反証条件・GO/NO-GO | 反証可能性・仮説駆動開発 | Popper / Ries |
| Writeback / Improve | 生きたドキュメント・Twin Peaks モデル・ソフトウェア進化の法則 | Martraire / Nuseibeh / Lehman |
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
- **Living Documentation**（Martraire） — ドキュメントの価値は鮮度に比例します。deltas への記録 → 人間の承認 → 本体への反映、という2段構えは、自動反映による意図文書の汚染を防ぎつつ鮮度を保つための折衷です。
- `/intent-improve` の3軸 **completeness / correctness / coherence** は、要求仕様の古典的な品質特性（ISO/IEC/IEEE 29148 などにおける完全性・正確性・無矛盾性）に対応します。packet 単位の writeback が拾えない全体レベルの乖離を、節目にまとめて検査します。coherence 軸が Decision Rules の **Revisit when 条件の成立**を検出するのも同じ発想で、「見直し条件を書かせる」だけでなく「成立したら知らせる」ところまでを仕組みにしています。

## Validate — 意図文書の lint と、問いの期限

`/intent-validate` の各検査が安定した**検査 ID**（invariant-conflict, stale-assumptions, …）を持つのは、コードに対する lint・静的解析の設計をそのまま意図文書へ持ち込んだものです。指摘が ID で参照できると、報告の再現・抑制・追跡が可能になり、検査の追加・変更も互換性として管理できます。

このうち **stale-assumptions** は、AI が推測した前提（Assumptions）が検証されないまま滞留することへの検査です。前提は時間とともに「検証されていない」から「事実として扱われている」へ静かに昇格してしまうため、未検証のまま古びた前提を明示的に報せます（canonical と推測を分ける provenance 管理の、時間軸方向の補完です）。

Open Questions の **`[export まで]` タグ**は、Lean ソフトウェア開発の **last responsible moment**（決定はそれを下すべき最後の責任ある瞬間まで遅らせる）の実装です。すべての問いに即答を求めると planning が止まり、放置すると未決定のまま実装に流れ込みます。「いつまでに答えればよいか」を問いに付けることで、遅延してよい決定と、export という不可逆点の前に必要な決定を区別します。export 前にタグ付きの未回答を確認するのは、この期限の執行です。

## 完全性の床 — 横の網羅性と縦の深度

AI コーディングエージェントへ実装を委譲するとき、最大の失敗要因は「タスクの分解が粗い（縦）」よりも「そもそも触れられていない話題（横）」です。エラー時の挙動・整合性・冪等性・認可・後方互換などが仕様に書かれないまま委譲されると、エージェントは**暗黙の（多くは安直な）デフォルト**でコードを埋め、本番で深刻な不具合を生みます。intent-planner はこれを**横の網羅性**と**縦の深度**の二軸で抑えます。この二軸の設計指針は、前提を伏せた中立な調査でも独立に支持されました（要求工学・アーキテクチャ・認知科学の一次情報との突合）。

### 横の網羅性 — 完全性スキーマ × 観点別レビュー × トレース

要求品質の標準（ISO/IEC/IEEE 29148・INCOSE GtWR）は、完全性を「よく書けた一文」ではなく**要求集合が必要な関心事を十分に含むこと**として扱います。したがって横漏れは「よい質問」だけでは防げず、**関心事スキーマ（聞き漏らしの目次）× 観点別レビュー × トレーサビリティ**の複合でしか安定して防げません。

- **完全性スキーマ（決定スロット）** — 聞き漏らしやすい技術的決定を packet の `## Decisions` に**スロット**として列挙します（整合性・冪等性・エラー意味論・認可など）。これは Bass らの **ASR（Architecturally Significant Requirements）** を「required-how を上流で確定する」形に落としたもので、固定リストではなくモード別差分で文脈に合わせます。各スロットは「回答済み / 未定（理由付き）/ 非該当 / ADR候補」のいずれかで必ず閉じ、「黙って飛ばす」を構造的に防ぎます。スロットの正本は単一ファイル（`decision-slots.md`）に集約し、「表に行を足すだけ」で拡張します。
- **観点別レビュー（PBR）** — Basili らの **Perspective-Based Reading** は、利用者・運用・テスト・保守など異なる視点から読むと、同人数の通常読解より広い欠陥カバレッジを達成すると実証しました。`/intent-validate` は四観点の静的チェックとして、各観点で「破綻条件が記述されているか」を read-only で確認します（対話的監査は別途のレビューに委ね、新たな自律ループは作りません）。
- **Requirements Smells** — Femmer らの研究に基づき、曖昧語・主観語・比較級・弱い語・未定義代名詞といった表層欠陥を機械的に拾います。これは「書かれ方」を直す二次防衛線で、「そもそも書かれていない」を補う完全性スキーマとは別の層です。
- **トレース** — NASA SWE-059 や Mäder & Egyed（双方向トレースが保守作業を有意に速く・正確にする）に基づき、上流（親意図）に加え下流（realized-by / verified-by）への最小十分なリンクを張ります。Gotel & Finkelstein が指摘した **pre-RS トレーサビリティ**（意図→要求の変換が最初の切断点）を踏まえ、parent_intents 欠落を検査します。

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

## Enforcement — 手続きの実行だけを検査する

enforcement が保証するのは「writeback という**手続きが実行されたこと**」だけで、書き戻した内容の正しさではありません。これはプロセス品質とプロダクト品質の古典的な区別で、lint や CI ゲートと同じ設計です: 機械的に安く検査できる範囲に検査を限定し、内容の正しさは `/intent-improve` と人間レビューに委ねます。

staleness 検知の誤検知を認めたうえで既定を off にしているのも、検査理論の定石に沿っています。偽陽性の多いゲートは「ゲートを常に迂回する習慣」（`--no-verify` の常用）を生み、検査自体を無効化するためです。

## 進捗の表現 — 状態は持つが、状態機械は持たない

packet に「今どこまで作ったか」を持たせるとき、intent-planner は **state を記録**しますが **state machine は持ちません**。この区別が、進捗を扱う設計の中心です。

- **state を持つ**（記録する）= 現在の進行段階（draft / ready / implementing / verifying / done）を宣言的に書き出すこと。これは要求を**状態属性つきのオブジェクト**として扱う ISO/IEC/IEEE 29148 の標準的な発想（[保管構造](#保管構造--1単位1ファイルと現役--履歴の物理分離)節）の延長です。
- **state machine を持つ**（駆動する）= 遷移規則・ガード・自動進行を持つランタイムで状態を自律的に動かすこと。intent-planner はこれを**持ちません**（steering のアンチパターン「状態機械・ラベル管理・自律ループの再発明」）。

進行段階は、AI の自己申告ではなく、人の確認または検査（intent-validate / drift-watch）の結果を根拠に記入します。`state=done` は `## Evidence` 節に確定した検証結果があることを前提にします。これは「テストが通ったら自動で done にする」自動遷移ではなく、「人/検査が確認 → 記入 → done」という宣言的な順序です。

状態の**ストレージ**も同じ規律に立ちます。state を frontmatter（YAML）のスキーマ — キー固定・値域固定・未確定キーは空値保持 — で持つのは、実質「スキーマ付きレコード」であり、DB を導入せずに state を規律する形です。grep / git diff / 人の可読性を保ち、依存ゼロ原則（INV2）を守ります。「state を正式に持つ」とは DB 化することではなく、スキーマと制約で規律することだ、という立場です。

### 進捗は単一の％にしない — 完成度と流れを分ける

進捗には単一の万能指標がありません。要求の充足、実装の完了、証拠の有無、依存の解消は、それぞれ別のものを測っています。intent-planner の俯瞰（`/intent-overview`）は進捗を1つの総合％に圧縮せず、**意図の安定度 / 実現の完了度 / 証拠の確定度**という性質の異なる軸に分けて提示します。これにより「実装は進んでいるが証拠が未確定」「証拠は揃ったが上位意図とのギャップがある」といった、潰すと見えなくなる状態を表現できます。

軸を分けるもう1つの理由は **Goodhart / Campbell の法則**（代理指標を目標化すると本来の目的から乖離しうる）への配慮です。AI エージェント文脈では reward hacking / overoptimization として一次文献があります（不完全な proxy reward を最適化しすぎると本来の性能が悪化する）。ソフトウェア進捗指標への適用は、法則の厳密な引用というより、測定・管理の一般理論を現場へ適用した解釈として読んでください — 「進捗速度を目標にすると指標がハックされる」ことを法則名つきで定式化した定番の一次文献までは確認されていません。それでも、単一の進捗速度を目標化すれば容易な作業を量産して数値を水増しする誘因が生まれる、という誘因は十分に想定できるため、少なくとも1つは独立に検証可能な軸（証拠の確定度）を持ち、自己申告を完了判断の一次根拠にしません。

## AI に進捗・完了を委ねるときの落とし穴 — 自己申告を信じない

AI エージェントに工程・完了の管理を委ねると、人間同士の開発では目立たなかった固有の失敗様式が現れます。intent-planner の進捗・完了の設計は、これらへの防御として組まれています。

- **進捗のでっち上げ・完了の過大申告（hallucinated progress）** — エージェント評価では、終端状態が成功でも手続き違反を含むケースが報告されており、未実装やバグがあっても完了と書きうる。Cao ら（2026）の手続き考慮型評価（Procedure-Aware Evaluation）は、τ-bench 上で GPT-5 / Kimi-K2-Thinking / Mistral-Large-3 を評価し、**通常の成功と見なされる結果のうち約 27–78% が、手続き遵守の観点では "corrupt success"（終端状態は成功だが手続き違反を含む）だった**と報告しています。この 27–78% は six-dimension gating で絞ったときに消える成功の割合（条件つきの成功率差）で、GPT-5 で約 27%、Mistral/Airline で約 78% です。対策は、完了の確定を**自己申告でなく外部化された検査と evidence に紐づける**ことです。intent-planner では `state=done` を `## Evidence`（検査結果・人確認）に基づかせ、その **Evidence の記録内容とその出所を完了判断の一次根拠**にします。validate-checks の安定 ID は、各 evidence をどの検査軸で確かめたかを指す参照キーであって（ID 単独は検査結果そのものではない）、evidence を検査軸へ紐づける役割を担います。
- **状態の外部化が解くもの・解かないもの** — 状態を会話コンテキストの中だけに持つ設計は、セッションを跨ぐと意図や決定を失います。`.intent/*.md` への外部化はこれを解きますが、外部化が保証するのは**永続性・共有性・参照性**までで、**真実性・鮮度・唯一性**は別問題です。後者への対策として、単一の書き込み可能な正本（canonical）と、そこから再生成される読み取り用ビュー（derived view）の分離、read-only での再生成、人間の承認ゲートを置きます。`/intent-overview` が canonical を変えず派生ビューを再生成するのは、この materialized view と single source of truth の発想です。
- **human-in-the-loop の承認ゲート** — 完了・採択・whole-spec 更新のような節目は、AI の発話ではなく独立した検査か人のレビューで通します。writeback の deltas → 承認 → 本体反映（[Writeback / Improve](#writeback--improve--ドキュメントを生かし続ける)節）も、enforcement が手続きの実行だけを検査し内容は人に委ねるのも、同じ「自己申告を一次根拠にしない」設計です。

正直な注記: この節の AI 固有の失敗様式は、2024 年以降に増えたエージェント評価研究に基づく若い知見です。corrupt success の 27–78% は **τ-bench 上で six-dimension gating を適用したときの条件つきの値**であり、ドメイン・モデル依存です（一般則として「成功の 27–78% は常に corrupt」という意味ではありません）。intent-planner の防御設計は「AI の自己申告を完了の一次根拠にしない」という、この節で参照した研究から直接にはみ出しにくい区別に立つもので、特定の数値や手法の優位を主張するものではありません。

## モード — 状況に応じた方法の組み替え

単一の手順を万能とせず、状況に応じて手順を組み替える発想は、要求工学で **situational method engineering** と呼ばれる領域に対応します。各モードにも個別の理論的背景があります。

- **behavior-unknown** — Michael Feathers（『レガシーコード改善ガイド』）の**仕様化テスト（characterization test）**: 仕様が失われたシステムでは、現在の観測可能な振る舞いを記録し、それを暫定的な仕様として固定します。「観測できる振る舞いから意図を逆算する」はこの文書版です。
- **refactor** — Fowler の behavior-preserving と、Perry & Wolf の drift 是正。「正しく動くが設計意図からズレる」変更を防ぐには、保存すべき意図を先に言語化しておく必要があります。
- **feature-growth** — 既存システムへの変更が及ぼす影響の分析（impact analysis）。追加単位の分解は、既存の invariant を壊さない範囲で切ることが中心になります。

## cc-sdd 連携 — 仕様駆動開発と EARS

**仕様駆動開発（spec-driven development）**は、AI エージェントに requirements → design → tasks の段階的な成果物を作らせ、人間が各段階でレビュー・承認してから次へ進む方式です。AWS の Kiro（2025）が広め、[cc-sdd](https://github.com/gotalab/cc-sdd) はその Claude Code / Codex 向け実装です。cc-sdd の requirements が用いる **EARS（Easy Approach to Requirements Syntax）** は、Rolls-Royce の Alistair Mavin らが提案した（RE'09）、自然言語要求の曖昧さを少数の構文テンプレートで抑える記法です。

intent-planner が spec そのものを生成せず「下書きまで」に留めるのは、冒頭で述べた問題空間と解空間の責務分離です。1つのツールが両方を担うと、解の都合（実装のしやすさ）が問題定義の側へ逆流しやすくなります。

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

### アーキテクチャ・設計判断

- Dewayne Perry & Alexander Wolf, "Foundations for the Study of Software Architecture," *ACM SIGSOFT Software Engineering Notes*, 1992（architectural drift / erosion）
- Bashar Nuseibeh, "Weaving Together Requirements and Architectures," *IEEE Computer*, 2001（Twin Peaks モデル）
- Michael Nygard, ["Documenting Architecture Decisions"](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), 2011（ADR）
- Bertrand Meyer, *Object-Oriented Software Construction* (2nd ed.), Prentice Hall, 1997（Design by Contract）
- Neal Ford, Rebecca Parsons & Patrick Kua, *Building Evolutionary Architectures*, O'Reilly, 2017（fitness function。邦訳『進化的アーキテクチャ』）
- M. Konrad, S. Adam, T. Terrenzi & A. Ayvaz, *Architecture Without Architects: Vibe Architecting in Modern Software Systems*, arXiv:2604.04990, 2026（vibe architecting。自然言語プロンプトに形作られるアーキテクチャと、その5つのメカニズム）
- Len Bass, Paul Clements & Rick Kazman, *Software Architecture in Practice*, Addison-Wesley（ASR: Architecturally Significant Requirements・品質シナリオ）
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
