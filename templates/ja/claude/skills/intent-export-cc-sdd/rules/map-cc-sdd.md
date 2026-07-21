# Mapping: packet → cc-sdd

選んだ packet 1つを cc-sdd の下書きへ変換する規則。`intent-export-cc-sdd` skill が使う。これは export ターゲット別マッピングの1つ（cc-sdd 用）。別ターゲット（OpenSpec 等）を足す場合は `rules/map-<target>.md` を追加し、対応する `intent-export-<target>` skill を作る（ここが拡張点）。

## 入力範囲（厳守 / 情報源契約）

- `.intent/execution-contract.md` がある場合、cc-sdd配置の入力は**対象 packet 1つと共通選別結果の `selected` だけ**とする。CompassのInvariants / Anti-directionをcc-sdd固有規則から直接読み直したり転記したりしない。
- `.intent/execution-contract.md` がない場合だけ `selection_status: legacy-not-applied` とし、従来の対象 packet + `.intent/intent-compass.md` のInvariants / Anti-directionを直接使う経路へfallbackする（fail-open）。
- Intent Tree 全文・他 packet は**読まない**。全体方向が必要なときのみ Tree の L0–L1 を**要約として**ピンポイント参照する（本文転記は不可）。
- **例外（画面デザイン下書きの引き継ぎ・UI 案件のみ）**: 対象 packet が UI（利用者向け画面）を扱うときだけ、Tree の「画面ラフ参照」セクションを L0–L1 と同じ要領でピンポイント参照してよい。画面デザイン下書き（`.intent/nl-spec/screen-design-brief*.md`）への参照があればその下書きを読み、無ければ何も読まず従来どおり続ける。
- これにより cc-sdd へ渡る情報量を 1 packet 相当に抑える（トークン爆発を防ぐ）。

## 共通選別結果の cc-sdd 配置

- `.intent/execution-contract.md` が返す共通選別結果を使う。`selection_status: applied` のときは `selected` だけを下流へ写し、cc-sdd 固有の候補抽出や再分類を行わない。
- 各採用制約は `Identifier`、`Name`、`Law`、`Applicability`、`Verification`、`Canonical Reference` の6項目を持つ。いずれかを新しい義務なしに作れない候補は `confirm` のままとし、下流制約へ含めない。
- `requirements.md` の `## Invariants` を採用制約の主配置とする。`design.md` には責務境界・依存方向・副作用・移行・技術選定に関係する設計制約だけを写し、`tasks.md` には個々の作業と検証に関係するタスク制約だけを写す。同じ制約を無関係な節へ一律複製しない。
- 領域一致、`always`、明示参照などの通常の選別理由は下流本文へ含めない。理由が適用条件そのものになる場合、制約の衝突を判断する場合、規制・監査・安全保証で根拠が必要な場合に限り、判断に必要な最小要約を該当制約へ添える。
- `confirm` 候補を MUST / SHALL、Invariant、受入条件へ昇格させない。確認種別、根拠、不足情報は内部記録だけに残す。
- `constraint-selection.md`（`.intent/cc-sdd/<packetスラッグ>/constraint-selection.md`）を共通内部記録契約どおり同じrunで全置換する。下流へ渡さない。`/kiro-spec-init` の入力一覧やdesign/tasksの段階別手渡しには含めない。
- `selection_status: legacy-not-applied` のときは、従来の packet + Compass 入力と既存配置を維持する。SelectedやConfirmation Candidatesを新方式で確定したとは表示せず、内部記録のLegacy Outputから主出力を参照する。
- 既存のAcceptance Material、Revalidation Candidates、関係定石（候補・未採用）が要件ではない扱いと、cc-sddの3フェーズ承認を維持する。

## 出力（3ファイルの下書き / 本体は作らない）

下書きは packet ごとのディレクトリ `.intent/cc-sdd/<packetスラッグ>/` 配下に書く（スラッグの導出は次節「出力レイアウト」）。

### `.intent/cc-sdd/<packetスラッグ>/requirements.md`
- cc-sdd の `/kiro-spec-init` に投入する **Project Description 本文**（凝縮テキスト）。
- 含めるもの: (a) 誰の課題か、(b) 現状、(c) 何を変えたいか / In・Out scope / 守るべき invariant / parent intent。対象 packet に `## 価値（誰に何が起きるか）` 節があれば、その要旨を (a)/(c) の文脈として冒頭へ引き継ぐ（下流の設計判断が「誰に何が起きるか」を前提にできるように。無ければ従来どおり省く＝バイト等価）。
- **受入基準の材料（DR119・INV75）**: 対象 packet の `## Expected Behavior` の要点と、`## Validation` の fit criterion（受入をどう測るか）を、**材料として転記**する。転記に留め、EARS 形式化・受入基準の完成はしない（下書きの範囲＝本体を作らない、の内側）。材料は要求度が一意に読める語で書き分ける（必須＝MUST/SHALL・禁止＝MUST NOT・推奨＝SHOULD・任意＝MAY。RFC 2119 の使い分け）。これは下流の requirements 生成が受入基準を**創作でなく転記＋整形**で書けるようにする注入であり、packet に書かれていない受入条件を発明しない（捏造ゼロ）。Expected Behavior / Validation が薄い・不在の packet では無理に埋めず、「受入基準の材料が乏しい」旨を節内に正直に書く（export は止めない）。
- **必須見出し（出力契約）**: `## Source Packet`・`## Parent Intent`・`## Invariants`・`## Acceptance Material`・`## Execution Contract` の5見出しを必ず含める。`## Source Packet` の値は packet 名の**正確な転記**とする（このディレクトリがどの packet に属するかを同定する錨）。`## Acceptance Material` には上記「受入基準の材料」を置く（材料が乏しいときも、その旨を書いた節として必ず置く）。
- **境界付き自律の写像**: `## Execution Contract` には `.intent/execution-contract.md` への参照を置き、Invariant=Safety、Scope / Acceptance=Scope・Expected Behavior・Validation、Decision=Decisions、Preference / Heuristic=Agent-discretion・候補、という対象 packet 内の出所対応を短く示す。実装中に境界越えを発見したら参照先の判断形式を使い、人の回答まで変更を待つよう引き継ぐ。契約本文や三択の全文は複製しない。契約不在時は節に「契約不在・従来境界で続行」と明記する。
- **実装時の再確認候補の写像**: 対象 packet の Agent-discretion で、未定の理由と同一項目の `Revisit when` があるものだけを、`## Execution Contract` 内の `### Revalidation Candidates` へ非拘束の候補として同一項目を1回だけ転記する。MUST / SHALL、Invariant、受入条件へ昇格させない。候補がなければ小節ごと省略し、再 export で複製しない。無関係な Tree / Compass / archive の全文を候補として運ばない。
- **言葉の規律の同梱（平易さの JIT・DR151）**: `## Acceptance Material` の末尾に、次の固定文を毎回1行で置く（同文・省略しない）: 「言葉の規律: この spec から生成する文書・タスク・利用者への質問は、初見に通じる言葉で書く。読み手が誰かを宣言し、内輪語・比喩の転用語は引用せず普通の言葉に開き、識別子は初出で一行の言い換えを添える。比喩や基準のない曖昧な言い方だけで意味を渡さず、比喩を使うなら直後に正確な言い直しを併記する。何が必須で何が任意かは、要求度を示す語（必須・禁止・推奨・任意）で書き分ける。」これは受入基準の材料ではなく**生成時の書き方の規律**であり、受入条件として解釈させない（材料と混ぜず節の末尾に置く）。下流での生存は `/intent-validate` の draft-content-dropped が突合する。
- `selection_status: applied` の情報源は対象 packet（Why/Scope/Expected Behavior/Validation/Safety）と共通結果の `selected` だけに限定する。`legacy-not-applied` の場合だけ、従来どおりcompassのInvariantsを直接使う。

### `.intent/cc-sdd/<packetスラッグ>/design.md`
- cc-sdd の design 生成時の**見落とし防止ヒント（箇条書き）**。本体ではない。
- `selection_status: applied` では、packetのScope/Non-scope/Rollbackと、`selected`のうち該当する技術制約だけを由来にする。観点は責務境界・依存方向・副作用・移行/ロールバック・リスク・技術制約とし、Compassから技術スタック・基盤・ライセンス制約を直接転記しない。`legacy-not-applied` の場合だけ従来のcompass技術制約Invariantを使う。対象 packet に `## リスク` 節があれば、その定性リスク（起きたら何が壊れるか・兆候・打ち手・見張り役）を design のリスク観点ヒントへ引き継ぐ（無ければ省く）。
- **見積もりは design ヒントへ参考転記に留める**（任意）: 対象 packet に `## 見積もり` 節があれば、その幅・算出根拠・実装主体を design ヒント末尾に「Intent 側の見積もり（参考）」として1行転記してよい。ただし cc-sdd/kiro のタスク見積もりを**生成・確定しない**（intent-planner は下書きまで＝Non-scope）。見積もりを要件・受入基準に化けさせない（参考情報として区別する）。
- **画面デザイン下書きの引き継ぎ（UI 案件のみ・任意）**: 入力範囲の例外で「画面ラフ参照」に画面デザイン下書き（`.intent/nl-spec/screen-design-brief*.md`）への参照を見つけたときは、design ヒントに要点（主要画面の目的・情報の優先順位・主行動・主要状態・見た目の方向と、それぞれの確定／推測の別）と参照先パスを短く転記する。推測（inferred）標識は落とさず、確定へ昇格させない。参照が無ければこの項を書かない（従来どおり）。

### `.intent/cc-sdd/<packetスラッグ>/tasks.md`
- 先頭に **「Intent 由来の制約」セクション**（parent intent / invariant / Anti-direction 要約）を置く。
- その後に cc-sdd の tasks 生成チェック項目（characterization test / migration slice / 各タスクの invariant 参照）。
- `selection_status: applied` の由来はpacketのValidation/Rollback・parent intentと、`selected`のうち該当するタスク制約だけにする。`legacy-not-applied` の場合だけ従来のcompass Invariants/Anti-directionを直接使う。

### `requirements.md` 末尾の「関係定石（候補・未採用）」節（任意・A40/DR83 宿主②・DR85）
下書き（`requirements.md`）の**末尾に独立節**として、この packet に関係しそうな定石を候補として添付してよい（下流の実装者・エージェントへ JIT で届けるため）。**採用済み Invariant とは節を分けて区別し**、必要な制約が spec の要件と混同されないようにする。

- **節冒頭に明記する**: 「これは候補であって要件ではない。採否は下流の判断に委ねる」旨を1文で置く（下流が要件と誤読しないための境界）。
- **中身は参照方式に留める**: 各定石は `id` ＋ 名前 ＋ 一行要旨 ＋ カタログ参照パス（`.intent/constraint-starters/<領域>.md`）のみを載せる。**定石本文を全文転記しない**（カタログが正本・二重管理と陳腐化の抱え込みを防ぐ）。
- **少数に絞る**: 対象 packet の Scope / Expected Behavior と意味照合して**強い当てはまりのみ**（目安5件）。当てはまりが弱ければ載せない（節ごと省略してよい）。
- **既に決まった採否を反映する（INV57・DR84）**: 引き継がれた発行ディレクトリに `constraint-ledger.md` があれば読み、**採用済み**（packet の Safety / Invariants に既に入っている）と**否認済み**の定石は載せない。ファイルが無ければ、過去の採否確認だけを省略して候補の選定を続ける。目的・文脈が否認時から変わったと判断できる場合は、否認済みの定石も候補へ戻してよい（機械条件なし・INV2）。詳細は `.intent/discovery/README.md` の「定石の採否記録」を正とする。
- **任意・後方互換**: 合致がゼロなら節ごと省略する。節の有無・中身は export の成否に影響しない（warn すら出さない・候補は静かに添えるだけ）。下流の共有設定（steering 等）へは書かない（read-only の下書き内に留める）。

## 出力レイアウト（スラッグ規則と衝突規則）

### スラッグ規則（決定的）

packet 名からディレクトリ名（スラッグ）を以下の順で**決定的に**導出する。同じ packet 名は常に同じスラッグになる。

1. NFC 正規化する。
2. 前後の空白を trim する。
3. ASCII 大文字を小文字にする。
4. 空白とパスに危険な文字（`/ \ : * ? " < > |`）を `-` に置換する。
5. 連続する `-` を1つに圧縮する。
6. 先頭・末尾の `-` を除去する。

- 非 ASCII 文字（日本語等）はそのまま保持する。
- 結果が空文字列になる場合はスラッグを `unnamed-packet` とし、その旨を利用者に告知する。

### 衝突規則

- スラッグが既存ディレクトリと一致し、かつそのディレクトリの requirements.md の `## Source Packet` 見出しが**異なる** packet 名を指す場合のみ衝突とする。`-2` から始まる連番を付与して別名を割り当て、packet 名 → ディレクトリ名の対応を利用者に告知する。黙って上書きしない。
- `## Source Packet` が**同一** packet 名を指す場合は衝突ではなく再 export であり、同じディレクトリの下書きをその場で更新する。

## impl への伝播（戦略X）

- tasks ヒントは「**個々のタスクに紐づく invariant 参照**」の粒度で書く。
- 狙い: cc-sdd が生成する本体 `tasks.md` の各タスクへ parent intent と invariant が**転記される**こと。これにより、別セッションで `.intent/` を読まずに起動される impl サブエージェントも、cc-sdd 成果物（tasks.md）経由で invariant / Anti-direction を参照できる。
- **責任分界**: intent-planner の責務は「転記されやすい構造でヒントを渡す」ところまで。実際の転記は cc-sdd の tasks 生成に委ねる（cc-sdd の挙動には依存しない）。完全転記は**保証ではなく、構造で確率を最大化**する。

## 不変条件

- cc-sdd の requirements/design/tasks の**本体を完成させない**（下書き・ヒントまで）。
- tasks ヒントは必ず parent intent と invariant への参照を含む。
- **他 packet のディレクトリへは書き込まない**（書き込み先は対象 packet のスラッグ配下のみ）。
- cc-sdd の skill には介入しない。
