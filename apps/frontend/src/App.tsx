import { useState, useEffect } from "react";
import type { Todo } from "@martian-todos/shared";
import { TodoList } from "./components/TodoList";
import { AddTodoForm } from "./components/AddTodoForm";
import { LoginForm } from "./components/LoginForm";
import { useAuth } from "./hooks/useAuth";
import { fetchTodos } from "./api/todos";

/**
 * Main application component.
 * Handles authentication state and renders appropriate UI.
 */
function App() {
  const { token, user, login, logout } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load todos when authenticated
  useEffect(() => {
    if (token) {
      loadTodos();
    }
  }, [token]);

  async function loadTodos() {
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
  }

  // Not logged in - show login form
  if (!token) {
    return (
      <div>
        <h1>Martian Todos</h1>
        <p style={{ marginBottom: "1.5rem", opacity: 0.7 }}>
          Sign in to manage your tasks
        </p>
        <LoginForm onLogin={login} />
      </div>
    );
  }

  // Logged in - show todos
  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1>Martian Todos</h1>
          <p style={{ opacity: 0.7 }}>Welcome, {user?.name}</p>
        </div>
        <button onClick={logout}>Sign Out</button>
      </header>

      <AddTodoForm token={token} onAdd={loadTodos} />

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}

      <TodoList
        todos={todos}
        token={token}
        onUpdate={loadTodos}
      />
    </div>
  );
}

export default App;
