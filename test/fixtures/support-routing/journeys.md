# 支援選択から既存flowまでの代表旅程

各例は、職種名や単語ではなく、目的・成果物・指定資料・次の判断から始まり、質問前の整理、変更承認、次段階の扱いを経て既存のmode選定へ戻るまでを検査する。

## explicit-rfp
- purpose: 外部ベンダーから比較可能な提案を集める
- role: developer
- artifact: RFP
- material: none
- next-decision: 提案依頼を開始する
- context: procurement
- known: no
- conflict: no
- unresolved: no
- approval: none
- stage: planning
- expected-routing: AvailableSupport
- expected-question: none
- expected-progress: mode-selection

## explicit-rfp-role-procurement
- purpose: 外部ベンダーから比較可能な提案を集める
- role: procurement
- artifact: RFP
- material: none
- next-decision: 提案依頼を開始する
- context: procurement
- known: no
- conflict: no
- unresolved: no
- approval: none
- stage: planning
- expected-routing: AvailableSupport
- expected-question: none
- expected-progress: mode-selection

## explicit-rfp-negated-purpose
- purpose: 内製CLIを直す。RFPは作らない
- role: developer
- artifact: RFP
- material: none
- next-decision: 提案依頼を開始する
- context: procurement
- known: no
- conflict: no
- unresolved: no
- approval: none
- stage: planning
- expected-routing: ExistingFlow
- expected-question: none
- expected-progress: mode-selection

## material-prd
- purpose: 長いPRDから未決の要求を抽出する
- role: product-owner
- artifact: 要求整理
- material: detailed-needed
- next-decision: 最初に確認する要求を決める
- context: product-development
- known: no
- conflict: no
- unresolved: no
- approval: none
- stage: planning
- expected-routing: AvailableSupport
- expected-question: none
- expected-progress: mode-selection

## ambiguous-request
- purpose: 会議メモを次に使える形へ整理する
- role: team-member
- artifact: undecided
- material: readable
- next-decision: undecided
- context: general
- known: no
- conflict: no
- unresolved: no
- approval: none
- stage: planning
- expected-routing: ClarificationQuestion
- expected-question: routing-clarification
- expected-progress: mode-selection

## known-only
- purpose: 合意済みのログイン修正を計画する
- role: developer
- artifact: 実装計画
- material: readable
- next-decision: 実装範囲を確定する
- context: non-procurement
- known: yes
- conflict: no
- unresolved: no
- approval: none
- stage: planning
- expected-routing: ExistingFlow
- expected-question: none
- expected-progress: mode-selection

## conflict
- purpose: 対象利用者を確定して機能範囲を決める
- role: product-owner
- artifact: 要求整理
- material: readable
- next-decision: 対象機能を確定する
- context: product-development
- known: no
- conflict: yes
- unresolved: no
- approval: none
- stage: planning
- expected-routing: ExistingFlow
- expected-question: conflict-with-impact
- expected-progress: mode-selection

## unresolved-poc
- purpose: 応答時間の実現可能性を試す
- role: developer
- artifact: PoC結果
- material: none
- next-decision: 本実装の方式を選ぶ
- context: product-development
- known: no
- conflict: no
- unresolved: yes
- approval: none
- stage: poc
- expected-routing: ExistingFlow
- expected-question: unresolved-with-impact
- expected-progress: limited-learning

## unresolved-publish
- purpose: 未確定の保持期間を含む機能を公開する
- role: release-manager
- artifact: 公開版
- material: readable
- next-decision: 公開可否を決める
- context: product-development
- known: no
- conflict: no
- unresolved: yes
- approval: none
- stage: publish
- expected-routing: ExistingFlow
- expected-question: unresolved-with-impact
- expected-progress: affected-scope-stopped

## partial-approval
- purpose: 外部指摘を既存要求へ反映する
- role: product-owner
- artifact: 更新した要求
- material: readable
- next-decision: 変更範囲を確定する
- context: product-development
- known: no
- conflict: no
- unresolved: no
- approval: partial
- stage: planning
- expected-routing: ExistingFlow
- expected-question: none
- expected-progress: mode-selection

## non-procurement-role-counterexample
- purpose: 認証処理を保守しやすく整理する
- role: procurement
- artifact: リファクタリング計画
- material: none
- next-decision: 実装範囲を決める
- context: non-procurement
- known: no
- conflict: no
- unresolved: no
- approval: none
- stage: planning
- expected-routing: ExistingFlow
- expected-question: none
- expected-progress: mode-selection
