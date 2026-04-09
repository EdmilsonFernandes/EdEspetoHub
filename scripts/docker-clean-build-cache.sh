#!/usr/bin/env sh
set -eu

# Safe Docker cleanup for deploy hosts:
# - removes stopped containers and anonymous volumes from rebuilds
# - prunes dangling and old unused images
# - prunes BuildKit cache aggressively by default to avoid disk growth
# - keeps running containers/attached volumes untouched
#
# Tunables:
#   DOCKER_BUILDER_CACHE_TTL=24h    # default: keep only the last 24h of unused images
#   DOCKER_PRUNE_AGGRESSIVE=true    # true => also prune unused (non-dangling) images older than TTL
#   DOCKER_PRUNE_VOLUMES=true       # true => prune anonymous/unattached volumes

TTL="${DOCKER_BUILDER_CACHE_TTL:-24h}"
AGGRESSIVE="${DOCKER_PRUNE_AGGRESSIVE:-true}"
PRUNE_VOLUMES="${DOCKER_PRUNE_VOLUMES:-true}"

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

if [ "$PRUNE_VOLUMES" = "true" ]; then
  echo "[cleanup] Pruning unused volumes..."
  docker volume prune -f >/dev/null 2>&1 || true
fi

echo "[cleanup] Pruning builder cache..."
docker builder prune -af >/dev/null 2>&1 || true

echo "[cleanup] Done."
