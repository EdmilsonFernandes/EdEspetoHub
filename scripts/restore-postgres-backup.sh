#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
TARGET_DB="${2:-jnc_restore_drill}"
CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-janocaminho-postgres}"
USER_NAME="${PGUSER:-postgres}"
REQUIRE_CHECKSUM="${REQUIRE_BACKUP_CHECKSUM:-false}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup.sql.gz> [target_database]" >&2
  exit 1
fi

if ! printf '%s' "$TARGET_DB" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$'; then
  echo "Invalid target database name: $TARGET_DB" >&2
  exit 1
fi

case "$TARGET_DB" in
  postgres|template0|template1)
    echo "Refusing to restore into reserved database: $TARGET_DB" >&2
    exit 1
    ;;
  espetinho)
    if [ "${ALLOW_PRODUCTION_RESTORE:-false}" != "true" ]; then
      echo "Restoring into espetinho requires ALLOW_PRODUCTION_RESTORE=true." >&2
      exit 1
    fi
    if docker ps --format '{{.Names}}' | grep -Fxq janocaminho-backend && [ "${BACKEND_STOPPED_ACK:-false}" != "true" ]; then
      echo "Stop janocaminho-backend first, then set BACKEND_STOPPED_ACK=true." >&2
      exit 1
    fi
    ;;
esac

gzip -t "$BACKUP_FILE"
if [ -f "$BACKUP_FILE.sha256" ]; then
  (
    cd "$(dirname "$BACKUP_FILE")"
    sha256sum -c "$(basename "$BACKUP_FILE.sha256")"
  )
elif [ "$REQUIRE_CHECKSUM" = "true" ]; then
  echo "Required checksum sidecar not found: $BACKUP_FILE.sha256" >&2
  exit 1
fi
docker exec "$CONTAINER_NAME" pg_isready -U "$USER_NAME" >/dev/null

echo "Recreating database $TARGET_DB in $CONTAINER_NAME"
docker exec "$CONTAINER_NAME" psql -U "$USER_NAME" -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TARGET_DB' AND pid <> pg_backend_pid();" >/dev/null
docker exec "$CONTAINER_NAME" dropdb -U "$USER_NAME" --if-exists "$TARGET_DB"
docker exec "$CONTAINER_NAME" createdb -U "$USER_NAME" -O "$USER_NAME" "$TARGET_DB"

echo "Restoring $BACKUP_FILE"
gzip -dc "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$USER_NAME" -d "$TARGET_DB" -v ON_ERROR_STOP=1 >/dev/null

docker exec "$CONTAINER_NAME" psql -U "$USER_NAME" -d "$TARGET_DB" -v ON_ERROR_STOP=1 -c "
SELECT 'users' AS entity, COUNT(*) AS total FROM users
UNION ALL SELECT 'stores', COUNT(*) FROM stores
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'site_settings', COUNT(*) FROM site_settings
ORDER BY entity;
"

echo "PostgreSQL restore completed: $TARGET_DB"
