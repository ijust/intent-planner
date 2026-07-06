# 検査カタログ: intent-validate

`intent-validate` skill が適用する検査の正本。SKILL.md は手順と報告形式のみを持ち、検査の定義はこのファイルを参照する。検査を追加するときはこの表に行を足すだけでよい（表が正）。各検査の ID は検査の安定識別子で、報告の各指摘に深刻度とともに併記される（ID の一覧・個数もこの表が正）。

## 深刻度の3分類

| 深刻度 | 定義 |
|--------|------|
| 要修正 | 着工前に解消すべき矛盾・整合性破壊。このまま export / 実装へ進むと architectural drift の原因になる |
| 推奨 | 品質リスク。直ちに着工を止めるほどではないが、解消すると成果物の判断基準としての信頼性が上がる |
| 情報 | 注意喚起。対応は任意だが、把握しておくべき状態 |

### 降格規則

- 欠落項目に対応する理由付きの意図的な見送り記録（Deferred または Open Questions）がある場合、当該項目の深刻度を「情報」に下げて報告する。

## 検査カタログ

| ID | 区分 | 検査 | 実施条件 | 深刻度の目安 |
|----|------|------|----------|--------------|
| invariant-conflict | 矛盾 | packet の Scope/Expected Behavior が compass Invariants と衝突 | 常時 | 要修正 |
| anti-direction-violation | 矛盾 | packet の方向が compass Anti-direction に該当 | 常時 | 要修正 |
| l3-intent-mismatch | 矛盾 | intent-tree の L3 意図と packet 内容の不一致（L3 の明示記述と直接矛盾 = 要修正、解釈の余地がある乖離 = 推奨） | 常時 | 要修正/推奨 |
| goal-without-packet | カバレッジ | tree の L1–L3 ゴールでどの packet（L4 含む）にも対応しないもの | 常時 | 推奨 |
| orphan-packet | カバレッジ | Parent Intent が tree のどの節にも遡れない孤立 packet | 常時 | 要修正 |
| stale-questions | カバレッジ | tree/compass/packets の未解決 Question の滞留 | 常時 | 情報 |
| stale-assumptions | カバレッジ | intent-tree の Assumptions に canonical への昇格も棄却もされないまま残る項目 | 常時 | 情報 |
| dependency-cycle | 整合 | `depends_on` に循環依存 A→…→A がある | 常時 | 要修正 |
| dependency-broken-ref | 整合 | `depends_on` が存在しない packet_id を参照している | 常時 | 要修正 |
| invariant-uninherited | 整合 | compass 普遍 invariant が packet `## Safety / Invariants` に継がれていない（衝突でなく沈黙の欠落） | 常時（compass Invariants 記入 かつ active packet あり） | 推奨 |
| invariant-stale-vs-compass | 整合 | compass の節更新日（Invariants 節 / Decision Rules 節）が packet `updated_at` より新しい（追随漏れ候補） | 常時（compass 節更新日・packet 更新日あり） | 推奨 |
| decision-rule-mismatch | 整合 | packet `## Decisions` が compass Decision Rules に反する | 常時（compass Decision Rules 記入 かつ packet に `## Decisions` あり） | 要修正/推奨 |
| decision-rule-code-alignment | 整合 | Decision Rule の主文/Context が名指すコードモジュール（ファイル名・モジュール名）を Grep で読み、Rule 主文と実装の意味的乖離を AI の限定的意味照合で検出する。突合面＝コード実装の意味（突合面＝packet スロット値の `decision-rule-mismatch` と分離）。出力に「AI による意味照合の推定」ラベルを付し断定しない一方向報告 | 常時（Decision Rule がコードモジュールを名指す かつ 名指し先が存在する） | 推奨 |
| packet-scope-overlap | 境界 | active/ 配下の packet ファイル間の Scope 重複・責務衝突（archive/ は読まない） | 常時 | 要修正 |
| decision-slot-empty | 完全性の床 | packet の `## Decisions` 節に播かれた意思決定スロット（④）のうち、値が空（未記入）のもの。理由付きの `未定` は降格規則により情報へ降格 | `## Decisions` 節にスロットが播かれた packet | 推奨 |
| decision-slot-unsown | 完全性の床 | `## Decisions` 節は存在するが、共通コアスロット（`decision-slots.md` の8 ID）が1つも播かれていない | `## Decisions` 節を持つ packet（節自体が無い旧 packet は未検証対象としてスキップ） | 推奨 |
| export-draft-mismatch | 境界 | 現行 export 下書き（export-log 最新行の packet のディレクトリ）と対象 packet ファイル（active/ 配下）の整合（Invariants 転記の不一致・packet 定義との乖離など） | 常時 | 推奨 |
| requirements-smell | 品質 | 要求記述に曖昧語・主観語・比較級・弱い語・未定義代名詞が残る（例: 「適切に」「高速」「より良い」「など」「できる限り」「それ」の指示先不明）。検出して引用し利用者の判断に委ねる（言い換えを正本に書き戻さない） | 常時 | 推奨 |
| ambiguous-deferred-phrasing | 品質 | packet の `## Decisions` 節で Human-fixed / Agent-discretion の区分の外にあり、かつ Revisit when 併記の無い未確定動詞（想定 / 流用 / 予定 / TBD / 暫定 等）が確定の文体に紛れている。検出して引用し利用者の判断に委ねる（言い換えを正本に書き戻さない） | 常時（packet に `## Decisions` 節あり） | 情報 |
| trace-downstream-missing | カバレッジ | tree の L1–L3 意図に対応する packet は在るのに、その packet に下流リンク（`verified-by`／検証）が無く検証へ辿れない（下向きカバレッジの検証側）。packet 自体の欠落は `goal-without-packet` が担うので重複させない | 常時 | 推奨 |
| trace-pre-rs-missing | カバレッジ | packet の frontmatter に上流リンク `parent_intents` キーが無い／空（意図→要求 pre-RS の切断点）。`parent_intents` は在るが tree のどの節にも遡れない孤立は `orphan-packet` が担うので重複させない | 常時 | 推奨 |
| poc-experiment-missing | 規範 | 仮説・反証条件・GO/NO-GO のいずれかが「PoC 実験定義」に未記録 | designer-questions=on かつ purpose=poc | 要修正 |
| l1-metric-missing | 規範 | L1 項目に `計測基準:` 行が無い | designer-questions=on | 推奨 |
| walking-skeleton-missing | 規範 | plan.md の「Walking Skeleton」節が未記入（plan.md が記入済みの場合） | designer-questions=on | 推奨 |
| screen-sketch-missing | 規範 | 「画面ラフ参照」セクションが未記入（パス・リンク・「対象外」・理由付き「無し」のいずれも無い） | designer-questions=on | 推奨 |
| designer-questions-unrecorded | 規範 | designer-questions が未記録（区分「規範」の検査をスキップし本行のみ告知） | designer-questions 未記録 | 情報 |
| purpose-unrecorded | 規範 | purpose が未記録（仮説・反証条件・GO/NO-GO の検査をスキップし本行のみ告知） | designer-questions=on かつ purpose 未記録 | 情報 |
| coinage-suspect | 品質 | 母集合＝`.intent/glossary.md`（正規語彙の軽量台帳）に照らし、台帳のどこにも無い語を「造語の疑い」として read-only で名指しする。判定は意味的（固有名詞・既存英語用語・初出一行説明済みの正当な新語を除外）で機械検査に寄せない。候補提示に留め断定せず、造語の疑いが無ければ沈黙する | 常時（`.intent/glossary.md` あり） | info |
| groundless-conclusion | 品質 | 結論（intent-tree の意図・compass の Invariant/Decision Rule 等）に対し、それを導いた根拠（rationale＝理由・制約・前提・トレードオフ）が成果物から辿れるかを read-only で点検し、結論だけで根拠が辿れないものを「根拠なき結論の疑い」として名指しする。判定は意味的（自明な意図・既出根拠の参照・別の意図/Decision が根拠を兼ねる場合を除外）で機械検査・必須フィールドの有無に寄せない。各指摘に訂正可能性の観点（その結論が否定する事実が来たとき根拠から再評価できるか）を添える。候補提示に留め断定せず、根拠の疑いが無ければ沈黙する。canonical を自動改変せず根拠の補完は更新案提示まで | 常時 | info |
| unverified-hypothesis | 品質 | 成果物（packet の確信・Decisions の Human-fixed 値・compass の Decision/Invariant 等）に残る「証拠の裏が無いまま確定された仮説（暫定の確信）」を read-only で名指しする。仮説を `.intent/`（Invariant/Decision Rule/過去 delta＝証拠 pool）と照合し、対応する証拠が辿れないものを反証/未検証の観点を添えて挙げる。判定は意味的（証拠が `.intent/` に実在し裏付けられた確信は除外）で機械検査・必須フィールドの有無に寄せない。`groundless-conclusion`（結論に根拠が辿れない）とは検出軸を分け所見を混ぜない（こちらは仮説に証拠の裏が無い・検証の軸）。候補提示に留め断定せず、疑いが無ければ沈黙する。射程は当該実行の新規/差分に揃え遡及全体スキャンを既定にしない。証拠 pool が空のときは即警告にせず「判定不能」を明示する。canonical を自動改変せず証拠の補完は更新案提示まで | 常時 | info |
| dangling-reference | 整合 | canonical 内の番号付き相互参照（compass の `Anti-direction N` / `INV N` / `DR N`）が、退避・統合・削除で参照先を失い宙吊り（dangling）になっていないかを read-only で点検し、参照先が成果物内に見当たらないものを「dangling 参照の疑い」として名指しする。判定は LLM が成果物を読んで参照先の実在を確かめる意味的な読みで行い、`scripts/intent-check.mjs`・grep・正規表現の機械的一致には寄せない（INV2/A1）。対象は compass 内の番号参照に絞り、`[[memory-slug]]`（別リポで実在照合できない）や packet の `parent_intents` 参照は対象外。`coinage-suspect` / `groundless-conclusion` / `unverified-hypothesis` とは検出軸を分け所見を混ぜない（こちらは参照先の実在欠落・意味でなく指す先の有無）。候補提示に留め断定せず、宙吊りが無ければ沈黙する。射程は当該実行の新規/差分に揃え遡及全体スキャンを既定にしない。canonical を自動改変せず参照の張替えは行わない | 常時 | info |
| db-design-implementation-drift | 整合 | `.intent/db-design/<スラッグ>/db-design.md`（intent-db-design の叩き台 DB 設計）と実装スキーマ（migration/DDL を Grep で同定）の落差を read-only で報告する。叩き台に在って実装に無いテーブル/制約/インデックス、実装に在って叩き台に無いもの、命名の乖離を深刻度付きで出す。完全一致は「落差なし＝叩き台が参照された」と報告。実装スキーマを同定しきれない範囲は「落差なし」と誤標識せず保留＋報告。修正は提案にとどめる（書き戻さない） | 叩き台 `.intent/db-design/<スラッグ>/` が存在する（無ければ軸をスキップ） | 要修正/推奨 |
| invariant-oracle-missing | 完全性の床 | compass の各 Invariant（`INV N`）に検査オラクル（破れたと分かるものさし＝機械テストに限らず手順でもよい）が紐づいているか・付けられない思想的制約なら「ものさし無し」と明記されているかを read-only で点検し、**どちらも無いもの**を「オラクル未紐づけの疑い」として名指しする。オラクルが在っても破れたと分からない（同義反復・観測不能）と読めるものも候補提示してよい。判定は LLM が compass を読んで意味で行い、`scripts/intent-check.mjs`・grep・正規表現の機械的一致には寄せない（INV2/A1・INV48）。`coinage-suspect` / `groundless-conclusion` / `unverified-hypothesis` / `dangling-reference` とは検出軸を分け所見を混ぜない（こちらは Invariant の検査オラクル欠落）。候補提示に留め断定せず、未紐づけが無ければ沈黙する。射程は当該実行の新規/差分に揃え遡及全体スキャンを既定にしない。canonical を自動改変せずオラクルの付与は行わない | 常時（compass あり・Invariant が1つ以上） | info |
| invariant-impact-reverse | 逆引き | 変更ファイルのパスと、compass の各 Invariant に付けた影響パス（その Invariant が効くファイル/パスの目印）を grep で**単純に文字列照合**し、一致した Invariant を「この変更はこの Invariant に触れる（確認はこのものさしで）」と read-only で浮かせる。意味判断を要さない単純照合ゆえ grep を補助に使う（INV48 の利便性優先の例外）。浮かせた Invariant にオラクルが付いていれば対で出す（窓口を `/intent-validate` に集約・DR72）。候補提示に留め断定せず（影響パスが粗ければ誤検知あり）、一致が無ければ沈黙する。索引（ベクター/グラフ/GraphRAG）を先回りで足さない（A38 将来候補・INV2）。gate にせず export/実装を止めない（INV49 の warn-only） | 変更ファイルのパスが渡された/明示されている かつ 影響パスを持つ Invariant がある（無ければ軸をスキップ） | info |
| compass-rule-decay | 陳腐化 | compass の各 Invariant（`INV N`）/ Decision Rule（`DR N`）が「参照先は在るが中身が現実と乖離・長く引かれた形跡が無い」死蔵規律になっていないかを read-only で点検し、3類型で名指しする: **(a) 前提崩れ**＝本文・影響パス（A38 記法）が名指すファイル/skill/値が現実に存在しない/変わった（実在照合は意味判断を要さない単純パス突合ゆえ Glob/Grep を補助に使う＝INV48 例外）／**(b) 死蔵**＝active packet の `parent_intents`・近況の deltas/drift-log の言及から辿れない（引かれた形跡が無い）／**(c) 遺物参照**＝参照する packet がすべて closed/archived で現役の担い手がいない。判定は LLM が compass と参照関係を読む意味判断で、期間・回数の数値閾値を持たず（INV2）git 履歴も読まない（allowed-tools は Read, Glob, Grep のまま＝時間軸の証拠はファイル内の打刻に限る）。対象は Invariant + Decision Rule に絞る（Anti-direction は対象外）。`dangling-reference`（参照先の消滅）/ `invariant-stale-vs-compass`（packet 側の追随漏れ）/ `stale-questions` / `stale-assumptions` とは検出軸を分け所見を混ぜない（こちらは canonical 規律そのものの生死）。候補提示に留め断定せず、疑いが無ければ沈黙する。canonical の削除/退避/書き換えは提案どまり（自動整理しない） | 常時（compass あり・Invariant または Decision Rule が1つ以上） | info |
| requirement-oracle-check | 品質 | export 下書き（`.intent/cc-sdd/<スラッグ>/*.md` / `.intent/openspec/<スラッグ>/*.md`）の各受入基準が「誤った実装を落とせる観測可能な基準」になっているかを read-only で点検し、落とせない弱い基準（観測できる入力・条件・期待結果が無い・例:「使いやすくする」「適切に動く」）を名指しして、観測できる形への詰め直し候補を添える。判定は LLM が「この基準で誤った実装を弾けるか」を読む意味判断で、正規表現・キーワードリスト・`scripts/intent-check.mjs` の機械照合には寄せない（INV2/A1・既存の意味検査軸と質を揃える）。`requirements-smell`（曖昧語の字面検出）/ `export-draft-mismatch`（下書きと packet の整合）とは検出軸を分け所見を混ぜない（こちらは受入基準が誤実装を弁別できるか）。同じ基準が両軸で挙がっても互いを黙らせない（突合面が違う）。候補提示に留め断定せず、弱い基準が無ければ沈黙する。下書きも canonical も自動で書き換えず（詰め直しは提案どまり）、gate にせず export/実装を止めない（INV49 の warn-only） | export 下書きがある（`.intent/cc-sdd/` または `.intent/openspec/` に下書きがある。無ければ軸をスキップ） | 推奨 |
| starter-coverage-gap | 品質 | active packet の Scope / Expected Behavior と定石カタログ（`.intent/constraint-starters.md` の領域インデックス）を意味照合し、**明らかに関係する領域の定石が「採用（packet の `## Safety / Invariants` に反映）も否認（発行ディレクトリの `constraint-ledger.md` に記録）も保留もされていない」** packet を read-only で名指しし、どの領域ファイル（`.intent/constraint-starters/<領域>.md`）を見るかを詰め直し候補として添える。判定は LLM が「この packet の技術面に明白に関係する定石領域が一度も検討されていないか」を読む意味判断で、正規表現・キーワードリスト・`scripts/intent-check.mjs` の機械照合には寄せない（INV2/A1）。`constraint-ledger.md` の採否記録を読み、採用・否認・保留いずれかで**検討済みの定石は名指ししない**（器が無ければ確度を下げるか沈黙側）。関係領域だけを照合し、カタログ全定石との総当たりはしない（INV57）。既存軸（`requirements-smell` / `requirement-oracle-check` / `invariant-uninherited` 等）とは検出軸を分け所見を混ぜない（こちらは明白に関係する定石領域の未検討）。候補提示に留め断定せず、明白な未検討が無ければ沈黙する。canonical を自動改変せず（採用は人が packet の Safety へ）、gate にせず export/実装を止めない（INV49 の warn-only・A40/DR83 宿主⑤） | 常時（`.intent/constraint-starters.md` あり・active packet あり。無ければ軸をスキップ） | 推奨 |
| oracle-test-link-missing | 完全性の床 | packet の受入オラクル（`## Validation` の「誤った実装を落とすものさし」）と `## Verification protocol` の verified-by（対応する実テストのファイルパス+テスト名）を突き合わせ、**(1) 対応の切れ**＝verified-by が指すテストが実在しない（削除・改名）／**(2) 未対応**＝オラクルに verified-by が無い・「未対応」の明示もないまま空いている、を read-only で名指しする。A38 の `invariant-oracle-missing`（Invariant にオラクルが在るか＝実装前）の実装後側で対に働く。実在照合は意味判断を要さない単純パス突合ゆえ Glob/Grep を補助に使ってよい（INV48 例外・テスト名まで含む照合は意味読み）。判定は LLM が packet を読む意味判断で、`scripts/intent-check.mjs`・正規表現の機械的一致には寄せない（INV2/A1）。`invariant-oracle-missing`（Invariant のオラクル欠落）/ `trace-downstream-missing`（下流リンクの欠落）とは検出軸を分け所見を混ぜない（こちらは受入オラクルと実テストの対応の実在）。`## Verification protocol` 節が無い旧 packet は「未記入」として警告対象にしない（不在＝未観測・後方互換・遡及記入を強制しない）。「未対応」と明示済みは咎めない。候補提示に留め断定せず、全対応が健在なら沈黙する。verified-by の記入は writeback（書き手）が実測で行う別アクションで、検査層は自動改変しない | 常時（active packet あり。`## Verification protocol` を持つ packet が対象・無ければ軸をスキップ） | 推奨 |
| provisional-carryover | 整合 | active packet の frontmatter（`state`）と `## Decisions` を突き合わせ、決定の確定度が進行段階と矛盾して持ち越されているのを read-only で名指しする: **(1) 進行との矛盾**＝state が verifying/done なのに `未定`/`暫定` スロットが残る（特に前倒し5基準該当）／**(2) 再訪条件の成立**＝`未定` スロットの Revisit when が現在の成果物の状態から既に成立していると読める／**(3) 未確認の暫定標識**＝inferred/暫定 標識が人確認の記録なく残存。狙いは「推測は人間レビューまで暫定」の規律が、保持したまま done へ進むことで既成事実化する穴を塞ぐこと。**未定の保持そのものは罰しない**（Anti-direction 300・警告対象は進行段階との矛盾のみ・draft/ready のまま未定を保持する packet では沈黙）。判定は LLM が packet を読む意味判断で、経過日数などの機械閾値・`scripts/intent-check.mjs`・正規表現の機械的一致には寄せない（INV2/A1）。`ambiguous-deferred-phrasing`（未確定動詞の字面）/ `decision-slot-empty`（空スロット）/ `compass-rule-decay`（compass 規律の生死）/ `stale-questions` / `stale-assumptions`（未解決項目の滞留）とは検出軸を分け所見を混ぜない（こちらは packet の決定の確定度と進行段階の矛盾）。`## Decisions` 節が無い旧 packet は「未記入」として警告対象にしない（後方互換）。候補提示に留め断定せず、矛盾が無ければ沈黙する。暫定の確定・state 変更は人の宣言による別アクションで、検査層は自動確定・自動昇格・state 変更をしない（Anti-direction 303・A7/INV5） | 常時（active packet あり・`## Decisions` を持つ packet が対象・無ければ軸をスキップ） | 推奨 |

- 実施条件「常時」は、未検証対象の原則（対象成果物が未作成・未記入なら当該検査をスキップ）を上書きしない。
- 実施条件の designer-questions / purpose は mode.md に記録された値を指す。実施条件を満たさない検査は実施しない。designer-questions=off と記録されている場合、区分「規範」の検査はすべて実施しない。読み手は designer-questions を先に判定し、on と記録されていない限り purpose の値を参照しない。

## 完全性の床検査の注記（推論しない・宣言ベース）

- `decision-slot-empty` / `decision-slot-unsown` は「完全性の床」（切り捨て線）を担う。④ 制約下の意思決定（整合性・冪等性・エラー意味論・認可 等）が空のまま export/実装へ進むのを防ぐ。スロットの正本は `intent-packets/rules/decision-slots.md`（区分・発火条件・値域はそちらが正）。
- **該当性を packet 内容から推論しない**: これらの検査は `## Decisions` 節に**実際に播かれた**スロットのみを対象とする。「この packet は書き込みを伴うはずだからスロットが要る」といった推論的判断はしない（どのスロットを播くかは discover の elicitation で人が確認する責務。`depends_on` を推論しないのと同じ規律）。
- `## Decisions` 節自体が無い旧 packet は未検証対象としてスキップする（即時の一括移行を強制しない。次回の更新フローでスロットを遅延補完する）。
- 理由付きの `未定` は `decision-slot-empty` について降格規則により「情報」へ降格する（意図的な見送りとしての遅延は許容する。完全性の床は「空欄の禁止」であって「全項目の即時確定の強制」ではない）。

## 依存健全性検査の注記（read-only と参照先の解決範囲）

- `dependency-cycle` / `dependency-broken-ref` は **read-only** で packet 正本（frontmatter 等）を一切変更しない。
- `dependency-broken-ref` の参照先 packet_id の存在確認は **active+archive の packet_id 全集合**に対して行う（archive 済みの packet_id も「存在する」とみなす）。

## smells / トレース検査の注記（read-only・最小十分・書き戻さない）

- `requirements-smell` は曖昧語・主観語・比較級・弱い語・未定義代名詞を**検出して引用するだけ**で、言い換え案を正本に書き戻さない。深刻度は「推奨」（着工を止めるほどではないが解消すると判断基準としての信頼性が上がる）。
- トレース検査（`trace-downstream-missing` / `trace-pre-rs-missing`）は **read-only** で、導出したリンクや欠落の補完を正本に書き戻さない（`depends_on` を推論・自動算出しない既存規律に乗る）。
- トレースは**最小十分**に留める: 全 artifact 間を総当たりで結ばず、「なぜ存在するか（上流 `parent_intents`）・どこで実現したか（`realized-by`）・どう検証したか（`verified-by`）」が辿れる欠落のみを指摘する。下流リンクは任意（記入済みの場合に検証へ辿れるかを見る）。
- 既存カバレッジ検査との境界: packet 自体の欠落は `goal-without-packet`、`parent_intents` は在るが tree に遡れない孤立は `orphan-packet` が担う。`trace-downstream-missing` は packet が在るのに検証へ辿れない側、`trace-pre-rs-missing` は `parent_intents` キー自体が無い／空の切断点に焦点を絞り、重複検査を作らない。

## 未確定動詞検査の注記（read-only・降格規則を厳格適用・書き戻さない）

- `ambiguous-deferred-phrasing` は packet `## Decisions` 節で **Human-fixed / Agent-discretion の区分の外**にあり、かつ **Revisit when の併記が無い**未確定動詞（確定の文体に紛れた仮置き）を検出して引用するだけで、言い換え案・確定案を正本に書き戻さない（`requirements-smell` と同じ read-only パターン）。深刻度は **「情報」**（誤検知が高いため要修正へ昇格させない）。
- **未確定動詞の確定語彙リスト**（このリストに限定し、`requirements-smell` の語彙〔適切に / 高速 / より良い / など / できる限り / 「それ」等〕とは重複させない）:
  - 「想定」「流用」「予定」「TBD」「暫定」。
- **名詞的慣用の誤検知除外（必須）**: 上記語彙でも、未確定の意図を示さない名詞的・副詞的慣用は検出しない。具体的には「想定内」「想定通り」のような確定済みの含意で使われる語形を除外し、「〜する想定」「〜を流用（する）」のように**未確定の動作・意図を示す動詞的用法に限定**する。判定に迷う場合は挙げず、利用者の判断を奪わない。
- **降格規則の厳格適用**: 検出箇所が Deferred / Open Questions / 理由付き未定スロット（理由＋Revisit when 併記）として既に保留記録されている場合、降格規則により当該検出を抑制する（既に構造的な保留として記録された未確定は再掲しない）。既定でも「情報」深刻度であり、要修正・推奨へは昇格させない。
- 既存軸との棲み分け: 区分外・Revisit when 無しの未確定動詞（文体マッチ）を見るのが本軸で、空スロットそのものは `decision-slot-empty`、compass Decision Rules との矛盾は `decision-rule-mismatch` が担う。重複検査を作らない。

## 決定↔コード乖離検査の注記（read-only 検査層で唯一の推論例外・境界条件付き）

- `decision-rule-code-alignment` は、Decision Rule の**主文／Context がコードモジュール（ファイル名・モジュール名）を名指す**ときに限り、そのモジュールを Grep で読み、Rule 主文と実装の**意味的乖離を AI の限定的意味照合で検出**する。
- **これは read-only 検査層で唯一の推論例外**である。他のすべての検査軸（既存3軸〔`invariant-uninherited` / `invariant-stale-vs-compass` / `decision-rule-mismatch`〕・`ambiguous-deferred-phrasing`・status / improve 系を含む）は推論しない。**この軸だけが例外であり、例外を他軸へ波及させない**（他軸は記述の有無・直接矛盾の有無を読むに留める従来規律のまま）。
- **境界条件（誤検知の再現性低下の代償補償・必須）**:
  - 出力に必ず**「AI による意味照合の推定」**という明示ラベルを付し、断定しない。
  - severity は**推奨**止まり。要修正へは昇格させない。
  - 利用者が一次根拠にせず**人間確認を促す一方向報告**に徹する（canonical・コードのいずれも自動修正しない）。
  - **名指し起点限定**: Decision Rule がモジュールを名指さない・抽象的 Rule・乖離が観測できない場合は挙げない（「どのモジュールを見るか」は Rule の名指しが起点であり、意味照合は「見るべき対象が定まった後」に限る）。判定に迷う場合は挙げず、利用者の判断を奪わない。
- **突合面の分離（必須・二重検出回避）**: 本軸の突合面は**コード実装の意味**である。突合面が packet `## Decisions` スロット値のテキスト突合（推論なし）である既存 `decision-rule-mismatch` とは突合面が異なるため、同一 Decision Rule で両軸が該当しても二重検出にはならない（前者＝コード実装と Rule、本軸＝packet スロット値と Rule）。
- **tool 不変（必須）**: intent-validate の allowed-tools は `Read, Glob, Grep` のまま（Write / Bash を増やさない）。コードは Grep で読むのみで一切変更しない（INV6）。AI 意味照合は skill 本文の判断であって tool ではない。

## L3 不一致の振り分け基準

- intent-tree の L3 の**明示記述と直接矛盾**する packet 内容 = **要修正**
- **解釈の余地がある乖離**（明示記述は無いが方向性がずれて見える等）= **推奨**
- 迷ったら推奨に倒し、根拠の引用を添えて利用者の判断に委ねる

## compass 適合検査の注記（継承・stale・ADR 乖離の突合）

- 棲み分け:
  - `invariant-uninherited` ≠ `invariant-conflict`: 後者は「衝突＝矛盾」の検出、本軸は「沈黙の欠落」の検出。同一 packet で両方該当し得るが検出観点が異なる。
  - `decision-rule-mismatch` ≠ `l3-intent-mismatch`: 後者は intent-tree L3 との突合、本軸は compass Decision Rules との突合。
- 振り分け基準（`decision-rule-mismatch`。`l3-intent-mismatch` の雛形を流用）: Decision Rules の明示記述と直接矛盾 = 要修正／解釈の余地がある乖離 = 推奨／迷ったら推奨に倒し、根拠の引用を添えて人の判断に委ねる。
- **突合面の限定（必須）**: ADR（Context/Decision/Why/Alternatives/Consequences/Revisit when の6欄長文）と packet `## Decisions`（スロット値域）は構造が非対称なので、突合面を **「Decision Rules エントリの `Decision`（採る選択肢の主文）」 対 「packet `## Decisions` の各スロットの確定値」** に限定する。Why/Alternatives/Consequences 等の周辺欄は根拠の引用元に使うが、矛盾判定の主軸にはしない。
  - 突合例: Decision Rules の `Decision`＝「集計ロジックはドメイン層に置く」、packet `## Decisions` の該当スロット確定値＝「UI で集計する」→ 直接矛盾 = 要修正。`Decision`＝「rollback 可能な slice を優先」で packet が一括置換寄りだが明示の否定はない → 解釈余地 = 推奨。
- **軸の役割分離（必須）**: 時間軸（更新日比較）を持つのは `invariant-stale-vs-compass` のみ。`invariant-uninherited`（継承の有無）と `decision-rule-mismatch`（ADR との矛盾の有無）は「今の状態」を見る軸で、compass の節更新日とは連動しない。これら2軸は compass の現行 invariant / Decision Rules を毎回読んで個別指摘する（「どの invariant がどの packet で欠けているか」を出すのが本軸の価値）。
- **出力粒度**: 時間軸を持つ `invariant-stale-vs-compass` のみ既定で **件数サマリ1行**（例: `Invariants 節更新後に未追随の packet が N 件 / Decision Rules 節更新後に M 件`）に留め、個別 packet 列挙は利用者要求時のみ展開する（狼少年化の回避）。要修正と断定せず推奨で提示する。stale 比較は compass 側の該当節更新日と packet `updated_at` の**両方が実打刻（`—` でない）されたペアのみ**を対象とする。`invariant-uninherited` / `decision-rule-mismatch` は個別指摘が既定。
- 推論禁止（必須）: packet 内容から該当性を推論しない（`decision-slot` 検査と同じ規律）。意味照合は記述の有無・直接矛盾の有無を読むに留める。
- 後方互換: compass `Updated (...)` が `—`／不在 / packet `updated_at` 不在 / `## Decisions` 不在 / Invariants 未記入 は当該検査を**未検証対象として ID 付きで明示しスキップ**し、stale を断定しない。

## DB 設計落差検査の注記（叩き台 vs 実装スキーマ・read-only・behavior-preserving）

- **突合面**: `.intent/db-design/<スラッグ>/db-design.md`（intent-db-design の叩き台 DB 設計・`## テーブル:` 見出し＋カラム表の machine-diffable 形式）と、実装スキーマ（migration/DDL/ORM スキーマを Grep で同定）。突合単位はテーブル（見出し）・カラム（行）・制約・インデックス・命名。
- **read-only・tool 不変（必須）**: intent-validate の allowed-tools は `Read, Glob, Grep` のまま（Write/Bash を増やさない）。実装スキーマは Grep で読むのみで一切変更しない（INV6）。落差検出は所見の提示にとどめ、修正は提案（叩き台にも実装にも書き戻さない）。
- **behavior-preserving（必須）**: 叩き台 `.intent/db-design/<スラッグ>/` が存在しない案件では本軸を**スキップ**し、他 validate 軸は通常実施する（DB 設計を伴わない既存案件の挙動を一切変えない）。
- **「参照されたか」の可視化**: 叩き台と実装が完全一致＝「落差なし＝叩き台が参照された」と報告する。乖離は「無視された／実装で詰めた意図的変更」の両方があり得るため断定せず、落差として列挙し、仕分けは writeback の理由記録（§ writeback 連携）に委ねる（lossy-projection＝落差の可視化で担保）。
- **Fail-Safe（誤標識しない）**: 実装スキーマを Grep で同定しきれない範囲は「落差なし」と誤標識せず、同定できた範囲のみ突合し、同定不能を保留＋報告する（捏造しない・OQ-DB5 連動）。落差が膨大なときは深刻度上位を優先表示し全件列挙で溺れさせない（既存報告作法）。
- **棲み分け**: 本軸は「叩き台 vs 実装スキーマ」の落差。叩き台**そのものの品質**検査（正規化崩れ等）は intent-db-design の `db-inspect-oracle`（別 skill・別 spec）が担い、本軸とは突合面が異なる（重複検査を作らない）。
- **kiro 非強制（A6）**: kiro design への叩き台取り込みは強制しない。参照されなくても落差として可視化されることで品質を担保する（強制でなく可視化）。

## 未検証仮説検査の注記（証拠の裏が無い仮説 vs 根拠が辿れない結論・read-only・軸を分ける）

- `unverified-hypothesis` は「成果物に残る**仮説（暫定の確信）**に、それを**検証/反証する証拠**が `.intent/`（Invariant/Decision Rule/過去 delta＝証拠 pool）から辿れるか」を read-only で名指しする。`coinage-suspect` / `groundless-conclusion` と同じく意味的判定・候補提示・誤検知前提・停止しないで、`scripts/intent-check.mjs`・必須フィールドの有無に寄せない（INV2/A1）。
- **`groundless-conclusion`（A29）と検出軸を分ける（必須）**: `groundless-conclusion`＝既に下した**結論**に、それを導いた**根拠（rationale・履歴）**が辿れない（事後・保存の軸）。`unverified-hypothesis`＝まだ確定していない**仮説**に、それを裏取りする**証拠**が無い（事前・検証の軸）。両者は別検査として報告し、所見を混ぜない（同一箇所に両軸が当たっても重複検出にしない＝突合面が「根拠の保存」と「証拠の探索」で異なる）。証拠源は共有しうる（A29 が残す根拠が本検査の証拠 pool に入る相乗）。
- **反証を第一に**: 仮説を追認する証拠を都合よく引いて誤決定に権威付けしないよう、確信と矛盾する証拠（反証/未検証）を所見の第一に置く。証拠で裏付けられた確信は誤検出しない（warn-only ゆえ誤検出の害は小さいが量を絞る）。
- **射程を絞る（ノイズ回避）**: 対象は当該 validate 実行の新規/差分に揃え、既存 tree/compass 全体を無差別に遡及スキャンしない（遡及の棚卸しは opt-in の別経路）。
- **コールドスタート回避（Fail-Safe）**: 証拠 pool（`.intent/`）が空のときは「証拠の裏が無い＝即警告」にせず「証拠 pool が無いため判定不能」を明示する（合格とも誤標識しない）。
- **read-only・改変は人**: 証拠を添える更新案は提示までで、canonical（intent-tree / compass / packets）を自動改変しない。AI に証拠を捏造させて確信を後付け正当化させない（本来防ぎたい drift を悪化させる＝A30 のプレモータム）。記入は人が承認してからの別アクション（A7/INV5・INV37）。

## dangling 参照検査の注記（番号付き相互参照の宙吊り・read-only・LLM 文脈・軸を分ける）

- `dangling-reference` は「canonical 内の番号付き相互参照（compass の `Anti-direction N` / `INV N` / `DR N`）が、退避・統合・削除で**参照先を失って宙吊り（dangling）**になっていないか」を read-only で名指しする。`coinage-suspect` / `groundless-conclusion` / `unverified-hypothesis` と同じく意味的判定・候補提示・誤検知前提・停止しないで、`scripts/intent-check.mjs`・grep・正規表現の機械的一致には寄せない（INV2/A1＝LLM が成果物を読んで参照先の実在を確かめる）。
- **既存3軸と検出軸を分ける（必須）**: `coinage-suspect`＝台帳に無い造語／`groundless-conclusion`＝結論の根拠欠落／`unverified-hypothesis`＝仮説の証拠欠落／本軸 `dangling-reference`＝**参照先の実在欠落**（意味でなく参照の指す先の有無）。別検査として報告し所見を混ぜない（同一箇所に複数軸が当たっても重複検出にしない＝突合面が違う）。
- **対象を絞る（誤検知回避）**: compass 内の番号参照（`Anti-direction N` / `INV N` / `DR N`）に絞る。`[[memory-slug]]`（memory は別リポゆえ validate から実在照合できず誤検知が多い）と packet の `parent_intents` 参照は対象外（必要なら別案件）。番号振り直し（ID が別物に差し替わった）は本軸の射程外で、純粋な実在欠落に絞る。
- **射程を絞る（ノイズ回避）**: 対象は当該 validate 実行の新規/差分に揃え、既存 compass 全体を無差別に遡及スキャンしない（退避直後の全体点検は opt-in の別経路）。検査対象に番号参照が1つも無い・compass 不在のときは本検出をスキップして他検査を続行する（エラーにしない）。
- **read-only・改変は人**: 宙吊りの名指しは提示までで、参照先を自動で張り替えて canonical（intent-tree / compass / packets）を改変しない。記入・張替えは人が承認してからの別アクション（A7/INV5・INV42）。
- **gate にしない**: dangling の疑いは深刻度「情報」の一方向報告で export・実装を止めない（誤検知前提・drift-watch 思想・Anti-direction 218）。

## compass 規律の陳腐化検査の注記（canonical 規律そのものの生死・read-only・LLM 文脈・軸を分ける・INV54/DR75/A41）

- `compass-rule-decay` は「compass の Invariant / Decision Rule そのものが、参照先は在るが中身が現実と乖離した（前提崩れ）・長く引かれた形跡が無い（死蔵）・過去の完了 packet だけが参照する（遺物参照）**死蔵規律**になっていないか」を read-only で名指しする。`coinage-suspect` / `groundless-conclusion` / `unverified-hypothesis` / `dangling-reference` / `invariant-oracle-missing` と同じく意味的判定・候補提示・誤検知前提・停止しないで、`scripts/intent-check.mjs`・正規表現の機械的一致には寄せない（INV2/A1）。(a) 前提崩れの「影響パス（A38 記法）の指す先が実在するか」のような**意味判断を要さない単純パス突合のみ** Glob/Grep を補助に使ってよい（INV48 の利便性優先の例外）。
- **既存の staleness / 整合系軸と検出軸を分ける（必須）**: `dangling-reference`＝参照先の**消滅**（宙吊り）／`invariant-stale-vs-compass`＝compass 更新に対する**packet 側の追随漏れ**（時間軸・節更新日 vs packet 更新日）／`stale-questions` / `stale-assumptions`＝**未解決項目の滞留**／本軸 `compass-rule-decay`＝**canonical 規律そのものの生死**（参照先は在るが中身が腐った）。別検査として報告し所見を混ぜない（同一 Invariant/DR に複数軸が当たっても重複検出にしない＝突合面が違う）。名前も紛れないよう `invariant-stale-vs-compass`（packet 側の遅れ）と `compass-rule-decay`（規律の腐敗）を取り違えない。
- **判定材料の制約（数値閾値・git 履歴を持たない・必須）**: 期間・回数の数値閾値で機械判定しない（「N 日引かれていなければ陳腐化」等は INV2 違反）。判定は LLM がファイル内の打刻（compass の `Updated (...)` タグ・packet frontmatter の日付・deltas / drift-log の日付行）と参照関係を読む意味判断で行う。allowed-tools は `Read, Glob, Grep` のままで、時間軸の証拠が欲しくても Bash / `git log` を使わない（read-only 検査層の tool 契約・A40-(2) の発火痕跡が実装されても本軸はそれに依存しない）。
- **対象範囲（Invariant + Decision Rule に絞る）**: Anti-direction は対象外（母集合最大で洪水化リスクが高く、DR75 の Revisit で将来再訪）。
- **出力粒度（確度で分ける）**: (a) 前提崩れ＝実在照合で確度が高く件数も少ない見込みゆえ**個別所見**（当該 INV/DR の番号・根拠の逐語引用付き・actionable）。(b) 死蔵 / (c) 遺物参照＝状況証拠の「疑い」どまりゆえ**既定は件数サマリ1行**（`invariant-stale-vs-compass` の出力粒度と同型）で、個別列挙は利用者要求時のみ展開する（全件個別列挙で洪水化させない＝狼少年化の回避）。
- **射程（全体走査だが出力は絞る）**: 陳腐化は「動かないもの・差分に現れないものを見る軸」ゆえ全体走査が本質的に要る（当該実行の新規/差分に限定しない例外）が、出力は上記の粒度規律で絞る。
- **後方互換（未検証は明示スキップ）**: 判定材料が読めない（Updated タグ不在・packets 不在・active/ が空 等）対象は「落差なし」と誤標識せず**未検証対象として ID 付きで明示しスキップ**し、陳腐化を断定しない（Fail-Safe）。compass 不在・Invariant/DR が1つも無いときは本軸をスキップして他検査を続行する（エラーにしない）。
- **read-only・改変は人**: 死蔵規律の名指しは提示までで、canonical（intent-compass）を**自動で整理・削除・履歴退避しない**。整理の実行局面は人手または `/intent-improve` の再整合であり、検出（本軸）と修正を混ぜない。記入は人が承認してからの別アクション（A7/INV5・INV54）。
- **gate にしない**: 陳腐化の疑いは深刻度「情報」の一方向報告で export・実装を止めない（誤検知前提・INV49 の warn-only 思想を継承）。

## export 下書きの受入基準検査の注記（誤実装を弁別できるか・read-only・LLM 文脈・軸を分ける・INV55/DR76/A42）

- `requirement-oracle-check` は「export 下書きの各受入基準が、誤った実装を落とせる観測できる基準になっているか」を read-only で点検する。packet を切る段（`/intent-packets` の終端判定）では「誤った実装を落とせる基準か」を規律で締めているのに、下書きへ変換する過程で基準が曖昧になっても検査が無かった穴を、export の手前で拾う。`coinage-suspect` / `groundless-conclusion` / `unverified-hypothesis` / `dangling-reference` / `invariant-oracle-missing` / `compass-rule-decay` と同じく意味的判定・候補提示・誤検知前提・停止しないで、`scripts/intent-check.mjs`・正規表現・キーワードリストの機械的一致には寄せない（INV2/A1）。
- **判定する（意味的な読み）**: 各受入基準を読み、「この基準を満たしたと言い張る誤った実装を、この基準で弾けるか」を LLM が読む。弾けない弱い基準（観測できる入力・条件・期待結果が無い・主観語や願望だけ・例:「使いやすくする」「適切に動く」「高速に」）を候補として名指しし、観測できる形（入力→条件→期待結果）への詰め直し候補を添える。観測できる基準（何を入れると何がどうなるかが書かれている）は挙げない。
- **既存の品質/境界系軸と検出軸を分ける（必須）**: `requirements-smell`＝要求記述の**字面**（曖昧語・主観語・比較級・弱い語・未定義代名詞）を検出して引用する／`export-draft-mismatch`＝下書きと packet 定義の**整合**（転記のずれ・乖離）／本軸 `requirement-oracle-check`＝受入基準が**誤った実装を弁別できるか**（意味）。別検査として報告し所見を混ぜない。同じ弱い基準が `requirements-smell`（字面が曖昧）と本軸（誤実装を弾けない）の両方で挙がることは正常で、互いを黙らせない（突合面が違う）。
- **定義を二重に持たない**: 「誤った実装を落とせる観測できる基準」の定義の正本は `/intent-packets` の終端判定（`what + constraints + oracle` の oracle＝誤実装を落とせる観測可能な受入基準）にある。本軸はそれを export 下書きへ適用する検査であって、定義を validate 側に別立てで書き起こさない（参照に留める）。
- **射程（初回は export 下書きのみ）**: 対象は `.intent/cc-sdd/<スラッグ>/` と `.intent/openspec/<スラッグ>/` の下書き。`/intent-to-spec` が出す読める成果物（`.intent/nl-spec/`）の受入基準は初回の対象外（運用で必要性を見て将来広げる）。
- **後方互換（下書き不在はスキップ）**: export 下書きが1つも無いときは本軸をスキップして他検査を続行する（「基準に問題なし」と誤標識せず、検査対象なしとして扱う・エラーにしない）。
- **read-only・改変は人**: 弱い基準の名指しと詰め直し候補は提示までで、下書きも canonical（intent-tree / intent-compass / packets）も**自動で書き換えない**。反映は人が承認してからの別アクション（A7/INV5・INV55）。
- **gate にしない**: 弱い受入基準の指摘は深刻度「推奨」の一方向報告で、export・下流の spec フローを止めない（誤検知前提・INV49 の warn-only 思想を継承）。深刻度が「推奨」なのは、弱い基準は着工を止める矛盾ではなく、直すと下流へ渡す下書きの信頼性が上がる品質リスクだから（`requirements-smell` と同格）。

## 関係定石の採用漏れ検査の注記（明白に関係する定石領域の未検討・read-only・LLM 文脈・軸を分ける・A40/DR83 宿主⑤・INV57）

- `starter-coverage-gap` は「active packet の技術面に**明らかに関係する**定石領域が、採用も否認も保留も一度もされていないか」を read-only で点検する。定石の発火（候補提示）はどの宿主でも「当てはまりが弱ければ黙る」ため見落としが静かに通過しうる。供給側（発火）と検査側（validate）の両面を揃えるための軸で、export の手前で採用漏れに気づかせる。他の意味検査軸と同じく意味的判定・候補提示・誤検知前提・停止しないで、`scripts/intent-check.mjs`・正規表現・キーワードリストの機械的一致には寄せない（INV2/A1）。
- **判定する（意味的な読み・明白な組み合わせのみ）**: packet の Scope / Expected Behavior を読み、`.intent/constraint-starters.md` の領域インデックスと照らして「この packet が明白に触る技術面（例: 入力を外部公開する API 境界／永続データモデル／並行更新）に対応する定石領域が一度も検討されていない」ものだけを名指しする。誤検知を避けるため**明白な組み合わせに絞り**、微妙な当てはまりは出さない（誤検知より沈黙）。名指しには「どの領域ファイル（`.intent/constraint-starters/<領域>.md`）を見るか」の詰め直し候補を添える。
- **採否記録の器を読み、検討済みは黙る（INV57・DR84）**: 発行ディレクトリの `constraint-ledger.md` を read し、当該 packet に関係する定石が採用・否認・保留のいずれかで**検討済み**なら名指ししない（採用漏れではない）。器が読めない環境では名指しの確度を下げる（または沈黙側に倒す）。目的・文脈が否認時から変わったと読める否認済みは、再検討の余地として名指してよい（機械条件なし・INV2）。
- **関係領域だけ照合する（INV57・洪水化防止）**: カタログ全定石との総当たりはしない。親カタログの領域インデックスから packet の技術面に合う領域だけを見る（最小コストの pull）。
- **既存の品質系軸と検出軸を分ける（必須）**: `requirements-smell`＝字面の曖昧語／`requirement-oracle-check`＝受入基準が誤実装を弾けるか／`invariant-uninherited`＝compass 普遍 invariant の packet への継承漏れ／本軸 `starter-coverage-gap`＝**明白に関係する定石領域の未検討**。別検査として報告し所見を混ぜない。
- **後方互換（カタログ不在はスキップ）**: `.intent/constraint-starters.md` が無いときは本軸をスキップして他検査を続行する（「採用漏れなし」と誤標識せず、検査対象なしとして扱う）。
- **read-only・改変は人・gate にしない**: 名指しと詰め直し候補は提示までで、packet の `## Safety / Invariants` へ**自動で採用しない**（採用は人が判断）。深刻度「推奨」の一方向報告で export・実装を止めない（誤検知前提・INV49 の warn-only）。

## 所見の根拠固定の注記（evidence-anchored finding・全所見にかかる横断規律・read-only・LLM 文脈・INV50/DR73/A39）

- **これは検査カタログの1行（検出軸）ではなく、上記の全検出軸＋PBR 四観点＋境界検査が出す**すべての所見の出し方**にかける横断規律**である。カタログ表に軸として行を足さないのは、1軸に閉じ込めると他軸の所見に根拠固定がかからず、防ぎたい「根拠なき所見」が他軸から漏れるため（Anti-direction 230）。適用は `SKILL.md` の Step 4（報告）に一元化する。
- **逐語引用で根拠を固定する**: 各所見は、根拠となる canonical（`intent-tree.md` / `intent-compass.md` / packets）からの**逐語引用（verbatim quote）**をファイル名とともに添える。引用は改変せず verbatim（要約・言い換えをしない）。
- **裏づけできない所見は要修正に上げない**: canonical からの逐語引用で裏づけられない所見は深刻度を「要修正」に上げず1段下げて「推奨」どまりにする（OQ-eae-2）。裏づけられた所見はカタログの深刻度の目安どおり従来どおり要修正で出す。
- **判定は LLM 意味判断・機械照合でない**: 「逐語引用が所見を支えているか」の判定は意味的な読みで行い、grep・`scripts/intent-check.mjs`・正規表現の string-match には寄せない（意味的に的外れな引用でも文字列一致で通る表層一致の罠を避ける・Anti-direction 232・INV2/A1）。引用文字列そのものは verbatim。深刻度 cap は機械の自動減点でなく「裏づけできない所見は要修正に上げない」報告規律。
- **コールドスタート（Fail-Safe）**: canonical が空/未作成のときは逐語引用の裏づけ対象が無いため「引用の裏づけ不能」を明示し、所見を要修正に上げない（全所見を誤って抑圧しない・`unverified-hypothesis` の Fail-Safe と同型）。
- **behavior-preserving・gate にしない**: 本規律は既存軸の検出ロジック・出力形式・判定サマリ骨格（`要修正 N 件 / 推奨 M 件 / 情報 K 件`）を壊さず、所見への添え書きと深刻度 cap を横断で乗せるだけ（既存軸の温度＝沈黙・候補提示・自動改変しない・warn-only を保つ）。export・実装を止めない（INV49 の思想を継承）。取り込むのは手法であってツールでない（golden dataset / 回帰スイート / kappa / pairwise / promptfoo 等を製品へ内蔵しない・INV51）。

## 境界検査の注記（export 下書きの対象選定）

- export 下書き（`.intent/cc-sdd/<スラッグ>/*.md`）は **packet 毎に併存**する。export 下書き整合の境界検査の対象は `.intent/export-log.md` 最新行の packet のディレクトリに限る。過去 packet の下書きは設計上併存するため、その存在自体は違反として扱わない。

## 未検証対象の扱い（検証可能な範囲の原則）

1. 検証対象の成果物が未作成または未記入の場合、その成果物を必要とする検査はスキップする。
2. 残りの検査は検証可能な範囲で実施する（全体を中断しない）。
3. 報告には「未検証対象」を設け、スキップした検査と理由（どのファイルが未作成 / 未記入か）を明示する。
4. 例: `.intent/packets/` が無い（または active/ が空）→ 矛盾・カバレッジ・境界の packet 系検査をスキップし、tree/compass 単体で可能な検査（未解決 Question の滞留 等）のみ実施する。
