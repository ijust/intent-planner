# 進捗の多軸読み取りと関心別ビューの構成

`intent-overview` skill が、packet の進捗を単一％にせず3軸で映し、`depends_on` からブロック状態を read-only 導出し、関心ごとの派生ビューを構成するための正本。本ルールは**読み取り専用**であり、進捗軸も依存関係も**算出・採点・推論しない**。進捗・依存・証拠の正本は `intent-planner-packet-progress` が整えた packet（frontmatter + `## Evidence` 節）であり、overview はそれを**映すだけ**である。算出が必要な検査（依存健全性・validate 軸）は intent-validate / drift-watch / algo-intent-recovery の責務で、本ルールはその**結果を読みに行く**のみ。

## 大原則（read-only mirror）

- packet 正本（`active/*.md` の frontmatter 10 キー + 本文 `## Evidence` 節）が進捗・依存・証拠の**唯一の正本**。overview はそこから派生ビューを再生成するだけで、正本を変更せず・二重化しない。
- 進捗を**単一の総合％に圧縮しない**。性質の異なる3軸に分けて提示する。
- 各軸・各ビューは「既存成果物のどこを読んだか」を出所として明示する。AI の自己申告ではなく、ファイルの読み取りに基づくことを示す。
- 対応する成果物が無い軸・ビューは「未観測 / 未記入 / 依存なし」と明示し、**推測で埋めない**。

## 状態を3区分で読む

- **工程の状態**: packet frontmatter、作業単位ごとの進行状況、依存・危険な知らせから読む。
- **未決の設計判断**: 明示された Open Questions または判断候補だけを読む。無ければ「なし」、根拠不足なら「未観測」とする。
- **利用者成果**: status と同じL1成果状態を読む。Intent Tree の L1 にある人が承認した現在結果だけを確定結果とし、pending の delta は確定結果に使わない。現在結果があれば結果3値（`価値が出た | 価値が出なかった | まだ分からない`）と要約を示す。現在結果がなく `成果の物さし:` があれば `リリース後の結果待ち`、どちらもなければ「未観測」とする。Evidence が実装・テストの完了だけを示す場合は成果の証拠へ読み替えない。結果待ちと現在結果は同時に表示しない。

3区分は独立した観測である。工程が順調でも利用者成果が正しいとは推測せず、**総合PASS**・総合スコア・「すべて正常」へ統合しない。

## 作業単位ごとの進行状況（読み取り専用の表示）

進捗の3軸（質的分解）の**前**に、全 packet の進行状況を1つの一覧に並べ、各 packet が「いまどの段に居るか」を一望させる。この一覧は3軸を圧縮した総合指標ではなく、3軸の手前に置く全体表示である（一覧で全体の現在地を掴み、各 packet の内訳は3軸で読む）。この表示も読み取り専用であり、状態を**算出・推論・採点しない**。既存成果物（packet frontmatter `state` / `superseded_by`・`export-log.md`・`deltas.md`）を読み、下表のいずれかの状態に当たるかを**機械的に判定して映すだけ**である。

### 状態表示と判定（すべて `.intent/` から機械観測可能）

各 packet を `state` × export-log の行有無 × deltas の対応エントリ有無で突合し、**上から評価して最初に当たった状態**を1つだけ付ける（first-match）。

| 状態 | 意味 | 判定条件 | 出所 |
|------|------|----------|------|
| ◻ 統合済 | 後継 packet に統合され役目を終えた | `superseded_by` が非空 | packet frontmatter |
| ✅ 反映済 | 実装が完了し intent へ書き戻し済み | `state: done` **かつ** deltas にこの packet の promoted/closed エントリあり | packet + deltas.md |
| 🔵 今ここ | いま手をつけている1工程（export 済み・未反映） | export-log に行あり・deltas に対応エントリ無し のうち、**現行 Source Packet（export-log 最新行）に一致**するもの | export-log 最新行 + deltas.md |
| 🔴 反映漏れ | 実装の証跡があるのに intent へ未反映（取り残し） | export-log に行あり・deltas に対応エントリ無し のうち、現行 Source Packet 以外 | export-log + deltas.md |
| ⚪ 未着手 | まだ cc-sdd へ export していない | export-log にこの packet の行が無い（active だが未 export） | export-log + packets/active |

- **🔵 と 🔴 はどちらも「export 済み・未反映」**。違いは「いま手をつけている1つ（最新行＝🔵）」か「過去の取り残し（それ以外＝🔴）」かだけである。これにより、進行中の1工程と、書き戻し漏れで埋もれた N 個を視覚的に分離する。🔴 は別の警告ブロックを新設せず、**一覧上のズレ（実装は進んだのに反映が遅れている）として浮かせる**。これは下記「軸間のズレを潰さずそのまま提示する」の具体化であり、新しい検査の追加ではない。

### 各行に `[現在の工程 → 次に通る工程]` を併記する（パイプライン射影）

各状態は「**反映の進捗**（export 済みか・書き戻し済みか）」を映すが、それだけでは「**この packet がいま意図づくり〜実装〜書き戻しのどの工程に居て、この後どの工程が残っているか**」が読めない。そこで各 packet 行に、状態表示に続けて `[現在の工程 → 次に通る工程]` を**併記する**。これは新しい観測・算出ではなく、既に「進捗の3軸」軸2で読み取る packet frontmatter の `state`（宣言値）を、下記の**固定パイプライン上の位置として読み替えて映すだけ**である（推論・採点をしない読み取り専用の規律を保つ）。

- **固定パイプライン（工程の正順）**: `discover → compass → packets → export → 実装(cc-sdd) → verify → writeback`。これは intent-planner の標準フロー（status の決定表 `decision-table.md` 脚注5 のコマンド順）と同じ並びであり、ここを工程順序の参照とする。各コマンド工程と packet `state` の対応は次のとおり読む。
  - `state: draft` = 起案中 → **次に通る工程: compass → packets**（意図と判断基準を詰める段）
  - `state: ready` = 着手可（依存解決済み・実装待ち） → **次に通る工程: export → 実装**
  - `state: implementing` = 実装中 → **次に通る工程: verify → writeback**
  - `state: verifying` = 実装済み・検証待ち（Evidence 未確定） → **次に通る工程: writeback**（Evidence 確定後）
  - `state: done` = 完了 → **次に通る工程: なし（このレーン完了）**
- **「現在の工程」は状態表示と `state` の組み合わせで書く**。例: 状態が 🔵 今ここ で `state: implementing` なら `🔵 今ここ [implementing → 次: verify→writeback]`、⚪ 未着手で `state: ready` なら `⚪ 未着手 [ready → 次: export→実装]`、⚪ 未着手で `state: draft` なら `⚪ 未着手 [draft → 次: compass→packets]`。これにより「P いくつをやっていて、この先どの工程が残るか」が1行で読める。
- **次工程はパイプライン定義からの射影であり推論しない**。`state` を**次に来る固定工程に対応づけて映すだけ**で、所要時間・難易度・成否を予測しない。`depends_on` に未 `done` の依存があってブロック中の packet は、次工程の前に `（依存 <packet_id> 待ちでブロック中）` と併記する（ブロック判定は「依存・ブロックビュー」の read-only 導出に従い、推論・算出しない）。
- **後方互換**: 旧3値 `state: active` は `implementing` 相当として `[active(=実装中) → 次: verify→writeback]` と読む。`state` 自体を観測できない packet は工程併記を断定せず `[工程: 未観測]` と明示する（推測で埋めない）。
- **deltas の対応付けは新しい突合規則を作らない**。「現行 Source Packet＝export-log 最新行」「packet 名のテキスト照合」「対応 delta の有無の機械判定は初回サイクルのみ有効」という既存正本の規律（aggregate-sources / deltas.md 運用説明）をそのまま流用する。2巡目以降（再 export・再実装後）の反映要否は機械判定せず「ユーザー判断」と明示する。
- **残工程の一望**: ⚪ の行がそのまま「これから着手する残工程」を表し、各行の `[現在の工程 → 次に通る工程]` 併記によって「その packet がこの後どの工程を通るか」まで一望できる。この一覧は残りの開発工程と反映漏れを1つの表示で見渡せるようにすることが目的であり、依存でブロック中の packet は下記「依存・ブロックビュー」の導出に従って進行状況一覧の該当行に併記してよい（依存は推論・算出しない）。
- **後方互換**: 旧3値 `state: active` は「進行中」として扱い、export-log の行有無で 🔵/🔴/⚪ を判定する。`superseded_by` 不在は「統合なし」。deltas 不在は「未反映」。`state` 自体を観測できない packet は状態を断定せず「未観測」と明示する（推測で埋めない）。
- **derived の明示**: この一覧も派生（derived）・再生成可能であり正本ではない。正本は packet frontmatter・export-log・deltas であり、一覧はその読み取り時点のスナップショットである。

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

## active packet の着手前ブリーフ（任意ビュー）

利用者が「着手前ブリーフ」「active packet を読む前に要点」「どこから実装するかの理解」などを求めたときは、`.intent/overview/active-packet-briefing.md` を派生生成してよい。これは active packet を読み始める前の briefing であり、実装順序や優先順位を決めるものではない。

読み取りは active packet の frontmatter と、本文の見出しに限定する。本文を長く転載せず、根拠見出しを示して短く要約する。

| ブリーフ節 | 読む素材 | 表示する内容 |
|---|---|---|
| 現在地 | `packet_id` / `name` / `state` / `updated_at` / export-log 最新行 | いま読む packet と開発工程上の位置 |
| Why / Outcome | `summary` / `## Why` / `## Outcome` 相当の見出し | 何を達成する packet か。見出しが無ければ未記入 |
| Scope / Out of Scope | `## Scope` / `## Non-goals` / `## Deferred` 相当の見出し | 手を出す範囲と出さない範囲 |
| Safety / Decisions | `intent-compass.md` の該当 Invariants / Decision Rules、packet の Safety / Constraints 相当 | 守るべき判断基準。対応が不明なら未観測 |
| Evidence / Verify | `## Evidence` と validate-checks の ID | 完了判定に使う証拠。未記入なら未記入 |
| Dependencies | `depends_on` と依存先 packet の `state` | 依存待ち・ブロック中なら明示 |

- active packet が複数ある／現行 Source Packet が曖昧な場合は、候補を列挙して断定しない。
- ブリーフは着手判断の補助であり、`state` を進めない。未理解点は下記「理解ギャップ整理」へ候補として出すだけで、Open Questions へ書き戻さない。

## 理解ギャップ整理（任意ビュー）

利用者またはエージェントが「まだ分かっていない点」「理解ギャップ」「intent の穴」を挙げたときは、`.intent/overview/understanding-gaps.md` を派生生成してよい。これは writeback 前の候補整理であり、canonical な Open Questions / packet 候補 / compass へ直接反映しない。

各ギャップは次の分類で並べる。

| 分類 | 意味 | 次の扱い |
|---|---|---|
| session-unread | 既存成果物をまだ読めていないだけの可能性 | 参照すべきファイル・見出しを示す |
| source-blank | 正本に未記入または未観測がある | 「未記入」として示し、推測で埋めない |
| product-hole | intent-tree / compass / packet のいずれにも対応する意図が記録されていない可能性 | packet 候補・Open Questions 候補として分けるが、書き込まない |
| conflict | 正本同士の記述が食い違う可能性 | どのファイル同士の差かを示す |

- ギャップごとに `source`（読んだファイル・見出し）と `next candidate`（確認先または起案候補）を持たせる。
- 「product-hole」は断定せず候補として書く。packet 化・優先順位付け・Open Questions への追記は利用者または別スキルの明示実行に委ねる。

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
