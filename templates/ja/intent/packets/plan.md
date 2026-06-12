# Packet Plan

> `/intent-packets` が更新します。packet 本体は `active/` 配下の個別ファイルにあり、このファイルには plan レベルの記録のみを残します。

## Walking Skeleton（designer-questions: on のとき記入）

> `/intent-packets` が designer-questions=on のときに更新します。

- **最優先 packet**: (packet 名)
- **E2E 判定**: (貫く / 貫かない)
- **確認結果**: (利用者の確認内容。walking skeleton 化を見送る場合は理由を Deferred にも記録)

## Recommended First Packet

> `/intent-packets` が更新します。最初に着手すべき packet をちょうど1つ、定性的な理由とともに記録します。

- **推薦 packet**: (packet 名)
- **理由**: (定性観点: リスク低減 / 依存解放 / rollback 容易性 / 学びの大きさ / (poc のとき) 仮説反証の安さ)
- **Walking Skeleton との整合**: (整合 / 整合しない場合はその理由 / Walking Skeleton 未記録)

## Deferred（切り出し）

今回の packet 群から意図的に外したルール・例や、理由付きで先送りした drift。黙って落とさず記録し、後続 packet の種または Open Questions にする。
