# 実装時の境界付き自律契約

この文書は、実装・export・writeback のときだけ JIT で読む短い共通契約です。目的は AI の手段を細かく指定することではなく、合意済みの設計境界を越える変更だけを人の判断へ上げることです。

## 実装開始時の重要判断確認

direct を選ぶ前と、packet または実装から始まるセッションでは、実装開始時に確認します。対象 packet と作業に関係する重要判断を読み、未決なら暫定回答案・理由・推奨を変える条件を示します。利用者の決定・今回の範囲外・範囲限定の明示続行のいずれかを得るまで、影響範囲だけを進めません。

明示続行は未決のまま保持し、許可された項目と範囲に限って使います。重要判断ではない Open Question は、それだけを実装の停止理由にしません。

## 拘束力

既存成果物の置き場を次の4段として読みます。全項目へ新しいラベルを追加しません。

| 強さ | 既存の置き場 | 扱い |
|---|---|---|
| Invariant | Compass / packet の Safety | 違反不可。前提変更時は canonical の Invariant を明示改訂してから再開 |
| Scope / Acceptance | packet の Scope / Expected Behavior / Validation | 今回の成果物に必須。越境・未達は人の判断が必要 |
| Decision | Compass の Decision Rule / packet の Decisions | 現在の設計基準。別案への変更は人の承認が必要 |
| Preference / Heuristic | 参考規約 / Agent-discretion / 候補 | 非拘束。境界内では AI が選び、確認を増やさない |

拘束力が読み取れない情報は、強い規則へ推測で昇格させず「不明」として人へ確認します。
関係する Anti-direction も実装境界として照合し、superseded と明記された Decision は現行基準から外します。コードの現実と intent の差異は黙って intent に合わせず、`/intent-writeback` の delta として扱います。

## JIT 入力の分け方

- **確定材料**: 対象 packet の Safety / Invariants、Scope、Expected Behavior、Validation、Human-fixed の Decisions と、それらに関係する active な Invariant / Decision Rule。今回の実装境界と受入に必要な材料として読みます。
- **実装時の再確認候補**: 対象 packet の `## Decisions` 内の Agent-discretion で、未定の理由と同一項目の `Revisit when` を持つものだけ。全 Decision Rule の `Revisit when` を収集しません。候補自体は非拘束の探索の手がかりです。現実化しても境界内なら確認を増やさず進め、境界を越えるときだけ下の判断へつなぎます。
- **明示的に読まない情報**: 無関係な Tree / Compass / archive の全文と他 packet の本文。必要な単一参照は読めますが、抜け漏れ対策として全量に戻しません。再確認候補がない packet では、追加の入力や出力を増やしません。

### 関係判断の JIT pull

分割 canonical があるときは、派生 index で status が `active` **かつ**（案件の area または impact に関係する **または** area が `always`）候補だけを選び、対象記号の `## Law` だけを読みます。area が `always` でも、`superseded` または archive 済みなら選びません。分割収納または対象記号がなければ旧形式の Intent Compass へ恒久 fallback します。この fallback に削除期限を設けず、既存データの自動移行・上書き・全件再分類は行いません。

候補を次の3結果へ振り分けます。

| 結果 | 条件 | 読み手の扱い |
|---|---|---|
| `pull` | status が `active` **かつ**（案件の area または impact に関係する **または** area が `always`） | Law と対応する `Revisit when` を今回の JIT 入力に含める |
| `exclude` | status が `active` ではない（area が `always` の `superseded` / archive 済みを含む）、案件と無関係、または前提不成立 | 現行の実装前関門に含めない。原本と履歴は変更しない |
| `confirm` | status、area、impact、relevance のいずれかが不足・曖昧で判定不能 | 値を推測せず、読めた根拠と関係候補を提示して人の確認へ送る |

5つの基準ケースは、active で関係あり=`pull`、active で無関係=`exclude`、superseded=`exclude`、`Revisit when` が成立した active で関係あり=`pull` のまま人主導の見直しへ接続、relevance 不明=`confirm` とします。`Revisit when` の成立だけで判断を自動除外・supersede しません。

area が `always` の active 判断は選別から落としません。`confirm` は黙った除外ではなく、人が確認するまで未確認の候補として保ちます。Preference / Heuristic は参照されても非拘束の候補のままであり、MUST、Invariant、受入条件へ昇格させません。この判定のために無関係な Intent Tree、Intent Compass、archive を全量で読みません。

## 実装中の判断

- 合意済みの範囲内に収まり、受入条件と重要判断を変えず、元に戻しやすい実装手段は AI が選び、そのまま進めます。
- より良い案が合意済み境界を越える場合、設計と違うことだけを理由に黙って捨てず、無断でも実装しません。
- 新事実によって重要判断が必要になったら、根拠を示せる影響範囲で、影響する作業を停止します。無関係な作業は止めません。
- 何を変える判断かによって、戻す工程を選びます。
  - 目的・対象者・成果・全体範囲を変える判断は discover へ戻します。
  - 複数の作業を拘束する方針、または後戻りしにくい判断は compass へ戻します。
  - 作業範囲・受入条件・具体的な振る舞いを変える判断は packets へ戻します。
- 利用者には、新事実、影響する境界、利益、危険（リスク）、理由付きの回答案を提示し、人の回答を待ちます。実質的に異なる案があれば違いと推奨も示します。
  - A. 合意済み設計を維持する
  - B. 設計変更として承認する
  - C. 次の packet へ送る
- B の場合は、該当する Intent 成果物を正規経路で更新し、export 済みなら再exportします。影響する下流成果物を更新または再確認してから、影響範囲だけの実装を再開します。
- 外部の spec・実装ツールのセッションや内部状態は管理しません。Intent 成果物の更新と下流成果物の再確認を、実装再開の条件として扱います。

## direct 実装レビュー

direct 出口では次を行います。

1. 編集前に、実装方針を対象 packet と関係する Invariant / Decision Rule、この契約へ照合する。
   対象 packet を特定できない場合は推測せず、人へ確認してから編集する。
2. 可能なら別視点へレビューだけを委ねる。委譲できなければ自己レビューへ縮退し、その事実を記録する。
3. 編集後、変更を同じ境界へ再照合する。境界内の指摘は警告として扱い、境界越えだけ上の三択で回答を待つ。
4. 発行ディレクトリがあれば、結果を `direct-review.md` 1ファイルへ更新する。指摘の有無、レビュー方法、境界越えの有無を残す。発行ディレクトリが無ければ記録を省略し、実装は止めない。

`/intent-validate` は実装前成果物の横断検査であり、この direct 実装前後レビューの代わりではありません。

## 下流と旧環境

- export 下書きはこの文書への参照と、どの packet 節がどの拘束力に当たるかを運びます。本文を複製しません。
- この文書が無い旧環境では、その事実を明示し、従来どおり対象 packet と関係 Invariant / Decision Ruleを使って続行します。契約不在だけでは実装・export・writebackを止めません。この契約の有無にかかわらず、旧形式の Intent Compass への読み取り fallback は恒久的に維持します。
