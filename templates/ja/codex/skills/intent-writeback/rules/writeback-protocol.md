# Writeback Protocol（intent-writeback の正本規約）

`/intent-writeback` の判定と手順の正本。SKILL.md は手順の骨格のみを持ち、判定はこのファイルに従う。canonical 成果物とは intent-tree.md / intent-compass.md / `.intent/packets/` 配下（packet ファイル・plan.md）を指す。

## 1. 対象特定（5段優先順 + フォールバック）

上から first-match で対象 packet を1つに特定する。フォールバック（3 以降）で特定した場合は、その事実（どの段で特定したか）を利用者向け出力で告知する。

1. **引数の packet 名**: 引数で packet が指定されていればそれを対象とする。
2. **export-log.md 最新行（正典）**: `.intent/export-log.md`（`| packet | exported_at | commit |` テーブル）の最新データ行 = 末尾のデータ行の packet 名を対象とする。export-log が存在する定常状態では、ここで確定する。
3. **下書きの「## Source Packet」見出し（フォールバック）**: export-log.md が不在・最新行をパース不能な場合、`.intent/cc-sdd/<packetスラッグ>/requirements.md` の「## Source Packet」見出しから packet 名を読む。packet ディレクトリが**1つのみ**存在する場合に限りその見出しを採用する。複数存在する場合は各ディレクトリの見出しを候補として列挙し、5 へ直行する。この段は初回 export 直後など export-log が未整備の過渡期向けの救済であり、定常状態では 2 で確定する。
4. **出口の明示記録・推論による直接実装ルート（cc-sdd / openspec を経ない案件）**: ② ③ はいずれも cc-sdd export を前提にしているため、nl-spec(`/intent-to-spec`)や直接実装（spec ツール不使用）で進めた案件は ② ③ が構造的に空になる。この段は **出口の明示記録を一次情報・推論をフォールバック**として、cc-sdd を経ない案件の対象 packet を特定する（「選択 ＞ 推論」・INV34）。次の順に評価する:
   - **4a. 出口の明示記録ルート（一次情報）**: `format` 行を CONTRACT.md の read fallback 規約（引き継がれた発行ディレクトリの `discovery/<スラッグ>-<rand>/mode.md`〔A34〕→ 無ければ単一 `.intent/mode.local.md`〔legacy〕→ 無ければ旧 `.intent/mode.md`）の順で読み、その `format` 行が `direct`（ツール不使用の直接実装）のとき、当該案件を直接実装案件とみなす。`active/`→`archive/` の frontmatter `name` 照合で done の対象 packet を候補列挙し、**一意なら確定**・複数なら 5 へ落とす。
   - **4b. 推論ルート（4a が無いときのフォールバック）**: `format` が `direct` でない／未記録のとき、`spec_refs が空 + export-log に行が無い + state=done` の**3条件 AND**を満たす packet を直接実装案件と推定する（いずれも機械観測可能・決定的）。`active/`→`archive/` の `name` 照合で候補列挙し、**一意なら確定**・複数なら 5 へ落とす。delta の `Source` 欄の手記（「直接実装」等）・git コミットは**一次情報にしない**（delta は writeback 後にしか書かれず初回 writeback 時点で不在＝鶏卵になるため）。これらは候補が複数 done packet に当たったときの絞り込み補助に限る。
5. **テキスト照合フォールバック（利用者確認必須）**: 下書き本文と index.md / `active/` 配下の packet ファイルの packet 名（frontmatter の `name`）をテキスト照合して候補を挙げ、利用者に自然言語で問い、回答を待つ。確認なしに対象を確定しない（4 で複数候補に当たった場合の最終救済もここ）。

それでも特定できなければ、状況（見つからなかった旨と調べた場所）を提示し、書き戻し対象 packet の指定を利用者に求めて停止する。

**ディレクトリ同定規則（packet 名 → ディレクトリ）**: packet 名からディレクトリを同定する正は「ディレクトリ内 requirements.md の `## Source Packet` 見出しが packet 名と一致すること」。スラッグ計算は探索の高速路であり、スラッグが一致しても見出しが一致しなければそのディレクトリとは同定しない。

**対象解決の archive 例外**: 解決された対象 packet のファイルが `active/` に無い場合（先行する supersede・完了処理済み等）は、`archive/` 配下を frontmatter の `name` 照合で**明示的に**参照して特定する（「通常 archive/ を読まない」原則の唯一の明示例外）。特定したら、当該 packet が done / superseded である事実を利用者に報告する。archived かつ未 done の packet への書き戻しでは、対象 packet ファイルへは反映せず、学びを intent-tree.md / intent-compass.md / 後継 packet（`superseded_by` の指す packet ファイル）へ振り向ける。

## 2. 学び抽出の観点（5種・タグ1:1）

対象 packet の定義（対象 packet ファイル）・cc-sdd 下書き（Intent 由来の制約を含む）・intent-compass.md と、実装の現実（コードベース・テスト・`.kiro/specs/`。すべて読み取りのみ）を突き合わせ、次の5観点で学びを抽出する。タグは観点と1:1。実装の現実を読む際、Decision Rule（intent-compass.md）が名指すコードモジュール（ファイル名・モジュール名）も grep 突合の視野に含め、Rule 主文と実装の乖離を `[invariant-violation]` として抽出してよい。

抽出した各学びは、`[tag] <平易な要約一文（必須）>` の形で書く。要約は専門用語で圧縮した名詞句ではなく、その packet を実装していない承認者がそのまま読んで意味の取れる平易な文にする（伝わりやすさを優先し、多少長くなってよい）。背景・根拠・含意の補足が要るときだけ、その下に字下げした `  - 解説: <…>` を任意で添える（解説は必須ではなく、要約のみの学びが正規形）。これは §9 の deltas.md 正規テンプレートと同じ書式であり、ここで抽出した学びはその書式のまま §9 へ記録される。

| タグ | 観点 |
|------|------|
| `[decision]` | 新しい決定（実装中に下した、packet 定義に書かれていない判断） |
| `[invariant-violation]` | 発見された invariant 違反（既存 Invariants と実装の現実の衝突） |
| `[implicit-behavior]` | 意図に書かれていなかった暗黙挙動（実装からの逆抽出） |
| `[deferred-resolved]` | 解消された Deferred |
| `[question]` | 新たな未解決 Question |

学び抽出時に intent-compass.md の Decision Rules の **Revisit when** 欄と突き合わせ、Revisit when 条件に合致する学びの行には該当 Decision への参照を付記する（例: `[decision] <新しい決定>（Revisit 該当: <該当 Decision の Context 要約>）`）。付記は学び行内の自由記述であり、deltas.md の正規テンプレート（§9）は変更しない。

**不具合起因の学びの帰責分類（任意・追加タグ・INV63/A49）**: writeback の対象に**不具合（バグ）を直した学び**が含まれるとき、その学びを「どこに原因があったか」で任意に仕分けてよい。同じ「バグを直した」でも原因の在り処によって戻し先が違う——バグは意図の品質シグナルであり、意図の穴が原因の不具合が繰り返される構造を記録から見えるようにする。既存5タグに次の3タグを**追加**する（既存タグの意味・書式・承認粒度は不変＝pure addition・INV29）。付けるかは任意で、付けない従来どおりの学びも今までどおり通る（必須化しない・Anti-direction 298）。

| タグ | 観点（不具合の原因の在り処） | 分類に応じた戻し先（すべて提案どまり・自動転記しない） |
|------|------|------|
| `[bug-impl]` | 実装の誤り（意図は正しかった＝意図側は無傷） | delta の記録のみ。意図（tree/compass/packet）は触らない。必要なら §3 第3段の個人台帳昇格に乗せてよい |
| `[bug-intent-gap]` | 意図の欠落（書かれていなかったから誤実装された） | Open Questions への追記案・新 packet の種として提示する（人が判断） |
| `[bug-intent-wrong]` | 意図の誤り（書いてあった意図自体が間違っていた） | compass の該当 Invariant / Decision Rule への改訂**候補**として提示する（人間承認が堰＝§4 の ADR 昇格規約を通す・AI が勝手に compass を書き換えない・Anti-direction 303） |

- **分類は人が宣言する**: AI は分類の候補と根拠1行（なぜその分類か）を提示するまで。確定は §3 の承認段で人が行う（AI 判定を最終値にしない・Anti-direction 299）。
- **複合原因は「分類保留」でよい**: 単一分類を強制せず、迷う学びは分類を付けずに（従来どおりの5タグのみで）記録してよい。推測で無理に1つに決めない。
- **過去 delta への後埋めをしない**: 既に記録済みの過去の学びに遡って分類を付ける一括作業を強制しない（Anti-direction 304・次に触る学びから始める）。
- 分類タグは既存の学び行の書式 `[tag] <平易な要約一文>` にそのまま乗る（`[bug-intent-gap] 認証の失効時刻を意図に書いておらず実装が独自解釈した（根拠: packet に失効の記述なし）` のように、要約に根拠1行を含める）。§9 の deltas.md 正規テンプレートの見出し構造は変更しない。

**DB 設計落差の理由記録（intent-validate の `db-design-implementation-drift` 連携）**: 対象 packet に叩き台 DB 設計（`.intent/db-design/<スラッグ>/`）があり、`/intent-validate` が「叩き台 vs 実装スキーマ」の落差を検出している場合、「**なぜ叩き台と違う設計にしたか**」を学びとして抽出する（新しいタグ・新しい昇格経路は作らず `[decision]` に乗せる＝実装中に下した、叩き台に書かれていない設計判断）。各落差項目を「**参照された**（叩き台どおり）／**意図的変更**（理由付き＝実装で詰めた正当な変更）／**未回収**（理由不明の乖離）」のいずれかに仕分け、意図的変更には理由を要約に含める。未回収（理由不明の乖離）は `[question]` として残し、静かに消さない（lossy-projection＝落差の可視化）。これらの学びは通常どおり §3 の二段階プロトコル（delta 記録→承認→昇格）に乗り、承認された理由だけが canonical（compass の Invariant・packet の Safety 等）へ昇格する。叩き台が無い案件・落差が無い案件では本抽出はスキップする（behavior-preserving）。

## 3. 二段階プロトコル

**この §3 の制約の射程は writeback フェーズ（実装後に現実から学びを逆抽出して canonical へ戻す局面）に限る。** 実装**前**に判断基準・作業単位を起草する `/intent-compass`（compass の North Star / Anti-direction / Invariants / Decision Rules を直接 Write する）・`/intent-packets`（packet ファイルを直接起案する）は起草スキルであり、本制約の対象外（それらが canonical を直接書くのは正規動作）。本制約が禁じるのは「実装後の学び反映を delta を経ずに canonical へ直接書き込むこと」であって、実装前の起草ではない。

writeback フェーズにおいては、canonical 成果物を直接書き換えないことが本スキルの根幹。必ず次の二段階を踏む。

なお「実装が完了し、その現実から学びを canonical へ戻す」局面に入ったら、それは writeback フェーズの入口である。packet ファイルへ Evidence を直書きして済ませず、本プロトコル（delta 経由）を通す。

### 第1段: delta 記録（canonical 不可侵）

- 抽出した学びを deltas の **packet 単位の分割ファイル** `.intent/deltas/<packet-slug>.md` に新規エントリ（Status: pending）として記録する（CONTRACT「append-only 記録の分割・archive 規約」。`<packet-slug>` は対象 packet 名から既存スラッグ規則で導出・新採番なし）。`deltas/` ディレクトリが無ければ作る。この段階では canonical を一切触らない。終端（promoted/closed）になった過去エントリは `.intent/deltas/archive/<年>/` へ退避し active を薄く保つ（移しきってから旧を畳む・移行は本スライスの migration が担う）。
- 利用者が何も承認しなくてもエントリは pending のまま残る（承認なしの自動書き換え禁止）。

### 第2段: 承認 → 項目ごと昇格

承認の粒度は学びの種類で分ける。すべてを同じ重みで一件ずつ問わない（実運用では大半が「実装が既にそうなっている事実の記録」であり、yes/no の余地がないため、全件を一律に問うと承認が儀式化する）。

- **ゲート対象（明示承認が必須）**: 次の2種は canonical の判断基準・不変条件に影響するため、必ず項目ごとに利用者へ自然言語で問い、回答を待つ。
  - `[invariant-violation]`（発見された invariant 違反。「コード修正する / 記録のみに留める」等の対応方針を利用者が決める）。
  - **Decision Rules（compass の ADR）の変更を伴う `[decision]`**（§4 の ADR 昇格に該当するもの。Revisit when 該当を含む既存 Decision の置き換え・追加）。
- **既定一括昇格（packet 追記系）**: 上記以外の学び（`[implicit-behavior]`、packet 固有に留まる `[decision]` / `[deferred-resolved]`、および `[question]` の Open Questions 転記）は、反映先を一覧で提示し、**個別に止めたい項目があれば指定を求めたうえで、無指定なら一括で昇格する**。一件ずつの yes/no は求めない。
  - **昇格先＝紐づく packet の `## Expected Behavior`（DR63・肥大化解消）**: `[implicit-behavior]`（および packet 固有に留まる `[decision]` / `[deferred-resolved]`）は、**その学びを生んだ実装の packet（active/ の対象 packet、既に archive 済みなら archive 配下の当該 packet）の `## Expected Behavior` 節へ事後追記する**（intent-tree.md L3 へは追記しない）。packet は pull 規律の本体（実装直前に必ず読む）なので学びが確実に pull され、packet が closed→archive されれば学びも packet ごと退いて intent-tree.md L3 が肥大化しない。**変えるのは昇格先だけで、二段階昇格の経路（delta=pending → 承認 → promoted）は不変**＝packet へ直書きして delta を飛ばさない（§3 冒頭「承認なしの自動書き換え禁止」を維持）。
  - **フォールバック**: 学びに紐づく packet が同定できない（対象 packet を active/ にも archive にも特定できない）場合は、従来どおり intent-tree.md L3 へ追記し、その旨を明示する（昇格先が無いという理由で学びを落とさない）。
  - **横断的 `[decision]` は §4 経由**: packet 固有を超えて他を縛る `[decision]`（Decision Rules を変える）は本経路でなく上の「ゲート対象」＝§4 の ADR 昇格で compass の Decision Rules へ昇格する（分岐は保たれる）。
- いずれの経路でも、第1段で全件 delta 記録済みであること・利用者に止める機会を1回提示することで「承認なしの自動書き換え禁止」（§3 冒頭の根幹）は維持される。利用者が止めた項目は見送り扱いとし §5 の2値タグを付す。
- 承認・一括昇格された項目を canonical へ反映し、delta エントリに `Status: promoted (<昇格日>)` と反映先を記録する。
- 状態の確定: **1件以上を承認して canonical 反映 → `promoted`**。**全項目を「却下」で見送り → `closed`**。どちらも終端状態。保留を含んで未確定のままなら pending を維持する。

### 第3段: 個人台帳（constraint-library）への昇格を問う（任意・read-only 提示・人が採否）

canonical 昇格（第2段）に続けて、**この案件で実装して効いた制約**を利用者の個人台帳 `.intent/constraint-library.md` へ昇格するかを read-only で問う。これは「今書いた制約」を採用直後に拾う compass 側の蓄積（`constraint-surfacing.md` 手順5）に対し、**「実装して初めて効くと分かった制約」を実装後に拾う**writeback 側の蓄積であり、両者でタイミングが違う（同じ機能を二重化せず局面を分ける）。

- **昇格候補のタグを限定する。** 個人台帳へ昇格を問うのは、抽出した学びのうち **`[decision]`（実装で採った設計判断＝再利用したい制約になりうる）と `[invariant-violation]`（守るべきだった不変＝定番の Invariant 候補）** のタグが付いたものに限る。`[implicit-behavior]`（実装が既にそうなっている事実の記録＝再利用制約になりにくい）・`[deferred-resolved]`（遅延の解消）・`[question]`（未解決の問い）は個人台帳の昇格対象にしない（過剰提示を避け、§4 の canonical 昇格判断を埋もれさせない）。
- **タグだけで問わず「台帳に入れる利益」でふるう。既定は黙る（利益が明確に読み取れるときだけ問う）。** タグが `[decision]`／`[invariant-violation]` でも、それだけで自動的に問わない。`[decision]` は実装すればほぼ毎回出る（packet に書いていない判断は普通に発生する）ため、タグ一致を昇格条件にすると毎回発火して推薦が雑になる。個人台帳は**定石（他案件で再利用できる制約の定番）の台帳**なので、**判断の既定を「黙る」に置き、台帳に入れる利益が明確に読み取れる学びだけを問う**（利益が読み取れない／迷うときは問わない）。「利益が明確」の見定めには次の観点を軽い手がかりに使う（すべてを毎回必須確認するチェックリストにはしない・どれかが明確に当てはまれば利益あり側、どれも読み取れなければ黙る側へ倒す）:
  - **横展開できるか**: この packet 固有でしか効かない一回性の判断でなく、他の案件・他の packet でも同じ形の制約として効く見込みが読み取れるか。
  - **既にカバーされていないか**: 同じ趣旨の制約が既存の Invariant（compass）や同梱の定石カタログ（constraint-starters）で既に効いていないか（重複を台帳へ足さない）。
  - **後で実際に効く場面が想像できるか**: 次にこの制約が読まれて判断を変える具体的な局面（どの工程・どの手段トリガで効くか）が想像できるか。
  この既定（黙る）は `constraint-surfacing.md` 手順5「starter 機能への信頼を保つため false positive より silence に倒す」と同じ規律を writeback 側にも持ち込むもので、迷ったら問わない側へ倒す（過剰提示より沈黙）。この判定は機械的スコア・再利用回数の閾値でなく学びの内容から意味で読む（新フィールドは足さない）。
- **記入スキーマの下書きを見せる。** 問うときは、対象の学びを個人台帳の確定スキーマ（`## id:` / name / 領域 / 適合する状況 / 制約 / 由来）へ写した**下書き候補**を提示する。`由来` 欄には「どの packet・どの案件で実装して効いたか」を下書きで埋める（`領域` は学びの文脈から code|non-code を推定して下書きし、人が修正できるようにする）。利用者はこの下書きを見て採否・修正する。
- **既に台帳にある制約は再提示しない（重複排除）。** `.intent/constraint-library.md` に同じ `id`（または実質同じ制約）が既載なら、その制約の昇格は問わない（毎回同じ制約を並べて煩わせない）。
- **自動で台帳に追記しない。** 追記は利用者が採否を承認してから行う（自動的な蓄積は行わない＝read-only の堰＝§3 冒頭「承認なしの自動書き換え禁止」を蓄積側へ延長）。**昇格候補タグの学びが無ければ・候補が全て既載なら何も問わない。**
- **蓄積はこのプロジェクト内にのみ閉じる。** 追記先は当該プロジェクトの `.intent/` 配下のみで、プロジェクトをまたいで制約を共有・永続する仕組みは提供しない（横断蓄積を案内しない）。
- **後方互換**: 個人台帳 `.intent/constraint-library.md` が不在のときは、個人台帳への昇格をスキップしその旨を告げる（停止しない）。この第3段は canonical 昇格（第2段）とは独立で、個人台帳昇格を使わなくても writeback の本筋（delta 記録・canonical 昇格・done 化）は従来どおり進む。

## 4. ADR 昇格規約（Decision Rules の変更を伴う昇格）

判断基準（Decision Rules）の変更を伴う昇格は、intent-compass.md の既存 ADR 形式に完全準拠する。

- **新エントリを追加する**: **Context**（問いと状況）/ **Decision**（採る選択肢）/ **Why**（基準）/ **Alternatives considered**（検討した代替案と不採用理由の要約）/ **Consequences**（Invariants・Anti-direction への接続）/ **Revisit when**（見直し条件。定まらない場合は「未定」と明示記録する）。**Why 欄は必須**（省略しない）。
- 置き換えられる旧エントリには **superseded 注記**を付す（旧エントリ側に superseded である旨と置き換え先への参照を追記する）。
- superseded 注記を付した旧エントリは、**6欄のまま**（要約への置換をしない）退避された Decision Rule の **rule 単位ファイル** `.intent/compass-archive/<rule-slug>.md` へ move する（CONTRACT「append-only 記録の分割・archive 規約」。`<rule-slug>` は退避する Decision Rule の識別子を既存スラッグ規則で導出・新採番なし。同一 rule の再 supersede は同ファイルに集まる）。`compass-archive/` ディレクトリが無ければ作る。旧エントリは削除しない（移動のみ・6欄 byte 不変）。active な Decision Rules エントリは現行どおり intent-compass.md 内に直接記載のまま保つ（別ファイルへのポインタ化をしない）。
- **独自の Supersedes フィールドは導入しない**（新エントリ側に専用フィールドを作らない。注記は旧エントリ側に付す）。
- 6欄形式の導入前に記録された旧4欄エントリ（Alternatives considered / Revisit when を持たないもの）は有効として扱い、欄の不足をエラー・指摘・書き換えの対象にしない。

### 結論だけを昇格しない（根拠を併走させる・訂正可能性）

canonical へ昇格するのは結論だけではない。**結論（昇格する Invariant / Decision）を導いた根拠（理由・制約・前提・トレードオフ）を併走させる。** 結論は根拠から再導出できるが、根拠は結論から再導出できない（非対称）。根拠を捨てた昇格物は、後でそれを否定する事実が来ても再評価・訂正できず、古い誤りを自信を持って言い続ける（brittle memory 化）。これを防ぐため、昇格の節目で次を確認する（§3 第2段の ADR 昇格＝Decision Rules・L3 追記系の昇格の双方に適用する）。

- **根拠は既存構造へ併走させる**: ADR 昇格なら Decision Rule の **Why / Consequences** 欄、Invariant 昇格なら Invariant 本文、それ以外は delta の任意の `  - 解説:` 側へ。新しい必須フィールド（`根拠:` 等）は導入しない。**平易な要約（§2/§9 の必須要約）は根拠込みの圧縮タグへ戻さない** — 要約はそのまま読める形を保ち、根拠は解説側に併走させる。
- **質的 completeness フラグを添える**: 昇格の節目で、その昇格に「根拠が併走しているか」を**質的なフラグ**（例: 「根拠あり」／「根拠が辿れない」の短い注記）で添える。これは承認者が一目で訂正可能性を確認するための軽い印であり、**数（k/N）では持たない**（Intent の根拠は離散的に数えにくい）。「根拠が辿れない」昇格は隠さず明示し、辿れない根拠は推測で埋めず `[question]` として §6 へ逃がす。
- **AI が根拠を捏造しない（最重要）**: 根拠の併走は read-only で促すまでで、記入の主体は人（利用者）。AI が根拠を自動補完して結論を後付け正当化すると brittle memory を悪化させる。根拠が自明な昇格（既出根拠の参照・一般に自明な判断）には併走を強制しない（正当な省略を許す）。

## 5. 見送りタグの確定更新（writeback の責務）

- 昇格しなかった学びには2値タグを必ず付す: **却下（再提案不要）** | **保留（次回 writeback で再提案）**。
- 保留タグの項目は次回 writeback 起動時に再提案する。再提案の結果（昇格 / 却下確定 / 継続保留）を**旧エントリの該当見送り項目のタグへ反映する確定操作は writeback の責務**である。`/intent-improve` は保留項目への対応を促す誘導のみを行い、タグの確定更新は行わない。

## 6. [question] の消化

- `[question]` タグの学びは、intent-tree.md の Open Questions へ転記した時点で消化済みとする。
- 昇格記録の反映先に転記先（intent-tree.md Open Questions）を記録する。

## 7. 完了の一連操作（done 化・archive 移動・index 再生成）

対象 packet の writeback が完了したら（delta の終端状態の確定後）、packet の完了処理を次の**順序固定の一連の操作**として行う（done のまま `active/` に滞留する状態を作らない）。

0. **受入オラクルと実テストの対応（verified-by）を実測で記入する（任意・実測ベース・INV63/A49）**: 対象 packet の `## Validation` の各受入オラクル（「誤った実装を落とすものさし」）に対し、それを実装後に守っている**実テスト**（ファイルパス+テスト名）を `## Verification protocol` の verified-by として記入する。**実測に基づく**こと — 実在するテストだけを書き、確認していない対応・存在しないテストを書かない（捏造ゼロ・Anti-direction 299）。対応する実テストが無いオラクルは推測で埋めず「未対応」と明示する。この記入は任意であり、gate にしない（記入が無くても done 化は従来どおり進む・Anti-direction 298）。書式（テスト名まで含むか・複数テストの並べ方）は実装裁量。`## Verification protocol` 節が無い旧 packet に遡って一括記入することを強制しない（次に触る packet から差分で始める・Anti-direction 304）。記入後、read-only の `/intent-validate`（`oracle-test-link-missing` 軸）が対応の切れ・未対応を後から名指しできる（書き手＝本工程・読み手＝validate の対で往復が閉じる）。
1. 対象 packet ファイルの frontmatter に `state: done`・`closed_at`（完了日）・`spec_refs` を記入する。`spec_refs` は対応する spec/feature 名であり、`.kiro/specs/` の進行 spec と照合して候補を挙げ、利用者確認で確定記入する。
2. packet ファイルを `archive/<closed_at の年>/` へ移動する（削除しない。移動のみ）。
3. `index.md` を再生成する: `active/` 配下の全 packet ファイルの frontmatter のみから `| packet_id | name | state | summary |` テーブルを `packet_id` 昇順で構成する（`active/` が空ならヘッダのみが正規形）。
4. **canonical 履歴退避の促し（DR64・肥大化解消・任意）**: その機能が一段落した節目なら、`intent-tree.md` 本体に積もった当該機能の履歴（`## Impact Analysis（… が触れる既存境界）`・`## L4 Candidate Packets` の出荷済み群・役目を終えた `## 機能追記: <slug>`）と、`intent-compass.md` 本体の当該機能の `### <機能> 固有（プレモータム: …）` Anti-direction ブロックを、退避先（`intent-tree.history.md` / `compass-history.md`）へ **move する**ことを促す（A19 の active 面/履歴分離と同型・退避記法は各退避先ファイルの冒頭規約に従う）。**move であって edit でない**＝本体にあった文面・番号・意味を変えずに移し、現役 canonical の改変と履歴退避を混ぜない（Anti-direction 210）。履歴は削除でなく退避し退避先も grep できる形を保つ（Anti-direction 211）。退避先ファイルが不在なら退避をスキップし作成を促す（履歴を消さない）。これは促しであって強制ではない（packet 完了処理 1–3 は履歴退避が無くても従来どおり完了する＝behavior-preserving）。`compass-archive.md`（superseded Decision Rules 専用）とは退避先が別。

中断などで done のまま `active/` に残った場合は、`/intent-status` の整合検査が滞留として報告する。

## 8. 過去エントリ一覧の提示（再書き戻し）

- **読み取りは分割形で横断する（CONTRACT「append-only 記録の分割・archive 規約」。`intent-overview` の `aggregate-sources.md`・`intent-status` の decision-table 脚注10と同一規律）**: `deltas` / `export-log` の過去エントリを読むときは、分割形 `.intent/<rec>/*.md` 群（あれば正本・自然キー昇順）→ 無ければ旧 `.intent/<rec>.md`（生成ミラー）への read fallback の順で横断読みする。分割形と旧単一ミラーが共存するときは**分割形を正本**とし、ミラーを二重に数えない。archive（`.intent/<rec>/archive/`）は履歴として読む（active 集計に混ぜない）。この読み取りは書き込み（§4 の分割書き込み）と別経路であり、書き戻し漏れの突合・過去エントリ一覧の提示が分割前後で同じ結果を返す（behavior-preserving）。
- 起動時に、対象 packet の過去 delta エントリ一覧（「保留」タグ付きの見送り項目を含む。上記の分割形横断読みで収集）を必ず提示する。
- 同一 packet の再書き戻し（再 export・再実装後）は、既存エントリを書き換えず**新エントリ**として追記する（履歴保持）。
- 「対応 delta の有無」の機械判定は**初回サイクルのみ**有効。2巡目以降の書き戻し要否は、過去エントリ一覧を提示した上で利用者が判断する。
- writeback の完了後も対象 packet の下書き（`.intent/cc-sdd/<packetスラッグ>/`）は**削除しない**（packet ごとに永続保持）。書き戻し漏れの列挙は、export-log（分割形横断読み）の全行 × 残存する `.intent/cc-sdd/<packetスラッグ>/` 下書き × deltas（分割形横断読み）の突合で行う。
- **直接実装案件（出口 `direct`・§1 の 4 で特定する案件）は §8 の突合の射程外**: cc-sdd / openspec を経ない直接実装案件は export-log にも cc-sdd 下書きにも現れないため、上記の書き戻し漏れ列挙（export-log × cc-sdd 下書き × deltas の突合）では検出されない。これは別軸（対象特定でなく漏れ列挙）であり、直接実装案件の漏れ列挙を §8 に持ち込まない（§1 の対象特定が直接実装を扱う一方、§8 の漏れ突合は cc-sdd/openspec 案件に閉じる・INV34）。

## 9. deltas.md 正規テンプレート（正本）

以下が deltas.md の正規テンプレートの**正本**であり、scaffold（配布後の `.intent/deltas.md` の初期内容）はその写し。見出し構造を変えるときは必ずここを先に変える。

- `.intent/deltas.md` が無い環境（既存利用者）では、初回起動時にこのテンプレートから新規作成する。
- **既存の deltas.md は上書きしない**（非破壊）。既存ファイルにはエントリの追記・Status とタグの更新のみを行う。

```markdown
# Intent Deltas

> `/intent-writeback` が記録し、`/intent-status` と `/intent-improve` が参照します。canonical 成果物（intent-tree.md / intent-compass.md / `.intent/packets/` 配下の packet ファイル・plan.md）は、この delta 経由でのみ事後更新されます。

## 運用説明

- 書き戻しは二段階です: `/intent-writeback` はまず学びをここに delta として記録し（canonical は直接書き換えない）、ユーザーが承認した項目だけを canonical 成果物へ昇格させます。
- 1 packet の1回の書き戻し = 1 エントリ。同一 packet の再書き戻し（再 export・再実装後）は新エントリとして追記します（履歴保持）。「対応 delta の有無」の機械判定は初回サイクルのみ有効で、2巡目以降の書き戻し要否は過去エントリ一覧を見てユーザーが判断します。
- 下書きの保持（packet 毎ディレクトリ）: `.intent/cc-sdd/<packetスラッグ>/` の下書きは packet ごとに永続保持されます（Git 非追跡・ローカル専用）。書き戻しが完了しても下書きは削除されません。export 履歴は `.intent/export-log.md` に記録されており（export ごとに packet 名・日時・コミットを1行追記）、過去に export した packet の書き戻し漏れは export-log.md の全行 × 残存する `.intent/cc-sdd/<packetスラッグ>/` 下書き × このファイルの突合で列挙します。

## 状態の意味論

- `pending`: 記録済みで未昇格。
- `promoted` / `closed` は終端状態です。1件以上を承認して canonical へ反映 → `promoted`、全項目を「却下」で見送り → `closed`。
- 見送り項目には「却下（再提案不要） | 保留（次回 writeback で再提案）」の2値タグが必須です。保留の項目だけが次回 `/intent-writeback` での再提案対象（および `/intent-improve` の確認対象）になり、タグの確定更新（昇格 / 却下確定 / 継続保留）は `/intent-writeback` が行います。
- `[question]` タグの学びは intent-tree.md の Open Questions へ転記した時点で消化済みです（転記先を昇格記録の反映先に記録します）。

## Delta: <packet-name> — <ISO 8601 日付>

- Status: pending | promoted (<昇格日>) | closed (<クローズ日>)
- Source: export-log.md 最新行 | .intent/cc-sdd/<packetスラッグ>/ の Source Packet | ユーザー指定

### 学び

各学びは `[tag] <平易な要約一文（必須）>` で書きます。要約は専門用語で圧縮した名詞句ではなく、その packet を実装していない承認者がそのまま読んで意味の取れる平易な文にします（伝わりやすさを優先し、多少長くなってよい）。背景・根拠・含意の補足が要るときだけ、その下に字下げした `  - 解説: <…>` を**任意で**添えます（解説は必須ではなく、要約のみの学びが正規形です）。

- [decision] <実装中に下した、packet 定義に書かれていない判断を平易な一文で>
  - 解説: <なぜその判断に至ったか・背景や根拠（任意。不要なら付けない）>
- [invariant-violation] <既存 Invariant と実装の現実が衝突している箇所を平易な一文で>
  - 解説: <どの Invariant とどう衝突するか・想定される対応（任意）>
- [implicit-behavior] <意図に書かれていなかったが実装が既にそうなっている挙動を平易な一文で（多くは要約のみで成立）>
- [deferred-resolved] <保留にしていた事項がどう解消されたかを平易な一文で>
- [question] <新たに浮かんだ未解決の問いを平易な一文で>

### 昇格記録（promoted / closed 時）

- 反映先: intent-compass.md Decision Rules 新エントリ（旧エントリに superseded 注記）/ intent-tree.md L3 / 対象 packet ファイル（active/ 配下）/ plan.md の Deferred（解消の注記）
- 見送り: <昇格しなかった学び> — 却下（再提案不要） | 保留（次回 writeback で再提案）
```
