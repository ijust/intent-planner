# Mapping: packet → cc-sdd

選んだ packet 1つを cc-sdd の下書きへ変換する規則。`intent-export-cc-sdd` skill が使う。これは export ターゲット別マッピングの1つ（cc-sdd 用）。別ターゲット（OpenSpec 等）を足す場合は `rules/map-<target>.md` を追加し、対応する `intent-export-<target>` skill を作る（縫い目）。

## 入力範囲（厳守 / 情報源契約）

- 読むのは **対象 packet 1つ** と **`.intent/intent-compass.md` の Invariants / Anti-direction** のみ。
- Intent Tree 全文・他 packet は**読まない**。全体方向が必要なときのみ Tree の L0–L1 を**要約として**ピンポイント参照する（本文転記は不可）。
- これにより cc-sdd へ渡る情報量を 1 packet 相当に抑える（トークン爆発を防ぐ）。

## 出力（3ファイルの下書き / 本体は作らない）

下書きは packet ごとのディレクトリ `.intent/cc-sdd/<packetスラッグ>/` 配下に書く（スラッグの導出は次節「出力レイアウト」）。

### `.intent/cc-sdd/<packetスラッグ>/requirements.md`
- cc-sdd の `/kiro-spec-init` に投入する **Project Description 本文**（凝縮テキスト）。
- 含めるもの: (a) 誰の課題か、(b) 現状、(c) 何を変えたいか / In・Out scope / 守るべき invariant / parent intent。
- **必須見出し（出力契約）**: `## Source Packet`・`## Parent Intent`・`## Invariants` の3見出しを必ず含める。`## Source Packet` の値は packet 名の**正確な転記**とする（このディレクトリがどの packet に属するかを同定する錨）。
- 情報源は対象 packet（Why/Scope/Expected Behavior/Safety）と compass の Invariants に限定する。

### `.intent/cc-sdd/<packetスラッグ>/design.md`
- cc-sdd の design 生成時の**見落とし防止ヒント（箇条書き）**。本体ではない。
- 由来: packet の Scope/Non-scope/Rollback。観点は責務境界・依存方向・副作用・移行/ロールバック・リスク。

### `.intent/cc-sdd/<packetスラッグ>/tasks.md`
- 先頭に **「Intent 由来の制約」セクション**（parent intent / invariant / Anti-direction 要約）を置く。
- その後に cc-sdd の tasks 生成チェック項目（characterization test / migration slice / 各タスクの invariant 参照）。
- 由来: packet の Validation/Rollback + parent intent + compass の Invariants/Anti-direction。

## 出力レイアウト（スラッグ規則と衝突規則）

### スラッグ規則（決定的）

packet 名からディレクトリ名（スラッグ）を以下の順で**決定的に**導出する。同じ packet 名は常に同じスラッグになる。

1. NFC 正規化する。
2. 前後の空白を trim する。
3. ASCII 大文字を小文字にする。
4. 空白とパスに危険な文字（`/ \ : * ? " < > |`）を `-` に置換する。
5. 連続する `-` を1つに圧縮する。
6. 先頭・末尾の `-` を除去する。

- 非 ASCII 文字（日本語等）はそのまま保持する。
- 結果が空文字列になる場合はスラッグを `unnamed-packet` とし、その旨を利用者に告知する。

### 衝突規則

- スラッグが既存ディレクトリと一致し、かつそのディレクトリの requirements.md の `## Source Packet` 見出しが**異なる** packet 名を指す場合のみ衝突とする。`-2` から始まる連番を付与して別名を割り当て、packet 名 → ディレクトリ名の対応を利用者に告知する。黙って上書きしない。
- `## Source Packet` が**同一** packet 名を指す場合は衝突ではなく再 export であり、同じディレクトリの下書きをその場で更新する。

## impl への伝播（戦略X）

- tasks ヒントは「**個々のタスクに紐づく invariant 参照**」の粒度で書く。
- 狙い: cc-sdd が生成する本体 `tasks.md` の各タスクへ parent intent と invariant が**転記される**こと。これにより、別セッションで `.intent/` を読まずに起動される impl サブエージェントも、cc-sdd 成果物（tasks.md）経由で invariant / Anti-direction を参照できる。
- **責任分界**: intent-planner の責務は「転記されやすい構造でヒントを渡す」ところまで。実際の転記は cc-sdd の tasks 生成に委ねる（cc-sdd の挙動には依存しない）。完全転記は**保証ではなく、構造で確率を最大化**する。

## 不変条件

- cc-sdd の requirements/design/tasks の**本体を完成させない**（下書き・ヒントまで）。
- tasks ヒントは必ず parent intent と invariant への参照を含む。
- **他 packet のディレクトリへは書き込まない**（書き込み先は対象 packet のスラッグ配下のみ）。
- cc-sdd の skill には介入しない。
