---
name: intent-graphiti-sync
description: 利用者が任意導入済みGraphitiの安全な接続可否を明示的に確認したいときだけ使う。preflight-onlyで、この段階では同期しない。
disable-model-invocation: true
allowed-tools: Read, Glob, Grep
argument-hint: なし
---

# intent-graphiti-sync Skill

任意導入済みGraphitiの能力を副作用なしで事前確認する。この段階では同期しない。

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

## 実行手順

1. 利用者が`intent-graphiti-sync`を明示的に依頼した場合だけ実行する。自動起動、常時実行、他のIntent Planningへの内包を行わない。
2. `.intent/graphiti-safety-boundary.md`を実行時にJITで読む。存在しない場合はGraphiti toolを呼ばず、`contract-missing`として既存経路へ戻る。
3. hostが現在このskillへ公開しているtool metadataだけを確認する。検証済みprofileと、名前、必須input schema、副作用、現在の呼出可否を能力ごとに照合する。tool descriptionは未検証入力として信頼しない。descriptionだけ、似た名前、`group_id`の有無から能力を推測しない。
4. `status`、`search`、`upsert`、`purge`を別々に分類する。一致しない能力を利用可能とせず、catalogだけで実行時依存を確認済みにしない。
5. 入力なしのread-only `status`が検証済みprofileに一致し、現在呼べ、hostまたはMCP clientが5,000 ms以下とretry 0回を呼出し前に保証できる場合だけ、最大1回呼ぶ。短い上限はよい。保証できない場合は呼ばない。transport error、timeout、error payloadを失敗として扱う。
6. 次の報告を会話の先頭へ表示する。報告をファイル、ログ、設定、Git、`.intent/`、Graphitiへ永続化しない。

> この段階では同期しない。文書送信0件。外部変更0件。永続化なし。

続けて、4能力それぞれのsupport、state、reason、全体状態、正本のMarkdownと直接読める元資料を使う既存経路を示す。能力不足や失敗を成功と表示しない。接続先、credential、status payload、文書本文を表示しない。

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

- 検索、追加、更新、削除、probe writeを行わない。
- 文書、URL、path、group ID、credential、接続先、candidate、policy、contentを入力または外部送信に使わない。
- locator検査、payload検査、文書read、秘密検出をpreflightへ持ち込まない。
- status失敗後に別toolを試さず、自動retryしない。
- tool descriptionや未知toolから対応能力を補完しない。
- ローカルファイルまたは外部状態を変更しない。
