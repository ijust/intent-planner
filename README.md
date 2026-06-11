# intent-planner

**Pre-spec Steering Layer for AI coding agents**
*— intent-aware steering, one stage before your specs.*

AI コーディングエージェント（Claude Code / Codex）に大きめの変更を頼む前に、「何を作りたいのか」「何を守りたいのか」をエージェントと一緒に整理し、実装中もそれがブレないようにするツールです。

- **実装前**: 意図を構造化し、判断基準（守るべき不変則・進んではいけない方向）を文書化する
- **実装へ**: 整理した意図を [cc-sdd](https://github.com/gotalab/cc-sdd) の spec 駆動フローへそのまま引き継ぐ
- **実装後**: 実装で得た学びを意図の文書へ書き戻し、「最初に作って終わり」にしない

導入するとスラッシュコマンド（skill）一式と `.intent/` フォルダが追加されるだけです。あなたのアプリケーションコードには一切触れません。

## こんなときに

| 状況 | intent-planner がやること |
|---|---|
| 新規プロダクト・機能を AI 主導で作り始めたい | 作りたいものの意図と判断基準を実装前に言語化し、最初の1行から steering を効かせる |
| PoC・個人開発を1人で作りたい | サービスデザイナー役の問い（仮説と反証条件・GO/NO-GO、計測できる成功基準、walking skeleton、画面ラフ）をフローが代行し、export 前の検査で漏れを検出する |
| 大規模リファクタを頼みたい | 「正しく動くが設計意図からズレる」変更を防ぐ判断基準を先に作る |
| レガシーで仕様が分からない | 観測できる振る舞いから意図を逆算して文書化する |
| 稼働中システムに機能追加したい | 既存への影響を踏まえた追加単位に分解する |
| AI の変更が毎回少しずつ方向違い | 全体意図を AI が毎回参照できる形（steering context）にする |

## 必要なもの

- **Claude Code** または **Codex**（`--agent` で選択）
- **Node.js**（インストーラの実行に使用。ランタイム依存はゼロ）
- [cc-sdd](https://github.com/gotalab/cc-sdd)（任意。export 先として使う場合）

## クイックスタート

```bash
# プロジェクトのルートで
npx github:ijust/intent-planner

# Codex を使う場合
npx github:ijust/intent-planner --agent codex
```

導入後、AI コーディングエージェント（Claude Code / Codex）でこの順に実行します。

```
/intent-discover   →  /intent-compass  →  /intent-packets  →  /intent-export-cc-sdd
（意図の全体像）      （判断基準）        （作業単位に分解）    （cc-sdd へ引き継ぎ）
```

最初の `/intent-discover` を実行すると、エージェントがあなたの課題・アイデアについていくつか質問し、意図の全体像を `.intent/intent-tree.md` に書き出します。以降も同様に、各ステップの成果物は `.intent/` 配下の Markdown です。レビューしてから次へ進んでください。**迷ったら `/intent-status`** — 現在地と「次の一手」を教えてくれます。

## コマンド一覧

### 計画（最初にこの順で）

| コマンド | やること |
|---|---|
| `/intent-discover` | 課題やアイデアから Intent Tree（意図の階層 L0–L4）を作り、進め方のモードと開発目的（purpose: PoC か本番か）を確定して記録する |
| `/intent-compass` | North Star（目指す姿）/ Anti-direction(進んではいけない方向)/ Invariants（不変則）などの判断基準を作る |
| `/intent-packets` | 実装に渡せる作業単位（packet）に分解する |
| `/intent-export-cc-sdd` | 選んだ packet 1つを cc-sdd の下書きに変換する。enforcement 設定時は export 前に書き戻し漏れを検査する（remind=警告 / gate=停止） |

### 維持（実装後に。intent を育て続ける）

| コマンド | いつ | やること |
|---|---|---|
| `/intent-writeback` | packet の実装完了後 | 実装で得た学び（新しい決定・invariant 違反の発見・暗黙挙動・Deferred の解消）を `.intent/deltas.md` に記録し、承認した項目だけを Intent Tree / Compass / Packets へ反映する |
| `/intent-improve` | 数 packet 完了後やリリース前などの節目 | `.intent/` と実装の現実を completeness / correctness / coherence の3軸で突き合わせ、ズレの是正案を提示する（反映は承認後のみ） |

### 随時（読み取り専用）

| コマンド | やること |
|---|---|
| `/intent-status` | 現在地の要約と「次の一手」をちょうど1つ推奨する。何も書き換えない。enforcement 設定時は書き戻し漏れの警告も表示する |
| `/intent-validate` | export 前に意図の文書間の矛盾・漏れ・境界の重複、PoC 必須記録の欠落（規範検査）を深刻度付きで報告する。何も書き換えない |

## 利用ストーリー

ひとつの機能群を「intent を育てながら」進める具体的な流れです。

1. `/intent-discover` → `/intent-compass` → `/intent-packets` で、意図の全体像・判断基準・作業単位（packet）を作ります。
2. export の前に `/intent-validate` を実行します。たとえば「packet B は Compass の Invariant と矛盾」のような要修正の指摘が出たら、`/intent-packets` を再実行して解消してから先へ進みます。
3. `/intent-export-cc-sdd` で最初の packet を cc-sdd の下書きに変換し、cc-sdd の spec フロー（requirements → design → tasks）で実装します。
4. 実装が完了したら `/intent-writeback` を実行します。実装の現実と packet 定義・Compass を突き合わせて学びを抽出し、まず `.intent/deltas.md` に delta として記録します。この時点では元の文書は書き換えません。
5. 提示された学びを項目ごとに承認すると、delta が Intent Tree / Compass / Packets へ反映されます。判断基準（Compass の Decision Rules）の変更を伴う場合は ADR 形式の新しいエントリが追加され、置き換えられる旧エントリには superseded の注記が付きます。
6. `/intent-status` を実行すると、更新後の `.intent/` を読んで「次の一手」── 次の packet の export など ── をちょうど1つ案内してくれます。書き戻しをうっかり飛ばしていた場合も、enforcement（後述）を `remind` 以上に設定していれば、ここや次の export の前に漏れとして指摘されます。
7. 2周目以降、数 packet 回した節目に `/intent-improve` を実行します。packet 単位の書き戻しでは拾えない全体の陳腐化（実装にあるのに intent に無い、intent にあるのに実装と食い違う等）を検出し、是正案を承認ベースで反映します。

学びは `.intent/deltas.md` に貯まり、承認されたものだけが意図の文書に反映されます。これにより `.intent/` は実装の現実と同期し続ける判断基準であり続けます。

## インストールの詳細

```bash
npx github:ijust/intent-planner ./my-project          # 指定ディレクトリへ
npx github:ijust/intent-planner --dry-run             # 何が起きるか先に確認
npx github:ijust/intent-planner --lang en --agent codex   # 英語 + Codex
```

（npm レジストリには未公開のため GitHub 直接指定。公開後は `npx intent-planner` になります）

| オプション | 説明 |
|---|---|
| `dir` | 配置先ディレクトリ（既定: カレント） |
| `--force` | 同名ファイルがあっても上書きする（既定: スキップ） |
| `--dry-run` | 書き込まず、配置/スキップ予定の一覧だけ表示する |
| `--lang <value>` | 言語指定: `ja`（既定）/ `en` |
| `--agent <value>` | 対象エージェント: `claude`（既定）/ `codex` |
| `--enforce` | pre-push フック（`.git/hooks/pre-push`）を配置する（既定: 配置しない）。「Enforcement」セクション参照 |
| `--help`, `-h` | ヘルプを表示する |

配置されるもの（既存の同名ファイルは上書きしません）:

```
.claude/skills/intent-*/   スラッシュコマンドの実体（--agent codex の場合は .agents/skills/ + AGENTS.md）
.intent/                   Intent Tree / Compass / Packets / deltas / modes などの記入用 scaffold
```

## モード（進め方の切り替え）

プロジェクトの状況に合わせて、Intent の詰め方を「モード」として切り替えられます。`/intent-discover` が状況を見て推奨し、`.intent/mode.md` に記録されます。

- **standard** — 既定の汎用モード。新規プロダクトにも、既存プロジェクト内の意図がまだ言語化されていない機能群にも
- **refactor** — 既存大規模プロジェクトのリファクタ・再設計に。コードから意図を逆算する手順を含む
- **behavior-unknown** — 仕様文書がなく振る舞いも不明なレガシーに
- **feature-growth** — 稼働中システムへの新機能追加に。既存への影響分析と追加単位の分解を含む

新しいモードは `.intent/modes/` にファイルを1枚足すだけで追加できます（`.intent/modes/README.md` 参照）。

### 開発目的（purpose）— モードと直交するもう1つの軸

`/intent-discover` は、モードとは別に開発目的（purpose: `poc` / `product`）を確認して `.intent/mode.md` に記録します。`poc` のときだけ PoC 向けの追加質問群（仮説・反証条件・GO/NO-GO、L1 の計測基準、walking skeleton、画面ラフ）と `/intent-validate` の規範検査が有効になります。本番開発（`product`）での増分は目的確認の1問だけです。

## Enforcement（書き戻し漏れの検査・任意）

実装後の `/intent-writeback` を飛ばしたまま次の packet へ進むと、`.intent/` は実装の現実から静かに乖離していきます。enforcement は、この「writeback の実行漏れ」を機械的に検出する任意のレイヤーです。**既定は off** で、設定しない限り何も変わりません。

強度は3段階あり、`.intent/mode.md` の「Enforcement（ユーザー管理）」セクションを直接編集して切り替えます（スキルはこのセクションを書き換えません）。

| 値 | 動作 |
|---|---|
| `off`（既定） | 検査しない。従来どおりの動作 |
| `remind` | 書き戻し漏れを検出したら警告のみ表示する。停止しない |
| `gate` | 書き戻し漏れを検出したら export / push を停止する |

検査されるのは次の2つです。

- **pending delta の放置（中心）** — `/intent-writeback` で記録したまま、承認・反映されずに残っている delta。enforcement の主目的はこちらの検出です
- **staleness（実験的）** — 最後の書き戻し（または export）以降に `.intent/` 以外を変更したコミット数が閾値（`enforcement-threshold`、既定: 5）を超えた状態。依存更新などの無関係なコミットも数えるため誤検知が残ります。`enforcement-exclude` で計数から除くパスを指定できますが、まず `remind` で試して誤検知の感触を見てから `gate` を検討することを推奨します

検査が効く場所は3つあります。

1. `/intent-export-cc-sdd` の export 前（remind=警告のみ / gate=停止）
2. `/intent-status` の警告表示
3. `--enforce` で導入した pre-push フック（push 直前の関所）

```bash
npx github:ijust/intent-planner --enforce   # 通常の配置に加えて pre-push フックも配置
```

誤検知に備えた逃げ道があります。gate で停止しても、明示的に続行を指示すれば export は実行でき、push は `git push --no-verify` で通せます。

enforcement が強制するのは「writeback という手続きの実行」だけで、書き戻した内容の正しさは保証しません（それは `/intent-improve` と人間レビューの責務です）。誤検知が構造的に残るため、既定を off にしています。

## cc-sdd 連携

配置先に cc-sdd（`.kiro/`）があると、インストーラが検出して案内します。

`/intent-export-cc-sdd` が生成する下書きを cc-sdd の `/kiro-spec-init` に渡すと、Intent Planning の成果が requirements → design → tasks のフローへそのまま流れます。不変則（invariant）と上位の意図は tasks へ転記されやすい形で渡されるため、実装段階でも全体意図が効き続けます。

intent-planner が作るのは下書きまでです。spec 本体は cc-sdd が生成し、各フェーズであなたがレビューします。

## 安心して使うために

- **アプリケーションコードは変更しません**。書くのは `.intent/` 配下の Markdown だけです（writeback / improve も承認した項目しか反映しません）
- **既存ファイルは上書きしません**（`--force` 指定時を除く）。まず `--dry-run` で確認できます
- **enforcement は既定 off** で、設定しない限り動作は何も変わりません。git フックは `--enforce` を明示したときだけ配置し、既存のフックは上書きしません
- **ランタイム依存ゼロ**（Node 標準モジュールのみ）。状態機械・常駐プロセス・GitHub 連携はありません

## 背景: なぜ「spec の手前」が要るのか

AI にリファクタや大規模変更を頼むと、各ファイルの変更は妥当なのに全体の設計意図が少しずつ崩れていくことがあります（architectural drift）。原因は、AI が横断的な意図を持たないまま局所最適に逃げることです。intent-planner は、実装前に「全体の意図」と「守るべき判断基準」を人間と AI で擦り合わせて文書化し、それを AI が毎回参照できる steering context にすることでこれを防ぎます。

なお、これは Intent を source of truth に開発全体を回す full IDD（Intent-Driven Development）フレームワークではなく、spec 駆動フローの手前に挟む軽量なレイヤーです。

## ライセンス

MIT © Yoshishige Tsuji

リポジトリ内の開発ツーリング（`.claude/skills/kiro-*/`、`.kiro/settings/`）は [cc-sdd](https://github.com/gotalab/cc-sdd)（MIT, © 2025 gotalab）に由来します。詳細は [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) を参照してください。
