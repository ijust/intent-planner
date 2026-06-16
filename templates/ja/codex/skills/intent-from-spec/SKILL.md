---
name: intent-from-spec
description: 利用者が渡した自然言語仕様書（PRD・設計仕様・機能仕様・issue・ユーザーストーリー）を read-only で読み、明示されていない意図候補を抽出し、既存の物差しに照らして沈黙をギャップとして表出し、load-bearing で定性優先づけして omission recap を提示する内向きの取り込みスキル。抽出はすべて Assumptions（仮説）であり、出力は `.intent/spec-ingest/` 配下の派生物に限定し canonical な成果物は一切変更しない。
---

# intent-from-spec Skill

## Core Mission
- **Success Criteria**:
  - 利用者が渡した自然言語仕様書（PRD・設計仕様・機能仕様・issue・ユーザーストーリーなど一般的な開発仕様書のテキスト）を read-only で読み、目的・成果・能力・不変則・制約・anti-direction・暗黙の前提の意図候補を抽出している。抽出したすべての候補を Assumptions（推測された意図）として標識し、canonical（確定した意図）と混在させない（R1.1 / R1.2）
  - ソースコード・実行トレース・テスト結果を意図抽出の入力に用いない。入力は利用者が指定した自然言語仕様書のテキストに限定する（R1.4）
  - 仕様書に含まれる技術要求・セキュリティ要求などの守るべき制約を取りこぼさず Compass の Invariants 候補として拾い、その行き先を Invariants に限定する（steering(tech.md)/design への反映は下流に委ねる。R1.5 / R1.6）
  - 入力として仕様書テキストが与えられていないとき、抽出を行わず、入力すべき仕様書を利用者に求めて終了する（fail-fast。R1.3）
  - 既存の物差し（`validate-checks.md` の検査カタログ・`decision-slots.md` の共通コアスロット）に仕様書を照らし、埋まらない項目をギャップとして列挙する。各ギャップがどのカテゴリ・どのスロットの沈黙かを観測可能な形で示し、確定欠陥でなく仮説として提示する（R2.1 / R2.2 / R2.3）
  - ギャップを提示している間も処理を停止せず、警告・気づきの提示に留める（drift-watch と同 stance。R2.4）
  - 抽出物・ギャップを load-bearing（落ちると後続の正しさを損なう種類か）で定性的に仕分けし、high の項目を low と区別できる形で提示する。判定は `decision-slots.md` の「前倒し/遅延ドア」列を読んで写すだけで、数理ソルバー・数値スコア・閾値を持たない（R3.1 / R3.2 / R3.3）
  - 「何を照合し（枠の提示）・何が埋まらなかったか」を omission recap として要約し、再確認を促す（R4.1）
  - 承認された項目のみを canonical な Intent 構造へ載せる対象とし、未承認項目は Assumptions のまま破棄せず保持する。canonical への自動反映は行わず、昇格は利用者の人手コピーに委ねる（R4.2 / R4.3 / R4.4）
  - 出力は `.intent/spec-ingest/` 配下の派生物に限定し、canonical な `.intent/*.md`・アプリケーションコード・入力仕様書を一切変更しない（read-only。R5.2）。命名規約 `intent-*` に従い、外部 spec ツール・kiro-* 開発環境を変更しない（R5.6）

## Execution Steps

### Step 1: 入力（自然言語仕様書テキスト）の存在を確認する（fail-fast）
- 利用者が `/intent-from-spec` を実行したとき、まず取り込む自然言語仕様書のテキスト（ファイルパス指定または本文の貼り付け）が与えられているかを確認する。
- 仕様書テキストが与えられていない場合は、**何も書き込まず**に入力の不在を明示し、取り込む仕様書（パス指定または貼り付け）を渡すよう利用者に自然言語で求めて終了する（fail-fast。R1.3）。この時点では `.intent/spec-ingest/` 配下に一切書き込まない。
- ソースコード・実行トレース・テスト結果は意図抽出の入力に**用いない**。それらからの意図逆算は behavior-unknown モードの code→Intent が担う別経路であり、本スキルの対象外である（R1.4）。
- 物差しの正本（`intent-validate/rules/validate-checks.md`・`intent-packets/rules/decision-slots.md`）と canonical な `.intent/*.md`（あれば intent-tree / compass / mode）は後続 Step で read-only に参照する。無くても停止しない（紐づけ不能な箇所は不在を明示する）。

### Step 2: 4 つの rules に委譲して抽出・照合・仕分け・recap する
- 本スキルは独自の抽出・照合・判定・採点ロジックを持たない。各観点の正確な読み取り・転記・紐づけ規則は以下 4 つの rules に委譲する（相対パスで参照）。各 rules が指定する正確な見出し・転記先・ID 体系に従い、抽出候補をすべて Assumptions として標識し、物差しは読むだけで再実装せず、欠落・未観測は推測で埋めず明示する。
- `rules/extract-intent.md` — 仕様書テキストを読み、目的/成果/能力/不変則/制約/anti-direction/暗黙の前提の7カテゴリの意図候補を抽出する。全候補を Assumptions として標識し、各候補を転記先（intent-tree の L0–L4 Assumptions / compass の Invariants・Anti-direction・Decision Rules）が一意に決まる見出し・粒度で書き出す。技術/セキュリティ要求などの守るべき制約は取りこぼさず compass の Invariants 候補へ拾い、その行き先を Invariants に限定する（tech.md/design への反映は output に含めない＝下流委譲。R1.1 / R1.2 / R1.4 / R1.5 / R1.6 / R5.1）。
- `rules/gap-readout.md` — `validate-checks.md` の安定 kebab-case 検査 ID と `decision-slots.md` の共通コア8スロット ID を**読み取り**、入力仕様書に照らして埋まらない項目をギャップとして列挙する。各ギャップがどの物差しの沈黙か（ID 紐づけ）・どのカテゴリ/スロットの沈黙か（観測可能な根拠）を示し、確定欠陥でなく仮説として提示する。独自の検査 ID・スロット ID を新しく定義しない。spec-ingest は提案者（proposer）であり受理ゲートではないため、仕様書の沈黙からスロット該当を**推論してよいが、確定はしない**（validate と別 posture）。処理を止めず warn のみ（R2.1 / R2.2 / R2.3 / R2.4）。
- `rules/load-bearing.md` — gap-readout がスロット ID に紐づけたギャップ・意図候補について、`decision-slots.md` の**「前倒し/遅延ドア」列**を読んで写すだけで high/low を定性仕分けする。「前倒し」＝high（落ちると危険）、「遅延可」＝low。数理ソルバー・数値スコア・閾値を持たず、判別軸を新たに発明しない。スロット ID に紐づけられない項目は load-bearing 不明として不在を明示する。high を low と観測可能に区別して提示し、low も切り捨てず保持する（R3.1 / R3.2 / R3.3）。
- `rules/omission-recap.md` — 「照合した枠（何を読んだか）／埋まった箇所／埋まらなかった箇所（沈黙）／照合できなかった箇所（不在）」を一覧として要約し、「沈黙の沈黙」（AI が網羅を匂わせ人間が探索を止める不作為エラー）を避ける。gap-readout が紐づけた既存 ID をそのまま引き再定義しない。承認項目のみ canonical 昇格の対象とし、未承認は Assumptions のまま保持、昇格は利用者が承認項目を手で discover / compass の対話へ持ち込む人手コピーであることを案内する（機械ハンドオフを持たない。R4.1 / R4.2 / R4.3 / R4.4）。

### Step 3: 派生ビューを最後に `.intent/spec-ingest/` へ書き込む（全置換・派生）
- すべての抽出・照合・仕分け・recap が終わってから、**最後に** `.intent/spec-ingest/spec-ingest.md` を**全置換**で書き込む（再生成の冪等性）。canonical な `.intent/*.md`（intent-tree / compass 等）・steering（tech.md）・design・入力仕様書には一切書き込まない。
- ビュー冒頭に、本ビューが派生（derived）・再生成可能であり・正本ではなく・Git 非追跡であること、および記載された意図候補・ギャップ・load-bearing 度がすべて Assumptions（仮説）であり利用者の承認まで暫定であることを明示する（R1.2）。
- 出力は extract-intent の転記先見出しに従い、人が intent-tree の Assumptions / compass の各ブロックへ 1:1 で写せる粒度で構成する（昇格の継ぎ目を人手に保つ）。

## Output Description
- `.intent/spec-ingest/spec-ingest.md`（派生・再生成可能・Git 非追跡。正本ではなく全項目が Assumptions である旨をビュー冒頭に明示）。内容は次を含む:
  - **意図候補（抽出）**: extract-intent の output contract に従い、目的/成果/能力候補（→ intent-tree L0–L4 Assumptions）・Invariants 候補（→ compass Invariants、技術/セキュリティ制約を含む）・Anti-direction 候補（→ compass Anti-direction）・暗黙前提候補（→ intent-tree Assumptions / compass Decision Rules）を、転記先が一意に決まる見出しで提示。各候補に抽出根拠（仕様書のどの記述/沈黙からか）を併記。
  - **ギャップ（沈黙）**: gap-readout が `validate-checks.md` / `decision-slots.md` の ID に紐づけたギャップを、どのカテゴリ/スロットの沈黙かとともに仮説として列挙。
  - **load-bearing 仕分け**: high の項目を low と区別して提示（high を先頭にまとめる等）。スロットに紐づけ不能なものは load-bearing 不明として明示。
  - **omission recap**: 照合した枠／埋まった箇所／埋まらなかった箇所／照合できなかった箇所の一覧と、承認項目を利用者が discover / compass へ手で転記する昇格案内。
- 素材が無いカテゴリ・軸は「該当記述なし（沈黙）／未観測」と明示し省略する（推測で埋めない）。

## Safety & Fallback
- **書込み境界**: 書込み先は `.intent/spec-ingest/` 配下限定である。canonical な `.intent/*.md`（intent-tree / compass / mode 等）・物差しの正本（`validate-checks.md` / `decision-slots.md`）・steering（tech.md）・design・入力仕様書は read-only であり、そこへは作成・変更・削除を一切行わない（書き込みは `.intent/spec-ingest/` 配下に限る。R5.2）。
- **ギャップは仮説（warn のみ・止めない）**: ギャップ・load-bearing 度・意図候補はすべて確定した欠陥/深刻度ではなく Assumptions（仮説）である。提示している間も処理を停止せず、警告・気づきの提示に留める（drift-watch と同 stance。R2.3 / R2.4）。
- **承認ゲート・昇格は人手**: canonical への反映には利用者の明示的な承認を必須とする。承認項目のみを canonical 昇格の対象とし、未承認項目は破棄せず Assumptions のまま保持する。canonical への自動反映は行わない。昇格は利用者が承認項目を手で discover / compass の対話へ持ち込む人手コピーであり、spec-ingest は discover / compass を呼ばず、discover / compass が spec-ingest の出力を自動で読み込むこともない（機械ハンドオフを持たない＝hidden shared ownership を作らない。R4.2 / R4.3 / R4.4）。
- **物差しを再実装しない**: 検査・スロット検証を自前で実行せず、`validate-checks.md` / `decision-slots.md` の ID カタログと「前倒し/遅延ドア」列を読むだけである。独自の検査 ID・スロット ID・スコアリング・重み付けエンジンを持たない。
- **外部依存ゼロ**（INV2 / R5.3）。外部パッケージ・AST パーサ・数理ソルバーを導入せず、Node 標準と自然言語ヒューリスティクスに限定し、抽出処理を自然言語のワークフロー内で完結させる。
- **アプリケーションコードを変更しない**（R5.2）。意図計画フェーズにおいてアプリケーションコードおよび入力された仕様書を変更しない（読み取りのみ）。
- **命名・外部非変更**: 命名規約 `intent-*` に従い、外部 spec ツール・kiro-* 開発環境を変更しない（R5.6）。
- **前提不在時**: 入力仕様書テキストが無いとき、何も書き込まず不在を明示し、取り込む仕様書（パス指定または貼り付け）を渡すよう利用者に自然言語で求めて終了する（fail-fast。R1.3）。
- **部分欠落時**: 7カテゴリのうち仕様書が沈黙しているもの、物差しのカタログに紐づけ不能なギャップ、スロットに紐づけ不能で load-bearing 不明なものは、当該箇所を「該当記述なし（沈黙）／不在／不明」と明示し省略する（推測で埋めない）。
