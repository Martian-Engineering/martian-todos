import type { Migration } from "./types.js";
import { migration001Initial } from "./001_initial.js";
import { migration002AddTodoIndexes } from "./002_add_todo_indexes.js";

/**
 * Ordered list of migrations to apply.
 */
export const migrations: Migration[] = [migration001Initial, migration002AddTodoIndexes];
