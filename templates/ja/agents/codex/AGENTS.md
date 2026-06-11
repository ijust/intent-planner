# intent-planner（Codex 向け quickstart）

intent-planner は、実装に入る**前**に「全体の意図」と「統一した設計方針」を人間とエージェントで擦り合わせる、軽量な **Intent Planning レイヤー**です。各ファイル単位では妥当でも全体の設計意図が少しずつ崩れていく architectural drift を、エージェントが横断的な intent を持たないまま局所最適（local optimization）へ逃げることを止めて防ぎます。

これは full IDD framework ではなく、spec 駆動フロー（cc-sdd）の**手前**に挟む pre-spec ステージです。ここで詰めた intent を、cc-sdd の requirements → design → tasks フローへ非破壊・低トークンで橋渡しします。

## ワークフロー

`/intent-discover` から始め、以下を順に実行します。各ステップの成果物（`.intent/` 配下の Markdown）をレビューしてから次へ進みます。

1. `/intent-discover` — Intent Tree（L0–L4）を構築し、Intent の詰め方モードを推奨・確定する
2. `/intent-compass` — North Star / Anti-direction / Invariants など判断基準を作る
3. `/intent-packets` — cc-sdd に渡す前の作業単位（packet）に分解する
4. `/intent-export-cc-sdd` — 選んだ packet を cc-sdd の下書きに変換する

上の4つは「計画」フェーズです。export 後も intent は使い捨てず、維持・随時の4スキルでサイクルとして育て続けます。

- `/intent-status` — 随時（迷ったとき）。現在地の要約と「次の一手」をちょうど1つ推奨する（読み取り専用）
- `/intent-validate` — export 前（推奨）。成果物間の矛盾・カバレッジ漏れ・境界不整合を深刻度付きで報告する（読み取り専用）
- `/intent-writeback` — packet の実装完了後。実装で得た学びを `.intent/deltas.md` に delta として記録し、承認された項目だけを canonical 成果物へ昇格する
- `/intent-improve` — 節目（複数 packet 実装後など）。`.intent/` と実装の現実を completeness / correctness / coherence の3軸で再整合する

これらの `intent-*` skill は `.agents/skills/intent-*/SKILL.md` に配置されています。

## .intent/ scaffold

Intent の知能（mode 定義・アルゴリズム rules・cc-sdd 橋渡し）と planning 成果物は `.intent/` にあり、エージェント非依存です。

- `intent-tree.md` — Intent Tree（L0–L4）
- `intent-compass.md` — North Star / Anti-direction / Invariants
- `packets.md` — Packet Plan
- `mode.md` / `modes/` — Intent の詰め方モード（選択中のモードと定義）
- `cc-sdd/` — cc-sdd へ渡す requirements / design / tasks の下書き

詳細は `.intent/README.md` を参照してください。

## cc-sdd 連携

`/intent-export-cc-sdd` が生成する `.intent/cc-sdd/requirements.md`（凝縮 Project Description）を cc-sdd の `/kiro-spec-init` に渡すことで、Intent Planning の成果を cc-sdd の spec 駆動フローへ滑らかに引き継げます。intent-planner は下書きまでで、本体は cc-sdd が生成し各フェーズで人間がレビューします。

## ルール

- Intent Planning フェーズではアプリケーションコードを変更しない。
- parent intent を支えない局所リファクタを提案しない。
- 各 packet は parent intent を必ず参照し、各タスクは invariant を保持する。
- 意図が不明なときはコードを編集せず Open Questions に書く。
- 推測された意図は、人間がレビューするまで暫定として扱う。
