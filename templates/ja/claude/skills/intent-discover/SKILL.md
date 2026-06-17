---
name: intent-discover
description: Intent Planning の入口。リポジトリの課題感・README・既存コード概要から Intent Tree (L0-L4) を構築し、Intent の詰め方モードを推奨・確定する。実装はしない。
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <課題・アイデア・対象範囲>
---

# intent-discover Skill

## Core Mission
- **Success Criteria**:
  - L0–L4 の Intent Tree が構造化され、canonical（確定）と inferred（推測）が分離されている
  - Intent の詰め方モードが推奨・確認され、`.intent/mode.md` に記録されている
  - 問いの代行（designer-questions）の要否が確認され `.intent/mode.md` に記録されている（on の場合は purpose も。保留時は Open Questions に告知）
  - 人間が確認すべき Open Questions が明示されている
  - drift-watch が on のとき、地形診断を行い該当型を名指しして drift-log に記録している（off のときは何もしない）
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: モードを選定する
- `rules/mode-selection.md` を読み、適用する。
- 利用可能なモード（`.intent/modes/*.md`）を確認し、リポジトリ状況からモードを推奨する。
- `AskUserQuestion` で利用者に確認する（候補が standard 1つでも推奨→確認の配線を通す）。
- 確定結果を `.intent/mode.md` に記録する。
- `rules/designer-questions.md` を読み、問いの代行（designer-questions）の確認・記録を行う。

### Step 2: モード定義に従ってアルゴリズムを適用する
- 確定したモード定義（例: `.intent/modes/standard.md`）を読む。
- `.intent/mode.md` の `definition` が指すモード定義を開き、Intent Tree 構築フェーズに割り当てられた algo rule（`rules/algo-*.md`）を読み、適用する（standard なら `rules/algo-gore-lite.md`、refactor なら `rules/algo-gore-lite.md` + `rules/algo-drift-analysis.md`、意図不在のコードでは加えて `rules/algo-intent-recovery.md`）。例は網羅ではない。常にモード定義の表を正とする。

### Step 3: Intent Tree を構築する
- GORE-lite に従い L0（目的）→ L1（成果）→ L2（能力）→ L3（振る舞い/設計意図）→ L4（候補パケット）を分解する。
- 確定した意図と推測（Assumptions）を分離する。未確定は Open Questions に置く。
- 既存の `.intent/intent-tree.md` があれば読み、上書きではなく追記・更新案として提示する。

### Step 3.5: 地形診断（drift-watch）
- Step 1 で読んだ `.intent/mode.md` の `## Drift-watch（ユーザー管理）` セクションから `drift-watch` の値を確認する。`on` でないとき（off・未記載・不正値・セクション不在・mode.md 不在を含む）は地形診断を行わず、現行どおり Step 4 へ続行する（現行動作とバイト等価）。
- `on` のときのみ、`rules/drift-terrain.md` を読み、適用する。symptom × 構築中 Intent Tree の照合・該当型の名指し提示・anti-direction / invariant 候補の Open Questions への起案・drift-log への append は、すべて rule の手順に委ねる（ここに手順を複製しない）。

### Step 4: 提示する
- `.intent/intent-tree.md` の更新案を提示する。
- `rules/designer-questions.md` の Intent Tree 追加確認（L1 計測基準・画面ラフ）を、rule の適用条件に従って適用する。
- 実装変更はしない。リファクタ案を先走って出さない。

## Output Description

**読み手**: これから意図を詰め始める人間開発者。
**この出力で最初に掴ませること**: 「Intent Tree の骨子ができた。**次は `/intent-compass`**。ただし確定前に答えるべき Open Questions はこれだけ」。

出力は結論を先頭に立てる。

- **次の一手（先頭・1行）**: `/intent-compass`（判断基準づくり。局所最適を防ぐ Invariants/Anti-direction を定める）。
- **確認が要る Open Questions**: 人間が確定させるべき不明点（推測で埋めず質問として残したもの）。次に進む前にここだけ片付ければよい、と分かる形で。
- **詳細（成果物の更新案）**: `.intent/intent-tree.md` の更新案（L0–L4 / Open Questions / Assumptions。canonical と inferred を区別）、確定したモード（`.intent/mode.md`）、確定した designer-questions / purpose。

## Safety & Fallback
- 入力（課題・対象範囲）が曖昧なら、推測で埋めず利用者に質問する。
- 既存の Intent Tree がある場合は破壊せず、差分を更新案として提示する。
- アプリケーションコードは変更しない。
