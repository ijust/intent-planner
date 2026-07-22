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
