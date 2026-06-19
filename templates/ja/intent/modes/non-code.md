# Mode: non-code

非プログラム成果物（文書・業務プロセス・研究/意思決定など）の意図を詰めるためのモード。コードという成果物を前提にせず、文章・手順・判断といった非実行物を成果物として、その意図を段階分解し具体化する。詰め方（how-to-elaborate）の軸のみを担い、最終的な出力フォーマット（target format）は別の軸（format）が担当するため、このモード定義には出力形式の取り決めを書かない。

## このモードが組み合わせるアルゴリズム

非プログラム成果物（文書・業務プロセス・研究/意思決定）の意図をどう詰めるか（how-to-elaborate）の組み合わせ表。standard と同じ基幹 algo を流用し、目的列の語彙だけを非プログラム成果物（文書・業務・研究）向けに読み替える。新しい algo rule ファイルは追加しない（流用）。

| フェーズ | アルゴリズム | 目的 |
|---|---|---|
| Intent Tree 構築 | **GORE-lite** (Goal-Oriented Requirements Engineering の軽量版) | L0(目的)→L1(成果)→L2(能力)→L3(振る舞い/設計意図)→L4(候補パケット) へゴールを段階分解する。ここでの「能力・振る舞い」は実装ではなく、文書・手順・判断という非実行物が満たすべき内容・流れ・論点として読み替える |
| 判断の記録 | **QOC** (Questions-Options-Criteria) | 設計判断を「問い・選択肢・選択基準」で残し、Compass の Decision Rules / Open Questions に流す。非プログラム案件では「どう書くか・どう進めるか・何を決めるか」の判断を残す |
| 成果物の具体化 | **Example Mapping** | 抽象的な能力を、観測可能な具体例(ルール・例・疑問・切り出し)に落とし、packet の Expected Behavior と Validation を導く。非プログラム成果物では「観測可能」を受容基準で判定可能な記述（読めば合否が分かる例）として扱う |
| spec への橋渡し | **map-cc-sdd** | 選んだ packet を cc-sdd の Project Description / design・tasks ヒントへ変換する（export 経路。非プログラム向け target format への射影は format 軸が担当） |

各アルゴリズムの詳細は、対応する skill の `rules/algo-*.md`（map-cc-sdd は `rules/map-cc-sdd.md`）にあります。このモード定義はそれらを「どのフェーズで使うか」の組み合わせ表です。新規 algo は導入せず、既存 algo を非プログラム成果物へ流用します。

## 各コマンドでの適用

### intent-discover (GORE-lite)
- L0: なぜこの成果物（文書・業務プロセス・研究/意思決定）が要るか。1〜2文。
- L1: 誰の・何の状態をどう変えたいか（読者/業務/意思決定/合意形成）。
- L2: L1 を支える成果物の責務。章立てや機能名でなく「何を満たすか」として書く。
- L3: L2 を成立させる内容・流れ・論点（網羅範囲・順序・前提・整合性・読者制約）。
- L4: 実装手前ならぬ清書手前の候補作業単位（書く章/詰める手順/決める論点）。
- canonical(確定) と inferred(推測=Assumptions) を絶対に混ぜない。

### intent-compass (QOC)
- Intent Tree から North Star を引く。
- 各 Decision Rule は軽量 ADR として凝縮: Context / Decision / Why / Consequences。非プログラム案件では「どう書くか・どう進めるか・何を決めるか」の判断を拘束力ある正本として残す。
- Invariants は壊してはいけない内容/合意/体裁/運用制約（既存成果物の意味・合意を壊さない）。プロジェクト普遍 / packet 固有 の2層に区別する。

### intent-packets (Example Mapping)
- 各 L2/L3 能力について Example Mapping を行う（ルール・例・疑問・切り出し）。例は packet の Expected Behavior、疑問は Open Questions、切り出しは `.intent/packets/plan.md` の Deferred 節へ。
- 非プログラム成果物では Validation/Rollback の検証語彙をコード前提から degrade して読み替える（testable→受容基準で判定可能 / rollback→版管理・差し戻し / behavior-preserving→既存成果物の意味・合意を壊さない）。この読み替えは任意の degrade であり、コード前提の語彙を必須にしない。読み替え語彙の定義は packet-format 側を参照し、ここでは二重定義しない。
- packets 段はスキップせず、決定スロットの播種を残す。

### intent-export-cc-sdd (map-cc-sdd)
- packet 1つを cc-sdd の Project Description（凝縮）と design/tasks ヒントへ変換。入力は対象 packet と Compass の Invariants/Anti-direction に限定する。
- 非プログラム向けの読める成果物体裁への射影は本モード（詰め方）ではなく format 軸（target format）が担当する。

## 適合する状況

- 成果物がコードでない案件（文書・仕様書・業務プロセス・手順・研究/意思決定の記録など）の意図を言語化したいとき
- 「何を実装するか」ではなく「何を書くか・どう進めるか・何を決めるか」を段階分解して詰めたいとき
- standard などコード前提のモードでは詰め方が成果物と噛み合わない、非プログラム案件のとき
