---
name: intent-discover
description: Intent Planning の入口。リポジトリの課題感・README・既存コード概要から Intent Tree (L0-L4) を構築し、Intent の詰め方モードを推奨・確定する。実装はしない。
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
argument-hint: <課題・アイデア・対象範囲>
---

# intent-discover Skill

## Core Mission
- **Success Criteria**:
  - L0–L4 の Intent Tree が構造化され、canonical（確定）と inferred（推測）が分離されている
  - Intent の詰め方モードが推奨・確認され、`.intent/mode.local.md`（mode 状態のローカル正本）に記録されている
  - 問いの代行（designer-questions）の要否が確認され `.intent/mode.local.md` に記録されている（on の場合は purpose も。保留時は Open Questions に告知）
  - 人間が確認すべき Open Questions が明示されている
  - 発散する案件では、AI が仮説・反例・別の問題設定を inferred として提示し、人間が次の compass で判断境界を定められる
  - 後続フェーズへ「探索は広く、判断境界は人間が compass で確定し、実装はその確定境界内の bounded autonomy とする」設計原則を引き継いでいる
  - drift-watch が on のとき、逸脱しやすい場面の事前チェックを行い該当型を名指しして drift-log に記録している（off のときは何もしない）
  - アプリケーションコードを一切変更していない

## Execution Steps

### Step 1: モードを選定する
- `rules/mode-selection.md` を読み、適用する。
- 利用可能なモード（`.intent/modes/*.md`）を確認し、リポジトリ状況からモードを推奨する。
- `AskUserQuestion` で利用者に確認する（候補が standard 1つでも推奨→確認の流れを通す）。
- **発行ディレクトリを作って確定結果を記録する（A34・同マシン並行衝突の解消）**: discover 実行ごとに `.intent/discovery/<スラッグ>-<rand>/`（packet 同型の発行ディレクトリ・`<スラッグ>` は案件名から導出・`<rand>` は `[a-z0-9]` 4文字をシェルで生成し中央採番しない）を作り、確定結果を **その中の `mode.md`** に記録する（mode 状態のローカル正本・git 非追跡）。発行ディレクトリ名は **Output で明示し**、後続スキル（compass/packets 等）がそれを引き継いで読む（読み手同定）。既存の単一 `.intent/mode.local.md` は後方互換の legacy 読み先として残す（このスキルは新規記録を発行ディレクトリへ書く）。Enforcement / Drift-watch（共有ポリシー）は `.intent/mode.md` のまま触らない。発行ディレクトリ方式の詳細は `.intent/discovery/README.md`。
- **起草の割当宣言を1つ作る（並行セッションへ「起草中」を知らせる・DR163/INV91）**: 発行ディレクトリを作るのと同じ工程で、`.intent/assignments/discovery-<発行ディレクトリ名>-<session-rand>.md` を1つ作る（`<session-rand>` は `[a-z0-9]` 4文字をシェルで生成）。frontmatter は `phase: drafting` / `issue_dir: <発行ディレクトリ名>` / `packet_id: ""`（起草時点では packet が未存在＝架空の ID を捏造しない）/ `declared_at`（シェルの `date`）/ `session` / `note`（任意）。**作るのは自動・消すのは人手**（起草が終わったかの判断は人が行う＝機械が生きた宣言を消さない・INV91）。同じ発行ディレクトリの宣言が既にあれば重ねて作らない（再実行で重複させない）。**止めない・奪わない**（宣言は read-only の助言であり、他セッションの着手を拒否しない）。スキーマと規約の正本は `.intent/assignments/README.md`・読み手契約は CONTRACT.md。
- **target format の推奨→追認→記録（任意・保留可）**: mode 確定に続けて、案件から target format（どの出口へ進むか＝ `cc-sdd` / `openspec` / `speckit` / `to-spec` / `direct`）を推せる場合に利用者へ追認を求め、追認されたら `.intent/mode.local.md` の `format` 行へ記録する。判定材料は案件種別（mode・成果物がコードか文書か）と**下流 spec ツールの導入目印**（cc-sdd=`.kiro/` / OpenSpec=repo 直下 `openspec/` / Spec Kit=repo 直下 `.specify/` の有無。read-only 観測）で、出口と format の対応・導入状況の扱い（導入済みを先に・未導入も候補から消さない・併存導入済みの優先を発明しない）は `intent-packets/rules/export-route.md`（出口判定レーン・単一正本）と整合させる（対応表を本ファイルへ複製しない）。`direct` は**ツールを使わず直接実装する案件**（spec ツールを起動しない＝コードや文書を直接編集する小〜中規模の改修等）のとき選び、記録しておくと `/intent-writeback` が対象特定でその記録を一次情報に使う（INV34）。**mode / designer-questions / purpose と同じ追認規律**に従う: 推論できない・利用者が保留/否認したら**推測で埋めず記録しない**（未指定のまま続行＝後で出口判定が推論経路に倒す。direct も未記録なら writeback は3条件 AND 推論にフォールバックする）。format の記録は任意であり、書かなくても discover は従来どおり続行する。**format の書き手は `/intent-discover` のみ**（他スキルは read-only で読む・DR26）。
- `rules/designer-questions.md` を読み、問いの代行（designer-questions）の確認・記録を行う。

### Step 2: モード定義に従ってアルゴリズムを適用する
- 確定したモード定義（例: `.intent/modes/standard.md`）を読む。
- `.intent/mode.local.md`（無ければ旧 `.intent/mode.md`）の `definition` が指すモード定義を開き、Intent Tree 構築フェーズに割り当てられた algo rule（`rules/algo-*.md`）を読み、適用する（standard なら `rules/algo-gore-lite.md`、refactor なら `rules/algo-gore-lite.md` + `rules/algo-drift-analysis.md`、意図不在のコードでは加えて `rules/algo-intent-recovery.md`）。例は網羅ではない。常にモード定義の表を正とする。

### Step 3: Intent Tree を構築する
- GORE-lite に従い L0（目的）→ L1（成果）→ L2（能力）→ L3（振る舞い/設計意図）→ L4（候補パケット）を分解する。
- 確定した意図と推測（Assumptions）を分離する。未確定は Open Questions に置く。
- 既存の `.intent/intent-tree.md` があれば読み、上書きではなく追記・更新案として提示する。
- **解が複数あり得る案件のときだけ**、対立する仮説・各仮説が崩れる反例・別の問題設定を提示する。`question-depth` が standard なら少数・根拠付きに、deep ならより広く探る。3種は L3（inferred）/ Assumptions / Open Questions に置き、canonical へ昇格させず、ここで解を選ばない。解が自明な案件ではこの儀式を走らせない。

### Step 3.5: 逸脱しやすい場面の事前チェック（drift-watch）
- Step 1 で読んだ `.intent/mode.md` の `## Drift-watch（ユーザー管理）` セクションから `drift-watch` の値を確認する。`on` でないとき（off・未記載・不正値・セクション不在・mode.md 不在を含む）は逸脱しやすい場面の事前チェックを行わず、現行どおり Step 4 へ続行する（現行動作とバイト等価）。
- `on` のときのみ、`rules/drift-terrain.md` を読み、適用する。symptom × 構築中 Intent Tree の照合・該当型の名指し提示・anti-direction / invariant 候補の Open Questions への起案・drift-log への append は、すべて rule の手順に委ねる（ここに手順を複製しない）。
- **定石の叩き台の照合だけは drift-watch の値に関わらず常時行う（A40・DR83 宿主④）**: 同 rule の「制約の叩き台の気づき（常時）」節は、`drift-watch` が off・未記載・不正値でも適用する（案件の最初の工程で定石に気づけるのが最も手戻りが小さいため常時化した・利用者確定 2026-07-04）。逸脱しやすい場面の事前チェック（drift-patterns 照合）は上記どおり `on` 限定のまま据え置き、常時化するのは定石照合だけ。薄い照合であり、関係領域だけ pull し当てはまりが弱ければ黙る（カタログ不在ならスキップ・停止しない）。

### Step 4: 提示する
- `.intent/intent-tree.md` の更新案を提示する。
- `rules/designer-questions.md` の Intent Tree 追加確認（L1 計測基準・画面ラフ）を、rule の適用条件に従って適用する。
- 実装変更はしない。リファクタ案を先走って出さない。

## Output Description

**読み手**: これから意図を詰め始める人間開発者。
**この出力で最初に掴ませること**: 「Intent Tree の骨子ができた。**次は `/intent-compass`**。ただし確定前に答えるべき Open Questions はこれだけ」。

出力は結論を先頭に立てる。

- **次の一手（先頭・1行）**: `/intent-compass`（判断基準づくり。局所最適を防ぐ Invariants/Anti-direction を定める）。
- **確認が要る Open Questions**: 人間が確定させるべき不明点（推測で埋めず質問として残したもの）。次に進む前にここだけ片付ければよい、と分かる形で。
- **詳細（成果物の更新案）**: `.intent/intent-tree.md` の更新案（L0–L4 / Open Questions / Assumptions。canonical と inferred を区別）、確定したモードと**今回の発行ディレクトリ名 `.intent/discovery/<スラッグ>-<rand>/`（後続スキルへ引き継ぐ・A34）**、確定した designer-questions / purpose。
- **compass への引き継ぎ（発散時は必須）**: 「探索では AI が仮説・反例・別問題設定を暫定提示し、判断境界は人間が `/intent-compass` で確定する。後続の実装は、その compass と packet で確定した境界内だけで自律する」を設計原則として示す。未決の境界は Open Questions のまま渡し、discover が代わりに確定しない。

### 報告の平易さ点検（利用者向け報告・出力直前・共通）

利用者へ向けた報告（進捗・完了・確認事項の提示。ターン末尾の要約を含む）を出す直前に、次を点検する（INV105・DR208）。対象は利用者向けの報告文だけで、内部の記録（`.intent/` 配下の canonical・ログ）の書き方には適用しない。

- **内部文書の文をそのまま転写しない**: 直前に読んだ・書いた内部成果物（tree・compass・packet・Open Questions）の文面は内部の語彙で書かれている。報告では、その内容を初見の読み手に通じる言葉で言い直す（事実・意味は変えない）。
- **識別子を本文の主語にしない**: 確認事項・作業単位を示すときは、まず「何を・なぜ」が単体で通じる一文を置き、識別子（Open Question 番号・packet 名・記号・工程名）はその後ろに参照として添える（例: 「…を確かめてから始めてください（整理番号: OQ-xxx-1）」）。平易化のために識別子・記録への参照を削らない（記録へ辿れなくなる）。
- **通じるかの合図**: 1文に未説明の内部語が3つ以上並んだら詰め込みすぎの合図（機械カウントではなく意味の読みで）。単体で通じなければ、平易に書き直してから出す（事実・意味は変えない）。
- **比喩・曖昧な言い方だけで意味を渡さない**: 報告の土台は正確さ（意味が一意に読める記述。平易さはそれを保ったまま易しく書く手段）。基準のない程度語（「かなり」「うまく」等）だけで結果を伝えず、観測できる事実で書く。比喩を使うなら直後に正確な言い直しを必ず併記する（確立された専門用語・世間の意味のままの一般語は無理に開かない）。
- この点検は事後の記録と対で働く（予防だけで閉じない）: 報告が通じなかった実例は、drift-watch が on のとき drift-log へ症例として残し、次の予防に使う。

## Safety & Fallback
- 入力（課題・対象範囲）が曖昧なら、推測で埋めず利用者に質問する。
- 既存の Intent Tree がある場合は破壊せず、差分を更新案として提示する。
- アプリケーションコードは変更しない。
