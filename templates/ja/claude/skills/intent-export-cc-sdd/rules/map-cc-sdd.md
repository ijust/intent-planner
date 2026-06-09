# Mapping: packet → cc-sdd

選んだ packet 1つを cc-sdd の下書きへ変換する規則。`intent-export-cc-sdd` skill が使う。これは export ターゲット別マッピングの1つ（cc-sdd 用）。別ターゲット（OpenSpec 等）を足す場合は `rules/map-<target>.md` を追加し、対応する `intent-export-<target>` skill を作る（縫い目）。

## 入力範囲（厳守 / 情報源契約）

- 読むのは **対象 packet 1つ** と **`.intent/intent-compass.md` の Invariants / Anti-direction** のみ。
- Intent Tree 全文・他 packet は**読まない**。全体方向が必要なときのみ Tree の L0–L1 を**要約として**ピンポイント参照する（本文転記は不可）。
- これにより cc-sdd へ渡る情報量を 1 packet 相当に抑える（トークン爆発を防ぐ）。

## 出力（3ファイルの下書き / 本体は作らない）

### `.intent/cc-sdd/requirements.md`
- cc-sdd の `/kiro-spec-init` に投入する **Project Description 本文**（凝縮テキスト）。
- 含めるもの: (a) 誰の課題か、(b) 現状、(c) 何を変えたいか / In・Out scope / 守るべき invariant / parent intent。
- 情報源は対象 packet（Why/Scope/Expected Behavior/Safety）と compass の Invariants に限定する。

### `.intent/cc-sdd/design.md`
- cc-sdd の design 生成時の**見落とし防止ヒント（箇条書き）**。本体ではない。
- 由来: packet の Scope/Non-scope/Rollback。観点は責務境界・依存方向・副作用・移行/ロールバック・リスク。

### `.intent/cc-sdd/tasks.md`
- 先頭に **「Intent 由来の制約」セクション**（parent intent / invariant / Anti-direction 要約）を置く。
- その後に cc-sdd の tasks 生成チェック項目（characterization test / migration slice / 各タスクの invariant 参照）。
- 由来: packet の Validation/Rollback + parent intent + compass の Invariants/Anti-direction。

## impl への伝播（戦略X）

- tasks ヒントは「**個々のタスクに紐づく invariant 参照**」の粒度で書く。
- 狙い: cc-sdd が生成する本体 `tasks.md` の各タスクへ parent intent と invariant が**転記される**こと。これにより、別セッションで `.intent/` を読まずに起動される impl サブエージェントも、cc-sdd 成果物（tasks.md）経由で invariant / Anti-direction を参照できる。
- **責任分界**: intent-planner の責務は「転記されやすい構造でヒントを渡す」ところまで。実際の転記は cc-sdd の tasks 生成に委ねる（cc-sdd の挙動には依存しない）。完全転記は**保証ではなく、構造で確率を最大化**する。

## 不変条件

- cc-sdd の requirements/design/tasks の**本体を完成させない**（下書き・ヒントまで）。
- tasks ヒントは必ず parent intent と invariant への参照を含む。
- cc-sdd の skill には介入しない。
