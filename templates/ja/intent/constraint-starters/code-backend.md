# Constraint Starters — code / バックエンド（ビジネスロジック）

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: サーバ側のビジネスロジックの正しさ（冪等性・トランザクションの一貫性・並行更新の制御・失敗時の安全側倒し）。`領域: code` に属します。永続化の物理（スキーマ・索引・接続）は code / データ・永続化に、遠隔呼び出しの障害耐性は code / インフラにあります。

## id: idempotency-retry-safe

- name: 冪等性・リトライ安全（書き込みの再試行で重複させない）
- 領域: code
- 適合する状況: ネットワーク越しの書き込み・課金・在庫引き当てなど、リクエストが届いたか不確かでクライアントが再送しうる案件。`POST`/`PATCH` 等で同じ操作が二重に実行されると困るとき。
- 叩き台:
  - Anti-direction: 書き込み操作を「1回しか来ない」前提で作らない。再送で二重課金・二重登録が起きる設計にしない。
  - Invariant: 再試行で副作用が重複しないよう冪等にする。`PUT`/`DELETE` は仕様上冪等に保ち、`POST`/`PATCH` 等の非冪等操作には冪等キー（Idempotency-Key）等で重複実行を防ぐ。同じリクエストの複数回到達でも結果が壊れないことを保証する。
- 出典: MDN Web Docs "Idempotent"（HTTP メソッドの冪等性の定義・https://developer.mozilla.org/en-US/docs/Glossary/Idempotent・取得 2026-06-26）

## id: transaction-atomicity-boundaries

- name: トランザクション境界・原子性（関連する書き込みは一括で確定する）
- 領域: code
- 適合する状況: 複数テーブル・複数行を1つの業務操作として更新する案件（送金・在庫と注文の同時更新・親子レコードの一括登録など）。途中失敗で片方だけ書かれると不整合になるとき。
- 叩き台:
  - Anti-direction: 関連する複数の書き込みを個別に確定し、途中失敗で中途半端な状態が残るのを許さない。
  - Invariant: 業務的に一体の書き込みは1つのトランザクションで囲み、全部成功か全部取り消し（原子性）にする。途中失敗時は ROLLBACK で部分書き込みを残さない。
- 出典: PostgreSQL Documentation "Transactions"（https://www.postgresql.org/docs/current/tutorial-transactions.html・取得 2026-07-04）

## id: lost-update-locking

- name: 更新消失の防止・ロック戦略（同一行への並行更新で片方を上書きしない）
- 領域: code
- 適合する状況: 同じ行を複数のリクエストが読み→計算→書き戻す案件（残高・在庫数・カウンタ・予約枠など）。read-modify-write が並行して走り、後勝ちで先の更新が消えうるとき。
- 叩き台:
  - Anti-direction: 読み取ってから書き戻すまでの間に他者が更新しない前提で作り、更新消失（lost update）を放置しない。
  - Invariant: 並行更新の競合を明示的に制御する。悲観ロック（SELECT ... FOR UPDATE で対象行をロック）または楽観ロック（version 列で更新前チェック）で、片方の更新が黙って上書きされないようにする。
- 出典: PostgreSQL Documentation "Explicit Locking"（https://www.postgresql.org/docs/current/explicit-locking.html・取得 2026-07-04）

## id: fail-securely-no-swallow

- name: 失敗時は安全側に倒す（fail closed・例外の握りつぶし禁止）
- 領域: code
- 適合する状況: 認証・認可・検証など、セキュリティに関わる判定を含む案件。エラー時の既定状態が安全性を左右し、失敗が「許可」に化ける構造が見えるとき。
- 叩き台:
  - Anti-direction: 例外を空の catch で握りつぶして処理を続行しない。失敗時に既定でアクセスを許可する（fail open）方向へ倒さない。
  - Invariant: エラーは握りつぶさず安全側に倒す。`isAuthorized()` / `isAuthenticated()` / `validate()` などは処理中に例外が起きたら false を返す。判定変数は既定で拒否（例: `isAdmin = false`）に初期化し、成功が確認できたときだけ許可へ変える。
- 出典: OWASP "Fail securely"（https://owasp.org/www-community/Fail_securely・取得 2026-07-04）
