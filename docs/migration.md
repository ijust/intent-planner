# 移行ガイド — 旧バージョンからのアップグレード（Claude Code / Codex / Gemini CLI）

intent-planner を旧バージョンから入れ直す（アップグレードする）ときの手順です。**インストーラは既存のあなたの成果物を壊しません**が、その「壊さない」設計ゆえに、新しく入った仕組みを既存プロジェクトへ手で取り込む一手間が要る場合があります。このガイドはその一手間を、使っている AI ツール（Claude Code / Codex / Gemini CLI）ごとに説明します。

## まず: アップグレードで何が起き、何が起きないか

```bash
# 使っている AI に合わせて、プロジェクトのルートで再実行する
npx intent-planner            # Claude Code（既定）
npx intent-planner --agent codex
npx intent-planner --agent gemini

# 先に差分だけ見たいとき（何も書き込まない）
npx intent-planner --dry-run
```

インストーラはファイルを2種類に分けて扱います。

- **あなたの成果物（user-data）** — `.intent/intent-tree.md`・`.intent/intent-compass.md`・`.intent/packets/` 配下・各種ログ・`.intent/glossary.md` など、**あなたが書き込んだ正本**。既に存在するものは **上書きしません**（`--force` を明示したときだけ上書き）。アップグレードしても、あなたの意図ツリーや判断基準はそのまま残ります。
- **配布物（code）** — `intent-*` スキル本体・rules・参照ドキュメント。新版の内容で更新されます（既存があっても新版へ。code 種別のみ）。

つまり **アップグレードで新しいスキルやルールは届くが、あなたが既に書いた `intent-tree.md` / `intent-compass.md` の中身は触られません**。これは資産保護として正しい挙動ですが、次の「retrofit（後付け取り込み）」が必要になる場合があります。

## このバージョンの新機能と、既存プロジェクトでの retrofit

このバージョンでは **canonical の肥大化対策**（intent-tree / intent-compass が機能追加のたびに膨らむのを抑える仕組み）が入りました。要点は3つです。

1. **履歴の退避先ファイル** — 完結した機能の履歴（Impact Analysis やプレモータム逆算など）を本体から退避する置き場として、`.intent/intent-tree.history.md` と `.intent/compass-history.md` が追加されました（覆された Decision Rules 専用の `.intent/compass-archive.md` とは別）。
2. **検索タグ** — 現役か退避済みかを frontmatter スキーマタグ `status: active | archived` で標識し、`grep` で出し分けられます。
3. **学びの置き場の変更** — `/intent-writeback` が逆抽出する学び（implicit-behavior など）の昇格先が、intent-tree の L3 から **紐づく packet の `## Expected Behavior`** に変わりました。

### 新規プロジェクト（まだ `.intent/` が無い）

`npx intent-planner` を実行すれば、空の退避先ファイルと検索タグの仕組みが最初から入ります。何もする必要はありません。

### 既存プロジェクト（すでに `.intent/` を使っている）

アップグレードで **空の退避先ファイル（器）と新しい退避規律（ルール）は届きます**が、**あなたの既存の `intent-tree.md` / `intent-compass.md` に既に溜まった履歴は、本体に残ったまま**です（インストーラは user-data を上書きしないため）。肥大化を実際に減らすには、溜まった履歴を退避先へ手で移す retrofit を一度行います。

retrofit は次のいずれかで行えます（どの AI ツールでも同じ）。

- **AI に任せる（推奨）**: 使っている AI（Claude Code / Codex / Gemini CLI）に、次のように頼みます。

  > `.intent/intent-tree.md` 本体に溜まった、完結した機能の履歴（`## Impact Analysis（…）` セクション・役目を終えた `## 機能追記:` セクション・`## L4 Candidate Packets` の出荷済み群）を、`.intent/intent-tree.history.md` へ **move**（移動）してください。`.intent/compass-history.md` への退避も同様にお願いします。退避は **move であって edit ではありません** — 見出し・番号・文面を一切変えず、位置だけ移してください。退避した各ブロックの見出し直後に `> status: archived | archived_at: <日時> | from: intent-tree.md` の1行を添えてください。**現役のセクションには `> status: active` を添えてください。**

  退避先ファイルの冒頭に同じ規律（move であって edit でない・退避記法）が書かれているので、AI はそれに従います。

- **手で行う**: 退避先ファイル（`.intent/intent-tree.history.md` / `.intent/compass-history.md`）の冒頭にある「退避規律」と「退避記法」に従って、完結機能の履歴ブロックを本体から切り取り、退避先の末尾へ追記します。本体側の現役セクションには `> status: active` を、退避したブロックには `> status: archived` を付けます。

> **注意（compass の退避は単位に気をつける）**: `intent-compass.md` のプレモータム逆算ブロック（`### <機能> 固有（プレモータム: …）`）は、見出しの下に **番号付きの Anti-direction 項目**を抱えています。これらの番号は現役の Invariant / Decision Rule から「Anti-direction 92」のように **参照されている**ことがあります。ブロックを丸ごと退避すると本体からその番号が消え、参照が宙に浮きます。compass を retrofit するときは、**参照されている番号付き項目は本体に残し、`status: archived` タグだけ付けて区別する**（move せずタグだけ）か、見出しと導入文だけを退避するに留めるのが安全です。intent-tree の Impact Analysis（番号を持たず参照されない）とは扱いが違います。

retrofit は急ぎではありません。やらなくても既存プロジェクトは従来どおり動きます（肥大化が残るだけ）。今後の `/intent-writeback` 完了時には、新しい退避規律が「完結機能の履歴を退避しますか」と促すので、機能を1つ仕上げるたびに少しずつ退避していくこともできます。

## AI ツール別のメモ

仕組みはエージェント非依存（`.intent/` は共通）ですが、入口の文書とインストールコマンドだけが異なります。

| | インストール | 入口の文書 | スキルの置き場 |
|---|---|---|---|
| **Claude Code** | `npx intent-planner` | `CLAUDE.md`（本体は別ファイル、参照1行を追記） | `.claude/skills/intent-*/` |
| **Codex** | `npx intent-planner --agent codex` | `AGENTS.md`（末尾に節を追記） | `.codex` 配下の skill ツリー |
| **Gemini CLI** | `npx intent-planner --agent gemini` | `GEMINI.md`（本体は別ファイル、参照1行を追記） | Codex と同じ skill ツリーを共有して読む |

- 既存の `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` があっても**上書きしません**。確認のうえ非破壊で追記します（既存内容は変更しません）。非対話環境では追記を見送り、`--yes` で同意を前渡しできます。
- **Gemini CLI** は専用のスキルツリーを持たず、Codex 用に配置されたスキルツリーを cross-tool alias 経由で読みます。そのため Gemini 向けに別途スキルファイルが増えるわけではありません（入口文書 `GEMINI.md` だけが Gemini 固有）。
- 複数の AI を併用している場合は、それぞれの `--agent` で実行すれば各入口文書が揃います（`.intent/` 本体は共通なので二重に増えません）。

## 困ったときに見る場所

- インストールのオプション詳細: [docs/guide.md のインストール節](guide.md#インストールのオプション)
- 設計の背景（なぜ履歴を退避するのか・なぜ DB を使わないのか）: [docs/theory.md の「保管構造」節](theory.md)
- 退避規律そのもの: `.intent/intent-tree.history.md` / `.intent/compass-history.md` の冒頭
