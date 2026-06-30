# intent-* Skill 共通契約

全ての `intent-*` skill が従う規約。対象は `intent-` で始まる skill 全体であり、個別列挙には依存しない（skill を追加しても本契約はそのまま適用される）。cc-sdd の `kiro-*` skill と同じ骨格に揃え、非破壊に共存する。

## frontmatter（必須フィールド）

```yaml
---
name: intent-<phase>            # 必ず intent- で始める。kiro-* と衝突させない
description: <一行説明>          # いつ使うかが分かる説明
---
```

- `name` は `intent-*`。ディレクトリ名も一致させる。`kiro-*` と決して衝突させない。
- frontmatter は **`name` / `description` のみ**に絞る（Codex 版の最小 frontmatter 規約）。`allowed-tools` / `argument-hint` / `disable-model-invocation` は置かない。
  - 補足: `disable-model-invocation` は claude 版でも全スキル一律ではなく、canonical を書き換えるスキル（canonical-writer）にのみ置く条件付きフィールドである（claude 版 CONTRACT 参照）。Codex 版はその条件にかかわらず、スキルの分類を問わず3フィールドすべてを置かない（最小 frontmatter 規約）。
  - ツールの限定（計画系に絞る・アプリコードを変更しない 等）は frontmatter ではなく本文と下記「共通の制約」で表現する。
  - **Gemini CLI もこの最小 frontmatter ツリーを共有する**。Gemini CLI は `.agents/skills/` を Agent Skills として読み、起動時に `name` + `description` を進行的開示で注入するため、Codex 版の最小 frontmatter 規約がそのまま適合する。`AGENT_REGISTRY` の gemini エントリは `skillSubdir: "codex"`（配置先 `.agents/skills` を Codex と共有）で、gemini 専用の skill ツリーは設けない（実機 smoke で共有が読まれることを確証済み・gemini-cli-support）。

## 本文構成

cc-sdd の流儀に揃える。

```
# <skill-name> Skill

## Core Mission
- Success Criteria: ...

## Execution Steps
### Step 1: ...   （必要に応じ rules/*.md を Read して適用）
### Step 2: ...

## Output Description
- 生成した更新案
- 人間が確認すべき Open Questions
- 次に実行すべきコマンド

## Safety & Fallback
- エラー時/前提欠如時の挙動
```

## 共通の制約

- **出力は「更新案の提示」を基本**とする。`.intent/` への書き込みは許可。
- **canonical への書き込み権限はフェーズで分かれる**（隠れた前提にしない）。canonical 成果物（intent-tree.md / intent-compass.md / `.intent/packets/` 配下の packet ファイル・plan.md）について:
  - **起草スキル（実装前）は canonical を直接書いてよい**: `/intent-discover`（intent-tree 起案）・`/intent-compass`（North Star / Anti-direction / Invariants / Decision Rules の起草）・`/intent-packets`（packet ファイル起案）は、利用者確認のうえで canonical を直接書き込むのが正規動作。
  - **`/intent-writeback`（実装後）は canonical を直接書かない**: 実装の現実から逆抽出した学びは、必ず `deltas.md` 経由（delta 記録 → 承認 → 昇格）でのみ canonical へ反映する（writeback-protocol.md §3）。packet ファイルへの Evidence 直書きで済ませない。
  - この区別は「実装前の起草」と「実装後の逆抽出」のフェーズ境界に対応する。同じ canonical でも、どのフェーズのどのスキルが書くかで経路が違う。
- **アプリケーションコードを変更しない**（INV6）。
  - INV6 の射程は「アプリコードを変更しない」であって「他 skill を起動しない」ではない。両者は別概念。`intent-export-cc-sdd` が `/kiro-spec-init` を、`intent-export-openspec` が `/opsx:propose` を起動するのは INV6 と矛盾しない（コードを触らない）。
- **モードを尊重する（read fallback 規約）**: mode 状態を **引き継がれた発行ディレクトリの `discovery/<スラッグ>-<rand>/mode.md`（A34・discover が出力した発行名を引き継ぐ）→ 無ければ単一 `mode.local.md`（legacy）→ 無ければ旧 `mode.md` → どちらにも無ければ `standard` 既定** の順で読む（後方互換フォールバック）。定義ファイルのモード定義に従って動く。いずれも不在なら `standard` を既定として続行し、Open Questions に「モード未確定・`/intent-discover` 推奨」を併記する（停止しない）。Enforcement / Drift-watch（共有ポリシー）は `mode.md` から読む（このフォールバック規約の対象外）。発行ディレクトリ方式の詳細は `.intent/discovery/README.md`。
- **前段の成果物が欠如しているとき**は、推測で穴埋めせず「先に該当コマンドを実行」を案内して停止する（mode 状態の不在とは区別する）。
- **利用者への確認は自然言語で行う**: 推奨を提示し、利用者に自然言語で問い、回答を待つ。専用ツールには依存しない。
- **Bash（シェル実行）は原則使わない。限定例外**: staleness 検査を行うスキル（現在は `intent-export-cc-sdd` / `intent-export-openspec` のゲート判定と `intent-status` の鮮度警告）は、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動、および export スキル（`intent-export-cc-sdd` / `intent-export-openspec`）が export 記録のコミットハッシュを取得するための `git rev-parse --short HEAD`（読み取り専用）の実行に限り Bash を使える（いずれもファイルの作成・変更・削除を行わない）。これ以外の用途での Bash 利用は intent-* skill に許可しない。
- **read-only skill**（現在は `intent-status` / `intent-validate`）は読み取りと報告のみを行う: 書き込みを行わず、利用者への対話確認も行わない（自然言語での報告のみ）。これは標準規約の意図的な縮小であり、許可される。例外として `intent-status` は上記の Bash 限定例外に基づき、読み取り専用スクリプト `node .intent/scripts/intent-check.mjs` の起動に限り Bash を併用できる（ファイルの作成・変更・削除を行わない性質は維持）。`intent-validate` は Bash を持たない。

## 問いと用語の作法

- **問いは自己完結文にする**: 利用者への問い・確認の文面は、術語を知らなくても回答できる自己完結文とする。術語を使う場合は、問い文面の中に一行説明を含める（例: 「最初の packet（作業単位）が、入力から出力まで一通り動く最小実装（walking skeleton）になっているかを利用者に確認します」）。
- **術語は英語のまま + 一行説明**: 術語を日本語の訳語に置換しない。説明が要る場合は、機能・意味を述べる一行説明（括弧書きまたは blockquote）を初出箇所に添える。
- **造語を勝手に作らない**: 正規語彙（ubiquitous language＝intent 成果物で既に使われている合意済みの用語の集合）に無い新造の語を勝手に作らず、既存の語を再利用する。どうしても新しい語を導入する場合は、初出箇所に一行説明を添える。
- **設計文書で導入する語は識別子に限り、説明文中の比喩の呼び名は普通の記述語で書く**: 設計文書（SKILL.md / rules / 規約文書 / `.intent` 成果物）で語を導入するとき、横断参照される識別子（コマンド名・frontmatter キー・ファイル名・ログ値・glossary 見出し）だけを残し、説明文の中だけで使う比喩の呼び名（書き手の語感で生まれ、機能を説明しているわけでもない語）は作らず、普通の記述語で書く。識別子は消すと参照が壊れるため一行説明を添えて残す。比喩の呼び名は普通の言葉に開く（読み手が語の意味を別途学ばなくても文意が取れるようにする）。

## スキル間の状態共有

- 状態の共有点は **発行ディレクトリ `discovery/<スラッグ>-<rand>/mode.md`（mode 状態: mode/designer-questions/purpose・ローカル専用・git 非追跡・無ければ単一 `mode.local.md` を legacy/fallback として読む）** と **`mode.md`（共有ポリシー: Enforcement/Drift-watch・git 追跡）** の2系統（隠れ共有を作らない）。read fallback 規約は上記「モードを尊重する」に集約する。
- `.intent/deltas.md` は `.intent/packets/` 配下の packet ファイルと同様の**成果物**（intent-writeback が書き、intent-status / intent-improve が読む）であり、mode 状態共有とは別物。隠れ共有の新設ではない。

### append-only 記録の分割・archive 規約

`.intent/` の append-only 単一 Markdown 記録（deltas / export-log / drift-log / milestones / compass-archive など、書き手が末尾追記し読み手が全体を読む同型の記録）は、並行追記で同一アンカー（ファイル末尾）への衝突を起こし肥大化する。これを構造的に解くため、append-only 記録は次の規約に従って物理形を持つ（規約の単一正本はここ）。

1. **active 面（現在の射影）と履歴（archive）を分ける**。現在参照する記録は active 面に薄く保ち、終端した（もう更新されない）エントリは archive へ退避する。
2. **分割キーは2分類**。記録は単一ファイルへの末尾追記をやめ、衝突しない自然キーで分割した小ファイルへ書く。分類は記録の由来で決める: **packet 由来＝packet 単位ファイル**（例: `deltas/<packet-slug>.md`）／**事象由来＝日付+slug 単位ファイル**（例: `drift-log/<date>-<slug>.md`）。別 packet / 別事象が別ファイルを触るため、末尾衝突が原理的に消える。
3. **連番採番は用いず日付+slug を用いる**。ファイル名に `0001` のような中央カウンタの連番を使わない（並行セッションは互いの採番を見られず衝突を防げない）。代わりに日付+slug を用いる。
4. **archive 退避は既存の `archive/<年>/` 構造を踏襲する**。終端エントリは記録ディレクトリ配下の `archive/<年>/`（年単位ディレクトリ。packet が既に持つ precedent）へ退避し、active を薄く保つ。新しい退避命名を発明しない。
5. **順序が load-bearing な記録に merge=union を用いない**。`merge=union`（gitattributes での衝突マーカー消去）は順序を静かに壊すため、エントリの順序が意味を持つ記録には用いない。衝突は分割（規約2）で構造的に消す。

- **分割キーの命名は既存の packet スラッグ規則を参照し、新しい採番規則を再定義しない**。slug の決定的導出（NFC 正規化→trim→小文字化→危険文字を `-` へ→連続 `-` 圧縮→前後 `-` 除去→非 ASCII 保持）と日付部（起案日）は `intent-packets/rules/packet-format.md` のスラッグ規則が単一正本であり、分割キーはそれを参照するだけでよい（新採番ロジック・中央カウンタを持ち込まない）。
- 記録の中身（各記録のエントリ書式・固定キー順など）はこの規約の対象外であり、分割・archive は配置のみを定める（中身は behavior-preserving に保つ）。
- **5記録ファイルの置き場（規約2の適用先）**: 上の分類を5ファイルすべてに適用する。**packet 由来**＝`deltas/<packet-slug>.md`・`export-log/<packet-slug>.md`（packet 単位）。**事象由来**＝`drift-log/<date>-<slug>.md`・`milestones/<date>-<event-slug>.md`（日付+slug 単位）。**compass-archive は退避された Decision Rule の rule 単位**＝`compass-archive/<rule-slug>.md`（同一 rule の再 supersede は同ファイル）。export-log は読み手横断追随が完結するまで旧 `export-log.md` を生成 active ミラー（分割ファイルを `exported_at` 昇順連結・派生で手編集しない）として併存させ、書き手が毎 export で再生成する。
