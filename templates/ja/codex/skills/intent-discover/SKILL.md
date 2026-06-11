---
name: intent-discover
description: Intent Planning の入口。リポジトリの課題感・README・既存コード概要から Intent Tree (L0-L4) を構築し、Intent の詰め方モードを推奨・確定する。実装はしない。
---

# intent-discover Skill

## Core Mission
- **Success Criteria**:
  - L0–L4 の Intent Tree が構造化され、canonical（確定）と inferred（推測）が分離されている
  - Intent の詰め方モードが推奨・確認され、`.intent/mode.md` に記録されている
  - 開発目的（purpose）が確認され `.intent/mode.md` に記録されている（保留時は Open Questions に告知）
  - 人間が確認すべき Open Questions が明示されている
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: モードを選定する
- `rules/mode-selection.md` を読み、適用する。
- 利用可能なモード（`.intent/modes/*.md`）を確認し、リポジトリ状況からモードを推奨する。
- 利用者に自然言語で問い、回答を待って確認する（候補が standard 1つでも推奨→確認の配線を通す）。
- 確定結果を `.intent/mode.md` に記録する。
- `rules/purpose-poc.md` を読み、開発目的（purpose）を確認・記録する。

### Step 2: モード定義に従ってアルゴリズムを適用する
- 確定したモード定義（例: `.intent/modes/standard.md`）を読む。
- `.intent/mode.md` の `definition` が指すモード定義を開き、Intent Tree 構築フェーズに割り当てられた algo rule（`rules/algo-*.md`）を読み、適用する（standard なら `rules/algo-gore-lite.md`、refactor なら `rules/algo-gore-lite.md` + `rules/algo-drift-analysis.md`、意図不在のコードでは加えて `rules/algo-intent-recovery.md`）。例は網羅ではない。常にモード定義の表を正とする。

### Step 3: Intent Tree を構築する
- GORE-lite に従い L0（目的）→ L1（成果）→ L2（能力）→ L3（振る舞い/設計意図）→ L4（候補パケット）を分解する。
- 確定した意図と推測（Assumptions）を分離する。未確定は Open Questions に置く。
- 既存の `.intent/intent-tree.md` があれば読み、上書きではなく追記・更新案として提示する。

### Step 4: 提示する
- `.intent/intent-tree.md` の更新案を提示する。
- purpose が poc の場合、`rules/purpose-poc.md` の Intent Tree 追加確認（L1 計測基準・画面ラフ）を適用する。
- 実装変更はしない。リファクタ案を先走って出さない。

## Output Description
- `.intent/intent-tree.md` の更新案（L0–L4 / Open Questions / Assumptions）
- 確定したモード（`.intent/mode.md`）
- 確定した開発目的（purpose）
- 人間が確認すべき Open Questions
- 次に実行すべきコマンド: `/intent-compass`

## Safety & Fallback
- 入力（課題・対象範囲）が曖昧なら、推測で埋めず利用者に自然言語で問い、回答を待つ。
- 既存の Intent Tree がある場合は破壊せず、差分を更新案として提示する。
- アプリケーションコードは変更しない。
