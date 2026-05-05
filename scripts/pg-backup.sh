#!/usr/bin/env sh
set -e

# Minimal, safe backup. Does not require stopping containers.
# Produces a compressed SQL dump you can copy off the server (S3, etc).
#
# Optional S3 upload:
# - BACKUP_S3_BUCKET=jnc-db-backups-prod-123456789012
# - BACKUP_S3_PREFIX=postgres/espetinho
# - BACKUP_S3_STORAGE_CLASS=STANDARD
# - BACKUP_S3_SSE=AES256

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-janocaminho-postgres}"
DB_NAME="${PGDATABASE:-espetinho}"
USER_NAME="${PGUSER:-postgres}"
OUT_DIR="${BACKUP_DIR:-./backups}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_PREFIX="${BACKUP_S3_PREFIX:-postgres/${DB_NAME}}"
S3_STORAGE_CLASS="${BACKUP_S3_STORAGE_CLASS:-STANDARD}"
S3_SSE="${BACKUP_S3_SSE:-AES256}"

build_s3_uri() {
  bucket="$1"
  prefix="$(printf '%s' "$2" | sed 's#^/*##; s#/*$##')"
  filename="$3"
  if [ -n "$prefix" ]; then
    printf 's3://%s/%s/%s' "$bucket" "$prefix" "$filename"
    return
  fi
  printf 's3://%s/%s' "$bucket" "$filename"
}

upload_backup_if_configured() {
  file_path="$1"
  [ -n "$S3_BUCKET" ] || return 0

  if ! command -v aws >/dev/null 2>&1; then
    echo "BACKUP_S3_BUCKET is set, but aws CLI was not found." >&2
    exit 1
  fi

  s3_uri="$(build_s3_uri "$S3_BUCKET" "$S3_PREFIX" "$(basename "$file_path")")"
  echo "Uploading backup to $s3_uri"
  aws s3 cp "$file_path" "$s3_uri" \
    --only-show-errors \
    --sse "$S3_SSE" \
    --storage-class "$S3_STORAGE_CLASS"
  echo "S3 upload done: $s3_uri"
}

ts="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT_DIR"

out="$OUT_DIR/${DB_NAME}_${ts}.sql.gz"
echo "Backing up $DB_NAME from $CONTAINER_NAME to $out"

docker exec "$CONTAINER_NAME" sh -lc "pg_dump -U \"$USER_NAME\" -d \"$DB_NAME\" --no-owner --no-privileges" | gzip -9 > "$out"
upload_backup_if_configured "$out"

echo "Backup done: $out"
