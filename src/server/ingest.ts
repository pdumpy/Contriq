import type { PoolClient } from "pg";
import type { EvidenceCoverage, RawEvidenceRecord } from "../domain/evidence";
import { normalizeEvidence } from "../domain/evidence";
import { transaction } from "./db";

async function appendRows(
  db: PoolClient,
  table: string,
  columns: string[],
  types: string[],
  rows: Record<string, unknown>[],
  conflict: string[],
) {
  if (!rows.length) return;
  for (let offset = 0; offset < rows.length; offset += 400) {
    const chunk = rows.slice(offset, offset + 400);
    const definition = columns
      .map((column, index) => `${column} ${types[index]}`)
      .join(",");
    await db.query(
      `INSERT INTO ${table} (${columns.join(",")}) SELECT ${columns.join(",")} FROM jsonb_to_recordset($1::jsonb) AS incoming(${definition}) ON CONFLICT DO NOTHING`,
      [JSON.stringify(chunk)],
    );
    const identity = conflict
      .map((column) => `existing.${column}=incoming.${column}`)
      .join(" AND ");
    const mismatch = columns
      .map((column) => `existing.${column} IS DISTINCT FROM incoming.${column}`)
      .join(" OR ");
    const result = await db.query(
      `SELECT 1 FROM jsonb_to_recordset($1::jsonb) AS incoming(${definition}) LEFT JOIN ${table} existing ON ${identity} WHERE existing.id IS NULL OR ${mismatch} LIMIT 1`,
      [JSON.stringify(chunk)],
    );
    if (result.rowCount)
      throw new Error(
        `Conflicting ${table} replay; append a new revision instead.`,
      );
  }
}
export async function ingestEvidence(
  records: RawEvidenceRecord[],
  db?: PoolClient,
): Promise<void> {
  const normalized = normalizeEvidence(records);
  const execute = async (client: PoolClient) => {
    await client.query("SELECT pg_advisory_xact_lock(43678422)");
    const ordered = [...normalized.records].sort(
      (a, b) => a.revision - b.revision,
    );
    // Revision batches ensure each predecessor exists before the next revision is checked.
    for (const revision of [...new Set(ordered.map((r) => r.revision))]) {
      await appendRows(
        client,
        "evidence_records",
        [
          "id",
          "employee_id",
          "source",
          "source_record_id",
          "revision",
          "supersedes_id",
          "record_type",
          "observed_at",
          "ingested_at",
          "raw_payload",
          "normalizer_version",
          "validation_status",
          "validation_reason",
        ],
        [
          "uuid",
          "uuid",
          "text",
          "text",
          "integer",
          "uuid",
          "text",
          "timestamptz",
          "timestamptz",
          "jsonb",
          "text",
          "text",
          "text",
        ],
        ordered
          .filter((r) => r.revision === revision)
          .map((r) => ({
            id: r.id,
            employee_id: r.employeeId,
            source: r.source,
            source_record_id: r.sourceRecordId,
            revision: r.revision,
            supersedes_id: r.supersedesId,
            record_type: r.recordType,
            observed_at: r.observedAt,
            ingested_at: r.ingestedAt,
            raw_payload: r.rawPayload,
            normalizer_version: r.normalizerVersion,
            validation_status: r.validationStatus,
            validation_reason: r.validationReason,
          })),
        ["source", "source_record_id", "revision"],
      );
    }
    const recordMap = new Map(normalized.records.map((r) => [r.id, r]));
    await appendRows(
      client,
      "evidence_facts",
      [
        "id",
        "evidence_id",
        "fact_type",
        "fact_key",
        "canonical_fact_key",
        "value_number",
        "attributes",
        "observed_at",
        "validation_status",
        "validation_reason",
      ],
      [
        "uuid",
        "uuid",
        "text",
        "text",
        "text",
        "numeric",
        "jsonb",
        "timestamptz",
        "text",
        "text",
      ],
      normalized.facts.map((f) => ({
        id: f.id,
        evidence_id: f.evidenceId,
        fact_type: f.metricKey,
        fact_key: f.metricKey,
        canonical_fact_key: f.canonicalKey || null,
        value_number: f.numerator,
        attributes: {
          denominator: f.denominator,
          unit: "work items",
          timestampBasis: f.observedAt
            ? "event"
            : "ingestion; event time unavailable",
        },
        observed_at: f.observedAt ?? recordMap.get(f.evidenceId)!.ingestedAt,
        validation_status: f.validationStatus,
        validation_reason: f.validationReason,
      })),
      ["evidence_id", "fact_type", "fact_key"],
    );
  };
  if (db) await execute(db);
  else await transaction(execute);
}
export async function ingestCoverage(
  coverage: EvidenceCoverage[],
  db?: PoolClient,
): Promise<void> {
  const execute = (client: PoolClient) =>
    appendRows(
      client,
      "evidence_coverage",
      [
        "id",
        "employee_id",
        "source",
        "period_start",
        "period_end",
        "revision",
        "completeness_status",
        "last_checked_at",
        "reason",
      ],
      [
        "uuid",
        "uuid",
        "text",
        "date",
        "date",
        "integer",
        "text",
        "timestamptz",
        "text",
      ],
      coverage.map((c) => ({
        id: c.id,
        employee_id: c.employeeId,
        source: c.source,
        period_start: c.periodStart,
        period_end: c.periodEnd,
        revision: c.revision,
        completeness_status: c.status,
        last_checked_at: c.lastCheckedAt,
        reason: c.reason,
      })),
      ["employee_id", "source", "period_start", "period_end", "revision"],
    );
  if (db) await execute(db);
  else await transaction(execute);
}
