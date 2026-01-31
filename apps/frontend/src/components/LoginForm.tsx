import { useState, FormEvent } from "react";
import type { AuthResponse } from "@martian-todos/shared";
import { login, register } from "../api/auth";

interface LoginFormProps {
  onLogin: (response: AuthResponse) => void;
}

/**
 * Login/Register form component.
 * Toggles between login and registration modes.
 */
export function LoginForm({ onLogin }: LoginFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = isRegister
        ? await register({ email, password, name })
        : await login({ email, password });

      onLogin(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: "1rem" }}>
        {isRegister ? "Create Account" : "Sign In"}
      </h2>

      <form onSubmit={handleSubmit}>
        {isRegister && (
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem" }}>
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={isRegister}
              style={{ width: "100%" }}
            />
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email" style={{ display: "block", marginBottom: "0.5rem" }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="password" style={{ display: "block", marginBottom: "0.5rem" }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: "100%" }}
          />
        </div>

        {error && (
          <p style={{ color: "#ff6b6b", marginBottom: "1rem" }}>{error}</p>
        )}

        <button type="submit" disabled={loading} style={{ width: "100%", marginBottom: "1rem" }}>
          {loading ? "Loading..." : isRegister ? "Create Account" : "Sign In"}
        </button>
      </form>

      <p style={{ textAlign: "center", opacity: 0.7 }}>
        {isRegister ? "Already have an account? " : "Don't have an account? "}
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          style={{
            background: "none",
            border: "none",
            color: "#646cff",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {isRegister ? "Sign In" : "Register"}
        </button>
      </p>
    </div>
  );
}
