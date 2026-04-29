#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

if [ $# -lt 1 ]; then
  echo "Uso: scripts/./deploy-release-api.sh <image-tag>" >&2
  exit 1
fi

sh "$ROOT_DIR/scripts/deploy-release.sh" "$1" api face-worker
