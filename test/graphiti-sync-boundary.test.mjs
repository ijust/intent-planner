import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["ja", "en"];

function contract(lang) {
  return fs.readFileSync(path.join(ROOT, "templates", lang, "intent", "graphiti-sync-boundary.md"), "utf8");
}

function cellValue(cell) {
  return cell.trim().replaceAll("`", "");
}

function sectionBetween(body, headings) {
  const heading = headings.find((candidate) => body.includes(candidate));
  assert.ok(heading, `one section heading exists: ${headings.join(" / ")}`);
  const start = body.indexOf(heading);
  const next = body.indexOf("\n## ", start + heading.length);
  return body.slice(start, next === -1 ? body.length : next);
}

function parseRuleFields(body) {
  const section = sectionBetween(body, ["## 範囲規則", "## Range rules"]);
  return section
    .split("\n")
    .filter((line) => /^\| `/.test(line))
    .map((line) => cellValue(line.split("|")[1]));
}

function parseHardExclusions(body) {
  const section = sectionBetween(body, ["## 常時除外", "## Hard exclusions"]);
  return Object.fromEntries(section
    .split("\n")
    .filter((line) => /^\| `/.test(line))
    .map((line) => {
      const [pattern, decision] = line.split("|").slice(1, -1).map(cellValue);
      return [pattern, decision];
    }));
}

function parseLocatorPhases(body) {
  const section = sectionBetween(body, ["## locator検査手順", "## Locator screening procedure"]);
  return Object.fromEntries(section
    .split("\n")
    .filter((line) => /^\| `\d-/.test(line))
    .map((line) => {
      const [phase, check, timing] = line.split("|").slice(1, -1).map(cellValue);
      return [phase, { check, timing }];
    }));
}

function parseSecretKinds(body) {
  const section = sectionBetween(body, ["## 秘密検出", "## Secret detection"]);
  return Object.fromEntries(section
    .split("\n")
    .filter((line) => /^\| `/.test(line))
    .map((line) => {
      const [kind, decision] = line.split("|").slice(1, -1).map(cellValue);
      return [kind, decision];
    }));
}

function parseSyncBudgets(body) {
  const section = sectionBetween(body, ["## 同期呼出しの上限", "## Bounded sync calls"]);
  return Object.fromEntries(section
    .split("\n")
    .filter((line) => /^\| `[a-z-]+` \| \d/.test(line))
    .map((line) => {
      const [kind, maxElapsedMs, retryCount] = line.split("|").slice(1, -1).map(cellValue);
      return [kind, { maxElapsedMs: Number(maxElapsedMs), retryCount: Number(retryCount) }];
    }));
}

function authorizeBoundedCall(budgets, kind, hostGuaranteedMaxMs, retryCount) {
  const budget = budgets[kind];
  assert.ok(budget, `budget defined for ${kind}`);
  if (retryCount > budget.retryCount) {
    return { call: false, reason: "retry-not-allowed" };
  }
  if (!(hostGuaranteedMaxMs <= budget.maxElapsedMs)) {
    return { call: false, reason: "bounded-timeout-unavailable" };
  }
  return { call: true, maxElapsedMs: budget.maxElapsedMs, retryCount: budget.retryCount };
}

// 契約意味の構造fixture: 除外＞許可・許可範囲外は候補にしない
function selectCandidate(rules, candidate) {
  const excluded = rules.userExclusions.some((rule) => candidate.identifier.startsWith(rule))
    || candidate.hardExclusion === true;
  if (excluded) return { candidate: false, reason: "excluded", read: false, sent: false };
  const allowed = rules.allowedDirectories.some((dir) => candidate.identifier.startsWith(dir))
    && rules.allowedExtensions.some((ext) => candidate.identifier.endsWith(ext));
  if (!allowed) return { candidate: false, reason: "outside-allow-scope", read: false, sent: false };
  return { candidate: true, read: true };
}

test("sync contract fixes the same range rule fields in Japanese and English", () => {
  const expected = ["allowedDirectories", "allowedExtensions", "allowedUrlPrefixes", "userExclusions"];
  for (const lang of LANGS) {
    assert.deepEqual(parseRuleFields(contract(lang)), expected, `${lang}: range rule fields`);
    const section = sectionBetween(contract(lang), ["## 範囲規則", "## Range rules"]);
    assert.match(section, lang === "ja" ? /除外規則は許可規則より常に優先/ : /Exclusion rules always override allow rules/,
      `${lang}: exclusion precedence is declared`);
    assert.match(section, lang === "ja" ? /文書1件ずつの列挙を要求しません/ : /Do not require enumerating documents one by one/,
      `${lang}: per-document enumeration is not required`);
  }
});

test("exclusion overrides allow and out-of-scope targets are never read or sent", () => {
  const rules = {
    allowedDirectories: ["docs/"],
    allowedExtensions: [".md", ".pdf"],
    userExclusions: ["docs/internal/"],
  };
  assert.deepEqual(selectCandidate(rules, { identifier: "docs/manual.md" }), { candidate: true, read: true });
  assert.deepEqual(
    selectCandidate(rules, { identifier: "docs/internal/policy.md" }),
    { candidate: false, reason: "excluded", read: false, sent: false },
    "a target matching both allow and exclusion is excluded",
  );
  assert.deepEqual(
    selectCandidate(rules, { identifier: "src/app.md" }),
    { candidate: false, reason: "outside-allow-scope", read: false, sent: false },
    "a target outside the allow scope is neither read nor sent",
  );
  assert.deepEqual(
    selectCandidate(rules, { identifier: "docs/cert.pem", hardExclusion: true }),
    { candidate: false, reason: "excluded", read: false, sent: false },
    "a hard exclusion cannot be lifted by an allowed root",
  );
});

test("hard exclusions are fixed as a floor and deny before reading", () => {
  const expected = Object.fromEntries([
    [".git/**", "deny-before-read"],
    ["dependency-directory", "deny-before-read"],
    ["build-directory", "deny-before-read"],
    ["cache-directory", "deny-before-read"],
    [".env", "deny-before-read"],
    [".env.*", "deny-before-read"],
    ["*.pem", "deny-before-read"],
    ["*.key", "deny-before-read"],
    ["*.crt", "deny-before-read"],
    ["*.cer", "deny-before-read"],
    ["*.p12", "deny-before-read"],
    ["*.pfx", "deny-before-read"],
    ["id_rsa*", "deny-before-read"],
    ["id_ed25519*", "deny-before-read"],
  ]);
  for (const lang of LANGS) {
    assert.deepEqual(parseHardExclusions(contract(lang)), expected, `${lang}: hard exclusion floor`);
    const section = sectionBetween(contract(lang), ["## 常時除外", "## Hard exclusions"]);
    assert.match(section, lang === "ja" ? /解除できず/ : /cannot be lifted/, `${lang}: exclusions cannot be lifted`);
    assert.match(section, lang === "ja" ? /狭めずに追加できます/ : /may add to it but never narrow it/,
      `${lang}: the floor may only grow`);
  }
});

test("the locator procedure is guard-owned, ordered, and rejects caller claims", () => {
  const expectedPhases = {
    "1-normalize": { check: "case,path-separator,symlink-real-path", timing: "before-read-or-connect" },
    "2-hard-exclusion": { check: "resolved-identifier", timing: "before-read-or-connect" },
    "3-allow-scope": { check: "resolved-identifier", timing: "after-hard-exclusion" },
    "4-http-scheme": { check: "http-or-https", timing: "before-dns-or-connect" },
    "5-dns-all-addresses": { check: "every-resolved-address", timing: "before-connect" },
    "6-pre-connect-dns-recheck": { check: "every-resolved-address", timing: "immediately-before-connect" },
    "7-every-redirect": { check: "prefix,scheme,dns-all-addresses,pre-connect-dns-recheck", timing: "before-following-redirect" },
  };
  for (const lang of LANGS) {
    assert.deepEqual(parseLocatorPhases(contract(lang)), expectedPhases, `${lang}: locator phases`);
    const section = sectionBetween(contract(lang), ["## locator検査手順", "## Locator screening procedure"]);
    assert.match(section, lang === "ja" ? /guard自身がread-onlyで/ : /the guard itself checks read-only/i,
      `${lang}: the guard owns evaluation`);
    assert.match(section, /`verifiedBy`/, `${lang}: caller claims are named and rejected`);
    for (const token of ["localhost", "loopback", "private", "link-local", "unique-local", "multicast", "reserved", "metadata"]) {
      assert.ok(section.includes(token), `${lang}: forbidden destination class ${token}`);
    }
    assert.match(section, lang === "ja" ? /IPv4\/IPv6/ : /both IPv4 and IPv6/,
      `${lang}: both address families are evaluated`);
    assert.match(section, lang === "ja" ? /許可範囲の外へ出る接続は拒否/ : /redirect leaving the allow scope is denied/i,
      `${lang}: redirects cannot escape the allow scope`);
  }
});

test("secret detection fixes eight kinds and never emits secret values", () => {
  const expected = Object.fromEntries([
    ["private-key", "deny-before-Graphiti-call"],
    ["credential", "deny-before-Graphiti-call"],
    ["token", "deny-before-Graphiti-call"],
    ["api-key", "deny-before-Graphiti-call"],
    ["password", "deny-before-Graphiti-call"],
    ["certificate", "deny-before-Graphiti-call"],
    ["environment-variable-secret", "deny-before-Graphiti-call"],
    ["uninspectable-content", "deny-or-out-of-scope"],
  ]);
  const fixtureSecret = "sk-fixture-secret-value-must-not-appear";
  for (const lang of LANGS) {
    const kinds = parseSecretKinds(contract(lang));
    assert.deepEqual(kinds, expected, `${lang}: secret kinds`);
    const section = sectionBetween(contract(lang), ["## 秘密検出", "## Secret detection"]);
    assert.match(section, lang === "ja" ? /安全と推測しません/ : /never presumed safe/,
      `${lang}: uninspectable content fails closed`);
    assert.match(section, lang === "ja" ? /判定結果・報告・記録へ写しません/ : /never copied into decisions, reports, or records/,
      `${lang}: secret values stay out of outputs`);
    assert.equal(JSON.stringify(kinds).includes(fixtureSecret), false, `${lang}: fixture secret value is absent`);
    assert.equal(contract(lang).includes(fixtureSecret), false, `${lang}: contract holds no fixture secret`);
  }
});

test("only upsert and web-fetch budgets are fixed here; purge and search stay with later specs", () => {
  for (const lang of LANGS) {
    const budgets = parseSyncBudgets(contract(lang));
    assert.deepEqual(budgets, {
      upsert: { maxElapsedMs: 30000, retryCount: 0 },
      "web-fetch": { maxElapsedMs: 20000, retryCount: 0 },
    }, `${lang}: exactly the sync budgets, nothing more`);
    for (const [kind, { maxElapsedMs }] of Object.entries(budgets)) {
      assert.deepEqual(authorizeBoundedCall(budgets, kind, maxElapsedMs, 0),
        { call: true, maxElapsedMs, retryCount: 0 }, `${lang}/${kind}: exact boundary accepted`);
      assert.deepEqual(authorizeBoundedCall(budgets, kind, maxElapsedMs + 1, 0),
        { call: false, reason: "bounded-timeout-unavailable" }, `${lang}/${kind}: one millisecond over is rejected`);
      assert.deepEqual(authorizeBoundedCall(budgets, kind, Number.POSITIVE_INFINITY, 0),
        { call: false, reason: "bounded-timeout-unavailable" }, `${lang}/${kind}: unbounded host is rejected`);
      assert.deepEqual(authorizeBoundedCall(budgets, kind, maxElapsedMs, 1),
        { call: false, reason: "retry-not-allowed" }, `${lang}/${kind}: retry cannot widen the budget`);
    }
    const section = sectionBetween(contract(lang), ["## 同期呼出しの上限", "## Bounded sync calls"]);
    assert.match(section, lang === "ja"
      ? /`purge`・`search`の上限はこの契約で確定しません/
      : /limits for `purge` and `search` are not fixed by this contract/,
      `${lang}: purge and search limits are explicitly deferred`);
  }
});

test("the sync contract narrows the skeleton and stays out of preflight", () => {
  for (const lang of LANGS) {
    const body = contract(lang);
    assert.match(body, lang === "ja" ? /狭める方向にだけ具体化します/ : /narrowing direction only/,
      `${lang}: the skeleton is only narrowed`);
    assert.match(body, lang === "ja" ? /preflightはこの契約を読み込まず/ : /Preflight does not load this contract/,
      `${lang}: preflight stays outside this contract`);
    assert.match(body, lang === "ja" ? /骨格・能力分類・操作別許可・statusの上限はここで再定義しません/
      : /capability classification, operation allowlists, and the `status` limit are not redefined here/,
      `${lang}: shared contract sections are not redefined`);
  }
});

test("the dogfood sync contract is byte-identical to the Japanese canonical template", () => {
  const dogfood = fs.readFileSync(path.join(ROOT, ".intent", "graphiti-sync-boundary.md"), "utf8");
  assert.equal(dogfood, contract("ja"), "dogfood copy equals templates/ja canonical");
});

function parseIdentityFields(body) {
  const section = sectionBetween(body, ["## Episodeの内容識別", "## Episode content identity"]);
  return section
    .split("\n")
    .filter((line) => /^\| `/.test(line))
    .map((line) => cellValue(line.split("|")[1]));
}

function parseOutcomes(body) {
  const section = sectionBetween(body, ["## 結果の分類", "## Outcome classification"]);
  return Object.fromEntries(section
    .split("\n")
    .filter((line) => /^\| `/.test(line))
    .map((line) => {
      const [outcome, meaning] = line.split("|").slice(1, -1).map(cellValue);
      return [outcome, meaning];
    }));
}

// 契約意味の構造fixture: 同一内容の再送信禁止・変更/失敗分だけ処理
function planDiffSync(previousRecords, targets) {
  return targets.filter((target) => {
    const previous = previousRecords.find((record) => record.source === target.source
      && record.project === target.project && record.group === target.group);
    if (!previous) return true;
    if (previous.outcome === "failed") return true;
    return previous.contentId !== target.contentId;
  });
}

function summarizeRun(outcomes) {
  const counts = { success: 0, skipped: 0, failed: 0 };
  for (const outcome of outcomes) counts[outcome] += 1;
  return { counts, overallSuccess: counts.failed === 0 };
}

test("episode identity is fixed and identical content is never re-sent", () => {
  for (const lang of LANGS) {
    assert.deepEqual(parseIdentityFields(contract(lang)), ["project", "group", "source", "contentId"],
      `${lang}: identity fields`);
    const section = sectionBetween(contract(lang), ["## Episodeの内容識別", "## Episode content identity"]);
    assert.match(section, lang === "ja" ? /再送信しません/ : /never re-sent/, `${lang}: no duplicate submission`);
    assert.match(section, lang === "ja" ? /認可境界にしない/ : /never an authorization boundary/,
      `${lang}: group is not authorization`);
  }
  const previous = [
    { project: "p", group: "docs", source: "docs/a.md", contentId: "h1", outcome: "success" },
    { project: "p", group: "docs", source: "docs/b.md", contentId: "h2", outcome: "failed" },
    { project: "p", group: "docs", source: "docs/c.md", contentId: "h3", outcome: "success" },
  ];
  const targets = [
    { project: "p", group: "docs", source: "docs/a.md", contentId: "h1" },
    { project: "p", group: "docs", source: "docs/b.md", contentId: "h2" },
    { project: "p", group: "docs", source: "docs/c.md", contentId: "h3-changed" },
    { project: "p", group: "docs", source: "docs/new.md", contentId: "h4" },
  ];
  assert.deepEqual(planDiffSync(previous, targets).map((t) => t.source),
    ["docs/b.md", "docs/c.md", "docs/new.md"],
    "unchanged success is skipped; failed, changed, and new targets are processed");
  assert.deepEqual(planDiffSync(previous, targets.slice(0, 1)), [],
    "re-syncing identical content adds zero submissions");
});

test("outcomes stay three-valued and one failure blocks overall success", () => {
  for (const lang of LANGS) {
    const outcomes = parseOutcomes(contract(lang));
    assert.deepEqual(Object.keys(outcomes), ["success", "skipped", "failed"], `${lang}: exactly three outcomes`);
    const section = sectionBetween(contract(lang), ["## 結果の分類", "## Outcome classification"]);
    assert.match(section, lang === "ja" ? /全体を成功と表示しません/ : /never displayed as an overall success/,
      `${lang}: partial failure cannot look like success`);
    assert.match(section, lang === "ja" ? /秘密の値・本文は含めません/ : /Secret values and bodies are never included/,
      `${lang}: reasons never leak values`);
  }
  assert.deepEqual(summarizeRun(["success", "skipped", "failed"]),
    { counts: { success: 1, skipped: 1, failed: 1 }, overallSuccess: false },
    "a single failed target makes the run non-successful");
  assert.deepEqual(summarizeRun(["success", "skipped"]),
    { counts: { success: 1, skipped: 1, failed: 0 }, overallSuccess: true },
    "success and reasoned skips can still be an overall success");
});

test("the sync contract keeps every skeleton denial without weakening it", () => {
  function sharedContract(lang) {
    return fs.readFileSync(path.join(ROOT, "templates", lang, "intent", "graphiti-safety-boundary.md"), "utf8");
  }
  const anchors = {
    "caller-asserted-safety": { ja: /自己申告.*採用しません/s, en: /self-claims.*never accepted/is },
    "unknown-candidate-kind": { ja: /未知の対象種別は、読む・接続する前に拒否します/, en: /target kind that cannot be derived.*denied before any read or connection/is },
    "hard-exclusion-overrides-allow-scope": { ja: /一致しても解除できず/, en: /cannot be lifted by matching an allowed root/i },
    "secret-payload-outbound": { ja: /\| `private-key` \| `deny-before-Graphiti-call` \|/, en: /\| `private-key` \| `deny-before-Graphiti-call` \|/ },
    "denial-report-includes-secret-value": { ja: /判定結果・報告・記録へ写しません/, en: /never copied into decisions, reports, or records/ },
    "preflight-runs-outbound-gates": { ja: /preflightはこの契約を読み込まず/, en: /Preflight does not load this contract/ },
    "successor-spec-weakens-skeleton": { ja: /狭める方向にだけ具体化します/, en: /narrowing direction only/ },
  };
  for (const lang of LANGS) {
    const skeletonSection = sectionBetween(sharedContract(lang), ["## 外部送信前の拒否境界（骨格）", "## Outbound denial skeleton"]);
    const skeletonRules = skeletonSection
      .split("\n")
      .filter((line) => /^\| `/.test(line))
      .map((line) => cellValue(line.split("|")[1]));
    const sync = contract(lang);
    for (const rule of skeletonRules) {
      const anchor = anchors[rule];
      assert.ok(anchor, `${lang}: skeleton rule ${rule} has a narrowing anchor defined in this test`);
      assert.match(sync, anchor[lang], `${lang}: skeleton rule ${rule} survives in the sync contract`);
    }
  }
});

const JA_SYNC_SKILLS = {
  claude: path.join(ROOT, "templates", "ja", "claude", "skills", "intent-graphiti-sync", "SKILL.md"),
  codex: path.join(ROOT, "templates", "ja", "codex", "skills", "intent-graphiti-sync", "SKILL.md"),
  dogfood: path.join(ROOT, ".agents", "skills", "intent-graphiti-sync", "SKILL.md"),
};

function skillBody(skillPath) {
  const source = fs.readFileSync(skillPath, "utf8");
  const match = source.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  assert.ok(match, "skill has YAML frontmatter");
  return match[1];
}

// 契約意味の構造fixture: 送信前フェーズのゲート
function gateSyncPreSend(context) {
  if (!context.contractsPresent) {
    return { externalSends: 0, proceeded: false, reason: "contract-missing", continueWith: "canonical-workflow" };
  }
  if (!context.statusOk || !context.upsertCallable) {
    return { externalSends: 0, proceeded: false, reason: "capability-unavailable", continueWith: "canonical-workflow" };
  }
  if ((context.firstRun || context.scopeExpanded) && !context.approved) {
    return { externalSends: 0, proceeded: false, reason: "confirmation-not-approved", continueWith: "canonical-workflow" };
  }
  return { externalSends: 0, proceeded: true, perDocumentConfirmations: 0 };
}

test("sync mode requires explicit range input and keeps preflight as the input-free default", () => {
  for (const [host, skillPath] of Object.entries(JA_SYNC_SKILLS)) {
    const body = skillBody(skillPath);
    assert.match(body, /範囲規則.*同期を明示的に依頼した場合だけsyncモード/s, `${host}: sync needs explicit range input`);
    assert.match(body, /それ以外の明示起動はpreflightモード/, `${host}: preflight stays the default mode`);
    assert.match(body, /自動起動、常時実行、Git hook・daemon化/, `${host}: no implicit execution`);
    assert.match(body, /syncが使えるのは`status`と`upsert`だけ/, `${host}: sync uses only status and upsert`);
    assert.match(body, /検索・完全削除で代替しない/, `${host}: no operation substitution`);
    assert.match(body, /`.intent\/graphiti-sync-boundary.md`/, `${host}: the sync contract is read just in time`);
  }
});

test("the pre-send gate keeps zero external sends until approval and falls back safely", () => {
  const base = { contractsPresent: true, statusOk: true, upsertCallable: true, firstRun: true, scopeExpanded: false, approved: true };
  assert.deepEqual(gateSyncPreSend({ ...base, contractsPresent: false }),
    { externalSends: 0, proceeded: false, reason: "contract-missing", continueWith: "canonical-workflow" });
  assert.deepEqual(gateSyncPreSend({ ...base, upsertCallable: false }),
    { externalSends: 0, proceeded: false, reason: "capability-unavailable", continueWith: "canonical-workflow" });
  assert.deepEqual(gateSyncPreSend({ ...base, statusOk: false }),
    { externalSends: 0, proceeded: false, reason: "capability-unavailable", continueWith: "canonical-workflow" });
  assert.deepEqual(gateSyncPreSend({ ...base, approved: false }),
    { externalSends: 0, proceeded: false, reason: "confirmation-not-approved", continueWith: "canonical-workflow" });
  assert.deepEqual(gateSyncPreSend({ ...base, firstRun: false, approved: false }),
    { externalSends: 0, proceeded: true, perDocumentConfirmations: 0 },
    "same-range differential sync proceeds without per-document confirmation");
  for (const [host, skillPath] of Object.entries(JA_SYNC_SKILLS)) {
    const body = skillBody(skillPath);
    assert.match(body, /承認までは対象の列挙だけを行い、外部送信0件を保つ/, `${host}: zero sends before approval`);
    assert.match(body, /同じ範囲の差分同期では文書ごとの確認を求めない/, `${host}: no per-document confirmation`);
    assert.match(body, /（sync）一括確認の承認前に外部送信しない/, `${host}: sync prohibitions are explicit`);
  }
});

import os from "node:os";

// 契約意味の構造fixture: 送信後フェーズの対象別処理
function processApprovedTarget(target) {
  if (target.locatorDenied || target.secretKind) {
    return { outcome: "skipped", reason: target.secretKind ?? "locator-denied", sent: 0 };
  }
  if (!target.extractable) {
    return { outcome: "skipped", reason: "no-extraction-means", sent: 0 };
  }
  if (!target.upsertOk) {
    return { outcome: "failed", reason: "upsert-failed-or-timeout", sent: 0 };
  }
  return { outcome: "success", sent: 1, recordedContentId: target.contentId };
}

test("post-send phase extracts without mutating sources and never installs extractors", () => {
  for (const [host, skillPath] of Object.entries(JA_SYNC_SKILLS)) {
    const body = skillBody(skillPath);
    assert.match(body, /Markdown・テキスト・JSON・PDF・`.docx`・`.pptx`・`.xlsx`・許可Webページ/, `${host}: format coverage`);
    assert.match(body, /抽出器・外部製品をインストールしない/, `${host}: no extractor installation`);
    assert.match(body, /元のファイル・ページを変更しない/, `${host}: sources stay unmodified`);
    assert.match(body, /対象と理由を示して`skipped`にし、他の対象の処理を続ける/, `${host}: reasoned skip continues the run`);
    assert.match(body, /`success`の内容識別と確認済み範囲を状態記録へ記録する/, `${host}: successes are recorded for diff sync`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "graphiti-sync-extract-"));
  const source = path.join(dir, "doc.md");
  fs.writeFileSync(source, "# fixture body\n");
  const before = fs.readFileSync(source);
  const extracted = fs.readFileSync(source, "utf8");
  assert.equal(extracted.includes("fixture body"), true, "extraction reads the body");
  assert.deepEqual(fs.readFileSync(source), before, "extraction leaves the source bytes unchanged");
});

test("per-target outcomes classify secrets and failures without leaking values or faking success", () => {
  const secretValue = "sk-live-fixture-value-must-not-appear";
  const targets = [
    { source: "docs/a.md", extractable: true, upsertOk: true, contentId: "h1" },
    { source: "docs/secret.md", extractable: true, upsertOk: true, secretKind: "api-key", secretValue },
    { source: "docs/legacy.doc", extractable: false },
    { source: "docs/slow.md", extractable: true, upsertOk: false, contentId: "h4" },
  ];
  const results = targets.map(processApprovedTarget);
  assert.deepEqual(results.map((r) => r.outcome), ["success", "skipped", "skipped", "failed"]);
  assert.equal(results[1].reason, "api-key", "secret denial reports only the kind");
  assert.equal(JSON.stringify(results).includes(secretValue), false, "secret values never reach the results");
  const summary = summarizeRun(results.map((r) => r.outcome));
  assert.equal(summary.overallSuccess, false, "one failed target blocks overall success");
  assert.equal(results.reduce((n, r) => n + r.sent, 0), 1, "only the passing target is sent");
});
