# Algorithm: Additive Slicing

新機能を、既存の振る舞いに影響を与えない順序で付加していく「付加スライス」へ分解する技法。`feature-growth` モードの Packet 分解フェーズで Example Mapping と併用する。接合面（seam）の確立 → 新機能の付加的な積み上げ → 既存への結線、の3段でスライスを構成し、各スライスが既存挙動を保ったまま独立にデリバリーできる道筋を導く。Migration Slicing が drift リスト（直すべきズレ）を入力に取るのに対し、Additive Slicing は影響リストと新機能の intent を入力に取る — 入力が違うため、両者は置き換え可能ではない。

## 手順

入力＝新機能の intent（GORE-lite で階層化され Example Mapping で具体化済み）と、discover の Impact Analysis が出した影響リスト（各項目＝触れる境界 / 依存する既存契約 / 影響の種類）。薄い影響リストはスライスを推測にする — 接合点を設計できる厚みが無ければ discover へ戻る。

1. **接合面（seam）を確立するスライスを切る**
   - 影響リストの「拡張する / 変更が必要」項目から、新機能が既存と接する接合点を特定し、**既存への最小変更で接合点を作る behavior-preserving なスライス**を最初に置く。
   - 確立された戦術を参照する: **Branch by Abstraction**（Fowler / Hammant）のインターフェース挿入、**Parallel Change (expand-contract)**（Danilo Sato）の expand 段、**seam 概念**（Feathers, Working Effectively with Legacy Code）。いずれも「既存の振る舞いを変えずに、新実装を差し込める点を作る」ための手筋。
   - seam 確立スライスの完了時点で、既存の観測可能な振る舞いが変わっていないこと。

2. **新機能を付加的に積む**
   - seam の先に、**既存コードに触れない新規コードのみのスライス群**として新機能を積む。この段のスライスは結線前で既存から到達されないため、既存挙動への影響をゼロに保ったまま積める。
   - Example Mapping で具体化した例が、各スライスの Expected Behavior に流れる。

3. **結線して有効化する**
   - 最後に、**seam 経由で新機能を有効化する結線スライス**を置く。結線は単体で無効化に戻せること（その具体化が各 packet の Toggle Plan）。

4. **SPIDR で候補を探索・分割する**
   - スライス候補の探索と、大きすぎるスライスの分割には、**SPIDR**（Mike Cohn: Spike / Paths / Interfaces / Data / Rules の5切り口）を補助ヒューリスティクスとして使う。
   - 段との相性の目安: seam 段＝Interfaces、付加段＝Paths / Rules、結線段＝Data / Rules。

5. **各スライスに検証点・rollback・toggle plan を付ける**
   - 既存挙動の回帰検証点を付け、behavior-preserving が観測可能であること → **Validation**。
   - 失敗時にどう戻すか（スライス単位で巻き戻せること）→ **Rollback**。
   - どの範囲が off-by-default か / toggle の削除条件はいつか → **Toggle Plan**。

6. **影響リストの終端を確認する**
   - 影響リストの各項目が「いずれかのスライスの Safety / Invariants で保護される」か「Open Questions へ送られる」かのいずれかに終端していることを確認する。どちらにもなっていない項目を残さない。

## packet の組み立て

3段の順序付き付加スライス群を packet にまとめる。各 packet は次を満たす。

- **Parent Intent**: 対応する L1/L2/L3 への参照（必須）。影響リスト項目の保護なら元の項目も示す。
- **Scope / Non-scope**: そのスライスが含む付加 / 含まない付加。
- **Expected Behavior**: Example Mapping の「例」由来。seam・結線スライスでは「保たれる既存の振る舞い」も併記する。
- **Safety / Invariants**: 移行中も崩してはならない不変条件。影響リストのどの項目を保護するかを明示する（compass の Invariants 由来）。
- **Validation / Rollback**: 上記由来。
- **Toggle Plan**: どの範囲が off-by-default か / toggle の削除条件はいつか（Hodgson の Release Toggles）。toggle の実装難易度の見積もりは計画の範囲外 — 存在と寿命の計画までを書く。
- **cc-sdd Mapping**: cc-sdd へどう渡すかの方針。

## 規律

- 各スライスは **behavior-preserving / testable / rollbackable** であること。
- **影響リストのトレーサビリティ**: 入力の影響リストにある各項目は、いずれかのスライスの Safety / Invariants で保護されるか、Open Questions へ送られるか、必ずいずれかに終端させる。項目を黙って落とさない。
- **段の順序を守る**: seam 確立 → 付加 → 結線。seam を作らずに既存モジュールへ直埋めしない。
- 数は改修見込みの大きさに応じて可変とし、数合わせをしない（小規模なら 1 個でよい・1〜7 を緩い目安とする）。大きすぎるスライスは SPIDR の切り口で分割案を提示する。
- これは Intent の詰め方（packet 分解の技法）であって、付加の実行コードではない。コードを変更しない。

## 出力

順序付き付加スライス群（seam 確立 → 付加 → 結線）。各スライスは上記構造を持ち、Scope / Validation / Rollback / Toggle Plan が各 packet に流れる。packet ファイル（`active/` 配下）を更新（案として提示）する。
