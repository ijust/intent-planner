# Intent Planning Workflow

このディレクトリは、大規模リファクタやアーキテクチャ変更のための軽量な Intent Planning workflow です。

意図的に CLI ではなく、完全な IDD 状態機械でもありません。実装前に「全体の意図」と「統一した設計方針」を人間と Claude が良いタイミングで擦り合わせ、Claude が局所最適な小手先修正に逃げるのを防ぐためのものです。cc-sdd が個別 feature の spec を作る手前を補完します。

## 目的

実装の前に、以下を明確化します。

1. Intent Tree（`intent-tree.md`）
2. Intent Compass（`intent-compass.md`）
3. Packet Plan（`packets.md`）
4. cc-sdd の requirements / design / tasks 下書き（`cc-sdd/`）

## ワークフロー

1. `/intent-discover` を実行
2. `intent-tree.md` をレビュー（モードと開発目的 purpose も確定される）
3. `/intent-compass` を実行
4. `intent-compass.md` をレビュー
5. `/intent-packets` を実行
6. `packets.md` をレビュー
7. `/intent-export-cc-sdd` を実行
8. cc-sdd 成果物をレビューしてから実装に進む

## ライフサイクル（intent を育て続ける）

上のワークフローは「計画」フェーズです。export 後も intent は使い捨てず、次のサイクルで育て続けます。

- 計画: `/intent-discover` → `/intent-compass` → `/intent-packets` → `/intent-export-cc-sdd`
- 実装: cc-sdd で実装する
- 維持: `/intent-writeback`（packet 単位の学びの還流）、節目に `/intent-improve`（全体の再整合）
- 随時: `/intent-status`（現在地と次の一手）、`/intent-validate`（export 前の検証）

`/intent-writeback` の学びは `deltas.md` に delta として記録され（canonical 成果物は直接書き換えない）、`/intent-status` と `/intent-improve` がそれを参照します。

### いつどのスキルを使うか

| スキル | タイミング | 役割 |
|--------|-----------|------|
| `/intent-status` | 随時（迷ったとき） | 現在地の要約と「次の一手」をちょうど1つ推奨する（読み取り専用） |
| `/intent-validate` | export 前（推奨） | 成果物間の矛盾・カバレッジ漏れ・境界不整合を深刻度付きで報告する（読み取り専用） |
| `/intent-writeback` | packet の実装完了後 | 実装で得た学びを `deltas.md` に記録し、承認された項目だけを canonical 成果物へ昇格する |
| `/intent-improve` | 節目（複数 packet 実装後など） | `.intent/` と実装の現実を completeness / correctness / coherence の3軸で再整合する |

計画フェーズの4スキル（`/intent-discover`・`/intent-compass`・`/intent-packets`・`/intent-export-cc-sdd`）の使い方は上記「ワークフロー」を参照してください。

## モード（Intent の詰め方アルゴリズム）

Intent の詰め方は「モード」として切り替え可能です。`mode.md` に選択中のモードが記録され、各コマンドがそれを読んで一貫した戦略で動きます。モード定義は `modes/` にあり、新しいモードを追加できます（`modes/README.md` 参照）。

`mode.md` には、モードと直交する軸として開発目的（purpose: poc / product）も記録されます。purpose が poc のときは、PoC 向けの追加確認（仮説・反証条件・GO/NO-GO、L1 計測基準、walking skeleton、画面ラフ）と `/intent-validate` の規範検査が有効になります。

## Claude 向けルール

- Intent Planning フェーズではアプリケーションコードを変更しない。
- parent intent を支えない局所リファクタを提案しない。
- 各 packet は parent intent を必ず参照する。
- 各タスクは invariant を保持する。
- 意図が不明なときはコードを編集せず Open Questions に書く。
- 推測された意図は、人間がレビューするまで暫定として扱う。
