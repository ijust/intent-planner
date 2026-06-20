---
name: intent-release-note
description: git のコミット履歴を read-only で読み、各コミットを意図（packet name / parent intent / deltas）とテキスト照合して「なぜ変わったか」を厚くした release note を、format（changelog 風 / github-releases 風）で `.intent/release-note/` 配下へ派生出力する外向きの射影スキル。git・canonical は一切変更しない（read-only）。【本ファイルは seam 段の受け皿（placeholder）であり、git log 読み・intent 照合・変換ロジックの本実装は後続の skill packet で付加される。】
allowed-tools: Read, Glob, Grep, Write
argument-hint: <git range・format>（既定 range = 直近 tag〜HEAD。`<from>..<to>` 指定可。format 無指定なら既定を用い、どの format で生成したかを出力に明示する）
---

# intent-release-note Skill（seam placeholder）

> **本ファイルは seam 段の受け皿（placeholder）である。** release note 機能は Additive Slicing で seam → skill → wire の順に積まれる。本 seam packet は「派生出力先 `.intent/release-note/` の scaffold」「`format-changelog` / `format-github-releases` の出力構造定義（rules）」「利用者プロジェクトへの Git 非追跡結線（install.mjs）」までを置く。**git log の読み取り・コミットの intent 照合・変換ロジック・source-scope の解釈は本ファイルにまだ実装されておらず、後続の skill packet で付加される。**

## Core Mission（to-be。skill packet で実装する）

- **Success Criteria（予定）**:
  - 指定 range（既定 = 直近 tag〜HEAD、引数で `<from>..<to>` 指定可・fallback 付き）の git log を **read-only** で読む（commit / tag / push をしない）。
  - 各コミットを意図（packet name / parent intent / deltas / milestones）と**テキスト照合**し、紐づいたものには「なぜ（どの意図のため変わったか）」を添える。
  - 照合できないコミットは薄い行で並べ、**意図と現実の落差を可視化**する（黙って捨てない）。
  - format（`rules/format-changelog.md` / `rules/format-github-releases.md` を引数で選択）に従って `.intent/release-note/` 配下へ派生出力する（全置換再生成）。

## 不変条件（seam の時点で守られている前提）

- **read-only（INV16）**: git を読むだけで書き換えない。canonical（intent-tree / compass / packets）も書き換えない。
- **派生出力（INV17）**: 出力先は `.intent/release-note/`（git 非追跡・read-only）に限定する。canonical 化しない。
- **format 分離（DR8 / AD24 回避）**: 出力構造は `rules/format-*.md` に分離されており、本文へハードコードしない。
- **落差を落とさない（AD22）**: 紐づかないコミットを薄い行で残す。

## 参照

- 出力構造の定義: `rules/format-changelog.md`（Keep a Changelog 風）/ `rules/format-github-releases.md`（GitHub Releases 風）。
- 出力先の性質: `.intent/release-note/README.md`（派生・非追跡・read-only・正本でない）。
