# Decision Probe（意図版 Self-Probing）

決定地点で、エージェント自身の**仮説（暫定の確信）**を `.intent/` の証拠で裏取りし、確信と矛盾する証拠を第一に read-only で名指しする手順。`/intent-packets` の Step 3（packet 起草・decision slot を埋める局面）で適用する。

**狙い**: packet を切る・decision slot を埋めるとき、エージェントは「map をコピーして出力先を変えるだけ」のような暫定の確信で素通りしようとする。その確信を、台帳（compass の Invariant/Decision Rule・glossary・過去 deltas・関連 packets）の証拠で裁ければ、台帳が既に答えを持つのに見落とされる逸脱（drift）を決定の瞬間に防げる。これは「決定前の落差検出」であり、coinage-suspect / groundless-conclusion（事後検出）に対して**事前**に効く（A30・C19・INV37・DR61）。

## 適用条件（絞り込みゲート (i)：発火地点を絞る）

- **load-bearing な決定地点でのみ発火する。** 全 packet・全決定で常時 probe しない。発火するのは、その決定が「触れる concern の数 × 既存境界への波及の広さ」で見て一定以上＝後から覆すと波及が大きい決定（packet の切り方・前倒し固定する decision slot・既存境界との整合方針 等）。
- 機械的編集・タイポ・変数名・byte 等価追加など、Invariant にも Decision Rule にも触れない決定では**発火しない**（probe コストを積まない＝最小コスト原則）。
- load-bearing の見立ては packet 切り見立て（触れる concern × 境界波及）の質的判定を流用する。工数見積もりの数値は持ち込まない。

## 手順

### 1. Self-Probing（仮説と問いを言語化する）
- 当該 packet／決定について、次の2つを言語化する:
  - **仮説（confirmed pattern）**: その決定について今わかっている／確信していること（暫定の確信）。
  - **問い（open question）**: 次の決定を変えうる未解決の問い。「もしこれが違ったら decision slot の値が変わる」ものに限る。
- 問いは少数精鋭にする（決定を変えない問いは出さない）。

### 2. 証拠を pull する（絞り込みゲート (ii)：問いを証拠が実在するものに絞る）
- 各問いを起点に、`.intent/` から検証／反証する証拠を pull する。証拠源は compass の Invariant / Decision Rule、glossary の正規語彙、過去 deltas、関連 packets。
- **個人台帳 `.intent/constraint-library.md`（利用者が育てた制約）も証拠源に加える（手段ベースの制約のみ・read-only 候補提示）**: この決定地点（packet 起草・decision slot を埋める局面＝実装フェーズ）は、`/intent-compass` では死蔵しやすい手段ベースの制約（SKILL 編集・DB 設計など実装の手段の局面で効く・`適合する状況` に「いつ効くか」が書かれているもの）が発火すべき場所。台帳を read し、案件文脈と意味照合して合致する手段ベースの制約を read-only の候補として名指しする（constraint-library-firing・A32・INV39）。歯止めは本手順と同型: 候補提示まで（canonical も library も自動改変しない）・当てはまりが弱ければ黙る（台帳全件を読まない）・意味照合（機械スコアリングしない）・repo 内のみ（外部証拠源を読まない）。台帳が不在、または手段ベースの合致が無ければ何も出さない（沈黙）。詳細な仕分け規約は `intent-compass/rules/constraint-surfacing.md` 手順2・6 を参照。
- **同梱定石カタログ `.intent/constraint-starters.md`（親カタログの領域インデックス）も証拠源に加える（この packet が触る技術面の関係領域だけ・read-only 候補提示）**: packet 起草は「この packet がどの技術面（API 境界・データ永続・並行更新・フロントエンド 等）に触るか」が具体化する局面なので、その領域の定石（`.intent/constraint-starters/<領域>.md`）が効く場所（A40・DR83 宿主①）。親カタログの領域インデックスを read し、この packet の Scope / Expected Behavior と照らして**関係しそうな領域ファイルだけ**を pull する（全領域を常時ロードしない）。合致する定石の `叩き台`（Anti-direction 候補・Invariant 候補）を read-only の候補として名指しし、採用したものは人が packet の Safety / Invariants へ手で取り込む（自動転記しない・INV24/A7）。歯止めは個人台帳と同型（候補提示まで・弱ければ黙る・意味照合・repo 内のみ）。カタログ不在ならスキップ（沈黙・後方互換）。
- **採否記録の器を読み、採否済みは再提示しない（INV57・DR84）**: 上記2つ（個人台帳・同梱カタログ）を候補提示する前に、引き継がれた発行ディレクトリの `constraint-ledger.md`（`.intent/discovery/<スラッグ>-<rand>/constraint-ledger.md`・無ければ沈黙）を read する。同一発行系列で既に採否（採用/否認/保留）が付いた定石は**再提示しない**。ただし、この packet の目的・文脈が否認時の文脈一行から変わったと意味照合で読めるときは、否認済みも候補へ戻してよい（機械条件を持たない・INV2）。候補提示に利用者が採否を付けたら、器へ1行追記する（`| 定石id | 局面=packets | 採否 | 文脈一行 | 日付 |`・否認は文脈一行必須）。器・発行ディレクトリの不在時は記録をスキップする（停止しない）。記録の詳細規約は `.intent/discovery/README.md` の「定石の採否記録」を正とする。
- **pull 規律（全ロードしない）を守る**: 該当 packet ＋関係する Invariant / Decision Rule だけを引く。Compass 全文・Tree 全文を読み込まない。
- **領域タグで compass を部分ロードする（INV47・DR71）**: compass の各 Anti-direction / Invariant / Decision Rule には領域タグ（行末の `[領域: <name>]`・横断は `[領域: always]`）が標識されている（compass-category-tag-grep-filter）。証拠を pull するとき、案件の領域に合うタグ + `[領域: always]`（横断 Invariant＝INV2/INV9/A1 等・全作業共通）だけを grep で引いて部分ロードする（全文を読まない）。**横断（always）は必ず含める**（領域フィルタで落とすと drift＝Anti-direction 226）。タグが付いていない項目は従来どおり全文読みにフォールバックしてよい（後方互換・タグは seed で全項目に付いているとは限らない）。この grep フィルタは自然言語規約として行い、補助スクリプト（`intent-check.mjs` 等）に寄せない（INV2/A1・DR71）。
- **証拠が実在する問いだけを残す**: 対応する Invariant / Decision Rule / delta が `.intent/` から辿れない問いは、probe からは落とす（台帳に裏が無い問いを並べない）。本当に人に諮るべき問いは、probe の出力でなく packet の Open Questions の別レーンへ回す。
- この絞りで、証拠 pool が薄い／無関係／確信の作り話（hallucination）の3つが入口で落ちる。

### 3. 支援ビューを出す（反証を第一に・read-only）
- pull した証拠と仮説を突き合わせ、次の3つを read-only で名指しする:
  - **確信と矛盾する証拠（反証・最優先）**: 「あなたの確信 X は INV/DR Y に抵触する」を**最初に**出す。証拠を確信の追認にだけ使わない（追認装置にしない）。
  - **証拠で答えられた問い**: 「この問いは delta／Decision Rule Z が答えを持つ」。
  - **人に諮るべき残る問い**: 反証できる正解が `.intent/` に無い問いは断定せず保留し、Open Questions へ。
- **温度**: 候補提示に留め断定しない（誤検知前提）。判定に迷う場合は出さない。

## 規律

- **read-only・canonical を自動改変しない（最重要）**: probe の出力は人が読む支援ビュー。確信の訂正を canonical（intent-tree / intent-compass / packets）へ自動反映しない（A7/INV5・INV37）。記入は人が承認してからの別アクション。
- **warn-only・gate にしない**: 確信が裏取れなくても export や実装を止めない。正当に確信で進める箇所（自明な決定・既出の根拠で足りる決定）を阻害しない（DR23 の裸許容と同型）。
- **意味的判定・機械検査に寄せない（INV2/A1）**: 「問いに証拠が引けるか／確信が抵触するか」は意味的な読み。`scripts/intent-check.mjs`・必須フィールドの有無・正規表現の機械的一致に寄せない。
- **沈黙**: load-bearing な決定が無い／証拠と矛盾する確信が1件も無いときは、probe の出力を**一切発火しない**。
- **コールドスタート**: `.intent/`（証拠 pool）が読めない／空（新規 repo で Invariant がまだ薄い）のときは probe をスキップし、「証拠 pool が無いため probe をスキップ」を明示する（証拠の裏が無い問いを洪水のように出さない）。
- **A29(corrective-intent) と軸を分ける**: 本手順は**仮説**を**検証／反証する証拠**で裁く（事前・検証）。A29 の「結論に**根拠（rationale・履歴）**を併走させる」（事後・保存）とは別軸。同じ問いを二重に出さない。
- **designer-questions / decision slot 播種とレーンを分ける**: 本手順は AI が自分の仮説を出して裁く＝**既知の落とし穴の再発防止**。designer-questions（人間→AI の詰め）・decision slot 播種（新領域の決定スロット＝**未知の新領域の問い出し**）とは向きが逆で、役割が違う。同じ問いを二重に出さない。
- コードを変更しない。
