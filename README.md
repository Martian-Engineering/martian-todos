# Martian Todos

Demo todo app for AI engineering workshops. A production-ready pnpm TypeScript monorepo following Connected Play patterns.

## Architecture

```
martian-todos/
├── apps/
│   ├── backend/      # Fastify REST API
│   └── frontend/     # React + Vite SPA
├── packages/
│   └── shared/       # Shared types, schemas, utilities
└── platform/
    └── terraform/    # AWS infrastructure (VPC, RDS, ECS)
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Setup

```bash
# Install mise (optional but recommended)
curl https://mise.run | sh

# First-time setup
make setup

# Copy environment file
cp .env.example .env

# Start database
make db-up

# Run migrations
make migrate

# Start dev servers
make dev
```

### Development URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health check**: http://localhost:3001/health

## API Endpoints

### Auth

- `POST /auth/register` - Create account
- `POST /auth/login` - Get JWT token
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Revoke refresh token

### Todos (authenticated)

- `GET /todos` - List todos (supports pagination, filtering, search, sorting). Query params: `page`, `pageSize`, `status`, `priority`, `search`, `sortBy`, `sortOrder`
- `GET /todos/:id` - Get single todo
- `POST /todos` - Create todo
- `PATCH /todos/complete-all` - Mark all todos as completed
- `PATCH /todos/:id` - Update todo
- `DELETE /todos/completed` - Delete completed todos
- `DELETE /todos/:id` - Delete todo

## Tech Stack

- **Runtime**: Node.js 22, pnpm workspaces
- **Backend**: Fastify, Kysely (PostgreSQL), JWT auth, bcrypt
- **Frontend**: React 18, Vite, TypeScript
- **Infra**: Terraform, AWS ECS Fargate, RDS PostgreSQL
- **Dev**: Docker Compose, tsx, pino-pretty

## Scripts

```bash
make setup      # First-time setup
make dev        # Start all dev servers
make build      # Build all packages
make db-up      # Start PostgreSQL
make db-down    # Stop PostgreSQL
make migrate    # Run database migrations
```

## Workshop Features

This project includes intentionally imperfect code for workshop demonstrations:

- [ ] TODO comments for AI code review
- [ ] Missing error handling in some places
- [ ] Opportunities for refactoring
- [ ] Missing tests (for TDD exercise)

## License

MIT
