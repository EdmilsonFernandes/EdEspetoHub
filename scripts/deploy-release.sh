#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.prod"
API_ENV_FILE="$ROOT_DIR/backend/.env.docker"
SECRETS_FILE="$ROOT_DIR/.env.prod.secrets"
CURRENT_USER="$(id -un 2>/dev/null || printf '%s' "${USER:-ec2-user}")"
CURRENT_HOME="$(getent passwd "$CURRENT_USER" 2>/dev/null | awk -F: '{print $6}' || true)"
if [ -z "$CURRENT_HOME" ]; then
  CURRENT_HOME="/home/$CURRENT_USER"
fi
export HOME="$CURRENT_HOME"
export DOCKER_CONFIG="${DOCKER_CONFIG:-$HOME/.docker}"
export PATH="/usr/local/bin:$PATH"

usage() {
  echo "Uso: scripts/./deploy-release.sh [image-tag] [service ...]" >&2
  echo "Padrão sem image-tag: main" >&2
  echo "Exemplo: scripts/./deploy-release.sh" >&2
  echo "Exemplo: scripts/./deploy-release.sh frontend" >&2
  echo "Exemplo: scripts/./deploy-release.sh 3a254581 api face-worker" >&2
}

IMAGE_TAG_ARG="main"

case "${1:-}" in
  "" )
    ;;
  api|frontend|face-worker)
    ;;
  -*)
    usage
    exit 1
    ;;
  *)
    IMAGE_TAG_ARG="$1"
    shift || true
    ;;
esac

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it from .env.prod.example." >&2
  exit 1
fi

if [ ! -f "$API_ENV_FILE" ]; then
  echo "Missing $API_ENV_FILE. Create it from backend/.env.docker.example." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found in PATH." >&2
  exit 1
fi

if command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v sudo >/dev/null 2>&1 && sudo docker-compose version >/dev/null 2>&1; then
  COMPOSE_CMD="sudo -E docker-compose"
elif command -v sudo >/dev/null 2>&1 && sudo docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="sudo -E docker compose"
else
  echo "Neither 'docker compose' nor 'docker-compose' is available." >&2
  exit 1
fi

if [ -f "$SECRETS_FILE" ]; then
  set -a
  . "$SECRETS_FILE"
  set +a
fi

if [ $# -eq 0 ]; then
  set -- api frontend face-worker
fi

case "${IMAGE_REGISTRY:-ghcr.io}" in
  ghcr.io)
    if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
      printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
    else
      echo "GHCR credentials not found in .env.prod.secrets; assuming docker login ghcr.io was already done."
    fi
    ;;
esac

: "${POSTGRES_VOLUME_NAME:=edespetohub_postgres-data}"
if ! docker volume inspect "$POSTGRES_VOLUME_NAME" >/dev/null 2>&1; then
  echo "Creating Postgres volume: $POSTGRES_VOLUME_NAME"
  docker volume create "$POSTGRES_VOLUME_NAME" >/dev/null
fi

export IMAGE_TAG="$IMAGE_TAG_ARG"

echo "Deploying image tag: $IMAGE_TAG"
echo "Services: $*"

$COMPOSE_CMD \
  -f "$ROOT_DIR/docker-compose.yml" \
  -f "$ROOT_DIR/docker-compose.prod.yml" \
  -f "$ROOT_DIR/docker-compose.deploy.yml" \
  --env-file "$ENV_FILE" \
  pull "$@"

$COMPOSE_CMD \
  -f "$ROOT_DIR/docker-compose.yml" \
  -f "$ROOT_DIR/docker-compose.prod.yml" \
  -f "$ROOT_DIR/docker-compose.deploy.yml" \
  --env-file "$ENV_FILE" \
  up -d --no-build --no-deps "$@"

echo "Release deploy done."
