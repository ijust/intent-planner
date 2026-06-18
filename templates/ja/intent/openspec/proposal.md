# OpenSpec Proposal 下書きテンプレ

> `/intent-export-openspec` が packet ごとの下書きをこの書式で `.intent/openspec/<packetスラッグ>/proposal.md` に書き出します。このファイルは出力の書式テンプレ（見出し + 用途説明）であり、ここに具体的な内容は書きません。マッピングの正は export skill の rule（map-openspec）にあります。読み手は OpenSpec へ受け渡す利用者と、続行時に起動される `/opsx:propose` です。

## Why

この変更を行う理由。packet の intent / Why を写し、parent intent（この packet が仕える上位の狙い）を明示する。なぜ今この変更が必要かを OpenSpec の change-proposal が引き継げる形で述べる。

## What Changes

この変更で何を足す・変える・やめるか。packet の deliverables / Scope を箇条書きで列挙する。compass の Anti-direction はこの節の中で out-of-scope（やらないこと）として明示する。

## Impact

この変更が影響する spec / 契約と、守るべき制約。compass の Invariants を写し、normative（SHALL / MUST）で表現できるものはその形で残す。OpenSpec が生成する成果物へ invariant が取り込まれるようにする。
