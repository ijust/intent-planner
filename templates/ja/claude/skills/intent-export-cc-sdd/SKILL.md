---
name: intent-export-cc-sdd
description: 選んだ packet 1つを、トークンを浪費せず cc-sdd へ渡せる凝縮した下書きに変換する。cc-sdd の本体生成は侵さない。続行指示時に /kiro-spec-init を起動できる。
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Skill
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

### Step 2: マッピング規則を適用する
- `rules/map-cc-sdd.md` を読み、適用する。
- 入力は対象 packet 1つ + `.intent/intent-compass.md` の Invariants/Anti-direction のみ（Tree 全文・他 packet は読まない。方向が要る場合のみ Tree L0–L1 を要約参照）。

### Step 3: 下書きを生成する
- `.intent/cc-sdd/requirements.md` に凝縮 Project Description（cc-sdd 投入本文）を書く。
- `.intent/cc-sdd/design.md` に design ヒント（箇条書き）、`.intent/cc-sdd/tasks.md` に「Intent 由来の制約」セクション + tasks チェック項目を書く。
- cc-sdd の本体は完成させない。tasks ヒントには parent intent と invariant 参照を必ず残す。

### Step 4: 受け渡しを案内する（自然言語主導）
- 出力の主役は自然言語案内: `.intent/cc-sdd/requirements.md` のパスを示し、「このまま cc-sdd に渡してよいか」を確認する。
- 利用者が続行を指示したら、`.intent/cc-sdd/requirements.md` の本文を読み、その本文を引数として `/kiro-spec-init` を起動する（`Skill` を使う。利用者にコピペを強制しない）。
- フォールバックとして、`/kiro-spec-init` 用の改行最小化コピーブロックも併記する（主ではない）。
- **代行は `/kiro-spec-init` の起動まで**。その後の requirements → design → tasks は cc-sdd の3フェーズ承認に従い、各フェーズで利用者の続行指示を待つ。自動で突き進まない。

## Output Description
- `.intent/cc-sdd/{requirements, design, tasks}.md` の更新案
- cc-sdd へ渡してよいかの確認（自然言語案内・主）
- `/kiro-spec-init` 用コピーブロック（フォールバック・従）
- 実装前に確認すべき点

## Safety & Fallback
- packets.md が無ければ停止して `/intent-packets` を案内する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- cc-sdd の requirements/design/tasks の本体を完成させない（下書き・ヒントまで）。
- `/kiro-spec-init` 以降の cc-sdd フェーズを自動起動しない。
- アプリケーションコードは変更しない（INV6。他 skill の起動は INV6 と別概念であり許される）。
