import { useState, FormEvent } from "react";
import { createTodo } from "../api/todos";

interface AddTodoFormProps {
  token: string;
  onAdd: () => void;
}

/**
 * Form for adding new todos.
 */
export function AddTodoForm({ token, onAdd }: AddTodoFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await createTodo(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      setTitle("");
      setDescription("");
      setPriority("medium");
      onAdd();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ marginBottom: "1rem" }}>Add Todo</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            required
            maxLength={200}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            style={{ width: "100%", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <label>
            Priority:
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              style={{
                marginLeft: "0.5rem",
                padding: "0.4rem",
                borderRadius: 4,
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <button type="submit" disabled={loading || !title.trim()}>
            {loading ? "Adding..." : "Add Todo"}
          </button>
        </div>

        {error && (
          <p style={{ color: "#ff6b6b", marginTop: "0.5rem" }}>{error}</p>
        )}
      </form>
    </div>
  );
}
