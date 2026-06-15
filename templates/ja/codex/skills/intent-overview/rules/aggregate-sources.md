# 意図ドキュメント集約手順（read-only・派生再生成）

`intent-overview` skill が散在した `.intent/` 意図成果物を 1 つの通読ビューへ集約・整形するための正本。SKILL.md は手順と報告形式のみを持ち、「何をどの見出し／列から読み、どう並べるか」は本表を参照する。本ルールは **read-only** であり、canonical な `.intent/*.md` を一切変更しない（書き込みは `.intent/overview/` 配下のみ）。逆算・検査・drift の判定ロジックは再実装せず、それらが残した出力を読むだけである。

## 集約対象と正確な参照（固定）

各成果物の見出し・列名は下表で固定する（変われば本ルールの追従が必要＝Revalidation Trigger）。canonical な記述と inferred（推測）由来の記述は分離して提示し、混在させない。

| ソース | 読むファイル | 正確な見出し／列（固定） | ビューでの扱い |
|---|---|---|---|
| 意図ツリー | `.intent/intent-tree.md` | `## L0`〜`## L4`（階層本体）＋ `## Assumptions`（＋あれば `## Open Questions`） | L0–L4 を canonical として整形。Assumptions / Open Questions は inferred として別枠 |
| コンパス | `.intent/intent-compass.md` | `## North Star` / `## Anti-direction` / `## Invariants` / `## Decision Rules` | 4 節をそのまま整形して通読化 |
| packet 一覧 | `.intent/packets/index.md` | 列 `packet_id \| name \| state \| summary` | 一覧テーブルを集約。各 packet の状態を併記 |
| packet 本体 | `.intent/packets/active/*.md` | frontmatter 10 キー（`depends_on` を含む）＋ 本文 `## Evidence` 節 | frontmatter と Evidence を読み取り、進捗・依存・証拠の文脈に紐づけ |
| プラン | `.intent/packets/plan.md` | `## Walking Skeleton` / `## Recommended First Packet` / `## Deferred` | packet 集約の「次の一手の文脈」として提示 |
| export 履歴 | `.intent/export-log.md` | 列 `packet \| exported_at \| commit` | export 履歴タイムラインとして提示 |
| 学び（差分） | `.intent/deltas.md` | `Status` ＋ 学びタグ | pending な学びとして packet 集約に紐づけ |

## packet frontmatter と state 値域（固定）

- frontmatter は **10 キー**（`depends_on` を含む）。`depends_on` は packet_id の集合（依存先）。
- `state` は **5 値**のいずれか: `draft | ready | implementing | verifying | done`。
- packet 本体の `## Evidence` 節は検証結果・検査軸 ID（kebab-case）を含む。

## 後方互換（旧スキーマの読み替え）

新スキーマ（10 キー・5 値）が未配備の環境でも後方互換で読む。欠落は推測で埋めない。

| 観測される状態 | 読み替え |
|---|---|
| `depends_on` が不在 | 「依存なし（空集合）」として読む |
| `## Evidence` 節が不在 | 「未記入」として読む |
| 旧 3 値 state（`draft \| active \| done`）が残る | `active` を「進行中（実装中相当）」として読む。`draft` / `done` はそのまま |

## inferred（逆算）の扱い — 委譲・読むのみ

- 本ルールはコードからの意図逆算を **独自に行わない**。AST 走査・静的解析・外部スキャナは使わない（INV2・R4.4）。
- refactor モードの `algo-intent-recovery` が intent-tree に残した inferred intent（`## Assumptions` / `## Open Questions` 由来）を **読み取って** inferred として明示し、canonical な L0–L4 本体と分離して提示する（R4.1 / R4.3 / R2.4）。
- **逆算が未取得のとき**（refactor モードの discover が未実行で、`## Assumptions` に inferred が無い）: その不在を明示し、`algo-intent-recovery` を含む refactor モードの discover 実行を案内する。推測で埋めない（R4.2）。

## 欠落・未記入の扱い

- 集約対象の成果物が未記入または部分的なときは、該当箇所を **「未記入」** として明示する。推測で埋めない（R2.5）。
- ソースファイル自体が不在のときは、その不在を明示し、先に実行すべき該当スキルを案内する（書き込みはしない）。

## 出力の規律

- canonical な意図（tree の L0–L4 / compass 4 節 / packets / plan / export-log / deltas）と inferred な意図（recovery 由来）を **区別したまま** 並べる。
- 生成するビューは **派生（derived）・再生成可能** であり正本ではない旨を明示する。canonical へは書き戻さない。
