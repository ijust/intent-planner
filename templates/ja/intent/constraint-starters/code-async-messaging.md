# Constraint Starters — code / 分散・非同期メッセージング

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: データ更新とメッセージ送信が別の仕組みにまたがる処理、再送で同じメッセージが複数回届く処理、順不同で届き得る処理、送り手が受け手より速く仕事を作る処理。`領域: code` に属し、キュー、イベント、ストリーム、非同期ジョブを設計またはレビューする案件に当てます。
>
> **既存領域との棲み分け**: `idempotency-retry-safe` は主に同期要求の再試行、`immutable-event-correction` はイベントを正本にするデータモデル、State Machine と永続ワークフローエンジンは長時間処理の状態遷移、`remote-call-*` は遠隔呼び出しの失敗耐性を扱います。本領域は、メッセージを介した送信側と受信側の間で生じる二重書込み、重複、順不同、処理能力超過を扱います。

## id: atomic-state-change-and-message-intent

- name: 業務データの更新とメッセージの送信予定を一つの確定単位に記録する
- 領域: code
- 適合する状況: 一つの操作でデータベースの業務状態を更新し、その結果を別のキュー、イベント基盤、サービスへ通知する案件。片方だけ成功すると、内部状態と外部へ伝わった事実が食い違うとき。
- 叩き台:
  - Anti-direction: データ更新を確定した後に、失敗し得る外部送信を一度だけ試して終わらせない。外部送信を先に行い、その後のデータ更新失敗で存在しない変更を通知しない。二つの別システムへの書込みを、呼出し順だけで一つの原子的操作とみなさない。
  - Invariant: 業務データの変更と、送る内容・安定した識別子・必要な順序情報を持つ送信予定を、同じローカルトランザクションへ記録する。確定済みの送信予定を別の処理が外部へ送り、失敗時に再開できるよう送信状況を追跡する。この方式（transactional outbox）は再送による重複をなくさないため、受信側は重複を安全に扱う。データベースの変更ログから同じ確定記録を取得できる場合は、その方式も比較する。
- 出典: AWS Prescriptive Guidance, *Transactional outbox pattern*（業務データとoutboxを同じトランザクションへ記録、別処理で送信、重複時は受信側を冪等にする・https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html・取得 2026-08-05）

## id: duplicate-message-side-effect-once

- name: 同じメッセージが複数回届いても、業務上の副作用を一度に保つ
- 領域: code
- 適合する状況: タイムアウト、受信側の停止、確認応答の消失、再試行により、同じメッセージが再び届き得る案件。二重請求、在庫の二重減算、通知の多重送信等を防ぐ必要があるとき。
- 叩き台:
  - Anti-direction: 「通常は一度しか届かない」、再送を示す印、短時間のメモリ内キャッシュだけを根拠に、二回目の副作用を許さない。メッセージ基盤内の重複除去や送信側の exactly-once という名称が、外部APIや別データベースへの副作用まで覆うと仮定しない。
  - Invariant: 送り手がメッセージまたは業務操作に安定した識別子を付ける。受信側は、その識別子の処理済み記録と業務状態の変更を、可能なら同じ確定単位で行い、既処理なら副作用を繰り返さない。完了確認は必要な副作用が永続的に確定した後に返す。副作用先と処理済み記録を同じ確定単位にできない場合は、下流にも同じ識別子を渡す、下流の冪等操作を使う、結果を照合して再開する等の失敗経路を明示する。
- 出典: AWS Well-Architected Framework, REL04-BP04 *Make mutating operations idempotent*（メッセージの識別子、重複の無視、下流への識別子伝播、記録と変更の一体化・https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html・取得 2026-08-05）／Azure Service Bus, *Prevent message loss and duplicate processing*（受信失敗による再送、受信側の冪等処理、送信側重複除去だけでは代替できない・https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-message-loss-and-duplicates・取得 2026-08-05）

## id: business-ordering-scope-and-version

- name: 順序が必要な業務単位を限定し、その単位の版で新旧を判定する
- 領域: code
- 適合する状況: 同じ対象への更新イベント、コマンド、集計材料が並列の送り手や複数の区画を通り、到着順が作成順と一致しない案件。一部の処理は並列化したいが、同じ注文、口座、文書等では順序違反が状態を壊すとき。
- 叩き台:
  - Anti-direction: システム全体の総順序を暗黙に要求しない。時刻だけを一意な順序とみなさず、異なる時計、同時刻、再送、遅着を無視しない。順序が不要な対象まで一列にして並列性と可用性を失わない。
  - Invariant: 順序違反が業務上問題になる対象を識別し、その対象を同じ順序単位へ割り当てる。対象ごとの連続番号、版、既知の前版等をメッセージへ持たせ、受信側が重複、古い版、欠番、遅着を区別して、拒否、保留、再取得、整合処理のいずれかへ進める。順序の保証範囲を対象・区画・送信者等で明記し、異なる対象は必要に応じて並列処理する。
- 出典: Apache Kafka, *Design*（順序と重複除去がpartitionやproducer等の範囲に依存すること、sequence numberを用いた重複除去・https://kafka.apache.org/41/design/design/・取得 2026-08-05）／Amazon SQS Developer Guide, *Amazon SQS queue types*（標準キューでは重複と順不同を扱い、順序が重要ならアプリケーション側の並べ替えまたは範囲付きFIFOを選ぶ・https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-types.html・取得 2026-08-05）

## id: bounded-inflight-and-queue-capacity

- name: 受け手の処理能力に合わせ、処理中件数と待ち行列を制限する
- 領域: code
- 適合する状況: 送り手が受け手より速く仕事を作れるキュー、ストリーム、非同期ジョブ。突発的な増加や受け手の低下時に、待ち件数、メモリ、処理待ち時間が際限なく増え得るとき。
- 叩き台:
  - Anti-direction: 上限のない待ち行列を負荷吸収策にしない。監視だけ置いて、処理能力を超えた仕事を同じ速度で受け続けない。上限到達時の動作を決めず、隠れたバッファ間で仕事を移すだけにしない。すべての案件へ同じ件数や速度を固定しない。
  - Invariant: 送信待ち、基盤内、受信済み未完了等の各段階で、処理中件数、待ち行列、滞留時間に案件固有の上限を置く。受け手が受入可能量を通知できる方式では、その量を超えて送らない流量制御（backpressure）を使う。上限へ達したら、重要度と回復可能性に応じて送信停止、受付拒否、低優先度の破棄、別系統への退避のいずれかを明示し、送り手へ結果を返す。待ち件数だけでなく最古の滞留時間、処理率、失敗率、上限到達を観測し、上限値は実測した容量と許容待ち時間から決める。
- 出典: Reactive Streams（非同期ストリームで受信側が需要を伝える非同期・非ブロッキングなflow control・https://www.reactive-streams.org/・取得 2026-08-05）／RabbitMQ, *Consumer Acknowledgements and Publisher Confirms*（未確認配送の窓をprefetchで制限し、受信側の無制限buffer増加を防ぐ・https://www.rabbitmq.com/docs/next/confirms・取得 2026-08-05）／RabbitMQ, *Quorum Queues and Flow Control — The Concepts*（credit、confirm、acknowledgement、prefetchによる流入量と処理中件数の制御・https://www.rabbitmq.com/blog/2020/05/04/quorum-queues-and-flow-control-the-concepts・取得 2026-08-05）
