---
name: intent-status
description: .intent/ の現状を読み取り、現在地の要約と「次の一手」をちょうど1つ推奨する読み取り専用の案内スキル。ファイルの作成・変更・削除は一切しない。
---

# intent-status Skill

## Core Mission
- **Success Criteria**:
  - `.intent/` 配下の成果物（mode・intent-tree・intent-compass・packets/ の index と packet ファイル群・packet 毎ディレクトリの cc-sdd 下書き群・deltas）の存在と記入状態を読み取り、現在地の要約を提示している
  - `.intent/packets/index.md` と `active/` 配下の実体の整合（index に無い packet・実体の無い行・name / state / summary の不一致）、active/ 内の done / superseded_by 記入済みファイルの滞留、export-log 最新行の packet の active/ 不在（archive 在中）を検査し、違反を現在地サマリで報告している
  - 孤児 spec 検査: `.kiro/specs/` に進行/完了している spec があるのに、`active/` のどの packet・`deltas.md` のどの delta ともテキスト照合できない場合、「起草されていない実装の可能性（Packet を経ずに実装された疑い）」として詳細に併記している（断定せず候補提示。照合不能は常態として誤検知を許容し、次の一手の first-match は奪わない。`.kiro/specs/` 不在の環境ではこの検査を行わない）
  - intent-tree 起票漏れ検査（discover スキップ）: `.kiro/specs/` に設計/実装が進んだ spec があるのに、`.intent/intent-tree.md` の **L0〜L4 の見出し・本文**（O#/C#/B#/P# のような ID アンカーは intent-planner に存在しないためテキスト照合のみで判定する）のどれともテキスト照合できない場合、「intent-tree に起票されていない実装の可能性（discover スキップ）」として詳細に併記している（断定せず候補提示。照合不能は常態として誤検知を許容し、次の一手の first-match は奪わない。`.intent/intent-tree.md` 不在または `.kiro/specs/` 不在の環境ではこの検査を行わない）。この起票漏れ（tree 層）・既存の孤児 spec 検査（Packet 層）・writeback 漏れ（下流層）を3階層で棲み分け、同一 spec が複数層に該当する場合は最上流の1層でのみ提示して二重警告を出さない
  - 報告冒頭にミニ工程レール（全 packet を5信号 ✅/🔵/⚪/🔴/◻ で縦に並べ、各行に `[現在の工程 → 次に通る工程]` を併記する）を置き、「いまどの packet が 🔵 今ここで・この後どの工程が残り・どこに ⚪ 残工程 / 🔴 反映漏れがあるか」を一望できるようにしている。内部用語（突合手順・整合検査・enforcement 用語）は冒頭でなく詳細（後段）に退避している
  - 既定出力を3層（既定＝今ここ＋次の一手1行強調＋Candidate Packets 件数/名前＋Ice box 案内1行／詳細＝折りたたみ位置／オプション＝自然言語トリガ時のみ）でスリム化し、次の一手の要約1行は折りたたまず冒頭の目立つ位置に常に強調している
  - 「危険な知らせ」（鮮度警告・packets 整合違反・反映漏れ `🔴`）は**実害がある場面では裸の絵文字でフル表示**したまま保持し（折りたたまない）、折りたたむ詳細側にも「`⚠` N 件あり（詳細参照）」のサマリ1行を残して見落としを防いでいる。凡例・用語説明・0件サマリ等の説明の場面では警告信号を裸でなくインラインコード/語句でトーンダウンし、実害ゼロでびっくりさせない（INV32）
  - `.intent/intent-tree.md` の L4「今後の付加候補」を Read/Glob/Grep のみで読み、`archive/`・`.kiro/specs/` と既存検査（孤児 spec/起票漏れ）と同じテキスト照合手段で突合して未消化（packet 化も実装もされていない）候補を件数＋名前で既定に常設表示している（凍結マーク付きは除外。照合不能は誤検知許容・断定しない。L4/archive/specs 不在なら 0 件）
  - 凍結マーク（`Deferred`/`保留`/`当面しない`/条件付き保留 等）の Ice box 候補は既定では本体を出さず案内文1行「凍結中（Ice box）: N 件。『icebox も見せて』で表示できます」を併記し、自然言語トリガで件数＋名前＋凍結理由を展開している（境界曖昧は Candidate 側・断定しない）
  - 見せ方（出力構成）だけを変え、「次の一手」の first-match 選定ロジックは変えていない（どの一手を推すかは非接触）
  - 「次の一手」を `rules/decision-table.md` の first-match でちょうど1つ推奨し、推奨理由と判断根拠（どの成果物のどの状態に基づくか）を併記している
  - 推奨候補を discover / compass / packets / export / validate / improve / writeback / 「アクション不要」の中から選定している
  - mode.md の enforcement が remind または gate のとき intent-check による鮮度検査を行い、違反（判定行の `result=stale` または `pending` が 1 以上）の検出時は現在地サマリに intent-check の stdout を引用した鮮度警告を併記している（off・未記載・不正値・実行不可のときは現行どおり警告を出さない）
  - mode.md の drift-watch が `on` のとき drift-log を読んで軽い集計（`caught N / missed N / false-positive N / unjudged N`）を現在地サマリに1ブロック併記している（off・未記載・不正値・セクション不在・mode.md 不在のときは併記せず現行どおり続行する）。drift-log は読むのみで書き込まない（read-only 維持）
  - intent-compass.md の節更新日（`Updated (Invariants):` / `Updated (Decision Rules):`）と active/ 配下 packet の `updated_at` を Read/Glob/Grep のみで照合し、「compass 更新後に未追随」の packet 件数が閾値以上のとき `/intent-validate` を頃合いとして推奨し（決定表 row 12）、その根拠（どの節が更新後・未追随が何件か）を併記している。確定診断はせず概算にとどめ、閾値未満では提案しない（read-only 維持）
  - `.intent/milestones.md` の各 event を Read/Glob/Grep のみで読み、event 記録日時より後に「compass の `Updated (Decision Rules):` 反映打刻」または「deltas の該当 Decision 参照」のいずれも無いものを「未消化 milestone（記録済みだが対応する見直しが未処理）」として把握し、残課題として現在地報告に併記している（Step 3.6 と同型の ISO 8601 辞書順・両端実打刻ペアのみの比較。断定せず候補提示。`.intent/milestones.md` 不在時はこの検査を省略する。read-only 維持）
  - ファイルの作成・変更・削除を一切行っていない（read-only）
  - 出力中の主要術語に、その意味の一行説明を `術語（説明）` の形で併記している（冒頭＝初出・表見出しのみ／詳細＝毎回の2層。用語説明一覧は維持し全廃しない）

## Execution Steps

### Step 1: `.intent/` の存在を確認する
- `.intent/` が存在しなければ、セットアップ手順（`npx intent-planner` の実行）を案内して終了する。
- `.intent/mode.local.md`（無ければ旧 `.intent/mode.md`）の mode 状態を読む。どちらにも無ければ standard 既定で続行し、Open Questions に「モード未確定・`/intent-discover` 推奨」を併記する（停止しない）。Enforcement / Drift-watch は `.intent/mode.md` を読む。

### Step 2: 成果物を読み取る
- `.intent/intent-tree.md` / `.intent/intent-compass.md` / `.intent/packets/index.md` と対象 packet ファイル（`.intent/packets/active/` 配下。通常の処理ではこの2種のみを読み、全 packet ファイルの本文丸読みをしない）/ `.intent/cc-sdd/<スラッグ>/*.md`（packet 毎ディレクトリの下書き群）/ `deltas`（分割形 `.intent/deltas/*.md` 群があれば正本・無ければ旧 `.intent/deltas.md` ミラー。`rules/decision-table.md` 脚注10の分割形横断読み）を読み、それぞれの 有/無/未記入 と特記事項（未解決 Question、Status: pending の delta、「保留」タグ付き見送り項目など）を把握する。
- packets 整合検査: `.intent/packets/index.md` と `.intent/packets/active/` 配下の実体を突合し（実体側は各ファイルの frontmatter のみを読む）、乖離 — index に無い packet・実体の無い行・name / state / summary の不一致 — を整合違反として把握する。あわせて active/ 配下に `state: done` または `superseded_by` 記入済みの packet ファイルが滞留していれば、その滞留も整合違反として把握する（報告のみ。自動修復はしない）。
- index.md が不在の場合は、`active/` 配下の frontmatter から直接一覧を構成して処理を継続し、Step 5 で index の再生成（canonical を変更する skill の実行）を促す。
- 現行 Source Packet（最新 export）の特定は export-log（分割形 `.intent/export-log/*.md` 群があれば正本・`exported_at` 昇順／無ければ旧 `.intent/export-log.md` ミラー。`rules/decision-table.md` 脚注10の分割形横断読み）の最新行（末尾のデータ行）の packet 名を正とする。解決順序: ①利用者の明示指定 → ②export-log 最新行（正典） → ③下書きの `## Source Packet` 見出し（packet ディレクトリが1つのみの場合に限り採用。複数ある場合は各ディレクトリの見出しを候補として列挙し断定しない） → ④下書き本文と index.md / packet ファイルのテキスト照合（自然言語の候補提示にとどめ、断定しない）。export-log が不在または最新行が解釈不能で③以降へフォールバックした場合は、その事実を Step 5 の報告に含める。現行 Source Packet（export-log 最新行の packet）が `active/` に不在（archive 在中）の場合も、その事実を Step 5 の報告に含める。
- 現行 packet のディレクトリ（`.intent/cc-sdd/<スラッグ>/`）の有無を確認する。packet 名とディレクトリの同定は「ディレクトリ内 requirements.md の `## Source Packet` 見出しが packet 名と一致すること」を正とする（slug 再計算は探索の高速路にとどめ、見出し不一致なら同定しない）。
- `.kiro/specs/` は存在する場合のみ読み、各 spec の spec.json と tasks.md のチェック状況を文脈に使う。対応 spec の特定は spec ディレクトリ名および各 spec の requirements.md「Project Description (Input)」本文と Source Packet 名のテキスト照合による（照合規則の詳細は `rules/decision-table.md` の脚注に従う）。
- 孤児 spec 検査（起草スキップの検出）: `.kiro/specs/` が存在する場合に限り、各 spec が「進行/完了している」（spec.json が requirements 以降のフェーズ・または tasks.md に1つ以上チェック済みタスクがある）にもかかわらず、`active/` のどの packet・`archive/` のどの packet・`deltas`（分割形 `.intent/deltas/*.md` 群があれば正本・無ければ旧 `.intent/deltas.md` ミラー。`rules/decision-table.md` 脚注10の分割形横断読み）のどの delta ともテキスト照合できない spec を「孤児 spec」として把握する。照合は既存の対応 spec 特定と同じ手段（spec ディレクトリ名・requirements.md「Project Description (Input)」本文と packet 名・spec_refs のテキスト照合。規則は `rules/decision-table.md` 脚注に従う）で行い、**ファイルから機械観測できる範囲に限る**（git 履歴・コード差分・タイムスタンプは見ない）。孤児 spec は「Packet を経ずに実装された疑い（起草フェーズのスキップ）」として Step 5 ③ 詳細に併記する。照合不能は常態（脚注の既知限界）であり**断定せず**候補提示にとどめ、次の一手の first-match には影響させない（整合検査と同じ「報告に留める」温度。誤検知を許容する）。
- intent-tree 起票漏れ検査（discover スキップの検出）: `.kiro/specs/` と `.intent/intent-tree.md` がともに存在する場合に限り、各 spec が「設計/実装が進んでいる」（spec.json が requirements 以降のフェーズ・または tasks.md に1つ以上チェック済みタスクがある）にもかかわらず、`.intent/intent-tree.md` の **L0〜L4 の見出し・本文**（L0 Product Purpose / L1 Desired Outcomes / L2 Capabilities / L3 Behavioral・Architectural Intents / L4 Candidate Packets。intent-planner の現行記法はこの **L0〜L4 のレベル記号**であり、`O#`/`C#`/`B#`/`P#` のような **ID アンカーは存在しないので照合に使わずテキスト照合のみで行う**）のどれともテキスト照合できない spec を「intent-tree に起票されていない実装の可能性（discover スキップ＝起票フェーズそのもののスキップ）」として把握する。照合は既存の対応 spec 特定と同じ手段（spec ディレクトリ名・requirements.md「Project Description (Input)」本文と intent-tree の L0〜L4 見出し・本文のテキスト照合。規則は `rules/decision-table.md` 脚注に従う）で行い、**ファイルから機械観測できる範囲に限る**（git 履歴・コード差分・タイムスタンプは見ない）。これは孤児 spec 検査（Packet 不在）よりさらに**上流**の起票漏れであり、両検査の階層は分けて扱う（後述の3階層棲み分け）。intent-tree への起票漏れは Step 5 ③ 詳細に併記する。照合不能は常態（脚注の既知限界）であり**断定せず**候補提示にとどめ、次の一手の first-match には影響させない（整合検査・孤児 spec 検査と同じ「報告に留める」温度。誤検知を許容する）。`.intent/intent-tree.md` 不在または `.kiro/specs/` 不在の環境ではこの検査を行わない。
- 起票漏れ／孤児 spec／writeback 漏れの3階層棲み分け: 同一 spec が複数層に該当しうるため、上流から **①intent-tree 起票漏れ（discover スキップ＝tree 層）→ ②孤児 spec＝Packet 不在（packet 層）→ ③writeback 漏れ（enforcement／鮮度。下流層）** の順で位置づけ、該当した spec は**最上流の1層でのみ提示**して二重警告を出さない（上流が該当する spec を下流層でも重ねて警告しない）。提示時は `discover → packets → writeback` の段階対処として案内する（詳細は `rules/decision-table.md` 脚注に従う）。

### Step 3: 鮮度を検査する（enforcement 連動）
- Step 1 で読んだ `.intent/mode.md` の `## Enforcement（ユーザー管理）` セクションにある `enforcement` の値を確認する。`off`・未記載・不正値のときは本 Step を行わない（intent-check を実行せず、鮮度警告も出さない。現行動作の維持）。
- `remind` または `gate` のときは、Bash で `node .intent/scripts/intent-check.mjs` を実行する。実行不可（Bash が使えない・スクリプト不在・exit 2）の場合は本 Step を省略し、既存挙動で続行する。
- 判定は stdout 1行目の判定行 `intent-check: result=<ok|stale|not-applicable> enforcement=<off|remind|gate> commits=<N|-> threshold=<M> grace=<in-implementation|-> pending=<K> block=<yes|no>` をそのまま信頼し、再導出しない。`result=stale` または `pending` が 1 以上のとき違反として扱う。
- 違反を検出した場合は、Step 5 の現在地サマリに intent-check の stdout（判定行 + 人間可読の根拠行）を引用した鮮度警告を併記する。intent-check は読み取り専用スクリプト（ファイルの作成・変更・削除を行わない）であり、本スキルの read-only 性質は維持される。

### Step 3.5: drift 併記（drift-watch 連動）
- Step 1 で読んだ `.intent/mode.md` の `## Drift-watch（ユーザー管理）` セクションにある `drift-watch` の値を確認する。`on` でないとき（`off`・未記載・不正値・セクション不在・mode.md 不在）は本 Step を行わない（drift 併記をせず、現行どおり続行する。現行動作の維持）。
- `on` のときは `.intent/drift-log.md` を **Read / Grep で読むのみ**（Write しない。Bash は既存の intent-check 起動に限る原則を変えない）で、各エントリの `outcome` と `user-verdict` を集計する。`caught` / `missed` / `false-positive` は `outcome` の値から、`unjudged` は `user-verdict=unjudged` の件数から数える。
- 集計結果は鮮度警告と同じ位置・温度感で、Step 5 の現在地サマリに `caught N / missed N / false-positive N / unjudged N` の1ブロックとして軽く併記する（情報過多にしない）。`.intent/drift-log.md` が不在のときはこのブロックを省略する（エラーにしない）。
- drift-log は読むのみで書き込まない（read-only 維持）。`missed=0` は「効いた」ではなく「記録漏れの疑い」として、断定せず提示する。

### Step 3.6: conformance 陳腐化の頃合いを概算する（read-only）
- 目的: compass（Invariants / Decision Rules）が更新されたのに packet がまだ追随していない「頃合い」を概算し、決定表 row 12 で `/intent-validate` を推す材料にする。確定診断（要修正/推奨）は validate の `invariant-stale-vs-compass` 等が行い、status は概算にとどめる。
- 取得は **Read / Glob / Grep のみ**で行う（Bash＝intent-check は使わない。drift-log と同じく read-only の範囲を広げない）:
  - `.intent/intent-compass.md` の `Updated (Invariants):` / `Updated (Decision Rules):` 行の ISO 8601 値を読む（`—` は未打刻）。
  - `.intent/packets/active/` 各 packet の frontmatter `updated_at` を読む（`archive/` は対象外）。
- 判定: いずれかの compass 節更新日 > その packet の `updated_at` を満たす active packet を「compass 更新後に未追随」として数える。比較は ISO 8601 文字列の辞書順。両端が実打刻のペアのみ対象とし、`updated_at` 不在の packet は対象外（推測で埋めない＝後方互換規律）。compass 節更新日が両方 `—` のときは本 Step を行わない（頃合いを出さない）。
- 未追随件数が閾値（既定 1 件、決定表 row 12 に明示）以上のとき、Step 5 ③ 詳細に「どの compass 節が更新後・未追随 packet が何件か」を根拠として併記する。閾値未満のときは併記しない（狼少年化の回避）。本 Step は何も書き込まない（read-only 維持）。

### Step 3.7: 未消化 milestone を残課題として把握する（read-only）
- 目的: `.intent/milestones.md`（節目イベント記録）に記録された節目イベントのうち、対応する Decision の見直し（Revisit 反映）がまだ消化されていないものを「未消化 milestone」として残課題に挙げる。記録は利用者の宣言的記入に委ね、status は照合のみを行う（算出・推論・自動修正なし）。
- 取得・比較は Step 3.6 と同じ **Read / Glob / Grep のみ**で行う（Bash＝intent-check は使わない。read-only の範囲を広げない）:
  - `.intent/milestones.md` の各 event 行から `event`（自然文文字列）と `recorded_at`（ISO 8601 の記録日時）を読む。
  - `.intent/intent-compass.md` の `Updated (Decision Rules):` 行の ISO 8601 値（Revisit 反映打刻。`—` は未打刻）と、`.intent/deltas.md` の各 delta が当該 Decision を参照しているかを読む。
- 判定: 各 event について、その `recorded_at` より後に「compass の `Updated (Decision Rules):` 反映打刻がある」または「deltas に該当 Decision への参照がある」のいずれも観測できないものを「未消化 milestone（記録済みだが対応する見直しが未処理）」として数える。日時の比較は Step 3.6 と同じ ISO 8601 文字列の辞書順とし、両端が実打刻のペアのみ対象とする（`recorded_at` 不在・`Updated (Decision Rules):` が `—` の event は推測で埋めず対象外＝後方互換規律）。
- 未消化 milestone を検出したとき、Step 5 ③ 詳細に「どの event が未消化か」を残課題として併記する（断定せず候補提示。照合不能は常態として誤検知を許容し、次の一手の first-match は奪わない）。`.intent/milestones.md` が不在のときは本 Step を行わない（検査をスキップして続行・エラーにしない）。本 Step は何も書き込まない（read-only 維持）。

### Step 4: 決定表で次の一手を1つに決める
- `rules/decision-table.md` を読み、first-match（上から評価し、最初に該当した行のみ）で「次の一手」をちょうど1つ決定する。
- 複数候補の併記はしない（理由と根拠は併記する）。推奨が複数見える曖昧なケースも、決定表の優先順位で機械的に1つへ畳む。

### Step 5: 報告する
報告は**読み手が「いまどこで、次に何をするか」に最短で辿り着ける順序**で構成し、既定出力をスリム化する。出力は **既定（折りたたまない）／詳細（折りたたみ位置）／オプション（自然言語トリガ時のみ）** の3層で構成する。既定には要点（①〜④）と「危険な知らせ」だけを置き、内部用語（突合手順・整合検査・enforcement 用語など）や検査の詳細は ⑤ 詳細へ退避する。

**【既定】折りたたまない要点**

- ① **工程レール（冒頭ミニレール）**: 全 packet を縦に並べ、各 packet に5信号（✅ 反映済 / 🔵 今ここ / ⚪ 未着手 / 🔴 反映漏れ / ◻ 統合済）のいずれか1つを付け、**続けて `[現在の工程 → 次に通る工程]` を併記する**。信号の判定も工程併記も overview の `progress-readout.md`「工程レール」と同じ規律（5信号は `state` × export-log の行有無 × deltas の対応エントリ有無を first-match で突合、工程併記は packet `state` を固定パイプライン `discover→compass→packets→export→実装→verify→writeback` 上の位置として読み替え。いずれも算出・推論しない）に従う。例: `P2  🔵 今ここ [implementing → 次: verify→writeback]` / `P3  ⚪ 未着手 [ready → 次: export→実装]`。これにより**「P いくつが今ここで・この後どの工程が残り・どこに ⚪ 残工程 / 🔴 反映漏れがあるか」を1枚で一望**させる。各信号は用語一覧に従い意味を併記する。レールは read-only mirror であり、status は何も変更しない。
- ② **次の一手（ちょうど1つ・1行・常に強調）**: スキル名 or「アクション不要」を**要約1行で**冒頭の目立つ位置に示す（既定をスリム化しても**この1行は折りたたまず常に出す**）。続けて推奨理由 + 判断根拠（どの成果物のどの状態に基づくか）を簡潔に添える。決定表（`rules/decision-table.md`）の first-match 結果を、内部の行番号でなく**人間が次に取る行動**として翻訳して提示する（**見せ方を変えるだけで、どの一手を推すかの first-match 選定ロジックは変えない**）。
- ③ **Candidate Packets（packet 化されていない候補プール）**: `.intent/intent-tree.md` の L4「今後の付加候補」を **Read / Glob / Grep のみ**で読み、`.intent/packets/archive/` と `.kiro/specs/` を Step 2 の孤児 spec / 起票漏れ検査と同じテキスト照合手段で突合して、**未消化（packet 化も実装もされていない）候補**に絞り、**件数＋名前**の箇条書きで既定に出す。照合不能は常態として誤検知を許容し、断定せず候補提示にとどめる。**凍結マーク付きの候補（後述 Ice box）は件数＋名前から除外する**。L4／archive／`.kiro/specs/` が不在なら 0 件として扱い、エラーにしない。
- ④ **Ice box 案内（凍結候補の存在告知・1行）**: 凍結マーク（`Deferred` / `保留` / `当面しない` / 条件付き保留 等）を **Read / Grep のみ**でテキスト照合した凍結候補は、**既定では本体を出さず**、案内文1行 **「凍結中（Ice box）: N 件。『icebox も見せて』で表示できます」** を既定に常時併記する（0 件なら案内も省いて冒頭をさらに軽くする）。境界が曖昧な候補（マーク無しだが実質塩漬け）は凍結とみなさず ③ Candidate 側に出す（断定しない）。
- ⊕ **危険な知らせ（既定に必ずフル表示・折りたたまない）**: **鮮度警告（Step 3）・packets 整合違反（index ↔ active/ の乖離・done / superseded_by 滞留・export-log 最新行 packet の active/ 不在）・反映漏れ 🔴** の3種は見落とすと危険なため、**既定にフル表示したまま保持し、⑤ 詳細へ折りたたまない**。enforcement / drift-watch が off・未記載のときは現行どおり鮮度警告を出さない（既存挙動を変えない）。**警告信号の見た目の出し分け（INV32）**: ここ（実害がある場面）では `🔴` 等を**裸の絵文字で目立たせる**が、凡例・用語説明・0件サマリ・空レール等の**説明の場面では裸で出さずインラインコード（`🔴`）/語句（「反映漏れ」）でトーンダウン**する。0件のときは「反映漏れなし」を語句で示し、裸の警告絵文字を出さない（警告の語義は保つ）。

**【詳細】折りたたみ位置へ退避**

- ⑤ **詳細（折りたたみ位置）**: ① の各信号の根拠となった成果物ごとの 有/無/未記入 と特記事項、現行 Source Packet（export-log 最新行に基づく packet 名）と当該 packet のディレクトリ（`.intent/cc-sdd/<スラッグ>/`）の有無。⊕ で既定に出した危険な知らせは、ここにも **「⚠ N 件あり（詳細参照）」のサマリ1行**を残して詳細本体と接続する（既定からは消さない）。index 不在の場合は再生成の案内を、Step 3.5 で drift-watch が `on` のときは drift-log の軽い集計（`caught N / missed N / false-positive N / unjudged N`）を、Step 3.6 で conformance 陳腐化の頃合い（未追随件数が閾値以上）を検出した場合は「どの compass 節が更新後・未追随 packet が何件か」の根拠を、ここに1ブロック併記する。Step 2 で intent-tree 起票漏れ（discover スキップの疑い）を検出した場合は、その spec 名と「設計/実装が進んでいますが、`.intent/intent-tree.md` の L0〜L4 のどのノードともテキスト照合できませんでした。discover フェーズそのものをスキップした疑いがあります。`/intent-discover` で intent-tree（L0〜L4）へ起票し、その後 `/intent-packets` で Packet を起こし、`/intent-writeback` で実装の現実を canonical へ戻すのが順序です」という案内を、断定を避けた候補提示の温度で1ブロック併記する（次の一手の決定表結果は変えない）。Step 2 で孤児 spec（起草されていない実装の疑い）を検出した場合は、その spec 名と「Packet を経ずに実装された疑いがあります。事後でも `/intent-packets` で Packet を起こし（未確定の仕様は Open Questions / Deferred として明示）、その後 `/intent-writeback` で実装の現実を canonical へ戻すのが順序です」という案内を、断定を避けた候補提示の温度で1ブロック併記する（次の一手の決定表結果は変えない）。**この2検査と writeback 漏れ（鮮度警告）は上流から tree 層 → packet 層 → 下流層の3階層で棲み分け、同一 spec が複数層に該当する場合は最上流の1層でのみ提示して二重警告を出さない**（上流が該当する spec を下流の孤児 spec／鮮度警告で重ねて出さず、`discover → packets → writeback` の段階対処として案内する）。Step 3.7 で未消化 milestone（記録済みだが対応する見直しが未処理の節目イベント）を検出した場合は、その event 名と「節目イベントが記録されていますが、対応する Decision の見直し（Revisit 反映）がまだ消化されていない可能性があります。`/intent-improve` で該当 Decision Rule の `Revisit when` 照合・再提案を確認するのが順序です」という案内を、鮮度警告と同じ位置・温度感で（断定を避けた候補提示の温度で）1ブロック併記する（次の一手の決定表結果は変えない）。
- ⑥ Open Questions: ユーザー確認が必要な点。確認は自然言語での候補提示にとどめ、次のアクションの判断はユーザーに委ねる（一方向報告）。

**【オプション】自然言語トリガ時のみ**

- ⑦ **Ice box 展開**: 利用者が自然言語トリガ（「icebox も見せて」等）で要求したときのみ、④ の凍結候補を **件数＋名前＋凍結理由の短い添え**で展開する。展開も Read / Grep のみの read-only で、status は何も変更しない。

- **未記入・不在の表示**: 成果物が未記入・不在のときは、`Intent Tree（やりたいことの階層マップ）: 未作成` のように「術語（説明）: 状態」の形で、その成果物が**まだ無い／中身が入っていない**ことが術語を知らなくても分かる平易な日本語で示す。整合検査の違反（`superseded_by` 滞留・index との乖離・archive 在中等）も同様に、術語に説明を併記しつつ「何がどう滞留／乖離しているか」を平易な日本語で示す。

## 用語の常時併記ルール

出力に現れる術語は、下記「用語説明一覧」を参照して `術語（説明）` の括弧書き形式で意味を併記する。併記は **冒頭（既定）と詳細（折りたたみ位置）で2層に分ける**。具体的な規約は以下の通り。

- **2層併記ルール（冒頭=初出/見出しのみ・詳細=毎回）**: status 出力に現れる intent-planner 固有の術語（成果物名・state 値・検査用語・コマンド名）は、**英語表記のまま正として保ち、訳語に置換しない**。その上で、各術語にはその意味を表す日本語の一行説明を `術語（説明）` の括弧書き形式で併記する。併記の密度は出力の層で分ける: **冒頭（既定のスリムな要点）では併記を初出・表見出しのみに絞る**（冒頭の冗長さを避け「次の一手」を埋もれさせない）。**詳細（折りたたみ位置）では、その術語が出力に現れるたびに毎回併記する**（詳細は状況により出る項目が変わる断片的な報告であり「初出」が安定しないため、毎回その場で意味が分かることを優先する）。用語説明一覧そのものは維持し、術語併記を全廃しない（status-readability の「術語を知らなくても読める」価値は詳細側で保つ）。
- **冗長回避の運用**: 同一出力内で同じ術語が繰り返し現れて冗長になる場合でも、各項目を**術語のみで放置しない**。一覧・表形式の項目見出しでは括弧書き併記を保ち、本文中の反復言及では文脈で意味が辿れる限り形式を簡潔に整えてよい。形式を整える場合も「術語の意味が辿れる状態」を維持することが条件。

### 用語説明一覧

status が出力時に参照する術語と一行説明（この一覧はこの SKILL 内で self-contained に保つ）。

**成果物名**

| 術語 | 一行説明 |
|------|----------|
| Intent Tree | やりたいことの階層マップ（L0=目的 〜 L4=作業単位候補） |
| Intent Compass | 局所最適を防ぐための判断基準 |
| Packets / packet | cc-sdd に渡す前の作業単位（Issue より上位・spec より手前の粒度） |
| Source Packet | その下書きの元になった packet（export 元の同定） |
| delta | canonical 成果物を事後更新するための差分記録 |

**state（5値）**

| 術語 | 一行説明 |
|------|----------|
| state: draft | 起案中・未確定 |
| state: ready | 着手可（依存解決済み・実装待ち） |
| state: implementing | 実装中 |
| state: verifying | 実装済み・検証待ち（Evidence 未確定） |
| state: done | 証拠取得済み・完了 |

**工程レール（5信号 + 工程併記）**（packet を `state` × export-log の行有無 × deltas の対応エントリ有無で突合し、first-match で1つ付ける。さらに各行に `[現在の工程 → 次に通る工程]` を併記し、packet `state` を固定パイプライン `discover→compass→packets→export→実装→verify→writeback` 上の位置として読み替える。判定の正本は `rules/decision-table.md` ではなく overview の `progress-readout.md`「工程レール」だが、status の冒頭ミニレールも同じ5信号語彙 + 工程併記を使う）

> 凡例の信号は見た目をトーンダウンしてインラインコードで示す（説明の場面で裸の警告色を並べない＝INV32）。実際に該当 packet がある実害の場面では INV31 どおり裸の絵文字でフル表示する。

| 信号 | 一行説明 |
|------|----------|
| `✅` 反映済 | 実装完了し intent へ書き戻し済み（`state: done` かつ対応 delta が promoted/closed） |
| `🔵` 今ここ | いま手をつけている1工程（export 済み・未反映のうち現行 Source Packet＝export-log 最新行） |
| `🔴` 反映漏れ | 実装の証跡があるのに未反映（export 済み・未反映のうち現行 Source Packet 以外＝過去の取り残し） |
| `⚪` 未着手 | まだ cc-sdd へ export していない（export-log に行が無い） |
| `◻` 統合済 | 後継 packet に統合され役目を終えた（`superseded_by` が非空） |

**置換軸**

| 術語 | 一行説明 |
|------|----------|
| superseded_by | この packet を置き換えた後継 packet の ID（state ではなく置換を表す別軸） |

**enforcement / staleness**

| 術語 | 一行説明 |
|------|----------|
| enforcement | 書き戻し漏れの強制度（off=検査しない / remind=警告のみ / gate=export・push を停止） |
| stale（staleness） | 書き戻しが古い（実装が進んだのに intent へ反映されていない状態） |
| conformance 陳腐化 | compass（Invariants/Decision Rules）が更新されたのに packet がまだ追随していない状態（status は頃合いを概算し、確定診断は `/intent-validate` が行う） |

**drift-watch**

| 術語 | 一行説明 |
|------|----------|
| drift-watch | 意図からのズレ（drift）の監視（off=何もしない / on=照合警告と記録。いずれも警告のみで停止しない） |

**drift 集計の4語**（`caught` / `missed` / `false-positive` は **outcome**、`unjudged` は **user-verdict** の値。種別を取り違えない）

| 術語 | 種別 | 一行説明 |
|------|------|----------|
| caught | outcome | export 時にズレを捕捉できた（捕捉成功） |
| missed | outcome | ズレを防げず通してしまった |
| false-positive | outcome | 誤検知だった |
| unjudged | user-verdict | まだ人がそのズレの妥当性を判定していない（outcome ではなく user-verdict の値） |

## Output Description

**読み手**: 「いま自分がどこにいて、次に何をすればいいか」を最短で知りたい人間開発者。
**この出力で最初に掴ませること**: 既定をスリム化し、①工程レールで「どの packet が 🔵 今ここ・この後どの工程が残るか」、続けて②「次の一手ちょうど1つ（要約1行・折りたたまず常に強調）」、③ Candidate Packets（packet 化されていない候補の件数＋名前）、④ Ice box 案内1行。危険な知らせ（鮮度警告・整合違反・反映漏れ 🔴）は既定にフル保持する。内部用語（突合・整合検査・enforcement）・検査詳細・術語の毎回併記はそのあとの ⑤ 詳細（折りたたみ位置）に退避する。出力は Step 5 の3層（既定 ①〜④＋⊕危険な知らせ → ⑤詳細 → ⑥Open Questions → ⑦Ice box 展開はトリガ時のみ）で構成する。

- ① **工程レール**（既定・結論）: 全 packet を縦に並べ、各行に5信号 + `[現在の工程 → 次に通る工程]` を併記（残工程 `⚪` と反映漏れ `🔴` を一望。実際に該当 packet がある行では裸の絵文字で表示）
- ② **次の一手ちょうど1つ**（既定・要約1行を折りたたまず常に強調・推奨理由/判断根拠付き。見せ方だけ変え first-match 選定ロジックは不変）
- ③ **Candidate Packets**（既定・件数＋名前。L4 未消化候補を read-only で・凍結マーク付きは除外・断定しない）
- ④ **Ice box 案内**（既定・1行「凍結中（Ice box）: N 件。『icebox も見せて』で表示できます」。0 件なら省略）
- ⊕ **危険な知らせ**（既定にフル保持・折りたたまない）: 鮮度警告（enforcement 違反検出時は intent-check の stdout を引用）・packets 整合違反（index ↔ active/ の乖離・done / superseded_by 滞留・export-log 最新行 packet の active/ 不在）・反映漏れ 🔴
- ⑤ **詳細**（折りたたみ位置）: 現在地の要約（成果物ごとの存在と記入状態 + 特記事項。現行 Source Packet と当該 packet ディレクトリの有無を含む）。⊕ で出した危険な知らせの「⚠ N 件あり（詳細参照）」サマリ1行をここにも残す。drift-watch が `on` のときは drift-log の軽い集計 `caught N / missed N / false-positive N / unjudged N` の1ブロックを併記し、`on` でないときは併記しない。conformance 陳腐化の頃合い（Step 3.6）を検出したときは未追随の根拠を1ブロック併記し、閾値未満のときは併記しない。index 不在時の再生成案内も詳細に置く。
- ⑥ 人間が確認すべき Open Questions
- ⑦ **Ice box 展開**（オプション・自然言語トリガ時のみ）: 凍結候補を件数＋名前＋凍結理由の短い添えで展開

## Safety & Fallback
- **read-only 宣言**: ファイルの作成・変更・削除を一切行わない（frontmatter に Write を持たない。Bash は読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動に限り、この性質を変えない）。drift-log の読み取りは Read / Grep のみで行い（Bash 起動の対象を広げない・drift-log に書き込まない）、この read-only 性質を変えない。
- `.intent/` 不在時はセットアップ手順を案内して終了する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- enforcement が `off`・未記載・不正値のときは intent-check を実行せず鮮度警告も出さない（現行動作）。`remind`・`gate` でも intent-check が実行不可（Bash 不可・スクリプト不在・exit 2）のときは鮮度検査を省略して続行する。
- drift-watch が `on` でないとき（`off`・未記載・不正値・セクション不在・mode.md 不在）は drift 併記を行わず、現行動作とバイト等価のまま続行する。`on` でも `.intent/drift-log.md` が不在のときは drift ブロックを省略する（エラーにしない）。
- `.intent/export-log.md` が不在または最新行が解釈不能のときは、下書きの `## Source Packet` 見出し → index.md / packet ファイルとのテキスト照合の順にフォールバックし（テキスト照合は候補提示にとどめ断定しない）、フォールバックした事実を報告に含める。
- `.kiro/specs/` が無い環境でも動作する（該当行は `rules/decision-table.md` の条件文言付き推奨に従う）。
