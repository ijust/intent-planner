# Tasks Hints (cc-sdd 向け 下書き)

> `/intent-export-cc-sdd` が更新します。ここは cc-sdd の tasks 本体ではなく、cc-sdd が tasks を生成する際のチェック項目（箇条書き）です。本体は cc-sdd が生成します。先頭の「Intent 由来の制約」は、別セッションの impl サブエージェントが cc-sdd 成果物（tasks.md）経由で参照できるよう、各タスクに転記されることを意図しています。

## Source Packet

対象 packet。

## Intent 由来の制約（各タスクへ転記する前提）

- **Parent Intent**: この packet が支える L0/L1/L2/L3。
- **Invariants**: 各タスクが壊してはいけない制約（タスク単位で参照できる粒度）。
- **Anti-direction**: 避けるべき局所最適・小手先リファクタの要約。

## Tasks チェック項目

cc-sdd の tasks 生成時に含めるべき観点:

- [ ] Pre-check: 関連 intent / compass / invariants / 既存 behavior / 影響範囲を確認
- [ ] Characterization Tests: 既存 behavior を固定するテストを追加
- [ ] Migration Slice: 小さく rollback 可能な移行単位を作る
- [ ] Implementation: 実装
- [ ] Validation: テスト / 型検査 / lint / 手動確認
- [ ] Rollback Check: 失敗時の戻し方を確認
- [ ] Done Criteria: parent intent を満たし、invariant を壊さず、packet の Expected Behavior を満たす

各タスクの記述に、対応する parent intent と invariant への参照を残すこと。
