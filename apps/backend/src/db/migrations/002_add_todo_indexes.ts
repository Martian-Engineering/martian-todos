import type { Migration } from "./types.js";

/**
 * Adds indexes on todos for common query and sort patterns.
 */
export const migration002AddTodoIndexes: Migration = {
  id: "002_add_todo_indexes",
  name: "add todo indexes for created_at, due_date, priority",
  async up(db) {
    await db.schema
      .createIndex("idx_todos_created_at")
      .ifNotExists()
      .on("todos")
      .column("created_at")
      .execute();

    await db.schema
      .createIndex("idx_todos_due_date")
      .ifNotExists()
      .on("todos")
      .column("due_date")
      .execute();

    await db.schema
      .createIndex("idx_todos_priority")
      .ifNotExists()
      .on("todos")
      .column("priority")
      .execute();
  },
  async down(db) {
    await db.schema.dropIndex("idx_todos_priority").ifExists().execute();
    await db.schema.dropIndex("idx_todos_due_date").ifExists().execute();
    await db.schema.dropIndex("idx_todos_created_at").ifExists().execute();
  },
};
