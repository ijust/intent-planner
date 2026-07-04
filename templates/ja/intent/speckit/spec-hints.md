# Spec Kit Spec Hints 下書きテンプレ

> `/intent-export-speckit` が packet の intent と制約を Spec Kit の spec 生成へ届けるためのヒントをこの書式で `.intent/speckit/<packetスラッグ>/spec-hints.md` に書き出します。これは本体を完成させない **ヒント**です（Spec Kit の spec.md 生成・突き合わせは `/speckit.specify` 以降に委ねる）。マッピングの正は export skill の rule（map-speckit）にあります。次の見出しは必須です（`## Parent Intent 参照` / `## Invariant 参照` / constitution 反映の一行案内 / `## 突き合わせ観点`）。

## Parent Intent 参照

この packet が仕える上位の狙い（L0/L1/L2/L3）を写す。Spec Kit が生成する spec に parent intent が取り込まれるようにする。

## Invariant 参照

守るべき制約（packet 固有 invariant + compass のプロジェクト普遍 Invariant）を列挙する。normative（SHALL / MUST）で表現できるものはその形で残し、Spec Kit の spec の受入条件へ取り込まれやすい形で渡す。

> **constitution 反映は利用者判断**: これらの Invariant を Spec Kit のプロジェクト憲法 `.specify/memory/constitution.md` へ反映するかは利用者が判断する。`/intent-export-speckit` は constitution.md へ書き込まない（外部ツール非改造）。

## 突き合わせ観点

Spec Kit が生成した spec.md が parent intent / Invariant を落としていないか確認する観点を添える。
