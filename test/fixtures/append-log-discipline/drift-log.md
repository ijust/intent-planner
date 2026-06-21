# Drift Log

> characterization fixture（単一ファイル形式・移行前）。`templates/ja/intent/drift-log.md` の実書式を写したもの。

## 運用説明

- **append-only**: エントリは追記のみです。

## エントリ書式

各エントリは次の9キーを固定順の Markdown リストで持ちます。`<!-- -->` で囲まれた下記は記入見本で、実エントリには含めません。

<!--
### drift-log entry
- pattern: <drift-patterns の id | uncatalogued:<短い名>>
- stage: <discover | export | improve>
- packet: <packet 名 | ->
- mechanism: <compass-anti-direction | compass-invariant | pattern-catalog | packet-scope-overflow | none>
- outcome: <prevented | caught | missed | false-positive | not-applicable>
- user-verdict: <valid | false-alarm | unjudged>
- recorded_at: <ISO 8601>          # transaction time（記録した時刻）
- commit: <短縮ハッシュ | ->        # 世界線アンカー（Layer 1）。取得不可時は -
- note: <1〜2行>
-->

## 実エントリ

### drift-log entry
- pattern: scope-creep
- stage: export
- packet: export-route-by-case
- mechanism: packet-scope-overflow
- outcome: caught
- user-verdict: valid
- recorded_at: 2026-06-18T09:30:00Z
- commit: 3d2cb96
- note: export 範囲が宣言スコープを超えそうだったため水際で名指し
