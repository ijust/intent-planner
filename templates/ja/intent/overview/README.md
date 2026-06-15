# Intent Overview 通読ビュー置き場

> `/intent-overview` が `.intent/` の散在成果物を読み、通読・俯瞰用の派生ビューをこの配下に書きます。この README 以外は **Git 非追跡（ローカル専用）** です。ここに置かれるビューは **派生（derived）であり正本ではありません**。正本は `.intent/intent-tree.md` / `.intent/intent-compass.md` / `.intent/packets/` などの元ファイルのままで、本ビューはそれらを読み取り時点で映したスナップショットです。

## 構造

```
.intent/overview/
├── README.md     # この説明（Git 追跡対象）
└── overview.md   # /intent-overview が生成する通読ビュー本体（非追跡・全置換で再生成）
```

## このディレクトリの性質

- **派生・再生成可能**: `overview.md` は `/intent-overview` を実行するたびに最新の canonical 成果物から**全置換**で再生成されます。手で編集しても次回実行で上書きされます（編集禁止）。
- **正本ではない**: 設計意図の正本は元の `.intent/*.md` です。本ビューはそれらを集約・整形した読み取り用ビュー（materialized view）であり、ここを書き換えても正本には反映されません。二重正本化を避けるため、変更はすべて元ファイル側で行ってください。
- **Git 非追跡**: `overview.md` をはじめ、この README 以外はローカル専用で Git に追跡されません（追跡対象はこの README のみ）。これによりチームでのマージ衝突や上書きによる喪失は設計上起きません。
- **read-only な集約層**: `/intent-overview` は canonical を変更せず、逆算（`algo-intent-recovery`）・検査（`intent-validate`）・drift（drift-watch）の軸を**再実装せず読みに行く**だけの集約層です。必要な先行成果物が無いときはビューを書かず、先に実行すべきスキルを案内します。
