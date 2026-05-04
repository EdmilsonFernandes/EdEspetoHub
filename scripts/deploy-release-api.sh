#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

if [ $# -gt 1 ]; then
  echo "Uso: scripts/./deploy-release-api.sh [image-tag]" >&2
  exit 1
fi

if [ $# -eq 0 ]; then
  sh "$ROOT_DIR/scripts/deploy-release.sh" backend apis face-worker
else
  sh "$ROOT_DIR/scripts/deploy-release.sh" "$1" backend apis face-worker
fi
