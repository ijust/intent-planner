# Constraint Starters — code / AI・LLM

> 親カタログ `../constraint-starters.md` の領域別ファイル。`/intent-compass`・`/intent-discover` が、当該案件に関係する領域だけを read-only で pull する遅延ロードの単位です。スキーマ・読み方・出典規律は親カタログを正本とします（ここには定石本体だけを置きます）。
>
> **領域**: LLM・生成 AI をプロダクトへ組み込む案件（チャット・要約・RAG・エージェント等）に固有のリスク。これは特定の層に属さず**層をまたいで効く横断的な関心**であり、`領域: code` に属します。一般的なインジェクション対策（SQLi・XSS・認可等）は code / セキュリティ（`code-security.md`）に、API 境界の関心は `code-api.md` にあり、本領域は「モデルの入出力とエージェントの権限」という LLM 固有の経路だけを扱って射程を分けます（LLM 出力を下流でそのまま実行・描画すると SQLi/XSS 等の古典に接続するため、該当時は `code-security.md` の定石と併走させます）。

## id: prompt-injection-isolation

- name: プロンプトインジェクション対策（外部コンテンツを命令として扱わない）
- 領域: code
- 適合する状況: LLM に外部由来のコンテンツ（ユーザー入力・Web ページ・文書・RAG の検索結果・メール等）を読ませる案件。外部テキストをシステムプロンプトと同じ文脈へそのまま連結する進み方が見えるとき。
- 叩き台:
  - Anti-direction: 外部由来のテキストを、開発者が書いた指示と同格の「命令」として扱わない。「指示に従わないようプロンプトで頼む」だけで対策済みとしない。
  - Invariant: 外部コンテンツはデータとして分離して渡し、モデルへの指示（システムプロンプト）と混ぜない。プロンプトインジェクションは起きうる前提で、モデルの背後に置く権限・実行できる操作を最小化し、重要な判断・操作はモデルの外側で検証する。
- 出典: OWASP Top 10 for LLM Applications 2025 — LLM01:2025 Prompt Injection（https://genai.owasp.org/llmrisk/llm01-prompt-injection/・取得 2026-07-04）

## id: llm-output-untrusted

- name: LLM 出力の安全な取り扱い（モデル出力を信頼できない入力として扱う）
- 領域: code
- 適合する状況: LLM の出力を下流で使う案件全般 — 生成テキストを画面へ描画する・生成したコード/SQL/シェルコマンドを実行する・出力をそのまま別の API へ渡す等。モデル出力を「自分たちが作った値」として無検証で流す進み方が見えるとき。
- 叩き台:
  - Anti-direction: モデルの出力を無検証で実行・描画・転送しない。「モデルが変なものを返すはずがない」を前提に下流を設計しない。
  - Invariant: LLM 出力はユーザー入力と同じ信頼できない値として扱い、使う文脈に応じた検証・エンコーディングを通す（HTML へ出すならエスケープ＝XSS 対策、SQL に使うならパラメータ化、コード・コマンドの実行はサンドボックス化か人の確認を挟む）。`code-security.md` の各定石と併走させる。
- 出典: OWASP Top 10 for LLM Applications 2025 — LLM05:2025 Improper Output Handling（https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/・取得 2026-07-04）

## id: llm-least-agency

- name: エージェントの過剰な権限防止（最小のツール・不可逆操作は人の承認）
- 領域: code
- 適合する状況: LLM にツール・関数呼び出し・プラグイン経由で操作を実行させる（エージェント）案件。広い権限の API キーや「何でもできる」汎用ツールをモデルへ渡す進み方が見えるとき。
- 叩き台:
  - Anti-direction: 当該タスクに必要以上の機能・権限・自律性をエージェントへ与えない。削除・支払い・外部送信のような高影響の操作を「便利だから」でモデルの判断だけに任せない。
  - Invariant: エージェントへ渡すツールと権限は当該タスクに必要な最小へ絞る（最小権限）。不可逆・高影響の操作（削除・支払い・外部への送信等）は実行前に人間の承認を挟む。エージェントの行動は記録し追跡可能にする。
- 出典: OWASP Top 10 for LLM Applications 2025 — LLM06:2025 Excessive Agency（https://genai.owasp.org/llmrisk/llm062025-excessive-agency/・取得 2026-07-04）

## id: llm-sensitive-info-boundary

- name: プロンプト経由の機微情報漏えい防止（送る前に最小化・システムプロンプトに秘密を置かない）
- 領域: code
- 適合する状況: 個人情報・機密データ・社外秘ロジックを扱うシステムに LLM を組み込む案件。ユーザーデータや秘密を無加工でプロンプト・コンテキストに詰めて外部のモデル API へ送る進み方が見えるとき。
- 叩き台:
  - Anti-direction: 機微情報（個人情報・認証情報・機密文書）を無加工で外部の LLM API へ送らない。システムプロンプトに秘密（鍵・内部ルール）を置いて「漏れない」と期待しない。
  - Invariant: モデルへ渡す前にデータを最小化・マスキングし、送ってよい範囲をデータ分類で決めておく。システムプロンプトは利用者側へ漏えいしうる前提で設計し、そこへ認証情報・秘密を置かない。モデル出力に機微情報が混ざって返らないかも検証する。
- 出典: OWASP Top 10 for LLM Applications 2025 — LLM02:2025 Sensitive Information Disclosure（https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/・取得 2026-07-04）／LLM07:2025 System Prompt Leakage（https://genai.owasp.org/llmrisk/llm072025-system-prompt-leakage/・取得 2026-07-04）
