# drift-log/（分割形の active 面）

drift-log は **事象由来**の記録なので、**日付+slug 単位ファイル** `drift-log/<date>-<slug>.md` に分割して書く。別事象が別ファイルを触るため末尾衝突が原理的に消える。

- ここ（active 面）には現在参照する事象だけを薄く置く。
- 終端した（もう更新されない）エントリは `drift-log/archive/<年>/` へ退避する。
- ファイル名の `<slug>` は既存のスラッグ規則（`intent-packets/rules/packet-format.md`）を参照する。連番（`0001` 等の中央カウンタ）は使わない。

> この README は規約の**言い換え**であり、規約の単一正本は CONTRACT.md「append-only 記録の分割・archive 規約」。置き方の判断は CONTRACT を参照すること。

既存の単一ファイル `../drift-log.md` は残してよい（新分割形と共存）。9キースキーマ（記録の中身）は変えない。active には実エントリを置かず、エントリは drift 記録の書き手が分割形で生成する。
