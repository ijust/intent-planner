# Mapping: packet → OpenSpec

選んだ packet 1つを OpenSpec の proposal 下書き + delta spec ヒントへ変換する規則。`intent-export-openspec` skill が使う。これは export ターゲット別マッピングの1つ（OpenSpec 用）。別ターゲット（cc-sdd 等）は `rules/map-<target>.md` を追加し、対応する `intent-export-<target>` skill を作る（ここが拡張点）。`map-cc-sdd` は変更しない。

## 入力範囲（厳守 / 情報源契約）

- `.intent/execution-contract.md` がある場合、OpenSpec配置の入力は**対象 packet 1つと共通選別結果の `selected` だけ**とする。CompassのInvariants / Anti-directionをOpenSpec固有規則から直接読み直したり転記したりしない。
- `.intent/execution-contract.md` がない場合だけ `selection_status: legacy-not-applied` とし、従来の対象 packet + `.intent/intent-compass.md` のInvariants / Anti-directionを直接使う経路へfallbackする（fail-open）。
- drift照合やOpen Questions確認が読んだTree/Compassとその判定結果は、共通選別結果・下流制約・内部記録の入力に使わない。人の確認で正本が更新された場合は、更新後の正本から共通選別を再実行する。
- Intent Tree 全文・他 packet は**読まない**。全体方向が必要なときのみ Tree の L0–L1 を**要約として**ピンポイント参照する（本文転記は不可）。
- **例外（画面デザイン下書きの引き継ぎ・UI 案件のみ）**: 対象 packet が UI（利用者向け画面）を扱うときだけ、Tree の「画面ラフ参照」セクションを L0–L1 と同じ要領でピンポイント参照してよい。画面デザイン下書き（`.intent/nl-spec/screen-design-brief*.md`）への参照があればその下書きを読み、要点（主要画面の目的・情報の優先順位・主行動・主要状態・見た目の方向と確定／推測の別）と参照先パスを `## Impact` の末尾へ短く転記する。推測（inferred）標識は落とさず、確定へ昇格させない。参照が無ければ何も読まず・何も書かず従来どおり続ける（他 packet・Tree 本文の転記禁止はそのまま）。
- これにより OpenSpec へ渡る情報量を 1 packet 相当に抑える（トークン爆発を防ぐ）。
- 生成物（proposal / delta）に**他 packet・Intent Tree 本文を引用/転記しない**。

## 共通選別結果の OpenSpec 配置

- `.intent/execution-contract.md` が返す共通選別結果を使う。`selection_status: applied` のときは `selected` だけを下流へ写し、OpenSpec固有の候補抽出や再分類を行わない。
- 各採用制約は `Identifier`、`Name`、`Law`、`Applicability`、`Verification`、`Canonical Reference` の6項目を持つ。いずれかを新しい義務なしに作れない候補は `confirm` のままとし、下流制約へ含めない。
- `proposal.md` の `## Impact` を採用制約の主配置とする。`spec-delta.md` には要求の振る舞いへ直接関係する採用制約だけを、該当するRequirement / Scenarioのヒントへ写す。同じ制約を無関係なdeltaへ一律複製しない。
- 領域一致、`always`、明示参照などの通常の選別理由は下流本文へ含めない。理由が適用条件そのものになる場合、制約の衝突を判断する場合、規制・監査・安全保証で根拠が必要な場合に限り、判断に必要な最小要約を該当制約へ添える。
- `confirm` 候補を MUST / SHALL、Invariant、受入条件へ昇格させない。確認種別、根拠、不足情報は内部記録だけに残す。
- `constraint-selection.md`（`.intent/openspec/<packetスラッグ>/constraint-selection.md`）を共通内部記録契約どおりproposal/deltaと同じrunで全置換する。下流へ渡さない。`/opsx:propose` の入力には含めない。
- `selection_status: legacy-not-applied` のときは、従来の packet + Compass 入力と既存配置を維持する。SelectedやConfirmation Candidatesを新方式で確定したとは表示せず、内部記録のLegacy Outputから主出力を参照する。
- 既存のImpact、受入条件、Revalidation Candidates、関係定石（候補・未採用）の非拘束性と、OpenSpec側の承認工程を維持する。

## 出力（2ファイルの下書き / 本体は作らない）

下書きは packet ごとのディレクトリ `.intent/openspec/<packetスラッグ>/` 配下に書く（スラッグの導出は次節「出力レイアウト」）。OpenSpec の入口契約（`/opsx:propose <自然言語の変更記述>`、proposal の Why/What Changes/Impact、delta spec の ADDED/MODIFIED/REMOVED + `### Requirement:` / `#### Scenario:`）に**片方向で**合わせる。OpenSpec 内部実装には依存しない。

### `.intent/openspec/<packetスラッグ>/proposal.md`

OpenSpec の `/opsx:propose` に渡す **proposal 下書き**。3つの見出しを必ず含める。

- `## Why` — packet の intent / Why を写し、**parent intent**（この packet が仕える上位の狙い）を明示する。なぜ今この変更が必要かを述べる。
- `## What Changes` — packet の deliverables / Scope を**箇条書き**で列挙する。packetまたは該当する `selected` が示す **Anti-direction** はこの節の中で **out-of-scope（やらないこと）として明示**する。
- `## Impact` — この変更が影響する spec / 契約と、守るべき制約。`selection_status: applied` では共通結果の `selected` だけを写し、影響範囲（触れる契約・能力）と invariant を並べる。`legacy-not-applied` の場合だけ従来のCompass Invariantsを直接使う。
- `## Execution Contract` — `.intent/execution-contract.md` を参照し、Invariant=Safety、Scope / Acceptance=Scope・Expected Behavior・Validation、Decision=Decisions、Preference / Heuristic=Agent-discretion・候補、という対象 packet 内の出所対応だけを短く置く。境界越えの発見は参照先の判断形式で人の回答を待つと引き継ぎ、契約本文や三択全文は複製しない。不在時は「契約不在・従来境界で続行」と明記する。
- `### Revalidation Candidates` — 対象 packet の Agent-discretion で、未定の理由と同一項目の `Revisit when` があるものだけを非拘束の候補として同一項目を1回転記する。MUST / SHALL、Invariant、受入条件へ昇格させない。候補がなければ小節ごと省略し、再 export で複製しない。無関係な Tree / Compass / archive の全文を運ばない。
- **primary 出力**: `/opsx:propose` に投入できる**最小かつ常に有効な変更記述**テキストを proposal 冒頭から導出できる形で書く（proposal の構造化はその上の付加価値）。
- `selection_status: applied` の情報源は対象 packet（Why/Scope/Expected Behavior/Safety）と共通結果の `selected` だけに限定する。`legacy-not-applied` の場合だけ従来のCompass Invariants / Anti-directionを直接使う。

### `.intent/openspec/<packetスラッグ>/spec-delta.md`

OpenSpec の delta spec の **ヒント skeleton**（本体ではない）。

- packet の受け入れ条件 / Expected Behavior を `### Requirement: <name>`（**normative な SHALL / MUST 文**）と `#### Scenario: <name>`（**GIVEN / WHEN / THEN**）の骨格へ対応づける。
- `selection_status: applied` では、要求の振る舞いへ直接関係する `selected` だけを該当するRequirement / Scenarioの制約ヒントへ写す。関係しない採用制約や `confirm` 候補はdeltaへ混ぜない。
- 見出し構文（`### Requirement:` / `#### Scenario:`）を**正確に seed** し、OpenSpec の validate に通る構造へ誘導する。
- **下流タスク分割への引き渡し**: 後続で複数タスクへ分けるとき、各 Requirement / Scenario を少なくとも1つのタスクへ割り当てるよう、ヒントで確認を求める。共同担当は許す。単一タスクなら非該当と明記できる。
- **受入条件の反証確認**: 「その Scenario が通っても Requirement が壊れる状態」を一度考え、通信・設定・起動構成など実運用相当の経路が成否を左右する場合は、その経路を通る確認を少なくとも1つヒントへ置く。該当しなければ理由付きで非該当とできる。全テストを実運用環境で動かすことや、packet にないテスト方式を発明することは要求しない。
- 振り分け規則は次節「delta の振り分け」に従う。
- 本体は完成させない。突き合わせ・完成は OpenSpec 側（`/opsx:propose` 以降）に委ねる（INV4）。

### `proposal.md` 末尾の「関係定石（候補・未採用）」節（任意・A40/DR83 宿主②・DR85）
下書き（`proposal.md`）の**末尾に独立節**として、この packet に関係しそうな定石を候補として添付してよい（下流の実装者・エージェントへ JIT で届けるため）。**採用済み Invariant とは節を分けて区別し**、必要な制約が要件と混同されないようにする。cc-sdd 出口（`map-cc-sdd`）と同型の節で、下書きファイル名だけ `proposal.md` に読み替える。

- **節冒頭に明記する**: 「これは候補であって要件ではない。採否は下流の判断に委ねる」旨を1文で置く。
- **中身は参照方式に留める**: 各定石は `id` ＋ 名前 ＋ 一行要旨 ＋ カタログ参照パス（`.intent/constraint-starters/<領域>.md`）のみ。**定石本文を全文転記しない**（カタログが正本）。
- **少数に絞る**: 対象 packet の Scope / Expected Behavior と意味照合して**強い当てはまりのみ**（目安5件）。弱ければ載せない（節ごと省略可）。
- **既に決まった採否を反映する（INV57・DR84）**: 発行ディレクトリに `constraint-ledger.md` があれば読み、**採用済み・否認済み**の定石は載せない。ファイルが無ければ、過去の採否確認だけを省略して候補の選定を続ける。目的・文脈が否認時から変わったと判断できる場合は、否認済みの定石も候補へ戻してよい（機械条件なし・INV2）。詳細は `.intent/discovery/README.md` の「定石の採否記録」を正とする。
- **任意・後方互換**: 合致ゼロなら節ごと省略。export の成否に影響しない（warn も出さない）。OpenSpec の共有設定へは書かない（read-only の下書き内に留める）。

## delta の振り分け（ADDED / MODIFIED / REMOVED）

- **既定**: packet の受け入れ条件はすべて `## ADDED Requirements` に置く。
- **条件付き**: packet の **Scope** または該当する `selected` が既存の能力・振る舞いの**変更/廃止を明示的に参照している場合のみ**、`## MODIFIED Requirements` / `## REMOVED Requirements` に「**変更対象の能力名 + 変更方向**」のヒントを置く。`legacy-not-applied` では従来のCompass Anti-directionも使う。
- MODIFIED / REMOVED は変更対象の同定ヒントに留め、既存 spec との突き合わせ・確定は OpenSpec 側に委ねる。明示参照がなければ MODIFIED / REMOVED は置かない。

## 出力レイアウト（スラッグ規則と衝突規則）

### スラッグ規則（決定的）

packet 名からディレクトリ名（スラッグ）を以下の順で**決定的に**導出する。同じ packet 名は常に同じスラッグになる。この規則は `packet-format.md` および `map-cc-sdd` のスラッグ規則と**同一**である（export ターゲット間で出力先導出を揃える）。

1. NFC 正規化する。
2. 前後の空白を trim する。
3. ASCII 大文字を小文字にする。
4. 空白とパスに危険な文字（`/ \ : * ? " < > |`）を `-` に置換する。
5. 連続する `-` を1つに圧縮する。
6. 先頭・末尾の `-` を除去する。

- 非 ASCII 文字（日本語等）はそのまま保持する。
- 結果が空文字列になる場合はスラッグを `unnamed-packet` とし、その旨を利用者に告知する。

### 衝突規則

- スラッグが既存ディレクトリと一致し、かつそのディレクトリの proposal.md が指す packet が**異なる** packet 名を指す場合のみ衝突とする。`-2` から始まる連番を付与して別名を割り当て、packet 名 → ディレクトリ名の対応を利用者に告知する。黙って上書きしない。
- **同一** packet 名を指す場合は衝突ではなく再 export であり、同じディレクトリの下書きをその場で更新する。

## intent 伝播（OpenSpec が生成する成果物へ届かせる）

- proposal の `## Why` に **parent intent** を、`## Impact` に **invariant** を明示し、OpenSpec が生成する成果物（spec / 設計 / タスク）へ取り込まれやすい構造で渡す。
- 共通結果の `selected` を OpenSpec の **normative 文（SHALL / MUST）** と `## Impact` の制約へ落とし込む。delta の `### Requirement:` に直接関係する場合だけ、その制約を normative 文として seed する。
- 狙い: OpenSpec の change から実装へ進む段階でも parent intent と invariant が効き続け、局所最適防止が OpenSpec 経由でも蒸発しないこと。
- **責任分界**: intent-planner の責務は「**渡す内容の構造のみ**で parent intent / invariant を伝播する」ところまで。OpenSpec の内部実装には介入しない。実際の取り込みは OpenSpec 側に委ねる（OpenSpec の挙動には依存しない）。完全な取り込みは**保証ではなく、構造で確率を最大化**する。

## 不変条件

- OpenSpec の proposal / delta spec の**本体を完成させない**（下書き・ヒント skeleton まで）。delta の完成は `/opsx:propose` 以降に委ねる（INV4）。
- proposal の `## Why` / `## Impact` は必ず parent intent と invariant への参照を含む。
- 生成物に他 packet・Intent Tree 本文を引用/転記しない（`applied` の情報源は対象 packet + 共通結果の `selected` に限定）。
- **他 packet のディレクトリへは書き込まない**（書き込み先は対象 packet のスラッグ配下のみ）。
- OpenSpec の skill / 内部実装には介入しない。出力先は `.intent/openspec/` に閉じ、`.intent/cc-sdd/` には触れない。
