import { z } from "zod";
import "dotenv/config";

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
        DATABASE_URL: "postgresql://martian:martian_dev@localhost:5432/martian_todos",
        JWT_SECRET: "dev-secret-do-not-use-in-production-32chars",
        JWT_EXPIRES_IN: "24h",
      };
    }

    throw new Error("Invalid configuration");
  }

  return result.data;
}

export const config = loadConfig();
