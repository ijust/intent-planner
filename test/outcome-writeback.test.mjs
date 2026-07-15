// 成果の物さしと成果を書き戻す経路の機能固有契約テスト。
// node:test 標準・依存ゼロ。タスクごとに対象契約を追加する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TEMPLATES = path.join(REPO_ROOT, "templates");

function read(...parts) {
  const filePath = path.join(TEMPLATES, ...parts);
  assert.ok(fs.existsSync(filePath), `ファイルが実在する: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

const treeJa = read("ja", "intent", "intent-tree.md");
const treeEn = read("en", "intent", "intent-tree.md");
const deltasJa = read("ja", "intent", "deltas.md");
const deltasEn = read("en", "intent", "deltas.md");
const deltasReadmeJa = read("ja", "intent", "deltas", "README.md");
const deltasReadmeEn = read("en", "intent", "deltas", "README.md");

const WRITEBACK_SKILL = ["skills", "intent-writeback", "SKILL.md"];
const WRITEBACK_PROTOCOL = ["skills", "intent-writeback", "rules", "writeback-protocol.md"];
const VALIDATE_SKILL = ["skills", "intent-validate", "SKILL.md"];
const VALIDATE_CHECKS = ["skills", "intent-validate", "rules", "validate-checks.md"];
const STATUS_SKILL = ["skills", "intent-status", "SKILL.md"];
const OVERVIEW_SKILL = ["skills", "intent-overview", "SKILL.md"];
const OVERVIEW_AGGREGATE = ["skills", "intent-overview", "rules", "aggregate-sources.md"];
const OVERVIEW_PROGRESS = ["skills", "intent-overview", "rules", "progress-readout.md"];

function writeback(lang, agent, parts) {
  return read(lang, agent, ...parts);
}

test("Intent Tree: 成果の物さし・既存の計測基準・承認済み現在結果を同じL1で独立して保持できる", () => {
  for (const label of ["計測基準:", "成果の物さし:", "成果についての学び:"]) {
    assert.ok(treeJa.includes(label), `日本語L1契約に ${label} がある`);
  }
  assert.match(treeJa, /成果の物さし.*任意の独立した1行/);
  assert.match(treeJa, /成果についての学び.*人が承認した現在の結果/);
  assert.match(treeJa, /計測基準.*自動転用しない/);
  assert.ok(
    treeJa.includes(
      "成果についての学び: <価値が出た | 価値が出なかった | まだ分からない> — <生データを含まない要約>（記録: <delta参照>）",
    ),
    "日本語の現在結果行が結果3値・要約・delta参照を保持する",
  );
  assert.match(treeJa, /成果についての学び.*L1 ごとに最大1行/);
});

test("Intent Tree: 成果の物さしと検査オラクルの用途を区別して説明する", () => {
  assert.match(treeJa, /`成果の物さし:`.*利用者価値/);
  assert.match(treeJa, /`検査オラクル:`.*守る約束.*破損/);
  assert.match(treeJa, /別の欄/);
});

test("Intent Tree英語版: 日本語版と同じ3つの独立行と非転用契約を持つ", () => {
  for (const label of ["Measurement criteria:", "Outcome measure:", "Outcome learning:"]) {
    assert.ok(treeEn.includes(label), `英語L1契約に ${label} がある`);
  }
  assert.match(treeEn, /Outcome measure.*optional, independent line/);
  assert.match(treeEn, /Outcome learning.*current human-approved result/);
  assert.ok(
    treeEn.includes(
      "Outcome learning: <value delivered | value not delivered | not known yet> — <summary without raw data> (record: <delta reference>)",
    ),
    "英語の現在結果行が結果3値・要約・delta参照を保持する",
  );
  assert.match(treeEn, /Outcome learning.*at most one line per L1/);
  assert.match(treeEn, /must not be automatically reused/);
  assert.match(treeEn, /`Outcome measure:`.*user value/);
  assert.match(treeEn, /`Verification oracle:`.*protected promise.*broken/);
});

const DISCOVER_RULE = ["skills", "intent-discover", "rules", "designer-questions.md"];

test("discover日本語版: 人が明示した成果の物さしだけを独立行へ記録する", () => {
  const claude = read("ja", "claude", ...DISCOVER_RULE);
  const codex = read("ja", "codex", ...DISCOVER_RULE);
  assert.equal(codex, claude, "日本語のdiscover規則がclaude/codex間で一致する");
  assert.match(claude, /利用者が明示した場合にだけ/);
  assert.match(claude, /`成果の物さし:` という任意の独立行/);
  assert.match(claude, /`計測基準:`.*推測.*自動転用しない/);
  assert.match(claude, /`検査オラクル:`.*混ぜない/);
});

test("discover英語版: 人が明示した成果の物さしだけを独立行へ記録する", () => {
  const claude = read("en", "claude", ...DISCOVER_RULE);
  const codex = read("en", "codex", ...DISCOVER_RULE);
  assert.equal(codex, claude, "英語のdiscover規則がclaude/codex間で一致する");
  assert.match(claude, /only when the user explicitly states it/);
  assert.match(claude, /optional, independent `Outcome measure:` line/);
  assert.match(claude, /must not infer or automatically reuse `Measurement criteria:`/);
  assert.match(claude, /[Dd]o not mix it with `Verification oracle:`/);
});

test("delta日本語版: 成果の観測を必要な項目と既存状態で反復記録できる", () => {
  assert.match(deltasJa, /### 成果についての学び（任意・観測ごとに追記）/);
  assert.match(deltasJa, /#### 観測: <ISO 8601 日時または人が区別できる名前>/);
  for (const field of [
    "Status: pending | promoted (<昇格日>) | closed (<クローズ日>)",
    "対象L1: <Intent Tree の L1 項目の逐語引用>",
    "対象L1の位置: <同じ逐語引用が複数ある場合の周辺見出しまたは位置 | 不要>",
    "結果: 価値が出た | 価値が出なかった | まだ分からない",
    "要約: <生データを貼らない結果の要約>",
    "誰が計測したか: <計測者または確認者>",
    "いつ計測したか: <観測日時>",
    "どこで計測したか: <計測元または参照元>",
  ]) {
    assert.ok(deltasJa.includes(field), `日本語の成果ブロックに ${field} がある`);
  }
  assert.match(deltasJa, /成果の物さし.*未記入.*記録を受け付け/);
  assert.match(deltasJa, /過去の観測を上書きせず/);
  assert.match(deltasJa, /ユーザビリティ検証.*単一の利用者の声.*同じ観測ブロック/);
});

test("delta英語版: 日本語版と同じ成果項目と反復履歴を持つ", () => {
  assert.match(deltasEn, /### Outcome learning \(optional; append once per observation\)/);
  assert.match(deltasEn, /#### Observation: <ISO 8601 datetime or a human-readable distinguishing name>/);
  for (const field of [
    "Status: pending | promoted (<promotion date>) | closed (<close date>)",
    "Target L1: <verbatim quote of the L1 item in Intent Tree>",
    "Target L1 location: <surrounding heading or location when the same quote appears more than once | not needed>",
    "Result: value delivered | value not delivered | not known yet",
    "Summary: <summary of the result without pasting raw data>",
    "Who measured: <measurer or reviewer>",
    "When measured: <observation datetime>",
    "Where measured: <measurement source or reference source>",
  ]) {
    assert.ok(deltasEn.includes(field), `英語の成果ブロックに ${field} がある`);
  }
  assert.match(deltasEn, /outcome measure.*missing.*accept the record/i);
  assert.match(deltasEn, /without overwriting past observations/i);
  assert.match(deltasEn, /usability study.*single user's feedback.*same observation block/i);
});

test("delta分割規約: packet単位ファイルで観測を追記し、生データは要約する", () => {
  assert.match(deltasReadmeJa, /同じ意図.*観測.*追記/);
  assert.match(deltasReadmeJa, /過去の記録を上書きしない/);
  assert.match(deltasReadmeJa, /生データ.*要約/);
  assert.match(deltasReadmeEn, /same intent.*append.*outcome observation/i);
  assert.match(deltasReadmeEn, /never overwrite past records/i);
  assert.match(deltasReadmeEn, /raw data.*summary/i);
});

test("成果分岐: 明示されたときだけ選び、曖昧な指示は操作種別を確認する", () => {
  const skillJa = writeback("ja", "claude", WRITEBACK_SKILL);
  const protocolJa = writeback("ja", "claude", WRITEBACK_PROTOCOL);
  assert.match(skillJa, /「成果についての学び」を明示.*成果分岐/s);
  assert.match(skillJa, /操作種別.*確認.*回答を待つ/s);
  assert.match(protocolJa, /実装学習.*成果についての学び.*推測しない/s);
  assert.match(protocolJa, /通常の実装学習.*従来どおり/s);
});

test("成果分岐: archiveを含むPacketと対象L1を一意に特定できなければ待つ", () => {
  const protocolJa = writeback("ja", "claude", WRITEBACK_PROTOCOL);
  assert.match(protocolJa, /5段優先順.*変更しない/s);
  assert.match(protocolJa, /active\/.*archive\/.*対象 packet/s);
  assert.match(protocolJa, /対象L1.*逐語引用/);
  assert.match(protocolJa, /同じ逐語引用.*複数.*利用者.*選択.*待つ/s);
  assert.match(protocolJa, /自動.*対応づけない/);
});

test("成果分岐: 不足と重複疑いは通知してpending観測を追記する", () => {
  const protocolJa = writeback("ja", "claude", WRITEBACK_PROTOCOL);
  assert.match(protocolJa, /成果の物さし.*未記入.*受け付け/s);
  assert.match(protocolJa, /出所.*不足.*受け付け/s);
  assert.match(protocolJa, /重複.*疑い.*自動.*削除.*統合.*しない/s);
  assert.match(protocolJa, /新しい.*pending.*観測.*追記/s);
});

test("成果分岐: Packet完了処理と外部取得・自動判定・バグ分類を実行しない", () => {
  const skillJa = writeback("ja", "claude", WRITEBACK_SKILL);
  const protocolJa = writeback("ja", "claude", WRITEBACK_PROTOCOL);
  for (const field of ["state", "closed_at", "spec_refs", "配置場所", "index"]) {
    assert.match(protocolJa, new RegExp(`${field}.*変更しない`));
  }
  assert.match(skillJa, /成果分岐.*Step 6.*完了処理.*実行しない/s);
  assert.match(protocolJa, /外部.*取得.*行わない/s);
  assert.match(protocolJa, /自動.*スコア.*判定.*行わない/s);
  assert.match(protocolJa, /バグ分類.*自動.*統合.*しない/s);
  assert.match(protocolJa, /生データ.*保存.*要約/);
});

test("成果分岐: rulesの同一言語バイト等価とSKILLの利用者能力を保つ", () => {
  for (const lang of ["ja", "en"]) {
    assert.equal(
      writeback(lang, "codex", WRITEBACK_PROTOCOL),
      writeback(lang, "claude", WRITEBACK_PROTOCOL),
      `${lang}/writeback-protocol.mdが一致する`,
    );
    for (const agent of ["claude", "codex"]) {
      const skill = writeback(lang, agent, WRITEBACK_SKILL);
      const explicit = lang === "ja" ? /成果についての学び.*明示/ : /explicitly says "outcome learning"/;
      const skipCompletion = lang === "ja" ? /Step 6.*実行しない/s : /do not run Step 6/s;
      assert.match(skill, explicit, `${lang}/${agent}に明示的な成果分岐がある`);
      assert.match(skill, skipCompletion, `${lang}/${agent}が成果pendingで完了処理を飛ばす`);
    }
  }
});

test("成果承認: pendingの間はTreeを変えず、人の承認時だけ対象L1へ投影する", () => {
  const skillJa = writeback("ja", "claude", WRITEBACK_SKILL);
  const protocolJa = writeback("ja", "claude", WRITEBACK_PROTOCOL);
  assert.match(skillJa, /成果分岐.*人の承認.*まで.*intent-tree\.md.*変更しない/s);
  assert.match(skillJa, /承認した場合だけ.*対象L1.*成果についての学び.*追加.*置換/s);
  assert.match(protocolJa, /pending.*間.*Intent Tree.*バイト単位で変更しない/s);
  assert.match(protocolJa, /人が明示的に承認した場合だけ.*対象L1.*投影/s);
});

test("成果承認: 結果3値を読み替えず、承認記録をpromotedにする", () => {
  const protocolJa = writeback("ja", "claude", WRITEBACK_PROTOCOL);
  for (const result of ["価値が出た", "価値が出なかった", "まだ分からない"]) {
    assert.match(
      protocolJa,
      new RegExp(`${result}.*読み替えず.*成果についての学び`, "s"),
      `${result}をそのままL1へ反映する`,
    );
  }
  assert.match(protocolJa, /承認した観測.*Status.*promoted.*更新/s);
  assert.match(protocolJa, /結果.*要約.*delta参照.*現在結果行/s);
});

test("成果見送り: 観測をclosedとして残し、Intent Treeを変更しない", () => {
  const skillJa = writeback("ja", "claude", WRITEBACK_SKILL);
  const protocolJa = writeback("ja", "claude", WRITEBACK_PROTOCOL);
  assert.match(skillJa, /見送った場合.*closed.*観測.*削除しない.*intent-tree\.md.*変更しない/s);
  assert.match(protocolJa, /見送り.*Status.*closed.*更新/s);
  assert.match(protocolJa, /見送った観測.*削除しない.*Intent Tree.*バイト単位で変更しない/s);
});

test("成果承認: L1を再読して一意な場合だけ最新1行へ置換し、過去観測を保持する", () => {
  const protocolJa = writeback("ja", "claude", WRITEBACK_PROTOCOL);
  assert.match(protocolJa, /承認時.*Intent Tree.*再読.*対象L1.*逐語引用.*一意/s);
  assert.match(protocolJa, /同じ逐語引用.*複数.*投影しない.*利用者.*選択.*待つ/s);
  assert.match(protocolJa, /成果についての学び:.*L1.*最大1行/s);
  assert.match(protocolJa, /すでに.*成果についての学び:.*ある.*最新.*置き換え/s);
  assert.match(protocolJa, /過去.*promoted.*closed.*pending.*観測.*削除.*上書き.*しない/s);
});

test("成果承認: 承認・見送り・反復承認でもPacketの完了状態を変えない", () => {
  const protocolJa = writeback("ja", "claude", WRITEBACK_PROTOCOL);
  assert.match(protocolJa, /承認.*見送り.*反復承認.*いずれ.*Packet.*state.*closed_at.*spec_refs.*配置場所.*index.*変更しない/s);
  assert.match(protocolJa, /Packet.*完了処理.*再実行しない/s);
});

test("成果承認: 英語版にも同じ承認・見送り・一意性・履歴保持の契約がある", () => {
  const skillEn = writeback("en", "claude", WRITEBACK_SKILL);
  const protocolEn = writeback("en", "claude", WRITEBACK_PROTOCOL);
  assert.match(skillEn, /until human approval.*do not change `?intent-tree\.md`?/is);
  assert.match(skillEn, /declined.*closed.*do not delete.*do not change `?intent-tree\.md`?/is);
  assert.match(protocolEn, /human explicitly approves.*only.*target L1/is);
  assert.match(protocolEn, /reread.*Intent Tree.*verbatim.*unique/is);
  assert.match(protocolEn, /same verbatim quote.*more than once.*do not project.*wait/is);
  assert.match(protocolEn, /value delivered.*value not delivered.*not known yet.*without reinterpreting/is);
  assert.match(protocolEn, /at most one.*Outcome learning:.*replace.*latest/is);
  assert.match(protocolEn, /past.*promoted.*closed.*pending.*observation.*never delete.*overwrite/is);
  assert.match(protocolEn, /approval.*decline.*repeated approval.*state.*closed_at.*spec_refs.*location.*index.*unchanged/is);
});

test("成果の出所検査: 不足した項目を安定ID付きで個別または複数まとめて警告する", () => {
  const checksJa = read("ja", "claude", ...VALIDATE_CHECKS);
  const skillJa = read("ja", "claude", ...VALIDATE_SKILL);
  assert.match(checksJa, /\| outcome-provenance-missing \|/);
  for (const field of ["誰が計測したか", "いつ計測したか", "どこで計測したか"]) {
    assert.match(checksJa, new RegExp(field), `${field} を欠落名として示す`);
  }
  assert.match(checksJa, /1項目でも複数項目でも.*欠けた項目.*まとめて.*列挙/s);
  assert.match(skillJa, /Step 3\.20:.*`outcome-provenance-missing`/s);
  assert.match(skillJa, /欠けている項目名.*同じ所見/s);
});

test("成果の出所検査: 完全な成果記録と成果記録なしの通常案件では沈黙する", () => {
  const checksJa = read("ja", "claude", ...VALIDATE_CHECKS);
  const skillJa = read("ja", "claude", ...VALIDATE_SKILL);
  assert.match(checksJa, /出所3項目がすべて.*沈黙/s);
  assert.match(checksJa, /成果についての学び.*存在しない.*沈黙/s);
  assert.match(skillJa, /3項目が揃う.*成果記録がない.*所見を出さない/s);
});

test("成果の出所検査: 推奨の独立したread-only警告で後続工程を止めない", () => {
  const checksJa = read("ja", "claude", ...VALIDATE_CHECKS);
  const skillJa = read("ja", "claude", ...VALIDATE_SKILL);
  assert.match(checksJa, /outcome-provenance-missing.*\| 推奨 \|/s);
  assert.match(checksJa, /記録.*検証.*export.*実装.*止めない/s);
  assert.match(checksJa, /他の検査軸.*混ぜない/s);
  assert.match(skillJa, /read-only.*canonical.*変更しない/s);
  assert.match(skillJa, /検証.*後続工程.*継続/s);
});

test("成果の出所検査: 分割deltaと旧単一deltaを同じ規約で読む", () => {
  for (const lang of ["ja", "en"]) {
    const claudeChecks = read(lang, "claude", ...VALIDATE_CHECKS);
    const codexChecks = read(lang, "codex", ...VALIDATE_CHECKS);
    assert.equal(codexChecks, claudeChecks, `${lang}/validate-checks.mdが一致する`);

    const claudeSkill = read(lang, "claude", ...VALIDATE_SKILL);
    const codexSkill = read(lang, "codex", ...VALIDATE_SKILL);
    const splitDelta = lang === "ja" ? /\.intent\/deltas\/.*\.md/ : /\.intent\/deltas\/.*\.md/;
    const legacyDelta = /\.intent\/deltas\.md/;
    const deterministic = lang === "ja" ? /同じ入力.*同じ.*所見/ : /same input.*same finding/is;
    assert.match(claudeSkill, splitDelta, `${lang}/claudeが分割deltaを読む`);
    assert.match(claudeSkill, legacyDelta, `${lang}/claudeが旧単一deltaへフォールバックする`);
    assert.match(claudeSkill, deterministic, `${lang}/claudeが決定的な所見を返す`);
    assert.match(codexSkill, splitDelta, `${lang}/codexが分割deltaを読む`);
    assert.match(codexSkill, legacyDelta, `${lang}/codexが旧単一deltaへフォールバックする`);
    assert.match(codexSkill, deterministic, `${lang}/codexが決定的な所見を返す`);
  }
});

test("成果表示: statusはL1の承認済み現在結果だけを読み、pending deltaを確定結果に使わない", () => {
  for (const lang of ["ja", "en"]) {
    for (const agent of ["claude", "codex"]) {
      const body = read(lang, agent, ...STATUS_SKILL);
      const l1Only = lang === "ja"
        ? /Intent Tree.*L1.*承認済み.*唯一の読み元/s
        : /Intent Tree.*L1.*only source.*approved current outcome/is;
      const pendingIgnored = lang === "ja"
        ? /pending.*delta.*確定結果.*使わない/s
        : /pending.*delta.*not.*confirmed outcome/is;
      assert.match(body, l1Only, `${lang}/${agent}: L1だけを承認済み現在結果の読み元にする`);
      assert.match(body, pendingIgnored, `${lang}/${agent}: pending deltaを確定結果に使わない`);
    }
  }
});

test("成果表示: statusは5状態を排他的に読み、結果待ちと現在結果を同時表示しない", () => {
  const cases = {
    ja: ["物さしなし", "リリース後の結果待ち", "価値が出た", "価値が出なかった", "まだ分からない"],
    en: ["no outcome measure", "awaiting post-release results", "value delivered", "value not delivered", "not known yet"],
  };
  for (const lang of ["ja", "en"]) {
    for (const agent of ["claude", "codex"]) {
      const body = read(lang, agent, ...STATUS_SKILL);
      for (const state of cases[lang]) assert.ok(body.includes(state), `${lang}/${agent}: ${state} がある`);
      assert.match(
        body,
        lang === "ja" ? /結果待ち.*現在結果.*同時.*表示しない/s : /awaiting.*current result.*never.*same time/is,
        `${lang}/${agent}: 結果待ちと現在結果は排他的`,
      );
    }
  }
});

test("成果表示: status Step 5の利用者成果欄がL1の優先順を直接定める", () => {
  for (const lang of ["ja", "en"]) {
    for (const agent of ["claude", "codex"]) {
      const body = read(lang, agent, ...STATUS_SKILL);
      const step5Start = body.indexOf(lang === "ja" ? "### Step 5: 報告する" : "### Step 5: Report");
      const step5End = body.indexOf(lang === "ja" ? "## 用語の常時併記ルール" : "## Always-annotate rule", step5Start);
      assert.ok(step5Start >= 0 && step5End > step5Start, `${lang}/${agent}: Step 5を抽出できる`);
      const step5 = body.slice(step5Start, step5End);
      const outcomeLine = step5.split("\n").find((line) =>
        line.includes(lang === "ja" ? "**利用者成果**" : "**User outcomes**"),
      );
      assert.ok(outcomeLine, `${lang}/${agent}: Step 5に利用者成果欄がある`);
      const priority = lang === "ja"
        ? /現在結果.*あれば.*価値が出た.*価値が出なかった.*まだ分からない.*要約.*現在結果.*なければ.*成果の物さし.*リリース後の結果待ち.*どちらもなければ.*未観測/s
        : /current result.*exists.*value delivered.*value not delivered.*not known yet.*summary.*no current result.*Outcome measure.*awaiting post-release results.*neither.*unobserved/is;
      assert.match(outcomeLine, priority, `${lang}/${agent}: current→measure→noneの優先順がある`);
      assert.match(
        outcomeLine,
        lang === "ja" ? /pending.*delta.*確定結果.*使わない/s : /pending.*delta.*not.*confirmed outcome/is,
        `${lang}/${agent}: pending deltaを確定結果へ使わない`,
      );
      assert.match(
        outcomeLine,
        lang === "ja" ? /結果待ち.*現在結果.*同時.*表示しない/s : /do not show awaiting.*current result.*same time|awaiting.*current result.*not.*same time/is,
        `${lang}/${agent}: 結果待ちと現在結果を同時表示しない`,
      );
    }
  }
});

test("成果表示: overviewはstatusと同じL1読み取り規約で、確定結果と結果待ちを分ける", () => {
  for (const lang of ["ja", "en"]) {
    for (const agent of ["claude", "codex"]) {
      const skill = read(lang, agent, ...OVERVIEW_SKILL);
      const aggregate = read(lang, agent, ...OVERVIEW_AGGREGATE);
      const progress = read(lang, agent, ...OVERVIEW_PROGRESS);
      const all = `${skill}\n${aggregate}\n${progress}`;
      assert.match(all, lang === "ja" ? /status.*同じ.*L1.*成果状態/s : /same.*L1 outcome state.*status/is);
      assert.match(all, lang === "ja" ? /pending.*delta.*確定結果.*使わない/s : /pending.*delta.*not.*confirmed outcome/is);
      assert.ok(all.includes(lang === "ja" ? "リリース後の結果待ち" : "awaiting post-release results"));
      assert.match(all, lang === "ja" ? /結果3値.*要約/s : /three result values.*summary/is);
    }
  }
});

test("成果表示: 工程・未決判断・利用者成果を分け、総合判定を作らず読み取り専用である", () => {
  for (const lang of ["ja", "en"]) {
    for (const agent of ["claude", "codex"]) {
      const status = read(lang, agent, ...STATUS_SKILL);
      const overview = `${read(lang, agent, ...OVERVIEW_SKILL)}\n${read(lang, agent, ...OVERVIEW_PROGRESS)}`;
      for (const body of [status, overview]) {
        const labels = lang === "ja"
          ? ["工程の状態", "未決の設計判断", "利用者成果", "総合PASS", "総合スコア"]
          : ["Process health", "Unresolved design decisions", "User outcomes", "overall PASS", "overall score"];
        for (const label of labels) assert.ok(body.includes(label), `${lang}/${agent}: ${label} がある`);
        assert.match(body, lang === "ja" ? /読み取り専用|read-only/ : /read-only/i);
      }
    }
  }
});

test("成果表示: overview rulesは同一言語でbyte等価を保つ", () => {
  for (const lang of ["ja", "en"]) {
    for (const parts of [OVERVIEW_AGGREGATE, OVERVIEW_PROGRESS]) {
      assert.equal(read(lang, "codex", ...parts), read(lang, "claude", ...parts), `${lang}/${parts.at(-1)}が一致する`);
    }
  }
});

function readIntegrationFixture() {
  const fixturePath = path.join(__dirname, "fixtures", "outcome-writeback-flow.md");
  const markdown = fs.readFileSync(fixturePath, "utf8");
  const match = markdown.match(/```json\n([\s\S]+?)\n```/);
  assert.ok(match, "統合fixtureにJSON oracleがある");
  return JSON.parse(match[1]);
}

function outcomeContractSources() {
  return {
    tree: treeJa,
    writeback: writeback("ja", "claude", WRITEBACK_PROTOCOL),
    validate: read("ja", "claude", ...VALIDATE_CHECKS),
    status: read("ja", "claude", ...STATUS_SKILL),
    overview: read("ja", "claude", ...OVERVIEW_PROGRESS),
  };
}

const OUTCOME_PHASES = {
  tree(source) {
    return /成果の物さし.*計測基準.*自動転用しない/s.test(source.tree)
      && /成果についての学び.*人が承認した現在の結果/s.test(source.tree);
  },
  record(source) {
    return /active\/.*archive\/.*対象 packet/s.test(source.writeback)
      && /新しい.*pending.*観測.*追記/s.test(source.writeback)
      && /対象L1.*逐語引用/s.test(source.writeback);
  },
  target(source) {
    return /同じ逐語引用.*複数.*利用者.*選択.*待つ/s.test(source.writeback)
      && /自動.*対応づけない/s.test(source.writeback);
  },
  warning(source) {
    return /outcome-provenance-missing.*\| 推奨 \|/s.test(source.validate)
      && /記録.*検証.*export.*実装.*止めない/s.test(source.validate);
  },
  approval(source) {
    return /pending.*間.*Intent Tree.*バイト単位で変更しない/s.test(source.writeback)
      && /人が明示的に承認した場合だけ.*対象L1.*投影/s.test(source.writeback)
      && /見送り.*Status.*closed/s.test(source.writeback);
  },
  history(source) {
    return /成果についての学び:.*L1.*最大1行/s.test(source.writeback)
      && /過去.*promoted.*closed.*pending.*観測.*削除.*上書き.*しない/s.test(source.writeback);
  },
  readout(source) {
    return /Intent Tree.*L1.*承認済み.*唯一の読み元/s.test(source.status)
      && /結果待ち.*現在結果.*同時.*表示しない/s.test(source.status)
      && /status.*同じL1成果状態/s.test(source.overview);
  },
  boundary(source) {
    return Object.values(outcomeSafetyPolicy(source)).every(Boolean);
  },
  archive(source) {
    return /承認.*見送り.*反復承認.*いずれ.*Packet.*state.*closed_at.*spec_refs.*配置場所.*index.*変更しない/s.test(source.writeback)
      && /Packet.*完了処理.*再実行しない/s.test(source.writeback);
  },
};

function outcomeSafetyPolicy(source) {
  const rawStorageDenied = /生データはdeltaに保存せず、判断に必要な要約だけを記録するよう案内する/.test(source.writeback);
  const rawPasteDenied = /生データは貼らず、結果を要約します/.test(source.writeback);
  return {
    "raw-data": rawStorageDenied && rawPasteDenied ? "要約のみ（保存・貼付なし）" : null,
    "external-fetch": /外部サービスやファイルから成果データを取得することは行わない/.test(source.writeback) ? "実行しない" : null,
    "automatic-scoring": /数値の自動スコア化や達成判定は行わない/.test(source.writeback) ? "実行しない" : null,
    "bug-triage-integration": /成果記録を不具合のバグ分類と自動で統合しない/.test(source.writeback) ? "実行しない" : null,
  };
}

function assertOutcomePhases(source) {
  for (const [phase, enabled] of Object.entries(OUTCOME_PHASES)) {
    assert.ok(enabled(source), `接続契約の ${phase} 段階が有効`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function runOutcomeScenario(fixture, source = outcomeContractSources()) {
  assertOutcomePhases(source);
  const packetBefore = clone(fixture.packet);
  const tree = clone(fixture.l1);
  const observations = [];
  const warnings = [];
  const waits = [];

  for (const step of fixture.steps) {
    if (step.action === "record") {
      if (!step.target && tree.length > 1) {
        waits.push(step.id);
        assert.equal(step.expect, "wait-for-human-target");
        continue;
      }
      const targets = tree.filter((item) => item.quote === step.target);
      assert.equal(targets.length, 1, `対象L1 ${step.target} は一意`);
      const treeBeforeRecord = clone(tree);
      observations.push({...clone(step), status: "pending"});
      const missing = Object.entries(step.provenance)
        .filter(([, value]) => !value)
        .map(([field]) => ({who: "誰が計測したか", when: "いつ計測したか", where: "どこで計測したか"})[field]);
      if (missing.length) warnings.push(`outcome-provenance-missing: ${missing.join("、")}`);
      assert.deepEqual(tree, treeBeforeRecord, "pending記録とwarn-only検査ではTreeが不変");
      assert.deepEqual(fixture.packet, packetBefore, "archive済みPacketの完了情報が不変");
      continue;
    }

    const observation = observations.find((item) => item.id === step.id);
    assert.ok(observation, `${step.id} のpending観測が先に存在する`);
    if (step.action === "reject") {
      const treeBeforeRejection = clone(tree);
      observation.status = "closed";
      assert.deepEqual(tree, treeBeforeRejection, "見送りではTreeが不変");
      continue;
    }
    assert.equal(step.action, "approve", `${step.action} は人の承認操作である`);
    observation.status = "promoted";
    const target = tree.find((item) => item.quote === observation.target);
    target.current = {result: observation.result, summary: observation.summary, delta: observation.id};
    assert.deepEqual(fixture.packet, packetBefore, "承認でもarchive済みPacketを再完了しない");
  }

  const readout = Object.fromEntries(tree.map((item) => [
    item.quote,
    item.current
      ? `${item.current.result} — ${item.current.summary}`
      : item.outcome_measure ? "リリース後の結果待ち" : "未観測",
  ]));

  return {tree, observations, warnings, waits, readout, packetBefore, safety: outcomeSafetyPolicy(source)};
}

test("接続シナリオ: Tree→pending→警告→人の判断→L1投影→表示を一続きで再現する", () => {
  const fixture = readIntegrationFixture();
  const result = runOutcomeScenario(fixture);

  assert.deepEqual(result.waits, ["ambiguous"], "複数L1では人の対象選択を待つ");
  assert.deepEqual(result.warnings, fixture.expected.warnings, "出所不足だけを非停止警告にする");
  assert.deepEqual(
    Object.fromEntries(result.observations.map(({id, status}) => [id, status])),
    fixture.expected.observation_states,
    "見送りと承認の状態を履歴へ残す",
  );
  assert.deepEqual(result.observations.map(({result: verdict}) => verdict), fixture.expected.history, "結果3値と反復観測を上書きしない");
  assert.deepEqual(result.readout, fixture.expected.readout, "現在結果と結果待ちをL1ごとに排他的に表示する");
  assert.deepEqual(
    result.tree.map(({measurement_criteria, outcome_measure}) => ({measurement_criteria, outcome_measure})),
    fixture.l1.map(({measurement_criteria, outcome_measure}) => ({measurement_criteria, outcome_measure})),
    "既存の計測基準と成果の物さしを承認後も失わない",
  );
  assert.deepEqual(fixture.packet, result.packetBefore, "archive済みPacketの完了処理を再実行しない");
  assert.deepEqual(result.safety, fixture.expected.safety, "実際のwriteback契約から安全境界の動作を導く");
});

test("接続シナリオ: どの段階の契約を外しても統合oracleが失敗する", () => {
  const fixture = readIntegrationFixture();
  const source = outcomeContractSources();
  for (const phase of Object.keys(OUTCOME_PHASES)) {
    const original = OUTCOME_PHASES[phase];
    try {
      OUTCOME_PHASES[phase] = () => false;
      assert.throws(
        () => runOutcomeScenario(fixture, source),
        new RegExp(`接続契約の ${phase} 段階が有効`),
        `${phase} を除いた変異を検出する`,
      );
    } finally {
      OUTCOME_PHASES[phase] = original;
    }
  }
});

test("接続シナリオ: 実際の安全境界を違反文へ変えると統合oracleが失敗する", () => {
  const fixture = readIntegrationFixture();
  const mutations = [
    [
      "生データはdeltaに保存せず、判断に必要な要約だけを記録するよう案内する",
      "生データはdeltaに保存して、判断に必要な要約も記録するよう案内する",
    ],
    ["生データは貼らず、結果を要約します", "生データを貼り、結果も要約します"],
    [
      "外部サービスやファイルから成果データを取得することは行わない",
      "外部サービスやファイルから成果データを自動取得する",
    ],
    ["数値の自動スコア化や達成判定は行わない", "数値を自動スコア化して達成判定する"],
    ["成果記録を不具合のバグ分類と自動で統合しない", "成果記録を不具合のバグ分類と自動で統合する"],
  ];

  for (const [valid, violation] of mutations) {
    const source = outcomeContractSources();
    assert.ok(source.writeback.includes(valid), `変異対象の正しい契約が存在する: ${valid}`);
    source.writeback = source.writeback.replace(valid, violation);
    assert.throws(
      () => runOutcomeScenario(fixture, source),
      /接続契約の boundary 段階が有効/,
      `違反文を検出する: ${violation}`,
    );
  }
});
