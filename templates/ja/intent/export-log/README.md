# export-log/（分割形の active 面）

export-log は **packet 由来**の記録なので、**packet 単位ファイル** `export-log/<packet-slug>.md` に分割して書く。別 packet が別ファイルを触るため末尾衝突が原理的に消える（cc-sdd / openspec の export が同一単一ファイルへ追記する共有衝突も解消する）。

- ここ（active 面）には現在参照する export 記録だけを薄く置く。
- 終端した（もう参照しない）エントリは `export-log/archive/<年>/` へ退避する。
- ファイル名の `<packet-slug>` は既存の packet スラッグ規則（`intent-packets/rules/packet-format.md`）を参照する。連番（`0001` 等の中央カウンタ）は使わない。
- **旧 `../export-log.md` は生成 active ミラーとして残す**: 読み手横断追随が完結するまで、書き手は毎 export で分割ファイルを `exported_at` 昇順に連結して `../export-log.md` を再生成する（派生・手編集しない）。これにより単一ファイルを読む既存経路が壊れない。

## feature 名の実線記録（表の下の追記行・任意）

分割ファイルは3列のテーブル（`| packet | exported_at | commit |`）に加えて、**表の下**に `- feature: <feature 名>（<記録日>）` の行を持つことがある。これは export 後に下流 spec ツールが生成した feature 名を記録し、packet → 生成 spec の対応を後から実線で辿れるようにするもの（下流 spec に packet 名が残る保証は無いため）。

- 書き手は export の受け渡し（`/kiro-spec-init` の起動）まで進んだときだけ書く。進まなかった・取得できなかったときは何も書かない（任意記録・止めない）。
- テーブル行ではないので、表を読む既存の読み手とミラー再生成には**不可視**（3列スキーマは変わらない）。
- 追記のみ（過去の行を書き換えない）。同じ feature 名の重複は書かない。feature 名が変わったときは行を足す。
- 書くのは feature 名（識別子）と日付だけ。機微な内容・詳細は書かない。

> この README は規約の**言い換え**であり、規約の単一正本は CONTRACT.md「append-only 記録の分割・archive 規約」。置き方の判断は CONTRACT を参照すること。

active には実エントリを置かず、エントリは export の書き手（intent-export-cc-sdd / intent-export-openspec）が分割形で生成する。
