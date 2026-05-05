#!/usr/bin/env bash
set -euo pipefail

BUCKET_NAME="${1:-${BACKUP_S3_BUCKET:-}}"
CONFIG_PATH="${BACKUP_S3_LIFECYCLE_CONFIG:-$(dirname "$0")/s3-backup-lifecycle.json}"

if [ -z "$BUCKET_NAME" ]; then
  echo "Usage: $0 <bucket-name>" >&2
  echo "Or set BACKUP_S3_BUCKET in the environment." >&2
  exit 1
fi

if [ ! -f "$CONFIG_PATH" ]; then
  echo "Lifecycle config not found: $CONFIG_PATH" >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found." >&2
  exit 1
fi

echo "Applying lifecycle configuration from $CONFIG_PATH to s3://$BUCKET_NAME"
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET_NAME" \
  --lifecycle-configuration "file://$CONFIG_PATH"

echo "Lifecycle applied. Current configuration:"
aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET_NAME"
