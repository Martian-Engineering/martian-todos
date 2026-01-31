import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { config } from "../config.js";
import { db } from "../db/database.js";
import {
  CreateUserSchema,
  LoginSchema,
  RefreshTokenSchema,
  type CreateUserInput,
  type LoginInput,
  type AuthResponse,
  type RefreshTokenInput,
  type User,
} from "@martian-todos/shared";

const REFRESH_TOKEN_BYTES = 32;

type UserRow = {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
};

/**
 * Generates a cryptographically secure refresh token.
 */
function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

/**
 * Hashes a refresh token for storage.
 */
function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Calculates refresh token expiration date.
 */
function getRefreshTokenExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.JWT_REFRESH_EXPIRES_IN_DAYS);
  return expiresAt;
}

/**
 * Creates a signed access token for the user.
 */
function createAccessToken(fastify: FastifyInstance, user: UserRow): string {
  return fastify.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: config.JWT_EXPIRES_IN });
}

/**
 * Maps database row to API user response.
 */
function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
      const passwordHash = await bcrypt.hash(password, 12);

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

      // Create refresh token session
      const refreshToken = generateRefreshToken();
      await db
        .insertInto("refresh_tokens")
        .values({
          user_id: user.id,
          token_hash: hashRefreshToken(refreshToken),
          expires_at: getRefreshTokenExpiresAt(),
        })
        .execute();

      // Generate access token
      const token = createAccessToken(fastify, user);

      const response: AuthResponse = {
        token,
        refreshToken,
        user: mapUser(user),
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

      // Create refresh token session
      const refreshToken = generateRefreshToken();
      await db
        .insertInto("refresh_tokens")
        .values({
          user_id: user.id,
          token_hash: hashRefreshToken(refreshToken),
          expires_at: getRefreshTokenExpiresAt(),
        })
        .execute();

      // Generate access token
      const token = createAccessToken(fastify, user);

      const response: AuthResponse = {
        token,
        refreshToken,
        user: mapUser(user),
      };

      return reply.send({ success: true, data: response });
    }
  );

  /**
   * POST /auth/refresh
   * Issues a new access token using a refresh token.
   */
  fastify.post<{ Body: RefreshTokenInput }>(
    "/refresh",
    async (
      request: FastifyRequest<{ Body: RefreshTokenInput }>,
      reply: FastifyReply
    ) => {
      // Validate input
      const parseResult = RefreshTokenSchema.safeParse(request.body);
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

      const { refreshToken } = parseResult.data;
      const tokenHash = hashRefreshToken(refreshToken);
      const session = await db
        .selectFrom("refresh_tokens")
        .select(["id", "user_id", "expires_at", "revoked_at"])
        .where("token_hash", "=", tokenHash)
        .executeTakeFirst();

      const now = new Date();
      if (!session || session.revoked_at || session.expires_at <= now) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired refresh token",
          },
        });
      }

      const user = await db
        .selectFrom("users")
        .select(["id", "email", "name", "created_at", "updated_at"])
        .where("id", "=", session.user_id)
        .executeTakeFirst();

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired refresh token",
          },
        });
      }

      const token = createAccessToken(fastify, user);
      const response: AuthResponse = {
        token,
        refreshToken,
        user: mapUser(user),
      };

      return reply.send({ success: true, data: response });
    }
  );

  /**
   * POST /auth/logout
   * Revokes a refresh token.
   */
  fastify.post<{ Body: RefreshTokenInput }>(
    "/logout",
    async (
      request: FastifyRequest<{ Body: RefreshTokenInput }>,
      reply: FastifyReply
    ) => {
      // Validate input
      const parseResult = RefreshTokenSchema.safeParse(request.body);
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

      const { refreshToken } = parseResult.data;
      const tokenHash = hashRefreshToken(refreshToken);
      const session = await db
        .selectFrom("refresh_tokens")
        .select("id")
        .where("token_hash", "=", tokenHash)
        .where("revoked_at", "is", null)
        .executeTakeFirst();

      if (!session) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired refresh token",
          },
        });
      }

      await db
        .updateTable("refresh_tokens")
        .set({ revoked_at: new Date() })
        .where("id", "=", session.id)
        .execute();

      return reply.status(204).send();
    }
  );
}
