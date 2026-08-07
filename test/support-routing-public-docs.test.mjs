// 公開文書における支援選択の意味契約を、文面・見出し・節順を固定せず検査する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const DOCS = Object.freeze({
  ja: Object.freeze({
    readme: "README.md",
    guide: "docs/guide.md",
    theory: "docs/theory.md",
  }),
  en: Object.freeze({
    readme: "README.en.md",
    guide: "docs/guide.en.md",
    theory: "docs/theory.en.md",
  }),
});

// Gemini CLI は専用の公開skill treeを持たず、Codex向け配布物を共有する。
const PUBLIC_SKILL_RESOLUTION = Object.freeze({
  claude: "claude",
  codex: "codex",
  gemini: "codex",
});

// これらは利用者へ示す行き先の一般ラベルであり、skill登録名ではない。
// 実在確認が必要な具体的な支援参照は、現在の文書ではbacktick内のintent-*名だけである。
const DOCUMENTED_DESTINATION_CONCEPTS = Object.freeze([
  "destination-available-support",
  "destination-support-candidate",
  "destination-one-question",
  "destination-existing-flow",
]);

// 1概念を複数の短いpatternで表す場合は配列にする。配列内の出現順は問わない。
const CONTRACTS = Object.freeze({
  readme: Object.freeze({
    "start-purpose": { ja: /目的/, en: /purpose/i },
    "start-deliverable": { ja: /作りたい成果物/, en: /deliverable[^\n]*create/i },
    "start-material": { ja: /手元の資料/, en: /materials?[^\n]*(?:already have|at hand)/i },
    "start-next-decision": { ja: /次に行いたい判断/, en: /next decision/i },
    "classification-does-not-determine-start": {
      ja: [/分類名/, /先に選ぶ必要はありません/],
      en: [/professional category or project type/i, /do not need to choose[^\n]*first/i],
    },
    "same-language-guide": { ja: /\]\(docs\/guide\.md\)/, en: /\]\(docs\/guide\.en\.md\)/ },
  }),
  guide: Object.freeze({
    "destination-available-support": { ja: /利用できる支援/, en: /Available support/i },
    "destination-support-candidate": { ja: /支援候補/, en: /Support candidate/i },
    "destination-one-question": { ja: /結果を変える確認一問/, en: /One outcome-changing question/i },
    "destination-existing-flow": { ja: /従来の進行/, en: /Existing flow/i },
    "material-ingestion-purpose": {
      ja: /何の判断に使うか/,
      en: /which decision it will support/i,
    },
    "material-ingestion-user-action": {
      ja: /利用者に `intent-from-spec` の実行を案内/,
      en: /guides you to run `intent-from-spec`/i,
    },
    "material-ingestion-return": {
      ja: /終了後にこの支援選択へ戻ります/,
      en: /returns to this support selection when that work finishes/i,
    },
    "material-ingestion-not-automatic": {
      ja: /資料の取込みは自動では始まりません/,
      en: /Material ingestion does not start automatically/i,
    },
    "question-known": { ja: /「既知」/, en: /`known`/i },
    "question-conflict": { ja: /「食い違い」/, en: /`conflict`/i },
    "question-outcome-unresolved": { ja: /「成果を変える未決事項」/, en: /`outcome-changing unresolved`/i },
    "question-non-impacting": { ja: /「今は影響しない事項」/, en: /`non-impacting for now`/i },
    "known-not-asked-again": {
      ja: /既知事項は聞き直しません/,
      en: /Known items are not asked again/i,
    },
    "question-includes-answer-impact": {
      ja: /回答が結果へ与える影響とともに確認/,
      en: /confirmed, together with how the answer affects the result/i,
    },
    "reuse-same-source-version": {
      ja: [/同じ出所・同じ版/, /再利用/, /重複を増やしません/],
      en: [/same source and version/i, /reused rather than duplicated/i],
    },
    "changed-material-only": {
      ja: /変更部分だけを見直します/,
      en: /only the changed part is re-evaluated/i,
    },
    "unknown-version-one-impactful-question": {
      ja: [/同じ版か不明/, /支援や次の質問が変わるときだけ一問/],
      en: [/version is uncertain/i, /one question is asked only if the difference would change/i],
    },
    "failure-input-insufficient": { ja: /入力が足りない/, en: /input is insufficient/i },
    "failure-support-not-selected": { ja: /支援を選べない/, en: /support cannot be selected/i },
    "failure-separates-readable-and-constraint": {
      ja: /読めた内容と読めなかった制約を分けて示します/,
      en: /separates what could be read from the access or reading constraint/i,
    },
    "failure-does-not-guess": {
      ja: /読めない内容を推測せず/,
      en: /does not guess at unreadable content/i,
    },
    "failure-small-outcome-changing-gaps": {
      ja: /結果を変える不足情報だけを一度に少数/,
      en: /only a small number of missing items that could change the result/i,
    },
    "change-candidate-explicit": { ja: /一つの変更候補として示します/, en: /shown as one change candidate/i },
    "change-candidate-proposed-change": { ja: /何をどう変える候補か/, en: /what change is being proposed/i },
    "change-candidate-provenance": { ja: /どこから得た情報か/, en: /where the information came from/i },
    "change-candidate-reason": { ja: /なぜ変更を提案するのか/, en: /why the change is proposed/i },
    "change-candidate-made-impact": { ja: /変更した場合の影響範囲/, en: /scope affected if the change is made/i },
    "change-candidate-not-made-impact": { ja: /変更しない場合の影響/, en: /effect of not making the change/i },
    "current-user-approval": {
      ja: /承認できるのは、いま intent-planner を利用している人/,
      en: /Only the person currently using intent-planner can approve/i,
    },
    "unapproved-not-canonical": {
      ja: /承認されるまでは[^\n]*正本へ反映しません/,
      en: /Until that approval, it is not reflected in canonical Intent artifacts/i,
    },
    "partial-approval-only": {
      ja: /一部だけが承認された場合[^\n]*承認された範囲だけ/,
      en: /approves only part[^\n]*only that approved scope/i,
    },
    "approved-scope-existing-process": {
      ja: /既存の正規の更新工程から反映/,
      en: /existing normal update process/i,
    },
    "external-instruction-not-authoritative": {
      ja: [/外部資料/, /命令や断定/, /それだけで要求にはしません/],
      en: [/instruction or categorical claim in external material/i, /does not become a requirement by itself/i],
    },
    "external-source-and-basis-checked": {
      ja: /出所と根拠を確認/,
      en: /source and basis are checked/i,
    },
    "external-only-user-adopted-scope": {
      ja: /現在の利用者が採用すると決めた範囲だけ/,
      en: /only the scope the current user decides to adopt/i,
    },
    "external-support-draft-limit": {
      ja: /確認すべき事項と[^\n]*依頼文の下書きを作るところまで/,
      en: /identifying the points that need confirmation and drafting the request/i,
    },
    "no-external-contact": {
      ja: [/外部の相手へ連絡したり/, /回答や指示を行ったりはしません/],
      en: /does not contact an external approver or reply to or instruct one/i,
    },
    "stage-decide-before": { ja: /次段階前に決める/, en: /Decide before the next stage/i },
    "stage-decide-later": { ja: /後に決める/, en: /Decide later/i },
    "stage-investigate-or-test": { ja: /次段階で調べる・試す/, en: /Investigate or test in the next stage/i },
    "stage-out-of-scope": { ja: /今回の範囲外/, en: /Out of scope for this work/i },
    "continuation-purpose": { ja: /次段階の目的/, en: /purpose of the next stage/i },
    "continuation-evidence": { ja: /得たい結果または証拠/, en: /result or evidence to obtain/i },
    "continuation-constraints": { ja: /進行中も守る制約/, en: /constraints that still apply while proceeding/i },
    "continuation-user-decision": {
      ja: /終了後に利用者が行う判断/,
      en: /decision the user will make after the stage ends/i,
    },
    "poc-learning-subject-remains-unresolved": {
      ja: /学ぶ対象は未決のまま保ち/,
      en: /subject of the learning remains unresolved/i,
    },
    "poc-only-authorized-trial": {
      ja: /許可された試行の外へは進みません/,
      en: /does not proceed beyond the authorized trial/i,
    },
    "commitment-stage": {
      ja: /公開する内容、実装する契約、または発注する範囲・受入条件/,
      en: /published, the contract to be implemented, or the procurement scope and acceptance conditions/i,
    },
    "commitment-stops-affected-scope": {
      ja: /その影響範囲だけを止めて/,
      en: /stop only the affected scope/i,
    },
    "unresolved-does-not-stop-whole-case": {
      ja: /案件全体を一律に止めず/,
      en: /does not stop the whole case/i,
    },
    "procurement-example-not-default": {
      ja: /発注は[^\n]*一例であり[^\n]*通常案件の既定の流れにはなりません/,
      en: /Procurement is only an example[^\n]*not the default flow/i,
    },
  }),
  theory: Object.freeze({
    "profession-does-not-determine-support": {
      ja: /必要な支援は職種名や案件名だけでは決まりません/,
      en: /profession or project label cannot determine/i,
    },
    "decision-information-purpose": { ja: /目的/, en: /purpose/i },
    "decision-information-deliverable": { ja: /作りたい成果物/, en: /intended deliverable/i },
    "decision-information-material": { ja: /利用できる資料/, en: /available material/i },
    "decision-information-next-decision": { ja: /次に行う判断/, en: /next decision/i },
    "transient-known": { ja: /すでに分かっていること/, en: /already known/i },
    "transient-conflict": { ja: /食い違っていること/, en: /what conflicts/i },
    "transient-outcome-unresolved": {
      ja: /成果を変え得る未決事項/,
      en: /unresolved and could change the outcome/i,
    },
    "transient-non-impacting": {
      ja: /今は成果に影響しないこと/,
      en: /does not affect the outcome yet/i,
    },
    "transient-not-saved-state": {
      ja: [/一時的/, /保存されている質問の状態/, /上書きする正本ではありません/],
      en: [/temporarily separates/i, /does not overwrite saved question states/i],
    },
    "evidence-receipt-not-intent-approval": {
      ja: /資料、調査結果、外部からの助言を受け取る責任と、Intent を変更する責任も分けます/,
      en: /Receiving evidence or advice is also separate from approving a change to Intent/i,
    },
    "external-imperative-has-no-authority": {
      ja: /断定的に書かれていることだけでは[^\n]*変える権限になりません/,
      en: /neither a citation nor an imperative in an external document grants authority/i,
    },
    "external-instruction-not-auto-promoted": {
      ja: /外部資料に命令が含まれていても自動的に要求へ昇格させず/,
      en: /External instructions remain candidates/i,
    },
    "learning-stage-explicit-scope": {
      ja: /PoC のように情報を得る段階[^\n]*目的と制約を明示した範囲だけ/,
      en: /learning stage such as a PoC[^\n]*within explicit objectives and constraints/i,
    },
    "commitment-stage-affected-scope": {
      ja: /公開、実装、発注のように[^\n]*影響する範囲を進めません/,
      en: /commitment stage such as publication, implementation, or placing an order[^\n]*affected scope/i,
    },
  }),
});

// 肯定条件が残っていても、同じ文書に安全境界を反転する説明があれば拒否する。
// 文面そのものではなく、危険な主語・動作・確定性の組合せを短いpatternで検出する。
const NEGATIVE_CONTRACTS = Object.freeze({
  readme: Object.freeze({
    "support-fixed-by-identity": {
      ja: [
        /(?:職種|属性|職種(?:や|・|、)属性)(?:だけ|のみ)(?:で|に基づいて)[^\n]{0,30}支援(?:内容)?(?:を|が)[^\n]{0,20}(?:固定|決定)(?:します|されます)/,
        /(?:目的|成果物|資料|次の判断)(?:を)?(?:見ず|考慮せず)[^\n]{0,30}(?:職種|属性)(?:から|で)[^\n]{0,30}支援(?:を)?(?:選び|決め)ます/,
      ],
      en: [
        /support (?:is|must be) (?:fixed|determined) solely by[^\n]*(?:profession|role|attributes?)/i,
        /(?:purpose|deliverable) is ignored[^\n]*(?:role|profession|attributes?) alone (?:decides|determines)[^\n]*(?:support|assistance)/i,
      ],
    },
    "procurement-default-required": {
      ja: [
        /(?:RFP|発注|ベンダー対応)(?:は|を)[^\n]{0,30}(?:全案件|すべての案件|どの案件)(?:で|の)[^\n]{0,30}(?:必須(?:の流れ)?です|既定の流れ(?:です|とします))/,
        /(?:案件の種類|案件の文脈)を問わず[^\n]{0,30}(?:必ず|常に)[^\n]{0,20}(?:RFP|発注|ベンダー対応)(?:を)?(?:(?:作成|実施)します|行います|求めます)/,
      ],
      en: [
        /(?:RFP|procurement|vendor (?:communication|management)) is (?:a )?(?:mandatory|required|default) (?:step|flow) for (?:all|every) (?:case|project)/i,
        /regardless of (?:project|case) (?:type|context)[^\n]{0,30}(?:always|must)[^\n]{0,30}(?:RFP|procurement|vendor)/i,
      ],
    },
  }),
  guide: Object.freeze({
    "material-ingestion-automatic": {
      ja: [
        /資料(?:の)?取込み(?:を|は)[^\n]{0,20}自動(?:で|的に)?(?:開始|実行|行)(?:します|されます)/,
        /資料を(?:渡す|提示する)と[^\n]{0,30}(?:案内|確認|利用者の操作)(?:を)?(?:挟まず|待たず)[^\n]{0,30}(?:取込み|取り込み)(?:処理)?まで(?:進み|行い)ます/,
      ],
      en: [
        /material ingestion (?:starts|runs|is performed) automatically/i,
        /providing (?:a document|material)[^\n]{0,20}(?:immediately|automatically) runs? ingestion[^\n]{0,30}without (?:asking|waiting for) the user/i,
      ],
    },
    "unapproved-candidate-canonical-write": {
      ja: [
        /未承認(?:の)?(?:変更)?候補(?:も|を|は)[^\n]{0,40}正本(?:へ|に)[^\n]{0,20}(?:直ちに|即時に|自動的に)?反映します/,
        /(?:利用者の)?承認を待たず[^\n]{0,30}(?:候補|変更)[^\n]{0,30}(?:Intent Tree|Compass|packet|正本)(?:へ|に)[^\n]{0,20}(?:書き込み|反映)(?:ます|します)/,
      ],
      en: [
        /unapproved (?:change )?candidates? (?:are|will be) (?:immediately |automatically )?reflected in canonical Intent artifacts/i,
        /(?:candidates?|changes?) (?:are|will be) (?:written|applied)[^\n]{0,30}(?:Intent Tree|canonical artifacts?)[^\n]{0,30}(?:before|without) (?:the )?(?:user(?:'s)? )?approval/i,
      ],
    },
    "external-instruction-auto-requirement": {
      ja: [
        /外部(?:資料|文書)(?:の|に含まれる)[^\n]{0,20}(?:命令|断定)(?:は|を)[^\n]{0,20}(?:自動的に|そのまま)(?:要求|要件)へ(?:昇格|反映)(?:します|されます)/,
        /(?:出所|根拠)(?:を)?確かめる前(?:でも)?[^\n]{0,30}外部(?:資料|文書)[^\n]{0,30}(?:要件|要求)(?:として)?(?:(?:採用)します|扱います)/,
      ],
      en: [
        /(?:instructions?|categorical claims?) in external (?:materials?|documents?) (?:are|become) automatically (?:promoted|converted) (?:to|into) requirements?/i,
        /before (?:checking|verifying) (?:its|the) source[^\n]{0,40}(?:outside|external) document[^\n]{0,30}(?:adopted|treated) as a requirement/i,
      ],
    },
    "ai-external-contact-reply-instruction": {
      ja: [
        /AI(?:が|は)[^\n]{0,20}外部(?:の相手|の承認者|のベンダー)?(?:へ|に)[^\n]{0,20}(?:(?:連絡|回答|指示)します|(?:回答|指示)を行います)/,
        /(?:外部|ベンダー)(?:との|への)[^\n]{0,20}(?:質疑|連絡|やり取り)(?:は|を)[^\n]{0,20}AI(?:が|は)[^\n]{0,20}(?:利用者に代わって|代理で)(?:送受信|対応|実施)します/,
      ],
      en: [
        /the AI (?:contacts?|repl(?:y|ies) to|instructs?) external (?:parties|approvers|vendors)/i,
        /the AI handles? (?:correspondence|communication) with (?:external parties|vendors) on the user's behalf/i,
      ],
    },
    "external-response-draft": {
      ja: [
        /AI(?:が|は)[^\n]{0,20}外部向け(?:の)?回答文(?:の)?下書き(?:まで)?(?:を)?(?:作成|作り)(?:します|ます)/,
        /(?:相手|ベンダー)に送る(?:返答|回答)(?:も|を)[^\n]{0,20}AI(?:が|は)[^\n]{0,20}(?:作成対象|支援範囲)に含めます/,
      ],
      en: [
        /the AI (?:also )?drafts? responses? (?:to|for) external (?:parties|approvers|vendors)/i,
        /drafting (?:what to answer|a reply) (?:to )?(?:the vendor|an external party) is included in AI support/i,
      ],
    },
    "single-unresolved-stops-whole-case": {
      ja: [
        /未決事項が一件でも(?:あれば|残れば)[^\n]{0,20}案件全体を(?:一律に)?停止(?:します|させます)/,
        /(?:一件|小さな)[^\n]{0,10}未決(?:事項)?が残った時点で[^\n]{0,30}無関係な作業(?:も|を)[^\n]{0,20}(?:止めます|進めません)/,
      ],
      en: [
        /(?:one|a single) unresolved (?:item|matter) (?:will |must |always )?stops? the (?:entire|whole) (?:case|project)/i,
        /if any (?:question|matter) remains (?:open|unresolved)[^\n]{0,30}(?:even )?unrelated work must wait/i,
      ],
    },
  }),
  theory: Object.freeze({
    "support-fixed-by-identity": {
      ja: /(?:職種|属性|職種(?:や|・|、)属性)(?:だけ|のみ)(?:で|に基づいて)[^\n]{0,30}支援(?:内容)?(?:を|が)[^\n]{0,20}(?:固定|決定)(?:します|されます)/,
      en: /support (?:is|must be) (?:fixed|determined) solely by[^\n]*(?:profession|role|attributes?)/i,
    },
    "external-instruction-auto-requirement": {
      ja: /外部(?:資料|文書)(?:の|に含まれる)[^\n]{0,20}(?:命令|断定)(?:は|を)[^\n]{0,20}(?:自動的に|そのまま)(?:要求|要件)へ(?:昇格|反映)(?:します|されます)/,
      en: /(?:instructions?|categorical claims?) in external (?:materials?|documents?) (?:are|become) automatically (?:promoted|converted) (?:to|into) requirements?/i,
    },
    "single-unresolved-stops-whole-case": {
      ja: /未決事項が一件でも(?:あれば|残れば)[^\n]{0,20}案件全体を(?:一律に)?停止(?:します|させます)/,
      en: /(?:one|a single) unresolved (?:item|matter) (?:will |must |always )?stops? the (?:entire|whole) (?:case|project)/i,
    },
  }),
});

const CONTRADICTION_MUTATIONS = Object.freeze([
  { name: "identity-profession", role: "readme", concept: "support-fixed-by-identity", ja: "職種だけで支援内容を固定します。", en: "Support is fixed solely by the user's profession." },
  { name: "identity-attributes", role: "readme", concept: "support-fixed-by-identity", ja: "属性だけで支援内容を固定します。", en: "Support is determined solely by the user's attributes." },
  { name: "identity-ignores-purpose", role: "readme", concept: "support-fixed-by-identity", ja: "目的を見ず、職種から支援を決めます。", en: "Purpose is ignored, and the user's role alone determines the assistance used." },
  { name: "procurement-default", role: "readme", concept: "procurement-default-required", ja: "RFPは全案件で必須の流れです。", en: "RFP is a mandatory flow for every project." },
  { name: "procurement-regardless-of-context", role: "readme", concept: "procurement-default-required", ja: "案件の種類を問わず、必ずRFPを作成します。", en: "Regardless of project type, every case must include an RFP." },
  { name: "automatic-material-ingestion", role: "guide", concept: "material-ingestion-automatic", ja: "資料の取込みを自動で開始します。", en: "Material ingestion starts automatically." },
  { name: "material-bypasses-user-action", role: "guide", concept: "material-ingestion-automatic", ja: "資料を渡すと、利用者の操作を待たず取り込み処理まで進みます。", en: "Providing a document immediately runs ingestion without asking the user to start it." },
  { name: "unapproved-canonical-write", role: "guide", concept: "unapproved-candidate-canonical-write", ja: "未承認の変更候補も正本へ直ちに反映します。", en: "Unapproved change candidates are immediately reflected in canonical Intent artifacts." },
  { name: "canonical-write-before-approval", role: "guide", concept: "unapproved-candidate-canonical-write", ja: "利用者の承認を待たず、候補をIntent Treeへ書き込みます。", en: "Candidates are written to the Intent Tree before user approval." },
  { name: "external-instruction-promotion", role: "guide", concept: "external-instruction-auto-requirement", ja: "外部資料の命令は自動的に要求へ昇格します。", en: "Instructions in external materials are automatically promoted to requirements." },
  { name: "external-content-adopted-before-source-check", role: "guide", concept: "external-instruction-auto-requirement", ja: "出所を確かめる前でも、外部文書の内容を要件として採用します。", en: "Before checking its source, a statement in an external document is adopted as a requirement." },
  { name: "ai-external-contact", role: "guide", concept: "ai-external-contact-reply-instruction", ja: "AIが外部の相手へ連絡します。", en: "The AI contacts external parties." },
  { name: "ai-external-reply", role: "guide", concept: "ai-external-contact-reply-instruction", ja: "AIが外部の相手へ回答します。", en: "The AI replies to external parties." },
  { name: "ai-external-instruction", role: "guide", concept: "ai-external-contact-reply-instruction", ja: "AIが外部の相手へ指示を行います。", en: "The AI instructs external parties." },
  { name: "ai-handles-vendor-correspondence", role: "guide", concept: "ai-external-contact-reply-instruction", ja: "ベンダーとのやり取りはAIが利用者に代わって対応します。", en: "The AI handles correspondence with vendors on the user's behalf." },
  { name: "external-response-draft", role: "guide", concept: "external-response-draft", ja: "AIは外部向けの回答文の下書きまで作成します。", en: "The AI also drafts responses to external parties." },
  { name: "vendor-reply-in-support-scope", role: "guide", concept: "external-response-draft", ja: "ベンダーに送る返答もAIが作成対象に含めます。", en: "Drafting what to answer the vendor is included in AI support." },
  { name: "single-unresolved-whole-stop", role: "guide", concept: "single-unresolved-stops-whole-case", ja: "未決事項が一件でもあれば案件全体を停止します。", en: "A single unresolved item stops the entire project." },
  { name: "unrelated-work-waits-for-any-open-question", role: "guide", concept: "single-unresolved-stops-whole-case", ja: "小さな未決が残った時点で、無関係な作業も進めません。", en: "If any question remains open, even unrelated work must wait." },
  { name: "theory-identity-fix", role: "theory", concept: "support-fixed-by-identity", ja: "職種や属性だけで支援内容を固定します。", en: "Support is fixed solely by the user's profession or attributes." },
  { name: "theory-external-claim-promotion", role: "theory", concept: "external-instruction-auto-requirement", ja: "外部文書の断定はそのまま要件へ昇格します。", en: "Categorical claims in external documents are automatically converted into requirements." },
  { name: "theory-single-unresolved-whole-stop", role: "theory", concept: "single-unresolved-stops-whole-case", ja: "未決事項が一件でも残れば案件全体を一律に停止します。", en: "One unresolved matter stops the whole case." },
]);

function readDocument(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath}: document-exists`);
  return fs.readFileSync(absolutePath, "utf8");
}

function assertConcepts(subject, relativePath, language, contract) {
  for (const [conceptKey, languagePatterns] of Object.entries(contract)) {
    const patterns = Array.isArray(languagePatterns[language])
      ? languagePatterns[language]
      : [languagePatterns[language]];
    patterns.forEach((pattern, index) => {
      const suffix = patterns.length === 1 ? "" : `:${index + 1}`;
      assert.match(subject, pattern, `${relativePath}: ${conceptKey}${suffix}`);
    });
  }
}

function assertNoNegativeMeanings(subject, relativePath, language, contract) {
  for (const [conceptKey, languagePatterns] of Object.entries(contract)) {
    const patterns = Array.isArray(languagePatterns[language])
      ? languagePatterns[language]
      : [languagePatterns[language]];
    patterns.forEach((pattern, index) => {
      const suffix = patterns.length === 1 ? "" : `:${index + 1}`;
      assert.doesNotMatch(subject, pattern, `${relativePath}: forbidden:${conceptKey}${suffix}`);
    });
  }
}

function assertCommandsArePublic(document, relativePath, language) {
  const commands = new Set([...document.matchAll(/`\/?(intent-[a-z0-9-]+)`/g)].map((match) => match[1]));
  assert.ok(commands.size > 0, `${relativePath}: public-command-reference`);
  for (const command of commands) {
    for (const [consumer, skillTree] of Object.entries(PUBLIC_SKILL_RESOLUTION)) {
      const skillPath = `templates/${language}/${skillTree}/skills/${command}/SKILL.md`;
      assert.ok(
        fs.existsSync(path.join(ROOT, skillPath)),
        `${relativePath}: public-command:${command}:${consumer} (${skillPath})`,
      );
    }
  }
}

for (const role of ["readme", "guide", "theory"]) {
  test(`${role}: 日本語版と英語版が同じ肯定・否定契約を満たす`, () => {
    const expectedKeys = Object.keys(CONTRACTS[role]);
    assert.ok(expectedKeys.length > 0, `${role}: concept-keys`);
    assert.ok(Object.keys(NEGATIVE_CONTRACTS[role]).length > 0, `${role}: negative-concept-keys`);
    for (const language of ["ja", "en"]) {
      const relativePath = DOCS[language][role];
      const document = readDocument(relativePath);
      assertConcepts(document, relativePath, language, CONTRACTS[role]);
      assertNoNegativeMeanings(document, relativePath, language, NEGATIVE_CONTRACTS[role]);
    }
  });
}

test("ガイドの四つの一般ラベルをskill登録名として扱わない", () => {
  for (const conceptKey of DOCUMENTED_DESTINATION_CONCEPTS) {
    assert.ok(CONTRACTS.guide[conceptKey], `guide: ${conceptKey}`);
  }
});

test("6公開文書が参照するintent-*は、各利用環境の公開skill入口に実在する", () => {
  for (const language of ["ja", "en"]) {
    for (const relativePath of Object.values(DOCS[language])) {
      assertCommandsArePublic(readDocument(relativePath), relativePath, language);
    }
  }
});

test("正しい文を残した矛盾追記を、日英の各checkerが概念名付きで拒否する", () => {
  for (const mutation of CONTRADICTION_MUTATIONS) {
    for (const language of ["ja", "en"]) {
      const relativePath = DOCS[language][mutation.role];
      const baseline = readDocument(relativePath);
      const contradiction = mutation[language];
      const mutationName = `${mutation.role}:${language}:${mutation.name}`;
      const mutated = `${baseline}\n${contradiction}\n`;

      assert.ok(NEGATIVE_CONTRACTS[mutation.role][mutation.concept], `${mutationName}: expected-concept-exists`);
      assert.notEqual(mutated, baseline, `${mutationName}: mutation-applied`);
      assert.ok(mutated.endsWith(`\n${contradiction}\n`), `${mutationName}: contradiction-appended`);
      assertConcepts(mutated, relativePath, language, CONTRACTS[mutation.role]);
      assert.throws(
        () => assertNoNegativeMeanings(
          mutated,
          relativePath,
          language,
          NEGATIVE_CONTRACTS[mutation.role],
        ),
        new RegExp(`forbidden:${mutation.concept}`),
        `${mutationName}: contradiction-rejected-by-expected-concept`,
      );
    }
  }
});

test("発注手順を必須化しない安全な否定文を日英で受理する", () => {
  const safeStatements = Object.freeze({
    ja: "RFPは全案件で必須ではありません。",
    en: "RFP is not a mandatory step for every project.",
  });
  for (const language of ["ja", "en"]) {
    assert.doesNotThrow(() => assertNoNegativeMeanings(
      safeStatements[language],
      `safe-counterexample:${language}:procurement-default`,
      language,
      NEGATIVE_CONTRACTS.readme,
    ));
  }
});
