import { Client, type Pool } from "pg";
import { getPool } from "./db";
import { getHyperdriveUrl } from "@/server/hyperdrive";

export type DatabaseReader = Pick<Pool, "query">;

export async function withReadDatabase<T>(
  read: (db: DatabaseReader) => Promise<T>,
): Promise<T> {
  const connectionString = getHyperdriveUrl();
  if (!connectionString) return read(getPool());

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 4000,
    query_timeout: 16000,
  });
  try {
    await client.connect();
    return await read(client);
  } finally {
    await client.end();
  }
}
