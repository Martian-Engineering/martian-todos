import { useState } from "react";
import type { Todo, TodoStatus } from "@martian-todos/shared";
import { formatDate, isOverdue } from "@martian-todos/shared";
import { updateTodo, deleteTodo } from "../api/todos";

interface TodoItemProps {
  todo: Todo;
  token: string;
  onUpdate: () => void;
}

const STATUS_LABELS: Record<TodoStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#4ade80",
  medium: "#fbbf24",
  high: "#f87171",
};

/**
 * Individual todo item with status toggle and delete.
 */
export function TodoItem({ todo, token, onUpdate }: TodoItemProps) {
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(status: TodoStatus) {
    setLoading(true);
    try {
      await updateTodo(token, todo.id, { status });
      onUpdate();
    } catch (err) {
      console.error("Failed to update todo:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this todo?")) return;

    setLoading(true);
    try {
      await deleteTodo(token, todo.id);
      onUpdate();
    } catch (err) {
      console.error("Failed to delete todo:", err);
    } finally {
      setLoading(false);
    }
  }

  const isComplete = todo.status === "completed";
  const overdue = !isComplete && isOverdue(todo.dueDate);

  return (
    <div
      className="card"
      style={{
        opacity: loading ? 0.5 : isComplete ? 0.7 : 1,
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isComplete}
        onChange={() =>
          handleStatusChange(isComplete ? "pending" : "completed")
        }
        disabled={loading}
        style={{ width: 20, height: 20, marginTop: 4, cursor: "pointer" }}
      />

      {/* Content */}
      <div style={{ flex: 1 }}>
        <h3
          style={{
            textDecoration: isComplete ? "line-through" : "none",
            marginBottom: "0.5rem",
          }}
        >
          {todo.title}
        </h3>

        {todo.description && (
          <p style={{ opacity: 0.7, marginBottom: "0.5rem" }}>
            {todo.description}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {/* Priority badge */}
          <span
            style={{
              fontSize: "0.75rem",
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: PRIORITY_COLORS[todo.priority],
              color: "#000",
            }}
          >
            {todo.priority}
          </span>

          {/* Status */}
          <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
            {STATUS_LABELS[todo.status]}
          </span>

          {/* Due date */}
          {todo.dueDate && (
            <span
              style={{
                fontSize: "0.75rem",
                color: overdue ? "#ff6b6b" : "inherit",
                opacity: overdue ? 1 : 0.7,
              }}
            >
              Due: {formatDate(todo.dueDate)}
              {overdue && " (overdue)"}
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={loading}
        style={{
          background: "transparent",
          color: "#ff6b6b",
          border: "none",
          cursor: "pointer",
          padding: "4px 8px",
        }}
      >
        Delete
      </button>
    </div>
  );
}
