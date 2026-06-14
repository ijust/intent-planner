# Mode: refactor

既存の大規模プロジェクトを、振る舞いを保ったままリファクタ・再設計するためのモード。設計意図と実装のドリフトを捉え、安全な移行スライスへ落とす。

## このモードが組み合わせるアルゴリズム

| フェーズ | アルゴリズム | 目的 |
|---|---|---|
| Intent Tree 構築 | **GORE-lite** (Goal-Oriented Requirements Engineering の軽量版) + **Intent Recovery**（意図不在のコードのみ）+ **Drift Analysis** | L0(目的)→L1(成果)→L2(能力)→L3(振る舞い/設計意図)→L4(候補パケット) へゴールを段階分解する。意図を書かずに作られたコード（vibe coding 等）では Intent Recovery でコードから候補 intent を逆算してから、現状の実装とあるべき設計意図とのドリフトを観測可能に捉える |
| 判断の記録 | **QOC** (Questions-Options-Criteria) | 設計判断を「問い・選択肢・選択基準」で残し、Compass の Decision Rules / Open Questions に流す |
| 振る舞いの具体化 / packet 分解 | **Migration Slicing** | あるべき設計と現状の差分を、behavior-preserving / testable / rollbackable な移行スライスへ分解し、packet の Expected Behavior と Validation を導く |
| spec への橋渡し | **map-cc-sdd** | 選んだ packet を cc-sdd の Project Description / design・tasks ヒントへ変換する |

各アルゴリズムの詳細は、対応する skill の `rules/algo-*.md`（map-cc-sdd は `rules/map-cc-sdd.md`）にあります。このモード定義はそれらを「どのフェーズで使うか」の組み合わせ表です。

## 各コマンドでの適用

### intent-discover (GORE-lite + Intent Recovery + Drift Analysis)
- GORE-lite で L0–L4 を起こす。特に L3（振る舞い・設計意図）を、既存実装の暗黙の意図として丁寧に言語化する。
- L0: なぜ存在するか。1〜2文。
- L1: 誰の・何の状態をどう変えたいか（ユーザー/事業/運用/開発体験）。
- L2: L1 を支える能力。機能名でなく責務として書く。
- L3: L2 を成立させる振る舞い・設計意図（境界・依存方向・副作用・整合性・UX制約）。
- L4: 実装手前の候補作業単位。Issue より上位、spec より手前。
- **意図が書かれずに作られたコード（vibe coding 等）の場合**は、Drift Analysis の前に Intent Recovery を挟む。コードの構造・振る舞いから候補 intent を逆算し、すべて inferred（推測）として置く（確定と混ぜない）。これが無いと「あるべき設計意図」の基準点が存在せず Drift Analysis が空回りする。意図が明示的に存在するコードでは Intent Recovery は不要。
- 続いて Drift Analysis で、現状の構造・依存方向・振る舞いを棚卸しし、各 L3（Intent Recovery を経た場合は復元した inferred intent）と突き合わせて「今こうなっている → 本来こうあるべき」の drift を列挙する。突き合わせは Reflexion worksheet（意図された責務・依存 vs 観測された責務・依存）で行い、各要素を整合 / 乖離 / 欠落に分類する（詳細は `algo-drift-analysis.md`）。
- 各 drift は逸脱 / 腐敗 / 局所最適の蓄積として種類を区別し、対応する parent intent（L1/L2/L3）へ紐づける。
- canonical(確定) と inferred(推測=Assumptions) を絶対に混ぜない。紐づく intent が曖昧な drift は Open Questions へ送る。

### intent-compass (QOC)
- Intent Tree から North Star を引く。
- 各 Decision Rule は軽量 ADR として凝縮: Context(問いと状況) / Decision(採る選択肢) / Why(基準) / Consequences(Invariants・Anti-direction への接続)。QOC は選択肢を比較する探索の道具、Decision Rule は将来の実装セッションを拘束する正本。
- Anti-direction には Claude がやりがちな局所最適を必ず明示列挙する。リファクタ固有の典型として、最低限「drift を直すついでに無関係な箇所まで触る（スコープ膨張）」「behavior-preserving を口実に実は挙動を変える」を明示する。
- Invariants は壊してはいけない振る舞い/API/データ/UX/運用制約。プロジェクト普遍 / packet 固有 の2層に区別する。リファクタでは「移行中も保たれる既存の振る舞い」を特に明示する。

### intent-packets (Migration Slicing)
- **入力契約（重要）**: Migration Slicing は discover フェーズの Drift Analysis が出した **drift リストを入力に取る**。drift リストが薄い・曖昧だとスライスは推測になり質が落ちる。スライスを切る前に drift リストが十分かを確認し、不足なら discover に戻って drift を厚くする。
- スライスを切る前に **Mikado pre-pass**（Mikado Method = 安全な変更順序を前提の逆算で求める手法）で「これを安全に変えるには先に何が真である必要があるか」を逆算して前提グラフを書き、前提を持たない葉から着手する（机上の逆算であり、試しのコード変更はしない。詳細は `algo-migration-slicing.md`）。
- あるべき設計と現状の差分（drift リスト）を、振る舞いを壊さずに適用できる最小の移行スライスへ切る。
- 各スライスは単体でデプロイ可能で、既存の振る舞いを保ったまま設計を一歩進めるものにする。
- スライスを依存順に並べ、前のスライスが次を unblock する連鎖にする。どこで止めても中間状態が一貫している（behavior-preserving）ことを確認する。
- 各スライスに characterization / 回帰の検証点（Validation）と、失敗時の巻き戻し（Rollback）を付ける（現状挙動の観測・固定の手順は `intent-packets/rules/algo-characterization-test.md` を流用してよい）。
- **drift トレーサビリティ（必須）**: 列挙した drift は必ずいずれかに終端させる — (a) 移行スライス(packet)になる / (b) 今回やらないなら Open Questions か明示的な先送り（理由付き）にする。drift を見つけたまま黙って落とさない（局所最適の蓄積を放置しないという North Star の核心）。
- packet は behavior-preserving / testable / rollbackable を満たす 3〜7 個。各 packet に parent intent（drift 由来なら元の drift も）への参照を残す。

### intent-export-cc-sdd (map-cc-sdd)
- packet 1つを cc-sdd の Project Description（凝縮）と design/tasks ヒントへ変換。
- 入力は対象 packet と Compass の Invariants/Anti-direction に限定する。
- tasks ヒントには必ず parent intent と invariant への参照を残す。

## 適合する状況
- 既存の大規模プロジェクトのリファクタ・再設計が対象のとき
- 既存コード規模が大きく、設計意図と実装のドリフトが蓄積しているとき
- 振る舞いを保ったまま（behavior-preserving に）段階的に設計を進めたいとき
- 意図を書かずに作られたコード（vibe coding、prototype の本番化など）を、事後的に intent 体系へ取り込みたいとき（discover で Intent Recovery を併用する）
- **behavior-unknown との使い分け**: 現状の振る舞いがある程度把握できており、あるべき設計を言語化できるなら refactor。現状の振る舞い自体が不明で、まず観測・固定が必要なら behavior-unknown。vibe coding は「振る舞いは観測できるが意図が不在」なケースが多く、refactor + Intent Recovery が適する。
