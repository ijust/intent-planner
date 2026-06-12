# Designer Questions（問いの代行）

問いの代行（designer-questions）の要否確認・記録と、on のときに追加する質問群の手順。`/intent-discover` のモード確定後（Step 1）と Tree 更新案の提示時（Step 4）で使う。対話はすべて利用者への確認として行う（確認の手段は SKILL.md の規約に従う）。

## 手順

### モード確定後（Step 1）

1. **問いの代行の要否を確認する**
   - `.intent/mode.md` の `designer-questions` を読む。canonical 値は `on` / `off` の2トークン。
   - 未確定なら、問いの代行が何を確認するものかを説明した上で（次の4点を列挙する: L1 成功基準の計測可能化 / 最初の packet（作業単位）が walking skeleton（入力から出力まで一通り動く最小実装）になっているかの確認 / ユーザー向け画面がある場合の画面ラフの有無 / 検証（PoC）の場合の仮説と完了判定）、推奨はせず2択（`on` = 要 / `off` = 不要）を提示して利用者に確認する。
   - 記録済みなら、記録内容（designer-questions / purpose）を提示して変更の要否のみを確認する。
   - 利用者が決定を保留したら、推測で埋めず「問いの代行の要否が未確定」を Open Questions に記録して続行する。

2. **確定した designer-questions を記録する**
   - `.intent/mode.md` の `designer-questions` 行に確定したトークンを書く。後続スキル（intent-packets / intent-validate）はこの行を参照する。
   - **旧 scaffold への非破壊追記**: mode.md に designer-questions / purpose 行が無ければ、既存の mode / selected / reason / definition 行を保持したまま不足行を追記する。intent-tree.md に「PoC 実験定義」「画面ラフ参照」セクションが無ければ、既存セクションを保持したまま追記してから記録する。

3. **検証性を確認する（designer-questions=on のときのみ）**
   - この開発が「何かを確かめる検証（PoC = `poc`）」か「本番・継続開発（= `product`）」かを利用者に確認し、`.intent/mode.md` の `purpose` 行に記録する。
   - on 確定直後に加え、再実行で designer-questions が on と記録済みかつ purpose が未確定の場合もこの確認を行う。
   - 利用者が決定を保留したら、推測で埋めず「purpose が未確定」を Open Questions に記録して続行する。

4. **仮説3質問（purpose=poc 確定直後のみ）**
   - 次の順で利用者に質問する: 仮説（この PoC で何を確かめるか）→ 反証条件（何が観測できなければ仮説を棄却するか）→ GO/NO-GO 基準（PoC 完了後に先へ進む / やめるを判定する条件）。
   - 回答を `.intent/intent-tree.md` の「PoC 実験定義」へ canonical として記録する。回答できない項目は推測で埋めず Open Questions に記録して続行する。
   - **purpose が poc でないときは、この質問群を発火しない。**

### Tree 更新案の提示時（Step 4・designer-questions=on のみ）

5. **L1 計測基準を確認する**
   - 各 L1 項目について「達成をどう観測・判定するか」を利用者に確認し、該当 L1 項目に `計測基準:` 行として記録する。
   - 基準が定まらない項目は、L1 項目自体は保持したまま「基準未定」を Open Questions に記録する。

6. **画面ラフの有無を確認する**
   - まず L2/L3 にユーザー向け画面が含まれるかを判定する。
   - 該当なら、画面ラフの有無を利用者に確認する: 有 → 参照（ファイルパスまたはリンク）を「画面ラフ参照」に記録する。無 → 作成を推奨する。利用者が見送る場合は、その旨を理由付きで Open Questions または「画面ラフ参照」に記録して続行する。
   - 非該当なら、利用者への確認は行わず、「画面ラフ参照」に「対象外」を**必ず**記録する（intent-validate が推論なしで判定できるようにするため）。
   - ラフ自体の作成・生成はしない（有無の確認・推奨・参照の記録まで）。

## designer-questions が off のとき

検証性確認（手順 3）・仮説3質問（手順 4）・L1 計測基準（手順 5）・画面ラフ確認（手順 6）はすべて発火しない。増分は手順 1〜2 の要否確認のみで、既存の挙動を変えない。purpose の値が残っていても、designer-questions が on と記録されていない限り参照しない。
