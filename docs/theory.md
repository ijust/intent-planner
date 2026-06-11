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

## L1 の計測基準 — 計測できない要求は判定できない

Tom Gilb は、品質要求には尺度（scale）と測定方法（meter）を持たせるべきだと主張し、Planguage という記法に落とし込みました。Basili らの **GQM（Goal-Question-Metric）** も、ゴールを問いに、問いを指標に展開する同系統の手法です。

designer-questions が on のとき `/intent-discover` が各 L1 項目に「計測基準:」を求めるのは、この実践の最小形です。「使いやすくする」のような計測不能な outcome は、実装後に達成・未達成を判定できません。検証目的（PoC）の開発では特に致命的で、判定できない仮説は何も学びを生みません。

## Compass — 判断基準の外在化

### Invariants — 保存される性質で正しさを定義する

Bertrand Meyer の**契約による設計（Design by Contract）**では、クラスは常に保たれるべき不変条件（invariant）を持ちます。これをシステムレベルへ持ち上げたものが、Ford らの **architectural fitness function**（『Building Evolutionary Architectures』）です。共通するのは「変更の正しさを、変更内容そのものではなく、**変更後も保存される性質**で定義する」という発想です。

intent-planner の Invariants は機械検証ではなく文書として AI に渡されますが、発想は同じです。AI に「この変更は良い変更か」を判断させる代わりに、「この性質は保たれているか」というチェック可能な形に判断を変換しています。

### Decision Rules — 軽量 ADR と設計根拠

Compass の Decision Rules（Context / Decision / Why / Consequences）は、Michael Nygard が2011年に提案した **ADR（Architecture Decision Record）** の軽量版です。さらに遡ると、設計上の決定を「何を選んだか」だけでなく「何と比較して・なぜ選んだか」ごと残すべきだという **design rationale** 研究（Rittel の wicked problems 論に始まる IBIS など）の系譜にあります。

根拠を残さない決定は、後続の変更者 — 人間でも AI でも — に無自覚に覆されます。決定を意図的に覆すときに旧エントリへ superseded と注記する運用も、ADR の標準的な慣行です。

### Anti-direction — 「やらないこと」の明文化

ゴール指向要求工学の **obstacle analysis**（ゴール達成を阻害するシナリオの分析）や、スコープ定義における non-goals の慣行に対応します。生成 AI は「もっともらしいが全体意図に反する局所最適」を選びやすいため、進んではいけない方向を明示しておく価値は、人間のチーム相手よりさらに大きくなります。

## Packets — 小さく・縦に・戻せる単位

packet に求められる性質（behavior-preserving / testable / rollbackable、Scope と Non-scope の明記）は、アジャイル開発のストーリー分割の知見に対応します。

- **INVEST**（Bill Wake）— 良い作業単位は Independent / Negotiable / Valuable / Estimable / Small / Testable
- **垂直スライス** — レイヤー単位（DB だけ・UI だけ）ではなく、観測可能な振る舞いを貫く単位で切る
- **behavior-preserving** — Martin Fowler の『Refactoring』における定義。「外から見た振る舞いを変えずに内部構造を変える」を変更の単位に保つことで、検証が「振る舞いが保たれたか」という観測可能な問いになる
- **rollbackable** — 継続的デリバリーにおける小さなバッチの原則。失敗時に戻せる単位で進めることが、AI に大きな変更を任せる際の安全装置になる

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
- `/intent-improve` の3軸 **completeness / correctness / coherence** は、要求仕様の古典的な品質特性（ISO/IEC/IEEE 29148 などにおける完全性・正確性・無矛盾性）に対応します。packet 単位の writeback が拾えない全体レベルの乖離を、節目にまとめて検査します。

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

### 進化・保守・ドキュメント

- Meir Lehman, "Programs, Life Cycles, and Laws of Software Evolution," *Proc. IEEE*, 1980
- Cyrille Martraire, *Living Documentation*, Addison-Wesley, 2019
- Michael Feathers, *Working Effectively with Legacy Code*, Prentice Hall, 2004（邦訳『レガシーコード改善ガイド』。characterization test）
- Martin Fowler, *Refactoring* (2nd ed.), Addison-Wesley, 2018（邦訳『リファクタリング 第2版』）

### 進め方・検証

- Alistair Cockburn, *Crystal Clear*, Addison-Wesley, 2004（walking skeleton）
- Andrew Hunt & David Thomas, *The Pragmatic Programmer*, Addison-Wesley, 1999（tracer bullet。邦訳『達人プログラマー』）
- Bill Wake, ["INVEST in Good Stories, and SMART Tasks"](https://xp123.com/articles/invest-in-good-stories-and-smart-tasks/), 2003
- Eric Ries, *The Lean Startup*, Crown Business, 2011（邦訳『リーン・スタートアップ』）
- Karl Popper, *The Logic of Scientific Discovery*, 1959（反証可能性。邦訳『科学的発見の論理』）

### 仕様駆動開発

- [Kiro](https://kiro.dev) — AWS による spec-driven development IDE
- [cc-sdd](https://github.com/gotalab/cc-sdd) — Claude Code / Codex 向け spec-driven development ツール
