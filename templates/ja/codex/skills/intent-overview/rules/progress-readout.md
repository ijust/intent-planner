# 進捗の多軸読み取りと関心別ビューの構成

`intent-overview` skill が、packet の進捗を単一％にせず3軸で映し、`depends_on` からブロック状態を read-only 導出し、関心ごとの派生ビューを構成するための正本。本ルールは**読み取り専用**であり、進捗軸も依存関係も**算出・採点・推論しない**。進捗・依存・証拠の正本は `intent-planner-packet-progress` が整えた packet（frontmatter + `## Evidence` 節）であり、overview はそれを**映すだけ**である。算出が必要な検査（依存健全性・validate 軸）は intent-validate / drift-watch / algo-intent-recovery の責務で、本ルールはその**結果を読みに行く**のみ。

## 大原則（read-only mirror）

- packet 正本（`active/*.md` の frontmatter 10 キー + 本文 `## Evidence` 節）が進捗・依存・証拠の**唯一の正本**。overview はそこから派生ビューを再生成するだけで、正本を変更せず・二重化しない。
- 進捗を**単一の総合％に圧縮しない**。性質の異なる3軸に分けて提示する。
- 各軸・各ビューは「既存成果物のどこを読んだか」を出所として明示する。AI の自己申告ではなく、ファイルの読み取りに基づくことを示す。
- 対応する成果物が無い軸・ビューは「未観測 / 未記入 / 依存なし」と明示し、**推測で埋めない**。

## 工程レール（read-only mirror）

進捗の3軸（質的分解）の**前**に、全 packet を1本の縦レールとして並べ、各 packet が「いまどの段に居るか」を一望させる。レールは3軸を圧縮した総合指標ではなく、3軸の**手前にある俯瞰**である（レールで全体の現在地を掴み、各 packet の内訳は3軸で読む、という補完関係）。レールも read-only mirror であり、状態を**算出・推論・採点しない**。既存成果物（packet frontmatter `state` / `superseded_by`・`export-log.md`・`deltas.md`）を読み、下表の5信号のどれに当たるかを**機械的に判定して映すだけ**である。

### 5信号と判定（すべて `.intent/` から機械観測可能）

各 packet を `state` × export-log の行有無 × deltas の対応エントリ有無で突合し、**上から評価して最初に当たった信号**を1つだけ付ける（first-match）。

| 信号 | 意味 | 判定条件 | 出所 |
|------|------|----------|------|
| ◻ 統合済 | 後継 packet に統合され役目を終えた | `superseded_by` が非空 | packet frontmatter |
| ✅ 反映済 | 実装が完了し intent へ書き戻し済み | `state: done` **かつ** deltas にこの packet の promoted/closed エントリあり | packet + deltas.md |
| 🔵 今ここ | いま手をつけている1工程（export 済み・未反映） | export-log に行あり・deltas に対応エントリ無し のうち、**現行 Source Packet（export-log 最新行）に一致**するもの | export-log 最新行 + deltas.md |
| 🔴 反映漏れ | 実装の証跡があるのに intent へ未反映（取り残し） | export-log に行あり・deltas に対応エントリ無し のうち、現行 Source Packet 以外 | export-log + deltas.md |
| ⚪ 未着手 | まだ cc-sdd へ export していない | export-log にこの packet の行が無い（active だが未 export） | export-log + packets/active |

- **🔵 と 🔴 はどちらも「export 済み・未反映」**。違いは「いま手をつけている1つ（最新行＝🔵）」か「過去の取り残し（それ以外＝🔴）」かだけである。これにより、進行中の1工程と、書き戻し漏れで埋もれた N 個を視覚的に分離する。🔴 は別の警告ブロックを新設せず、**レール上のズレ（実装は進んだのに反映が遅れている）として浮かせる**。これは下記「軸間のズレを潰さずそのまま提示する」の具体化であり、新しい検査の追加ではない。
- **deltas の対応付けは新しい突合規則を作らない**。「現行 Source Packet＝export-log 最新行」「packet 名のテキスト照合」「対応 delta の有無の機械判定は初回サイクルのみ有効」という既存正本の規律（aggregate-sources / deltas.md 運用説明）をそのまま流用する。2巡目以降（再 export・再実装後）の反映要否は機械判定せず「ユーザー判断」と明示する。
- **残工程の一望**: ⚪ の行がそのまま「これから着手する残工程」を表す。レールは残工程と反映漏れを1枚で一望させることが目的であり、依存でブロック中の packet は下記「依存・ブロックビュー」の導出に従ってレール行に併記してよい（依存は推論・算出しない）。
- **後方互換**: 旧3値 `state: active` は「進行中」として扱い、export-log の行有無で 🔵/🔴/⚪ を判定する。`superseded_by` 不在は「統合なし」。deltas 不在は「未反映」。`state` 自体を観測できない packet は信号を断定せず「未観測」と明示する（推測で埋めない）。
- **derived の明示**: レールも派生（derived）・再生成可能であり正本ではない。正本は packet frontmatter・export-log・deltas であり、レールはその読み取り時点のスナップショットである。

## 進捗の3軸（単一％にしない）

進捗は次の3軸に分けて提示する。各軸は既存成果物の読み取りから**導く**（算出・採点はしない）。各軸には必ず出所（どの成果物のどこから導いたか）を併記する。

### 軸1: 意図の安定度

「上位の意図がどれだけ確定しているか」を定性的に映す軸。

- **出所**: `intent-tree.md`（L0–L4 の未記入箇所・`## Open Questions`・`## Assumptions`）、`intent-compass.md`（North Star / Anti-direction / Invariants / Decision Rules の未記入）。
- **読み方**: 未記入の L レベルや空の見出し、`## Open Questions` の残件数、`## Assumptions`（inferred＝推測由来）が canonical な確定記述に占める比率を**定性的に**示す。比率を厳密な数値スコアにしない（read-only mirror の規律。定量採点は持たない）。
- inferred（`## Assumptions` / `## Open Questions` 由来）と canonical（L0–L4 の確定記述）を**混在させず**、安定度の評価でも区別を保つ。
- 素材（tree/compass）が無ければ「未観測」と明示する。

### 軸2: 実現の完了度

「どこまで作ったか（開発の現在地）」を映す軸。

- **出所**: packet frontmatter の `state`。
- **値域（5値）**: `draft | ready | implementing | verifying | done`。各値は相互排他で、packet はちょうど1つの段階を取る。
  - `draft` = 起案中・未確定 / `ready` = 着手可（依存解決済み・実装待ち） / `implementing` = 実装中 / `verifying` = 実装済み・検証待ち（Evidence 未確定） / `done` = 証拠取得済み・完了。
- **後方互換**: 旧3値（`draft | active | done`）が残る packet は、`active` を「進行中（`implementing` 相当）」として読む。`state` キー自体を観測できない既存 packet は「実現の完了度: 未観測」とし、推測で埋めない。
- `state` は**宣言的記録**であり、overview は遷移を判定・進行させない（状態機械を持たない）。読み取った値をそのまま映す。

### 軸3: 証拠の確定度

「実装結果がどれだけ検証で裏づけられているか」を映す軸。

- **出所**: packet 本文 `## Evidence` 節の有無と確定度、`intent-validate` の検査軸（`validate-checks.md` の安定 kebab-case ID）、`drift-log.md`（drift-watch が `on` で存在する場合）との突き合わせ。
- **読み方**: `## Evidence` に確定した検証結果（実施日・対応する検査軸 ID・出所＝intent-validate / drift-watch / 人確認）があるかを読む。Evidence の各エントリが参照する検査軸 ID を、`validate-checks.md` の ID 体系に紐づけて整理する。
- **検査軸の読み取り**: intent-validate は結果を永続ファイルに書かないため、`validate-checks.md` の**検査軸 ID カタログ**（安定 kebab-case ID と重要度分類）を読み、証拠の観点をその ID 体系で整理する。検査ロジックは**再実装しない**。
- **後方互換**: `## Evidence` 節が無い既存 packet は「証拠の確定度: 未記入」として描き、欠落を推測で補完しない。
- validate 未実行・Evidence 不在・drift-log 不在で証拠が読めない場合は「未観測」と明示する。

## 軸間のズレを潰さずそのまま提示する

3軸は性質が異なるため、軸ごとの値がズレることがある。**そのズレを単一指標に押し潰さず、ズレとして明示**する。出所を併記してどの成果物の差から生じたズレかを辿れるようにする。

- 例: 「`verifying` だが Evidence 未確定」— 実現の完了度（軸2）は進んでいるが証拠の確定度（軸3）が未確定。
- 例: 「`done` だが上位 invariant との trace に穴」— 証拠の確定度（軸3）は揃ったが意図の安定度（軸1）との間にギャップ。

`verifying` 段階は仕様上「実現は進んだが証拠は未確定」を表す状態である。したがって overview は `verifying` の packet について、実現の完了度（軸2）と証拠の確定度（軸3）の差を**そのまま映す**（一方を他方に合わせて丸めない）。

## 依存・ブロックビュー（read-only 導出）

packet 間の依存とブロック状態を、宣言の**読み取りのみ**で提示する。

- **出所**: packet frontmatter の `depends_on`（依存先 packet の `packet_id` の集合。既定 `[]`）。
- **ブロックの導出（read-only）**: 「`depends_on` の中に `state` が `done` でない packet がある」= その packet は**ブロック中**として表示する。依存は**推論・算出しない**。宣言された `depends_on` を読むだけで導出し、packet に書き戻さない（packet-progress R3.3 / R3.5 と整合）。
- **循環・未解決依存の明示**: 循環（A→…→A）や、存在しない `packet_id` を参照する壊れた依存があれば明示する。
  - intent-validate の `dependency-cycle` / `dependency-broken-ref` の検査結果が参照可能なら、それに紐づけて提示する（検査ロジックは再実装しない）。
  - 検査結果が無い場合に限り、読み取り時点の素朴な検出（宣言された `depends_on` 集合の単純な追跡）を**注記レベル**で併記してよい。これは検査の代替ではなく読み取り時の補助である旨を明示する。
- **後方互換**: `depends_on` キーが無い既存 packet は「依存なし（空集合と等価）」として描き、依存を推測で補完しない。

## 関心別の派生ビュー（view-based 提示）

全体像を1枚の長文に混ぜず、関心ごとの派生ビューに整理する。最低限、次の3ビューを構成する。

- **意図ビュー**: aggregate-sources（tree / compass / packets / plan / export-log / deltas の集約）由来。canonical と inferred を区別したまま提示する。
- **依存・ブロックビュー**: 上記「依存・ブロックビュー」。`depends_on` とそれに基づくブロック状態、循環・未解決依存。
- **進捗ビュー**: 上記「進捗の3軸」。3軸と軸間のズレ。

各ビューについて次を守る。

- **単一正本から再生成**: 各ビューは canonical な `.intent/*.md` から再生成し、ビュー間で正本を二重化しない。同じ情報を複数ビューに重複保持しない（各ビューは正本への射影）。
- **素材不在のビューは省略**: 派生の素材となる成果物が無ければ当該ビューを**省略し、その理由（未観測 / 未生成 / 依存なし）を明示**する。空のビューを推測で埋めない。
- **derived の明示**: 各ビューに「これは派生（derived）・再生成可能であり正本ではない」ことを明示する。正本は元の `.intent/*.md` であり、ビューは読み取り時点のスナップショットである。

## 後方互換のまとめ

- `depends_on` 不在 → 依存・ブロックビューは「依存なし」として描く（欠落を推測で埋めない）。
- `## Evidence` 不在 → 証拠の確定度（軸3）は「未記入」として描く（欠落を推測で埋めない）。
- 旧3値 `state`（`active`）→ `implementing` 相当の「進行中」として読む。`state` 自体を観測できない packet は実現の完了度を「未観測」とする。
