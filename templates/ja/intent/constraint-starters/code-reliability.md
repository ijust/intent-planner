# Constraint Starters — code / 設計・信頼性

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: コードの設計・信頼性（冪等性・入力検証・データアクセス効率など）。`領域: code` に属します。

## id: idempotency-retry-safe

- name: 冪等性・リトライ安全（書き込みの再試行で重複させない）
- 領域: code
- 適合する状況: ネットワーク越しの書き込み・課金・在庫引き当てなど、リクエストが届いたか不確かでクライアントが再送しうる案件。`POST`/`PATCH` 等で同じ操作が二重に実行されると困るとき。
- 叩き台:
  - Anti-direction: 書き込み操作を「1回しか来ない」前提で作らない。再送で二重課金・二重登録が起きる設計にしない。
  - Invariant: 再試行で副作用が重複しないよう冪等にする。`PUT`/`DELETE` は仕様上冪等に保ち、`POST`/`PATCH` 等の非冪等操作には冪等キー（Idempotency-Key）等で重複実行を防ぐ。同じリクエストの複数回到達でも結果が壊れないことを保証する。
- 出典: MDN Web Docs "Idempotent"（HTTP メソッドの冪等性の定義・https://developer.mozilla.org/en-US/docs/Glossary/Idempotent・取得 2026-06-26）

## id: input-validation-fail-fast

- name: 入力バリデーション（境界で早期に・Fail-Fast）
- 領域: code
- 適合する状況: 外部（Web クライアント・他システム連携・取引先フィード等）から受け取ったデータを処理・永続化する案件。信頼できない入力がそのまま下流へ流れる進み方が見えるとき。
- 叩き台:
  - Anti-direction: 入力を検証せずに下流（DB・他コンポーネント）へ流さない。バリデーションを処理の奥に散らさない。
  - Invariant: 信頼できないすべての入力元に対し、データフローのできるだけ早い段階（外部から受け取った直後）で「正しく形成されたデータだけ」を通す検証を行う。期待外・空入力時の返却契約（Fail-Fast）を定める。なお入力検証は XSS/SQLi 等の主防御の代わりにはしない（各対策と併走する補助）。
- 出典: OWASP Input Validation Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html・取得 2026-06-26）

## id: n-plus-1-query

- name: N+1 クエリ回避（一括取得・eager loading）
- 領域: code
- 適合する状況: ORM 等で一覧を取得し、各要素の関連データをループ内で都度問い合わせる案件。1件ずつのクエリが速くて遅いクエリログに出ないため見逃されがちなとき。
- 叩き台:
  - Anti-direction: 一覧の各行ごとに関連データを個別クエリで引かない（ループ内クエリ）。「個々は速いから問題ない」と総量を見落とさない。
  - Invariant: 主クエリで取れたはずの関連データを N 回の追加クエリで引かない。JOIN・一括取得（eager loading）・バッチ化でデータベース往復を減らす。クエリ数を観測（プロファイル）して N+1 を検出できるようにする。
- 出典: Stack Overflow "What is the 'N+1 selects problem' in ORM"（N+1 問題の定義・Vlad Mihalcea 回答・https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm-object-relational-mapping・取得 2026-06-26）
