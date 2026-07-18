# Domain Write（昇格先の領域導出と owner の気づき）

writeback が学びを canonical へ昇格するとき、昇格先（packet の Expected Behavior / compass の記号）がどの領域に属するかを案件文脈から導出して確認し、書き込む領域に他セッションの owner 宣言があれば read-only の一言を添える規律。federated-governance / C-fed1 の書き込み側・INV101 / INV91 / DR192-193。

これは既存の昇格フロー（delta→承認→canonical・承認の粒度分け）を**置き換えない**。昇格先の領域導出+確認と、owner の気づき（表示のみ）を差し込むだけである。

## 1. 昇格先の領域を導出して確認する（黙って既定値にしない）

compass の記号（`[invariant-violation]` / `[decision]` 由来の新 Invariant / Decision Rule）を昇格するとき、その `area`（領域タグ）を次から導出する:

- 対象 packet の `parent_intents` / Safety が名指す既存記号の領域、昇格元の delta が触れた案件の領域、または compass の周辺記号の領域。
- `.intent/domains/README.md`（領域定義・あれば）の領域名と照らす。

導出した area を**利用者に一問で確認する**（推測は推測と明示）。**黙って `always` を既定にしない**（Anti-543）。packet の Expected Behavior への昇格（implicit-behavior 等）は packet 自身が領域を持つため、この確認は compass の記号昇格に限る。領域を導出できない場合は推測で確定せず利用者に問う。`.intent/domains/` が無い repo では発火せず従来どおり（後方互換・INV101/DR133 同型）。

## 2. 書き込む領域の owner 宣言に気づく（表示のみ・止めない）

昇格して書き込む領域に**他セッション**の owner 宣言（`.intent/domains/owners/<領域>-<session-rand>.md`）があれば、read-only の一言を添える:

> この領域は別セッションが owner 宣言中です（`<owner>`・`<declared_at>`）。

この気づきは INV91 の3規律を**1ビットも変えず継承する**:

- **止めない・拒否しない**: 気づきを表示しても昇格はそのまま完走する。gate にしない。
- **自セッションの宣言には警告しない**: 宣言の frontmatter の `session`（乱数4文字・owner 宣言スキーマの独立キー）で自他を区別する（自分がその領域を触るときに置いた owner 宣言の `session`＝自分の session-rand と、読み取った宣言の `session` が同じなら自分の宣言＝警告しない・`.intent/domains/README.md` のスキーマを正とする）。
- **複数セッションの owner 宣言が共存していても正常**（エラーにしない）。共存する他セッションの宣言を列挙して一言添える（止めない）。

`.intent/domains/owners/` が無い・空なら、この気づきは発火せず従来どおり（後方互換）。

## 3. 領域定義との食い違いは気づきまで（修正しない・DR193）

導出した area が `.intent/domains/README.md` の領域定義に無い名前でも、昇格を拒否しない。**記号→領域の対応の正は記号ファイルのタグだけ**（DR193）で、宣言・定義との食い違いは気づきの表示までに留める（自動で領域定義へ追記したり area を書き換えたりしない）。

## 温度

昇格先の領域確認は gate ではなく、owner の気づきは read-only の助言で、並行運用の判断は人に残す（INV91）。承認の粒度分け（`[invariant-violation]` は1件ずつ確認・それ以外は一括昇格）を変えない。補助スクリプトを足さず、記号ファイルのタグと owner 宣言ファイルを読むだけで実効化する（INV2/A1）。
