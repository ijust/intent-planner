---
name: intent-compass
description: Intent Tree から、今回の変更における判断基準（North Star / Anti-direction / Invariants / Decision Rules）を構築する。Claude が局所最適に逃げるのを防ぐ。実装はしない。
---

# intent-compass Skill

## Core Mission
- **Success Criteria**:
  - North Star / Current Drift / Direction / Anti-direction / Invariants / Decision Rules / Evidence / Open Questions が揃っている
  - Anti-direction に Claude がやりがちな局所最適が明示列挙されている
  - Invariants はプロジェクト普遍のみが compass に保持され、packet 固有は packet ファイル（Safety / Invariants）を正本としている
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 前提を読む
- `.intent/intent-tree.md` を読む。無ければ「先に `/intent-discover` を実行」を案内して停止する。
- `.intent/mode.md` を読む。無ければ standard を既定とし、Open Questions に「モード未確定・`/intent-discover` 推奨」を併記する（停止しない）。
- 既存の `.intent/intent-compass.md` があれば読む。

### Step 2: モード定義のアルゴリズムを適用する
- `.intent/mode.md` の `definition` が指すモード定義を開き、Compass 構築フェーズに割り当てられた algo rule（`rules/algo-*.md`）を読み、適用する（現状どのモードも `rules/algo-qoc.md`）。例は網羅ではない。常にモード定義の表を正とする。

### Step 3: Compass を構築する
- QOC に従い North Star を引き、Decision Rules を軽量 ADR として凝縮する（エントリの欄構成は `rules/algo-qoc.md` が正）。
- Anti-direction に Claude がやりがちな局所最適・小手先リファクタを明示列挙する（最重要）。
- Invariants を2層で解消する:
  - **プロジェクト普遍 invariant**（全作業共通・少量）→ compass の Invariants に保持する。`/kiro-steering-custom` で `.kiro/steering/` に置くと全作業で効くことを推奨提示する（自動配置はしない。起動時コンテキスト増を避けるため少量に限る）。
  - **packet 固有 invariant**（特定作業単位）→ packet ファイルの Safety / Invariants に直接起案する（compass には書かない。`/intent-packets` が packet 起案時に記入する）。

### Step 4: 提示する
- `.intent/intent-compass.md` の更新案を提示する。実装変更はしない。

## Output Description
- `.intent/intent-compass.md` の更新案
- 今回避けるべき局所最適（Anti-direction）
- steering 配置を推奨する普遍 invariant（あれば）
- 判断に必要な不明点（Open Questions）
- 次に実行すべきコマンド: `/intent-packets`

## Safety & Fallback
- Intent Tree が無ければ停止して `/intent-discover` を案内する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- アプリケーションコードは変更しない。
