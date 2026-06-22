# Packet ファイル形式

packet ファイル（`.intent/packets/active/<packet_id>.md`・`.intent/packets/archive/<年>/<packet_id>.md`）の形式・ID 規則・状態遷移・index 再生成手順の**単一の正本**。packet を起案・更新・移動する skill と、packet を読む skill はこの規則に従う。

## frontmatter スキーマ（12キー固定）

各 packet ファイルは先頭に YAML frontmatter（`---` 区切り）を持つ。キーは次の **12キー固定**: `packet_id` / `name` / `state` / `created_at` / `updated_at` / `closed_at` / `parent_intents` / `spec_refs` / `superseded_by` / `summary` / `depends_on` / `mode`。

```yaml
---
packet_id: pkt-20260612-auth-session-k3p9   # 不変。ファイル名と一致。末尾はセッション固有 rand。packet 間参照専用
name: "認証セッション整理"             # packet 名の正本。export-log / Source Packet / deltas / slug 導出の照合キー
state: implementing                    # draft | ready | implementing | verifying | done
created_at: 2026-06-12T05:00:00Z       # 起案日時（ISO 8601）
updated_at: 2026-06-12T05:00:00Z       # 最終更新時点（ISO 8601）。新規作成時は created_at と同値、内容更新時はその時点
closed_at: ""                          # done 時に記入（日付）。移行時の不明は空のまま
parent_intents: [L1-2, L2-3]           # tree への参照
spec_refs: []                          # writeback 完了時に確定記入
superseded_by: ""                      # 置換時に後継 packet_id
summary: "認証セッションの整理"        # index の1行要約の源
depends_on: []                         # 依存先 packet の packet_id リスト（既定 []）。packet 間参照専用
mode: standard                         # packet 起草時に確定していたモード（起草時固定・遡及更新しない）
---
```

- `state` は `draft | ready | implementing | verifying | done` の5値（「state 値域」参照）。superseded は state ではなく `superseded_by` 記入による**別軸**（「状態遷移と置き場所」参照）。
- `depends_on` は依存先 packet の `packet_id` のリスト（既定 `[]`）。`superseded_by` と同じく **packet 間参照には `packet_id` を用いる**（`name` は使わない）。人が宣言する依存のみを保持し、ツールは依存を推論・算出しない。
- **`mode` は packet が起草された時点で確定していたモードの出自記録**。値はモード名（例: `standard` / `deep` / `quick`）。起草時に CONTRACT.md の fallback 規約（mode.local.md → mode.md → standard）で解決した値を刻む。**起草時固定**（DR13）—起草後にモードがローカルで変わっても既存 packet の `mode` を遡及更新しない。モード不在・未確定の場合は既定値 `standard` を記録し、停止しない。**後方互換**: `mode` を持たない既存 packet は欠落として扱い、停止せず続行する（読むたびの自動補完をしない）。tree / compass / plan には刻まない（DR11）。
- **`updated_at` は packet の最終更新時点（ISO 8601）**。書き手スキル（intent-packets / writeback 等）が当該 packet を変更した時点で打刻する正本フィールド。打刻規律は次の通り:
  - **新規作成時は `created_at` と同値**で初期化する（`—` や空にはしない）。
  - **内容を更新した時点**を `updated_at` に記録する（その時点の現在時刻を ISO 8601 で打つ）。
  - **内容変更を伴わない再実行では打刻しない（冪等）**。無変更で日時だけ進めない。
  - 打刻責務は書くフェーズ（intent-packets / writeback 等）が負い、read-only 検証層（intent-validate）は `updated_at` を**読むのみ**で書き換えない。
  - **後方互換**: `updated_at` を持たない既存 packet は欠落として扱い、即時一括移行を強制しない。読み手は不在を「未記入／未観測」として明示し推測で埋めない（`depends_on` 不在＝「依存なし」と同型の遅延補完）。次に当該 packet を更新する書き手フローが差分追記する（非破壊）。
- **未確定のキーは空値で保持する**（キー自体を省略しない — index 再生成と検査の決定性のため）。`depends_on` は依存が無くても `[]` を保持し、キーを省略しない。
- **summary 保守規範**: packet 本文を更新した skill は frontmatter の `summary` も追従させる。

## name と packet_id の使い分け

- **`name` は packet 名の正本（照合キー）**。export-log の `| packet |` 列・cc-sdd 下書きの `## Source Packet`・deltas の Delta 見出し・cc-sdd スラッグ導出はすべて `name` を用いる。これらに `packet_id` を用いてはならない。
- **`packet_id` はファイル名（`<packet_id>.md`）と `superseded_by` 等の packet 間参照専用**。

### name の可変性

- 初回 export（export-log に行が載った時点）以降、`name` は**不変**。改名は supersede（後継 packet の起案 + 旧 packet の置換）として扱う。
- export 前の改名は差分更新として許可する（その場合も `packet_id`・ファイル名は変えない）。

### 名前 → ファイルの解決手順

1. `index.md` の `name` 列、または `active/` 配下の frontmatter の `name` を照合してファイルを特定する。
2. `active/` に無ければ `archive/` を**明示的に**参照する（「通常 archive/ は読まない」原則の明示例外）。

## ID 規則

- 形式: `pkt-<YYYYMMDD>-<スラッグ>-<rand>`。日付部は**起案日**（シェルで取得する）。末尾の `<rand>` は**セッション固有のランダムな短いトークン**（後述）で、並行セッションでも ID が衝突しないことを保証する不変の識別子の一部。
- `<rand>` は半角英小文字と数字（`[a-z0-9]`）4文字で、起案時にシェルで生成する（例: `LC_ALL=C tr -dc 'a-z0-9' < /dev/urandom | head -c 4`）。生成できない場合は推測値を埋めず、その旨を利用者に告知して停止する（日時を取得できない場合と同じ規律）。
- スラッグは `name` から次節の規則で導出する。次節は map-cc-sdd（cc-sdd export のスラッグ規則）と**同文の複製**であり、変更する場合は両方を同時に改訂する（cc-sdd 出力ディレクトリ名も同じ `name` から同じ規則で導出されるため、両者は一致する）。

### スラッグ規則（決定的）

packet 名からディレクトリ名（スラッグ）を以下の順で**決定的に**導出する。同じ packet 名は常に同じスラッグになる。

1. NFC 正規化する。
2. 前後の空白を trim する。
3. ASCII 大文字を小文字にする。
4. 空白とパスに危険な文字（`/ \ : * ? " < > |`）を `-` に置換する。
5. 連続する `-` を1つに圧縮する。
6. 先頭・末尾の `-` を除去する。

- 非 ASCII 文字（日本語等）はそのまま保持する。
- 結果が空文字列になる場合はスラッグを `unnamed-packet` とし、その旨を利用者に告知する。

### 衝突回避（並行セッション対応）

- 末尾の `<rand>` により、同日・同スラッグの**別 packet** を起案しても ID は衝突しない。**並行（並列）セッション**が互いの未保存 packet を読めない状況でも、各セッションが独立に生成した `<rand>` が異なるため別 ID になる。連番（`-2`, `-3`, …）で既存を読んでから採番する旧方式は、並行セッションでは互いを見られず衝突を防げないため用いない。
- 起案時に万一、生成した ID が既存ファイル（`active/` または `archive/`）と一致した場合は、黙って上書きせず `<rand>` を再生成して別 ID を割り当て、packet 名 → ID の対応を利用者に告知する。
- `packet_id` とファイル名（`<packet_id>.md`）は**不変**（改名・state 変更・移動でも変えない）。`<rand>` も ID の一部として一度確定したら変えない。
- **後方互換**: `<rand>` を持たない旧形式の ID（`pkt-<YYYYMMDD>-<スラッグ>`）も有効。即時一括移行は強制せず、既存 packet の ID は据え置く（改名は supersede 扱い）。

## state 値域

`state` は進行段階を区別する5値。各値は相互排他で、packet はちょうど1つの段階を取る。state は**宣言的な状態記録**であり、遷移規則・ガード・自動進行を持つ管理機構（state machine）を伴わない。

| state | 意味 | 置き場所 | Evidence | depends_on の扱い |
|-------|------|----------|----------|-------------------|
| `draft` | 起案中・未確定 | `active/` | 不要 | 任意 |
| `ready` | 着手可（依存解決済み・実装待ち） | `active/` | 不要 | 依存先が全て `done` であることが宣言の前提 |
| `implementing` | 実装中 | `active/` | 進行中の暫定記録可 | — |
| `verifying` | 実装済み・検証待ち（Evidence 未確定） | `active/` | 収集中（未確定明示） | — |
| `done` | 証拠取得済み・完了 | `archive/<年>/` | **確定済みであることが前提** | — |

- 終端は `done` のみ。`state=done` の確定は `## Evidence` 節に確定した検証結果があることを前提条件とする（「人/検査が確認 → 記入 → done」の宣言的順序であり、自動遷移ではない）。
- 進行段階の変更は宣言的に記入し、その確定は人または検査ゲートに基づく（AI の自己申告のみで確定しない）。

### 後方互換移行（旧 `draft | active | done` から）

| 旧 state | 新 state | 根拠 |
|----------|----------|------|
| `draft` | `draft` | 同一 |
| `active` | `implementing` | 着手済み packet の安全側既定（最も情報を失わない。後で `ready`/`verifying` へ宣言し直せる） |
| `done` | `done` | 同一 |

- `active → implementing` を既定にする理由: 旧 `active` は「着手済み or 着手可」の両方を含んでいたため、安全側（進行中とみなす）に倒し「終わっていないのに done 扱い」を防ぐ。
- 移行は**差分更新案として提示**し、利用者確認のうえ記入する。既存 packet を破壊しない・削除しない（**移動のみ**）。
- **`depends_on`/`## Evidence` の欠落の扱い**: 既存 packet に `depends_on` キーや `## Evidence` 節が無くても、即時一括移行を強制しない。読み手側は `depends_on` 不在を「依存なし（空集合と等価）」、`Evidence` 不在を「未記入」として扱う（推測で埋めない）。packet を次に更新する起案/更新フローが `depends_on: []` を差分追記する（非破壊の遅延補完）。

## 状態遷移と置き場所

- superseded は state ではなく `superseded_by` に後継 `packet_id` を記入する**別軸**。
- 置き場所の対応:
  - `draft | ready | implementing | verifying` → `active/`
  - `done` または `superseded_by` 記入済み → `archive/<年>/`
- state の記入と移動は一連の操作として行う（done のまま `active/` に滞留させない。滞留は status の整合検査の対象）。
- **削除禁止**: packet ファイルは移動のみで、削除しない。

## 本文セクション構成

frontmatter の直後に `# <name>` 見出しを置き（推奨）、以下の節を続ける（現行の packet 定義節の構成を継承）。

- `## Parent Intent` — この packet が支える L0 / L1 / L2 / L3。
- `## Why` — なぜこの packet が必要か。
- `## Scope` — 含むこと。
- `## Non-scope` — 含まないこと。
- `## Expected Behavior` — 完了後に観測できる振る舞い。
- `## Decisions` — 制約下の意思決定スロット（completeness schema の④中心スロット）。**`## Expected Behavior` の後・`## Safety / Invariants` の前**に置く。**スロットの値域（`確定値 | 未決定（理由付き）| 該当なし`）・4ステータス・発火条件・スロット ID の正本は `decision-slots.md`**（このカタログを単一参照として読む。本節はその投影）。**必須節**（下記の任意節と異なり、共通コアスロットを閉じる入れ物として常に保持する。スロット未播種なら空節で保持し、推測で埋めない）。
- `## Safety / Invariants` — 守るべき制約。**packet 固有 invariant の正本**（compass には書かない。compass にはプロジェクト普遍の invariant のみを置く）。
- `## Validation` — どう検証するか（**計画**）。テスト、手動確認、ログ確認、型検査など。
- `## Evidence` — 何を検証したか（**結果**）。`Validation`（計画）の直後・`Rollback` の前に置く。各エントリに「検証した結果・実施日・対応する検査軸 ID（`validate-checks.md` の安定 kebab-case ID）・出所（intent-validate / drift-watch / 人確認）」を含められる。
- `## Rollback` — 失敗時にどう戻せるか。
- `## Out of scope` — **任意（推奨）**。やらないこと（non-goals）を明示し過剰実装を防ぐ。未記入なら節を省略してよい。
- `## Verification protocol` — **任意（推奨）**。先に書くテスト・守るべき既存テスト・追加すべき失敗モードのテストを保持する。下流トレースリンク（realized-by / verified-by）もここに任意で保持できる。未記入なら節を省略してよい。
- `## cc-sdd Mapping` — この packet を cc-sdd の requirements / design / tasks にどう変換するか。

### `## Decisions`（人間固定とエージェント裁量の分離）

`## Decisions` は制約下の意思決定スロットを保持する節で、内部に次の2区分を持つ（区別して保持する）。

- **人間が固定した決定（Human-fixed / 確定値）**: 人が前倒しで固定した可視の設計規則（visible design rules）。値域 `確定値` のスロット。エージェントはこの規則を覆さない。
- **エージェント裁量ゾーン（Agent-discretion / 未定遅延）**: 規則の内側で局所探索をエージェントに委ねる領域。値域 `未決定（理由付き）` のスロット（`未定（遅延中）`）が対応づく。`未定` には理由・downstream への注意書き・再訪条件（Revisit when）を併記する。

```markdown
## Decisions
### Human-fixed（確定値・visible rules）
- `decision-authz` 回答済み: 実行できるアクターは管理者ロールのみ
### Agent-discretion（未定遅延・再訪条件付き）
- `decision-idempotency` 未定: リトライ方式は実装裁量。Revisit when: 外部公開 API 化のとき
```

- スロットの値域・ステータス・発火条件・スロット ID は `decision-slots.md` が正本。本節はその投影であり、値域や ID をここで再定義しない。
- 閉じ先が既存節（`## Validation` / `## Expected Behavior` 等）のスロットは、本節に値を二重に書かず「既存節で閉じている」旨の参照のみを置く（重複定義しない）。
- スロット未播種なら**空節で保持**し（推測で埋めない）、節自体は省略しない。

### 節の格付け（必須 / 任意）

- **必須**: `## Decisions`（共通コアスロットを閉じる入れ物）のみ。スロット未播種でも空節として保持する。
- **任意（推奨）**: `## Out of scope` / `## Verification protocol` と下流トレースリンク（realized-by / verified-by）。未記入なら**節を省略してよい**（packet の肥大化と decision fatigue を避ける軽量思想を維持する）。
- frontmatter は **12キー固定**のまま変更しない。本節群の追加は**本文節のみ**であり、frontmatter を増やさない（トレースリンクも本文に持ち、frontmatter キーを足さない）。

### `## Validation`（計画）と `## Evidence`（結果）の区別

`Validation` は「どう検証するつもりか（計画）」、`Evidence` は「実際に検証した結果（実態）」であり、両者を**混在させない**。

```markdown
## Evidence
- 2026-06-15 — `unit: auth-session 失効テスト` green / `invariant-conflict` 該当なし
  - 検査軸: invariant-conflict, l3-intent-mismatch
  - 出所: intent-validate（人確認: ◯◯）
```

- 各エントリ: 検証した結果・実施日・検査軸 ID（kebab-case）・出所を含められる。
- 結果が無ければ**空節で保持**し、未記入を推測で埋めない。
- Evidence は AI の自己申告ではなく、検査結果（intent-validate / drift-watch）または人の確認に基づき、出所を辿れる形で記録する。
- **`state=done` は Evidence に確定済みの検証結果があることを前提とする**（done だが Evidence 空は矛盾状態）。

### 検証語彙の非コード degrade（任意・正本）

`## Validation` / `## Rollback` の検証語彙はコード成果物を前提に書かれている。非コード成果物（文書・業務・研究）を packets で詰めるときは、次の読み替えを適用してよい（**任意の degrade**であり、ここが読み替え語彙の**正本**＝非コードモード側はこの定義を参照する）。

- `testable` → 「レビュー観点／受容基準で判定可能」
- `rollback` → 「版管理／差し戻し」
- `behavior-preserving` → 「既存成果物の意味／合意を壊さない」
- ⑥単体完結（終端判定）の「利用者／呼び出し側」 → 「読み手／受け手」（非コード成果物では、packet の完了形が読み手/受け手から見て中途半端でない一貫した区切りになっていることを指す）

- この degrade は**任意**であり、コード前提の語彙を必須にしない（コード成果物では従来語彙のまま使う）。
- degrade を適用しても **packets 段はスキップしない**。非コード作業も packets を経由し、`## Decisions` の決定スロット播種（C3）を保つ（語彙を読み替えるだけで、packets を迂回しない）。

## index.md 再生成手順

`.intent/packets/index.md` は生成物であり手編集しない。canonical（packets/ 配下）を変更した skill は、処理完了時に以下の手順で再生成する。

1. `active/` 配下の全 packet ファイルの **frontmatter のみ**を読む（本文を読まない — 決定的）。
2. `| packet_id | name | state | summary |` のテーブルを `packet_id` **昇順**で構成する（`depends_on` は index 列に出さない — 決定性とテーブル肥大回避。依存は read-only 側が `active/` の frontmatter を直接読む）。
3. `active/` が空（または不在）の場合は、ヘッダのみの空テーブルが正規形。

## read-only 側が読む契約

intent-status / intent-overview などの read-only 側スキルは、本正本が定める次のインターフェースを**読むのみ**で、packet 正本を変更しない。

- **`state`（5値域）**: `draft | ready | implementing | verifying | done`。進捗の段階判定に用いる。
- **`depends_on`（packet_id のリスト）**: ブロック状態は「`depends_on` の中に `done` でない packet がある＝ブロック中」として read-only で導出する。導出結果は packet に書き戻さない。依存に基づく次工程の自動起動・順序自動決定はしない。
- **`## Evidence` 節**: 検証結果・実施日・検査軸 ID・出所。進捗の「証拠の確定度」の素材。

**後方互換の読み取り規律（推測で埋めない）**:
- `depends_on` 不在 → 「依存なし（空集合）」として読む。
- `## Evidence` 不在/空 → 「未記入／未観測」として明示し、補完しない。
- 旧 `state: active` → 「進行中（`implementing` 相当）」として読む。
- 新フィールド・新節が未記入または不在のときは、当該箇所を「未記入／未観測」と明示する。
