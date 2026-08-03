# Constraint Starters — code / データ・永続化

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: データベース・永続化層の物理設計（スキーマ制約・マイグレーション・索引・クエリ効率・接続）。`領域: code` に属します。業務ロジックとしてのトランザクション一貫性・並行更新の制御は code / バックエンドに、SQL インジェクション対策（プレースホルダ）は code / セキュリティにあります（ここでは重複させません）。

## id: expand-contract-migration

- name: 後方互換マイグレーション（拡張→移送→縮小の三段で無停止に変える）
- 領域: code
- 適合する状況: 稼働中のテーブルのスキーマを変える案件（列のリネーム・型変更・分割など）。旧コードと新コードが一時的に共存し、一括の drop-and-recreate では既存アクセスを壊すとき。
- 叩き台:
  - Anti-direction: 稼働中テーブルを1回のデプロイで drop して作り直したり、非互換な変更を一気に当てて既存コードを壊さない。
  - Invariant: 各マイグレーションは後方互換な小さい変更に分ける。expand-contract（新列を足す→データを移送・backfill→旧列を落とす）を別デプロイに分け、途中のどの時点でも旧新両コードが動くよう保つ。
- 出典: Martin Fowler "Evolutionary Database Design"（https://martinfowler.com/articles/evodb.html・取得 2026-07-04）

## id: schema-level-integrity-constraints

- name: スキーマ側の整合性制約（不変条件はアプリだけでなく DB で守る）
- 領域: code
- 適合する状況: データの正しさ（必須・一意・参照の存在・値の範囲）が業務上のルールになっている案件。アプリのバリデーションだけに頼ると、別経路の書き込みや競合で不正データが混入しうるとき。
- 叩き台:
  - Anti-direction: 必須・一意・参照整合・値域のチェックをアプリコードだけに置き、DB を素通りで不正データが入るのを許さない。
  - Invariant: データの不変条件はスキーマ側の制約（NOT NULL / UNIQUE / FOREIGN KEY / CHECK）で宣言的に強制する。制約違反は DB がエラーで弾く。
- 出典: PostgreSQL Documentation "Constraints"（https://www.postgresql.org/docs/current/ddl-constraints.html・取得 2026-07-04）

## id: index-for-query-patterns

- name: クエリパターンに沿った索引設計（WHERE/JOIN/ORDER BY を索引で支える）
- 領域: code
- 適合する状況: 特定の列で頻繁に絞り込み・結合・整列する案件。全表走査が遅い、または逆に索引を貼りすぎて書き込みが重くなっているとき。
- 叩き台:
  - Anti-direction: 実際のクエリの検索条件を見ずに索引を決めない。かつ、片端から索引を貼って書き込みコストを無視しない。
  - Invariant: WHERE / JOIN / ORDER BY で使う列を索引で支える。索引は書き込みコストを伴うため、実際のクエリパターンに沿った必要な索引に絞る。
- 出典: Markus Winand "Use The Index, Luke!" — The WHERE Clause（https://use-the-index-luke.com/sql/where-clause・取得 2026-07-04）

## id: n-plus-1-query

- name: N+1 クエリ回避（一括取得・eager loading）
- 領域: code
- 適合する状況: ORM 等で一覧を取得し、各要素の関連データをループ内で都度問い合わせる案件。1件ずつのクエリが速くて遅いクエリログに出ないため見逃されがちなとき。
- 叩き台:
  - Anti-direction: 一覧の各行ごとに関連データを個別クエリで引かない（ループ内クエリ）。「個々は速いから問題ない」と総量を見落とさない。
  - Invariant: 主クエリで取れたはずの関連データを N 回の追加クエリで引かない。JOIN・一括取得（eager loading）・バッチ化でデータベース往復を減らす。クエリ数を観測（プロファイル）して N+1 を検出できるようにする。
- 出典: Stack Overflow "What is the 'N+1 selects problem' in ORM"（N+1 問題の定義・Vlad Mihalcea 回答・https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm-object-relational-mapping・取得 2026-06-26）

## id: connection-pool-exhaustion

- name: コネクションプールの枯渇回避（DB 接続上限を超えて張らない）
- 領域: code
- 適合する状況: 多数の並行リクエストやワーカーから DB へ接続する案件。リクエストごとに接続を張る・返し忘れる、あるいはプール上限が server の max_connections と噛み合わず接続枯渇するとき。
- 叩き台:
  - Anti-direction: リクエストごとに無制限に接続を張ったり返し忘れたりして、DB の接続上限を食い潰さない。
  - Invariant: 接続はプールで再利用し、使い終えたら必ず返す。プールの上限をサーバの max_connections の範囲内に収め、接続枯渇を防ぐ。
- 出典: PostgreSQL Documentation "Connection Settings"（max_connections）（https://www.postgresql.org/docs/current/runtime-config-connection.html・取得 2026-07-04）

## id: temporal-valid-and-transaction-time

- name: 時間軸の分離（事実が有効な期間と、記録されていた期間を混ぜない）
- 領域: code
- 適合する状況: 遡及訂正、監査、契約・料金・所属などの履歴照会で、「その時点で有効だった事実」と「その時点でシステムが把握していた事実」の両方を問う案件。
- 叩き台:
  - Anti-direction: `created_at` / `updated_at` だけで業務上の有効期間まで表したり、訂正時に過去行を上書きして当時の記録を失わない。
  - Invariant: valid time（現実で有効な期間）と transaction time（DBに記録されていた期間）を別の軸として定義する。両方が必要なときだけ二時間軸を採り、各 as-of 問合せがどちらの軸を使うか明示する。
- 出典: Oracle Database Documentation "Managing and Maintaining Time-Based Information"（valid time と transaction time の区別・https://docs.oracle.com/en/database/oracle/oracle-database/26/vldbg/time-based-info.html・取得 2026-08-04）／Microsoft Learn "Temporal tables"（system-versioned current/history tables と point-in-time analysis・https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables・取得 2026-08-04）

## id: temporal-half-open-nonoverlap

- name: 期間境界と重複の明示（半開区間とDB制約で曖昧さを防ぐ）
- 領域: code
- 適合する状況: 価格・契約・割当など、同じ対象について期間が連続し、同時に複数の有効行を許さない案件。
- 叩き台:
  - Anti-direction: 終端を含むかを実装ごとに変えたり、アプリの事前確認だけで期間重複を防いで並行書き込みをすり抜けさせない。
  - Invariant: 期間は原則 `[開始, 終了)` の半開区間として境界を統一し、開始 < 終了を守る。同一対象で重複を許さない規則は、可能なら range 型と exclusion constraint 等のDB制約で原子的に強制する。
- 出典: PostgreSQL Documentation "Range Types"（`[)` の正規形、range の重複演算、exclusion constraint による非重複・https://www.postgresql.org/docs/current/rangetypes.html・取得 2026-08-04）

## id: immutable-append-correct-replay

- name: 追加記録による訂正（不変イベントを上書きせず、順序と再生可能性を保つ）
- 領域: code
- 適合する状況: 監査証跡、過去状態の再構築、複数の読み取りモデルが必要で、変更を不変イベントとして保存する価値が複雑さを上回る案件。
- 叩き台:
  - Anti-direction: 保存済みイベントを更新・削除して履歴の意味を変えたり、時刻だけを全順序として扱って競合や重複を見失わない。
  - Invariant: イベントはストリーム内の一意な識別子と順序を持つ追加専用の事実として保存する。誤りは補正イベントで表し、期待バージョン等で並行追記を検出する。投影は同じ列から再構築でき、処理は再試行・重複配送を考慮する。
- 出典: Microsoft Azure Architecture Center "Event Sourcing pattern"（append-only events、compensating events、optimistic concurrency、replay/projections・https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing・取得 2026-08-04）

## id: immutable-selective-adoption

- name: 不変モデルの選択的採用（監査・再構築の価値がある境界だけに限定する）
- 領域: code
- 適合する状況: Event Sourcing や追加専用履歴の採用を検討しているが、単純な現在値のCRUD、個人データ削除、スキーマ進化、投影の運用負荷も存在する案件。
- 叩き台:
  - Anti-direction: 「履歴が欲しい」だけで全データを Event Sourcing にせず、削除義務やイベント版管理、投影の結果整合性を設計外に置かない。
  - Invariant: 不変履歴は監査・再構築・時間照会が必要な境界に限定する。採用時はイベントの版互換、投影再構築、スナップショットの整合、保持・削除方針を先に決め、単純な現在値管理には通常の可変CRUDを選べるようにする。
- 出典: Microsoft Azure Architecture Center "Event Sourcing pattern"（複雑性、eventual consistency、schema evolution、snapshots、privacy/deletion conflict、適用しない条件・https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing・取得 2026-08-04）
