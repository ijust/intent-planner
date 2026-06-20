---
name: intent-release-note
description: git のコミット履歴を read-only で読み、各コミットを意図（packet name / parent intent / deltas / milestones）とテキスト照合して「なぜ変わったか」を厚くした release note を、format（changelog 風 / github-releases 風）で `.intent/release-note/` 配下へ派生出力する外向きの射影スキル。git・canonical は一切変更しない（read-only）。紐づかないコミットは薄い行で残し、意図と現実の落差を可視化する。
allowed-tools: Read, Glob, Grep, Bash, Write
argument-hint: <git range・format>（既定 range = 直近 tag〜HEAD。`<from>..<to>` 指定可。format 無指定なら既定（changelog）を用い、どの format で生成したかを出力に明示する）
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

### Step 3: コミット↔intent のテキスト照合（断定せず候補提示）
- 各コミットを intent と**テキスト照合**する。照合素材の優先順位は (1) packet name → (2) parent intent → (3) deltas → (4) milestones。`.intent/` 配下（`packets/`・`intent-tree.md`・`intent-compass.md`・`deltas.md`・`milestones.md`）の記載とコミットメッセージを、**ファイルから機械観測できる範囲**で照合する。
- いずれかにテキスト照合できたコミットには「なぜ（その意図のため変わったか）」を添える。複数該当時は最上位の素材を採る。
- 照合は既存 `intent-status` の温度と同型: **機械スコアリング・閾値・新判別軸を持たず**（AD23）、確信が低いときは**断定せず候補として提示**する（照合不能＝常態として誤検出を許容する）。
- どれとも照合できないコミットは**薄い changelog 行で残す**（黙って捨てない・AD22）。

### Step 4: format 写像（既定なら format を明示）
- `rules/format-select.md` に従って format を確定する。引数 `changelog` / `github-releases`、無指定なら既定（changelog）を用い、**どの format で生成したかを出力に明示する**。
- 確定した format の出力構造ルール（`rules/format-changelog.md` または `rules/format-github-releases.md`）へ、Step 3 の照合済み素材（紐づくコミットの「なぜ」付き + 紐づかないコミットの薄い行）を渡して組み立てる。
- target format を本文へハードコードしない（rules に委譲・AD24）。出力構造そのものは format-* ルールの責務であり、本 SKILL は git 読み・照合・委譲を担う。

### Step 5: 派生 Write（`.intent/release-note/` へ全置換）
- 組み上がった release note を `.intent/release-note/release-note.md` へ **全置換**で Write する（派生・再生成可能）。
- 書込み先は `.intent/release-note/` 配下に限定する。canonical（intent-tree / compass / packets）・git の状態を一切変更しない（INV16 / INV17）。
- 対象 range にコミットが1件も無いときは、空である旨を出力に明示し canonical / git を変更しない。

## Output Description
- 出力の冒頭で対象 range（fallback したならその注記）と format（既定を用いたならその明示）を示す。
- 本体は選択した format の出力構造（changelog 風 = 種類別カテゴリ / github-releases 風 = 物語＋変更一覧）に従う（`rules/format-*.md` の構成）。
- 意図に紐づくコミットは「なぜ」付き、紐づかないコミットは薄い行で並べ、落差が読み取れる形にする。

## Safety & Fallback
- **read-only の所有境界**: git は読むだけ（Step 2 の allowlist のみ）。commit / tag 作成 / push / working tree・ref を変更する操作をしない（INV16）。
- **派生出力の所有境界**: 書込みは `.intent/release-note/` 配下のみ。canonical を書き換えない（INV17）。
- **照合の所有境界**: テキスト照合のみ（機械スコアリングを持たない・AD23）。落差を落とさない（薄い行で残す・AD22）。
- **format の所有境界**: 出力構造は `rules/format-*.md` に委譲し、本文へハードコードしない（AD24）。format-* の出力構造を変更しない（seam 確定済み）。
- **異常系**: tag 不在 → fallback + 注記。不正 range → 明示エラーで生成しない。空 range → 空を明示。いずれも git / canonical を変更しない。
