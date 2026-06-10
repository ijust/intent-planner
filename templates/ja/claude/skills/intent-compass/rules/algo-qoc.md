# Algorithm: QOC (Questions-Options-Criteria)

設計判断を「問い・選択肢・選択基準」で記録する技法。全モード共通の Intent Compass 構築フェーズで使う。判断の根拠を残すことで、後から（特に impl 段階で）局所最適に流れるのを防ぐ。

## 手順

1. **North Star を Intent Tree から引く**
   - L0/L1 から「この変更で近づきたい最終状態」を1つに凝縮する。

2. **判断点を QOC で展開する**
   - **Question**: 迷いどころ（「Xをどう実現するか」）。
   - **Options**: 取りうる選択肢を複数挙げる。
   - **Criteria**: どの基準で選ぶか。Intent Tree の L1（成果）や invariant に照らす。
   - 採用した選択肢と、その理由（基準）を `Decision Rules` に「問い → 採る選択肢 → なぜ」の形で凝縮する。

3. **Anti-direction を明示列挙する**
   - 避けるべき方向を書く。特に **Claude がやりがちな局所最適・小手先リファクタ**を具体的に列挙する。これは Compass の最重要セクション。
   - 列挙には**プレモータム（pre-mortem）**を使う: 「この変更が実装され、結果として全体設計が崩れた・意図から外れたと**仮定**する。エージェントは何をしてしまったか？」と未来から振り返り（prospective hindsight）、出てきた失敗経路を Anti-direction として書き出す。思いつきの列挙より失敗要因の検出力が高い。
   - 例: 「ついでに別の処理も直す」「テストなしの一括置換」「ドメインロジックを UI に寄せる」。

4. **Invariants を2層で固定する**
   - 壊してはいけない振る舞い / API / データ / UX / 運用制約。
   - **プロジェクト普遍 invariant**（全作業共通・少量）と **packet 固有 invariant**（特定作業単位）を区別する。
   - プロジェクト普遍のものは `/kiro-steering-custom` で `.kiro/steering/` に置くと全作業で効くことを推奨提示する（自動配置はしない。起動時コンテキスト増を避けるため少量に限る）。

5. **Evidence と Open Questions を残す**
   - 各判断を支える証拠（README/コード/テスト/ログ/課題）を `Evidence` に。
   - 判断に必要だが未確定の問いを `Open Questions` に。

## 規律

- Decision Rule は「なぜ」を必ず含める。結論だけ書かない。
- Anti-direction を空にしない。局所最適の具体例を最低数個挙げる。
- コードを変更しない。

## 出力

`intent-compass.md` の `North Star / Current Drift / Direction / Anti-direction / Invariants / Decision Rules / Evidence / Open Questions` を更新（案として提示）する。
