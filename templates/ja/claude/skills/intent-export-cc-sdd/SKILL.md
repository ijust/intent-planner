---
name: intent-export-cc-sdd
description: 選んだ packet 1つを、トークンを浪費せず cc-sdd へ渡せる凝縮した下書きに変換する。cc-sdd の本体生成は侵さない。続行指示時に /kiro-spec-init を起動できる。
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Skill, Bash
argument-hint: <対象 packet 名（任意）>
---

# intent-export-cc-sdd Skill

## Core Mission
- **Success Criteria**:
  - 対象 packet 1つを cc-sdd の凝縮 Project Description + design/tasks ヒントに変換している
  - 入力を対象 packet ファイル + compass のプロジェクト普遍 Invariants/Anti-direction に限定し、Tree/Compass 全文を cc-sdd へ転記していない
  - tasks ヒントが parent intent / invariant 参照を持ち、impl への伝播構造になっている
  - 出力主役が自然言語案内で、続行指示時に /kiro-spec-init を起動できる
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: 対象 packet を1つに絞る
- `.intent/packets/index.md` を読み、active packet の候補を提示する。index.md が不在の場合は `.intent/packets/active/` 配下の frontmatter から直接候補一覧を構成して継続し、index の再生成を促す。`.intent/packets/` 自体が不在（または `active/` が空）なら「先に `/intent-packets` を実行」を案内して停止する。
- 引数で packet が指定されていればそれを、なければ候補から優先順位や利用者確認で1つに絞り、確定した対象 packet のファイル（`.intent/packets/active/` 配下）のみを読む（全 packet ファイルの丸読みをしない）。
- **parked 除外**: 候補を提示するとき、`state: parked`（保留＝今はやらない）の packet は**候補列挙から外す**（parked は export の対象にしない）。引数で明示的に parked packet を指定されたときだけ、「これは保留中の packet です。export を続けますか」を確認する（確認なしに parked を export しない）。
- **依存先 parked の warn**: 確定した対象 packet の `depends_on` に `state: parked` の packet が含まれるなら、「依存先が保留中（<packet 名>）」を1行 warn する（**止めない**・誤検知前提。依存先が保留のまま先に進むのが妥当な場合もあるため export は続行する）。
- **draft ガード**: 確定した対象 packet の `state` が draft の場合、AskUserQuestion で「active 化して export を続行するか」を確認し、利用者が承認したら frontmatter の `state` を active へ更新して `index.md` を再生成してから続行する（確認なしに draft のまま export しない。export が canonical を書き換えるのはこの active 化に限る）。
- 引き継がれた発行ディレクトリの `discovery/<スラッグ>-<rand>/mode.md`（A34・discover が出力した発行名を引き継ぐ）→ 無ければ単一 `.intent/mode.local.md`（legacy）→ 無ければ旧 `.intent/mode.md` の順で mode 状態を読む（CONTRACT.md の read fallback 規約）。無ければ standard 既定で続行し告知する。

### Step 1.5: enforcement ゲート（writeback 鮮度検査）
- Step 1 で読んだ `.intent/mode.md` の `## Enforcement（ユーザー管理）` セクションから `enforcement` の値を確認する。off・未記載・不正値（mode.md 不在を含む）なら本検査を行わず、現行どおり Step 2 へ続行する。
- remind または gate のとき、Bash で `node .intent/scripts/intent-check.mjs` を実行し（読み取り専用スクリプト。ファイルの作成・変更・削除を行わない）、stdout に従う。
- **判定行の解釈規則**: 停止判断は stdout 1行目の判定行の `block=` のみを正とする（再導出・独自解釈をしない）。警告の要否は `result=stale` または `pending>0` で決める。`result=not-applicable` のときも判定行の `pending=` の値をそのまま使う。
- gate かつ `block=yes` のとき: 根拠（pending の packet 名・経過コミット数/閾値。intent-check の2行目以降の人間可読行をそのまま引用する）を提示して export を停止し、`/intent-writeback` の実行を案内する。続けて AskUserQuestion で「それでも export を続行するか」を確認し、利用者が明示的に続行を指示したときのみ、警告を提示したうえで export を実行する（誤検知時の逃げ道）。
- remind かつ違反検出（`result=stale` または `pending>0`）のとき: 同じ根拠を警告として提示し、停止せず続行する。
- intent-check 自体が実行不可（Bash 不可・スクリプト不在・exit 2）のときのみ: staleness を not-applicable として扱い、`.intent/deltas.md` の pending な Delta エントリ（`- Status: pending` を持つもの）を Read/Grep で確認し、その結果を `pending` として上と同じ分岐に入る。

### Step 1.6: drift 照合（drift-watch）
- Step 1 で読んだ `.intent/mode.md` の `## Drift-watch（ユーザー管理）` セクションから `drift-watch` の値を確認する。`on` でないとき（off・未記載・不正値・セクション不在・mode.md 不在を含む）は本照合を行わず、現行どおり Step 1.7 へ続行する（現行動作とバイト等価）。
- `on` のときのみ、`rules/drift-export-check.md` を読み、適用する。対象 packet の design/tasks ヒント × compass（North Star / Anti-direction / Invariants）の照合・抵触の名指し提示・drift-log への `stage: export` エントリの append・outcome の利用者判定での確定は、すべて rule の手順に委ねる（ここに手順を複製しない）。
- この照合は **warn のみ・export を停止しない**（停止できるのは Step 1.5 の enforcement ゲートだけ。drift-watch は誤検知前提のため止めない）。
- 3関所の順序と直交: **enforcement（手続き・停止しうる, Step 1.5） → drift-watch（方向・停止しない, Step 1.6） → Open Questions（期限・停止しない, Step 1.7）**。検査対象が直交する（手続き / 方向 / 期限）。

### Step 1.7: 未回答 Open Questions の確認
- `rules/export-questions.md` を読み、適用する。

### Step 1.8: cc-sdd 前提の preflight 照合（warn のみ・停止しない）
- `.kiro/` ディレクトリの有無を read-only で観測する（Read/Glob。`intent-check.mjs` 等の機械検査に寄せない）。
- `.kiro/` が**不在**のとき: cc-sdd（kiro）が導入されていない可能性を **warn** する。「cc-sdd 前提（`.kiro/`）が見当たらない。cc-sdd を導入するか、読める成果物が目的なら format 軸の射影（読める Spec への出口）も選べる」と案内する（出口の選び方は `rules/export-route.md` の出口判定レーンに従う。本 SKILL から他 export/射影スキルのコマンド名は名指ししない）。**下書き生成は止めない**（Step 2 以降へ続行する）。
- `.kiro/` が**存在**するとき: 何も出さず Step 2 へ続行する（従来どおり・warn 無し）。
- この照合は **warn のみ・export を停止しない**（停止できるのは Step 1.5 の enforcement ゲートだけ。preflight は drift-watch と同じ誤検知前提で止めない＝`.kiro/` を後から入れる経路を潰さない）。出口の妥当性は `rules/export-route.md`（出口判定レーン）の規約に沿う。

### Step 2: マッピング規則を適用する
- `rules/map-cc-sdd.md` を読み、適用する。
- 入力は対象 packet ファイル1つ（Safety / Invariants の packet 固有 invariant を含む）+ `.intent/intent-compass.md` のプロジェクト普遍 Invariants/Anti-direction のみ（Tree 全文・他 packet は読まない。方向が要る場合のみ Tree L0–L1 を要約参照）。

### Step 3: 下書きを生成する
- 下書きは packet ごとのディレクトリ `.intent/cc-sdd/<スラッグ>/` 配下に書く。スラッグの導出と衝突時の扱いは `rules/map-cc-sdd.md` の「出力レイアウト」節に従う。
- `.intent/cc-sdd/<スラッグ>/requirements.md` に凝縮 Project Description（cc-sdd 投入本文）を書く。
- `.intent/cc-sdd/<スラッグ>/design.md` に design ヒント（箇条書き）、`.intent/cc-sdd/<スラッグ>/tasks.md` に「Intent 由来の制約」セクション + tasks チェック項目を書く。
- cc-sdd の本体は完成させない。tasks ヒントには parent intent と invariant 参照を必ず残す。
- 下書きの生成を終えたら、export 記録を **packet 単位の分割ファイル** `.intent/export-log/<packet-slug>.md` へ書く（CONTRACT「append-only 記録の分割・archive 規約」に従う）。`<packet-slug>` は packet 名から既存スラッグ規則（`intent-packets/rules/packet-format.md`）で導出する（新採番・連番を作らない）。ファイルには scaffold と同じテーブルヘッダ（`| packet | exported_at | commit |`）+ `| <packet 名> | <export 日時（ISO 8601 UTC）> | <コミットハッシュ> |` の1行を書く（既存ファイルがあれば行を追記し、過去の行は消さない）。コミットハッシュは Bash で `git rev-parse --short HEAD`（読み取り専用）で取得し、取れない場合は `-`。`.intent/export-log/` ディレクトリが無ければ作る。
- 続けて旧 `.intent/export-log.md` を**生成 active ミラー**として再生成する: `.intent/export-log/*.md` の全データ行を `exported_at` 昇順に連結し、scaffold と同じヘッダ + 全行で上書きする（分割ファイルが正本・ミラーは派生で手編集しない）。これにより単一ファイルを読む既存経路（status / validate / writeback / intent-check）が壊れない。読み手横断追随が完結する後続スライス（wire）でミラーは fold される。

### Step 4: 受け渡しを案内する（自然言語主導）
- 出力の主役は自然言語案内: 対象 packet の `.intent/cc-sdd/<スラッグ>/requirements.md` のパスを示し、「このまま cc-sdd に渡してよいか」を確認する。
- 利用者が続行を指示したら、対象 packet の `.intent/cc-sdd/<スラッグ>/requirements.md` の本文を読み、その本文を引数として `/kiro-spec-init` を起動する（`Skill` を使う。利用者にコピペを強制しない）。
- **feature 名の実線記録（DR121）**: `/kiro-spec-init` が feature 名を生成したら、その直後に同じフローで、Step 3 で書いた分割ファイル `.intent/export-log/<packet-slug>.md` の**表の下**へ `- feature: <feature 名>（<記録日 YYYY-MM-DD>）` の1行を追記する（既存のテーブル行・過去の行を書き換えない＝append-only）。これにより packet → 生成 spec の対応を後から実線で辿れる（下流 spec に packet 名が残る保証は無いため）。**同じ feature 名が既に記録済みなら追記しない**（再 export の重複防止。feature 名が変わったときは新しい行を足し、過去の行は消さない）。**feature 名を取得できないとき（利用者がこのセッションで `/kiro-spec-init` まで進めない・起動に失敗した等）は何も書かず、警告も出さない**（fail-open。export の成否に影響させない）。書くのは feature 名（識別子）と日付だけで、機微な内容・生々しい詳細は書かない（コミット履歴の Intent trailer と同じ規律）。テーブル行でないこの追記行は既存の読み手（status / validate / writeback / intent-check）とミラー再生成には不可視であり、既存の3列スキーマを変えない。
- フォールバックとして、`/kiro-spec-init` 用の改行最小化コピーブロックも併記する（主ではない）。
- **代行は `/kiro-spec-init` の起動まで**。その後の requirements → design → tasks は cc-sdd の3フェーズ承認に従い、各フェーズで利用者の続行指示を待つ。自動で突き進まない。
- **フェーズ別ヒントの手渡し案内（DR120）**: 案内に次の一行を含める——「design フェーズへ進むときは `.intent/cc-sdd/<スラッグ>/design.md` の本文を、tasks フェーズへ進むときは `tasks.md` の本文を、あわせて渡してください」。cc-sdd 側のスキルはこれらのヒントファイルを自分では読まないため、渡さなければ design/tasks フェーズへ intent 由来の制約は届かない。手渡しの実行は利用者に委ね、渡されなくても何も止めない（gate にしない）。
- **steering 欠落の前置き（DR120）**: 案内に一行添える——「`.kiro/steering/` が未整備でも、この下書き（Project Description）が意図・制約の文脈を供給します。cc-sdd 側が『プロジェクト文脈（steering）が無い』旨を警告することがありますが、それは steering が空のとき機械的に出る定型です」。steering の新設は促さない（必要な制約は intent が下書きで都度供給する既存方針のまま）。
- **戻り先の明示（writeback フェーズの入口）**: 案内の末尾に、cc-sdd 実装が一巡したら（実装の現実から学びが出たら）`/intent-writeback` で canonical へ戻すことを一行添える。実装後の学びを packet ファイルへ Evidence 直書きして済ませず、必ず writeback（delta 経由）を通す。これは「実装前の起草（compass/packets が canonical を直接書く）」と「実装後の逆抽出（writeback で delta 経由）」のフェーズ境界を利用者に明示するための案内。

## Output Description
- 対象 packet の `.intent/cc-sdd/<スラッグ>/{requirements, design, tasks}.md` の更新案
- `.intent/export-log.md` への export 記録1行（追記）
- `/kiro-spec-init` まで進んだ場合の feature 名の実線記録1行（分割ファイルの表の下へ追記・DR121。進まなかった場合は省略）
- draft を active 化した場合の対象 packet ファイルの `state` 更新と `.intent/packets/index.md` の再生成（該当なしの場合は省略）
- 未回答 `[export まで]` Question の確認結果（提示した問いと利用者判断。該当なしの場合は省略）
- cc-sdd へ渡してよいかの確認（自然言語案内・主）
- design/tasks フェーズへ進むときの該当ヒント（design.md / tasks.md）の手渡し案内と、steering 欠落警告の前置き（案内に含める・DR120）
- `/kiro-spec-init` 用コピーブロック（フォールバック・従）
- 実装前に確認すべき点
- 実装が一巡したあとの戻り先案内（`/intent-writeback` で canonical へ。packet への Evidence 直書きで済ませない）

## Safety & Fallback
- `.intent/packets/` が不在（または `active/` が空）なら停止して `/intent-packets` を案内する。
- index.md 不在は停止せず、`active/` 配下から直接候補を構成して継続し、index の再生成を促す。
- canonical への書き込みは draft ガードの active 化（`state` 更新 + `index.md` 再生成）のみで、利用者の承認を得たときに限る。intent-tree / intent-compass / packet 本文は書き換えない。
- mode.md 不在は停止せず standard 既定で続行し告知する。
- enforcement の検査は fail-open: intent-check が実行不可でも export を止めない。停止するのは enforcement が gate で判定行が `block=yes` のとき、または実行不可フォールバックで gate かつ pending を検出したときのみで、いずれの場合も利用者の明示続行で実行できる。
- Open Questions の確認は停止ではなく確認であり、明示続行で export できる。
- feature 名の実線記録は fail-open: 取得できない・書き込めないときは何も書かず警告も出さず、export の成否に影響させない（DR121）。
- cc-sdd の requirements/design/tasks の本体を完成させない（下書き・ヒントまで）。
- `/kiro-spec-init` 以降の cc-sdd フェーズを自動起動しない。
- アプリケーションコードは変更しない（INV6。他 skill の起動は INV6 と別概念であり許される）。
