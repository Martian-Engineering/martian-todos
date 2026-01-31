#!/usr/bin/env tsx
/**
 * Database migration script.
 * Run with: pnpm migrate (or pnpm migrate:down)
 */

import { sql } from "kysely";
import { db, closeDatabase } from "./database.js";
import { migrations } from "./migrations/index.js";
import type { Migration } from "./migrations/types.js";

const DEFAULT_ROLLBACK_COUNT = 1;

type MigrationRow = {
  id: string;
  name: string;
  applied_at: Date;
};

/**
 * Ensures the migrations metadata table exists.
 */
async function ensureMigrationsTable(): Promise<void> {
  // Keep metadata isolated from application tables.
  await db.schema
    .createTable("migrations")
    .ifNotExists()
    .addColumn("id", "varchar(100)", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("applied_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();
}

/**
 * Loads applied migrations in the order they were executed.
 */
async function fetchAppliedMigrations(): Promise<MigrationRow[]> {
  return db
    .selectFrom("migrations")
    .select(["id", "name", "applied_at"])
    .orderBy("applied_at")
    .execute();
}

/**
 * Parses the requested rollback count.
 */
function parseRollbackCount(rawCount: string | undefined): number {
  if (!rawCount) {
    return DEFAULT_ROLLBACK_COUNT;
  }

  const count = Number.parseInt(rawCount, 10);
  if (!Number.isFinite(count) || count < 1) {
    throw new Error("Rollback count must be a positive integer.");
  }

  return count;
}

/**
 * Applies a single migration and records it.
 */
async function applyMigration(migration: Migration): Promise<void> {
  await db.transaction().execute(async (trx) => {
    // Run the migration within a transaction for safety.
    await migration.up(trx);

    await trx
      .insertInto("migrations")
      .values({ id: migration.id, name: migration.name })
      .execute();
  });
}

/**
 * Rolls back a single migration and removes its record.
 */
async function rollbackMigration(migration: Migration): Promise<void> {
  await db.transaction().execute(async (trx) => {
    // Undo the migration and clear its metadata entry.
    await migration.down(trx);

    await trx.deleteFrom("migrations").where("id", "=", migration.id).execute();
  });
}

/**
 * Runs all pending migrations.
 */
async function migrateUp(): Promise<void> {
  const applied = await fetchAppliedMigrations();
  const appliedIds = new Set(applied.map((row) => row.id));
  const pending = migrations.filter((migration) => !appliedIds.has(migration.id));

  if (pending.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  for (const migration of pending) {
    // Keep output readable for workshop participants.
    console.log(`Applying ${migration.id}: ${migration.name}`);
    await applyMigration(migration);
  }

  console.log("Migrations complete!");
}

/**
 * Rolls back the requested number of migrations.
 */
async function migrateDown(rollbackCount: number): Promise<void> {
  const applied = await db
    .selectFrom("migrations")
    .select(["id", "name", "applied_at"])
    .orderBy("applied_at", "desc")
    .execute();

  if (applied.length === 0) {
    console.log("No migrations to rollback.");
    return;
  }

  const toRollback = applied.slice(0, rollbackCount);
  const migrationById = new Map(migrations.map((migration) => [migration.id, migration]));

  for (const row of toRollback) {
    const migration = migrationById.get(row.id);
    if (!migration) {
      throw new Error(`Missing migration file for ${row.id}.`);
    }

    // Roll back in reverse order of application.
    console.log(`Rolling back ${migration.id}: ${migration.name}`);
    await rollbackMigration(migration);
  }

  console.log("Rollback complete!");
}

/**
 * Entry point for the migration runner.
 */
async function main(): Promise<void> {
  const direction = process.argv[2] === "down" ? "down" : "up";

  try {
    await ensureMigrationsTable();

    if (direction === "down") {
      const rollbackCount = parseRollbackCount(process.argv[3]);
      await migrateDown(rollbackCount);
      return;
    }

    await migrateUp();
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
