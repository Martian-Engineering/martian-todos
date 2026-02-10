import { useState, useEffect, useCallback, useRef } from "react";
import type { User, AuthResponse } from "@martian-todos/shared";

const TOKEN_KEY = "martian_todos_token";
const REFRESH_TOKEN_KEY = "martian_todos_refresh_token";
const USER_KEY = "martian_todos_user";
const API_BASE = "/api";

/**
 * Authentication hook.
 * Manages JWT token, refresh token, and user state in localStorage.
 * Automatically refreshes expired access tokens using the stored refresh token.
 */
export function useAuth() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  // Track whether a refresh request is already in-flight to avoid duplicates.
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  // Sync token changes to localStorage.
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  // Sync user changes to localStorage.
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  /**
   * Logs in with the API response, storing both access and refresh tokens.
   */
  const login = useCallback((authResponse: AuthResponse) => {
    setToken(authResponse.token);
    setUser(authResponse.user);
    if (authResponse.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refreshToken);
    }
  }, []);

  /**
   * Clears all auth state including the refresh token.
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, []);

  /**
   * Attempts to refresh the access token using the stored refresh token.
   * De-duplicates concurrent refresh attempts so only one request is in-flight.
   * Returns the new access token on success, or null on failure (which triggers logout).
   */
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    // If a refresh is already in progress, wait for that one instead.
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      logout();
      return null;
    }

    const promise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          logout();
          return null;
        }

        const json = await response.json();
        const data = json.data as AuthResponse;

        // Update stored tokens with the fresh values.
        setToken(data.token);
        setUser(data.user);
        if (data.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }

        return data.token;
      } catch {
        logout();
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, [logout]);

  return { token, user, login, logout, refreshAccessToken };
}
