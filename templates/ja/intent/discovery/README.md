# discovery 発行ディレクトリ（ローカル専用）

このディレクトリは **`/intent-discover` の発行ごとの作業状態**を入れるコンテナです。discover を1回実行するたびに、ここへ**自己完結した発行ディレクトリ**が1つ作られます:

```
.intent/discovery/
  README.md                       ← このファイル（追跡される・説明）
  <スラッグ>-<rand>/               ← 1 discover 発行 = 1 ディレクトリ（git 非追跡）
    mode.md                       ← その発行の mode 状態（mode / designer-questions / purpose / format）
    （今後）...                   ← その発行に紐づく discover 拡張データの置き場
  <別スラッグ>-<rand>/             ← 別の発行（並行セッションでも衝突しない）
    mode.md
```

mode 状態は各発行ディレクトリの**第一住人**にすぎません。このディレクトリはその discover 発行に紐づく作業データの汎用の置き場であって、mode 専用のコンテナではありません。

## なぜディレクトリに分けるのか（同マシン並行衝突の解消）

単一の `.intent/mode.local.md` 1ファイルだと、同一マシンで複数のセッション/worktree を並行して回したとき、後発の `/intent-discover` が前のセッションの mode 状態を上書きして消してしまいます（git 非追跡ゆえ衝突検知も効きません）。

そこで **packet（`.intent/packets/active/<packet_id>.md`）と同じ手筋**で、discover 発行ごとに別ディレクトリへ分けます。ディレクトリ名 `<スラッグ>-<rand>` は packet ID と同型で、末尾のランダム4文字により**並行セッションでも衝突しません**（中央採番カウンタを持ちません）。

## 発行ディレクトリ名の規則

`<スラッグ>-<rand>`:

- `<スラッグ>`: その discover が扱う案件を表す英字スラッグ（`/intent-discover` が案件名から導出）。
- `<rand>`: 半角英小文字と数字 `[a-z0-9]` 4文字（起案時にシェルで生成）。並行衝突を防ぐ。

## 読み手の同定（どの発行を読むか）

`/intent-discover` は発行ディレクトリを作ったとき、その**発行ディレクトリ名を出力**します。後続の `/intent-compass` / `/intent-packets` 等は、その**発行名を引き継いで**自分の系列の `mode.md` を読みます（並んだ複数の発行から「自分のもの」を探す必要はありません）。

読み取りの後方互換（read fallback）: 読み手は **引き継がれた発行ディレクトリの `mode.md` → 無ければ単一 `.intent/mode.local.md`（legacy）→ 旧 `.intent/mode.md` の mode 状態 → どちらにも無ければ `standard` 既定** の順で読みます。旧 scaffold（発行ディレクトリを持たない既存環境）でも壊れません。

## 追跡・非追跡

- このディレクトリ自体（`README.md`）は git 追跡されます（説明のため）。
- 発行ディレクトリ（`<スラッグ>-<rand>/`）とその中身は **git 非追跡**です（mode 状態はローカル専用・installer が `.gitignore` に登録）。
- 共有したいポリシー（Enforcement / Drift-watch）は引き続き追跡される `.intent/mode.md` にあります。
