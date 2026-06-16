# 意図候補の抽出手順（read-only・全候補は Assumptions）

`intent-from-spec` skill が、利用者の渡した自然言語仕様書（PRD・設計仕様・機能仕様・issue・ユーザーストーリーなど一般的な開発仕様書のテキスト）を読み、明示されていない意図の候補を抽出するための正本。SKILL.md は手順と報告形式のみを持ち、「何を・どのカテゴリで読み取り、どの転記先へ向けて書き出すか」は本ルールを参照する。本ルールは仕様書を**読むだけ**であり、入力仕様書・canonical な `.intent/*.md`・steering（tech.md 等）・design を一切変更しない（書き込みは `.intent/spec-ingest/` 配下のみ）。

## posture（提案者であって判定者ではない）

本ルールが行うのは LLM 判断のヒューリスティクスによる**抽出（提案）**であり、確定された意図の認定ではない。抽出した候補はすべて**仮説（Assumptions）**であり、利用者が確認・承認するまで暫定として扱う。処理は止めず、警告・気づきの提示に留める（推測された意図は人間がレビューするまで暫定として扱う、というプロダクト不変条件に一貫する）。したがって本ルールは仕様書の記述・沈黙からスロット該当を**推論してよいが、確定はしない**。

## 入力の境界（固定）

- 入力は利用者が指定した自然言語仕様書のテキストに**限定**する（パス指定または貼り付け）。
- **ソースコード・実行トレース・テスト結果を意図抽出の入力に用いない**。それらからの意図逆算は behavior-unknown モードの code→Intent が担う別経路であり、本ルールの対象外である。
- 入力が与えられていないときは抽出を行わず、入力すべき仕様書を利用者に求める（何も書かない）。

## 抽出する候補カテゴリ（7種・すべて Assumptions）

仕様書テキストを読み、次の7カテゴリの候補を抽出する。各候補には抽出根拠（仕様書のどの記述・どの沈黙から導いたか）を併記する。**抽出したすべての候補を Assumptions（推測された意図）として標識し、canonical（確定した意図）と混在させない。**

1. **目的（Purpose）** — このプロダクト/機能は何のために存在するか。
2. **成果（Desired Outcomes）** — ユーザー・事業・運用・開発体験に起こしたい状態変化。
3. **能力（Capabilities）** — 成果を支える責務・能力（機能名でなく能力として）。
4. **不変則（Invariants）** — 絶対に壊してはいけない振る舞い・API・データ・UX・運用制約。技術要求・セキュリティ要求などの「守るべき制約」を含む。
5. **制約（Constraints）** — 守るべき技術/セキュリティ/運用上の要求・前提条件。
6. **anti-direction** — 進んではいけない方向、避けるべき局所最適。
7. **暗黙の前提（Implicit Assumptions）** — 仕様書が明示せず前提にしている事項、およびそこから導かれる判断。

> 技術要求・セキュリティ要求などの守るべき制約は、明示されていても暗黙でも**取りこぼさない**。これらは不変則カテゴリへ確実に拾い上げ、下記 output contract の Invariants 候補として書き出す。

## output contract（転記先が一意に決まる見出しで書き出す）

各候補を、人が転記先へ 1:1 で写せる見出し・粒度で書き出す。見出しは下表の転記先に一意対応させる。本ルールは候補を**書き出すところまで**を責務とし、転記先（canonical な intent-tree / compass、および steering / design）への反映は行わない。承認された候補を利用者が手で discover / compass の対話へ持ち込むことで昇格する（機械ハンドオフを持たない）。

| 抽出カテゴリ | 書き出す見出し | 転記先（人手・本ルールでは反映しない） |
|---|---|---|
| 目的 | `### 目的候補（→ intent-tree L0 Assumptions）` | intent-tree `## Assumptions`（L0: Product Purpose 相当） |
| 成果 | `### 成果候補（→ intent-tree L1 Assumptions）` | intent-tree `## Assumptions`（L1: Desired Outcomes 相当） |
| 能力 | `### 能力候補（→ intent-tree L2 Assumptions）` | intent-tree `## Assumptions`（L2: Capabilities 相当） |
| 不変則 | `### Invariants 候補（→ compass Invariants）` | compass `## Invariants` |
| 制約 | `### 制約候補（→ compass Invariants）` | compass `## Invariants` |
| anti-direction | `### Anti-direction 候補（→ compass Anti-direction）` | compass `## Anti-direction` |
| 暗黙の前提 | `### 暗黙前提候補（→ intent-tree Assumptions / Decision Rules）` | intent-tree `## Assumptions`、および前提から導かれる判断は compass `## Decision Rules` 候補 |

- **目的・成果・能力**は intent-tree の対応する L0–L4 レベルの `## Assumptions` 項目へ 1:1 で写せる粒度にする（canonical な L0–L4 本体には書かない）。
- **anti-direction** は compass の `## Anti-direction` ブロックへ写せる粒度にする。
- **暗黙の前提から導かれる判断**は compass の `## Decision Rules` 候補として書き出す（候補であり確定 ADR ではない）。
- **不変則・制約（技術/セキュリティ要求を含む守るべき制約）は compass の `## Invariants` ブロック候補へ書き出す。** Invariants 候補の行き先は compass の Invariants に**限定**する。

## 下流委譲（output に含めないこと）

- Invariants 候補が steering（tech.md）や design へ反映されるのは既存の流れ（writeback / export / 人手）が担う。**本ルールの output に tech.md / design への反映は含めない。** 本ルールの責務は Invariants 候補として compass 行きの見出しで記録するところまでに留め、単一正本を保つ。
- canonical な intent-tree / compass への書き込みも行わない（昇格は承認後に人手）。

## 欠落・未観測の扱い

- 7カテゴリのうち仕様書が沈黙しているものは、推測で埋めず「該当記述なし（沈黙）」として明示する。沈黙そのものをギャップとして扱うのは gap-readout 側の責務であり、本ルールは抽出できた候補と、抽出できなかったカテゴリの不在を区別して提示する。
- すべての出力は派生（derived）・再生成可能であり正本ではない旨を明示する。canonical へは書き戻さない。
