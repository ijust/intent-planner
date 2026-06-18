# Drift Export Check（export 水際照合）

`/intent-export-openspec` の Step 1.6 で使う、対象 packet の design/tasks ヒント × compass の照合ロジック。`drift-watch: on` のときだけ走る（off / 未記載 / 不正値は何もしない）。enforcement ゲート（Step 1.5・停止しうる）の後・Open Questions 確認（Step 1.7・停止しない）の前に挟み、OpenSpec へ渡す直前――逆戻りが効かなくなる直前――で compass の方向から外れていないかを警告する。

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

- **append-only**: 既存エントリを書き換えたり削除したりしない。常にファイル末尾へ1エントリ追記するだけ。
- **9キーを固定順で必ず全部書く**: `pattern` → `stage` → `packet` → `mechanism` → `outcome` → `user-verdict` → `recorded_at` → `commit` → `note`。9キーのうち1つでも欠けたエントリは書かない。
- **recorded_at**: 記録時刻を ISO 8601 で書く（transaction time）。
- **commit**: `git rev-parse --short HEAD` の結果を書く。非リポジトリ・git CLI 不在などで取得できないときは `-` とする（fail-open。記録は続行する）。
- **drift-log.md が不在のとき**: scaffold のヘッダ（`# Drift Log` 以下の運用説明・エントリ書式）ごと新規作成してから append する。
- エントリ書式は `.intent/drift-log.md` の「エントリ書式」節の見本（`### drift-log entry`）に従う。
