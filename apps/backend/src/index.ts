import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { config } from "./config.js";
import { authRoutes } from "./routes/auth.js";
import { todoRoutes } from "./routes/todos.js";
import { closeDatabase } from "./db/database.js";

/**
 * Creates and configures the Fastify server instance.
 */
async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: config.NODE_ENV === "development" ? true : ["https://martian-todos.example.com"],
    credentials: true,
  });

  // Register JWT
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
  });

  // Health check endpoint
  fastify.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  // API routes
  await fastify.register(authRoutes, { prefix: "/auth" });
  await fastify.register(todoRoutes, { prefix: "/todos" });

  // Global error handler
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    fastify.log.error(error);

    // Don't leak internal errors in production
    const message =
      config.NODE_ENV === "development"
        ? error.message
        : "Internal server error";

    reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message,
      },
    });
  });

  return fastify;
}

/**
 * Starts the server.
 */
async function start() {
  const server = await buildServer();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}, shutting down...`);
    await server.close();
    await closeDatabase();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await server.listen({ port: config.PORT, host: "0.0.0.0" });
    server.log.info(`Server listening on port ${config.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
