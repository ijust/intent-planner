# packets/journeys — ジャーニー（複数 packet を束ねる単位）の置き場

このディレクトリは **ジャーニー**（複数の作業単位＝packet にまたがる1つの変更を束ねる単位。構成 packet の一覧・工程の順序・複数 packet が共同で守る契約・完了の判定をまとめて指す）の正本を入れる置き場です（journey-formalize・INV103・DR200–203）。

```
.intent/packets/journeys/
  README.md            ← このファイル（規約とスキーマの正本・git 追跡）
  <スラッグ>.md         ← 1ジャーニー = 1ファイル（git 追跡・チーム共有の計画物）
  archive/<年>/         ← lifecycle: archived の退避先（packet の archive と同型・削除しない）
```

## ジャーニーは任意の仕組みです（INV103）

- **作るのは複数 packet 案件のときだけ**です。packet が1つで足りる案件には作りません（数合わせをしない）。
- **このディレクトリが無い・空でも、すべてのスキルは従来どおり動きます**（`.intent/packets/plan.md` 経路の読み取りは恒久に残ります）。ジャーニーの有無で読み書きの可否は変わりません（gate・ロック・自動判定を持ちません）。

## frontmatter スキーマ（7キー固定）

```yaml
---
journey_id: jny-20260717-認証刷新-a1b2  # 不変。jny-<YYYYMMDD>-<スラッグ>-<rand>（packet ID 規則と同型・rand はシェル生成4文字）
name: "認証刷新"                        # ジャーニー名の正本。ファイル名 <スラッグ>.md はこの name から導出（スラッグ規則は intent-packets/rules/packet-format.md を参照）
lifecycle: active                       # active | archived。人が閉じる状態だけを持つ（進捗の state は持たない＝下記）
packets: [pkt-20260717-xxxx-a1b2]       # 構成 packet の packet_id の列挙（journey→packet の一方向参照）
created_at: 2026-07-17T00:00:00Z        # 起案日時（ISO 8601・シェルの date で取得）
updated_at: 2026-07-17T00:00:00Z        # 最終更新時点（新規作成時は created_at と同値・無変更で打刻しない）
summary: "一行要約"                     # 一覧表示の源
---
```

- **必須はこの7キーだけ**です。これ以上の必須項目を足しません（記入が重いと使われなくなります）。それ以外の情報（工程計画・共有契約・統合時の検査・後回しの記録など）は**本文の自由記述**で持ちます（見出しの形式は固定しません）。
- **進捗・完了の状態は frontmatter に持ちません（DR200）**。進捗は構成 packet の `state`（各 packet ファイルの frontmatter が正本）から**毎回導出**します。同じ情報を二か所に持つと食い違いが生まれるためです。完了の観測は「構成 packet がすべて done ＋ 統合時の検査が green」を**人が確認して** `lifecycle: archived` を記入し、`archive/<年>/` へ移します（機械は自動で閉じません）。
- **参照は journey→packet の一方向だけです（DR203）**。packet 側の frontmatter（12キー固定）へジャーニーのキーを足しません。packet からジャーニーへの逆引きは、このディレクトリの grep で行います。
- `packets` に列挙された packet_id が実在しない場合、読み手は「見つからない」と明示して飛ばします（推測で紐づけません）。

## 書き手と読み手

- **書き手は `/intent-packets` です**（複数 packet 案件で、利用者の承認を得てから起案・更新します。手順は `intent-packets/rules/journey-plan.md`）。人が直接編集しても構いません（plain Markdown です）。
- **読み手**（`/intent-status` / `/intent-overview` / `/intent-validate` 等）は read-only で読みます。読み手の契約は `skills/CONTRACT.md` の「ジャーニーの読み取り契約」が正本です。
- 数値スコア・日付の見積もり・進捗率は持ち込みません（工程は順序と依存だけで表します）。
