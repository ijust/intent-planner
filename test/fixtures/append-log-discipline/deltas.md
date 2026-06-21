# Intent Deltas

> characterization fixture（単一ファイル形式・移行前）。`templates/ja/intent/deltas.md` の実書式を写したもの。

## 運用説明

- 1 packet の1回の書き戻し = 1 エントリ。同一 packet の再書き戻しは新エントリとして追記します（履歴保持）。

## 状態の意味論

- `pending`: 記録済みで未昇格。
- `promoted` / `closed` は終端状態です。
- 見送り項目には「却下（再提案不要） | 保留（次回 writeback で再提案）」の2値タグが必須です。

## Delta: export-route-by-case — 2026-06-18

- Status: promoted (2026-06-19)
- Source: export-log.md 最新行

### 学び

- [decision] target format の正本不在を mode.local.md の任意 format 行で解く
- [implicit-behavior] openspec 案件は openspec を促す（warn-only / gate でない）

### 昇格記録（promoted / closed 時）

- 反映先: intent-compass.md Decision Rules 新エントリ
- 見送り: format を steering へ持たせる案 — 却下（再提案不要）
- 見送り: discover に format 書き手を兼ねさせる案の細部 — 保留（次回 writeback で再提案）
