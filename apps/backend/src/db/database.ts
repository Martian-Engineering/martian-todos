import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { config } from "../config.js";
import type { Database } from "./schema.js";

const { Pool } = pg;

/**
 * Creates a new Kysely database instance.
 * Uses pg Pool for connection management.
 */
function createDatabase(): Kysely<Database> {
  const dialect = new PostgresDialect({
    pool: new Pool({
      connectionString: config.DATABASE_URL,
      max: 10,
    }),
  });

  return new Kysely<Database>({
    dialect,
    log: config.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });
}

/**
 * Shared database instance.
 * Initialized lazily to allow for proper config loading.
 */
export const db = createDatabase();

/**
 * Closes the database connection pool.
 * Call during graceful shutdown.
 */
export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
