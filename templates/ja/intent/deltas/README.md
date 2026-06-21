# deltas/（分割形の active 面）

deltas は **packet 由来**の記録なので、**packet 単位ファイル** `deltas/<packet-slug>.md` に分割して書く。別 packet が別ファイルを触るため末尾衝突が原理的に消える。

- ここ（active 面）には現在参照する delta だけを薄く置く。
- 終端した（もう更新されない）エントリは `deltas/archive/<年>/` へ退避する。
- ファイル名の `<packet-slug>` は既存の packet スラッグ規則（`intent-packets/rules/packet-format.md`）を参照する。連番（`0001` 等の中央カウンタ）は使わない。

> この README は規約の**言い換え**であり、規約の単一正本は CONTRACT.md「append-only 記録の分割・archive 規約」。置き方の判断は CONTRACT を参照すること。

既存の単一ファイル `../deltas.md` は残してよい（新分割形と共存）。active には実エントリを置かず、エントリは writeback/discover が分割形で生成する。
