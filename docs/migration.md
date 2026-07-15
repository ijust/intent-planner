# 移行ガイド — 旧バージョンからのアップグレード（Claude Code / Codex / Gemini CLI）

intent-planner を旧バージョンからアップグレードするときの手順です。**インストーラは既存の成果物を上書きしません。** そのため、新しく追加された仕組みを既存プロジェクトへ取り込むには、手作業が必要になる場合があります。このガイドでは、その手順と AI ツールごとの違いを説明します。

## まず確認すること：アップグレードで変わるもの、変わらないもの

```bash
# 使っている AI に合わせて、プロジェクトのルートで再実行する
npx intent-planner            # Claude Code（既定）
npx intent-planner --agent codex
npx intent-planner --agent gemini

# 先に差分だけ見たいとき（何も書き込まない）
npx intent-planner --dry-run
```

インストーラはファイルを2種類に分けて扱います。

- **利用者が作成した成果物（user-data）** — `.intent/intent-tree.md`、`.intent/intent-compass.md`、`.intent/packets/`、各種ログ、`.intent/glossary.md` などの正本です。すでに存在するファイルは上書きしません。`--force` を明示した場合だけ上書きされます。通常のアップグレードでは、意図ツリーや判断基準はそのまま残ります。
- **intent-planner の配布ファイル（code）** — `intent-*` スキル本体、規則、参照ドキュメントです。こちらは新しい版へ更新されます。

つまり、**新しいスキルやルールは導入されますが、既存の `intent-tree.md` や `intent-compass.md` は変更されません**。このため、新しい保存形式を既存の成果物にも適用したい場合は、次の「後付け移行」が必要です。

## このバージョンの変更点と、既存プロジェクトへの後付け移行

このバージョンでは、正本である intent-tree / intent-compass が機能追加のたびに大きくなるのを抑える仕組みが加わりました。要点は3つです。

1. **履歴の保管先** — 完了した機能の履歴（Impact Analysis やプレモータムから導いた内容など）を本体から移すために、`.intent/intent-tree.history.md` と `.intent/compass-history.md` が追加されました。覆された Decision Rules 専用の `.intent/compass-archive.md` とは別のファイルです。
2. **状態を示すタグ** — 現在使っている内容か保管済みかを、frontmatter の `status: active | archived` で区別し、`grep` で検索できます。
3. **実装から得た学びの反映先** — `/intent-writeback` が実装から読み取った学び（implicit-behavior など）は、intent-tree の L3 ではなく、**関係する packet の `## Expected Behavior`** に反映されるようになりました。

### 新規プロジェクト（まだ `.intent/` が無い）

`npx intent-planner` を実行すれば、空の退避先ファイルと検索タグの仕組みが最初から入ります。何もする必要はありません。

### 既存プロジェクト（すでに `.intent/` を使っている）

アップグレードすると、空の履歴ファイルと新しい保管ルールは追加されます。ただし、既存の `intent-tree.md` / `intent-compass.md` に蓄積済みの履歴は、本体に残ったままです。インストーラが利用者のデータを上書きしないためです。既存ファイルも小さくしたい場合は、履歴を保管先へ移す作業を一度行います。

後付け移行は、次のどちらかの方法で行えます。手順はどの AI ツールでも同じです。

- **AI に任せる（推奨）**: 使っている AI（Claude Code / Codex / Gemini CLI）に、次のように頼みます。

  > `.intent/intent-tree.md` に蓄積した、完了済み機能の履歴（`## Impact Analysis（…）`、役割を終えた `## 機能追記:`、`## L4 Candidate Packets` の出荷済み項目）を `.intent/intent-tree.history.md` へ移してください。`.intent/compass-history.md` も同じように整理してください。**文章の編集はせず、見出し・番号・本文を保ったまま場所だけを移してください。** 移した各ブロックの見出し直後に `> status: archived | archived_at: <日時> | from: intent-tree.md` を1行追加し、現在使っているセクションには `> status: active` を追加してください。

  履歴ファイルの冒頭にも、「文章を編集せず、場所だけを移す」という同じ規則が書かれています。

- **手で行う**: 履歴ファイル（`.intent/intent-tree.history.md` / `.intent/compass-history.md`）の冒頭にある手順に従い、完了済み機能の履歴を本体から切り取って、履歴ファイルの末尾へ移します。本体に残すセクションには `> status: active`、移したブロックには `> status: archived` を付けます。

> **注意：compass では、移す単位に気をつけてください。** `intent-compass.md` のプレモータムから導いたブロック（`### <機能> 固有（プレモータム: …）`）には、番号付きの Anti-direction 項目が含まれます。現在使っている Invariant / Decision Rule が「Anti-direction 92」のように参照している場合、ブロック全体を移すと参照先が本体から消えてしまいます。参照されている番号付き項目は本体に残し、`status: archived` だけを付けるか、見出しと導入文だけを移してください。番号を持たず、ほかから参照されない intent-tree の Impact Analysis とは扱いが異なります。

この移行は急ぐ必要がありません。行わなくても既存プロジェクトは従来どおり動きます。本体の大きさが気になった時点でまとめて移すことも、今後 `/intent-writeback` を終えるたびに少しずつ移すこともできます。

## AI ツール別のメモ

仕組みはエージェント非依存（`.intent/` は共通）ですが、入口の文書とインストールコマンドだけが異なります。

| | インストール | 入口の文書 | スキルの置き場 |
|---|---|---|---|
| **Claude Code** | `npx intent-planner` | `CLAUDE.md`（本体は別ファイル、参照1行を追記） | `.claude/skills/intent-*/` |
| **Codex** | `npx intent-planner --agent codex` | `AGENTS.md`（末尾に節を追記） | `.agents/skills/intent-*/` |
| **Gemini CLI** | `npx intent-planner --agent gemini` | `GEMINI.md`（本体は別ファイル、参照1行を追記） | `.agents/skills/intent-*/` を Codex と共有 |

- 既存の `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` があっても**上書きしません**。確認のうえ非破壊で追記します（既存内容は変更しません）。非対話環境では追記を見送り、`--yes` で同意を前渡しできます。
- **Gemini CLI** は intent-planner の専用スキルツリーを別に持たず、Codex と同じ `.agents/skills/` を読みます。そのため、Gemini 向けに intent-planner のスキルファイルが重複して増えることはありません。入口文書の `GEMINI.md` だけが Gemini 固有です。
- 複数の AI を併用している場合は、それぞれの `--agent` で実行すれば各入口文書が揃います（`.intent/` 本体は共通なので二重に増えません）。

## 困ったときに見る場所

- インストールのオプション詳細: [docs/guide.md のインストール節](guide.md#インストールのオプション)
- 設計の背景: [docs/theory.md](theory.md)

### compass を1項目1ファイルの形式へ移行する

従来の単一ファイル `.intent/intent-compass.md` から、`.intent/compass/`（1項目1ファイル）へ移す場合は、次の手順を行います。移行は任意（opt-in）で、インストーラが自動で実行することはありません。

1. git 管理下なら先に作業ツリーをコミットします。git 管理外・部分追跡なら `.intent/` の複製を別場所へ取り、復元用に保持します（DR132）。
2. 従来の本文から対象項目を取り出して配置します（例: `sed -n '/^# INV1/,/^# /p' .intent/intent-compass.md > .intent/compass/INV1.md`）。frontmatter の `id`・`area`・`status` と `## Law` を補い、`index.md` に `- INV1` を追加します。従来の単一ファイルは削除しません。
3. 利用するスキルを一度実行し、`index.md`、対象項目の `## Law` の順で読まれることを確認します。分割形式に項目がない場合は、従来の単一ファイルが読まれることも確認します。
4. 途中で止める場合はそのまま戻して構いません。git 管理下は revert、非管理は複製から復元します。

この手順は、intent-planner 自身を使った検証用プロジェクトで実行済みです。旧単一ファイル形式だけを使う環境も引き続きサポートされるため、移行しなくても動作は変わりません。

### intent-tree の案件記録を1案件1ファイルの形式へ移行する

`.intent/intent-tree.md` の末尾に蓄積した**案件記録**（`## 機能追記:` / `## 機能撤去:` / `## 履歴:` / `## 再起案:`）を、`.intent/tree/`（1案件1ファイル）へ移す場合は、次の手順を行います。`## L0`〜`## L4`、製品の検証仮説、画面ラフへの参照、`## Open Questions` などの骨格は本体に残します。compass と同様に移行は任意で、インストーラは自動実行しません（INV3）。

1. git 管理下なら先に作業ツリーをコミットします。git 管理外・部分追跡なら `.intent/` の複製を別場所へ取り、復元用に保持します（DR132）。
2. 本体の各案件記録（`## 機能追記: <feature>（…）` から次の案件見出しの直前まで）を1案件ずつ取り出し、`.intent/tree/<feature>.md` として配置します。`<feature>` には、見出しの `機能追記:` に続く名前を使います。先頭に frontmatter（`feature` / `status: active` / `kind`）を追加し、見出しを含む本文は**要約や言い換えをせず、元のバイト列を保ったまま**移します（INV80）。`index.md` には `- <feature> [<kind>] active — <要旨1行>` を追加します。移動後、本体からその案件記録だけを取り除き、骨格は残します。
3. 見出しと本文が食い違い、別案件の記述が同じ節に混ざっている場合は、機械的に分割しないでください。本文がどの案件に属するかを目視で確認してから分けます。
4. 移行前の「本体末尾にある案件記録の全文」と、移行後の「`.intent/tree/` 配下にある全ファイルの本文を連結したもの」が、バイト単位で一致することを確認します。これにより、移動と同時に削除や言い換えをしていないことを確かめられます。また、`.intent/tree/` の全ファイルが Git の追跡対象であることも確認します。`git check-ignore .intent/tree/<任意のファイル>` が何も返さなければ、`.gitignore` の対象ではありません。
5. 利用するスキルを一度実行し、案件記録が `.intent/tree/index.md`、該当する `<feature>.md` の順で読まれることを確認します。`.intent/tree/` がない環境では、従来どおり本体末尾が読まれることも確認します（DR133）。
6. 途中で止める場合はそのまま戻して構いません。git 管理下は revert、非管理は複製から復元します。

この手順は、intent-planner 自身への適用で実際に確認済みです。30件の案件記録を32ファイルへ移し、見出しと本文が食い違っていた1節は、内容を確認して3つに分けました。従来の形式だけを使う環境も引き続きサポートされるため、移行しなくても各スキルの動作は変わりません（DR133）。

- 設計の背景（なぜ履歴を退避するのか・なぜ DB を使わないのか）: [docs/theory.md の「保管構造」節](theory.md)
- 退避規律そのもの: `.intent/intent-tree.history.md` / `.intent/compass-history.md` の冒頭
- 分割形式の規則: `.intent/tree/README.md`（1案件1ファイル・全ファイルを Git で追跡・読み取り時の扱い）
