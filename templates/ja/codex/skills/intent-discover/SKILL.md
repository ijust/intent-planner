---
name: intent-discover
description: Intent Planning の入口。リポジトリの課題感・README・既存コード概要から Intent Tree (L0-L4) を構築し、Intent の詰め方モードを推奨・確定する。実装はしない。
---

# intent-discover Skill

## Core Mission
- **Success Criteria**:
  - L0–L4 の Intent Tree が構造化され、canonical（確定）と inferred（推測）が分離されている
  - Intent の詰め方モードが推奨・確認され、`.intent/mode.local.md`（mode 状態のローカル正本）に記録されている
  - 問いの代行（designer-questions）の要否が確認され `.intent/mode.local.md` に記録されている（on の場合は purpose も。保留時は Open Questions に告知）
  - 人間が確認すべき Open Questions が明示されている
  - drift-watch が on のとき、逸脱しやすい場面の事前チェックを行い該当型を名指しして drift-log に記録している（off のときは何もしない）
  - drift-watch が on のとき、context-cost-cues を照合してコンテキストを食う進め方を指図せず気づかせる言い方で名指している（どのログにも記録しない・off のときは何もしない）
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: モードを選定する
- `rules/mode-selection.md` を読み、適用する。
- 利用可能なモード（`.intent/modes/*.md`）を確認し、リポジトリ状況からモードを推奨する。
- 利用者に自然言語で問い、回答を待って確認する（候補が standard 1つでも推奨→確認の配線を通す）。
- 確定結果を `.intent/mode.local.md`（mode 状態のローカル正本・git 非追跡）に記録する。Enforcement / Drift-watch（共有ポリシー）は `.intent/mode.md` のまま触らない。
- **target format の推奨→追認→記録（任意・保留可）**: mode 確定に続けて、案件から target format（どの出口へ進むか＝ `cc-sdd` / `openspec` / `to-spec` / `direct`）を推せる場合に利用者へ追認を求め、追認されたら `.intent/mode.local.md` の `format` 行へ記録する。判定材料は案件種別（mode・成果物がコードか文書か・`.kiro/` や repo 直下 `openspec/` の有無等）で、出口と format の対応は `intent-packets/rules/export-route.md`（出口判定レーン）と整合させる。`direct` は**ツールを使わず直接実装する案件**（spec ツールを起動しない＝コードや文書を直接編集する小〜中規模の改修等）のとき選び、記録しておくと `/intent-writeback` が対象特定でその記録を一次情報に使う（INV34）。**mode / designer-questions / purpose と同じ追認規律**に従う: 推論できない・利用者が保留/否認したら**推測で埋めず記録しない**（未指定のまま続行＝後で出口判定が推論経路に倒す。direct も未記録なら writeback は3条件 AND 推論にフォールバックする）。format の記録は任意であり、書かなくても discover は従来どおり続行する。**format の書き手は `/intent-discover` のみ**（他スキルは read-only で読む・DR26）。
- `rules/designer-questions.md` を読み、問いの代行（designer-questions）の確認・記録を行う。

### Step 2: モード定義に従ってアルゴリズムを適用する
- 確定したモード定義（例: `.intent/modes/standard.md`）を読む。
- `.intent/mode.local.md`（無ければ旧 `.intent/mode.md`）の `definition` が指すモード定義を開き、Intent Tree 構築フェーズに割り当てられた algo rule（`rules/algo-*.md`）を読み、適用する（standard なら `rules/algo-gore-lite.md`、refactor なら `rules/algo-gore-lite.md` + `rules/algo-drift-analysis.md`、意図不在のコードでは加えて `rules/algo-intent-recovery.md`）。例は網羅ではない。常にモード定義の表を正とする。

### Step 3: Intent Tree を構築する
- GORE-lite に従い L0（目的）→ L1（成果）→ L2（能力）→ L3（振る舞い/設計意図）→ L4（候補パケット）を分解する。
- 確定した意図と推測（Assumptions）を分離する。未確定は Open Questions に置く。
- 既存の `.intent/intent-tree.md` があれば読み、上書きではなく追記・更新案として提示する。

### Step 3.5: 逸脱しやすい場面の事前チェック（drift-watch）
- Step 1 で読んだ `.intent/mode.md` の `## Drift-watch（ユーザー管理）` セクションから `drift-watch` の値を確認する。`on` でないとき（off・未記載・不正値・セクション不在・mode.md 不在を含む）は逸脱しやすい場面の事前チェックを行わず、現行どおり Step 4 へ続行する（現行動作とバイト等価）。
- `on` のときのみ、`rules/drift-terrain.md` を読み、適用する。symptom × 構築中 Intent Tree の照合・該当型の名指し提示・anti-direction / invariant 候補の Open Questions への起案・drift-log への append は、すべて rule の手順に委ねる（ここに手順を複製しない）。同 rule 末尾の「コンテキストコストの気づき」節も併せて適用し、`.intent/context-cost-cues.md` の型を照合してコンテキストを食う進め方を指図せず気づかせる言い方で名指す（どのログにも記録しない・カタログ不在ならスキップ）。

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
- **詳細（成果物の更新案）**: `.intent/intent-tree.md` の更新案（L0–L4 / Open Questions / Assumptions。canonical と inferred を区別）、確定したモード（`.intent/mode.local.md`）、確定した designer-questions / purpose。

## Safety & Fallback
- 入力（課題・対象範囲）が曖昧なら、推測で埋めず利用者に自然言語で問い、回答を待つ。
- 既存の Intent Tree がある場合は破壊せず、差分を更新案として提示する。
- アプリケーションコードは変更しない。
