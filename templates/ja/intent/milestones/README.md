# milestones/（分割形の active 面）

milestones は **事象由来**の記録なので、**日付+slug 単位ファイル** `milestones/<date>-<event-slug>.md` に分割して書く。別事象が別ファイルを触るため末尾衝突が原理的に消える。

- ここ（active 面）には現在参照する節目イベントだけを薄く置く。
- 終端した（もう参照しない）エントリは `milestones/archive/<年>/` へ退避する。
- ファイル名の `<event-slug>` は event 自然文を既存のスラッグ規則（`intent-packets/rules/packet-format.md`）で導出する。`<date>` は recorded_at。連番（`0001` 等の中央カウンタ）は使わない。
- **手動記入**: milestones は利用者が宣言的に記入する記録です。分割形では、節目イベントごとに `milestones/<date>-<event-slug>.md` を1ファイル作って `| event | recorded_at | note |` の1行を書きます（event 自然文はそのまま保持＝improve の Revisit 照合・status の未消化検出が読む）。

> この README は規約の**言い換え**であり、規約の単一正本は CONTRACT.md「append-only 記録の分割・archive 規約」。置き方の判断は CONTRACT を参照すること。
