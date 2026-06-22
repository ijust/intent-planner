# Drift Export Check（export 水際照合）

`/intent-export-cc-sdd` の Step 1.6 で使う、対象 packet の design/tasks ヒント × compass の照合ロジック。`drift-watch: on` のときだけ走る（off / 未記載 / 不正値は何もしない）。enforcement ゲート（Step 1.5・停止しうる）の後・Open Questions 確認（Step 1.7・停止しない）の前に挟み、cc-sdd へ渡す直前――逆戻りが効かなくなる直前――で compass の方向から外れていないかを警告する。

## 照合の根拠は compass

- **照合の根拠は `.intent/intent-compass.md` の North Star / Anti-direction / Invariants** にする。export の段階では compass が既に存在するため、ここでは型カタログ（`.intent/drift-patterns.md`）ではなく compass を根拠にする（discover の地形診断は compass も packet もまだ無いため型カタログを根拠にする。export はその姉妹工程で、根拠が compass である点が違い）。
- 水際照合は**誤検知前提**。compass の要素に「抵触した」ことは逸脱の確定ではない。妥当な設計を誤って拾うこと（false-positive）を最初から織り込み、空振りも含めて記録する。
- **この照合は方向の関所であり、停止しない**。enforcement ゲート（手続きの関所・停止しうる）とは検査対象が直交する。drift の検知で export を止めることはしない（停止できるのは Step 1.5 の enforcement ゲートだけ）。

## 手順

1. **入力を取得する**
   - 対象 packet の **design/tasks ヒント生成内容**（いま export が生成しようとしている下書きの中身）を入力にする。
   - `.intent/intent-compass.md` の **North Star** / **Anti-direction** / **Invariants**（プロジェクト普遍 Invariant）を読む。
   - **compass 不在 / 未記入のとき**: 水際照合をスキップし、その旨を利用者に告知する（停止しない / drift-log にも書かない）。以降の手順は実行しない。

2. **design/tasks ヒントを compass と照合する**
   - 生成しようとしている design/tasks ヒントを、compass の **Invariants**（壊してはいけない制約に抵触しないか）・**Anti-direction**（避けると決めた方向へ寄っていないか）・**North Star**（最終状態から逸れていないか）に照らす。
   - これは**意味的な照合**であって機械判定ではない。誤検知前提で、疑わしければ拾う。

3. **抵触があるとき**
   - 利用者に**警告のみ提示する**――**export を停止しない**。何に抵触したか（どの Invariant / Anti-direction / North Star か）と、design/tasks ヒントのどの部分が外れているかを名指しする。
   - `drift-log.md` へ1エントリ append する（後述の append 手順）。値は:
     - `pattern: <該当する drift-patterns の id | uncatalogued:<短い名> | ->`（特定できれば id、カタログ外の実逸脱なら `uncatalogued:<短い名>`、判別できなければ `-`）
     - `stage: export`
     - `packet: <対象 packet 名>`
     - `mechanism: compass-anti-direction`（Anti-direction に抵触したとき）または `compass-invariant`（Invariant に抵触したとき。どちらの compass 要素に抵触したかで選ぶ）
     - `outcome: caught`（**下書き**。drift-watch の推定であり、確定は利用者の `user-verdict` と後述の判定で決まる）
     - `user-verdict: unjudged`
     - `recorded_at: <ISO 8601>`
     - `commit: <短縮ハッシュ | ->`
     - `note: <1〜2行>`（何に抵触し、何を警告したか）
   - 複数箇所が抵触したら、抵触ごとに1エントリずつ append する。

4. **outcome は利用者判定で確定する（下書きの解決）**
   - `outcome` は手順3で `caught` を**下書き**しただけであり、最終値は利用者の判定で決まる:
     - 利用者が警告を容れて design を引き戻したとき → `caught`（捕捉成功・効いた系）
     - 利用者が無視してそのまま通したとき → `missed`（防げず通った・効かなかった系）
     - 設計が実際には妥当で誤検知だったとき → `false-positive`（誤検知だった・効かなかった系）
   - `user-verdict` が確定値を裏づける: 妥当な指摘なら `valid` / 誤検知なら `false-alarm` / 未判定なら `unjudged`。利用者が未判定でも `unjudged` のまま記録・集計対象になる。

## drift-log への append 手順

- **分割形で書く（CONTRACT「append-only 記録の分割・archive 規約」）**: drift-log は事象由来なので、単一 `drift-log.md` 末尾へ追記せず **日付+slug 単位の分割ファイル** `drift-log/<date>-<slug>.md` へ1エントリ書く。`<date>` は recorded_at の日付、`<slug>` は pattern（事象）を既存スラッグ規則（`intent-packets/rules/packet-format.md`）で導出する（新採番・連番を作らない）。別事象が別ファイルを触るため末尾衝突が原理的に消える。既存エントリは書き換え・削除しない（**append-only**）。
- **9キーを固定順で必ず全部書く**: `pattern` → `stage` → `packet` → `mechanism` → `outcome` → `user-verdict` → `recorded_at` → `commit` → `note`。9キーのうち1つでも欠けたエントリは書かない。
- **recorded_at**: 記録時刻を ISO 8601 で書く（transaction time）。
- **commit**: `git rev-parse --short HEAD` の結果を書く。非リポジトリ・git CLI 不在などで取得できないときは `-` とする（fail-open。記録は続行する）。
- **`drift-log/` ディレクトリが不在のとき**: ディレクトリを作ってから分割ファイルを書く。旧単一 `drift-log.md` が残っていても読み手は共存して読める（移行は本スライスの migration が担う）。
- エントリ書式は `.intent/drift-log.md` の「エントリ書式」節の見本（`### drift-log entry`）に従う。

## スコープ超過照合（DR9 第二防御・packet-scope-overflow）

compass 照合（上記）とは**照合根拠が別物**の第二の照合。compass 照合が「compass 普遍 Invariant に抵触したか」を見るのに対し、これは「**対象 packet の宣言スコープ（`## Scope` / `## Non-scope`）を超える実装指示が来ていないか**」を見る。超えたとき、新領域でこそ必要になる **packet 固有 invariant**（認可・データ整合性・トランザクション境界・冪等性）が cc-sdd 成果物に不在であることを drift として警告する。`drift-watch: on` のときだけ走り、**警告のみ・停止しない・誤検知前提**は compass 照合と同じ。これは第一防御（規約文書の「スコープ超過なら intent に戻る」規律＝想起のみ）の効きを測る計器でもある。

照合は2点で行う（利用者確定 2026-06-20「両方」）:

1. **export 水際（この Step 1.6）**: いま export しようとしている下書きが、対象 packet の `## Scope` を超え `## Non-scope` 側へ及んでいないかを見る。下書き自体がスコープを逸脱していれば、export 時点で拾える。
2. **後段の軽い提示（実装段の再照合）**: export 後にユーザーが出した**実装指示の文面**が対象 packet の `## Scope` を超える（例: フロント専用 packet なのにバックエンド/認可/トランザクション境界の実装を指示）とき、軽く再照合して名指しする。これは「intent に戻る」（`/intent-packets` で新領域の packet を起こし再 export）への差し戻しを促す入口で、停止はしない。

### 照合の入力と規律

- **入力は実装指示の文面と packet の `## Scope` / `## Non-scope` 宣言のみ**。コード差分・実装結果は読まない（INV5/INV6・DR14）。意味的照合であって機械判定ではない。
- 照合根拠は **packet 固有 invariant の不在**。compass 普遍 Invariant 照合（上記）とロジックを混同しない。普遍 Invariant が export で転記されていることは、新領域の固有制約をカバーしない（別レイヤー）。
- **異常系**: 対象 packet が無い / `## Scope` 未記入のときは照合をスキップし告知する（停止しない・drift-log に書かない）。

### スコープ超過があるとき

- 利用者に**警告のみ提示する**――export も実装も停止しない。何が packet スコープ（例: フロント）を超え、どの新領域（例: バック/認可/トランザクション）に及び、どの packet 固有 invariant（認可・整合性・トランザクション境界・冪等性）が不在かを名指しし、「`/intent-packets` で新領域の packet を起こして再 export する（intent に戻る）」を案内する。
- `drift-log.md` へ1エントリ append する（上記 append 手順と同一）。値の差分は:
  - `mechanism: packet-scope-overflow`（compass 系の2値とは別の第二防御由来。集計上分離できる）
  - `pattern: uncatalogued:scope-overflow`（型カタログに scope-creep 型 seed があればその id。無ければ `uncatalogued:scope-overflow`）
  - `stage: export`（水際で拾った場合）。後段の実装段で拾った場合も、export 由来の照合の延長として `stage: export` を用い、`note` に「実装段の再照合」と明記する（新 stage 値は増やさない＝既存3値 `discover | export | improve` のスキーマを変えない）。
  - 他キー（`packet` / `outcome: caught` 下書き / `user-verdict: unjudged` / `recorded_at` / `commit` / `note`）は compass 照合と同じ規律。
- `outcome` の確定は compass 照合と同じ（利用者が intent に戻れば `caught` / 無視して押し切れば `missed` / 実際は妥当な拡張で誤検知なら `false-positive`）。
