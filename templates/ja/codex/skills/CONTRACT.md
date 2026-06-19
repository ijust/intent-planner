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
  - 補足: `disable-model-invocation` は claude 版でも全スキル一律ではなく、canonical を書き換えるスキル（canonical-writer）にのみ置く条件付きフィールドである（claude 版 CONTRACT 参照）。Codex 版はその条件にかかわらず、スキルの分類を問わず3フィールドすべてを置かない（最小 frontmatter 規約）。
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
- **canonical への書き込み権限はフェーズで分かれる**（隠れた前提にしない）。canonical 成果物（intent-tree.md / intent-compass.md / `.intent/packets/` 配下の packet ファイル・plan.md）について:
  - **起草スキル（実装前）は canonical を直接書いてよい**: `/intent-discover`（intent-tree 起案）・`/intent-compass`（North Star / Anti-direction / Invariants / Decision Rules の起草）・`/intent-packets`（packet ファイル起案）は、利用者確認のうえで canonical を直接書き込むのが正規動作。
  - **`/intent-writeback`（実装後）は canonical を直接書かない**: 実装の現実から逆抽出した学びは、必ず `deltas.md` 経由（delta 記録 → 承認 → 昇格）でのみ canonical へ反映する（writeback-protocol.md §3）。packet ファイルへの Evidence 直書きで済ませない。
  - この区別は「実装前の起草」と「実装後の逆抽出」のフェーズ境界に対応する。同じ canonical でも、どのフェーズのどのスキルが書くかで経路が違う。
- **アプリケーションコードを変更しない**（INV6）。
  - INV6 の射程は「アプリコードを変更しない」であって「他 skill を起動しない」ではない。両者は別概念。`intent-export-cc-sdd` が `/kiro-spec-init` を、`intent-export-openspec` が `/opsx:propose` を起動するのは INV6 と矛盾しない（コードを触らない）。
- **モードを尊重する（read fallback 規約）**: mode 状態を **`mode.local.md`（無ければ旧 `mode.md`）→ どちらにも無ければ `standard` 既定** の順で読む（後方互換フォールバック）。定義ファイルのモード定義に従って動く。`mode.local.md` も旧 `mode.md` も不在なら `standard` を既定として続行し、Open Questions に「モード未確定・`/intent-discover` 推奨」を併記する（停止しない）。Enforcement / Drift-watch（共有ポリシー）は `mode.md` から読む（このフォールバック規約の対象外）。
- **前段の成果物が欠如しているとき**は、推測で穴埋めせず「先に該当コマンドを実行」を案内して停止する（mode 状態の不在とは区別する）。
- **利用者への確認は自然言語で行う**: 推奨を提示し、利用者に自然言語で問い、回答を待つ。専用ツールには依存しない。
- **Bash（シェル実行）は原則使わない。限定例外**: staleness 検査を行うスキル（現在は `intent-export-cc-sdd` / `intent-export-openspec` のゲート判定と `intent-status` の鮮度警告）は、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動、および export スキル（`intent-export-cc-sdd` / `intent-export-openspec`）が export 記録のコミットハッシュを取得するための `git rev-parse --short HEAD`（読み取り専用）の実行に限り Bash を使える（いずれもファイルの作成・変更・削除を行わない）。これ以外の用途での Bash 利用は intent-* skill に許可しない。
- **read-only skill**（現在は `intent-status` / `intent-validate`）は読み取りと報告のみを行う: 書き込みを行わず、利用者への対話確認も行わない（自然言語での報告のみ）。これは標準規約の意図的な縮小であり、許可される。例外として `intent-status` は上記の Bash 限定例外に基づき、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動に限り Bash を併用できる（ファイルの作成・変更・削除を行わない性質は維持）。`intent-validate` は Bash を持たない。

## 問いと用語の作法

- **問いは自己完結文にする**: 利用者への問い・確認の文面は、術語を知らなくても回答できる自己完結文とする。術語を使う場合は、問い文面の中に一行説明を含める（例: 「最初の packet（作業単位）が、入力から出力まで一通り動く最小実装（walking skeleton）になっているかを利用者に確認します」）。
- **術語は英語のまま + 一行説明**: 術語を日本語の訳語に置換しない。説明が要る場合は、機能・意味を述べる一行説明（括弧書きまたは blockquote）を初出箇所に添える。
- **造語を勝手に作らない**: 正規語彙（ubiquitous language＝intent 成果物で既に使われている合意済みの用語の集合）に無い新造の語を勝手に作らず、既存の語を再利用する。どうしても新しい語を導入する場合は、初出箇所に一行説明を添える。

## スキル間の状態共有

- 状態の共有点は **`mode.local.md`（mode 状態: mode/designer-questions/purpose・ローカル専用・git 非追跡）** と **`mode.md`（共有ポリシー: Enforcement/Drift-watch・git 追跡）** の2ファイル（隠れ共有を作らない）。read fallback 規約は上記「モードを尊重する」に集約する。
- `.intent/deltas.md` は `.intent/packets/` 配下の packet ファイルと同様の**成果物**（intent-writeback が書き、intent-status / intent-improve が読む）であり、mode 状態共有とは別物。隠れ共有の新設ではない。
