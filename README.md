# intent-planner

大規模リファクタや複雑な設計変更の **前** に、人間と Claude が「全体の意図」と「統一した設計方針」を擦り合わせるための、軽量な Intent Planning workflow を配置する npx インストーラです。

Claude が局所最適な小手先修正に逃げるのを防ぎ、その成果を [cc-sdd](https://github.com/gotalab/cc-sdd) の spec 駆動フローへ非破壊・低トークンで橋渡しします。

CLI は配置に徹し、知能は Claude Code の skill 側にあります。状態機械・自律ループ・GitHub 連携は持ちません。

## インストール

```bash
npx intent-planner
```

カレントディレクトリに以下を配置します。既存の同名ファイルは上書きしません。

```
.claude/skills/intent-*/   Intent Planning の skill 群
.intent/                   Intent Tree / Compass / Packets などの scaffold
```

### オプション

| オプション | 説明 |
|---|---|
| `dir` | 配置先ディレクトリ（既定: カレント） |
| `--force` | 同名ファイルがあっても上書きする（既定: スキップ） |
| `--dry-run` | 書き込まず、配置/スキップ予定の一覧だけ表示する |
| `--lang <value>` | 言語指定（現在 `ja` のみ対応。他は `ja` にフォールバック） |
| `--help`, `-h` | ヘルプを表示する |

```bash
npx intent-planner ./my-project        # 指定ディレクトリへ
npx intent-planner --dry-run           # 何が起きるか確認
npx intent-planner --force             # 既存も上書き
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

MIT
