#!/usr/bin/env bash
set -euo pipefail

CODEX_VERSION="${CODEX_VERSION:-0.98.0}"
CODEX_NPM_PREFIX="${CODEX_NPM_PREFIX:-$HOME/.local}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEX_ASSETS_DIR="${CODEX_ASSETS_DIR:-$REPO_ROOT/.devcontainer/codex}"

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
AGENTS_DST="$CODEX_HOME/AGENTS.md"
SKILLS_DST_DIR="$CODEX_HOME/skills"
CONFIG_DST="$CODEX_HOME/config.toml"
AUTH_DST="$CODEX_HOME/auth.json"

AGENTS_SRC="$CODEX_ASSETS_DIR/AGENTS.md"
SKILLS_SRC_DIR="$CODEX_ASSETS_DIR/skills"
CONFIG_SRC="$CODEX_ASSETS_DIR/config.toml"
AUTH_SRC="$CODEX_ASSETS_DIR/auth.json"

ts() { date +"%Y%m%d-%H%M%S"; }

backup_path() {
  local path="$1"
  if [[ -e "$path" || -L "$path" ]]; then
    mv "$path" "${path}.bak-$(ts)"
  fi
}

ensure_uvx_installed() {
  if command -v uvx >/dev/null 2>&1; then
    return 0
  fi

  if ! command -v curl >/dev/null 2>&1; then
    echo "Installing curl (required to install uv/uvx)..."
    sudo apt-get update
    sudo apt-get install -y --no-install-recommends curl ca-certificates
  fi

  echo "Installing uv (provides uvx)..."
  # Installs into ~/.local/bin by default, which is added to PATH via devcontainer.json remoteEnv.
  curl -LsSf https://astral.sh/uv/install.sh | sh
}

ensure_tmux_installed() {
  if command -v tmux >/dev/null 2>&1; then
    return 0
  fi

  echo "Installing tmux (required for maniple in-container)..."
  sudo apt-get update
  sudo apt-get install -y --no-install-recommends tmux
}

ensure_pb_installed() {
  if command -v pb >/dev/null 2>&1; then
    return 0
  fi

  if ! command -v go >/dev/null 2>&1; then
    echo "Installing Go (required to build pebbles/pb)..."
    sudo apt-get update
    sudo apt-get install -y --no-install-recommends golang-go ca-certificates
  fi

  local pebbles_version="${PEBBLES_VERSION:-latest}"
  local pkg="github.com/martian-engineering/pebbles/cmd/pb@${pebbles_version}"

  echo "Installing pebbles (pb) via: go install ${pkg}"
  GOBIN="$HOME/.local/bin" go install "$pkg"
}

ensure_codex_installed() {
  if ! command -v npm >/dev/null 2>&1; then
    echo "error: npm not found; devcontainer should install Node via features." >&2
    exit 1
  fi

  mkdir -p "$CODEX_NPM_PREFIX/bin"

  if command -v codex >/dev/null 2>&1; then
    if codex --version 2>/dev/null | grep -q "codex-cli ${CODEX_VERSION}"; then
      return 0
    fi
  fi

  echo "Installing @openai/codex@${CODEX_VERSION}..."
  # Avoid sudo: devcontainers often configure sudo with a restricted PATH (secure_path),
  # which makes `sudo npm ...` fail even when npm exists for the user.
  npm install -g --prefix "$CODEX_NPM_PREFIX" "@openai/codex@${CODEX_VERSION}"
}

install_codex_file_if_present() {
  local src="$1"
  local dst="$2"
  local label="$3"

  if [[ ! -f "$src" ]]; then
    echo "Codex bootstrap: no personal $label found at $src"
    return 0
  fi

  mkdir -p "$CODEX_HOME"

  if [[ -f "$dst" ]] && cmp -s "$src" "$dst"; then
    return 0
  fi

  backup_path "$dst"
  cp "$src" "$dst"
}

install_agents_md_if_present() {
  if [[ ! -f "$AGENTS_SRC" ]]; then
    echo "Codex bootstrap: no personal AGENTS source found at $AGENTS_SRC"
    echo "Codex bootstrap: run scripts/devcontainer/sync_user_codex_assets.sh on the host, then rebuild the container."
    return 0
  fi

  mkdir -p "$CODEX_HOME"

  if [[ -f "$AGENTS_DST" ]] && cmp -s "$AGENTS_SRC" "$AGENTS_DST"; then
    return 0
  fi

  backup_path "$AGENTS_DST"
  cp "$AGENTS_SRC" "$AGENTS_DST"
}

install_skills_if_present() {
  if [[ ! -d "$SKILLS_SRC_DIR" ]]; then
    echo "Codex bootstrap: no personal skills directory found at $SKILLS_SRC_DIR"
    echo "Codex bootstrap: run scripts/devcontainer/sync_user_codex_assets.sh on the host, then rebuild the container."
    return 0
  fi

  mkdir -p "$SKILLS_DST_DIR"

  local src skill_name dst tmpdir
  for src in "$SKILLS_SRC_DIR"/*; do
    [[ -d "$src" ]] || continue
    [[ -f "$src/SKILL.md" ]] || continue

    skill_name="$(basename "$src")"
    dst="$SKILLS_DST_DIR/$skill_name"

    if [[ -f "$dst/SKILL.md" ]] && cmp -s "$src/SKILL.md" "$dst/SKILL.md"; then
      continue
    fi

    if [[ -e "$dst" || -L "$dst" ]]; then
      backup_path "$dst"
    fi

    tmpdir="$(mktemp -d)"
    cp -R "$src" "$tmpdir/$skill_name"
    mv "$tmpdir/$skill_name" "$dst"
    rmdir "$tmpdir"
  done
}

main() {
  ensure_uvx_installed
  ensure_tmux_installed
  ensure_pb_installed
  ensure_codex_installed
  install_agents_md_if_present
  install_skills_if_present
  install_codex_file_if_present "$CONFIG_SRC" "$CONFIG_DST" "config.toml"
  install_codex_file_if_present "$AUTH_SRC" "$AUTH_DST" "auth.json"
  chmod 600 "$AUTH_DST" 2>/dev/null || true

  echo "Codex bootstrap complete."
  echo "  Codex: $(command -v codex || true)"
  echo "  Codex home: $CODEX_HOME"
}

main "$@"
