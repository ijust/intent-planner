# OpenSpec Spec Delta 下書きテンプレ

> `/intent-export-openspec` が packet の受け入れ条件を OpenSpec の delta spec ヒントとしてこの書式で `.intent/openspec/<packetスラッグ>/spec-delta.md` に書き出します。これは本体を完成させない **ヒント skeleton** です（OpenSpec 本体生成・突き合わせは `/opsx:propose` 以降に委ねる）。`### Requirement:` / `#### Scenario:` の見出し構文を正確に seed し、OpenSpec の validate に通る構造へ誘導します。振り分け規則（ADDED 既定 / 条件付き MODIFIED・REMOVED）の正は export skill の rule（map-openspec）にあります。

## ADDED Requirements

新たに追加する能力・振る舞い。既定では packet の受け入れ条件をすべてここに置く。

### Requirement: <name>

normative な要件文（SHALL / MUST）。compass の Invariants が関わる場合はその制約をここへ落とす。

#### Scenario: <name>

- **GIVEN** 前提
- **WHEN** 起きること
- **THEN** 期待する結果

## MODIFIED Requirements

既存の能力・振る舞いを変更する場合のみ置く（packet の Scope または compass の Anti-direction が既存能力の変更を明示参照する場合）。「変更対象の能力名 + 変更方向」のヒントに留め、突き合わせは OpenSpec 側に委ねる。

## REMOVED Requirements

既存の能力・振る舞いを廃止する場合のみ置く（同上の条件）。廃止対象の能力名をヒントとして示す。
