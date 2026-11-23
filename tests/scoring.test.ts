import test from "node:test";
import assert from "node:assert/strict";
import { PERIOD, JOB_FAMILIES, type Employee } from "../src/types";
import { getRubric, getRubrics, stableUuid } from "../src/domain/rubrics";
import {
  normalizeEvidence,
  type EvidenceCoverage,
  type RawEvidenceRecord,
} from "../src/domain/evidence";
import { scoreEmployee, validateRubric } from "../src/domain/engine";
import { generateDataset } from "../src/domain/fixtures";

function sample(units = 1) {
  const rubric = getRubric("backend_engineering");
  const employee: Employee = {
    id: stableUuid(10, 900),
    code: "TEST",
    name: "Test Person",
    jobFamily: "backend_engineering",
    level: "mid",
    team: "Test",
    joinedAt: "2023-01-01",
  };
  const records: RawEvidenceRecord[] = [];
  const coverage: EvidenceCoverage[] = [];
  for (const [dimensionIndex, dimension] of rubric.dimensions.entries()) {
    const source = dimension.metrics[0].source;
    coverage.push({
      id: stableUuid(4, dimensionIndex + 1),
      employeeId: employee.id,
      source,
      periodStart: PERIOD.start,
      periodEnd: PERIOD.end,
      revision: 1,
      status: "complete",
      lastCheckedAt: "2026-11-21T00:00:00Z",
      reason: null,
    });
    for (let unit = 0; unit < units; unit++) {
      const id = stableUuid(2, records.length + 1);
      records.push({
        id,
        employeeId: employee.id,
        source,
        sourceRecordId: id,
        revision: 1,
        supersedesId: null,
        recordType: "work_checklist",
        observedAt: "2026-10-01T00:00:00Z",
        ingestedAt: "2026-11-21T00:00:00Z",
        normalizerVersion: "checklist-normalizer-1.0.0",
        validationStatus: "valid",
        validationReason: null,
        rawPayload: {
          title: "Test contract",
          workId: `work-${unit}`,
          eligible: true,
          checks: Object.fromEntries(
            dimension.metrics.map((metric) => [metric.key, true]),
          ),
        },
      });
    }
  }
  const score = () =>
    scoreEmployee({
      employee,
      rubric,
      facts: normalizeEvidence(records).facts,
      coverage,
    });
  return { rubric, employee, records, coverage, score };
}

test("four versioned role rubrics preserve the exact requested weights and 2% collaboration", () => {
  const expected = [
    [24, 25, 27, 12, 10, 2],
    [28, 27, 20, 14, 9, 2],
    [30, 25, 18, 15, 10, 2],
    [24, 24, 29, 12, 9, 2],
  ];
  getRubrics().forEach((rubric, index) => {
    validateRubric(rubric);
    assert.equal(rubric.jobFamily, JOB_FAMILIES[index]);
    assert.equal(rubric.version, 1);
    assert.deepEqual(
      rubric.dimensions.map((dimension) => dimension.weight),
      expected[index],
    );
    assert.equal(
      rubric.dimensions.flatMap((dimension) => dimension.metrics).length,
      11,
    );
  });
});

test("observed false is zero and weighted totals match a hand calculation", () => {
  const input = sample();
  assert.equal(input.score().totalScore, 100);
  const delivery = input.rubric.dimensions[0].metrics;
  input.records[0].rawPayload.checks = {
    [delivery[0].key]: false,
    [delivery[1].key]: true,
  };
  const result = input.score();
  assert.equal(result.components[0].score, 50);
  assert.equal(result.components[0].contribution, 14);
  assert.equal(result.totalScore, 86); // 50 * .28 + 100 * .72
  assert.equal(result.coverage, 100);
});

test("exact rational calculations round only the final display, deterministically", () => {
  const input = sample(3);
  for (const [index, record] of input.records.entries()) {
    if (index % 3 === 0)
      record.rawPayload.checks = Object.fromEntries(
        Object.keys(record.rawPayload.checks as object).map((key) => [
          key,
          false,
        ]),
      );
  }
  const result = input.score();
  assert.equal(result.totalScore, 66.67);
  assert.equal(result.components[0].score, 66.67);
  assert.equal(result.components[0].contribution, 18.67);
  const facts = normalizeEvidence(input.records).facts;
  assert.deepEqual(
    scoreEmployee({ ...input, facts: [...facts].reverse() }),
    result,
  );
});

test("missing, partial, unavailable, unknown and wrong-window coverage withhold instead of redistributing", () => {
  for (const status of ["partial", "unavailable", "unknown"] as const) {
    const input = sample();
    input.coverage[0].status = status;
    const result = input.score();
    assert.equal(result.totalScore, null);
    assert.equal(result.status, "insufficient_evidence");
    assert.equal(result.components[0].score, null);
    assert.equal(result.coverage, 83.33);
    assert.equal(result.components[1].score, 100);
  }
  const input = sample();
  input.coverage[0].periodStart = "2026-08-22";
  assert.equal(input.score().totalScore, null);
  input.coverage.shift();
  assert.equal(input.score().totalScore, null);
});

test("latest exact-window coverage revision wins and conflicting ties withhold", () => {
  const input = sample();
  input.coverage.push({
    ...input.coverage[0],
    id: stableUuid(4, 100),
    revision: 2,
    status: "partial",
  });
  assert.equal(input.score().totalScore, null);
  input.coverage.push({
    ...input.coverage[0],
    id: stableUuid(4, 101),
    revision: 2,
    status: "complete",
  });
  assert.match(
    input.score().components[0].metrics[0].reason!,
    /Conflicting coverage/,
  );
});

test("source coverage is independent of rubric weights and observed outcomes", () => {
  const input = sample();
  input.coverage[0].status = "partial";
  assert.equal(input.score().coverage, 83.33);
  input.rubric.dimensions[0].weight = 1;
  input.rubric.dimensions[1].weight = 54;
  assert.equal(input.score().coverage, 83.33);

  input.coverage[0].status = "complete";
  input.records.splice(0, 1);
  const result = input.score();
  assert.equal(result.coverage, 100);
  assert.equal(result.totalScore, null);
  assert.equal(result.status, "insufficient_evidence");
});

test("complete source with zero eligible observations has an unavailable denominator", () => {
  const input = sample();
  input.records.splice(0, 1);
  const metric = input.score().components[0].metrics[0];
  assert.equal(metric.denominator, 0);
  assert.equal(metric.score, null);
  assert.match(metric.reason!, /zero denominator/);
});

test("identical canonical measurements deduplicate; conflicts withhold the metric", () => {
  const input = sample();
  input.records.push({
    ...input.records[0],
    id: stableUuid(2, 100),
    sourceRecordId: "mirror",
  });
  let result = input.score();
  assert.equal(result.totalScore, 100);
  assert.equal(result.components[0].metrics[0].denominator, 1);
  assert.match(
    result.components[0].metrics[0].exclusions[0].reason,
    /Duplicate canonical/,
  );
  input.records[input.records.length - 1].rawPayload = {
    ...input.records[0].rawPayload,
    checks: {
      [input.rubric.dimensions[0].metrics[0].key]: false,
      [input.rubric.dimensions[0].metrics[1].key]: true,
    },
  };
  result = input.score();
  assert.equal(result.totalScore, null);
  assert.match(
    result.components[0].metrics[0].reason!,
    /Conflicting duplicate/,
  );
  assert.equal(result.components[0].metrics[1].score, 100);
});

test("source correction supersedes prior outcomes and invalid or retracted revisions do not revive old facts", () => {
  for (const status of ["valid", "invalid", "retracted"] as const) {
    const input = sample();
    input.records.push({
      ...input.records[0],
      id: stableUuid(2, 100),
      revision: 2,
      supersedesId: input.records[0].id,
      validationStatus: status,
      validationReason:
        status === "valid" ? null : "Source withdrew the observation.",
      rawPayload: {
        ...input.records[0].rawPayload,
        checks: Object.fromEntries(
          input.rubric.dimensions[0].metrics.map((metric) => [
            metric.key,
            false,
          ]),
        ),
      },
    });
    const result = input.score();
    assert.equal(result.totalScore, status === "valid" ? 72 : null);
    assert.equal(
      result.components[0].metrics[0].denominator,
      status === "valid" ? 1 : 0,
    );
    assert.ok(
      result.components[0].metrics[0].exclusions.some((item) =>
        /Superseded/.test(item.reason),
      ),
    );
  }
});

test("ownership corrections supersede old attribution before employee filtering", () => {
  const input = sample();
  input.records.push({
    ...input.records[0],
    id: stableUuid(2, 100),
    employeeId: stableUuid(10, 901),
    revision: 2,
    supersedesId: input.records[0].id,
  });
  const result = input.score();
  assert.equal(result.totalScore, null);
  assert.equal(result.components[0].metrics[0].denominator, 0);
  assert.match(
    result.components[0].metrics[0].exclusions[0].reason,
    /Superseded/,
  );
});

test("normalization assigns stable fact identities regardless of raw check property order", () => {
  const input = sample();
  const first = normalizeEvidence(input.records).facts;
  input.records[0].rawPayload.checks = Object.fromEntries(
    Object.entries(input.records[0].rawPayload.checks as object).reverse(),
  );
  assert.deepEqual(normalizeEvidence(input.records).facts, first);
});

test("arbitrary UUID source revisions normalize to valid stable fact UUIDs without suffix overflow", () => {
  const input = sample();
  input.records[0].id = "c67f53ae-1e95-4ed4-a1b3-ffffffffffff";
  const first = normalizeEvidence(input.records).facts;
  const recordFacts = first.filter(
    (fact) => fact.evidenceId === input.records[0].id,
  );
  assert.equal(new Set(recordFacts.map((fact) => fact.id)).size, 2);
  assert.ok(
    recordFacts.every((fact) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(
        fact.id,
      ),
    ),
  );
  input.records[0].rawPayload.checks = Object.fromEntries(
    Object.entries(input.records[0].rawPayload.checks as object).reverse(),
  );
  assert.deepEqual(normalizeEvidence(input.records).facts, first);
});

test("invalid, irrelevant and ineligible observations cannot inflate results", () => {
  const input = sample();
  input.records.push({
    ...input.records[0],
    id: stableUuid(2, 100),
    sourceRecordId: "bad",
    rawPayload: {
      workId: "bad",
      eligible: true,
      checks: { [input.rubric.dimensions[0].metrics[0].key]: "yes" },
    },
  });
  input.records.push({
    ...input.records[0],
    id: stableUuid(2, 101),
    sourceRecordId: "irrelevant",
    rawPayload: {
      workId: "other",
      eligible: true,
      checks: { "unrelated.metric": false },
    },
  });
  input.records.push({
    ...input.records[0],
    id: stableUuid(2, 102),
    sourceRecordId: "ineligible",
    rawPayload: {
      ...input.records[0].rawPayload,
      workId: "ineligible",
      eligible: false,
    },
  });
  const normalized = normalizeEvidence(input.records);
  assert.equal(
    normalized.records.find((record) => record.sourceRecordId === "bad")
      ?.validationStatus,
    "invalid",
  );
  assert.equal(input.score().totalScore, 100);
  assert.equal(input.score().components[0].metrics[0].denominator, 1);
});

test("a missing metric check on an eligible work item is not an observed failure", () => {
  const input = sample(2);
  const missingKey = input.rubric.dimensions[0].metrics[0].key;
  delete (input.records[0].rawPayload.checks as Record<string, boolean>)[
    missingKey
  ];
  const result = input.score();
  assert.equal(result.totalScore, null);
  assert.match(
    result.components[0].metrics[0].reason!,
    /missing this metric check/,
  );
});

test("half-open UTC period excludes the end and includes the start", () => {
  const input = sample();
  input.records[0].observedAt = `${PERIOD.start}T00:00:00Z`;
  assert.equal(input.score().totalScore, 100);
  input.records[0].observedAt = `${PERIOD.end}T00:00:00Z`;
  assert.equal(input.score().totalScore, null);
  assert.match(
    input.score().components[0].metrics[0].exclusions[0].reason,
    /outside/,
  );
});

test("deadline revisions require approval before the original deadline", () => {
  const input = sample();
  const record = input.records.find((item) => item.source === "demo:tracker")!;
  record.rawPayload = {
    ...record.rawPayload,
    originalDeadline: "2026-10-10T18:00:00Z",
    deliveredAt: "2026-10-12T12:00:00Z",
    scopeChange: {
      approved: true,
      agreedAt: "2026-10-09T12:00:00Z",
      revisedDeadline: "2026-10-14T18:00:00Z",
    },
  };
  assert.equal(input.score().components[3].score, 100);
  (record.rawPayload.scopeChange as Record<string, unknown>).agreedAt =
    "2026-10-11T12:00:00Z";
  assert.equal(input.score().components[3].score, 0);
  record.rawPayload.scopeChange = null;
  assert.equal(input.score().components[3].score, 50);
});

test("wrong family, invalid weights, unknown dimensions and invalid periods are rejected", () => {
  const input = sample();
  assert.throws(
    () =>
      scoreEmployee({ ...input, rubric: getRubric("data_science"), facts: [] }),
    /job family/,
  );
  assert.throws(
    () =>
      scoreEmployee({
        ...input,
        facts: [],
        period: { start: PERIOD.end, end: PERIOD.start },
      }),
    /window/,
  );
  input.rubric.dimensions[0].weight++;
  assert.throws(input.score, /weights/);
  const duplicate = getRubric("backend_engineering");
  duplicate.dimensions[0].key = duplicate.dimensions[1].key;
  assert.throws(() => validateRubric(duplicate), /dimension/);
});

test("non-finite, fractional or aggregate facts are excluded from binary metrics", () => {
  for (const patch of [
    { numerator: NaN },
    { numerator: Infinity },
    { numerator: 0.5 },
    { denominator: 0 },
    { denominator: 2 },
  ]) {
    const input = sample();
    const facts = normalizeEvidence(input.records).facts;
    Object.assign(facts[0], patch);
    const result = scoreEmployee({ ...input, facts });
    assert.equal(result.totalScore, null);
    assert.equal(result.components[0].metrics[0].score, null);
  }
});

test("fixtures replay deterministically, isolate employees and contain exactly 50 per family and 12 incomplete", () => {
  const dataset = generateDataset();
  assert.deepEqual(dataset, generateDataset());
  assert.equal(dataset.employees.length, 200);
  assert.equal(
    new Set(dataset.employees.map((employee) => employee.id)).size,
    200,
  );
  assert.ok(
    dataset.records.every((record) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(
        record.id,
      ),
    ),
  );
  for (const family of JOB_FAMILIES)
    assert.equal(
      dataset.employees.filter((employee) => employee.jobFamily === family)
        .length,
      50,
    );
  const results = dataset.employees.map((employee) =>
    scoreEmployee({
      employee,
      rubric: getRubric(employee.jobFamily),
      facts: dataset.facts,
      coverage: dataset.coverage,
    }),
  );
  assert.equal(
    results.filter((result) => result.status === "insufficient_evidence")
      .length,
    12,
  );
  assert.ok(new Set(results.map((result) => result.totalScore)).size > 20);
  const employee = dataset.employees[3];
  assert.deepEqual(
    results[3],
    scoreEmployee({
      employee,
      rubric: getRubric(employee.jobFamily),
      facts: dataset.facts.filter((fact) => fact.employeeId === employee.id),
      coverage: dataset.coverage.filter(
        (item) => item.employeeId === employee.id,
      ),
    }),
  );
  assert.ok(
    dataset.records.some((record) => record.validationStatus === "invalid"),
  );
  assert.ok(dataset.records.some((record) => record.revision === 2));
});
