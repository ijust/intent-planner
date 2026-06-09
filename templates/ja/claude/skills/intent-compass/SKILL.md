---
name: intent-compass
description: Intent Tree から、今回の変更における判断基準（North Star / Anti-direction / Invariants / Decision Rules）を構築する。Claude が局所最適に逃げるのを防ぐ。実装はしない。
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <今回の変更の焦点（任意）>
---

# intent-compass Skill

## Core Mission
- **Success Criteria**:
  - North Star / Current Drift / Direction / Anti-direction / Invariants / Decision Rules / Evidence / Open Questions が揃っている
  - Anti-direction に Claude がやりがちな局所最適が明示列挙されている
  - Invariants がプロジェクト普遍 / packet 固有 の2層で区別されている
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 前提を読む
- `.intent/intent-tree.md` を読む。無ければ「先に `/intent-discover` を実行」を案内して停止する。
- `.intent/mode.md` を読む。無ければ standard を既定とし、Open Questions に「モード未確定・`/intent-discover` 推奨」を併記する（停止しない）。
- 既存の `.intent/intent-compass.md` があれば読む。

### Step 2: モード定義のアルゴリズムを適用する
- standard モードなら `rules/algo-qoc.md` を読み、適用する。

### Step 3: Compass を構築する
- QOC に従い North Star を引き、Decision Rules を「問い → 採る選択肢 → なぜ」で凝縮する。
- Anti-direction に Claude がやりがちな局所最適・小手先リファクタを明示列挙する（最重要）。
- Invariants を2層で固定する:
  - **プロジェクト普遍 invariant**（全作業共通・少量）→ `/kiro-steering-custom` で `.kiro/steering/` に置くと全作業で効くことを推奨提示する（自動配置はしない。起動時コンテキスト増を避けるため少量に限る）。
  - **packet 固有 invariant**（特定作業単位）→ export 時に cc-sdd の tasks へ焼き込まれる。

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
