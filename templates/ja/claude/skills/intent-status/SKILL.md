---
name: intent-status
description: .intent/ の現状を読み取り、現在地の要約と「次の一手」をちょうど1つ推奨する読み取り専用の案内スキル。ファイルの作成・変更・削除は一切しない。
allowed-tools: Read, Glob, Grep, Bash
argument-hint: なし
---

# intent-status Skill

## Core Mission

> **照合検査の共通温度（このセクションで一度だけ定義し、各検査で「共通温度」と参照する）**: 孤児 spec / intent-tree 起票漏れ / Candidate / conformance の各照合は、**ファイルから機械観測できる範囲（Read/Glob/Grep のみ。git 履歴・コード差分は見ない）**で行い、**断定せず候補提示にとどめる**。照合不能は常態として**誤検知を許容**し、**次の一手の first-match は奪わない**。対象ファイル不在時はその検査を省略する（エラーにしない）。

- **Success Criteria**（達成されていれば成功。検査手順の詳細は Execution Steps に一本化し、ここでは成果のみ宣言する）:
  - `.intent/` 配下の成果物（mode・intent-tree・intent-compass・packets index/ファイル群・packet 毎の cc-sdd 下書き・deltas）の存在と記入状態を読み取り、現在地の要約を提示している（read-only。作成・変更・削除を一切しない）
  - packets 整合（index ↔ active/ の乖離・done / superseded_by 滞留・export-log 最新行 packet の active/ 不在（archive 在中））を検査し、違反を現在地サマリで報告している
  - 孤児 spec（Packet 不在）・intent-tree 起票漏れ（discover スキップ）を「共通温度」で詳細に併記し、両者＋writeback 漏れ（下流層）を tree 層 → packet 層 → 下流層の3階層で棲み分け、同一 spec は最上流の1層でのみ提示して二重警告を出さない
  - 報告冒頭に「次に人が決めること」1件と状態の3区分を置き、その直後にミニ工程レール（全 packet を5信号 ✅/🔵/⚪/🔴/◻ ＋ `[現在の工程 → 次に通る工程]` で縦に並べる）を置く。内部用語（突合・整合検査・enforcement）は詳細へ退避している
  - 既定出力を3層（既定＝次に人が決めること1件＋状態の3区分＋工程レール＋Candidate 件数/名前＋Ice box 案内1行／詳細＝折りたたみ位置／オプション＝自然言語トリガ時のみ）にスリム化し、次の一手の要約1行は折りたたまず冒頭に常に強調している
  - 「危険な知らせ」（鮮度警告・packets 整合違反・反映漏れ `🔴`）は実害がある場面では裸の絵文字でフル表示し（折りたたまない）、詳細側にも「`⚠` N 件あり（詳細参照）」のサマリ1行を残す。説明の場面（凡例・0件サマリ等）では裸でなくインラインコード/語句でトーンダウンする（INV32）
  - L4「今後の付加候補」のうち未消化（packet 化も実装もされていない）候補を件数＋名前で既定に常設表示している（凍結マーク付きは除外・「共通温度」）
  - 凍結マーク付き Ice box 候補は既定では案内文1行「凍結中（Ice box）: N 件。『icebox も見せて』で表示できます」のみ併記し、自然言語トリガで件数＋名前＋凍結理由を展開している
  - 「理解地図」「着手前ブリーフ」「理解ギャップ整理」などの自然言語トリガが来た場合、status 自身は read-only を維持しつつ、該当する `/intent-overview` の派生ビュー（`.intent/overview/agent-understanding-map.md` / `active-packet-briefing.md` / `understanding-gaps.md`）を案内している
  - 「次の一手」を `rules/decision-table.md` の first-match でちょうど1つ（discover / compass / packets / export / validate / improve / writeback / 「アクション不要」から）推奨し、推奨理由と判断根拠を併記している。**見せ方だけを変え first-match 選定ロジックは非接触**
  - enforcement が remind / gate のとき intent-check で鮮度検査し、違反検出時は stdout を引用した鮮度警告を併記している（off・未記載・不正値・実行不可では出さない）
  - drift-watch が `on` のとき drift-log を読んで軽い集計（`caught N / missed N / false-positive N / unjudged N`）を併記している（それ以外は併記せず続行・read-only）
  - compass 節更新日（Invariants / Decision Rules）と active packet の `updated_at` を照合し、「compass 更新後に未追随」が閾値以上のとき `/intent-validate` を頃合いとして推奨している（決定表 row 12・概算のみ・「共通温度」）
  - 並行実装の割当（`.intent/assignments/`）があるとき、割当済み packet・同一 packet への二重宣言 warn・放置宣言の経過観測を read-only で併記している（Step 3.8・宣言ゼロでは併記せず現行どおり・warn-only・機械閾値なし・「共通温度」）
  - 出力中の主要術語に一行説明を `術語（説明）` で併記している（冒頭＝初出・表見出しのみ／詳細＝毎回の2層。用語説明一覧は維持し全廃しない）

## Execution Steps

### Step 1: `.intent/` の存在を確認する
- `.intent/` が存在しなければ、セットアップ手順（`npx intent-planner` の実行）を案内して終了する。
- 引き継がれた発行ディレクトリの `discovery/<スラッグ>-<rand>/mode.md`（A34・discover が出力した発行名を引き継ぐ）→ 無ければ単一 `.intent/mode.local.md`（legacy）→ 無ければ旧 `.intent/mode.md` の順で mode 状態を読む（CONTRACT.md の read fallback 規約）。どちらにも無ければ standard 既定で続行し、Open Questions に「モード未確定・`/intent-discover` 推奨」を併記する（停止しない）。Enforcement / Drift-watch は `.intent/mode.md` を読む。

### Step 2: 成果物を読み取る
- 利用者成果の確定表示では、Intent Tree の対象 L1 にある人が承認済みの `成果についての学び:` だけを唯一の読み元にする。pending の delta は確定結果に使わない。
- `.intent/intent-tree.md` / `.intent/intent-compass.md` / `.intent/packets/index.md` と対象 packet ファイル（`.intent/packets/active/` 配下。通常の処理ではこの2種のみを読み、全 packet ファイルの本文丸読みをしない）/ `.intent/cc-sdd/<スラッグ>/*.md`（packet 毎ディレクトリの下書き群）/ `deltas`（分割形 `.intent/deltas/*.md` 群があれば正本・無ければ旧 `.intent/deltas.md` ミラー。`rules/decision-table.md` 脚注10の分割形横断読み）を読み、それぞれの 有/無/未記入 と特記事項（未解決 Question、Status: pending の delta、「保留」タグ付き見送り項目など）を把握する。分割収納 `.intent/compass/` が在れば `index.md`（1記号=1行の派生）を記号の見取りとして読んでよい（無ければ従来どおり・DR133）。intent-tree の案件記録（機能追記/機能撤去/履歴/再起案）は分割収納 `.intent/tree/` に在れば `index.md`（1案件=1行の派生）を見取りに読んでよい（無ければ従来どおり本体末尾・DR133。骨格 L0–L4 は本体を読む・tree-normalize）。
- packets 整合検査: `.intent/packets/index.md` と `.intent/packets/active/` 配下の実体を突合し（実体側は各ファイルの frontmatter のみを読む）、乖離 — index に無い packet・実体の無い行・name / state / summary の不一致 — を整合違反として把握する。あわせて active/ 配下に `state: done` または `superseded_by` 記入済みの packet ファイルが滞留していれば、その滞留も整合違反として把握する（報告のみ。自動修復はしない）。
- index.md が不在の場合は、`active/` 配下の frontmatter から直接一覧を構成して処理を継続し、Step 5 で index の再生成（canonical を変更する skill の実行）を促す。
- 現行 Source Packet（最新 export）の特定は export-log（分割形 `.intent/export-log/*.md` 群があれば正本・`exported_at` 昇順／無ければ旧 `.intent/export-log.md` ミラー。`rules/decision-table.md` 脚注10の分割形横断読み）の最新行（末尾のデータ行）の packet 名を正とする。解決順序: ①利用者の明示指定 → ②export-log 最新行（正典） → ③下書きの `## Source Packet` 見出し（packet ディレクトリが1つのみの場合に限り採用。複数ある場合は各ディレクトリの見出しを候補として列挙し断定しない） → ④下書き本文と index.md / packet ファイルのテキスト照合（自然言語の候補提示にとどめ、断定しない）。export-log が不在または最新行が解釈不能で③以降へフォールバックした場合は、その事実を Step 5 の報告に含める。現行 Source Packet（export-log 最新行の packet）が `active/` に不在（archive 在中）の場合も、その事実を Step 5 の報告に含める。
- 現行 packet のディレクトリ（`.intent/cc-sdd/<スラッグ>/`）の有無を確認する。packet 名とディレクトリの同定は「ディレクトリ内 requirements.md の `## Source Packet` 見出しが packet 名と一致すること」を正とする（slug 再計算は探索の高速路にとどめ、見出し不一致なら同定しない）。
- `.kiro/specs/` は存在する場合のみ読み、各 spec の spec.json と tasks.md のチェック状況を文脈に使う。対応 spec の特定は spec ディレクトリ名および各 spec の requirements.md「Project Description (Input)」本文と Source Packet 名のテキスト照合による（照合規則の詳細は `rules/decision-table.md` の脚注に従う）。
- 孤児 spec 検査（起草スキップの検出）: `.kiro/specs/` が存在する場合に限り、各 spec が「進行/完了している」（spec.json が requirements 以降のフェーズ・または tasks.md に1つ以上チェック済みタスクがある）にもかかわらず、`active/` / `archive/` のどの packet・`deltas`（分割形 `.intent/deltas/*.md` 群があれば正本・無ければ旧 `.intent/deltas.md` ミラー。`rules/decision-table.md` 脚注10の分割形横断読み）のどの delta ともテキスト照合できない spec を「孤児 spec（Packet を経ずに実装された疑い＝起草フェーズのスキップ）」として把握し、Step 5 ③ 詳細に併記する。照合手段は既存の対応 spec 特定と同じ（spec ディレクトリ名・requirements.md「Project Description (Input)」本文と packet 名・spec_refs のテキスト照合。規則は `rules/decision-table.md` 脚注に従う）。検査の温度は Core Mission の「共通温度」に従う。
- intent-tree 起票漏れ検査（discover スキップの検出）: `.kiro/specs/` と `.intent/intent-tree.md` がともに存在する場合に限り、各 spec が「設計/実装が進んでいる」（同上の基準）にもかかわらず、`.intent/intent-tree.md` の **L0〜L4 の見出し・本文**（L0 Product Purpose / L1 Desired Outcomes / L2 Capabilities / L3 Behavioral・Architectural Intents / L4 Candidate Packets。現行記法はこの **L0〜L4 のレベル記号**であり、`O#`/`C#`/`B#`/`P#` のような **ID アンカーは存在しないのでテキスト照合のみで行う**）のどれともテキスト照合できない spec を「intent-tree に起票されていない実装の可能性（discover スキップ＝起票フェーズそのもののスキップ）」として把握し、Step 5 ③ 詳細に併記する。照合手段は既存の対応 spec 特定と同じ（spec ディレクトリ名・requirements.md「Project Description (Input)」本文と intent-tree の L0〜L4 見出し・本文のテキスト照合。規則は `rules/decision-table.md` 脚注に従う）。これは孤児 spec 検査（Packet 不在）よりさらに**上流**の起票漏れであり、両検査の階層は分けて扱う（後述の3階層棲み分け）。検査の温度は Core Mission の「共通温度」に従う。
- 起票漏れ／孤児 spec／writeback 漏れの3階層棲み分け: 同一 spec が複数層に該当しうるため、上流から **①intent-tree 起票漏れ（discover スキップ＝tree 層）→ ②孤児 spec＝Packet 不在（packet 層）→ ③writeback 漏れ（enforcement／鮮度。下流層）** の順で位置づけ、該当した spec は**最上流の1層でのみ提示**して二重警告を出さない（上流が該当する spec を下流層でも重ねて警告しない）。提示時は `discover → packets → writeback` の段階対処として案内する（詳細は `rules/decision-table.md` 脚注に従う）。

### Step 3: 鮮度を検査する（enforcement 連動）
- Step 1 で読んだ `.intent/mode.md` の `## Enforcement（ユーザー管理）` セクションにある `enforcement` の値を確認する。`off`・未記載・不正値のときは本 Step を行わない（intent-check を実行せず、鮮度警告も出さない。現行動作の維持）。
- `remind` または `gate` のときは、Bash で `node .intent/scripts/intent-check.mjs` を実行する。実行不可（Bash が使えない・スクリプト不在・exit 2）の場合は本 Step を省略し、既存挙動で続行する。
- 判定は stdout 1行目の判定行 `intent-check: result=<ok|stale|not-applicable> enforcement=<off|remind|gate> commits=<N|-> threshold=<M> grace=<in-implementation|-> pending=<K> block=<yes|no>` をそのまま信頼し、再導出しない。`result=stale` または `pending` が 1 以上のとき違反として扱う。
- 違反を検出した場合は、Step 5 の現在地サマリに intent-check の stdout（判定行 + 人間可読の根拠行）を引用した鮮度警告を併記する。intent-check は読み取り専用スクリプト（ファイルの作成・変更・削除を行わない）であり、本スキルの read-only 性質は維持される。

### Step 3.5: drift 併記（drift-watch 連動）
- Step 1 で読んだ `.intent/mode.md` の `## Drift-watch（ユーザー管理）` セクションにある `drift-watch` の値を確認する。`on` でないとき（`off`・未記載・不正値・セクション不在・mode.md 不在）は本 Step を行わない（drift 併記をせず、現行どおり続行する。現行動作の維持）。
- `on` のときは drift-log を **Read / Grep で読むのみ**（Write しない。Bash は既存の intent-check 起動に限る原則を変えない）で集計する。読み先は分割形横断読み: 分割形 `.intent/drift-log/*.md` 群（あれば正本・`archive/` は数えない）→ 無ければ旧 `.intent/drift-log.md` への read fallback（共存時は分割形を正本とし、同一エントリを二重に数えない）。各エントリの `outcome` と `user-verdict` を集計する。`caught` / `missed` / `false-positive` は `outcome` の値から、`unjudged` は `user-verdict=unjudged` の件数から数える。
- 集計結果は鮮度警告と同じ位置・温度感で、Step 5 の現在地サマリに `caught N / missed N / false-positive N / unjudged N` の1ブロックとして軽く併記する（情報過多にしない）。決定表 row 13（未判定 drift の蓄積）が該当したときは、このブロックに pattern 内訳（型ごとの件数）を添えて次の一手の根拠にする（提示は決定表の結果どおり・断定を避けた温度・`/intent-improve` を自動実行しない）。分割形・旧単一ファイルのいずれも不在のときはこのブロックを省略する（エラーにしない）。
- drift-log は読むのみで書き込まない（read-only 維持）。`missed=0` は「効いた」ではなく「記録漏れの疑い」として、断定せず提示する。

### Step 3.6: conformance 陳腐化の頃合いを概算する（read-only）
- 目的: compass（Invariants / Decision Rules）が更新されたのに packet がまだ追随していない「頃合い」を概算し、決定表 row 12 で `/intent-validate` を推す材料にする。確定診断（要修正/推奨）は validate の `invariant-stale-vs-compass` 等が行い、status は概算にとどめる。
- 取得は **Read / Glob / Grep のみ**で行う（Bash＝intent-check は使わない。drift-log と同じく read-only の範囲を広げない）:
  - `.intent/intent-compass.md` の `Updated (Invariants):` / `Updated (Decision Rules):` 行の ISO 8601 値を読む（`—` は未打刻）。
  - `.intent/packets/active/` 各 packet の frontmatter `updated_at` を読む（`archive/` は対象外）。
- 判定: いずれかの compass 節更新日 > その packet の `updated_at` を満たす active packet を「compass 更新後に未追随」として数える。比較は ISO 8601 文字列の辞書順。両端が実打刻のペアのみ対象とし、`updated_at` 不在の packet は対象外（推測で埋めない＝後方互換規律）。compass 節更新日が両方 `—` のときは本 Step を行わない（頃合いを出さない）。
- 未追随件数が閾値（既定 1 件、決定表 row 12 に明示）以上のとき、Step 5 ③ 詳細に「どの compass 節が更新後・未追随 packet が何件か」を根拠として併記する。閾値未満のときは併記しない（狼少年化の回避）。本 Step は何も書き込まない（read-only 維持）。
### Step 3.8: 並行実装の割当を併記する（assignments・read-only）
- 目的: 複数エージェント/セッションで並行実装するとき、`.intent/assignments/*.md`（割当宣言＝「この packet を誰が実装中か」・1宣言=1ファイル・読み手契約は CONTRACT.md「スキル間の状態共有」が正）を read-only で読み、①割当済み packet ②同一 packet への二重宣言（二重着手）③放置宣言 を現在地サマリへ併記する。宣言の作成・削除はしない（read-only 維持）。
- 取得・比較は **Read / Glob / Grep のみ**で行う（Bash＝intent-check は使わない。read-only の範囲を広げない）:
  - `.intent/assignments/*.md`（`README.md` を除く）の各宣言ファイルから frontmatter の `packet_id` / `declared_at` / `session` を読む。
  - 宣言ファイル名のパターン `<packet_id>-<session-rand>.md` の `<packet_id>` 部と frontmatter の `packet_id` を突き合わせる（意味判断不要の単純なファイル名照合）。
- 判定: ①**割当済み**＝宣言ファイルの `packet_id` に対応する active packet を「実装中（宣言あり）」とする（`state` は書き換えない・読み替えない＝別レイヤ）。②**二重宣言（warn）**＝同一 `packet_id` を持つ宣言ファイルが**2つ以上**あれば、二重着手として名指しする（**警告のみ・次の一手の決定表結果を変えない・止めない**）。③**放置宣言**＝宣言だけ残って進行が止まった packet は「宣言日（`declared_at`）からの経過」を観測として示すに留める（**経過日数などの機械閾値で自動判定・自動解放しない**＝INV2/INV66）。④**起草中の宣言**（`phase: drafting`・`packet_id` は空で `issue_dir` が鍵・DR164）＝「この発行はまだ起草中（packet 未起票）」として、③と**同じ扱い**で宣言日からの経過を観測として示す。packets 工程に到達せずに終わった起草（やめた起草）もここに現れるが、**掃除機構・期限・自動アーカイブを持たず**、消すかは人が決める（削除の契機は packets 工程の完了処理にあり、そこで当該セッションが消す）。
- 割当宣言（`.intent/assignments/` 不在または `README.md` 以外の宣言ファイルが1件も無い）のときは本 Step を行わない（検査をスキップして続行・エラーにしない＝後方互換・宣言ゼロで現行どおり）。検出した割当・二重宣言・放置宣言は Step 5 ③ 詳細に併記する（断定せず候補提示・warn-only）。本 Step は何も書き込まない（read-only 維持）。

### Step 4: 決定表で次の一手を1つに決める
- `rules/decision-table.md` を読み、first-match（上から評価し、最初に該当した行のみ）で「次の一手」をちょうど1つ決定する。
- 複数候補の併記はしない（理由と根拠は併記する）。推奨が複数見える曖昧なケースも、決定表の優先順位で機械的に1つへ畳む。

### Step 5: 報告する
報告は**読み手が「いまどこで、次に何をするか」に最短で辿り着ける順序**で構成し、既定出力をスリム化する。出力は **既定（折りたたまない）／詳細（折りたたみ位置）／オプション（自然言語トリガ時のみ）** の3層で構成する。既定には要点（①〜④）と「危険な知らせ」だけを置き、内部用語（突合手順・整合検査・enforcement 用語など）や検査の詳細は ⑤ 詳細へ退避する。**出力先はターミナルである。本 SKILL で言う「折りたたみ位置」は、詳細を既定の後ろへ退避させて読み飛ばし可能にするための"位置"の概念であり、レンダラ依存の折りたたみ UI ではない。出力には raw HTML（`<details>` / `<summary>` 等）を一切使わず、⑤ 詳細・⑥ Open Questions は素の Markdown 見出し（例: `## ⑤ 詳細`・`## ⑥ Open Questions`）で区切って退避する（ターミナルでは生タグがそのまま表示され読めなくなるため）。**

**【既定】折りたたまない要点**

- **次に人が決めること（先頭・ちょうど1つ）**: 下記②の「次の一手」をこの見出しで出力の先頭に置く。決定表の first-match で選んだ1件だけを示し、警告や候補から別の一手を増やさない。
- **状態の3区分**: 次の判断に続けて、**工程の状態**（packet state・工程レール・危険な知らせ）、**未決の設計判断**（明示された Open Questions / 判断候補。無ければ「なし」、根拠不足なら「未観測」）、**利用者成果**を別々に示す。利用者成果は、対象 L1 に現在結果があれば `価値が出た | 価値が出なかった | まだ分からない` の結果と要約を示す。現在結果がなければ、`成果の物さし:` があるときは `リリース後の結果待ち`、どちらもなければ `物さしなし（未観測）` と示す。pending の delta は確定結果に使わない。結果待ちと現在結果を同時に表示しない。工程が順調でも利用者成果を成功と推測せず、3区分を**総合PASS**・総合スコア・「すべて正常」に畳まない。詳細は⑤へ退避してよいが、この区分自体は既定から外さない。

- ① **工程レール（冒頭ミニレール）**: 全 packet を縦に並べ、各 packet に5信号（✅ 反映済 / 🔵 今ここ / ⚪ 未着手 / 🔴 反映漏れ / ◻ 統合済）のいずれか1つを付け、**続けて `[現在の工程 → 次に通る工程]` を併記する**。信号の判定も工程併記も overview の `progress-readout.md`「工程レール」と同じ規律（5信号は `state` × export-log の行有無 × deltas の対応エントリ有無を first-match で突合、工程併記は packet `state` を固定パイプライン `discover→compass→packets→export→実装→verify→writeback` 上の位置として読み替え。いずれも算出・推論しない）に従う。例: `P2  🔵 今ここ [implementing → 次: verify→writeback]` / `P3  ⚪ 未着手 [ready → 次: export→実装]`。これにより**「P いくつが今ここで・この後どの工程が残り・どこに ⚪ 残工程 / 🔴 反映漏れがあるか」を1枚で一望**させる。各信号は用語一覧に従い意味を併記する。レールは read-only mirror であり、status は何も変更しない。
- ② **次の一手（ちょうど1つ・1行・常に強調）**: スキル名 or「アクション不要」を**要約1行で**冒頭の目立つ位置に示す（既定をスリム化しても**この1行は折りたたまず常に出す**）。続けて推奨理由 + 判断根拠（どの成果物のどの状態に基づくか）を簡潔に添える。決定表（`rules/decision-table.md`）の first-match 結果を、内部の行番号でなく**人間が次に取る行動**として翻訳して提示する（**見せ方を変えるだけで、どの一手を推すかの first-match 選定ロジックは変えない**）。
- ③ **Candidate Packets（packet 化されていない候補プール）**: `.intent/intent-tree.md` の L4「今後の付加候補」を **Read / Glob / Grep のみ**で読み、`.intent/packets/archive/` と `.kiro/specs/` を Step 2 の孤児 spec / 起票漏れ検査と同じテキスト照合手段で突合して、**未消化（packet 化も実装もされていない）候補**に絞り、**件数＋名前**の箇条書きで既定に出す。照合不能は常態として誤検知を許容し、断定せず候補提示にとどめる。**凍結マーク付きの候補（後述 Ice box）は件数＋名前から除外する**。L4／archive／`.kiro/specs/` が不在なら 0 件として扱い、エラーにしない。
- ④ **Ice box 案内（凍結候補の存在告知・1行）**: 凍結マーク（`Deferred` / `保留` / `当面しない` / 条件付き保留 等）を **Read / Grep のみ**でテキスト照合した凍結候補は、**既定では本体を出さず**、案内文1行 **「凍結中（Ice box）: N 件。『icebox も見せて』で表示できます」** を既定に常時併記する（0 件なら案内も省いて冒頭をさらに軽くする）。境界が曖昧な候補（マーク無しだが実質塩漬け）は凍結とみなさず ③ Candidate 側に出す（断定しない）。
- ⊕ **危険な知らせ（既定に必ずフル表示・折りたたまない）**: **鮮度警告（Step 3）・packets 整合違反（index ↔ active/ の乖離・done / superseded_by 滞留・export-log 最新行 packet の active/ 不在）・反映漏れ 🔴** の3種は見落とすと危険なため、**既定にフル表示したまま保持し、⑤ 詳細へ折りたたまない**。enforcement / drift-watch が off・未記載のときは現行どおり鮮度警告を出さない（既存挙動を変えない）。**警告信号の見た目の出し分け（INV32）**: ここ（実害がある場面）では `🔴` 等を**裸の絵文字で目立たせる**が、凡例・用語説明・0件サマリ・空レール等の**説明の場面では裸で出さずインラインコード（`🔴`）/語句（「反映漏れ」）でトーンダウン**する。0件のときは「反映漏れなし」を語句で示し、裸の警告絵文字を出さない（警告の語義は保つ）。

**【詳細】折りたたみ位置へ退避**

- ⑤ **詳細（折りたたみ位置）**: ① の各信号の根拠となった成果物ごとの 有/無/未記入 と特記事項、現行 Source Packet（export-log 最新行に基づく packet 名）と当該 packet のディレクトリ（`.intent/cc-sdd/<スラッグ>/`）の有無。⊕ で既定に出した危険な知らせは、ここにも **「⚠ N 件あり（詳細参照）」のサマリ1行**を残して詳細本体と接続する（既定からは消さない）。index 不在の場合は再生成の案内を、Step 3.5 で drift-watch が `on` のときは drift-log の軽い集計（`caught N / missed N / false-positive N / unjudged N`。決定表 row 13 該当時は pattern 内訳も添える）を、Step 3.6 で conformance 陳腐化の頃合い（未追随件数が閾値以上）を検出した場合は「どの compass 節が更新後・未追随 packet が何件か」の根拠を、ここに1ブロック併記する。Step 2 で intent-tree 起票漏れ（discover スキップの疑い）を検出した場合は、その spec 名と「設計/実装が進んでいますが、`.intent/intent-tree.md` の L0〜L4 のどのノードともテキスト照合できませんでした。discover フェーズそのものをスキップした疑いがあります。`/intent-discover` で intent-tree（L0〜L4）へ起票し、その後 `/intent-packets` で Packet を起こし、`/intent-writeback` で実装の現実を canonical へ戻すのが順序です」という案内を、断定を避けた候補提示の温度で1ブロック併記する（次の一手の決定表結果は変えない）。Step 2 で孤児 spec（起草されていない実装の疑い）を検出した場合は、その spec 名と「Packet を経ずに実装された疑いがあります。事後でも `/intent-packets` で Packet を起こし（未確定の仕様は Open Questions / Deferred として明示）、その後 `/intent-writeback` で実装の現実を canonical へ戻すのが順序です」という案内を、断定を避けた候補提示の温度で1ブロック併記する（次の一手の決定表結果は変えない）。**この2検査と writeback 漏れ（鮮度警告）は上流から tree 層 → packet 層 → 下流層の3階層で棲み分け、同一 spec が複数層に該当する場合は最上流の1層でのみ提示して二重警告を出さない**（上流が該当する spec を下流の孤児 spec／鮮度警告で重ねて出さず、`discover → packets → writeback` の段階対処として案内する）。Step 3.8 で並行実装の割当（`.intent/assignments/`）を読んだ場合は、①割当済み packet（実装中・宣言あり）②同一 packet への二重宣言（二重着手の warn・名指し）③放置宣言（宣言日からの経過の観測）を、drift 併記と同じ位置・温度感で（断定を避けた候補提示の温度・warn-only で）1ブロック併記する（次の一手の決定表結果は変えない）。割当宣言が1件も無いときはこのブロックを出さない（宣言ゼロで現行どおり）。
- ⑥ Open Questions: ユーザー確認が必要な点。確認は自然言語での候補提示にとどめ、次のアクションの判断はユーザーに委ねる（一方向報告）。

**【オプション】自然言語トリガ時のみ**

- ⑦ **Ice box 展開**: 利用者が自然言語トリガ（「icebox も見せて」等）で要求したときのみ、④ の凍結候補を **件数＋名前＋凍結理由の短い添え**で展開する。展開も Read / Grep のみの read-only で、status は何も変更しない。
- ⑧ **理解支援ビューの案内**: 利用者が自然言語トリガ（「理解地図を見せて」「着手前ブリーフがほしい」「理解ギャップを整理して」等）で要求したときのみ、status はファイルを書かず、`/intent-overview` で生成できる対応派生ビューを案内する。案内は「理解地図 → `.intent/overview/agent-understanding-map.md`」「着手前ブリーフ → `.intent/overview/active-packet-briefing.md`」「理解ギャップ整理 → `.intent/overview/understanding-gaps.md`」の対応を明示する。既に該当ファイルが存在する場合でも、status は更新せず、必要なら `/intent-overview` で再生成する旨を示す。

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

**assignments（並行実装の割当）**

| 術語 | 一行説明 |
|------|----------|
| 割当宣言（assignment） | 「この packet を誰（どのセッション）が実装中か」の宣言（`.intent/assignments/<packet_id>-<session-rand>.md`・1宣言=1ファイル・packet の state とは別レイヤ） |
| 二重宣言（二重着手） | 同一 packet に2つ以上の割当宣言がある状態（複数セッションが同じ packet を同時に触っている・warn のみで止めない） |

**drift 集計の4語**（`caught` / `missed` / `false-positive` は **outcome**、`unjudged` は **user-verdict** の値。種別を取り違えない）

| 術語 | 種別 | 一行説明 |
|------|------|----------|
| caught | outcome | export 時にズレを捕捉できた（捕捉成功） |
| missed | outcome | ズレを防げず通してしまった |
| false-positive | outcome | 誤検知だった |
| unjudged | user-verdict | まだ人がそのズレの妥当性を判定していない（outcome ではなく user-verdict の値） |

## Output Description

**読み手**: 「いま自分がどこにいて、次に何をすればいいか」を最短で知りたい人間開発者。
**この出力で最初に掴ませること**: 「次に人が決めること」ちょうど1つ→工程の状態・未決の設計判断・利用者成果の3区分→①工程レール→③ Candidate Packets→④ Ice box 案内の順。危険な知らせは既定にフル保持し、内部用語・検査詳細は⑤詳細へ退避する。

出力の構成・各層の中身・退避規律は **Step 5「報告する」を正本とする**（ここでは重複再掲しない）。骨子のみ: 既定（次に人が決めること1件 ／ 状態の3区分 ／ ① 工程レール ／ ③ Candidate ／ ④ Ice box 案内 ／ ⊕ 危険な知らせ）→ ⑤ 詳細（折りたたみ位置）→ ⑥ Open Questions → ⑦ Ice box 展開（自然言語トリガ時のみ）→ ⑧ 理解支援ビューの案内（自然言語トリガ時のみ）。

## Safety & Fallback
- **read-only 宣言**: ファイルの作成・変更・削除を一切行わない（frontmatter に Write を持たない。Bash は読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動に限り、この性質を変えない）。drift-log の読み取りは Read / Grep のみで行い（Bash 起動の対象を広げない・drift-log に書き込まない）、この read-only 性質を変えない。
- `.intent/` 不在時はセットアップ手順を案内して終了する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- enforcement が `off`・未記載・不正値のときは intent-check を実行せず鮮度警告も出さない（現行動作）。`remind`・`gate` でも intent-check が実行不可（Bash 不可・スクリプト不在・exit 2）のときは鮮度検査を省略して続行する。
- drift-watch が `on` でないとき（`off`・未記載・不正値・セクション不在・mode.md 不在）は drift 併記を行わず、現行動作とバイト等価のまま続行する。`on` でも drift-log が不在（分割形 `.intent/drift-log/*.md` 群・旧 `.intent/drift-log.md` のいずれも無い）のときは drift ブロックを省略する（エラーにしない）。
- `.intent/export-log.md` が不在または最新行が解釈不能のときは、下書きの `## Source Packet` 見出し → index.md / packet ファイルとのテキスト照合の順にフォールバックし（テキスト照合は候補提示にとどめ断定しない）、フォールバックした事実を報告に含める。
- `.kiro/specs/` が無い環境でも動作する（該当行は `rules/decision-table.md` の条件文言付き推奨に従う）。
