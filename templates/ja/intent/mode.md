# Shared Policy（共有ポリシー）

> このファイルは **チームで共有する（git 追跡される）** ポリシーを置きます: `Enforcement`（書き戻し強制）と `Drift-watch`（逸脱監視）。
> **作業の詰め方（`mode` / `designer-questions` / `purpose`）は `mode.local.md`（ローカル専用・git 非追跡）にあります。** チーム/並行セッションでの衝突を避けるため分離しています。
> **後方互換**: 旧 scaffold ではこのファイルに mode 状態も同居していました。読み手は `mode.local.md` を先に読み、無ければこのファイルの mode 状態行（在れば）にフォールバックします。

## Enforcement（ユーザー管理）

> このセクションは利用者だけが編集します。`/intent-discover` を含むスキルはこのセクションを変更しません（読み取りのみ）。

- **enforcement**: off
- **enforcement-threshold**: 5
- **enforcement-exclude**: 

- **enforcement** — 書き戻し（writeback）強制の強度。値は `off` | `remind` | `gate` の3つです:
  - `off`（既定）: 検査を行いません。従来どおりの動作です。
  - `remind`: 書き戻し漏れを検出したら警告のみ表示します。停止はしません。
  - `gate`: 書き戻し漏れを検出したら export / push を停止します（明示的な続行指示や `--no-verify` の逃げ道は残ります）。
- **enforcement-threshold** — staleness（書き戻し漏れ）と判定するコミット数の閾値です。正の整数（既定: 5）。
- **enforcement-exclude** — staleness の計数から除くパス（カンマ区切りの相対パス接頭辞。空のままで構いません）。`.intent/` は常に暗黙で除外されます。
- 切り替えはこのファイルを直接編集して行います。未記載・不正値のときは off / 5 / 除外なし として扱われ、停止しません。

## Drift-watch（ユーザー管理）

> このセクションは利用者だけが編集します。`/intent-discover` を含むスキルはこのセクションを変更しません（読み取りのみ）。

- **drift-watch**: off

- **drift-watch** — 逸脱（drift）監視の強度。値は `off` | `on` の2つです:
  - `off`（既定）: 何もしません。従来どおりの動作です。
  - `on`: discover で逸脱しやすい場面の事前チェック、export 水際で compass 照合の警告を出し、検知を drift-log.md に記録します。**いずれも警告のみで、停止はしません**（enforcement の gate とは別概念。誤検知前提のため停止しません）。
- 切り替えはこのファイルを直接編集して行います。off|on の2値のみで、停止（gate 相当）の値は持ちません。未記載・不正値のときは off として扱われ、停止しません。

## Oversize-guard（ユーザー管理）

> このセクションは利用者だけが編集します。スキル・実装セッションは読み取りのみで、このセクションを変更しません。

- **oversize-guard**: warn
- **oversize-guard** — 宣言と実装の乖離照合（作りすぎ・薄すぎの途中検出）の強度。値は `off` | `warn` | `gate` の3つです:
  - `off` — 照合しません。
  - `warn`（既定） — 兆候の疑いを1回だけ警告し、実装は止めません。
  - `gate` — 警告に加え、利用者の応答があるまで当該作業単位の実装だけを止めます。
- 未記載・不正値は warn として扱われます。対象の作業単位に「## 想定規模」の宣言が無ければ、値に関わらず何もしません。
