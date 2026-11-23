import { getPool } from "./db";
import type { RunRow } from "./model";
import {
  JOB_FAMILIES,
  PEOPLE_PAGE_SIZE,
  PERIOD,
  type DirectoryData,
  type DirectoryParams,
  type EmployeeDetail,
  type EmployeeRow,
  type EvidenceView,
  type FamilyOverview,
  type OverviewData,
  type Rubric,
  type ComponentResult,
  type CoverageView,
} from "../types";

async function selectRun(runId?: string): Promise<RunRow | null> {
  if (runId !== undefined && !/^[1-9][0-9]*$/.test(runId))
    throw new Error("Invalid run ID");
  const { rows } = await getPool().query(
    `SELECT id::text,input_manifest,engine_version,status FROM scoring_runs WHERE status='published' AND evaluation_start=$1 AND evaluation_end=$2 ${runId ? "AND id=$3" : ""} ORDER BY scoring_runs.id DESC LIMIT 1`,
    runId ? [PERIOD.start, PERIOD.end, runId] : [PERIOD.start, PERIOD.end],
  );
  return rows[0] ?? null;
}
async function rowsForRun(run: RunRow | null): Promise<EmployeeRow[]> {
  if (!run) return [];
  const { rows } = await getPool().query(
    `SELECT s.employee_id,total_score::float8,s.status,r.version FROM scores s JOIN scoring_rubrics r ON r.id=s.rubric_id WHERE run_id=$1`,
    [run.id],
  );
  const outcomes = new Map(rows.map((row) => [row.employee_id, row]));
  const coverage = await getPool().query(
    "SELECT id,completeness_status FROM evidence_coverage WHERE id=ANY($1::uuid[])",
    [run.input_manifest.employees.flatMap((item) => item.coverageIds)],
  );
  const statuses = new Map(
    coverage.rows.map((row) => [row.id, row.completeness_status]),
  );
  return run.input_manifest.employees.map((item) => {
    const score = outcomes.get(item.employee.id);
    const expected = item.coverageIds.length + item.coverageGaps.length;
    return {
      ...item.employee,
      totalScore: score.total_score,
      status: score.status,
      coverage: expected
        ? Math.round(
            (10000 *
              item.coverageIds.filter((id) => statuses.get(id) === "complete")
                .length) /
              expected,
          ) / 100
        : 0,
      runId: run.id,
      rubricVersion: score.version,
    };
  });
}
export async function getEmployees(
  params: DirectoryParams = {},
): Promise<DirectoryData> {
  const run = await selectRun(params.runId);
  let employees = await rowsForRun(run);
  const query = params.query?.trim().toLocaleLowerCase();
  if (query)
    employees = employees.filter((e) =>
      [e.code, e.name, e.team].some((value) =>
        value.toLocaleLowerCase().includes(query),
      ),
    );
  if (params.family)
    employees = employees.filter((e) => e.jobFamily === params.family);
  if (params.status)
    employees = employees.filter((e) => e.status === params.status);
  employees.sort((a, b) => a.code.localeCompare(b.code));
  const pageSize = Math.max(
    1,
    Math.min(100, Math.floor(params.pageSize ?? PEOPLE_PAGE_SIZE)),
  );
  const page = Math.max(1, Math.floor(params.page ?? 1));
  return {
    employees: employees.slice((page - 1) * pageSize, page * pageSize),
    total: employees.length,
    page,
    pageSize,
    runId: run?.id ?? null,
    period: PERIOD,
  };
}
export async function getOverview(runId?: string): Promise<OverviewData> {
  const run = await selectRun(runId);
  const employees = await rowsForRun(run);
  const average = (items: EmployeeRow[]) =>
    items.length
      ? items.reduce((sum, e) => sum + e.coverage, 0) / items.length
      : 0;
  const families: FamilyOverview[] = JOB_FAMILIES.map((jobFamily) => {
    const items = employees.filter((e) => e.jobFamily === jobFamily);
    const calculated = items.filter((e) => e.totalScore !== null);
    return {
      jobFamily,
      count: items.length,
      calculated: calculated.length,
      insufficient: items.length - calculated.length,
      averageScore: calculated.length
        ? calculated.reduce((sum, e) => sum + e.totalScore!, 0) /
          calculated.length
        : null,
      averageCoverage: average(items),
      distribution: [
        {
          label: "0–49",
          count: calculated.filter((e) => e.totalScore! < 50).length,
        },
        {
          label: "50–69",
          count: calculated.filter(
            (e) => e.totalScore! >= 50 && e.totalScore! < 70,
          ).length,
        },
        {
          label: "70–84",
          count: calculated.filter(
            (e) => e.totalScore! >= 70 && e.totalScore! < 85,
          ).length,
        },
        {
          label: "85–100",
          count: calculated.filter((e) => e.totalScore! >= 85).length,
        },
      ],
    };
  });
  let evidenceCounts = { valid: 0, invalid: 0, excluded: 0 };
  if (run) {
    const evidence = await getPool().query(
      "SELECT validation_status,count(*)::int count FROM evidence_records WHERE id=ANY($1::uuid[]) GROUP BY validation_status",
      [run.input_manifest.employees.flatMap((e) => e.evidenceIds)],
    );
    const excluded = await getPool().query(
      "SELECT count(DISTINCT l.fact_id)::int count FROM score_evidence_links l JOIN score_components c ON c.id=l.component_id JOIN scores s ON s.id=c.score_id WHERE s.run_id=$1 AND l.usage='excluded'",
      [run.id],
    );
    evidenceCounts = {
      valid:
        evidence.rows.find((r) => r.validation_status === "valid")?.count ?? 0,
      invalid: evidence.rows
        .filter((r) => r.validation_status !== "valid")
        .reduce((n, r) => n + r.count, 0),
      excluded: excluded.rows[0].count,
    };
  }
  return {
    employeeCount: employees.length,
    calculatedCount: employees.filter((e) => e.status === "calculated").length,
    insufficientCount: employees.filter(
      (e) => e.status === "insufficient_evidence",
    ).length,
    averageCoverage: average(employees),
    families,
    evidenceCounts,
    period: PERIOD,
    runId: run?.id ?? null,
  };
}
export async function getEmployee(
  code: string,
  runId?: string,
): Promise<EmployeeDetail | null> {
  const run = await selectRun(runId);
  if (!run) return null;
  const employee = (await rowsForRun(run)).find((e) => e.code === code);
  if (!employee) return null;
  const captured = run.input_manifest.employees.find(
    (e) => e.employee.id === employee.id,
  )!;
  const scoreRows = await getPool().query(
    "SELECT id,total_score::float8,status,reason_code,calculated_at FROM scores WHERE run_id=$1 AND employee_id=$2",
    [run.id, employee.id],
  );
  const score = scoreRows.rows[0];
  const [rubrics, components, records, facts, coverageRows, links] =
    await Promise.all([
      getPool().query("SELECT rules FROM scoring_rubrics WHERE id=$1", [
        captured.rubricId,
      ]),
      getPool().query(
        "SELECT dimension,calculation_details FROM score_components WHERE score_id=$1 AND submetric IS NULL",
        [score.id],
      ),
      getPool().query(
        "SELECT * FROM evidence_records WHERE id=ANY($1::uuid[]) ORDER BY source,source_record_id,revision",
        [captured.evidenceIds],
      ),
      getPool().query(
        "SELECT *,value_number::float8 numerator FROM evidence_facts WHERE id=ANY($1::uuid[]) ORDER BY fact_key,id",
        [captured.factIds],
      ),
      getPool().query(
        "SELECT source,completeness_status,reason FROM evidence_coverage WHERE id=ANY($1::uuid[]) ORDER BY source",
        [captured.coverageIds],
      ),
      getPool().query(
        "SELECT DISTINCT fact_id FROM score_evidence_links l JOIN score_components c ON c.id=l.component_id WHERE c.score_id=$1 AND l.usage='used'",
        [score.id],
      ),
    ]);
  const used = new Set(links.rows.map((r) => r.fact_id));
  const rubric: Rubric = rubrics.rows[0].rules;
  const evidence: EvidenceView[] = records.rows.map((r) => ({
    id: r.id,
    source: r.source,
    sourceRecordId: r.source_record_id,
    revision: r.revision,
    recordType: r.record_type,
    title: String(r.raw_payload.title ?? r.record_type),
    observedAt: r.observed_at?.toISOString() ?? null,
    status: r.validation_status,
    reason: r.validation_reason,
    usage: facts.rows.some((f) => f.evidence_id === r.id && used.has(f.id))
      ? "used"
      : "excluded",
    rawPayload: r.raw_payload,
    facts: facts.rows
      .filter((f) => f.evidence_id === r.id)
      .map((f) => ({
        id: f.id,
        metricKey: f.fact_type,
        canonicalKey: f.canonical_fact_key ?? "",
        numerator: f.numerator,
        denominator: Number(f.attributes.denominator ?? 0),
        status: f.validation_status,
        reason: f.validation_reason,
      })),
  }));
  const coverage: CoverageView[] = [
    ...coverageRows.rows.map((r) => ({
      source: r.source,
      status: r.completeness_status,
      reason: r.reason,
    })),
    ...captured.coverageGaps.map((source) => ({
      source,
      status: "unknown" as const,
      reason:
        "No coverage observation was available when this run was captured.",
    })),
  ];
  return {
    employee,
    result: {
      id: score.id,
      totalScore: score.total_score,
      status: score.status,
      coverage: employee.coverage,
      runId: run.id,
      calculatedAt: score.calculated_at.toISOString(),
      reason: score.reason_code,
      components: rubric.dimensions.map(
        (d) =>
          components.rows.find((c) => c.dimension === d.key)!
            .calculation_details.component as ComponentResult,
      ),
      engineVersion: run.engine_version,
    },
    rubric,
    evidence,
    coverage,
    period: PERIOD,
  };
}
export async function getMethodology(): Promise<{
  rubrics: Rubric[];
  period: typeof PERIOD;
}> {
  const { rows } = await getPool().query(
    "SELECT rules FROM scoring_rubrics WHERE status='active' ORDER BY job_family",
  );
  return { rubrics: rows.map((r) => r.rules), period: PERIOD };
}
