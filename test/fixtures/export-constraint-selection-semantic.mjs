const DOWNSTREAM_FIELDS = [
  "Identifier",
  "Name",
  "Law",
  "Applicability",
  "Verification",
  "Canonical Reference",
];

const baseProjection = {
  applicability: "Packet Scope の export 変更にだけ適用する",
  verification: "対象下書きの制約IDを観測し、欠落していれば失敗とする",
};

export const CONSTRAINT_SELECTION_FIXTURES = Object.freeze([
  {
    id: "INV-ACTIVE-RELATED",
    name: "関係するactive制約",
    status: "active",
    area: "出口",
    relevance: "relevant",
    revisitSatisfied: false,
    expected: "selected",
    law: "関係する制約だけを下流へ渡す。",
    canonical: ".intent/compass/INV-ACTIVE-RELATED.md",
    ...baseProjection,
  },
  {
    id: "INV-ACTIVE-UNRELATED",
    name: "無関係なactive制約",
    status: "active",
    area: "認証",
    relevance: "irrelevant",
    revisitSatisfied: false,
    expected: "excluded",
    law: "認証情報を保護する。",
    canonical: ".intent/compass/INV-ACTIVE-UNRELATED.md",
    ...baseProjection,
  },
  {
    id: "DR-SUPERSEDED",
    name: "置き換え済み判断",
    status: "superseded",
    area: "出口",
    relevance: "relevant",
    revisitSatisfied: false,
    expected: "excluded",
    law: "古い下流形式を使う。",
    canonical: ".intent/compass/DR-SUPERSEDED.md",
    ...baseProjection,
  },
  {
    id: "DR-REVISIT-SATISFIED",
    name: "見直し条件が成立したactive判断",
    status: "active",
    area: "出口",
    relevance: "relevant",
    revisitSatisfied: true,
    expected: "selected",
    law: "人が見直すまで現行判断を保持する。",
    canonical: ".intent/compass/DR-REVISIT-SATISFIED.md",
    ...baseProjection,
  },
  {
    id: "INV-RELEVANCE-UNKNOWN",
    name: "関連性を判断できない制約",
    status: "active",
    area: "出口",
    relevance: "unknown",
    revisitSatisfied: false,
    expected: "confirm",
    law: "対象となる場合は互換性を保つ。",
    canonical: ".intent/compass/INV-RELEVANCE-UNKNOWN.md",
    ...baseProjection,
  },
  {
    id: "INV-ALWAYS",
    name: "横断規律",
    status: "active",
    area: "always",
    relevance: "cross-cutting",
    revisitSatisfied: false,
    expected: "selected",
    law: "無関係な正本全文を下流へ注入しない。",
    canonical: ".intent/compass/INV-ALWAYS.md",
    ...baseProjection,
  },
  {
    id: "INV-PROJECTION-INCOMPLETE",
    name: "下流形式へ写せない制約",
    status: "active",
    area: "出口",
    relevance: "relevant",
    revisitSatisfied: false,
    expected: "confirm",
    law: "確認できた情報だけを確定制約として扱う。",
    canonical: ".intent/compass/INV-PROJECTION-INCOMPLETE.md",
    applicability: baseProjection.applicability,
    verification: "",
  },
]);

function hasCompleteProjection(candidate) {
  return [
    candidate.id,
    candidate.name,
    candidate.law,
    candidate.applicability,
    candidate.verification,
    candidate.canonical,
  ].every((value) => typeof value === "string" && value.trim().length > 0);
}

function selectionReason(candidate) {
  if (candidate.area === "always") return "activeな横断規律（area always）";
  if (candidate.revisitSatisfied) {
    return "activeかつ関連あり。見直し条件成立後も人の見直しまでは現行判断を保持";
  }
  return "activeかつPacketのScope・Validationに関係あり";
}

function project(candidate) {
  return {
    Identifier: candidate.id,
    Name: candidate.name,
    Law: candidate.law,
    Applicability: candidate.applicability,
    Verification: candidate.verification,
    "Canonical Reference": candidate.canonical,
  };
}

function classify(candidate, mutation) {
  if (candidate.status === "superseded" || candidate.status === "archive") {
    if (!mutation.ignoreSuperseded) return { outcome: "excluded", reason: "non-active" };
  }
  if (candidate.status !== "active" && !mutation.ignoreSuperseded) {
    return { outcome: "confirm", kind: "relevance", missing: "activeなstatus" };
  }
  if (candidate.area !== "always") {
    if (candidate.relevance === "unknown" || candidate.relevance == null) {
      return {
        outcome: "confirm",
        kind: "relevance",
        evidence: "statusはactiveだがarea・impactだけでは関係を判断できない",
        missing: "Packetとの意味上の関連性",
      };
    }
    if (candidate.relevance === "irrelevant" && !mutation.includeUnrelated) {
      return { outcome: "excluded", reason: "unrelated" };
    }
    if (candidate.relevance !== "relevant" && !mutation.includeUnrelated) {
      return {
        outcome: "confirm",
        kind: "relevance",
        evidence: "statusはactive",
        missing: "Packetとの意味上の関連性",
      };
    }
  }
  if (!hasCompleteProjection(candidate) && !mutation.selectIncompleteProjection) {
    const missingFields = [
      ["Name", candidate.name],
      ["Law", candidate.law],
      ["Applicability", candidate.applicability],
      ["Verification", candidate.verification],
      ["Canonical Reference", candidate.canonical],
    ].filter(([, value]) => typeof value !== "string" || value.trim().length === 0);
    return {
      outcome: "confirm",
      kind: "projection",
      evidence: "activeかつ関連あり。既知の下流項目は保持",
      missing: missingFields.map(([field]) => field).join(", "),
    };
  }
  return { outcome: "selected", reason: selectionReason(candidate) };
}

export function createConstraintSelectionSubject({
  candidates = CONSTRAINT_SELECTION_FIXTURES,
  mutation = {},
} = {}) {
  const selected = [];
  const confirm = [];
  const excluded = [];
  const downstream = [];

  for (const candidate of candidates) {
    const result = classify(candidate, mutation);
    if (result.outcome === "selected") {
      selected.push({
        id: candidate.id,
        name: candidate.name,
        reason: result.reason,
        canonical: candidate.canonical,
      });
      downstream.push(project(candidate));
    } else if (result.outcome === "confirm") {
      confirm.push({
        id: candidate.id,
        kind: result.kind,
        evidence: result.evidence ?? "候補のstatusとindex要旨は確認済み",
        missing: result.missing,
        canonical: candidate.canonical,
      });
    } else {
      excluded.push({ id: candidate.id });
    }
  }

  const selectedAt = "2026-07-21T00:00:00.000Z";
  const sources = [
    "packet://pkt-semantic-fixture",
    ".intent/compass/index.md",
    ...candidates
      .filter((candidate) => selected.some(({ id }) => id === candidate.id)
        || confirm.some(({ id, kind }) => id === candidate.id && kind === "projection"))
      .map(({ canonical }) => canonical),
  ];
  const packet = [
    "# Semantic fixture Packet",
    "Scope: exportの制約選別を検証する",
    "Validation: 下流IDと採用IDが一致する",
  ].join("\n");

  return {
    candidates: structuredClone(candidates),
    selected_at: selectedAt,
    selection_status: "applied",
    source_mode: "split-compass",
    degraded_reasons: [],
    sources,
    selected,
    confirm,
    excluded,
    downstream,
    record: {
      selected_at: selectedAt,
      selection_status: "applied",
      source_mode: "split-compass",
      degraded_reasons: [],
      sources: [...sources],
      selected: selected.map(({ id, name, reason, canonical }) => ({
        id,
        name,
        reason,
        canonical,
      })),
      confirmation_candidates: confirm.map((candidate) => ({ ...candidate })),
      excluded_count: excluded.length,
      zero_selected: selected.length === 0,
      legacy_output: "非適用",
    },
    packet_before: packet,
    packet_after: packet,
  };
}

function sameIds(actual, expected) {
  return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
}

export function collectConstraintSelectionViolations(subject) {
  const violations = [];
  const rejectUnless = (condition, id) => {
    if (!condition && !violations.includes(id)) violations.push(id);
  };
  const idsByOutcome = {
    selected: subject.selected.map(({ id }) => id),
    confirm: subject.confirm.map(({ id }) => id),
    excluded: subject.excluded.map(({ id }) => id),
  };

  for (const candidate of subject.candidates) {
    const actual = Object.entries(idsByOutcome)
      .filter(([, ids]) => ids.includes(candidate.id))
      .map(([outcome]) => outcome);
    rejectUnless(actual.length === 1, `sets.${candidate.id}.not-exclusive`);
    if (actual[0] !== candidate.expected) {
      const violation = candidate.id === "DR-SUPERSEDED"
        ? "state.superseded-selected"
        : candidate.id === "INV-ACTIVE-UNRELATED"
          ? "relevance.unrelated-selected"
          : candidate.id === "INV-PROJECTION-INCOMPLETE"
            ? "projection.incomplete-selected"
            : `outcome.${candidate.id}.${actual[0] ?? "missing"}`;
      rejectUnless(false, violation);
    }
  }

  const selectedIds = idsByOutcome.selected;
  const confirmIds = idsByOutcome.confirm;
  rejectUnless(
    selectedIds.every((id) => !confirmIds.includes(id)),
    "sets.selected-confirm-overlap",
  );
  rejectUnless(
    sameIds(subject.downstream.map(({ Identifier }) => Identifier), selectedIds),
    "downstream.id-set-mismatch",
  );
  for (const constraint of subject.downstream) {
    rejectUnless(
      sameIds(Object.keys(constraint).sort(), [...DOWNSTREAM_FIELDS].sort()),
      `downstream.${constraint.Identifier}.not-minimal-six-fields`,
    );
    rejectUnless(
      DOWNSTREAM_FIELDS.every((field) =>
        typeof constraint[field] === "string" && constraint[field].trim().length > 0),
      `downstream.${constraint.Identifier}.incomplete`,
    );
  }

  rejectUnless(subject.selection_status === "applied", "source.selection-status");
  rejectUnless(subject.source_mode === "split-compass", "source.mode");
  rejectUnless(subject.degraded_reasons.length === 0, "source.unexpected-degradation");
  rejectUnless(subject.sources.includes("packet://pkt-semantic-fixture"), "source.packet-missing");
  rejectUnless(subject.sources.includes(".intent/compass/index.md"), "source.index-missing");
  for (const candidate of subject.candidates) {
    const lawWasRead = selectedIds.includes(candidate.id)
      || subject.confirm.some(({ id, kind }) => id === candidate.id && kind === "projection");
    rejectUnless(
      subject.sources.includes(candidate.canonical) === lawWasRead,
      `source.${candidate.id}.law-read-boundary`,
    );
  }

  rejectUnless(subject.record.selected_at === subject.selected_at, "record.selected-at-mismatch");
  rejectUnless(subject.record.selection_status === subject.selection_status, "record.status-mismatch");
  rejectUnless(subject.record.source_mode === subject.source_mode, "record.source-mode-mismatch");
  rejectUnless(sameIds(subject.record.sources, subject.sources), "record.sources-mismatch");
  rejectUnless(
    sameIds(subject.record.selected.map(({ id }) => id), selectedIds),
    "record.selected-mismatch",
  );
  rejectUnless(
    sameIds(subject.record.confirmation_candidates.map(({ id }) => id), confirmIds),
    "record.confirm-mismatch",
  );
  for (const entry of subject.record.selected) {
    rejectUnless(
      sameIds(Object.keys(entry).sort(), ["canonical", "id", "name", "reason"]),
      `record.${entry.id}.selected-shape`,
    );
    rejectUnless(
      typeof entry.reason === "string"
        && entry.reason.length > 0
        && entry.reason.length <= 100
        && !entry.reason.includes("\n"),
      `record.${entry.id}.reason-not-short`,
    );
  }
  for (const entry of subject.record.confirmation_candidates) {
    rejectUnless(
      sameIds(
        Object.keys(entry).sort(),
        ["canonical", "evidence", "id", "kind", "missing"],
      ),
      `record.${entry.id}.confirmation-shape`,
    );
    rejectUnless(
      ["relevance", "projection"].includes(entry.kind)
        && entry.evidence.length > 0
        && entry.missing.length > 0,
      `record.${entry.id}.confirmation-incomplete`,
    );
  }
  rejectUnless(subject.record.excluded_count === subject.excluded.length, "record.excluded-count");
  rejectUnless(!Object.hasOwn(subject.record, "excluded"), "record.excluded-history-leak");
  rejectUnless(subject.record.zero_selected === (selectedIds.length === 0), "record.zero-selected");
  rejectUnless(subject.packet_after === subject.packet_before, "packet.selection-history-leak");
  rejectUnless(
    subject.downstream.every((constraint) =>
      !Object.hasOwn(constraint, "Selection Reason")
      && !Object.hasOwn(constraint, "selection_reason")
      && !Object.hasOwn(constraint, "selection_status")),
    "downstream.selection-history-leak",
  );

  return violations;
}

const TARGET_PLACEMENTS = Object.freeze([
  ["cc-sdd", "requirements.md#Invariants"],
  ["openspec", "proposal.md#Impact"],
  ["speckit", "spec-hints.md#Invariant references"],
]);

export const EXPORT_STATE_FIXTURES = Object.freeze([
  Object.freeze({
    id: "normal",
    selection_status: "applied",
    source_mode: "split-compass",
    degraded_reasons: Object.freeze([]),
  }),
  Object.freeze({
    id: "execution-contract-missing",
    selection_status: "legacy-not-applied",
    source_mode: "legacy-compass",
    degraded_reasons: Object.freeze(["execution-contract-missing"]),
  }),
  Object.freeze({
    id: "split-store-missing",
    selection_status: "applied",
    source_mode: "legacy-compass",
    degraded_reasons: Object.freeze(["split-store-missing"]),
  }),
  Object.freeze({
    id: "partial-symbol-missing",
    selection_status: "applied",
    source_mode: "mixed-compass",
    degraded_reasons: Object.freeze(["symbol-missing"]),
  }),
  Object.freeze({
    id: "all-target-symbols-missing",
    selection_status: "applied",
    source_mode: "legacy-compass",
    degraded_reasons: Object.freeze(["symbol-missing"]),
  }),
]);

function projectConfirmationCandidate(candidate) {
  return project(candidate);
}

export function createCrossTargetConstraintSubject({
  candidates = CONSTRAINT_SELECTION_FIXTURES,
  mutation = {},
} = {}) {
  const common = createConstraintSelectionSubject({ candidates });
  const targets = TARGET_PLACEMENTS.map(([target, placement]) => ({
    target,
    placement,
    input_contract: "common-selection-result",
    selected_ids: common.selected.map(({ id }) => id),
    downstream: structuredClone(common.downstream),
    compass_context: [],
  }));
  const targetNamed = (name) => targets.find(({ target }) => target === name);

  if (mutation.injectFullCompass) {
    targetNamed(mutation.injectFullCompass).compass_context = candidates.map(
      ({ id, law }) => `${id}: ${law}`,
    );
  }
  if (mutation.leakOrdinaryReason) {
    const target = targetNamed(mutation.leakOrdinaryReason);
    const reasons = new Map(common.selected.map(({ id, reason }) => [id, reason]));
    target.downstream = target.downstream.map((constraint) => ({
      ...constraint,
      "Selection Reason": reasons.get(constraint.Identifier),
    }));
  }
  if (mutation.promoteConfirm) {
    const target = targetNamed(mutation.promoteConfirm);
    const confirmCandidate = candidates.find(
      ({ id }) => id === common.confirm.find(({ kind }) => kind === "relevance")?.id,
    );
    if (confirmCandidate) {
      target.selected_ids.push(confirmCandidate.id);
      target.downstream.push(projectConfirmationCandidate(confirmCandidate));
    }
  }
  if (mutation.useLegacyInput) {
    targetNamed(mutation.useLegacyInput).input_contract = "packet-plus-compass";
  }

  return { common, targets };
}

function keysMatchMinimalProjection(constraint) {
  return sameIds(Object.keys(constraint).sort(), [...DOWNSTREAM_FIELDS].sort());
}

export function collectCrossTargetConstraintViolations(subject) {
  const violations = [];
  const rejectUnless = (condition, id) => {
    if (!condition && !violations.includes(id)) violations.push(id);
  };
  const expectedIds = subject.common.selected.map(({ id }) => id);
  const expectedDownstream = subject.common.downstream;

  for (const target of subject.targets) {
    rejectUnless(
      target.compass_context.length === 0,
      `target.${target.target}.compass-full-injection`,
    );
    rejectUnless(
      target.downstream.every((constraint) => !Object.hasOwn(constraint, "Selection Reason")),
      `target.${target.target}.ordinary-reason-leak`,
    );
    rejectUnless(
      target.selected_ids.every((id) => !subject.common.confirm.some((item) => item.id === id)),
      `target.${target.target}.confirm-promoted`,
    );
    rejectUnless(
      target.input_contract === "common-selection-result",
      `target.${target.target}.legacy-input-contract`,
    );
  }

  const finalSemanticsMatch = subject.targets.length === TARGET_PLACEMENTS.length
    && subject.targets.every((target, index) => {
      const [expectedTarget, expectedPlacement] = TARGET_PLACEMENTS[index];
      return target.target === expectedTarget
        && target.placement === expectedPlacement
        && target.input_contract === "common-selection-result"
        && target.compass_context.length === 0
        && sameIds(target.selected_ids, expectedIds)
        && target.downstream.length === expectedDownstream.length
        && target.downstream.every((constraint, constraintIndex) =>
          keysMatchMinimalProjection(constraint)
          && JSON.stringify(constraint) === JSON.stringify(expectedDownstream[constraintIndex]));
    })
    && new Set(subject.targets.map(({ placement }) => placement)).size === TARGET_PLACEMENTS.length;
  rejectUnless(finalSemanticsMatch, "cross-target.final-semantic-mismatch");

  return violations;
}

function exportStateFixture(scenario) {
  const normalized = ["zero-selected", "noninterference", "rerun"].includes(scenario)
    ? "normal"
    : scenario;
  const fixture = EXPORT_STATE_FIXTURES.find(({ id }) => id === normalized);
  if (!fixture) throw new Error(`unknown export state fixture: ${scenario}`);
  return fixture;
}

function selectedIdsFrom(subject) {
  return Array.isArray(subject.selected) ? subject.selected.map(({ id }) => id) : [];
}

function runTimestamp(run) {
  return `2026-07-21T00:00:${String(run).padStart(2, "0")}.000Z`;
}

function createLegacySelectionSubject(fixture, run) {
  const selectedAt = runTimestamp(run);
  const packet = [
    "# Semantic fixture Packet",
    "Scope: exportの旧経路継続を検証する",
    "Validation: 従来の主出力が生成される",
  ].join("\n");
  return {
    candidates: structuredClone(CONSTRAINT_SELECTION_FIXTURES),
    selected_at: selectedAt,
    selection_status: fixture.selection_status,
    source_mode: fixture.source_mode,
    degraded_reasons: [...fixture.degraded_reasons],
    sources: ["packet://pkt-semantic-fixture", ".intent/intent-compass.md"],
    selected: [],
    confirm: [],
    excluded: [],
    downstream: [],
    record: {
      selected_at: selectedAt,
      selection_status: fixture.selection_status,
      source_mode: fixture.source_mode,
      degraded_reasons: [...fixture.degraded_reasons],
      sources: ["packet://pkt-semantic-fixture", ".intent/intent-compass.md"],
      selected: "not applicable",
      confirmation_candidates: "not applicable",
      legacy_output: "existing primary output",
    },
    packet_before: packet,
    packet_after: packet,
  };
}

export function createExportStateSubject({
  scenario = "normal",
  candidates = CONSTRAINT_SELECTION_FIXTURES,
  run = 1,
  warningReads = [],
  questionReads = [],
  mutation = {},
} = {}) {
  const fixture = exportStateFixture(scenario);
  const canonicalCandidates = structuredClone(candidates);
  const effectiveCandidates = mutation.omitAlways
    ? candidates.filter(({ area }) => area !== "always")
    : candidates;
  const isLegacy = fixture.selection_status === "legacy-not-applied";
  const common = isLegacy
    ? createLegacySelectionSubject(fixture, run)
    : createConstraintSelectionSubject({
      candidates: effectiveCandidates,
      mutation: { ignoreSuperseded: mutation.selectSuperseded === true },
    });
  const selectedAt = runTimestamp(run);
  const runId = `selection-run-${run}`;

  common.selected_at = selectedAt;
  common.selection_status = fixture.selection_status;
  common.source_mode = fixture.source_mode;
  common.degraded_reasons = [...fixture.degraded_reasons];
  common.record.selected_at = selectedAt;
  common.record.selection_status = fixture.selection_status;
  common.record.source_mode = fixture.source_mode;
  common.record.degraded_reasons = [...fixture.degraded_reasons];

  if (mutation.copyReasonToPacket && Array.isArray(common.record.selected)) {
    const reason = common.record.selected[0]?.reason ?? "選別理由";
    common.packet_after = `${common.packet_before}\nSelection reason: ${reason}`;
  }
  if (mutation.copyAllExcludedToRecord) {
    common.record.excluded = structuredClone(common.excluded);
  }
  if (mutation.copyLawToRecord && Array.isArray(common.record.selected)) {
    const laws = new Map(effectiveCandidates.map(({ id, law }) => [id, law]));
    common.record.selected = common.record.selected.map((entry) => ({
      ...entry,
      law: laws.get(entry.id),
    }));
  }

  const preflightReadIds = [...warningReads, ...questionReads];
  if (mutation.flowPreflightReads && !isLegacy) {
    for (const id of preflightReadIds) {
      common.selected.push({
        id,
        name: "事前確認だけで読んだ項目",
        reason: "警告・質問用の読み取り",
        canonical: `preflight://${id}`,
      });
      common.record.selected.push({
        id,
        name: "事前確認だけで読んだ項目",
        reason: "警告・質問用の読み取り",
        canonical: `preflight://${id}`,
      });
    }
  }

  const targets = TARGET_PLACEMENTS.map(([target, placement]) => {
    const selectedIds = selectedIdsFrom(common);
    const primaryOutput = placement.split("#")[0];
    const draft = {
      run_id: runId,
      selected_at: selectedAt,
      selected_ids: [...selectedIds],
      constraint_section: selectedIds.length === 0 ? null : structuredClone(common.downstream),
      legacy_output: isLegacy ? primaryOutput : null,
    };
    const record = {
      ...structuredClone(common.record),
      run_id: runId,
      legacy_output: isLegacy ? primaryOutput : "not applicable",
    };
    return {
      target,
      placement,
      selection_status: fixture.selection_status,
      source_mode: fixture.source_mode,
      degraded_reasons: [...fixture.degraded_reasons],
      published: true,
      draft,
      record,
    };
  });

  if (mutation.createZeroConstraintSection) {
    for (const target of targets) target.draft.constraint_section = [];
  }
  if (mutation.stopFallback) {
    for (const target of targets) {
      target.published = false;
      target.draft = null;
    }
  }
  if (mutation.dropDegradedDraft) {
    targets[0].draft = null;
  }
  if (mutation.reportDegradedAsLegacy) {
    common.selection_status = "legacy-not-applied";
    common.record.selection_status = "legacy-not-applied";
    for (const target of targets) {
      target.selection_status = "legacy-not-applied";
      target.record.selection_status = "legacy-not-applied";
    }
  }

  return {
    kind: scenario === "zero-selected"
      ? "zero"
      : scenario === "noninterference"
        ? "noninterference"
        : isLegacy
          ? "legacy"
          : fixture.degraded_reasons.length > 0
            ? "degraded"
            : "normal",
    scenario,
    fixture: structuredClone(fixture),
    canonical_candidates: canonicalCandidates,
    warning_reads: [...warningReads],
    question_reads: [...questionReads],
    run_id: runId,
    common,
    targets,
  };
}

export function createReexportStateSubject(previous, {
  confirmedCandidateId,
  run,
  mutation = {},
} = {}) {
  const candidates = previous.canonical_candidates.map((candidate) =>
    candidate.id === confirmedCandidateId
      ? { ...candidate, relevance: "relevant", expected: "selected" }
      : candidate);
  const subject = createExportStateSubject({ scenario: "normal", candidates, run });
  subject.kind = "rerun";
  subject.scenario = "rerun";
  subject.previous = structuredClone(previous);
  subject.confirmed_candidate_id = confirmedCandidateId;

  if (mutation.appendPrevious) {
    for (const target of subject.targets) {
      const previousTarget = previous.targets.find(({ target: name }) => name === target.target);
      target.draft.selected_ids = [
        ...previousTarget.draft.selected_ids,
        ...target.draft.selected_ids,
      ];
      if (Array.isArray(target.record.selected)) {
        target.record.selected = [
          ...previousTarget.record.selected,
          ...target.record.selected,
        ];
      }
    }
  }
  if (mutation.desyncRecord) {
    for (const target of subject.targets) {
      target.record.run_id = previous.targets[0].record.run_id;
      target.record.selected_at = previous.targets[0].record.selected_at;
    }
  }
  if (mutation.staleRun) {
    for (const target of subject.targets) {
      const previousTarget = previous.targets.find(({ target: name }) => name === target.target);
      target.draft.run_id = previousTarget.draft.run_id;
      target.draft.selected_at = previousTarget.draft.selected_at;
      target.record.run_id = previousTarget.record.run_id;
      target.record.selected_at = previousTarget.record.selected_at;
    }
  }
  if (mutation.retainConfirmedInConfirm) {
    const previousConfirmation = previous.common.confirm.find(
      ({ id }) => id === confirmedCandidateId,
    );
    if (previousConfirmation) {
      subject.common.confirm.push(structuredClone(previousConfirmation));
      subject.common.record.confirmation_candidates.push(structuredClone(previousConfirmation));
      for (const target of subject.targets) {
        target.record.confirmation_candidates.push(structuredClone(previousConfirmation));
      }
    }
  }

  return subject;
}

function hasUniqueItems(items) {
  return new Set(items).size === items.length;
}

export function collectExportStateViolations(subject) {
  const violations = [];
  const rejectUnless = (condition, id) => {
    if (!condition && !violations.includes(id)) violations.push(id);
  };
  const category = subject.kind;
  const fixture = exportStateFixture(subject.scenario);

  rejectUnless(
    subject.common.selection_status === fixture.selection_status
      && subject.common.source_mode === fixture.source_mode
      && sameIds(subject.common.degraded_reasons, fixture.degraded_reasons)
      && subject.common.record.selection_status === fixture.selection_status
      && subject.common.record.source_mode === fixture.source_mode
      && sameIds(subject.common.record.degraded_reasons, fixture.degraded_reasons),
    `state.${category}.contract`,
  );

  for (const target of subject.targets) {
    rejectUnless(
      target.selection_status === fixture.selection_status
        && target.source_mode === fixture.source_mode
        && sameIds(target.degraded_reasons, fixture.degraded_reasons)
        && target.record.selection_status === fixture.selection_status
        && target.record.source_mode === fixture.source_mode
        && sameIds(target.record.degraded_reasons, fixture.degraded_reasons),
      `state.${category}.contract`,
    );
    if (target.draft && target.record) {
      rejectUnless(
        target.draft.run_id === target.record.run_id
          && target.draft.selected_at === target.record.selected_at,
        category === "rerun"
          ? "state.rerun.output-record-desync"
          : `state.${category}.output-record-desync`,
      );
    }
  }

  if (["normal", "zero", "degraded", "noninterference", "rerun"].includes(category)) {
    const canonicalHasAlways = subject.canonical_candidates.some(
      ({ status, area }) => status === "active" && area === "always",
    );
    const selectedIds = selectedIdsFrom(subject.common);
    rejectUnless(
      !canonicalHasAlways || selectedIds.includes("INV-ALWAYS"),
      `state.${category}.always-missing`,
    );
    rejectUnless(
      !selectedIds.includes("DR-SUPERSEDED"),
      `state.${category}.superseded-selected`,
    );
  }

  rejectUnless(
    subject.common.packet_after === subject.common.packet_before,
    `state.${category}.packet-reason-copy`,
  );
  rejectUnless(
    !Object.hasOwn(subject.common.record, "excluded"),
    `state.${category}.record-all-excluded-copy`,
  );
  rejectUnless(
    !Array.isArray(subject.common.record.selected)
      || subject.common.record.selected.every((entry) => !Object.hasOwn(entry, "law")),
    `state.${category}.record-law-copy`,
  );

  if (category === "zero") {
    rejectUnless(
      subject.targets.every(({ draft, record }) =>
        draft.selected_ids.length === 0
        && draft.constraint_section === null
        && record.zero_selected === true),
      "state.zero.constraint-section-created",
    );
  }

  if (category === "legacy") {
    rejectUnless(
      subject.targets.every(({ published, draft, record }) =>
        published
        && draft !== null
        && draft.legacy_output
        && record.selected === "not applicable"
        && record.confirmation_candidates === "not applicable"
        && record.legacy_output),
      "state.legacy.fallback-stopped",
    );
  }

  if (category === "degraded") {
    const fallbackAvailable = subject.targets.every(({ published, draft, record }) =>
      published && draft !== null && record !== null);
    rejectUnless(
      fallbackAvailable
        && subject.targets.every(({ selection_status }) => selection_status === "applied"),
      !fallbackAvailable
        ? "state.degraded.fallback-stopped"
        : "state.degraded.status-misreported",
    );
  }

  if (category === "noninterference") {
    const preflightIds = [...subject.warning_reads, ...subject.question_reads];
    const serializedSelection = JSON.stringify({
      selected: subject.common.selected,
      confirm: subject.common.confirm,
      record: subject.common.record,
      drafts: subject.targets.map(({ draft }) => draft),
    });
    rejectUnless(
      preflightIds.every((id) => !serializedSelection.includes(id)),
      "state.noninterference.preflight-read-flow",
    );
  }

  if (category === "rerun") {
    rejectUnless(
      subject.targets.every(({ draft, record }) =>
        draft.run_id === subject.run_id
        && record.run_id === subject.run_id
        && draft.selected_at === subject.common.selected_at
        && record.selected_at === subject.common.selected_at),
      "state.rerun.stale-run",
    );
    rejectUnless(
      subject.targets.every(({ draft, record }) =>
        hasUniqueItems(draft.selected_ids)
        && (!Array.isArray(record.selected)
          || hasUniqueItems(record.selected.map(({ id }) => id)))),
      "state.rerun.duplicate",
    );
    rejectUnless(
      subject.targets.every(({ draft }) =>
        draft.selected_ids.filter((id) => id === subject.confirmed_candidate_id).length === 1),
      "state.rerun.confirmed-canonical-not-applied",
    );
    rejectUnless(
      subject.common.selected.filter(({ id }) => id === subject.confirmed_candidate_id).length === 1
        && subject.common.confirm.every(({ id }) => id !== subject.confirmed_candidate_id)
        && subject.common.record.confirmation_candidates.every(
          ({ id }) => id !== subject.confirmed_candidate_id,
        )
        && subject.targets.every(({ record }) =>
          record.confirmation_candidates.every(
            ({ id }) => id !== subject.confirmed_candidate_id,
          )),
      "state.rerun.confirmed-still-confirm",
    );
  }

  return violations;
}
