# intent-* Skill 共通契約

全ての `intent-*` skill が従う規約。対象は `intent-` で始まる skill 全体であり、個別列挙には依存しない（skill を追加しても本契約はそのまま適用される）。cc-sdd の `kiro-*` skill と同じ骨格に揃え、非破壊に共存する。

## frontmatter（必須フィールド）

```yaml
---
name: intent-<phase>            # 必ず intent- で始める。kiro-* と衝突させない
description: <一行説明>          # いつ使うかが分かる説明
disable-model-invocation: true  # スラッシュ起動前提
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <引数の説明>
---
```

- `name` は `intent-*`。ディレクトリ名も一致させる。`kiro-*` と決して衝突させない。
- `allowed-tools` は**計画系に限定**: `Read, Write, Glob, Grep, AskUserQuestion`（必要に応じ `Agent`）。
  - 例外: `intent-export-cc-sdd` のみ `Skill` を追加してよい（`/kiro-spec-init` を起動するため。起動はこの1コマンドまで）。
  - 例外（Bash 限定）: staleness 検査を行うスキル（現在は `intent-export-cc-sdd` のゲート判定と `intent-status` の鮮度警告）は、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動、および `intent-export-cc-sdd` が export 記録のコミットハッシュを取得するための `git rev-parse --short HEAD`（読み取り専用）の実行に限り `Bash` を追加してよい（いずれもファイルの作成・変更・削除を行わない）。これ以外の用途での Bash 利用は intent-* skill に許可しない。
  - 例外: **read-only skill**（現在は `intent-status` / `intent-validate`）は `allowed-tools` を **`Read, Glob, Grep` に絞る**。`Write` と対話確認ツール（`AskUserQuestion`）を持たない。これは標準セットの意図的な縮小であり、許可される。例外として `intent-status` は上記の Bash 限定例外に基づき、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動に限り `Bash` を併用できる（ファイルの作成・変更・削除を行わない性質は維持。`allowed-tools` は `Read, Glob, Grep, Bash` となる）。`intent-validate` は Bash を持たない。

## 本文構成

cc-sdd の流儀に揃える。

```
# <skill-name> Skill

## Core Mission
- Success Criteria: ...

## Execution Steps
### Step 1: ...   （必要に応じ rules/*.md を Read して適用）
### Step 2: ...

## Output Description
- 生成した更新案
- 人間が確認すべき Open Questions
- 次に実行すべきコマンド

## Safety & Fallback
- エラー時/前提欠如時の挙動
```

## 共通の制約

- **出力は「更新案の提示」を基本**とする。`.intent/` への Write は許可。
- **アプリケーションコードを変更しない**（INV6）。
  - INV6 の射程は「アプリコードを変更しない」であって「他 skill を起動しない」ではない。両者は別概念。`intent-export-cc-sdd` が `/kiro-spec-init` を起動するのは INV6 と矛盾しない（コードを触らない）。
- **モードを尊重する**: `.intent/mode.md` を読み、記録されたモード定義に従う。mode.md が不在なら `standard` を既定として続行し、Open Questions に「モード未確定・`/intent-discover` 推奨」を併記する（停止しない）。
- **前段の成果物が欠如しているとき**は、推測で穴埋めせず「先に該当コマンドを実行」を案内して停止する（mode.md 不在とは区別する）。

## 問いと用語の作法

- **問いは自己完結文にする**: 利用者への問い・確認の文面は、術語を知らなくても回答できる自己完結文とする。術語を使う場合は、問い文面の中に一行説明を含める（例: 「最初の packet（作業単位）が、入力から出力まで一通り動く最小実装（walking skeleton）になっているかを確認します」）。
- **術語は英語のまま + 一行説明**: 術語を日本語の訳語に置換しない。説明が要る場合は、機能・意味を述べる一行説明（括弧書きまたは blockquote）を初出箇所に添える。

## スキル間の状態共有

- 共有点は `.intent/mode.md` のみ（隠れ共有を作らない）。
- `.intent/deltas.md` は `.intent/packets/` 配下の packet ファイルと同様の**成果物**（intent-writeback が書き、intent-status / intent-improve が読む）であり、mode.md が担うスキル間状態共有とは別物。隠れ共有の新設ではない。
