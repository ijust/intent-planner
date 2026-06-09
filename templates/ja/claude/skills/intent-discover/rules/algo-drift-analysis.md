# Algorithm: Drift Analysis

現状の実装/構造と、あるべき設計意図とのズレ（drift）を観測可能に捉える。`refactor` モードの discover フェーズで GORE-lite と併用し、L0–L4 のうち特に L3（振る舞い・設計意図）と現状の乖離を明らかにする。

## 手順

1. **現状を軽く棚卸しする（入力）**
   - 対象リポジトリの構造・依存方向・主要な振る舞い、テストの有無をざっと把握する。網羅ではなく、意図と突き合わせられる粒度で十分。
   - 暗黙の設計意図（GORE-lite で起こした L1–L3）を手元に置く。

2. **あるべき設計意図と突き合わせる**
   - 現状の各観測を、対応する Intent（L1 Desired Outcome / L2 Capability / L3 Behavioral・Architectural Intent）と照合する。
   - 「今こうなっている」と「本来こうあるべき」の差分を、事実として並べる。

3. **drift を列挙する**
   - 逸脱（意図と反する設計）、腐敗（時間経過で崩れた境界・依存）、局所最適の蓄積（個別最適が全体意図を侵食）を種類として区別する。
   - 各 drift は「現状 → あるべき」の対で書く。憶測の原因論には踏み込まない。

4. **各 drift を parent intent へ分類する**
   - 各 drift が「どの Intent からの逸脱か」を特定し、対応する L1/L2/L3 に紐づける。
   - 紐づく Intent が曖昧・未確定なものは Open Questions へ送る。

## 規律

- **計画技法であって実行ではない**: drift を捉えるのは Intent の詰め方であり、ここでリファクタやコード変更は行わない。
- **事実と推測を分ける**: 観測した現状は事実として、原因・対応方針の推量は `Assumptions` に分離する。
- **未確定は Open Questions へ**: どの intent からの逸脱か判断できないものは、推測で埋めず Open Questions に書く。

## 出力

drift のリスト（現状 → あるべき、逸脱の種類、対応する parent intent）。GORE-lite の `intent-tree.md` の L3 と Open Questions / Assumptions に反映（案として提示）する。
