---
name: intent-export-openspec
description: 選んだ packet 1つを、トークンを浪費せず OpenSpec へ渡せる proposal 下書き + delta spec ヒントに変換する。OpenSpec の本体生成は侵さない。続行指示時に /opsx:propose を起動できる。
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Skill, Bash
argument-hint: <対象 packet 名（任意）>
---

# intent-export-openspec Skill

## Core Mission
- **Success Criteria**:
  - 対象 packet 1つを OpenSpec の proposal 下書き（Why/What Changes/Impact）+ delta spec ヒントに変換している
  - 入力を対象 packet ファイル + compass のプロジェクト普遍 Invariants/Anti-direction に限定し、Tree/Compass 全文を OpenSpec へ転記していない
  - delta ヒントが parent intent / invariant 参照を持ち、impl への伝播構造になっている
  - 出力主役が自然言語案内で、続行指示時に /opsx:propose を起動できる
  - 出力先を `.intent/openspec/` に閉じ、`.intent/cc-sdd/` には触れていない
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 対象 packet を1つに絞る
- `.intent/packets/index.md` を読み、active packet の候補を提示する。index.md が不在の場合は `.intent/packets/active/` 配下の frontmatter から直接候補一覧を構成して継続し、index の再生成を促す。`.intent/packets/` 自体が不在（または `active/` が空）なら「先に `/intent-packets` を実行」を案内して停止する。
- 引数で packet が指定されていればそれを、なければ候補から優先順位や利用者確認で1つに絞り、確定した対象 packet のファイル（`.intent/packets/active/` 配下）のみを読む（全 packet ファイルの丸読みをしない）。
- **draft ガード**: 確定した対象 packet の `state` が draft の場合、AskUserQuestion で「active 化して export を続行するか」を確認し、利用者が承認したら frontmatter の `state` を active へ更新して `index.md` を再生成してから続行する（確認なしに draft のまま export しない。export が canonical を書き換えるのはこの active 化に限る）。
- `.intent/mode.md` を読む。無ければ standard 既定で続行し告知する。

### Step 1.5: enforcement ゲート（writeback 鮮度検査）
- Step 1 で読んだ `.intent/mode.md` の `## Enforcement（ユーザー管理）` セクションから `enforcement` の値を確認する。off・未記載・不正値（mode.md 不在を含む）なら本検査を行わず、現行どおり Step 1.6 へ続行する。
- remind または gate のとき、Bash で `node .intent/scripts/intent-check.mjs` を実行し（読み取り専用スクリプト。ファイルの作成・変更・削除を行わない）、stdout に従う。
- **判定行の解釈規則**: 停止判断は stdout 1行目の判定行の `block=` のみを正とする（再導出・独自解釈をしない）。警告の要否は `result=stale` または `pending>0` で決める。`result=not-applicable` のときも判定行の `pending=` の値をそのまま使う。
- gate かつ `block=yes` のとき: 根拠（pending の packet 名・経過コミット数/閾値。intent-check の2行目以降の人間可読行をそのまま引用する）を提示して export を停止し、`/intent-writeback` の実行を案内する。続けて AskUserQuestion で「それでも export を続行するか」を確認し、利用者が明示的に続行を指示したときのみ、警告を提示したうえで export を実行する（誤検知時の逃げ道）。
- remind かつ違反検出（`result=stale` または `pending>0`）のとき: 同じ根拠を警告として提示し、停止せず続行する。
- intent-check 自体が実行不可（Bash 不可・スクリプト不在・exit 2）のときのみ: staleness を not-applicable として扱い、`.intent/deltas.md` の pending な Delta エントリ（`- Status: pending` を持つもの）を Read/Grep で確認し、その結果を `pending` として上と同じ分岐に入る。

### Step 1.6: drift 照合（drift-watch）
- Step 1 で読んだ `.intent/mode.md` の `## Drift-watch（ユーザー管理）` セクションから `drift-watch` の値を確認する。`on` でないとき（off・未記載・不正値・セクション不在・mode.md 不在を含む）は本照合を行わず、現行どおり Step 1.7 へ続行する（現行動作とバイト等価）。
- `on` のときのみ、`rules/drift-export-check.md` を読み、適用する。対象 packet の proposal/delta ヒント × compass（North Star / Anti-direction / Invariants）の照合・抵触の名指し提示・drift-log への `stage: export` エントリの append・outcome の利用者判定での確定は、すべて rule の手順に委ねる（ここに手順を複製しない）。
- この照合は **warn のみ・export を停止しない**（停止できるのは Step 1.5 の enforcement ゲートだけ。drift-watch は誤検知前提のため止めない）。
- 3関所の順序と直交: **enforcement（手続き・停止しうる, Step 1.5） → drift-watch（方向・停止しない, Step 1.6） → Open Questions（期限・停止しない, Step 1.7）**。検査対象が直交する（手続き / 方向 / 期限）。

### Step 1.7: 未回答 Open Questions の確認
- `rules/export-questions.md` を読み、適用する。

### Step 2: マッピング規則を適用する
- `rules/map-openspec.md` を読み、適用する。
- 入力は対象 packet ファイル1つ（Safety / Invariants の packet 固有 invariant を含む）+ `.intent/intent-compass.md` のプロジェクト普遍 Invariants/Anti-direction のみ（Tree 全文・他 packet は読まない。方向が要る場合のみ Tree L0–L1 を要約参照）。

### Step 3: 下書きを生成する
- 下書きは packet ごとのディレクトリ `.intent/openspec/<スラッグ>/` 配下に書く。スラッグの導出と衝突時の扱いは `rules/map-openspec.md` の「出力レイアウト」節に従う。多 packet を続けて export しても他 packet のディレクトリを上書きしない。
- `.intent/openspec/<スラッグ>/proposal.md` に proposal 下書き（`## Why` / `## What Changes` / `## Impact`）を書く。`/opsx:propose` に投入できる最小かつ常に有効な「変更記述」テキストを冒頭から導出できる形にする。
- `.intent/openspec/<スラッグ>/spec-delta.md` に delta spec ヒント skeleton（`## ADDED Requirements` 既定 + 条件付き `## MODIFIED Requirements` / `## REMOVED Requirements`、`### Requirement: <name>` / `#### Scenario: <name>` の骨格）を書く。
- OpenSpec の本体は完成させない。delta はヒント skeleton までに留め、突き合わせ・完成は OpenSpec 側（`/opsx:propose` 以降）に委ねる（INV4）。proposal/delta には parent intent と invariant 参照を必ず残す。
- 下書きの生成を終えたら、`.intent/export-log.md`（target 横断で共有する単一ログ）へ `| <packet 名> | <export 日時（ISO 8601 UTC）> | <コミットハッシュ> |` を1行追記する（過去の行は消さない）。コミットハッシュは Bash で `git rev-parse --short HEAD`（読み取り専用）を実行して取得し、取得できない場合（git リポジトリでない等）は `-` を記録して export を続行する。export-log.md が無ければ、scaffold と同じテーブルヘッダ（`| packet | exported_at | commit |`）ごと新規作成する。

### Step 4: 受け渡しを案内する（自然言語主導）
- 出力の主役は自然言語案内: 対象 packet の `.intent/openspec/<スラッグ>/proposal.md` と `spec-delta.md` のパスを示し、「このまま OpenSpec に渡してよいか」を確認する。
- 利用者が続行を指示したら、対象 packet の `.intent/openspec/<スラッグ>/proposal.md` から最小の変更記述を読み、それを引数として `/opsx:propose` を起動する（`Skill` を使う。利用者にコピペを強制しない）。
- フォールバックとして、`/opsx:propose` 用のコピー可能な変更記述ブロックも併記する（主ではない）。
- **代行は `/opsx:propose` の起動まで**。その後の apply / sync / archive 等の後続ワークフローは OpenSpec 側に従い、自動で突き進まない。
- **戻り先の明示（writeback フェーズの入口）**: 案内の末尾に、OpenSpec 実装が一巡したら（実装の現実から学びが出たら）`/intent-writeback` で canonical へ戻すことを一行添える。実装後の学びを packet ファイルへ Evidence 直書きして済ませず、必ず writeback（delta 経由）を通す。これは「実装前の起草（compass/packets が canonical を直接書く）」と「実装後の逆抽出（writeback で delta 経由）」のフェーズ境界を利用者に明示するための案内。

## Output Description
- 対象 packet の `.intent/openspec/<スラッグ>/{proposal, spec-delta}.md` の下書き（`/opsx:propose` 投入用 proposal + delta ヒント skeleton）
- `.intent/export-log.md` への export 記録1行（追記）
- draft を active 化した場合の対象 packet ファイルの `state` 更新と `.intent/packets/index.md` の再生成（該当なしの場合は省略）
- 未回答 `[export まで]` Question の確認結果（提示した問いと利用者判断。該当なしの場合は省略）
- OpenSpec へ渡してよいかの確認（自然言語案内・主）
- `/opsx:propose` 用コピーブロック（フォールバック・従）
- 実装前に確認すべき点
- 実装が一巡したあとの戻り先案内（`/intent-writeback` で canonical へ。packet への Evidence 直書きで済ませない）

## Safety & Fallback
- `.intent/packets/` が不在（または `active/` が空）なら停止して `/intent-packets` を案内する。
- index.md 不在は停止せず、`active/` 配下から直接候補を構成して継続し、index の再生成を促す。
- canonical への書き込みは draft ガードの active 化（`state` 更新 + `index.md` 再生成）のみで、利用者の承認を得たときに限る。intent-tree / intent-compass / packet 本文は書き換えない。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- enforcement の検査は fail-open: intent-check が実行不可でも export を止めない。停止するのは enforcement が gate で判定行が `block=yes` のとき、または実行不可フォールバックで gate かつ pending を検出したときのみで、いずれの場合も利用者の明示続行で実行できる。
- Open Questions の確認は停止ではなく確認であり、明示続行で export できる。
- OpenSpec の proposal / delta spec の本体を完成させない（下書き・ヒント skeleton まで）。
- `/opsx:propose` 以降の OpenSpec ワークフロー（apply / sync / archive 等）を自動起動しない。
- 出力先は `.intent/openspec/` に閉じ、`.intent/cc-sdd/` には書き込まない。
- アプリケーションコードは変更しない（INV6。他 skill の起動は INV6 と別概念であり許される）。
