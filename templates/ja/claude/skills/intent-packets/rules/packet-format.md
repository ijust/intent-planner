# Packet ファイル形式

packet ファイル（`.intent/packets/active/<packet_id>.md`・`.intent/packets/archive/<年>/<packet_id>.md`）の形式・ID 規則・状態遷移・index 再生成手順の**単一の正本**。packet を起案・更新・移動する skill と、packet を読む skill はこの規則に従う。

## frontmatter スキーマ（10キー固定）

各 packet ファイルは先頭に YAML frontmatter（`---` 区切り）を持つ。キーは次の **10キー固定**: `packet_id` / `name` / `state` / `created_at` / `closed_at` / `parent_intents` / `spec_refs` / `superseded_by` / `summary` / `depends_on`。

```yaml
---
packet_id: pkt-20260612-auth-session   # 不変。ファイル名と一致。packet 間参照専用
name: "認証セッション整理"             # packet 名の正本。export-log / Source Packet / deltas / slug 導出の照合キー
state: implementing                    # draft | ready | implementing | verifying | done
created_at: 2026-06-12T05:00:00Z       # 起案日時（ISO 8601）
closed_at: ""                          # done 時に記入（日付）。移行時の不明は空のまま
parent_intents: [L1-2, L2-3]           # tree への参照
spec_refs: []                          # writeback 完了時に確定記入
superseded_by: ""                      # 置換時に後継 packet_id
summary: "認証セッションの整理"        # index の1行要約の源
depends_on: []                         # 依存先 packet の packet_id リスト（既定 []）。packet 間参照専用
---
```

- `state` は `draft | ready | implementing | verifying | done` の5値（「state 値域」参照）。superseded は state ではなく `superseded_by` 記入による**別軸**（「状態遷移と置き場所」参照）。
- `depends_on` は依存先 packet の `packet_id` のリスト（既定 `[]`）。`superseded_by` と同じく **packet 間参照には `packet_id` を用いる**（`name` は使わない）。人が宣言する依存のみを保持し、ツールは依存を推論・算出しない。
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

- 形式: `pkt-<YYYYMMDD>-<スラッグ>`。日付部は**起案日**（シェルで取得する）。
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

### 同日衝突

- 同日（同じ `YYYYMMDD`）に同スラッグとなる**別 packet** を起案する場合は、`-2` から始まる連番を付与して別 ID を割り当て、packet 名 → ID の対応を利用者に告知する。黙って上書きしない。
- `packet_id` とファイル名（`<packet_id>.md`）は**不変**（改名・state 変更・移動でも変えない）。

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
- `## Safety / Invariants` — 守るべき制約。**packet 固有 invariant の正本**（compass には書かない。compass にはプロジェクト普遍の invariant のみを置く）。
- `## Validation` — どう検証するか（**計画**）。テスト、手動確認、ログ確認、型検査など。
- `## Evidence` — 何を検証したか（**結果**）。`Validation`（計画）の直後・`Rollback` の前に置く。各エントリに「検証した結果・実施日・対応する検査軸 ID（`validate-checks.md` の安定 kebab-case ID）・出所（intent-validate / drift-watch / 人確認）」を含められる。
- `## Rollback` — 失敗時にどう戻せるか。
- `## cc-sdd Mapping` — この packet を cc-sdd の requirements / design / tasks にどう変換するか。

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
