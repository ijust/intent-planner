# intent-planner（Gemini CLI 向け quickstart）

intent-planner は、実装に入る**前**に「全体の意図」と「統一した設計方針」を人間とエージェントで擦り合わせる、軽量な **Intent Planning レイヤー**です。各ファイル単位では妥当でも全体の設計意図が少しずつ崩れていく architectural drift を、エージェントが横断的な intent を持たないまま局所最適（local optimization）へ逃げることを止めて防ぎます。

これは full IDD framework ではなく、spec 駆動フロー（cc-sdd）の**手前**に挟む pre-spec ステージです。ここで詰めた intent を、cc-sdd の requirements → design → tasks フローへ非破壊・低トークンで橋渡しします。

## ワークフロー

`/intent-discover` から始め、以下を順に実行します。各ステップの成果物（`.intent/` 配下の Markdown）をレビューしてから次へ進みます。

1. `/intent-discover` — Intent Tree（L0–L4）を構築し、Intent の詰め方モードを推奨・確定し、設計者役の詰めの問い（designer-questions）の要否を確認・記録する
2. `/intent-compass` — North Star / Anti-direction / Invariants など判断基準を作る
3. `/intent-packets` — cc-sdd に渡す前の作業単位（packet）に分解する
4. `/intent-export-cc-sdd` — 選んだ packet を cc-sdd の下書きに変換する

上の4つは「計画」フェーズです。export 後も intent は使い捨てず、維持・随時の4スキルでサイクルとして育て続けます。

- `/intent-status` — 随時（迷ったとき）。現在地の要約と「次の一手」をちょうど1つ推奨する（読み取り専用）
- `/intent-validate` — export 前（推奨）。成果物間の矛盾・カバレッジ漏れ・境界不整合を深刻度付きで報告する（読み取り専用）
- `/intent-writeback` — packet の実装完了後。実装で得た学びを `.intent/deltas.md` に delta として記録し、承認された項目だけを canonical 成果物へ昇格する
- `/intent-improve` — 節目（複数 packet 実装後など）。`.intent/` と実装の現実を completeness / correctness / coherence の3軸で再整合する

これらの `intent-*` skill は `.agents/skills/intent-*/SKILL.md` に配置されています（Gemini CLI は `.agents/skills/` を Agent Skills として読み込みます）。

## 能動的な行動促し（命令形・短文）

- 実装に入る前に、まず `/intent-discover` を実行する。
- 現在地に迷ったら `/intent-status` を実行する。
- 実装中は、該当 **packet** と関係する **Invariant** / Decision Rule だけを読む（Compass 全文・Tree 全文は読まない）。
- 新しい用語を造らず、`.intent/glossary.md` の正規語彙（ubiquitous language）を使う。台帳に無い概念を表す必要が出たら、その場で語を発明せず、正規語の有無を `.intent/glossary.md` で確かめ、無ければ正式採用を人に諮ってから台帳へ追記する（造語の疑いは `/intent-validate` の `coinage-suspect` が事後検出するが、まず発明しないことを優先する）。
- 並行セッションとのファイル状態の差分を報告するとき、再生成で直る派生物（`.intent/packets/index.md` 等の生成物）のズレは「再生成で直る派生のズレ」として淡々と扱い、「衝突」「リネームされた」「競合」等の語で利用者を不安にさせない（直し方は `/intent-packets` 再生成を添えるに留める）。一方、正本（`active/` の packet 実体・`intent-tree.md`・`intent-compass.md`・`mode.local.md`・append-only 記録）の並行衝突は実害なので従来どおり報告・回避する。派生物か正本かはファイル名でなく「再生成で直るか・正本が別にあるか」で見分ける。
- ユーザーと接する会話では普通の言葉で話す（最優先・厳守）。内輪の記号・略号（`(a)/(b)` のような列挙符号・未説明の略語・比喩の造語）を説明なしにユーザーへ向けない。識別子（コマンド名・Invariant/packet の id 等）は残してよいが、初出では一行で普通の言葉の言い換えを添える。質問の意図がそれだけで伝わるかを基準にする。**ユーザーへ出力する直前に必ず点検する**: (1) この質問・文章はそれ単体で読み手に意味が通るか（通らなければ専門用語が多すぎる＝書き直す。1つの質問に未説明の専門用語が3つ以上並んだら詰め込みすぎの合図）。(2) 識別子を出すなら初出の言い換えを省いていないか。(3) 直前に読んだ内部設計文書（compass・台帳・rules 等）の語彙をそのまま転写していないか（自分が分かる前提で書かず、初見の読み手に通じる言葉へ開く）。迷ったら結論から・短く・具体例つきで書く。この規律は内部設計に集中しているときほど落ちやすいので、出力ごとに意識的に点検する。

## pull 規律（全ロードしない）

実装前に読むのは「該当 **packet** ＋ 関係する **Invariant** / Decision Rule だけ」。Compass 全文・Tree 全文を常時ロードしない。Spec/Invariant 本体はここに転記せず、参照先を案内する（`.intent/intent-compass.md`・`.intent/intent-tree.md`・`.intent/packets/` 配下の該当 packet）。

## steering 生成は非推奨

責務追加ごとに横断的な `steering`（特に steering custom）を生成しない。必要な制約は intent が `export` を通じて spec 単位に供給する（just-in-time, JIT）ため、新たな steering を立てるより該当する制約を pull することを優先する。

## .intent/ scaffold

Intent の知能（mode 定義・アルゴリズム rules・cc-sdd 橋渡し）と planning 成果物は `.intent/` にあり、エージェント非依存です。

- `intent-tree.md` — Intent Tree（L0–L4）
- `intent-compass.md` — North Star / Anti-direction / Invariants
- `packets/` — Packet Plan（`plan.md`）と packet ファイル（`active/` 配下に 1 packet = 1 ファイル。`index.md` が active packet の一覧で、完了した packet は `archive/` へ移動）
- `mode.md` / `modes/` — Intent の詰め方モード（選択中のモードと designer-questions / purpose の記録、モード定義）
- `cc-sdd/` — cc-sdd へ渡す requirements / design / tasks の下書き（packet 毎に `<スラッグ>/` ディレクトリで保持）

詳細は `.intent/README.md` を参照してください。

## cc-sdd 連携

`/intent-export-cc-sdd` が生成する対象 packet の `.intent/cc-sdd/<スラッグ>/requirements.md`（凝縮 Project Description）を cc-sdd の `/kiro-spec-init` に渡すことで、Intent Planning の成果を cc-sdd の spec 駆動フローへ滑らかに引き継げます。intent-planner は下書きまでで、本体は cc-sdd が生成し各フェーズで人間がレビューします。

## ルール

- Intent Planning フェーズではアプリケーションコードを変更しない。
- parent intent を支えない局所リファクタを提案しない。
- 各 packet は parent intent を必ず参照し、各タスクは invariant を保持する。
- 意図が不明なときはコードを編集せず Open Questions に書く。
- 推測された意図は、人間がレビューするまで暫定として扱う。
- export 済み packet の Scope を超える実装指示が来たら、そのまま実装し続けず `/intent-packets` で新領域の packet を起こす（または既存 packet をスコープ拡大して supersede）→ 再 export で intent に戻る。新領域の決定（認可・整合性・冪等性・エラー意味論）と packet 固有の不変則の抜けを防ぐため。
