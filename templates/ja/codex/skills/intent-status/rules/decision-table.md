# intent-status 推奨決定表（first-match、上から評価）

`intent-status` skill が「次の一手」をちょうど1つ決定するための正本。SKILL.md は手順と報告形式のみを持ち、判定は本表を参照する。すべての条件はファイルから機械的に観測可能であることを必須とする（status は Read/Glob/Grep のみで、git 履歴・タイムスタンプ・コード差分は参照できない）。

| # | 条件（ファイルから観測可能） | 推奨 |
|---|------|------|
| 1 | `.intent/` なし | セットアップ案内（終了） |
| 2 | intent-tree 未記入 or mode 未確定 | `/intent-discover` |
| 3 | compass 未記入 | `/intent-compass` |
| 4 | packets 未記入 | `/intent-packets` |
| 5 | packets に Invariants/Anti-direction との**明示的な文言衝突**（validate-checks の「要修正」級に限る）を読取中に検出 | `/intent-validate` |
| 6 | Status: pending の delta が滞留 | `/intent-writeback`（昇格再開） |
| 7 | 現行 Source Packet（最新 export）に対応する delta エントリなし、**かつ実装完了の証拠あり**（対応する `.kiro/specs/` spec の tasks 全チェック済み。`.kiro/` 不在の場合も本行に該当するが、推奨文言に「実装完了が前提。未完なら cc-sdd 実装を継続」を必須付記） | `/intent-writeback` |
| 8 | 現行 Source Packet に対応する delta エントリなし、かつ対応 spec が**実装進行中**（tasks 未完） | アクション不要（注記: cc-sdd 実装を継続。完了後に `/intent-writeback`） |
| 9 | 「保留」タグ付きの見送り項目が残存 | `/intent-improve`（再提案または却下への確定を促す。タグの確定更新は `/intent-writeback` が行う） |
| 10 | packets.md に delta エントリの無い packet があり、かつ現行 Source Packet と不一致（export 済みか未 export かは判別不能 → 候補列挙 + ユーザー確認付き） | `/intent-validate`（問題なければ続けて `/intent-export-cc-sdd` または `/intent-writeback` をユーザーが選択） |
| 11 | 上記いずれもなし | アクション不要（常設注記: 実装の節目での定期的な `/intent-improve` を推奨） |

## 脚注

1. 優先順位は first-match で「ちょうど1つ」を保証する（上から評価し、最初に該当した行のみを採用する。複数候補の併記はしない）。各行の条件はすべて `.intent/`（+存在すれば `.kiro/specs/` の spec.json・tasks.md チェック状況）の記載内容のみから判定する。
2. row 7/8 の「対応する spec」は `.kiro/specs/` 配下の **spec ディレクトリ名および各 spec の requirements.md「Project Description (Input)」本文**と Source Packet 名のテキスト照合で特定し、特定できなければ row 7 の `.kiro/` 不在側（条件文言付き推奨）に倒す（export は feature 名を記録しないため照合不能は常態として設計し、頻度が高い場合の限界も deltas.md 運用説明の既知限界に含める）。
3. row 10 等の「ユーザー確認」は自然言語での候補提示とユーザー自身の次アクション判断を指す。status は read-only・一方向報告であり、対話確認ツールは使わない。単一スロット制約により「過去に export されたが書き戻されていない packet」は機械判定できない（row 10 がユーザー確認付きで補う）。これは設計上の既知の限界であり、deltas.md の運用説明にも記載されている。
