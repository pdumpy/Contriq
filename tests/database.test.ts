import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { closeDatabase, getPool } from "../src/server/db";
import {
  getEmployee,
  getEmployees,
  getMethodology,
  getOverview,
} from "../src/server/queries";
import { ingestEvidence } from "../src/server/ingest";
import { generateDataset } from "../src/domain/fixtures";
import { calculateRun, publishRun } from "../src/server/scoring";
import type { RunRow } from "../src/server/model";
import { PERIOD } from "../src/types";

// All write tests use rollback. They preserve the developer's imported evidence and history.
async function rolledBack(operation: (db: PoolClient) => Promise<void>) {
  const db = await getPool(true).connect();
  await db.query("BEGIN");
  try {
    await operation(db);
  } finally {
    await db.query("ROLLBACK");
    db.release();
  }
}
async function rejected(
  db: PoolClient,
  operation: () => Promise<unknown>,
  pattern: RegExp,
) {
  await db.query("SAVEPOINT expected_rejection");
  await assert.rejects(operation, pattern);
  await db.query("ROLLBACK TO SAVEPOINT expected_rejection");
}
async function temporaryRun(db: PoolClient): Promise<RunRow> {
  const latest = await db.query(
    "SELECT * FROM scoring_runs WHERE status='published' ORDER BY id DESC LIMIT 1",
  );
  assert.ok(latest.rowCount, "Run npm run setup before database tests");
  const previous = latest.rows[0];
  const result = await db.query(
    "INSERT INTO scoring_runs(run_key,status,evaluation_start,evaluation_end,engine_version,input_manifest) VALUES($1,'running',$2,$3,$4,$5) RETURNING id::text,input_manifest,engine_version,status",
    [
      randomUUID(),
      previous.evaluation_start,
      previous.evaluation_end,
      previous.engine_version,
      previous.input_manifest,
    ],
  );
  return result.rows[0];
}
after(closeDatabase);

test("PostgreSQL reads expose one complete cohort, four rubrics, exclusions and explicit insufficiency", async () => {
  const overview = await getOverview();
  assert.equal(overview.employeeCount, 200);
  assert.deepEqual(
    overview.families.map((f) => f.count),
    [50, 50, 50, 50],
  );
  assert.equal(overview.calculatedCount, 188);
  assert.equal(overview.insufficientCount, 12);
  assert.ok(overview.evidenceCounts.invalid > 0);
  assert.ok(overview.evidenceCounts.excluded > 0);
  assert.equal((await getMethodology()).rubrics.length, 4);
  const directory = await getEmployees({ pageSize: 100 });
  const detail = await getEmployee(
    directory.employees[0].code,
    directory.runId!,
  );
  assert.ok(detail);
  assert.equal(detail.result.components.length, 6);
  assert.equal(detail.result.runId, directory.runId);
  assert.equal(detail.result.coverage, detail.employee.coverage);
  assert.ok(detail.evidence.length > 0);
  assert.equal(detail.rubric.jobFamily, detail.employee.jobFamily);
});

test("directory search, family/status filters and pagination use the selected published snapshot", async () => {
  const first = await getEmployees({
    family: "backend_engineering",
    pageSize: 7,
    page: 1,
  });
  const second = await getEmployees({
    family: "backend_engineering",
    pageSize: 7,
    page: 2,
    runId: first.runId!,
  });
  assert.equal(first.total, 50);
  assert.equal(first.employees.length, 7);
  assert.equal(
    new Set([...first.employees, ...second.employees].map((e) => e.id)).size,
    14,
  );
  const found = await getEmployees({
    query: first.employees[0].code,
    runId: first.runId!,
  });
  assert.equal(found.total, 1);
  assert.equal(found.employees[0].id, first.employees[0].id);
  assert.equal(
    (await getEmployees({ status: "insufficient_evidence" })).total,
    12,
  );
  assert.equal(
    (await getEmployees({ query: "no fictional employee matches this" })).total,
    0,
  );
  assert.equal(await getEmployee("missing-person"), null);
  await assert.rejects(
    () => getEmployees({ runId: "1 OR 1=1" }),
    /Invalid run/,
  );
});

test("source replay is idempotent, conflicting replays reject and history cannot be edited", async () => {
  const record = generateDataset().records[0];
  await rolledBack(async (db) => {
    const before = await db.query(
      "SELECT count(*)::int count FROM evidence_records",
    );
    await ingestEvidence([record], db);
    await ingestEvidence([record], db);
    assert.equal(
      (await db.query("SELECT count(*)::int count FROM evidence_records"))
        .rows[0].count,
      before.rows[0].count,
    );
    await rejected(
      db,
      () =>
        ingestEvidence(
          [
            {
              ...record,
              rawPayload: { ...record.rawPayload, title: "Conflicting replay" },
            },
          ],
          db,
        ),
      /Conflicting.*replay/,
    );
    await rejected(
      db,
      () =>
        db.query("UPDATE evidence_records SET raw_payload='{}' WHERE id=$1", [
          record.id,
        ]),
      /append-only/,
    );
    await rejected(
      db,
      () => db.query("DELETE FROM evidence_records WHERE id=$1", [record.id]),
      /append-only/,
    );
    await rejected(
      db,
      () =>
        db.query("UPDATE scoring_rubrics SET rules='{}' WHERE status='active'"),
      /immutable/,
    );
  });
});

test("foreign keys reject orphan and wrong-family outcomes; revision chains reject wrong predecessors", async () => {
  await rolledBack(async (db) => {
    const run = await temporaryRun(db);
    const person = run.input_manifest.employees[0];
    const other = run.input_manifest.employees.find(
      (e) => e.employee.jobFamily !== person.employee.jobFamily,
    )!;
    const insert = (employeeId: string, rubricId: string) =>
      db.query(
        "INSERT INTO scores(id,employee_id,run_id,rubric_id,job_family,total_score,status,calculated_at) VALUES($1,$2,$3,$4,$5,80,'calculated',now())",
        [randomUUID(), employeeId, run.id, rubricId, person.employee.jobFamily],
      );
    await rejected(
      db,
      () => insert(randomUUID(), person.rubricId),
      /foreign key/,
    );
    await rejected(
      db,
      () => insert(person.employee.id, other.rubricId),
      /foreign key/,
    );
    const record = generateDataset().records[0];
    await rejected(
      db,
      () =>
        ingestEvidence(
          [
            {
              ...record,
              id: randomUUID(),
              sourceRecordId: "broken-chain",
              revision: 2,
              supersedesId: record.id,
            },
          ],
          db,
        ),
      /predecessor mismatch/,
    );
  });
});

test("a full publication is atomic and terminal; rollback preserves the last public result", async () => {
  const previous = (await getOverview()).runId;
  await rolledBack(async (db) => {
    const run = await temporaryRun(db);
    const results = await calculateRun(run);
    assert.equal(results.size, 200);
    await publishRun(run, results, db);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int count FROM scores WHERE run_id=$1",
          [run.id],
        )
      ).rows[0].count,
      200,
    );
    assert.equal(
      (await db.query("SELECT status FROM scoring_runs WHERE id=$1", [run.id]))
        .rows[0].status,
      "published",
    );
    await rejected(
      db,
      () =>
        db.query(
          "UPDATE scoring_runs SET status='failed',failure_code='late',finished_at=now() WHERE id=$1",
          [run.id],
        ),
      /Invalid run transition/,
    );
    await rejected(
      db,
      () =>
        db.query("UPDATE scores SET total_score=0 WHERE run_id=$1", [run.id]),
      /append-only/,
    );
    assert.equal(
      (await getOverview()).runId,
      previous,
      "Uncommitted publication cannot leak into public reads",
    );
  });
  assert.equal((await getOverview()).runId, previous);
});

test("a late duplicate rolls back every attempted score and failed runs remain invisible", async () => {
  const previous = (await getOverview()).runId;
  await rolledBack(async (db) => {
    const run = await temporaryRun(db);
    const last = run.input_manifest.employees.at(-1)!;
    await db.query(
      "INSERT INTO scores(id,employee_id,run_id,rubric_id,job_family,total_score,status,calculated_at) VALUES($1,$2,$3,$4,$5,80,'calculated',now())",
      [
        randomUUID(),
        last.employee.id,
        run.id,
        last.rubricId,
        last.employee.jobFamily,
      ],
    );
    const results = await calculateRun(run);
    await rejected(db, () => publishRun(run, results, db), /duplicate key/);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int count FROM scores WHERE run_id=$1",
          [run.id],
        )
      ).rows[0].count,
      1,
      "All earlier writes made by the rejected publication rolled back",
    );
    await rejected(
      db,
      () =>
        db.query(
          "UPDATE scoring_runs SET status='published',finished_at=now() WHERE id=$1",
          [run.id],
        ),
      /complete 200/,
    );
    await db.query(
      "UPDATE scoring_runs SET status='failed',finished_at=now(),failure_code='test_failure' WHERE id=$1",
      [run.id],
    );
    assert.equal((await getOverview()).runId, previous);
  });
});

test("evidence corrections and replacement rubric versions retain the original published inputs", async () => {
  const directory = await getEmployees({ status: "calculated", pageSize: 1 });
  const detail = (await getEmployee(
    directory.employees[0].code,
    directory.runId!,
  ))!;
  const original = detail.evidence.find(
    (e) => e.status === "valid" && e.recordType !== "administrative_note",
  )!;
  assert.ok(original);
  await rolledBack(async (db) => {
    const row = (
      await db.query(
        "SELECT * FROM evidence_records WHERE source=$1 AND source_record_id=$2 ORDER BY revision DESC LIMIT 1",
        [original.source, original.sourceRecordId],
      )
    ).rows[0];
    await ingestEvidence(
      [
        {
          id: "00000002-0000-4000-8000-000000fffffe",
          employeeId: detail.employee.id,
          source: row.source,
          sourceRecordId: row.source_record_id,
          revision: row.revision + 1,
          supersedesId: row.id,
          recordType: row.record_type,
          observedAt: row.observed_at.toISOString(),
          ingestedAt: "2026-11-23T00:00:00Z",
          rawPayload: {
            ...row.raw_payload,
            title: "Corrected source record retained as a new revision",
          },
          normalizerVersion: row.normalizer_version,
          validationStatus: "valid",
          validationReason: null,
        },
      ],
      db,
    );
    assert.deepEqual(
      (
        await db.query("SELECT raw_payload FROM evidence_records WHERE id=$1", [
          row.id,
        ])
      ).rows[0].raw_payload,
      row.raw_payload,
    );
    const replacement = {
      ...detail.rubric,
      id: randomUUID(),
      version: detail.rubric.version + 1,
    };
    await db.query("UPDATE scoring_rubrics SET status='retired' WHERE id=$1", [
      detail.rubric.id,
    ]);
    await db.query(
      "INSERT INTO scoring_rubrics(id,job_family,version,rules,status,created_at) VALUES($1,$2,$3,$4,'active',now())",
      [replacement.id, replacement.jobFamily, replacement.version, replacement],
    );
    assert.equal(
      (
        await db.query("SELECT rubric_id FROM scores WHERE id=$1", [
          detail.result.id,
        ])
      ).rows[0].rubric_id,
      detail.rubric.id,
    );
    const manifest = (
      await db.query("SELECT input_manifest FROM scoring_runs WHERE id=$1", [
        detail.result.runId,
      ])
    ).rows[0].input_manifest;
    const captured = manifest.employees.find(
      (e: { employee: { id: string } }) => e.employee.id === detail.employee.id,
    );
    assert.ok(captured.evidenceIds.includes(original.id));
    assert.ok(
      !captured.evidenceIds.includes("00000002-0000-4000-8000-000000fffffe"),
    );
    assert.equal(captured.rubricId, detail.rubric.id);
  });
  assert.deepEqual(
    await getEmployee(detail.employee.code, detail.result.runId),
    detail,
  );
});

test("capture attempt keys reconcile existing runs and unsupported engine builds cannot replay", async () => {
  const latest = await getPool(true).query(
    "SELECT id::text,run_key,input_manifest,engine_version,status FROM scoring_runs WHERE status='published' ORDER BY scoring_runs.id DESC LIMIT 1",
  );
  const run = latest.rows[0];
  const { captureRun } = await import("../src/server/scoring");
  assert.equal((await captureRun(run.run_key)).id, run.id);
  await assert.rejects(
    () => calculateRun({ ...run, engine_version: "unsupported-future-build" }),
    /cannot replay/,
  );
});

test("database rejects incomplete run insertion and malformed rubric activation", async () => {
  await rolledBack(async (db) => {
    await rejected(
      db,
      () =>
        db.query(
          "INSERT INTO scoring_runs(run_key,status,evaluation_start,evaluation_end,engine_version,input_manifest) VALUES($1,'running','2026-08-23','2026-11-21','test','{}')",
          [randomUUID()],
        ),
      /complete cohort/,
    );
    const rules = (await getMethodology()).rubrics[0];
    const missingWeight = {
      ...rules,
      id: randomUUID(),
      version: 100001,
      dimensions: rules.dimensions.map((dimension, index) =>
        index === 0 ? { ...dimension, weight: null } : dimension,
      ),
    };
    await rejected(
      db,
      () =>
        db.query(
          "INSERT INTO scoring_rubrics(id,job_family,version,rules,status,created_at) VALUES($1,$2,$3,$4,'active',now())",
          [
            missingWeight.id,
            missingWeight.jobFamily,
            missingWeight.version,
            missingWeight,
          ],
        ),
      /Invalid rubric weights/,
    );
  });
});

test("latest published reads select the numeric maximum run while explicit history remains addressable", async () => {
  const published = await getPool(true).query(
    "SELECT max(id)::text latest, min(id)::text earliest FROM scoring_runs WHERE status='published' AND evaluation_start=$1 AND evaluation_end=$2",
    [PERIOD.start, PERIOD.end],
  );
  const { latest, earliest } = published.rows[0];
  assert.ok(latest, "Run npm run setup before database tests");
  assert.equal((await getOverview()).runId, latest);
  assert.equal((await getEmployees()).runId, latest);
  assert.equal((await getOverview(earliest)).runId, earliest);
  assert.equal((await getEmployees({ runId: earliest })).runId, earliest);
});
