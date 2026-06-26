# db-design 入力範囲（read-only・三層情報源契約）

`intent-db-design` skill が、対象 packet 1つを起点に、DB 設計を射影するための素材（意図 / invariant / 既存スキーマ）を read-only で読み取るための正本。SKILL.md は手順と報告形式のみを持ち、「どの範囲をどう特定し、何をどの見出し・どのファイルから読み取るか」は本ルールを参照する。本ルールは射影元を**読むだけ**であり、canonical な `.intent/*.md`・packets・既存スキーマ/migration を一切変更しない（書き込みは `.intent/db-design/<packetスラッグ>/` 配下のみ、かつ本ルールの責務外）。

## posture（独自パーサを持たず `.intent/` と既存スキーマを読んで解釈する）

範囲の特定と三層の読み取りは、独自のパーサ・スキーマ・索引を持たず、LLM が `.intent/` の成果物と既存スキーマを直接読んで行う。新しい構造を導入せず、既存成果物の見出し・列・frontmatter をそのまま素材として扱う。逆算・検査・drift の判定ロジックは再実装せず、それらが残した出力があれば読むだけである。canonical（intent-tree / compass / packets）および既存スキーマ・export 下書きは一切変更しない。

## 入力範囲（厳守 / 情報源契約）

読むのは次の三層に限定する。Intent Tree 全文・対象外の packet は読まない（`map-openspec` の情報源契約と同型・トークン爆発を防ぐ）。

| 層 | 読むもの | 読む範囲（厳守） |
|---|---|---|
| 意図（対象 packet） | 対象 packet 1つ（`.intent/packets/active/<対象>.md` 等） | その packet の **意図 / Scope / Expected Behavior / Safety** と frontmatter（`depends_on` を含む）。**1 packet のみ**。他 packet は読まない |
| invariant（compass） | `.intent/intent-compass.md` の **Invariants** / **Anti-direction** | DB 関連の意図（immutable・追記専用・正規化方針 等を含む）を不変則／避ける方向として読む。North Star / Decision Rules は必要時のみ要約参照 |
| 既存スキーマ | 既存スキーマ / migration（Grep で同定） | 下記「既存スキーマの Grep 同定」に従い、同定できた範囲のみを読む |

- Intent Tree 全文は読まない。全体方向が必要なときのみ Tree の **L0–L1 を要約として**ピンポイント参照する（本文転記は不可）。
- 三層以外の成果物（対象外 packet・他 packet のディレクトリ・export 下書き等）は読まない。これにより DB 設計へ渡る情報量を 1 packet 相当に抑える。
- 読み取った素材は、後続の射影が射影元へ辿れるよう、どの層・どの見出し・どの packet 由来か（あるいは既存スキーマのどのファイル由来か）を保ったまま受け渡す。

## 対象 packet の特定（曖昧ゲート・推測で埋めない）

対象 packet は次の順で特定する。一意化できないまま DB 設計を生成しない（R5.1 / R5.2）。

1. **引数優先**: 利用者が `/intent-db-design` に与えた引数で対象 packet が一意に特定できるなら、その packet のみを対象にする。対話補完は行わない（不要な問いを足さない）。
2. **候補提示**: 引数で一意に定まらないときは、`.intent/packets/index.md`（列 `packet_id | name | state | summary`）から候補を提示し、AskUserQuestion で対象を確定する。推測で1つに決めない。
3. **不在で停止**: 引数でも対話でも一意化できないとき、または指定された packet が存在しないときは、**推測で対象を補わず停止する**。何が曖昧か（または不在か）を名指しし、対象 packet の指定を求める。停止中は書き込みを行わない。

## 既存スキーマの Grep 同定（網羅でなく同定範囲＋報告）

既存スキーマ層は、多様な永続層表現を Grep で探して同定する。完全網羅は求めず、**同定できた範囲 + 同定不能の報告**を境界とする（R1.4 / R5.3・OQ-DB5）。

- **探す対象**: 多様な永続層表現を Grep で同定する。例として、ORM スキーマ（Prisma の `schema.prisma` / Drizzle の `*.schema.ts` / TypeORM の `@Entity` / ActiveRecord の `db/schema.rb` 等）・SQL DDL（`CREATE TABLE` 等）・migration ファイル（`migrations/` 配下等）を探す。プロジェクトごとに表現は異なるため、固定パターンに依存せず素直に Grep で探す。
- **網羅でなく同定範囲**: 同定戦略は「網羅」ではない。同定できた範囲のみを既存スキーマ入力として採用する。
- **同定不能は報告し、捏造しない**: 永続層表現の一部が同定できないときは、同定できなかった旨を報告する。同定漏れを**捏造で埋めない**（実在しないスキーマを想像で補わない）。同定しきれなかったスキーマ範囲に関わる射影記述は、`inferred`（射影元に根拠が無い）と一括せず、`unverified`（未同定ゆえ未確認・実在しうる）として扱う対象になる（標識の付与は fabrication-guard の責務）。
- **新規 DB（既存スキーマなし）**: Grep で既存スキーマがまったく同定できないとき（新規 DB 等）は、既存スキーマ入力を**空のまま**にし、意図（packet）と invariant（compass）のみから DB 設計を射影する（R1.4）。この場合、既存スキーマに帰属できる記述は無く、各記述は意図 / invariant 由来か `inferred` のいずれかになる（全 inferred になりうる）。

## 読み取りの境界（read-only）

- 射影元（対象 packet / compass / 既存スキーマ・migration）は**読み取りのみ**で扱い、作成・変更・削除しない。
- 本ルールの責務は「対象 packet の特定」と「三層の読み取り」までであり、読み取った素材を DB 設計へ写像するのは射影形式ルール（`db-design-projection`）、トレース付与・inferred / unverified 標識は捏造抑制ルール（`db-design-fabrication-guard`）が担う。
- 本ルールは機械検査に寄せない。Grep と読み取りは LLM が成果物・スキーマを読んで解釈するものであり、判定ロジックを再実装しない（INV2 / A1）。
