# intent-tree 案件記録の分割収納（canonical・1案件=1ファイル）

`.intent/intent-tree.md`（本体）の骨格（L0–L4 コア・製品の検証仮説・画面ラフ参照・Open Questions）は本体に残し、**案件単位の記録**（`## 機能追記:` / `## 機能撤去:` / `## 履歴:` / `## 再起案:`）を1案件=1ファイルで収納する置き場です（INV80・正規化収納。compass の `.intent/compass/` と同型）。**この収納が空・不在でも、すべてのスキルは従来どおり本体の旧形式で動きます**（読み手にとって旧経路は恒久フォールバック＝DR133）。

正規化の狙いは、別案件の並行 discover が本体の同じ末尾を同時に書いて衝突する火種（O1）を消すこと。1案件=1ファイル＝レコード（同時書き込みの分離）／git commit＝トランザクション／派生 index＝ビュー（利用者が 2026-06-29 から求めてきた「DB ライクにトランザクション管理」＝DR194。実 DB は入れない＝INV2）。

## ファイル規約（1案件=1ファイル）

- ファイル名 = 案件の feature スラッグ（例: `federated-governance.md`・`canonical-slimming.md`）。**新しい discover の機能追記は、このディレクトリに新ファイルを作ることで生まれます**（本体末尾に追記しない）。並行セッションが別案件を同時に discover しても別ファイルに落ちるので衝突しません。
- frontmatter は最小スキーマ（既存概念の昇格のみ・新しい分類軸を発明しない・INV2）:

```markdown
---
feature: federated-governance     # ファイル名と同一の feature スラッグ
status: active                    # active（案件記録は台帳として残す。撤去/履歴/再起案も active な記録）
kind: 機能追記                     # 機能追記 | 機能撤去 | 履歴 | 再起案
---
```

- frontmatter の下は、本体にあったときの案件記録の本文（`## 機能追記: <feature>（…）` 見出しから始まる）を**そのまま**置きます。**move であって edit ではない**＝本体にあった文面・番号・意味を変えずに移します（INV80 の「失ってはいけない4点」＝①意味内容 ②既存参照の到達性 ③承認の堰 ④append-only 記録の不変性）。

## 全部 git 追跡（compass 型）

この収納の中身は canonical（チーム共有の意図データ）なので、README も index も個別 `<feature>.md` も**全部 git 追跡**します（`.gitignore` に入れません）。個別ファイルを gitignore する discovery/domains 型（一時宣言・組織情報向け）を踏襲しないでください（移行データが git 管理から漏れる）。

## index.md（派生・手編集しない）

- `index.md` は 1案件=1行の派生キャッシュです: `- <feature> [<kind>] <status> — <要旨1行>`
- 案件記録を触ったスキルが、処理完了時に再生成します（`.intent/compass/index.md`・`.intent/packets/index.md` と同じ規約）。実体とズレても「再生成で直る派生のズレ」であり、衝突ではありません。

## 読み手の契約（新旧両対応・恒久フォールバック）

- この収納が在れば `index.md` → 該当 `<feature>.md` を読みます（案件単位の pull）。骨格（L0–L4）は従来どおり本体 `.intent/intent-tree.md` を読みます。
- この収納が無ければ、案件記録も従来どおり本体 `.intent/intent-tree.md` の末尾（旧形式の `## 機能追記:` 群）を読みます。旧経路は削除しません（DR133）。
- 分割と本体の両方に同一 feature がある異常系は「分割が正・本体は legacy」（compass の Current Drift 規約と同型）。
