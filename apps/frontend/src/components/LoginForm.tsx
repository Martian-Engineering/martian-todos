import { useState, type FormEvent } from "react";
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
    // Clear the previous error before attempting authentication.
    setError(null);
    setLoading(true);

    try {
      // Choose the correct auth flow based on the current mode.
      const response = isRegister
        ? await register({ email, password, name })
        : await login({ email, password });

      // Hand off the token and user to the auth hook.
      onLogin(response);
    } catch (err) {
      // Surface API failures to the user.
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h2>{isRegister ? "Create Account" : "Sign In"}</h2>
        <p className="muted">
          {isRegister
            ? "Start organizing mission-critical tasks."
            : "Welcome back to Mission Control."}
        </p>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        {isRegister && (
          <div className="form__group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={isRegister}
              disabled={loading}
            />
          </div>
        )}

        <div className="form__group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form__group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
          />
        </div>

        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}

        <button
          className="button-primary"
          type="submit"
          disabled={loading}
        >
          {loading ? "Loading..." : isRegister ? "Create Account" : "Sign In"}
        </button>
      </form>

      <p className="auth-card__toggle">
        {isRegister ? "Already have an account? " : "Don't have an account? "}
        <button
          className="button-link"
          type="button"
          onClick={() => setIsRegister(!isRegister)}
        >
          {isRegister ? "Sign In" : "Register"}
        </button>
      </p>
    </div>
  );
}
