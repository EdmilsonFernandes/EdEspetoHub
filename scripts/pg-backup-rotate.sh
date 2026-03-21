#!/usr/bin/env bash
set -euo pipefail

# Backup with rotation + minimum interval.
# Default behavior:
# - Runs at most once every 48h (MIN_INTERVAL_HOURS=48)
# - Keeps only the latest backup file (KEEP_LATEST=1)
#
# Intended usage (cron):
# - Run daily; script will skip if not due.

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-chamanoespeto-postgres}"
DB_NAME="${PGDATABASE:-espetinho}"
USER_NAME="${PGUSER:-postgres}"
OUT_DIR="${BACKUP_DIR:-/var/backups/chamanoespeto}"

MIN_INTERVAL_HOURS="${MIN_INTERVAL_HOURS:-48}"
KEEP_LATEST="${KEEP_LATEST:-1}"

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
echo "Backup done: $out"

if [ "$KEEP_LATEST" = "1" ]; then
  # Delete every backup except the newest.
  ls -1t ${pattern} 2>/dev/null | tail -n +2 | xargs -r rm -f --
fi
