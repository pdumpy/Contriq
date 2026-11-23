import { JOB_FAMILIES, PERIOD, type Employee } from "../types";
import {
  normalizeEvidence,
  type EvidenceCoverage,
  type RawEvidenceRecord,
} from "./evidence";
import { getRubrics, stableUuid } from "./rubrics";

const firstNames = [
  "Aarav",
  "Mira",
  "Kabir",
  "Isha",
  "Rohan",
  "Leela",
  "Dev",
  "Tara",
  "Arjun",
  "Nila",
  "Vihaan",
  "Sana",
  "Aditya",
  "Kavya",
  "Neil",
  "Anika",
  "Samar",
  "Zoya",
  "Ishan",
  "Diya",
  "Rehan",
  "Avni",
  "Kiran",
  "Meera",
  "Jay",
];
const lastNames = [
  "Mehta",
  "Rao",
  "Shah",
  "Sen",
  "Kapoor",
  "Nair",
  "Malik",
  "Bose",
];
const teams = [
  ["Measurement Lab", "Forecast Systems", "Data Foundations"],
  ["Core Services", "Payments Platform", "Infrastructure APIs"],
  ["Product Experience", "Customer Workflows", "Design Systems"],
  ["Agent Workflows", "Evaluation Systems", "Tooling Research"],
];
const workTitles = [
  [
    "Demand forecast calibration",
    "Retention cohort analysis",
    "Inventory anomaly study",
    "Experiment allocation audit",
  ],
  [
    "Idempotent payments endpoint",
    "Account export service",
    "Queue recovery handler",
    "Rate limit middleware",
  ],
  [
    "Accessible account settings",
    "Checkout recovery flow",
    "Responsive analytics screen",
    "Search and filter interaction",
  ],
  [
    "Invoice extraction agent",
    "Verified tool routing workflow",
    "Retrieval grounded triage agent",
    "Approval gated research workflow",
  ],
];

/** Generates source observations, never precomputed employee or dimension scores. */
export function generateDataset(seed = 42) {
  if (!Number.isSafeInteger(seed))
    throw new Error("Fixture seed must be a safe integer.");
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const employees: Employee[] = [],
    raw: RawEvidenceRecord[] = [],
    coverage: EvidenceCoverage[] = [];
  const rubrics = getRubrics();
  let recordSequence = 0,
    coverageSequence = 0;
  const makeRecord = (
    employee: Employee,
    source: string,
    payload: Record<string, unknown>,
    observedAt = "2026-10-15T12:00:00Z",
  ): RawEvidenceRecord => {
    const id = stableUuid(2, ++recordSequence);
    return {
      id,
      employeeId: employee.id,
      source,
      sourceRecordId: `${employee.code}:${recordSequence}`,
      revision: 1,
      supersedesId: null,
      recordType: "work_checklist",
      observedAt,
      ingestedAt: "2026-11-21T08:00:00Z",
      rawPayload: payload,
      normalizerVersion: "checklist-normalizer-1.0.0",
      validationStatus: "valid",
      validationReason: null,
    };
  };
  JOB_FAMILIES.forEach((family, familyIndex) => {
    const rubric = rubrics[familyIndex];
    for (let index = 0; index < 50; index++) {
      const overallIndex = familyIndex * 50 + index;
      const employee: Employee = {
        id: stableUuid(10, overallIndex + 1),
        code: `CQ-${String(overallIndex + 1).padStart(3, "0")}`,
        name: `${firstNames[overallIndex % firstNames.length]} ${lastNames[Math.floor(overallIndex / firstNames.length)]}`,
        jobFamily: family,
        level: "mid",
        team: teams[familyIndex][index % 3],
        joinedAt: `202${2 + (index % 3)}-03-14`,
      };
      employees.push(employee);
      const ability = 0.4 + (index % 11) * 0.052;
      for (const dimension of rubric.dimensions) {
        const source = dimension.metrics[0].source;
        // Exactly three deliberately incomplete employees per family; old complete observations prove revision precedence.
        const incomplete =
          index < 3 &&
          dimension.key === (index === 2 ? "collaboration" : "quality");
        coverage.push({
          id: stableUuid(4, ++coverageSequence),
          employeeId: employee.id,
          source,
          periodStart: PERIOD.start,
          periodEnd: PERIOD.end,
          revision: 1,
          status: "complete",
          lastCheckedAt: "2026-11-21T07:00:00Z",
          reason: null,
        });
        if (incomplete)
          coverage.push({
            id: stableUuid(4, ++coverageSequence),
            employeeId: employee.id,
            source,
            periodStart: PERIOD.start,
            periodEnd: PERIOD.end,
            revision: 2,
            status:
              index === 0 ? "partial" : index === 1 ? "unavailable" : "unknown",
            lastCheckedAt: "2026-11-21T08:00:00Z",
            reason:
              "Synthetic connector gap: the full evaluation window could not be verified.",
          });
        for (let workIndex = 0; workIndex < 4; workIndex++) {
          const checks = Object.fromEntries(
            dimension.metrics.map((metric) => [metric.key, random() < ability]),
          );
          const payload: Record<string, unknown> = {
            title: workTitles[familyIndex][workIndex],
            workId: `${employee.code}:work:${workIndex + 1}`,
            eligible: true,
            checks,
            acceptanceCriteria:
              "Agreed mid-level task scope; attributed owner verified in source.",
            reviewerReference: `review:${employee.code}:${workIndex + 1}`,
          };
          if (dimension.key === "reliability") {
            const late = !checks[dimension.metrics[0].key];
            const scopeAgreed = checks[dimension.metrics[1].key];
            payload.originalDeadline = "2026-10-14T18:00:00Z";
            payload.deliveredAt = late
              ? "2026-10-18T12:00:00Z"
              : "2026-10-13T12:00:00Z";
            payload.scopeChange =
              workIndex === 1
                ? {
                    revisedDeadline: "2026-10-17T18:00:00Z",
                    agreedAt: scopeAgreed
                      ? "2026-10-12T12:00:00Z"
                      : "2026-10-16T12:00:00Z",
                    approved: true,
                  }
                : null;
            payload.deadlinePolicy =
              "Use a revised deadline only if approved before the original deadline. Late changes never erase a miss. No change passes scope-record check.";
          }
          const record = makeRecord(employee, source, payload);
          raw.push(record);
          if (
            dimension.key === "delivery" &&
            workIndex === 0 &&
            index % 7 === 0
          )
            raw.push(
              makeRecord(employee, source, {
                ...payload,
                title: `${payload.title} · mirrored source import`,
              }),
            );
          if (
            dimension.key === "quality" &&
            workIndex === 1 &&
            index % 9 === 0
          ) {
            const correction = makeRecord(employee, source, {
              ...payload,
              title: `${payload.title} · corrected review`,
              checks: Object.fromEntries(
                dimension.metrics.map((metric) => [metric.key, true]),
              ),
            });
            correction.sourceRecordId = record.sourceRecordId;
            correction.revision = 2;
            correction.supersedesId = record.id;
            raw.push(correction);
          }
        }
      }
      if (index % 10 === 0) {
        raw.push(
          makeRecord(employee, "demo:review", {
            title: "Rejected malformed import",
            workId: `${employee.code}:invalid`,
            eligible: true,
            checks: { [rubric.dimensions[1].metrics[0].key]: "yes" },
          }),
        );
        raw.push(
          makeRecord(employee, "demo:delivery", {
            title: "Unrelated planning note",
            workId: `${employee.code}:unrelated`,
            eligible: false,
            checks: { "unrelated.planning.note": true },
          }),
        );
      }
      if (index === 0) {
        const quality = rubric.dimensions[1];
        raw.push(
          makeRecord(employee, "demo:review", {
            title: "Conflicting mirror held for review",
            workId: `${employee.code}:work:2`,
            eligible: true,
            checks: Object.fromEntries(
              quality.metrics.map((metric) => [metric.key, false]),
            ),
          }),
        );
      }
    }
  });
  const normalized = normalizeEvidence(raw);
  return {
    employees,
    rubrics,
    records: normalized.records,
    facts: normalized.facts,
    coverage,
  };
}
