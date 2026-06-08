# Design Hints (cc-sdd 向け 下書き)

> `/intent-export-cc-sdd` が更新します。ここは cc-sdd の design 本体ではなく、cc-sdd が design を生成する際の見落とし防止ヒント（箇条書き）です。本体は cc-sdd が生成します。

## Source Packet

対象 packet。

## Design Hints

cc-sdd の design 生成時に見落としやすい観点を箇条書きで示す:

- 責務境界（このスコープが所有するもの / しないもの）
- 依存方向
- 副作用の扱い
- 段階的移行方針 / ロールバック観点
- リスク
- 検討したが採用しない案
