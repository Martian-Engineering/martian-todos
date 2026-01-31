import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { CreateTodoInput, Todo, TodoStatus } from "@martian-todos/shared";
import { isOverdue } from "@martian-todos/shared";
import { AddTodoForm } from "./components/AddTodoForm";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  FilterBar,
  DEFAULT_FILTERS,
  type FilterState,
} from "./components/FilterBar";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { LoginForm } from "./components/LoginForm";
import { TodoList } from "./components/TodoList";
import { useAuth } from "./hooks/useAuth";
import { createTodo, deleteTodo, fetchTodos, updateTodo } from "./api/todos";

const SHORTCUTS = [
  { keys: "N", label: "Focus new todo" },
  { keys: "/", label: "Focus search" },
  { keys: "Esc", label: "Clear search" },
];

/**
 * Normalizes date-like values to numeric timestamps for sorting.
 */
function normalizeDate(value: Date | string | null): number {
  if (!value) return 0;
  const parsed = typeof value === "string" ? new Date(value) : value;
  return parsed.getTime();
}

/**
 * Maps priority strings to numeric ranks for sorting.
 */
function priorityRank(priority: Todo["priority"]): number {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

/**
 * Checks whether a todo matches the current search query.
 */
function matchesSearch(todo: Todo, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return (
    todo.title.toLowerCase().includes(needle) ||
    todo.description?.toLowerCase().includes(needle)
  );
}

/**
 * Filters todos based on the active filter state.
 */
function applyFilters(todos: Todo[], filters: FilterState): Todo[] {
  return todos.filter((todo) => {
    // Match text search across title and description.
    if (!matchesSearch(todo, filters.search.trim())) return false;

    // Match status when a specific status filter is selected.
    if (filters.status !== "all" && todo.status !== filters.status) return false;

    // Match priority when a specific priority filter is selected.
    if (filters.priority !== "all" && todo.priority !== filters.priority) {
      return false;
    }

    return true;
  });
}

/**
 * Sorts todos based on the selected sort option.
 */
function sortTodos(todos: Todo[], sort: FilterState["sort"]): Todo[] {
  const sorted = [...todos];

  sorted.sort((a, b) => {
    // Keep the most recently updated items prominent by default.
    switch (sort) {
      case "created_asc":
        return normalizeDate(a.createdAt) - normalizeDate(b.createdAt);
      case "priority_desc":
        return priorityRank(b.priority) - priorityRank(a.priority);
      case "priority_asc":
        return priorityRank(a.priority) - priorityRank(b.priority);
      case "due_asc":
        return normalizeDate(a.dueDate) - normalizeDate(b.dueDate);
      case "due_desc":
        return normalizeDate(b.dueDate) - normalizeDate(a.dueDate);
      case "created_desc":
      default:
        return normalizeDate(b.createdAt) - normalizeDate(a.createdAt);
    }
  });

  return sorted;
}

/**
 * Checks whether a keyboard event should be ignored for shortcuts.
 */
function isEditableTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;

  if (!target) return false;

  // Ignore keystrokes in fields where users are already typing.
  if (target.isContentEditable) return true;

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

/**
 * Main application component.
 * Handles authentication state and renders appropriate UI.
 */
function App() {
  const { token, user, login, logout } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [pendingTodoIds, setPendingTodoIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Track optimistic operations so we can show syncing UI per todo.
  const addPendingId = useCallback((id: string) => {
    setPendingTodoIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  // Clear optimistic operation markers once a request finishes.
  const removePendingId = useCallback((id: string) => {
    setPendingTodoIds((prev) => prev.filter((pendingId) => pendingId !== id));
  }, []);

  /**
   * Loads todos from the API for the current user session.
   */
  const loadTodos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchTodos(token);
      setTodos(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load todos");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load todos when authenticated.
  useEffect(() => {
    if (token) {
      void loadTodos();
    }
  }, [token, loadTodos]);

  // Wire up keyboard shortcuts for quick navigation.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't override keystrokes inside form fields.
      if (isEditableTarget(event)) return;

      // Focus the search input on slash.
      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      // Focus the new todo title on "N".
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        titleInputRef.current?.focus();
      }

      // Clear search and blur on escape.
      if (event.key === "Escape" && filters.search.trim().length > 0) {
        event.preventDefault();
        setFilters((prev) => ({ ...prev, search: "" }));
        searchInputRef.current?.blur();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filters.search]);

  /**
   * Creates a todo with optimistic UI updates.
   */
  const handleCreateTodo = useCallback(
    async (input: CreateTodoInput) => {
      if (!token) return;

      // Stage a local todo to keep the UI responsive.
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticTodo: Todo = {
        id: optimisticId,
        userId: user?.id ?? "pending",
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? "medium",
        status: "pending",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Insert the optimistic record and show a syncing indicator.
      addPendingId(optimisticId);
      setTodos((prev) => [optimisticTodo, ...prev]);

      try {
        const created = await createTodo(token, input);
        // Replace the optimistic record with the API response.
        setTodos((prev) =>
          prev.map((todo) => (todo.id === optimisticId ? created : todo))
        );
      } catch (err) {
        // Roll back optimistic changes and surface the error.
        setTodos((prev) => prev.filter((todo) => todo.id !== optimisticId));
        setError(err instanceof Error ? err.message : "Failed to create todo");
        throw err;
      } finally {
        removePendingId(optimisticId);
      }
    },
    [addPendingId, removePendingId, token, user?.id]
  );

  /**
   * Updates a todo status with optimistic UI updates.
   */
  const handleStatusChange = useCallback(
    async (todo: Todo, status: TodoStatus) => {
      if (!token) return;

      // Capture current state so we can undo on failure.
      const previous = { ...todo };

      // Apply the status change immediately.
      addPendingId(todo.id);
      setTodos((prev) =>
        prev.map((item) =>
          item.id === todo.id ? { ...item, status } : item
        )
      );

      try {
        const updated = await updateTodo(token, todo.id, { status });
        // Sync in the updated server record.
        setTodos((prev) =>
          prev.map((item) => (item.id === todo.id ? updated : item))
        );
      } catch (err) {
        // Restore the prior todo state on failure.
        setTodos((prev) =>
          prev.map((item) => (item.id === todo.id ? previous : item))
        );
        setError(err instanceof Error ? err.message : "Failed to update todo");
      } finally {
        removePendingId(todo.id);
      }
    },
    [addPendingId, removePendingId, token]
  );

  /**
   * Deletes a todo with optimistic UI updates.
   */
  const handleDeleteTodo = useCallback(
    async (todo: Todo) => {
      if (!token) return;

      // Confirm destructive actions before removing from the list.
      if (!window.confirm("Delete this todo?")) return;

      const previousIndex = todos.findIndex((item) => item.id === todo.id);

      // Remove the item immediately while we sync the delete.
      addPendingId(todo.id);
      setTodos((prev) => prev.filter((item) => item.id !== todo.id));

      try {
        await deleteTodo(token, todo.id);
      } catch (err) {
        // Restore the item in its original position.
        setTodos((prev) => {
          const next = [...prev];
          const insertIndex = previousIndex < 0 ? next.length : previousIndex;
          next.splice(insertIndex, 0, todo);
          return next;
        });
        setError(err instanceof Error ? err.message : "Failed to delete todo");
      } finally {
        removePendingId(todo.id);
      }
    },
    [addPendingId, removePendingId, token, todos]
  );

  // Apply filters and sorting to the list before rendering.
  const filteredTodos = useMemo(() => {
    const filtered = applyFilters(todos, filters);
    return sortTodos(filtered, filters.sort);
  }, [todos, filters]);

  // Determine empty state messaging based on active filters.
  const isFiltered =
    filters.search.trim().length > 0 ||
    filters.status !== "all" ||
    filters.priority !== "all";

  const emptyMessage = isFiltered
    ? "No todos match the current filters."
    : "No todos yet. Add one above!";

  // Build summary stats for quick glance dashboard.
  const totalCount = todos.length;
  const visibleCount = filteredTodos.length;
  const completedCount = todos.filter((todo) => todo.status === "completed").length;
  const overdueCount = todos.filter(
    (todo) => todo.status !== "completed" && isOverdue(todo.dueDate)
  ).length;

  // Track the total number of operations still syncing.
  const pendingCount = pendingTodoIds.length;

  if (!token) {
    return (
      <div className="app app--auth">
        <header className="app__header app__header--stack">
          <div>
            <p className="eyebrow">Martian Engineering</p>
            <h1>Martian Todos</h1>
            <p className="muted">
              A mission-ready backlog for daily operations, launches, and landings.
            </p>
          </div>
        </header>

        <main className="auth-layout">
          <LoginForm onLogin={login} />
          <div className="card card--soft">
            <h2>Mission ready</h2>
            <ul className="feature-list">
              <li>Optimistic updates with instant feedback.</li>
              <li>Powerful filters, sorting, and search.</li>
              <li>Keyboard shortcuts for rapid planning.</li>
              <li>Responsive layout for any device.</li>
            </ul>
          </div>
        </main>

        <KeyboardShortcuts shortcuts={SHORTCUTS} title="Try these" />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <p className="eyebrow">Mission Control</p>
          <h1>Martian Todos</h1>
          <p className="muted">Welcome back, {user?.name}.</p>
        </div>
        <div className="app__actions">
          {pendingCount > 0 && (
            <div className="sync-pill" aria-live="polite">
              Syncing {pendingCount} change{pendingCount === 1 ? "" : "s"}
            </div>
          )}
          <button className="button-ghost" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="app__content">
        <AddTodoForm onCreate={handleCreateTodo} titleInputRef={titleInputRef} />

        <section className="card card--soft">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            resultsCount={visibleCount}
            totalCount={totalCount}
            searchInputRef={searchInputRef}
          />

          <div className="stats">
            <div>
              <span className="stats__label">Total</span>
              <strong>{totalCount}</strong>
            </div>
            <div>
              <span className="stats__label">Completed</span>
              <strong>{completedCount}</strong>
            </div>
            <div>
              <span className="stats__label">Overdue</span>
              <strong>{overdueCount}</strong>
            </div>
          </div>

          {error && (
            <div className="alert alert--error" role="alert">
              <div>
                <strong>Heads up.</strong>
                <p>{error}</p>
              </div>
              <div className="alert__actions">
                <button className="button-secondary" onClick={() => void loadTodos()}>
                  Retry
                </button>
                <button
                  className="button-ghost"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <ErrorBoundary>
            <TodoList
              todos={filteredTodos}
              isLoading={loading}
              pendingIds={pendingTodoIds}
              emptyMessage={emptyMessage}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteTodo}
            />
          </ErrorBoundary>
        </section>
      </main>

      <KeyboardShortcuts shortcuts={SHORTCUTS} />
    </div>
  );
}

export default App;
