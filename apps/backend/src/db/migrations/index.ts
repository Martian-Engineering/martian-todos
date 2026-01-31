import type { Migration } from "./types.js";
import { migration001Initial } from "./001_initial.js";

/**
 * Ordered list of migrations to apply.
 */
export const migrations: Migration[] = [migration001Initial];
