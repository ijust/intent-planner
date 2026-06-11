# Intent Deltas

> `/intent-writeback` が記録し、`/intent-status` と `/intent-improve` が参照します。canonical 成果物（intent-tree.md / intent-compass.md / packets.md）は、この delta 経由でのみ事後更新されます。

## 運用説明

- 書き戻しは二段階です: `/intent-writeback` はまず学びをここに delta として記録し（canonical は直接書き換えない）、ユーザーが承認した項目だけを canonical 成果物へ昇格させます。
- 1 packet の1回の書き戻し = 1 エントリ。同一 packet の再書き戻し（再 export・再実装後）は新エントリとして追記します（履歴保持）。「対応 delta の有無」の機械判定は初回サイクルのみ有効で、2巡目以降の書き戻し要否は過去エントリ一覧を見てユーザーが判断します。
- 既知の制約（単一スロット）: `.intent/cc-sdd/` の下書きは最新1 packet 分のみ保持されます（export ごとに上書き）。過去の export 履歴は `.intent/export-log.md` に記録されており（export ごとに packet 名・日時・コミットを1行追記）、過去に export した packet の書き戻し漏れは export-log.md とこのファイルの突合で照合します。

## 状態の意味論

- `pending`: 記録済みで未昇格。
- `promoted` / `closed` は終端状態です。1件以上を承認して canonical へ反映 → `promoted`、全項目を「却下」で見送り → `closed`。
- 見送り項目には「却下（再提案不要） | 保留（次回 writeback で再提案）」の2値タグが必須です。保留の項目だけが次回 `/intent-writeback` での再提案対象（および `/intent-improve` の確認対象）になり、タグの確定更新（昇格 / 却下確定 / 継続保留）は `/intent-writeback` が行います。
- `[question]` タグの学びは intent-tree.md の Open Questions へ転記した時点で消化済みです（転記先を昇格記録の反映先に記録します）。

## Delta: <packet-name> — <ISO 8601 日付>

- Status: pending | promoted (<昇格日>) | closed (<クローズ日>)
- Source: .intent/cc-sdd/ の Source Packet | ユーザー指定

### 学び

- [decision] <新しい決定>
- [invariant-violation] <発見された invariant 違反>
- [implicit-behavior] <意図に書かれていなかった暗黙挙動>
- [deferred-resolved] <解消された Deferred>
- [question] <新たな未解決 Question>

### 昇格記録（promoted / closed 時）

- 反映先: intent-compass.md Decision Rules 新エントリ（旧エントリに superseded 注記）/ intent-tree.md L3 / packets.md <packet>
- 見送り: <昇格しなかった学び> — 却下（再提案不要） | 保留（次回 writeback で再提案）
