import { stableUuid } from "./rubrics";

export interface RawEvidenceRecord {
  id: string;
  employeeId: string;
  source: string;
  sourceRecordId: string;
  revision: number;
  supersedesId: string | null;
  recordType: string;
  observedAt: string | null;
  ingestedAt: string;
  rawPayload: Record<string, unknown>;
  normalizerVersion: string;
  validationStatus: "valid" | "invalid" | "retracted";
  validationReason: string | null;
}
export interface NormalizedFact {
  id: string;
  evidenceId: string;
  employeeId: string;
  source: string;
  sourceRecordId: string;
  revision: number;
  metricKey: string;
  canonicalKey: string;
  numerator: number;
  denominator: number;
  observedAt: string | null;
  validationStatus: "valid" | "invalid";
  validationReason: string | null;
}
export interface EvidenceCoverage {
  id: string;
  employeeId: string;
  source: string;
  periodStart: string;
  periodEnd: string;
  revision: number;
  status: "complete" | "partial" | "unavailable" | "unknown";
  lastCheckedAt: string;
  reason: string | null;
}

function factUuid(
  recordId: string,
  metricKey: string,
  index: number,
  count: number,
): string {
  const suffix = Number.parseInt(recordId.slice(-12), 16);
  // Preserve the stable, inspectable IDs of the published synthetic fixture.
  if (
    /^00000002-0000-4000-8000-[0-9a-f]{12}$/.test(recordId) &&
    suffix <= 0xfffffffffff &&
    count <= 16
  ) {
    return stableUuid(3, suffix * 16 + index);
  }
  // Portable FNV-1a 128-bit identity hash. It is deterministic, not a security primitive.
  // Hash the whole source UUID and metric key so arbitrary valid UUID suffixes cannot overflow.
  let hash = 0x6c62272e07bb014262b821756295c58dn;
  const mask = (1n << 128n) - 1n;
  for (const character of `${recordId}:${metricKey}`) {
    hash =
      ((hash ^ BigInt(character.codePointAt(0)!)) *
        0x1000000000000000000013bn) &
      mask;
  }
  const hex = hash.toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function normalizeEvidence(input: RawEvidenceRecord[]): {
  records: RawEvidenceRecord[];
  facts: NormalizedFact[];
} {
  const facts: NormalizedFact[] = [];
  // Stable IDs derive from an evidence revision's UUID suffix, not input order.
  const records = input.map((original) => {
    const record = { ...original };
    const p = record.rawPayload;
    let reason =
      record.validationStatus === "valid"
        ? null
        : (record.validationReason ?? "Source record is invalid or retracted.");
    if (
      !record.id ||
      !record.employeeId ||
      !record.source.trim() ||
      !record.sourceRecordId.trim() ||
      !Number.isInteger(record.revision) ||
      record.revision < 1
    )
      reason = "Invalid source identity or revision.";
    if (!record.observedAt || !Number.isFinite(Date.parse(record.observedAt)))
      reason = "Missing or invalid event time.";
    if (typeof p.workId !== "string" || !p.workId.trim())
      reason = "Missing canonical work identity.";
    if (typeof p.eligible !== "boolean")
      reason = "Eligibility must be explicitly observed.";
    const checks =
      p.checks && typeof p.checks === "object" && !Array.isArray(p.checks)
        ? Object.entries(p.checks).sort(([left], [right]) =>
            left.localeCompare(right),
          )
        : [];
    if (record.source === "demo:tracker" && p.originalDeadline !== undefined) {
      const originalDue =
        typeof p.originalDeadline === "string"
          ? Date.parse(p.originalDeadline)
          : NaN;
      const delivered =
        typeof p.deliveredAt === "string" ? Date.parse(p.deliveredAt) : NaN;
      const change =
        p.scopeChange && typeof p.scopeChange === "object"
          ? (p.scopeChange as Record<string, unknown>)
          : null;
      const agreedAt =
        change && typeof change.agreedAt === "string"
          ? Date.parse(change.agreedAt)
          : NaN;
      const revisedDue =
        change && typeof change.revisedDeadline === "string"
          ? Date.parse(change.revisedDeadline)
          : NaN;
      const timelyChange =
        !!change &&
        change.approved === true &&
        Number.isFinite(agreedAt) &&
        agreedAt < originalDue &&
        Number.isFinite(revisedDue);
      if (
        !Number.isFinite(originalDue) ||
        !Number.isFinite(delivered) ||
        (change && (!Number.isFinite(agreedAt) || !Number.isFinite(revisedDue)))
      )
        reason = "Invalid deadline or scope-change event time.";
      for (const check of checks) {
        if (check[0].endsWith(".reliability.1"))
          check[1] = delivered <= (timelyChange ? revisedDue : originalDue);
        if (check[0].endsWith(".reliability.2"))
          check[1] = !change || timelyChange;
      }
    }
    if (
      !checks.length ||
      checks.some(([key, value]) => !key.trim() || typeof value !== "boolean")
    )
      reason = "Checks must be a nonempty map of boolean observations.";
    if (reason && record.validationStatus !== "retracted")
      record.validationStatus = "invalid";
    record.validationReason = reason;
    const observations: [string, unknown][] = checks.length
      ? checks
      : [["__invalid__", false]];
    for (const [index, [metricKey, value]] of observations.entries()) {
      const valid = !reason && p.eligible === true;
      facts.push({
        id: factUuid(record.id, metricKey, index, observations.length),
        evidenceId: record.id,
        employeeId: record.employeeId,
        source: record.source,
        sourceRecordId: record.sourceRecordId,
        revision: record.revision,
        metricKey,
        canonicalKey: typeof p.workId === "string" ? p.workId : "",
        numerator: value === true ? 1 : 0,
        denominator: 1,
        observedAt: record.observedAt,
        validationStatus: valid ? "valid" : "invalid",
        validationReason:
          reason ??
          (p.eligible === false
            ? "Work item is explicitly ineligible for the agreed evaluation scope."
            : null),
      });
    }
    return record;
  });
  return { records, facts };
}
