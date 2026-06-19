# Active Mode（ローカル）

> `/intent-discover` がモードを確定したときに更新します。これは intent-* スキル間で共有される作業状態（mode の詰め方）です。
> **このファイルはローカル専用（git 非追跡）です。** チーム/並行セッションで各自の作業モードが衝突しないよう、`mode` / `designer-questions` / `purpose`（作業の詰め方）をここに置きます。共有したいポリシー（Enforcement / Drift-watch）は `mode.md`（追跡）にあります。

- **mode**: (未確定 — `/intent-discover` を実行すると推奨・確定されます)
- **selected**: (確定日 ISO 8601)
- **reason**: (なぜこのモードが選ばれたか)
- **definition**: (例: `.intent/modes/standard.md`)
- **designer-questions**: (未確定 — on / off。設計者役の問いの代行。`/intent-discover` が説明・確認・記録します)
- **purpose**: (未確定 — poc / product。designer-questions が on のとき `/intent-discover` が確認・記録します)

## このファイルの扱い（スキル共通の規約）

- `/intent-discover` がモード推奨 → 利用者確認 → ここに確定結果を書きます。
- `/intent-compass` / `/intent-packets` / `/intent-export-cc-sdd` 等は、このファイルを読み、`definition` のモード定義に従って動きます。
- **読み取りの後方互換（read fallback）**: 読み手は **このファイル（`mode.local.md`）→ 無ければ旧 `mode.md` の mode 状態 → どちらにも無ければ `standard` 既定** の順で読みます。旧 scaffold（mode 状態が `mode.md` にしか無い既存環境）でも壊れません。
- **このファイルが未確定 / 不在のとき**: 各スキルは停止せず `standard` を既定モードとして続行し、出力の Open Questions に「モードが未確定。`/intent-discover` でモードを確定することを推奨」を併記します。
- これは「前段の成果物（tree/compass/packets）が無いとき停止案内する」のとは区別されます。mode 状態の不在だけでは停止しません。
- **designer-questions / purpose が未記録・行自体が無い（旧 scaffold）とき**: 各スキルは停止せず未確定として続行し、出力の Open Questions に告知します。読み手は必ず designer-questions を先に判定します（on と記録されていない限り purpose の値を参照しません）。designer-questions / purpose を書くのは `/intent-discover` のみです。
- **ローカル専用の理由**: `mode` / `designer-questions` / `purpose` は「いま誰が・どの作業をしているか」に紐づく動的な状態です。git で共有すると、チーム開発で他メンバーの作業モードが pull で降ってきたり、並行セッションで上書きされて衝突します。そのため git 非追跡にします（installer が `.gitignore` に登録します）。共有したいポリシー（Enforcement / Drift-watch）は追跡される `mode.md` に置きます。
