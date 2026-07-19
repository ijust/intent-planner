# Export Route（出口判定レーン）

計画フェーズ（discover→compass→packets）の後、どの出口へ進むかを案件種別から決める **read-only の判定規約**。出口は5系統:

- **cc-sdd 実装 export** → `/intent-export-cc-sdd`
- **OpenSpec 実装 export** → `/intent-export-openspec`
- **Spec Kit 実装 export** → `/intent-export-speckit`
- **読める Spec 射影** → `/intent-to-spec`
- **直接実装（ツール不使用）** → spec ツールを起動せず、packet の Scope に沿って直接編集・実装する（出口コマンドを持たない。`format=direct` を記録しておくと `/intent-writeback` が対象特定でその記録を一次情報に使う＝INV34）

この規約は **intent-packets の単一正本**であり、`/intent-packets` の出口提示と export 系の preflight が本ルールを参照する（rule 本体を他 skill に複製しない）。判定は意味的で、`intent-check.mjs` 等の機械検査スクリプトに寄せない（INV2）。

## 出口選択前の重要判断確認

出口選択前に確認する。Tree、Compass、対象 packet の Open Questions と未定スロットを読み、`CONTRACT.md` の分類で重要判断に当たるものを特定する。packet または別セッションから開始した場合も、この確認を省略しない。

重要判断が**決定・今回の範囲外・範囲限定の明示続行**のいずれにもなっていない間は、影響する packet を `ready` または export 対象にしない。対象 packet と影響根拠を示し、許された結果を得るまで影響を受ける packet を export 対象にしない。一方、無関係な packet の ready 化と出口選択は継続できる。結果を記録した後は、影響する成果物を再確認して影響範囲だけを再開する。

## 入力（すべて read-only 観測）

判定の入力は次の3つ。いずれも Read / Glob で観測し、ファイルの作成・変更・削除をしない（read-only・INV5）:

1. **target format**: `.intent/mode.local.md`（無ければ旧 `.intent/mode.md`）の `format` 行の値（値域 `cc-sdd` / `openspec` / `speckit` / `to-spec` / `direct`）。
2. **mode**: 同ファイルの `mode` 値（`non-code` / `standard` 系）。
3. **導入状況**: 下流 spec ツール3つの**導入目印**の有無。目印はディレクトリの存在を Read / Glob で観測するだけで、ツール本体を実行・変更しない（A6・INV1）。

| ツール | 導入目印 | 出口 |
|--------|----------|------|
| cc-sdd | `.kiro/` | `/intent-export-cc-sdd` |
| OpenSpec | repo 直下 `openspec/` | `/intent-export-openspec` |
| Spec Kit | repo 直下 `.specify/` | `/intent-export-speckit` |

目印が読めない・判別できないときは「未導入」として扱い、判定を止めない（fail-open）。

## 判定（first-match・決定的）

同一の入力に対して常に同一の結果を返す（決定的）。上から評価し最初に該当した行を採る。

### A. format が有効値で明示されているとき（最優先）

| `format` | 推薦する出口 |
|----------|--------------|
| `openspec` | `/intent-export-openspec`（**OpenSpec 案件は OpenSpec を促す**） |
| `speckit` | `/intent-export-speckit`（**Spec Kit 案件は Spec Kit を促す**） |
| `cc-sdd` | `/intent-export-cc-sdd` |
| `to-spec` | `/intent-to-spec` |
| `direct` | **直接実装**（spec ツールを起動せず packet の Scope に沿って直接実装する。出口コマンドは無い。`/intent-writeback` は §1 の対象特定でこの記録を一次情報に使う） |

明示があればその出口を確定的に推薦する（導入目印の有無で覆さない。目印が無いときの注意喚起は各 export skill の preflight warn の役目＝DR25・止めない）。

### B. format が未指定のとき（mode + 導入状況から推論）

`format` が「未指定」（①行が無い ②プレースホルダ値 `(未確定 — …)` ③値域外の値、のいずれか。mode.local.md の読み取り契約に従う）のときは、mode と導入状況から**推論して候補を提示**する。

#### B-1. non-code mode（読める成果物が目的）

`/intent-to-spec` を候補筆頭に置く（DR15）。実装 export 3つ（cc-sdd / OpenSpec / Spec Kit）のうち**導入済みのもの**があれば、B-2 の並べ方で後続候補として併記する（non-code でも実装ツール導入済みは起こりうるため1つに畳まない）。

#### B-2. standard 系 mode（実装案件）: 導入状況で並べる

実装 export 3つを次の順で候補列挙する。**導入済みを先に・未導入は「導入が要る」注記付きで後ろに**置く。

1. **導入済みのツール**（目印あり）を先に並べる。**複数が導入済みのときは優先順位を発明せず**、そのまま候補列挙して人が選ぶ（導入済み同士の序列を作らない）。
2. **未導入のツール**（目印なし）を後ろに並べ、それぞれ「導入が要る」と注記する（候補から**消さない**＝後から導入する経路を潰さない）。
3. 各出口に**案件適合の一言**（下表・固定短文）を添えて、人が選べるようにする。
4. 導入不要の出口（`/intent-to-spec`・直接実装）はこれまでどおり、導入状況に関わらず選べる（実装案件では上記の後に併記する）。

| 出口 | 案件適合の一言（固定） |
|------|------------------------|
| `/intent-export-cc-sdd` | 要件→設計→タスクの3段承認で実装まで運びたい案件に向く |
| `/intent-export-openspec` | 変更提案（proposal）を立てて合意してから実装したい案件に向く |
| `/intent-export-speckit` | GitHub Spec Kit の仕様→計画→タスクの流れで実装したい案件に向く |
| `/intent-to-spec` | 実装でなく読める成果物（文書・調査メモ）が目的の案件に向く |
| 直接実装 | spec ツールを立てるほどでない小〜中規模の直接編集に向く |

導入状況は**観測と注記であって gate ではない**: 未導入を理由に候補から除外しない・判定や export を止めない・インストールを代行しない。

### C. フォールバック

上記以外も含め、format が未指定で入力から出口を**一意に決められないときは、単一の出口に畳まず候補を列挙**する（断定より提示・出口は利用者の意図次第）。

## 規律

- **決め打ちにしない**: 問題は「案件種別・導入状況を見ず1つに決め打ちすること」。別の固定宛先（to-spec 一本道・openspec 一本道）にすり替えない。曖昧なら候補提示。
- **導入済み同士の優先を発明しない**: 「導入済みを先に」は導入**状態**による区分であって、ツール**間**の序列ではない。複数導入済みのときは候補列挙のまま人が選ぶ。
- **未導入を gate にしない**: 目印の不在で候補を消さず・止めない（DR25 の warn-only と同じ哲学。後から導入する経路を潰さない）。
- **read-only**: 判定は観測のみ。状態を書き換えない（INV5）。
- **機械検査に寄せない**: 意味的判定は本ルール + 文脈で成立させ、`intent-check.mjs` 等のスクリプトに移さない（INV2）。ツールレジストリ・導入検知スクリプト・案件適合の自動診断エンジンを作らない（適合の一言は上表の固定短文で足りる）。
- **利用者への問い返しに依存しない**: 出口の提示は本ルールの規約と既定で一意化し、対話補完を前提にしない。
- **外部ツールを触らない**: 導入目印（`.kiro/` / `openspec/` / `.specify/`）の有無を読むのは観測であって、kiro / cc-sdd / OpenSpec / Spec Kit への変更ではない（INV1）。
