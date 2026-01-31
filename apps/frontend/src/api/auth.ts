import type { AuthResponse, LoginInput, CreateUserInput } from "@martian-todos/shared";

const API_BASE = "/api";

/**
 * Logs in a user.
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message || "Login failed");
  }

  return json.data;
}

/**
 * Registers a new user.
 */
export async function register(input: CreateUserInput): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message || "Registration failed");
  }

  return json.data;
}
