import { Pool, types, type PoolClient } from "pg";

// Return `date` columns as raw "YYYY-MM-DD" strings instead of parsing them
// into JS Date objects — the app's date arithmetic works entirely in
// DD.MM.YYYY strings and letting pg apply its own (UTC-based) Date parsing
// here would risk off-by-one-day shifts depending on server timezone.
types.setTypeParser(1082, (val: string) => val);
// numeric -> number (the app's amounts never need arbitrary precision, and
// every call site expects plain JS numbers, same as the prototype's floats).
types.setTypeParser(1700, (val: string) => parseFloat(val));

declare global {
  var __pgPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });
}

export const pool = global.__pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pool;
}

export async function query<T = Record<string, unknown>>(text: string, params?: unknown[]) {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export type DbClient = PoolClient;

export async function withTransaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
