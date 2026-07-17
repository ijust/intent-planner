# intent-planner（Gemini CLI 向け quickstart）

intent-planner は、実装に入る**前**に「全体の意図」と「統一した設計方針」を人間とエージェントで擦り合わせる、軽量な **Intent Planning レイヤー**です。各ファイル単位では妥当でも全体の設計意図が少しずつ崩れていく architectural drift を、エージェントが横断的な intent を持たないまま局所最適（local optimization）へ逃げることを止めて防ぎます。

これは full IDD framework ではなく、spec 駆動フロー（cc-sdd）の**手前**に挟む pre-spec ステージです。ここで詰めた intent を、cc-sdd の requirements → design → tasks フローへ非破壊・低トークンで橋渡しします。

## ワークフロー

以下の `/intent-*` は skill 名です。Gemini CLI ではスラッシュ付きで入力せず、「`intent-discover` を実行して」のように自然文で依頼してください。

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
- 実装中は、該当 **packet** と関係する **Invariant** / Decision Rule、`.intent/execution-contract.md` だけを JIT で読む（Compass 全文・Tree 全文は読まない。契約が無ければ従来どおり続行）。
- 新しい用語を造らず、`.intent/glossary.md` の正規語彙（ubiquitous language）を使う。台帳に無い概念を表す必要が出たら、その場で語を発明せず、正規語の有無を `.intent/glossary.md` で確かめる。無くても、既存の普通の言葉の組み合わせで言えないかを先に確かめ、言えるなら新語を登録しない。言えないときだけ、正式採用を人に諮ってから台帳へ追記する（造語の疑いは `/intent-validate` の `coinage-suspect` が事後検出するが、まず発明しないことを優先する）。
- 並行セッションとのファイル状態の差分を報告するとき、再生成で直る派生物（`.intent/packets/index.md` 等の生成物）のズレは「再生成で直る派生のズレ」として淡々と扱い、「衝突」「リネームされた」「競合」等の語で利用者を不安にさせない（直し方は `/intent-packets` 再生成を添えるに留める）。一方、正本（`active/` の packet 実体・`intent-tree.md`・`intent-compass.md`・`mode.local.md`・append-only 記録）の並行衝突は実害なので従来どおり報告・回避する。派生物か正本かはファイル名でなく「再生成で直るか・正本が別にあるか」で見分ける。
- ユーザーと接する会話では普通の言葉で話す（最優先・厳守）。土台は正確さ: 意味が一意に読める正確な記述で書き、平易さは正確さを保ったまま易しく書くための手段とする（易しさのために意味を粗くしない）。内輪の記号・略号（`(a)/(b)` のような列挙符号・未説明の略語・比喩の造語）を説明なしにユーザーへ向けない。識別子（コマンド名・Invariant/packet の id 等）は残してよいが、初出では一行で普通の言葉の言い換えを添える。質問の意図がそれだけで伝わるかを基準にする。**ユーザーへ出力する直前に必ず点検する**: (1) この質問・文章はそれ単体で読み手に意味が通るか（通らなければ専門用語が多すぎる＝書き直す。1つの質問に未説明の専門用語が3つ以上並んだら詰め込みすぎの合図）。(2) 識別子を出すなら初出の言い換えを省いていないか。(3) 直前に読んだ内部設計文書（compass・台帳・rules 等）の語彙をそのまま転写していないか（自分が分かる前提で書かず、初見の読み手に通じる言葉へ開く）。(4) 字面が普通の言葉（例: 代行・配布）でも、このプロジェクト固有の狭い意味を載せて使っていないか（載せたのが自分＝ツール・AI なら、その対話・文書の初出に一行の普通の言葉の言い換えを添える。世間の意味のまま使われている一般語・既存技術用語には付けない）。(5) 比喩や、基準のない曖昧な言い方（「かなり」「うまく」等）だけで意味を渡していないか（比喩を使うなら直後に正確な言い直しを必ず併記する。逆に、確立された専門用語・世間の意味のままの一般語を無理に普通の言葉へ開かない＝かえって曖昧になる）。(6) 作業をした報告は「今回何をしたか」を読み手に通じる言葉で先に示しているか（内部の工程名・ファイル名・記号の羅列やログの転写で代替しない。詳細は求められてから出し、示さないまま次の問いへ進まない）。迷ったら結論から・短く・具体例つきで書く。この規律は内部設計に集中しているときほど落ちやすいので、出力ごとに意識的に点検する。この出力直前の点検は、事後検査（`/intent-validate` の造語検査）と対で働く（予防だけで閉じない）。
- 確認・質問を複数回に分けて出すときは、次の質問束の直前に、直前の回答への具体的な受け止め（回答から何を確定・変更したか）と次の問いの理由を、1〜3文の見える本文で書く（内部の思考は利用者に表示されないため、これを省くと質問が脈絡なく見える）。初回の質問束の前にも「これから何を確認するか」を一文置く。
- 利用者が確定したのは、利用者が言った範囲までとする。明示のない短い承認（「OK」「承認」「次」）は、目の前の成果物と次工程への進行だけの承認として扱い、製品の方向や実装の優先順位の追認として扱わない（それらは明示の問いで確かめる）。利用者の否定的な反応（「使いにくい」「違う」「想定と違う」）は**症状**として受け取り、原因の見立てと解決案は自分の推測として分けて扱う。症状だけの確認を、原因・解決策の確定として記録しない。
- 症状に対処する前に、原因の層を取り違えていないか疑う。(1) 否定的な反応を受けたら、いまの作業単位の中の修正へ直行せず、原因がその外（入力量・不足機能・対象の誤認・少数の例に合わせすぎ）にある可能性を先に確かめる。高ければ作業を止め、上位の意図（Intent Tree・Compass・優先順位）の再診断へ戻る——スコープ外の宣言を、再評価を拒む理由にしない。(2) テストが赤くなったとき「この方向が間違い」とだけ読まず、「この閾値・この検査自体が間違っている」可能性を同じ重さで検討し、根拠を確かめてから決める。(3) 同じ症状に2度目の対処をするなら、過去の失敗記録の**解釈**（なぜその原因だと判断したか）を検証してから動く——同じ壁に2度ぶつかったら、壁ではなく地図を疑う。(4) 一部だけ症状が出ない**非対称**（片方の系統だけ無傷）を「あれは特殊だから」で片付けず、原因を指す手がかりとして診断の起点にする。

## pull 規律（全ロードしない）

実装前に読むのは「該当 **packet** ＋ 関係する **Invariant** / Decision Rule だけ」。Compass 全文・Tree 全文を常時ロードしない。Spec/Invariant 本体はここに転記せず、参照先を案内する（`.intent/intent-compass.md`・`.intent/intent-tree.md`・`.intent/packets/` 配下の該当 packet）。

compass が肥大化して全文 grep でも重いときは、**領域タグで部分ロードする**（compass-category-tag-grep-filter・INV47）。compass の各グループ見出し・項目には `[領域: <name>]`（横断規律は `[領域: always]`）のタグが付いているので、案件の領域を1つ決め、`grep -nE '\[領域: (<案件の領域>|always)\]' .intent/intent-compass.md` のように**案件の領域タグと `always` タグを一緒に引いて**、当たった見出し・項目だけを読む（全文ロードを既定にしない）。`always` を必ず一緒に引くのは、複数領域に効く横断 Invariant（INV2 / INV9 / A1 等）を領域フィルタで落とさないため（落とすと drift＝Anti-direction 226）。タグが未付与の項目が残っていても従来どおり全文読みにフォールバックできる（後方互換）。これは DB・embedding を入れず grep + インラインタグだけで実効化する pull 規律の強化であり、補助スクリプトを足さない（DR71）。分割収納 `.intent/compass/`（1記号=1ファイル・INV80）がある場合は、`index.md` から該当記号のファイルを開き `## Law` だけを読む（無ければ上記の grep のまま＝旧経路は恒久フォールバック・DR133）。

実装に入る前に、該当 packet が触る技術面の**定石だけ**を read-only で薄く照合してよい（`.intent/constraint-starters.md` の領域インデックスから関係領域ファイル `.intent/constraint-starters/<領域>.md` と、あれば個人台帳 `.intent/constraint-library.md` の手段ベースの制約）。強い当てはまりがあれば候補として一言添える（採否は人が判断）。**合致がなければ黙って実装へ進む**——照合を実装のゲートにしない（チェックリスト化・手順の必須化をしない）。採否は発行ディレクトリの `constraint-ledger.md` の記録を尊重し、否認済みを蒸し返さない（カタログ・器が無ければ何もしない）。

packet を実装したコミットには、意図参照（Intent trailer）をメッセージ末尾に任意で1行添えてよい（`Intent: <packet 名> (<packet_id>)` の形・名前と id を併記する）。これは Git 標準の trailer で、後から release-note がこのコミットを「どの意図のために変わったか」を推測せず記録から辿れるようにする。**任意であってコミットの条件にしない**（trailer が無くても従来どおりコミットできる・付け忘れを咎めない・過去のコミットへ後から足さない）。trailer に書くのは識別子（packet 名・packet_id）だけにとどめ、機密な内容・生々しい詳細を書かない（コミット履歴は公開されうる）。

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

## もっと知りたい

- 詳しい使い方（機能ガイド）: https://github.com/ijust/intent-planner/blob/main/docs/guide.md
- 設計の理論的背景: https://github.com/ijust/intent-planner/blob/main/docs/theory.md
