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
