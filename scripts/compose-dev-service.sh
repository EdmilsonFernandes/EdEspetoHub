#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.dev"
API_ENV_FILE="$ROOT_DIR/backend/.env.docker"

if [ $# -lt 1 ]; then
  echo "Uso: scripts/./compose-dev-service.sh <service...>" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it from .env.dev or .env." >&2
  exit 1
fi
if [ ! -f "$API_ENV_FILE" ]; then
  echo "Missing $API_ENV_FILE. Create it from backend/.env.docker.example." >&2
  exit 1
fi

unset FRONTEND_PORT
docker compose -f "$ROOT_DIR/docker-compose.yml" --env-file "$ENV_FILE" up -d --build --no-deps "$@"
