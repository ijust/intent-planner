# Mode: behavior-unknown

振る舞いが不明なレガシーコードを対象に、観測可能な挙動を例で固定し、未知の振る舞いを characterization で押さえてから意図を起こすモード。

## このモードが組み合わせるアルゴリズム

| フェーズ | アルゴリズム | 目的 |
|---|---|---|
| Intent Tree 構築 | **GORE-lite** (Goal-Oriented Requirements Engineering の軽量版) | L0(目的)→L1(成果)→L2(能力)→L3(振る舞い/設計意図)→L4(候補パケット) へゴールを段階分解する。仕様が失われている場合、L3 は確定でなく inferred(推測) として置き、後段の characterization で裏取りする |
| 判断の記録 | **QOC** (Questions-Options-Criteria) | 設計判断を「問い・選択肢・選択基準」で残し、Compass の Decision Rules / Open Questions に流す |
| 振る舞いの具体化 / packet 分解 | **Characterization Test** → **Example Mapping** | 未知の挙動はまず Characterization Test で「現状こう動く」を観測点として固定し、その観測事実を Example Mapping でルール・例・疑問へ整理して、packet の Expected Behavior と Validation を導く（既知の部分集合のみ Example Mapping 先行可） |
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
- **実行順序（重要）**: 振る舞いが不明な対象では、知らない挙動の「例」は書けない。よって **Characterization Test を先に**走らせて現状の生の挙動を観測・固定し、その観測事実を入力に **Example Mapping で後から**ルール・例・疑問へ整理する。すでに理解できている挙動の部分集合についてのみ、Example Mapping を先行させてよい。
- **どちらに振り分けるか（ルーティング）**: ある挙動を「すでにルールとして言語化できる」なら Example Mapping、「経験的に観測してしか押さえられない（仕様が失われ確証がない）」なら Characterization Test。両者とも観測可能な挙動を扱うが、判断軸は「articulate できるか / pin するしかないか」。
- Characterization Test（先）:
  - 現状のコードを入力し、「今こう動く」を観測してそのまま観測点に固定する（正しさの判断は保留し、現状を記録する）。意図的な挙動か偶発的な挙動かを仕分け、仕分け不能なものは Open Questions へ送る。
  - 観測した現状挙動を packet の Expected Behavior / Validation の出発点にし、未知の挙動を回帰の安全網として押さえる。
- Example Mapping（後／既知部分は先）:
  - ルール: その能力が従う規則（characterization の観測事実、または既知の挙動から導く）
  - 例: 観測可能な具体シナリオ → packet の Expected Behavior
  - 疑問: 未確定 → packet の Open Questions / Compass へ差し戻し
- 例と characterization 観測点から Validation（テスト/手動/型/ログ）と Rollback を導く。
- packet は testable / rollbackable を満たす 3〜7 個。各 packet に parent intent と、characterization で押さえた観測点への参照を残す。ここでの **behavior-preserving は「characterization で固定した現状挙動を回帰ベースラインとして保つ」意味**であり、現状の挙動が正しいと主張するものではない（誤った挙動の修正は別途 intent として明示する）。

### intent-export-cc-sdd (map-cc-sdd)
- packet 1つを cc-sdd の Project Description（凝縮）と design/tasks ヒントへ変換。
- 入力は対象 packet と Compass の Invariants/Anti-direction に限定する。
- tasks ヒントには必ず parent intent と invariant への参照を残す。

## 適合する状況
- 振る舞いが不明なレガシーコードが対象のとき
- テストがない、または少なく、現状の挙動を保証する安全網が欠けているとき
- 仕様・設計意図が失われており、コードの観測からしか振る舞いを起こせないとき
- 現状の挙動が正しいのか不明で、まず「今どう動くか」を固定してから意図を構造化したいとき
- **refactor との使い分け**: 現状の振る舞いが既知で信頼できる（あるべき設計を言語化できる）なら refactor。現状の振る舞いが不明・信頼できず、観測して固定するところから始める必要があるなら behavior-unknown。
