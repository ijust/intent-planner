import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["ja", "en"];

function contract(lang) {
  return fs.readFileSync(
    path.join(ROOT, "templates", lang, "intent", "graphiti-safety-boundary.md"),
    "utf8",
  );
}

function cellValue(cell) {
  return cell.trim().replaceAll("`", "");
}

function parseProfiles(body) {
  const heading = body.includes("## 検証済み能力 profile")
    ? "## 検証済み能力 profile"
    : "## Verified capability profiles";
  const start = body.indexOf(heading);
  assert.notEqual(start, -1, "verified profile section exists");
  const section = body.slice(start, body.indexOf("\n## ", start + heading.length) === -1
    ? body.length
    : body.indexOf("\n## ", start + heading.length));
  const rows = section
    .split("\n")
    .filter((line) => /^\| `official-/.test(line))
    .map((line) => line.split("|").slice(1, -1).map(cellValue));
  return rows.map(([profileId, capability, toolName, requiredSchema, effect, maxState]) => ({
    profileId,
    capability,
    toolName,
    requiredSchema: requiredSchema === "none"
      ? []
      : requiredSchema.split(",").map((field) => {
        const [name, type] = field.trim().split(":");
        return { name, type };
      }),
    effect,
    maxState,
  }));
}

function sectionBetween(body, headings) {
  const heading = headings.find((candidate) => body.includes(candidate));
  assert.ok(heading, `one section heading exists: ${headings.join(" / ")}`);
  const start = body.indexOf(heading);
  const next = body.indexOf("\n## ", start + heading.length);
  return body.slice(start, next === -1 ? body.length : next);
}

function parseCallBudgets(body) {
  const section = sectionBetween(body, ["## 有限時間の呼出し", "## Bounded calls"]);
  return Object.fromEntries(section
    .split("\n")
    .filter((line) => /^\| `(status|search|upsert|purge|web-fetch)`/.test(line))
    .map((line) => {
      const [kind, maxElapsedMs, retryCount] = line.split("|").slice(1, -1).map(cellValue);
      return [kind, { maxElapsedMs: Number(maxElapsedMs), retryCount: Number(retryCount) }];
    }));
}

function parseStatusOutcomes(body) {
  const section = sectionBetween(body, ["## status結果による縮退", "## Status outcome degradation"]);
  return Object.fromEntries(section
    .split("\n")
    .filter((line) => /^\| `(success|timeout|transport-error|payload-error)`/.test(line))
    .map((line) => {
      const [outcome, reason, matchedState, existingWorkflow] = line.split("|").slice(1, -1).map(cellValue);
      return [outcome, { reason, matchedState, existingWorkflow }];
    }));
}

const REPORT_FIXED_FIELDS = [
  "documentsSent",
  "externalMutations",
  "persistedLocally",
  "fallback.graphitiRequired",
  "fallback.continueCurrentWorkflow",
];

const EXPECTED_REPORT_FIXED_VALUES = {
  documentsSent: 0,
  externalMutations: 0,
  persistedLocally: false,
  "fallback.graphitiRequired": false,
  "fallback.continueCurrentWorkflow": true,
};

function parseReportScalar(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return Number(raw);
}

function parseReportFixedValues(body) {
  const section = sectionBetween(body, ["## 一時的なpreflight報告", "## Ephemeral preflight report"]);
  return Object.fromEntries(section
    .split("\n")
    .map((line) => line.match(/^- `([^`]+)`: (?:常に|always )?(0|1|true|false)(?:\s|$)/))
    .filter((match) => match && REPORT_FIXED_FIELDS.includes(match[1]))
    .map((match) => [match[1], parseReportScalar(match[2])]));
}

function parseSensitiveReportPolicy(body, lang) {
  const section = sectionBetween(body, ["## 一時的なpreflight報告", "## Ephemeral preflight report"]);
  if (lang === "ja") {
    const safe = /接続先の生値、credential、status payload、文書本文は表示せず、報告の入力にも含めず、ログ、設定、Graphiti、ローカルファイル、Git、`\.intent\/`へ永続化しません/.test(section);
    const unsafe = /接続先の生値、credential、status payload、文書本文は表示し、報告の入力に含め、ログ、設定、Graphiti、ローカルファイル、Git、`\.intent\/`へ永続化します/.test(section);
    return safe
      ? { displayed: false, acceptedAsReportInput: false, persisted: false }
      : unsafe
        ? { displayed: true, acceptedAsReportInput: true, persisted: true }
        : { displayed: "unspecified", acceptedAsReportInput: "unspecified", persisted: "unspecified" };
  }
  const safe = /Raw connection endpoints, credentials, status payloads, and document bodies are neither displayed nor accepted as report inputs, and are never persisted to logs, configuration, Graphiti, local files, Git, or `\.intent\/`/.test(section);
  const unsafe = /Raw connection endpoints, credentials, status payloads, and document bodies are displayed, accepted as report inputs, and persisted to logs, configuration, Graphiti, local files, Git, or `\.intent\/`/.test(section);
  return safe
    ? { displayed: false, acceptedAsReportInput: false, persisted: false }
    : unsafe
      ? { displayed: true, acceptedAsReportInput: true, persisted: true }
      : { displayed: "unspecified", acceptedAsReportInput: "unspecified", persisted: "unspecified" };
}

function assertSafeReportContract(body, lang) {
  assert.deepEqual(
    parseReportFixedValues(body),
    EXPECTED_REPORT_FIXED_VALUES,
    `${lang}: fixed report values are parsed from the contract`,
  );
  assert.deepEqual(
    parseSensitiveReportPolicy(body, lang),
    { displayed: false, acceptedAsReportInput: false, persisted: false },
    `${lang}: sensitive values are excluded at display, input, and persistence boundaries`,
  );
}

function authorizeBoundedCall(budgets, kind, hostGuaranteedMaxMs, retryCount) {
  const budget = budgets[kind];
  assert.ok(budget, `known call kind: ${kind}`);
  if (retryCount !== budget.retryCount) {
    return { call: false, reason: "retry-not-allowed" };
  }
  if (!Number.isFinite(hostGuaranteedMaxMs) || hostGuaranteedMaxMs > budget.maxElapsedMs) {
    return { call: false, reason: "bounded-timeout-unavailable" };
  }
  return { call: true, maxElapsedMs: hostGuaranteedMaxMs, retryCount };
}

function applyStatusOutcome(catalogResults, outcome) {
  if (outcome === "success") {
    return catalogResults.map((result) => result.capability === "status" && result.support === "supported"
      ? { ...result, state: "available", reason: undefined }
      : result);
  }
  const reason = outcome === "timeout" ? "timeout" : "status-error";
  return catalogResults.map((result) => result.support === "supported"
    ? { ...result, state: "unavailable", reason }
    : result);
}

function makeSafeReport(capabilities) {
  const usable = capabilities.filter(({ state }) => state === "available").length;
  return {
    mode: "preflight-only",
    overall: usable === 4 ? "available" : usable === 0 ? "unavailable" : "partially-available",
    capabilities: capabilities.map(({ capability, support, state, reason }) => ({
      target: capability,
      support,
      state,
      reason,
    })),
    documentsSent: 0,
    externalMutations: 0,
    persistedLocally: false,
    fallback: {
      canonical: ".intent Markdown and source artifacts",
      graphitiRequired: false,
      continueCurrentWorkflow: true,
    },
  };
}

function schemaMatches(profile, inputSchema) {
  const required = new Set(inputSchema.required ?? []);
  const expected = new Map(profile.requiredSchema.map((field) => [field.name, field.type]));
  if (required.size !== expected.size) return false;
  for (const [name, type] of expected) {
    if (!required.has(name) || inputSchema.properties?.[name]?.type !== type) return false;
  }
  return true;
}

function classifyOne(profiles, descriptor) {
  const namedProfiles = profiles.filter((profile) => profile.toolName === descriptor.name);
  if (namedProfiles.length === 0) {
    return { support: "unsupported", state: "unavailable", reason: "not-exposed" };
  }
  const matched = namedProfiles.find((profile) => schemaMatches(profile, descriptor.inputSchema));
  if (!matched) {
    return { support: "unsupported", state: "unavailable", reason: "schema-mismatch" };
  }
  if (!descriptor.callableInCurrentSkill) {
    return {
      capability: matched.capability,
      support: "supported",
      state: "unavailable",
      reason: "not-callable",
      profileId: matched.profileId,
    };
  }
  if (matched.capability === "status") {
    return {
      capability: matched.capability,
      support: "supported",
      state: "unverified",
      reason: "runtime-dependency-unverified",
      profileId: matched.profileId,
    };
  }
  return {
    capability: matched.capability,
    support: "supported",
    state: matched.maxState,
    reason: matched.maxState === "unverified"
      ? "runtime-dependency-unverified"
      : matched.maxState === "unavailable"
        ? "not-enabled-in-this-spec"
        : undefined,
    profileId: matched.profileId,
  };
}

function applyReadOnlyStatusSuccess(catalogResult) {
  assert.deepEqual(
    {
      capability: catalogResult.capability,
      support: catalogResult.support,
      state: catalogResult.state,
      profileId: catalogResult.profileId,
    },
    {
      capability: "status",
      support: "supported",
      state: "unverified",
      profileId: "official-get-status-v1",
    },
    "only the verified status profile can receive a successful read-only status observation",
  );
  return { ...catalogResult, state: "available", reason: undefined };
}

function classifyCatalog(profiles, descriptors) {
  return ["status", "search", "upsert", "purge"].map((capability) => {
    const capabilityProfiles = profiles.filter((profile) => profile.capability === capability);
    const acceptedNames = new Set(capabilityProfiles.map((profile) => profile.toolName));
    const candidates = descriptors.filter(({ name }) => acceptedNames.has(name));
    if (candidates.length === 0) {
      return { capability, support: "unsupported", state: "unavailable", reason: "not-exposed" };
    }
    const results = candidates.map((candidate) => classifyOne(capabilityProfiles, candidate));
    const supported = results.find((result) => result.support === "supported");
    if (supported) return supported;
    return { capability, ...results[0] };
  });
}

function descriptor(name, requiredFields, optionalFields = []) {
  return {
    name,
    callableInCurrentSkill: true,
    inputSchema: {
      type: "object",
      required: requiredFields.map(([field]) => field),
      properties: Object.fromEntries([...requiredFields, ...optionalFields].map(([field, type]) => [
        field,
        { type },
      ])),
    },
  };
}

const EXPECTED_PROFILES = [
  ["official-get-status-v1", "status", "get_status", [], "available"],
  ["official-search-facts-v1", "search", "search_memory_facts", [["query", "string"]], "unverified"],
  ["official-search-nodes-v1", "search", "search_nodes", [["query", "string"]], "unverified"],
  ["official-add-memory-v1", "upsert", "add_memory", [["name", "string"], ["episode_body", "string"]], "unverified"],
  ["official-delete-edge-v1", "purge", "delete_entity_edge", [["uuid", "string"]], "unavailable"],
  ["official-delete-episode-v1", "purge", "delete_episode", [["uuid", "string"]], "unavailable"],
  ["official-clear-graph-v1", "purge", "clear_graph", [], "unavailable"],
];

test("Graphiti safety contract fixes the same exact capability profiles in Japanese and English", () => {
  for (const lang of LANGS) {
    const profiles = parseProfiles(contract(lang));
    assert.deepEqual(
      profiles.map((profile) => [
        profile.profileId,
        profile.capability,
        profile.toolName,
        profile.requiredSchema.map(({ name, type }) => [name, type]),
        profile.maxState,
      ]),
      EXPECTED_PROFILES,
      `${lang}: exact verified profile set`,
    );
    assert.equal(new Set(profiles.map(({ capability }) => capability)).size, 4, `${lang}: four capabilities remain separate`);
  }
});

test("each verified tool reaches only its profile's conservative preflight maximum", () => {
  for (const lang of LANGS) {
    const profiles = parseProfiles(contract(lang));
    for (const [profileId, capability, toolName, requiredFields, maxState] of EXPECTED_PROFILES) {
      const catalogResult = classifyOne(profiles, descriptor(toolName, requiredFields));
      const result = capability === "status"
        ? applyReadOnlyStatusSuccess(catalogResult)
        : catalogResult;
      assert.deepEqual(
        { profileId: result.profileId, capability: result.capability, support: result.support, state: result.state },
        { profileId, capability, support: "supported", state: maxState },
        `${lang}/${profileId}: profile evidence and maximum state`,
      );
    }
  }
});

test("catalog matching cannot make status available before a separate read-only status success", () => {
  for (const lang of LANGS) {
    const profiles = parseProfiles(contract(lang));
    const catalogResult = classifyOne(profiles, descriptor("get_status", []));
    assert.equal(catalogResult.support, "supported", `${lang}: exact profile establishes support`);
    assert.equal(catalogResult.state, "unverified", `${lang}: catalog evidence alone is not readiness`);
    const statusResult = applyReadOnlyStatusSuccess(catalogResult);
    assert.equal(statusResult.state, "available", `${lang}: a separate successful status observation reaches the upper bound`);
  }
});

test("empty and partial catalogs still return one separate result for every capability", () => {
  for (const lang of LANGS) {
    const profiles = parseProfiles(contract(lang));
    const empty = classifyCatalog(profiles, []);
    assert.deepEqual(empty.map(({ capability }) => capability), ["status", "search", "upsert", "purge"]);
    assert.ok(
      empty.every(({ support, state }) => support === "unsupported" && state === "unavailable"),
      `${lang}: empty catalog leaves all capabilities unavailable`,
    );

    const searchOnly = classifyCatalog(
      profiles,
      [descriptor("search_memory_facts", [["query", "string"]])],
    );
    assert.deepEqual(
      searchOnly.map(({ capability, support, state }) => ({ capability, support, state })),
      [
        { capability: "status", support: "unsupported", state: "unavailable" },
        { capability: "search", support: "supported", state: "unverified" },
        { capability: "upsert", support: "unsupported", state: "unavailable" },
        { capability: "purge", support: "unsupported", state: "unavailable" },
      ],
      `${lang}: one search match is not reused by the other capabilities`,
    );
  }
});

test("unknown names and schema mismatches cannot become supported or available", () => {
  for (const lang of LANGS) {
    const profiles = parseProfiles(contract(lang));
    const cases = [
      [descriptor("custom_get_status", []), "not-exposed"],
      [descriptor("other.get_status", []), "not-exposed"],
      [descriptor("search_memory_facts", []), "schema-mismatch"],
      [descriptor("search_memory_facts", [["query", "number"]]), "schema-mismatch"],
      [descriptor("search_memory_facts", [["query", "string"], ["tenant", "string"]]), "schema-mismatch"],
      [descriptor("add_triplet", [["group_id", "string"]]), "not-exposed"],
    ];
    for (const [candidate, reason] of cases) {
      assert.deepEqual(
        classifyOne(profiles, candidate),
        { support: "unsupported", state: "unavailable", reason },
        `${lang}/${candidate.name}: rejected conservatively`,
      );
    }
  }
});

test("optional group fields neither grant a capability nor raise its state", () => {
  for (const lang of LANGS) {
    const profiles = parseProfiles(contract(lang));
    const base = classifyOne(profiles, descriptor("search_memory_facts", [["query", "string"]]));
    const withGroup = classifyOne(
      profiles,
      descriptor("search_memory_facts", [["query", "string"]], [["group_id", "string"]]),
    );
    assert.deepEqual(withGroup, base, `${lang}: optional group_id is not capability or authorization evidence`);
    assert.equal(withGroup.state, "unverified", `${lang}: group_id does not make search available`);
  }
});

test("a matched but currently uncallable tool remains unavailable", () => {
  for (const lang of LANGS) {
    const profiles = parseProfiles(contract(lang));
    const candidate = descriptor("get_status", []);
    candidate.callableInCurrentSkill = false;
    assert.deepEqual(classifyOne(profiles, candidate), {
      capability: "status",
      support: "supported",
      state: "unavailable",
      reason: "not-callable",
      profileId: "official-get-status-v1",
    }, `${lang}: catalog support is separate from current readiness`);
  }
});

test("contracts fix the capability state and reason vocabularies and forbid inference", () => {
  for (const lang of LANGS) {
    const body = contract(lang);
    for (const token of [
      "supported", "unsupported", "available", "unavailable", "unverified",
      "not-installed", "not-exposed", "not-callable", "schema-mismatch",
      "status-error", "timeout", "bounded-timeout-unavailable",
      "runtime-dependency-unverified", "not-enabled-in-this-spec",
    ]) {
      assert.ok(body.includes(`\`${token}\``), `${lang}: controlled token ${token}`);
    }
    assert.match(body, lang === "ja" ? /名前だけ.*推測.*能力/ : /name alone.*infer.*capability/i);
    assert.match(body, /group_id/);
  }
});

test("profile mutations change classification instead of silently widening it", () => {
  const original = contract("en");
  const mutated = original.replace("`search_memory_facts` |", "`renamed_search_memory_facts` |");
  assert.notEqual(mutated, original, "mutation changed the contract");
  const profiles = parseProfiles(mutated);
  const result = classifyOne(profiles, descriptor("search_memory_facts", [["query", "string"]]));
  assert.deepEqual(
    result,
    { support: "unsupported", state: "unavailable", reason: "not-exposed" },
    "a removed exact tool name cannot be recovered by inference",
  );
});

test("each remote call has an exact inclusive upper bound and zero retries", () => {
  const expected = {
    status: { maxElapsedMs: 5000, retryCount: 0 },
    search: { maxElapsedMs: 20000, retryCount: 0 },
    upsert: { maxElapsedMs: 30000, retryCount: 0 },
    purge: { maxElapsedMs: 15000, retryCount: 0 },
    "web-fetch": { maxElapsedMs: 20000, retryCount: 0 },
  };
  for (const lang of LANGS) {
    const budgets = parseCallBudgets(contract(lang));
    assert.deepEqual(budgets, expected, `${lang}: exact call budgets`);
    for (const [kind, { maxElapsedMs }] of Object.entries(expected)) {
      assert.deepEqual(
        authorizeBoundedCall(budgets, kind, maxElapsedMs, 0),
        { call: true, maxElapsedMs, retryCount: 0 },
        `${lang}/${kind}: the exact boundary is accepted`,
      );
      assert.deepEqual(
        authorizeBoundedCall(budgets, kind, maxElapsedMs + 1, 0),
        { call: false, reason: "bounded-timeout-unavailable" },
        `${lang}/${kind}: one millisecond over the boundary is rejected before calling`,
      );
      assert.deepEqual(
        authorizeBoundedCall(budgets, kind, Number.POSITIVE_INFINITY, 0),
        { call: false, reason: "bounded-timeout-unavailable" },
        `${lang}/${kind}: a host without an enforceable bound is rejected before calling`,
      );
      assert.deepEqual(
        authorizeBoundedCall(budgets, kind, maxElapsedMs, 1),
        { call: false, reason: "retry-not-allowed" },
        `${lang}/${kind}: retry cannot widen the budget`,
      );
    }
  }
});

test("status outcomes are distinct and failures downgrade only matched Graphiti capabilities", () => {
  for (const lang of LANGS) {
    assert.deepEqual(parseStatusOutcomes(contract(lang)), {
      success: { reason: "none", matchedState: "status available; others keep profile maximum", existingWorkflow: "continue" },
      timeout: { reason: "timeout", matchedState: "support retained; all unavailable", existingWorkflow: "continue" },
      "transport-error": { reason: "status-error", matchedState: "support retained; all unavailable", existingWorkflow: "continue" },
      "payload-error": { reason: "status-error", matchedState: "support retained; all unavailable", existingWorkflow: "continue" },
    }, `${lang}: exact status outcome degradation table`);
    const profiles = parseProfiles(contract(lang));
    const catalog = classifyCatalog(profiles, [
      descriptor("get_status", []),
      descriptor("search_memory_facts", [["query", "string"]]),
      descriptor("add_memory", [["name", "string"], ["episode_body", "string"]]),
    ]);
    const success = applyStatusOutcome(catalog, "success");
    assert.deepEqual(
      success.map(({ capability, state, reason }) => ({ capability, state, reason })),
      [
        { capability: "status", state: "available", reason: undefined },
        { capability: "search", state: "unverified", reason: "runtime-dependency-unverified" },
        { capability: "upsert", state: "unverified", reason: "runtime-dependency-unverified" },
        { capability: "purge", state: "unavailable", reason: "not-exposed" },
      ],
      `${lang}: success promotes only status`,
    );
    for (const [outcome, reason] of [
      ["timeout", "timeout"],
      ["transport-error", "status-error"],
      ["payload-error", "status-error"],
    ]) {
      const failed = applyStatusOutcome(catalog, outcome);
      assert.deepEqual(
        failed.filter(({ support }) => support === "supported").map(({ capability, support, state, reason: actual }) => ({
          capability,
          support,
          state,
          reason: actual,
        })),
        ["status", "search", "upsert"].map((capability) => ({
          capability,
          support: "supported",
          state: "unavailable",
          reason,
        })),
        `${lang}/${outcome}: support is retained but readiness fails closed`,
      );
      assert.deepEqual(
        failed.find(({ capability }) => capability === "purge"),
        catalog.find(({ capability }) => capability === "purge"),
        `${lang}/${outcome}: an absent profile is not rewritten as a remote status result`,
      );
    }
  }
});

test("preflight reports expose only safe targets, reasons, zero side effects, and the existing fallback", () => {
  const endpoint = "https://user:raw-password@graphiti.internal.example:8443";
  const credential = "sk-fixture-must-not-appear";
  const documentBody = "private document fixture";
  for (const lang of LANGS) {
    const body = contract(lang);
    const reportSection = sectionBetween(body, ["## 一時的なpreflight報告", "## Ephemeral preflight report"]);
    assert.ok(reportSection.includes("`preflight-only`"), `${lang}: report fixes preflight-only mode`);
    assertSafeReportContract(body, lang);
    if (lang === "ja") {
      assert.match(reportSection, /導入.*起動.*初期化.*更新.*認証情報.*課金.*担わ/);
    } else {
      assert.match(reportSection, /does not install, start, initialize, or update Graphiti.*manage authentication or billing/is);
    }

    const profiles = parseProfiles(body);
    const failed = applyStatusOutcome(classifyCatalog(profiles, [
      descriptor("get_status", []),
      descriptor("search_nodes", [["query", "string"]]),
    ]), "payload-error");
    const report = makeSafeReport(failed, { endpoint, credential, documentBody });
    assert.equal(report.overall, "unavailable", `${lang}: status failure is not reported as success`);
    assert.equal(report.documentsSent, 0, `${lang}: no document transmission during preflight`);
    assert.equal(report.externalMutations, 0, `${lang}: no external mutation during preflight`);
    assert.equal(report.persistedLocally, false, `${lang}: report is ephemeral`);
    assert.equal(report.fallback.graphitiRequired, false, `${lang}: Graphiti is not a workflow gate`);
    assert.equal(report.fallback.continueCurrentWorkflow, true, `${lang}: the existing workflow continues`);
    const serialized = JSON.stringify(report);
    for (const forbidden of [endpoint, credential, documentBody]) {
      assert.equal(serialized.includes(forbidden), false, `${lang}: raw sensitive input is absent from the report`);
      assert.equal(reportSection.includes(forbidden), false, `${lang}: fixture secret is absent from the contract`);
    }
    assert.deepEqual(
      report.capabilities.map(({ target }) => target),
      ["status", "search", "upsert", "purge"],
      `${lang}: report distinguishes safe capability targets`,
    );
  }
});

test("reversed side-effect, fallback, and sensitive-report rules fail the contract oracle in both languages", () => {
  for (const lang of LANGS) {
    const original = contract(lang);
    const mutated = lang === "ja"
      ? original
        .replace("- `documentsSent`: 常に0", "- `documentsSent`: 常に1")
        .replace("- `externalMutations`: 常に0", "- `externalMutations`: 常に1")
        .replace("- `persistedLocally`: 常にfalse", "- `persistedLocally`: 常にtrue")
        .replace("- `fallback.graphitiRequired`: 常にfalse", "- `fallback.graphitiRequired`: 常にtrue")
        .replace("- `fallback.continueCurrentWorkflow`: 常にtrue", "- `fallback.continueCurrentWorkflow`: 常にfalse")
        .replace(
          "接続先の生値、credential、status payload、文書本文は表示せず、報告の入力にも含めず、ログ、設定、Graphiti、ローカルファイル、Git、`.intent/`へ永続化しません",
          "接続先の生値、credential、status payload、文書本文は表示し、報告の入力に含め、ログ、設定、Graphiti、ローカルファイル、Git、`.intent/`へ永続化します",
        )
      : original
        .replace("- `documentsSent`: always 0", "- `documentsSent`: always 1")
        .replace("- `externalMutations`: always 0", "- `externalMutations`: always 1")
        .replace("- `persistedLocally`: always false", "- `persistedLocally`: always true")
        .replace("- `fallback.graphitiRequired`: always false", "- `fallback.graphitiRequired`: always true")
        .replace("- `fallback.continueCurrentWorkflow`: always true", "- `fallback.continueCurrentWorkflow`: always false")
        .replace(
          "Raw connection endpoints, credentials, status payloads, and document bodies are neither displayed nor accepted as report inputs, and are never persisted to logs, configuration, Graphiti, local files, Git, or `.intent/`",
          "Raw connection endpoints, credentials, status payloads, and document bodies are displayed, accepted as report inputs, and persisted to logs, configuration, Graphiti, local files, Git, or `.intent/`",
        );
    assert.notEqual(mutated, original, `${lang}: representative unsafe mutation changed the contract`);
    assert.throws(
      () => assertSafeReportContract(mutated, lang),
      assert.AssertionError,
      `${lang}: unsafe report mutation is rejected`,
    );
  }
});

test("removing the fixed call budget is detected instead of inheriting an unbounded default", () => {
  const original = contract("en");
  const mutated = original.replace("| `status` | 5000 | 0 |", "| `status` | 5001 | 0 |");
  assert.notEqual(mutated, original, "mutation changed the status threshold");
  assert.notDeepEqual(
    parseCallBudgets(mutated),
    parseCallBudgets(original),
    "the threshold mutation is visible to the discriminative oracle",
  );
});
