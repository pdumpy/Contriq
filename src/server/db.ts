import { Pool, type PoolClient } from "pg";

const pools: Partial<Record<"reader" | "admin", Pool>> = {};
export function getPool(admin = false): Pool {
  const key = admin ? "admin" : "reader";
  if (!pools[key]) {
    const connectionString = admin
      ? (process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL)
      : process.env.DATABASE_URL;
    if (!connectionString)
      throw new Error(
        "DATABASE_URL is missing. Run npm run setup to configure local PostgreSQL.",
      );
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol))
      throw new Error("DATABASE_URL must be a PostgreSQL URL.");
    if (admin && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      throw new Error(
        "Local write workflows require a localhost PostgreSQL admin URL.",
      );
    }
    const pool = new Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 4000,
      idleTimeoutMillis: 10000,
      statement_timeout: 15000,
      query_timeout: 16000,
      application_name: "contriq",
    });
    pool.on("error", () => {
      /* Individual requests surface connection failures without logging credentials. */
    });
    pools[key] = pool;
  }
  return pools[key]!;
}
export async function transaction<T>(
  operation: (client: PoolClient) => Promise<T>,
  isolation = "READ COMMITTED",
  retries = 2,
): Promise<T> {
  if (
    !["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"].includes(isolation)
  )
    throw new Error("Unsupported isolation level");
  for (let attempt = 0; ; attempt++) {
    const client = await getPool(true).connect();
    try {
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      const code = (error as { code?: string }).code;
      if (attempt >= retries || (code !== "40001" && code !== "40P01")) {
        throw error;
      }
      // Retry only PostgreSQL's explicit rolled-back serialization/deadlock
      // failures. An ambiguous connection failure must be reconciled by its key.
    } finally {
      client.release();
    }
  }
}

export async function closeDatabase() {
  await Promise.all(Object.values(pools).map((pool) => pool.end()));
  delete pools.reader;
  delete pools.admin;
}
