# Walking Skeleton Check

最優先 packet が主要なユーザージャーニーを端から端まで貫く（walking skeleton である）かを確認する手順。`/intent-packets` の優先順位提示（Step 4）で、`.intent/mode.md` の designer-questions が `on` のときのみ使う。対話はすべて利用者への確認として行う（確認の手段は SKILL.md の規約に従う）。

## 適用条件

- `.intent/mode.md` の `designer-questions` を読む。`on` のときのみ、Step 4 の優先順位提示に本手順を適用する。
- **designer-questions が on と記録されていない（off・未記録）ときは適用せず、既存 Step 4 の挙動を変えない**（未記録の場合の告知は `.intent/mode.md` の規約に従う）。
- **purpose は参照しない。**

## 手順

1. **E2E 判定**
   - 最優先 packet の Scope と Expected Behavior を読み、主要なユーザージャーニーを端から端まで（入力 → 処理 → 観測可能な出力）貫くかを判定する。
   - 判定の根拠は packet の記述に求める。途中の層で止まる packet（処理だけ・UI だけ等）は「貫かない」と判定する。

2. **判定結果と根拠を提示して確認する**
   - 判定結果（貫く / 貫かない）とその根拠を利用者に提示し、確認する。

3. **是正案を提示する（「貫かない」と判定した場合）**
   - 最初の packet を walking skeleton にする案を、次のいずれかで提示する:
     - **並べ替え案**: E2E を貫く packet が最優先になるよう優先順位を並べ替える。
     - **統合案**: 複数 packet の Scope を統合し、E2E を貫く packet を作る。
   - 利用者が walking skeleton 化を意図的に見送る場合は、それも選択として受け付ける（黙って落とさず記録する。手順 4）。

4. **確認結果を記録する**
   - `packets.md` の「Walking Skeleton」セクションに記録する: **最優先 packet**（packet 名）/ **E2E 判定**（貫く / 貫かない）/ **確認結果**（利用者の確認内容）。
   - 意図的な見送りは、その理由とともに Deferred セクションへも記録する。
   - **旧 scaffold への非破壊追記**: packets.md に「Walking Skeleton」セクションが無ければ、既存の記録内容を保持したままセクションを追記してから記録する。

## 規律

- 確認結果は intent-validate が参照する。記録を省略しない。
- コードを変更しない。
