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
.intent/                   Intent Tree / Compass / Packets / deltas / modes などの scaffold
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

### 計画（discover → compass → packets → export）

導入後、Claude Code で以下を順に実行します。

1. `/intent-discover` — Intent Tree（L0–L4）を構築し、Intent の詰め方モードを確定する
2. `/intent-compass` — North Star / Anti-direction / Invariants など判断基準を作る
3. `/intent-packets` — cc-sdd に渡す前の作業単位（packet）に分解する
4. `/intent-export-cc-sdd` — 選んだ packet を cc-sdd の下書きに変換する

各ステップの成果物（`.intent/` 配下の Markdown）をレビューしてから次へ進みます。

### 維持（intent を育て続ける）

export は一方通行ではありません。packet の実装後にサイクルを回すことで、`.intent/` は実装とともに育ち続けます。

- `/intent-writeback` — packet の実装完了後に実行。実装で得た学び（新しい決定・invariant 違反の発見・暗黙挙動・Deferred の解消など）を `.intent/deltas.md` に delta として記録し、承認した項目だけを canonical 成果物（Intent Tree / Compass / Packets）へ昇格します
- `/intent-improve` — 数 packet 完了後やリリース前などの節目に実行。`.intent/` 成果物と実装の現実を completeness / correctness / coherence の3軸で突き合わせ、ズレを分類して是正案を提示する全体再整合の safety net です。反映はユーザー承認後のみ

随時実行できるスキルが2つあります。

- `/intent-status` — `.intent/` の現状を読み取り、現在地の要約と「次の一手」をちょうど1つ推奨する読み取り専用の案内。迷ったらまずこれを実行します
- `/intent-validate` — export 前に intent-tree・compass・packets（+ export 下書き）を横断し、矛盾・カバレッジ漏れ・境界不整合を深刻度付きで報告する読み取り専用の検証

## 利用ストーリー

ひとつの機能群を「intent を育てながら」進める具体的な流れです。

1. `/intent-discover` → `/intent-compass` → `/intent-packets` で、意図の全体像・判断基準・作業単位（packet）を作ります。
2. export の前に `/intent-validate` を実行します。たとえば「packet B は Compass の Invariant と矛盾」のような要修正の指摘が出たら、`/intent-packets` を再実行して解消してから先へ進みます。
3. `/intent-export-cc-sdd` で最初の packet を cc-sdd の下書きに変換し、cc-sdd の spec フロー（requirements → design → tasks）で実装します。
4. 実装が完了したら `/intent-writeback` を実行します。実装の現実と packet 定義・Compass を突き合わせて学び（新しい決定、発見された invariant 違反、意図に書かれていなかった暗黙挙動など）を抽出し、まず `.intent/deltas.md` に delta として記録します。この時点では canonical 成果物は書き換えません。
5. 提示された学びを項目ごとに承認すると、delta が canonical 成果物へ昇格します。判断基準（Compass の Decision Rules）の変更を伴う場合は、ADR 形式の新しいエントリが追加され、置き換えられる旧エントリには superseded の注記が付きます。
6. `/intent-status` を実行すると、更新後の `.intent/` を読んで「次の一手」── 次の packet の export など ── をちょうど1つ案内してくれます。
7. 2周目以降、数 packet 回した節目に `/intent-improve` を実行します。packet 単位の書き戻しでは拾えない全体の陳腐化（実装にあるのに intent に無い、intent にあるのに実装と食い違う等）を3軸で検出し、是正案を承認ベースで反映します。

学びは `.intent/deltas.md` に貯まり、承認されたものだけが Intent Tree / Compass / Packets に反映されます。これにより `.intent/` は「最初に作って終わり」の文書ではなく、実装の現実と同期し続ける判断基準であり続けます。

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
