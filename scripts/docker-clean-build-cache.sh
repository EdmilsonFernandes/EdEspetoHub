#!/usr/bin/env sh
set -eu

# Safe Docker cleanup for deploy hosts:
# - removes dangling images/layers from rebuilds
# - prunes old BuildKit cache to keep disk under control
# - keeps running containers/images untouched
#
# Tunables:
#   DOCKER_BUILDER_CACHE_TTL=168h   # default: keep last 7 days of builder cache
#   DOCKER_PRUNE_AGGRESSIVE=false   # true => also prune unused (non-dangling) images older than TTL

TTL="${DOCKER_BUILDER_CACHE_TTL:-168h}"
AGGRESSIVE="${DOCKER_PRUNE_AGGRESSIVE:-false}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[cleanup] docker not found in PATH. Skipping cleanup." >&2
  exit 0
fi

echo "[cleanup] Pruning stopped containers..."
docker container prune -f >/dev/null 2>&1 || true

echo "[cleanup] Pruning dangling images..."
docker image prune -f >/dev/null 2>&1 || true

if [ "$AGGRESSIVE" = "true" ]; then
  echo "[cleanup] Aggressive image prune enabled (until=$TTL)..."
  docker image prune -a -f --filter "until=$TTL" >/dev/null 2>&1 || true
fi

echo "[cleanup] Pruning builder cache (until=$TTL)..."
docker builder prune -f --filter "until=$TTL" >/dev/null 2>&1 || true

echo "[cleanup] Done."

