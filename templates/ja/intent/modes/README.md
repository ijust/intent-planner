# Modes — Intent の詰め方アルゴリズムの拡張点

このディレクトリは「モード」を保持します。モードとは、Intent をどう詰めるか（アルゴリズムの組み合わせ）を定義した戦略です。`/intent-discover` がリポジトリ状況からモードを推奨し、確定したモードは `../mode.md` に記録されます。以降のコマンドは `mode.md` を読み、対応するモード定義に従って動きます。

## 3層構造

Intent の詰め方は3層に分離されています。

1. **Mode**（`modes/*.md`）— フェーズ → アルゴリズムの組み合わせ表（このディレクトリ）
2. **Algorithm**（各 skill の `rules/algo-*.md` / `rules/map-*.md`）— 個別の Intent 抽出・変換技法
3. **Skill**（`.claude/skills/intent-*/SKILL.md`）— モードを読み込んで実行する実体

## 同梱モード

- `standard.md` — GORE-lite + QOC + Example Mapping + map-cc-sdd。標準（既定）の汎用モード。新規プロダクトに加え、状況特化モードが当てはまらない既存プロジェクトでも使う。
- `refactor.md` — GORE-lite + Drift Analysis + Migration Slicing + QOC + map-cc-sdd。既存大規模プロジェクトのリファクタ・再設計向け。
- `behavior-unknown.md` — GORE-lite + Example Mapping + Characterization Test + QOC + map-cc-sdd。振る舞いが不明なレガシー向け。

## 新しいモードを追加する

1. このディレクトリに `modes/<your-mode>.md` を1枚追加する。`standard.md` を雛形に、各フェーズ（discover/compass/packets/export）でどのアルゴリズムを使うかの組み合わせ表と適合状況を書く。
2. 既存のアルゴリズム（GORE-lite/QOC/Example Mapping/map-cc-sdd）で足りる場合は、それらを参照するだけでよい。
3. 新しいアルゴリズムが必要な場合のみ、対応する skill の `rules/` に `algo-<name>.md` を追加し、モード定義から参照する。
4. `/intent-discover` のモード推奨ロジック（`intent-discover/rules/mode-selection.md`）に、新モードを推奨する条件を追記する。

`refactor.md` / `behavior-unknown.md` は同梱済みです。さらに別のモードを足したい場合に、上記の手順で追加してください。
