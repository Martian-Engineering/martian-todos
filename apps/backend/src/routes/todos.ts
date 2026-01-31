import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/database.js";
import { authenticate, getCurrentUserId } from "../middleware/auth.js";
import {
  CreateTodoSchema,
  UpdateTodoSchema,
  type CreateTodoInput,
  type UpdateTodoInput,
  type Todo,
  type PaginatedResponse,
} from "@martian-todos/shared";

/**
 * Todo CRUD routes plugin.
 * All routes require authentication.
 */
export async function todoRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply authentication to all routes in this plugin
  fastify.addHook("preHandler", authenticate);

  /**
   * GET /todos
   * Lists all todos for the authenticated user.
   * Supports pagination and filtering.
   */
  fastify.get<{
    Querystring: {
      page?: string;
      pageSize?: string;
      status?: string;
      priority?: string;
    };
  }>("/", async (request, reply) => {
    const userId = getCurrentUserId(request);
    const page = Math.max(1, parseInt(request.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize || "20", 10)));
    const offset = (page - 1) * pageSize;

    // Build query with optional filters
    let query = db
      .selectFrom("todos")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("created_at", "desc");

    if (request.query.status) {
      query = query.where("status", "=", request.query.status as any);
    }
    if (request.query.priority) {
      query = query.where("priority", "=", request.query.priority as any);
    }

    // Get total count
    const countResult = await db
      .selectFrom("todos")
      .select(db.fn.count("id").as("count"))
      .where("user_id", "=", userId)
      .executeTakeFirst();

    const total = Number(countResult?.count || 0);

    // Get paginated results
    const todos = await query.limit(pageSize).offset(offset).execute();

    const response: PaginatedResponse<Todo> = {
      items: todos.map(mapTodo),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return reply.send({ success: true, data: response });
  });

  /**
   * GET /todos/:id
   * Gets a single todo by ID.
   */
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const userId = getCurrentUserId(request);
    const { id } = request.params;

    const todo = await db
      .selectFrom("todos")
      .selectAll()
      .where("id", "=", id)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (!todo) {
      return reply.status(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Todo not found",
        },
      });
    }

    return reply.send({ success: true, data: mapTodo(todo) });
  });

  /**
   * POST /todos
   * Creates a new todo.
   */
  fastify.post<{ Body: CreateTodoInput }>("/", async (request, reply) => {
    const userId = getCurrentUserId(request);

    // Validate input
    const parseResult = CreateTodoSchema.safeParse(request.body);
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

    const { title, description, priority, dueDate } = parseResult.data;

    const todo = await db
      .insertInto("todos")
      .values({
        user_id: userId,
        title,
        description: description || null,
        priority: priority || "medium",
        status: "pending",
        due_date: dueDate ? new Date(dueDate) : null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return reply.status(201).send({ success: true, data: mapTodo(todo) });
  });

  /**
   * PATCH /todos/:id
   * Updates an existing todo.
   */
  fastify.patch<{ Params: { id: string }; Body: UpdateTodoInput }>(
    "/:id",
    async (request, reply) => {
      const userId = getCurrentUserId(request);
      const { id } = request.params;

      // Validate input
      const parseResult = UpdateTodoSchema.safeParse(request.body);
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

      // Check ownership
      const existing = await db
        .selectFrom("todos")
        .select("id")
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .executeTakeFirst();

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Todo not found",
          },
        });
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      const { title, description, priority, status, dueDate } = parseResult.data;
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (priority !== undefined) updates.priority = priority;
      if (status !== undefined) updates.status = status;
      if (dueDate !== undefined) updates.due_date = dueDate ? new Date(dueDate) : null;

      const todo = await db
        .updateTable("todos")
        .set(updates)
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return reply.send({ success: true, data: mapTodo(todo) });
    }
  );

  /**
   * DELETE /todos/:id
   * Deletes a todo.
   */
  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const userId = getCurrentUserId(request);
    const { id } = request.params;

    const result = await db
      .deleteFrom("todos")
      .where("id", "=", id)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (result.numDeletedRows === BigInt(0)) {
      return reply.status(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Todo not found",
        },
      });
    }

    return reply.status(204).send();
  });
}

/**
 * Maps database row to API response shape.
 */
function mapTodo(row: any): Todo {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
