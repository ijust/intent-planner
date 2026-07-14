# Mapping: packet → OpenSpec

選んだ packet 1つを OpenSpec の proposal 下書き + delta spec ヒントへ変換する規則。`intent-export-openspec` skill が使う。これは export ターゲット別マッピングの1つ（OpenSpec 用）。別ターゲット（cc-sdd 等）は `rules/map-<target>.md` を追加し、対応する `intent-export-<target>` skill を作る（ここが拡張点）。`map-cc-sdd` は変更しない。

## 入力範囲（厳守 / 情報源契約）

- 読むのは **対象 packet 1つ** と **`.intent/intent-compass.md` の Invariants / Anti-direction** のみ。
- `.intent/execution-contract.md` があれば、案件固有要件の第3情報源ではなく、上の素材の拘束力と境界越え時の扱いを読む実行時scaffoldとして JIT で読む。不在ならその旨を警告し、従来の packet + compass で続行する（fail-open）。
- Intent Tree 全文・他 packet は**読まない**。全体方向が必要なときのみ Tree の L0–L1 を**要約として**ピンポイント参照する（本文転記は不可）。
- これにより OpenSpec へ渡る情報量を 1 packet 相当に抑える（トークン爆発を防ぐ）。
- 生成物（proposal / delta）に**他 packet・Intent Tree 本文を引用/転記しない**。出典は対象 packet と compass に限定する。

## 出力（2ファイルの下書き / 本体は作らない）

下書きは packet ごとのディレクトリ `.intent/openspec/<packetスラッグ>/` 配下に書く（スラッグの導出は次節「出力レイアウト」）。OpenSpec の入口契約（`/opsx:propose <自然言語の変更記述>`、proposal の Why/What Changes/Impact、delta spec の ADDED/MODIFIED/REMOVED + `### Requirement:` / `#### Scenario:`）に**片方向で**合わせる。OpenSpec 内部実装には依存しない。

### `.intent/openspec/<packetスラッグ>/proposal.md`

OpenSpec の `/opsx:propose` に渡す **proposal 下書き**。3つの見出しを必ず含める。

- `## Why` — packet の intent / Why を写し、**parent intent**（この packet が仕える上位の狙い）を明示する。なぜ今この変更が必要かを述べる。
- `## What Changes` — packet の deliverables / Scope を**箇条書き**で列挙する。compass の **Anti-direction** はこの節の中で **out-of-scope（やらないこと）として明示**する。
- `## Impact` — この変更が影響する spec / 契約と、守るべき制約。compass の **Invariants** を写し、影響範囲（触れる契約・能力）と invariant を並べる。
- `## Execution Contract` — `.intent/execution-contract.md` を参照し、Invariant=Safety、Scope / Acceptance=Scope・Expected Behavior・Validation、Decision=Decisions、Preference / Heuristic=Agent-discretion・候補、という対象 packet 内の出所対応だけを短く置く。境界越えの発見は参照先の判断形式で人の回答を待つと引き継ぎ、契約本文や三択全文は複製しない。不在時は「契約不在・従来境界で続行」と明記する。
- `### Revalidation Candidates` — 対象 packet の Agent-discretion で、未定の理由と同一項目の `Revisit when` があるものだけを非拘束の候補として同一項目を1回転記する。MUST / SHALL、Invariant、受入条件へ昇格させない。候補がなければ小節ごと省略し、再 export で複製しない。無関係な Tree / Compass / archive の全文を運ばない。
- **primary 出力**: `/opsx:propose` に投入できる**最小かつ常に有効な変更記述**テキストを proposal 冒頭から導出できる形で書く（proposal の構造化はその上の付加価値）。
- 情報源は対象 packet（Why/Scope/Expected Behavior/Safety）と compass の Invariants / Anti-direction に限定する。

### `.intent/openspec/<packetスラッグ>/spec-delta.md`

OpenSpec の delta spec の **ヒント skeleton**（本体ではない）。

- packet の受け入れ条件 / Expected Behavior を `### Requirement: <name>`（**normative な SHALL / MUST 文**）と `#### Scenario: <name>`（**GIVEN / WHEN / THEN**）の骨格へ対応づける。
- 見出し構文（`### Requirement:` / `#### Scenario:`）を**正確に seed** し、OpenSpec の validate に通る構造へ誘導する。
- 振り分け規則は次節「delta の振り分け」に従う。
- 本体は完成させない。突き合わせ・完成は OpenSpec 側（`/opsx:propose` 以降）に委ねる（INV4）。

### `proposal.md` 末尾の「関係定石（候補・未採用）」節（任意・A40/DR83 宿主②・DR85）
下書き（`proposal.md`）の**末尾に独立節**として、この packet に関係しそうな定石を候補として添付してよい（下流の実装者・エージェントへ JIT で届けるため）。**採用済み Invariant とは節を分けて区別し**、必要な制約が要件と混同されないようにする。cc-sdd 出口（`map-cc-sdd`）と同型の節で、下書きファイル名だけ `proposal.md` に読み替える。

- **節冒頭に明記する**: 「これは候補であって要件ではない。採否は下流の判断に委ねる」旨を1文で置く。
- **中身は参照方式に留める**: 各定石は `id` ＋ 名前 ＋ 一行要旨 ＋ カタログ参照パス（`.intent/constraint-starters/<領域>.md`）のみ。**定石本文を全文転記しない**（カタログが正本）。
- **少数に絞る**: 対象 packet の Scope / Expected Behavior と意味照合して**強い当てはまりのみ**（目安5件）。弱ければ載せない（節ごと省略可）。
- **採否記録の器を反映する（INV57・DR84）**: 発行ディレクトリの `constraint-ledger.md`（無ければ沈黙）を read し、**採用済み・否認済み**は載せない（目的・文脈が否認時から変わったと読めるときは否認済みも戻してよい・機械条件なし・INV2）。詳細は `.intent/discovery/README.md`「定石の採否記録」を正とする。
- **任意・後方互換**: 合致ゼロなら節ごと省略。export の成否に影響しない（warn も出さない）。OpenSpec の共有設定へは書かない（read-only の下書き内に留める）。

## delta の振り分け（ADDED / MODIFIED / REMOVED）

- **既定**: packet の受け入れ条件はすべて `## ADDED Requirements` に置く。
- **条件付き**: packet の **Scope** または compass の **Anti-direction** が既存の能力・振る舞いの**変更/廃止を明示的に参照している場合のみ**、`## MODIFIED Requirements` / `## REMOVED Requirements` に「**変更対象の能力名 + 変更方向**」のヒントを置く。
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
- compass の **Invariants** を OpenSpec の **normative 文（SHALL / MUST）** と `## Impact` の制約へ落とし込む。delta の `### Requirement:` にも invariant が関わる場合はその制約を normative 文として seed する。
- 狙い: OpenSpec の change から実装へ進む段階でも parent intent と invariant が効き続け、局所最適防止が OpenSpec 経由でも蒸発しないこと。
- **責任分界**: intent-planner の責務は「**渡す内容の構造のみ**で parent intent / invariant を伝播する」ところまで。OpenSpec の内部実装には介入しない。実際の取り込みは OpenSpec 側に委ねる（OpenSpec の挙動には依存しない）。完全な取り込みは**保証ではなく、構造で確率を最大化**する。

## 不変条件

- OpenSpec の proposal / delta spec の**本体を完成させない**（下書き・ヒント skeleton まで）。delta の完成は `/opsx:propose` 以降に委ねる（INV4）。
- proposal の `## Why` / `## Impact` は必ず parent intent と invariant への参照を含む。
- 生成物に他 packet・Intent Tree 本文を引用/転記しない（情報源は対象 packet + compass に限定）。
- **他 packet のディレクトリへは書き込まない**（書き込み先は対象 packet のスラッグ配下のみ）。
- OpenSpec の skill / 内部実装には介入しない。出力先は `.intent/openspec/` に閉じ、`.intent/cc-sdd/` には触れない。
