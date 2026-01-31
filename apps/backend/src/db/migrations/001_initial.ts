import { sql } from "kysely";
import type { Migration } from "./types.js";

/**
 * Creates the initial schema for users, refresh tokens, and todos.
 */
export const migration001Initial: Migration = {
  id: "001_initial",
  name: "initial schema",
  async up(db) {
    // Enable UUID generation for primary keys.
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.execute(db);

    // Users table.
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

    // Refresh tokens table.
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

    // Todos table.
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

    // Indexes for common access patterns.
    await db.schema
      .createIndex("idx_todos_user_id")
      .ifNotExists()
      .on("todos")
      .column("user_id")
      .execute();

    await db.schema
      .createIndex("idx_refresh_tokens_user_id")
      .ifNotExists()
      .on("refresh_tokens")
      .column("user_id")
      .execute();

    await db.schema
      .createIndex("idx_todos_status")
      .ifNotExists()
      .on("todos")
      .column("status")
      .execute();
  },
  async down(db) {
    // Drop tables in dependency order.
    await db.schema.dropTable("todos").ifExists().execute();
    await db.schema.dropTable("refresh_tokens").ifExists().execute();
    await db.schema.dropTable("users").ifExists().execute();

    // Remove UUID extension when rolling back the schema.
    await sql`DROP EXTENSION IF EXISTS "uuid-ossp"`.execute(db);
  },
};
