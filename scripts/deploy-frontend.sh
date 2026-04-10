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
GIT_REMOTE_URL="$(git -C "$ROOT_DIR" remote get-url origin)"
BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
BUILD_STAMP="$(date -u +"%Y%m%d.%H%M%S")"
FORCE_MIN_VERSION="0.1.9"
PKG_VERSION="$(awk -F'"' '/"version"/{print $4; exit}' "$ROOT_DIR/frontend/package.json")"
CURRENT_ENV_VERSION="$(grep '^FRONTEND_BUILD_VERSION=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

COMMITS_JSON=""
COMMITS_JSON_B64=""
if [ -n "$PYTHON_BIN" ]; then
  COMMITS_JSON="$(
    ROOT_DIR="$ROOT_DIR" "$PYTHON_BIN" - <<'PY'
import json
import os
import subprocess

root = os.environ["ROOT_DIR"]
cmd = [
    "git",
    "-C",
    root,
    "log",
    "-n",
    "30",
    "--date=iso-strict",
    "--pretty=format:%H%x1f%h%x1f%cI%x1f%an%x1f%ae%x1f%s",
]
try:
    raw = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL)
except Exception:
    raw = ""

rows = []
for line in raw.splitlines():
    parts = line.split("\x1f")
    rows.append(
        {
            "hash": parts[0] if len(parts) > 0 else "",
            "shortHash": parts[1] if len(parts) > 1 else "",
            "dateIso": parts[2] if len(parts) > 2 else "",
            "authorName": parts[3] if len(parts) > 3 else "",
            "authorEmail": parts[4] if len(parts) > 4 else "",
            "subject": parts[5] if len(parts) > 5 else "",
        }
    )

print(json.dumps(rows, ensure_ascii=True, separators=(",", ":")))
PY
  )"
  if [ -n "$COMMITS_JSON" ]; then
    COMMITS_JSON_B64="$(
      COMMITS_JSON_PAYLOAD="$COMMITS_JSON" "$PYTHON_BIN" - <<'PY'
import base64
import os

payload = os.environ.get("COMMITS_JSON_PAYLOAD", "")
print(base64.b64encode(payload.encode('utf-8')).decode('ascii'))
PY
    )"
  fi
fi

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
  !/^FRONTEND_BUILD_GIT_REMOTE_URL=/ &&
  !/^FRONTEND_BUILD_COMMITS_JSON=/ &&
  !/^FRONTEND_BUILD_COMMITS_B64=/ &&
  !/^FRONTEND_BUILD_TIME_ISO=/
' "$ENV_FILE" > "$tmp_file"

{
  cat "$tmp_file"
  printf '\nFRONTEND_BUILD_VERSION=%s\n' "$VERSION"
  printf 'FRONTEND_BUILD_GIT_SHA=%s\n' "$GIT_SHA"
  printf 'FRONTEND_BUILD_GIT_SHORT_SHA=%s\n' "$GIT_SHORT_SHA"
  printf 'FRONTEND_BUILD_GIT_BRANCH=%s\n' "$GIT_BRANCH"
  printf 'FRONTEND_BUILD_GIT_REMOTE_URL=%s\n' "$GIT_REMOTE_URL"
  printf 'FRONTEND_BUILD_COMMITS_B64=%s\n' "$COMMITS_JSON_B64"
  printf 'FRONTEND_BUILD_TIME_ISO=%s\n' "$BUILD_TIME"
} > "$ENV_FILE"

rm -f "$tmp_file"

echo "Frontend build metadata updated in .env.prod:"
grep '^FRONTEND_BUILD_' "$ENV_FILE" || true

sh "$ROOT_DIR/scripts/docker-clean-build-cache.sh" || true

docker compose \
  -f "$ROOT_DIR/docker-compose.yml" \
  -f "$ROOT_DIR/docker-compose.prod.yml" \
  --env-file "$ENV_FILE" \
  up -d --build --no-deps frontend

sh "$ROOT_DIR/scripts/docker-clean-build-cache.sh" || true

echo "Frontend deploy done."
