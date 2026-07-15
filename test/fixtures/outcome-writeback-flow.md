# Outcome writeback integration fixture

このfixtureは、Intent Treeの成果の物さしから、archive済みPacketへの反復記録、出所警告、人の承認、L1への現在結果の反映、status/overviewの表示までを一続きで再現する。

```json
{
  "packet": {
    "path": ".intent/packets/archive/2026/pkt-example.md",
    "state": "done",
    "closed_at": "2026-07-01T00:00:00Z",
    "spec_refs": [".kiro/specs/example/requirements.md"],
    "index_entry": "archive/2026/pkt-example.md"
  },
  "l1": [
    {
      "quote": "L1: 継続利用の迷いを減らす",
      "measurement_criteria": "主要導線の契約テストが通る",
      "outcome_measure": "利用者が支援なしで主要導線を完了できる",
      "current": null
    },
    {
      "quote": "L1: 導入時の理解を早める",
      "measurement_criteria": "案内の構造検査が通る",
      "outcome_measure": "初見の利用者が案内だけで開始できる",
      "current": null
    }
  ],
  "steps": [
    {
      "action": "record",
      "id": "ambiguous",
      "target": null,
      "result": "価値が出た",
      "summary": "対象を指定しない観測",
      "provenance": {"who": "調査担当", "when": "2026-07-02", "where": "ユーザビリティ検証"},
      "expect": "wait-for-human-target"
    },
    {
      "action": "record",
      "id": "observation-1",
      "target": "L1: 継続利用の迷いを減らす",
      "result": "価値が出なかった",
      "summary": "被験者の逐語発言を貼らず、迷った箇所だけを要約",
      "provenance": {"who": "調査担当", "when": "2026-07-03", "where": null},
      "expect": "pending-with-warning"
    },
    {"action": "reject", "id": "observation-1", "expect": "closed-tree-unchanged"},
    {
      "action": "record",
      "id": "observation-2",
      "target": "L1: 継続利用の迷いを減らす",
      "result": "価値が出た",
      "summary": "5人中4人が支援なしで主要導線を完了",
      "provenance": {"who": "調査担当", "when": "2026-07-10", "where": "検証記録 U-102"},
      "expect": "pending-no-warning"
    },
    {"action": "approve", "id": "observation-2", "expect": "promoted-current-result"},
    {
      "action": "record",
      "id": "observation-3",
      "target": "L1: 継続利用の迷いを減らす",
      "result": "まだ分からない",
      "summary": "継続利用の観測期間が不足",
      "provenance": {"who": "分析担当", "when": "2026-07-14", "where": "継続率レポート R-7"},
      "expect": "pending-no-warning"
    },
    {"action": "approve", "id": "observation-3", "expect": "replace-current-keep-history"}
  ],
  "expected": {
    "warnings": ["outcome-provenance-missing: どこで計測したか"],
    "observation_states": {
      "observation-1": "closed",
      "observation-2": "promoted",
      "observation-3": "promoted"
    },
    "readout": {
      "L1: 継続利用の迷いを減らす": "まだ分からない — 継続利用の観測期間が不足",
      "L1: 導入時の理解を早める": "リリース後の結果待ち"
    },
    "history": ["価値が出なかった", "価値が出た", "まだ分からない"],
    "safety": {
      "raw-data": "要約のみ（保存・貼付なし）",
      "external-fetch": "実行しない",
      "automatic-scoring": "実行しない",
      "bug-triage-integration": "実行しない"
    }
  }
}
```
