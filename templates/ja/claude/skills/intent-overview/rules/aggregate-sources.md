# 意図ドキュメント集約手順（read-only・派生再生成）

`intent-overview` skill が散在した `.intent/` 意図成果物を 1 つの通読ビューへ集約・整形するための正本。SKILL.md は手順と報告形式のみを持ち、「何をどの見出し／列から読み、どう並べるか」は本表を参照する。本ルールは **read-only** であり、canonical な `.intent/*.md` を一切変更しない（書き込みは `.intent/overview/` 配下のみ）。逆算・検査・drift の判定ロジックは再実装せず、それらが残した出力を読むだけである。

## 集約対象と正確な参照（固定）

各成果物の見出し・列名は下表で固定する（変われば本ルールの追従が必要＝Revalidation Trigger）。canonical な記述と inferred（推測）由来の記述は分離して提示し、混在させない。

| ソース | 読むファイル | 正確な見出し／列（固定） | ビューでの扱い |
|---|---|---|---|
| 意図ツリー | `.intent/intent-tree.md` | `## L0`〜`## L4`（階層本体）＋ `## Assumptions`（＋あれば `## Open Questions`） | L0–L4 を canonical として整形。Assumptions / Open Questions は inferred として別枠。案件記録（機能追記/機能撤去/履歴/再起案）は分割収納 `.intent/tree/` へ移行済み（本 rule は骨格 L0–L4 のみ読むため対象外・在れば `.intent/tree/index.md` 参照・tree-normalize / DR133） |
| 利用者成果 | `.intent/intent-tree.md` | 各 L1 の任意の `成果の物さし:` と、人が承認した最新の `成果についての学び:` | status と同じL1成果状態を読む。pending delta は確定結果に使わず、現在結果がなければ物さしの有無から結果待ち／未観測を示す |
| コンパス | `.intent/intent-compass.md` | `## North Star` / `## Anti-direction` / `## Invariants` / `## Decision Rules` | 4 節をそのまま整形して通読化 |
| packet 一覧 | `.intent/packets/index.md` | 列 `packet_id \| name \| state \| summary` | 一覧テーブルを集約。各 packet の状態を併記 |
| packet 本体 | `.intent/packets/active/*.md` | frontmatter 10 キー（`depends_on` を含む）＋ 本文 `## Evidence` 節 | frontmatter と Evidence を読み取り、進捗・依存・証拠の文脈に紐づけ |
| プラン | `.intent/packets/plan.md` | `## Walking Skeleton` / `## Recommended First Packet` / `## Deferred` | packet 集約の「次の一手の文脈」として提示 |
| export 履歴 | 分割形 `.intent/export-log/*.md` 群（あれば正本・`exported_at` 昇順）／無ければ旧 `.intent/export-log.md`（生成ミラー） | 列 `packet \| exported_at \| commit` | export 履歴タイムラインとして提示（分割しても通読できる） |
| 学び（差分） | 分割形 `.intent/deltas/*.md` 群（あれば）＋ 旧 `.intent/deltas.md`（共存時） | `Status` ＋ 学びタグ | pending な学びとして packet 集約に紐づけ（分割しても通読できる） |

## active 面 / archive の見せ分け（通読ビューの2層・派生機械生成）

append-only 記録（deltas / export-log / drift-log / compass-archive）は分割により **active 面（現在の薄い射影）と archive（履歴）** に分かれる。overview の通読ビューはこの2層を**見せ分けて**提示する（INV25-(1)・DR33 の派生機械生成。新しい canonical ファイルを作らない・正本を変更しない read-only）。

| 層 | 読むもの | 通読ビューでの扱い |
|---|---|---|
| **active 面** | 各記録の分割ディレクトリ直下 `.intent/<rec>/*.md`（あれば正本・自然キー昇順）／無ければ旧 `.intent/<rec>.md`（生成ミラー） | 「現在」のセクションとして薄く提示（現在の射影）。分割形と旧ミラーが共存するときは分割形を正本とし、ミラーを二重に数えない |
| **archive（履歴）** | 各記録の `.intent/<rec>/archive/`（例 `deltas/archive/<年>/`・compass-archive は rule 単位）配下のファイル | 「履歴」セクションとして active 面とは**別枠**で提示する。active 集計（pending な学び・最新 export 等）には混ぜない |

- 見せ分けは**派生の機械生成**であり、新しい canonical ファイルを増やさない（書き込みは `.intent/overview/` 配下のみ・正本は read-only）。`archive/` が不在の環境では「履歴」セクションを省略する（エラーにしない）。
- 旧単一ファイル形式のみの環境（分割・archive 未配備）では active 面を旧ミラーから読み、「履歴」セクションは git 履歴に委ねる旨を添えて省略する（後方互換・推測で埋めない）。

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

## エージェント理解地図の素材（任意ビュー）

利用者が「理解地図」「agent understanding map」「intent の理解度を埋めたい」など、エージェントが最初に読むべき地図を求めたときは、`.intent/overview/agent-understanding-map.md` を派生生成してよい。これは overview の補助ビューであり、canonical な `.intent/*.md` には書き込まない。

読み取りは次に限定する。

| 地図の節 | 読む素材 | 書き方 |
|---|---|---|
| North Star / やらないこと | `.intent/intent-compass.md` の `## North Star` / `## Anti-direction` | 判断の上限・禁止線として短く並べる。推測で補わない |
| 現在の階層地図 | `.intent/intent-tree.md` の `## L0`〜`## L4` | L0→L4 の順で要約し、L4 候補は packet 化済み / 未 packet を区別する |
| 主要能力・設計軸 | intent-tree / compass に現れる `C31 / C38` / `A48-A49` などの ID・見出し | ID が実在する場合だけ拾い、無ければ「未観測」と書く |
| active packet 面 | `.intent/packets/index.md` と `.intent/packets/active/*.md` の frontmatter | `state` / `depends_on` / `spec_refs` / `updated_at` を根拠として示す。本文丸写しはしない |
| 既知の未理解点 | `## Open Questions` / `## Assumptions` / active packet の Questions・Deferred 相当の見出し | canonical と inferred を分け、未理解点は候補として書く |

- 地図は「エージェントが理解した範囲」を示す派生物であり、理解不足を canonical Open Questions へ追記しない。
- 根拠ファイルを各節末尾または脚注に明示する。根拠が無い理解は `inferred` として隔離し、canonical と混ぜない。
- `C31 / C38` / `A48-A49` のような ID は、実際に読んだファイル内に存在する場合だけ見出しとして使う。存在しない ID を補完しない。

## 共有契約の横断表示（該当時だけ）

- Impact Analysis で「共有契約」と明示された出典参照がある場合だけ、既存の overview と `.intent/overview/agent-understanding-map.md` の packet 面に「共有契約 | 保護 packet | Safety 参照 | 統合時オラクル | 状態」を read-only で加える。共有契約がない場合は節・空表・警告を一切出さない。
- 同じ出典参照を持つ active packet の `## Safety / Invariants` と `.intent/packets/plan.md` の薄い対応を束ねる。出典参照が異なる項目を、文言が似ているだけで統合しない。
- 状態は、保護 packet が無ければ「未担当」、複数 packet の保護内容またはオラクルが両立しなければ双方を名指しして「矛盾」、統合時オラクルが無ければ「統合未確認」とする。複数 packet が担当すること自体は矛盾にしない。
- `.intent/overview/coverage-map.md` が既にあればコード領域側の coverage はそこから参照し、同じ3面照合を再実装しない。新しい共有契約専用ファイルも canonical も作らない。

## 欠落・未記入の扱い

- 集約対象の成果物が未記入または部分的なときは、該当箇所を **「未記入」** として明示する。推測で埋めない（R2.5）。
- ソースファイル自体が不在のときは、その不在を明示し、先に実行すべき該当スキルを案内する（書き込みはしない）。

## 出力の規律

- canonical な意図（tree の L0–L4 / compass 4 節 / packets / plan / export-log / deltas）と inferred な意図（recovery 由来）を **区別したまま** 並べる。
- 生成するビューは **派生（derived）・再生成可能** であり正本ではない旨を明示する。canonical へは書き戻さない。
