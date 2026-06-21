# Drift Log entry

> characterization fixture（分割形・日付+slug 単位ファイル `drift-log/<date>-<slug>.md`）。
> 単一ファイル形式の同一エントリを事象由来の自然キーで分割したもの。9キー固定順は不変。

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
