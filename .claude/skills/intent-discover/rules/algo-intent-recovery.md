# Algorithm: Intent Recovery

意図を書かずに（vibe coding で）作られた既存コードから、事後的に intent を復元する技法。`refactor` モードの discover フェーズで GORE-lite と Drift Analysis の間に入る。Drift Analysis は「あるべき設計意図」を基準点に現状との差分を測るが、vibe coding されたコードはその基準点自体が存在しない。本技法はコードの観測事実から候補 intent を逆算し、Drift Analysis に渡せる基準点を作る。

## いつ使うか

- 既存コードが、明示的な設計意図・spec・設計ドキュメントなしに書かれている（vibe coding、prototype の本番化、退職者の遺産など）。
- GORE-lite で L0–L3 を起こそうとしても「あるべき姿」が人の頭にもドキュメントにも無く、コードからしか起こせない。
- 振る舞い自体は観測可能だが（→ そこは behavior-unknown ではない）、その振る舞いを生んだ**意図が不在**。

## 手順

入力＝意図不在の既存コード（構造・依存・主要な振る舞い）。出力＝逆算した候補 intent（L0–L3、すべて inferred）。

1. **コードから候補 intent を逆算する**
   - 構造・依存方向・主要なデータフロー・繰り返し現れるパターンから、「このコードは何を達成しようとしているように見えるか」を L1（成果）/ L2（能力）/ L3（振る舞い・設計意図）として起こす。
   - これは観測されたコードからの**推測**であり、作者の真の意図ではない。

2. **復元した intent を必ず inferred として置く**
   - 逆算した L0–L3 は canonical（確定）ではなく **inferred（推測 = Assumptions）** に置く。vibe coding では「たまたまそう書いた」と「そう設計した」の区別がコードに残っていないため、確定と混ぜると捏造した意図を事実として扱う罠に落ちる。
   - 復元の根拠（どのコード観測から起こしたか）を各 inferred intent に併記する。

3. **意図的か偶発かを仕分け、確証は人へ差し戻す**
   - 復元した各 intent について「設計判断の結果」か「偶発・成り行き」かを仕分ける。判断できないものは推測で確定させず **Open Questions** へ送り、人間の確認を仰ぐ。
   - 人間が確認・追認した intent のみ、後段で canonical に昇格してよい。

4. **Drift Analysis へ基準点として渡す**
   - 復元した（inferred な）候補 intent を、後続の Drift Analysis の「あるべき設計意図」側の入力にする。これにより Drift Analysis は「復元した意図 → 現状コード」の drift を測れるようになる。
   - 復元 intent が薄いと drift も薄くなるため、Drift Analysis が実用的な drift を出せる程度に L1–L3 を起こす。

## 規律

- **復元であって正当化ではない**: コードがそう書かれている事実から intent を起こすのであって、「既存コードは正しい」と追認するのではない。誤った設計・不要な複雑さも intent 候補として起こし、Drift / Open Questions で扱う。
- **必ず inferred**: 復元 intent を canonical と混ぜない。人間の追認なしに確定へ昇格させない（GORE-lite の canonical/inferred 分離を厳守）。
- **計画技法であって実行ではない**: ここでコードを変更しない。

## 出力

逆算した候補 intent（L0–L3、すべて inferred、復元根拠と意図的/偶発の仕分け付き）。`intent-tree.md` の該当 L レベルと Assumptions / Open Questions に反映（案として提示）し、Drift Analysis の入力にする。
