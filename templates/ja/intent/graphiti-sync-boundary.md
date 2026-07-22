# Graphiti 文書同期の境界

この文書は、`intent-graphiti-sync` の同期（sync）操作だけが使う契約です。共通契約 `graphiti-safety-boundary.md` の骨格「外部送信前の拒否境界」を、狭める方向にだけ具体化します。骨格・能力分類・操作別許可・statusの上限はここで再定義しません。preflightはこの契約を読み込まず、この契約の検査を実行しません。

この契約が確定するのは、同期と明示的完全削除が実際に使う規則だけです。`search`の上限値・検査手順は、この契約で確定しません（工程別検索specが確定します）。

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

- 範囲規則から導出できない未知の対象種別は、読む・接続する前に拒否します。
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

同期と明示的完全削除が行う外部呼出しは、hostまたはMCP clientが次の値以下の上限とretry 0回を呼出し前に保証できなければ実行しません。表の値ちょうどは許可し、1ミリ秒でも長い上限しか選べない場合や上限を強制できない場合は、`bounded-timeout-unavailable`としてその対象だけを失敗にします。短い上限は許可します。自動retryは行いません。

| Call kind | maxElapsedMs | retryCount |
|---|---:|---:|
| `upsert` | 30000 | 0 |
| `web-fetch` | 20000 | 0 |
| `purge` | 15000 | 0 |

`web-fetch`の上限にはDNS解決とredirectの確認を含めます。`status`の上限は共通契約が定めます。`search`の上限はこの契約で確定しません。

## Episodeの内容識別

同期はGraphitiへ渡すEpisodeを次の識別で扱い、元資料と位置へ戻れる出典を保ちます。

| Identity field | Meaning |
|---|---|
| `project` | 同期元のプロジェクト識別 |
| `group` | 対象group（namespaceの手掛かり。認可境界にしない） |
| `source` | 元パスまたはURL |
| `contentId` | 抽出本文から決定的に導出する内容識別 |

- 同一の識別（`project`・`group`・`source`・`contentId`がすべて一致）を持つ対象は再送信しません。
- 差分同期では、内容が変わった対象（`contentId`の変化）と前回失敗した対象だけを処理します。
- 部分失敗後の再実行は失敗分だけを対象にし、成功済みを再投入しません。

## groupの構成と履歴

Episodeの`group`は、プロジェクト・知識種別・作業系統の3要素で構成します。異なる系統・種別を同じgroupへ混ぜず、group間の暗黙統合をしません。

| Group element | Meaning |
|---|---|
| `project` | プロジェクト識別 |
| `kind` | 知識種別。`domain`（ドメイン知識）または`intent`（Intent・作業文書） |
| `stream` | 作業系統。既定branchまたはbranch・worktree名 |

- 知識種別で履歴方針を分けます。`domain`は旧版を消さず、現在・過去・変更時期・出典を区別して残します（時系列）。`intent`はGraphiti上では最新版だけを扱い、過去版の確認はMarkdown・Git・Archiveへ案内します。
- 検索側は`kind`の片方または両方を明示して選べます。
- 異なるbranch・worktreeで同期した同名資料は別`stream`として識別し、同じ時間変化として混ぜません。既定branchへの統合はGit側で行い、統合後の反映は明示的な再同期だけで行います。
- 完了した作業単位は完了の事実だけを残し、Archive全文を重ねて同期しません。

## 結果の分類

同期の結果は対象ごとに次の3分類で示します。部分失敗を全体成功として表示しません。

| Outcome | Meaning |
|---|---|
| `success` | 抽出・検査・送信がすべて完了し、内容識別を記録した |
| `skipped` | 対象外（除外一致・許可外・抽出手段なしの理由付き読み飛ばし・同一内容） |
| `failed` | 抽出失敗・送信失敗・時間切れ（次回の再実行対象） |

- `skipped`と`failed`には対象と理由を添えます。秘密の値・本文は含めません。
- 1件でも`failed`があれば、全体を成功と表示しません。

## 状態記録

同期の状態記録は、確認済み範囲・成功分の内容識別・記録日だけを持つ利用者ローカルの派生記録です。

| Record field | Meaning |
|---|---|
| `confirmedScope` | 一括確認で承認された範囲規則の要約 |
| `entries` | `success`対象ごとの`group`・`source`・`contentId` |
| `recordedAt` | 記録日時 |
| `gitContext` | 同期時点のbranchまたはworktreeとcommit識別 |

- 置き場は`.intent/graphiti-sync/local/`配下とし、git非追跡を前提にします（installerが除外を配置します）。
- 本文・抽出結果・秘密の値を保存しません。記録は正本（`.intent/`のMarkdownと元資料）を変更しません。
- 記録が無い・壊れている場合は初回扱いとし、一括確認からやり直します（記録を同期の実行条件にしません）。

## 古さの表示

- 状態記録の`gitContext`と現在のGit識別（branchまたはworktreeとcommit）を比較し、正本が同期後に更新されている可能性があるときは、検索・実行時に「古い可能性」を表示します。
- 比較と表示は読み取りだけで行い、同期・削除を自動起動しません。Git pull・checkout・merge・commit・ファイル変更をきっかけに同期しません。
- 古さの表示は正本（GitとMarkdown）を優先する合図であり、Graphitiの結果だけで現在の状態を確定しません。

## チーム運用

- 標準構成は各開発者のローカルGraphitiです。同期方針（範囲規則・group構成）と正本IntentはGitで共有し、同期方針に秘密・接続情報を含めません。
- 共有Graphitiを運用する場合は、単一の書き手（同期担当者またはCI）だけが同期し、他の利用者は検索専用とします。検索専用利用者の同期・削除の要求は実行しません（実行時の強制は案件側のserver/network設定が担います）。
- 複数人の同時書き込み・競合解決は本契約の範囲外です（単一書き手の範囲だけを定めます）。

## 明示的完全削除

完全削除（purge）は、検索・同期と別の明示操作です。誤投入・機密の除去だけを目的とし、履歴の整理や失敗の回復には使いません。

- 手順は「列挙→明示確認→実行」の3段です。まず削除対象・group・件数・影響を列挙して提示し、利用者の明示確認を得た後だけ、共有契約の操作別許可（`purge`操作）の範囲で実行します。
- 対象が0件、groupが列挙と一致しない、または実行対象が列挙と食い違う要求は、実行前に拒否します。
- 削除を自動実行せず、同期失敗・時間切れの回復手段として使いません。
- 結果は`success`・`skipped`・`failed`の3分類で対象ごとに示し、確認・報告に本文・秘密値を含めません。
