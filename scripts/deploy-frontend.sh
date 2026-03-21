#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.prod"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it from .env.prod.example." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git not found in PATH." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found in PATH." >&2
  exit 1
fi

VERSION="$(awk -F'"' '/"version"/{print $4; exit}' "$ROOT_DIR/frontend/package.json")"
GIT_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
GIT_SHORT_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"
GIT_BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)"
BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

tmp_file="$(mktemp)"
awk '
  !/^FRONTEND_BUILD_VERSION=/ &&
  !/^FRONTEND_BUILD_GIT_SHA=/ &&
  !/^FRONTEND_BUILD_GIT_SHORT_SHA=/ &&
  !/^FRONTEND_BUILD_GIT_BRANCH=/ &&
  !/^FRONTEND_BUILD_TIME_ISO=/
' "$ENV_FILE" > "$tmp_file"

{
  cat "$tmp_file"
  printf '\nFRONTEND_BUILD_VERSION=%s\n' "$VERSION"
  printf 'FRONTEND_BUILD_GIT_SHA=%s\n' "$GIT_SHA"
  printf 'FRONTEND_BUILD_GIT_SHORT_SHA=%s\n' "$GIT_SHORT_SHA"
  printf 'FRONTEND_BUILD_GIT_BRANCH=%s\n' "$GIT_BRANCH"
  printf 'FRONTEND_BUILD_TIME_ISO=%s\n' "$BUILD_TIME"
} > "$ENV_FILE"

rm -f "$tmp_file"

echo "Frontend build metadata updated in .env.prod:"
grep '^FRONTEND_BUILD_' "$ENV_FILE" || true

docker compose \
  -f "$ROOT_DIR/docker-compose.yml" \
  -f "$ROOT_DIR/docker-compose.prod.yml" \
  --env-file "$ENV_FILE" \
  up -d --build --no-deps frontend

echo "Frontend deploy done."
