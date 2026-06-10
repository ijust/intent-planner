# Algorithm: GORE-lite

Goal-Oriented Requirements Engineering の軽量版。暗黙の意図を L0–L4 のゴール階層へ段階分解する。全モード共通の Intent Tree 構築フェーズで使う（standard / refactor / behavior-unknown のいずれも本 algo を基盤にする）。

## 手順

1. **L0: Product Purpose を1〜2文で固定する**
   - 「このプロダクト/サブシステムは何のために存在するか」。手段ではなく存在理由を書く。

2. **L1: Desired Outcomes を引き出す**
   - L0 を満たすために、誰の・何の状態をどう変えたいか。観点はユーザー / 事業 / 運用 / 開発体験。
   - 「機能」ではなく「起こしたい状態変化」で書く。
   - **Actor pass**: 各 Outcome について「誰が利益を得るか / 誰が阻害・反対しうるか / 誰がその実現に責務を持つか / どんな環境前提に依存するか」を一行ずつ書く（i* 系のアクター/依存の観点）。アクター不在の目的階層は、実装時に責務の置き場所を誤らせる。確信が持てない行は Assumptions へ。

3. **L2: Capabilities へ分解する**
   - 各 Desired Outcome を支える能力を列挙する。機能名ではなく責務・能力として書く。
   - 「○○できる」という能力の単位。実装手段には踏み込まない。

4. **L3: Behavioral / Architectural Intents を導く**
   - 各 Capability を成立させる振る舞い・設計意図。境界、依存方向、副作用、データ整合性、UI/UX 制約を含める。
   - ここは「なぜその設計か」の意図であり、実装そのものではない。

5. **L4: Candidate Packets を出す**
   - 実装手前の候補作業単位。Issue より上位、spec より手前の粒度。
   - 各候補がどの L1/L2/L3 を支えるかを意識する（packet 化のときに parent intent になる）。

## 規律

- **canonical と inferred を混ぜない**: 確定した意図は本文に、推測は `Assumptions` セクションに分離する。根拠が無い断定をしない。
- **未確定は Open Questions へ**: 分解の途中で判断が必要だが情報が足りないものは、推測で埋めず Open Questions に書く。
- **コードを変更しない**: discover は意図の構造化であり、実装ではない。

## 出力

`intent-tree.md` の `L0 / L1 / L2 / L3 / L4 / Open Questions / Assumptions` セクションを更新（案として提示）する。
