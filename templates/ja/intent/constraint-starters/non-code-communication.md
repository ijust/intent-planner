# Constraint Starters — non-code / 伝達

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: 非コードの伝達（告知・メール・リリースノートなど読み手を動かす文章）。`領域: non-code` に属します。

## id: bluf-message

- name: 結論先行の伝達（BLUF・要点を冒頭に）
- 領域: non-code
- 適合する状況: メール・告知・依頼・報告など、読み手に判断や行動を促す文章を書く案件。背景説明から始まって結論が末尾に回り、忙しい読み手に要点が伝わらないとき。
- 叩き台:
  - Anti-direction: 経緯・背景から書き始めて結論を末尾に置かない。読み手が最後まで読まないと「何をすればいいか」が分からない構成にしない。
  - Invariant: 要点（結論・依頼・締切など読み手が最初に知るべきこと）を冒頭に置く（Bottom Line Up Front）。背景・根拠はその後に補う。読み手が冒頭だけで次の行動を判断できるようにする。
- 出典: Carnegie Mellon University Student Academic Success Center "BLUF (The Topic Sentence)" handout（https://www.cmu.edu/student-success/other-resources/handouts/comm-supp-pdfs/bluf-topic-sentence.pdf・取得 2026-06-26）

## id: changelog-for-humans

- name: リリースノート／変更履歴（人間向け・利用者影響先行）
- 領域: non-code
- 適合する状況: リリースノート・変更履歴（changelog）を書く案件。コミットログをそのまま貼る・機械向けの差分を並べるだけで、利用者が「何が変わり自分にどう影響するか」を読み取れないとき。
- 叩き台:
  - Anti-direction: コミットメッセージの羅列をそのまま changelog にしない。版や日付を欠いた・種別が混在した履歴にしない。
  - Invariant: 変更履歴は機械でなく人間のために書く。版ごとにエントリを設け、リリース日を示し、同種の変更（追加・変更・修正・削除等）をグループ化し、最新版を上に置く。各項目は利用者にとっての意味（影響）が読めるようにする。
- 出典: Keep a Changelog 1.1.0（変更履歴の指針：人間向け・版ごと・種別グループ化・最新を上に・https://keepachangelog.com/en/1.1.0/・取得 2026-06-26）
