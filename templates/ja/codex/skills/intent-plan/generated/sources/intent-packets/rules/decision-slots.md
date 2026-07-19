# Decision Slots カタログ（完全性スキーマ）

聞き漏らしやすい話題を「目次」として一覧化する**完全性スキーマ（completeness schema）の単一の正本**。要求本文の自由記述任せにせず、漏れの種類を構造的に限定する。`intent-discover`（posture 確認）・`intent-packets`（スロット播種）・`intent-validate`（充足検査）はこのカタログを単一参照として読む。

このカタログは「見本（漏れやすい話題の目次）」であって、固定の網ではない。プロジェクト種別での欠落補完は discover の posture 確認とモード別差分に委ねる。

## 値域とステータス

各スロットは値域 `確定値 | 未決定（理由付き）| 該当なし` のいずれかを取り、次の4ステータスのいずれかで**必ず閉じる**（「黙って飛ばす」を構造的に防ぐ）。

| ステータス | 意味 | 併記する内容 |
|------------|------|--------------|
| 回答済み | 確定値が決まっている | 確定値（packet の `## Decisions` または閉じ先の節） |
| 未定 | まだ決めていない（遅延中） | 理由・downstream への注意書き・再訪条件（Revisit when） |
| 非該当 | このスロットは当該 packet に該当しない | 該当しない根拠（黙って落とさない） |
| ADR候補へ送る | architecture-significant な決定 | compass の Decision Rules へ送る（前倒し固定の対象） |

- `回答済み` は値域 `確定値`、`未定` は値域 `未決定（理由付き）`、`非該当` は値域 `該当なし` に対応する。`ADR候補へ送る` は値が compass 側で確定するまでの宣言。
- 「閉じ先」が既存節（`## Validation` / `## Expected Behavior` 等）のスロットは、`## Decisions` に値を二重に書かず「既存節で閉じている」旨を宣言してよい（重複定義しない）。

### 重要な未定スロットの ready 条件

`CONTRACT.md` の分類で重要判断に当たる未定スロットが残る packet は `ready` にしない。対象 packet と、その判断が影響する根拠を利用者へ提示し、**決定・今回の範囲外・範囲限定の明示続行**のいずれかを項目ごとに得る。結果を記録し、影響する成果物を再確認してから影響範囲だけを ready／export へ再開する。

重要判断ではない未定スロットは、それだけを停止理由にしない。無関係な packet は ready 化と export 候補の提示を継続できる。`未定` というステータスだけで全 packet を一律に止めてはならない。

## 共通コアスロット（全モードで播く）

全 packet に播く8スロット。前半4（④中心）は「制約下の意思決定」由来、後半4は既存成果物が未カバーだった欠落補完分。

| ID | スロット名 | 確認内容 | 完了条件 | 閉じ先 | 前倒し/遅延ドア | 根拠 |
|----|-----------|----------|----------|--------|-----------------|------|
| `decision-consistency` | 整合性モデル（consistency model） | データ変更時、即時整合（strong）か結果整合（eventual）か | どちらの整合モデルかが宣言され、下流が前提にできる | packet `## Decisions`（新規） | 前倒し（一方向: 後から覆すと外部影響が大きい） | 不可逆・複数 packet 拘束。ISO/IEC/IEEE 42010 の decision/rationale |
| `decision-idempotency` | 冪等性・リトライ（idempotency） | 書き込み再試行時の不整合防止（冪等キー等） | 再試行時の挙動が宣言される | packet `## Decisions`（新規） | 遅延可（双方向: 局所化でき可逆なら裁量） | 受入オラクルに効く。リトライ前提の品質特性 |
| `decision-error-semantics` | エラー意味論・境界バリデーション（error semantics） | 入力が空/期待外のときの境界検証とエラー返却（Fail-Fast 等） | 異常入力時の返却契約が宣言される | packet `## Decisions`（新規） | 遅延可（双方向） | 受入オラクル・外部契約に効く |
| `decision-authz` | 認可（authorization） | 実行できるアクター・アクセスできるデータの行レベル権限 | 誰が何にアクセスできるかが宣言される | packet `## Decisions`（新規） | 前倒し（一方向: セキュリティ/法規制の床） | 不可逆・セキュリティ床。高コスト決定 |
| `decision-quality-priority` | 品質目標の順位付け（quality priority） | 性能/信頼性/保守性/セキュリティのうち load-bearing な上位2-3特性 | 上位特性が順位付きで宣言される | packet `## Decisions`（新規。compass Invariants と連携可） | 遅延可（双方向） | 品質トレードオフ点。ISO/IEC 25010 の品質語彙 |
| `decision-fit-criterion` | 数値基準・適合基準（fit criterion） | 受入判定をどう測るか（fit criterion / SLO / test oracle） | 受入の数値・観測条件が宣言される | packet `## Validation`（既存）を参照。未定なら `## Decisions` で宣言 | 遅延可（双方向） | 受入オラクルに効く。Volere の fit criterion |
| `decision-exception-flow` | 例外フロー（exception flow） | 正常系だけでなく代表的な異常系フローが定義されているか | 代表的な異常系フローが宣言される | packet `## Expected Behavior`（既存）を参照。欠落なら `## Decisions` で宣言 | 遅延可（双方向） | ハッピーパス偏重の漏れ補完（PBR テスト/運用観点） |
| `decision-downstream-trace` | 下流トレース（downstream trace） | この packet を実現/検証する作業・テストへのリンク（realized-by / verified-by） | 下流リンクが宣言される（または最小十分と判断し空） | packet `## Verification protocol` / トレースリンク（新規・任意） | 遅延可（双方向） | 双方向トレース（pre-RS の欠落補完） |

- `decision-fit-criterion` / `decision-exception-flow` は閉じ先が既存節のため、既存節で閉じていれば `## Decisions` には「既存節で閉じている」旨の参照のみを置く（重複定義しない）。
- 共通コアは全モードで播く。`intent-validate` の `decision-slot-unsown` 検査は「この8 ID のうち1つも `## Decisions` に播かれていない」（共通コア未播種）を検出する。

## モード別差分スロット（mode に応じて加算）

`.intent/mode.md` の mode に応じて共通コアに**加算**される差分スロット。スロット定義はこの表が正であり、skill 本体へハードコードしない（Mode/Algorithm/Skill の3層分離に乗る）。

### standard

| ID | スロット名 | 確認内容 | 完了条件 | 閉じ先 | 前倒し/遅延ドア |
|----|-----------|----------|----------|--------|-----------------|
| `decision-perf-budget` | 性能予算（performance budget） | レイテンシ・スループット・リソースの許容枠 | 性能の許容枠が宣言される | packet `## Decisions` | 遅延可（双方向） |
| `decision-data-ownership` | データ所有権（data ownership） | このデータの正本はどこか・誰が書き換えられるか | データの正本と書き換え主体が宣言される | packet `## Decisions` | 前倒し（一方向: 後から覆すと外部影響大） |

### refactor

| ID | スロット名 | 確認内容 | 完了条件 | 閉じ先 | 前倒し/遅延ドア |
|----|-----------|----------|----------|--------|-----------------|
| `decision-characterization` | 保持すべき挙動・characterization tests | 現状の観測可能な振る舞いをそのまま固定するテスト観点 | 観測振る舞いが固定される | 既存 `algo-characterization-test.md` を参照（重複定義しない） | 前倒し（一方向: 安全網を先に固定） |
| `decision-change-boundary` | 変更境界（change boundary） | どこまで変えてよく、どこは触らないか | 変更可能範囲と不可侵範囲が宣言される | packet `## Decisions` | 前倒し（一方向） |
| `decision-rollout-safety` | 段階展開の安全性（rollout safety） | 変更を段階的に出す際の戻し方・観測点 | ロールアウト戦略と戻し方が宣言される | packet `## Decisions` / `## Rollback`（既存）を参照 | 遅延可（双方向） |

### behavior-unknown

| ID | スロット名 | 確認内容 | 完了条件 | 閉じ先 | 前倒し/遅延ドア |
|----|-----------|----------|----------|--------|-----------------|
| `decision-observed-facts` | 観測済み事実とその出所 | 何を観測したか・その出所はどこか | 観測事実と出所が宣言される | packet `## Decisions` / `## Expected Behavior`（既存）を参照 | 前倒し（一方向: 事実を先に固定） |
| `decision-hypothesis-confidence` | 仮説と確証度の区別 | どれが事実でどれが仮説か・確証度はどの程度か | 事実/仮説と確証度が区別される | packet `## Decisions` | 遅延可（双方向） |
| `decision-current-vs-future` | 現挙動と将来意図の分離 | 「今こう動いている」と「こう動かしたい」を混ぜていないか | 現挙動と将来意図が分離して宣言される | packet `## Decisions` | 遅延可（双方向） |

### feature-growth

| ID | スロット名 | 確認内容 | 完了条件 | 閉じ先 | 前倒し/遅延ドア |
|----|-----------|----------|----------|--------|-----------------|
| `decision-existing-boundary` | 既存境界との整合 | 既存のモジュール境界・契約と整合するか | 既存境界との整合方針が宣言される | packet `## Decisions` | 前倒し（一方向） |
| `decision-backward-compat` | 後方互換性（backward compatibility） | 既存利用者・既存データを壊さないか | 後方互換の方針が宣言される | packet `## Decisions` | 前倒し（一方向: 高コスト決定） |
| `decision-data-migration` | データ移行（data migration） | 既存データをどう移すか・移行中の整合 | 移行戦略が宣言される | packet `## Decisions` | 前倒し（一方向: 不可逆） |
| `decision-staged-rollout` | 段階展開（staged rollout） | 新旧をどう並走させ、どう切り替えるか | 段階展開戦略が宣言される | packet `## Decisions` | 遅延可（双方向） |
| `decision-legacy-impact` | 旧機能への影響 | この拡張が既存機能に与える副作用 | 旧機能への影響が宣言される | packet `## Decisions` | 遅延可（双方向） |

## product スロット（第2群・全モードで播く・role-aware-planner）

製品判断の聞き漏らし（誰の問題か・価値が出たらどう分かるか・やらない範囲・採らなかった選択肢）を補完する4スロット。共通コアと同様に全モードで播く（製品判断が絡まない純工学の packet は「非該当+根拠一行」で安価に閉じてよい）。`intent-validate` の `decision-slot-unsown` 検査は従来どおり**共通コア8 ID のみ**を判定し、本表は判定対象に含めない（後方互換・既存 packet を遡及して赤くしない）。

| ID | スロット名 | 確認内容 | 完了条件 | 閉じ先 | 前倒し/遅延ドア | 根拠 |
|----|-----------|----------|----------|--------|-----------------|------|
| `decision-target-user` | 対象ユーザー（target user） | 誰の・どんな状況の問題を解くのか | 対象ユーザーと解く問題が宣言される | tree L1（Actor）または packet 本文の価値の記述を参照。無ければ `## Decisions` で宣言 | 前倒し（一方向: 誰の問題かが曖昧なまま作ると受入も価値も測れない） | 製品判断の沈黙補完（C31） |
| `decision-success-signal` | 成功指標（success signal） | リリース後に「価値が出た」とどう分かるか（観測手段つき） | 観測手段つきの成功指標が宣言される | tree L1 の計測基準（および成果の物さし・導入済みなら）を参照。無ければ `## Decisions` で宣言 | 遅延可（双方向: ただし export までに一度は考える） | 受入基準（正しく作れたか）と成果（価値が出たか）の分離（C31） |
| `decision-out-of-scope` | スコープ外の明示（out of scope） | 今回やらないと決めた範囲が明示されているか | やらない範囲が宣言される | packet `## Non-scope`（既存節参照・重複定義しない） | 前倒し（一方向: 暗黙の期待は下流で膨らむ） | 沈黙のスコープ拡大の予防（DR9 と同線） |
| `decision-alternatives` | 代替案の検討跡（alternatives considered） | 採らなかった選択肢とその理由が残っているか | 検討した代替案が宣言される（architecture-significant なら ADR 候補として compass へ） | compass の Decision Rules（Alternatives considered）を参照。packet 局所なら `## Decisions` で宣言 | 遅延可（双方向） | 決定の訂正可能性（A29 と同線） |

- 4スロットとも閉じ先は既存の入れ物を最大限参照する（新しい入れ物を作らない＝拡張の作法）。`decision-out-of-scope` は `## Non-scope` が既にあれば「既存節で閉じている」参照のみを置く。

## 3規律

このカタログを適用する skill は次の3規律を守る。

1. **単一の推奨アンカーを置かない（anchoring 回避・DR199）**: スロットに「妥当な既定値」「推奨値」を**1案だけ**先に提示して判断を引きずらない（最初に提示された値に判断が引きずられる anchoring bias を避けるため）。**複数案の対等提示は可**——その判断点で実質的に異なる選択肢を、対等・根拠付き・推測標識付きで並べ、推しがあるなら「推し」と明示する（隠れたアンカーが違反）。
2. **ツールは該当性・値を推論しない**: スロットが該当するか・どの値を取るかを成果物の内容から推論・自動充填しない。人が宣言する（`depends_on` を推論しないのと同じ宣言ベースの規律）。`intent-validate` は実際に宣言されたスロット・ステータスのみを検査対象とする。
3. **天井（How）を固定しない**: スロットは「何を決めるか（what + constraints + oracle）」を宣言するもので、実装の How を packet に書かせない。規則の内側の局所探索はエージェントの裁量ゾーンに委ねる。

## 深掘りの聞き切りレーン（question-depth=deep のときのみ・A46・DR86・INV58）

既定（question-depth=standard）では、スロットの播種と4ステータスでの閉じは AI が宣言ベースで行い、値そのものを利用者へ能動的に問い詰めることはしない（推論+確認の現行水準）。利用者が明示的に **deep（深掘り）** を選んだときだけ、決定スロットを「後で」込みで**聞き切る**レーンを重ねる。

- **発火条件**: 引き継がれた発行ディレクトリの `mode.md` の `question-depth`（`/intent-discover` が記録・無ければ standard 扱い）を読み、**`deep` かつ `designer-questions=on`** のときだけ発火する。standard・未記載・off では発火しない（既定の播種と閉じの挙動を一切変えない＝後方互換）。
- **聞き切りの形**: 当該 packet に播いたスロットのうち、load-bearing で未確定のものを**関係するスロットごとにまとめて提示し**、利用者が「答える／後で／非該当」を選んで閉じる。各スロットを1つずつ尋問しない（歯止め・下記）。回答は該当スロットの4ステータス（回答済み／未定／非該当／ADR候補へ送る）で閉じる。「後で」を選んだ場合は、そのスロットに `未定` として理由と再確認する条件を記録し、未確定のまま保持する。
- **歯止め（INV58・厳守）**: まとめて少数（1バッチ最大4問・一問一答で連射しない）・各問に理由一行（尋問調にしない）・毎回「後で／不明／該当なし」を選べる・回答を強制しない。
- **anchoring 回避は deep でも不変（3規律の①を継承・DR199）**: 聞き切りレーンでも「妥当な既定値／推奨値」を単一の推奨アンカーとして先に提示しない。**問いはするが単一アンカーは置かない**（複数案の対等提示は可）。deep が広げるのは問いの範囲であって、単一の推奨の押し付けではない。
- **A30 decision-probe とレーンを分ける**: 本レーンは人間から意図を引き出す向き（AI→人間）。`intent-packets/rules/decision-probe.md` の意図版 Self-Probing（AI が自分の仮説を台帳の証拠で裁く＝AI→台帳）とは向きが逆で、同じ問いを二重に出さない。

## 拡張の作法

- **表に行を足すだけで拡張が完結する**（他ファイルの構造変更を要しない・「表が正」パターン）。共通コアを増やすなら共通コア表に、モード別差分を増やすなら該当モードの表に1行足す。
- **既存成果物がカバーするスロットは「閉じ先」を参照し、新しい入れ物を作らない**。意図/範囲/利害関係者/制約/受入証拠 等は既存の tree / compass / packet 既存節がカバーするため、`## Decisions` に作り直さずその閉じ先を参照する。
- 既存 rule と同一対象のスロット（例: `decision-characterization`）は既存ファイル（`algo-characterization-test.md`）を参照に留め、定義を重複させない。
