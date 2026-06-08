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
2. `intent-tree.md` をレビュー（モードも確定される）
3. `/intent-compass` を実行
4. `intent-compass.md` をレビュー
5. `/intent-packets` を実行
6. `packets.md` をレビュー
7. `/intent-export-cc-sdd` を実行
8. cc-sdd 成果物をレビューしてから実装に進む

## モード（Intent の詰め方アルゴリズム）

Intent の詰め方は「モード」として切り替え可能です。`mode.md` に選択中のモードが記録され、各コマンドがそれを読んで一貫した戦略で動きます。モード定義は `modes/` にあり、新しいモードを追加できます（`modes/README.md` 参照）。

## Claude 向けルール

- Intent Planning フェーズではアプリケーションコードを変更しない。
- parent intent を支えない局所リファクタを提案しない。
- 各 packet は parent intent を必ず参照する。
- 各タスクは invariant を保持する。
- 意図が不明なときはコードを編集せず Open Questions に書く。
- 推測された意図は、人間がレビューするまで暫定として扱う。
