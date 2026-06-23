# Intent Deltas

> `/intent-writeback` が記録し、`/intent-status` と `/intent-improve` が参照します。canonical 成果物（intent-tree.md / intent-compass.md / `.intent/packets/` 配下の packet ファイル・plan.md）は、この delta 経由でのみ事後更新されます。

## 運用説明

- 書き戻しは二段階です: `/intent-writeback` はまず学びをここに delta として記録し（canonical は直接書き換えない）、ユーザーが承認した項目だけを canonical 成果物へ昇格させます。
- 1 packet の1回の書き戻し = 1 エントリ。同一 packet の再書き戻し（再 export・再実装後）は新エントリとして追記します（履歴保持）。「対応 delta の有無」の機械判定は初回サイクルのみ有効で、2巡目以降の書き戻し要否は過去エントリ一覧を見てユーザーが判断します。
- 下書きの保持（packet 毎ディレクトリ）: `.intent/cc-sdd/<packetスラッグ>/` の下書きは packet ごとに永続保持されます（Git 非追跡・ローカル専用）。書き戻しが完了しても下書きは削除されません。export 履歴は `.intent/export-log.md` に記録されており（export ごとに packet 名・日時・コミットを1行追記）、過去に export した packet の書き戻し漏れは export-log.md の全行 × 残存する `.intent/cc-sdd/<packetスラッグ>/` 下書き × このファイルの突合で列挙します。

## 状態の意味論

- `pending`: 記録済みで未昇格。
- `promoted` / `closed` は終端状態です。1件以上を承認して canonical へ反映 → `promoted`、全項目を「却下」で見送り → `closed`。
- 見送り項目には「却下（再提案不要） | 保留（次回 writeback で再提案）」の2値タグが必須です。保留の項目だけが次回 `/intent-writeback` での再提案対象（および `/intent-improve` の確認対象）になり、タグの確定更新（昇格 / 却下確定 / 継続保留）は `/intent-writeback` が行います。
- `[question]` タグの学びは intent-tree.md の Open Questions へ転記した時点で消化済みです（転記先を昇格記録の反映先に記録します）。

## Delta: <packet-name> — <ISO 8601 日付>

- Status: pending | promoted (<昇格日>) | closed (<クローズ日>)
- Source: export-log.md 最新行 | .intent/cc-sdd/<packetスラッグ>/ の Source Packet | ユーザー指定

### 学び

各学びは `[tag] <平易な要約一文（必須）>` で書きます。要約は専門用語で圧縮した名詞句ではなく、その packet を実装していない承認者がそのまま読んで意味の取れる平易な文にします（伝わりやすさを優先し、多少長くなってよい）。背景・根拠・含意の補足が要るときだけ、その下に字下げした `  - 解説: <…>` を**任意で**添えます（解説は必須ではなく、要約のみの学びが正規形です）。

- [decision] <実装中に下した、packet 定義に書かれていない判断を平易な一文で>
  - 解説: <なぜその判断に至ったか・背景や根拠（任意。不要なら付けない）>
- [invariant-violation] <既存 Invariant と実装の現実が衝突している箇所を平易な一文で>
  - 解説: <どの Invariant とどう衝突するか・想定される対応（任意）>
- [implicit-behavior] <意図に書かれていなかったが実装が既にそうなっている挙動を平易な一文で（多くは要約のみで成立）>
- [deferred-resolved] <保留にしていた事項がどう解消されたかを平易な一文で>
- [question] <新たに浮かんだ未解決の問いを平易な一文で>

### 昇格記録（promoted / closed 時）

- 反映先: intent-compass.md Decision Rules 新エントリ（旧エントリに superseded 注記）/ intent-tree.md L3 / 対象 packet ファイル（active/ 配下）/ plan.md の Deferred（解消の注記）
- 見送り: <昇格しなかった学び> — 却下（再提案不要） | 保留（次回 writeback で再提案）
