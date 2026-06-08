# Packet Plan

> Mode: standard (Example Mapping)。各 packet は parent intent を持ち、behavior-preserving / testable / rollbackable。

## 優先順位と分割方針

scaffold とコンテンツが skill の前提になるため、内側(コンテンツ)から外側(配布)へ積む:

1. **P3 scaffold + modes 拡張点**（他の全ての土台）
2. **P2 standard モード + アルゴリズム rules**（skill が参照する知能）
3. **P1 skill 群**（P2/P3 を使う実行体）
4. **P4 インストーラ**（P1–P3 を配置する）
5. **P5 パッケージング**（P4 を npx 配布可能にする）

P1–P3 はコンテンツ中心で密結合のため、cc-sdd には **P1+P2+P3 を束ねた「intent-planner-core」** と **P4+P5 を束ねた「intent-planner-dist」** の 2 spec として渡すのが収まりが良い。まず core を export する。

---

## Packet: intent-planner-core

### Parent Intent
L0 全体 / L1 開発体験・エコシステム / C1,C2,C3,C4,C5 / B1,B3,B4,B5,B6,B7

### Why
Intent Planning の知能本体（skill + モード + scaffold）。これがなければツールは存在しない。配布(P4/P5)は core を運ぶだけ。

### Scope
- `.intent/` scaffold: README, intent-tree, intent-compass, packets, mode, cc-sdd/{requirements,design,tasks}, modes/{standard, README}
- standard モード定義とアルゴリズム rules: algo-gore-lite / algo-qoc / algo-example-mapping / mode-selection
- 4 skill: intent-discover / intent-compass / intent-packets / intent-export-cc-sdd（cc-sdd の SKILL.md 流儀: YAML frontmatter + Execution Steps + rules 参照）
- export の縫い目(B8): packet→spec マッピングを `rules/map-cc-sdd.md` に分離。export skill 本体はターゲット別マッピングを読む構造にし、将来ターゲット追加が rules 1枚で済むようにする

### Non-scope
- npx インストーラ・package.json（→ intent-planner-dist）
- 2つ目以降のモード（拡張点の形だけ。中身は standard のみ）
- cc-sdd の requirements 以降の本体生成（INV4）
- cc-sdd 以外の export ターゲット（OpenSpec 等）。縫い目(B8)だけ用意し実装しない（Q4）

### Expected Behavior (Example Mapping の「例」)
- 利用者が配置済みプロジェクトで `/intent-discover "..."` を実行 → Claude が standard モードを推奨し確認 → `.intent/mode.md` 更新 + `.intent/intent-tree.md` の L0–L4 更新案を提示し、アプリコードは変更しない。
- `/intent-compass` → tree と mode を読み、Anti-direction に局所最適を明示した compass 更新案を出す。
- `/intent-packets` → 3〜7 個の packet 更新案（各 parent intent 付き）を出す。
- `/intent-export-cc-sdd` → packet 1つを cc-sdd scaffold 3ファイルに変換、task に parent intent + invariant 参照が残る。

### Safety / Invariants
INV3(skill 構造/命名), INV4(cc-sdd 委譲), INV5(parent intent/invariant 参照), INV6(コード非変更)

### Validation
- 各 SKILL.md が有効な YAML frontmatter(name/description/allowed-tools 等)を持つことを目視/lint。
- standard モードを手で辿り、tree→compass→packets→export の出力が schema を満たすこと（本リポジトリでのドッグフーディングがそれ）。
- skill が `mode.md` を読み、algo-*.md を参照する導線が切れていないこと。

### Rollback
`.intent/` と `.claude/skills/intent-*/` を削除すれば原状復帰（他に副作用なし）。

### cc-sdd Mapping
1つの spec「intent-planner-core」として export。requirements は「scaffold/モード/skill が満たすべき振る舞いと制約」、design は「3層分離アーキテクチャと skill 構造」、tasks は「scaffold→モード→skill の順で生成・各 invariant 参照」。

---

## Packet: intent-planner-dist

### Parent Intent
L1 配布 / C6 / B2, B7

### Why
core を任意プロジェクトへ非破壊配置し、npx で配布するため。

### Scope
- `bin/cli.mjs`（引数パース: target-dir, --lang, --force, --dry-run）
- `src/install.mjs`（再帰コピー, 既存スキップ, lang 差し替え, cc-sdd 検出案内）
- `package.json`（bin: intent-planner, files に templates 同梱, type: module, 依存ゼロ）
- 配布用 README

### Non-scope
- core の中身（→ intent-planner-core）
- 状態機械・自律ループ・GitHub 連携

### Expected Behavior (例)
- `npx intent-planner` → カレントに `.claude/skills/intent-*` と `.intent/` を作成。既存同名はスキップして一覧表示。
- `--dry-run` → コピーせず計画表示。
- `--force` → 同名も上書き。
- `--lang en` → scaffold 見出しを英語に。
- `.kiro/` 検出時 → 「cc-sdd 連携を検出」と案内（自動移動はしない）。

### Safety / Invariants
INV1(非破壊), INV2(依存ゼロ・標準モジュールのみ), INV3(配置先構造)

### Validation
- `node bin/cli.mjs --dry-run` が計画を出し、ファイルを書かない。
- 一時ディレクトリへ実コピー → 同名再実行でスキップされる。
- `npm pack` の中身に templates が含まれる。

### Rollback
パッケージ未公開なら影響なし。配置済みなら生成物削除で復帰。

### cc-sdd Mapping
spec「intent-planner-dist」。requirements は CLI フラグと非破壊契約、design はインストーラのコピー/検出アルゴリズム、tasks は cli→install→package.json→pack 検証。

---

## 次に export すべき packet

**intent-planner-core** を最初に `/intent-export-cc-sdd` → cc-sdd へ。dist は core の振る舞いが固まってから。
