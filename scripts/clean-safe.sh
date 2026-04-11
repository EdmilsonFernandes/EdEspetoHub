#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
WITH_LOGS="${1:-}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found in PATH." >&2
  exit 1
fi

echo "== Disk before =="
df -h
echo
echo "== Docker usage before =="
docker system df || true
echo

echo "== Cleaning docker build cache =="
docker builder prune -af || true

echo "== Cleaning unused images =="
docker image prune -af || true

echo "== Cleaning stopped containers =="
docker container prune -f || true

echo "== Cleaning unused networks =="
docker network prune -f || true

echo "== Cleaning unused volumes (anonymous/not referenced) =="
# This does NOT remove in-use volumes.
docker volume prune -f || true

if [ "$WITH_LOGS" = "--with-logs" ]; then
  if command -v journalctl >/dev/null 2>&1; then
    echo "== Cleaning systemd journals (7 days) =="
    sudo journalctl --vacuum-time=7d || true
  else
    echo "journalctl not found, skipping system logs cleanup."
  fi
fi

echo
echo "== Disk after =="
df -h
echo
echo "== Docker usage after =="
docker system df || true
echo
echo "Safe cleanup done."
echo "Usage: ./scripts/clean-safe.sh [--with-logs]"
