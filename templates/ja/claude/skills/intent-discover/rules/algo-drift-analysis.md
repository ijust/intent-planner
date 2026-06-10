# Algorithm: Drift Analysis

現状の実装/構造と、あるべき設計意図とのズレ（drift）を観測可能に捉える。`refactor` モードの discover フェーズで GORE-lite と併用し、L0–L4 のうち特に L3（振る舞い・設計意図）と現状の乖離を明らかにする。

## 手順

1. **現状を棚卸しする（入力）**
   - 対象リポジトリの構造・依存方向・主要な振る舞い、テストの有無を把握する。網羅は不要だが、**後段の Migration Slicing が実用的なスライスを切れる程度に drift を厚くする**こと（薄い棚卸しは薄い drift リストを生み、スライスが推測になる）。意図と突き合わせられる粒度を目安にする。
   - 暗黙の設計意図（GORE-lite で起こした L1–L3）を手元に置く。あるべき設計意図が現状から起こせない（仕様が完全に失われている）場合は、refactor ではなく `behavior-unknown` モードが適することがある。discover でその兆候が出たら mode の見直しを Open Questions に記す。

2. **Reflexion worksheet で突き合わせる**
   - 突き合わせには Software Reflexion Models（Murphy & Notkin）の構造を借りた軽量ワークシートを使う。主要コンポーネントを **1回の分析につき 5〜15 要素**に絞り（広く浅くではなく、重要箇所を狭く深く）、各要素について次を並べる:
     - **意図された責務・依存**（Intent 由来: 対応する L1 Desired Outcome / L2 Capability / L3 Behavioral・Architectural Intent）
     - **観測された責務・依存**（コード読解由来: import/参照関係・ディレクトリ構造・呼び出しの向きを読む程度で十分）と、その**証拠**（ファイル・コード箇所）
   - 各要素を **整合（convergence）/ 乖離（divergence）/ 欠落（absence: 意図にはあるが実装に見当たらない）** のいずれかに分類する（乖離=worksheet の分類。drift 類型の「逸脱」とは区別する）。
   - これにより drift リストは「気になることの列挙」ではなく、意図モデルとの関係で定義された差分リストになる。

3. **drift を列挙する**
   - worksheet の divergence / absence を drift として起こす。各 drift は「現状 → あるべき」の対で書き、**差分種別（divergence / absence）・証拠・確からしさ（証拠が直接的か、推測を含むか）**を付ける。憶測の原因論には踏み込まない。
   - 解釈として、逸脱（意図と反する設計）、腐敗（時間経過で崩れた境界・依存）、局所最適の蓄積（個別最適が全体意図を侵食）の種類を区別する。

4. **各 drift を parent intent へ分類する**
   - 各 drift が「どの Intent からの逸脱か」を特定し、対応する L1/L2/L3 に紐づける。
   - 紐づく Intent が曖昧・未確定なものは Open Questions へ送る。

## 規律

- **計画技法であって実行ではない**: drift を捉えるのは Intent の詰め方であり、ここでリファクタやコード変更は行わない。
- **事実と推測を分ける**: 観測した現状は事実として、原因・対応方針の推量は `Assumptions` に分離する。
- **未確定は Open Questions へ**: どの intent からの逸脱か判断できないものは、推測で埋めず Open Questions に書く。

## 出力

drift のリスト（現状 → あるべき、差分種別と逸脱の種類、証拠と確からしさ、対応する parent intent）。GORE-lite の `intent-tree.md` の L3 と Open Questions / Assumptions に反映（案として提示）する。
