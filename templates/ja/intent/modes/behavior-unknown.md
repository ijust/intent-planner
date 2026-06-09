# Mode: behavior-unknown

振る舞いが不明なレガシーコードを対象に、観測可能な挙動を例で固定し、未知の振る舞いを characterization で押さえてから意図を起こすモード。

## このモードが組み合わせるアルゴリズム

| フェーズ | アルゴリズム | 目的 |
|---|---|---|
| Intent Tree 構築 | **GORE-lite** (Goal-Oriented Requirements Engineering の軽量版) | L0(目的)→L1(成果)→L2(能力)→L3(振る舞い/設計意図)→L4(候補パケット) へゴールを段階分解する。仕様が失われている場合、L3 は確定でなく inferred(推測) として置き、後段の characterization で裏取りする |
| 判断の記録 | **QOC** (Questions-Options-Criteria) | 設計判断を「問い・選択肢・選択基準」で残し、Compass の Decision Rules / Open Questions に流す |
| 振る舞いの具体化 / packet 分解 | **Example Mapping** + **Characterization Test** | 観測可能な振る舞いを Example Mapping で具体例(ルール・例・疑問)に固定し、未知・不明瞭な挙動は Characterization Test で「現状こう動く」を観測点として押さえ、packet の Expected Behavior と Validation を導く |
| spec への橋渡し | **map-cc-sdd** | 選んだ packet を cc-sdd の Project Description / design・tasks ヒントへ変換する |

各アルゴリズムの詳細は、対応する skill の `rules/algo-*.md`（map-cc-sdd は `rules/map-cc-sdd.md`）にあります。このモード定義はそれらを「どのフェーズで使うか」の組み合わせ表です。

## 各コマンドでの適用

### intent-discover (GORE-lite)
- L0: なぜ存在するか。1〜2文。
- L1: 誰の・何の状態をどう変えたいか（ユーザー/事業/運用/開発体験）。
- L2: L1 を支える能力。機能名でなく責務として書く。
- L3: L2 を成立させる振る舞い・設計意図（境界・依存方向・副作用・整合性・UX制約）。
- L4: 実装手前の候補作業単位。Issue より上位、spec より手前。
- 仕様やテストが失われている対象では、現状の挙動が正しいとは限らない。観測から起こした L3 は canonical(確定) ではなく inferred(推測=Assumptions) として置き、絶対に確定と混ぜない。
- 「現状の挙動が正なのか不明」な分岐は QOC の種として Open Questions に置き、後段の Characterization Test で観測して裏取りする。

### intent-compass (QOC)
- Intent Tree から North Star を引く。
- 各 Decision Rule は QOC 形式の凝縮: 「問い → 採る選択肢 → なぜ(基準)」。
- Anti-direction には Claude がやりがちな局所最適を必ず明示列挙する。特に「未確認の挙動を正しいと決めつけて変更する」傾向を明示する。
- Invariants は壊してはいけない振る舞い/API/データ/UX/運用制約。プロジェクト普遍 / packet 固有 の2層に区別する。振る舞い不明な対象では、まず Characterization Test で観測して確定した挙動だけを Invariant に昇格させる。

### intent-packets (Example Mapping + Characterization Test)
- 各 L2/L3 能力について、観測可能な振る舞いは Example Mapping で具体化する:
  - ルール: その能力が従う規則
  - 例: 観測可能な具体シナリオ → packet の Expected Behavior
  - 疑問: 未確定 → packet の Open Questions / Compass へ差し戻し
- 仕様が失われ振る舞いが不明な箇所は Characterization Test を併用する:
  - 現状のコードを入力し、「今こう動く」を観測してそのままテストに固定する（正しさの判断は保留し、現状を記録する）。
  - 観測した現状挙動を packet の Expected Behavior / Validation の出発点にし、未知の挙動を回帰の安全網として押さえる。
- 例と characterization 観測点から Validation（テスト/手動/型/ログ）と Rollback を導く。
- packet は behavior-preserving / testable / rollbackable を満たす 3〜7 個。各 packet に parent intent と、characterization で押さえた観測点への参照を残す。

### intent-export-cc-sdd (map-cc-sdd)
- packet 1つを cc-sdd の Project Description（凝縮）と design/tasks ヒントへ変換。
- 入力は対象 packet と Compass の Invariants/Anti-direction に限定する。
- tasks ヒントには必ず parent intent と invariant への参照を残す。

## 適合する状況
- 振る舞いが不明なレガシーコードが対象のとき
- テストがない、または少なく、現状の挙動を保証する安全網が欠けているとき
- 仕様・設計意図が失われており、コードの観測からしか振る舞いを起こせないとき
- 現状の挙動が正しいのか不明で、まず「今どう動くか」を固定してから意図を構造化したいとき
