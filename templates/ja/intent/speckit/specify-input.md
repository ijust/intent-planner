# Spec Kit Specify Input 下書きテンプレ

> `/intent-export-speckit` が packet ごとの下書きをこの書式で `.intent/speckit/<packetスラッグ>/specify-input.md` に書き出します。このファイルは出力の書式テンプレ（見出し + 用途説明）であり、ここに具体的な内容は書きません。マッピングの正は export skill の rule（map-speckit）にあります。読み手は Spec Kit へ受け渡す利用者と、続行時に起動される `/speckit.specify` です。冒頭からそのまま `/speckit.specify` の引数に使える機能記述を導出できる形にします。

## 機能記述（specify 投入本文）

`/speckit.specify` に渡す機能の自然言語記述。誰の課題か・現状・何を変えたいか（In/Out scope）を、Spec Kit の spec 生成が引き継げる形で述べる。冒頭からそのまま引数化できる最小かつ常に有効なテキストにする。

## Parent Intent

この packet が仕える上位の狙い（L0/L1/L2/L3）。Spec Kit が生成する spec に intent が流れるよう明示する。

## Invariants

守るべき制約（packet 固有 invariant + compass のプロジェクト普遍 Invariant）。normative（SHALL / MUST）で表現できるものはその形で残す。
