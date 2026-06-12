# Mode: standard

意図の言語化を汎用に行う標準（既定）モード。グリーンフィールド専用ではない: 新規プロジェクトに加え、状況特化モード（refactor / behavior-unknown / feature-growth）が当てはまらない既存プロジェクトの意図言語化にも使う。組み合わせるアルゴリズム（GORE-lite + QOC + Example Mapping）は全モードの基幹となる汎用の詰め方である。

## このモードが組み合わせるアルゴリズム

| フェーズ | アルゴリズム | 目的 |
|---|---|---|
| Intent Tree 構築 | **GORE-lite** (Goal-Oriented Requirements Engineering の軽量版) | L0(目的)→L1(成果)→L2(能力)→L3(振る舞い/設計意図)→L4(候補パケット) へゴールを段階分解する |
| 判断の記録 | **QOC** (Questions-Options-Criteria) | 設計判断を「問い・選択肢・選択基準」で残し、Compass の Decision Rules / Open Questions に流す |
| 振る舞いの具体化 | **Example Mapping** | 抽象的な能力を、観測可能な具体例(ルール・例・疑問・切り出し)に落とし、packet の Expected Behavior と Validation を導く |
| spec への橋渡し | **map-cc-sdd** | 選んだ packet を cc-sdd の Project Description / design・tasks ヒントへ変換する |

各アルゴリズムの詳細は、対応する skill の `rules/algo-*.md`（map-cc-sdd は `rules/map-cc-sdd.md`）にあります。このモード定義はそれらを「どのフェーズで使うか」の組み合わせ表です。

## 各コマンドでの適用

### intent-discover (GORE-lite)
- L0: なぜ存在するか。1〜2文。
- L1: 誰の・何の状態をどう変えたいか（ユーザー/事業/運用/開発体験）。
- L2: L1 を支える能力。機能名でなく責務として書く。
- L3: L2 を成立させる振る舞い・設計意図（境界・依存方向・副作用・整合性・UX制約）。
- L4: 実装手前の候補作業単位。Issue より上位、spec より手前。
- canonical(確定) と inferred(推測=Assumptions) を絶対に混ぜない。
- 分解中に出た判断の分岐は QOC の種として Open Questions に置く。

### intent-compass (QOC)
- Intent Tree から North Star を引く。
- 各 Decision Rule は軽量 ADR として凝縮: Context(問いと状況) / Decision(採る選択肢) / Why(基準) / Consequences(Invariants・Anti-direction への接続)。QOC は選択肢を比較する探索の道具、Decision Rule は将来の実装セッションを拘束する正本。
- Anti-direction には Claude がやりがちな局所最適を必ず明示列挙する。
- Invariants は壊してはいけない振る舞い/API/データ/UX/運用制約。プロジェクト普遍 / packet 固有 の2層に区別する。

### intent-packets (Example Mapping)
- 各 L2/L3 能力について Example Mapping を行う:
  - ルール: その能力が従う規則
  - 例: 観測可能な具体シナリオ → packet の Expected Behavior
  - 疑問: 未確定 → packet の Open Questions / Compass へ差し戻し
  - 切り出し: 今回やらないと決めたこと → 黙って落とさず `.intent/packets/plan.md` の Deferred 節に記録し、後続 packet の種 / Open Questions にする
- 例から Validation（テスト/手動/型/ログ）と Rollback を導く。
- packet は behavior-preserving / testable / rollbackable を満たす 3〜7 個。

### intent-export-cc-sdd (map-cc-sdd)
- packet 1つを cc-sdd の Project Description（凝縮）と design/tasks ヒントへ変換。
- 入力は対象 packet と Compass の Invariants/Anti-direction に限定する。
- tasks ヒントには必ず parent intent と invariant への参照を残す。

## 適合する状況
- 新規プロダクト/サブシステム
- 意図が暗黙知のまま膨らんだ機能群を言語化したいとき
- 既存プロジェクトでの汎用的な意図整理で、状況特化モード（refactor / behavior-unknown / feature-growth）が当てはまらないとき。既存システムへの機能追加が目的なら feature-growth を使う
