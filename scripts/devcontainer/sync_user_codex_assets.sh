#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/devcontainer/sync_user_codex_assets.sh [--force] [--agents-from <path>] [--skills-from <dir>] [--config-from <path>] [--auth-from <path>] [--maniple-config-from <path>]

Defaults (host-side):
  --agents-from  ~/.codex/AGENTS.md
  --skills-from  ~/.codex/skills
  --config-from  ~/.codex/config.toml
  --auth-from    ~/.codex/auth.json
  --maniple-config-from  ~/.maniple/config.json

Writes (into this repo, gitignored):
  .devcontainer/codex/AGENTS.md
  .devcontainer/codex/skills/<skill>/...
  .devcontainer/codex/config.toml
  .devcontainer/codex/auth.json
  .devcontainer/codex/maniple/config.json
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

resolve_path_from_symlink() {
  local p="$1"
  local link target

  [[ -L "$p" ]] || { echo "$p"; return 0; }

  link="$(readlink "$p" || true)"
  [[ -n "$link" ]] || { echo "$p"; return 0; }

  if [[ "$link" = /* ]]; then
    target="$link"
  else
    target="$(cd "$(dirname "$p")" && cd "$link" && pwd -P)" || return 1
  fi

  if [[ -d "$target" ]]; then
    echo "$target"
    return 0
  fi

  if [[ -f "$target" ]]; then
    echo "$target"
    return 0
  fi

  return 1
}

main() {
  local force="0"
  local agents_from="~/.codex/AGENTS.md"
  local skills_from="~/.codex/skills"
  local config_from="~/.codex/config.toml"
  local auth_from="~/.codex/auth.json"
  local maniple_config_from="~/.maniple/config.json"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help) usage; exit 0 ;;
      --force) force="1"; shift ;;
      --agents-from) agents_from="${2:-}"; shift 2 ;;
      --skills-from) skills_from="${2:-}"; shift 2 ;;
      --config-from) config_from="${2:-}"; shift 2 ;;
      --auth-from) auth_from="${2:-}"; shift 2 ;;
      --maniple-config-from) maniple_config_from="${2:-}"; shift 2 ;;
      *) die "unknown argument: $1" ;;
    esac
  done

  agents_from="$(expand_tilde "$agents_from")"
  skills_from="$(expand_tilde "$skills_from")"
  config_from="$(expand_tilde "$config_from")"
  auth_from="$(expand_tilde "$auth_from")"
  maniple_config_from="$(expand_tilde "$maniple_config_from")"

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

  if [[ -f "$config_from" ]]; then
    local config_dst="$assets_dir/config.toml"
    if [[ -e "$config_dst" || -L "$config_dst" ]]; then
      if [[ "$force" != "1" ]]; then
        die "destination exists (use --force): $config_dst"
      fi
      backup_path "$config_dst"
    fi
    cp "$config_from" "$config_dst"
    echo "Wrote: $config_dst"
  else
    echo "Note: config not found at $config_from; skipping."
  fi

  if [[ -f "$auth_from" ]]; then
    local auth_dst="$assets_dir/auth.json"
    if [[ -e "$auth_dst" || -L "$auth_dst" ]]; then
      if [[ "$force" != "1" ]]; then
        die "destination exists (use --force): $auth_dst"
      fi
      backup_path "$auth_dst"
    fi
    cp "$auth_from" "$auth_dst"
    chmod 600 "$auth_dst" || true
    echo "Wrote: $auth_dst"
  else
    echo "Note: auth not found at $auth_from; skipping."
  fi

  if [[ -f "$maniple_config_from" ]]; then
    local maniple_cfg_dst_dir="$assets_dir/maniple"
    local maniple_cfg_dst="$maniple_cfg_dst_dir/config.json"
    mkdir -p "$maniple_cfg_dst_dir"
    if [[ -e "$maniple_cfg_dst" || -L "$maniple_cfg_dst" ]]; then
      if [[ "$force" != "1" ]]; then
        die "destination exists (use --force): $maniple_cfg_dst"
      fi
      backup_path "$maniple_cfg_dst"
    fi
    cp "$maniple_config_from" "$maniple_cfg_dst"
    echo "Wrote: $maniple_cfg_dst"
  else
    echo "Note: maniple config not found at $maniple_config_from; skipping."
  fi

  if [[ ! -d "$skills_from" ]]; then
    die "skills source dir not found: $skills_from"
  fi

  local src skill_name dst tmpdir resolved
  for src in "$skills_from"/*; do
    [[ -e "$src" || -L "$src" ]] || continue

    if [[ -L "$src" ]]; then
      resolved="$(resolve_path_from_symlink "$src")" || {
        echo "Note: broken skill symlink (skipping): $src"
        continue
      }
    else
      resolved="$src"
    fi

    [[ -d "$resolved" ]] || continue
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
    # -L follows symlinks inside the source tree.
    cp -R -L "$resolved" "$tmpdir/$skill_name"
    mv "$tmpdir/$skill_name" "$dst"
    rmdir "$tmpdir"

    echo "Wrote: $dst"
  done

  echo "Done. Now rebuild the devcontainer so postCreate can copy these into ~/.codex inside the container."
}

main "$@"
