#!/usr/bin/env sh
set -e

# Minimal, safe backup. Does not require stopping containers.
# Produces a compressed SQL dump you can copy off the server (S3, etc).

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-janocaminho-postgres}"
DB_NAME="${PGDATABASE:-espetinho}"
USER_NAME="${PGUSER:-postgres}"
OUT_DIR="${BACKUP_DIR:-./backups}"

ts="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT_DIR"

out="$OUT_DIR/${DB_NAME}_${ts}.sql.gz"
echo "Backing up $DB_NAME from $CONTAINER_NAME to $out"

docker exec "$CONTAINER_NAME" sh -lc "pg_dump -U \"$USER_NAME\" -d \"$DB_NAME\" --no-owner --no-privileges" | gzip -9 > "$out"

echo "Backup done: $out"

