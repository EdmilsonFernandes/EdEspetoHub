#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
VOLUME_NAME="${UPLOADS_VOLUME_NAME:-edespetohub_uploads_data}"
RESTORE_IMAGE="${UPLOADS_RESTORE_IMAGE:-alpine:3.20}"
REQUIRE_CHECKSUM="${REQUIRE_BACKUP_CHECKSUM:-false}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: $0 <uploads-backup.tar.gz>" >&2
  exit 1
fi

if [ "${ALLOW_UPLOADS_RESTORE:-false}" != "true" ]; then
  echo "Uploads restore requires ALLOW_UPLOADS_RESTORE=true." >&2
  exit 1
fi

tar -tzf "$BACKUP_FILE" >/dev/null
if [ -f "$BACKUP_FILE.sha256" ]; then
  (
    cd "$(dirname "$BACKUP_FILE")"
    sha256sum -c "$(basename "$BACKUP_FILE.sha256")"
  )
elif [ "$REQUIRE_CHECKSUM" = "true" ]; then
  echo "Required checksum sidecar not found: $BACKUP_FILE.sha256" >&2
  exit 1
fi
docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1 || docker volume create "$VOLUME_NAME" >/dev/null

if [ "$VOLUME_NAME" = "edespetohub_uploads_data" ] &&
  docker ps --format '{{.Names}}' | grep -Fxq janocaminho-backend &&
  [ "${BACKEND_STOPPED_ACK:-false}" != "true" ]; then
  echo "Stop janocaminho-backend before restoring the uploads volume." >&2
  exit 1
fi

existing_files="$(
  docker run --rm -v "$VOLUME_NAME:/target:ro" "$RESTORE_IMAGE" \
    sh -lc 'find /target -mindepth 1 -maxdepth 1 -print -quit' 2>/dev/null || true
)"
if [ -n "$existing_files" ] && [ "${CLEAR_UPLOADS_VOLUME:-false}" != "true" ]; then
  echo "Uploads volume is not empty. Set CLEAR_UPLOADS_VOLUME=true to replace its contents." >&2
  exit 1
fi

if [ "${CLEAR_UPLOADS_VOLUME:-false}" = "true" ]; then
  docker run --rm -v "$VOLUME_NAME:/target" "$RESTORE_IMAGE" sh -lc 'find /target -mindepth 1 -delete'
fi

echo "Restoring $BACKUP_FILE into Docker volume $VOLUME_NAME"
docker run --rm -i -v "$VOLUME_NAME:/target" "$RESTORE_IMAGE" sh -lc 'tar -xzf - -C /target' < "$BACKUP_FILE"
docker run --rm -v "$VOLUME_NAME:/target:ro" "$RESTORE_IMAGE" sh -lc 'du -sh /target; find /target -type f | wc -l'

echo "Uploads restore completed: $VOLUME_NAME"
