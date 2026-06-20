# Drift Log

> `/intent-discover`・`/intent-export-cc-sdd`・`/intent-improve` のフックが逸脱（drift）の検知を1エントリずつ追記します。書き手はこの3つのフックのみで、読み手は `/intent-status`（軽い併記）と `/intent-improve`（pattern × outcome のクロス集計）です。`drift-watch: off`（既定）のときは誰も書きません。
>
> **読むときの注意**: `missed=0` は「効いた証拠」ではなく「記録漏れの疑い」と読んでください。効いた瞬間（prevented / caught）だけが集計に残るのは確証バイアスです。効かなかった瞬間（missed / false-positive / not-applicable）も均等に記録される前提でこのファイルは設計されています。

## 運用説明

- **append-only**: エントリは追記のみです。過去のエントリを書き換えたり削除したりしません（世界線アンカーの非対称を生まないため）。
- **outcome は下書き / user-verdict は確定**: `outcome` は drift-watch が推定して下書きします。`user-verdict` は利用者が確定します（Intent Tree の canonical / inferred と同じ分離）。利用者が未判定でも `unjudged` のまま記録・集計対象になります。
- **世界線アンカー（Layer 1）**: 各エントリは `recorded_at`（記録した時刻）と `commit`（記録した世界線）を最初から持ちます。後付けで過去エントリに足すと非対称が生まれるため、最初から記録します。immutability は git に委ね、このファイルは「現在の射影」のまま保ちます。
- **有効期間を持たない**: drift は事象であって状態ではないため、`valid_until` 等の valid-time 欄は持ちません。

## エントリ書式

各エントリは次の9キーを固定順の Markdown リストで持ちます。`<!-- -->`（HTML コメント）で囲まれた下記は記入見本で、実エントリには含めません。

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

## outcome の5値（確証バイアスの構造的回避）

効いた系と効かなかった系を対称に列挙します。「effective だけ書く欄」を物理的に作りません。

| 効いた系 | 効かなかった系 |
|---|---|
| `prevented`（discover の予防成功） | `missed`（防げず通った） |
| `caught`（export の捕捉成功） | `false-positive`（誤検知だった） |
| | `not-applicable`（地形に無かった・空振り） |

集計は `pattern × outcome` のクロス集計を前提とします。`missed=0` は「効いた」ではなく「記録漏れの疑い」と読みます。
