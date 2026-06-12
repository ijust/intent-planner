# cc-sdd Export 下書き置き場

> `/intent-export-cc-sdd` が packet ごとの下書きをこの配下に書きます。この README 以外は Git 非追跡（ローカル専用）です。読み手は cc-sdd へ受け渡す利用者と、`/intent-writeback`・`/intent-status`・`/intent-validate` です。下書きの書式の正は export skill の rules（map-cc-sdd）にあり、ここに雛形は置きません。

## 構造

```
.intent/cc-sdd/
├── README.md          # この説明（Git 追跡対象）
└── <packetスラッグ>/   # /intent-export-cc-sdd が packet ごとに生成（非追跡）
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

ディレクトリ名（スラッグ）は packet 名から決定的に導出されます（規則・衝突時の扱いは map-cc-sdd 参照）。

## 3下書きの役割

- **requirements.md** — cc-sdd の `/kiro-spec-init` に渡す凝縮 Project Description。`## Source Packet`（packet 名の正確な転記）・`## Parent Intent`・`## Invariants` の見出しを必ず含みます。
- **design.md** — cc-sdd が design を生成する際の見落とし防止ヒント（箇条書き）。本体ではありません。
- **tasks.md** — 先頭に Intent 由来の制約（parent intent / invariant / Anti-direction）、続いて cc-sdd の tasks 生成チェック項目。

## Git 非追跡の方針

- packet ディレクトリ配下の下書きはローカル専用で Git に追跡されません（追跡対象はこの README のみ）。これにより、チームでのマージ衝突や上書きによる下書き喪失は設計上起きません。
- export の履歴は Git 共有される `.intent/export-log.md` に1 export = 1行で残ります。「現行 packet」の判定もこのログが正典です。
- 下書きは writeback 完了後も削除されず、過去 packet の書き戻し漏れの突合（export-log × 残存下書き × deltas.md）に使えます。
