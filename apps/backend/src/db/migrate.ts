#!/usr/bin/env tsx
/**
 * Database migration script.
 * Run with: pnpm migrate (or pnpm migrate:down)
 */

import { sql } from "kysely";
import { db, closeDatabase } from "./database.js";

/**
 * Creates all database tables.
 * This is a simple "up" migration - for production, use a proper migration system.
 */
async function migrateUp(): Promise<void> {
  console.log("Running migrations...");

  // Enable UUID extension
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.execute(db);

  // Users table
  await db.schema
    .createTable("users")
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("password_hash", "varchar(255)", (col) => col.notNull())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  // Refresh tokens table
  await db.schema
    .createTable("refresh_tokens")
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("token_hash", "varchar(64)", (col) => col.notNull().unique())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("revoked_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  // Todos table
  await db.schema
    .createTable("todos")
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("title", "varchar(200)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("priority", "varchar(20)", (col) =>
      col.notNull().defaultTo("medium")
    )
    .addColumn("status", "varchar(20)", (col) =>
      col.notNull().defaultTo("pending")
    )
    .addColumn("due_date", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  // Index for faster todo lookups by user
  await db.schema
    .createIndex("idx_todos_user_id")
    .ifNotExists()
    .on("todos")
    .column("user_id")
    .execute();

  // Index for refresh token lookups by user
  await db.schema
    .createIndex("idx_refresh_tokens_user_id")
    .ifNotExists()
    .on("refresh_tokens")
    .column("user_id")
    .execute();

  // Index for filtering by status
  await db.schema
    .createIndex("idx_todos_status")
    .ifNotExists()
    .on("todos")
    .column("status")
    .execute();

  console.log("Migrations complete!");
}

/**
 * Drops all tables (destructive!).
 * Use only in development.
 */
async function migrateDown(): Promise<void> {
  console.log("Rolling back migrations...");

  await db.schema.dropTable("todos").ifExists().execute();
  await db.schema.dropTable("refresh_tokens").ifExists().execute();
  await db.schema.dropTable("users").ifExists().execute();

  console.log("Rollback complete!");
}

// Main execution
async function main(): Promise<void> {
  const direction = process.argv[2];

  try {
    if (direction === "down") {
      await migrateDown();
    } else {
      await migrateUp();
    }
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
