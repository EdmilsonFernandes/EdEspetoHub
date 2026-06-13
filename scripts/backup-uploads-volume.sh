#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${UPLOADS_SOURCE_CONTAINER:-janocaminho-backend}"
SOURCE_PATH="${UPLOADS_SOURCE_PATH:-/app/uploads}"
OUT_DIR="${UPLOADS_BACKUP_DIR:-/var/backups/janocaminho/uploads}"
MIN_INTERVAL_HOURS="${MIN_INTERVAL_HOURS:-24}"
KEEP_LATEST="${KEEP_LATEST:-1}"
S3_BUCKET="${UPLOADS_BACKUP_S3_BUCKET:-${BACKUP_S3_BUCKET:-}}"
S3_PREFIX="${UPLOADS_BACKUP_S3_PREFIX:-uploads/volume}"
S3_STORAGE_CLASS="${UPLOADS_BACKUP_S3_STORAGE_CLASS:-${BACKUP_S3_STORAGE_CLASS:-STANDARD}}"
S3_SSE="${UPLOADS_BACKUP_S3_SSE:-${BACKUP_S3_SSE:-AES256}}"

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

upload_if_configured() {
  local file_path="$1"
  [ -n "$S3_BUCKET" ] || return 0
  command -v aws >/dev/null 2>&1 || {
    echo "Uploads backup requested S3 upload, but aws CLI was not found." >&2
    exit 1
  }

  aws s3 cp "$file_path" "$(build_s3_uri "$S3_BUCKET" "$S3_PREFIX" "$(basename "$file_path")")" \
    --only-show-errors \
    --sse "$S3_SSE" \
    --storage-class "$S3_STORAGE_CLASS"
}

mkdir -p "$OUT_DIR"
pattern="${OUT_DIR}/uploads_*.tar.gz"
latest="$(ls -1t ${pattern} 2>/dev/null | head -n 1 || true)"
if [ -n "$latest" ]; then
  now="$(date -u +%s)"
  last="$(stat -c %Y "$latest" 2>/dev/null || echo 0)"
  min_seconds="$((MIN_INTERVAL_HOURS * 3600))"
  age="$((now - last))"
  if [ "$age" -lt "$min_seconds" ]; then
    echo "Skip: latest uploads backup is ${age}s old (< ${min_seconds}s)."
    exit 0
  fi
fi

docker inspect "$CONTAINER_NAME" >/dev/null 2>&1 || {
  echo "Uploads source container not found: $CONTAINER_NAME" >&2
  exit 1
}

ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="$OUT_DIR/uploads_${ts}.tar.gz"
checksum="$out.sha256"

echo "Backing up $CONTAINER_NAME:$SOURCE_PATH to $out"
docker exec "$CONTAINER_NAME" sh -lc "test -d '$SOURCE_PATH' && tar -czf - -C '$SOURCE_PATH' ." > "$out"
test -s "$out"
tar -tzf "$out" >/dev/null

if command -v sha256sum >/dev/null 2>&1; then
  (
    cd "$OUT_DIR"
    sha256sum "$(basename "$out")" > "$(basename "$checksum")"
  )
fi

upload_if_configured "$out"
if [ -f "$checksum" ]; then
  upload_if_configured "$checksum"
fi

if [ "$KEEP_LATEST" = "1" ]; then
  ls -1t ${pattern} 2>/dev/null | tail -n +2 | while IFS= read -r old_backup; do
    rm -f -- "$old_backup" "$old_backup.sha256"
  done
fi

echo "Uploads backup created: $out"
