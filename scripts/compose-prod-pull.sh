#!/usr/bin/env sh
set -e

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.prod"
API_ENV_FILE="$ROOT_DIR/backend/.env.docker"
SECRETS_FILE="$ROOT_DIR/.env.prod.secrets"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it from .env.prod.example." >&2
  exit 1
fi
if [ ! -f "$API_ENV_FILE" ]; then
  echo "Missing $API_ENV_FILE. Create it from backend/.env.docker.example." >&2
  exit 1
fi

if [ -f "$SECRETS_FILE" ]; then
  set -a
  . "$SECRETS_FILE"
  set +a
fi

# Prod safety: make Postgres volume external so `docker compose down -v` cannot delete it.
: "${POSTGRES_VOLUME_NAME:=edespetohub_postgres-data}"
if ! docker volume inspect "$POSTGRES_VOLUME_NAME" >/dev/null 2>&1; then
  echo "Creating Postgres volume: $POSTGRES_VOLUME_NAME"
  docker volume create "$POSTGRES_VOLUME_NAME" >/dev/null
fi

# Pull images and run without building (EC2-friendly).
docker compose \
  -f "$ROOT_DIR/docker-compose.yml" \
  -f "$ROOT_DIR/docker-compose.prod.yml" \
  -f "$ROOT_DIR/docker-compose.deploy.yml" \
  --env-file "$ENV_FILE" \
  up -d --no-build

