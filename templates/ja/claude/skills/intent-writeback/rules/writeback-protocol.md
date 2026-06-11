# Writeback Protocol（intent-writeback の正本規約）

`/intent-writeback` の判定と手順の正本。SKILL.md は手順の骨格のみを持ち、判定はこのファイルに従う。canonical 成果物とは intent-tree.md / intent-compass.md / packets.md の3ファイルを指す。

## 1. 対象特定（4段優先順 + フォールバック）

上から first-match で対象 packet を1つに特定する。

1. **引数の packet 名**: 引数で packet が指定されていればそれを対象とする。
2. **cc-sdd 下書きの「## Source Packet」**: `.intent/cc-sdd/*.md` の「## Source Packet」見出しから packet 名を読む。下書きは最新1 export 分のみ保持される（単一スロット制約）ため、ここで特定できるのは**最新 export の packet のみ**。
3. **テキスト照合フォールバック（利用者確認必須）**: 「## Source Packet」見出しが不在・不明な場合は、cc-sdd 下書き本文と packets.md の packet 名をテキスト照合して候補を挙げ、利用者に自然言語で問い、回答を待つ。確認なしに対象を確定しない。
4. **指定要求**: それでも特定できなければ、状況（見つからなかった旨と調べた場所）を提示し、書き戻し対象 packet の指定を利用者に求めて停止する。

## 2. 学び抽出の観点（5種・タグ1:1）

対象 packet の定義（packets.md）・cc-sdd 下書き（Intent 由来の制約を含む）・intent-compass.md と、実装の現実（コードベース・テスト・`.kiro/specs/`。すべて読み取りのみ）を突き合わせ、次の5観点で学びを抽出する。タグは観点と1:1。

| タグ | 観点 |
|------|------|
| `[decision]` | 新しい決定（実装中に下した、packet 定義に書かれていない判断） |
| `[invariant-violation]` | 発見された invariant 違反（既存 Invariants と実装の現実の衝突） |
| `[implicit-behavior]` | 意図に書かれていなかった暗黙挙動（実装からの逆抽出） |
| `[deferred-resolved]` | 解消された Deferred |
| `[question]` | 新たな未解決 Question |

## 3. 二段階プロトコル

canonical 成果物を直接書き換えないことが本スキルの根幹。必ず次の二段階を踏む。

### 第1段: delta 記録（canonical 不可侵）

- 抽出した学びを deltas.md に新規エントリ（Status: pending）として記録する。この段階では canonical を一切触らない。
- 利用者が何も承認しなくてもエントリは pending のまま残る（承認なしの自動書き換え禁止）。

### 第2段: 承認 → 項目ごと昇格

- 学びを項目ごとに提示し、昇格の承認を利用者に自然言語で問い、回答を待つ。一括承認を強制しない。
- 承認された項目だけを canonical へ反映し、delta エントリに `Status: promoted (<昇格日>)` と反映先を記録する。
- 状態の確定: **1件以上を承認して canonical 反映 → `promoted`**。**全項目を「却下」で見送り → `closed`**。どちらも終端状態。保留を含んで未確定のままなら pending を維持する。

## 4. ADR 昇格規約（Decision Rules の変更を伴う昇格）

判断基準（Decision Rules）の変更を伴う昇格は、intent-compass.md の既存 ADR 形式に完全準拠する。

- **新エントリを追加する**: **Context**（問いと状況）/ **Decision**（採る選択肢）/ **Why**（基準）/ **Consequences**（Invariants・Anti-direction への接続）。**Why 欄は必須**（省略しない）。
- 置き換えられる旧エントリには **superseded 注記**を付す（旧エントリ側に superseded である旨と置き換え先への参照を追記する）。旧エントリは削除しない。
- **独自の Supersedes フィールドは導入しない**（新エントリ側に専用フィールドを作らない。注記は旧エントリ側に付す）。

## 5. 見送りタグの確定更新（writeback の責務）

- 昇格しなかった学びには2値タグを必ず付す: **却下（再提案不要）** | **保留（次回 writeback で再提案）**。
- 保留タグの項目は次回 writeback 起動時に再提案する。再提案の結果（昇格 / 却下確定 / 継続保留）を**旧エントリの該当見送り項目のタグへ反映する確定操作は writeback の責務**である。`/intent-improve` は保留項目への対応を促す誘導のみを行い、タグの確定更新は行わない。

## 6. [question] の消化

- `[question]` タグの学びは、intent-tree.md の Open Questions へ転記した時点で消化済みとする。
- 昇格記録の反映先に転記先（intent-tree.md Open Questions）を記録する。

## 7. 過去エントリ一覧の提示（再書き戻し）

- 起動時に、対象 packet の過去 delta エントリ一覧（「保留」タグ付きの見送り項目を含む）を必ず提示する。
- 同一 packet の再書き戻し（再 export・再実装後）は、既存エントリを書き換えず**新エントリ**として追記する（履歴保持）。
- 「対応 delta の有無」の機械判定は**初回サイクルのみ**有効。2巡目以降の書き戻し要否は、過去エントリ一覧を提示した上で利用者が判断する。

## 8. deltas.md 正規テンプレート（正本）

以下が deltas.md の正規テンプレートの**正本**であり、scaffold（配布後の `.intent/deltas.md` の初期内容）はその写し。見出し構造を変えるときは必ずここを先に変える。

- `.intent/deltas.md` が無い環境（既存利用者）では、初回起動時にこのテンプレートから新規作成する。
- **既存の deltas.md は上書きしない**（非破壊）。既存ファイルにはエントリの追記・Status とタグの更新のみを行う。

```markdown
# Intent Deltas

> `/intent-writeback` が記録し、`/intent-status` と `/intent-improve` が参照します。canonical 成果物（intent-tree.md / intent-compass.md / packets.md）は、この delta 経由でのみ事後更新されます。

## 運用説明

- 書き戻しは二段階です: `/intent-writeback` はまず学びをここに delta として記録し（canonical は直接書き換えない）、ユーザーが承認した項目だけを canonical 成果物へ昇格させます。
- 1 packet の1回の書き戻し = 1 エントリ。同一 packet の再書き戻し（再 export・再実装後）は新エントリとして追記します（履歴保持）。「対応 delta の有無」の機械判定は初回サイクルのみ有効で、2巡目以降の書き戻し要否は過去エントリ一覧を見てユーザーが判断します。
- 既知の制約（単一スロット）: `.intent/cc-sdd/` の下書きは最新1 packet 分のみ保持されます（export ごとに上書き）。過去に export した packet の書き戻し漏れは機械検出できないため、packets.md とこのファイルの突合で候補を列挙し、ユーザー確認で補います（export は feature 名を記録しないため、対応 spec の特定もテキスト照合に依存し、特定できない場合があります）。

## 状態の意味論

- `pending`: 記録済みで未昇格。
- `promoted` / `closed` は終端状態です。1件以上を承認して canonical へ反映 → `promoted`、全項目を「却下」で見送り → `closed`。
- 見送り項目には「却下（再提案不要） | 保留（次回 writeback で再提案）」の2値タグが必須です。保留の項目だけが `/intent-improve` の再提案対象になり、タグの確定更新（昇格 / 却下確定 / 継続保留）は `/intent-writeback` が行います。
- `[question]` タグの学びは intent-tree.md の Open Questions へ転記した時点で消化済みです（転記先を昇格記録の反映先に記録します）。

## Delta: <packet-name> — <ISO 8601 日付>

- Status: pending | promoted (<昇格日>) | closed (<クローズ日>)
- Source: .intent/cc-sdd/ の Source Packet | ユーザー指定

### 学び

- [decision] <新しい決定>
- [invariant-violation] <発見された invariant 違反>
- [implicit-behavior] <意図に書かれていなかった暗黙挙動>
- [deferred-resolved] <解消された Deferred>
- [question] <新たな未解決 Question>

### 昇格記録（promoted / closed 時）

- 反映先: intent-compass.md Decision Rules 新エントリ（旧エントリに superseded 注記）/ intent-tree.md L3 / packets.md <packet>
- 見送り: <昇格しなかった学び> — 却下（再提案不要） | 保留（次回 writeback で再提案）
```
