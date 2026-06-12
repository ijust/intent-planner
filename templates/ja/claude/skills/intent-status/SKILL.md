---
name: intent-status
description: .intent/ の現状を読み取り、現在地の要約と「次の一手」をちょうど1つ推奨する読み取り専用の案内スキル。ファイルの作成・変更・削除は一切しない。
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash
argument-hint: なし
---

# intent-status Skill

## Core Mission
- **Success Criteria**:
  - `.intent/` 配下の成果物（mode・intent-tree・intent-compass・packets/ の index と packet ファイル群・packet 毎ディレクトリの cc-sdd 下書き群・deltas）の存在と記入状態を読み取り、現在地の要約を提示している
  - `.intent/packets/index.md` と `active/` 配下の実体の整合（index に無い packet・実体の無い行・name / state / summary の不一致）、active/ 内の done / superseded_by 記入済みファイルの滞留、export-log 最新行の packet の active/ 不在（archive 在中）を検査し、違反を現在地サマリで報告している
  - 「次の一手」を `rules/decision-table.md` の first-match でちょうど1つ推奨し、推奨理由と判断根拠（どの成果物のどの状態に基づくか）を併記している
  - 推奨候補を discover / compass / packets / export / validate / improve / writeback / 「アクション不要」の中から選定している
  - mode.md の enforcement が remind または gate のとき intent-check による鮮度検査を行い、違反（判定行の `result=stale` または `pending` が 1 以上）の検出時は現在地サマリに intent-check の stdout を引用した鮮度警告を併記している（off・未記載・不正値・実行不可のときは現行どおり警告を出さない）
  - ファイルの作成・変更・削除を一切行っていない（read-only）

## Execution Steps

### Step 1: `.intent/` の存在を確認する
- `.intent/` が存在しなければ、セットアップ手順（`npx github:ijust/intent-planner` の実行）を案内して終了する。
- `.intent/mode.md` を読む。無ければ standard 既定で続行し、Open Questions に「モード未確定・`/intent-discover` 推奨」を併記する（停止しない）。

### Step 2: 成果物を読み取る
- `.intent/intent-tree.md` / `.intent/intent-compass.md` / `.intent/packets/index.md` と対象 packet ファイル（`.intent/packets/active/` 配下。通常の処理ではこの2種のみを読み、全 packet ファイルの本文丸読みをしない）/ `.intent/cc-sdd/<スラッグ>/*.md`（packet 毎ディレクトリの下書き群）/ `.intent/deltas.md` を読み、それぞれの 有/無/未記入 と特記事項（未解決 Question、Status: pending の delta、「保留」タグ付き見送り項目など）を把握する。
- packets 整合検査: `.intent/packets/index.md` と `.intent/packets/active/` 配下の実体を突合し（実体側は各ファイルの frontmatter のみを読む）、乖離 — index に無い packet・実体の無い行・name / state / summary の不一致 — を整合違反として把握する。あわせて active/ 配下に `state: done` または `superseded_by` 記入済みの packet ファイルが滞留していれば、その滞留も整合違反として把握する（報告のみ。自動修復はしない）。
- index.md が不在の場合は、`active/` 配下の frontmatter から直接一覧を構成して処理を継続し、Step 5 で index の再生成（canonical を変更する skill の実行）を促す。
- 旧形式の検出（packets）: 旧 `.intent/packets.md` が残存している場合、「次回 `/intent-packets` 実行時に新構造（packets/ 配下）へ自動移行されます」と案内する（残存を健全状態として扱わない）。
- 現行 Source Packet（最新 export）の特定は `.intent/export-log.md` 最新行（末尾のデータ行）の packet 名を正とする。解決順序: ①利用者の明示指定 → ②export-log 最新行（正典） → ③下書きの `## Source Packet` 見出し（packet ディレクトリが1つのみの場合に限り採用。複数ある場合は各ディレクトリの見出しを候補として列挙し断定しない） → ④下書き本文と index.md / packet ファイルのテキスト照合（自然言語の候補提示にとどめ、断定しない）。export-log.md が不在または最新行が解釈不能で③以降へフォールバックした場合は、その事実を Step 5 の報告に含める。現行 Source Packet（export-log 最新行の packet）が `active/` に不在（archive 在中）の場合も、その事実を Step 5 の報告に含める。
- 現行 packet のディレクトリ（`.intent/cc-sdd/<スラッグ>/`）の有無を確認する。packet 名とディレクトリの同定は「ディレクトリ内 requirements.md の `## Source Packet` 見出しが packet 名と一致すること」を正とする（slug 再計算は探索の高速路にとどめ、見出し不一致なら同定しない）。
- 旧形式の検出: `.intent/cc-sdd/` 直下に README.md 以外の `*.md` がある場合、「旧形式の下書きが残存しています。次回 `/intent-export-cc-sdd` 実行時に packet ディレクトリへ自動移行されます」と案内する（README.md と旧ファイルの併存を健全状態として扱わない）。
- `.kiro/specs/` は存在する場合のみ読み、各 spec の spec.json と tasks.md のチェック状況を文脈に使う。対応 spec の特定は spec ディレクトリ名および各 spec の requirements.md「Project Description (Input)」本文と Source Packet 名のテキスト照合による（照合規則の詳細は `rules/decision-table.md` の脚注に従う）。

### Step 3: 鮮度を検査する（enforcement 連動）
- Step 1 で読んだ `.intent/mode.md` の `## Enforcement（ユーザー管理）` セクションにある `enforcement` の値を確認する。`off`・未記載・不正値のときは本 Step を行わない（intent-check を実行せず、鮮度警告も出さない。現行動作の維持）。
- `remind` または `gate` のときは、Bash で `node .intent/scripts/intent-check.mjs` を実行する。実行不可（Bash が使えない・スクリプト不在・exit 2）の場合は本 Step を省略し、既存挙動で続行する。
- 判定は stdout 1行目の判定行 `intent-check: result=<ok|stale|not-applicable> enforcement=<off|remind|gate> commits=<N|-> threshold=<M> grace=<in-implementation|-> pending=<K> block=<yes|no>` をそのまま信頼し、再導出しない。`result=stale` または `pending` が 1 以上のとき違反として扱う。
- 違反を検出した場合は、Step 5 の現在地サマリに intent-check の stdout（判定行 + 人間可読の根拠行）を引用した鮮度警告を併記する。intent-check は読み取り専用スクリプト（ファイルの作成・変更・削除を行わない）であり、本スキルの read-only 性質は維持される。

### Step 4: 決定表で次の一手を1つに決める
- `rules/decision-table.md` を読み、first-match（上から評価し、最初に該当した行のみ）で「次の一手」をちょうど1つ決定する。
- 複数候補の併記はしない（理由と根拠は併記する）。推奨が複数見える曖昧なケースも、決定表の優先順位で機械的に1つへ畳む。

### Step 5: 報告する
- ① 現在地要約: 成果物ごとの 有/無/未記入 と特記事項。現行 Source Packet（export-log 最新行に基づく packet 名）と当該 packet のディレクトリ（`.intent/cc-sdd/<スラッグ>/`）の有無を含める。packets 整合検査の違反（index ↔ active/ の乖離・done / superseded_by の滞留・export-log 最新行の packet の active/ 不在）を検出した場合はその内容を、index 不在の場合は再生成の案内を、旧形式（cc-sdd 直下の下書き・旧 packet 定義ファイルの残存）を検出した場合は移行案内を、Step 3 で違反を検出した場合は intent-check の stdout を引用した鮮度警告を併記する。
- ② 次の一手（ちょうど1つ）: スキル名 or「アクション不要」+ 推奨理由 + 判断根拠（どの成果物のどの状態に基づくか）。
- ③ Open Questions: ユーザー確認が必要な点。確認は自然言語での候補提示にとどめ、次のアクションの判断はユーザーに委ねる（一方向報告）。

## Output Description
- 現在地の要約（成果物ごとの存在と記入状態 + 特記事項。現行 Source Packet と当該 packet ディレクトリの有無を含む。enforcement 違反の検出時は intent-check の stdout を引用した鮮度警告を含む）
- packets 整合検査の結果（index ↔ active/ の乖離・done / superseded_by 滞留・export-log 最新行の packet の active/ 不在の報告。index 不在時の再生成案内・旧 packet 定義ファイル残存時の移行案内を含む）
- 次の一手ちょうど1つ（推奨理由・判断根拠付き）
- 人間が確認すべき Open Questions

## Safety & Fallback
- **read-only 宣言**: ファイルの作成・変更・削除を一切行わない（frontmatter に Write を持たない。Bash は読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動に限り、この性質を変えない）。
- `.intent/` 不在時はセットアップ手順を案内して終了する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- enforcement が `off`・未記載・不正値のときは intent-check を実行せず鮮度警告も出さない（現行動作）。`remind`・`gate` でも intent-check が実行不可（Bash 不可・スクリプト不在・exit 2）のときは鮮度検査を省略して続行する。
- `.intent/export-log.md` が不在または最新行が解釈不能のときは、下書きの `## Source Packet` 見出し → index.md / packet ファイルとのテキスト照合の順にフォールバックし（テキスト照合は候補提示にとどめ断定しない）、フォールバックした事実を報告に含める。
- `.kiro/specs/` が無い環境でも動作する（該当行は `rules/decision-table.md` の条件文言付き推奨に従う）。
