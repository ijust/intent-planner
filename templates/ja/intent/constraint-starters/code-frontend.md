# Constraint Starters — code / フロントエンド・デザイン横断

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: フロントエンド実装に現れるデザイン横断の関心（アクセシビリティ・フォーム UX・情報設計など）。デザインは独立した領域値ではなく、これらはコード実装でもありデザインでもある横断軸です。`領域: code` に属し、`適合する状況` で UI/フロントエンド文脈に当てます（DR55：二値分類のまま横断軸を `適合する状況` で吸収）。

## id: accessibility-wcag

- name: アクセシビリティ（WCAG・知覚/操作/理解の確保）
- 領域: code
- 適合する状況: Web の UI コンポーネント・画面を実装する案件（フロントエンドエンジニアの実装はコードでもありデザインでもある）。色だけで情報を伝える・キーボード操作を考えない・代替テキストを欠く進み方が見えるとき。
- 叩き台:
  - Anti-direction: 視覚・マウス前提だけで UI を作らない。色のコントラスト・キーボード操作・スクリーンリーダー向けの情報を後回しにしない。
  - Invariant: UI は障害のある人を含めて知覚・操作・理解できるようにする（WCAG）。テキスト代替・十分なコントラスト・キーボード操作・適切なラベル/ロール（セマンティクス）を備える。色のみで情報を伝えない。
- 出典: W3C Web Content Accessibility Guidelines (WCAG) 2（W3C 勧告・ISO/IEC 40500・https://www.w3.org/WAI/standards-guidelines/wcag/・取得 2026-06-26）

## id: form-ux-clarity

- name: フォーム UX（構造・明快さで認知負荷を下げる）
- 領域: code
- 適合する状況: 入力フォーム・登録/設定画面を実装する案件。ラベルが曖昧・必須/任意が不明・エラー表示が不親切で、利用者がどう入力すべきか迷う構造が見えるとき。
- 叩き台:
  - Anti-direction: ラベルを省いてプレースホルダだけで済ませない。必須/任意の区別やエラーの原因・直し方を曖昧にしない。入力項目を考えなしに並べない。
  - Invariant: フォームは構造（structure）・透明性（transparency）・明快さ（clarity）・支援（support）の観点で設計し、利用者の認知負荷を下げる。明確なラベル、必須/任意の明示、原因と対処が分かるエラー表示を備える。
- 出典: Nielsen Norman Group "Forms"（フォーム設計の4原則：structure / transparency / clarity / support・https://www.nngroup.com/topic/forms/・取得 2026-06-26）
