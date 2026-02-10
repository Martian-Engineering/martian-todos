# Personal Codex Assets (Not Committed)

This folder is consumed by `.devcontainer/postCreate.sh` to seed your container user's Codex setup:

- `.devcontainer/codex/AGENTS.md` -> `~/.codex/AGENTS.md`
- `.devcontainer/codex/skills/*` -> `~/.codex/skills/*`

These files are intentionally gitignored because they are user-specific.

To populate them on your machine, run:

```bash
scripts/devcontainer/sync_user_codex_assets.sh
```
