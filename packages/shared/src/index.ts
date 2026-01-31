/**
 * @martian-todos/shared
 *
 * Shared types, schemas, and utilities for the Martian Todos application.
 */

// Re-export all types
export * from "./types.js";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a simple UUID v4.
 * Note: For production, use a proper UUID library.
 */
export function generateId(): string {
  // TODO: Replace with crypto.randomUUID() in Node.js 19+
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Formats a date for display.
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return "No date";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Checks if a todo is overdue.
 * @param dueDate - The todo's due date
 * @returns true if overdue
 */
export function isOverdue(dueDate: Date | string | null): boolean {
  if (!dueDate) return false;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return due < new Date();
}

/**
 * Delays execution for a given number of milliseconds.
 * Useful for testing loading states.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
