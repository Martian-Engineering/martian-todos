import type { Todo } from "@martian-todos/shared";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  token: string;
  onUpdate: () => void;
}

/**
 * Renders a list of todos.
 */
export function TodoList({ todos, token, onUpdate }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", opacity: 0.7 }}>
        <p>No todos yet. Add one above!</p>
      </div>
    );
  }

  return (
    <div>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          token={token}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
