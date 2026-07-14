# intent-status 推奨決定表（first-match、上から評価）

`intent-status` skill が「次の一手」をちょうど1つ決定するための正本。SKILL.md は手順と報告形式のみを持ち、判定は本表を参照する。すべての条件はファイルから機械的に観測可能であることを必須とする（status は Read/Glob/Grep のみで、git 履歴・タイムスタンプ・コード差分を直接は参照できない。唯一の例外は row 9 で、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の判定行を介した観測に限る — 脚注4参照）。row 12（conformance 陳腐化の頃合い）は Read/Glob/Grep のみで成立し、intent-check には依存しない — 脚注7参照。row 13（未判定 drift の蓄積）も Read/Glob/Grep のみで成立する — 脚注12参照。

| # | 条件（ファイルから観測可能） | 推奨 |
|---|------|------|
| 1 | `.intent/` なし | セットアップ案内（終了） |
| 2 | intent-tree 未記入 or mode 未確定 | `/intent-discover` |
| 3 | compass 未記入 | `/intent-compass` |
| 4 | packets 未記入 | `/intent-packets` |
| 5 | packets に Invariants/Anti-direction との**明示的な文言衝突**（validate-checks の「要修正」級に限る）を読取中に検出 | `/intent-validate` |
| 6 | Status: pending の delta が滞留（deltas は脚注10の分割形横断読みで観測） | `/intent-writeback`（昇格再開） |
| 7 | 現行 Source Packet（最新 export）に対応する delta エントリなし、**かつ実装完了の証拠あり**。一次判定: 現行 Source Packet の `state` が `done`（`## Evidence` 確定済み）。補助信号: `state` が観測できない既存 packet（細分化前）への後方互換時のみ、対応する `.kiro/specs/` spec の tasks 全チェック済みを実装完了の証拠とみなす（`.kiro/` 不在の場合も本行に該当するが、推奨文言に「実装完了が前提。未完なら cc-sdd 実装を継続」を必須付記）。なお packet `state=done` だが kiro tasks 未完（またはその逆）の食い違いは「不整合」として報告に留め、自動で一方を正としない（宣言規律） | `/intent-writeback` |
| 8 | 現行 Source Packet に対応する delta エントリなし、かつ**実装進行中**。一次判定: 現行 Source Packet の `state` が `draft`/`ready`/`implementing`/`verifying`（`done` 未到達。`depends_on` に `done` でない packet があればブロック中＝着手前）。補助信号: `state` が観測できない既存 packet への後方互換時のみ、対応 spec の tasks 未完を実装進行中とみなす | アクション不要（注記: cc-sdd 実装を継続。`verifying` は Evidence 確定 → `state=done` 後に `/intent-writeback`） |
| 9 | enforcement（mode.md の `## Enforcement（ユーザー管理）` セクション）が remind または gate、かつ intent-check の判定行が grace なしの stale（`grace=-` かつ `result=stale`） | `/intent-writeback`（staleness の解消） |
| 10 | 「保留」タグ付きの見送り項目が残存 | `/intent-improve`（再提案または却下への確定を促す。タグの確定更新は `/intent-writeback` が行う） |
| 11 | active/ 配下に delta エントリ（deltas を脚注10の分割形横断読みで観測）の無い packet ファイルがあり、かつ現行 Source Packet と不一致（export 済みか未 export かは export-log を脚注10の分割形横断読みで観測し行があるか否かで判別 → 候補列挙 + ユーザー確認付き） | `/intent-validate`（問題なければ続けて `/intent-export-cc-sdd` または `/intent-writeback` をユーザーが選択） |
| 12 | conformance 陳腐化の頃合い: intent-compass.md の節更新日（`Updated (Invariants):` / `Updated (Decision Rules):` のいずれか、実打刻＝`—` でない）が、active/ 配下の packet の `updated_at`（実打刻のもの）より新しく、その「compass 更新後に未追随」の packet が **閾値件数（既定: 1 件）以上**ある（頃合いの概算。確定診断は validate に委ねる） | `/intent-validate`（compass 更新が packet に追随しているかの照合。conformance 陳腐化の点検） |
| 13 | drift-watch（mode.md の `## Drift-watch（ユーザー管理）` セクション）が on、かつ drift-log の active 面（脚注12の分割形横断読み）に `user-verdict: unjudged` のエントリが3件以上蓄積 | `/intent-improve`（未判定の逸脱記録の消化と節目の再整合。詳細に件数・pattern 内訳を併記 — 脚注12） |
| 14 | 上記いずれもなし | アクション不要（常設注記: 実装の節目での定期的な `/intent-improve` を推奨） |

## 脚注

1. 優先順位は first-match で「ちょうど1つ」を保証する（上から評価し、最初に該当した行のみを採用する。複数候補の併記はしない）。各行の条件はすべて `.intent/`（+存在すれば `.kiro/specs/` の spec.json・tasks.md チェック状況）の記載内容のみから判定する。
2. row 7/8 の実装進捗の一次情報は現行 Source Packet 自身の `state`（`## Evidence` 確定状況）であり、kiro tasks は `state` を観測できない既存 packet への後方互換時の補助信号にすぎない。その補助信号における「対応する spec」は `.kiro/specs/` 配下の **spec ディレクトリ名および各 spec の requirements.md「Project Description (Input)」本文**と Source Packet 名のテキスト照合で特定し、特定できなければ row 7 の `.kiro/` 不在側（条件文言付き推奨）に倒す（export は feature 名を記録しないため照合不能は常態として設計し、頻度が高い場合の限界も deltas.md 運用説明の既知限界に含める）。
3. row 11 等の「ユーザー確認」は自然言語での候補提示とユーザー自身の次アクション判断を指す。status は read-only・一方向報告であり、対話確認ツールは使わない。packet ごとの下書き（`.intent/cc-sdd/<packetスラッグ>/`、Git 非追跡・ローカル専用）は永続保持され、export 履歴は export-log（脚注10の分割形横断読み）に記録されるため、「過去に export されたが書き戻されていない packet」の候補は export-log 全行 × 残存する `.intent/cc-sdd/<packetスラッグ>/` 下書き × deltas（脚注10）の突合で機械的に列挙できる（row 11 はその候補列挙にユーザー確認を添える）。この突合手順は deltas の運用説明にも記載されている。**候補を複数列挙するときの並びは、`.intent/packets/plan.md` に「工程計画」節（人が宣言したグループ見出しと着手順）があればその推奨着手順（上から順・`done`/依存未解決/他セッション着手中を飛ばす・`depends_on` が常に勝つ＝DR139 の導出規則を共有）を反映してよい（節が無ければ従来どおりの並び）。これは表示の並びの反映に留まり、決定表の row 構造・first-match・「次の一手ちょうど1つ」は一切変えない（並び順＝優先で日付・スコアは持ち込まない・INV62/INV81）。**
4. row 9 の条件は、`node .intent/scripts/intent-check.mjs`（Bash 限定例外に基づく読み取り専用スクリプト。ファイルの作成・変更・削除を行わない）の stdout 1行目の判定行のみから観測し、再導出しない。enforcement が off・未記載・不正値のとき、または intent-check が実行不可（Bash 不可・スクリプト不在・exit 2）のときは本行に該当しない（現行動作）。pending delta の滞留は row 6 が先に拾うため、本行は staleness（grace なし）専用である。
5. 「次の一手」で提示しうる各コマンドの平易な一言（下表）。これは status 出力でコマンド名に添えて利用者の理解を助けるための**純粋な説明**であり、推奨先の同定・条件・優先順位（first-match）には一切関与しない（どの条件でどのコマンドを推すかは上の表本体のみが決める）。

   | コマンド | 一言説明 |
   |------|------|
   | `/intent-discover` | 最初の意図整理（やりたいことを intent-tree と mode に書き起こす） |
   | `/intent-compass` | 判断基準づくり（局所最適を防ぐ Invariants/Anti-direction を定める） |
   | `/intent-packets` | 作業単位への分割（cc-sdd に渡せる粒度の packet に切り出す） |
   | `/intent-validate` | 矛盾・抜けの点検（packet と判断基準の文言衝突などを洗い出す） |
   | `/intent-writeback` | 実装結果を意図へ反映（delta を昇格し成果物を事後更新する） |
   | `/intent-improve` | 再整合の提案（保留項目の確定や定期的な見直しを促す） |
   | `/intent-export-cc-sdd` | cc-sdd へ受け渡し（現行 Source Packet を実装フローへ export する） |

6. **工程レール5信号との対応**: status の冒頭ミニレール（SKILL.md Step 5 ①）は本表の結果を人間可読に翻訳する**表示層**であり、本表のロジック（first-match・row の条件）を変えない。信号の判定正本は overview の `progress-readout.md`「工程レール」にあり、本表との関係は次のとおり（参考対応。厳密な分岐は本表の first-match が正）: 🔴 反映漏れ（export 済み・未反映の取り残し）= row 6/7（`/intent-writeback`）が拾う対象。🔵 今ここ（現行 Source Packet の未反映）= row 6/7/8 のいずれか（実装の進捗で分岐）。⚪ 未着手（未 export）= row 8/11（着手＝cc-sdd 実装継続 or export）。✅ 反映済のみ（未反映・未着手が無い）= row 14（アクション不要。ただし row 12 の conformance 陳腐化の頃合い・row 13 の未判定 drift 蓄積に該当すればそちらが先に拾う）。◻ 統合済（`superseded_by` 非空）はレール表示専用で、それ自体は次の一手を発火させない（整合検査で滞留があれば報告する）。

7. **row 12（conformance 陳腐化の頃合い）の観測と温度感**: 本行は status の Read/Glob/Grep のみで成立する（row 9 のような intent-check 起動を要さない・read-only を一切広げない）。観測手順は (a) `.intent/intent-compass.md` の `Updated (Invariants):` / `Updated (Decision Rules):` 行の ISO 8601 値を読む、(b) `.intent/packets/active/` 各 packet の frontmatter `updated_at` を読む、(c) compass 節更新日 > packet `updated_at` を満たす packet を「未追随」として数える、の3点で、比較は ISO 8601 文字列の辞書順による（`invariant-stale-vs-compass` と同型）。両端が実打刻（`—`／不在でない）のペアのみを対象とし、`updated_at` 不在の packet は対象外（推測で埋めない。後方互換規律）。閾値（未追随件数）は既定 1 件で、行末に明示する。これは「validate を回す頃合い」の**概算**であり、status は確定診断をしない（要修正/推奨の確定は `/intent-validate` の `invariant-stale-vs-compass` 等が行う）。row 5/11 の validate（要修正級の文言衝突・不一致）が先に該当すればそちらが優先され、本行は他に緊急の一手が無いときの「頃合い提案」として row 13（未判定 drift 蓄積）・row 14（アクション不要）の手前で発火する。compass を更新しない純粋な時間経過は本行では捉えない（validate 実行時点を記録しない設計上の近似）。

8. **intent-tree 起票漏れ検査（discover スキップ）の照合手段**: 本検査は決定表のどの row も発火させない**報告専用**の検査であり（次の一手の first-match を奪わない）、SKILL.md Step 2 で把握し Step 5 ③ 詳細に併記する。照合は既存の対応 spec 照合（脚注2の手段）を再利用する: `.kiro/specs/` 配下の **spec ディレクトリ名**および各 spec の **requirements.md「Project Description (Input)」本文**を、`.intent/intent-tree.md` の **L0〜L4 の見出し・本文**（L0 Product Purpose / L1 Desired Outcomes / L2 Capabilities / L3 Behavioral・Architectural Intents / L4 Candidate Packets）とテキスト照合する。intent-planner の intent-tree ノードは **L0〜L4 のレベル記号**で表され、`O#`/`C#`/`B#`/`P#` のような **ID アンカーは存在しない**ため、照合は ID ではなくテキスト照合のみで行う。対象は spec.json が requirements 以降のフェーズ・または tasks.md に1つ以上チェック済みタスクがある「設計/実装が進んだ spec」に限る。照合は **ファイルから機械観測できる範囲**に限る（git 履歴・コード差分・タイムスタンプは見ない）。照合不能は常態（export は feature 名を記録しない既知限界。脚注2と同性質）として誤検知を許容し、**断定せず**候補提示にとどめる。`.intent/intent-tree.md` 不在または `.kiro/specs/` 不在の環境では本検査を省略する。

9. **起票漏れ／孤児 spec／writeback 漏れの3階層棲み分け（二重警告の回避）**: 設計ドラフトのみ先行した spec は、上流から下流へ次の3層のいずれか（または複数）に該当しうる。**①intent-tree 起票漏れ（discover スキップ＝tree 層。脚注8）— intent-tree への起票そのものをスキップ。②孤児 spec＝Packet 不在（packet 層。SKILL.md Step 2 の孤児 spec 検査）— intent-tree には起票されたが Packet を経ずに実装。③writeback 漏れ（下流層。row 6/7/9 の `/intent-writeback` 系・鮮度警告）— Packet 実装後に canonical へ未反映。** 同一 spec が複数層に該当する場合は、**最上流の1層でのみ提示**し、下流層では重ねて警告しない（上流が該当する spec を下流の孤児 spec 検査・鮮度警告で二重に出さない）。提示時は `discover → packets → writeback` の段階対処として案内し、まず最上流の不足から順に埋めるよう促す。この棲み分けは status の報告（Step 5 ③）に閉じた整理であり、決定表本体の first-match（次の一手1つ）には影響させない（①②は報告専用、③のみ row として next-move を発火させうる）。

10. **append-only 記録の分割形横断読み（deltas / export-log。INV25・D6）**: `deltas` / `export-log` を読むときは、**分割形 `.intent/<rec>/*.md` 群（あれば正本・自然キー昇順）→ 無ければ旧 `.intent/<rec>.md`（生成 active ミラー）への read fallback** の順で横断読みする（overview の `aggregate-sources.md` と同一規律。分割しても通読できる）。分割形と旧単一ミラーが共存するときは**分割形を正本**とし、ミラーを二重に数えない（同一エントリの二重計上を避ける）。archive（`.intent/<rec>/archive/`）は履歴であり、status の active 面の判定（書き戻し漏れ突合・現在地・孤児 spec 照合）では active を薄く読む（archive を active 集計に混ぜない）。読み取りのみで、いずれのファイルも変更しない（read-only・INV2/A3）。この規律は移行前の単一ファイル形式（旧 scaffold）でも壊れない（read fallback で同じ突合結果を返す＝behavior-preserving・Anti-direction 88）。

11. **DB 設計おすすめの手がかり（報告専用・first-match を奪わない・INV35(5)/A3）**: active/ 配下の packet が**永続データモデルを設計する責務**を持つと判定できるとき、status は次の一手の注記として「この packet は DB 設計を伴う＝`/intent-db-design` が効きそう」を**併記**する（おすすめ）。判定は **Read/Glob/Grep のみ**のテキスト照合の手がかりで行い、機械スコアリングに寄せない（INV2）。手がかり: packet の `## Scope` / `## Expected Behavior` 本文にテーブル・スキーマ・カラム・永続・DB・migration・index・制約・正規化 等の語があるか、対象案件に既存スキーマ/migration が Grep で同定できるか。**対象外（promote しない）**: 揮発データのみ・フロント専任（既存 DB を API 越し消費）等、永続データモデルの設計責務が手がかりから読み取れないもの。本おすすめは **report 専用で決定表のどの row も発火させず、first-match の「次の一手1つ」を奪わない**（脚注8/9 の報告専用検査と同温度）。発動は人間手動のままであり、status は `/intent-db-design` を自動起動しない（INV35(5)・A3＝状態機械を持たない・新 CLI コマンドを増やさない）。判定が曖昧（手がかりが弱い）なときは断定で promote せず、候補に弱めるか出さない（過剰 promote より控えめ＝誤判定の害はおすすめ1行で止まる）。`.intent/packets/active/` 不在の環境では本おすすめを省略する。

12. **row 13（未判定 drift の蓄積）の観測と温度感（INV77・DR123）**: 本行は Read/Glob/Grep のみで成立する（スクリプト起動を要さない・read-only を一切広げない）。観測手順は (a) `.intent/mode.md` の `## Drift-watch（ユーザー管理）` セクションの値が `on` であること（`off`・未記載・不正値・セクション不在・mode.md 不在は非該当）、(b) drift-log を**分割形横断読み**で読む: 分割形 `.intent/drift-log/*.md` 群（あれば正本・`archive/` は数えない）→ 無ければ旧 `.intent/drift-log.md` への read fallback。共存時は分割形を正本とし、同一エントリを二重に数えない（脚注10と同じ規律）、(c) `user-verdict: unjudged` を持つエントリ数を数え、**3件以上**で該当する、の3点。閾値は**固定値3**であり、設定キー・状態ファイルを持たない（変えたくなったら配布物の改訂で行う）。該当時の推奨は read-only の提示までで、`/intent-improve` を自動実行せず、条件未達で他工程を止めることもしない。根拠（unjudged 件数・pattern 内訳）は SKILL.md Step 3.5 の集計ブロックに併記する（断定を避けた温度・「未判定の記録が貯まっています」の候補提示）。drift-log が不在・エントリ0・観測不能のときは本行に該当しない（fail-open・誤誘導しない）。

13. **判断ライフサイクル候補（詳細面だけの report-only 注記）**: 明示的なファイル根拠から候補を一意に読める場合だけ、詳細面へ**最大1件**を併記する。提示する一件は、対象 Decision / Invariant ID、根拠、新事実または前提変化、次に人が選ぶ必要がある判断を含む。根拠が曖昧、または候補が複数で一意に絞れない場合は沈黙し、値や優先度を推測しない。この注記は read-only で、新しい state や再提示抑制記録を追加しない。決定表14行の first-match と高優先の「次の一手」は従来どおり一つのままとし、この候補で置換も追加もしない。
