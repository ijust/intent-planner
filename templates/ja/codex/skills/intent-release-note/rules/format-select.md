# format 選択手順（format 引数の解釈・委譲規律）

`intent-release-note` skill が、利用者の指定した format 引数を解釈し、対応する出力構造ルールへ委譲するための正本。SKILL.md は手順と報告形式のみを持ち、「どの format 引数をどの出力構造ルールへ委譲するか」は本ルールを参照する。本ルールは **委譲規律のみ**を持ち、出力構造そのもの（節構成・カテゴリ・並び）は持たない（それは `format-changelog.md` / `format-github-releases.md` の責務であり、二重管理しない・AD24）。

## posture（format を本体にハードコードせず rules へ委譲する）

target format を SKILL.md 本体へハードコードしない。format の選択は本ルールで解釈し、選ばれた出力構造の組み立ては該当 format ルールへ委譲する。format ルールを増やしたいときは出力構造ルールを足し、本ルールの委譲表に1行加えるだけで済むようにする。

## format 引数の解釈と委譲

利用者が `/intent-release-note` に与えた format 引数を、次のとおり解釈し委譲する。

| format 引数 | 委譲先（出力構造ルール） | 体裁 |
|---|---|---|
| `changelog`（または同義の指定） | `rules/format-changelog.md` | Keep a Changelog 風（種類別カテゴリ） |
| `github-releases`（または同義の指定） | `rules/format-github-releases.md` | GitHub Releases 風（物語＋変更一覧） |
| 無指定（既定） | `rules/format-changelog.md`（既定 format） | 既定を用い、**どの format で生成したかを出力に明示する** |

- format 引数で一意に format が確定したら、対話補完は行わない（利用者への問い返しに依存せず、既定で一意化する）。
- 既定 format（無指定時）は `changelog` とし、生成物の冒頭で「format = changelog（既定）」のように、どの format を用いたかを明示する。

## 委譲後の責務分担

- 本ルール: どの format を使うかを確定し、該当 format ルールへ「素材（照合済みコミット群＝紐づくコミットの『なぜ』付き + 紐づかないコミットの薄い行）」を渡す。
- 委譲先（format-* ルール）: 受け取った素材を、その format の出力構造（セクション・カテゴリ・並び）へ流し込む。git 読み・照合は行わない（SKILL.md の責務）。

## 不変条件

- 出力構造（節・カテゴリ・並び）を本ルールに書かない（format-* の責務。二重管理しない）。
- target format を SKILL.md 本体へハードコードしない（本ルールで選択し委譲する・AD24）。
- 既定 format を用いたときは、どの format で生成したかを必ず出力に明示する。
- format の選択に独自の機械スコアリング・閾値を持ち込まない（引数の素直な解釈と既定のみ）。
