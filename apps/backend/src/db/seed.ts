#!/usr/bin/env tsx
/**
 * Database seed script.
 * Run with: pnpm seed
 */

import bcrypt from "bcrypt";
import { db, closeDatabase } from "./database.js";

const PASSWORD_SALT_ROUNDS = 12;

type SeedUser = {
  email: string;
  name: string;
  password: string;
};

type SeedTodo = {
  userEmail: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  dueInDays?: number;
};

const seedUsers: SeedUser[] = [
  {
    email: "ada@martian.dev",
    name: "Ada Lovelace",
    password: "password123",
  },
  {
    email: "grace@martian.dev",
    name: "Grace Hopper",
    password: "password123",
  },
];

const seedTodos: SeedTodo[] = [
  {
    userEmail: "ada@martian.dev",
    title: "Ship the workshop demo",
    description: "Finalize the live coding plan and slides",
    priority: "high",
    status: "in_progress",
    dueInDays: 2,
  },
  {
    userEmail: "ada@martian.dev",
    title: "Prep database walkthrough",
    description: "Explain migrations and seed data",
    priority: "medium",
    status: "pending",
    dueInDays: 5,
  },
  {
    userEmail: "grace@martian.dev",
    title: "Review auth endpoints",
    description: "Double-check login flows",
    priority: "medium",
    status: "pending",
  },
  {
    userEmail: "grace@martian.dev",
    title: "Fix bug backlog",
    description: "Triage issues from the last sprint",
    priority: "low",
    status: "completed",
  },
];

/**
 * Adds a number of days to a date.
 */
function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Inserts seed users if they are missing and returns their ids.
 */
async function seedUserAccounts(): Promise<Map<string, string>> {
  // Hash passwords upfront so we can insert in one batch.
  const hashes = await Promise.all(
    seedUsers.map((user) => bcrypt.hash(user.password, PASSWORD_SALT_ROUNDS))
  );

  const userRows = seedUsers.map((user, index) => ({
    email: user.email,
    name: user.name,
    password_hash: hashes[index],
  }));

  // Avoid duplicate rows when re-running seeds.
  await db
    .insertInto("users")
    .values(userRows)
    .onConflict((oc) => oc.column("email").doNothing())
    .execute();

  // Read back ids to build a lookup map for todos.
  const storedUsers = await db
    .selectFrom("users")
    .select(["id", "email"])
    .where(
      "email",
      "in",
      seedUsers.map((user) => user.email)
    )
    .execute();

  const userMap = new Map(storedUsers.map((user) => [user.email, user.id]));

  if (userMap.size !== seedUsers.length) {
    throw new Error("Seed users could not be resolved after insert.");
  }

  return userMap;
}

/**
 * Inserts sample todos for the seeded users.
 */
async function seedTodoItems(userMap: Map<string, string>): Promise<void> {
  const userIds = Array.from(userMap.values());

  // Clear existing data for the demo users before re-seeding.
  await db.deleteFrom("refresh_tokens").where("user_id", "in", userIds).execute();
  await db.deleteFrom("todos").where("user_id", "in", userIds).execute();

  const now = new Date();
  const todoRows = seedTodos.map((todo) => ({
    user_id: userMap.get(todo.userEmail) ?? "",
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    status: todo.status,
    due_date: todo.dueInDays === undefined ? null : addDays(now, todo.dueInDays),
  }));

  // Ensure every seed todo is tied to a known user.
  if (todoRows.some((todo) => todo.user_id === "")) {
    throw new Error("Seed todos reference missing users.");
  }

  await db.insertInto("todos").values(todoRows).execute();
}

/**
 * Entry point for the seed script.
 */
async function main(): Promise<void> {
  try {
    console.log("Seeding demo data...");

    const userMap = await seedUserAccounts();
    await seedTodoItems(userMap);

    console.log("Seed complete!");
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
