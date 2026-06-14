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

要求抽出には古くから「カテゴリ枠を先に置く」発想があり、Volere のチェックリスト、ISO/IEC 25010 の品質特性、NFR Framework、SQUARE などが確立しています。compass が Invariant・制約を「データ/個人情報・外部依存・運用/障害時・セキュリティ/プライバシー/法令・性能/可用性・不変条件」という固定カテゴリ枠で毎回聞くのは、この「抜け漏れ防止の外骨格」を最小化したものです。

構造化された問いが自由な聞き取りより多くの要求を引き出すことには実証があります。Browne & Rogich は prompting technique の比較実験で構造化された問いがより多くの要求を引き出すことを、Burnay らは6つの context category を elicitation checklist として使うと意思決定に有意な影響が出ることを示しました。重要度の高いカテゴリ（データ/個人情報・外部依存）を先に提示するのは、認知負荷の制御です。

正直な注記: Volere や ISO 25010 といった**個別名義の手法そのもの**が欠落を何%減らすか、という head-to-head の強い実証は乏しいままです。Carrizo らのレビューでも、技法効果を比較した実証研究はごく少数でした。実証が相対的に強いのは手法名よりも「カテゴリ化された問い・決定木・トリガ質問」という構造化発問の側であり、固定カテゴリ枠は「枠を見せれば自動的に網羅される」ものではありません。だからこそ枠を単なる見出しに留めず、各カテゴリで具体的に問う設計にしています。

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

### アーキテクチャ・設計判断

- Dewayne Perry & Alexander Wolf, "Foundations for the Study of Software Architecture," *ACM SIGSOFT Software Engineering Notes*, 1992（architectural drift / erosion）
- Bashar Nuseibeh, "Weaving Together Requirements and Architectures," *IEEE Computer*, 2001（Twin Peaks モデル）
- Michael Nygard, ["Documenting Architecture Decisions"](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), 2011（ADR）
- Bertrand Meyer, *Object-Oriented Software Construction* (2nd ed.), Prentice Hall, 1997（Design by Contract）
- Neal Ford, Rebecca Parsons & Patrick Kua, *Building Evolutionary Architectures*, O'Reilly, 2017（fitness function。邦訳『進化的アーキテクチャ』）
- M. Konrad, S. Adam, T. Terrenzi & A. Ayvaz, *Architecture Without Architects: Vibe Architecting in Modern Software Systems*, arXiv:2604.04990, 2026（vibe architecting。自然言語プロンプトに形作られるアーキテクチャと、その5つのメカニズム）

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
- Orlena Gotel & Anthony Finkelstein, "An Analysis of the Requirements Traceability Problem," *Proc. RE'94*, 1994
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

### 仕様駆動開発

- [Kiro](https://kiro.dev) — AWS による spec-driven development IDE
- [cc-sdd](https://github.com/gotalab/cc-sdd) — Claude Code / Codex 向け spec-driven development ツール
