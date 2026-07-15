# ギャップ集約: 設計意図 vs 実装実態

`intent-overview` skill が「設計意図 vs 実装実態」のギャップ節を組み立てるための正本。SKILL.md は手順と報告形式のみを持ち、何を・どの条件で・どう読むかは本ファイルを参照する。本層は drift-watch / intent-validate の検査軸を**再実装せず読みに行く**だけであり、判定ロジックを持たない。すべての観測は Read / Glob / Grep に限り、canonical 成果物（mode.md / drift-log.md / validate-checks.md）を一切変更しない。

## 不変の規律（read-only クロスカット層）

- 本層は drift-watch / intent-validate の出力・定義を**読むだけ**で、検知や検査を自前で実行しない（Out of Boundary）。
- `mode.md` の `## Enforcement（ユーザー管理）` / `## Drift-watch（ユーザー管理）` セクションは**読み取りのみ**で、変更しない（intent-status と同規律）。
- 不在・未観測のブロックは推測で埋めず、その状態（未観測 / 未取得）を明示して省略する。

## drift-log の条件付き読み取り（R5.1 / R5.4）

drift-log を読むのは、次の **両条件が同時に成立**するときに限る。

1. `mode.md` の `## Drift-watch（ユーザー管理）` セクションが `on` である。
2. `.intent/drift-log.md` が存在する。

両条件が成立するときのみ、drift-log を Read / Grep で読み、検知エントリを集約してギャップ節に提示する。`off` / 未記載 / drift-log 不在のいずれかの場合は、ギャップ集約ブロックを**省略**し、その状態を「未観測（drift-watch が off、または drift-log なし）」として明示する。drift-watch の既定は `off` であり、未観測は欠陥ではなく初期状態として扱う。

### drift-log の固定スキーマ（9 キー・固定順）

各エントリは次の 9 キーを固定順の Markdown リストで持つ（drift-log.md の正本に一致）。本層はこのキー集合・順序を前提に読むだけで、書式を改変しない。

```
pattern → stage → packet → mechanism → outcome → user-verdict → recorded_at → commit → note
```

- `packet` は **3 番目**の正式キーである（`stage` の次・`mechanism` の前）。
- 集計は `outcome` と `user-verdict` の 2 列から行う。
  - `outcome`: `prevented` / `caught` / `missed` / `false-positive` / `not-applicable` の 5 値。
  - `user-verdict`: `valid` / `false-alarm` / `unjudged` の 3 値。
- 提示は最低限 `pattern × outcome` のクロス集計（drift-log.md の運用説明に一致）に、`user-verdict`（利用者の確定）を併記する。`outcome` は drift-watch の下書き、`user-verdict` は利用者の確定であり、両者を混同して提示しない。

### missed=0 の読み方（確証バイアスの回避）

`missed=0`（防げず通った記録がゼロ）を「効いた証拠」として断定しない。**「記録漏れの疑い」**として提示する（intent-status の先例・drift-log.md の冒頭注記に倣う）。効いた瞬間（`prevented` / `caught`）だけが残るのは確証バイアスであり、効かなかった瞬間（`missed` / `false-positive` / `not-applicable`）も均等に記録される前提で読む。

## intent-validate 検査軸のマッピング（R5.2 / R5.3）

intent-validate は `allowed-tools: Read, Glob, Grep` の read-only スキルであり、**検査結果を永続ファイルに書かない**。したがって本層は「validate の結果ファイル」を読むのではなく、`intent-validate/rules/validate-checks.md` の**検査軸 ID カタログ**を読み、俯瞰内のギャップ観点をその ID 体系で整理する。

- 参照先: `intent-validate/rules/validate-checks.md` の検査カタログ表（`ID` 列＝安定 kebab-case ID、`深刻度の目安` 列＝重要度分類）。検査の追加・変更はこの表が正であり、本層は ID 列をそのまま引く（再導出しない）。
- 重要度分類は `validate-checks.md` の 3 分類（`要修正` / `推奨` / `情報`）をそのまま用いる。
- 依存健全性の検査軸 `dependency-cycle`（`depends_on` の循環 A→…→A）・`dependency-broken-ref`（存在しない packet_id への参照）は本カタログに実在し、いずれも `要修正` 級である。依存・ブロックビュー（progress-readout）で循環・未解決依存が観測されたら、対応するこの安定 ID に紐づけて提示する。
- 検査ロジックそのものは**再実装しない**（R5.2）。俯瞰で見つけたギャップを、`intent-validate/rules/validate-checks.md` で既に定義されている対応IDに紐づけるだけである。
- 検査結果が参照可能な箇所は安定 kebab-case ID に紐づけて提示する。参照不能な箇所（validate 未実行・結果が成果物に残っていない）は ID への紐づけを**省略**し、不在を明示する（R5.3 の「参照可能である」条件付き要件を、参照不能時は省略で吸収する）。

## 出力ブロックの構成

ギャップ節は次の要素で構成する（素材が無い要素は省略し理由を明示）。

1. **drift 集約**（両条件成立時のみ）: `pattern × outcome` のクロス集計に `user-verdict` を併記。`missed=0` は「記録漏れの疑い」と注記。
2. **検査軸マッピング**: 俯瞰で観測したギャップ観点を `validate-checks.md` の安定 kebab-case ID 体系で整理。参照可能なものは ID に紐づけ、不能なものは省略・不在明示。
3. **mode の現況**: `## Enforcement` / `## Drift-watch` の現在値を読み取りのみで併記（変更しない）。
