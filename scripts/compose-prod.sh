#!/usr/bin/env sh
set -e

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.prod"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it from .env.prod.example." >&2
  exit 1
fi

unset FRONTEND_PORT
docker compose --env-file "$ENV_FILE" up --build -d
