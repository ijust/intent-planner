---
name: intent-improve
description: 実装後に .intent/ 成果物と実装の現実を completeness / correctness / coherence の3軸で突き合わせ、ズレを分類して是正案を提示する。反映はユーザー承認後のみ。書き戻し漏れは /intent-writeback へ誘導する。
---

# intent-improve Skill

## Core Mission
- **Success Criteria**:
  - `.intent/` 成果物と実装の現実（コードベース・テスト・cc-sdd spec の進行状況）を3軸（completeness / correctness / coherence）で評価している
  - 評価結果を5分類（aligned / intent 強化推奨 / 是正 packet 推奨 / Decision Rules 更新推奨 / invariant 違反検出）で、根拠（ファイル / 該当記述）付きで提示している
  - `.intent/` への反映はユーザーが承認した是正のみ（承認単位は提案ごと）
  - 書き戻し未実施の学びを検出したら、自ら delta を書かず `/intent-writeback` の実行を促している
  - drift-watch が on のとき coherence 検出を drift-log に stage:improve・outcome:missed で記録し pattern×outcome 改善度レポートを出している（off / 未記載 / 不正値 / 節不在 / mode.md 不在のとき何もしない。5分類は不変）
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 現状を収集する
- `.intent/` の成果物（intent-tree.md / intent-compass.md / `.intent/packets/index.md` + active/ 配下の packet ファイル（completeness 軸の横断読み。archive/ は読まない） / `cc-sdd/<スラッグ>/` 配下の packet 毎下書き / deltas.md）を読む。`.intent/` が無ければセットアップ（intent-planner のインストールと `/intent-discover` の実行）を案内して停止する。
- `.intent/mode.md` を読む。無ければ standard 既定で続行し告知する。
- 実装の現実を収集する: コードベース（Read/Glob/Grep の読み取りのみ）、テストの有無と配置、`.kiro/specs/` の進行状況（存在する場合のみ）、deltas.md の promoted / pending エントリ。
- `.kiro/` が無ければ cc-sdd 文脈なしで継続する。deltas.md が無ければ「delta 記録なし」として継続する（非ブロッキング）。
- 引数で対象範囲が指定されていればそこに絞る。なければ `.intent/` 全体を対象とする。

### Step 2: 3軸で評価する
- `rules/improve-axes.md` を読み、completeness / correctness / coherence の3軸で `.intent/` と実装の現実を突き合わせる。
- 評価には必ず根拠（ファイル / 該当記述）を添える。根拠を示せない評価は提示しない。

### Step 3: 分類して報告する
- 評価結果を5分類（aligned / intent 強化推奨 / 是正 packet 推奨 / Decision Rules 更新推奨 / invariant 違反検出。複数該当可）し、分類ごとに整理して提示する。
- 書き戻し未実施の学びや「保留」タグ付きの見送り項目を検出したら、`rules/improve-axes.md` の規定に従い `/intent-writeback` への誘導を併記する。
- drift-watch が on のとき（off / 未記載 / 不正値 / 節不在 / mode.md 不在は何もしない）: `.intent/mode.md` の `## Drift-watch（ユーザー管理）` セクションの `drift-watch` 値を確認し、`on` のときのみ、`rules/improve-axes.md` の規定に従い coherence 軸で検出した逸脱（invariant 違反 / anti-direction 抵触）を `.intent/drift-log.md` へ `stage: improve` / `outcome: missed` の下書きとして記録し、`pattern × outcome` クロス集計の改善度レポートを出す。記録手順の詳細（9キー固定順・append-only・commit 取得・drift-log 不在時の新規作成）は `rules/improve-axes.md` に委ねる（ここでは重複させない）。この記録は**新しい是正分類を作らず**（上の5分類は不変）、deltas.md への書き込みや writeback フックも行わない。off / 未記載 / 不正値 / 節不在 / mode.md 不在のときは drift 記録・集計を行わず現行どおり進む（現行動作とバイト等価）。なお上の5分類の報告は drift-watch の値によらず常に行う。

### Step 4: 是正案を提案ごとに承認確認する
- 是正が必要な項目ごとに是正案（成果物の更新案または是正 packet 案）を提示し、**提案ごとに**利用者に自然言語で問い、回答を待つ（一括承認を強要しない）。
- 承認されなかった提案は提示のみで終了する（書き換えない）。

### Step 5: 承認された是正のみ反映する
- 承認された是正のみ canonical 成果物（intent-tree.md / intent-compass.md / `.intent/packets/` 配下（対象 packet ファイル・plan.md））へ反映する。
- `.intent/packets/` 配下の canonical を変更した場合（delta 昇格を対象 packet ファイルへ反映した時を含む）、`.intent/packets/index.md` を active/ 配下の frontmatter から再生成する。
- Decision Rules を変更する是正は `rules/improve-axes.md` の変更規約（ADR 形式で新エントリ追加 + 旧エントリへ superseded・後継参照を明記して `.intent/compass-archive.md` へ退避）に従う。
- deltas.md には書き込まない（delta の記録・見送りタグの確定更新は `/intent-writeback` の責務）。

## Output Description
- 3軸評価サマリ
- 分類別の検出と是正案（根拠付き）
- 承認待ちリスト（提案ごと）
- writeback 誘導（該当時: `/intent-writeback` の実行案内）
- 改善度レポート（drift-watch=on のとき）: drift-log を `pattern × outcome` でクロス集計したレポート。誠実さ注記（`missed=0` は記録漏れの疑い / `false-positive` 多発は anti-direction が広すぎる疑い）を必ず添え、集計キーは型（pattern）に揃え、群間比較（なし群 / あり群）は型 id と drift-log の `commit` 列のみで成立させる（追加の比較機構は作らない）。

## Safety & Fallback
- ユーザー承認なしに `.intent/` 成果物を書き換えない。承認は提案ごとに利用者に自然言語で問い、回答を待って確定する。
- アプリケーションコードは変更しない（INV6。コードは Read/Glob/Grep の読み取りのみ）。
- `.kiro/` には書き込まない（進行状況の読み取りのみ）。`.kiro/` 不在は cc-sdd 文脈なしで継続する。
- deltas.md には直接書き込まない。書き戻し漏れ・保留項目への対応は `/intent-writeback` への誘導のみで、確定更新は writeback が行う。
- `.intent/` 不在はセットアップを案内して停止する。mode.md 不在は停止せず standard 既定で続行し告知する。
