# Constraint Surfacing（制約叩き台の候補提示）

同梱のドメイン定石カタログ（`.intent/constraint-starters.md`）を read-only で照合し、Anti-direction / Invariants の**叩き台候補**を提示する手順。`/intent-compass` の Compass 構築フェーズで、Anti-direction / Invariant の**導出の前段**として使う。利用者が自分で育てた制約（`.intent/constraint-library.md`）があれば同様に候補へ加える。

これは C2（局所最適の抑止＝Anti-direction/Invariant を compass に明示する器）の導出（影響リスト→Invariant 化・プレモータム→Anti-direction）を**置き換えない補助**である。既存の導出はそのまま行い、その前段に「文脈に合う定石の叩き台候補」を差し込むだけ。

## 規律（守ること）

- **提示は read-only の叩き台に留める。** 合致した定石を Anti-direction / Invariants へ**自動で書き込まない**。compass への転記は、利用者が採否を選んでから人の手で行う（利用者への確認は、このスキルが持つ確認手段で行う）。
- **押し付けない。** 文脈に合わない定石を提示しない。候補は絞り、停止や強制を伴わない。当てはまりが弱ければ黙る（誤検知より黙る側に倒す＝叩き台機能の信頼を保つ）。
- **照合は意味的に行う。** 定石の「適合する状況」を案件文脈に照らす読解で判断する。機械的な文字列スコアリング・正規表現一致に寄せない。
- **既存導出を置き換えない・二重化しない。** 影響リスト→Invariant 化・プレモータム→Anti-direction の手順はそのまま。本手順は候補の供給を前段に足すだけ。
- **カタログ不在なら沈黙する。** `.intent/constraint-starters.md` が不在のときは照合をスキップしてその旨を告げる（停止しない）。`.intent/constraint-library.md` も同様（不在ならスキップ）。
- **どのログにも記録しない。** 提示は read-only の助言に留め、記録を持たない。

## 手順

1. **カタログを読む**
   - `.intent/constraint-starters.md`（同梱の定石）と、あれば `.intent/constraint-library.md`（利用者が育てた制約）を read-only で読み、全定石（`## id:` 単位）を取得する。いずれも不在ならスキップして告げる（停止しない）。

2. **各定石の「適合する状況」を案件文脈と照合する**
   - 各定石の `適合する状況` を、いま書こうとしている compass の案件（題材・ドメイン・触る境界）に照らす。`適合する状況` は強い判定条件ではなく手がかりであり、当てはまりが弱ければその定石は出さない。
   - 照合に使うのは案件の文脈のみ。コード差分・実行時メトリクスは読まない。

3. **合致する定石を叩き台候補として提示する（書き込まない）**
   - 合致した定石の `叩き台`（Anti-direction 候補・Invariant 候補）を、利用者に候補として提示する。例:「この案件は `<id>`（<name>）に当てはまるかもしれません — 叩き台として <Anti-direction 候補> / <Invariant 候補> はいかがですか（採否はお任せします）」。
   - **compass へ自動で書き込まない。** 採用するかは利用者が判断し、採用したものだけを人の手で Anti-direction / Invariants へ取り込む。
   - 非該当の定石は提示しない。候補が多すぎないよう絞る。

4. **既存の導出へ進む**
   - 候補提示の後、既存の Anti-direction / Invariant 導出（影響リスト→Invariant 化・プレモータム→Anti-direction）を通常どおり行う。提示した候補のうち利用者が採用したものは、その導出の中で人の手で取り込まれる。

## discover との関係

- discover の地形診断レーン（`drift-terrain.md`）でも、`drift-watch: on` のとき同じカタログを薄く照合して早期に気づかせる。本手順（compass）が主接点であり、discover は補助。
