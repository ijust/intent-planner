---
name: intent-db-design
description: 永続データモデルを設計する packet から、意図・invariant・既存スキーマを read-only で読み、テーブル定義/制約/索引/命名の設計叩き台を `.intent/db-design/` へ派生する射影スキル。
---

# intent-db-design Skill

## Core Mission
- **Success Criteria**:
  - 永続データモデルを設計する責務を負う対象 packet 1つを起点に、対象 packet の意図 / Scope・compass の Invariants/Anti-direction・既存スキーマ/migration（Grep）の三層を read-only で読み込んでいる（R1.1）
  - 入力範囲を対象 packet 1つ・compass の Invariants/Anti-direction・既存スキーマ/migration に限定し、Intent Tree 全文および対象外の packet を読み込んでいない（R1.3）
  - 三層入力からテーブル定義・制約・インデックス・命名を含む DB 設計（叩き台）を生成している（R1.2）。既存スキーマが Grep で同定できないとき（新規 DB 等）は既存スキーマ入力を空のまま意図と invariant のみから射影している（R1.4）
  - 生成 DB 設計の各記述に射影元（対象 packet / compass invariant / 既存スキーマ）への帰属を示すトレース注記を付与し、いずれにも帰属しない記述を `inferred`、既存スキーマを同定しきれず確認できない記述を `unverified` として標識し、確定（射影元由来）と混在させていない（R2.1 / R2.2）。すべての記述を `対象 packet` / `compass invariant` / `既存スキーマ` / `inferred` / `unverified` のいずれかに帰属させている（トレース率 100%・R2.3）
  - 出力を後続の intent-validate が実装スキーマ（migration/DDL）と項目単位で突合できる構造化された形式（`## テーブル:` 見出し＋カラム表）で出力し、テーブル定義・制約・インデックス・命名を突合可能な単位で識別できる形にしている（R4.1 / R4.2）
  - 出力を `.intent/db-design/<packetスラッグ>/` 配下の派生物としてのみ書き込み、canonical な成果物（intent-tree・intent-compass・packets）・既存スキーマ・export 下書きを一切変更していない。出力を `.intent/cc-sdd/`・`.intent/openspec/`（export 物）に書き込んでいない（R3.1 / R3.2 / R3.3）
  - 対象 packet が引数または利用者確認で一意に特定できるときその packet のみを対象とし、特定できないときは推測で対象を補わず対象指定を求めて停止している（R5.1 / R5.2）。既存スキーマの一部が同定できないときは同定できた範囲のみを入力に用い、同定できなかった旨を報告している（R5.3）
  - 自動起動・状態機械・他スキルを起動する結線を持たず、発動を人間の手動操作に限り、永続ストアを導入せず実行時に外部サービスへ接続していない（R6.4 / R6.5）

## Execution Steps

### Step 1: 対象 packet 特定・三層入力（曖昧/不在なら停止する）
- 利用者が `/intent-db-design <対象 packet>` を実行したとき、まず対象 packet の特定と三層（意図 / invariant / 既存スキーマ）の read-only 読み取りを `rules/db-design-input.md` に従って行う。
- **対象特定（曖昧ゲート・R5.1 / R5.2）**: 引数で対象 packet が一意に定まるならその packet のみを対象にする。引数で一意に定まらないときは `.intent/packets/index.md` から候補を提示し、利用者に自然言語で問うて確定する（回答を待つ）。引数でも対話でも一意化できないとき、または指定された packet が存在しないときは、**推測で対象を補わず停止**し、何が曖昧か（または不在か）を名指しして対象指定を求める。停止中は書き込みを行わない。
- **三層読取（入力範囲限定・R1.1 / R1.3）**: 対象 packet 1つの意図 / Scope / Expected Behavior / Safety・`.intent/intent-compass.md` の Invariants/Anti-direction・既存スキーマ/migration（Grep 同定）に限定して読む。Intent Tree 全文・対象外 packet は読まない。
- **既存スキーマ同定（網羅でなく同定範囲＋報告・R1.4 / R5.3）**: migration/DDL/ORM スキーマを Grep で素直に探し、同定できた範囲のみを既存スキーマ入力に採用する。一部が同定できないときは同定できなかった旨を報告し、捏造で埋めない。既存スキーマがまったく同定できないとき（新規 DB 等）は既存スキーマ入力を空のままにし、意図と invariant のみから射影する。
- 範囲と素材が確定したら Step 2 へ進む。

### Step 2: DB 設計を射影（テーブル/制約/インデックス/命名）
- Step 1 が読み取った三層素材を、`rules/db-design-projection.md` の出力形式に従って DB 設計の叩き台へ写像する。
- 後続 validate が実装スキーマと項目単位で diff できる machine-diffable な Markdown 構造（frontmatter＋`## テーブル: <name>` 見出し＋`| カラム | 型 | 制約 | 由来 |` の4列固定表＋インデックス＋命名規則）で組み立てる。テーブル＝見出し、カラム＝表の行が突合単位である。
- 構造に埋め込むのは突合可能な識別子と帰属までであり、正規化妥当性・欠落インデックス・命名一貫性などの意味判断は構造に落とさない（INV2）。本形式は凍結された契約ではなく最小限の突合可能性を満たす暫定形式である。

### Step 3: 射影元トレース・inferred / unverified 標識（捏造照合）
- `rules/db-design-fabrication-guard.md` に従い、射影した DB 設計が射影元を超えて捏造していないかを照合する。
- 各記述（テーブル定義・カラム・制約・インデックス・命名規則）を射影元（対象 packet / compass invariant / 既存スキーマ）へ辿れる形でトレースする（R2.1）。
- いずれの射影元にも根拠が見当たらないことを確認した記述は `inferred`、既存スキーマを同定しきれず確認できていない記述は `unverified` として区別して標識し、確定（射影元由来）と混在させない（R2.2）。実在するものを同定漏れで `inferred` と誤標識しないよう、どちらとも確信が持てないときは `unverified` に倒す。
- すべての記述を `対象 packet` / `compass invariant` / `既存スキーマ` / `inferred` / `unverified` のいずれかに帰属させ、帰属不明の記述を残さない（トレース率 100%・R2.3）。補完した（inferred / unverified）箇所の一覧を出力末尾に確認用として提示する（警告であり射影を止めない）。

### Step 4: 派生 Write（`.intent/db-design/<slug>/` へ）
- すべての読み取り・射影・照合が終わってから、**最後に** 生成した DB 設計を `.intent/db-design/<packetスラッグ>/db-design.md` へ書き込む。スラッグは `rules/db-design-projection.md` のスラッグ規則（`packet-format.md` および export 系と同一）で対象 packet 名から決定的に導出する。
- **衝突規則（R3.4）**: スラッグが既存ディレクトリと一致し、かつその `db-design.md` の `source_packet` が**異なる** packet を指す場合のみ衝突とし、`-2` から始まる連番で別名を割り当て、対応を利用者に告知する（黙って上書きしない）。**同一** packet 名を指す場合は再生成として同ディレクトリを更新する。
- 出力の冒頭に、本 DB 設計が派生（derived）・再生成可能・Git 非追跡であり、**設計の叩き台であって要件ではない**こと、および `inferred` / `unverified` として標識した記述は利用者の確認まで暫定であることを明示する。
- canonical な `.intent/*.md`（intent-tree / compass / packets）・既存スキーマ・export 下書き（`.intent/cc-sdd/` / `.intent/openspec/`）・アプリケーションコードには一切書き込まない。書込み先は `.intent/db-design/<packetスラッグ>/` 配下に限定する（R3.1 / R3.2 / R3.3）。

## Output Description

> **出力先はターミナルである。** 出力には raw HTML（`<details>` / `<summary>` 等の折りたたみ UI）を使わず、詳細は素の Markdown 見出しで区切る（ターミナルでは生タグがそのまま表示され読めなくなるため）。

- `.intent/db-design/<packetスラッグ>/db-design.md`（派生・再生成可能・Git 非追跡。設計の叩き台であって要件ではない旨を冒頭に明示）。構造は `rules/db-design-projection.md` に従い:
  - **frontmatter**: `source_packet`（対象 packet 名・正本キー）/ `generated_at`（ISO 8601）/ `projection_sources`（射影に用いた層）。
  - **テーブルごとの `## テーブル: <name>` 見出し**: 由来・カラム表（`| カラム | 型 | 制約 | 由来 |`）・インデックス（列・種別・由来）・命名規則（規約・由来）。テーブル＝見出し、カラム＝行が突合単位。
  - **inferred / unverified 一覧**: 出力末尾に「確認対象」として、どの記述が・どの理由で射影元に帰属しないか（`inferred`＝根拠なしを確認 / `unverified`＝未同定ゆえ未確認・実在しうる）を区別して並べる。
  - **トレース注記**: 各カラムの「由来」列・各テーブル/インデックス/命名規則の由来注記が射影元帰属を持つ。
- 素材が無い層は省略し理由（未記入／未観測／未同定）を明示する（推測で埋めない）。
- 既存スキーマの一部が同定できなかったときは、同定できなかった旨を報告に含める（R5.3）。

## Safety & Fallback
- **書込み境界**: 書込み先は `.intent/db-design/<packetスラッグ>/` 配下限定である。canonical な `.intent/*.md`（intent-tree / compass / packets）・既存スキーマ・export 下書きは read-only であり、そこへは作成・変更・削除を一切行わない（frontmatter の `Write` は `.intent/db-design/` 配下への書き込みのためにのみ許可される。R3.1 / R3.2）。
- **export 物に混ぜない**: 出力を `.intent/cc-sdd/` および `.intent/openspec/`（export 物・requirements）に書き込まない。本スキルの出力は**設計の叩き台であって要件ではない**ため、cc-sdd/openspec の export 物に混ぜない（R3.3）。
- **派生・正本ではない**: 生成物は派生（derived）・再生成可能であり正本ではない。この旨を出力の冒頭に明示し、canonical との二重正本を作らない。
- **捏造抑制（load-bearing 課題）**: トレースの付かない記述を確定として残さない（各記述は射影元へ辿れるか、さもなくば `inferred` / `unverified` 標識される）。`inferred`（根拠なしを確認）と `unverified`（未同定ゆえ未確認・実在しうる）を区別し、確定と混在させない。補完箇所は必ず確認用一覧として提示し、黙って本文へ溶かし込まない（R2.x）。
- **読み取りのみ**: 射影元（対象 packet / compass / 既存スキーマ・migration）は read-only で扱い、作成・変更・削除しない（R3.2）。
- **永続ストア・外部接続なし**: 永続ストア（データベース等）を導入せず、実行時に外部サービスへ接続しない。状態は frontmatter のスキーマ規律で持つ（INV2 / R6.5）。
- **手動発動・自動起動しない**: 発動は人間の手動操作に限る。本スキルは (1) 能動的に自身を起動するループを持たず、(2) 他スキルを起動する結線を持たず、(3) 状態機械を持たない（R6.4）。`/intent-db-design` は利用者が会話で起動する手動経路であり、intent-planner が自動で db-design を発火することはない。別 spec の status/packets が出す「おすすめ」は**コマンド文字列を提示するテキストであって Skill を invoke しない**ことで自動起動しないことが担保される。
- **外部依存ゼロ**（INV2）。外部パッケージ・AST パーサ・独自スキーマを導入せず、Node 標準と自然言語ヒューリスティクスに限定し、射影を自然言語のワークフロー内で完結させる。Grep と読み取りは LLM が成果物・スキーマを読んで解釈するものであり、判定ロジックを再実装しない（A1）。
- **アプリケーションコードを変更しない**（INV6）。
- **前提不在時**: 対象 packet が曖昧、または不在のとき、何も書き込まず不在/曖昧を名指しして対象指定を求めて止まる（fail-fast。R5.2）。
- **部分欠落時**: 既存スキーマの一部が同定できない層は「未同定」と明示し報告する。素材が読み取れない層は「未記入／未観測」と明示し省略する（推測で埋めない。R5.3）。
