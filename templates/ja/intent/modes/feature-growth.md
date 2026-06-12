# Mode: feature-growth

既存の稼働中システムに新機能を安全に付加するためのモード。新機能が触れる既存の境界・契約を実装前に棚卸して保護し、接合面（seam）を先に確立してから付加的に積むことで、既存のアーキテクチャ境界を守ったまま機能を育てる。

## このモードが組み合わせるアルゴリズム

| フェーズ | アルゴリズム | 目的 |
|---|---|---|
| Intent Tree 構築 | **GORE-lite** (Goal-Oriented Requirements Engineering の軽量版) + **Impact Analysis** | L0(目的)→L1(成果)→L2(能力)→L3(振る舞い/設計意図)→L4(候補パケット) へゴールを段階分解し、新機能の intent を既存の Intent Tree へ追記する。続いて新機能が触れる既存の境界・契約・データフローを読解で棚卸し、影響リスト（触れる境界 / 依存する既存契約 / 影響の種類）を起こす |
| 判断の記録 | **QOC** (Questions-Options-Criteria) | 設計判断を「問い・選択肢・選択基準」で残し、Compass の Decision Rules / Open Questions に流す |
| 振る舞いの具体化 / packet 分解 | **Example Mapping** + **Additive Slicing** | 新機能の振る舞いを観測可能な具体例(ルール・例・疑問・切り出し)に落とし、接合面(seam)の確立→付加→結線の3段の付加スライスへ分解して、packet の Expected Behavior と Validation を導く |
| spec への橋渡し | **map-cc-sdd** | 選んだ packet を cc-sdd の Project Description / design・tasks ヒントへ変換する |

各アルゴリズムの詳細は、対応する skill の `rules/algo-*.md`（map-cc-sdd は `rules/map-cc-sdd.md`）にあります。このモード定義はそれらを「どのフェーズで使うか」の組み合わせ表です。

## 各コマンドでの適用

### intent-discover (GORE-lite + Impact Analysis)
- 冒頭に**簡易 Impact Mapping**（Adzic: Why→Who→How→What の一方向ツリー）を一枚書き、機能追加と事業成果の接続を確認してから GORE-lite へ移る。機能追加は「何を作るか（What）」が先行して Why が切れやすい。確認した Impact の階層はそのまま GORE-lite の L0–L2 へ深化させる: Why は L0/L1（目的・成果）へ、Who/How は L1（誰の・何の状態をどう変えるか）へ、What は L2 以下の候補の種へ。
- GORE-lite で新機能の intent を既存の Intent Tree へ**追記**する（インクリメンタル更新）。既存 tree がまだ無い場合は、新機能の範囲で L0–L4 を起こす。
- L0: なぜ存在するか。1〜2文。
- L1: 誰の・何の状態をどう変えたいか（ユーザー/事業/運用/開発体験）。
- L2: L1 を支える能力。機能名でなく責務として書く。
- L3: L2 を成立させる振る舞い・設計意図（境界・依存方向・副作用・整合性・UX制約）。
- L4: 実装手前の候補作業単位。Issue より上位、spec より手前。
- 続いて Impact Analysis で、新機能が触れる既存の境界・契約・データフローを読解で棚卸し、影響リスト（各項目: 触れる境界 / 依存する既存契約 / 影響の種類、証拠付き）を作成する（詳細は `algo-impact-analysis.md`）。影響リストは compass の Invariants 化と packets の接合点設計の入力になる。
- canonical(確定) と inferred(推測=Assumptions) を絶対に混ぜない。
- **drift を発見したら直さない**: 調査中に既存設計の構造的問題（drift: feature-growth の目的外の問題）を見つけたら、本モード内で修正せず Open Questions へ記録し、refactor モードでの別作業を推奨する。

### intent-compass (QOC)
- Intent Tree から North Star を引く。
- 影響リストの各境界を Invariants 化する（「X の既存契約を変えない」）。Invariants は壊してはいけない振る舞い/API/データ/UX/運用制約。プロジェクト普遍 / packet 固有 の2層に区別する。
- Anti-direction には Claude がやりがちな局所最適を必ず明示列挙する。feature-growth 固有の典型をプレモータム（先回りの失敗想定）で列挙する: 「ついでに既存をリファクタする」「seam を作らず既存モジュールへ直埋めする」「既存テストを書き換えて辻褄を合わせる」。
- 各 Decision Rule は軽量 ADR として凝縮: Context(問いと状況) / Decision(採る選択肢) / Why(基準) / Consequences(Invariants・Anti-direction への接続)。QOC は選択肢を比較する探索の道具、Decision Rule は将来の実装セッションを拘束する正本。

### intent-packets (Example Mapping + Additive Slicing)
- Example Mapping で新機能の振る舞いを具体化する:
  - ルール: その能力が従う規則
  - 例: 観測可能な具体シナリオ → packet の Expected Behavior
  - 疑問: 未確定 → packet の Open Questions / Compass へ差し戻し
  - 切り出し: 今回やらないと決めたこと → 黙って落とさず `.intent/packets/plan.md` の Deferred 節に記録し、後続 packet の種 / Open Questions にする
- **入力契約（重要）**: Additive Slicing は discover フェーズの Impact Analysis が出した**影響リストを入力に取る**。薄い影響リストはスライスを推測にする — 接合点を設計できる厚みが無ければ discover に戻って影響リストを厚くする。
- Additive Slicing で、Example Mapping の例が流れ込んだ新機能を「接合面(seam)の確立 → 新機能の付加的な積み上げ → 既存への結線」の3段の付加スライスへ分解する（詳細は `algo-additive-slicing.md`）。
- **影響リストのトレーサビリティ（必須）**: 影響リストの各項目は「いずれかのスライスの Safety / Invariants で保護される」か「Open Questions へ送られる」かのいずれかに終端させる。項目を黙って落とさない。
- 例から Validation（テスト/手動/型/ログ）と Rollback を導き、各 packet に Toggle Plan（どの範囲が off-by-default か / toggle の削除条件）を付ける。
- packet は behavior-preserving / testable / rollbackable を満たす 3〜7 個。各 packet に parent intent（影響リスト項目の保護なら元の項目も）への参照を残す。

### intent-export-cc-sdd (map-cc-sdd)
- packet 1つを cc-sdd の Project Description（凝縮）と design/tasks ヒントへ変換。
- 入力は対象 packet と Compass の Invariants/Anti-direction に限定する。
- tasks ヒントには必ず parent intent と invariant への参照を残す。

## 適合する状況
- 既存の稼働中システムに新機能を追加するとき（extend / integrate / add-to 系の要望）
- 対象の振る舞いが既知で、再設計（drift 解消）が目的でないとき
- 新しい作業が既存のアーキテクチャ境界・依存方向を壊さないよう、触れる境界を体系的に棚卸して保護したいとき
- **standard / refactor / behavior-unknown との使い分け**: 既存の構造を変えたい（drift 解消・再設計が目的）なら refactor。現状の振る舞い自体が不明で、まず観測・固定が必要なら behavior-unknown。新規プロダクトや汎用的な意図整理なら standard。既存システムへの機能の付加が目的なら feature-growth。
