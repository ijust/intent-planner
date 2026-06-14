# Drift Terrain（地形診断）

`/intent-discover` の Step 3.5 で使う、symptom × 構築中 Intent Tree の照合ロジック。`drift-watch: on` のときだけ走る（off / 未記載 / 不正値は何もしない）。着手前に「この題材は踏みやすい地形だ」と名指しし、外れきる前に anti-direction / invariant を先に書かせるのが目的。

## 診断の根拠は型カタログのみ

- **診断の根拠は `.intent/drift-patterns.md` の型カタログだけ**にする。discover の段階では compass も packet もまだ無いため、照合できる材料は型カタログしかない（本質的な制約）。compass の Invariant / Anti-direction を根拠にした照合は export 工程（drift-watch の別フック）の役目であり、ここでは行わない。
- 地形診断は**誤検知前提**。型に「該当した」ことは逸脱の確定ではない。弱い手がかりで早めに名指しし、空振りも含めて記録する。

## 手順

1. **drift-patterns.md を読む**
   - `.intent/drift-patterns.md` を読み、全型（seed + 利用者が育てた型すべて）を取得する。
   - **不在のとき**: 地形診断をスキップし、その旨を利用者に告知する（停止しない / drift-log にも書かない）。以降の手順は実行しない。

2. **各型の symptom を構築中の Intent Tree と照合する**
   - 各型の `symptom` を、いま構築している Intent Tree の**題材（topic）と L0–L3**（目的 / 成果 / 能力 / 振る舞い・設計意図）に照らす。
   - `symptom` は**弱い手がかり**であって「当てはまったら必ず逸脱」という強い判定条件ではない。誤検知前提で、疑わしければ拾う。

3. **該当型があるとき**
   - 利用者に**名指しで提示**する。例:「この題材は `<id>` を踏みやすい地形です」。
   - その型の「先に書かせるもの」（Anti-direction / Invariant 候補）を、Intent Tree の **Open Questions / anti-direction 候補**へ追記する。題材に依存する部分は文脈から具体化する（型カタログの汎用文をそのまま貼らず、いまの題材に即した文面にする）。
   - `drift-log.md` へ1エントリ append する（後述の append 手順）。値は:
     - `pattern: <該当型の id>`
     - `stage: discover`
     - `packet: -`（discover 段階では packet 未確定）
     - `mechanism: pattern-catalog`
     - `outcome: prevented`（**下書き**。drift-watch の推定であり、確定は利用者の `user-verdict`）
     - `user-verdict: unjudged`
     - `recorded_at: <ISO 8601>`
     - `commit: <短縮ハッシュ | ->`
     - `note: <1〜2行>`（何を名指しし、何を先に書かせたか）
   - 複数型が該当したら、型ごとに1エントリずつ append する。

4. **該当型がないとき（空振り / not-applicable）**
   - 空振りも**必ず記録する**。`missed=0` を「効いた証拠」と誤読しないため、何も該当しなかった瞬間も均等に残す（確証バイアスの構造的回避）。
   - `drift-log.md` へ1エントリ append する。値は:
     - `pattern: -`（該当型なし。`uncatalogued:<短い名>` はカタログ外の実逸脱を指すときの値なので、空振りでは使わず `-` とする）
     - `stage: discover`
     - `packet: -`
     - `mechanism: none`
     - `outcome: not-applicable`
     - `user-verdict: unjudged`
     - `recorded_at: <ISO 8601>`
     - `commit: <短縮ハッシュ | ->`
     - `note: <1〜2行>`（地形に該当型が無かった旨）

## drift-log への append 手順

- **append-only**: 既存エントリを書き換えたり削除したりしない。常にファイル末尾へ1エントリ追記するだけ。
- **9キーを固定順で必ず全部書く**: `pattern` → `stage` → `packet` → `mechanism` → `outcome` → `user-verdict` → `recorded_at` → `commit` → `note`。9キーのうち1つでも欠けたエントリは書かない。
- **recorded_at**: 記録時刻を ISO 8601 で書く（transaction time）。
- **commit**: `git rev-parse --short HEAD` の結果を書く。非リポジトリ・git CLI 不在などで取得できないときは `-` とする（fail-open。記録は続行する）。
- **drift-log.md が不在のとき**: scaffold のヘッダ（`# Drift Log` 以下の運用説明・エントリ書式）ごと新規作成してから append する。
- エントリ書式は `.intent/drift-log.md` の「エントリ書式」節の見本（`### drift-log entry`）に従う。
