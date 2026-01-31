import type { Todo, TodoStatus } from "@martian-todos/shared";
import { formatDate, isOverdue } from "@martian-todos/shared";

interface TodoItemProps {
  todo: Todo;
  isBusy: boolean;
  onStatusChange: (todo: Todo, status: TodoStatus) => void;
  onDelete: (todo: Todo) => void;
}

const STATUS_LABELS: Record<TodoStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

/**
 * Individual todo item with status toggle and delete.
 */
export function TodoItem({ todo, isBusy, onStatusChange, onDelete }: TodoItemProps) {
  const isComplete = todo.status === "completed";
  const overdue = !isComplete && isOverdue(todo.dueDate);

  return (
    <article
      className={`todo-item${isComplete ? " is-complete" : ""}${
        isBusy ? " is-busy" : ""
      }`}
      aria-busy={isBusy}
    >
      {/* Status toggle */}
      <div className="todo-item__check">
        <input
          type="checkbox"
          checked={isComplete}
          onChange={() =>
            onStatusChange(todo, isComplete ? "pending" : "completed")
          }
          disabled={isBusy}
          aria-label={`Mark ${todo.title} as ${
            isComplete ? "pending" : "completed"
          }`}
        />
      </div>

      {/* Main content */}
      <div className="todo-item__content">
        <div className="todo-item__title-row">
          <h3>{todo.title}</h3>
          {isBusy && <span className="todo-item__sync">Syncing</span>}
        </div>

        {todo.description && <p className="muted">{todo.description}</p>}

        {/* Meta chips */}
        <div className="todo-item__meta">
          <span className={`badge badge--priority badge--${todo.priority}`}>
            {todo.priority}
          </span>
          <span className={`chip chip--${todo.status}`}>
            {STATUS_LABELS[todo.status]}
          </span>
          {todo.dueDate && (
            <span className={`chip ${overdue ? "chip--overdue" : ""}`}>
              Due {formatDate(todo.dueDate)}
              {overdue && " (overdue)"}
            </span>
          )}
        </div>
      </div>

      {/* Delete action */}
      <button
        className="icon-button"
        type="button"
        onClick={() => onDelete(todo)}
        disabled={isBusy}
        aria-label={`Delete ${todo.title}`}
      >
        Delete
      </button>
    </article>
  );
}
