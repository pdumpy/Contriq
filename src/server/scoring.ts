import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { generateDataset } from "../domain/fixtures";
import {
  scoreEmployee,
  type CalculatedScore,
  validateRubric,
} from "../domain/engine";
import { ENGINE_VERSION } from "../domain/rubrics";
import type { EvidenceCoverage, NormalizedFact } from "../domain/evidence";
import { JOB_FAMILIES, PERIOD, type Employee, type Rubric } from "../types";
import { getPool, transaction } from "./db";
import type { InputManifest, RunRow } from "./model";

export async function activateRubric(rubric: Rubric) {
  validateRubric(rubric);
  return transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(43678423)");
    await db.query(
      "UPDATE scoring_rubrics SET status='retired' WHERE job_family=$1 AND status='active'",
      [rubric.jobFamily],
    );
    await db.query(
      "INSERT INTO scoring_rubrics(id,job_family,version,rules,status,created_at) VALUES($1,$2,$3,$4,'active',now())",
      [rubric.id, rubric.jobFamily, rubric.version, rubric],
    );
  });
}
export async function captureRun(runKey = randomUUID()): Promise<RunRow> {
  try {
    return await transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(43678424)");
      const existing = await db.query(
        "SELECT id::text,input_manifest,engine_version,status FROM scoring_runs WHERE run_key=$1",
        [runKey],
      );
      if (existing.rowCount) return existing.rows[0];
      const employees = await db.query(
        "SELECT id,employee_code,name,job_family,job_level,team,to_char(joined_at,'YYYY-MM-DD') joined_at FROM employees ORDER BY employee_code",
      );
      const fixture = generateDataset().employees;
      const expected = new Map(fixture.map((e) => [e.id, e]));
      if (
        employees.rowCount !== 200 ||
        employees.rows.some(
          (e) =>
            !expected.has(e.id) ||
            expected.get(e.id)!.jobFamily !== e.job_family ||
            expected.get(e.id)!.code !== e.employee_code ||
            e.job_level !== "mid",
        ) ||
        JOB_FAMILIES.some(
          (f) => employees.rows.filter((e) => e.job_family === f).length !== 50,
        )
      )
        throw new Error(
          "Capture requires the exact 200-person fixture, 50 mid-level employees per family.",
        );
      const rubrics = await db.query(
        "SELECT id,job_family,rules FROM scoring_rubrics WHERE status='active'",
      );
      if (rubrics.rowCount !== 4)
        throw new Error("One active rubric is required for every job family");
      rubrics.rows.forEach((r) => validateRubric(r.rules));
      // Resolve latest source revisions globally before employee attribution or period filtering.
      const records = await db.query(
        "SELECT DISTINCT ON(source,source_record_id) id,employee_id FROM evidence_records ORDER BY source,source_record_id,revision DESC",
      );
      const facts = await db.query(
        "SELECT id,evidence_id FROM evidence_facts WHERE evidence_id=ANY($1::uuid[])",
        [records.rows.map((r) => r.id)],
      );
      const coverage = await db.query(
        "SELECT DISTINCT ON(employee_id,source) id,employee_id,source FROM evidence_coverage WHERE period_start=$1 AND period_end=$2 ORDER BY employee_id,source,revision DESC",
        [PERIOD.start, PERIOD.end],
      );
      const manifest: InputManifest = {
        seed: 42,
        employees: employees.rows.map((e) => {
          const rubric = rubrics.rows.find(
            (r) => r.job_family === e.job_family,
          )!;
          const employee: Employee = {
            id: e.id,
            code: e.employee_code,
            name: e.name,
            jobFamily: e.job_family,
            level: e.job_level,
            team: e.team,
            joinedAt: e.joined_at,
          };
          const evidenceIds = records.rows
            .filter((r) => r.employee_id === e.id)
            .map((r) => r.id)
            .sort();
          const evidenceSet = new Set(evidenceIds);
          const sources = [
            ...new Set(
              (rubric.rules as Rubric).dimensions.flatMap((d) =>
                d.metrics.map((m) => m.source),
              ),
            ),
          ].sort();
          const ownCoverage = coverage.rows.filter(
            (c) => c.employee_id === e.id && sources.includes(c.source),
          );
          return {
            employee,
            rubricId: rubric.id,
            evidenceIds,
            factIds: facts.rows
              .filter((f) => evidenceSet.has(f.evidence_id))
              .map((f) => f.id)
              .sort(),
            coverageIds: ownCoverage.map((c) => c.id).sort(),
            coverageGaps: sources.filter(
              (source) => !ownCoverage.some((c) => c.source === source),
            ),
          };
        }),
      };
      const result = await db.query(
        "INSERT INTO scoring_runs(run_key,status,evaluation_start,evaluation_end,engine_version,input_manifest) VALUES($1,'running',$2,$3,$4,$5) RETURNING id::text,input_manifest,engine_version,status",
        [runKey, PERIOD.start, PERIOD.end, ENGINE_VERSION, manifest],
      );
      return result.rows[0];
    }, "REPEATABLE READ");
  } catch (error) {
    // A competing capture may have committed the same attempt key after our
    // repeatable-read snapshot began. Reconcile that unique key on a fresh read.
    if ((error as { code?: string }).code === "23505") {
      const existing = await getPool(true).query(
        "SELECT id::text,input_manifest,engine_version,status FROM scoring_runs WHERE run_key=$1",
        [runKey],
      );
      if (existing.rowCount) return existing.rows[0];
    }
    throw error;
  }
}
async function calculateRun(
  run: RunRow,
): Promise<Map<string, CalculatedScore>> {
  if (run.engine_version !== ENGINE_VERSION)
    throw new Error(
      "This engine build cannot replay the captured engine version",
    );
  const manifest = run.input_manifest;
  const db = getPool(true);
  const [rubrics, facts, coverage, records] = await Promise.all([
    db.query("SELECT id,rules FROM scoring_rubrics WHERE id=ANY($1::uuid[])", [
      manifest.employees.map((e) => e.rubricId),
    ]),
    db.query(
      "SELECT f.*,f.value_number::float8 numerator,r.employee_id,r.source,r.source_record_id,r.revision,r.observed_at event_time FROM evidence_facts f JOIN evidence_records r ON r.id=f.evidence_id WHERE f.id=ANY($1::uuid[])",
      [manifest.employees.flatMap((e) => e.factIds)],
    ),
    db.query(
      "SELECT *,to_char(period_start,'YYYY-MM-DD') period_start_text,to_char(period_end,'YYYY-MM-DD') period_end_text FROM evidence_coverage WHERE id=ANY($1::uuid[])",
      [manifest.employees.flatMap((e) => e.coverageIds)],
    ),
    db.query(
      "SELECT id,employee_id FROM evidence_records WHERE id=ANY($1::uuid[])",
      [manifest.employees.flatMap((e) => e.evidenceIds)],
    ),
  ]);
  const mappedFacts: NormalizedFact[] = facts.rows.map((f) => ({
    id: f.id,
    evidenceId: f.evidence_id,
    employeeId: f.employee_id,
    source: f.source,
    sourceRecordId: f.source_record_id,
    revision: f.revision,
    metricKey: f.fact_type,
    canonicalKey: f.canonical_fact_key ?? "",
    numerator: f.numerator,
    denominator: Number(f.attributes.denominator),
    observedAt: f.event_time?.toISOString() ?? null,
    validationStatus: f.validation_status,
    validationReason: f.validation_reason,
  }));
  const mappedCoverage: EvidenceCoverage[] = coverage.rows.map((c) => ({
    id: c.id,
    employeeId: c.employee_id,
    source: c.source,
    periodStart: c.period_start_text,
    periodEnd: c.period_end_text,
    revision: c.revision,
    status: c.completeness_status,
    lastCheckedAt: c.last_checked_at.toISOString(),
    reason: c.reason,
  }));
  return new Map(
    manifest.employees.map((captured) => {
      const factIds = new Set(captured.factIds),
        coverageIds = new Set(captured.coverageIds);
      const evidenceIds = new Set(captured.evidenceIds);
      if (
        evidenceIds.size !== captured.evidenceIds.length ||
        factIds.size !== captured.factIds.length ||
        coverageIds.size !== captured.coverageIds.length ||
        captured.evidenceIds.some(
          (id) =>
            !records.rows.some(
              (record) =>
                record.id === id && record.employee_id === captured.employee.id,
            ),
        ) ||
        captured.factIds.some(
          (id) =>
            !mappedFacts.some(
              (f) =>
                f.id === id &&
                f.employeeId === captured.employee.id &&
                evidenceIds.has(f.evidenceId),
            ),
        ) ||
        captured.coverageIds.some(
          (id) =>
            !mappedCoverage.some(
              (c) => c.id === id && c.employeeId === captured.employee.id,
            ),
        )
      )
        throw new Error("Captured input ownership mismatch");
      return [
        captured.employee.id,
        scoreEmployee({
          employee: captured.employee,
          rubric: rubrics.rows.find((r) => r.id === captured.rubricId)!.rules,
          facts: mappedFacts.filter((f) => factIds.has(f.id)),
          coverage: mappedCoverage.filter((c) => coverageIds.has(c.id)),
        }),
      ];
    }),
  );
}
export async function publishRun(
  run: RunRow,
  results: Map<string, CalculatedScore>,
  dbOverride?: PoolClient,
): Promise<void> {
  // Recompute only from immutable pinned inputs, before acquiring publication locks.
  const expected = await calculateRun(run);
  const publish = async (db: PoolClient) => {
    const locked = await db.query(
      "SELECT status,input_manifest FROM scoring_runs WHERE id=$1 FOR UPDATE",
      [run.id],
    );
    if (!locked.rowCount) throw new Error("Unknown scoring attempt");
    if (locked.rows[0].status === "published") return;
    if (locked.rows[0].status !== "running")
      throw new Error("Attempt is already terminal");
    if (
      JSON.stringify(locked.rows[0].input_manifest) !==
      JSON.stringify(run.input_manifest)
    )
      throw new Error("Input manifest mismatch");
    if (results.size !== 200 || run.input_manifest.employees.length !== 200)
      throw new Error("Publication requires exactly 200 outcomes");
    for (const captured of run.input_manifest.employees) {
      const result = results.get(captured.employee.id);
      if (
        !result ||
        JSON.stringify(result) !==
          JSON.stringify(expected.get(captured.employee.id))
      )
        throw new Error("Result does not match its captured inputs");
      const scoreId = randomUUID();
      await db.query(
        "INSERT INTO scores(id,employee_id,run_id,rubric_id,job_family,total_score,status,reason_code,calculated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())",
        [
          scoreId,
          captured.employee.id,
          run.id,
          captured.rubricId,
          captured.employee.jobFamily,
          result.totalScore,
          result.status,
          result.reason,
        ],
      );
      for (const component of result.components) {
        await db.query(
          "INSERT INTO score_components(id,score_id,dimension,component_score,weight_percent,status,reason_code,calculation_details) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            randomUUID(),
            scoreId,
            component.key,
            component.score,
            component.weight,
            component.status,
            component.reason,
            { component },
          ],
        );
        for (const metric of component.metrics) {
          const componentId = randomUUID();
          await db.query(
            "INSERT INTO score_components(id,score_id,dimension,submetric,numerator,denominator,component_score,weight_percent,status,reason_code,calculation_details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
            [
              componentId,
              scoreId,
              component.key,
              metric.key,
              metric.numerator,
              metric.denominator,
              metric.score,
              metric.weight,
              metric.status,
              metric.reason,
              { metric },
            ],
          );
          const pinned = new Set(captured.factIds);
          const links = [
            ...metric.usedFactIds.map((factId) => ({
              factId,
              usage: "used",
              reason: null,
            })),
            ...metric.exclusions.map((e) => ({
              factId: e.factId,
              usage: "excluded",
              reason: e.reason,
            })),
          ];
          for (const link of links) {
            if (!pinned.has(link.factId))
              throw new Error(
                "Evidence link is outside the captured employee snapshot",
              );
            await db.query(
              "INSERT INTO score_evidence_links(component_id,fact_id,usage,exclusion_reason) VALUES($1,$2,$3,$4)",
              [componentId, link.factId, link.usage, link.reason],
            );
          }
        }
      }
    }
    await db.query(
      "UPDATE scoring_runs SET status='published',finished_at=now() WHERE id=$1",
      [run.id],
    );
  };
  if (dbOverride) await publish(dbOverride);
  else await transaction(publish);
}
export async function scoreCohort(runKey = randomUUID()) {
  const run = await captureRun(runKey);
  if (run.status === "published") return { runId: run.id, status: "published" };
  if (run.status === "failed")
    throw new Error("This attempt failed; start a new attempt key");
  try {
    const results = await calculateRun(run);
    await publishRun(run, results);
    return { runId: run.id, status: "published" };
  } catch (error) {
    // A dropped COMMIT response is ambiguous. Check the stable attempt before
    // marking failure so an already committed publication is reported correctly.
    const committed = await getPool(true).query(
      "SELECT status FROM scoring_runs WHERE run_key=$1",
      [runKey],
    );
    if (committed.rows[0]?.status === "published") {
      return { runId: run.id, status: "published" };
    }
    await transaction(async (db) => {
      await db.query(
        "UPDATE scoring_runs SET status='failed',finished_at=now(),failure_code='calculation_or_publication_failed' WHERE id=$1 AND status='running'",
        [run.id],
      );
    });
    throw error;
  }
}
export { calculateRun };
