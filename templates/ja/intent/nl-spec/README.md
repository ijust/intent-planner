# 自然言語 Spec 出力派生ビュー置き場

> `/intent-to-spec` が canonical な意図（`.intent/intent-tree.md` / `.intent/intent-compass.md` など）と packet を読み、外向きに人間可読な自然言語の仕様書としてこの配下に書きます。この README 以外は **Git 非追跡（ローカル専用）** です。ここに置かれるビューは **派生（derived）であり正本ではありません**。正本は canonical な意図ファイルのままで、本ビューは生成時点での射影（スナップショット）です。

## 構造

```
.intent/nl-spec/
├── README.md         # この説明（Git 追跡対象）
└── nl-spec.md        # /intent-to-spec が生成する自然言語 Spec 本体（非追跡・全置換で再生成）
```

## このディレクトリの性質

- **派生・再生成可能**: `nl-spec.md` は `/intent-to-spec` を実行するたびに canonical な意図から**全置換**で再生成されます。手で編集しても次回実行で上書きされます（編集禁止）。
- **正本ではない**: 設計意図の正本は canonical な `.intent/intent-tree.md` / `.intent/intent-compass.md` です。本ビューは意図を外向きに射影した**読み物（自然言語 Spec）**であり、ここを書き換えても canonical には反映されません。仕様を変えたい場合は、利用者が discover / compass の対話へ戻って意図を更新し、再度 `/intent-to-spec` を実行してください（ビューから canonical への自動の継ぎ目はありません）。
- **Git 非追跡**: `nl-spec.md` をはじめ、この README 以外はローカル専用で Git に追跡されません（追跡対象はこの README のみ）。これによりチームでのマージ衝突や上書きによる喪失は設計上起きません。
- **read-only な射影層 + 限定 Write**: `/intent-to-spec` は canonical な意図を変更せず（読み取りのみ）、生成物の書込み先はこの `.intent/nl-spec/` 配下に限定されます。
