# Intent Compass

> Mode: standard (QOC)。Decision Rule は「問い → 採る選択肢 → なぜ(基準)」の凝縮。

## North Star

「実装前に全体意図と統一設計を擦り合わせる軽量レイヤー」を、CLI を肥大化させず、cc-sdd と非破壊に共存する skill + scaffold として配布できている状態。利用者が `/intent-discover → /intent-compass → /intent-packets → /intent-export-cc-sdd` だけで全体設計を回せる。

## Current Drift

- まだ何も配布物がない（scaffold もインストーラも未実装）。
- 参考プロンプトは slash command 前提・配布なしで書かれていたが、実体は skill 形式・npx 配布。ここを取り違えると CLI に知能を持たせる方向へ drift しやすい。
- 参考プロンプトは cc-sdd の requirements 本体まで生成しようとしていたが、それは cc-sdd の責務。intent-planner は scaffold(下書き)で止める。

## Direction

- 知能は skill、配置は CLI、という責務分離を強める。
- アルゴリズム可変化を「Mode/Algorithm/Skill の3層」として構造に焼き込む（今回 standard 1つでも配線は通す）。
- cc-sdd と同じ流儀・命名で並ぶことを優先する。

## Anti-direction (Claude がやりがちな局所最適を明示)

- ❌ CLI 側に Intent 抽出ロジックやプロンプト生成を実装し始める（知能が CLI に漏れる）。
- ❌ cc-sdd の requirements/design/tasks を「ついでに完成させて」しまう（境界侵犯）。
- ❌ モードが1つだからと3層分離を省略してハードコードする（拡張点が消える）。
- ❌ 既存ファイル(.claude/skills/kiro-*, .kiro/, CLAUDE.md)を上書き・改変する。
- ❌ npm 依存を足してインストーラを「便利に」する（依存ゼロ原則の毀損）。
- ❌ J-Tech Intent-CLI のような状態機械・ラベル管理・自律ループを再発明する。
- ❌ scaffold を「空だと不親切」と称して具体的なプロジェクト前提を埋め込む（汎用性の毀損）。
- ❌ intent 計画中にアプリコードを「軽く直しておく」。
- ❌ 「将来対応したいから」と OpenSpec の export を今回実装する（検証コスト2倍・未確定フォーマットへの drift）。縫い目だけ残す。

## Invariants (壊してはいけない)

- INV1: 既存ファイルを非破壊。同名は上書きしない（`--force` 明示時のみ）。
- INV2: インストーラは Node 標準モジュールのみ。ランタイム依存ゼロ。
- INV3: skill は `.claude/skills/<name>/SKILL.md` 構造、命名 `intent-*`。cc-sdd の `kiro-*` と衝突しない。
- INV4: intent-planner は cc-sdd の requirements 以降の「本体生成」をしない。scaffold までで委譲。
- INV5: 各 packet は parent intent を持ち、cc-sdd に渡る task は parent intent と invariant を参照する。
- INV6: intent 計画フェーズでアプリケーションコードを変更しない。

## Decision Rules (QOC 凝縮)

- 知能を CLI と skill のどちらに置くか → **skill** → 詰め方アルゴリズムは可変であるべきで、可変性は自然言語(skill)で表現する方が安い(B1/C5)。
- モードが1つでも3層分離するか → **する** → 後から差し替え可能にするのが本ツールの主目的の一つ(C5)。今コストを払う方が後の破壊改修より安い。
- cc-sdd 連携を自動化するか案内に留めるか → **案内に留める** → 自動移動は INV1 を脅かす。非破壊 > 利便。
- scaffold をどこまで具体化するか → **見出し+用途説明の空テンプレ** → 汎用配布物。具体例は利用者の `/intent-discover` が埋める。
- 言語デフォルト → **検出(.kiro系があれば踏襲)→なければ ja** → A2 を尊重しつつ配布は ja/en 選択可。
- OpenSpec 等の追加ターゲットを今やるか → **やらない。縫い目だけ残す** → export を「ターゲット差し替え可能」構造(B8)にし、マッピングをターゲット別 rules に分離。今は cc-sdd 1本のみ実装。将来の追加は「rules を1枚足す」コストに抑える。

## Evidence

- このリポジトリの CLAUDE.md（cc-sdd 製品リポジトリであること、skill 構造、日本語生成方針）。
- `.claude/skills/kiro-discovery/SKILL.md`（YAML frontmatter + Execution Steps + rules/ 分割という流儀）。
- ユーザー発言: 「ガッチリ状態遷移を管理してもらわなくてよい」「良いタイミングで全体仕様を調整したい」「大規模リファクタを行いたい」「配布は npx」「アルゴリズムも後々可変に」。
- 参考リポジトリ J-Tech/intent-system（重すぎた、という反面教師）。

## Open Questions

- Intent Tree の Q1–Q3 を継承（モード推奨信号 / --lang の翻訳範囲 / cc-sdd 連携の自動化度）。
- これらは standard モード段階の実装判断には不要。export 時に cc-sdd 側 Open Questions へ送る。
