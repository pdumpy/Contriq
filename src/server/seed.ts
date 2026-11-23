import { generateDataset } from "../domain/fixtures";
import { validateRubric } from "../domain/engine";
import { transaction } from "./db";
import { ingestCoverage, ingestEvidence } from "./ingest";
export async function seedDatabase(seed = 42) {
  const dataset = generateDataset(seed);
  if (dataset.employees.length !== 200)
    throw new Error("Fixture must contain exactly 200 employees");
  await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(43678422)");
    for (const e of dataset.employees) {
      await db.query(
        "INSERT INTO employees(id,employee_code,name,job_family,job_level,team,joined_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
        [e.id, e.code, e.name, e.jobFamily, e.level, e.team, e.joinedAt],
      );
      const existing = await db.query(
        "SELECT id FROM employees WHERE id=$1 AND employee_code=$2",
        [e.id, e.code],
      );
      if (!existing.rowCount)
        throw new Error(`Fixture employee identity conflict: ${e.code}`);
    }
    for (const r of dataset.rubrics) {
      validateRubric(r);
      // Existing versions, including retired ones, remain untouched on setup reruns.
      const existing = await db.query(
        "SELECT id,rules FROM scoring_rubrics WHERE job_family=$1 AND version=$2",
        [r.jobFamily, r.version],
      );
      if (!existing.rowCount) {
        const active = await db.query(
          "SELECT id FROM scoring_rubrics WHERE job_family=$1 AND status='active'",
          [r.jobFamily],
        );
        await db.query(
          "INSERT INTO scoring_rubrics(id,job_family,version,rules,status,created_at) VALUES($1,$2,$3,$4,$5,$6)",
          [
            r.id,
            r.jobFamily,
            r.version,
            r,
            active.rowCount ? "retired" : "active",
            "2026-11-21T00:00:00Z",
          ],
        );
      }
    }
    await ingestEvidence(dataset.records, db);
    await ingestCoverage(dataset.coverage, db);
  });
  return {
    employees: dataset.employees.length,
    records: dataset.records.length,
    facts: dataset.facts.length,
  };
}
