# Mode: standard

新規プロジェクトや、まだ意図が言語化されていない機能群の全体設計を詰めるための標準モード。

## このモードが組み合わせるアルゴリズム

| フェーズ | アルゴリズム | 目的 |
|---|---|---|
| Intent Tree 構築 | **GORE-lite** (Goal-Oriented Requirements Engineering の軽量版) | L0(目的)→L1(成果)→L2(能力)→L3(振る舞い/設計意図)→L4(候補パケット) へゴールを段階分解する |
| 判断の記録 | **QOC** (Questions-Options-Criteria) | 設計判断を「問い・選択肢・選択基準」で残し、Compass の Decision Rules / Open Questions に流す |
| 振る舞いの具体化 | **Example Mapping** | 抽象的な能力を、観測可能な具体例(ルール・例・疑問)に落とし、packet の Expected Behavior と Validation を導く |

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
- 各 Decision Rule は QOC 形式の凝縮: 「問い → 採る選択肢 → なぜ(基準)」。
- Anti-direction には Claude がやりがちな局所最適を必ず明示列挙する。
- Invariants は壊してはいけない振る舞い/API/データ/UX/運用制約。

### intent-packets (Example Mapping)
- 各 L2/L3 能力について、Example Mapping を行う:
  - ルール: その能力が従う規則
  - 例: 観測可能な具体シナリオ → packet の Expected Behavior
  - 疑問: 未確定 → packet の Open Questions / Compass へ差し戻し
- 例から Validation（テスト/手動/型/ログ）と Rollback を導く。
- packet は behavior-preserving / testable / rollbackable を満たす 3〜7 個。

### intent-export-cc-sdd
- packet 1つを cc-sdd の requirements/design/tasks scaffold へ変換。
- task には必ず parent intent と invariant への参照を残す。

## 適合する状況
- 新規プロダクト/サブシステム
- 意図が暗黙知のまま膨らんだ機能群を言語化したいとき
