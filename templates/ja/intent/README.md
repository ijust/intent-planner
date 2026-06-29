# Intent Planning Workflow

このディレクトリは、大規模リファクタやアーキテクチャ変更のための軽量な Intent Planning workflow です。

意図的に CLI ではなく、完全な IDD 状態機械でもありません。実装前に「全体の意図」と「統一した設計方針」を人間と Claude が良いタイミングで擦り合わせ、Claude が局所最適な小手先修正に逃げるのを防ぐためのものです。cc-sdd が個別 feature の spec を作る手前を補完します。

## 目的

実装の前に、以下を明確化します。

1. Intent Tree（`intent-tree.md`。完結機能の Impact Analysis・出荷済み L4 等の履歴退避先は `intent-tree.history.md`）
2. Intent Compass（`intent-compass.md`。覆された Decision Rules の退避先は `compass-archive.md`、完結機能のプレモータム逆算 Anti-direction の退避先は `compass-history.md`）
3. Packet Plan（`packets/` — `active/` 配下の packet ファイルと `plan.md`・`index.md`。1 packet = 1 ファイルで管理し、完了した packet は `archive/` へ移動）
4. cc-sdd の requirements / design / tasks 下書き（packet 毎の `cc-sdd/<スラッグ>/` ディレクトリ。README を除き Git 非追跡のローカル下書き）

## ワークフロー

1. `/intent-discover` を実行
2. `intent-tree.md` をレビュー（モードと設計者役の詰めの問い designer-questions も確定される）
3. `/intent-compass` を実行
4. `intent-compass.md` をレビュー
5. `/intent-packets` を実行
6. `packets/` をレビュー（`plan.md` と `active/` 配下の packet ファイル）
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

`mode.md` には、モードと直交する軸として設計者役の詰めの問い（designer-questions: on / off）も記録されます。`/intent-discover` が入口でフローが代わりに問うてくれることを説明し、要否を確認します。on のときは共通の追加確認（L1 計測基準、walking skeleton、画面ラフ）と `/intent-validate` の規範検査が有効になり、さらに開発目的（purpose: poc / product）を確認して、poc なら仮説・反証条件・GO/NO-GO の確認が加わります。off のときの増分は要否確認の1問だけです。

## Enforcement（書き戻し漏れの検査・任意）

`/intent-writeback` の実行漏れを機械的に検出する任意のレイヤーです。**既定は off** で、設定しない限り動作は何も変わりません。`mode.md` の「Enforcement（ユーザー管理）」セクションを直接編集して切り替えます（`off`=既定・検査なし / `remind`=警告のみ / `gate`=export・push を停止）。

検査されるのは次の2つです。

- **pending delta の放置（中心）** — `deltas.md` に記録したまま、承認・反映されずに残っている delta
- **staleness（実験的）** — 最後の書き戻し（または export）以降に `.intent/` 以外を変更したコミット数が閾値（`enforcement-threshold`、既定: 5）を超えた状態。無関係なコミットも数えるため誤検知が残ります。`enforcement-exclude` で計数から除くパスを指定できます。まず `remind` で試すことを推奨します

検査が効くのは、`/intent-export-cc-sdd` の export 前・`/intent-status` の警告・インストーラ `--enforce` で配置した pre-push フックの3箇所です。判定はすべて読み取り専用スクリプト `scripts/intent-check.mjs` が行います（ファイルの作成・変更・削除はしません）。gate で停止しても、明示的な続行指示や `git push --no-verify` という逃げ道があります。enforcement が強制するのは手続きの実行のみで、書き戻し内容の正しさは保証しません。

### Claude Code SessionStart hook（任意）

セッション開始時に書き戻し漏れの警告をエージェントのコンテキストへ入れたい場合は、`.claude/settings.json` に次を手動で追記します（intent-planner が自動で書き込むことはありません）。

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "node .intent/scripts/intent-check.mjs" }
        ]
      }
    ]
  }
}
```

### 注意（既知の制約）

- nvm / volta 環境では、GUI の git クライアントの PATH に node が無いことがあり、その場合 pre-push フックの検査はスキップされます（stderr に1行通知が出ます）
- `core.hooksPath` を使う環境（husky 等）では `.git/hooks` が呼ばれないため、配置した pre-push フックは効きません
- git worktree や submodule など `.git` がファイルになっている環境では、`--enforce` のフック配置は失敗します
- 旧 scaffold を導入済みの環境で enforcement を使うには、`mode.md` に Enforcement セクションを手動で追加してください（最新テンプレートの同セクションをコピー）

## Drift-watch（逸脱監視・任意）

enforcement と並ぶ、もう一つの**任意のクロスカット層**です。意図を立てたあと実装が進むほど「意図したソフトウェアでなくなっていく」逸脱（architectural drift）を、外れきる前に名指しで捕まえます。これは**モードではありません**（モードは排他で一度に1つだけ有効。drift-watch は `off` | `on` の独立スイッチです）。

**既定は off** で、設定しない限り動作は何も変わりません。`mode.md` の「Drift-watch（ユーザー管理）」セクションを直接編集して `on` に切り替えます。

`on` のとき、`/intent-discover` が Intent Tree の逸脱しやすい場面の事前チェックを、`/intent-export-cc-sdd` が export 水際で compass 照合の警告を出します。**いずれも警告のみで停止しません**（enforcement の `gate` とは別概念で、誤検知前提のため停止する値を持ちません）。検知は `.intent/drift-log.md` にローカル記録されます（外部への送信は一切なく、`.intent/` 内で完結します）。

根拠となるのは `.intent/drift-patterns.md`（逸脱の型カタログ）で、配布時の seed は網羅ではなく、**利用者が自分の現場で踏んだ逸脱を型として足して育てる**前提です。集計（改善度レポート）は新コマンドを増やさず、`/intent-status` の軽い併記と `/intent-improve` の pattern×outcome クロス集計に相乗りします。

## エージェント向けルール

### 計画フェーズ（intent-* スキル実行時）

- Intent Planning フェーズではアプリケーションコードを変更しない。
- parent intent を支えない局所リファクタを提案しない。
- 各 packet は parent intent を必ず参照する。
- 各タスクは invariant を保持する。
- 意図が不明なときはコードを編集せず Open Questions に書く。
- 推測された意図は、人間がレビューするまで暫定として扱う。

### 実装フェーズ（Agent Contract — packet を実装するエージェントへ）

1. Invariants は絶対制約（hard constraint）として扱う。
2. Decision Rules は superseded と明記されない限り有効として扱う。
3. Anti-direction に該当する実装を行わない。
4. packet が Compass と矛盾する場合は実装を停止して人間に確認する。
5. コード実態が intent と矛盾する場合は delta として記録し（`/intent-writeback`）、intent を黙って書き換えない。
