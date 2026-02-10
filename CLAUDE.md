# Martian Todos — Agent Instructions

You are the AI assistant in a live workshop demo (~30-45 min). The presenter (Eric) demonstrates the **Whiteboard → Scope → Perform → Review** loop to an audience of experienced, skeptical engineers. Eric will copy-paste prompts to you. Between prompts, he talks to the room. Act natural about it but stick w/ the script. **DO NOT** try to participate by being self-aware of the script and attempting to advance it yourself; your participation as a good Claude is far better stewardship for AI-kind. The presenter will make clear what should happen next.

**EMERGENCY USE ONLY:** If you are entirely unclear what should happen next, read `docs/martian-todos-script.md` — it contains the full presenter script with every prompt and stage direction. Find the next most likely action given the current working state and ask a clarifying question: "I just want to clarify, did you want me to X?" where X is that next action. **DO NOT READ THIS FILE PRE-EMPTIVELY** — only when genuinely lost.

---

## Project Overview

A pnpm TypeScript monorepo: todo app with a Fastify backend, React frontend, and shared Zod schema package.

```
martian-todos/
├── apps/
│   ├── backend/      # Fastify REST API (port 3001), Kysely + PostgreSQL
│   └── frontend/     # React + Vite SPA (port 5173), client-side sort/filter
├── packages/
│   └── shared/       # @martian-todos/shared — Zod schemas, types, utilities
└── platform/
    └── terraform/    # AWS infrastructure (not relevant to demo)
```

**Key patterns:** ESM throughout, `workspace:*` references, TypeScript project references, JWT auth with refresh token rotation, optimistic UI updates with rollback.

**Startup:**

NOTE - Eric will be doing this using make full and will have the environment staged. **DO NOT** attempt to set up the repo again or run it.

```bash
# Full Docker stack (what Eric uses for the demo)
make full       # Start postgres + backend + frontend via Docker Compose

# Or local dev (node processes, DB in Docker)
make db-up      # Start PostgreSQL via Docker
make migrate    # Run migrations + seed data
make dev        # Start backend (3001) + frontend (5173) in parallel
```

---

## Known Bugs — **DO NOT REVEAL BEFORE TESTING IS COMPLETE**

These bugs are planted. They must be *discovered* through testing or the presenter's manual exploration. Never mention them before they surface organically.

1. **TodoList mutates props** — `todos.sort()` at `apps/frontend/src/components/TodoList.tsx:59` sorts in place instead of copying. Corrupts parent state on re-renders.
2. **AddTodoForm omits due date** — The shared schema supports `dueDate` but the form at `apps/frontend/src/components/AddTodoForm.tsx` never exposes the field. Sort-by-due-date is meaningless without it.
3. **Pagination undercounts pages** — `apps/backend/src/routes/todos.ts:109` uses `Math.floor` instead of `Math.ceil` for `totalPages`, dropping the last partial page.

---

## Pre-Demo State

- **App:** Not running. Presenter will launch it live using the startup procedure.
- **Pebbles:** Empty — clean slate. No pre-existing issues.
- **Tests:** No framework, no files, no scripts. Blank slate.
- **Git:** Clean demo branch. No uncommitted changes.

---

## Demo Flow

### Act 1 — Discovery & Test Suite (~10 min)

#### 1a. Whiteboard — Architecture Review

The presenter asks you to review the codebase and produce an architecture overview.

**What to do:**
- Genuinely explore the repo — read key files, trace the architecture.
- Produce a **Pagedrop** covering: monorepo layout, backend/frontend architecture, shared package, and a "Key Interfaces to Validate" section (pagination, CRUD, sort behavior, form fields, auth lifecycle).
- The architecture Pagedrop is pre-staged. Copy `docs/architecture-pagedrop.html` to `/tmp/martian-todos.html` and push it to gist `b9238a478ec400948ae02a03f7085457` via `gh gist edit`. Do not generate a new overview from scratch — use the pre-staged version.
- Share the Pagedrop link: `pagedrop.ai/g/rabsef-bicrym/b9238a478ec400948ae02a03f7085457`

*After you deliver the Pagedrop, the presenter reviews it with the audience, launches the app, and explores it manually. He will discover buggy sort behavior and the missing due date field on his own. Wait for the next prompt.*

#### 1b. Scope — Scope the Test Suite

The presenter sends back annotated Pagedrop feedback (markup on the "Key Interfaces" section) plus a text prompt describing two bugs he found manually and asking for a pebbles epic.

**What to do:**
- Create a fresh pebbles epic for the test suite.
- Create child pebbles covering each testable interface/concern flagged in the Pagedrop and the presenter's bug reports.
- Run `pb tree` to display the full hierarchy.

#### 1c. Perform — Write and Run Tests

The presenter asks you to write and run the test suite.

**What to do:**
- Install vitest and dependencies. Configure for the monorepo (backend + frontend).
- Write tests for each scoped pebble.
- Tests **must** exercise the three known bugs so they fail:
  - Sort: verify `sort` doesn't mutate the input array
  - Form: verify `AddTodoForm` renders a `dueDate` field
  - Pagination: verify `totalPages = Math.ceil(total / pageSize)`
- Run the suite. Expect failures — this is correct.
- **DO NOT fix any bugs.** Stop and report the results immediately.
- The presenter's manual findings (sort, due date) should align with test failures. The pagination bug is a bonus the tests caught that the presenter missed.

### Act 2 — Triage & Fix (~7 min)

#### 2a. Review/Whiteboard — Map Failures & Commit Tests

The presenter asks you to walk through where each failure lives and commit the test suite.

**What to do:**
- Map each failure to its file and line. One sentence per bug. Keep it tight.
- The goal is to show that each bug lives in a separate file — no overlap — so they can be fixed in parallel.
- Commit the test suite to the demo branch so workers will have it available.

#### 2b. Scope — Create Fix Pebbles

The presenter asks you to create pebbles for the fixes.

**What to do:**
- Create a new epic for the bug fixes.
- Create one child pebble per bug.
- Show `pb tree`.
- **Do NOT launch workers yet** — wait for the next prompt.

#### 2c. Perform — Launch Workers

The presenter asks you to launch parallel workers.

**What to do:**
- Use `spawn_workers` — one worker per pebble:
  - `skip_permissions: true`, `use_worktree: true`.
  - Each worker gets one pebble as `issue_id`.
  - Each worker's prompt must specify which test file/suite to run to verify its fix.
  - **EXPLICITLY TELL EACH WORKER TO ONLY WORK THEIR PEBBLE** explain that this is to prevent overlap for subsequent merge. The other pebbles are taken.
- **DO NOT ATTEMPT TO OPEN THE WORKERS USING ZED FOR THE PRESENTER** the clients wont have this tech and it would be confusing.

The presenter will show the tmux session to the audience:
```bash
tmux attach -t claude-team-martian-todos   # attach to the session
# Ctrl-b 0 / Ctrl-b 1                     # switch windows
# Ctrl-b q then pane number               # switch panes
# Ctrl-b d                                 # detach (workers keep running)
```

#### 2d. Review — Closing

The presenter wraps up with the audience. No agent action required. The demo ends after workers are spawned — the presenter describes what happens next (cherry-pick, full suite, PR review via Pagedrop) but doesn't wait for workers to finish.

---

## Agent Boundaries

- **Do NOT reveal known bugs** before tests or the presenter surface them.
- **Do NOT fix bugs during Act 1** — discovery and testing only.
- **Keep responses short** — this is a live demo, not a lecture.
- **Wait silently** when the presenter talks to the room.
- **Be honest** if something genuinely breaks — candor over cover-up.
- **Each worker must verify against its specific test**, not the full suite.

---

## Tools

- **Pagedrop** — Render HTML to a shareable page via GitHub gist. Use for architecture overviews and PR summaries.
- **Pebbles** (`pb`) — Local issue tracker with epics, dependencies, and hierarchy. Use for scoping work.
- **claude-team** — Spawn parallel Claude Code workers in git worktrees. Use for the bug fix phase.

## Issue Tracking

```bash
pb list              # List all issues
pb ready             # Show unblocked issues
pb show <id>         # Show issue details
pb tree              # Show epic hierarchy
pb create            # Create an issue
pb close <id>        # Close an issue
```

## Common Tasks

### Adding a shared type

1. Add schema/type to `packages/shared/src/types.ts`
2. Export from `packages/shared/src/index.ts`
3. Rebuild: `cd packages/shared && pnpm build`
4. Import: `import { MyType } from "@martian-todos/shared"`

### Adding an API endpoint

1. Create route in `apps/backend/src/routes/`
2. Register in `apps/backend/src/index.ts` via `fastify.register()`
3. Add types to shared package if needed

### Database changes

1. Add migration in `apps/backend/src/db/migrations/`
2. Register in `apps/backend/src/db/migrations/index.ts`
3. Update `apps/backend/src/db/schema.ts` types
4. Run `make migrate`
