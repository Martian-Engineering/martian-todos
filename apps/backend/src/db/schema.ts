import { Generated, ColumnType } from "kysely";

/**
 * Database schema types for Kysely.
 * These types map directly to the PostgreSQL tables.
 */

// ============================================================================
// Users Table
// ============================================================================

export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  name: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

// ============================================================================
// Refresh Tokens Table
// ============================================================================

export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

// ============================================================================
// Todos Table
// ============================================================================

export interface TodosTable {
  id: Generated<string>;
  user_id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  due_date: Date | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

// ============================================================================
// Database Interface
// ============================================================================

/**
 * Main database interface used by Kysely.
 * Add new tables here as they're created.
 */
export interface Database {
  users: UsersTable;
  refresh_tokens: RefreshTokensTable;
  todos: TodosTable;
}
