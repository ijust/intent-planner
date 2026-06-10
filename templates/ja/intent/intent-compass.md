# Intent Compass

> `/intent-compass` が更新します。局所最適を防ぐための判断基準を管理します。

## North Star

この変更で近づきたい最終状態。

## Current Drift

現状、どの intent からどうズレているか。

## Direction

今回の作業で強める方向。

## Anti-direction

今回避ける方向。Claude がやりがちな局所最適・小手先リファクタもここに明示列挙する。

## Invariants

絶対に壊してはいけない振る舞い・API・データ・UX・運用制約。

2層に区別する:

- **プロジェクト普遍 invariant**: feature を問わず全作業で守る少量の制約。`/kiro-steering-custom` で `.kiro/steering/` に置くと全作業で効く（起動時コンテキスト増を最小化するため少量に限る）。
- **packet 固有 invariant**: 特定の作業単位でのみ守る制約。export 時に cc-sdd の tasks へ焼き込まれる。

## Decision Rules

迷ったときの判断基準。1判断1エントリの軽量 ADR として残す: **Context**（問いと状況）/ **Decision**（採る選択肢）/ **Why**（基準）/ **Consequences**（Invariants・Anti-direction への接続）。決定を覆すときは古いエントリに superseded と明記する。

例:
- **Context**: 集計ロジックの置き場所（UI で完結 vs ドメイン層） / **Decision**: ドメイン層に置く / **Why**: L3 の境界 intent（UI は表示のみ）に一致 / **Consequences**: Invariant「Domain logic を UI framework に寄せない」を全 packet に課す
- **Context**: 大きな置換の進め方（一括置換 vs 段階移行） / **Decision**: rollback 可能な slice を優先 / **Why**: behavior-preserving を観測可能に保つ / **Consequences**: Anti-direction「テストなしの大規模置換」を禁止に追加

## Evidence

この intent を支える証拠。README、コード、テスト、ログ、ユーザー課題、運用課題など。

## Open Questions

判断に必要だが未確定の問い。
