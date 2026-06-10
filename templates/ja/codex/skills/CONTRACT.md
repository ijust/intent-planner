# intent-* Skill 共通契約

全ての `intent-*` skill（intent-discover / intent-compass / intent-packets / intent-export-cc-sdd）が従う規約。cc-sdd の `kiro-*` skill と同じ骨格に揃え、非破壊に共存する。

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

## スキル間の状態共有

- 共有点は `.intent/mode.md` のみ（隠れ共有を作らない）。
