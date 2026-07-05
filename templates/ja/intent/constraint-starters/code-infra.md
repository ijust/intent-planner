# Constraint Starters — code / インフラ・障害耐性

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: インフラ・運用・障害耐性（遠隔呼び出しのタイムアウト・再試行・遮断/縮退・可観測性・リソース解放）。`領域: code` に属します。分散したコンポーネントをまたぐ失敗の波及を止め、運用時に追跡・回復できる状態を保つ関心を集めます。

## id: bounded-timeout-remote-calls

- name: リモート呼び出しに必ずタイムアウトを設ける（無制限待ちの禁止）
- 領域: code
- 適合する状況: ネットワーク・データベース・RPC・外部 API など、応答が返らない可能性のある遠隔呼び出しを行う案件。無応答の相手を待ち続けてスレッド・接続を掴んだままになる構造が見えるとき。
- 叩き台:
  - Anti-direction: タイムアウト（期限）を設定せず、または極端に長い期限で遠隔呼び出しを待ち続けない。無応答の依存先の待ちが呼び出し元へ連鎖して枯渇するのを放置しない。
  - Invariant: すべての遠隔呼び出しに上限付きの期限（deadline / timeout）を設定し、無応答の相手にリソースを縛られ続けないようにする。待ちを打ち切って制御を戻し、障害の連鎖（cascading failure）を防ぐ。
- 出典: Google SRE Book "Addressing Cascading Failures"（https://sre.google/sre-book/addressing-cascading-failures/・取得 2026-07-04）

## id: retry-backoff-jitter

- name: 再試行は指数バックオフ＋ジッターで（密集リトライの禁止）
- 領域: code
- 適合する状況: 一時的な失敗を再試行（retry）で吸収する案件。多数のクライアントが同時に即時再送して相手を叩き潰す（thundering herd）構造が見えるとき。冪等な操作に限る（冪等性 `idempotency-retry-safe` と対で機能する）。
- 叩き台:
  - Anti-direction: 失敗時に間隔を空けず密なループで即時再試行しない。全クライアントが同じタイミングで一斉に再送して負荷を増幅させない。
  - Invariant: 再試行間隔を指数的に伸ばし（exponential backoff）、さらにランダムな揺らぎ（jitter）を加えて再試行を時間軸へ分散させる。リトライ回数に上限を設け、リトライ対象は冪等な操作に限る。
- 出典: AWS Architecture Blog "Exponential Backoff And Jitter"（Marc Brooker・https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/・取得 2026-07-04）

## id: circuit-breaker-degradation

- name: 失敗し続ける依存先はサーキットブレーカーで遮断・縮退（graceful degradation）
- 領域: code
- 適合する状況: 外部サービス・下流依存へ繰り返し呼び出す案件で、その依存先が継続的に失敗・無応答になり、呼び出しを繰り返して自分まで巻き添えで倒れうるとき。
- 叩き台:
  - Anti-direction: 応答しない依存先を呼び続けて重要リソースを枯渇させ、複数システムへ連鎖障害（cascading failure）を波及させない。
  - Invariant: 失敗が閾値を超えたら呼び出しを遮断（circuit breaker を open）し、即座にエラー返却またはキャッシュ・既定値で縮退運転（graceful degradation）する。回復を検知したら段階的に呼び出しを戻す。
- 出典: Martin Fowler "CircuitBreaker"（https://martinfowler.com/bliki/CircuitBreaker.html・取得 2026-07-04）

## id: structured-logging-correlation-id

- name: 文脈付き構造化ログと相関 ID（黙ってエラーを握りつぶさない）
- 領域: code
- 適合する状況: 複数コンポーネント・複数 RPC をまたいで動く本番サービス・バッチを実装する案件。後から障害を追跡・診断する必要があるとき。エラーが握りつぶされて痕跡が残らない構造が見えるとき。
- 叩き台:
  - Anti-direction: エラーを握りつぶして（catch して無言で捨てて）痕跡を残さない。文脈のないログで、どの上流ログがどの下流ログに対応するか追えない状態を残さない。
  - Invariant: リクエストを貫く一意な識別子（request identifier / correlation ID）を全 RPC に通し、構造化ログとして出力する。エラーは握りつぶさず深刻度に応じて記録・伝播し、診断・復旧までの時間を縮める。
- 出典: Google SRE Book "Effective Troubleshooting"（https://sre.google/sre-book/effective-troubleshooting/・取得 2026-07-04）

## id: resource-cleanup-no-leak

- name: リソースの確実な解放（defer / try-with-resources / RAII で漏れを防ぐ）
- 領域: code
- 適合する状況: ファイル・ネットワーク接続・DB コネクション・ロック・ハンドルなど、確保したら解放が必要なリソースを扱う案件。正常系でしか解放せず、例外・早期 return の経路で漏れる構造が見えるとき。
- 叩き台:
  - Anti-direction: リソースの解放を正常系の末尾だけに書かない。途中の return・例外・分岐によって解放処理が飛ばされ、リソースが漏れる（leak）状態を残さない。
  - Invariant: 確保したリソースは、成功・失敗・例外のどの経路で関数を抜けても必ず閉じる。言語機構（Go の defer、Java の try-with-resources、Python の with、C++ の RAII 等）で獲得と解放を対にし、確保直後に解放を予約する。
- 出典: The Go Programming Language Blog "Defer, Panic, and Recover"（https://go.dev/blog/defer-panic-and-recover・取得 2026-07-04）
