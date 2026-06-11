# intent-* Skill 共通契約

全ての `intent-*` skill が従う規約。対象は `intent-` で始まる skill 全体であり、個別列挙には依存しない（skill を追加しても本契約はそのまま適用される）。cc-sdd の `kiro-*` skill と同じ骨格に揃え、非破壊に共存する。

## frontmatter（必須フィールド）

```yaml
---
name: intent-<phase>            # 必ず intent- で始める。kiro-* と衝突させない
description: <一行説明>          # いつ使うかが分かる説明
---
```

- `name` は `intent-*`。ディレクトリ名も一致させる。`kiro-*` と決して衝突させない。
- frontmatter は **`name` / `description` のみ**に絞る（Codex 版の最小 frontmatter 規約）。`allowed-tools` / `argument-hint` / `disable-model-invocation` は置かない。
  - ツールの限定（計画系に絞る・アプリコードを変更しない 等）は frontmatter ではなく本文と下記「共通の制約」で表現する。

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

- **出力は「更新案の提示」を基本**とする。`.intent/` への書き込みは許可。
- **アプリケーションコードを変更しない**（INV6）。
  - INV6 の射程は「アプリコードを変更しない」であって「他 skill を起動しない」ではない。両者は別概念。`intent-export-cc-sdd` が `/kiro-spec-init` を起動するのは INV6 と矛盾しない（コードを触らない）。
- **モードを尊重する**: `.intent/mode.md` を読み、記録されたモード定義に従う。mode.md が不在なら `standard` を既定として続行し、Open Questions に「モード未確定・`/intent-discover` 推奨」を併記する（停止しない）。
- **前段の成果物が欠如しているとき**は、推測で穴埋めせず「先に該当コマンドを実行」を案内して停止する（mode.md 不在とは区別する）。
- **利用者への確認は自然言語で行う**: 推奨を提示し、利用者に自然言語で問い、回答を待つ。専用ツールには依存しない。
- **Bash（シェル実行）は原則使わない。限定例外**: staleness 検査を行うスキル（現在は `intent-export-cc-sdd` のゲート判定と `intent-status` の鮮度警告）は、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動に限り Bash を使える（同スクリプトはファイルの作成・変更・削除を行わない）。これ以外の用途での Bash 利用は intent-* skill に許可しない。
- **read-only skill**（現在は `intent-status` / `intent-validate`）は読み取りと報告のみを行う: 書き込みを行わず、利用者への対話確認も行わない（自然言語での報告のみ）。これは標準規約の意図的な縮小であり、許可される。例外として `intent-status` は上記の Bash 限定例外に基づき、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動に限り Bash を併用できる（ファイルの作成・変更・削除を行わない性質は維持）。`intent-validate` は Bash を持たない。

## スキル間の状態共有

- 共有点は `.intent/mode.md` のみ（隠れ共有を作らない）。
- `.intent/deltas.md` は packets.md と同様の**成果物**（intent-writeback が書き、intent-status / intent-improve が読む）であり、mode.md が担うスキル間状態共有とは別物。隠れ共有の新設ではない。
