# source scope 解釈手順（git range の解釈・read-only）

`intent-release-note` skill が、利用者の指定した範囲（git range）を解釈し、その範囲のコミットを read-only で読み取るための正本。SKILL.md は手順と報告形式のみを持ち、「range をどう解釈し、どの read-only git コマンドで読むか」は本ルールを参照する。本ルールは git 履歴を**読むだけ**であり、git の状態（commit / tag / branch / working tree）も canonical な `.intent/*.md` も一切変更しない（書き込みは `.intent/release-note/` 配下のみ、かつ SKILL.md の責務）。

## posture（独自パーサを持たず git を読んで解釈する）

range の解釈とコミットの読み取りは、独自のパーサ・スキーマ・索引を持たず、read-only git コマンドの出力を直接読んで行う。新しい構造を導入せず、git のコミットメッセージ・タグ・日時をそのまま素材として扱う。

## range の解釈（引数 + 既定 + fallback）

利用者が `/intent-release-note` に与えた range 引数を起点に、次のとおり対象範囲を解釈する。

| 入力 | 解釈すること | 解決 |
|---|---|---|
| range 無指定 | 既定範囲を用いる | **直近 tag〜HEAD**（直近の到達可能タグから HEAD まで）。`git describe --tags --abbrev=0` で直近 tag を求め、`<tag>..HEAD` を対象とする |
| `<from>..<to>` 指定 | 明示された範囲を用いる | 与えられた `<from>..<to>` をそのまま対象とする |

- 引数で範囲が一意に確定したら、対話補完は行わない（不要な問いを足さない。利用者への問い返しに依存せず、既定 + fallback で一意化する）。

## 異常系（Fail-Soft と明示エラー）

| 状況 | 振る舞い |
|---|---|
| 直近 tag が存在せず既定範囲が解決できない | **fallback**: 全履歴（最初のコミット〜HEAD）を対象とし、「tag が無いため全履歴を対象にした」旨を出力に注記する（Fail-Soft）。指定があればその範囲へ fallback する |
| 与えられた range 引数が不正（解釈不能） | **明示エラー**: range が解釈できない旨を返し、release note を生成しない（誤った範囲で出力しない） |
| 対象 range にコミットが1件も無い | 空である旨を出力に明示し、canonical / git を一切変更しない |

## read-only git コマンドの allowlist（書き込み厳禁）

range の解決とコミット読み取りには、次の **read-only コマンドのみ**を用いる。

- 許可（読み取り用法のみ）: `git log` / `git tag`（一覧のみ。`-a`/`-m` 等の作成用法は不可）/ `git describe` / `git rev-list` / `git rev-parse` / `git show`。
- **禁止（一切叩かない）**: `git commit` / `git tag <name>`（作成）/ `git push` / `git fetch --prune 以外の書き込み` / `git checkout` / `git switch` / `git reset` / `git restore` / `git merge` / `git rebase` / `git cherry-pick` / その他 working tree・ref・remote を変更する操作。

git の状態を変更しないこと（INV16）。本ルールは range を解決し読み取る素材を SKILL.md へ渡すだけであり、照合・format 写像・出力先 Write は行わない。

## 不変条件

- git を読み直すだけで変更しない（read-only。書き込みは SKILL.md の `.intent/release-note/` への Write の責務）。
- 既定 range（直近 tag〜HEAD）・引数 range・fallback・不正エラーの解釈規律を崩さない。
- read-only allowlist の外のコマンドを足さない（書き込み系を導入しない）。
- range の解釈に独自の機械スコアリング・閾値を持ち込まない（照合は SKILL.md の Step 3 の責務であり、本ルールは範囲解決のみ）。
