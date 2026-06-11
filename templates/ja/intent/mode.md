# Active Mode

> `/intent-discover` がモードを確定したときに更新します。これは intent-* スキル間で共有される唯一の状態です。

- **mode**: (未確定 — `/intent-discover` を実行すると推奨・確定されます)
- **selected**: (確定日 ISO 8601)
- **reason**: (なぜこのモードが選ばれたか)
- **definition**: (例: `.intent/modes/standard.md`)
- **designer-questions**: (未確定 — on / off。設計者役の問いの代行。`/intent-discover` が説明・確認・記録します)
- **purpose**: (未確定 — poc / product。designer-questions が on のとき `/intent-discover` が確認・記録します)

## このファイルの扱い（スキル共通の規約）

- `/intent-discover` がモード推奨 → 利用者確認 → ここに確定結果を書きます。
- `/intent-compass` / `/intent-packets` / `/intent-export-cc-sdd` は、このファイルを読み、`definition` のモード定義に従って動きます。
- **このファイルが未確定 / 不在のとき**: 各スキルは停止せず `standard` を既定モードとして続行し、出力の Open Questions に「モードが未確定。`/intent-discover` でモードを確定することを推奨」を併記します。
- これは「前段の成果物（tree/compass/packets）が無いとき停止案内する」のとは区別されます。mode.md の不在だけでは停止しません。
- **designer-questions / purpose が未記録・行自体が無い（旧 scaffold）とき**: 各スキルは停止せず未確定として続行し、出力の Open Questions に告知します。読み手は必ず designer-questions を先に判定します（on と記録されていない限り purpose の値を参照しません）。designer-questions / purpose を書くのは `/intent-discover` のみです。

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
