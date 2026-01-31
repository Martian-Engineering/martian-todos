import { useState, useEffect, useCallback } from "react";
import type { User, AuthResponse } from "@martian-todos/shared";

const TOKEN_KEY = "martian_todos_token";
const USER_KEY = "martian_todos_user";

/**
 * Authentication hook.
 * Manages JWT token and user state in localStorage.
 */
export function useAuth() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  // Sync token changes to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  // Sync user changes to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  /**
   * Logs in with the API response.
   */
  const login = useCallback((authResponse: AuthResponse) => {
    setToken(authResponse.token);
    setUser(authResponse.user);
  }, []);

  /**
   * Clears auth state.
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, login, logout };
}
