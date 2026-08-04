# Constraint Starters — code / リリース・構成・復旧

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: 構成を有効にする前の検証、変更の影響範囲を段階的に広げる判断、配布中に共存する新旧版の互換と戻し、バックアップからの復元確認。`領域: code` に属し、アプリケーションや構成のリリース、rolling update、バックアップ・復旧を設計またはレビューする案件に当てます。
>
> **既存領域との棲み分け**: `input-validation-boundary` は外部入力の信頼境界、`backward-compatible-migration` はDBスキーマの拡張・移送・縮小、`remote-call-*` は稼働中の遠隔障害への耐性を扱います。本領域は、構成をいつ有効にしてよいか、変更をどこまで公開してよいか、配布中の版が共存して前進・後退できるか、保存した状態から実際に復旧できるかを扱います。

## id: configuration-semantic-validation-before-activation

- name: 構成を有効にする前に、対象環境での意味を検証する
- 領域: code
- 適合する状況: 構成ファイル、環境変数、管理画面、API等から与えた設定が、サービスの起動・再読込・配布時に有効になる案件。構文は正しくても、参照先、単位、値の組合せ、利用可能資源との不整合で障害になり得るとき。
- 叩き台:
  - Anti-direction: 構文解析に成功しただけで安全な構成とみなさない。存在しない参照、範囲外の値、単位違い、矛盾する組合せ、対象版で未対応の項目を、適用後の障害で初めて発見しない。検証できない外部の可変資源へ暗黙に依存させ、同じ構成へ確実に戻れない状態を作らない。
  - Invariant: 構成を有効化する前に、型・必須値に加えて、参照の解決、値域と単位、相互制約、対象ソフトウェア版、対象環境の資源前提を可能な範囲で意味検証する。失敗時は以前の有効な構成を保ち、どの項目と条件が不正かを利用者へ返す。構成と適用結果を版と所有者へ追跡でき、戻す対象が外部変化で別物にならないよう依存を明示する。
- 出典: Google SRE Workbook, *Configuration Design and Best Practices*（Semantic validation、Ownership and Change Tracking、段階適用とhermeticなrollback・https://sre.google/workbook/configuration-design/・取得 2026-08-05）

## id: progressive-delivery-observe-before-expansion

- name: 変更を限定範囲へ公開し、観測してから影響範囲を広げる
- 領域: code
- 適合する状況: コード、構成、データ等の変更を一度に全利用者・全実行先へ反映すると、検査環境で見えない欠陥の影響が広がる案件。配布対象を分け、旧版または対照と比較できるとき。
- 叩き台:
  - Anti-direction: 「段階配布」という名前だけ付け、変更を受ける範囲、良否を判断する観測、続行・停止・復旧条件を決めない。全体指標に埋もれた新しい版の失敗を見逃したり、変更と無関係な信号で自動判断したりしない。共通の公開比率、観測時間、指標をすべての案件へ固定しない。
  - Invariant: 変更を限定した利用者、トラフィック、実行先、地域等へ先に公開し、変更を受けない対照または既知の基準と比較する。利用者影響とシステム健全性を表し、当該変更へ帰属できる信号を、続行・一時停止・rollback・安全なroll-forwardの判断へ結ぶ。公開単位、観測期間、閾値、復旧経路は案件の危険、負荷、誤検知、事業上の許容から決め、代表性を確認してから範囲を広げる。
- 出典: Google SRE Workbook, *Canarying Releases*（部分配布、良否評価、リリース工程への結合、代表的で変更へ帰属できる信号・https://sre.google/workbook/canarying-releases/・取得 2026-08-05）／Google SRE Workbook, *Configuration Design and Best Practices*（構成の全面同時適用を避け、段階適用中に中止可能にする・https://sre.google/workbook/configuration-design/・取得 2026-08-05）

## id: version-skew-upgrade-downgrade-safety

- name: 新旧版の共存と、実際の順序での前進・後退を検証する
- 領域: code
- 適合する状況: rolling update、段階配布、複数サービスの独立配布により、異なる版が同時に通信し、メッセージ、直列化データ、ファイル、キャッシュ、共有状態を読み書きする案件。各版は単体で正常でも、配布途中やrollbackで壊れ得るとき。
- 叩き台:
  - Anti-direction: 新版が旧版の出力を読める片方向の確認だけで互換とみなさない。新版が旧版の読めない状態を書いた後に、旧バイナリへ戻すだけで復旧できると仮定しない。単一プロセスを一括更新する検査だけで、新旧版が共存する本番のrolling updateを代用しない。
  - Invariant: 配布中に同時稼働し得る版の組合せについて、RPC・イベント・直列化形式・共有する永続状態を双方が扱える互換期間を設ける。代表的な複数実行先で、本番相当の配布構成と順序を用い、新旧共存、全体のupgrade、実際の順序によるdowngradeまたはrollbackを検証する。前進・後退のどちらかが安全でない変更は、一度に有効化せず、それぞれが安全な複数変更へ分け、古い契約の除去は利用側の移行確認後に行う。
- 出典: AWS Builders' Library, *Ensuring rollback safety during deployments*（rolling deployment中のversion skew、プロトコル・永続状態の互換、実配布構成でのupgrade/downgrade検査、安全な複数変更への分割・https://aws.amazon.com/builders-library/ensuring-rollback-safety-during-deployments/・取得 2026-08-05）

## id: backup-restore-data-function-verification

- name: バックアップを実際に復元し、データと主要機能を検証する
- 領域: code
- 適合する状況: データ、構成、システム状態をバックアップし、損失や破損の際にそこから業務を再開する案件。バックアップ処理の成功は監視しているが、復元後の完全性・新しさ・利用可能性を確かめていないとき。
- 叩き台:
  - Anti-direction: バックアップファイルが存在する、複製が動いている、ジョブが成功したという事実だけで復旧可能とみなさない。復元手順を障害時に初めて実行したり、データを開けただけで主要業務が再開できると宣言したりしない。全案件へ共通の復元周期、RTO、RPOを置かない。
  - Invariant: 損失時に必要な状態について代表的なバックアップと依存物から隔離された場所へ復元を実行し、復元前の資産の完全性、復元後のデータの完全性と利用可能な時点、主要な読書き・業務機能を確認する。役割、手順、必要資源、失敗時の連絡と改善を残し、実測した復元時間とデータ損失を、業務影響から案件ごとに定めた許容停止時間と許容損失へ照らす。再生成可能で失っても影響のない一時データは同じ強さで扱わない。
- 出典: NIST SP 800-34 Rev.1, *Contingency Planning Guide for Federal Information Systems*（業務影響に基づくRTO/RPO、バックアップからの復元手順、復元後のデータと機能の検証・https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-34r1.pdf・取得 2026-08-05）／NIST Cybersecurity Framework 2.0 Core RC.RP-03 / RC.RP-05（復元前のバックアップ等と復元後の資産の完全性、正常運用の確認・https://www.nist.gov/system/files/documents/2024/03/25/The_NIST_CSF_2-0_Core_With_Withdrawn_CSF_1-1_Elements.pdf・取得 2026-08-05）
