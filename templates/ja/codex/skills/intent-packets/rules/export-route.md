# Export Route（出口判定レーン）

計画フェーズ（discover→compass→packets）の後、どの出口へ進むかを案件種別から決める **read-only の判定規約**。出口は4系統:

- **cc-sdd 実装 export** → `/intent-export-cc-sdd`
- **OpenSpec 実装 export** → `/intent-export-openspec`
- **読める Spec 射影** → `/intent-to-spec`
- **直接実装（ツール不使用）** → spec ツールを起動せず、packet の Scope に沿って直接編集・実装する（出口コマンドを持たない。`format=direct` を記録しておくと `/intent-writeback` が対象特定でその記録を一次情報に使う＝INV34）

この規約は **intent-packets の単一正本**であり、`/intent-packets` の出口提示と export 系の preflight が本ルールを参照する（rule 本体を他 skill に複製しない）。判定は意味的で、`intent-check.mjs` 等の機械検査スクリプトに寄せない（INV2）。

## 入力（すべて read-only 観測）

判定の入力は次の3つ。いずれも Read / Glob で観測し、ファイルの作成・変更・削除をしない（read-only・INV5）:

1. **target format**: `.intent/mode.local.md`（無ければ旧 `.intent/mode.md`）の `format` 行の値（値域 `cc-sdd` / `openspec` / `to-spec` / `direct`）。
2. **mode**: 同ファイルの `mode` 値（`non-code` / `standard` 系）。
3. **前提**: `.kiro/` ディレクトリの有無（cc-sdd 導入の有無の手がかり）。

## 判定（first-match・決定的）

同一の入力に対して常に同一の結果を返す（決定的）。上から評価し最初に該当した行を採る。

### A. format が有効値で明示されているとき（最優先）

| `format` | 推薦する出口 |
|----------|--------------|
| `openspec` | `/intent-export-openspec`（**OpenSpec 案件は OpenSpec を促す**） |
| `cc-sdd` | `/intent-export-cc-sdd` |
| `to-spec` | `/intent-to-spec` |
| `direct` | **直接実装**（spec ツールを起動せず packet の Scope に沿って直接実装する。出口コマンドは無い。`/intent-writeback` は §1 の対象特定でこの記録を一次情報に使う） |

明示があればその出口を確定的に推薦する。

### B. format が未指定のとき（mode + 前提から推論）

`format` が「未指定」（①行が無い ②プレースホルダ値 `(未確定 — …)` ③値域外の値、のいずれか。mode.local.md の読み取り契約に従う）のときは、mode と `.kiro/` の有無から**推論して候補を提示**する。4象限すべてを次のとおり扱う:

| mode | `.kiro/` | 結果 |
|------|----------|------|
| non-code | 不在 | `/intent-to-spec` を候補筆頭（読める成果物が目的・DR15） |
| standard 系 | 存在 | `/intent-export-cc-sdd` を候補筆頭（実装案件・cc-sdd 導入済み） |
| non-code | 存在 | **候補列挙**（`/intent-to-spec` を上位に置きつつ `/intent-export-cc-sdd` も併記。non-code でも cc-sdd 導入済みは起こりうるため1つに畳まない） |
| standard 系 | 不在 | **候補列挙**（`/intent-export-cc-sdd`〔導入が要る〕・`/intent-to-spec`・`/intent-export-openspec` を併記。一意に決まらない） |

### C. フォールバック

上記以外も含め、format が未指定で入力から出口を**一意に決められないときは、単一の出口に畳まず候補を列挙**する（断定より提示・出口は利用者の意図次第）。

## 規律

- **決め打ちにしない**: 問題は「案件種別を見ず1つに決め打ちすること」。別の固定宛先（to-spec 一本道・openspec 一本道）にすり替えない。曖昧なら候補提示。
- **read-only**: 判定は観測のみ。状態を書き換えない（INV5）。
- **機械検査に寄せない**: 意味的判定は本ルール + 文脈で成立させ、`intent-check.mjs` 等のスクリプトに移さない（INV2）。
- **利用者への問い返しに依存しない**: 出口の提示は本ルールの規約と既定で一意化し、対話補完を前提にしない。
- **外部ツールを触らない**: `.kiro/` の有無を読むのは観測であって、kiro / cc-sdd / OpenSpec への変更ではない（INV1）。
