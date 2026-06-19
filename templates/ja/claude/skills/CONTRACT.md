# intent-* Skill 共通契約

全ての `intent-*` skill が従う規約。対象は `intent-` で始まる skill 全体であり、個別列挙には依存しない（skill を追加しても本契約はそのまま適用される）。cc-sdd の `kiro-*` skill と同じ骨格に揃え、非破壊に共存する。

## frontmatter（必須フィールド）

```yaml
---
name: intent-<phase>            # 必ず intent- で始める。kiro-* と衝突させない（全スキル必須）
description: <一行説明>          # いつ使うかが分かる説明（全スキル必須）
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion  # （全スキル必須）
argument-hint: <引数の説明>      # （全スキル必須）
# disable-model-invocation: true  # canonical-writer のみ必須（下記参照）。auto-invocable には置かない
---
```

- 必須フィールドは `name` / `description` / `allowed-tools` / `argument-hint` の4つ（全スキル一律）。
- **`disable-model-invocation: true` は canonical を書き換えるスキル（canonical-writer）のみ必須**。read-only または派生領域 `.intent/<領域>/` 限定の Write で canonical を書き換えないスキル（auto-invocable）には**置かない**＝モデルが文脈から自動起動できる。
  - 自動起動可否の**判定軸は「canonical（intent-tree / intent-compass / `.intent/packets/` 配下の packet・plan.md 等の正本）を書き換えるか否か」**。書き換えないなら自動起動可（disable を置かない）、書き換えるなら `disable-model-invocation: true` でスラッシュ起動前提にする。
  - この「auto-invocable」軸は、下記 frontmatter 例外節の **「read-only skill（`allowed-tools` を `Read, Glob, Grep` に絞る・`intent-status` / `intent-validate` のみ）」とは別軸**である（混同しない）。read-only skill 軸は allowed-tools の縮小に関する規律であり、auto-invocable 軸は Write を持つ `intent-overview` / `intent-from-spec` / `intent-to-spec` も含む（これらは派生領域限定 Write で canonical を書き換えないため auto-invocable）。詳細な相互参照は下記「read-only skill」記述を参照。
  - **スキル分類（後続が参照する正本列挙）**:
    - **auto-invocable（5）** = `disable-model-invocation` を**置かない**: `intent-status` / `intent-validate` / `intent-overview` / `intent-from-spec` / `intent-to-spec`。
    - **canonical-writer（7）** = `disable-model-invocation: true` を**必須**: `intent-discover` / `intent-compass` / `intent-packets` / `intent-writeback` / `intent-improve` / `intent-export-cc-sdd` / `intent-export-openspec`。
    - この列挙は test の `AUTO_INVOCABLE_SKILLS`（`test/structure-pack.test.mjs`）と一致を保つこと（二重管理の歯止め）。auto-invocable 集合を変更する場合は本列挙と当該テストを同時に更新する。
- `name` は `intent-*`。ディレクトリ名も一致させる。`kiro-*` と決して衝突させない。
- `allowed-tools` は**計画系に限定**: `Read, Write, Glob, Grep, AskUserQuestion`（必要に応じ `Agent`）。
  - 例外: export スキル（現在は `intent-export-cc-sdd` が `/kiro-spec-init`、`intent-export-openspec` が `/opsx:propose` を起動するため）のみ `Skill` を追加してよい。起動は各スキルにつきこの1コマンドまで。
  - 例外（Bash 限定）: staleness 検査を行うスキル（現在は `intent-export-cc-sdd` / `intent-export-openspec` のゲート判定と `intent-status` の鮮度警告）は、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動、および export スキル（`intent-export-cc-sdd` / `intent-export-openspec`）が export 記録のコミットハッシュを取得するための `git rev-parse --short HEAD`（読み取り専用）の実行に限り `Bash` を追加してよい（いずれもファイルの作成・変更・削除を行わない）。これ以外の用途での Bash 利用は intent-* skill に許可しない。
  - 例外: **read-only skill**（現在は `intent-status` / `intent-validate`）は `allowed-tools` を **`Read, Glob, Grep` に絞る**。`Write` と対話確認ツール（`AskUserQuestion`）を持たない。これは標準セットの意図的な縮小であり、許可される。例外として `intent-status` は上記の Bash 限定例外に基づき、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動に限り `Bash` を併用できる（ファイルの作成・変更・削除を行わない性質は維持。`allowed-tools` は `Read, Glob, Grep, Bash` となる）。`intent-validate` は Bash を持たない。
    - 注意（terminology の別軸）: この **「read-only skill」軸（allowed-tools 縮小・`intent-status` / `intent-validate` のみ）** と、上記 frontmatter 必須規約の **「auto-invocable」軸（canonical 非書き換え・`disable-model-invocation` を置かない 5 スキル）** は**別軸**である。auto-invocable には Write を持つ `intent-overview` / `intent-from-spec` / `intent-to-spec` も含まれるため、両者の集合は一致しない。混同しないこと。

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
- **canonical への書き込み権限はフェーズで分かれる**（隠れた前提にしない）。canonical 成果物（intent-tree.md / intent-compass.md / `.intent/packets/` 配下の packet ファイル・plan.md）について:
  - **起草スキル（実装前）は canonical を直接書いてよい**: `/intent-discover`（intent-tree 起案）・`/intent-compass`（North Star / Anti-direction / Invariants / Decision Rules の起草）・`/intent-packets`（packet ファイル起案）は、利用者確認のうえで canonical を直接 Write するのが正規動作。
  - **`/intent-writeback`（実装後）は canonical を直接書かない**: 実装の現実から逆抽出した学びは、必ず `deltas.md` 経由（delta 記録 → 承認 → 昇格）でのみ canonical へ反映する（writeback-protocol.md §3）。packet ファイルへの Evidence 直書きで済ませない。
  - この区別は「実装前の起草」と「実装後の逆抽出」のフェーズ境界に対応する。同じ canonical でも、どのフェーズのどのスキルが書くかで経路が違う。
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
