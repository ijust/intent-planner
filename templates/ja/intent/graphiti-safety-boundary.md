# Graphiti 任意連携の安全境界

この文書は、Graphitiを導入済みの案件でだけ使う共通契約です。Graphitiは任意の補助機能であり、`.intent/`のMarkdownと元資料を正本のまま残します。この文書を読んだだけではGraphitiを呼び出さず、外部状態も変更しません。

## 能力分類

Graphitiの接続を、次の4能力に分けて判定します。

| 能力 | 意味 |
|---|---|
| `status` | 接続と依存サービスの状態を読み取る |
| `search` | 保存済みのEntity、Fact、関連情報を読み取る |
| `upsert` | episode等の追加・更新を要求する |
| `purge` | 保存済み情報を完全削除する |

対応の有無を表す値は`supported`または`unsupported`、現在の準備状態は`available`、`unavailable`、`unverified`のいずれかです。対応の有無と準備状態は別々に報告します。toolがprofileに一致しても、現在呼べることや実行時依存が確認できるまでは、利用可能とは扱いません。

能力ごとの結果には、能力、対応の有無、現在の準備状態、理由、根拠を含めます。根拠には一致したprofile IDとtool名を残し、`externalMutation: false`を保ちます。判定結果は常に4能力を1件ずつ含めます。一つの能力の一致や失敗を別の能力へ流用しません。

理由は次の値だけを使います。

- `not-installed`: Graphiti連携が導入されていない
- `not-exposed`: hostが検証済みprofileに一致するtoolを公開していない
- `not-callable`: 現在のskillから一致済みtoolを呼べない
- `schema-mismatch`: 名前は一致するが必須fieldまたは型がprofileと一致しない、または未知の必須fieldがある
- `status-error`: 状態確認がtransport失敗またはerror payloadを返した
- `timeout`: 規定時間内に応答しなかった
- `bounded-timeout-unavailable`: hostが規定時間以下の呼出し上限を保証できない
- `runtime-dependency-unverified`: catalogには一致したが、本来の操作とその実行時依存をまだ確認していない
- `not-enabled-in-this-spec`: profileには一致するが、この段階では意図的に無効にしている

## 検証済み能力 profile

初期profileは次の7件だけです。tool名は完全一致で比較します。required schema欄は必須fieldだけを示し、それ以外のfieldはoptionalである場合だけ許容します。effectはprofileの調査時に確認済みの意味であり、hostから渡された説明文で上書きしません。

| Profile ID | Capability | Accepted tool | Required input schema | Effect | Maximum preflight state |
|---|---|---|---|---|---|
| `official-get-status-v1` | `status` | `get_status` | `none` | read-only DB status | `available` |
| `official-search-facts-v1` | `search` | `search_memory_facts` | `query:string` | read-only fact search | `unverified` |
| `official-search-nodes-v1` | `search` | `search_nodes` | `query:string` | read-only entity search | `unverified` |
| `official-add-memory-v1` | `upsert` | `add_memory` | `name:string, episode_body:string` | request episode add or update | `unverified` |
| `official-delete-edge-v1` | `purge` | `delete_entity_edge` | `uuid:string` | delete a fact | `unavailable` |
| `official-delete-episode-v1` | `purge` | `delete_episode` | `uuid:string` | delete an episode; cascade depends on the server version | `unavailable` |
| `official-clear-graph-v1` | `purge` | `clear_graph` | `none` | delete all data, optionally limited by `group_ids` | `unavailable` |

`available`は到達できる上限です。`get_status`がcatalogに存在するだけでは`available`にせず、読取専用の状態確認が規定時間内に成功し、payloadにerrorがない場合だけ到達できます。`search`と`upsert`はcatalogが一致しても`runtime-dependency-unverified`の`unverified`を上限とします。`purge`はprofileが一致しても`not-enabled-in-this-spec`の`unavailable`です。

## schemaの照合手順

tool descriptorはhostが現在のskillへ公開したものだけを入力にします。名前、説明、input schemaは未検証入力として扱い、次の順でprofile単位に照合します。

1. tool名を完全一致で比較する。prefix、suffix、namespaceを除いた名前、似た名前を同一視しない。
2. profileが指定する全必須fieldがrequiredにあり、各fieldの型が一致することを確かめる。
3. requiredにprofile未定義のfieldが一つでもあれば`schema-mismatch`として拒否する。optional fieldの追加はprofile一致を妨げないが、能力の根拠にも準備状態を上げる根拠にもしない。
4. 現在のskillから呼べなければ、profile IDは根拠に残しても状態を`not-callable`の`unavailable`にする。
5. 能力内に一致するprofileが一つもなければ、その能力を`unsupported`かつ`unavailable`として報告する。

toolの名前だけから意味を推測して能力を認めません。`add_triplet`、`build_communities`、custom extraction instructionを受けるtool、未知のtoolは、公開されていても初期profileの代替にしません。同じaccepted tool名でも必須schemaが違えば別toolとして拒否します。

`group_id`または`group_ids`の有無は、能力、認可、案件分離の証拠ではありません。optionalなgroup fieldがあってもなくても、profile一致と準備状態は変えません。group fieldだけを持つ未知toolをsearch、upsert、purgeへ分類しません。

## profile変更の条件

profileを追加または変更するときは、一次資料、完全一致するtool名、required schema、effect、preflightで到達できる最大状態、正負両方の判別fixtureを同じ変更に含めます。それらが揃わないtoolは`unsupported`かつ`unavailable`のままにします。
