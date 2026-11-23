import {
  DIMENSION_KEYS,
  JOB_FAMILIES,
  type JobFamily,
  type Rubric,
} from "../types";

export const ENGINE_VERSION = "binary-checklist-1.0.1";
export const ROUNDING_POLICY =
  "Exact integer ratio arithmetic; round half up to two decimal places only for displayed metric, dimension, contribution and total. Total uses unrounded dimensions; no weight redistribution.";
const labels = [
  "Accepted Work & Delivery",
  "Technical Quality",
  "Testing & Validation",
  "Execution Reliability",
  "Documentation & Maintainability",
  "Verified Collaboration",
];
const sources = [
  "demo:delivery",
  "demo:review",
  "demo:validation",
  "demo:tracker",
  "demo:docs",
  "demo:collaboration",
];
const weights: Record<JobFamily, number[]> = {
  data_science: [24, 25, 27, 12, 10, 2],
  backend_engineering: [28, 27, 20, 14, 9, 2],
  full_stack_engineering: [30, 25, 18, 15, 10, 2],
  applied_agentic_ai: [24, 24, 29, 12, 9, 2],
};
// Each checklist is an observed yes/no outcome for one eligible, attributed work unit.
const checks: Record<JobFamily, string[][]> = {
  data_science: [
    [
      "Analysis accepted against agreed objective",
      "Result reproduced in handoff",
    ],
    ["Statistical assumptions reviewed", "Data lineage review passed"],
    ["Held-out evaluation passed", "Leakage and subgroup checks passed"],
    ["Delivered by agreed deadline", "Scope changes recorded before deadline"],
    ["Experiment notes complete", "Reusable pipeline documented"],
    ["Verified review unblocked another work item"],
  ],
  backend_engineering: [
    [
      "API change accepted against contract",
      "Change released with acceptance proof",
    ],
    ["Implementation review passed", "Security and error-path review passed"],
    [
      "Automated contract tests passed",
      "Load or failure recovery check passed",
    ],
    ["Delivered by agreed deadline", "Scope changes recorded before deadline"],
    ["API and runbook updated", "Operational ownership documented"],
    ["Verified review unblocked another work item"],
  ],
  full_stack_engineering: [
    ["User flow accepted against criteria", "Integrated change released"],
    ["Implementation review passed", "Accessibility review passed"],
    [
      "End-to-end flow tests passed",
      "Responsive and error-state checks passed",
    ],
    ["Delivered by agreed deadline", "Scope changes recorded before deadline"],
    ["UI and API behavior documented", "Component handoff documented"],
    ["Verified review unblocked another work item"],
  ],
  applied_agentic_ai: [
    [
      "Agent workflow accepted against task contract",
      "Workflow released with outcome proof",
    ],
    [
      "Tool contracts and permissions reviewed",
      "Failure and fallback review passed",
    ],
    [
      "Task evaluation suite passed",
      "Adversarial and unsafe-action checks passed",
    ],
    ["Delivered by agreed deadline", "Scope changes recorded before deadline"],
    [
      "Agent prompts and tools versioned",
      "Evaluation and recovery runbook updated",
    ],
    ["Verified review unblocked another work item"],
  ],
};

export function stableUuid(namespace: number, sequence: number): string {
  return `${namespace.toString(16).padStart(8, "0")}-0000-4000-8000-${sequence.toString(16).padStart(12, "0")}`;
}

export function getRubrics(): Rubric[] {
  return JOB_FAMILIES.map((family, familyIndex) => ({
    id: stableUuid(1, familyIndex + 1),
    jobFamily: family,
    version: 1,
    name: `${family.replaceAll("_", " ")} · provisional V1`,
    description:
      "Synthetic demonstration checklist, not validated performance science. Eligible units are agreed, attributed work items completed in the evaluation window. One observed binary check per metric and work item; each denominator counts eligible measurements with complete source coverage. Collaboration counts only verified work-linked reviews. All metrics require complete coverage and a nonzero denominator.",
    dimensions: DIMENSION_KEYS.map((key, index) => ({
      key,
      label: labels[index],
      weight: weights[family][index],
      metrics: checks[family][index].map((label, checkIndex) => ({
        key: `${family}.${key}.${checkIndex + 1}`,
        label,
        description:
          key === "reliability"
            ? `${label}. A deadline revision counts only when agreed and recorded before the previous deadline; late changes do not erase misses. A work item with no scope change passes the scope-record check.`
            : `${label}. Source records must identify one eligible work item and its observed boolean check. A false check is an observed failure; absent checks are not failures.`,
        numeratorLabel: "Eligible work items passing the check",
        denominatorLabel: "Eligible work items with this observed check",
        unit: "work items",
        source: sources[index],
        weight: checks[family][index].length === 1 ? 100 : 50,
      })),
    })),
  }));
}

export function getRubric(family: JobFamily): Rubric {
  const rubric = getRubrics().find((item) => item.jobFamily === family);
  if (!rubric) throw new Error(`Unsupported job family: ${family}`);
  return rubric;
}
