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
