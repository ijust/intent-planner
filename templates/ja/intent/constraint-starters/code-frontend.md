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

## id: responsive-mobile-first-layout

- name: レスポンシブ／モバイルファースト・レイアウト（小さい画面を起点に設計する）
- 領域: code
- 適合する状況: Web の画面・レイアウトを実装する案件。デスクトップ幅を前提に作り込み、狭い画面やタッチ操作での崩れが後回しに見えるとき。
- 叩き台:
  - Anti-direction: 特定の画面幅（特にデスクトップ）だけを前提にレイアウトを固定しない。小さい画面・タッチ操作を後付けで詰め込まない。
  - Invariant: レイアウトは小さい画面を起点に設計し（モバイルファースト）、viewport とブレークポイントで各デバイス幅に応じて流動的に再構成できるようにする。相対単位・フレックス/グリッドで組み、表示領域に追従させる。
- 出典: web.dev "Responsive web design basics"（https://web.dev/articles/responsive-web-design-basics・取得 2026-07-04）

## id: ui-non-happy-states

- name: 非ハッピーパスの状態設計（ローディング・空・エラーをすべて用意する）
- 領域: code
- 適合する状況: データ取得・非同期処理を含む画面を実装する案件。成功時（データが揃った表示）だけを作り込み、読み込み中・データ0件・失敗の見た目が抜けて見えるとき。
- 叩き台:
  - Anti-direction: 成功して中身が揃った状態（ハッピーパス）だけを設計しない。読み込み中・エラー・空状態を「あとで」にして未設計のまま放置しない。
  - Invariant: データを扱う UI は成功だけでなく、ローディング・エラー（原因を伝え回復手段を示す）・空（次の一手へ導く案内つき）の各状態を設計する。利用者を無反応・行き止まりにしない。
- 出典: Nielsen Norman Group "Error-Message Guidelines"（https://www.nngroup.com/articles/error-message-guidelines/・取得 2026-07-04）／同 "Designing Empty States in Complex Applications"（https://www.nngroup.com/articles/empty-state-interface-design/・取得 2026-07-04）

## id: destructive-action-confirmation

- name: 破壊的・不可逆な操作の確認と取り消し（誤操作を可逆にする）
- 領域: code
- 適合する状況: 削除・上書き・課金など取り返しのつかない操作を持つ UI を実装する案件。ワンクリックで即実行され、誤操作から復帰できない構造が見えるとき。
- 叩き台:
  - Anti-direction: 深刻な結果を招く操作をワンクリックで即実行させない。誤操作からの復帰手段を用意しないまま進めない。
  - Invariant: 重大な結果を伴う操作は実行前に確認を挟むか、実行後に取り消し（undo）を提供する。何が起きるかを実行前に明示し、利用者が誤操作から回復できるようにする。
- 出典: Nielsen Norman Group "Confirmation Dialogs Can Prevent User Errors — If Not Overused"（https://www.nngroup.com/articles/confirmation-dialog/・取得 2026-07-04）

## id: design-tokens-consistency

- name: デザイントークンによる一貫性（その場しのぎでなく体系から選ぶ）
- 領域: code
- 適合する状況: 複数の画面・コンポーネントを持つ UI を実装する案件。色・余白・文字サイズを画面ごとにその場で決め、見た目や挙動がばらつく進み方が見えるとき。
- 叩き台:
  - Anti-direction: 色・余白・タイポグラフィをコンポーネントごとに場当たりでハードコードしない。同種の操作を場所ごとに違う見た目・挙動にしない。
  - Invariant: 色・余白・文字スケール等のスタイル決定は共有のデザイントークン（単一の情報源）から参照し、画面をまたいで一貫させる。同じ意味の要素は同じ表現にし、利用者が学習を使い回せるようにする。
- 出典: W3C Design Tokens Community Group（https://www.w3.org/community/design-tokens/・取得 2026-07-04）

## id: i18n-l10n-readiness

- name: 国際化・地域化の下地（文言外出し・文字量膨張・RTL・書式）
- 領域: code
- 適合する状況: 将来的に多言語対応する可能性のある UI を実装する案件。文言をコードに直書きし、英語幅・左横書き前提でレイアウトを詰めているとき。
- 叩き台:
  - Anti-direction: 表示文言を UI に直接埋め込まない。単一言語・単一書式・固定幅を前提にレイアウトを組まない。
  - Invariant: 文言はコードから外部化して翻訳可能にし、翻訳による文字量の膨張・右横書き（RTL）・言語ごとの日付/数値/通貨書式を吸収できるレイアウトにする。
- 出典: W3C "Authoring web pages: Internationalization techniques"（https://www.w3.org/International/techniques/authoring-html・取得 2026-07-04）

## id: system-status-feedback

- name: システム状態の可視化（操作への即時フィードバック）
- 領域: code
- 適合する状況: 送信・保存・時間のかかる処理など、結果がすぐには返らない操作を含む UI を実装する案件。押した後に無反応で、利用者が成否を判断できず二重操作しがちな構造が見えるとき。
- 叩き台:
  - Anti-direction: 利用者の操作に対して無反応の時間を作らない。内部で何が起きているかを隠して、時間のかかる処理を進捗表示なしで放置しない。
  - Invariant: 操作には妥当な時間内（目安 0.1 秒以内）にフィードバックを返し、進行中・完了・失敗といったシステムの状態を常に可視化する。長い処理には進捗・完了の手掛かりを出す。
- 出典: Nielsen Norman Group "10 Usability Heuristics for User Interface Design"（Visibility of system status・https://www.nngroup.com/articles/ten-usability-heuristics/・取得 2026-07-04）

## id: experience-language-recovery

- name: 利用者向けの文体と回復案内（明確で責めない言葉を一貫させる）
- 領域: code
- 適合する状況: 利用者向け文言、エラー文言、案内文を設計する案件。曖昧な専門語や比喩だけで伝える、問題の原因を利用者のせいにする、問題を示しても次に何をすればよいか分からない文言が見えるとき。
- 叩き台:
  - Anti-direction: 曖昧な専門語や比喩だけで伝えない。利用者を責めない。問題だけを示し、次の行動や回復方法を示さない文言にしない。
  - Invariant: 明確で文字どおりの言葉を使う。問題と次に取れる行動または回復方法を、利用者を責めない文体で伝える。画面をまたいで同じ声と語調を保つ。
- 出典: W3C "Making Content Usable for People with Cognitive and Learning Disabilities"（Clear Words、Use Clear and Understandable Content・https://www.w3.org/TR/coga-usable/・取得 2026-07-15）
