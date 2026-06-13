#!/usr/bin/env bash
set -euo pipefail

DB_BACKUP_DIR="${DB_BACKUP_DIR:-/var/backups/janocaminho}"
CONFIG_BACKUP_DIR="${CONFIG_BACKUP_DIR:-/var/backups/janocaminho/config}"
UPLOADS_BACKUP_DIR="${UPLOADS_BACKUP_DIR:-/var/backups/janocaminho/uploads}"
DB_MAX_AGE_HOURS="${DB_MAX_AGE_HOURS:-8}"
CONFIG_MAX_AGE_HOURS="${CONFIG_MAX_AGE_HOURS:-30}"
UPLOADS_MAX_AGE_HOURS="${UPLOADS_MAX_AGE_HOURS:-30}"
REQUIRE_CHECKSUMS="${RECOVERY_REQUIRE_CHECKSUMS:-true}"

failures=0

fail() {
  echo "FAIL: $*" >&2
  failures=$((failures + 1))
}

check_age() {
  local file_path="$1"
  local max_hours="$2"
  local label="$3"
  local now modified age max_age
  now="$(date -u +%s)"
  modified="$(stat -c %Y "$file_path")"
  age="$((now - modified))"
  max_age="$((max_hours * 3600))"
  if [ "$age" -gt "$max_age" ]; then
    fail "$label is stale: ${age}s old, expected <= ${max_age}s"
  else
    echo "OK: $label age=${age}s file=$file_path"
  fi
}

verify_checksum() {
  local file_path="$1"
  if [ -f "$file_path.sha256" ]; then
    (cd "$(dirname "$file_path")" && sha256sum -c "$(basename "$file_path.sha256")")
  elif [ "$REQUIRE_CHECKSUMS" = "true" ]; then
    echo "Required checksum sidecar missing for $file_path" >&2
    return 1
  else
    echo "WARN: checksum sidecar missing for $file_path"
  fi
}

latest_db="$(find "$DB_BACKUP_DIR" -maxdepth 1 -type f -name 'espetinho_*.sql.gz' -print 2>/dev/null | xargs -r ls -1t | head -n 1 || true)"
if [ -z "$latest_db" ]; then
  fail "no PostgreSQL backup found in $DB_BACKUP_DIR"
else
  gzip -t "$latest_db" || fail "invalid PostgreSQL gzip: $latest_db"
  verify_checksum "$latest_db" || fail "PostgreSQL checksum failed: $latest_db"
  check_age "$latest_db" "$DB_MAX_AGE_HOURS" "PostgreSQL backup"
fi

latest_config="$(find "$CONFIG_BACKUP_DIR" -maxdepth 1 -type f -name 'config-backup-*.tar.gz' -print 2>/dev/null | xargs -r ls -1t | head -n 1 || true)"
if [ -z "$latest_config" ]; then
  fail "no config backup found in $CONFIG_BACKUP_DIR"
else
  config_listing="$(tar -tzf "$latest_config")" || {
    config_listing=""
    fail "invalid config archive: $latest_config"
  }
  for required_path in \
    '/backend/.env.docker' \
    '/apis/.env.docker' \
    '/.env.prod' \
    '/docker-compose.yml' \
    '/docker-compose.prod.yml' \
    '/docker-compose.deploy.yml' \
    '/ssm/'
  do
    printf '%s\n' "$config_listing" | grep -Fq "$required_path" || fail "config backup missing $required_path"
  done
  verify_checksum "$latest_config" || fail "config checksum failed: $latest_config"
  check_age "$latest_config" "$CONFIG_MAX_AGE_HOURS" "config backup"
fi

latest_uploads="$(find "$UPLOADS_BACKUP_DIR" -maxdepth 1 -type f -name 'uploads_*.tar.gz' -print 2>/dev/null | xargs -r ls -1t | head -n 1 || true)"
if [ -z "$latest_uploads" ]; then
  fail "no uploads backup found in $UPLOADS_BACKUP_DIR"
else
  tar -tzf "$latest_uploads" >/dev/null || fail "invalid uploads archive: $latest_uploads"
  verify_checksum "$latest_uploads" || fail "uploads checksum failed: $latest_uploads"
  check_age "$latest_uploads" "$UPLOADS_MAX_AGE_HOURS" "uploads backup"
fi

if [ "$failures" -gt 0 ]; then
  echo "Recovery backup verification failed with $failures issue(s)." >&2
  exit 1
fi

echo "Recovery backups are valid and within the configured age limits."
