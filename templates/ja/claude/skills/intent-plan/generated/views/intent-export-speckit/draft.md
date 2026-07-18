---
name: intent-export-speckit
description: 選んだ packet 1つを、トークンを浪費せず GitHub Spec Kit へ渡せる specify 投入記述 + spec ヒントに変換する。Spec Kit の本体生成は侵さない。続行指示時に /speckit.specify を起動できる。
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Skill, Bash
argument-hint: <対象 packet 名（任意）>
---

# intent-export-speckit Skill

## Core Mission
- **Success Criteria**:
  - 対象 packet 1つを Spec Kit の specify 投入記述 + spec ヒント（parent intent / Invariant 参照 + constitution 反映は利用者判断の一行案内）に変換している
  - 入力を対象 packet ファイル + compass のプロジェクト普遍 Invariants/Anti-direction に限定し、Tree/Compass 全文を Spec Kit へ転記していない
  - spec ヒントが parent intent / invariant 参照を持ち、impl への伝播構造になっている
  - 出力主役が自然言語案内で、続行指示時に /speckit.specify を起動できる
  - 出力先を `.intent/speckit/` に閉じ、`.intent/cc-sdd/` / `.intent/openspec/` には触れていない
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 対象 packet を1つに絞る
- `.intent/packets/index.md` を読み、active packet の候補を提示する。index.md が不在の場合は `.intent/packets/active/` 配下の frontmatter から直接候補一覧を構成して継続し、index の再生成を促す。`.intent/packets/` 自体が不在（または `active/` が空）なら「先に `/intent-packets` を実行」を案内して停止する。
- 引数で packet が指定されていればそれを、なければ候補から優先順位や利用者確認で1つに絞り、確定した対象 packet のファイル（`.intent/packets/active/` 配下）のみを読む（全 packet ファイルの丸読みをしない）。
- **draft ガード**: 確定した対象 packet の `state` が draft の場合、AskUserQuestion で「active 化して export を続行するか」を確認し、利用者が承認したら frontmatter の `state` を active へ更新して `index.md` を再生成してから続行する（確認なしに draft のまま export しない。export が canonical を書き換えるのはこの active 化に限る）。
- 引き継がれた発行ディレクトリの `discovery/<スラッグ>-<rand>/mode.md`（A34・discover が出力した発行名を引き継ぐ）→ 無ければ単一 `.intent/mode.local.md`（legacy）→ 無ければ旧 `.intent/mode.md` の順で mode 状態を読む（CONTRACT.md の read fallback 規約）。無ければ standard 既定で続行し告知する。

### Step 1.5: enforcement ゲート（writeback 鮮度検査）
- Step 1 で読んだ `.intent/mode.md` の `## Enforcement（ユーザー管理）` セクションから `enforcement` の値を確認する。off・未記載・不正値（mode.md 不在を含む）なら本検査を行わず、現行どおり Step 1.6 へ続行する。
- remind または gate のとき、Bash で `node .intent/scripts/intent-check.mjs` を実行し（読み取り専用スクリプト。ファイルの作成・変更・削除を行わない）、stdout に従う。
- **判定行の解釈規則**: 停止判断は stdout 1行目の判定行の `block=` のみを正とする（再導出・独自解釈をしない）。警告の要否は `result=stale` または `pending>0` で決める。`result=not-applicable` のときも判定行の `pending=` の値をそのまま使う。
- gate かつ `block=yes` のとき: 根拠（pending の packet 名・経過コミット数/閾値。intent-check の2行目以降の人間可読行をそのまま引用する）を提示して export を停止し、`/intent-writeback` の実行を案内する。続けて AskUserQuestion で「それでも export を続行するか」を確認し、利用者が明示的に続行を指示したときのみ、警告を提示したうえで export を実行する（誤検知時の逃げ道）。
- remind かつ違反検出（`result=stale` または `pending>0`）のとき: 同じ根拠を警告として提示し、停止せず続行する。
- intent-check 自体が実行不可（Bash 不可・スクリプト不在・exit 2）のときのみ: staleness を not-applicable として扱い、`.intent/deltas.md` の pending な Delta エントリ（`- Status: pending` を持つもの）を Read/Grep で確認し、その結果を `pending` として上と同じ分岐に入る。

### Step 1.6: drift 照合（drift-watch）
- Step 1 で読んだ `.intent/mode.md` の `## Drift-watch（ユーザー管理）` セクションから `drift-watch` の値を確認する。`on` でないとき（off・未記載・不正値・セクション不在・mode.md 不在を含む）は本照合を行わず、現行どおり Step 1.7 へ続行する（現行動作とバイト等価）。
- `on` のときのみ、`rules/drift-export-check.md` を読み、適用する。対象 packet の specify 投入記述/spec ヒント × compass（North Star / Anti-direction / Invariants）の照合・抵触の名指し提示・drift-log への `stage: export` エントリの append・outcome の利用者判定での確定は、すべて rule の手順に委ねる（ここに手順を複製しない）。
- この照合は **warn のみ・export を停止しない**（停止できるのは Step 1.5 の enforcement ゲートだけ。drift-watch は誤検知前提のため止めない）。
- 3関所の順序と直交: **enforcement（手続き・停止しうる, Step 1.5） → drift-watch（方向・停止しない, Step 1.6） → Open Questions（期限・停止しない, Step 1.7）**。検査対象が直交する（手続き / 方向 / 期限）。

### Step 1.7: 未回答 Open Questions の確認
- `rules/export-questions.md` を読み、適用する。

### Step 1.8: Spec Kit 前提の preflight 照合（warn のみ・停止しない）
- **リポジトリ直下の `.specify/` ディレクトリ**（Spec Kit ツールの目印）の有無を read-only で観測する（Read/Glob。`intent-check.mjs` 等の機械検査に寄せない）。**`.intent/speckit/`（本スキル自身の下書き出力先）とは別物**であり、出力先を前提目印に誤認しない。
- リポジトリ直下 `.specify/` が**不在**のとき: Spec Kit が導入されていない可能性を **warn** する。「Spec Kit 前提（リポジトリ直下の `.specify/`）が見当たらない。Spec Kit を導入するか、読める成果物が目的なら format 軸の射影（読める Spec への出口）も選べる」と案内する（出口の選び方は `rules/export-route.md` の出口判定レーンに従う。本 SKILL から他 export/射影スキルのコマンド名は名指ししない）。**下書き生成は止めない**（Step 2 以降へ続行する）。
- リポジトリ直下 `.specify/` が**存在**するとき: 何も出さず Step 2 へ続行する（従来どおり・warn 無し）。
- この照合は **warn のみ・export を停止しない**（停止できるのは Step 1.5 の enforcement ゲートだけ。preflight は drift-watch と同じ誤検知前提で止めない＝`.specify/` を後から入れる経路を潰さない）。Spec Kit の入口契約 `/speckit.specify` は read-only で観測できないため、リポジトリ直下 `.specify/` を導入の代理目印とする。

### Step 2: マッピング規則を適用する
- `rules/map-speckit.md` を読み、適用する。
- 入力は対象 packet ファイル1つ（Safety / Invariants の packet 固有 invariant を含む）+ `.intent/intent-compass.md` のプロジェクト普遍 Invariants/Anti-direction のみ（Tree 全文・他 packet は読まない。方向が要る場合のみ Tree L0–L1 を要約参照）。

### Step 3: 下書きを生成する
- 下書きは packet ごとのディレクトリ `.intent/speckit/<スラッグ>/` 配下に書く。スラッグの導出と衝突時の扱いは `rules/map-speckit.md` の「出力レイアウト」節に従う。多 packet を続けて export しても他 packet のディレクトリを上書きしない。
- `.intent/speckit/<スラッグ>/specify-input.md` に specify 投入記述（機能の自然言語記述）を書く。`/speckit.specify` に投入できる最小かつ常に有効な「機能記述」テキストを冒頭から導出できる形にする。
- `.intent/speckit/<スラッグ>/spec-hints.md` に spec ヒント（parent intent / Invariant 参照 + 「constitution.md への反映は利用者判断」の一行案内 + Spec Kit が生成した spec.md と突き合わせる観点）を書く。
- Spec Kit の本体は完成させない。spec ヒントは突き合わせ観点までに留め、spec.md の完成は Spec Kit 側（`/speckit.specify` 以降）に委ねる（INV4）。specify 投入記述/spec ヒントには parent intent と invariant 参照を必ず残す。
- 下書きの生成を終えたら、export 記録を **packet 単位の分割ファイル** `.intent/export-log/<packet-slug>.md` へ書く（CONTRACT「append-only 記録の分割・archive 規約」に従う。各出口はどれも同じ分割規約で各 packet のファイルへ書くため、旧来の「target 横断で共有する単一ログ」末尾への並行追記衝突は分割で構造的に消える）。`<packet-slug>` は packet 名から既存スラッグ規則（`intent-packets/rules/packet-format.md`）で導出する（新採番・連番を作らない）。ファイルには scaffold と同じテーブルヘッダ（`| packet | exported_at | commit |`）+ `| <packet 名> | <export 日時（ISO 8601 UTC）> | <コミットハッシュ> |` の1行を書く（既存ファイルがあれば行を追記し、過去の行は消さない）。コミットハッシュは Bash で `git rev-parse --short HEAD`（読み取り専用）で取得し、取れない場合は `-`。`.intent/export-log/` ディレクトリが無ければ作る。
- 続けて旧 `.intent/export-log.md` を**生成 active ミラー**として再生成する: `.intent/export-log/*.md` の全データ行を `exported_at` 昇順に連結し、scaffold と同じヘッダ + 全行で上書きする（分割ファイルが正本・ミラーは派生で手編集しない）。これにより単一ファイルを読む既存経路（status / validate / writeback / intent-check）が壊れない。

## Output Description
- 対象 packet の `.intent/speckit/<スラッグ>/{specify-input, spec-hints}.md` の下書き（`/speckit.specify` 投入用の機能記述 + spec ヒント）
- `.intent/export-log.md` への export 記録1行（追記）
- draft を active 化した場合の対象 packet ファイルの `state` 更新と `.intent/packets/index.md` の再生成（該当なしの場合は省略）
- 未回答 `[export まで]` Question の確認結果（提示した問いと利用者判断。該当なしの場合は省略）
- Spec Kit へ渡してよいかの確認（自然言語案内・主）
- `/speckit.specify` 用コピーブロック（フォールバック・従）
- 実装前に確認すべき点
- 実装が一巡したあとの戻り先案内（`/intent-writeback` で canonical へ。packet への Evidence 直書きで済ませない）

### 報告の平易さ点検（利用者向け報告・出力直前・共通）

利用者へ向けた報告（進捗・完了・確認事項の提示。ターン末尾の要約を含む）を出す直前に、次を点検する（INV105・DR208）。対象は利用者向けの報告文だけで、内部の記録（`.intent/` 配下の canonical・ログ）の書き方には適用しない。

- **内部文書の文をそのまま転写しない**: 直前に読んだ・書いた内部成果物（tree・compass・packet・Open Questions）の文面は内部の語彙で書かれている。報告では、その内容を初見の読み手に通じる言葉で言い直す（事実・意味は変えない）。
- **識別子を本文の主語にしない**: 確認事項・作業単位を示すときは、まず「何を・なぜ」が単体で通じる一文を置き、識別子（Open Question 番号・packet 名・記号・工程名）はその後ろに参照として添える（例: 「…を確かめてから始めてください（整理番号: OQ-xxx-1）」）。平易化のために識別子・記録への参照を削らない（記録へ辿れなくなる）。
- **通じるかの合図**: 1文に未説明の内部語が3つ以上並んだら詰め込みすぎの合図（機械カウントではなく意味の読みで）。単体で通じなければ、平易に書き直してから出す（事実・意味は変えない）。
- **比喩・曖昧な言い方だけで意味を渡さない**: 報告の土台は正確さ（意味が一意に読める記述。平易さはそれを保ったまま易しく書く手段）。基準のない程度語（「かなり」「うまく」等）だけで結果を伝えず、観測できる事実で書く。比喩を使うなら直後に正確な言い直しを必ず併記する（確立された専門用語・世間の意味のままの一般語は無理に開かない）。
- この点検は事後の記録と対で働く（予防だけで閉じない）: 報告が通じなかった実例は、drift-watch が on のとき drift-log へ症例として残し、次の予防に使う。

## Safety & Fallback
- `.intent/packets/` が不在（または `active/` が空）なら停止して `/intent-packets` を案内する。
- index.md 不在は停止せず、`active/` 配下から直接候補を構成して継続し、index の再生成を促す。
- canonical への書き込みは draft ガードの active 化（`state` 更新 + `index.md` 再生成）のみで、利用者の承認を得たときに限る。intent-tree / intent-compass / packet 本文は書き換えない。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- enforcement の検査は fail-open: intent-check が実行不可でも export を止めない。停止するのは enforcement が gate で判定行が `block=yes` のとき、または実行不可フォールバックで gate かつ pending を検出したときのみで、いずれの場合も利用者の明示続行で実行できる。
- Open Questions の確認は停止ではなく確認であり、明示続行で export できる。
- Spec Kit の spec / plan の本体を完成させない（下書き・ヒントまで）。
- `/speckit.specify` 以降の Spec Kit ワークフロー（plan / tasks / implement 等）を自動起動しない。
- 出力先は `.intent/speckit/` に閉じ、`.intent/cc-sdd/` / `.intent/openspec/` には書き込まない。リポジトリ直下 `.specify/` / `specs/` / constitution.md にも書き込まない。
- アプリケーションコードは変更しない（INV6。他 skill の起動は INV6 と別概念であり許される）。
