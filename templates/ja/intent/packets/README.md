# Packets 置き場

> この配下は packet（cc-sdd に渡す前の作業単位。Issue より上位・spec より手前の粒度）の置き場で、1 packet = 1 ファイルで管理します。書き手は `/intent-packets`・`/intent-writeback`・`/intent-improve` です。packet ファイルの形式・ID 規則・状態遷移の正本は intent-packets スキルの rules/packet-format.md にあり、ここに規範は置きません。

## 構造

```
.intent/packets/
├── README.md            # この説明
├── plan.md              # plan レベルの記録（Walking Skeleton / Recommended First Packet / Deferred）
├── index.md             # 生成物。active packet の一覧（手編集しない）
├── active/              # draft / active の packet（1 packet = 1 ファイル）
│   └── pkt-<YYYYMMDD>-<スラッグ>.md
└── archive/             # done / superseded の packet
    └── <年>/
        └── pkt-<YYYYMMDD>-<スラッグ>.md
```

`active/` と `archive/` はスキルが初回書き込み時に作成します（事前に手で作る必要はありません）。

## 状態遷移の要約

- packet の state は `draft → active → done` と遷移します。superseded は state ではなく、frontmatter の `superseded_by` に後継 packet_id を記入する別軸です。
- `draft | active` の packet は `active/` に、`done` または `superseded_by` 記入済みの packet は `archive/<年>/` に置かれます。
- done / superseded になった packet は archive へ移動します。削除はしません（移動のみ）。

## Git 追跡

`packets/` 配下全体（README / plan / index / active / archive）が Git 追跡対象です。packet の履歴を共有するため、変更はまとめてコミットする運用にしてください。
