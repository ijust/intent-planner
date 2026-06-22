# compass-archive/（分割形）

compass-archive は superseded になった Decision Rule を退避する記録なので、**退避された Decision Rule の rule 単位ファイル** `compass-archive/<rule-slug>.md` に分割して書く。同一 rule の再 supersede は同じファイルに集まる（rule が自然キー）。

- ファイル名の `<rule-slug>` は退避された Decision Rule の識別子を既存のスラッグ規則（`intent-packets/rules/packet-format.md`）で導出する。連番（`0001` 等の中央カウンタ）は使わない。
- 退避は writeback / improve が Decision Rules を supersede したときに行う。**6欄（Context / Decision / Why / Alternatives considered / Consequences / Revisit when）+ 後継参照はそのまま（byte 不変）で move する**（要約・改変しない＝記録の中身不可侵）。
- このファイル群自体が archive 役なので、`archive/` サブディレクトリは年単位の更なる退避先（必要時）。

> この README は規約の**言い換え**であり、規約の単一正本は CONTRACT.md「append-only 記録の分割・archive 規約」。置き方の判断は CONTRACT を参照すること。
