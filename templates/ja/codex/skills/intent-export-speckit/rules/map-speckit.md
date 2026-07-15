# Mapping: packet → Spec Kit

選んだ packet 1つを Spec Kit の specify 投入記述 + spec ヒントへ変換する規則。`intent-export-speckit` skill が使う。これは export ターゲット別マッピングの1つ（Spec Kit 用）。別ターゲットは `rules/map-<target>.md` を追加し、対応する `intent-export-<target>` skill を作る（ここが拡張点）。他ターゲットの map ルールは変更しない。

## 入力範囲（厳守 / 情報源契約）

- 読むのは **対象 packet 1つ** と **`.intent/intent-compass.md` の Invariants / Anti-direction** のみ。
- `.intent/execution-contract.md` があれば、案件固有要件の第3情報源ではなく、上の素材の拘束力と境界越え時の扱いを読む実行時scaffoldとして JIT で読む。不在ならその旨を警告し、従来の packet + compass で続行する（fail-open）。
- Intent Tree 全文・他 packet は**読まない**。全体方向が必要なときのみ Tree の L0–L1 を**要約として**ピンポイント参照する（本文転記は不可）。
- これにより Spec Kit へ渡る情報量を 1 packet 相当に抑える（トークン爆発を防ぐ）。
- 生成物（specify 投入記述 / spec ヒント）に**他 packet・Intent Tree 本文を引用/転記しない**。出典は対象 packet と compass に限定する。

## 出力（2ファイルの下書き / 本体は作らない）

下書きは packet ごとのディレクトリ `.intent/speckit/<packetスラッグ>/` 配下に書く（スラッグの導出は次節「出力レイアウト」）。Spec Kit の入口契約（`/speckit.specify <機能の自然言語記述>` が spec.md を生成し、`.specify/memory/constitution.md` の原則に照らす）に**片方向で**合わせる。Spec Kit 内部実装には依存しない。

### `.intent/speckit/<packetスラッグ>/specify-input.md`

Spec Kit の `/speckit.specify` に渡す **機能の自然言語記述**。冒頭から**そのまま引数に使える**凝縮テキストにする。

- 含めるもの: (a) 誰の課題か、(b) 現状、(c) 何を変えたいか / In・Out scope / 守るべき invariant / parent intent。
- **primary 出力**: `/speckit.specify` に投入できる**最小かつ常に有効な機能記述**テキストを specify-input 冒頭から導出できる形で書く（節構造化はその上の付加価値）。冒頭からそのまま引数化できる（追加の抜き出し作業を利用者に強いない）。
- 情報源は対象 packet（Why/Scope/Expected Behavior/Safety）と compass の Invariants / Anti-direction に限定する。

### `.intent/speckit/<packetスラッグ>/spec-hints.md`

Spec Kit が生成する spec.md と突き合わせるための **spec ヒント**（本体ではない）。次の必須要素を含める。

- **parent intent 参照**（必須見出し）: この packet が仕える上位の狙い（L0/L1/L2/L3）を明示し、Spec Kit の spec 生成に intent が流れる構造にする。
- **Invariant 参照**（必須見出し）: 守るべき制約（packet 固有 invariant + compass のプロジェクト普遍 Invariant）を列挙し、Spec Kit の spec の受入条件へ取り込まれやすい形で渡す。normative（SHALL / MUST）で表現できるものはその形で残す。
- **`## Execution Contract`**（必須見出し）: `.intent/execution-contract.md` を参照し、Invariant=Safety、Scope / Acceptance=Scope・Expected Behavior・Validation、Decision=Decisions、Preference / Heuristic=Agent-discretion・候補、という対象 packet 内の出所対応だけを短く置く。境界越えの発見は参照先の判断形式で人の回答を待つと引き継ぎ、契約本文や三択全文は複製しない。不在時は「契約不在・従来境界で続行」と明記する。
- **`### Revalidation Candidates`**: 対象 packet の Agent-discretion で、未定の理由と同一項目の `Revisit when` があるものだけを非拘束の候補として同一項目を1回転記する。MUST / SHALL、Invariant、受入条件へ昇格させない。候補がなければ小節ごと省略し、再 export で複製しない。無関係な Tree / Compass / archive の全文を運ばない。
- **constitution 反映の一行案内**（必須）: 「これらの Invariant を Spec Kit のプロジェクト憲法 `.specify/memory/constitution.md` へ反映するかは利用者判断」の一行を必ず添える。**本スキルは constitution.md へ書き込まない**（外部ツール非改造）。
- **突き合わせ観点**: Spec Kit が生成した spec.md が parent intent / Invariant を落としていないか確認する観点を添える。
- 本体は完成させない。spec.md の完成は Spec Kit 側（`/speckit.specify` 以降）に委ねる（INV4）。

### `spec-hints.md` 末尾の「関係定石（候補・未採用）」節（任意・A40/DR83 宿主②・DR85）
下書き（`spec-hints.md`）の**末尾に独立節**として、この packet に関係しそうな定石を候補として添付してよい（下流の実装者・エージェントへ JIT で届けるため）。**採用済み Invariant とは節を分けて区別し**、必要な制約が要件と混同されないようにする。cc-sdd 出口（`map-cc-sdd`）と同型の節で、下書きファイル名だけ `spec-hints.md` に読み替える。

- **節冒頭に明記する**: 「これは候補であって要件ではない。採否は下流の判断に委ねる」旨を1文で置く。
- **中身は参照方式に留める**: 各定石は `id` ＋ 名前 ＋ 一行要旨 ＋ カタログ参照パス（`.intent/constraint-starters/<領域>.md`）のみ。**定石本文を全文転記しない**（カタログが正本）。
- **少数に絞る**: 対象 packet の Scope / Expected Behavior と意味照合して**強い当てはまりのみ**（目安5件）。弱ければ載せない（節ごと省略可）。
- **既に決まった採否を反映する（INV57・DR84）**: 発行ディレクトリに `constraint-ledger.md` があれば読み、**採用済み・否認済み**の定石は載せない。ファイルが無ければ、過去の採否確認だけを省略して候補の選定を続ける。目的・文脈が否認時から変わったと判断できる場合は、否認済みの定石も候補へ戻してよい（機械条件なし・INV2）。詳細は `.intent/discovery/README.md` の「定石の採否記録」を正とする。
- **任意・後方互換**: 合致ゼロなら節ごと省略。export の成否に影響しない（warn も出さない）。Spec Kit の constitution.md へは書かない（DR78・外部ツール非改造）。

## 出力レイアウト（スラッグ規則と衝突規則）

### スラッグ規則（決定的）

packet 名からディレクトリ名（スラッグ）を以下の順で**決定的に**導出する。同じ packet 名は常に同じスラッグになる。この規則は `packet-format.md` および他ターゲットの map スラッグ規則と**同一**である（export ターゲット間で出力先導出を揃える）。

1. NFC 正規化する。
2. 前後の空白を trim する。
3. ASCII 大文字を小文字にする。
4. 空白とパスに危険な文字（`/ \ : * ? " < > |`）を `-` に置換する。
5. 連続する `-` を1つに圧縮する。
6. 先頭・末尾の `-` を除去する。

- 非 ASCII 文字（日本語等）はそのまま保持する。
- 結果が空文字列になる場合はスラッグを `unnamed-packet` とし、その旨を利用者に告知する。

### 衝突規則

- スラッグが既存ディレクトリと一致し、かつそのディレクトリの specify-input.md が指す packet が**異なる** packet 名を指す場合のみ衝突とする。`-2` から始まる連番を付与して別名を割り当て、packet 名 → ディレクトリ名の対応を利用者に告知する。黙って上書きしない。
- **同一** packet 名を指す場合は衝突ではなく再 export であり、同じディレクトリの下書きをその場で更新する。

## intent 伝播（Spec Kit が生成する成果物へ届かせる）

- specify-input の冒頭記述に **parent intent** を、spec-hints に **invariant** を明示し、Spec Kit が生成する成果物（spec / plan / tasks）へ取り込まれやすい構造で渡す。
- compass の **Invariants** を Spec Kit の spec の受入条件・**normative 文（SHALL / MUST）** へ落とし込める形で spec-hints に seed する。
- 狙い: Spec Kit の spec から実装へ進む段階でも parent intent と invariant が効き続け、局所最適防止が Spec Kit 経由でも蒸発しないこと。
- **責任分界**: intent-planner の責務は「**渡す内容の構造のみ**で parent intent / invariant を伝播する」ところまで。Spec Kit の内部実装には介入しない。実際の取り込みは Spec Kit 側に委ねる（Spec Kit の挙動には依存しない）。完全な取り込みは**保証ではなく、構造で確率を最大化**する。

## 不変条件

- Spec Kit の spec / plan の**本体を完成させない**（下書き・ヒントまで）。spec.md の完成は `/speckit.specify` 以降に委ねる（INV4）。
- specify-input / spec-hints は必ず parent intent と invariant への参照を含む。
- 生成物に他 packet・Intent Tree 本文を引用/転記しない（情報源は対象 packet + compass に限定）。
- **他 packet のディレクトリへは書き込まない**（書き込み先は対象 packet のスラッグ配下のみ）。
- Spec Kit の skill / 内部実装には介入しない。出力先は `.intent/speckit/` に閉じ、`.intent/cc-sdd/` / `.intent/openspec/` には触れない。リポジトリ直下 `.specify/` / `specs/` / constitution.md にも書き込まない。
