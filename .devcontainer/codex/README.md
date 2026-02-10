# Personal Codex Assets (Not Committed)

This folder is consumed by `.devcontainer/postCreate.sh` to seed your container user's Codex setup:

- `.devcontainer/codex/AGENTS.md` -> `~/.codex/AGENTS.md`
- `.devcontainer/codex/skills/*` -> `~/.codex/skills/*`
- `.devcontainer/codex/config.toml` -> `~/.codex/config.toml` (includes MCP server definitions)
- `.devcontainer/codex/auth.json` -> `~/.codex/auth.json` (so Codex is already authenticated)

These files are intentionally gitignored because they are user-specific.

To populate them on your machine, run:

```bash
scripts/devcontainer/sync_user_codex_assets.sh
```
