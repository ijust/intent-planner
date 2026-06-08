---
name: intent-packets
description: Intent Tree と Intent Compass から、cc-sdd に渡す前の Packet Plan を作る。各 packet は parent intent を持ち、behavior-preserving / testable / rollbackable。実装はしない。
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <分解の焦点（任意）>
---

# intent-packets Skill

## Core Mission
- **Success Criteria**:
  - 3〜7 個の packet 候補があり、各 packet が parent intent を参照している
  - 各 packet が Scope / Non-scope / Expected Behavior / Safety(Invariants) / Validation / Rollback / cc-sdd Mapping を持つ
  - 各 packet が behavior-preserving / testable / rollbackable な粒度である
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 前提を読む
- `.intent/intent-tree.md` と `.intent/intent-compass.md` を読む。どちらか無ければ「先に該当コマンドを実行」を案内して停止する。
- `.intent/mode.md` を読む。無ければ standard を既定とし Open Questions に告知する（停止しない）。

### Step 2: モード定義のアルゴリズムを適用する
- standard モードなら `rules/algo-example-mapping.md` を読み、適用する。

### Step 3: Packet を分解する
- Example Mapping に従い、各 L2/L3 能力を「ルール・例・疑問」に展開する。
- 例から Expected Behavior、Validation、Rollback を導く。
- 3〜7 個の packet にまとめる。各 packet に parent intent（L0/L1/L2/L3 への参照）を必ず持たせる。
- Compass の invariant を各 packet の Safety に反映する。

### Step 4: 優先順位と分割を提示する
- packet の優先順位を示す。
- 大きすぎる packet には分割案を提示する。
- 実装変更はしない。

## Output Description
- `.intent/packets.md` の更新案（3〜7 packet、各 parent intent 付き）
- packet の優先順位
- 大きすぎる packet の分割案
- 次に export すべき packet
- 次に実行すべきコマンド: `/intent-export-cc-sdd`

## Safety & Fallback
- Intent Tree / Compass が無ければ停止して該当コマンドを案内する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- packet を実装タスクに落としすぎない（Issue より上位、spec より手前）。
- アプリケーションコードは変更しない。
