# Active Mode

> `/intent-discover` がモードを確定したときに更新します。これは intent-* スキル間で共有される唯一の状態です。

- **mode**: (未確定 — `/intent-discover` を実行すると推奨・確定されます)
- **selected**: (確定日 ISO 8601)
- **reason**: (なぜこのモードが選ばれたか)
- **definition**: (例: `.intent/modes/standard.md`)

## このファイルの扱い（スキル共通の規約）

- `/intent-discover` がモード推奨 → 利用者確認 → ここに確定結果を書きます。
- `/intent-compass` / `/intent-packets` / `/intent-export-cc-sdd` は、このファイルを読み、`definition` のモード定義に従って動きます。
- **このファイルが未確定 / 不在のとき**: 各スキルは停止せず `standard` を既定モードとして続行し、出力の Open Questions に「モードが未確定。`/intent-discover` でモードを確定することを推奨」を併記します。
- これは「前段の成果物（tree/compass/packets）が無いとき停止案内する」のとは区別されます。mode.md の不在だけでは停止しません。
