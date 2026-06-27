---
name: intent-overview
description: 散在する .intent/ 成果物を read-only で読み、整形済みの通読・俯瞰ビューを .intent/overview/ 配下に派生（derived）として生成する集約スキル。canonical な成果物は一切変更しない。
allowed-tools: Read, Glob, Grep, Write
argument-hint: なし
---

# intent-overview Skill

## Core Mission
- **Success Criteria**:
  - 散在する `.intent/` の既存成果物（intent-tree / intent-compass / packets の index・active / packets/plan / export-log / deltas / mode / drift-log）を read-only で読み、人間とエージェントが一度に通読できる整形済み俯瞰ビューを `.intent/overview/overview.md` に生成している（R1.1）
  - 生成物を派生（derived）として扱い、canonical な `.intent/*.md` 成果物を一切作成・変更・削除していない。書込み先は `.intent/overview/` 配下限定である（R1.2）
  - 再実行時は最新の成果物から俯瞰ビューを全置換で再生成し、正本との二重化を生んでいない（冪等な再生成。R1.3）
  - `.intent/` または必須成果物（intent-tree など）が存在しないとき、何も書き込まず不在を明示し、先に実行すべき該当スキル（例: `/intent-discover`）を案内している（R1.4）
  - 生成物が派生・再生成可能であり正本ではないこと（および Git 非追跡であること）を明示している（読み手の関心を優先し、ビュー末尾に退避してよい。R1.5）
  - 関心ごとの派生ビュー（意図ビュー / 依存・ブロックビュー / 進捗ビュー）として整理し、進捗を単一％でなく性質の異なる軸で映している
  - ビュー最上段に全 packet を1本の工程レールとして並べ、各行に5信号 + `[現在の工程 → 次に通る工程]` を併記し、「今どの packet が 🔵 今ここで・この後どの工程が残り・どこに ⚪ 残工程 / 🔴 反映漏れがあるか」を一望できるようにしている（5信号と `state` を read-only で映すのみで、状態を算出・推論しない）
  - canonical な意図と inferred（推測）な意図、設計意図と実装実態を区別したまま集約し、欠落・未観測は「未記入／未観測」と明示して推測で埋めていない
  - 他スキルを直接呼ばず、scaffold ファイル（`.intent/*.md`）を介した読み取りと出力テキストの案内のみで連携している（R6.5）。状態機械・自律ループ・常駐プロセスを持たず、外部依存ゼロを維持している（R6.1 / R6.2）

## Execution Steps

### Step 1: `.intent/` と必須成果物の存在を確認する（fail-fast）
- 利用者が俯瞰ビューの生成を要求したとき、まず `.intent/` ディレクトリの存在を確認する。
- `.intent/` または必須成果物（少なくとも `.intent/intent-tree.md`）が存在しない場合は、**何も書き込まず**に不在を明示し、先に実行すべき該当スキル（例: `/intent-discover`）を案内して終了する（fail-fast。R1.4）。この時点では `.intent/overview/overview.md` を生成・更新しない。
- `.intent/mode.md` を読む（無くても停止しない。enforcement / drift-watch の値は後続 Step で参照する。読み取りのみで変更しない）。

### Step 2: ソースを読み取り、4 つの rules に委譲して集約する
- 本スキルは独自の解析・逆算・検査ロジックを持たない。各観点の正確な読み取り規則は以下 4 つの rules に委譲する（相対パスで参照）。各 rules が指定する正確な見出し・キー・列名に従い、canonical と inferred を区別し、欠落・未観測は明示する（推測で埋めない）。
- `rules/aggregate-sources.md` — 意図ドキュメント集約（intent-tree の L0–L4 / intent-compass の North Star・Anti-direction・Invariants・Decision Rules / packets の index・active / plan / export-log / deltas）。canonical な意図と inferred（intent-tree の Assumptions / Open Questions 由来）を分離する。逆算は refactor モードの `algo-intent-recovery` 出力を読むのみで、独自の AST / スキャナ逆算は行わない。逆算が未取得なら不在を明示し該当 algo を案内する（R2.x / R4.x）。
- `rules/mermaid-tree.md` — intent-tree の L0→L4 を純 Mermaid `graph` として描画し、対応するテキスト階層を正本として併記する。intent-tree が空／未生成なら Mermaid を省略し理由を明示する（R3.x）。
- `rules/gap-readout.md` — drift-log と intent-validate の検査軸を**再実装せず読み取り**、「設計意図 vs 実装実態」のギャップとして集約する。`mode.md` の `## Drift-watch（ユーザー管理）` が `on` かつ `drift-log.md` が存在するときのみ drift を集約し、`off`／未記載／不在のときは当該ブロックを省略して未観測を明示する。validate 軸は `validate-checks.md` の安定 kebab-case ID カタログに紐づける。`## Enforcement（ユーザー管理）` / `## Drift-watch（ユーザー管理）` は読取のみ・変更しない（R5.x）。
- `rules/progress-readout.md` — 進捗を単一％でなく 3 軸（意図の安定度 / 実現の完了度 / 証拠の確定度）に分け、各軸を既存成果物の読み取りから導いて出所を明示する。軸間のズレは潰さずそのまま提示する。packet frontmatter の `depends_on` を読んでブロック状態を read-only 導出し（依存は宣言を読むだけで推論・算出しない）、循環・未解決依存があれば明示する。関心別の派生ビュー（意図 / 依存・ブロック / 進捗）として整理する。対応成果物が無い軸・ビューは「未観測／未生成」と明示し省略する（R8.x / R9.x）。
- 分岐方針: inferred の有無、drift-watch の on/off で分岐し、不在なら該当ブロックを省略してその状態を明示する（推測で埋めない）。後方互換として、`depends_on` 不在の既存 packet は「依存なし」、`## Evidence` 不在は「未記入」、旧 3 値 state（`draft|active|done`）の `active` は「進行中（実装中相当）」として読む（rules の規則に従う）。

### Step 3: 俯瞰ビューを最後に書き込む（全置換・派生）
- すべての読み取りと集約が終わってから、**最後に** `.intent/overview/overview.md` を**全置換**で書き込む（再生成の冪等性。R1.3）。canonical な `.intent/*.md` には一切書き込まない。
- 書き込む内容の構成順は「Output Description」に従う（最上段に工程レール＝結論、続いて関心別ビュー、**末尾に派生・正本ではない旨の注記**）。読み手（人間開発者）の「今どこ・この先どうなる」を最優先し、派生注記でビュー冒頭を埋めない。
- 本ビュー全体および各派生ビューが派生（derived）・再生成可能・正本ではなく・Git 非追跡であることを末尾の注記で明示する（R1.2 / R1.3 / R1.5 / R9.5）。

## Output Description

> **出力先はターミナルである。** 出力には raw HTML（`<details>` / `<summary>` 等の折りたたみ UI）を使わず、詳細は素の Markdown 見出しで区切って退避する（ターミナルでは生タグがそのまま表示され読めなくなるため）。`[[...]]`（memory / delta 用の wikilink 等）の内部記法は、delta / memory ファイルへの記録では正当だが、人向けのターミナル出力ではそのまま出さず普通の語に開く（リンク先の名前を自然文で綴る）。

**読み手**: `.intent/` 全体を通読したい人間開発者（と、後続で読む AI）。
**この出力で最初に掴ませること**: 「いま全 packet のうちどれが 🔵 今ここで、各 packet がこの後どの工程を通り、どこに 🔴 反映漏れ・⚪ 残工程があるか」。派生・正本ではない旨などツール内部の注記は読み手の関心ではないため**末尾に退避**する。

ビュー冒頭は次の順で構成する（人間が「今どこ・この先どうなる」に最短で辿り着く順）。

1. **工程レール（最上段・結論）**: 全 packet を縦に並べ、各行に5信号（✅ 反映済 / 🔵 今ここ / ⚪ 未着手 / 🔴 反映漏れ / ◻ 統合済）と、それに続けて `[現在の工程 → 次に通る工程]` を併記する（`progress-readout.md`「各行に `[現在の工程 → 次に通る工程]` を併記する」に従う）。これにより「P いくつが今ここで、この後どの工程が残るか」「どこに反映漏れ・残工程があるか」を1枚で一望させる。
2. **関心別の派生ビュー**（レールの内訳）:
   - **意図ビュー**: intent-tree（L0–L4）の Mermaid 図 + テキスト階層、intent-compass、packets 一覧（plan / export-log / deltas を文脈として併記）。canonical と inferred を区別。
   - **依存・ブロックビュー**: packet 間の `depends_on` に基づく依存関係とブロック状態（あれば循環・未解決依存も明示）。
   - **進捗ビュー**: 3 軸（意図の安定度 / 実現の完了度 / 証拠の確定度）と各軸の出所、軸間のズレ、設計意図 vs 実装実態のギャップ集約（工程レールは 1. で先頭に出すため、ここでは3軸の内訳に集中する）。
3. **末尾の注記**: 本ビュー全体および各ビューが派生（derived）・再生成可能・Git 非追跡であり正本ではないこと（R1.2 / R1.3 / R1.5 / R9.5）。素材が無いビュー・軸は省略し理由（未観測／未生成）を明示する。

## Safety & Fallback
- **書込み境界**: 書込み先は `.intent/overview/` 配下限定である。canonical な `.intent/*.md` は read-only であり、そこへは作成・変更・削除を一切行わない（frontmatter の `Write` は `.intent/overview/` 配下への書き込みのためにのみ許可される）。
- **他スキルを直接呼ばない**: 連携は scaffold ファイル（`.intent/*.md`）を介した読み取りと、出力テキストでの案内のみで行う（R6.5）。逆算（`algo-intent-recovery`）／検査（intent-validate）／drift（drift-watch）の判定ロジックは持たず、それらが残した出力・定義を読むだけである。
- **状態機械・自律ループ・常駐プロセスを持たない**（R6.1）。出力ビュー自体が読み取り時点のスナップショットとして機能する。
- **外部依存ゼロ**（INV2 / R6.2）。外部パッケージを導入せず、Node 標準と自然言語ヒューリスティクスに限定する。
- **アプリケーションコードを変更しない**（INV6 / R6.3）。
- **前提不在時**: `.intent/` または必須成果物が無いとき、何も書き込まず不在を明示し、先に実行すべきスキル（例: `/intent-discover`）を案内して終了する（R1.4）。
- **部分欠落時**: inferred 未取得 / drift-watch off / intent-tree 空などは、当該ブロックを省略し「未取得／未観測／未生成」を明示する（推測で埋めない）。Mermaid 生成不能のときはテキスト階層を正本として提示し図を省略、理由を注記する。
