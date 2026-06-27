---
name: intent-to-spec
description: 指定範囲の Intent・steering・packets を read-only で読み、指定フォーマットの読める自然言語 Spec を `.intent/nl-spec/` へ写像する外向き生成スキル。
---

# intent-to-spec Skill

## Core Mission
- **Success Criteria**:
  - 利用者が指定した範囲（source scope: Intent サブツリー / packet 群 / steering 制約 / 横断 requirements）の `.intent/` 成果物のみを素材として read-only で読み、三層（Intent の why/不変則/判断基準 / steering 級の制約 / requirements の個別要求）を横断的に束ねている（R1.1 / R1.2）
  - source scope が曖昧、または該当する成果物が不在のとき、自然言語 Spec を生成せず、何が曖昧か（利用可能な範囲）または不足している成果物（用意する該当スキル）を利用者に示して止まっている（R1.3）
  - 射影元（intent-tree / compass / packets / steering）を read-only で扱い、作成・変更・削除していない（R1.4）
  - 指定された target format（why 前面の上流向け / requirements 横断の統合仕様書 / その中間）に従って自然言語 Spec を構成し、format が無指定なら既定を用い、どの format で生成したかを出力に明示している（R2.1 / R2.4）
  - 生成した各記述を、それがどの射影元（どの Intent の L層 / どの compass 節 / どの packet / どの制約）に由来するか辿れる形でトレース可能にしている（R3.1）
  - 射影元に対応する根拠がない記述を inferred として標識し、確定（canonical 由来でトレースの付く記述）と混在させていない（R3.2）。射影元を超えて補完した箇所を利用者が確認できる一覧として提示している（R3.3）
  - 射影元に存在する不変則・制約を、生成 Spec の中で省略・改変せず保持している（R3.4）
  - 生成物を派生（derived・再生成可能）として `.intent/nl-spec/` 配下へ全置換で出力し、canonical な成果物（intent-tree / compass / packets）を作成・変更・削除していない。出力の冒頭に派生・再生成可能・正本ではない旨を明示している（R4.1 / R4.2 / R4.3）
  - 意図計画フェーズにおいてアプリケーションコードを変更していない（R4.4）。命名規約 `intent-*` に従い、外部 spec ツール・kiro-* 開発環境を変更せず、`map-cc-sdd.md` を呼ばず `/intent-export-cc-sdd` の振る舞いを変更していない（R5.5）

## Execution Steps

### Step 1: source 解釈（範囲を確定する。曖昧/不在なら生成しない）
- 利用者が `/intent-to-spec` を実行したとき、まず引数の範囲ヒントと format 指定を `rules/source-scope.md` に従って解釈する。範囲が引数だけで一意に定まらない軸は、利用者に自然言語で問い、回答を待ってから確定する（推測で埋めない）。
- **生成しないゲート（fail-fast。R1.3）**: source scope が曖昧（引数でも対話でも軸が一意に定まらない）、または該当成果物が不在（指定された intent-tree / compass / packet / steering が存在しない・未記入）のときは、自然言語 Spec を**生成せず**、`.intent/nl-spec/` 配下に一切書き込まない。何が曖昧か（利用可能な範囲: 実在するサブツリー・packet 一覧・steering の有無）、または不足している成果物（用意する該当スキル: discover / compass / packets 等）を名指しして提示し、止まる。
- 範囲が確定したら Step 2 へ進む。

### Step 2: 三層読取（read-only で三層を読む）
- `rules/source-scope.md` の「三層の読み取り（正確な参照・固定）」表に従い、確定した範囲について三層を横断的に read-only で読み取る。
- Intent の why/不変則/判断基準（`.intent/intent-tree.md` の L0–L4 / `.intent/intent-compass.md` の North Star・Invariants・Anti-direction・Decision Rules）、steering 級の制約（指定時のみ tech.md 等）、requirements の個別要求（`.intent/packets/index.md` ＋ `.intent/packets/active/*.md`）を、ひとつの文書の素材として束ねる。
- canonical 由来の素材と inferred 由来の素材（intent-tree の Assumptions / Open Questions）は、読み取りの段階で区別したまま保持し、混在させない。範囲外の成果物は読まない。射影元は read-only で扱い変更しない（R1.4）。

### Step 3: target format 写像（既定なら format を明示する）
- 確定した target format に従って、Step 2 が束ねた三層の素材を、どの層・どの見出し・どの packet 由来かの由来を保ったまま、ひとつの自然言語 Spec へ写像する。
- **上流向け（why 前面）**のときは `rules/format-upstream.md`、**統合仕様書（requirements 横断）**のときは `rules/format-integrated.md` に委譲する。中間 format は両ルールの度合い調整として表現し、別ルールを増やさない。
- **format 無指定のとき（R2.4）**: 既定の format を用い、**どの format で生成したか**（既定として上流向け / 統合仕様書のいずれを用いたか）を出力に明示する。黙って既定を選ばない。
- 写像は本スキルの format 系ルールに委譲する。`map-cc-sdd.md` は**呼ばない**（cc-sdd 写像は export-cc-sdd の所有であり、本スキルは touch しない）。

### Step 4: 捏造照合（トレース付与・inferred 標識・不変則保持）
- `rules/fabrication-guard.md` に従い、format 写像が組み上げた自然言語 Spec が射影元を超えて捏造していないかを照合する。
- 各記述を射影元（どの Intent の L層 / どの compass 節 / どの packet / どの制約）へ辿れる形でトレースする（R3.1）。射影元に根拠のない記述は inferred として標識し、確定と混在させない（R3.2）。射影元の不変則・制約を省略・改変せず保持する（R3.4）。補完した（inferred）箇所の一覧を、利用者が確認できる形で提示する（R3.3。警告であり生成を止めるものではない）。

### Step 5: 派生 Write（`.intent/nl-spec/` へ全置換）
- すべての読み取り・写像・照合が終わってから、**最後に** 生成した自然言語 Spec を `.intent/nl-spec/<format>.md` へ**全置換**で書き込む（同 scope+format の再実行は全置換で冪等。R4.2）。
- 出力の冒頭に、本 Spec が派生（derived）・再生成可能であり・正本ではなく・Git 非追跡であること、および inferred として標識した記述は利用者の確認まで暫定であることを明示する（R4.3）。
- canonical な `.intent/*.md`（intent-tree / compass / packets）・steering（tech.md）・アプリケーションコードには一切書き込まない（R4.1 / R4.4）。書込み先は `.intent/nl-spec/` 配下に限定する。

## Output Description

> **出力先はターミナルである。** 出力には raw HTML（`<details>` / `<summary>` 等の折りたたみ UI）を使わず、詳細は素の Markdown 見出しで区切って退避する（ターミナルでは生タグがそのまま表示され読めなくなるため）。`[[...]]`（memory / delta 用の wikilink 等）の内部記法は、delta / memory ファイルへの記録では正当だが、人向けのターミナル出力ではそのまま出さず普通の語に開く（リンク先の名前を自然文で綴る）。

- `.intent/nl-spec/<format>.md`（派生・再生成可能・Git 非追跡。正本ではない旨を冒頭に明示）。内容は確定した target format に従い:
  - **上流向け**: 目的（why）→ 守るべき不変則・制約 → 判断基準 → 個別の要求 → 前提・未確定（inferred 別枠、あれば）の順（`rules/format-upstream.md` の構成に従う）。
  - **統合仕様書**: 概要 → 前提となる不変則・制約 → 統合要求と受入条件 → 前提・未確定（inferred 別枠、あれば）の順（`rules/format-integrated.md` の構成に従う）。
  - **format 既定明示**: format が無指定だったときは、どの format（既定）で生成したかを出力に明示する（R2.4）。
  - **トレース・inferred 標識**: 各記述に射影元への参照を付与し、射影元に根拠のない記述は inferred として確定と別枠・別標識で置く。
  - **補完箇所の確認用一覧**: inferred として標識した記述を、どの記述が・どの理由で補完されたか名指しした一覧として併記する。
- 素材が無い層・セクションは省略し理由（未記入／未観測）を明示する（推測で埋めない）。

## Safety & Fallback
- **書込み境界**: 書込み先は `.intent/nl-spec/` 配下限定である。canonical な `.intent/*.md`（intent-tree / compass / packets / mode 等）・steering（tech.md）・アプリケーションコードは read-only であり、そこへは作成・変更・削除を一切行わない（書き込みは `.intent/nl-spec/` 配下への派生物に限る。R4.1）。
- **派生・正本ではない**: 生成物は派生（derived）・再生成可能であり正本ではない。この旨を出力の冒頭に明示し、canonical との二重正本を作らない（R4.3）。
- **捏造抑制（外向きの load-bearing 課題）**: トレースの付かない記述を確定として残さない（各記述は射影元へ辿れるか、さもなくば inferred 標識される、のいずれか）。inferred を確定と混在させず、射影元の不変則・制約を省略・改変しない。補完箇所は必ず確認用一覧として提示し、黙って本文へ溶かし込まない（R3.x）。
- **写像の所有境界**: format 写像は本スキルの `rules/format-upstream.md` / `rules/format-integrated.md` に委譲し、`map-cc-sdd.md` を呼ばない。`/intent-export-cc-sdd`（source/format 固定の特殊ケース）の振る舞いを変更しない（R5.3 / R5.5）。
- **読み取りのみ**: 射影元（intent-tree / compass / packets / steering）は read-only で扱い、作成・変更・削除しない（R1.4）。
- **外部依存ゼロ**（INV2 / R5.1）。外部パッケージ・AST パーサ・独自スキーマを導入せず、Node 標準と自然言語ヒューリスティクスに限定し、射影を自然言語のワークフロー内で完結させる。
- **アプリケーションコードを変更しない**（INV6 / R4.4）。
- **命名・外部非変更**: 命名規約 `intent-*` に従い、外部 spec ツール・kiro-* 開発環境を変更しない（R5.5）。
- **前提不在時**: source scope が曖昧、または該当成果物が不在のとき、何も書き込まず不在/曖昧を明示し、利用可能な範囲または不足成果物（用意する該当スキル）を案内して止まる（fail-fast。R1.3）。
- **部分欠落時**: 素材が読み取れない層・セクションは「未記入／未観測」と明示し省略する（推測で埋めない）。
