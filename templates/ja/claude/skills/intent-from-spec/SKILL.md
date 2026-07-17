---
name: intent-from-spec
description: 利用者が渡した自然言語テキスト（PRD・issue・ユーザーストーリー等の仕様書に加え、断片メモ・走り書き・音声書き起こし）を read-only で読み、未明示の意図候補と沈黙ギャップを抽出して `.intent/spec-ingest/` へ取り込む内向きスキル。断片入力は話題ごとに束ね「決まっている／迷っている」を仕分けてから抽出する。
allowed-tools: Read, Glob, Grep, Write
argument-hint: 取り込む自然言語テキスト（仕様書または断片メモ。ファイルパス指定または本文の貼り付け）
---

# intent-from-spec Skill

## Core Mission
- **Success Criteria**（達成されていれば成功。抽出・照合・仕分け・recap の手順詳細は Execution Steps に一本化し、ここでは成果のみ宣言する）:
  - 自然言語テキスト（仕様書または断片メモ）を read-only で読み、目的・成果・能力・不変則・制約・anti-direction・暗黙の前提の意図候補を抽出し、すべて Assumptions（推測された意図）として標識して canonical（確定した意図）と混在させていない（Step 1〜2。R1.1 / R1.2）
  - 入力が断片メモ・走り書き・音声書き起こしのとき、7カテゴリ抽出の前段で話題ごとの束ね（クラスタリング）と「決まっている／迷っている」の仕分けを行い、束・印はすべて inferred 標識付きで提示している（本人の言葉を書き換えすぎない）。まとまった文書の入力ではこの前段は発火せず、既存の出力構造は不変（C49・DR113）
  - 入力をその仕様書テキストに限定し、ソースコード・実行トレース・テスト結果を意図抽出の入力に用いていない（R1.4）。仕様書の技術要求・セキュリティ要求を取りこぼさず Compass の Invariants 候補として拾い、行き先を Invariants に限定している（tech.md/design への反映は下流委譲。R1.5 / R1.6）
  - 入力として仕様書テキストが与えられていないとき、抽出を行わず、入力すべき仕様書を利用者に求めて終了する（fail-fast。R1.3）
  - 既存の物差し（`validate-checks.md` の検査カタログ・`decision-slots.md` の共通コアスロット）に照らし、埋まらない項目をギャップとして列挙し、各ギャップがどのカテゴリ・どのスロットの沈黙かを観測可能な形で・確定欠陥でなく仮説として提示している（R2.1 / R2.2 / R2.3）。提示中も処理を停止せず警告・気づきに留める（drift-watch と同 stance。R2.4）
  - 抽出物・ギャップを load-bearing で定性仕分けし、high を low と区別して提示している。判定は `decision-slots.md` の「前倒し/遅延ドア」列を読んで写すだけで、数理ソルバー・数値スコア・閾値を持たない（R3.1 / R3.2 / R3.3）
  - 「何を照合し・何が埋まらなかったか」を omission recap として要約し、再確認を促している（R4.1）
  - 承認された項目のみを canonical 昇格の対象とし、未承認項目を Assumptions のまま破棄せず保持し、自動反映せず昇格を利用者の人手コピーに委ねている（R4.2 / R4.3 / R4.4）
  - 出力を `.intent/spec-ingest/` 配下の派生物に限定し、canonical な `.intent/*.md`・アプリケーションコード・入力仕様書を一切変更していない（read-only。R5.2）。命名規約 `intent-*` に従い、外部 spec ツール・kiro-* 開発環境を変更しない（R5.6）

## Execution Steps

### Step 1: 入力（自然言語テキスト）の存在を確認する（fail-fast）
- 利用者が `/intent-from-spec` を実行したとき、まず取り込む自然言語テキスト——まとまった仕様書でも断片メモ・走り書き・音声書き起こしでもよい——（ファイルパス指定または本文の貼り付け）が与えられているかを確認する。
- テキストが与えられていない場合は、**何も書き込まず**に入力の不在を明示し、取り込むテキスト（パス指定または貼り付け）を渡すよう利用者に求めて終了する（fail-fast。R1.3）。空・数語だけの断片も同じ（束ねる素材が無いときは生成せず告げる）。この時点では `.intent/spec-ingest/` 配下に一切書き込まない。
- ソースコード・実行トレース・テスト結果は意図抽出の入力に**用いない**。それらからの意図逆算は behavior-unknown モードの code→Intent が担う別経路であり、本スキルの対象外である（R1.4）。
- 物差しの正本（`intent-validate/rules/validate-checks.md`・`intent-packets/rules/decision-slots.md`）と canonical な `.intent/*.md`（あれば intent-tree / compass / mode）は後続 Step で read-only に参照する。無くても停止しない（紐づけ不能な箇所は不在を明示する）。

### Step 2: 4 つの rules に委譲して抽出・照合・仕分け・recap する
- 本スキルは独自の抽出・照合・判定・採点ロジックを持たない。各観点の正確な読み取り・転記・紐づけ規則は以下 4 つの rules に委譲する（相対パスで参照）。各 rules が指定する正確な見出し・転記先・ID 体系に従い、抽出候補をすべて Assumptions として標識し、物差しは読むだけで再実装せず、欠落・未観測は推測で埋めず明示する。
- `rules/extract-intent.md` — 入力テキストを読み、目的/成果/能力/不変則/制約/anti-direction/暗黙の前提の7カテゴリの意図候補を抽出する。入力が断片メモ・走り書き・書き起こしのときは、7カテゴリ抽出の前段で同 rule の「断片入力の扱い」節に従い、話題ごとの束ね（クラスタリング）と「決まっている／迷っている」の仕分けを行う（束・印はすべて inferred 標識付き・本人の言葉を書き換えすぎない・まとまった文書では発火しない）。全候補を Assumptions として標識し、各候補を転記先（intent-tree の L0–L4 Assumptions / compass の Invariants・Anti-direction・Decision Rules）が一意に決まる見出し・粒度で書き出す。技術/セキュリティ要求などの守るべき制約は取りこぼさず compass の Invariants 候補へ拾い、その行き先を Invariants に限定する（tech.md/design への反映は output に含めない＝下流委譲。R1.1 / R1.2 / R1.4 / R1.5 / R1.6 / R5.1）。
- `rules/gap-readout.md` — `validate-checks.md` の安定 kebab-case 検査 ID と `decision-slots.md` の共通コア8スロット ID を**読み取り**、入力仕様書に照らして埋まらない項目をギャップとして列挙する。各ギャップがどの物差しの沈黙か（ID 紐づけ）・どのカテゴリ/スロットの沈黙か（観測可能な根拠）を示し、確定欠陥でなく仮説として提示する。独自の検査 ID・スロット ID を新しく定義しない。spec-ingest は提案者（proposer）であり受理ゲートではないため、仕様書の沈黙からスロット該当を**推論してよいが、確定はしない**（validate と別 posture）。処理を止めず warn のみ（R2.1 / R2.2 / R2.3 / R2.4）。
- `rules/load-bearing.md` — gap-readout がスロット ID に紐づけたギャップ・意図候補について、`decision-slots.md` の**「前倒し/遅延ドア」列**を読んで写すだけで high/low を定性仕分けする。「前倒し」＝high（落ちると危険）、「遅延可」＝low。数理ソルバー・数値スコア・閾値を持たず、判別軸を新たに発明しない。スロット ID に紐づけられない項目は load-bearing 不明として不在を明示する。high を low と観測可能に区別して提示し、low も切り捨てず保持する（R3.1 / R3.2 / R3.3）。
- `rules/omission-recap.md` — 「照合した枠（何を読んだか）／埋まった箇所／埋まらなかった箇所（沈黙）／照合できなかった箇所（不在）」を一覧として要約し、「沈黙の沈黙」（AI が網羅を匂わせ人間が探索を止める不作為エラー）を避ける。gap-readout が紐づけた既存 ID をそのまま引き再定義しない。承認項目のみ canonical 昇格の対象とし、未承認は Assumptions のまま保持、昇格は利用者が承認項目を手で discover / compass の対話へ持ち込む人手コピーであることを案内する（機械ハンドオフを持たない。R4.1 / R4.2 / R4.3 / R4.4）。

### Step 3: 派生ビューを最後に `.intent/spec-ingest/` へ書き込む（全置換・派生）
- すべての抽出・照合・仕分け・recap が終わってから、**最後に** `.intent/spec-ingest/spec-ingest.md` を**全置換**で書き込む（再生成の冪等性）。canonical な `.intent/*.md`（intent-tree / compass 等）・steering（tech.md）・design・入力仕様書には一切書き込まない。
- ビュー冒頭に、本ビューが派生（derived）・再生成可能であり・正本ではなく・Git 非追跡であること、および記載された意図候補・ギャップ・load-bearing 度がすべて Assumptions（仮説）であり利用者の承認まで暫定であることを明示する（R1.2）。
- 出力は extract-intent の転記先見出しに従い、人が intent-tree の Assumptions / compass の各ブロックへ 1:1 で写せる粒度で構成する（昇格の継ぎ目を人手に保つ）。

## Output Description

> **出力先はターミナルである。** 出力には raw HTML（`<details>` / `<summary>` 等の折りたたみ UI）を使わず、詳細は素の Markdown 見出しで区切って退避する（ターミナルでは生タグがそのまま表示され読めなくなるため）。`[[...]]`（memory / delta 用の wikilink 等）の内部記法は、delta / memory ファイルへの記録では正当だが、人向けのターミナル出力ではそのまま出さず普通の語に開く（リンク先の名前を自然文で綴る）。

- `.intent/spec-ingest/spec-ingest.md`（派生・再生成可能・Git 非追跡。正本ではなく全項目が Assumptions である旨をビュー冒頭に明示）。内容は Step 2 の4 rules の output contract が正本（ここでは再掲しない）。骨子のみ:
  - **束ねと仕分け（断片入力のときのみ）** — extract-intent の「断片入力の扱い」に従い、話題ごとの束と「決まっている／迷っている」の印（すべて inferred 標識付き）を7カテゴリ抽出の前に置く。末尾に「この出力はそのまま `/intent-discover` の入力に使える」案内を添える。まとまった文書の入力ではこのセクションは現れない
  - **意図候補（抽出）** — extract-intent に従い目的/成果/能力候補（→ intent-tree L0–L4 Assumptions）・Invariants 候補（→ compass Invariants、技術/セキュリティ制約を含む）・Anti-direction 候補（→ compass Anti-direction）・暗黙前提候補（→ intent-tree Assumptions / compass Decision Rules）を転記先が一意に決まる見出しで、各候補に抽出根拠を併記
  - **ギャップ（沈黙）** — gap-readout が `validate-checks.md` / `decision-slots.md` の ID に紐づけたギャップを、どのカテゴリ/スロットの沈黙かとともに仮説として列挙
  - **load-bearing 仕分け** — high を low と区別して提示（high を先頭等）。スロット紐づけ不能は load-bearing 不明として明示
  - **omission recap** — 照合した枠／埋まった／埋まらなかった／照合できなかった箇所の一覧と、承認項目を利用者が discover / compass へ手で転記する昇格案内
- 素材が無いカテゴリ・軸は「該当記述なし（沈黙）／未観測」と明示し省略する（推測で埋めない）。

### 報告の平易さ点検（利用者向け報告・出力直前・共通）

利用者へ向けた報告（進捗・完了・確認事項の提示。ターン末尾の要約を含む）を出す直前に、次を点検する（INV105・DR208）。対象は利用者向けの報告文だけで、内部の記録（`.intent/` 配下の canonical・ログ）の書き方には適用しない。

- **内部文書の文をそのまま転写しない**: 直前に読んだ・書いた内部成果物（tree・compass・packet・Open Questions）の文面は内部の語彙で書かれている。報告では、その内容を初見の読み手に通じる言葉で言い直す（事実・意味は変えない）。
- **識別子を本文の主語にしない**: 確認事項・作業単位を示すときは、まず「何を・なぜ」が単体で通じる一文を置き、識別子（Open Question 番号・packet 名・記号・工程名）はその後ろに参照として添える（例: 「…を確かめてから始めてください（整理番号: OQ-xxx-1）」）。平易化のために識別子・記録への参照を削らない（記録へ辿れなくなる）。
- **通じるかの合図**: 1文に未説明の内部語が3つ以上並んだら詰め込みすぎの合図（機械カウントではなく意味の読みで）。単体で通じなければ、平易に書き直してから出す（事実・意味は変えない）。
- この点検は事後の記録と対で働く（予防だけで閉じない）: 報告が通じなかった実例は、drift-watch が on のとき drift-log へ症例として残し、次の予防に使う。

## Safety & Fallback
- **書込み境界**: 書込み先は `.intent/spec-ingest/` 配下限定である。canonical な `.intent/*.md`（intent-tree / compass / mode 等）・物差しの正本（`validate-checks.md` / `decision-slots.md`）・steering（tech.md）・design・入力仕様書は read-only であり、そこへは作成・変更・削除を一切行わない（frontmatter の `Write` は `.intent/spec-ingest/` 配下への書き込みのためにのみ許可される。R5.2）。
- **ギャップは仮説（warn のみ・止めない）**: ギャップ・load-bearing 度・意図候補はすべて確定した欠陥/深刻度ではなく Assumptions（仮説）である。提示している間も処理を停止せず、警告・気づきの提示に留める（drift-watch と同 stance。R2.3 / R2.4）。
- **承認ゲート・昇格は人手**: canonical への反映には利用者の明示的な承認を必須とする。承認項目のみを canonical 昇格の対象とし、未承認項目は破棄せず Assumptions のまま保持する。canonical への自動反映は行わない。昇格は利用者が承認項目を手で discover / compass の対話へ持ち込む人手コピーであり、spec-ingest は discover / compass を呼ばず、discover / compass が spec-ingest の出力を自動で読み込むこともない（機械ハンドオフを持たない＝hidden shared ownership を作らない。R4.2 / R4.3 / R4.4）。
- **物差しを再実装しない**: 検査・スロット検証を自前で実行せず、`validate-checks.md` / `decision-slots.md` の ID カタログと「前倒し/遅延ドア」列を読むだけである。独自の検査 ID・スロット ID・スコアリング・重み付けエンジンを持たない。
- **外部依存ゼロ**（INV2 / R5.3）。外部パッケージ・AST パーサ・数理ソルバーを導入せず、Node 標準と自然言語ヒューリスティクスに限定し、抽出処理を自然言語のワークフロー内で完結させる。
- **アプリケーションコードを変更しない**（R5.2）。意図計画フェーズにおいてアプリケーションコードおよび入力された仕様書を変更しない（読み取りのみ）。
- **命名・外部非変更**: 命名規約 `intent-*` に従い、外部 spec ツール・kiro-* 開発環境を変更しない（R5.6）。
- **前提不在時**: 入力仕様書テキストが無いとき、何も書き込まず不在を明示し、取り込む仕様書（パス指定または貼り付け）を渡すよう利用者に求めて終了する（fail-fast。R1.3）。
- **部分欠落時**: 7カテゴリのうち仕様書が沈黙しているもの、物差しのカタログに紐づけ不能なギャップ、スロットに紐づけ不能で load-bearing 不明なものは、当該箇所を「該当記述なし（沈黙）／不在／不明」と明示し省略する（推測で埋めない）。
