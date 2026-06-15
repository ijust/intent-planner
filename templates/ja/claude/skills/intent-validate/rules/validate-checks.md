# 検査カタログ: intent-validate

`intent-validate` skill が適用する検査の正本。SKILL.md は手順と報告形式のみを持ち、検査の定義はこのファイルを参照する。検査を追加するときはこの表に行を足すだけでよい（表が正）。各検査の ID は検査の安定識別子で、報告の各指摘に深刻度とともに併記される（ID の一覧・個数もこの表が正）。

## 深刻度の3分類

| 深刻度 | 定義 |
|--------|------|
| 要修正 | 着工前に解消すべき矛盾・整合性破壊。このまま export / 実装へ進むと architectural drift の原因になる |
| 推奨 | 品質リスク。直ちに着工を止めるほどではないが、解消すると成果物の判断基準としての信頼性が上がる |
| 情報 | 注意喚起。対応は任意だが、把握しておくべき状態 |

### 降格規則

- 欠落項目に対応する理由付きの意図的な見送り記録（Deferred または Open Questions）がある場合、当該項目の深刻度を「情報」に下げて報告する。

## 検査カタログ

| ID | 区分 | 検査 | 実施条件 | 深刻度の目安 |
|----|------|------|----------|--------------|
| invariant-conflict | 矛盾 | packet の Scope/Expected Behavior が compass Invariants と衝突 | 常時 | 要修正 |
| anti-direction-violation | 矛盾 | packet の方向が compass Anti-direction に該当 | 常時 | 要修正 |
| l3-intent-mismatch | 矛盾 | intent-tree の L3 意図と packet 内容の不一致（L3 の明示記述と直接矛盾 = 要修正、解釈の余地がある乖離 = 推奨） | 常時 | 要修正/推奨 |
| goal-without-packet | カバレッジ | tree の L1–L3 ゴールでどの packet（L4 含む）にも対応しないもの | 常時 | 推奨 |
| orphan-packet | カバレッジ | Parent Intent が tree のどの節にも遡れない孤立 packet | 常時 | 要修正 |
| stale-questions | カバレッジ | tree/compass/packets の未解決 Question の滞留 | 常時 | 情報 |
| stale-assumptions | カバレッジ | intent-tree の Assumptions に canonical への昇格も棄却もされないまま残る項目 | 常時 | 情報 |
| dependency-cycle | 整合 | `depends_on` に循環依存 A→…→A がある | 常時 | 要修正 |
| dependency-broken-ref | 整合 | `depends_on` が存在しない packet_id を参照している | 常時 | 要修正 |
| packet-scope-overlap | 境界 | active/ 配下の packet ファイル間の Scope 重複・責務衝突（archive/ は読まない） | 常時 | 要修正 |
| export-draft-mismatch | 境界 | 現行 export 下書き（export-log 最新行の packet のディレクトリ）と対象 packet ファイル（active/ 配下）の整合（Invariants 転記の不一致・packet 定義との乖離など） | 常時 | 推奨 |
| poc-experiment-missing | 規範 | 仮説・反証条件・GO/NO-GO のいずれかが「PoC 実験定義」に未記録 | designer-questions=on かつ purpose=poc | 要修正 |
| l1-metric-missing | 規範 | L1 項目に `計測基準:` 行が無い | designer-questions=on | 推奨 |
| walking-skeleton-missing | 規範 | plan.md の「Walking Skeleton」節が未記入（plan.md が記入済みの場合） | designer-questions=on | 推奨 |
| screen-sketch-missing | 規範 | 「画面ラフ参照」セクションが未記入（パス・リンク・「対象外」・理由付き「無し」のいずれも無い） | designer-questions=on | 推奨 |
| designer-questions-unrecorded | 規範 | designer-questions が未記録（区分「規範」の検査をスキップし本行のみ告知） | designer-questions 未記録 | 情報 |
| purpose-unrecorded | 規範 | purpose が未記録（仮説・反証条件・GO/NO-GO の検査をスキップし本行のみ告知） | designer-questions=on かつ purpose 未記録 | 情報 |

- 実施条件「常時」は、未検証対象の原則（対象成果物が未作成・未記入なら当該検査をスキップ）を上書きしない。
- 実施条件の designer-questions / purpose は mode.md に記録された値を指す。実施条件を満たさない検査は実施しない。designer-questions=off と記録されている場合、区分「規範」の検査はすべて実施しない。読み手は designer-questions を先に判定し、on と記録されていない限り purpose の値を参照しない。

## 依存健全性検査の注記（read-only と参照先の解決範囲）

- `dependency-cycle` / `dependency-broken-ref` は **read-only** で packet 正本（frontmatter 等）を一切変更しない。
- `dependency-broken-ref` の参照先 packet_id の存在確認は **active+archive の packet_id 全集合**に対して行う（archive 済みの packet_id も「存在する」とみなす）。

## L3 不一致の振り分け基準

- intent-tree の L3 の**明示記述と直接矛盾**する packet 内容 = **要修正**
- **解釈の余地がある乖離**（明示記述は無いが方向性がずれて見える等）= **推奨**
- 迷ったら推奨に倒し、根拠の引用を添えて利用者の判断に委ねる

## 境界検査の注記（export 下書きの対象選定）

- export 下書き（`.intent/cc-sdd/<スラッグ>/*.md`）は **packet 毎に併存**する。export 下書き整合の境界検査の対象は `.intent/export-log.md` 最新行の packet のディレクトリに限る。過去 packet の下書きは設計上併存するため、その存在自体は違反として扱わない。

## 未検証対象の扱い（検証可能な範囲の原則）

1. 検証対象の成果物が未作成または未記入の場合、その成果物を必要とする検査はスキップする。
2. 残りの検査は検証可能な範囲で実施する（全体を中断しない）。
3. 報告には「未検証対象」を設け、スキップした検査と理由（どのファイルが未作成 / 未記入か）を明示する。
4. 例: `.intent/packets/` が無い（または active/ が空）→ 矛盾・カバレッジ・境界の packet 系検査をスキップし、tree/compass 単体で可能な検査（未解決 Question の滞留 等）のみ実施する。
