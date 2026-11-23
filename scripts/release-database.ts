import { Pool } from "pg";
import { ENGINE_VERSION } from "../src/domain/rubrics";
import { withReleaseDatabase } from "../src/server/db";
import { migrate } from "../src/server/migrate";
import { scoreCohort } from "../src/server/scoring";
import { seedDatabase } from "../src/server/seed";
import { PERIOD } from "../src/types";

async function releaseDatabase() {
  const connectionString = process.env.CONTRIQ_RELEASE_DATABASE_URL;
  const ca = process.env.CONTRIQ_RELEASE_DATABASE_CA;
  if (!connectionString || !ca) throw new Error("Missing Supabase release secrets");
  const url = new URL(connectionString);
  if (!url.hostname.endsWith(".pooler.supabase.com") || url.search) {
    throw new Error("Expected a Supabase session pooler URL without TLS overrides");
  }

  const pool = new Pool({
    connectionString,
    ssl: { ca, rejectUnauthorized: true },
    max: 2,
    connectionTimeoutMillis: 15000,
    statement_timeout: 120000,
  });
  try {
    const { rows: [identity] } = await pool.query(
      "SELECT current_user AS role, current_schema() AS schema",
    );
    if (identity.role !== "contriq_release" || identity.schema !== "contriq") {
      throw new Error("The Supabase connection does not use the Contriq release role and schema");
    }
    await withReleaseDatabase(pool, async () => {
      await migrate();
      const { rows: [run] } = await pool.query(
        "SELECT id::text, engine_version FROM scoring_runs WHERE status='published' AND evaluation_start=$1 AND evaluation_end=$2 ORDER BY id DESC LIMIT 1",
        [PERIOD.start, PERIOD.end],
      );
      if (!run) await seedDatabase();
      if (run?.engine_version !== ENGINE_VERSION) {
        const result = await scoreCohort();
        console.log(`Published synthetic evaluation ${result.runId}.`);
      } else {
        console.log(`Preserved published synthetic evaluation ${run.id}.`);
      }
      console.log("Supabase migration checks passed.");
    });
  } finally {
    await pool.end();
  }
}

releaseDatabase().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown database error";
  const sanitized = message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database URL]");
  console.error(`Supabase release failed: ${sanitized}`);
  process.exitCode = 1;
});
