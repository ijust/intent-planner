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

迷ったときの判断基準（問い → 採る選択肢 → なぜ）。

例:
- Domain logic を UI framework に寄せない
- 既存 behavior を変えずに境界だけ先に作る
- 一括置換より rollback 可能な slice を優先する
- テストなしの大規模置換を避ける

## Evidence

この intent を支える証拠。README、コード、テスト、ログ、ユーザー課題、運用課題など。

## Open Questions

判断に必要だが未確定の問い。
