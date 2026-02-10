#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/devcontainer/sync_user_codex_assets.sh [--force] [--agents-from <path>] [--skills-from <dir>]

Defaults (host-side):
  --agents-from  ~/.codex/AGENTS.md
  --skills-from  ~/.codex/skills

Writes (into this repo, gitignored):
  .devcontainer/codex/AGENTS.md
  .devcontainer/codex/skills/<skill>/...
USAGE
}

die() {
  echo "error: $*" >&2
  exit 1
}

ts() { date +"%Y%m%d-%H%M%S"; }

backup_path() {
  local path="$1"
  if [[ -e "$path" || -L "$path" ]]; then
    mv "$path" "${path}.bak-$(ts)"
  fi
}

expand_tilde() {
  local p="$1"
  if [[ "$p" == "~/"* ]]; then
    echo "$HOME/${p:2}"
  else
    echo "$p"
  fi
}

main() {
  local force="0"
  local agents_from="~/.codex/AGENTS.md"
  local skills_from="~/.codex/skills"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help) usage; exit 0 ;;
      --force) force="1"; shift ;;
      --agents-from) agents_from="${2:-}"; shift 2 ;;
      --skills-from) skills_from="${2:-}"; shift 2 ;;
      *) die "unknown argument: $1" ;;
    esac
  done

  agents_from="$(expand_tilde "$agents_from")"
  skills_from="$(expand_tilde "$skills_from")"

  local repo_root assets_dir agents_dst skills_dst
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  assets_dir="$repo_root/.devcontainer/codex"
  agents_dst="$assets_dir/AGENTS.md"
  skills_dst="$assets_dir/skills"

  mkdir -p "$skills_dst"

  if [[ ! -f "$agents_from" ]]; then
    die "agents source not found: $agents_from"
  fi

  if [[ -e "$agents_dst" || -L "$agents_dst" ]]; then
    if [[ "$force" != "1" ]]; then
      die "destination exists (use --force): $agents_dst"
    fi
    backup_path "$agents_dst"
  fi

  cp "$agents_from" "$agents_dst"
  echo "Wrote: $agents_dst"

  if [[ ! -d "$skills_from" ]]; then
    die "skills source dir not found: $skills_from"
  fi

  local src skill_name dst tmpdir
  for src in "$skills_from"/*; do
    [[ -d "$src" || -L "$src" ]] || continue

    # Resolve the actual skill directory if this is a symlink.
    local resolved="$src"
    if [[ -L "$src" ]]; then
      resolved="$(cd "$(dirname "$src")" && cd "$(readlink "$src")" && pwd)"
    fi

    [[ -f "$resolved/SKILL.md" ]] || continue

    skill_name="$(basename "$src")"
    dst="$skills_dst/$skill_name"

    if [[ -e "$dst" || -L "$dst" ]]; then
      if [[ "$force" != "1" ]]; then
        die "destination exists (use --force): $dst"
      fi
      backup_path "$dst"
    fi

    tmpdir="$(mktemp -d)"

    # Copy full directory contents to avoid missing referenced assets.
    # -L follows symlinks in the source tree.
    cp -R -L "$resolved" "$tmpdir/$skill_name"
    mv "$tmpdir/$skill_name" "$dst"
    rmdir "$tmpdir"

    echo "Wrote: $dst"
  done

  echo "Done. Now rebuild the devcontainer so postCreate can copy these into ~/.codex inside the container."
}

main "$@"
