# Compass Archive entry

> characterization fixture（分割形・rule 単位ファイル `compass-archive/<rule-slug>.md`）。
> 単一ファイル形式の同一エントリを退避された Decision Rule の自然キー（rule 単位）で分割したもの。6欄は byte 不変。

- **Context**: target format の正本が無く出口選択が暗黙だった / **Decision**: format を packet frontmatter に持たせる / **Why**: 出口を案件ごとに明示したい / **Alternatives considered**: steering へ持たせる案（全体に効きすぎる） / **Consequences**: INV9 に接続 / **Revisit when**: openspec 以外の出口が増えたとき — superseded: DR26（mode.local.md 任意 format 行へ移行）
