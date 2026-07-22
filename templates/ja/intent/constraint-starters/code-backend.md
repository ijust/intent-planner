# Constraint Starters — code / バックエンド（ビジネスロジック）

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: サーバ側のビジネスロジックの正しさ（冪等性・トランザクションの一貫性・並行更新の制御・失敗時の安全側倒し・日時の取得/導出/検証）。`領域: code` に属します。永続化の物理（スキーマ・索引・接続）は code / データ・永続化に、遠隔呼び出しの障害耐性は code / インフラにあります。

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

## id: temporal-derivation-explicit-time-zone

- name: 日付・時刻の導出に使うタイムゾーンを明示する
- 領域: code
- 適合する状況: サーバ側で「今日」・日付・時刻・曜日・月・締切・集計期間・日付の切り替わりを求める案件。保存済みのタイムスタンプや現在時刻から、利用者または業務上の暦へ変換するとき。
- 叩き台:
  - Anti-direction: サーバーやプロセスの既定タイムゾーン、タイムゾーンを持たないローカル日時、または UTC 上の日付を、対象となる利用者・業務の日付として暗黙に使わない。
  - Invariant: 日付・時刻・曜日・期間境界を導出する前に、基準となる瞬間と、対象となる利用者または業務のタイムゾーンを明示する。瞬間をそのタイムゾーンへ変換してから暦上の値を求め、夏時間を含む地域の規則を適用する。UTC を使う場合も、それが対象業務の明示された規則であることを要する。サーバーやプロセスの既定タイムゾーンには依存しない。
- 出典: Oracle Java Documentation `LocalDate.now(ZoneId)` / `LocalDate.atStartOfDay(ZoneId)`（タイムゾーンの明示による既定値依存の回避、および夏時間を含む日境界の規則・https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDate.html・取得 2026-07-23）

## id: current-time-injectable-clock

- name: 現在時刻を差し替え可能な時計から取得する
- 領域: code
- 適合する状況: 現在日付・期限・有効期間・経過時間など、実行時の現在時刻によって結果が変わるサーバ側ロジックを実装・テストする案件。
- 叩き台:
  - Anti-direction: 業務ロジックの内部でシステム時計を直接参照し、テストが実行時刻や実行環境に左右される構造にしない。
  - Invariant: 現在時刻に依存するロジックは、差し替え可能な時計を依存として受け取る。テストでは時計を固定し、日付の切り替わり・期限の直前直後・うるう日などの境界条件を同じ入力で再現できるようにする。
- 出典: Oracle Java Documentation `LocalDate.now(Clock)`（代替時計を依存性注入し、現在日付を使うコードをテスト可能にする方法・https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDate.html・取得 2026-07-23）

## id: zoned-day-boundary-not-fixed-duration

- name: タイムゾーン上の日境界を固定24時間で表さない
- 領域: code
- 適合する状況: 日別集計・当日分の検索・日次締めなど、タイムゾーン上の1日を時刻範囲へ変換する案件。夏時間などで時差が切り替わる地域を扱うとき。
- 叩き台:
  - Anti-direction: 1日の開始を常に `00:00` と決め打ちし、開始時刻へ固定24時間を足した値を翌日の境界として使わない。
  - Invariant: 日単位の範囲は、対象タイムゾーンの規則から求めた「対象日の最初の有効な瞬間」以上、「翌日の最初の有効な瞬間」未満として表す。存在しない時刻や重複する時刻を、固定オフセットまたは固定24時間で補正しない。
- 出典: Oracle Java Documentation `LocalDate.atStartOfDay(ZoneId)`（夏時間等により日付の最初の有効時刻が午前0時とは限らず、時刻の欠落・重複が生じうること・https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDate.html・取得 2026-07-23）

## id: temporal-types-match-domain-meaning

- name: 暦上の日付と時間軸上の瞬間を区別する
- 領域: code
- 適合する状況: 誕生日・請求日・営業日などの暦日と、作成時刻・送信時刻・発生時刻などの一意な瞬間を、API・業務モデル・永続データで扱う案件。
- 叩き台:
  - Anti-direction: タイムゾーンを持たない日付やローカル日時を、時間軸上の一意な瞬間として保存・比較・順序付けしない。反対に、暦日だけで足りる値へ不要な時刻やタイムゾーンを混ぜない。
  - Invariant: 値が表す業務上の意味に合わせて、暦上の日付、ローカル日時、オフセット付き日時、時間軸上の瞬間を区別する。瞬間から暦日へ変換するときは対象タイムゾーンを必須入力とし、変換前後で値の意味が変わることを型または項目名に表す。
- 出典: Oracle Java Documentation `LocalDate` / `LocalDate.ofInstant(Instant, ZoneId)`（`LocalDate` はタイムゾーンを持たない日付であり、瞬間から日付を得るにはタイムゾーンが必要・https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDate.html・取得 2026-07-23）

## id: calendar-date-strict-validation

- name: 存在しない暦日を暗黙に補正しない
- 領域: code
- 適合する状況: 年・月・日を外部入力から受け取り、日付へ変換する API・フォーム・取込処理。月末・うるう年など、組み合わせによって有効性が変わる日付を扱うとき。
- 叩き台:
  - Anti-direction: `2月30日` や平年の `2月29日` など、存在しない年月日を翌月・前日などへ黙って補正して受理しない。
  - Invariant: 年・月・日の個別範囲だけでなく、その組み合わせが暦上に存在することを検証する。存在しない日付は入力エラーとして明示し、補正を許す業務要件がある場合だけ、その補正规則と結果を利用者へ明示する。
- 出典: Oracle Java Documentation `LocalDate.of(...)`（年月日の各値または組み合わせが不正な場合は `DateTimeException` とする契約・https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDate.html・取得 2026-07-23）
