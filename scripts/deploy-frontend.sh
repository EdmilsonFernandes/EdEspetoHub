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

GIT_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
GIT_SHORT_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"
GIT_BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)"
BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
BUILD_STAMP="$(date -u +"%Y%m%d.%H%M%S")"
FORCE_MIN_VERSION="0.1.9"
PKG_VERSION="$(awk -F'"' '/"version"/{print $4; exit}' "$ROOT_DIR/frontend/package.json")"
CURRENT_ENV_VERSION="$(grep '^FRONTEND_BUILD_VERSION=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"

normalize_semver() {
  printf '%s' "$1" | sed -E 's/^v//; s/\+.*$//'
}

is_semver() {
  printf '%s' "$1" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'
}

version_ge() {
  awk -v a="$1" -v b="$2" 'BEGIN {
    split(a, av, ".");
    split(b, bv, ".");
    if (av[1] > bv[1]) exit 0;
    if (av[1] < bv[1]) exit 1;
    if (av[2] > bv[2]) exit 0;
    if (av[2] < bv[2]) exit 1;
    if (av[3] >= bv[3]) exit 0;
    exit 1;
  }'
}

bump_patch() {
  awk -v v="$1" 'BEGIN {
    split(v, p, ".");
    printf "%d.%d.%d", p[1], p[2], p[3] + 1;
  }'
}

PKG_SEMVER="$(normalize_semver "$PKG_VERSION")"
ENV_SEMVER="$(normalize_semver "$CURRENT_ENV_VERSION")"

if ! is_semver "$PKG_SEMVER"; then
  PKG_SEMVER="$FORCE_MIN_VERSION"
fi

if is_semver "$ENV_SEMVER"; then
  if version_ge "$ENV_SEMVER" "$FORCE_MIN_VERSION"; then
    NEXT_SEMVER="$(bump_patch "$ENV_SEMVER")"
  else
    NEXT_SEMVER="$FORCE_MIN_VERSION"
  fi
else
  if version_ge "$PKG_SEMVER" "$FORCE_MIN_VERSION"; then
    NEXT_SEMVER="$PKG_SEMVER"
  else
    NEXT_SEMVER="$FORCE_MIN_VERSION"
  fi
fi

# Semantic version for UI/release + internal metadata for traceability.
VERSION="${NEXT_SEMVER}+${BUILD_STAMP}.${GIT_SHORT_SHA}"

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
