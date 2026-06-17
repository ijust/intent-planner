# Milestones

> プロジェクトの節目イベント（「本番構成確定」「外部公開 API 化」等）を1行追記で記録します。書き手は利用者だけで、読み手は `/intent-improve`（各 event を Decision Rules の `Revisit when` と照合）と `/intent-status`（未消化 milestone の残課題表示）です。決定・学び・状態は持たず、節目イベントの記録専用です。

## 運用説明

- **append-only**: 行は追記のみです。過去の行を書き換えたり削除したりしません（世界線アンカーの非対称を生まないため）。
- **利用者が宣言的に記入する**: 節目イベントは利用者が手で記入します。このファイルは自動検出をしません（記録の主体は利用者です）。
- **読み手の参照**: `/intent-improve` が各 `event` を全 Decision Rule の `Revisit when` 欄と substring（部分文字列）照合し、合致した Rule を見直し再提案へ挙げます。`/intent-status` は記録済みだが対応する見直しが未処理の milestone を残課題として併記します。いずれも read-only の照合で、compass を自動書き換えしません。

## 記入の指針

- **event**: Decision Rule の `Revisit when` と substring 照合する自然文の文字列です。短すぎると過剰一致するため、何が確定した節目かが分かる十分に具体的な自然文を書いてください（例:「本番構成を AWS ECS に確定」）。
- **recorded_at**: ISO 8601（例: `2026-06-18`）で記入します。
- **note**: 任意の補足です（不要なら `-`）。

| event | recorded_at | note |
|---|---|---|
<!-- 記入例（このコメント行は実テーブルに含めません）:
| 本番構成を AWS ECS に確定 | 2026-06-18 | 開発合宿でインフラ方針を確定 |
-->
