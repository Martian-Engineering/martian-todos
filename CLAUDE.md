# Martian Todos - Claude Instructions

A pnpm TypeScript monorepo for a todo application, used for AI engineering workshop demos.

## Project Structure

```
martian-todos/
├── apps/
│   ├── backend/      # Fastify REST API (port 3001)
│   └── frontend/     # React + Vite SPA (port 5173)
├── packages/
│   └── shared/       # @martian-todos/shared - types, schemas, utilities
└── platform/
    └── terraform/    # AWS infrastructure
```

## Key Patterns

- **ESM throughout** - All packages use `"type": "module"`
- **Workspace references** - `workspace:*` for local dependencies
- **TypeScript project references** - Root tsconfig.json references packages
- **Zod schemas** - Validation with type inference in shared package

## Development Commands

```bash
make dev        # Start backend + frontend in parallel
make db-up      # Start PostgreSQL via Docker
make migrate    # Run database migrations
pnpm build      # Build all packages
```

## Common Tasks

### Adding a new shared type

1. Add schema/type to `packages/shared/src/types.ts`
2. Export from `packages/shared/src/index.ts`
3. Rebuild shared: `cd packages/shared && pnpm build`
4. Import in apps: `import { MyType } from "@martian-todos/shared"`

### Adding a new API endpoint

1. Create route file in `apps/backend/src/routes/`
2. Register in `apps/backend/src/index.ts` with `fastify.register()`
3. Add types to shared package if needed

### Database changes

1. Modify `apps/backend/src/db/migrate.ts`
2. Update `apps/backend/src/db/schema.ts` types
3. Run `make migrate`

## Issue Tracking

We use pebbles for issue tracking:

```bash
pb list              # List all issues
pb ready             # Show unblocked issues
pb show <id>         # Show issue details
pb update <id> --status in_progress
pb close <id>
```

## Testing Notes

- Backend has no tests yet (workshop TDD exercise)
- Frontend has no tests yet (workshop TDD exercise)
- See pebbles issues for test implementation tasks
