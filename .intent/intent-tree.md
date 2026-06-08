# Intent Tree

> Mode: standard (GORE-lite)。canonical(確定) と inferred(推測=Assumptions) を混ぜない。

## L0: Product Purpose

大きめ・複雑なソフトウェア（特に仕様が膨れ上がった既存大規模プロジェクトのリファクタ）において、実装に着手する前に「全体の意図」と「統一した設計方針」を人間と Claude が良いタイミングで擦り合わせ、Claude が局所最適な小手先修正に逃げるのを防ぐための、軽量な Intent Planning レイヤーを提供する。

cc-sdd が個別 feature の spec（requirements/design/tasks）を作るのに対し、その手前で失われがちな「横断的な意図・統一設計」を補完する。

## L1: Desired Outcomes

- **ユーザー(開発者)**: リファクタや大規模変更の前に、全体意図(Intent Tree)と判断基準(Compass)を短時間で言語化でき、Claude との設計対話を任意のタイミングで行える。
- **開発体験**: Claude が局所最適に逃げず、parent intent と invariant を参照しながら実装する。意図のズレ(drift)を早期に検知できる。
- **エコシステム**: 成果物(packet)を cc-sdd にそのまま渡せ、cc-sdd の spec 駆動フローと滑らかに接続する。重複や再実装をしない。
- **配布**: `npx intent-planner` で任意のプロジェクトに導入でき、cc-sdd の `kiro-*` skill と同じ流儀で共存する。

## L2: Capabilities

- **C1 意図の階層化**: 暗黙の意図を L0–L4 へ構造化して可視化する能力。
- **C2 局所最適の抑止**: 「やってはいけない方向」「壊してはいけない不変条件」「判断基準」を明示し、Claude の振る舞いを拘束する能力。
- **C3 作業単位への分解**: 意図を behavior-preserving / testable / rollbackable な packet に分解する能力。
- **C4 spec ツールへの橋渡し**: packet を spec ツールの scaffold に変換し、intent への参照を保持する能力。**初期実装は cc-sdd の requirements/design/tasks のみ**。export ターゲットは差し替え可能な構造とする（将来 OpenSpec 等）。
- **C5 アルゴリズム可変化**: Intent の詰め方(アルゴリズムの組み合わせ=モード)を差し替え可能にする能力。
- **C6 配布**: 上記を skill + scaffold として任意プロジェクトへ非破壊に配置する能力。

## L3: Behavioral / Architectural Intents

- **B1 (C2,C4)**: 知能は Claude skill 側に置き、CLI は scaffold 配置に徹する。コマンド実行ロジック(状態機械・自律ループ)を持たない。
- **B2 (C6)**: インストーラは Node 標準モジュールのみ・依存ゼロ。既存ファイルは決して上書きしない(スキップ、`--force` で明示上書き)。
- **B3 (C5)**: アルゴリズムを3層に分離する — Mode(`.intent/modes/*.md`) / Algorithm(`rules/algo-*.md`) / Skill(`SKILL.md`)。Skill はモードを読んで実行する。
- **B4 (C5)**: モードは `/intent-discover` で Claude が推奨し人間が確認、結果を `.intent/mode.md` に記録。以降のコマンドは mode.md を読んで一貫戦略で動く。
- **B5 (C1,C3)**: 意図計画フェーズではアプリケーションコードを変更しない。不明点は Open Questions に書き、コードを触らない。
- **B6 (C4)**: spec ツールの境界を侵さない。requirements 以降の本体生成は spec ツール(cc-sdd)に委譲し、intent-planner は scaffold(下書き)までを渡す。
- **B8 (C4,C5)**: export を「ターゲット差し替え可能」な縫い目として持つ。packet→spec のマッピング規則は `rules/map-cc-sdd.md` のようにターゲット別に分離する。今回は cc-sdd 1ターゲットのみ実装し、`intent-export-openspec` 等は足せる余地だけ残す（実装しない）。
- **B7 (C6)**: cc-sdd と同じ `.claude/skills/<name>/SKILL.md` 構造に揃え、命名 `intent-*` で並列共存する。

## L4: Candidate Packets

- **P1**: skill 群の定義（intent-discover / intent-compass / intent-packets / intent-export-cc-sdd の SKILL.md）
- **P2**: standard モード定義 + アルゴリズム rules（algo-gore-lite / algo-qoc / algo-example-mapping）+ モード選択ロジック（mode-selection）
- **P3**: `.intent/` scaffold 一式（tree/compass/packets/mode/cc-sdd/README）と modes 拡張点
- **P4**: npx インストーラ（bin/cli + src/install）— 非破壊コピー、--lang/--force/--dry-run、cc-sdd 検出
- **P5**: パッケージング（package.json の bin/files、配布用 README）

## Open Questions

- Q1: モード候補が将来増えたとき、`mode-selection` はリポジトリのどの信号(言語/テスト有無/履歴規模)でモードを推奨すべきか。standard 段階では未確定。
- Q2: `--lang` の言語マーカー差し替えは、SKILL.md 本文も翻訳対象にするか、それとも scaffold の見出しのみか。
- Q3: cc-sdd 検出時、export 先を `.kiro/specs/<feature>/` に寄せる案内をどこまで自動化するか（自動移動は破壊リスクのため当面しない方針）。
- Q4: 将来 OpenSpec を export ターゲットに足す場合、`proposal.md` / `specs/` / `changes/` 構造への packet マッピングはどうするか。**今回は実装しない**。B8 の縫い目（ターゲット別 rules 分離）でコスト無く追加できる位置に置くだけ。

## Assumptions (inferred — 未レビュー)

- A1: 利用者は cc-sdd を併用している、または併用する可能性が高い。intent-planner 単体でも成立はするが、価値は cc-sdd 接続で最大化されると推測。
- A2: 利用者の主言語は日本語（このリポジトリの CLAUDE.md が日本語生成を指示しているため）。ただし配布物は ja/en を選べるべき。
- A3: 配布対象プロジェクトは git 管理下にあることが多い（非破壊性と相性が良い）。
