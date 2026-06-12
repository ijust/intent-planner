# Packet ファイル形式

packet ファイル（`.intent/packets/active/<packet_id>.md`・`.intent/packets/archive/<年>/<packet_id>.md`）の形式・ID 規則・状態遷移・index 再生成手順の**単一の正本**。packet を起案・更新・移動する skill と、packet を読む skill はこの規則に従う。

## frontmatter スキーマ（9キー固定）

各 packet ファイルは先頭に YAML frontmatter（`---` 区切り）を持つ。キーは次の **9キー固定**: `packet_id` / `name` / `state` / `created_at` / `closed_at` / `parent_intents` / `spec_refs` / `superseded_by` / `summary`。

```yaml
---
packet_id: pkt-20260612-auth-session   # 不変。ファイル名と一致。packet 間参照専用
name: "認証セッション整理"             # packet 名の正本。export-log / Source Packet / deltas / slug 導出の照合キー
state: active                          # draft | active | done
created_at: 2026-06-12T05:00:00Z       # 起案日時（ISO 8601）
closed_at: ""                          # done 時に記入（日付）。移行時の不明は空のまま
parent_intents: [L1-2, L2-3]           # tree への参照
spec_refs: []                          # writeback 完了時に確定記入
superseded_by: ""                      # 置換時に後継 packet_id
summary: "認証セッションの整理"        # index の1行要約の源
---
```

- `state` は `draft | active | done` の3値。superseded は state ではなく `superseded_by` 記入による**別軸**（「状態遷移と置き場所」参照）。
- **未確定のキーは空値で保持する**（キー自体を省略しない — index 再生成と検査の決定性のため）。
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

## 状態遷移と置き場所

- 状態遷移: `draft → active → done`。superseded は state ではなく `superseded_by` に後継 `packet_id` を記入する**別軸**。
- 置き場所の対応:
  - `draft | active` → `active/`
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
- `## Validation` — どう検証するか。テスト、手動確認、ログ確認、型検査など。
- `## Rollback` — 失敗時にどう戻せるか。
- `## cc-sdd Mapping` — この packet を cc-sdd の requirements / design / tasks にどう変換するか。

## index.md 再生成手順

`.intent/packets/index.md` は生成物であり手編集しない。canonical（packets/ 配下）を変更した skill は、処理完了時に以下の手順で再生成する。

1. `active/` 配下の全 packet ファイルの **frontmatter のみ**を読む（本文を読まない — 決定的）。
2. `| packet_id | name | state | summary |` のテーブルを `packet_id` **昇順**で構成する。
3. `active/` が空（または不在）の場合は、ヘッダのみの空テーブルが正規形。
