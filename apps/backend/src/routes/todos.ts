import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { SelectQueryBuilder } from "kysely";
import { z } from "zod";
import { db } from "../db/database.js";
import type { Database } from "../db/schema.js";
import { authenticate, getCurrentUserId } from "../middleware/auth.js";
import {
  CreateTodoSchema,
  UpdateTodoSchema,
  type CreateTodoInput,
  type UpdateTodoInput,
  type Todo,
  type PaginatedResponse,
} from "@martian-todos/shared";

const TodoIdSchema = z.string().uuid();

const ListTodosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "dueDate", "priority", "status", "title"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

type ListTodosQuery = z.infer<typeof ListTodosSchema>;

const SORT_COLUMN_MAP: Record<ListTodosQuery["sortBy"], string> = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  dueDate: "due_date",
  priority: "priority",
  status: "status",
  title: "title",
};

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
   * Supports pagination, filtering, search, and sorting.
   */
  fastify.get<{
    Querystring: {
      page?: string;
      pageSize?: string;
      status?: string;
      priority?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    };
  }>("/", async (request, reply) => {
    const userId = getCurrentUserId(request);
    const parseResult = ListTodosSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parseResult.error.flatten(),
        },
      });
    }

    const { page, pageSize, status, priority, search, sortBy, sortOrder } =
      parseResult.data;
    const offset = (page - 1) * pageSize;

    const baseQuery = applyTodoFilters(
      db.selectFrom("todos").where("user_id", "=", userId),
      { status, priority, search }
    );

    const countResult = await baseQuery
      .select(db.fn.count("id").as("count"))
      .executeTakeFirst();

    const total = Number(countResult?.count || 0);

    let dataQuery = baseQuery
      .selectAll()
      .orderBy(SORT_COLUMN_MAP[sortBy], sortOrder);

    if (sortBy !== "createdAt") {
      dataQuery = dataQuery.orderBy("created_at", "desc");
    }

    const todos = await dataQuery.limit(pageSize).offset(offset).execute();

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
    const idParseResult = TodoIdSchema.safeParse(id);

    if (!idParseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid todo id",
          details: idParseResult.error.flatten(),
        },
      });
    }

    const todo = await db
      .selectFrom("todos")
      .selectAll()
      .where("id", "=", idParseResult.data)
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
   * PATCH /todos/complete-all
   * Marks all todos as completed.
   */
  fastify.patch("/complete-all", async (request, reply) => {
    const userId = getCurrentUserId(request);

    const result = await db
      .updateTable("todos")
      .set({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .where("user_id", "=", userId)
      .where("status", "!=", "completed")
      .executeTakeFirst();

    const updated = Number(result.numUpdatedRows ?? 0);

    return reply.send({ success: true, data: { updated } });
  });

  /**
   * DELETE /todos/completed
   * Deletes all completed todos.
   */
  fastify.delete("/completed", async (request, reply) => {
    const userId = getCurrentUserId(request);

    const result = await db
      .deleteFrom("todos")
      .where("user_id", "=", userId)
      .where("status", "=", "completed")
      .executeTakeFirst();

    const deleted = Number(result.numDeletedRows ?? 0);

    return reply.send({ success: true, data: { deleted } });
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
      const idParseResult = TodoIdSchema.safeParse(id);

      if (!idParseResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid todo id",
            details: idParseResult.error.flatten(),
          },
        });
      }

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

      if (Object.keys(parseResult.data).length === 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "No fields provided to update",
          },
        });
      }

      // Check ownership
      const existing = await db
        .selectFrom("todos")
        .select("id")
        .where("id", "=", idParseResult.data)
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
        .where("id", "=", idParseResult.data)
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
    const idParseResult = TodoIdSchema.safeParse(id);

    if (!idParseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid todo id",
          details: idParseResult.error.flatten(),
        },
      });
    }

    const result = await db
      .deleteFrom("todos")
      .where("id", "=", idParseResult.data)
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
 * Applies optional filters to the todos query.
 */
function applyTodoFilters(
  query: SelectQueryBuilder<Database, "todos", {}>,
  filters: Pick<ListTodosQuery, "status" | "priority" | "search">
) {
  // Keep filters explicit so we can reuse the query for count + data.
  let filteredQuery = query;

  // Status filter first since it's the most common list toggle.
  if (filters.status) {
    filteredQuery = filteredQuery.where("status", "=", filters.status);
  }

  // Priority filter is optional and independent of status.
  if (filters.priority) {
    filteredQuery = filteredQuery.where("priority", "=", filters.priority);
  }

  // Search matches title or description text (case-insensitive).
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    filteredQuery = filteredQuery.where((eb) =>
      eb.or([
        eb("title", "ilike", pattern),
        eb("description", "ilike", pattern),
      ])
    );
  }

  return filteredQuery;
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
