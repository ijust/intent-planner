---
name: intent-packets
description: Intent Tree と Intent Compass から、cc-sdd に渡す前の Packet Plan を作る。各 packet は parent intent を持ち、behavior-preserving / testable / rollbackable。実装はしない。
---

# intent-packets Skill

## Core Mission
- **Success Criteria**:
  - 改修見込みの規模に応じた数の packet 候補があり（数合わせをしない・小規模なら 1 個でよい・1〜7 を緩い目安とする）、各 packet が parent intent を参照している
  - 各 packet が `.intent/packets/active/` 配下の個別ファイル（1 packet = 1 ファイル）として起案されている
  - 各 packet が Scope / Non-scope / Expected Behavior / Decisions / Safety(Invariants) / Validation / Evidence / Rollback / cc-sdd Mapping を持つ（`Evidence` は結果が無ければ空節で保持）
  - 各 packet の `## Decisions` 節で、`decision-slots.md` の共通コアスロット（+ mode 別差分）が4ステータス（回答済み / 未定 / 非該当 / ADR候補）のいずれかで閉じている（既定値を埋めない・黙って飛ばさない）
  - 各 packet が behavior-preserving / testable / rollbackable な粒度である
  - 既存の packet ファイルを破壊していない（差分更新案として提示している）
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 前提を読む
- `.intent/intent-tree.md` と `.intent/intent-compass.md` を読む。どちらか無ければ「先に該当コマンドを実行」を案内して停止する。
- 読み取り時、compass / intent-tree の確定文体に紛れた未確定動詞（想定 / 流用 / 予定 / TBD / 暫定 等）を見たら、推測で確定させず Open Questions または未定スロット（理由・再訪条件（Revisit when）併記）への変換案として提示する。確定値への昇格は利用者の確認に委ねる。既に Open Questions / Deferred / 未定スロットへ記録済みの箇所は重複変換しない。
- 引き継がれた発行ディレクトリの `discovery/<スラッグ>-<rand>/mode.md`（A34・discover が出力した発行名を引き継ぐ）→ 無ければ単一 `.intent/mode.local.md`（legacy）→ 無ければ旧 `.intent/mode.md` の順で mode 状態を読む（CONTRACT.md の read fallback 規約）。無ければ standard を既定とし Open Questions に告知する（停止しない）。
- `.intent/packets/index.md` と、既存の `.intent/packets/active/` 配下の packet ファイルを読む（差分更新の基礎にする）。
- 旧 install 対応: `.intent/packets/`・`plan.md`・`index.md`・`README.md` が不在なら、skill が自ら作成してから処理を行う（scaffold の再インストールを待たない）。
- 事後起草の判別（実装が先行していた場合）: 起動の文脈や利用者の申告から「**対応する Packet が無いまま実装が進んだ／完了した**」ことが分かる場合は、これを通常の起草と同じ手順で扱う（事後でも Packet を起こす。実装済みであることは起草を省く理由にしない）。このとき:
  - 確定している事実（既に実装された結線・挙動）は `what + constraints + oracle` として packet ファイルに記録する。
  - **まだ固定できない仕様**（起動契機・閾値・判定手段など、実装に踏み切れていない／暫定で置いている決定）は、推測で埋めず Open Questions と Deferred（`未定（遅延中・再訪条件付き）`、再訪条件を必ず併記）として**明示的に器に入れる**。「仕様が固定できないから Packet を作らない」は誤り — 未確定をそのまま保持できることが Packet の役割。
  - 起草の順序を案内する: **まず本スキルで Packet を起こし（起草フェーズ）、そのあと `/intent-writeback` で実装の現実から得た学びを delta 経由で canonical へ戻す（実装後フェーズ）**。この2つは方向が逆であり、Packet 起草を飛ばして writeback だけを行わない（フェーズ境界は writeback-protocol.md §3 を正とする）。

### Step 2: モード定義のアルゴリズムを適用する
- `.intent/mode.local.md`（無ければ `.intent/mode.md`）の `definition` が指すモード定義を開き、Packet 分解フェーズに割り当てられた algo rule（`rules/algo-*.md`）を読み、適用する（standard なら `rules/algo-example-mapping.md`、refactor なら `rules/algo-migration-slicing.md`、behavior-unknown なら `rules/algo-example-mapping.md` + `rules/algo-characterization-test.md`）。例は網羅ではない。常にモード定義の表を正とする。

### Step 3: Packet を分解する
- Example Mapping に従い、各 L2/L3 能力を「ルール・例・疑問・切り出し」に展開する。
- 例から Expected Behavior、Validation、Rollback を導く。
- 改修見込みの大きさに応じた数の packet にまとめる（数を目標に数合わせをしない・小規模なら 1 個でよい・1〜7 を緩い目安とする）。大きさは「触れる concern の数 × 既存境界への波及の広さ」で質的に測り、**切る基準**に工数見積もり等の数値を持ち込まない（切った後の packet に任意で書く見積もりは `rules/packet-format.md` の「見積もり」節の規律＝幅+算出根拠+実装主体のセットに従う）。各 packet に parent intent（L0/L1/L2/L3 への参照）を必ず持たせる。
- 各 packet を `.intent/packets/active/<packet_id>.md` の個別ファイルとして起案する。ID 付与・frontmatter キーの記入・本文セクション構成（`## Decisions` 節・`## Evidence` 節を含む）は `rules/packet-format.md` を読み、従う（キー一覧・値域は正本が単一の真実源）。
- `updated_at` の打刻（書き手の責務）: packet ファイルを書き込んだら、その更新時点を frontmatter の `updated_at`（ISO 8601）に記録する。新規作成時は `created_at` と同一時点を `updated_at` に記入し、既存 packet の内容を変更したときはその時点を `updated_at` に更新する。内容変更を伴わない再実行では `updated_at` を変えない（冪等。無変更で打刻しない）。日時は `created_at` と同じくシェルの `date` で取得する。日時を取得できない場合は推測の日付を書かず、その旨を報告する。打刻は書き手（本スキル）の責務であり、read-only の検証層（intent-validate）には持たせない。
- `rules/decision-slots.md` を読み、completeness schema のスロットを各 packet の `## Decisions` 節へ播く（スロット定義・値域・ID の正本は decision-slots.md。本節はその投影）。
  - 共通コアスロット（全モードで播く8 ID）を全 packet に播き、`.intent/mode.local.md`（無ければ `.intent/mode.md`）の mode に応じた差分スロットを加算する（standard / refactor / behavior-unknown / feature-growth）。スロット定義は decision-slots.md の表が正であり、SKILL 本体にハードコードしない。
  - 各スロットを4ステータス（回答済み / 未定 / 非該当 / ADR候補へ送る）のいずれかで**必ず閉じる**（「黙って飛ばす」を構造的に防ぐ）。「妥当な既定値」「推奨値」を埋めない（anchoring 回避）。スロットの該当性・値を成果物から推論・自動充填しない（人が宣言する）。
  - discover が tree L3 直下に「決定が要る点（④）」として記録した posture を反映する（具体値が無くても、当該スロットの存在は閉じ対象にする）。
  - 既存成果物が既にカバーするスロットは作り直さず、その閉じ先を参照する（例: `decision-fit-criterion` は `## Validation`、`decision-exception-flow` は `## Expected Behavior`、`decision-characterization` は `algo-characterization-test.md`）。`## Decisions` には値を二重に書かず「既存節で閉じている」旨を宣言する（重複定義しない）。
  - `未定` のスロットは理由・downstream への注意書き・再訪条件（Revisit when）を併記する。`非該当` のスロットは該当しない根拠を併記し、黙って落とさない。
- 投与量の仕分け（前倒し / 遅延）: 各決定を「人間が前倒しで固定する（visible rule）」か「エージェントに委譲して遅延する（hidden / discretion）」かに仕分ける。
  - 前倒し5基準（不可逆・後からの変更が高コスト／複数モジュール・外部利用者へ波及（外部影響）／曖昧だと受入テスト・観測が弱くなる（受入オラクル）／セキュリティ・法規制の床／複数 packet を拘束する）のいずれかに該当する決定は**前倒しで固定**する。2つ以上を満たす architecture-significant な決定は ADR 候補として compass の Decision Rules へ送る。
  - 設計規則の内側に局所化でき、可逆（cheap-to-reverse）で探索可能な決定は `未定（遅延中・再訪条件付き）` として保持し、エージェントの裁量ゾーンに委ねてよい（放置しない。再訪条件を必ず併記する）。
  - 前倒しの対象は「決定そのものの早期確定」に限らず、**学習・リスク発見・テストオラクル形成の前倒し**を優先する（結論の早期固定を強制しない）。
- `rules/decision-probe.md` を読み、適用する。load-bearing な決定地点（packet の切り方・前倒し固定する decision slot・既存境界との整合方針 等）でのみ、自分の仮説（暫定の確信）と問いを言語化し、問いを起点に `.intent/`（compass の Invariant/Decision Rule・glossary・過去 deltas・関連 packets）から検証/反証する証拠を pull し、確信と矛盾する証拠を第一に read-only で名指しする（意図版 Self-Probing）。発火を load-bearing な決定に絞り、問いを `.intent/` に証拠が実在するものに絞る（絞り込みゲート）。canonical を自動改変せず・warn-only・候補提示まで。証拠 pool が空のときはスキップする。手順・規律はすべて rule に委ねる（ここに複製しない）。
- `state` は `packet-format.md` の6値域（`draft | ready | implementing | verifying | done | parked`）から宣言的に記入する。進行段階の確定（特に `verifying`/`done`）は AI の自己申告のみで行わず、人または検査ゲート（intent-validate / drift-watch の結果）に基づく。`state=done` は `## Evidence` 節に確定済みの検証結果があることを前提とする。`parked`（保留＝今はやらない）は人の宣言で入れ、その packet に `## 保留の理由と再検討の目安` を記す（値域・意味論は `packet-format.md` が正）。
- `depends_on` には依存先 packet の `packet_id` を宣言的に記入する（既定 `[]`・空でもキーを省略しない）。ツールは依存を推論・算出しない。
- `## Evidence` 節には、検証した結果・実施日・検査軸 ID（`validate-checks.md` の kebab-case ID）・出所（intent-validate / drift-watch / 人確認）を記入する。Evidence は AI の自己申告ではなく検査結果または人確認に基づき、出所を辿れる形で記録する。結果が無ければ空節で保持し推測で埋めない。
- PdM/PjM 向けの任意節（価値・見積もり）は、必要な packet に限り**提案→承認**で記入する（すべて任意・`rules/packet-format.md` の各節の規律が正）。**押し付けない**（製品判断が絡む packet でだけ薄く提案し、純工学 packet では素通りする）:
  - **価値**（`## 価値（誰に何が起きるか）`）: この packet が支える利用者・事業の価値と「やらないと何が起きるか」を自然文で提案し、人が採否・修正する（点数化しない）。
  - **見積もり**（`## 見積もり`）: 規模シグナル（触れるファイル数・テスト面積・依存数など）を**根拠**に、**幅**（人の時間の範囲）・**実装主体**（human/AI/mixed）の3点セットで提案し、人が承認して初めて記入する（AI が確定値を勝手に埋めない）。AI 実装部分は AI の実行時間でなく**人が拘束される時間**（レビュー・仕様判断・受入確認）で見積もる。幅・根拠・主体のどれかを欠いた**裸の数値は書かない**（DR88）。換算・幅決め・優先順位の**判断を機械化しない**（規模シグナルの計数までは補助スクリプトに委ねてよいが判断は AI 提案+人承認・DR89）。日付コミット・ベロシティ・優先度スコアを持ち込まない（INV62）。
  - リスク（`## リスク`）は「分かっているが起こりうること」がある packet でだけ定性で提案する（無ければ節ごと省く）。
- 既存 packet の `state: active` は `implementing` への移行案として、`depends_on`/`## Evidence` の欠落は遅延補完案（`depends_on: []` の差分追記）として、既存の差分更新案の規律に乗せて提示する（一括移行を強制せず・移動のみ・削除しない）。
- 既存の packet ファイルがあれば読み、上書きではなく破壊せず差分更新案として提示する。
- Compass の**プロジェクト普遍**の invariant を各 packet の Safety に反映し、packet 固有の invariant は packet ファイルの Safety / Invariants に直接起案する（compass には書かない）。
- `.intent/intent-compass.md` の `## Open Questions` に「packet 固有制約（候補）」として保留された制約を読む。各候補について、当該 packet の作業範囲（Scope/Non-scope）に合致するものを利用者に自然言語で確認し、回答を得たうえで、その packet ファイルの Safety / Invariants へ転記し、転記済みのエントリを compass の `## Open Questions` から除く（保留の二重管理を残さない）。どの packet にも合致しない候補は compass の `## Open Questions` に保留したまま残す。

### Step 4: 終端判定・優先順位・分割を提示する
- 分解の終端判定（複合停止条件）: 各 packet が次の6条件をすべて満たした時点で、それ以上の分割を止める。①一 packet が一つの主要 concern に対応する ②受入基準が観測可能な入力・条件・期待結果に落ちている ③解法空間の境界（固定 / 裁量 / 禁止）が明示されている ④cheap-to-reverse（後戻りが安い） ⑤トレース先が明確（parent intent / spec_refs を辿れる） ⑥単体完結: packet 単体の done が、利用者/呼び出し側から見て中途半端でない一貫した挙動の区切りになっている（half-done な振る舞いの done を作らない）。⑥は④とは別の独立条件である — ④は「作る側のロールバック安全性（中間状態が戻せる）」、⑥は「呼び出し側から見た完了形の意味的一貫性」で観測の主体が違う（④へ吸収しない）。満たすまでは粗い、満たした後の細分化は過剰。
- 検証可能性の床は discriminative testability とする: 単に「テストが書ける（testability）」では足りず、「誤った実装を落とせるオラクルがある」ことを満たす。落とせるオラクルが見当たらない packet は受入基準が未成熟と判定し、Validation / Expected Behavior を観測可能な形へ詰め直す。
- 受入基準が複数の concern または複数の品質属性トレードオフをまたぐ packet は「まだ粗い」と判定し、concern 単位への分割を提案する（一 packet 一 concern へ寄せる）。
- 作業単位を実装手順（how の完全指定）まで細分化しない。`what + constraints + oracle`（何を / 境界制約 / 誤実装を落とすオラクル）の指定に留め、規則の内側はエージェントの裁量に委ねる。
- 既存の粒度規律（behavior-preserving / testable / rollbackable・数は規模に応じて可変で 1〜7 を緩い目安・数合わせをしない）を維持し、「一 packet = 一 concern」と⑥単体完結を終端判定に明示的に用いる。
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

**読み手**: 作業単位を切り出して実装フローへ渡す人間開発者。
**この出力で最初に掴ませること**: 「**最初に着手すべき packet はこれ（＝次に export すべき packet）。次の一手は案件種別に応じた出口**」。packet 一覧・優先順位・分割案はその根拠となる詳細。

出力は結論（着手 packet と次のコマンド）を先頭に立てる。

- **最初に着手すべき packet（先頭・理由付き）**: 推薦 packet ＝ 次に export すべき packet（同一）。なぜそれを先頭にするかの理由を添える。
- **次の一手（1行・案件種別で分岐）**: `rules/export-route.md`（出口判定レーン）を read-only で適用し、案件種別から出口を選んで提示する。cc-sdd を無条件で推さない（決め打ち禁止）:
  - target format（`.intent/mode.local.md` の `format` 行）が有効値で明示されていれば、その出口を推薦する: `cc-sdd` → `/intent-export-cc-sdd` / `openspec` → `/intent-export-openspec` / `to-spec` → `/intent-to-spec`。
  - `format` 未指定（不在/プレースホルダ/値域外）なら、mode（non-code / standard 系）と前提（`.kiro/` の有無）から推論して候補筆頭を提示する（non-code+`.kiro/`不在 → `/intent-to-spec` / standard+`.kiro/`存在 → `/intent-export-cc-sdd`）。
  - 一意に決まらないときは単一の出口に畳まず候補を列挙する（出口は利用者の意図次第・判定の詳細は `rules/export-route.md` が正）。
- **詳細**: `.intent/packets/active/` 配下の packet ファイル群（新規起案・既存への差分更新案。規模に応じた数の packet・1〜7 が緩い目安、各 parent intent 付き）、`.intent/packets/plan.md` と `.intent/packets/index.md` の更新、packet の優先順位、大きすぎる packet の分割案。

## Safety & Fallback
- Intent Tree / Compass が無ければ停止して該当コマンドを案内する。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- packet を実装タスクに落としすぎない（Issue より上位、spec より手前）。
- packet ファイルは削除しない（移動のみ）。
- シェルコマンドの用途は、日時取得・`.intent/packets/` 配下のディレクトリ作成（mkdir）と移動に限る（アプリケーションコードを変更しない invariant は維持）。
- アプリケーションコードは変更しない。
