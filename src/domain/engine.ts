import {
  DIMENSION_KEYS,
  PERIOD,
  type ComponentResult,
  type Employee,
  type MetricResult,
  type Rubric,
  type ScoreResult,
} from "../types";
import type { EvidenceCoverage, NormalizedFact } from "./evidence";
import { ENGINE_VERSION, ROUNDING_POLICY } from "./rubrics";

export type CalculatedScore = Omit<
  ScoreResult,
  "id" | "runId" | "calculatedAt"
>;
interface Fraction {
  n: bigint;
  d: bigint;
}
function gcd(a: bigint, b: bigint): bigint {
  return b === 0n ? a : gcd(b, a % b);
}
function fraction(n: bigint, d: bigint): Fraction {
  const divisor = gcd(n, d);
  return { n: n / divisor, d: d / divisor };
}
function add(a: Fraction, b: Fraction): Fraction {
  return fraction(a.n * b.d + b.n * a.d, a.d * b.d);
}
function multiply(a: Fraction, n: number, d = 1): Fraction {
  return fraction(a.n * BigInt(n), a.d * BigInt(d));
}
function display(a: Fraction): number {
  return Number((a.n * 200n + a.d) / (a.d * 2n)) / 100;
}
const zero = (): Fraction => ({ n: 0n, d: 1n });
const identity = (f: NormalizedFact) =>
  JSON.stringify([f.source, f.sourceRecordId]);

export function validateRubric(rubric: Rubric): void {
  if (
    !Number.isInteger(rubric.version) ||
    rubric.version < 1 ||
    rubric.dimensions.length !== 6
  )
    throw new Error("Invalid rubric version or dimensions.");
  if (
    new Set(rubric.dimensions.map((d) => d.key)).size !== 6 ||
    DIMENSION_KEYS.some((key) => !rubric.dimensions.some((d) => d.key === key))
  )
    throw new Error("Rubric must contain each known dimension once.");
  if (
    rubric.dimensions.some(
      (d) => !Number.isInteger(d.weight) || d.weight < 0 || d.weight > 100,
    ) ||
    rubric.dimensions.reduce((sum, d) => sum + d.weight, 0) !== 100
  )
    throw new Error("Rubric weights must sum to 100.");
  if (rubric.dimensions.find((d) => d.key === "collaboration")?.weight !== 2)
    throw new Error("Verified collaboration must weigh 2%.");
  const keys: string[] = [];
  for (const dimension of rubric.dimensions) {
    if (
      !dimension.metrics.length ||
      dimension.metrics.reduce((sum, metric) => sum + metric.weight, 0) !== 100
    )
      throw new Error("Metric weights must sum to 100.");
    for (const metric of dimension.metrics) {
      if (
        !metric.key ||
        !metric.source ||
        !Number.isInteger(metric.weight) ||
        metric.weight <= 0 ||
        metric.weight > 100
      )
        throw new Error("Invalid metric definition.");
      keys.push(metric.key);
    }
  }
  if (new Set(keys).size !== keys.length)
    throw new Error("Metric keys must be unique.");
}

export function scoreEmployee({
  employee,
  rubric,
  facts,
  coverage,
  period = PERIOD,
}: {
  employee: Employee;
  rubric: Rubric;
  facts: NormalizedFact[];
  coverage: EvidenceCoverage[];
  period?: { start: string; end: string };
}): CalculatedScore {
  validateRubric(rubric);
  if (rubric.jobFamily !== employee.jobFamily)
    throw new Error("Employee job family does not match rubric.");
  if (employee.level !== "mid")
    throw new Error("V1 supports only mid-level employees.");
  const start = Date.parse(`${period.start}T00:00:00Z`),
    end = Date.parse(`${period.end}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)
    throw new Error("Invalid evaluation window.");
  const latestRevisions = new Map<string, number>();
  // Select revisions before attribution: a correction may change the work item's owner.
  for (const fact of facts)
    latestRevisions.set(
      identity(fact),
      Math.max(latestRevisions.get(identity(fact)) ?? 0, fact.revision),
    );
  const ownFacts = facts.filter((fact) => fact.employeeId === employee.id);
  const current = (fact: NormalizedFact) =>
    fact.revision === latestRevisions.get(identity(fact));
  const within = (fact: NormalizedFact) =>
    fact.observedAt !== null &&
    Date.parse(fact.observedAt) >= start &&
    Date.parse(fact.observedAt) < end;
  const valid = (fact: NormalizedFact) =>
    fact.validationStatus === "valid" &&
    Number.isInteger(fact.revision) &&
    fact.revision > 0 &&
    !!fact.canonicalKey.trim() &&
    Number.isInteger(fact.numerator) &&
    [0, 1].includes(fact.numerator) &&
    fact.denominator === 1;
  const dimensionFractions: (Fraction | null)[] = [];
  const components: ComponentResult[] = rubric.dimensions.map((dimension) => {
    let dimensionValue = zero();
    const metrics = dimension.metrics.map((metric): MetricResult => {
      const observations = coverage.filter(
        (c) =>
          c.employeeId === employee.id &&
          c.source === metric.source &&
          c.periodStart === period.start &&
          c.periodEnd === period.end,
      );
      const maxRevision = Math.max(0, ...observations.map((c) => c.revision));
      const latest = observations.filter((c) => c.revision === maxRevision);
      let reason: string | null =
        latest.length === 0
          ? "Required source coverage is unknown for this exact window."
          : latest.some((c) => c.status !== "complete")
            ? `Required source coverage is ${latest[0].status}; missing observations are not zero outcomes.`
            : null;
      if (
        latest.length > 1 &&
        new Set(latest.map((c) => JSON.stringify([c.status, c.reason]))).size >
          1
      )
        reason = "Conflicting coverage observations at the same revision.";
      const exclusions: MetricResult["exclusions"] = [];
      const candidates: NormalizedFact[] = [];
      for (const fact of ownFacts.filter((f) => f.metricKey === metric.key)) {
        let exclusion: string | null = null;
        if (!current(fact))
          exclusion = "Superseded by a newer source record revision.";
        else if (fact.source !== metric.source)
          exclusion = "Source is not eligible for this metric.";
        else if (!valid(fact))
          exclusion =
            fact.validationReason ??
            "Invalid binary measurement, eligibility or canonical identity.";
        else if (!within(fact))
          exclusion = "Observation is outside the half-open evaluation window.";
        if (exclusion) exclusions.push({ factId: fact.id, reason: exclusion });
        else candidates.push(fact);
      }
      const groups = new Map<string, NormalizedFact[]>();
      for (const fact of candidates)
        groups.set(fact.canonicalKey, [
          ...(groups.get(fact.canonicalKey) ?? []),
          fact,
        ]);
      const used: NormalizedFact[] = [];
      for (const group of groups.values()) {
        group.sort((a, b) => a.id.localeCompare(b.id));
        if (new Set(group.map((fact) => fact.numerator)).size > 1) {
          reason =
            "Conflicting duplicate outcomes for one canonical metric/work measurement; metric withheld.";
          for (const fact of group)
            exclusions.push({ factId: fact.id, reason });
        } else {
          used.push(group[0]);
          for (const fact of group.slice(1))
            exclusions.push({
              factId: fact.id,
              reason:
                "Duplicate canonical metric/work measurement; counted once.",
            });
        }
      }
      // A complete source still cannot justify a metric if one of its eligible work units has no check.
      const sourceMetricKeys = new Set(
        rubric.dimensions
          .flatMap((item) => item.metrics)
          .filter((item) => item.source === metric.source)
          .map((item) => item.key),
      );
      const eligibleWork = new Set(
        ownFacts
          .filter(
            (f) =>
              sourceMetricKeys.has(f.metricKey) &&
              f.source === metric.source &&
              current(f) &&
              valid(f) &&
              within(f),
          )
          .map((f) => f.canonicalKey),
      );
      if ([...eligibleWork].some((key) => !groups.has(key)))
        reason =
          "An eligible source work item is missing this metric check; metric withheld.";
      const numerator = used.reduce((sum, fact) => sum + fact.numerator, 0),
        denominator = used.length;
      if (denominator === 0 && !reason)
        reason =
          "No eligible observed measurements; zero denominator is unavailable.";
      const exact =
        denominator > 0
          ? fraction(BigInt(numerator * 100), BigInt(denominator))
          : null;
      if (!reason && exact)
        dimensionValue = add(
          dimensionValue,
          multiply(exact, metric.weight, 100),
        );
      if (reason) {
        for (const fact of used)
          exclusions.push({
            factId: fact.id,
            reason: `Metric withheld: ${reason}`,
          });
      }
      return {
        key: metric.key,
        label: metric.label,
        weight: metric.weight,
        source: metric.source,
        numerator,
        denominator,
        score: reason || !exact ? null : display(exact),
        status: reason ? "unavailable" : "calculated",
        reason,
        explanation: `${numerator} passing / ${denominator} eligible observed work items × 100. ${metric.weight}% of dimension. ${reason ?? "Complete source coverage; canonical measurements counted once."}`,
        usedFactIds: reason ? [] : used.map((f) => f.id).sort(),
        exclusions: exclusions.sort((a, b) => a.factId.localeCompare(b.factId)),
      };
    });
    const unavailable = metrics.some(
      (metric) => metric.status === "unavailable",
    );
    dimensionFractions.push(unavailable ? null : dimensionValue);
    return {
      key: dimension.key,
      label: dimension.label,
      weight: dimension.weight,
      score: unavailable ? null : display(dimensionValue),
      contribution: unavailable
        ? null
        : display(multiply(dimensionValue, dimension.weight, 100)),
      status: unavailable ? "unavailable" : "calculated",
      reason: unavailable
        ? "Every required metric needs complete coverage and a nonzero eligible denominator."
        : null,
      explanation: `Sum of unrounded metric ratios × metric weights. Dimension contributes ${dimension.weight}% of the overall result. No weights are redistributed.`,
      metrics,
    };
  });
  const insufficient = dimensionFractions.some((value) => value === null);
  const total = dimensionFractions.reduce<Fraction>(
    (sum, value, index) =>
      value
        ? add(sum, multiply(value, rubric.dimensions[index].weight, 100))
        : sum,
    zero(),
  );
  // Coverage describes source availability independently of outcomes and rubric weights.
  const requiredSources = [
    ...new Set(
      rubric.dimensions.flatMap((dimension) =>
        dimension.metrics.map((metric) => metric.source),
      ),
    ),
  ];
  const completeSources = requiredSources.filter((source) => {
    const observations = coverage.filter(
      (item) =>
        item.employeeId === employee.id &&
        item.source === source &&
        item.periodStart === period.start &&
        item.periodEnd === period.end,
    );
    const newest = Math.max(0, ...observations.map((item) => item.revision));
    const selected = observations.filter((item) => item.revision === newest);
    return (
      selected.length > 0 &&
      selected.every((item) => item.status === "complete") &&
      new Set(
        selected.map((item) => JSON.stringify([item.status, item.reason])),
      ).size === 1
    );
  }).length;
  return {
    totalScore: insufficient ? null : display(total),
    status: insufficient ? "insufficient_evidence" : "calculated",
    coverage: display(
      fraction(BigInt(completeSources * 100), BigInt(requiredSources.length)),
    ),
    reason: insufficient
      ? "At least one required dimension is unavailable. Overall score withheld; missing evidence is not zero and weights are not redistributed."
      : null,
    components,
    engineVersion: ENGINE_VERSION,
  };
}

export { ROUNDING_POLICY };
