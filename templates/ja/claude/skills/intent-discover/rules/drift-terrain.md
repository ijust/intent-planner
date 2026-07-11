# Drift Terrain（逸脱しやすい場面の事前チェック）

`/intent-discover` の Step 3.5 で使う、symptom × 構築中 Intent Tree の照合ロジック。`drift-watch: on` のときだけ走る（off / 未記載 / 不正値は何もしない）。着手前に「この題材は逸脱しやすい場面だ」と名指しし、外れきる前に anti-direction / invariant を先に書かせるのが目的。

## 診断の根拠は型カタログのみ

- **診断の根拠は `.intent/drift-patterns.md` の型カタログだけ**にする。discover の段階では compass も packet もまだ無いため、照合できる材料は型カタログしかない（本質的な制約）。compass の Invariant / Anti-direction を根拠にした照合は export 工程（drift-watch の別フック）の役目であり、ここでは行わない。
- 逸脱しやすい場面の事前チェックは**誤検知前提**。型に「該当した」ことは逸脱の確定ではない。弱い手がかりで早めに名指しし、空振りも含めて記録する。

## 手順

1. **drift-patterns.md を読む**
   - `.intent/drift-patterns.md` を読み、全型（seed + 利用者が育てた型すべて）を取得する。
   - **不在のとき**: 逸脱しやすい場面の事前チェックをスキップし、その旨を利用者に告知する（停止しない / drift-log にも書かない）。以降の手順は実行しない。

2. **各型の symptom を構築中の Intent Tree と照合する**
   - 各型の `symptom` を、いま構築している Intent Tree の**題材（topic）と L0–L3**（目的 / 成果 / 能力 / 振る舞い・設計意図）に照らす。
   - `symptom` は**弱い手がかり**であって「当てはまったら必ず逸脱」という強い判定条件ではない。誤検知前提で、疑わしければ拾う。

3. **該当型があるとき**
   - 利用者に**名指しで提示**する。例:「この題材は `<id>` を逸脱しやすい場面です」。
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
     - `note: <1〜2行>`（場面に該当型が無かった旨）

## drift-log への append 手順

- **分割形で書く（CONTRACT「append-only 記録の分割・archive 規約」）**: drift-log は事象由来なので、単一 `drift-log.md` 末尾へ追記せず **日付+slug 単位の分割ファイル** `drift-log/<date>-<slug>.md` へ1エントリ書く。`<date>` は recorded_at の日付、`<slug>` は pattern（事象）を既存スラッグ規則（`intent-packets/rules/packet-format.md`）で導出する（新採番・連番を作らない）。別事象が別ファイルを触るため末尾衝突が原理的に消える。既存エントリは書き換え・削除しない（**append-only**）。
- **9キーを固定順で必ず全部書く**: `pattern` → `stage` → `packet` → `mechanism` → `outcome` → `user-verdict` → `recorded_at` → `commit` → `note`。9キーのうち1つでも欠けたエントリは書かない。
- **recorded_at**: 記録時刻を ISO 8601 で書く（transaction time）。
- **commit**: `git rev-parse --short HEAD` の結果を書く。非リポジトリ・git CLI 不在などで取得できないときは `-` とする（fail-open。記録は続行する）。
- **`drift-log/` ディレクトリが不在のとき**: ディレクトリを作ってから分割ファイルを書く。旧単一 `drift-log.md` が残っていても読み手は共存して読める（移行は本スライスの migration が担う）。
- エントリ書式は `.intent/drift-log.md` の「エントリ書式」節の見本（`### drift-log entry`）に従う。

## 制約の叩き台の気づき（常時・drift-watch 非連動）

逸脱しやすい場面の事前チェックと並んで、ドメイン定石の叩き台に**早く気づかせる**薄い照合を行う。これは compass を主接点とする制約叩き台の候補提示（`intent-compass/rules/constraint-surfacing.md`）の discover 側の補助であり、上の照合とは別カタログ（`.intent/constraint-starters.md`＝再利用したい制約定石）を見る。意図逸脱とは症状が異なるので**手順を分けて持つ**。

- **この照合は `drift-watch` の値に関わらず常時行う（A40・DR83 宿主④）**。上の drift-patterns 照合が `drift-watch: on` 限定なのと異なり、定石の叩き台の気づきだけは off / 未記載 / 不正値でも走る（案件の最初の工程で定石に気づけるのが最も手戻りが小さいため常時化した・利用者確定 2026-07-04）。`.intent/constraint-starters.md` が不在のときは照合をスキップしてその旨を告知する（停止しない）。薄い照合であり、関係領域だけ pull し当てはまりが弱ければ黙る（後述の歯止め）。
- **これは提示であって自動転記ではない**。候補に気づかせるだけで、Anti-direction / Invariants へ自動で書き込まない。採否・記述は compass で人が行う（主接点）。
- **採否記録の器を読み、採否済みは再提示しない（INV57・DR84）**: 引き継がれた発行ディレクトリの `constraint-ledger.md`（`.intent/discovery/<スラッグ>-<rand>/constraint-ledger.md`・無ければ沈黙）を read し、同一発行系列で採否済みの定石は再提示しない（目的・文脈が否認時から変わったと意味照合で読めるときは否認済みも戻してよい・機械条件なし・INV2）。discover で採否が付いたら器へ1行追記する（`| 定石id | 局面=discover | 採否 | 文脈一行 | 日付 |`）。器・発行ディレクトリ不在時は記録をスキップ。詳細は `.intent/discovery/README.md` の「定石の採否記録」を正とする。この採否記録以外は**どのログにも append しない**（drift-log にも context-cost 系のログにも書かない）。

### 手順

1. **constraint-starters.md を読む（領域インデックスから関係領域だけ pull する）**
   - まず `.intent/constraint-starters.md`（親カタログ）の**領域インデックス**を read-only で読む。本ファイルは分割されており、定石の本体は `.intent/constraint-starters/<領域>.md` にある。
   - 領域インデックスの各行を、いま構築している Intent Tree の題材・ドメインと照らし、**関係しそうな領域ファイルだけ**を read-only で読む（全領域を常時ロードしない）。あれば `.intent/constraint-library.md`（利用者が育てた制約）も read-only で読む。各ファイルから定石（`## id:` 単位）を取得する。
   - 親カタログ・領域ファイル・台帳のいずれも不在ならスキップして告知する（停止しない）。**後方互換**: 領域インデックスが無い（旧 scaffold の単一ファイル）ときは、従来どおり `.intent/constraint-starters.md` 全体を読む。

2. **各定石の「適合する状況」を構築中の Intent Tree と照合する**
   - 各定石の `適合する状況` を、いま構築している Intent Tree の題材・ドメインに照らす。`適合する状況` は弱い手がかりで、当てはまりが弱ければ黙る（誤検知より黙る側に倒す）。
   - 照合に使うのは構築中の Intent Tree の題材のみ。コード差分・実行時メトリクスは読まない。

3. **該当する定石があるとき（気づきの提示・採否記録のみ）**
   - 利用者に指図せず気づかせる言い方で名指しする。例:「この題材は `<id>`（<name>）に当てはまるかもしれません — compass で叩き台として検討できます」。押し付けず、候補を絞る。
   - 詳しい叩き台（Anti-direction 候補・Invariant 候補）の提示と採否は **compass（主接点）に委ねる**。discover では「この定石が効きそう」と早期に気づかせるまで。
   - 採否が付いたら器へ記録する（上記の器の規約）。**器以外のどのログにも append しない**。

4. **該当する定石がないとき**
   - 何も名指さない。**ログにも書かない**（この照合は採否記録の器以外のログを持たない）。
