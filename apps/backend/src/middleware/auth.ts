import { FastifyRequest, FastifyReply } from "fastify";
import type { JWTPayload } from "@martian-todos/shared";

/**
 * Extends Fastify request with authenticated user info.
 */
declare module "fastify" {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

/**
 * Authentication middleware.
 * Verifies JWT token and attaches user to request.
 *
 * Usage:
 *   fastify.get('/protected', { preHandler: [authenticate] }, handler)
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Verify and decode the JWT token
    const decoded = await request.jwtVerify<JWTPayload>();
    request.user = decoded;
  } catch (error) {
    reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
    });
  }
}

/**
 * Gets the current authenticated user ID.
 * Throws if not authenticated (use after authenticate middleware).
 */
export function getCurrentUserId(request: FastifyRequest): string {
  if (!request.user?.sub) {
    throw new Error("User not authenticated");
  }
  return request.user.sub;
}
