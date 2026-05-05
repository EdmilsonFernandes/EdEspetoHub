#!/usr/bin/env bash
set -euo pipefail

# Backup with rotation + minimum interval.
# Default behavior:
# - Runs at most once every 48h (MIN_INTERVAL_HOURS=48)
# - Keeps only the latest backup file (KEEP_LATEST=1)
#
# Intended usage (cron):
# - Run daily; script will skip if not due.
#
# Optional S3 upload:
# - BACKUP_S3_BUCKET=jnc-db-backups-prod-123456789012
# - BACKUP_S3_PREFIX=postgres/espetinho
# - BACKUP_S3_STORAGE_CLASS=STANDARD
# - BACKUP_S3_SSE=AES256

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-janocaminho-postgres}"
DB_NAME="${PGDATABASE:-espetinho}"
USER_NAME="${PGUSER:-postgres}"
OUT_DIR="${BACKUP_DIR:-/var/backups/janocaminho}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_PREFIX="${BACKUP_S3_PREFIX:-postgres/${DB_NAME}}"
S3_STORAGE_CLASS="${BACKUP_S3_STORAGE_CLASS:-STANDARD}"
S3_SSE="${BACKUP_S3_SSE:-AES256}"

MIN_INTERVAL_HOURS="${MIN_INTERVAL_HOURS:-48}"
KEEP_LATEST="${KEEP_LATEST:-1}"

build_s3_uri() {
  local bucket="$1"
  local prefix
  prefix="$(printf '%s' "$2" | sed 's#^/*##; s#/*$##')"
  local filename="$3"
  if [ -n "$prefix" ]; then
    printf 's3://%s/%s/%s' "$bucket" "$prefix" "$filename"
    return
  fi
  printf 's3://%s/%s' "$bucket" "$filename"
}

upload_backup_if_configured() {
  local file_path="$1"
  [ -n "$S3_BUCKET" ] || return 0

  if ! command -v aws >/dev/null 2>&1; then
    echo "BACKUP_S3_BUCKET is set, but aws CLI was not found." >&2
    exit 1
  fi

  local s3_uri
  s3_uri="$(build_s3_uri "$S3_BUCKET" "$S3_PREFIX" "$(basename "$file_path")")"
  echo "Uploading backup to $s3_uri"
  aws s3 cp "$file_path" "$s3_uri" \
    --only-show-errors \
    --sse "$S3_SSE" \
    --storage-class "$S3_STORAGE_CLASS"
  echo "S3 upload done: $s3_uri"
}

mkdir -p "$OUT_DIR"

pattern="${OUT_DIR}/${DB_NAME}_*.sql.gz"
latest="$(ls -1t ${pattern} 2>/dev/null | head -n 1 || true)"
if [ -n "$latest" ]; then
  now="$(date -u +%s)"
  last="$(stat -c %Y "$latest" 2>/dev/null || echo 0)"
  min_seconds="$((MIN_INTERVAL_HOURS * 3600))"
  age="$((now - last))"
  if [ "$age" -lt "$min_seconds" ]; then
    echo "Skip: latest backup is ${age}s old (< ${min_seconds}s)."
    exit 0
  fi
fi

ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="$OUT_DIR/${DB_NAME}_${ts}.sql.gz"

echo "Backing up $DB_NAME from $CONTAINER_NAME to $out"
docker exec "$CONTAINER_NAME" sh -lc "pg_dump -U \"$USER_NAME\" -d \"$DB_NAME\" --no-owner --no-privileges" | gzip -9 > "$out"
upload_backup_if_configured "$out"
echo "Backup done: $out"

if [ "$KEEP_LATEST" = "1" ]; then
  # Delete every backup except the newest.
  ls -1t ${pattern} 2>/dev/null | tail -n +2 | xargs -r rm -f --
fi
