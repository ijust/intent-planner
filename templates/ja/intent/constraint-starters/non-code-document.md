# Constraint Starters — non-code / 文書

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: 非コードの文書（発表資料・提案・仕様文書など）。`領域: non-code` に属します。

## id: slide-deck-structure

- name: 発表資料の構成セオリー（主張先行・1スライド1メッセージ）
- 領域: non-code
- 適合する状況: 発表資料・プレゼンテーション・提案スライドを作る案件。情報を詰め込みがち・結論が後ろに回りがちな進み方が見えるとき。
- 叩き台:
  - Anti-direction: 1枚のスライドに複数の主張を詰め込まない。結論を末尾まで伏せて事実の羅列から始めない。
  - Invariant: 1スライド＝1メッセージを保つ。各スライドは主張（結論）を先に置き、根拠で支える構成にする。
- 出典: Barbara Minto "The Pyramid Principle"（結論先行・MECE の構成原則）／Garr Reynolds "Presentation Zen"（1スライド1メッセージ）・取得 2026-06-21

## id: requirement-keywords-clarity

- name: 要件記述の明確化（要求度を示すキーワードを使い分ける）
- 領域: non-code
- 適合する状況: 仕様書・RFC・PRD など、何が必須で何が任意かを他者に伝える文書を書く案件。「〜する」「〜したい」が混ざって必須/推奨/任意の区別が曖昧になりがちなとき。
- 叩き台:
  - Anti-direction: 必須・推奨・任意を曖昧な言い回しで混在させない。読み手が要求度を推測しなければ分からない書き方をしない。
  - Invariant: 要求度を明示する語を使い分ける（必須＝MUST/SHALL、禁止＝MUST NOT、推奨＝SHOULD、任意＝MAY 等）。各要件がどの要求度かを文面から一意に読めるようにする。
- 出典: RFC 2119 "Key words for use in RFCs to Indicate Requirement Levels"（BCP 14・https://www.rfc-editor.org/rfc/rfc2119・取得 2026-06-26）

## id: doc-type-separation

- name: ドキュメント種別の分離（目的別に書き分ける）
- 領域: non-code
- 適合する状況: README・技術ドキュメント・ガイドなど、利用者向けの文書を設計・整理する案件。チュートリアル・手順・リファレンス・解説が1ページに混ざって読み手が目的の情報に辿り着けないとき。
- 叩き台:
  - Anti-direction: 学習目的（tutorial）・課題解決（how-to）・情報参照（reference）・理解（explanation）を1つの文書に混ぜない。読者の目的を考えずに情報を並べない。
  - Invariant: ドキュメントを読者のニーズ（学ぶ/作業する/参照する/理解する）の4種類に対応づけて書き分け、その構造に沿って配置する。各ページがどの目的かを明確にする。
- 出典: Diátaxis（技術文書の体系的アプローチ：tutorials / how-to guides / reference / explanation の4分類・https://diataxis.fr/・取得 2026-06-26）

## id: rfp-outcome-requirement-evaluation-alignment

- name: RFPの成果・要求・回答・評価の対応（提案を同じ物差しで比較できるようにする）
- 領域: non-code
- 適合する状況: ITサービスやシステムの提案依頼書を作り、複数の提案を公正かつ再現可能に比較する案件。
- 叩き台:
  - Anti-direction: 製品名や実装方法だけを先に固定したり、RFPに書いていない評価観点で選定しない。必須条件と加点条件を混ぜない。
  - Invariant: 解く課題と測定可能な成果を起点に、範囲、制約、成果物、受入条件、回答形式を対応づける。評価項目、必須/加点の別、採点尺度、相対的重要度を提案前に示し、提出された情報だけで同じ基準を適用する。
- 出典: UK Government "Digital, Data and Technology Playbook"（outcome-based specifications と evaluation approach・https://www.gov.uk/government/publications/the-digital-data-and-technology-playbook/the-digital-data-and-technology-playbook-html・取得 2026-08-04）／Canada Treasury Board "Evaluation Criteria"（mandatory と point-rated criteria、rating scale・https://www.canada.ca/en/treasury-board-secretariat/corporate/organization/professional-audit-support-services/evaluation-criteria.html・取得 2026-08-04）／U.S. FAR 15.304（stated factors、relative importance、price and quality・https://www.acquisition.gov/far/15.304・取得 2026-08-04、法域固有部分は一般化しない）

## id: rfp-lifecycle-cost-and-exit

- name: RFPのライフサイクル境界（総費用、セキュリティ、データ、終了・移行を回答対象にする）
- 領域: non-code
- 適合する状況: SaaS、受託開発、運用保守を調達し、初期導入後の変更・運用・終了時まで供給者への依存と費用が続く案件。
- 叩き台:
  - Anti-direction: 初期価格と機能表だけで比較し、運用費、変更費、セキュリティ責任、データ返却、知的財産、終了支援を契約後へ先送りしない。
  - Invariant: 初期・継続・変更・終了を含む総費用の回答形式を揃える。セキュリティと供給網、データ所有・可搬形式、標準と相互運用性、知的財産、サービス水準、終了条件、移行支援を範囲に応じて明示し、受入と退出を検証可能にする。
- 出典: UK Government "Digital, Data and Technology Playbook"（whole-life value、cyber security、testing、contract change・https://www.gov.uk/government/publications/the-digital-data-and-technology-playbook/the-digital-data-and-technology-playbook-html・取得 2026-08-04）／UK Government "Open Standards Principles"（interoperability、exit/migration、vendor lock-in 回避・https://www.gov.uk/government/publications/open-standards-principles/open-standards-principles・取得 2026-08-04）

## id: effort-estimate-basis-and-range

- name: 工数見積もりの根拠と幅（範囲・前提・分解・不確実性を数字と一緒に残す）
- 領域: non-code
- 適合する状況: 要件や設計の確定度に幅がある開発について、人時・人日・人月などの工数を計画や提案に使う案件。
- 叩き台:
  - Anti-direction: 対象範囲、前提、見積もり方法、不確実性を示さず単一値だけを約束し、開発だけを数えて検証・統合・文書・管理・外部依存を落とさない。
  - Invariant: 技術的な基準線とWBSで対象を分解し、含む/含まない範囲、前提、制約、依存、参照実績、見積もり方法を記録する。不確実な部分は幅で示し、重要案件では複数手法による照合とリスク・感度分析を行う。
- 出典: U.S. GAO "Cost Estimating and Assessment Guide"（technical baseline、WBS、assumptions、data、methodology、sensitivity/risk、documentation・https://www.gao.gov/products/gao-20-195g・取得 2026-08-04）／NASA "Cost Estimating Handbook"（software cost estimating と risk/uncertainty・https://www.nasa.gov/ocfo/ppc-corner/nasa-cost-estimating-handbook-ceh/・取得 2026-08-04）

## id: effort-estimate-update-with-actuals

- name: 工数見積もりの更新（実績と変更を同じ分解単位で照合する）
- 領域: non-code
- 適合する状況: 複数段階・反復型の開発で、途中の実績や要件変更から残作業の見通しを更新できる案件。
- 叩き台:
  - Anti-direction: 初回見積もりを固定した約束として扱い続けたり、見積差を範囲変更・前提外れ・生産性差に分けず「遅れ」だけで処理しない。他チームの速度を換算せず流用しない。
  - Invariant: 見積もり時のWBSまたは成果物単位で実績工数と完了量を取り、変更された範囲・前提・依存を履歴として残す。節目ごとに残作業と幅を再見積もりし、差の原因を次回の参照データと方法の補正へ戻す。
- 出典: U.S. GAO "Cost Estimating and Assessment Guide"（estimate を actual costs/changes で更新する12-step process と継続的改善・https://www.gao.gov/products/gao-20-195g・取得 2026-08-04）
