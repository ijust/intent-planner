# intent-planner

**Pre-spec Steering Layer for AI coding agents**
*— intent-aware steering, one stage before your specs.*

Claude にリファクタや大規模変更を頼むと、各ファイルでは妥当なのに全体の設計意図が少しずつ崩れていく ── **architectural drift**。原因は、AI が横断的な intent を持たないまま局所最適（local optimization）に逃げることにあります。

intent-planner は、実装に入る前に「全体の意図」と「守るべき設計方針」を人間と Claude で擦り合わせ、それを AI が参照できる **steering context** に変換する軽量レイヤーです。その成果を [cc-sdd](https://github.com/gotalab/cc-sdd) の spec 駆動フローへ非破壊・低トークンで橋渡しします。

これは full IDD（Intent-Driven Development）framework ではありません。Intent を source of truth にして開発全体を回すものではなく、**spec の手前に挟む軽量な steering レイヤー**です。

| | |
|---|---|
| **解く問題** | architectural drift / local optimization |
| **手段** | intent の構造化 = context engineering |
| **位置** | spec-driven フローの pre-spec ステージ |

CLI は配置に徹し、知能は Claude Code の skill 側にあります。状態機械・自律ループ・GitHub 連携は持ちません。

## インストール

```bash
npx github:ijust/intent-planner
```

（npm レジストリには未公開のため GitHub 直接指定。公開後は `npx intent-planner` になります）

カレントディレクトリに以下を配置します。既存の同名ファイルは上書きしません。

```
.claude/skills/intent-*/   Intent Planning の skill 群（--agent codex の場合は .agents/skills/ + AGENTS.md）
.intent/                   Intent Tree / Compass / Packets / modes などの scaffold
```

### オプション

| オプション | 説明 |
|---|---|
| `dir` | 配置先ディレクトリ（既定: カレント） |
| `--force` | 同名ファイルがあっても上書きする（既定: スキップ） |
| `--dry-run` | 書き込まず、配置/スキップ予定の一覧だけ表示する |
| `--lang <value>` | 言語指定: `ja`（既定）/ `en` |
| `--agent <value>` | 対象エージェント: `claude`（既定）/ `codex` |
| `--help`, `-h` | ヘルプを表示する |

```bash
npx github:ijust/intent-planner ./my-project          # 指定ディレクトリへ
npx github:ijust/intent-planner --dry-run             # 何が起きるか確認
npx github:ijust/intent-planner --lang en --agent codex   # 英語 + Codex
```

## ワークフロー

導入後、Claude Code で以下を順に実行します。

1. `/intent-discover` — Intent Tree（L0–L4）を構築し、Intent の詰め方モードを確定する
2. `/intent-compass` — North Star / Anti-direction / Invariants など判断基準を作る
3. `/intent-packets` — cc-sdd に渡す前の作業単位（packet）に分解する
4. `/intent-export-cc-sdd` — 選んだ packet を cc-sdd の下書きに変換する

各ステップの成果物（`.intent/` 配下の Markdown）をレビューしてから次へ進みます。

## モード（Intent の詰め方アルゴリズム）

Intent の詰め方は「モード」として切り替え可能です。`.intent/mode.md` に選択中のモードが記録され、各コマンドがそれを読んで一貫した戦略で動きます。

- **standard**（同梱）— GORE-lite + QOC + Example Mapping。新規プロダクトや、意図が言語化されていない機能群向け。
- **refactor**（同梱）— GORE-lite + Drift Analysis + Migration Slicing + QOC。既存大規模プロジェクトのリファクタ・再設計向け。
- **behavior-unknown**（同梱）— GORE-lite + Example Mapping + Characterization Test + QOC。振る舞いが不明なレガシー向け。
- **feature-growth**（同梱）— GORE-lite + Impact Analysis + QOC + Example Mapping + Additive Slicing。既存の稼働中システムへの新機能追加向け。

新しいモードは `.intent/modes/` にファイルを1枚足すだけで追加できます（`.intent/modes/README.md` 参照）。

## cc-sdd 連携

配置先に cc-sdd（`.kiro/`）がある場合、インストーラがそれを検出して案内します。

`/intent-export-cc-sdd` が生成する `.intent/cc-sdd/requirements.md`（凝縮 Project Description）を cc-sdd の `/kiro-spec-init` に渡すことで、Intent Planning の成果を cc-sdd の requirements → design → tasks フローへ滑らかに引き継げます。invariant と parent intent は cc-sdd の tasks へ転記されやすい構造で渡されるため、実装段階でも全体意図が効き続けます。

intent-planner は cc-sdd の requirements 以降の本体生成は行いません（下書きまで）。本体は cc-sdd が生成し、各フェーズで人間がレビューします。

## 設計方針

- アプリケーションコードは変更しません（Intent Planning は意図の構造化であり実装ではない）。
- 既存ファイルは上書きしません（`--force` 指定時を除く）。
- ランタイム依存ゼロ（Node 標準モジュールのみ）。

## ライセンス

MIT © Yoshishige Tsuji

リポジトリ内の開発ツーリング（`.claude/skills/kiro-*/`、`.kiro/settings/`）は [cc-sdd](https://github.com/gotalab/cc-sdd)（MIT, © 2025 gotalab）に由来します。詳細は [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) を参照してください。
