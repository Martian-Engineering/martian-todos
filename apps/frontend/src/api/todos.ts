import type { Todo, PaginatedResponse, CreateTodoInput, UpdateTodoInput } from "@martian-todos/shared";

const API_BASE = "/api";

/**
 * Refresh callback type, set by the app when auth initializes.
 * Returns a fresh access token or null if refresh failed.
 */
type RefreshFn = () => Promise<string | null>;

let _refreshAccessToken: RefreshFn | null = null;

/**
 * Registers the token refresh function so apiFetch can retry on 401.
 * Called once from App when the auth hook mounts.
 */
export function setRefreshHandler(fn: RefreshFn): void {
  _refreshAccessToken = fn;
}

/**
 * Base fetch wrapper with auth header.
 * Automatically retries once on 401 by refreshing the access token.
 */
async function apiFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const doFetch = async (accessToken: string) => {
    return fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });
  };

  let response = await doFetch(token);

  // On 401, attempt a single token refresh and retry the request.
  if (response.status === 401 && _refreshAccessToken) {
    const newToken = await _refreshAccessToken();
    if (newToken) {
      response = await doFetch(newToken);
    }
  }

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
