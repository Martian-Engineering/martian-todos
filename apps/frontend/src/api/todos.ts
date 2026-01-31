import type { Todo, PaginatedResponse, CreateTodoInput, UpdateTodoInput } from "@martian-todos/shared";

const API_BASE = "/api";

/**
 * Base fetch wrapper with auth header.
 */
async function apiFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Request failed" } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();
  return json.data;
}

/**
 * Fetches paginated todos.
 */
export async function fetchTodos(
  token: string,
  options?: { page?: number; status?: string }
): Promise<PaginatedResponse<Todo>> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.status) params.set("status", options.status);

  const query = params.toString();
  return apiFetch<PaginatedResponse<Todo>>(`/todos${query ? `?${query}` : ""}`, token);
}

/**
 * Creates a new todo.
 */
export async function createTodo(token: string, input: CreateTodoInput): Promise<Todo> {
  return apiFetch<Todo>("/todos", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Updates an existing todo.
 */
export async function updateTodo(
  token: string,
  id: string,
  input: UpdateTodoInput
): Promise<Todo> {
  return apiFetch<Todo>(`/todos/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Deletes a todo.
 */
export async function deleteTodo(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/todos/${id}`, token, {
    method: "DELETE",
  });
}
