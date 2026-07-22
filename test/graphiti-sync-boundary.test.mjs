import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
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

test("sync and purge budgets are fixed here; search stays with the later spec", () => {
  for (const lang of LANGS) {
    const budgets = parseSyncBudgets(contract(lang));
    assert.deepEqual(budgets, {
      upsert: { maxElapsedMs: 30000, retryCount: 0 },
      "web-fetch": { maxElapsedMs: 20000, retryCount: 0 },
      purge: { maxElapsedMs: 15000, retryCount: 0 },
    }, `${lang}: exactly the sync and deletion budgets, nothing more`);
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
      ? /`search`の上限はこの契約で確定しません/
      : /limit for `search` is not fixed by this contract/,
      `${lang}: the search limit stays explicitly deferred`);
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
    assert.match(body, /`success`の内容識別・確認済み範囲・現在のGit識別（`gitContext`）を状態記録へ記録する/, `${host}: successes are recorded for diff sync`);
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

// 契約意味の構造fixture: 状態記録は識別だけを持つ
function buildStateRecord(confirmedScope, successResults, gitContext) {
  return {
    confirmedScope,
    entries: successResults.map(({ group, source, contentId }) => ({ group, source, contentId })),
    recordedAt: "2026-07-23T00:00:00Z",
    gitContext,
  };
}

test("the state record keeps identities only and never becomes a precondition or canonical change", () => {
  for (const lang of LANGS) {
    const section = sectionBetween(contract(lang), ["## 状態記録", "## State record"]);
    const fields = section.split("\n").filter((line) => /^\| `/.test(line)).map((line) => cellValue(line.split("|")[1]));
    assert.deepEqual(fields, ["confirmedScope", "entries", "recordedAt", "gitContext"], `${lang}: record fields`);
    assert.match(section, /`.intent\/graphiti-sync\/local\/`/, `${lang}: untracked local location`);
    assert.match(section, lang === "ja" ? /本文・抽出結果・秘密の値を保存しません/ : /never stores bodies, extraction results, or secret values/,
      `${lang}: no bodies in the record`);
    assert.match(section, lang === "ja" ? /正本（`.intent\/`のMarkdownと元資料）を変更しません/ : /never modifies canonical sources/,
      `${lang}: the record cannot change canonical sources`);
    assert.match(section, lang === "ja" ? /実行条件にしません/ : /never an execution precondition/,
      `${lang}: sync works without a record`);
  }
  const body = "secret-ish document body must never be recorded";
  const record = buildStateRecord({ allowedDirectories: ["docs/"] }, [
    { group: "docs", source: "docs/a.md", contentId: "h1", body },
  ], { stream: "main", commit: "abc1234" });
  assert.deepEqual(Object.keys(record), ["confirmedScope", "entries", "recordedAt", "gitContext"]);
  assert.equal(JSON.stringify(record).includes(body), false, "record excludes document bodies");
});

function parseGroupElements(body) {
  const section = sectionBetween(body, ["## groupの構成と履歴", "## Group composition and history"]);
  return section.split("\n").filter((line) => /^\| `/.test(line)).map((line) => cellValue(line.split("|")[1]));
}

// 契約意味の構造fixture: 知識種別ごとの履歴方針
function applyHistoryPolicy(kind, versions) {
  if (kind === "domain") {
    return { searchable: versions.map((v) => ({ ...v, current: v === versions[versions.length - 1] })), pastRoute: null };
  }
  return { searchable: [versions[versions.length - 1]], pastRoute: "markdown-git-archive" };
}

function deriveGroup(project, kind, stream) {
  return `${project}/${kind}/${stream}`;
}

test("group composition separates kinds and streams, and history policy differs by kind", () => {
  for (const lang of LANGS) {
    assert.deepEqual(parseGroupElements(contract(lang)), ["project", "kind", "stream"], `${lang}: group elements`);
    const section = sectionBetween(contract(lang), ["## groupの構成と履歴", "## Group composition and history"]);
    assert.match(section, lang === "ja" ? /`domain`は旧版を消さず/ : /`domain` keeps old versions/, `${lang}: domain keeps history`);
    assert.match(section, lang === "ja" ? /`intent`はGraphiti上では最新版だけ/ : /`intent` keeps only the latest version in Graphiti/,
      `${lang}: intent stays latest-only`);
    assert.match(section, lang === "ja" ? /Markdown・Git・Archiveへ案内します/ : /routes past-version checks to Markdown, Git, and the Archive/,
      `${lang}: past versions route to canonical history`);
    assert.match(section, lang === "ja" ? /別`stream`として識別し、同じ時間変化として混ぜません/ : /different `stream` values and never mixed as one timeline/,
      `${lang}: streams never mix`);
    assert.match(section, lang === "ja" ? /明示的な再同期だけで行います/ : /reflected only by an explicit re-sync/,
      `${lang}: merge reflection is explicit`);
    assert.match(section, lang === "ja" ? /Archive全文を重ねて同期しません/ : /full Archive is never layered into sync/,
      `${lang}: no archive bulk sync`);
  }
  const v1 = { contentId: "h1", effectiveFrom: "2020-01" };
  const v2 = { contentId: "h2", effectiveFrom: "2025-04" };
  const domain = applyHistoryPolicy("domain", [v1, v2]);
  assert.equal(domain.searchable.length, 2, "domain retains old and current versions");
  assert.equal(domain.searchable[1].current, true, "the newest domain version is marked current");
  const intent = applyHistoryPolicy("intent", [v1, v2]);
  assert.deepEqual(intent.searchable, [v2], "intent keeps only the latest version");
  assert.equal(intent.pastRoute, "markdown-git-archive", "past intent versions route to canonical history");
  assert.notEqual(deriveGroup("p", "intent", "main"), deriveGroup("p", "intent", "feature-x"),
    "same source on different streams lands in different groups");
  assert.notEqual(deriveGroup("p", "domain", "main"), deriveGroup("p", "intent", "main"),
    "domain and intent never share a group");
});

// 契約意味の構造fixture: 古さ判定は表示のみ・チーム操作の許可
function assessStaleness(recordedGitContext, currentGitContext) {
  const stale = recordedGitContext.stream !== currentGitContext.stream
    || recordedGitContext.commit !== currentGitContext.commit;
  return { displayStale: stale, autoSyncTriggered: false, autoPurgeTriggered: false };
}

function authorizeTeamAction(role, action) {
  if (role === "single-writer" && (action === "sync" || action === "purge")) return { allowed: true };
  if (action === "search") return { allowed: true };
  return { allowed: false, reason: "search-only-user" };
}

test("staleness is display-only and never triggers sync from Git operations", () => {
  for (const lang of LANGS) {
    const section = sectionBetween(contract(lang), ["## 古さの表示", "## Staleness display"]);
    assert.match(section, lang === "ja" ? /「古い可能性」を表示します/ : /display "possibly stale"/,
      `${lang}: staleness is displayed`);
    assert.match(section, lang === "ja" ? /Git pull・checkout・merge・commit・ファイル変更をきっかけに同期しません/
      : /Never sync on Git pull, checkout, merge, commit, or file changes/, `${lang}: no Git-triggered sync`);
    assert.match(section, lang === "ja" ? /Graphitiの結果だけで現在の状態を確定しません/
      : /never confirmed from Graphiti results alone/, `${lang}: canonical stays authoritative`);
  }
  const recorded = { stream: "main", commit: "abc1234" };
  assert.deepEqual(assessStaleness(recorded, { stream: "main", commit: "abc1234" }),
    { displayStale: false, autoSyncTriggered: false, autoPurgeTriggered: false });
  assert.deepEqual(assessStaleness(recorded, { stream: "main", commit: "def5678" }),
    { displayStale: true, autoSyncTriggered: false, autoPurgeTriggered: false },
    "a newer commit shows staleness without triggering anything");
  assert.deepEqual(assessStaleness(recorded, { stream: "feature-x", commit: "abc1234" }),
    { displayStale: true, autoSyncTriggered: false, autoPurgeTriggered: false },
    "a different stream is treated as possibly stale, not silently reused");
});

test("team operation defaults to local Graphiti and restricts shared writes to a single writer", () => {
  for (const lang of LANGS) {
    const section = sectionBetween(contract(lang), ["## チーム運用", "## Team operation"]);
    assert.match(section, lang === "ja" ? /標準構成は各開発者のローカルGraphiti/ : /standard setup is a local Graphiti per developer/,
      `${lang}: local is the default`);
    assert.match(section, lang === "ja" ? /単一の書き手（同期担当者またはCI）だけが同期/ : /only a single writer \(a sync owner or CI\) syncs/,
      `${lang}: single writer on shared`);
    assert.match(section, lang === "ja" ? /同期方針に秘密・接続情報を含めません/ : /never contains secrets or connection details/,
      `${lang}: sync policy carries no secrets`);
    assert.match(section, lang === "ja" ? /範囲外です（単一書き手の範囲だけ/ : /outside this contract \(only the single-writer range/,
      `${lang}: multi-writer stays out of scope`);
  }
  assert.deepEqual(authorizeTeamAction("single-writer", "sync"), { allowed: true });
  assert.deepEqual(authorizeTeamAction("search-only", "search"), { allowed: true });
  assert.deepEqual(authorizeTeamAction("search-only", "sync"), { allowed: false, reason: "search-only-user" });
  assert.deepEqual(authorizeTeamAction("search-only", "purge"), { allowed: false, reason: "search-only-user" });
});

// 契約意味の構造fixture: 明示削除の3段と曖昧拒否
function executePurge(request) {
  if (!request.enumerated || request.enumerated.length === 0) {
    return { executed: false, reason: "empty-enumeration" };
  }
  if (request.enumerated.some((t) => t.group !== request.group)) {
    return { executed: false, reason: "group-mismatch" };
  }
  if (!request.confirmed) {
    return { executed: false, reason: "not-confirmed" };
  }
  const executionSet = request.executionSet ?? request.enumerated;
  const sameSet = executionSet.length === request.enumerated.length
    && executionSet.every((t, i) => t.source === request.enumerated[i].source);
  if (!sameSet) {
    return { executed: false, reason: "execution-set-differs" };
  }
  if (request.automatic || request.recovery) {
    return { executed: false, reason: "automatic-or-recovery-denied" };
  }
  return { executed: true, deleted: executionSet.length };
}

test("explicit deletion enumerates, confirms, and denies ambiguous or automatic requests", () => {
  for (const lang of LANGS) {
    const section = sectionBetween(contract(lang), ["## 明示的完全削除", "## Explicit complete deletion"]);
    assert.match(section, lang === "ja" ? /「列挙→明示確認→実行」の3段/ : /enumerate, explicitly confirm, then execute/,
      `${lang}: three-step procedure`);
    assert.match(section, lang === "ja" ? /実行前に拒否します/ : /denied before execution/, `${lang}: ambiguity fails closed`);
    assert.match(section, lang === "ja" ? /回復手段として使いません/ : /never used as recovery/, `${lang}: no recovery purge`);
    assert.match(section, lang === "ja" ? /本文・秘密値を含めません/ : /never include bodies or secret values/,
      `${lang}: reports stay safe`);
    assert.match(section, lang === "ja" ? /`unavailable`のままであり.*profileの有効化が別途必要/s
      : /remain `unavailable`.*additionally requires enabling those profiles/is,
      `${lang}: reaching deletion still needs the shared-contract profile enablement`);
  }
  const targets = [{ source: "docs/wrong.md", group: "p/domain/main" }];
  const base = { enumerated: targets, group: "p/domain/main", confirmed: true };
  assert.deepEqual(executePurge(base), { executed: true, deleted: 1 });
  assert.deepEqual(executePurge({ ...base, enumerated: [] }), { executed: false, reason: "empty-enumeration" });
  assert.deepEqual(executePurge({ ...base, group: "p/intent/main" }), { executed: false, reason: "group-mismatch" });
  assert.deepEqual(executePurge({ ...base, confirmed: false }), { executed: false, reason: "not-confirmed" });
  assert.deepEqual(executePurge({ ...base, executionSet: [{ source: "docs/other.md", group: "p/domain/main" }] }),
    { executed: false, reason: "execution-set-differs" });
  assert.deepEqual(executePurge({ ...base, automatic: true }), { executed: false, reason: "automatic-or-recovery-denied" });
  assert.deepEqual(executePurge({ ...base, recovery: true }), { executed: false, reason: "automatic-or-recovery-denied" });
  for (const lang of LANGS) {
    const budgets = parseSyncBudgets(contract(lang));
    assert.deepEqual(authorizeBoundedCall(budgets, "purge", 15000, 0),
      { call: true, maxElapsedMs: 15000, retryCount: 0 }, `${lang}: the exact purge boundary is accepted`);
    assert.deepEqual(authorizeBoundedCall(budgets, "purge", 15001, 0),
      { call: false, reason: "bounded-timeout-unavailable" }, `${lang}: one millisecond over is rejected`);
    assert.deepEqual(authorizeBoundedCall(budgets, "purge", Number.POSITIVE_INFINITY, 0),
      { call: false, reason: "bounded-timeout-unavailable" }, `${lang}: an unbounded host is rejected before deleting`);
  }
});

test("the skill derives groups, displays staleness, and keeps deletion a separate confirmed procedure", () => {
  for (const [host, skillPath] of Object.entries(JA_SYNC_SKILLS)) {
    const body = skillBody(skillPath);
    assert.match(body, /group構成（プロジェクト・知識種別・作業系統）で導出し、系統・種別を混ぜない/, `${host}: group derivation`);
    assert.match(body, /「古い可能性」を表示する。表示のみで、同期・削除を自動起動しない/, `${host}: staleness display only`);
    assert.match(body, /## 削除手順（purge）/, `${host}: deletion is its own section`);
    assert.match(body, /一括確認と混ぜない/, `${host}: deletion stays out of the batch confirmation`);
    assert.match(body, /skill側で数値を再定義しない/, `${host}: limits are referenced, not redefined`);
    assert.match(body, /`gitContext`）を状態記録へ記録する/, `${host}: git context is recorded`);
  }
});

function searchContract(lang) {
  return fs.readFileSync(path.join(ROOT, "templates", lang, "intent", "graphiti-search-boundary.md"), "utf8");
}

function parseStagePurposes(body) {
  const section = sectionBetween(body, ["## 工程別の検索目的", "## Search purpose per stage"]);
  return section.split("\n").filter((line) => /^\| `/.test(line)).map((line) => cellValue(line.split("|")[1]));
}

// 契約意味の構造fixture: 工程に対応する種類だけを優先する
function prioritizeResults(stage, results) {
  const wanted = {
    discover: "concepts-people-decisions",
    compass: "rules-exceptions-periods",
    packets: "examples-boundaries-acceptance",
    "intent-search": "intent-candidates",
  }[stage];
  return results.filter((r) => r.kind === wanted);
}

function deriveSearchScope(request) {
  if (!request.kind || !request.stream) return { valid: false, reason: "kind-and-stream-required" };
  if (request.expandAutomatically) return { valid: false, reason: "auto-expansion-denied" };
  return { valid: true, groups: [`${request.project}/${request.kind}/${request.stream}`] };
}

test("search purposes stay stage-specific and scope requires explicit kind and stream", () => {
  for (const lang of LANGS) {
    assert.deepEqual(parseStagePurposes(searchContract(lang)), ["discover", "compass", "packets", "intent-search"],
      `${lang}: the four stages are fixed`);
    const body = searchContract(lang);
    assert.match(body, lang === "ja" ? /実行条件ではなく/ : /not an execution condition/, `${lang}: search never gates a stage`);
    assert.match(body, lang === "ja" ? /JITで読み、常時読み込みません/ : /just in time and never loads it permanently/,
      `${lang}: the contract stays JIT`);
    const scope = sectionBetween(body, ["## 範囲の限定", "## Scope limitation"]);
    assert.match(scope, lang === "ja" ? /明示して選び、全group・全文書の横断検索を既定にしません/
      : /selected explicitly; searching across all groups and all documents is never the default/,
      `${lang}: kind and stream are explicit choices`);
    assert.match(scope, lang === "ja" ? /検索範囲を自動拡大しません/ : /never expanded automatically/,
      `${lang}: no automatic scope expansion`);
  }
  const mixed = [
    { kind: "concepts-people-decisions", id: 1 },
    { kind: "rules-exceptions-periods", id: 2 },
    { kind: "examples-boundaries-acceptance", id: 3 },
  ];
  assert.deepEqual(prioritizeResults("discover", mixed).map((r) => r.id), [1], "discover keeps only its kinds");
  assert.deepEqual(prioritizeResults("compass", mixed).map((r) => r.id), [2], "compass keeps only its kinds");
  assert.deepEqual(prioritizeResults("packets", mixed).map((r) => r.id), [3], "packets keeps only its kinds");
  assert.deepEqual(deriveSearchScope({ project: "p", kind: "domain", stream: "main" }),
    { valid: true, groups: ["p/domain/main"] });
  assert.deepEqual(deriveSearchScope({ project: "p", stream: "main" }),
    { valid: false, reason: "kind-and-stream-required" }, "kind must be explicit");
  assert.deepEqual(deriveSearchScope({ project: "p", kind: "domain", stream: "main", expandAutomatically: true }),
    { valid: false, reason: "auto-expansion-denied" }, "automatic expansion is denied");
});

// 契約意味の構造fixture: 出典・時期による使い方の格下げ
function classifyResultUse(result) {
  if (!result.source) return { use: "hint-only" };
  if (result.validity === undefined) return { use: "candidate-not-current" };
  return { use: "candidate-with-canonical-confirmation", confirmedBy: "human-on-canonical" };
}

function degradeSearch(context) {
  if (!context.available) return { results: null, workflow: "existing-unchanged" };
  const flags = [];
  if (context.currentGit !== context.recordedGit) flags.push("possibly-stale");
  if (context.contradictsApprovedIntent) return { escalate: "human", applied: false, flags };
  return { applied: false, flags };
}

test("search results carry provenance fields and degrade by source and validity", () => {
  for (const lang of LANGS) {
    const section = sectionBetween(searchContract(lang), ["## 結果の付帯と扱い", "## Result attachments and handling"]);
    const fields = section.split("\n").filter((line) => /^\| `/.test(line)).map((line) => cellValue(line.split("|")[1]));
    assert.deepEqual(fields, ["source", "versionOrContentId", "observedAt", "episode", "validity"],
      `${lang}: the five result fields`);
    assert.match(section, /traceable-current/, `${lang}: evidenceState is referenced, not redefined`);
    assert.match(section, lang === "ja" ? /探す場所・関連語の候補に限って/ : /only as a hint for places or related terms/,
      `${lang}: provenance-less results stay hints`);
    assert.match(section, lang === "ja" ? /現在有効とみなしません/ : /never treated as currently valid/,
      `${lang}: unknown validity is not current`);
    assert.match(section, lang === "ja" ? /Markdown正本を開いて人が確定します/ : /canonical Markdown is opened and a person confirms/,
      `${lang}: humans confirm on canonical`);
  }
  assert.deepEqual(classifyResultUse({ validity: "2025-", source: "docs/rule.md" }),
    { use: "candidate-with-canonical-confirmation", confirmedBy: "human-on-canonical" });
  assert.deepEqual(classifyResultUse({ validity: "2025-" }), { use: "hint-only" }, "no source → hint only");
  assert.deepEqual(classifyResultUse({ source: "docs/rule.md" }), { use: "candidate-not-current" },
    "unknown validity is never current");
});

test("search degradation stays safe for staleness, contradiction, and unavailability", () => {
  for (const lang of LANGS) {
    const section = sectionBetween(searchContract(lang), ["## 縮退", "## Degradation"]);
    assert.match(section, lang === "ja" ? /自動同期せず、明示同期または正本の直接読解を案内します/
      : /no auto-sync happens, and an explicit sync or direct canonical reading is suggested/, `${lang}: staleness stays display`);
    assert.match(section, lang === "ja" ? /影響する判断を人へ戻します/ : /returned to a person/, `${lang}: contradictions escalate`);
    assert.match(section, lang === "ja" ? /入力・質問・成果物を変えずに続けます/ : /unchanged inputs, questions, and outputs/,
      `${lang}: unavailability keeps the workflow`);
  }
  assert.deepEqual(degradeSearch({ available: false }), { results: null, workflow: "existing-unchanged" });
  assert.deepEqual(degradeSearch({ available: true, currentGit: "b", recordedGit: "a" }),
    { applied: false, flags: ["possibly-stale"] });
  assert.deepEqual(degradeSearch({ available: true, currentGit: "a", recordedGit: "a", contradictsApprovedIntent: true }),
    { escalate: "human", applied: false, flags: [] });
});

test("the search path is read-only and its limit is fixed with boundary fixtures", () => {
  for (const lang of LANGS) {
    const section = sectionBetween(searchContract(lang), ["## 読取専用と上限", "## Read-only and limits"]);
    assert.match(section, lang === "ja" ? /追加・更新・完全削除へ到達できません/ : /Addition, update, and complete deletion are unreachable/,
      `${lang}: no write reachability`);
    assert.match(section, lang === "ja" ? /命令を実行しません/ : /never executed/, `${lang}: no instruction execution`);
    assert.match(section, lang === "ja" ? /永続化する新しい台帳を作りません/ : /No new ledger persists search results/,
      `${lang}: no new canonical ledger`);
    const budgets = Object.fromEntries(section
      .split("\n")
      .filter((line) => /^\| `[a-z-]+` \| \d/.test(line))
      .map((line) => {
        const [kind, maxElapsedMs, retryCount] = line.split("|").slice(1, -1).map(cellValue);
        return [kind, { maxElapsedMs: Number(maxElapsedMs), retryCount: Number(retryCount) }];
      }));
    assert.deepEqual(budgets, { search: { maxElapsedMs: 20000, retryCount: 0 } }, `${lang}: only the search budget`);
    assert.deepEqual(authorizeBoundedCall(budgets, "search", 20000, 0),
      { call: true, maxElapsedMs: 20000, retryCount: 0 }, `${lang}: exact boundary accepted`);
    assert.deepEqual(authorizeBoundedCall(budgets, "search", 20001, 0),
      { call: false, reason: "bounded-timeout-unavailable" }, `${lang}: one millisecond over is rejected`);
    assert.deepEqual(authorizeBoundedCall(budgets, "search", Number.POSITIVE_INFINITY, 0),
      { call: false, reason: "bounded-timeout-unavailable" }, `${lang}: unbounded host is rejected`);
    assert.deepEqual(authorizeBoundedCall(budgets, "search", 20000, 1),
      { call: false, reason: "retry-not-allowed" }, `${lang}: retry cannot widen the budget`);
  }
});

test("all seven rootdoc surfaces carry exactly one JIT reference line to the search contract", () => {
  const surfaces = [
    ["ja", path.join(ROOT, "CLAUDE_intent.md")],
    ["ja", path.join(ROOT, "templates", "ja", "agents", "claude", "CLAUDE_intent.md")],
    ["ja", path.join(ROOT, "templates", "ja", "agents", "codex", "AGENTS.md")],
    ["ja", path.join(ROOT, "templates", "ja", "agents", "gemini", "GEMINI_intent.md")],
    ["en", path.join(ROOT, "templates", "en", "agents", "claude", "CLAUDE_intent.md")],
    ["en", path.join(ROOT, "templates", "en", "agents", "codex", "AGENTS.md")],
    ["en", path.join(ROOT, "templates", "en", "agents", "gemini", "GEMINI_intent.md")],
  ];
  for (const [lang, file] of surfaces) {
    const body = fs.readFileSync(file, "utf8");
    const lines = body.split("\n").filter((line) => line.includes("graphiti-search-boundary.md"));
    assert.equal(lines.length, 1, `${file}: exactly one reference line, no permanent detail`);
    assert.match(lines[0], lang === "ja" ? /必要時だけ JIT で読む/ : /JIT-read the stage-specific search contract/,
      `${file}: the line stays a JIT pointer`);
  }
});

test("the dogfood search contract is byte-identical to the Japanese canonical template", () => {
  const dogfood = fs.readFileSync(path.join(ROOT, ".intent", "graphiti-search-boundary.md"), "utf8");
  assert.equal(dogfood, searchContract("ja"), "dogfood copy equals templates/ja canonical");
});
