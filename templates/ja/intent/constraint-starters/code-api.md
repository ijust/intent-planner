# Constraint Starters — code / API・境界

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: API を外部へ公開・設計するときの境界の関心（受け取る入力の検証・乱用の抑制・束縛の制御・返すデータの絞り込み）。`領域: code` に属します。層をまたぐセキュリティ（SQLi・XSS・CSRF・認可・シークレット・防御ヘッダ・機微ログ）は code / セキュリティ（`code-security.md`）に集約しています。

## id: input-validation-fail-fast

- name: 入力バリデーション（境界で早期に・Fail-Fast）
- 領域: code
- 適合する状況: 外部（Web クライアント・他システム連携・取引先フィード等）から受け取ったデータを処理・永続化する案件。信頼できない入力がそのまま下流へ流れる進み方が見えるとき。
- 叩き台:
  - Anti-direction: 入力を検証せずに下流（DB・他コンポーネント）へ流さない。バリデーションを処理の奥に散らさない。
  - Invariant: 信頼できないすべての入力元に対し、データフローのできるだけ早い段階（外部から受け取った直後）で「正しく形成されたデータだけ」を通す検証を行う。期待外・空入力時の返却契約（Fail-Fast）を定める。なお入力検証は XSS/SQLi 等の主防御の代わりにはしない（各対策と併走する補助）。
- 出典: OWASP Input Validation Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html・取得 2026-06-26）

## id: api-rate-limiting

- name: レート制限・スロットリング（公開エンドポイント）
- 領域: code
- 適合する状況: 認証前でも叩ける公開 API・ログインやパスワードリセット等の乱用されやすいエンドポイント・重い処理を持つエンドポイントを外部公開する案件。
- 叩き台:
  - Anti-direction: 公開エンドポイントを回数・帯域の上限なしに受け付け、総当たり（brute force）や資源枯渇を許さない。
  - Invariant: クライアントや API キー単位でリクエストのレート上限を定め、超過は拒否する。認証・パスワードリセット等の乱用されやすい経路とコストの高い処理には特に上限を設ける。
- 出典: OWASP Denial of Service Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html・取得 2026-07-04）

## id: ssrf-prevention

- name: SSRF 対策（外向きリクエストの検証・許可リスト）
- 領域: code
- 適合する状況: 利用者が指定した URL やホストをサーバ側が取得しに行く案件（Webhook・画像取り込み・URL プレビュー・外部 API 中継など）。
- 叩き台:
  - Anti-direction: 利用者が渡した URL 全体をそのままサーバから取得しに行かない。ブロックリスト頼みで内部宛先を弾こうとしない。
  - Invariant: 到達先は許可リスト（allow-list）で限定する。URL 全体を受け取らず、ホスト名や IP を個別に検証する。内部・クラウドメタデータ・ループバックの宛先を遮断し、リダイレクトの追従を無効化する。
- 出典: OWASP Server Side Request Forgery Prevention Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html・取得 2026-07-04）

## id: mass-assignment

- name: マスアサインメント対策（束縛可能フィールドの許可リスト）
- 領域: code
- 適合する状況: リクエストボディをそのままモデルやエンティティに束縛（バインド）してデータを更新する案件（多くの Web フレームワークの標準的な作り）。
- 叩き台:
  - Anti-direction: リクエストボディをモデルへ丸ごと束縛しない。ユーザーが送れば `isAdmin` 等の権限・内部フィールドまで書き換わる作りにしない。
  - Invariant: 束縛してよい非機微フィールドを許可リストで明示する。あるいは編集可能フィールドだけを持つ DTO を介して受け取り、機微・内部フィールドは束縛対象から外す。
- 出典: OWASP Mass Assignment Cheat Sheet（https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html・取得 2026-07-04）

## id: excessive-data-exposure

- name: API レスポンスの過剰なデータ露出防止
- 領域: code
- 適合する状況: オブジェクトを JSON 等で返す API 全般。特に機微情報や PII を含むリソースを返す案件、モデルを丸ごとシリアライズして返しがちな案件。
- 叩き台:
  - Anti-direction: オブジェクトを丸ごとシリアライズして返し、機微フィールドの絞り込みをクライアント側の表示制御に頼らない。
  - Invariant: レスポンスは必要なフィールドだけを明示的に選んで返す（`to_json()` 等の一括シリアライズに任せない）。機微情報・PII は返却前に洗い出し、クライアント側フィルタに依存しない。
- 出典: OWASP API Security Top 10 — API3:2019 Excessive Data Exposure（https://owasp.org/API-Security/editions/2019/en/0xa3-excessive-data-exposure/・取得 2026-07-04）
