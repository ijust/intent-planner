# Packet Plan

> `/intent-packets` が更新します。cc-sdd に渡す前の作業単位を管理します。各 packet は parent intent を持ち、behavior-preserving / testable / rollbackable であること。

## Packet: <packet-name>

### Parent Intent

この packet が支える L0 / L1 / L2 / L3。

### Why

なぜこの packet が必要か。

### Scope

含むこと。

### Non-scope

含まないこと。

### Expected Behavior

完了後に観測できる振る舞い。

### Safety / Invariants

守るべき制約。

### Validation

どう検証するか。テスト、手動確認、ログ確認、型検査など。

### Rollback

失敗時にどう戻せるか。

### cc-sdd Mapping

この packet を cc-sdd の requirements / design / tasks にどう変換するか。

## Walking Skeleton（purpose: poc のとき記入）

> `/intent-packets` が purpose=poc のときに更新します。

- **最優先 packet**: (packet 名)
- **E2E 判定**: (貫く / 貫かない)
- **確認結果**: (利用者の確認内容。walking skeleton 化を見送る場合は理由を Deferred にも記録)

## Deferred（切り出し）

今回の packet 群から意図的に外したルール・例や、理由付きで先送りした drift。黙って落とさず記録し、後続 packet の種または Open Questions にする。
