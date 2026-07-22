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
