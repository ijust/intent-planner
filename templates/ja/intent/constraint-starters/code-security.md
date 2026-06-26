# Constraint Starters — code / セキュリティ

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: コードのセキュリティ（OWASP 系）。`領域: code` に属し、`適合する状況` でフロントエンド/バックエンドを問わずユーザー入力・認証・機密の扱いが絡む案件に当てます。

## id: sql-injection-placeholder

- name: SQL インジェクション対策（プレースホルダ徹底）
- 領域: code
- 適合する状況: Web アプリ等で、ユーザー入力を含む値を使って SQL を組み立てる・データベースへ問い合わせる案件。文字列連結でクエリを作る進み方が見えるとき。
- 叩き台:
  - Anti-direction: ユーザー入力を文字列連結で SQL に埋め込まない。動的に組み立てたクエリ文字列をそのまま実行しない。
  - Invariant: ユーザー由来の値は必ずプレースホルダ（パラメータ化クエリ）経由で渡す。値を SQL 構文の一部として連結しない。
- 出典: OWASP SQL Injection Prevention Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html・取得 2026-06-21）

## id: xss-output-encoding

- name: XSS 対策（出力エンコーディング・自動エスケープ）
- 領域: code
- 適合する状況: ユーザー由来のデータを HTML / JavaScript / URL / CSS の各文脈へ描画する Web フロントエンド・テンプレートの案件。フレームワークの自動エスケープを迂回する書き方（`dangerouslySetInnerHTML`・`innerHTML` 直書き・`bypassSecurityTrust*` 等）が見えるとき。
- 叩き台:
  - Anti-direction: ユーザー入力をエスケープせずに DOM へ差し込まない。フレームワークの自動エスケープを安易な「エスケープハッチ」で迂回しない。
  - Invariant: 出力する変数は描画先の文脈（HTML 本体 / 属性 / JS / URL / CSS）に応じた出力エンコーディングを通す。HTML を許可する場合はサニタイズライブラリを使う。文脈ごとに正しいエンコーディングを選ぶ。
- 出典: OWASP Cross Site Scripting Prevention Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html・取得 2026-06-26）

## id: csrf-token

- name: CSRF 対策（トークン・SameSite）
- 領域: code
- 適合する状況: Cookie によるセッション認証を使い、状態を変える操作（フォーム送信・更新・削除等）を持つ Web アプリの案件。認証済みユーザーのブラウザが意図しないリクエストを送らされうる構造のとき。
- 叩き台:
  - Anti-direction: 状態を変えるリクエストを認証 Cookie の有無だけで受け付けない。CSRF 対策をフレームワーク任せだと思い込んで未確認で進めない。
  - Invariant: まずフレームワーク標準の CSRF 保護を使う。無ければ状態変更リクエストに CSRF トークンを付与しサーバ側で検証する。セッション Cookie に SameSite 属性を併用する（XSS があると CSRF 対策は破られうるので XSS 対策と併走させる）。
- 出典: OWASP Cross-Site Request Forgery Prevention Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html・取得 2026-06-26）

## id: authorization-least-privilege

- name: 認可（最小権限・サーバ側で都度検証）
- 領域: code
- 適合する状況: ロールや所有者によってアクセスできるリソース・操作が変わる案件。認証（本人確認）は済んでいるがアクセス制御の設計がこれからのとき。他人のリソースを ID 指定で触れてしまう構造（水平権限昇格）が見えるとき。
- 叩き台:
  - Anti-direction: 認証済み＝何でも許可、と扱わない。認可チェックをクライアント側だけに置かない。ID を渡されたら所有者確認なしにリソースを返さない。
  - Invariant: 既定は拒否（deny by default）で必要な権限だけ与える（最小権限）。アクセスできるアクターと、行レベルの所有権（誰がどのデータに触れるか）をサーバ側で都度検証する。認可違反をログに残す。
- 出典: OWASP Authorization Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html・OWASP Top 10 2021 A01 Broken Access Control・取得 2026-06-26）

## id: secrets-no-hardcode

- name: シークレット管理（ハードコード禁止・集中管理）
- 領域: code
- 適合する状況: API キー・DB 認証情報・SSH 鍵・証明書などの秘密情報を扱う案件。ソースコードや設定ファイルに秘密を直書きする進み方が見えるとき。
- 叩き台:
  - Anti-direction: 秘密情報をソースコード・設定ファイル・リポジトリに平文で直書きしない。秘密をログ・エラーメッセージに出さない。
  - Invariant: 秘密は専用の秘密管理（環境変数注入・シークレットマネージャ等）で集中管理し、保管・払い出し・監査・ローテーションを制御する。コードと秘密を分離する。
- 出典: OWASP Secrets Management Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html・取得 2026-06-26）
