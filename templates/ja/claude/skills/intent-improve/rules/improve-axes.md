# Improve: 3軸評価と分類基準

実装後の再整合で `.intent/` 成果物と実装の現実を突き合わせる規則。`intent-improve` skill が使う。writeback が packet 単位の通常経路であるのに対し、improve は packet に紐づかない drift も拾う全体横断の safety net である。

## 評価3軸

- **completeness**（意図した内容が実現されているか）: active/ 配下の packet ファイルの Expected Behavior / Scope が実装とテストに現れているか（横断読みは active/ 限定。archive/ は読まない）。未実現・部分実現を検出する。
- **correctness**（実現された内容が意図に合っているか）: 実装された挙動が packet の Why / Expected Behavior と一致しているか。意図と異なる実現・意図外の追加を検出する。
- **coherence**（実装が North Star・Invariants・Decision Rules と整合しているか）: intent-compass.md の North Star / Invariants / Anti-direction / Decision Rules と実装が矛盾していないか。局所最適や invariant 違反を検出する。また、intent-compass.md の Decision Rules の Revisit when 条件の成立が、実装の現実・deltas.md から読み取れる Decision エントリを検出する。検出は既存分類「Decision Rules 更新推奨」として根拠付きで報告する（新しい分類は作らない）。さらに、入力源を異にする別経路として、`.intent/milestones.md` の各 event 文字列を全 Decision Rule の `Revisit when` 欄と substring 照合し、合致した Decision Rule を同じ「Decision Rules 更新推奨」分類として見直し再提案する。`Revisit when` が「未定」と明示されている Rule は照合対象外とする（誤った発火を生まない）。event が短すぎる過剰一致を避けるため、十分具体的な event（一定長以上）を前提とする。この milestones 起点の照合は read-only・報告のみで行い、compass を自動書き換えせず、新しい是正分類も作らない。実装/deltas 起点の Revisit 検出と milestones 起点の照合は併存し、いずれも「Decision Rules 更新推奨」分類で報告する。

## 分類（5種・複数該当可）

- **aligned**: ズレなし。3軸とも整合している（是正不要。整合の根拠は添える）。
- **intent 強化推奨**: 実装は妥当だが `.intent/` 側の記述が薄い・暗黙のまま。成果物（intent-tree.md / intent-compass.md / packet ファイル）の追記・明確化の更新案を提示する。
- **是正 packet 推奨**: 実装側にズレがあり、コード変更が必要。improve はコードを変更しないため、是正作業を新しい packet 案として提示する（新規 packet ファイル（active/ 配下）の追加案 → export → cc-sdd 実装の通常経路へ）。
- **Decision Rules 更新推奨**: 実装で得た判断が既存の Decision Rules と食い違う、または新しい判断基準が必要。Revisit when 条件の成立が検出された Decision エントリの見直しもこの分類として報告する。下記の「Decision Rules 変更規約」に従う。
- **invariant 違反検出**: 実装が Invariants に違反している。最優先で報告し、是正 packet 案または invariant 自体の見直し（ユーザー判断）を提示する。

複数該当する場合はすべて挙げ、報告は分類ごとに整理する。

## 証拠の扱い

- 実装の現実の参照元: コードベース（Read/Glob/Grep のみ、変更禁止）、テストの有無と配置、`.kiro/specs/` の進行状況、`.intent/deltas.md`（promoted / pending）。いずれも**読み取りのみ**。
- 評価には必ず根拠（ファイル / 該当記述）を添える。根拠を示せない評価・是正案は提示しない。

## Decision Rules 変更規約（writeback と同一規約）

- Decision Rules を変更する是正は、intent-compass.md の既存 ADR 形式（**Context** / **Decision** / **Why** / **Alternatives considered** / **Consequences** / **Revisit when**）で**新エントリを追加**し、置き換えられる旧エントリに superseded である旨と後継エントリへの参照を注記する。
- superseded を注記した旧エントリは、6欄の内容のまま（要約しない）退避する Decision Rule の **rule 単位ファイル** `.intent/compass-archive/<rule-slug>.md` へ move する（CONTRACT 分割・archive 規約。`<rule-slug>` は既存スラッグ規則で導出・新採番なし・同一 rule の再 supersede は同ファイル）。`compass-archive/` ディレクトリが無ければ作る。active な Decision Rules エントリは引き続き compass 内に直接記載のまま保つ。
- 旧エントリは削除しない（履歴は compass-archive.md に保持される）。独自フィールド（例: Supersedes）を導入しない。
- 6欄形式の導入前に記録された旧4欄エントリ（Alternatives considered / Revisit when を持たないもの）は有効として扱い、欄の不足をエラー・指摘・書き換えの対象にしない。

## writeback 誘導（safety net の役割分担）

- 書き戻し未実施の学び — 現行 Source Packet（最新 export）に対応する delta エントリが deltas.md に無い、または実装に現れた未記録の決定 — を検出したら、自ら delta を書かず `/intent-writeback` の実行を促す。
- 「保留」タグ付きの見送り項目が残っている場合は、再提案または却下への確定を促すのみとする。タグの確定更新（昇格 / 却下確定 / 継続保留）は `/intent-writeback` の責務。
- improve は deltas.md に書き込まない（delta の記録・状態更新はすべて writeback が行う）。

## validate 追従誘導（conformance の点検への橋渡し）

- その回の5分類に `Decision Rules 更新推奨` または `invariant 違反検出` が含まれる場合（＝compass の Decision Rules / Invariants に影響する反映が生じうる回）に限り、writeback 誘導と並置で `/intent-validate`（compass 更新が各 packet に追随しているかの照合＝conformance 陳腐化の点検）の実行を促す1文を添える。`aligned` のみの回や上記2分類を含まない回では添えない（過剰誘導の回避）。
- improve 自身は conformance 陳腐化の判定（頃合いの概算）をしない。頃合いの概算は intent-status の責務であり、improve は誘導のみ。確定診断は `/intent-validate` が行う。
- 本誘導は誘導文の追加に閉じ、3軸評価（completeness / correctness / coherence）と5分類のロジックを一切変更しない（5分類は不変）。

## drift-log への記録（drift-watch 連動）

`drift-watch: on` のときだけ、coherence 軸で検出した逸脱（invariant 違反 / anti-direction 抵触）を `.intent/drift-log.md` へ事後記録として写す。`off` / 未記載 / 不正値のときは記録しない（現行動作とバイト等価。off ガードは SKILL.md 側で保証）。

### 記録手順

- coherence 軸が検出した逸脱（invariant 違反 / anti-direction 抵触）を**改めて検出し直すのではなく流用し**、`.intent/drift-log.md` へ `stage: improve` のエントリとして1件ずつ append する。値は:
  - `pattern: <該当する drift-patterns の id | uncatalogued:<短い名> | ->`（特定できれば id、カタログ外の実逸脱なら `uncatalogued:<短い名>`、判別できなければ `-`）
  - `stage: improve`
  - `packet: <帰属する packet 名 | ->`（帰属を特定できなければ `-`）
  - `mechanism: compass-invariant`（Invariant に違反したとき）または `compass-anti-direction`（Anti-direction に抵触したとき。どちらの compass 要素に抵触したかで選ぶ）
  - `outcome: missed`（**下書き**。improve の時点では逸脱は既に起きて通り抜けたあとなので基本は `missed`。確定は利用者の `user-verdict` が valid / false-alarm / unjudged で裏づける）
  - `user-verdict: unjudged`
  - `recorded_at: <ISO 8601>`
  - `commit: <短縮ハッシュ | ->`
  - `note: <1〜2行>`（何に違反・抵触したか）
- 複数の逸脱が検出されたら、逸脱ごとに1エントリずつ append する。
- **分割形で書く（CONTRACT「append-only 記録の分割・archive 規約」）**: drift-log は事象由来なので、単一 `drift-log.md` 末尾へ追記せず **日付+slug 単位の分割ファイル** `drift-log/<date>-<slug>.md` へ1エントリ書く。`<date>` は recorded_at の日付、`<slug>` は pattern（事象）を既存スラッグ規則（`intent-packets/rules/packet-format.md`）で導出する（新採番・連番を作らない）。別事象が別ファイルを触るため末尾衝突が原理的に消える。既存エントリは書き換え・削除しない（**append-only**）。
- **9キーを固定順で必ず全部書く**: `pattern` → `stage` → `packet` → `mechanism` → `outcome` → `user-verdict` → `recorded_at` → `commit` → `note`。9キーのうち1つでも欠けたエントリは書かない。
- **commit**: `git rev-parse --short HEAD` の結果を書く。非リポジトリ・git CLI 不在などで取得できないときは `-` とする（fail-open。記録は続行する）。
- **`drift-log/` ディレクトリが不在のとき**: ディレクトリを作ってから分割ファイルを書く。旧単一 `drift-log.md` が残っていても読み手は共存して読める（移行は本スライスの migration が担う）。エントリ書式は `.intent/drift-log.md` の「エントリ書式」節の見本（`### drift-log entry`）に従う。

### 新しい是正分類を作らない（記録と是正の分離）

- この記録は**新しい是正分類を作らない**。上記「分類（5種）」（aligned / intent 強化推奨 / 是正 packet 推奨 / Decision Rules 更新推奨 / invariant 違反検出）は一切変えない。coherence 軸で検出した逸脱を、是正分類とは別に**drift-log のスキーマへも写す**だけである。
- **drift-watch は記録し、improve は是正する**。記録（drift-log）と是正（5分類）は別の責務であり、混ぜない。drift-log への append は是正を一切代替・変更しない。

## 改善度レポート（pattern × outcome クロス集計）

`drift-watch: on` のとき、improve は出力に drift-log を `pattern × outcome` でクロス集計した改善度レポートを併せて提示する。

- **集計キーは型（pattern）に揃える**。利用者が「なし群（過去の失敗作）/ あり群（drift-watch 稼働期間）」を後から突合できる構造は、**型 id と drift-log の `commit` 列のみ**で成立させる（追加の比較機構は作らない）。
- レポートには次の**誠実さ注記**を必ず添える:
  - `missed=0` は「効いた証拠」ではなく「記録漏れの疑い」と読む（効いた瞬間だけが集計に残るのは確証バイアス）。
  - `false-positive` の多発は anti-direction が広すぎる疑いを示す。
- これらの注記は `.intent/drift-log.md` の正直注記と同趣旨であり、効いた系（prevented / caught）に偏らない読み方を担保する。

### packet-scope-overflow を「第一防御の効きを測る計器」として読む（DR9 第二防御）

`mechanism: packet-scope-overflow` のエントリ（export 後にユーザーが対象 packet の `## Scope` を超える実装指示を出したときに drift-watch が記録する第二防御由来の検知）は、**第一防御（規約文書の「スコープ超過なら intent に戻る」規律＝想起のみ・強制力なし）が実際に効いているか**を測る計器として読む。同じ pattern × outcome クロス集計に乗せるが、読み方の規律を1つ足す:

- `outcome: caught`（ユーザーが警告を容れて `/intent-packets`→再 export で intent に戻った）＝第一防御＋第二防御が効いた瞬間。
- `outcome: missed`（警告を無視して cc-sdd で押し切った）＝第一防御の想起が効かなかった瞬間＝**意図流動率（scope-creep の発生率）の母数**。これが溜まることで初めて「第一防御がどれだけ効いていないか」が観測できる（鶏卵: 第一防御の効きを測る機構そのものが第二防御の中にある）。
- `outcome: false-positive`（実際は妥当なスコープ拡張だった）＝照合が過敏な疑い。
- **数値スコアリング・閾値ソルバーは持ち込まない**。「caught が増えれば第一防御が効いている」と断定せず、`missed=0`＝記録漏れの疑い・`false-positive` 多発＝照合過敏、の正直注記をそのまま継承して候補提示に留める。集計キーは型（pattern＝`scope-creep` または `uncatalogued:scope-overflow`）に揃え、追加の比較機構は作らない。

## 役割境界（記録・是正・writeback の三分立）

- **drift-watch は writeback にフックを差さない**（要件 R8）。writeback の単一責務＝delta の二段階昇格を濁さないため、drift-log への記録は writeback 経路には一切干渉しない。上記「writeback 誘導」の挙動は変更しない。
- 記録（drift-log）・是正（5分類）・writeback（delta の二段階昇格）は**別個の3責務**である。三者を混ぜない。

## コンテキストコストの気づき（drift-watch 連動）

coherence 軸の評価と並んで、実装後の振り返り（realignment）の進め方がコンテキスト（トークン）を食っていないかに**気づかせる**照合を行う。drift-patterns（意図逸脱の型）とは**別カタログ**であり、症状（symptom）が「意図逸脱」ではなく「コンテキストを食う場面」である点だけが異なる。これは規範ではなく気づきであり、上の「drift-log への記録」「改善度レポート（pattern×outcome 集計）」とは性質が違うので**手順を分けて持つ**。

- **`drift-watch: on` のときだけ**この照合を行う（off / 未記載 / 不正値のとき何もしない）。`.intent/context-cost-cues.md` が不在のときは照合をスキップしてその旨を告知する（停止しない）。
- **これはどのログにも記録しない**。上の coherence 逸脱検出（`drift-log.md` へ append し pattern×outcome 集計する）とは異なり、コンテキストコストの気づきは **`drift-log.md` にも他のどのログにも append しない**。理由: 消費量は計測できず outcome を評価できないため、ログに混ぜると drift-log の集計を推測値で汚す。さらに何が文脈を食うかは人により正当に異なり、記録すればプライバシーに踏み込む。**上の「drift-log への append 手順」「改善度レポートの集計」をこの照合には適用せず、pattern×outcome 集計にも含めない**。
- **5分類は不変**: この気づきは既存の5分類（aligned / intent 強化推奨 / 是正 packet 推奨 / Decision Rules 更新推奨 / invariant 違反検出）を一切変えない。是正分類とは別の、ログに残さない助言として提示する。

### 手順

1. **context-cost-cues.md を読む**
   - `.intent/context-cost-cues.md` を読み、全型（seed + 利用者が育てた型すべて）を取得する。不在ならスキップして告知する（停止しない）。

2. **各型の symptom を realignment の進め方と照合する**
   - 各型の `symptom` を、実装後の振り返り（コードや done を読む経路・題材）に照らす。`symptom` は弱い手がかりで、当てはまりが弱ければ黙る（誤検知より黙る側に倒す＝気づき機能の信頼を保つ）。
   - 照合に使うのは題材のみ。トークン消費量・git 差分・実行時メトリクスは読まない。

3. **該当型があるとき（気づきの提示・ログには書かない）**
   - 利用者に気づき口調で名指しする。例:「この振り返りの進め方は `<id>` に当てはまるかもしれません — これがコンテキストを食っている可能性があります」。
   - その型の「もし意図せず効いていれば」の軽い代替（薄い入口 / JIT pull / 入力限定）を、**任意の選択肢**として添える。例:「もし意図せず効いていれば、<軽い代替> もあります（判断はお任せします）」。
   - **矯正・指図をしない**。命令形・断定で言わず、気づきの提示に留める。大量スキルの導入・全文ロード等は正当な高コスト選択でありうるので、コストを食う選択を不要と断じない。判断は利用者に委ねる。
   - **どのログにも append しない**（coherence 逸脱の append 手順・集計を流用しない）。

4. **該当型がないとき**
   - 何も名指さない。**ログにも書かない**（空振りの記録もしない＝そもそもこの照合はログを持たない）。
