# Constraint Starters — code / VCS（バージョン管理）衛生

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: Git（バージョン管理）操作・履歴の衛生。`領域: code`（開発プロセス側）に属し、`適合する状況` で「Git を使う案件全般」「公開リポジトリ化・ミラーする案件」に当てます。
>
> **`code-security.md` の `secrets-no-hardcode` との棲み分け**: `secrets-no-hardcode` は「**書く前の予防**」（秘密をコード・設定に直書きしない・コードと秘密を分離する）を扱います。本領域は「**Git 操作・履歴という別経路**」（誤コミットした秘密が履歴に残る・コミットメッセージに機密を書く・公開ミラーで履歴ごと流出する）を扱います。直書き予防は `secrets-no-hardcode`、Git 履歴・メッセージ・公開経路はこちら、と射程が分かれます（両方が候補に出る案件もあります）。

## id: git-secret-history-removal

- name: 誤コミットした秘密は履歴除去とローテーションで対処する（削除コミットだけでは残る）
- 領域: code
- 適合する状況: API キー・トークン・パスワード・接続文字列などの秘密を誤ってコミットしてしまった案件。「秘密を含むファイルを消す新しいコミットを足せば消える」と考えている進み方が見えるとき。Git を使う案件全般で、秘密が履歴に入った可能性があるとき。
- 叩き台:
  - Anti-direction: 秘密を削除する新しいコミットを足しただけで「消えた」と扱わない（過去のコミット・フォーク・クローン・ホスティング側のキャッシュに残る）。履歴を書き換えずに済ませようとして、漏れた秘密をそのまま有効なまま放置しない。
  - Invariant: 秘密が履歴に入ったら、まず**その秘密を失効・ローテーション**する（漏れた時点で compromised＝もう信用できない）。そのうえで必要なら履歴除去ツール（`git filter-repo` 等）で履歴から消し、フォーク・他クローン・ホスティング側キャッシュにも残る前提で関係者と協調する。履歴書き換えはコミットハッシュを変え副作用が大きいので、ローテーションだけで足りる場合はそれを優先する。
- 出典: GitHub Docs「Removing sensitive data from a repository」（https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository・取得 2026-06-28）／OWASP DevSecOps Guideline「Secrets Management」（https://owasp.org/www-project-devsecops-guideline/latest/01a-Secrets-Management・取得 2026-06-28）

## id: git-commit-message-no-secrets

- name: コミットメッセージ・履歴に機密を書かない
- 領域: code
- 適合する状況: コミットメッセージ・PR 本文・タグ注釈に、内部 URL・顧客名・障害の生々しい詳細・暫定パスワード・チケットの機密情報などを書こうとする進み方が見えるとき。後で公開・OSS 化する可能性があるリポジトリの案件。
- 叩き台:
  - Anti-direction: コミットメッセージや PR 本文を「内部だけが読む」前提で書き、内部 URL・顧客名・暫定資格情報・障害の詳細を残さない。本体コードだけ気をつけてメッセージ・履歴のテキストを無防備にしない。
  - Invariant: コミットメッセージ・PR・タグの本文も履歴の一部として機密を持ち込まない（公開すれば履歴ごと外部に出る・後から削除しても履歴・キャッシュに残りうる）。機密を指す必要があるときは識別子（チケット番号等）に留め、本文に機密そのものを書かない。
- 出典: OWASP DevSecOps Guideline「Secrets Management」（コミット・履歴に機密が残ること／公開後も検索されうること・https://owasp.org/www-project-devsecops-guideline/latest/01a-Secrets-Management・取得 2026-06-28）

## id: git-prevent-secret-commit

- name: 機密のコミットを入口で塞ぐ（.gitignore・コミット前検知）
- 領域: code
- 適合する状況: `.env`・鍵ファイル・証明書・認証情報を含む設定など、機密を含みうるファイルを扱う案件。秘密が履歴に入ってから消すより前に、入口で塞ぎたいとき。Git を使う案件全般。
- 叩き台:
  - Anti-direction: 機密ファイルを `.gitignore` で塞がないまま作業を進めて誤コミットを誘発しない。「入ってから消せばいい」と事後対応に頼らない（履歴に入ると除去コストが跳ねる）。
  - Invariant: 機密を含みうるファイルのパターン（`.env`・`*.pem`・鍵・認証情報ファイル等）を**先に `.gitignore` で塞ぐ**。理想は秘密がリポジトリに入る前に止めること（コミット前検知＝pre-commit hook やシークレットスキャナでコミット前に検出する）。入口での予防を、履歴に入ってからの除去（`git-secret-history-removal`）より優先する。
- 出典: OWASP DevSecOps Guideline「Secrets Management」（pre-commit hook で code base への混入を防ぐ・https://owasp.org/www-project-devsecops-guideline/latest/01a-Secrets-Management・取得 2026-06-28）／シークレットスキャナの例＝gitleaks（git リポジトリの秘密検知ツール・https://github.com/gitleaks/gitleaks・取得 2026-06-28・2026-06 時点で feature-complete〔security patch のみ〕で作者は後継 Betterleaks へ移行中。ツール名でなく「コミット前検知を入れる」原則を採る）

## id: git-history-audit-before-public

- name: 公開リポジトリ化・ミラー前に履歴を監査する
- 領域: code
- 適合する状況: これまで非公開だったリポジトリを公開（OSS 化・公開ミラー作成）しようとする案件。現在のコードだけでなく過去の全履歴が一度に外部へ出る局面。
- 叩き台:
  - Anti-direction: 「今のコードに機密が無いから公開して大丈夫」と現在のスナップショットだけ見て公開しない（過去の履歴に誤コミットした機密が残っていれば、公開した瞬間に履歴ごと外部に出る）。公開後に気づいて削除しても、フォーク・キャッシュに残る前提を忘れない。
  - Invariant: 公開・ミラー化の前に、**全履歴**を機密の観点で監査する（履歴全体をスキャンし、過去のコミットに残る秘密・機密メッセージを洗い出す）。見つかったら公開前に履歴除去とローテーション（`git-secret-history-removal`）を済ませる。公開は不可逆（一度出た履歴は取り戻せない）前提で、公開前を最後の関門にする。
- 出典: GitHub Docs「Removing sensitive data from a repository」（フォーク・クローン・キャッシュに残る・公開後の除去の限界・https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository・取得 2026-06-28）
