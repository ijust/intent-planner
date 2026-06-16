# source scope 解釈手順（read-only・三層読み取り）

`intent-to-spec` skill が、利用者の指定した範囲（source scope）を解釈し、その範囲の三層（Intent / steering 制約 / requirements）を素材として読み取るための正本。SKILL.md は手順と報告形式のみを持ち、「どの範囲をどう解釈し、何をどの見出しから読み取るか」は本ルールを参照する。本ルールは射影元を**読むだけ**であり、canonical な `.intent/*.md`・packets・steering（tech.md 等）を一切変更しない（書き込みは `.intent/nl-spec/` 配下のみ、かつ本ルールの責務外）。

## posture（独自パーサを持たず `.intent/` を読んで解釈する）

範囲の解釈と三層の読み取りは、独自のパーサ・スキーマ・索引を持たず、LLM が `.intent/` の成果物を直接読んで行う。新しい構造を導入せず、既存成果物の見出し・列・frontmatter をそのまま素材として扱う。逆算・検査・drift の判定ロジックは再実装せず、それらが残した出力があれば読むだけである。

## 範囲の解釈（引数 + 対話補完）

利用者が `/intent-to-spec` に与えた引数を起点に、次の4軸で範囲を解釈する。引数だけで一意に定まらない軸は、利用者に問い、回答を待ってから確定する（推測で埋めない）。

| 軸 | 解釈すること | 既定（無指定のとき） |
|---|---|---|
| Intent サブツリー | intent-tree のどの階層・どの枝を素材にするか（L0–L4 のどこから下流まで） | 範囲が一意でなければ問う。曖昧なまま生成しない |
| packet 群 | どの packet を素材にするか（packet 名の列挙 / "all" / 状態での絞り込み） | 範囲が一意でなければ問う |
| steering 制約 | steering 級の制約（tech.md 等）を素材に含めるか | 含めない。明示指定（例: "+steering"）があるときのみ含める |
| 横断 requirements | 複数 packet を横断する個別 requirements のどの範囲を束ねるか | 上記 packet 群の指定に従う |

- 引数で範囲が一意に確定したら、対話補完は行わない（不要な問いを足さない）。
- 引数が一意に確定できないときは、確定できない軸だけを利用者に問い、回答を待ってから読み取りに進む。

## 三層の読み取り（正確な参照・固定）

確定した範囲について、次の三層を横断的に読み取り、ひとつの文書の素材として束ねる。各成果物の見出し・列・frontmatter は下表で固定する（変われば本ルールの追従が必要＝Revalidation Trigger）。

| 層 | 読むファイル | 正確な見出し／列（固定） | 素材としての扱い |
|---|---|---|---|
| Intent（why / 不変則 / 判断基準） | `.intent/intent-tree.md` | `## L0`〜`## L4`（階層本体）＋ `## Assumptions`（＋あれば `## Open Questions`） | 指定サブツリーの L0–L4 を canonical な why として読む。Assumptions / Open Questions は inferred として別枠で扱う |
| Intent（方向と制約） | `.intent/intent-compass.md` | `## North Star` / `## Anti-direction` / `## Invariants` / `## Decision Rules` | North Star を目的、Invariants を不変則、Decision Rules を判断基準、Anti-direction を避ける方向として読む |
| steering 制約（指定時のみ） | steering（`tech.md` 等） | 各 steering 文書の見出し | 範囲に含める指定があるときだけ、守るべき制約として読む。無指定なら読まない |
| requirements（個別要求） | `.intent/packets/index.md` ＋ `.intent/packets/active/*.md` | index 列 `packet_id \| name \| state \| summary` ＋ packet 本体 frontmatter（`depends_on` を含む）と本文 `## Evidence` | 指定 packet 群の個別要求・依存・証拠を読み取り、横断 requirements として束ねる |

- canonical な記述（tree の L0–L4 / compass 4 節 / packets / steering）と inferred 由来の記述（Assumptions / Open Questions）は、読み取りの段階で区別したまま保持し、混在させない。
- 範囲外の成果物は読まない（指定された範囲の `.intent/` 成果物のみを素材にする）。

## 範囲が曖昧 / 該当成果物が不在のとき（生成しない）

次のいずれかのときは、自然言語 Spec を**生成しない**。生成しないまま、利用者が次の一手を選べる情報を提示して止まる。

- **範囲が曖昧**（引数でも対話でも軸が一意に定まらない）: 何が曖昧か（どの軸か）を名指しし、**利用可能な範囲**（実在する intent-tree のサブツリー・packet 一覧・steering の有無）を提示して、範囲の再指定を促す。
- **該当成果物が不在**（指定された intent-tree / compass / packet / steering が存在しない、または未記入）: **不足している成果物**を名指しし、それを用意する該当スキル（discover / compass / packets 等）を案内する。推測で代替しない。

いずれの場合も書き込みは行わない。

## 読み取りの境界（read-only）

- 射影元（intent-tree / compass / packets / steering）は**読み取りのみ**で扱い、作成・変更・削除しない。
- 本ルールの責務は「範囲の解釈」と「三層の読み取り」までであり、読み取った素材を文書へ写像するのは format 系ルール、トレース付与・inferred 標識は捏造抑制ルールが担う。
- 読み取った素材は、後続の写像が射影元へ辿れるよう、どの層・どの見出し・どの packet 由来かを保ったまま受け渡す。
