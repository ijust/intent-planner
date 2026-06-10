# Algorithm: Characterization Test

未知のレガシーの「観測可能な振る舞い」を、現状のまま固定するテスト観点として捉える技法。`behavior-unknown` モードの Packet 分解フェーズで Example Mapping と併用する。**振る舞いが不明な対象では本技法を先に走らせ**、観測した事実を Example Mapping へ渡す（知らない挙動の「例」は書けないため、観測が先）。意図を構造化する前に「今どう動いているか」を安全網として固定し、packet の Expected Behavior と Validation を観測事実から導く。

## 手順

入力＝振る舞いが不明な対象（レガシーコード・既存挙動）。Example Mapping の出力には依存しない（むしろ本技法の観測が Example Mapping の入力になる）。

1. **現状の振る舞いを観測し、判断せず固定する**
   - 対象の現状の入出力・副作用を観測し、「正しいか」を判断せずそのまま characterization test（現状の挙動をそのまま固定するテスト）の観点として書き留める。
   - これはテスト観点の計画であって、実際のテストコード実装ではない。

2. **固定した振る舞いを意図的／偶発に仕分け、Example Mapping へ渡す**
   - 固定した各振る舞いについて、どれが意図的でどれが偶発かを仕分ける。意図的な観測事実は後続の Example Mapping で「ルール・例」へ整理する素材になる。
   - 偶発（意図と切り離せない副作用・依存）は **Open Questions** へ送り、推測で意図に昇格させない。

3. **characterization test を Validation の起点にする**
   - 仕分けた振る舞い観点を各 packet の **Validation** の起点とし、リファクタ時の回帰検知に使えるようにする。
   - 失敗時にどう戻すか → **Rollback**。

## packet の組み立て

固定した振る舞い観点群を packet にまとめる。各 packet は次を満たす。

- **Parent Intent**: 対応する L1/L2/L3 への参照（必須）。観測由来なら元の振る舞いも示す。
- **Scope / Non-scope**: 含む振る舞い / 含まない振る舞い。
- **Expected Behavior**: 上記で固定した現状の観測振る舞い由来。
- **Safety / Invariants**: 固定した振る舞いのうち崩してはならない不変条件。
- **Validation / Rollback**: 上記由来。
- **cc-sdd Mapping**: cc-sdd へどう渡すかの方針。

## 規律

- **観測であって判断ではない**: 現状の振る舞いはそのまま事実として固定し、正しさの判断や原因論には踏み込まない。
- 意図的か偶発かが判断できないものは推測で埋めず **Open Questions** へ送る。
- これは Intent の詰め方（振る舞いを観測して詰める技法）であって、実際のテストコード実装ではない。コードを変更しない。

## 出力

現状振る舞いを固定したテスト観点群（意図的／偶発の仕分け付き）。各観点の Expected Behavior / Validation が各 packet に流れる。`packets.md` を更新（案として提示）する。
