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

## コンテキストコストの気づき（drift-watch 連動）

地形診断と並んで、コンテキスト（トークン）を食う進め方に**気づかせる**照合を行う。drift-patterns（意図逸脱の型）とは**別カタログ**であり、症状（symptom）が「意図逸脱」ではなく「コンテキストを食う場面」である点だけが異なる。これは規範ではなく気づきであり、上の drift-patterns 照合とは性質が違うので**手順を分けて持つ**。

- **`drift-watch: on` のときだけ**この照合を行う（off / 未記載 / 不正値のとき何もしない）。`.intent/context-cost-cues.md` が不在のときは照合をスキップしてその旨を告知する（停止しない）。
- **これはどのログにも記録しない**。上の drift-patterns 照合（該当・空振りで `drift-log.md` へ append する）とは異なり、コンテキストコストの気づきは **`drift-log.md` にも他のどのログにも append しない**。理由: 消費量は計測できず outcome を評価できないため、ログに混ぜると drift-log の集計を推測値で汚す。さらに何が文脈を食うかは人により正当に異なり、記録すればプライバシーに踏み込む。**上の「drift-log への append 手順」をこの照合には適用しない**。

### 手順

1. **context-cost-cues.md を読む**
   - `.intent/context-cost-cues.md` を読み、全型（seed + 利用者が育てた型すべて）を取得する。不在ならスキップして告知する（停止しない）。

2. **各型の symptom を構築中の Intent Tree と照合する**
   - 各型の `symptom` を、いま構築している Intent Tree の題材・進め方（topic と L0–L3）に照らす。`symptom` は弱い手がかりで、当てはまりが弱ければ黙る（誤検知より黙る側に倒す＝気づき機能の信頼を保つ）。
   - 照合に使うのは構築中の Intent Tree の題材のみ。トークン消費量・git 差分・実行時メトリクスは読まない。

3. **該当型があるとき（気づきの提示・ログには書かない）**
   - 利用者に気づき口調で名指しする。例:「この題材は `<id>` に当てはまるかもしれません — これがコンテキストを食っている可能性があります」。
   - その型の「もし意図せず効いていれば」の軽い代替（薄い入口 / JIT pull / 入力限定）を、**任意の選択肢**として添える。例:「もし意図せず効いていれば、<軽い代替> もあります（判断はお任せします）」。
   - **矯正・指図をしない**。命令形・断定で言わず、気づきの提示に留める。大量スキルの導入・全文ロード等は正当な高コスト選択でありうるので、コストを食う選択を不要と断じない。判断は利用者に委ねる。
   - **どのログにも append しない**（drift-patterns 照合の append 手順を流用しない）。

4. **該当型がないとき**
   - 何も名指さない。**ログにも書かない**（空振りの記録もしない＝そもそもこの照合はログを持たない）。

## 制約の叩き台の気づき（drift-watch 連動）

地形診断と並んで、ドメイン定石の叩き台に**早く気づかせる**薄い照合を行う。これは compass を主接点とする制約叩き台の候補提示（`intent-compass/rules/constraint-surfacing.md`）の discover 側の補助であり、上の照合とは別カタログ（`.intent/constraint-starters.md`＝再利用したい制約定石）を見る。意図逸脱・コンテキストコストとは症状が異なるので**手順を分けて持つ**。

- **`drift-watch: on` のときだけ**この照合を行う（off / 未記載 / 不正値のとき何もしない）。`.intent/constraint-starters.md` が不在のときは照合をスキップしてその旨を告知する（停止しない）。
- **これはどのログにも記録しない**。上の drift-patterns 照合（`drift-log.md` へ append する）とは異なり、制約の叩き台の気づきは **`drift-log.md` にも他のどのログにも append しない**（context-cost-cues の気づきと同じ扱い）。
- **これは提示であって自動転記ではない**。候補に気づかせるだけで、Anti-direction / Invariants へ自動で書き込まない。採否・記述は compass で人が行う（主接点）。

### 手順

1. **constraint-starters.md を読む**
   - `.intent/constraint-starters.md`（同梱の定石）と、あれば `.intent/constraint-library.md`（利用者が育てた制約）を read-only で読み、全定石（`## id:` 単位）を取得する。いずれも不在ならスキップして告知する（停止しない）。

2. **各定石の「適合する状況」を構築中の Intent Tree と照合する**
   - 各定石の `適合する状況` を、いま構築している Intent Tree の題材・ドメインに照らす。`適合する状況` は弱い手がかりで、当てはまりが弱ければ黙る（誤検知より黙る側に倒す）。
   - 照合に使うのは構築中の Intent Tree の題材のみ。コード差分・実行時メトリクスは読まない。

3. **該当する定石があるとき（気づきの提示・ログには書かない）**
   - 利用者に気づき口調で名指しする。例:「この題材は `<id>`（<name>）に当てはまるかもしれません — compass で叩き台として検討できます」。押し付けず、候補を絞る。
   - 詳しい叩き台（Anti-direction 候補・Invariant 候補）の提示と採否は **compass（主接点）に委ねる**。discover では「この定石が効きそう」と早期に気づかせるまで。
   - **どのログにも append しない**。

4. **該当する定石がないとき**
   - 何も名指さない。**ログにも書かない**（この照合はログを持たない）。
