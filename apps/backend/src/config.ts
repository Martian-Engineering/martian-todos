import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

/**
 * Loads environment variables from a project-level `.env` file when present.
 *
 * The repo's setup docs instruct creating `.env` at the monorepo root, but many
 * backend scripts run with `cwd=apps/backend`. This loader makes both cases work.
 */
function loadDotEnv(): void {
  const candidates = [
    // `pnpm --filter @martian-todos/backend <script>` from repo root.
    path.resolve(process.cwd(), ".env"),

    // `cd apps/backend && pnpm <script>` (Makefile uses this for migrations/seed).
    path.resolve(process.cwd(), "../../.env"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      // In local dev/workshops it's common to have DATABASE_URL exported in the shell
      // for other projects; prefer the repo's `.env` when it exists.
      dotenv.config({ path: candidate, override: true });
      return;
    }
  }
}

loadDotEnv();

/**
 * Environment configuration schema.
 * Validates and provides type-safe access to environment variables.
 */
const ConfigSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("24h"),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),
});

type Config = z.infer<typeof ConfigSchema>;

/**
 * Parses and validates environment configuration.
 * Throws on missing/invalid config in production.
 */
function loadConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment configuration:");
    console.error(result.error.format());

    // In development, use defaults where possible
    if (process.env.NODE_ENV !== "production") {
      console.warn("Using fallback configuration for development");
      return {
        PORT: 3001,
        NODE_ENV: "development",
        LOG_LEVEL: "debug",
        DATABASE_URL: "postgresql://martian:martian_dev@127.0.0.1:5432/martian_todos",
        JWT_SECRET: "dev-secret-do-not-use-in-production-32chars",
        JWT_EXPIRES_IN: "24h",
        JWT_REFRESH_EXPIRES_IN_DAYS: 30,
      };
    }

    throw new Error("Invalid configuration");
  }

  return result.data;
}

export const config = loadConfig();
