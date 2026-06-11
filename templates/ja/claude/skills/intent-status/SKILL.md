---
name: intent-status
description: .intent/ の現状を読み取り、現在地の要約と「次の一手」をちょうど1つ推奨する読み取り専用の案内スキル。ファイルの作成・変更・削除は一切しない。
disable-model-invocation: true
allowed-tools: Read, Glob, Grep
argument-hint: なし
---

# intent-status Skill

## Core Mission
- **Success Criteria**:
  - `.intent/` 配下の成果物（mode・intent-tree・intent-compass・packets・cc-sdd 下書き・deltas）の存在と記入状態を読み取り、現在地の要約を提示している
  - 「次の一手」を `rules/decision-table.md` の first-match でちょうど1つ推奨し、推奨理由と判断根拠（どの成果物のどの状態に基づくか）を併記している
  - 推奨候補を discover / compass / packets / export / validate / improve / writeback / 「アクション不要」の中から選定している
  - ファイルの作成・変更・削除を一切行っていない（read-only）

## Execution Steps

### Step 1: `.intent/` の存在を確認する
- `.intent/` が存在しなければ、セットアップ手順（`npx github:ijust/intent-planner` の実行）を案内して終了する。
- `.intent/mode.md` を読む。無ければ standard 既定で続行し、Open Questions に「モード未確定・`/intent-discover` 推奨」を併記する（停止しない）。

### Step 2: 成果物を読み取る
- `.intent/intent-tree.md` / `.intent/intent-compass.md` / `.intent/packets.md` / `.intent/cc-sdd/*.md` / `.intent/deltas.md` を読み、それぞれの 有/無/未記入 と特記事項（未解決 Question、Status: pending の delta、「保留」タグ付き見送り項目など）を把握する。
- `.intent/cc-sdd/*.md` の「## Source Packet」見出しから現行 Source Packet（最新 export）を特定する。見出しが不在/不明な場合のフォールバック: cc-sdd 下書き本文と packets.md の packet 名のテキスト照合で候補を挙げ、自然言語の候補提示にとどめる（断定しない）。
- `.kiro/specs/` は存在する場合のみ読み、各 spec の spec.json と tasks.md のチェック状況を文脈に使う。対応 spec の特定は spec ディレクトリ名および各 spec の requirements.md「Project Description (Input)」本文と Source Packet 名のテキスト照合による（照合規則の詳細は `rules/decision-table.md` の脚注に従う）。

### Step 3: 決定表で次の一手を1つに決める
- `rules/decision-table.md` を読み、first-match（上から評価し、最初に該当した行のみ）で「次の一手」をちょうど1つ決定する。
- 複数候補の併記はしない（理由と根拠は併記する）。推奨が複数見える曖昧なケースも、決定表の優先順位で機械的に1つへ畳む。

### Step 4: 報告する
- ① 現在地要約: 成果物ごとの 有/無/未記入 と特記事項。
- ② 次の一手（ちょうど1つ）: スキル名 or「アクション不要」+ 推奨理由 + 判断根拠（どの成果物のどの状態に基づくか）。
- ③ Open Questions: ユーザー確認が必要な点。確認は自然言語での候補提示にとどめ、次のアクションの判断はユーザーに委ねる（一方向報告）。

## Output Description
- 現在地の要約（成果物ごとの存在と記入状態 + 特記事項）
- 次の一手ちょうど1つ（推奨理由・判断根拠付き）
- 人間が確認すべき Open Questions

## Safety & Fallback
- **read-only 宣言**: ファイルの作成・変更・削除を一切行わない（frontmatter に Write を持たない）。
- `.intent/` 不在時はセットアップ手順を案内して終了する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- 「## Source Packet」見出し不在時は、本文と packets.md の packet 名のテキスト照合フォールバックで候補提示にとどめる。
- `.kiro/specs/` が無い環境でも動作する（該当行は `rules/decision-table.md` の条件文言付き推奨に従う）。
