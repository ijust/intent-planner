# Intent Compass

> `/intent-compass` が更新します。局所最適を防ぐための判断基準を管理します。

## North Star

この変更で近づきたい最終状態。

## Current Drift

現状、どの intent からどうズレているか（このズレを drift と呼ぶ）。

## Direction

今回の作業で強める方向。

## Anti-direction

今回避ける方向。Claude がやりがちな局所最適（全体の意図より目先の修正を優先してしまうこと）・小手先リファクタもここに明示列挙する。例: 「ついでに別の処理も直す」「テストなしの一括置換」「ドメインロジックを UI に寄せる」。

## Invariants

絶対に壊してはいけない振る舞い・API・データ・UX・運用制約。

> 否定形発問（「これを無視したら最悪何が起きるか」等）で確認した結果、真に守るべきと確定した**普遍**制約のみをここへ記入する（過剰前提は混入しない）。packet 固有の制約候補は Open Questions に保留する。

ここに保持するのは**プロジェクト普遍 invariant** のみ:

- **プロジェクト普遍 invariant**: feature を問わず全作業で守る少量の制約。`/kiro-steering-custom` で `.kiro/steering/` に置くと全作業で効く（起動時コンテキスト増を最小化するため少量に限る）。
- **packet 固有 invariant**（特定の作業単位でのみ守る制約）の正本は各 packet ファイル（`.intent/packets/active/<packet_id>.md`）の Safety / Invariants 節。compass には書かない。export 時は packet ファイルから cc-sdd の tasks へ転記される。packet が archive へ移動すると packet 固有 invariant も packet ファイルとともに退場する（compass 側に残骸を残さない）。

## Decision Rules

迷ったときの判断基準。1判断1エントリの軽量 ADR として残す: **Context**（問いと状況）/ **Decision**（採る選択肢）/ **Why**（基準）/ **Alternatives considered**（検討した代替案。QOC の不採用 Options とその理由の要約）/ **Consequences**（Invariants・Anti-direction への接続）/ **Revisit when**（見直し条件。定まらない場合は「未定」と明示し空欄にしない）。決定を覆すときは、新しいエントリを追加し、古いエントリに superseded と後継への参照を明記したうえで6欄のまま `.intent/compass-archive.md` へ移動する（compass には現役の判断基準だけが残る）。

例:
- **Context**: 集計ロジックの置き場所（UI で完結 vs ドメイン層） / **Decision**: ドメイン層に置く / **Why**: L3 の境界 intent（UI は表示のみ）に一致 / **Alternatives considered**: UI で完結 — 表示と集計が混在し L3 の境界 intent に反するため不採用 / **Consequences**: Invariant「Domain logic を UI framework に寄せない」を全 packet に課す / **Revisit when**: 表示専用の集計がドメイン層を肥大化させ始めたとき
- **Context**: 大きな置換の進め方（一括置換 vs 段階移行） / **Decision**: rollback 可能な slice を優先 / **Why**: behavior-preserving を観測可能に保つ / **Alternatives considered**: 一括置換 — 失敗時に切り戻せず behavior-preserving を観測できないため不採用 / **Consequences**: Anti-direction「テストなしの大規模置換」を禁止に追加 / **Revisit when**: 未定

## Evidence

この intent を支える証拠。README、コード、テスト、ログ、ユーザー課題、運用課題など。

Updated (Invariants): —
Updated (Decision Rules): —

> Invariants 節 / Decision Rules 節それぞれを最後に更新した時点。`/intent-compass` が当該節を更新したときに ISO 8601 で打刻する（初期値の `—` は未打刻を表す）。read-only 検証（intent-validate の stale 検査）が packet の `updated_at` と比較する際の compass 側の基準であり、`—` の節は比較対象外（未検証としてスキップ）になる。

## Open Questions

判断に必要だが未確定の問い。

> 否定形発問で挙がった制約のうち、特定の作業単位でのみ守る **packet 固有制約（候補）** は、行き先の packet が定まるまでここに保留する（packet 起票時に当該 packet の Safety / Invariants へ転記される）。

> 回答はいつでも構いません（未回答でも planning は先に進められます）。このファイルを直接編集するか、会話で伝えると次のスキル実行時に反映されます。export までに回答が必要な問いにのみ `[export まで]` タグを付けます（タグのない問いはいつでも回答可）。
