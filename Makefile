# Martian Todos Makefile
#
# Usage:
#   make setup      # First-time setup
#   make dev        # Start dev environment
#   make build      # Build everything

.PHONY: setup build dev clean db-up db-down migrate

# First-time development setup
setup:
	@echo "=== Martian Todos Setup ==="
	@if ! command -v mise &> /dev/null; then \
		echo "Installing mise..."; \
		curl https://mise.run | sh; \
		echo ""; \
		echo "Add mise to your shell (add to ~/.zshrc or ~/.bashrc):"; \
		echo '    eval "$$(mise activate zsh)"'; \
		echo "Then restart your shell and run 'make setup' again."; \
		exit 1; \
	fi
	@echo "Trusting mise config..."
	@mise trust
	@echo "Installing tool versions..."
	@mise install
	@echo "Installing dependencies..."
	@pnpm install
	@echo ""
	@echo "Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Copy .env.example to .env"
	@echo "  2. Start database: make db-up"
	@echo "  3. Run migrations: make migrate"
	@echo "  4. Start dev: make dev"

# Build all packages
build:
	@echo "=== Building packages ==="
	@pnpm build

# Start development (backend + frontend)
dev:
	@pnpm dev

# Clean build artifacts
clean:
	@pnpm clean

# Start database only
db-up:
	@docker compose up -d postgres
	@echo "Waiting for postgres..."
	@sleep 2
	@echo "Postgres ready at localhost:5432"

# Stop database
db-down:
	@docker compose down

# Run database migrations
migrate:
	@cd apps/backend && pnpm migrate

# Start full stack with Docker
full:
	@docker compose --profile full up -d
