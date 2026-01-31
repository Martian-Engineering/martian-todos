import type { Kysely } from "kysely";
import type { Database } from "../schema.js";

/**
 * Defines a database migration with up/down actions.
 */
export interface Migration {
  id: string;
  name: string;
  up: (db: Kysely<Database>) => Promise<void>;
  down: (db: Kysely<Database>) => Promise<void>;
}
