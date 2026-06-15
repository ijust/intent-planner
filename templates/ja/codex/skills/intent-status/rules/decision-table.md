# intent-status 推奨決定表（first-match、上から評価）

`intent-status` skill が「次の一手」をちょうど1つ決定するための正本。SKILL.md は手順と報告形式のみを持ち、判定は本表を参照する。すべての条件はファイルから機械的に観測可能であることを必須とする（status は Read/Glob/Grep のみで、git 履歴・タイムスタンプ・コード差分を直接は参照できない。唯一の例外は row 9 で、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の判定行を介した観測に限る — 脚注4参照）。

| # | 条件（ファイルから観測可能） | 推奨 |
|---|------|------|
| 1 | `.intent/` なし | セットアップ案内（終了） |
| 2 | intent-tree 未記入 or mode 未確定 | `/intent-discover` |
| 3 | compass 未記入 | `/intent-compass` |
| 4 | packets 未記入 | `/intent-packets` |
| 5 | packets に Invariants/Anti-direction との**明示的な文言衝突**（validate-checks の「要修正」級に限る）を読取中に検出 | `/intent-validate` |
| 6 | Status: pending の delta が滞留 | `/intent-writeback`（昇格再開） |
| 7 | 現行 Source Packet（最新 export）に対応する delta エントリなし、**かつ実装完了の証拠あり**。一次判定: 現行 Source Packet の `state` が `done`（`## Evidence` 確定済み）。補助信号: `state` が観測できない既存 packet（細分化前）への後方互換時のみ、対応する `.kiro/specs/` spec の tasks 全チェック済みを実装完了の証拠とみなす（`.kiro/` 不在の場合も本行に該当するが、推奨文言に「実装完了が前提。未完なら cc-sdd 実装を継続」を必須付記）。なお packet `state=done` だが kiro tasks 未完（またはその逆）の食い違いは「不整合」として報告に留め、自動で一方を正としない（宣言規律） | `/intent-writeback` |
| 8 | 現行 Source Packet に対応する delta エントリなし、かつ**実装進行中**。一次判定: 現行 Source Packet の `state` が `draft`/`ready`/`implementing`/`verifying`（`done` 未到達。`depends_on` に `done` でない packet があればブロック中＝着手前）。補助信号: `state` が観測できない既存 packet への後方互換時のみ、対応 spec の tasks 未完を実装進行中とみなす | アクション不要（注記: cc-sdd 実装を継続。`verifying` は Evidence 確定 → `state=done` 後に `/intent-writeback`） |
| 9 | enforcement（mode.md の `## Enforcement（ユーザー管理）` セクション）が remind または gate、かつ intent-check の判定行が grace なしの stale（`grace=-` かつ `result=stale`） | `/intent-writeback`（staleness の解消） |
| 10 | 「保留」タグ付きの見送り項目が残存 | `/intent-improve`（再提案または却下への確定を促す。タグの確定更新は `/intent-writeback` が行う） |
| 11 | active/ 配下に delta エントリ（deltas.md）の無い packet ファイルがあり、かつ現行 Source Packet と不一致（export 済みか未 export かは export-log.md に行があるか否かで判別 → 候補列挙 + ユーザー確認付き） | `/intent-validate`（問題なければ続けて `/intent-export-cc-sdd` または `/intent-writeback` をユーザーが選択） |
| 12 | 上記いずれもなし | アクション不要（常設注記: 実装の節目での定期的な `/intent-improve` を推奨） |

## 脚注

1. 優先順位は first-match で「ちょうど1つ」を保証する（上から評価し、最初に該当した行のみを採用する。複数候補の併記はしない）。各行の条件はすべて `.intent/`（+存在すれば `.kiro/specs/` の spec.json・tasks.md チェック状況）の記載内容のみから判定する。
2. row 7/8 の実装進捗の一次情報は現行 Source Packet 自身の `state`（`## Evidence` 確定状況）であり、kiro tasks は `state` を観測できない既存 packet への後方互換時の補助信号にすぎない。その補助信号における「対応する spec」は `.kiro/specs/` 配下の **spec ディレクトリ名および各 spec の requirements.md「Project Description (Input)」本文**と Source Packet 名のテキスト照合で特定し、特定できなければ row 7 の `.kiro/` 不在側（条件文言付き推奨）に倒す（export は feature 名を記録しないため照合不能は常態として設計し、頻度が高い場合の限界も deltas.md 運用説明の既知限界に含める）。
3. row 11 等の「ユーザー確認」は自然言語での候補提示とユーザー自身の次アクション判断を指す。status は read-only・一方向報告であり、対話確認ツールは使わない。packet ごとの下書き（`.intent/cc-sdd/<packetスラッグ>/`、Git 非追跡・ローカル専用）は永続保持され、export 履歴は `.intent/export-log.md` に記録されるため、「過去に export されたが書き戻されていない packet」の候補は export-log.md の全行 × 残存する `.intent/cc-sdd/<packetスラッグ>/` 下書き × deltas.md の突合で機械的に列挙できる（row 11 はその候補列挙にユーザー確認を添える）。この突合手順は deltas.md の運用説明にも記載されている。
4. row 9 の条件は、`node .intent/scripts/intent-check.mjs`（Bash 限定例外に基づく読み取り専用スクリプト。ファイルの作成・変更・削除を行わない）の stdout 1行目の判定行のみから観測し、再導出しない。enforcement が off・未記載・不正値のとき、または intent-check が実行不可（Bash 不可・スクリプト不在・exit 2）のときは本行に該当しない（現行動作）。pending delta の滞留は row 6 が先に拾うため、本行は staleness（grace なし）専用である。
