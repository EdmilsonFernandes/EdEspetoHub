#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/janocaminho/config}"
KEEP_DAYS="${KEEP_DAYS:-30}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
TMP_DIR="$(mktemp -d)"
STAGE_DIR="$TMP_DIR/config-$TS"
ARCHIVE="$BACKUP_DIR/config-backup-$TS.tar.gz"

mkdir -p "$BACKUP_DIR" "$STAGE_DIR"

copy_if_exists() {
  src="$1"
  dst="$2"
  if [ -f "$src" ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
}

# Critical runtime configuration
copy_if_exists "$ROOT_DIR/backend/.env.docker" "$STAGE_DIR/backend/.env.docker"
copy_if_exists "$ROOT_DIR/.env.prod" "$STAGE_DIR/.env.prod"
copy_if_exists "$ROOT_DIR/docker-compose.yml" "$STAGE_DIR/docker-compose.yml"
copy_if_exists "$ROOT_DIR/docker-compose.prod.yml" "$STAGE_DIR/docker-compose.prod.yml"
copy_if_exists "$ROOT_DIR/backend/keys/firebase-adminsdk.json" "$STAGE_DIR/backend/keys/firebase-adminsdk.json"

# Metadata for audit/recovery
{
  echo "timestamp_utc=$TS"
  echo "host=$(hostname || echo unknown)"
  echo "root_dir=$ROOT_DIR"
} > "$STAGE_DIR/backup.meta"

(
  cd "$STAGE_DIR"
  # shellcheck disable=SC2010
  if command -v sha256sum >/dev/null 2>&1; then
    find . -type f | sort | xargs sha256sum > checksums.sha256
  fi
)

mkdir -p "$BACKUP_DIR"
tar -C "$TMP_DIR" -czf "$ARCHIVE" "config-$TS"
chmod 600 "$ARCHIVE" || true

# Retention
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'config-backup-*.tar.gz' -mtime +"$KEEP_DAYS" -delete

rm -rf "$TMP_DIR"

echo "Config backup created: $ARCHIVE"
