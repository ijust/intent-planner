# Algorithm: Example Mapping

抽象的な能力を、観測可能な具体例に落とす技法。`standard` / `behavior-unknown` モードの Packet 分解フェーズで使う。能力を「ルール・例・疑問・切り出し」に展開し、packet の Expected Behavior と Validation を導く。behavior-unknown モードでは、先行する Characterization Test が固定した観測事実を「例」の入力に取る（観測が先・整理が後）。

## 手順

各 L2/L3 能力について、4色のカードを書く要領で展開する。

1. **ルール（その能力が従う規則）**
   - 能力が満たすべき規則・制約を箇条書きにする。

2. **例（観測可能な具体シナリオ）**
   - 各ルールについて「こうなったら、こう振る舞う」という具体例を挙げる。
   - これが packet の **Expected Behavior**（完了後に観測できる振る舞い）になる。

3. **疑問（未確定）**
   - 例を書こうとして埋まらないもの、判断が要るものは「疑問」として残す。
   - これは packet の **Open Questions**、または Compass へ差し戻す。

4. **切り出し（今回やらないと決めたこと）**
   - 展開の途中で「このルール・例は今回の packet から外す」と判断したものは、黙って落とさず**切り出し**として明示的に記録する。後続 packet の種、または Open Questions になる。

5. **例から Validation と Rollback を導く**
   - 各例をどう検証するか（テスト / 手動確認 / 型検査 / ログ確認）→ **Validation**。
   - 失敗時にどう戻すか → **Rollback**。

## packet の組み立て

展開結果を packet にまとめる。各 packet は次を満たす。

- **Parent Intent**: 対応する L0/L1/L2/L3 への参照（必須）。
- **Scope / Non-scope**: 含むこと / 含まないこと。
- **Expected Behavior**: 上記「例」由来。
- **Safety / Invariants**: Compass の invariant 由来。
- **Validation / Rollback**: 上記由来。
- **cc-sdd Mapping**: cc-sdd へどう渡すかの方針。

## 規律

- packet は **behavior-preserving / testable / rollbackable** であること。保つべき既存の振る舞いが無い新規開発では、behavior-preserving は「他に影響を与えず単体で導入・撤去できる」と読み替える。
- 数は改修見込みの大きさに応じて可変とし、数合わせをしない（小規模なら 1 個でよい・1〜7 を緩い目安とする）。大きすぎる packet は分割案を提示する。
- 実装タスクに落としすぎない（Issue より上位、spec より手前）。
- コードを変更しない。

## 出力

packet ファイル（`active/` 配下）を更新（案として提示）する。各 packet は上記構造を持つ。展開の4欄（ルール / 例 / 疑問 / 切り出し）のうち、ルール・例は各 packet の Expected Behavior に流れ、疑問は Open Questions へ、切り出しは `plan.md` の Deferred 節へ残す。
