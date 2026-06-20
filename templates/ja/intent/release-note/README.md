# release note 出力派生ビュー置き場

> `/intent-release-note`（後続で付加される skill）が git のコミット履歴を **read-only で読み**、意図（packet name / parent intent / deltas など）と照合して意味を厚くした release note を、format（changelog 風 / github-releases 風）に従ってこの配下に書きます。この README 以外は **Git 非追跡（ローカル専用）** です。ここに置かれるビューは **派生（derived）であり正本ではありません**。正本は git 履歴と canonical な意図ファイルのままで、本ビューは生成時点での射影（スナップショット）です。

## 構造

```
.intent/release-note/
├── README.md            # この説明（Git 追跡対象）
└── release-note.md      # /intent-release-note が生成する release note 本体（非追跡・全置換で再生成）
```

## このディレクトリの性質

- **派生・再生成可能**: `release-note.md` は `/intent-release-note` を実行するたびに git 履歴と canonical な意図から**全置換**で再生成されます。手で編集しても次回実行で上書きされます（編集禁止）。
- **正本ではない**: 何が変わったかの正本は git のコミット履歴であり、なぜ変わったかの正本は canonical な `.intent/intent-tree.md` / `.intent/intent-compass.md` / packet です。本ビューはそれらを外向きに射影した**読み物（release note）**であり、ここを書き換えても git 履歴や canonical には反映されません。release note を変えたい場合は、コミットや意図そのものを更新し、再度 `/intent-release-note` を実行してください（ビューから git / canonical への自動の継ぎ目はありません）。
- **Git 非追跡**: `release-note.md` をはじめ、この README 以外はローカル専用で Git に追跡されません（追跡対象はこの README のみ）。これによりチームでのマージ衝突や上書きによる喪失は設計上起きません。
- **read-only な射影層 + 限定 Write**: `/intent-release-note` は git 履歴を変更せず（読み取りのみ。commit / tag / push をしません）、canonical な意図も変更しません。生成物の書込み先はこの `.intent/release-note/` 配下に限定されます。
