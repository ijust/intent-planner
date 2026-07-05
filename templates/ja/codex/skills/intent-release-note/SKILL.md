---
name: intent-release-note
description: git コミット履歴を read-only で読み、各コミットを意図と照合して「なぜ変わったか」を厚くした release note を `.intent/release-note/` へ派生する外向き射影スキル。
---

# intent-release-note Skill

## Core Mission
- **Success Criteria**:
  - 指定 range（既定 = 直近 tag〜HEAD、引数で `<from>..<to>` 指定可・fallback 付き）の git log を **read-only** で読む（commit / tag 作成 / push をしない）。
  - 各コミットを意図（packet name / parent intent / deltas / milestones）と**テキスト照合**し、紐づいたものには「なぜ（どの意図のため変わったか）」を添える。
  - 照合できないコミットは薄い changelog 行で並べ、**意図と現実の落差を可視化**する（黙って捨てない）。
  - format（`rules/format-changelog.md` / `rules/format-github-releases.md` を引数で選択）に従って `.intent/release-note/` 配下へ派生出力する（全置換再生成）。
  - canonical（intent-tree / compass / packets）・git の状態を一切変更しない（INV16 / INV17）。

## Execution Steps

### Step 1: range 解釈（範囲を確定する）
- 利用者が `/intent-release-note` を実行したとき、まず引数の range 指定を `rules/source-scope.md` に従って解釈する。
- 既定（range 無指定）は **直近 tag〜HEAD**（`git describe --tags --abbrev=0` で直近 tag を求め `<tag>..HEAD`）。引数 `<from>..<to>` があればそれを用いる。
- 直近 tag が無く既定が解決できないときは全履歴へ **fallback** し、その旨を出力に注記する（Fail-Soft）。不正な range 引数は明示エラーとし、release note を生成しない。
- 範囲が確定したら Step 2 へ進む（range は引数 + 既定 + fallback で一意化し、対話補完に依存しない）。

### Step 2: git log の read-only 読取
- `rules/source-scope.md` の **read-only allowlist** に従い、確定した range のコミットを read-only で読む。
- 用いてよいのは読み取り系の `git log` / `git tag`（一覧）/ `git describe` / `git rev-list` / `git rev-parse` / `git show` のみ。
- **書き込み系（`git commit` / `git tag <name>` 作成 / `git push` / `git checkout` / `git switch` / `git reset` / `git restore` / `git merge` / `git rebase` / `git cherry-pick` 等）を一切叩かない**（INV16）。
- 各コミットのハッシュ・件名・本文・author・日時を素材として読み取る。

### Step 3: コミット↔intent の照合（実線＝trailer / 推測＝テキスト照合を区別）
- **まず Intent trailer を実線として読む（最優先・INV63）**: 各コミットメッセージ末尾の `Intent:` trailer（`Intent: <packet 名> (<packet_id>)` の形。`git log` の本文にそのまま現れる）を読む。trailer が指す packet 名または packet_id のどちらかが `.intent/packets/`（`active/` または `archive/`）の packet と一致したら、そのコミットは意図に**実線**で紐づくものとして扱い、「なぜ（その packet の意図のため変わったか）」を添える。名前と id のどちらで当たっても実線とする。
  - **参照先不明の trailer**: trailer はあるが指す packet が `.intent/packets/` に見当たらないときは、推測で補完せず「trailer あり・参照先不明」と明示し、下記のテキスト照合（推測）へ fallback する。
- **trailer が無ければテキスト照合（推測）へ fallback する**: trailer を持たないコミットは従来どおり intent と**テキスト照合**する。照合素材の優先順位は (1) packet name → (2) parent intent → (3) deltas → (4) milestones。`.intent/` 配下（`packets/`・`intent-tree.md`・`intent-compass.md`・`deltas.md`・`milestones.md`）の記載とコミットメッセージを、**ファイルから機械観測できる範囲**で照合する。複数該当時は最上位の素材を採る。
- **実線と推測を区別する（INV63・混同表示しない）**: trailer 由来の紐づき（実線＝コミット作成者が明示した対応）と、テキスト照合由来の紐づき（推測＝ツールが後から当てた対応）を出力で区別できる形にする。推測を実線と偽らない。
- 照合は既存 `intent-status` の温度と同型: **機械スコアリング・閾値・新判別軸を持たず**（AD23）、テキスト照合（推測）で確信が低いときは**断定せず候補として提示**する（照合不能＝常態として誤検出を許容する）。trailer 照合は packet 名 / packet_id の一致という機械観測で、スコアリングを伴わない。
- どれとも照合できないコミット（trailer も無くテキスト照合も不能）は**薄い changelog 行で残す**（黙って捨てない・AD22）。
- **trailer の有無はコミットの良し悪しではない**: trailer が無いコミットを咎める・欠落を警告する出力をしない（trailer は任意・INV63）。区別は「実線か推測か」の情報提示であって、trailer 無しコミットの減点ではない。

### Step 4: format 写像（既定なら format を明示）
- `rules/format-select.md` に従って format を確定する。引数 `changelog` / `github-releases`、無指定なら既定（changelog）を用い、**どの format で生成したかを出力に明示する**。
- 確定した format の出力構造ルール（`rules/format-changelog.md` または `rules/format-github-releases.md`）へ、Step 3 の照合済み素材（紐づくコミットの「なぜ」付き + 紐づかないコミットの薄い行）を渡して組み立てる。
- target format を本文へハードコードしない（rules に委譲・AD24）。出力構造そのものは format-* ルールの責務であり、本 SKILL は git 読み・照合・委譲を担う。

### Step 5: 派生 Write（`.intent/release-note/` へ全置換）
- 組み上がった release note を `.intent/release-note/release-note.md` へ **全置換**で Write する（派生・再生成可能）。
- 書込み先は `.intent/release-note/` 配下に限定する。canonical（intent-tree / compass / packets）・git の状態を一切変更しない（INV16 / INV17）。
- 対象 range にコミットが1件も無いときは、空である旨を出力に明示し canonical / git を変更しない。

## Output Description

> **出力先はターミナルである。** 出力には raw HTML（`<details>` / `<summary>` 等の折りたたみ UI）を使わず、詳細は素の Markdown 見出しで区切って退避する（ターミナルでは生タグがそのまま表示され読めなくなるため）。`[[...]]`（memory / delta 用の wikilink 等）の内部記法は、delta / memory ファイルへの記録では正当だが、人向けのターミナル出力ではそのまま出さず普通の語に開く（リンク先の名前を自然文で綴る）。

- 出力の冒頭で対象 range（fallback したならその注記）と format（既定を用いたならその明示）を示す。
- 本体は選択した format の出力構造（changelog 風 = 種類別カテゴリ / github-releases 風 = 物語＋変更一覧）に従う（`rules/format-*.md` の構成）。
- 意図に紐づくコミットは「なぜ」付き、紐づかないコミットは薄い行で並べ、落差が読み取れる形にする。
- 紐づきは**実線（Intent trailer 由来＝作成者が明示）と推測（テキスト照合由来＝ツールが後から推定）を区別**して示す（実線と推測を混同表示しない・INV63）。区別は情報提示であり、trailer が無いコミットを咎めない（trailer は任意）。

## Safety & Fallback
- **read-only の所有境界**: git は読むだけ（Step 2 の allowlist のみ）。commit / tag 作成 / push / working tree・ref を変更する操作をしない（INV16）。
- **派生出力の所有境界**: 書込みは `.intent/release-note/` 配下のみ。canonical を書き換えない（INV17）。
- **照合の所有境界**: Intent trailer の実線照合（packet 名 / packet_id の一致）＋テキスト照合の推測（機械スコアリングを持たない・AD23）。実線と推測を混同表示しない（INV63）。trailer 無しリポでは trailer 照合が空振りし従来のテキスト照合のみで動く＝従来出力と一致（behavior-preserving）。落差を落とさない（薄い行で残す・AD22）。trailer は任意でありその有無を咎めない。
- **format の所有境界**: 出力構造は `rules/format-*.md` に委譲し、本文へハードコードしない（AD24）。format-* の出力構造を変更しない（seam 確定済み）。
- **異常系**: tag 不在 → fallback + 注記。不正 range → 明示エラーで生成しない。空 range → 空を明示。いずれも git / canonical を変更しない。
