# Constraint Starters — code / テスト・検証可能性

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: テスト入力の選び方、期待結果を正誤判定する根拠、テスト群そのものの欠陥検出力。`領域: code`（開発プロセス側）に属し、テスト方針・受入条件・回帰検査を設計または見直す案件に当てます。
>
> **既存領域との棲み分け**: `current-time-injectable-clock` は非決定的な現在時刻を制御する実装境界、`state-machine-path-and-failure-testing` は状態遷移の代表経路と失敗経路を扱います。本領域は、それら個別対象を含むテスト全般について、入力領域の切り方、一般化した性質、テスト群の欠陥検出力を扱います。共通のコード網羅率やミューテーションスコアを合格条件にはしません。

## id: specification-partitions-boundaries-oracle

- name: 仕様から同値クラス・境界・無効入力を選び、期待結果の判定根拠を明示する
- 領域: code
- 適合する状況: 入力範囲、区分、上限・下限、形式、事前条件が仕様や契約に現れる機能。代表例だけのテストが正常系へ偏っている、またはテスト結果を何と照合すれば正しいか曖昧な案件。
- 叩き台:
  - Anti-direction: 実装コードの分岐をそのまま写してテストケースを作り、同じ誤解をテスト側にも複製しない。正常な代表値だけで済ませず、境界の直前・境界上・直後、無効な区分を落とさない。実行結果が得られただけで合否を決めず、期待結果の根拠が無い状態を成功扱いしない。
  - Invariant: 要求、契約、モデル等の実装から独立した根拠から入力領域を同じ扱いになる区分へ分け、各区分の代表値と境界付近、無効入力を選ぶ。各検査には、期待値、判定規則、参照モデル等の観測結果を正誤判定できるテストオラクルを結び付ける。オラクルが判定できない結果は、合格ではなく判定不能として扱う。
- 出典: IEEE Computer Society, *Guide to the Software Engineering Body of Knowledge (SWEBOK Guide), Version 4.0a*, Software Testing — Specification-Based Techniques / Equivalence Partitioning / Boundary Value Analysis / The Oracle Problem（https://ieeecs-media.computer.org/media/education/swebok/swebok-v4.pdf・取得 2026-08-05）／ISO/IEC/IEEE 29119 series overview, Parts 2 and 4（https://committee.iso.org/sites/jtc1sc7/home/projects/flagship-standards/isoiecieee-29119-series.html・取得 2026-08-05）

## id: property-based-testing-when-properties-exist

- name: 一般化できる性質と入力生成器があるとき、具体例を補うプロパティベーステストを使う
- 領域: code
- 適合する状況: シリアライズと復元、並べ替え、正規化、可逆変換、代数的演算等、広い入力集合に対して成り立つ性質を記述できる機能。少数の具体例では入力の組合せを十分に探索しにくい案件。
- 叩き台:
  - Anti-direction: 「大量の入力を生成した」ことだけを品質の根拠にしない。意味の弱い性質、実際には到達しない入力だけを作る生成器、失敗を再現できない出力で具体例テストを置き換えない。一般化できる性質が無い対象へ無理に適用しない。
  - Invariant: 要求から意味のある普遍的な性質を記述し、その事前条件を満たす入力生成器と、失敗入力を小さくして再現しやすくする縮小方法を用意する。見つかった最小反例は回帰用の具体例として残す。既知の重要例や利用者シナリオは例示テストで保持し、生成テストと相互補完させる。
- 出典: Koen Claessen and John Hughes, “QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs,” *ICFP 2000*（https://doi.org/10.1145/351240.351266・取得 2026-08-05）／John Hughes, *Software Testing with QuickCheck*（Chalmers University of Technology doctoral thesis, properties, generators, shrinking, and stated limitations・https://research.chalmers.se/publication/136076/file/136076_Fulltext.pdf・取得 2026-08-05）

## id: selective-mutation-testing-for-suite-efficacy

- name: 重要または有効性が疑わしいテスト群に、選択的なミューテーションテストを使う
- 領域: code
- 適合する状況: コード網羅はあるのに不具合を逃す、重要な条件判定に対する assertion の強さが不明、または変更箇所のテスト群が実際に誤りを検出できるか確かめたい案件。実行費用と調査時間を限定できるとき。
- 叩き台:
  - Anti-direction: コードを通過したという網羅情報だけで、結果が検証されているとみなさない。全コードへ無差別に変異を掛け、同値な変異や大量の結果の調査で開発を停滞させない。共通のミューテーションスコアを品質保証やリリース条件にしない。
  - Invariant: 重要度が高い、変更された、またはテストの有効性が疑わしい範囲を選び、演算子や条件を小さく変えたとき既存テストが失敗するか確認する。生き残った変異は、テスト不足、弱い assertion、到達不能、同値変異のいずれかとして調査し、意味のある不足だけを改善する。結果はテスト群を診断する手掛かりとして扱い、単一スコアへ還元しない。
- 出典: Mike Papadakis et al., “Mutation Testing Advances: An Analysis and Survey,” *Advances in Computers*, 2019（https://doi.org/10.1016/bs.adcom.2018.03.015・取得 2026-08-05）／Goran Petrović et al., “State of Mutation Testing at Google,” *ICSE-SEIP 2018*（計算費用・開発者の注意量を抑える選択的運用と、コード網羅だけでは assertion の有効性を示せない点・https://research.google.com/pubs/archive/46584.pdf・取得 2026-08-05）
