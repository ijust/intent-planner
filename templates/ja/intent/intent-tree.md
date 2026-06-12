# Intent Tree

> `/intent-discover` が更新します。canonical（確定）と inferred（推測=Assumptions）を混ぜないこと。L0〜L4 は意図の階層レベル（Level。L0=目的 〜 L4=作業単位候補）。

## L0: Product Purpose

このプロダクト / アプリ / サブシステムは何のために存在するか。

## L1: Desired Outcomes

ユーザー・事業・運用・開発体験にどんな状態変化を起こしたいか。designer-questions が on のときは、各 L1 項目に `計測基準:` 行（達成をどう観測・判定するか）を併記する。

## L2: Capabilities

Desired Outcome を支える能力。機能名ではなく、責務・能力として書く。

## L3: Behavioral / Architectural Intents

Capability を成立させるための振る舞い・設計意図。境界、依存方向、副作用、データ整合性、UI/UX 制約などを含める。

## L4: Candidate Packets

実装に落とす前の候補作業単位。Issue より少し上位、spec より少し手前の粒度。

## PoC 実験定義（purpose: poc のとき記入）

> `/intent-discover` が purpose=poc のときに更新します。purpose が poc でない場合は空のままで構いません。

### 仮説

この PoC で何を確かめるか。

### 反証条件

何が観測できなければ仮説を棄却するか。

### GO/NO-GO 基準

PoC 完了後に先へ進む / やめるを判定する条件。

## 画面ラフ参照（designer-questions: on のとき記入）

> `/intent-discover` が designer-questions=on のときに更新します。ユーザー向け画面を含む場合はラフ（ワイヤーフレーム・スケッチ等）のパスまたはリンク、無しと判断した場合はその理由。UI 非該当の場合は「対象外」。

## Open Questions

人間が確認すべき未確定事項。

> 回答はいつでも構いません（未回答でも planning は先に進められます）。このファイルを直接編集するか、会話で伝えると次のスキル実行時に反映されます。export までに回答が必要な問いにのみ `[export まで]` タグを付けます（タグのない問いはいつでも回答可）。

## Assumptions

AI が推測した前提。推測は canonical な intent と混ぜない。
