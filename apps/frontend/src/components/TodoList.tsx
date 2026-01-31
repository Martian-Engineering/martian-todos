import type { Todo, TodoStatus } from "@martian-todos/shared";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  isLoading: boolean;
  pendingIds: string[];
  emptyMessage: string;
  onStatusChange: (todo: Todo, status: TodoStatus) => void;
  onDelete: (todo: Todo) => void;
}

/**
 * Renders a list of todos with loading and empty states.
 */
export function TodoList({
  todos,
  isLoading,
  pendingIds,
  emptyMessage,
  onStatusChange,
  onDelete,
}: TodoListProps) {
  const pendingSet = new Set(pendingIds);

  // Render a skeleton grid for the initial load.
  if (isLoading && todos.length === 0) {
    return (
      <div className="todo-list">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="todo-skeleton">
            <div className="todo-skeleton__checkbox" />
            <div className="todo-skeleton__body">
              <div className="todo-skeleton__line" />
              <div className="todo-skeleton__line todo-skeleton__line--short" />
              <div className="todo-skeleton__chips" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render the empty state once we know there are no items.
  if (todos.length === 0) {
    return (
      <div className="empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="todo-list">
      {/* Light-weight refresh indicator when we already have data. */}
      {isLoading && (
        <div className="list-loading" role="status">
          Refreshing tasks...
        </div>
      )}
      {/* Render each todo, with optimistic syncing indicators. */}
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          isBusy={pendingSet.has(todo.id)}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
