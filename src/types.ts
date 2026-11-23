export const JOB_FAMILIES = [
  "data_science",
  "backend_engineering",
  "full_stack_engineering",
  "applied_agentic_ai",
] as const;
export type JobFamily = (typeof JOB_FAMILIES)[number];
export const FAMILY_LABELS: Record<JobFamily, string> = {
  data_science: "Data Science",
  backend_engineering: "Backend Engineering",
  full_stack_engineering: "Full Stack Engineering",
  applied_agentic_ai: "Applied Agentic AI",
};
export const DIMENSION_KEYS = [
  "delivery",
  "quality",
  "validation",
  "reliability",
  "maintainability",
  "collaboration",
] as const;
export type DimensionKey = (typeof DIMENSION_KEYS)[number];
export type ResultStatus = "calculated" | "insufficient_evidence";
export const PERIOD = {
  start: "2026-08-23",
  end: "2026-11-21",
  label: "23 Aug – 20 Nov 2026",
};

export interface MetricDefinition {
  key: string;
  label: string;
  description: string;
  numeratorLabel: string;
  denominatorLabel: string;
  unit: string;
  source: string;
  weight: number;
}
export interface RubricDimension {
  key: DimensionKey;
  label: string;
  weight: number;
  metrics: MetricDefinition[];
}
export interface Rubric {
  id: string;
  jobFamily: JobFamily;
  version: number;
  name: string;
  description: string;
  dimensions: RubricDimension[];
}
export interface Employee {
  id: string;
  code: string;
  name: string;
  jobFamily: JobFamily;
  level: "mid";
  team: string;
  joinedAt: string;
}
export interface EmployeeRow extends Employee {
  totalScore: number | null;
  status: ResultStatus;
  coverage: number;
  runId: string | null;
  rubricVersion: number | null;
}
export interface EvidenceExclusion {
  factId: string;
  reason: string;
}
export interface MetricResult {
  key: string;
  label: string;
  weight: number;
  source: string;
  numerator: number;
  denominator: number;
  score: number | null;
  explanation: string;
  status: "calculated" | "unavailable";
  reason: string | null;
  usedFactIds: string[];
  exclusions: EvidenceExclusion[];
}
export interface ComponentResult {
  key: DimensionKey;
  label: string;
  weight: number;
  score: number | null;
  contribution: number | null;
  status: "calculated" | "unavailable";
  reason: string | null;
  explanation: string;
  metrics: MetricResult[];
}
export interface ScoreResult {
  id: string;
  totalScore: number | null;
  status: ResultStatus;
  coverage: number;
  runId: string;
  calculatedAt: string;
  reason: string | null;
  components: ComponentResult[];
  engineVersion: string;
}
export interface CoverageView {
  source: string;
  status: "complete" | "partial" | "unavailable" | "unknown";
  reason: string | null;
}
export interface EvidenceFactView {
  id: string;
  metricKey: string;
  canonicalKey: string;
  numerator: number;
  denominator: number;
  status: "valid" | "invalid";
  reason: string | null;
}
export interface EvidenceView {
  id: string;
  source: string;
  sourceRecordId: string;
  revision: number;
  recordType: string;
  title: string;
  observedAt: string | null;
  status: "valid" | "invalid" | "retracted";
  reason: string | null;
  usage: "used" | "excluded";
  rawPayload: Record<string, unknown>;
  facts: EvidenceFactView[];
}
export interface FamilyOverview {
  jobFamily: JobFamily;
  count: number;
  calculated: number;
  insufficient: number;
  averageScore: number | null;
  averageCoverage: number;
  distribution: { label: string; count: number }[];
}
export interface OverviewData {
  employeeCount: number;
  calculatedCount: number;
  insufficientCount: number;
  averageCoverage: number;
  families: FamilyOverview[];
  evidenceCounts: { valid: number; invalid: number; excluded: number };
  period: typeof PERIOD;
  runId: string | null;
}
export interface DirectoryParams {
  query?: string;
  family?: JobFamily;
  status?: ResultStatus;
  page?: number;
  pageSize?: number;
  runId?: string;
}
export interface DirectoryData {
  employees: EmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
  runId: string | null;
  period: typeof PERIOD;
}
export interface EmployeeDetail {
  employee: EmployeeRow;
  result: ScoreResult;
  rubric: Rubric;
  evidence: EvidenceView[];
  coverage: CoverageView[];
  period: typeof PERIOD;
}
