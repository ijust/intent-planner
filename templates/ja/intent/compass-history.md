# Compass History（退避された履歴）

> `/intent-writeback`・`/intent-improve` が、完結した機能の **機能固有のプレモータム逆算 Anti-direction ブロック**（`### <機能> 固有（プレモータム: …）`）を、`intent-compass.md` 本体から**退避（move）**します。読み手は人間で、必要なときにだけ参照します。
>
> **`compass-archive.md` とは用途が違います。** `compass-archive.md` は *superseded になった Decision Rules エントリ*を6欄のまま退避する専用ファイルです。このファイル `compass-history.md` は *完結機能のプレモータム逆算 Anti-direction*（と機能固有の補足ブロック）を退避します。両者を混ぜません。
>
> **これは退避先であって削除先ではありません。** 退避された内容は「その機能を開発したときに何を恐れたか」の監査証跡として grep できる形のまま残ります。`intent-compass.md` 本体は現役の North Star / Direction / 普遍 Anti-direction / 普遍 Invariants / Decision Rules の骨格だけに保ち、pull 規律の前提を回復します。
>
> **退避は move であって edit ではありません。** Anti-direction の番号・文面・意味を変えずにこのファイルへ移します。
>
> **退避規律（A19 の active 面/履歴分離と同型）**:
> - **何を**: 完結した機能の `### <機能> 固有（プレモータム: …）` Anti-direction ブロック（その機能の開発時の崩壊シナリオ逆算であり、開発完了後に現役で参照する価値が低いもの）。
> - **いつ**: その機能の `/intent-writeback` 完了時、または `/intent-improve` の再整合時。
> - **どう**: 本体から該当ブロックを切り取り、このファイルの末尾へ frontmatter スキーマタグ `status: archived` を付けて追記する（下記記法）。本体側からは除去する（move）。普遍 Anti-direction（全作業共通）・現役機能の Anti-direction は退避しない。
> - **退避先が無いとき**: このファイルが未作成・不在なら退避をスキップし作成を促す（履歴を消さず本体に残したまま告知する）。

## 退避記法（このファイルの末尾に追記する）

```
### <機能> 固有（プレモータム: …）   ← 退避元の見出しをそのまま保つ
> status: archived | archived_at: <ISO 8601> | from: intent-compass.md
（以下、退避元の Anti-direction 項目を番号・文面を変えずそのまま）
```

- `status: archived` で grep すれば退避済みだけを引ける。
- 退避元の内容は behavior-preserving に保つ（Anti-direction 番号・文面を変えない）。
