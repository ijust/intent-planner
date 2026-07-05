# Constraint Starters — code / セキュリティ

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: コードのセキュリティ（OWASP 系）。これは特定の層に属さず**層をまたいで効く横断的な関心**であり、`領域: code` に属し、`適合する状況` でフロントエンド/API/バックエンドを問わずユーザー入力・認証・機密・通信の扱いが絡む案件に当てます。API 固有の境界の関心（レート制限・SSRF・マスアサインメント・過剰なデータ露出）は code / API・境界（`code-api.md`）にあります。

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

## id: sensitive-data-in-logs

- name: ログへの機微情報の出力防止
- 領域: code
- 適合する状況: 認証・決済・個人情報を扱う処理でアプリログや監査ログを出す案件全般（層をまたいで効く横断関心）。
- 叩き台:
  - Anti-direction: パスワード・トークン・鍵・カード情報・接続文字列などをそのままログに出さない。
  - Invariant: 認証情報・セッション値・アクセストークン・暗号鍵・決済/口座情報・DB 接続文字列はログに記録しない。記録が必要な機微値はマスク・ハッシュ・除去してから出す。
- 出典: OWASP Logging Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html・取得 2026-07-04）

## id: security-response-headers

- name: セキュリティレスポンスヘッダ・通信の保護
- 領域: code
- 適合する状況: ブラウザから利用される Web アプリ・API を HTTP で公開する案件全般（層をまたいで効く横断関心）。
- 叩き台:
  - Anti-direction: 平文 HTTP を許したり、防御用のレスポンスヘッダを省いたりしない。機微 Cookie を Secure/HttpOnly なしで発行しない。
  - Invariant: 全経路を HTTPS で提供し、`Strict-Transport-Security`（HSTS）を付与する。`Content-Security-Policy`・`X-Content-Type-Options: nosniff` 等の防御ヘッダを設定し、機微 Cookie には Secure・HttpOnly・SameSite を付ける。
- 出典: OWASP HTTP Security Response Headers Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html・取得 2026-07-04）／OWASP Transport Layer Security Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html・取得 2026-07-04）

## id: untrusted-deserialization

- name: 信頼できないデータのデシリアライズ禁止
- 領域: code
- 適合する状況: 外部由来のシリアライズ済みデータ（Cookie・リクエストボディ・キュー・キャッシュ・ファイル）をオブジェクトへ復元する案件。言語ネイティブの直列化機構（pickle・Java の Serializable・PHP の unserialize 等）を外部入力に使う進み方が見えるとき。
- 叩き台:
  - Anti-direction: ユーザーが制御できるバイト列を言語ネイティブのデシリアライザへそのまま渡さない（リモートコード実行に直結する）。
  - Invariant: 外部とやり取りするデータは JSON 等のデータ専用フォーマットで受け渡す。ネイティブ直列化を使わざるを得ないときは、復元できる型を許可リストで制限し、復元の前に完全性検証（署名）を行う。
- 出典: OWASP Deserialization Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html・取得 2026-07-04）

## id: password-storage-hashing

- name: パスワード保存（専用の遅いハッシュで・平文/可逆/高速ハッシュ禁止）
- 領域: code
- 適合する状況: パスワード認証を自前で実装・保存する案件。平文保存・可逆な暗号化・MD5/SHA-256 等の高速ハッシュでの保存や、ソルトなしの自作方式が見えるとき。
- 叩き台:
  - Anti-direction: パスワードを平文・可逆暗号・汎用の高速ハッシュ（SHA-256 等）で保存しない。ハッシュ方式を自作しない。
  - Invariant: パスワードはパスワード保存専用の遅いハッシュ（第一候補 Argon2id、代替 scrypt、FIPS 要件下は PBKDF2、レガシー互換は bcrypt）で、出典の推奨パラメータ以上の強度で保存する。
- 出典: OWASP Password Storage Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html・取得 2026-07-04）

## id: file-upload-validation

- name: ファイルアップロード検証（型・保存先・ファイル名の無害化）
- 領域: code
- 適合する状況: ユーザーがファイルをアップロードできる機能を持つ案件。ユーザー提供のファイル名・Content-Type を信じてそのまま保存する進み方が見えるとき。
- 叩き台:
  - Anti-direction: ユーザー提供のファイル名・Content-Type を信頼しない。アップロードされたファイルを Web 公開ディレクトリ直下へそのまま置かない。
  - Invariant: 拡張子は業務に必要な型だけの許可リストで検証し、ファイルシグネチャ（マジックバイト）でも確認する。保存名はアプリ側で生成し直す（パストラバーサル・インジェクション防止）。保存先は Web ルート外か分離したストレージにし、サイズ上限を設ける。
- 出典: OWASP File Upload Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html・取得 2026-07-04）

## id: dependency-vulnerability-management

- name: 依存ライブラリの脆弱性管理（棚卸し・継続検知・対応の記録）
- 領域: code
- 適合する状況: サードパーティ依存（npm・PyPI・Maven 等）を持つ案件全般。依存を入れたまま更新されず、既知脆弱性を検知する仕組みが無い進み方が見えるとき。
- 叩き台:
  - Anti-direction: 依存を追加したきり放置しない。既知の脆弱性（CVE）が公表されても「動いているから」で対応判断を先送りし続けない。
  - Invariant: 使っている依存とバージョンを把握できる状態を保ち、既知脆弱性を継続的に検知する仕組み（依存監査ツール）を開発フローに組み込む。脆弱性が出たら、更新・回避策・リスク受容のいずれかを判断として記録する。
- 出典: OWASP Vulnerable Dependency Management Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html・取得 2026-07-04）
