# Writeback Protocol（intent-writeback の正本規約）

`/intent-writeback` の判定と手順の正本。SKILL.md は手順の骨格のみを持ち、判定はこのファイルに従う。canonical 成果物とは intent-tree.md / intent-compass.md / `.intent/packets/` 配下（packet ファイル・plan.md）を指す。

## 1. 対象特定（4段優先順 + フォールバック）

上から first-match で対象 packet を1つに特定する。フォールバック（3 以降）で特定した場合は、その事実（どの段で特定したか）を利用者向け出力で告知する。

1. **引数の packet 名**: 引数で packet が指定されていればそれを対象とする。
2. **export-log.md 最新行（正典）**: `.intent/export-log.md`（`| packet | exported_at | commit |` テーブル）の最新データ行 = 末尾のデータ行の packet 名を対象とする。export-log が存在する定常状態では、ここで確定する。
3. **下書きの「## Source Packet」見出し（フォールバック）**: export-log.md が不在・最新行をパース不能な場合、`.intent/cc-sdd/<packetスラッグ>/requirements.md` の「## Source Packet」見出しから packet 名を読む。packet ディレクトリが**1つのみ**存在する場合に限りその見出しを採用する。複数存在する場合は各ディレクトリの見出しを候補として列挙し、4 へ直行する。この段は初回 export 直後など export-log が未整備の過渡期向けの救済であり、定常状態では 2 で確定する。
4. **テキスト照合フォールバック（利用者確認必須）**: 下書き本文と index.md / `active/` 配下の packet ファイルの packet 名（frontmatter の `name`）をテキスト照合して候補を挙げ、利用者に自然言語で問い、回答を待つ。確認なしに対象を確定しない。

それでも特定できなければ、状況（見つからなかった旨と調べた場所）を提示し、書き戻し対象 packet の指定を利用者に求めて停止する。

**ディレクトリ同定規則（packet 名 → ディレクトリ）**: packet 名からディレクトリを同定する正は「ディレクトリ内 requirements.md の `## Source Packet` 見出しが packet 名と一致すること」。スラッグ計算は探索の高速路であり、スラッグが一致しても見出しが一致しなければそのディレクトリとは同定しない。

**対象解決の archive 例外**: 解決された対象 packet のファイルが `active/` に無い場合（先行する supersede・完了処理済み等）は、`archive/` 配下を frontmatter の `name` 照合で**明示的に**参照して特定する（「通常 archive/ を読まない」原則の唯一の明示例外）。特定したら、当該 packet が done / superseded である事実を利用者に報告する。archived かつ未 done の packet への書き戻しでは、対象 packet ファイルへは反映せず、学びを intent-tree.md / intent-compass.md / 後継 packet（`superseded_by` の指す packet ファイル）へ振り向ける。

## 2. 学び抽出の観点（5種・タグ1:1）

対象 packet の定義（対象 packet ファイル）・cc-sdd 下書き（Intent 由来の制約を含む）・intent-compass.md と、実装の現実（コードベース・テスト・`.kiro/specs/`。すべて読み取りのみ）を突き合わせ、次の5観点で学びを抽出する。タグは観点と1:1。実装の現実を読む際、Decision Rule（intent-compass.md）が名指すコードモジュール（ファイル名・モジュール名）も grep 突合の視野に含め、Rule 主文と実装の乖離を `[invariant-violation]` として抽出してよい。

| タグ | 観点 |
|------|------|
| `[decision]` | 新しい決定（実装中に下した、packet 定義に書かれていない判断） |
| `[invariant-violation]` | 発見された invariant 違反（既存 Invariants と実装の現実の衝突） |
| `[implicit-behavior]` | 意図に書かれていなかった暗黙挙動（実装からの逆抽出） |
| `[deferred-resolved]` | 解消された Deferred |
| `[question]` | 新たな未解決 Question |

学び抽出時に intent-compass.md の Decision Rules の **Revisit when** 欄と突き合わせ、Revisit when 条件に合致する学びの行には該当 Decision への参照を付記する（例: `[decision] <新しい決定>（Revisit 該当: <該当 Decision の Context 要約>）`）。付記は学び行内の自由記述であり、deltas.md の正規テンプレート（§9）は変更しない。

## 3. 二段階プロトコル

**この §3 の制約の射程は writeback フェーズ（実装後に現実から学びを逆抽出して canonical へ戻す局面）に限る。** 実装**前**に判断基準・作業単位を起草する `/intent-compass`（compass の North Star / Anti-direction / Invariants / Decision Rules を直接 Write する）・`/intent-packets`（packet ファイルを直接起案する）は起草スキルであり、本制約の対象外（それらが canonical を直接書くのは正規動作）。本制約が禁じるのは「実装後の学び反映を delta を経ずに canonical へ直接書き込むこと」であって、実装前の起草ではない。

writeback フェーズにおいては、canonical 成果物を直接書き換えないことが本スキルの根幹。必ず次の二段階を踏む。

なお「実装が完了し、その現実から学びを canonical へ戻す」局面に入ったら、それは writeback フェーズの入口である。packet ファイルへ Evidence を直書きして済ませず、本プロトコル（delta 経由）を通す。

### 第1段: delta 記録（canonical 不可侵）

- 抽出した学びを deltas の **packet 単位の分割ファイル** `.intent/deltas/<packet-slug>.md` に新規エントリ（Status: pending）として記録する（CONTRACT「append-only 記録の分割・archive 規約」。`<packet-slug>` は対象 packet 名から既存スラッグ規則で導出・新採番なし）。`deltas/` ディレクトリが無ければ作る。この段階では canonical を一切触らない。終端（promoted/closed）になった過去エントリは `.intent/deltas/archive/<年>/` へ退避し active を薄く保つ（移しきってから旧を畳む・移行は本スライスの migration が担う）。
- 利用者が何も承認しなくてもエントリは pending のまま残る（承認なしの自動書き換え禁止）。

### 第2段: 承認 → 項目ごと昇格

承認の粒度は学びの種類で分ける。すべてを同じ重みで一件ずつ問わない（実運用では大半が「実装が既にそうなっている事実の記録」であり、yes/no の余地がないため、全件を一律に問うと承認が儀式化する）。

- **ゲート対象（明示承認が必須）**: 次の2種は canonical の判断基準・不変条件に影響するため、必ず項目ごとに利用者へ自然言語で問い、回答を待つ。
  - `[invariant-violation]`（発見された invariant 違反。「コード修正する / 記録のみに留める」等の対応方針を利用者が決める）。
  - **Decision Rules（compass の ADR）の変更を伴う `[decision]`**（§4 の ADR 昇格に該当するもの。Revisit when 該当を含む既存 Decision の置き換え・追加）。
- **既定一括昇格（L3 追記系）**: 上記以外の学び（intent-tree.md L3 への追記に留まる `[decision]` / `[implicit-behavior]` / `[deferred-resolved]`、および `[question]` の Open Questions 転記）は、反映先を一覧で提示し、**個別に止めたい項目があれば指定を求めたうえで、無指定なら一括で昇格する**。一件ずつの yes/no は求めない。
- いずれの経路でも、第1段で全件 delta 記録済みであること・利用者に止める機会を1回提示することで「承認なしの自動書き換え禁止」（§3 冒頭の根幹）は維持される。利用者が止めた項目は見送り扱いとし §5 の2値タグを付す。
- 承認・一括昇格された項目を canonical へ反映し、delta エントリに `Status: promoted (<昇格日>)` と反映先を記録する。
- 状態の確定: **1件以上を承認して canonical 反映 → `promoted`**。**全項目を「却下」で見送り → `closed`**。どちらも終端状態。保留を含んで未確定のままなら pending を維持する。

## 4. ADR 昇格規約（Decision Rules の変更を伴う昇格）

判断基準（Decision Rules）の変更を伴う昇格は、intent-compass.md の既存 ADR 形式に完全準拠する。

- **新エントリを追加する**: **Context**（問いと状況）/ **Decision**（採る選択肢）/ **Why**（基準）/ **Alternatives considered**（検討した代替案と不採用理由の要約）/ **Consequences**（Invariants・Anti-direction への接続）/ **Revisit when**（見直し条件。定まらない場合は「未定」と明示記録する）。**Why 欄は必須**（省略しない）。
- 置き換えられる旧エントリには **superseded 注記**を付す（旧エントリ側に superseded である旨と置き換え先への参照を追記する）。
- superseded 注記を付した旧エントリは、**6欄のまま**（要約への置換をしない）退避された Decision Rule の **rule 単位ファイル** `.intent/compass-archive/<rule-slug>.md` へ move する（CONTRACT「append-only 記録の分割・archive 規約」。`<rule-slug>` は退避する Decision Rule の識別子を既存スラッグ規則で導出・新採番なし。同一 rule の再 supersede は同ファイルに集まる）。`compass-archive/` ディレクトリが無ければ作る。旧エントリは削除しない（移動のみ・6欄 byte 不変）。active な Decision Rules エントリは現行どおり intent-compass.md 内に直接記載のまま保つ（別ファイルへのポインタ化をしない）。
- **独自の Supersedes フィールドは導入しない**（新エントリ側に専用フィールドを作らない。注記は旧エントリ側に付す）。
- 6欄形式の導入前に記録された旧4欄エントリ（Alternatives considered / Revisit when を持たないもの）は有効として扱い、欄の不足をエラー・指摘・書き換えの対象にしない。

## 5. 見送りタグの確定更新（writeback の責務）

- 昇格しなかった学びには2値タグを必ず付す: **却下（再提案不要）** | **保留（次回 writeback で再提案）**。
- 保留タグの項目は次回 writeback 起動時に再提案する。再提案の結果（昇格 / 却下確定 / 継続保留）を**旧エントリの該当見送り項目のタグへ反映する確定操作は writeback の責務**である。`/intent-improve` は保留項目への対応を促す誘導のみを行い、タグの確定更新は行わない。

## 6. [question] の消化

- `[question]` タグの学びは、intent-tree.md の Open Questions へ転記した時点で消化済みとする。
- 昇格記録の反映先に転記先（intent-tree.md Open Questions）を記録する。

## 7. 完了の一連操作（done 化・archive 移動・index 再生成）

対象 packet の writeback が完了したら（delta の終端状態の確定後）、packet の完了処理を次の**順序固定の一連の操作**として行う（done のまま `active/` に滞留する状態を作らない）。

1. 対象 packet ファイルの frontmatter に `state: done`・`closed_at`（完了日）・`spec_refs` を記入する。`spec_refs` は対応する spec/feature 名であり、`.kiro/specs/` の進行 spec と照合して候補を挙げ、利用者確認で確定記入する。
2. packet ファイルを `archive/<closed_at の年>/` へ移動する（削除しない。移動のみ）。
3. `index.md` を再生成する: `active/` 配下の全 packet ファイルの frontmatter のみから `| packet_id | name | state | summary |` テーブルを `packet_id` 昇順で構成する（`active/` が空ならヘッダのみが正規形）。

中断などで done のまま `active/` に残った場合は、`/intent-status` の整合検査が滞留として報告する。

## 8. 過去エントリ一覧の提示（再書き戻し）

- **読み取りは分割形で横断する（CONTRACT「append-only 記録の分割・archive 規約」。`intent-overview` の `aggregate-sources.md`・`intent-status` の decision-table 脚注10と同一規律）**: `deltas` / `export-log` の過去エントリを読むときは、分割形 `.intent/<rec>/*.md` 群（あれば正本・自然キー昇順）→ 無ければ旧 `.intent/<rec>.md`（生成ミラー）への read fallback の順で横断読みする。分割形と旧単一ミラーが共存するときは**分割形を正本**とし、ミラーを二重に数えない。archive（`.intent/<rec>/archive/`）は履歴として読む（active 集計に混ぜない）。この読み取りは書き込み（§4 の分割書き込み）と別経路であり、書き戻し漏れの突合・過去エントリ一覧の提示が分割前後で同じ結果を返す（behavior-preserving）。
- 起動時に、対象 packet の過去 delta エントリ一覧（「保留」タグ付きの見送り項目を含む。上記の分割形横断読みで収集）を必ず提示する。
- 同一 packet の再書き戻し（再 export・再実装後）は、既存エントリを書き換えず**新エントリ**として追記する（履歴保持）。
- 「対応 delta の有無」の機械判定は**初回サイクルのみ**有効。2巡目以降の書き戻し要否は、過去エントリ一覧を提示した上で利用者が判断する。
- writeback の完了後も対象 packet の下書き（`.intent/cc-sdd/<packetスラッグ>/`）は**削除しない**（packet ごとに永続保持）。書き戻し漏れの列挙は、export-log（分割形横断読み）の全行 × 残存する `.intent/cc-sdd/<packetスラッグ>/` 下書き × deltas（分割形横断読み）の突合で行う。

## 9. deltas.md 正規テンプレート（正本）

以下が deltas.md の正規テンプレートの**正本**であり、scaffold（配布後の `.intent/deltas.md` の初期内容）はその写し。見出し構造を変えるときは必ずここを先に変える。

- `.intent/deltas.md` が無い環境（既存利用者）では、初回起動時にこのテンプレートから新規作成する。
- **既存の deltas.md は上書きしない**（非破壊）。既存ファイルにはエントリの追記・Status とタグの更新のみを行う。

```markdown
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

- [decision] <新しい決定>
- [invariant-violation] <発見された invariant 違反>
- [implicit-behavior] <意図に書かれていなかった暗黙挙動>
- [deferred-resolved] <解消された Deferred>
- [question] <新たな未解決 Question>

### 昇格記録（promoted / closed 時）

- 反映先: intent-compass.md Decision Rules 新エントリ（旧エントリに superseded 注記）/ intent-tree.md L3 / 対象 packet ファイル（active/ 配下）/ plan.md の Deferred（解消の注記）
- 見送り: <昇格しなかった学び> — 却下（再提案不要） | 保留（次回 writeback で再提案）
```
