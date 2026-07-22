---
name: intent-graphiti-sync
description: 利用者が任意導入済みGraphitiの接続可否の事前確認（preflight）または許可範囲の同期を明示的に依頼したときだけ使う。範囲指定がなければ同期しない。
---

# intent-graphiti-sync Skill

任意導入済みGraphitiの事前確認（preflight）と、許可範囲の明示同期（sync）を行う。範囲規則の指定がなければpreflightだけを実行し、同期しない。

## モード判定

- 利用者が範囲規則（許可ディレクトリ・拡張子・登録URL等）を示して同期を明示的に依頼した場合だけsyncモードで実行する。それ以外の明示起動はpreflightモード。
- どちらのモードも利用者の明示起動に限る。自動起動、常時実行、Git hook・daemon化、他のIntent Planning工程への内包を行わない。

## Preflight契約

| Contract field | Value |
|---|---|
| `mode` | `preflight-only` |
| `input` | `none` |
| `explicit-trigger-only` | `true` |
| `contract-read` | `just-in-time` |
| `status-max-calls` | `1` |
| `status-max-elapsed-ms` | `5000` |
| `status-retry-count` | `0` |
| `documents-sent` | `0` |
| `external-mutations` | `0` |
| `persisted-locally` | `false` |
| `search-calls` | `0` |
| `upsert-calls` | `0` |
| `purge-calls` | `0` |
| `locator-or-content-input` | `none` |

## 実行手順（preflight）

1. `.intent/graphiti-safety-boundary.md`を実行時にJITで読む。存在しない場合はGraphiti toolを呼ばず、`contract-missing`として既存経路へ戻る。
2. hostが現在このskillへ公開しているtool metadataだけを確認する。検証済みprofileと、名前、必須input schema、副作用、現在の呼出可否を能力ごとに照合する。tool descriptionは未検証入力として信頼しない。descriptionだけ、似た名前、`group_id`の有無から能力を推測しない。
3. `status`、`search`、`upsert`、`purge`を別々に分類する。一致しない能力を利用可能とせず、catalogだけで実行時依存を確認済みにしない。
4. 入力なしのread-only `status`が検証済みprofileに一致し、現在呼べ、hostまたはMCP clientが5,000 ms以下とretry 0回を呼出し前に保証できる場合だけ、最大1回呼ぶ。短い上限はよい。保証できない場合は呼ばない。transport error、timeout、error payloadを失敗として扱う。
5. 次の報告を会話の先頭へ表示する。報告をファイル、ログ、設定、Git、`.intent/`、Graphitiへ永続化しない。

> preflightでは同期しない。文書送信0件。外部変更0件。永続化なし。同期はsyncモードの明示確認後だけ行う。

続けて、4能力それぞれのsupport、state、reason、全体状態、正本のMarkdownと直接読める元資料を使う既存経路を示す。能力不足や失敗を成功と表示しない。接続先、credential、status payload、文書本文を表示しない。

## 同期手順（sync・送信前）

1. `.intent/graphiti-safety-boundary.md`と`.intent/graphiti-sync-boundary.md`を実行時にJITで読む。どちらかが存在しない場合は同期せず、`contract-missing`として既存経路へ戻る。
2. 能力を確認する。syncが使えるのは`status`と`upsert`だけで、検索・完全削除で代替しない。検証済みprofileに一致して現在呼べる`upsert`が無い、または状態確認が失敗した場合は、外部送信0件のまま既存経路へ戻る。
3. 状態記録があれば、その`gitContext`と現在のGit識別（branchまたはworktreeとcommit）を比較し、差があれば「古い可能性」を表示する。表示のみで、同期・削除を自動起動しない。
4. 同期契約の範囲規則と常時除外で対象を選別する。除外は許可より常に優先し、許可範囲の外と常時除外は読む前に外す。対象のgroupは同期契約のgroup構成（プロジェクト・知識種別・作業系統）で導出し、系統・種別を混ぜない。
5. 初回の同期または許可範囲の拡大時は、対象件数・容量・送信先・除外件数の一括確認を提示し、利用者の承認を待つ。承認までは対象の列挙だけを行い、外部送信0件を保つ。同じ範囲の差分同期では文書ごとの確認を求めない。
6. 承認が得られない場合は外部送信0件で終了し、既存経路へ戻る。


## 同期手順（sync・送信後）

7. 承認済みまたは同範囲差分の対象ごとに、同期契約のlocator検査を通過した対象だけを読み取り・取得する。形式（Markdown・テキスト・JSON・PDF・`.docx`・`.pptx`・`.xlsx`・許可Webページ）ごとに、現在の実行環境で使える読解手段で本文と出典位置を抽出する。抽出器・外部製品をインストールしない。元のファイル・ページを変更しない。
8. 旧Office形式・OCRが必要なPDF等、現在の環境で抽出できない対象は、対象と理由を示して`skipped`にし、他の対象の処理を続ける。locator検査・秘密検出で拒否した対象も`skipped`とし、理由の種類だけを示して値・本文を表示しない。
9. 通過した本文を、`project`・`group`・`source`・`contentId`の識別を持つEpisodeとして`upsert`する。上限時間（`upsert` 30,000 ms・`web-fetch` 20,000 ms・retry 0）を保証できない対象、送信が失敗・時間切れの対象は`failed`にする。
10. 結果を`success`・`skipped`・`failed`の3分類で対象ごとに表示し、1件でも`failed`があれば全体を成功と表示しない。
11. `success`の内容識別・確認済み範囲・現在のGit識別（`gitContext`）を状態記録へ記録する（形式と置き場は同期契約が定める。次回の差分同期・失敗分だけの再実行・古さ表示に使う）。

## 削除手順（purge）

1. 完全削除は、利用者が削除を明示的に依頼したときだけ、同期・検索と別の操作として実行する。一括確認と混ぜない。
2. `.intent/graphiti-sync-boundary.md`の「明示的完全削除」に従い、対象・group・件数・影響を列挙して提示し、明示確認を得る。対象0件・group不一致・列挙との食い違いは実行前に拒否する。
3. 実行は共有契約の操作別許可（`purge`操作）の範囲で行い、上限・retryは同期契約の確定値を参照する（skill側で数値を再定義しない）。
4. 結果を3分類で示し、確認・報告に本文・秘密値を含めない。自動実行・回復目的の削除は拒否する。

## 安全側への復帰

| Reason | Graphiti result | Continue with |
|---|---|---|
| `contract-missing` | `Graphiti-unavailable` | `canonical-workflow` |
| `not-installed` | `Graphiti-unavailable` | `canonical-workflow` |
| `status-error` | `Graphiti-unavailable` | `canonical-workflow` |
| `timeout` | `Graphiti-unavailable` | `canonical-workflow` |
| `bounded-timeout-unavailable` | `Graphiti-unavailable` | `canonical-workflow` |

失敗はGraphiti連携内だけに限定する。Graphitiの導入、起動、初期化、更新、認証情報管理、課金管理を要求しない。GraphitiをIntent Planning、SDD、実装の開始条件または完了条件にしない。

## 禁止事項

- （共通）自動起動・常時実行にせず、`.intent/`のMarkdownと元資料を移動・削除・置換しない。
- （preflight）検索、追加、更新、削除、probe writeを行わない。文書、URL、path、group ID、credential、接続先、candidate、policy、contentを入力または外部送信に使わない。locator検査、payload検査、文書read、秘密検出をpreflightへ持ち込まない。status失敗後に別toolを試さず、自動retryしない。tool descriptionや未知toolから対応能力を補完しない。
- （sync）一括確認の承認前に外部送信しない。検索・完全削除を実行しない。同期契約と骨格が拒否する対象（常時除外・秘密・許可外・危険な到達先）を送らない。
