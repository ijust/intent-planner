---
name: intent-packets
description: Intent Tree と Intent Compass から、cc-sdd に渡す前の Packet Plan を作る。各 packet は parent intent を持ち、behavior-preserving / testable / rollbackable。実装はしない。
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Bash
argument-hint: <分解の焦点（任意）>
---

# intent-packets Skill

## Core Mission
- **Success Criteria**:
  - 3〜7 個の packet 候補があり、各 packet が parent intent を参照している
  - 各 packet が `.intent/packets/active/` 配下の個別ファイル（1 packet = 1 ファイル）として起案されている
  - 各 packet が Scope / Non-scope / Expected Behavior / Safety(Invariants) / Validation / Evidence / Rollback / cc-sdd Mapping を持つ（`Evidence` は結果が無ければ空節で保持）
  - 各 packet が behavior-preserving / testable / rollbackable な粒度である
  - 既存の packet ファイルを破壊していない（差分更新案として提示している）
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 前提を読む
- `.intent/intent-tree.md` と `.intent/intent-compass.md` を読む。どちらか無ければ「先に該当コマンドを実行」を案内して停止する。
- `.intent/mode.md` を読む。無ければ standard を既定とし Open Questions に告知する（停止しない）。
- `.intent/packets/index.md` と、既存の `.intent/packets/active/` 配下の packet ファイルを読む（差分更新の基礎にする）。
- 旧 install 対応: `.intent/packets/`・`plan.md`・`index.md`・`README.md` が不在なら、skill が自ら作成してから処理を行う（scaffold の再インストールを待たない）。

### Step 1.5: 旧 packets.md の移行
- 旧 `.intent/packets.md` を検出する。無ければ何もせず Step 2 へ進む。
- 検出したら packet 節（`## Packet: <packet-name>`）を分割し、各 packet に `pkt-<移行実行日>-<スラッグ>` の ID を付与する。frontmatter の `name` は旧見出しの packet 名から**逐語転記**する（整形・言い換えをしない — export-log・既存下書きとの照合キーを保全する）。
- 分類する: `.intent/export-log.md` に行があり、かつ `.intent/deltas.md` に終端状態（promoted / closed）の delta が存在する packet は archive 候補（`state: done` を記入、`closed_at` は空のまま、配置先は `archive/<移行実行年>/`）。export 済みでも delta が1件も無い packet は active 候補（書き戻し漏れの可能性を安全側に倒す）。それ以外は active 候補。帰属不明の節は AskUserQuestion で扱いを確認する（確認なしに破棄しない）。
- `.intent/intent-compass.md` の Invariants 節に packet 固有の項目があれば、対応する packet ファイルの Safety / Invariants への移設案を作る。
- 分類計画と移設案を提示し、AskUserQuestion で一括確認を得てから実行する: packet ファイルを配置し（`active/` に同名 `name` の packet が既にあれば移行の再実行とみなし、上書きせず利用者に確認する）、plan 節（Walking Skeleton / Recommended First Packet / Deferred）を `plan.md` の同名節へ節単位で非破壊追記し、`index.md` を再生成する。
- 旧 packets.md の後始末: `git ls-files` で Git 追跡済みかを確認し（読み取り専用）、追跡済みなら削除する（内容は git 履歴に残る）。非追跡または git が使えない場合は削除せず `packets.md.migrated` へ退避リネームする（非破壊原則）。
- 移行を終えたら、分割数・付与した ID 一覧・配置先・plan.md へ移設した内容・compass 移設の有無を報告する。

### Step 2: モード定義のアルゴリズムを適用する
- `.intent/mode.md` の `definition` が指すモード定義を開き、Packet 分解フェーズに割り当てられた algo rule（`rules/algo-*.md`）を読み、適用する（standard なら `rules/algo-example-mapping.md`、refactor なら `rules/algo-migration-slicing.md`、behavior-unknown なら `rules/algo-example-mapping.md` + `rules/algo-characterization-test.md`）。例は網羅ではない。常にモード定義の表を正とする。

### Step 3: Packet を分解する
- Example Mapping に従い、各 L2/L3 能力を「ルール・例・疑問・切り出し」に展開する。
- 例から Expected Behavior、Validation、Rollback を導く。
- 3〜7 個の packet にまとめる。各 packet に parent intent（L0/L1/L2/L3 への参照）を必ず持たせる。
- 各 packet を `.intent/packets/active/<packet_id>.md` の個別ファイルとして起案する。ID 付与・frontmatter キーの記入・本文セクション構成（`## Evidence` 節を含む）は `rules/packet-format.md` を読み、従う（キー一覧・値域は正本が単一の真実源）。
- `state` は `packet-format.md` の5値域から宣言的に記入する。進行段階の確定（特に `verifying`/`done`）は AI の自己申告のみで行わず、人または検査ゲート（intent-validate / drift-watch の結果）に基づく。`state=done` は `## Evidence` 節に確定済みの検証結果があることを前提とする。
- `depends_on` には依存先 packet の `packet_id` を宣言的に記入する（既定 `[]`・空でもキーを省略しない）。ツールは依存を推論・算出しない。
- `## Evidence` 節には、検証した結果・実施日・検査軸 ID（`validate-checks.md` の kebab-case ID）・出所（intent-validate / drift-watch / 人確認）を記入する。Evidence は AI の自己申告ではなく検査結果または人確認に基づき、出所を辿れる形で記録する。結果が無ければ空節で保持し推測で埋めない。
- 既存 packet の `state: active` は `implementing` への移行案として、`depends_on`/`## Evidence` の欠落は遅延補完案（`depends_on: []` の差分追記）として、既存の差分更新案の規律に乗せて提示する（一括移行を強制せず・移動のみ・削除しない）。
- 既存の packet ファイルがあれば読み、上書きではなく破壊せず差分更新案として提示する。
- Compass の**プロジェクト普遍**の invariant を各 packet の Safety に反映し、packet 固有の invariant は packet ファイルの Safety / Invariants に直接起案する（compass には書かない）。
- `.intent/intent-compass.md` の `## Open Questions` に「packet 固有制約（候補）」として保留された制約を読む。各候補について、当該 packet の作業範囲（Scope/Non-scope）に合致するものを AskUserQuestion で利用者に確認したうえで、その packet ファイルの Safety / Invariants へ転記し、転記済みのエントリを compass の `## Open Questions` から除く（保留の二重管理を残さない）。どの packet にも合致しない候補は compass の `## Open Questions` に保留したまま残す。

### Step 4: 優先順位と分割を提示する
- packet の優先順位を示す。
- `rules/walking-skeleton.md` を読み、rule の適用条件に従って適用する。
- `rules/first-packet.md` を読み、適用する。
- 大きすぎる packet には分割案を提示する。
- 利用者確認を得た packet の `state` を draft から `ready`（着手可・依存解決済み）へ宣言的に更新し、`index.md` を再生成する（値域・再生成手順は `rules/packet-format.md` 参照）。実装中/検証待ち/完了への進行（`implementing`/`verifying`/`done`）は人または検査ゲートに基づく後続の宣言で行う。
- supersede: 計画見直しで既存 packet を後続 packet で置き換える場合、後続 packet の起案と同時に旧 packet へ `superseded_by` を記入し、`archive/<年>/` へ移動して index を再生成する。
- **in-flight ガード**: 置換対象が export 済み（`.intent/export-log.md` に行あり）かつ終端状態（promoted / closed）の delta が無い場合、実装進行中の可能性を警告し、利用者確認なしに移動しない。
- export 済み packet の改名要求は、改名ではなく supersede として扱う（`rules/packet-format.md` の name 可変性規則）。
- 実装変更はしない。

## Output Description
- `.intent/packets/active/` 配下の packet ファイル群（新規起案・既存への差分更新案。3〜7 packet、各 parent intent 付き）
- `.intent/packets/plan.md` と `.intent/packets/index.md` の更新
- 移行レポート（旧 packets.md を検出した場合のみ: 分割数・ID 一覧・配置先・移設内容）
- packet の優先順位
- 大きすぎる packet の分割案
- 最初に着手すべき packet の推薦（理由付き）
- 次に export すべき packet（推薦した packet と同一）
- 次に実行すべきコマンド: `/intent-export-cc-sdd`

## Safety & Fallback
- Intent Tree / Compass が無ければ停止して該当コマンドを案内する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- packet を実装タスクに落としすぎない（Issue より上位、spec より手前）。
- packet ファイルは削除しない（移動のみ）。
- 移行は分類計画の一括確認なしに実行しない。帰属不明の節を確認なしに破棄しない。非 git プロジェクトでは旧 packets.md を削除しない（退避リネームのみ）。
- Bash の用途は、日時取得・`.intent/packets/` 配下のディレクトリ作成（mkdir）と移動・移行時の旧 packets.md の後始末に限る（アプリケーションコードを変更しない invariant は維持）。
- アプリケーションコードは変更しない。
