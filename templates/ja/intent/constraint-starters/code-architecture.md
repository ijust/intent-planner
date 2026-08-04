# Constraint Starters — code / アーキテクチャ品質

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: 技術層をまたぐ重要品質の具体化、変更を閉じる境界、長く残る構造判断の理由、意図した依存境界と実装の適合。`領域: code` に属し、複数モジュールにまたがる構造や品質間の選択を設計・レビューする案件に当てます。
>
> **既存領域との棲み分け**: API検証、DB移行、障害耐性、セキュリティ等の具体的な実装策は各技術領域が担います。`specification-partitions-boundaries-oracle` 等のテスト定石は挙動の正誤判定を担います。本領域は、どの品質を構造で支えるか、変更をどこへ閉じるか、なぜその構造を選んだか、どのモジュール依存を守るかを扱います。

## id: quality-attribute-scenario-measurable-response

- name: 重要な品質要求を、状況と測定可能な応答を持つシナリオにする
- 領域: code
- 適合する状況: 性能、可用性、セキュリティ、変更容易性、相互運用性等が設計を左右する案件。「高速」「堅牢」「保守しやすい」のような品質名だけが要求に書かれているとき。
- 叩き台:
  - Anti-direction: 品質属性の名称だけを掲げ、いつ、誰または何が、どの部分へ、何を起こし、どう応答すれば達成なのかを未定のまま構造を選ばない。関係しない全品質属性へ数値を置いたり、案件の許容範囲を共通閾値で代用したりしない。
  - Invariant: 設計を左右する品質要求ごとに、刺激の発生元、刺激、対象、環境、期待する応答、応答の測定方法を具体化し、事業・利用上の目的へ結び付ける。採った構造がそのシナリオをどう支えるかを分析し、競合する品質への影響と、プロトタイプ・シミュレーション・テスト等の確認方法を残す。
- 出典: Carnegie Mellon University Software Engineering Institute, *Quality Attribute Workshops (QAWs), Third Edition*, CMU/SEI-2003-TR-016（六要素によるシナリオ詳細化・https://www.sei.cmu.edu/library/quality-attribute-workshops-qaws-third-edition/・取得 2026-08-05）／SEI, Architecture Tradeoff Analysis Method Collection（品質シナリオ、リスク、感応点、トレードオフ点・https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/・取得 2026-08-05）

## id: information-hiding-around-likely-change

- name: 変わりやすい設計判断を情報隠蔽の境界へ閉じる
- 領域: code
- 適合する状況: 外部仕様、データ表現、アルゴリズム、装置・サービス依存、業務規則等に変更可能性があり、その変更を多数の利用側へ波及させたくない案件。モジュールが処理手順や画面単位だけで分割され、内部表現が広く露出しているとき。
- 叩き台:
  - Anti-direction: ファイルやクラスを小さく分けただけで変更容易になったとみなさない。変わりやすい内部表現や外部製品の詳細を公開インターフェースへ漏らし、同じ設計判断を複数モジュールに重複させない。将来のあらゆる変更を予想して抽象層を増やさない。
  - Invariant: 変更されそうで影響が大きい設計判断を特定し、その知識を所有する境界へ閉じる。利用側には必要最小限の安定した契約だけを公開し、実装詳細の変更が契約を守る利用側へ波及しないようにする。境界の妥当性は、想定した変更シナリオで実際に変更箇所が局所化されるかで確かめる。
- 出典: D. L. Parnas, “On the Criteria To Be Used in Decomposing Systems into Modules,” *Communications of the ACM* 15(12), 1972, DOI 10.1145/361598.361623（設計判断の情報隠蔽による分割・https://doi.org/10.1145/361598.361623・取得 2026-08-05）／IEEE Computer Society, *SWEBOK Guide V4.0a*, Software Design（モジュール化、カプセル化、インターフェースと実装の分離・https://ieeecs-media.computer.org/media/education/swebok/swebok-v4.pdf・取得 2026-08-05）

## id: architecture-decision-rationale-tradeoffs

- name: 重要な構造判断に、関心・代替案・理由・トレードオフ・結果を残す
- 領域: code
- 適合する状況: 公開インターフェース、永続形式、配置境界、サービス分割、主要依存等、後から覆す費用が大きい判断。複数の品質要求が競合する、または将来の担当者が結論だけでは判断を再評価できない案件。
- 叩き台:
  - Anti-direction: 採った案だけを「ベストプラクティス」として残し、解こうとした関心、採らなかった案、品質上の不利益を消さない。すべての局所判断へ特定のADR書式を強制したり、過去の記録を現実に合わせて黙って書き換えたりしない。
  - Invariant: アーキテクチャ上重要な判断には、対象の関係者と関心、採った案、比較した現実的な代替案、選択理由、品質間のトレードオフ、既知の結果、再検討条件を追跡可能に残す。判断が変わったときは以前の理由を失わず、置換または追記の関係が分かる形にする。保存書式と粒度は案件に合わせる。
- 出典: ISO/IEC/IEEE 42010:2022 public conceptual model（Architecture Decision、Concern、採用／不採用案を含むArchitecture Rationale・https://www.iso-architecture.org/ieee-1471/cm/・取得 2026-08-05）／SEI, *The Architecture Tradeoff Analysis Method*, CMU/SEI-98-TR-008（複数品質の相互作用と設計判断のトレードオフ・https://www.sei.cmu.edu/library/the-architecture-tradeoff-analysis-method/・取得 2026-08-05）

## id: architecture-boundary-conformance-check

- name: 守る理由がある依存境界を明示し、実装との適合を継続検査する
- 領域: code
- 適合する状況: モジュール、パッケージ、層、プラグイン等の間に、変更容易性、セキュリティ、独立配布、テスト可能性等を守るための依存方向がある案件。設計図では分離しているが、実装で近道の依存が増える懸念があるとき。
- 叩き台:
  - Anti-direction: 根拠なく全循環・全越境依存を禁止したり、依存数を単一の品質スコアにしたりしない。設計文書だけを正しく保ち、実装が境界を破っても放置しない。特定ツールが報告しなかったことを、違反が存在しない証明にしない。
  - Invariant: 品質目標を守るうえで重要な許可依存と禁止依存を、対象モジュールと理由が判別できる規則として記述する。コードレビュー、静的解析、ビルド境界等の再現可能な方法で継続確認し、違反時は依存を戻すか、意図した構造を理由付きで更新する。解析の見逃し・誤検出と、実行時依存等の検査対象外を明示する。
- 出典: ISO/IEC/IEEE 42010 public conceptual model（依存、制約、整合性等を表すCorrespondence Rules・https://www.iso-architecture.org/ieee-1471/cm/・取得 2026-08-05）／Leo Pruijt et al., “The accuracy of dependency analysis in static architecture compliance checking,” *Software: Practice and Experience* 47(2), DOI 10.1002/spe.2421（実装依存と高位設計の適合検査、および検出精度の限界・https://dspace.library.uu.nl/handle/1874/351324・取得 2026-08-05）
