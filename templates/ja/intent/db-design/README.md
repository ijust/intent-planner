# DB 設計の叩き台 出力派生ビュー置き場

> `/intent-db-design` が canonical な意図（`.intent/intent-compass.md` の Invariants/Anti-direction）と対象 packet・既存スキーマ/migration を read-only で読み、テーブル定義・制約・インデックス・命名を含む **DB 設計の叩き台**としてこの配下に書きます。この README 以外は **Git 非追跡（ローカル専用）** です。ここに置かれるビューは **派生（derived）であり正本ではありません**。正本は canonical な意図ファイルのままで、本ビューは生成時点での射影（スナップショット）です。

## 構造

```
.intent/db-design/
├── README.md                 # この説明（Git 追跡対象）
└── <packetスラッグ>/
    └── db-design.md          # /intent-db-design が生成する DB 設計の叩き台本体（非追跡・全置換で再生成）
```

## このディレクトリの性質

- **派生・再生成可能**: `db-design.md` は `/intent-db-design` を実行するたびに canonical な意図・対象 packet・既存スキーマから**全置換**で再生成されます。手で編集しても次回実行で上書きされます（編集禁止）。
- **要件ではなく設計の叩き台**: ここに置かれるのは **DB 設計の叩き台**であって要件ではありません。cc-sdd / OpenSpec の export 物（requirements）には混ぜません。実装の確定仕様ではなく、kiro design フェーズで DB 記述が「想像で」薄く埋まるのを防ぐための土台です。
- **正本ではない**: 設計意図の正本は canonical な `.intent/intent-tree.md` / `.intent/intent-compass.md` と packet です。本ビューは意図と既存スキーマを射影した**読み物**であり、ここを書き換えても canonical や既存スキーマには反映されません。設計を変えたい場合は、利用者が discover / compass / packets の対話へ戻って意図を更新し、再度 `/intent-db-design` を実行してください（ビューから canonical への自動の継ぎ目はありません）。
- **Git 非追跡**: `db-design.md` をはじめ、この README 以外はローカル専用で Git に追跡されません（追跡対象はこの README のみ）。これによりチームでのマージ衝突や上書きによる喪失は設計上起きません。
- **read-only な射影層 + 限定 Write**: `/intent-db-design` は canonical な意図・既存スキーマを変更せず（読み取りのみ）、生成物の書込み先はこの `.intent/db-design/` 配下に限定されます。
