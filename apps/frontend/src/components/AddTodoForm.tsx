import { useState, type FormEvent, type RefObject } from "react";
import type { CreateTodoInput } from "@martian-todos/shared";

interface AddTodoFormProps {
  onCreate: (input: CreateTodoInput) => Promise<void>;
  titleInputRef?: RefObject<HTMLInputElement>;
}

/**
 * Form for adding new todos.
 */
export function AddTodoForm({ onCreate, titleInputRef }: AddTodoFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    // Keep the form state responsive while waiting for the API.
    setLoading(true);
    setError(null);

    try {
      // Forward the form data to the parent for optimistic creation.
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      // Clear the form so the user can add the next todo quickly.
      setTitle("");
      setDescription("");
      setPriority("medium");
    } catch (err) {
      // Surface the error locally so the form can explain what failed.
      setError(err instanceof Error ? err.message : "Failed to create todo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card card--elevated">
      <div className="card__header">
        <div>
          <p className="eyebrow">New mission</p>
          <h2>Add Todo</h2>
          <p className="muted">Press N anywhere to jump here.</p>
        </div>
        <span className="pill">Quick add</span>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__group">
          <label htmlFor="todo-title">Title</label>
          <input
            id="todo-title"
            ref={titleInputRef}
            className="input"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to be done?"
            required
            maxLength={200}
            disabled={loading}
          />
        </div>

        <div className="form__group">
          <label htmlFor="todo-description">Description</label>
          <textarea
            id="todo-description"
            className="textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional context, deadlines, or next steps"
            rows={3}
            disabled={loading}
          />
        </div>

        <div className="form__row">
          <label className="form__control">
            <span>Priority</span>
            <select
              className="select"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as "low" | "medium" | "high")
              }
              disabled={loading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <button
            className="button-primary"
            type="submit"
            disabled={loading || !title.trim()}
          >
            {loading ? "Adding..." : "Add Todo"}
          </button>
        </div>

        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
