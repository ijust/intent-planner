# 検査カタログ: intent-validate

`intent-validate` skill が適用する検査の正本。SKILL.md は手順と報告形式のみを持ち、検査の定義はこのファイルを参照する。検査を追加するときはこの表に行を足すだけでよい（表が正）。各検査の ID は検査の安定識別子で、報告の各指摘に深刻度とともに併記される（ID の一覧・個数もこの表が正）。

## 深刻度の3分類

| 深刻度 | 定義 |
|--------|------|
| 要修正 | 着工前に解消すべき矛盾・整合性破壊。このまま export / 実装へ進むと architectural drift の原因になる |
| 推奨 | 品質リスク。直ちに着工を止めるほどではないが、解消すると成果物の判断基準としての信頼性が上がる |
| 情報 | 注意喚起。対応は任意だが、把握しておくべき状態 |

### 降格規則

- 欠落項目に対応する理由付きの意図的な見送り記録（Deferred または Open Questions）がある場合、当該項目の深刻度を「情報」に下げて報告する。

## 検査カタログ

| ID | 区分 | 検査 | 実施条件 | 深刻度の目安 |
|----|------|------|----------|--------------|
| invariant-conflict | 矛盾 | packet の Scope/Expected Behavior が compass Invariants と衝突 | 常時 | 要修正 |
| anti-direction-violation | 矛盾 | packet の方向が compass Anti-direction に該当 | 常時 | 要修正 |
| l3-intent-mismatch | 矛盾 | intent-tree の L3 意図と packet 内容の不一致（L3 の明示記述と直接矛盾 = 要修正、解釈の余地がある乖離 = 推奨） | 常時 | 要修正/推奨 |
| goal-without-packet | カバレッジ | tree の L1–L3 ゴールでどの packet（L4 含む）にも対応しないもの | 常時 | 推奨 |
| orphan-packet | カバレッジ | Parent Intent が tree のどの節にも遡れない孤立 packet | 常時 | 要修正 |
| stale-questions | カバレッジ | tree/compass/packets の未解決 Question の滞留 | 常時 | 情報 |
| stale-assumptions | カバレッジ | intent-tree の Assumptions に canonical への昇格も棄却もされないまま残る項目 | 常時 | 情報 |
| dependency-cycle | 整合 | `depends_on` に循環依存 A→…→A がある | 常時 | 要修正 |
| dependency-broken-ref | 整合 | `depends_on` が存在しない packet_id を参照している | 常時 | 要修正 |
| invariant-uninherited | 整合 | compass 普遍 invariant が packet `## Safety / Invariants` に継がれていない（衝突でなく沈黙の欠落） | 常時（compass Invariants 記入 かつ active packet あり） | 推奨 |
| invariant-stale-vs-compass | 整合 | compass の節更新日（Invariants 節 / Decision Rules 節）が packet `updated_at` より新しい（追随漏れ候補） | 常時（compass 節更新日・packet 更新日あり） | 推奨 |
| decision-rule-mismatch | 整合 | packet `## Decisions` が compass Decision Rules に反する | 常時（compass Decision Rules 記入 かつ packet に `## Decisions` あり） | 要修正/推奨 |
| decision-rule-code-alignment | 整合 | Decision Rule の主文/Context が名指すコードモジュール（ファイル名・モジュール名）を Grep で読み、Rule 主文と実装の意味的乖離を AI の限定的意味照合で検出する。突合面＝コード実装の意味（突合面＝packet スロット値の `decision-rule-mismatch` と分離）。出力に「AI による意味照合の推定」ラベルを付し断定しない一方向報告 | 常時（Decision Rule がコードモジュールを名指す かつ 名指し先が存在する） | 推奨 |
| packet-scope-overlap | 境界 | active/ 配下の packet ファイル間の Scope 重複・責務衝突（archive/ は読まない） | 常時 | 要修正 |
| decision-slot-empty | 完全性の床 | packet の `## Decisions` 節に播かれた意思決定スロット（④）のうち、値が空（未記入）のもの。理由付きの `未定` は降格規則により情報へ降格 | `## Decisions` 節にスロットが播かれた packet | 推奨 |
| decision-slot-unsown | 完全性の床 | `## Decisions` 節は存在するが、共通コアスロット（`decision-slots.md` の8 ID）が1つも播かれていない | `## Decisions` 節を持つ packet（節自体が無い旧 packet は未検証対象としてスキップ） | 推奨 |
| export-draft-mismatch | 境界 | 現行 export 下書き（export-log 最新行の packet のディレクトリ）と対象 packet ファイル（active/ 配下）の整合（Invariants 転記の不一致・packet 定義との乖離など） | 常時 | 推奨 |
| requirements-smell | 品質 | 要求記述に曖昧語・主観語・比較級・弱い語・未定義代名詞が残る（例: 「適切に」「高速」「より良い」「など」「できる限り」「それ」の指示先不明）。検出して引用し利用者の判断に委ねる（言い換えを正本に書き戻さない） | 常時 | 推奨 |
| ambiguous-deferred-phrasing | 品質 | packet の `## Decisions` 節で Human-fixed / Agent-discretion の区分の外にあり、かつ Revisit when 併記の無い未確定動詞（想定 / 流用 / 予定 / TBD / 暫定 等）が確定の文体に紛れている。検出して引用し利用者の判断に委ねる（言い換えを正本に書き戻さない） | 常時（packet に `## Decisions` 節あり） | 情報 |
| trace-downstream-missing | カバレッジ | tree の L1–L3 意図に対応する packet は在るのに、その packet に下流リンク（`verified-by`／検証）が無く検証へ辿れない（下向きカバレッジの検証側）。packet 自体の欠落は `goal-without-packet` が担うので重複させない | 常時 | 推奨 |
| trace-pre-rs-missing | カバレッジ | packet の frontmatter に上流リンク `parent_intents` キーが無い／空（意図→要求 pre-RS の切断点）。`parent_intents` は在るが tree のどの節にも遡れない孤立は `orphan-packet` が担うので重複させない | 常時 | 推奨 |
| poc-experiment-missing | 規範 | 仮説・反証条件・GO/NO-GO のいずれかが「PoC 実験定義」に未記録 | designer-questions=on かつ purpose=poc | 要修正 |
| l1-metric-missing | 規範 | L1 項目に `計測基準:` 行が無い | designer-questions=on | 推奨 |
| walking-skeleton-missing | 規範 | plan.md の「Walking Skeleton」節が未記入（plan.md が記入済みの場合） | designer-questions=on | 推奨 |
| screen-sketch-missing | 規範 | 「画面ラフ参照」セクションが未記入（パス・リンク・「対象外」・理由付き「無し」のいずれも無い） | designer-questions=on | 推奨 |
| designer-questions-unrecorded | 規範 | designer-questions が未記録（区分「規範」の検査をスキップし本行のみ告知） | designer-questions 未記録 | 情報 |
| purpose-unrecorded | 規範 | purpose が未記録（仮説・反証条件・GO/NO-GO の検査をスキップし本行のみ告知） | designer-questions=on かつ purpose 未記録 | 情報 |
| coinage-suspect | 品質 | 正規語彙のどこにも無い語＝造語の疑いを read-only で名指しする；判定ロジックと正規語彙の母集合は add スライスで確定する | skeleton | info |

- 実施条件「常時」は、未検証対象の原則（対象成果物が未作成・未記入なら当該検査をスキップ）を上書きしない。
- 実施条件の designer-questions / purpose は mode.md に記録された値を指す。実施条件を満たさない検査は実施しない。designer-questions=off と記録されている場合、区分「規範」の検査はすべて実施しない。読み手は designer-questions を先に判定し、on と記録されていない限り purpose の値を参照しない。

## 完全性の床検査の注記（推論しない・宣言ベース）

- `decision-slot-empty` / `decision-slot-unsown` は「完全性の床」（切り捨て線）を担う。④ 制約下の意思決定（整合性・冪等性・エラー意味論・認可 等）が空のまま export/実装へ進むのを防ぐ。スロットの正本は `intent-packets/rules/decision-slots.md`（区分・発火条件・値域はそちらが正）。
- **該当性を packet 内容から推論しない**: これらの検査は `## Decisions` 節に**実際に播かれた**スロットのみを対象とする。「この packet は書き込みを伴うはずだからスロットが要る」といった推論的判断はしない（どのスロットを播くかは discover の elicitation で人が確認する責務。`depends_on` を推論しないのと同じ規律）。
- `## Decisions` 節自体が無い旧 packet は未検証対象としてスキップする（即時の一括移行を強制しない。次回の更新フローでスロットを遅延補完する）。
- 理由付きの `未定` は `decision-slot-empty` について降格規則により「情報」へ降格する（意図的な見送りとしての遅延は許容する。完全性の床は「空欄の禁止」であって「全項目の即時確定の強制」ではない）。

## 依存健全性検査の注記（read-only と参照先の解決範囲）

- `dependency-cycle` / `dependency-broken-ref` は **read-only** で packet 正本（frontmatter 等）を一切変更しない。
- `dependency-broken-ref` の参照先 packet_id の存在確認は **active+archive の packet_id 全集合**に対して行う（archive 済みの packet_id も「存在する」とみなす）。

## smells / トレース検査の注記（read-only・最小十分・書き戻さない）

- `requirements-smell` は曖昧語・主観語・比較級・弱い語・未定義代名詞を**検出して引用するだけ**で、言い換え案を正本に書き戻さない。深刻度は「推奨」（着工を止めるほどではないが解消すると判断基準としての信頼性が上がる）。
- トレース検査（`trace-downstream-missing` / `trace-pre-rs-missing`）は **read-only** で、導出したリンクや欠落の補完を正本に書き戻さない（`depends_on` を推論・自動算出しない既存規律に乗る）。
- トレースは**最小十分**に留める: 全 artifact 間を総当たりで結ばず、「なぜ存在するか（上流 `parent_intents`）・どこで実現したか（`realized-by`）・どう検証したか（`verified-by`）」が辿れる欠落のみを指摘する。下流リンクは任意（記入済みの場合に検証へ辿れるかを見る）。
- 既存カバレッジ検査との境界: packet 自体の欠落は `goal-without-packet`、`parent_intents` は在るが tree に遡れない孤立は `orphan-packet` が担う。`trace-downstream-missing` は packet が在るのに検証へ辿れない側、`trace-pre-rs-missing` は `parent_intents` キー自体が無い／空の切断点に焦点を絞り、重複検査を作らない。

## 未確定動詞検査の注記（read-only・降格規則を厳格適用・書き戻さない）

- `ambiguous-deferred-phrasing` は packet `## Decisions` 節で **Human-fixed / Agent-discretion の区分の外**にあり、かつ **Revisit when の併記が無い**未確定動詞（確定の文体に紛れた仮置き）を検出して引用するだけで、言い換え案・確定案を正本に書き戻さない（`requirements-smell` と同じ read-only パターン）。深刻度は **「情報」**（誤検知が高いため要修正へ昇格させない）。
- **未確定動詞の確定語彙リスト**（このリストに限定し、`requirements-smell` の語彙〔適切に / 高速 / より良い / など / できる限り / 「それ」等〕とは重複させない）:
  - 「想定」「流用」「予定」「TBD」「暫定」。
- **名詞的慣用の誤検知除外（必須）**: 上記語彙でも、未確定の意図を示さない名詞的・副詞的慣用は検出しない。具体的には「想定内」「想定通り」のような確定済みの含意で使われる語形を除外し、「〜する想定」「〜を流用（する）」のように**未確定の動作・意図を示す動詞的用法に限定**する。判定に迷う場合は挙げず、利用者の判断を奪わない。
- **降格規則の厳格適用**: 検出箇所が Deferred / Open Questions / 理由付き未定スロット（理由＋Revisit when 併記）として既に保留記録されている場合、降格規則により当該検出を抑制する（既に構造的な保留として記録された未確定は再掲しない）。既定でも「情報」深刻度であり、要修正・推奨へは昇格させない。
- 既存軸との棲み分け: 区分外・Revisit when 無しの未確定動詞（文体マッチ）を見るのが本軸で、空スロットそのものは `decision-slot-empty`、compass Decision Rules との矛盾は `decision-rule-mismatch` が担う。重複検査を作らない。

## 決定↔コード乖離検査の注記（read-only 検査層で唯一の推論例外・境界条件付き）

- `decision-rule-code-alignment` は、Decision Rule の**主文／Context がコードモジュール（ファイル名・モジュール名）を名指す**ときに限り、そのモジュールを Grep で読み、Rule 主文と実装の**意味的乖離を AI の限定的意味照合で検出**する。
- **これは read-only 検査層で唯一の推論例外**である。他のすべての検査軸（既存3軸〔`invariant-uninherited` / `invariant-stale-vs-compass` / `decision-rule-mismatch`〕・`ambiguous-deferred-phrasing`・status / improve 系を含む）は推論しない。**この軸だけが例外であり、例外を他軸へ波及させない**（他軸は記述の有無・直接矛盾の有無を読むに留める従来規律のまま）。
- **境界条件（誤検知の再現性低下の代償補償・必須）**:
  - 出力に必ず**「AI による意味照合の推定」**という明示ラベルを付し、断定しない。
  - severity は**推奨**止まり。要修正へは昇格させない。
  - 利用者が一次根拠にせず**人間確認を促す一方向報告**に徹する（canonical・コードのいずれも自動修正しない）。
  - **名指し起点限定**: Decision Rule がモジュールを名指さない・抽象的 Rule・乖離が観測できない場合は挙げない（「どのモジュールを見るか」は Rule の名指しが起点であり、意味照合は「見るべき対象が定まった後」に限る）。判定に迷う場合は挙げず、利用者の判断を奪わない。
- **突合面の分離（必須・二重検出回避）**: 本軸の突合面は**コード実装の意味**である。突合面が packet `## Decisions` スロット値のテキスト突合（推論なし）である既存 `decision-rule-mismatch` とは突合面が異なるため、同一 Decision Rule で両軸が該当しても二重検出にはならない（前者＝コード実装と Rule、本軸＝packet スロット値と Rule）。
- **tool 不変（必須）**: intent-validate の allowed-tools は `Read, Glob, Grep` のまま（Write / Bash を増やさない）。コードは Grep で読むのみで一切変更しない（INV6）。AI 意味照合は skill 本文の判断であって tool ではない。

## L3 不一致の振り分け基準

- intent-tree の L3 の**明示記述と直接矛盾**する packet 内容 = **要修正**
- **解釈の余地がある乖離**（明示記述は無いが方向性がずれて見える等）= **推奨**
- 迷ったら推奨に倒し、根拠の引用を添えて利用者の判断に委ねる

## compass 適合検査の注記（継承・stale・ADR 乖離の突合）

- 棲み分け:
  - `invariant-uninherited` ≠ `invariant-conflict`: 後者は「衝突＝矛盾」の検出、本軸は「沈黙の欠落」の検出。同一 packet で両方該当し得るが検出観点が異なる。
  - `decision-rule-mismatch` ≠ `l3-intent-mismatch`: 後者は intent-tree L3 との突合、本軸は compass Decision Rules との突合。
- 振り分け基準（`decision-rule-mismatch`。`l3-intent-mismatch` の雛形を流用）: Decision Rules の明示記述と直接矛盾 = 要修正／解釈の余地がある乖離 = 推奨／迷ったら推奨に倒し、根拠の引用を添えて人の判断に委ねる。
- **突合面の限定（必須）**: ADR（Context/Decision/Why/Alternatives/Consequences/Revisit when の6欄長文）と packet `## Decisions`（スロット値域）は構造が非対称なので、突合面を **「Decision Rules エントリの `Decision`（採る選択肢の主文）」 対 「packet `## Decisions` の各スロットの確定値」** に限定する。Why/Alternatives/Consequences 等の周辺欄は根拠の引用元に使うが、矛盾判定の主軸にはしない。
  - 突合例: Decision Rules の `Decision`＝「集計ロジックはドメイン層に置く」、packet `## Decisions` の該当スロット確定値＝「UI で集計する」→ 直接矛盾 = 要修正。`Decision`＝「rollback 可能な slice を優先」で packet が一括置換寄りだが明示の否定はない → 解釈余地 = 推奨。
- **軸の役割分離（必須）**: 時間軸（更新日比較）を持つのは `invariant-stale-vs-compass` のみ。`invariant-uninherited`（継承の有無）と `decision-rule-mismatch`（ADR との矛盾の有無）は「今の状態」を見る軸で、compass の節更新日とは連動しない。これら2軸は compass の現行 invariant / Decision Rules を毎回読んで個別指摘する（「どの invariant がどの packet で欠けているか」を出すのが本軸の価値）。
- **出力粒度**: 時間軸を持つ `invariant-stale-vs-compass` のみ既定で **件数サマリ1行**（例: `Invariants 節更新後に未追随の packet が N 件 / Decision Rules 節更新後に M 件`）に留め、個別 packet 列挙は利用者要求時のみ展開する（狼少年化の回避）。要修正と断定せず推奨で提示する。stale 比較は compass 側の該当節更新日と packet `updated_at` の**両方が実打刻（`—` でない）されたペアのみ**を対象とする。`invariant-uninherited` / `decision-rule-mismatch` は個別指摘が既定。
- 推論禁止（必須）: packet 内容から該当性を推論しない（`decision-slot` 検査と同じ規律）。意味照合は記述の有無・直接矛盾の有無を読むに留める。
- 後方互換: compass `Updated (...)` が `—`／不在 / packet `updated_at` 不在 / `## Decisions` 不在 / Invariants 未記入 は当該検査を**未検証対象として ID 付きで明示しスキップ**し、stale を断定しない。

## 境界検査の注記（export 下書きの対象選定）

- export 下書き（`.intent/cc-sdd/<スラッグ>/*.md`）は **packet 毎に併存**する。export 下書き整合の境界検査の対象は `.intent/export-log.md` 最新行の packet のディレクトリに限る。過去 packet の下書きは設計上併存するため、その存在自体は違反として扱わない。

## 未検証対象の扱い（検証可能な範囲の原則）

1. 検証対象の成果物が未作成または未記入の場合、その成果物を必要とする検査はスキップする。
2. 残りの検査は検証可能な範囲で実施する（全体を中断しない）。
3. 報告には「未検証対象」を設け、スキップした検査と理由（どのファイルが未作成 / 未記入か）を明示する。
4. 例: `.intent/packets/` が無い（または active/ が空）→ 矛盾・カバレッジ・境界の packet 系検査をスキップし、tree/compass 単体で可能な検査（未解決 Question の滞留 等）のみ実施する。
