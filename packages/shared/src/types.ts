import { z } from "zod";

// ============================================================================
// User Types
// ============================================================================

/**
 * Schema for creating a new user (registration).
 */
export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

/**
 * Schema for user login.
 */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Public user representation (no password).
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JWT payload structure.
 */
export interface JWTPayload {
  sub: string; // user id
  email: string;
  iat: number;
  exp: number;
}

// ============================================================================
// Todo Types
// ============================================================================

/**
 * Todo priority levels.
 */
export const TodoPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;
export type TodoPriority = (typeof TodoPriority)[keyof typeof TodoPriority];

/**
 * Todo status values.
 */
export const TodoStatus = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;
export type TodoStatus = (typeof TodoStatus)[keyof typeof TodoStatus];

/**
 * Schema for creating a new todo.
 */
export const CreateTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().datetime().optional(),
});
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;

/**
 * Schema for updating an existing todo.
 */
export const UpdateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;

/**
 * Full todo representation.
 */
export interface Todo {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API success response wrapper.
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard API error response.
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Paginated list response.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Auth response with token and user.
 */
export interface AuthResponse {
  token: string;
  user: User;
}
