---
name: intent-validate
description: intent-tree・intent-compass・packets（+ export 下書き）を横断し、矛盾・カバレッジ漏れ・境界不整合・規範違反を深刻度付きで報告する読み取り専用の検証。修正は提案にとどめる。
disable-model-invocation: true
allowed-tools: Read, Glob, Grep
argument-hint: なし
---

# intent-validate Skill

## Core Mission
- **Success Criteria**:
  - intent-tree・intent-compass・packets（+ export 下書き）を横断し、検査カタログの全検査を適用している（検査の集合・区分・深刻度は `rules/validate-checks.md` の表が正）
  - 検出結果を深刻度別（要修正 / 推奨 / 情報）に分類し、各項目に検査 ID（`rules/validate-checks.md` の表の ID 列）・根拠（ファイルと該当記述）・修正の提案（再実行すべきスキル or 修正方針）を添えている
  - 未検証対象（未作成 / 未記入の成果物、およびスキップした検査の ID）とその理由を明示している
  - packet を PBR 四観点（利用者観点 / 運用観点 / テスト観点 / 保守観点）で静的に読み、各観点の破綻条件が記述されているかを read-only で確認している
  - ファイルの作成・変更・削除を一切行っていない（read-only・一方向報告）

## Execution Steps

### Step 1: 前提を確認する
- `.intent/` が無ければ intent-planner のセットアップ手順（`npx intent-planner` の実行）を案内して終了する。
- `intent-tree.md` / `intent-compass.md` / `.intent/packets/` の一部欠落は**非ブロッキング**: 停止せず、検証可能な範囲で検査を実施し、欠けた成果物は未検証対象として報告する（packets は `.intent/packets/` 不在または `active/` が空の場合を欠落とみなし、packet 系検査をスキップする）。

### Step 2: 成果物を読む
- `.intent/intent-tree.md`、`.intent/intent-compass.md`、`.intent/packets/index.md` と `.intent/packets/plan.md`、検査対象の packet ファイル（packet 横断の検査では `active/` 配下の全件を読む。`archive/` は読まない）、`.intent/cc-sdd/<スラッグ>/*.md`（packet 毎の export 下書き。存在すれば）、`.intent/mode.md` を読む。
- mode.md が無ければ standard 既定で続行し告知する（停止しない）。

### Step 3: 検査カタログを適用する
- `rules/validate-checks.md` を読み、検査カタログの全検査を適用する（検査の集合・区分・深刻度は `rules/validate-checks.md` の表が正）。
- 深刻度の振り分け（L3 不一致の 要修正 / 推奨 の判定を含む）は rules の基準に従う。
- 境界検査の対象は `.intent/export-log.md` 最新行の packet のディレクトリ（同定はディレクトリ内 requirements.md の `## Source Packet` 見出し一致が正）。過去 packet の下書きは設計上併存するため違反として扱わない。export-log 不在・解釈不能時は下書きの Source Packet 見出しへフォールバックし（複数ディレクトリ時は断定せず候補提示）、その旨を報告する。

### Step 3.5: PBR 四観点を静的に確認する（read-only・破綻条件の探索）
- packet（`active/` 配下、export 下書きがあれば併せて）を以下の四観点で読み、各観点の**破綻条件が記述されているか**を静的に確認する。記述が欠落していれば該当観点の指摘として深刻度別一覧に載せる（自動修正・対話確認は行わない）。
- **利用者観点**: 利用者にとっての振る舞いの破綻条件（期待される振る舞いが崩れる入力・状況）が記述されているか。
- **運用観点**: 障害・タイムアウト・悪意ある入力に対する fail-safe 設計（縮退・拒否・再試行などの挙動）が記述されているか。
- **テスト観点**: 等価分割・境界値分析に基づくテストケースが作成可能か。作成不可能なら境界条件の欠落として報告する。
- **保守観点**: packet が内部に How（天井の固定）を抱え込み、実装エージェントの自由な設計を阻害していないか。
- いずれの観点でも、ハッピーパスの確認に留めず「この設計が破綻する条件（異常系・高負荷・不正入力）」を能動的に探す（確証バイアス緩和）。破綻条件が見当たらない場合は「未探索」ではなく「破綻条件の記述が欠落」として扱う。
- 本観点別確認は静的チェック項目であり、新たな対話ループ・状態機械・対話確認ツールを導入しない。対話的な観点別監査が必要なら、既存の reviewer subagent 運用（`kiro-review` 等）へ委ねる旨を Open Questions / 修正の提案に記す。

### Step 4: 報告する（一方向・修正は提案のみ）
- 検出結果を深刻度別（要修正 / 推奨 / 情報）の一覧で提示し、各指摘に深刻度とともに検査 ID（`rules/validate-checks.md` の表の ID 列）を併記する（例: `要修正 invariant-conflict: …`）。
- 各項目に「根拠（ファイルと該当記述）」と「修正の提案（再実行すべきスキル or 修正方針）」を必ず添える。
- 未検証対象とその理由を明示し、スキップした検査は ID で特定する。
- 残った Open Questions を提示する。
- 自動修正は一切行わない。

## Output Description
- 深刻度別（要修正 / 推奨 / 情報）の検出一覧（各項目: 検査 ID + 根拠 + 修正の提案）
- 未検証対象（スキップした検査の ID を含む）とその理由
- 人間が確認すべき Open Questions
- 次に実行すべきコマンド（修正の提案の一部として。例: `/intent-compass` の再実行）

## Safety & Fallback
- 読み取り専用: いかなるファイルも作成・変更・削除しない。修正は提案にとどめ、再実行すべきスキル or 修正方針を必ず添える。
- `.intent/` 不在のみ停止条件: セットアップ手順を案内して終了する。
- 成果物の一部欠落は非ブロッキング: 検証可能な範囲のみ検査し、未検証対象と理由を明示する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- アプリケーションコードは変更しない（INV6。read-only のため書き込み経路自体を持たない）。
