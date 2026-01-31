import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db/database.js";
import {
  CreateUserSchema,
  LoginSchema,
  type CreateUserInput,
  type LoginInput,
  type AuthResponse,
  type User,
} from "@martian-todos/shared";

/**
 * Auth routes plugin.
 * Handles user registration and login.
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /auth/register
   * Creates a new user account.
   */
  fastify.post<{ Body: CreateUserInput }>(
    "/register",
    async (request: FastifyRequest<{ Body: CreateUserInput }>, reply: FastifyReply) => {
      // Validate input
      const parseResult = CreateUserSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parseResult.error.flatten(),
          },
        });
      }

      const { email, password, name } = parseResult.data;

      // Check if email already exists
      const existing = await db
        .selectFrom("users")
        .select("id")
        .where("email", "=", email.toLowerCase())
        .executeTakeFirst();

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "An account with this email already exists",
          },
        });
      }

      // Hash password
      // TODO: Consider increasing salt rounds for production
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await db
        .insertInto("users")
        .values({
          email: email.toLowerCase(),
          password_hash: passwordHash,
          name,
        })
        .returning(["id", "email", "name", "created_at", "updated_at"])
        .executeTakeFirstOrThrow();

      // Generate JWT
      const token = fastify.jwt.sign(
        { sub: user.id, email: user.email },
        { expiresIn: "24h" }
      );

      const response: AuthResponse = {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      };

      return reply.status(201).send({ success: true, data: response });
    }
  );

  /**
   * POST /auth/login
   * Authenticates user and returns JWT.
   */
  fastify.post<{ Body: LoginInput }>(
    "/login",
    async (request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) => {
      // Validate input
      const parseResult = LoginSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parseResult.error.flatten(),
          },
        });
      }

      const { email, password } = parseResult.data;

      // Find user
      const user = await db
        .selectFrom("users")
        .selectAll()
        .where("email", "=", email.toLowerCase())
        .executeTakeFirst();

      if (!user) {
        // Don't reveal whether email exists
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      // Generate JWT
      const token = fastify.jwt.sign(
        { sub: user.id, email: user.email },
        { expiresIn: "24h" }
      );

      const response: AuthResponse = {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      };

      return reply.send({ success: true, data: response });
    }
  );
}
