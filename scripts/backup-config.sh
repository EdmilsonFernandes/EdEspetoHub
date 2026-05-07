#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/janocaminho/config}"
KEEP_DAYS="${KEEP_DAYS:-30}"
MIN_INTERVAL_HOURS="${MIN_INTERVAL_HOURS:-0}"
S3_BUCKET="${CONFIG_BACKUP_S3_BUCKET:-${BACKUP_S3_BUCKET:-}}"
S3_PREFIX="${CONFIG_BACKUP_S3_PREFIX:-${BACKUP_S3_PREFIX:-config/runtime}}"
S3_STORAGE_CLASS="${CONFIG_BACKUP_S3_STORAGE_CLASS:-${BACKUP_S3_STORAGE_CLASS:-STANDARD}}"
S3_SSE="${CONFIG_BACKUP_S3_SSE:-${BACKUP_S3_SSE:-AES256}}"
SSM_EXPORT_MODE="${CONFIG_BACKUP_SSM_EXPORT_MODE:-auto}"
EXTRA_SSM_PARAMETERS="${CONFIG_BACKUP_EXTRA_SSM_PARAMETERS:-}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
TMP_DIR="$(mktemp -d)"
STAGE_DIR="$TMP_DIR/config-$TS"
ARCHIVE="$BACKUP_DIR/config-backup-$TS.tar.gz"

mkdir -p "$BACKUP_DIR" "$STAGE_DIR"

if [ "$MIN_INTERVAL_HOURS" -gt 0 ]; then
  latest_backup="$(ls -1t "$BACKUP_DIR"/config-backup-*.tar.gz 2>/dev/null | head -n 1 || true)"
  if [ -n "$latest_backup" ]; then
    now_epoch="$(date -u +%s)"
    latest_epoch="$(stat -c %Y "$latest_backup" 2>/dev/null || echo 0)"
    min_interval_seconds="$((MIN_INTERVAL_HOURS * 3600))"
    age_seconds="$((now_epoch - latest_epoch))"
    if [ "$age_seconds" -lt "$min_interval_seconds" ]; then
      echo "Skip: latest config backup is ${age_seconds}s old (< ${min_interval_seconds}s)."
      rm -rf "$TMP_DIR"
      exit 0
    fi
  fi
fi

copy_if_exists() {
  src="$1"
  dst="$2"
  if [ -f "$src" ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
}

get_file_var() {
  key="$1"
  file="$2"
  [ -f "$file" ] || return 0
  sed -n "s/^${key}=//p" "$file" | tail -n 1
}

get_config_value() {
  key="$1"
  shift
  for file in "$@"; do
    value="$(get_file_var "$key" "$file")"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done
  return 0
}

sanitize_parameter_name() {
  printf '%s' "$1" | sed 's#^/*##; s#[^A-Za-z0-9._-]#_#g'
}

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
    echo "CONFIG_BACKUP_S3_BUCKET/BACKUP_S3_BUCKET is set, but aws CLI was not found." >&2
    exit 1
  fi

  s3_uri="$(build_s3_uri "$S3_BUCKET" "$S3_PREFIX" "$(basename "$file_path")")"
  echo "Uploading config backup to $s3_uri"
  aws s3 cp "$file_path" "$s3_uri" \
    --only-show-errors \
    --sse "$S3_SSE" \
    --storage-class "$S3_STORAGE_CLASS"
  echo "S3 upload done: $s3_uri"
}

export_ssm_parameter() {
  parameter_name="$1"
  region="$2"
  output_dir="$3"
  safe_name="$(sanitize_parameter_name "$parameter_name")"

  mkdir -p "$output_dir"
  aws ssm get-parameter \
    --name "$parameter_name" \
    --with-decryption \
    --region "$region" \
    --output json > "$output_dir/${safe_name}.json"
}

export_ssm_parameters_if_configured() {
  mode="$1"
  output_dir="$2"
  region="$3"
  shift 3
  parameters="$*"

  case "$mode" in
    off|OFF|false|FALSE|0)
      return 0
      ;;
  esac

  if [ -z "$parameters" ]; then
    return 0
  fi

  if [ -z "$region" ]; then
    if [ "$mode" = "required" ]; then
      echo "CONFIG_BACKUP_SSM_EXPORT_MODE=required, but AWS_REGION/AWS_DEFAULT_REGION was not found in the runtime config." >&2
      exit 1
    fi
    echo "Skipping SSM export: AWS region not configured."
    return 0
  fi

  if ! command -v aws >/dev/null 2>&1; then
    if [ "$mode" = "required" ]; then
      echo "CONFIG_BACKUP_SSM_EXPORT_MODE=required, but aws CLI was not found." >&2
      exit 1
    fi
    echo "Skipping SSM export: aws CLI not found."
    return 0
  fi

  mkdir -p "$output_dir"
  exported_any="false"
  while IFS= read -r parameter_name; do
    [ -n "$parameter_name" ] || continue
    export_ssm_parameter "$parameter_name" "$region" "$output_dir"
    exported_any="true"
  done <<EOF
$parameters
EOF

  if [ "$exported_any" = "true" ]; then
    {
      echo "region=$region"
      echo "mode=$mode"
      printf 'parameters=\n%s\n' "$parameters"
    } > "$output_dir/export.meta"
  fi
}

append_unique_line() {
  file_path="$1"
  line="$2"
  [ -n "$line" ] || return 0
  touch "$file_path"
  if ! grep -Fxq "$line" "$file_path"; then
    printf '%s\n' "$line" >> "$file_path"
  fi
}

# Critical runtime configuration
copy_if_exists "$ROOT_DIR/backend/.env" "$STAGE_DIR/backend/.env"
copy_if_exists "$ROOT_DIR/backend/.env.docker" "$STAGE_DIR/backend/.env.docker"
copy_if_exists "$ROOT_DIR/apis/.env.docker" "$STAGE_DIR/apis/.env.docker"
copy_if_exists "$ROOT_DIR/server/.env.docker" "$STAGE_DIR/server/.env.docker"
copy_if_exists "$ROOT_DIR/.env.prod" "$STAGE_DIR/.env.prod"
copy_if_exists "$ROOT_DIR/.env.prod.secrets" "$STAGE_DIR/.env.prod.secrets"
copy_if_exists "$ROOT_DIR/frontend/.env.production" "$STAGE_DIR/frontend/.env.production"
copy_if_exists "$ROOT_DIR/docker-compose.yml" "$STAGE_DIR/docker-compose.yml"
copy_if_exists "$ROOT_DIR/docker-compose.prod.yml" "$STAGE_DIR/docker-compose.prod.yml"
copy_if_exists "$ROOT_DIR/backend/keys/firebase-adminsdk.json" "$STAGE_DIR/backend/keys/firebase-adminsdk.json"

CONFIG_FILES="
$ROOT_DIR/.env.prod
$ROOT_DIR/.env.prod.secrets
$ROOT_DIR/backend/.env
$ROOT_DIR/backend/.env.docker
$ROOT_DIR/apis/.env.docker
$ROOT_DIR/server/.env.docker
$ROOT_DIR/frontend/.env.production
"

AWS_REGION_VALUE="$(get_config_value "AWS_REGION" $CONFIG_FILES)"
if [ -z "$AWS_REGION_VALUE" ]; then
  AWS_REGION_VALUE="$(get_config_value "AWS_DEFAULT_REGION" $CONFIG_FILES)"
fi

SSM_PARAMETERS_FILE="$TMP_DIR/ssm-parameters.txt"
append_unique_line "$SSM_PARAMETERS_FILE" "$(get_config_value "SSM_PARAMETER_NAME" $CONFIG_FILES)"
append_unique_line "$SSM_PARAMETERS_FILE" "$(get_config_value "GHCR_SSM_PARAMETER_NAME" $CONFIG_FILES)"
append_unique_line "$SSM_PARAMETERS_FILE" "$(get_config_value "GHCR_USERNAME_SSM_PARAMETER" $CONFIG_FILES)"
append_unique_line "$SSM_PARAMETERS_FILE" "$(get_config_value "GHCR_TOKEN_SSM_PARAMETER" $CONFIG_FILES)"

for extra_parameter in $EXTRA_SSM_PARAMETERS; do
  append_unique_line "$SSM_PARAMETERS_FILE" "$extra_parameter"
done

if [ -f "$SSM_PARAMETERS_FILE" ]; then
  SSM_PARAMETERS="$(grep -v '^[[:space:]]*$' "$SSM_PARAMETERS_FILE" || true)"
else
  SSM_PARAMETERS=""
fi

if [ -n "$SSM_PARAMETERS" ]; then
  export_ssm_parameters_if_configured "$SSM_EXPORT_MODE" "$STAGE_DIR/ssm" "$AWS_REGION_VALUE" "$SSM_PARAMETERS"
fi

# Metadata for audit/recovery
{
  echo "timestamp_utc=$TS"
  echo "host=$(hostname || echo unknown)"
  echo "root_dir=$ROOT_DIR"
  echo "config_backup_s3_bucket=${S3_BUCKET:-}"
  echo "config_backup_s3_prefix=$S3_PREFIX"
  echo "config_backup_ssm_export_mode=$SSM_EXPORT_MODE"
  echo "config_backup_aws_region=${AWS_REGION_VALUE:-}"
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
upload_backup_if_configured "$ARCHIVE"

# Retention
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'config-backup-*.tar.gz' -mtime +"$KEEP_DAYS" -delete

rm -rf "$TMP_DIR"

echo "Config backup created: $ARCHIVE"
