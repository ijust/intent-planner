# Spec 取り込み派生ビュー置き場

> `/intent-from-spec` が入力された自然言語の仕様書を読み、抽出した意図候補・ギャップを転記しやすい派生ビューとしてこの配下に書きます。この README 以外は **Git 非追跡（ローカル専用）** です。ここに置かれるビューは **派生（derived）であり正本ではありません**。正本は `.intent/intent-tree.md` / `.intent/intent-compass.md` などの canonical なファイルのままで、本ビューは入力仕様書を読み取り時点で映したスナップショット（候補・仮説）です。

## 構造

```
.intent/spec-ingest/
├── README.md         # この説明（Git 追跡対象）
└── spec-ingest.md    # /intent-from-spec が生成する取り込みビュー本体（非追跡・全置換で再生成）
```

## このディレクトリの性質

- **派生・再生成可能**: `spec-ingest.md` は `/intent-from-spec` を実行するたびに入力仕様書から**全置換**で再生成されます。手で編集しても次回実行で上書きされます（編集禁止）。
- **正本ではない**: 設計意図の正本は canonical な `.intent/intent-tree.md` / `.intent/intent-compass.md` です。本ビューは仕様書から抽出した**候補・仮説（Assumptions）**であり、ここを書き換えても canonical には反映されません。採用したい項目は、利用者が確認のうえ discover / compass の対話へ**手で転記**してください（自動の継ぎ目はありません）。
- **Git 非追跡**: `spec-ingest.md` をはじめ、この README 以外はローカル専用で Git に追跡されません（追跡対象はこの README のみ）。これによりチームでのマージ衝突や上書きによる喪失は設計上起きません。
- **read-only な抽出層 + 限定 Write**: `/intent-from-spec` は入力された仕様書を変更せず（読み取りのみ）、canonical も変更しません。書込み先はこの `.intent/spec-ingest/` 配下に限定されます。
