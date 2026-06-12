---
name: intent-export-cc-sdd
description: 選んだ packet 1つを、トークンを浪費せず cc-sdd へ渡せる凝縮した下書きに変換する。cc-sdd の本体生成は侵さない。続行指示時に /kiro-spec-init を起動できる。
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Skill, Bash
argument-hint: <対象 packet 名（任意）>
---

# intent-export-cc-sdd Skill

## Core Mission
- **Success Criteria**:
  - 対象 packet 1つを cc-sdd の凝縮 Project Description + design/tasks ヒントに変換している
  - 入力を対象 packet + compass の Invariants/Anti-direction に限定し、Tree/Compass 全文を cc-sdd へ転記していない
  - tasks ヒントが parent intent / invariant 参照を持ち、impl への伝播構造になっている
  - 出力主役が自然言語案内で、続行指示時に /kiro-spec-init を起動できる
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 対象 packet を1つに絞る
- `.intent/packets.md` を読む。無ければ「先に `/intent-packets` を実行」を案内して停止する。
- 引数で packet が指定されていればそれを、なければ優先順位や利用者確認で1つに絞る。
- `.intent/mode.md` を読む。無ければ standard 既定で続行し告知する。

### Step 1.5: enforcement ゲート（writeback 鮮度検査）
- Step 1 で読んだ `.intent/mode.md` の `## Enforcement（ユーザー管理）` セクションから `enforcement` の値を確認する。off・未記載・不正値（mode.md 不在を含む）なら本検査を行わず、現行どおり Step 2 へ続行する。
- remind または gate のとき、Bash で `node .intent/scripts/intent-check.mjs` を実行し（読み取り専用スクリプト。ファイルの作成・変更・削除を行わない）、stdout に従う。
- **判定行の解釈規則**: 停止判断は stdout 1行目の判定行の `block=` のみを正とする（再導出・独自解釈をしない）。警告の要否は `result=stale` または `pending>0` で決める。`result=not-applicable` のときも判定行の `pending=` の値をそのまま使う。
- gate かつ `block=yes` のとき: 根拠（pending の packet 名・経過コミット数/閾値。intent-check の2行目以降の人間可読行をそのまま引用する）を提示して export を停止し、`/intent-writeback` の実行を案内する。続けて AskUserQuestion で「それでも export を続行するか」を確認し、利用者が明示的に続行を指示したときのみ、警告を提示したうえで export を実行する（誤検知時の逃げ道）。
- remind かつ違反検出（`result=stale` または `pending>0`）のとき: 同じ根拠を警告として提示し、停止せず続行する。
- intent-check 自体が実行不可（Bash 不可・スクリプト不在・exit 2）のときのみ: staleness を not-applicable として扱い、`.intent/deltas.md` の pending な Delta エントリ（`- Status: pending` を持つもの）を Read/Grep で確認し、その結果を `pending` として上と同じ分岐に入る。

### Step 1.7: 未回答 Open Questions の確認
- `rules/export-questions.md` を読み、適用する。

### Step 1.8: 旧形式下書きの移行
- `.intent/cc-sdd/` 直下にある README.md 以外の `*.md`（旧単一スロット形式の下書き）を検出する。無ければ何もせず Step 2 へ進む。
- 検出したら各ファイルの `## Source Packet` 見出しを読んで所属 packet 名を特定し、`rules/map-cc-sdd.md` のスラッグ規則で導出した `.intent/cc-sdd/<スラッグ>/` ディレクトリへ移動する。同一 packet を指すファイルは同じディレクトリへまとめて移動する。
- 移動を終えたら、移動元 → 移動先の一覧を利用者に報告する。
- `## Source Packet` 見出しが無い・判別できないファイルは、AskUserQuestion で移動先を確認する。確認なしに移動しない。
- 移行で動かすのは `.intent/cc-sdd/` 配下の下書きファイルのみであり、アプリケーションコードは変更しない（INV6 維持）。

### Step 2: マッピング規則を適用する
- `rules/map-cc-sdd.md` を読み、適用する。
- 入力は対象 packet 1つ + `.intent/intent-compass.md` の Invariants/Anti-direction のみ（Tree 全文・他 packet は読まない。方向が要る場合のみ Tree L0–L1 を要約参照）。

### Step 3: 下書きを生成する
- 下書きは packet ごとのディレクトリ `.intent/cc-sdd/<スラッグ>/` 配下に書く。スラッグの導出と衝突時の扱いは `rules/map-cc-sdd.md` の「出力レイアウト」節に従う。
- `.intent/cc-sdd/<スラッグ>/requirements.md` に凝縮 Project Description（cc-sdd 投入本文）を書く。
- `.intent/cc-sdd/<スラッグ>/design.md` に design ヒント（箇条書き）、`.intent/cc-sdd/<スラッグ>/tasks.md` に「Intent 由来の制約」セクション + tasks チェック項目を書く。
- cc-sdd の本体は完成させない。tasks ヒントには parent intent と invariant 参照を必ず残す。
- 下書きの生成を終えたら、`.intent/export-log.md` へ `| <packet 名> | <export 日時（ISO 8601 UTC）> | <コミットハッシュ> |` を1行追記する（過去の行は消さない）。コミットハッシュは Bash で `git rev-parse --short HEAD`（読み取り専用）を実行して取得し、取得できない場合（git リポジトリでない等）は `-` を記録して export を続行する。export-log.md が無ければ、scaffold と同じテーブルヘッダ（`| packet | exported_at | commit |`）ごと新規作成する。

### Step 4: 受け渡しを案内する（自然言語主導）
- 出力の主役は自然言語案内: 対象 packet の `.intent/cc-sdd/<スラッグ>/requirements.md` のパスを示し、「このまま cc-sdd に渡してよいか」を確認する。
- 利用者が続行を指示したら、対象 packet の `.intent/cc-sdd/<スラッグ>/requirements.md` の本文を読み、その本文を引数として `/kiro-spec-init` を起動する（`Skill` を使う。利用者にコピペを強制しない）。
- フォールバックとして、`/kiro-spec-init` 用の改行最小化コピーブロックも併記する（主ではない）。
- **代行は `/kiro-spec-init` の起動まで**。その後の requirements → design → tasks は cc-sdd の3フェーズ承認に従い、各フェーズで利用者の続行指示を待つ。自動で突き進まない。

## Output Description
- 対象 packet の `.intent/cc-sdd/<スラッグ>/{requirements, design, tasks}.md` の更新案
- `.intent/export-log.md` への export 記録1行（追記）
- 旧形式下書きを移行した場合の移動元 → 移動先の一覧（該当なしの場合は省略）
- 未回答 `[export まで]` Question の確認結果（提示した問いと利用者判断。該当なしの場合は省略）
- cc-sdd へ渡してよいかの確認（自然言語案内・主）
- `/kiro-spec-init` 用コピーブロック（フォールバック・従）
- 実装前に確認すべき点

## Safety & Fallback
- packets.md が無ければ停止して `/intent-packets` を案内する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- enforcement の検査は fail-open: intent-check が実行不可でも export を止めない。停止するのは enforcement が gate で判定行が `block=yes` のとき、または実行不可フォールバックで gate かつ pending を検出したときのみで、いずれの場合も利用者の明示続行で実行できる。
- Open Questions の確認は停止ではなく確認であり、明示続行で export できる。
- 旧形式下書きの移行は `## Source Packet` で所属 packet を特定できた場合のみ無人で行い、判別できないファイルは利用者確認なしに移動しない。
- cc-sdd の requirements/design/tasks の本体を完成させない（下書き・ヒントまで）。
- `/kiro-spec-init` 以降の cc-sdd フェーズを自動起動しない。
- アプリケーションコードは変更しない（INV6。他 skill の起動は INV6 と別概念であり許される）。
