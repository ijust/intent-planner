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

選別入力は対象 Packet と関係候補だけに限定します。無関係な Intent Tree、Intent Compass、archive の全文を、漏れ対策として選別入力や下流本文へ注入しません。

分割 canonical があるときは、派生 index の status、area、impact、要旨と、Packet の明示参照・Scope・Safety・Validationを先に意味照合します。次を採用根拠とし、単なる語の一致だけを採用根拠にしません。

- Packet からの明示参照
- Packet と候補の領域一致または impact の関係
- active な area `always` の横断規律
- 人が確認済みの関係判断

この候補絞り込みの後で、対象記号ファイルの `## Law` と、その判断に対応する `Revisit when` だけを読みます。area が `always` でも、`superseded` または archive 済みなら選びません。index や分割収納の全部がなければ旧形式の Intent Compass へ恒久 fallback し、一部の対象記号だけがなければ読める記号と旧形式を併用します。この fallback に削除期限を設けず、既存データの自動移行・上書き・全件再分類は行いません。

候補を次の3結果へ振り分けます。

| 結果 | 条件 | 読み手の扱い |
|---|---|---|
| `pull` | status が `active` **かつ**（案件の area または impact に関係する **または** area が `always`） | Law と対応する `Revisit when` を今回の JIT 入力に含める |
| `exclude` | status が `active` ではない（area が `always` の `superseded` / archive 済みを含む）、案件と無関係、または前提不成立 | 現行の実装前関門に含めない。原本と履歴は変更しない |
| `confirm` | status、area、impact、relevance のいずれかが不足・曖昧で判定不能 | 値を推測せず、読めた根拠と関係候補を提示して人の確認へ送る |

5つの基準ケースは、active で関係あり=`pull`、active で無関係=`exclude`、superseded=`exclude`、`Revisit when` が成立した active で関係あり=`pull` のまま人主導の見直しへ接続、relevance 不明=`confirm` とします。`Revisit when` の成立だけで判断を自動除外・supersede しません。

area が `always` の active 判断は選別から落としません。`confirm` は黙った除外ではなく、人が確認するまで未確認の候補として保ちます。Preference / Heuristic は参照されても非拘束の候補のままであり、MUST、Invariant、受入条件へ昇格させません。この判定のために無関係な Intent Tree、Intent Compass、archive を全量で読みません。

#### 選別runの結果

3つのexportは、対象が同じなら同じ選別runの結果を使います。各targetはこの結果の配置だけを変え、候補抽出や判定の意味を追加しません。

| フィールド | 内容 |
|---|---|
| `selected_at` | ISO 8601形式の選別時点 |
| `sources` | 対象Packet、index、実際に読んだLawの正本参照 |
| `selection_status` | 共通選別を実行した`applied`、または契約不在で新しい選別を実行していない`legacy-not-applied` |
| `source_mode` | 分割収納だけを読んだ`split-compass`、分割収納と旧形式を併用した`mixed-compass`、旧形式だけを読んだ`legacy-compass` |
| `degraded_reasons` | 縮退理由。`execution-contract-missing`、`index-missing`、`split-store-missing`、`symbol-missing`のうち該当する0件以上 |
| `pull_candidates` | 関係が確定したactive制約の中間集合。下流や選別記録へそのまま渡さない |
| `selected` | 下流表現に必要な項目まで確認できた最終集合 |
| `confirm` | 関係または下流表現の必要項目を人が確認する最終集合 |
| `excluded` | inactive、superseded、archive済み、無関係、前提不成立の最終集合 |

`selection_status`が`applied`なら、`selected`、`confirm`、`excluded`は排他的で、同じIDの重複を許しません。各`pull_candidates`は下流表現の確認後に`selected`または`confirm`のどちらか一方へ移し、取り残しません。関係を判断できない候補は`confirm`へ直接置き、`selected`へ混ぜません。

`confirm`の確認種別は分けて保持します。status、area、impact、relevanceが不足・曖昧な候補は`relevance`、`pull_candidates`になった後で下流表現の必須項目を一意に作れない候補は`projection`です。人の回答だけで候補を`selected`へ直接移しません。回答を対象Packetの明示参照・Scope・ValidationまたはCompassの正本へ正規経路で反映し、更新後の正本から新しい`selected_at`で選別とexportを再実行します。回答が正本を変えない場合、採用集合も変更しません。

drift照合とOpen Questions確認が追加で読むTree、Compass、質問、警告、その判定結果は、`sources`、候補集合、`selected`、`confirm`、`excluded`、下流制約、内部記録の入力に使いません。人の確認が正本を更新したときだけ、更新後の正本から再実行したrunに反映します。

縮退時は次の状態を返します。

- indexがない場合は`selection_status: applied`、`source_mode: legacy-compass`、`degraded_reasons: index-missing`で既存Compassを読む。
- 分割収納がない場合は`selection_status: applied`、`source_mode: legacy-compass`、`degraded_reasons: split-store-missing`で既存Compassを読む。
- 対象記号が全部ない場合は`selection_status: applied`、`source_mode: legacy-compass`、`degraded_reasons: symbol-missing`で既存Compassを読む。
- 対象記号の一部がない場合は`selection_status: applied`、`source_mode: mixed-compass`、`degraded_reasons: symbol-missing`で、読める記号は分割収納、欠けた記号は既存Compassを読む。
- 実行契約がない旧環境では`selection_status: legacy-not-applied`、`source_mode: legacy-compass`、`degraded_reasons: execution-contract-missing`とし、新しい3分類を実行したとは表示せず、従来のexport出力を維持する。

#### 下流制約への写像

各`pull_candidates`について、PacketとLawから新しい義務を加えずに、次の6項目を一意に書けるか確認します。6項目がそろう候補だけを`selected`へ移し、下流入力へ渡します。

| 項目 | 書く内容 |
|---|---|
| `Identifier` | Compassの制約ID |
| `Name` | 記号ファイル見出しの短い名称 |
| `Law` | `## Law`の規範本文 |
| `Applicability` | Packet ScopeとLawが明示する条件の共通部分 |
| `Verification` | Packet Validation、または遵守を確認する観測対象と失敗条件 |
| `Canonical Reference` | 読んだ記号ファイルの正本参照 |

`Verification`は観測対象と失敗条件を一組で書きます。Packet Validationに直接対応する項目を優先します。対応がなければ、下流下書きまたは実装結果のどこを観測するかと、Lawが要求する状態の欠落または禁止する状態の存在という失敗条件を書きます。Packet Scope、Packet Validation、Lawから新しい義務なしに一意に導けない項目があれば、内容を捏造せず、その候補を不足項目付きの`confirm`へ移し、確認種別を`projection`とします。確認が済むまで下流のMUST、Invariant、受入条件へ含めません。

通常の選別理由である領域一致、area `always`、明示参照、人が確認済みの関係判断は、下流のrequirements、proposal、spec hints本文へ含めません。内部の選別記録への参照も下流へ含めません。理由を下流へ含める例外は、理由自体が適用条件を構成する場合、複数制約の衝突を下流で判断する場合、規制・監査・安全保証で根拠提示が必要な場合の3つだけです。その場合も判断に必要な最小限の要約だけを書きます。

`selected`が0件なら、この写像のためだけの制約節や0件の説明を下流に生成しません。

#### 選別結果の内部記録

各targetのPacket出力ディレクトリへ `constraint-selection.md` を生成します。このファイルは選別を見直すための再生成可能な派生成果物であり、Packetや下流仕様の正本ではありません。形式は次のとおりです。

```text
# Constraint Selection
selected_at: <ISO 8601形式の選別時点>
selection_status: <applied | legacy-not-applied>
source_mode: <split-compass | mixed-compass | legacy-compass>
degraded_reasons:
  - <縮退理由またはnone>
sources:
  - <対象Packet、index、実際に読んだLawの正本参照>

## Selected
- <ID> <名前> — <一行の採用理由> — <正本参照>

## Confirmation Candidates
- <ID> — 確認種別: <relevance | projection> — 根拠: <判明している事実> — 不足情報: <必要な情報> — <正本参照>

## Legacy Output
- <既存の主出力ファイルまたは非適用>
```

`selection_status: applied`では、空のSelectedまたはConfirmation Candidatesを`なし`、Legacy Outputを`非適用`と明記します。採用0件もSelectedを`なし`とすることで、選別を実行して0件だったと確認できるようにします。`selection_status: legacy-not-applied`では、SelectedとConfirmation Candidatesを同じ行で`非適用`とし、Legacy Outputには既存mapが更新した主出力ファイルだけを列挙します。旧経路の制約一覧は記録しません。

全件の除外候補は記録しないでください。Lawをその一部として含むCompass本文全体（Annexと旧形式本文を含む）を複製しないでください。長い比較や代替案、機密・機微な案件情報も記録しません。選別履歴をPacketへ複製せず、`constraint-selection.md`自体も下流の入力へ渡さないでください。Packet本文を変える根拠は、採用一覧や一行理由ではなく、人が確認した正本の判断だけです。

同一targetへの再exportでは、既存の記録へappendせずファイルを全置換し、同じ制約や確認候補を重複させません。下流下書きと内部記録は同じrunの`selected_at`と選別結果で更新します。全出力を既存ファイルの置換前に一時領域へ準備し、同じ選別結果から作られ、すべて書き換え可能であることを確認してから一組として置換します。準備・書き込み・置換のいずれかが失敗した場合はrunを成功として扱わず、新しい出力を破棄して直前の下流下書きと内部記録をすべて変更しません。片方だけを新しいrunとして確定しません。

選別中の発見がPacketのScope、Expected Behavior、Validation、安全性、互換性、データ整合性、または人が固定すべき重要判断を変える場合は自動反映しません。影響範囲を止め、上の「実装中の判断」に従って人の確認を得て、正規のPacket更新経路へ戻します。正本を更新した後、その正本から選別とexportを再実行します。

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

## 宣言と実装の乖離照合（oversize-guard）

対象 packet に任意節「## 想定規模」がある場合だけ、次の照合を行います。節が無ければ何もしません（後方互換・宣言は任意）。

- **節目は2点**: 各タスク（またはコミット）の完了ごとに軽く、作業単位の完了前に総括して、宣言（成果物の性質・規模帯）と実装の実態の釣り合いを意味で照合します。変更行数などの数値は根拠の説明材料に使ってよいものの、機械閾値・スコアを判定条件にしません。
- **兆候の見立ては代表3型**: (1) 宣言した性質に無い種類の成果物が増えている (2) 宣言した規模帯を大きく超える変更量が続いている (3) 宣言した振る舞いに対し実現・検査が薄い。代表例は手がかりであって判定条件の網羅ではありません。
- **警告の形**: 兆候の疑いがあるとき、対象・根拠（宣言のどこと実態のどこが釣り合わないか）・選べる対応（続行／縮小／別視点の独立レビュー）を1行〜数行で示します。兆候時は独立レビュー（subagent 等の別視点）を推奨します（必須にしません）。同一根拠の再警告はしません（1作業単位1回まで）。
- **強度は `.intent/mode.md` の `oversize-guard` 設定に従う**: `off`＝照合しない／`warn`（既定・未記載・不正値を含む）＝警告のみで実装を止めない／`gate`＝利用者の応答があるまで当該作業単位の実装だけを止める（他の作業単位・並行作業は止めない）。
- **記録**: 警告・空振り・利用者判定を drift-log の既存9キーで記録します（`pattern: uncatalogued:declaration-gap`（作りすぎ側）または `uncatalogued:declaration-gap-thin`（薄すぎ側）・`stage: export`（既存3値を増やさず、実装段の照合である旨を note に明記する既存の扱い）・`mechanism: declaration-gap`（読み手はこの mechanism で乖離照合の記録を既存フックの記録と分離集計する）・`outcome: caught` は下書きで確定は利用者判定）。
- **照合と警告は提示と記録までで、実装内容を自動で変更・削除・差し戻ししません。** 照合自体が失敗した場合（宣言が読めない等）は「照合できなかった」と1行示し、実装は止めません。

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
