# Graphiti 文書同期の境界

この文書は、`intent-graphiti-sync` の同期（sync）操作だけが使う契約です。共通契約 `graphiti-safety-boundary.md` の骨格「外部送信前の拒否境界」を、狭める方向にだけ具体化します。骨格・能力分類・操作別許可・statusの上限はここで再定義しません。preflightはこの契約を読み込まず、この契約の検査を実行しません。

この契約が確定するのは、同期が実際に使う規則だけです。`purge`と`search`の上限値・検査手順は、この契約で確定しません（それぞれ後続の履歴・チーム同期specと工程別検索specが確定します）。

## 範囲規則

同期対象は、利用者が明示した範囲規則から選びます。文書1件ずつの列挙を要求しません。

| Rule field | Meaning |
|---|---|
| `allowedDirectories` | 同期候補にするローカルディレクトリ（配下を再帰対象にする） |
| `allowedExtensions` | 同期候補にする拡張子の一覧 |
| `allowedUrlPrefixes` | 同期候補にする登録URLまたはURL接頭辞（HTTP(S)のみ） |
| `userExclusions` | 利用者が追加する除外ディレクトリ・拡張子・URL |

- 除外規則は許可規則より常に優先します。除外と許可の両方に一致する対象は除外します。
- 許可範囲の外にある対象は、読み取りも送信もせず同期候補にしません。
- 範囲規則の自己申告（呼出し側が組み立てた「許可済み」判定）は採用しません。guard自身が評価します。

## 常時除外

次の対象は、利用者の許可範囲や拡張子に一致しても解除できず、読む前に除外します。dependency directoryは`node_modules`等、build directoryは`dist`・`build`等、cache directoryは`.cache`等の案件で定義した同種のdirectoryを含みます。この一覧は下限であり、後続specは狭めずに追加できます。

| Hard exclusion | Decision |
|---|---|
| `.git/**` | `deny-before-read` |
| `dependency-directory` | `deny-before-read` |
| `build-directory` | `deny-before-read` |
| `cache-directory` | `deny-before-read` |
| `.env` | `deny-before-read` |
| `.env.*` | `deny-before-read` |
| `*.pem` | `deny-before-read` |
| `*.key` | `deny-before-read` |
| `*.crt` | `deny-before-read` |
| `*.cer` | `deny-before-read` |
| `*.p12` | `deny-before-read` |
| `*.pfx` | `deny-before-read` |
| `id_rsa*` | `deny-before-read` |
| `id_ed25519*` | `deny-before-read` |

## locator検査手順

同期がローカルファイルを読む前、またはWebへ接続する前に、guard自身がread-onlyで次の順に検査します。呼出し側の`allowed`・`public`・`verifiedBy`等の自己申告と、判定済みの値の再利用は採用しません。大小文字差・separator差・symlinkで常時除外や許可範囲を迂回できません。

| Phase | Guard-owned check | Timing |
|---|---|---|
| `1-normalize` | `case,path-separator,symlink-real-path` | `before-read-or-connect` |
| `2-hard-exclusion` | `resolved-identifier` | `before-read-or-connect` |
| `3-allow-scope` | `resolved-identifier` | `after-hard-exclusion` |
| `4-http-scheme` | `http-or-https` | `before-dns-or-connect` |
| `5-dns-all-addresses` | `every-resolved-address` | `before-connect` |
| `6-pre-connect-dns-recheck` | `every-resolved-address` | `immediately-before-connect` |
| `7-every-redirect` | `prefix,scheme,dns-all-addresses,pre-connect-dns-recheck` | `before-following-redirect` |

- Web取得はHTTP(S)の許可接頭辞内だけを候補にします。DNSが返したすべてのaddressを評価し、`localhost`・loopback・private・link-local・unique-local・multicast・reserved・metadataへ到達し得る接続を、IPv4/IPv6の両方で外部接続前に拒否します。
- redirectは自動的に信用せず、各転送先について許可接頭辞・scheme・全addressを再検査してから追います。転送後に許可範囲の外へ出る接続は拒否します。
- 拒否は対象単位で行い、他の対象の処理を止めません。拒否報告にURLのcredential・query等の生値を含めません。

## 秘密検出

locator検査を通過して読み取り・取得した内容は、出所にかかわらず未検証として扱い、Graphitiへ渡す前にguard自身が秘密を検査します。textとして完全に検査できない内容は安全と推測しません。秘密の値は検査中だけ保持し、判定結果・報告・記録へ写しません。

| Secret kind | Decision |
|---|---|
| `private-key` | `deny-before-Graphiti-call` |
| `credential` | `deny-before-Graphiti-call` |
| `token` | `deny-before-Graphiti-call` |
| `api-key` | `deny-before-Graphiti-call` |
| `password` | `deny-before-Graphiti-call` |
| `certificate` | `deny-before-Graphiti-call` |
| `environment-variable-secret` | `deny-before-Graphiti-call` |
| `uninspectable-content` | `deny-or-out-of-scope` |

## 同期呼出しの上限

同期が行う外部呼出しは、hostまたはMCP clientが次の値以下の上限とretry 0回を呼出し前に保証できなければ実行しません。表の値ちょうどは許可し、1ミリ秒でも長い上限しか選べない場合や上限を強制できない場合は、`bounded-timeout-unavailable`としてその対象だけを失敗にします。短い上限は許可します。自動retryは行いません。

| Call kind | maxElapsedMs | retryCount |
|---|---:|---:|
| `upsert` | 30000 | 0 |
| `web-fetch` | 20000 | 0 |

`web-fetch`の上限にはDNS解決とredirectの確認を含めます。`status`の上限は共通契約が定めます。`purge`・`search`の上限はこの契約で確定しません。
