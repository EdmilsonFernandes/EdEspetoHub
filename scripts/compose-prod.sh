#!/usr/bin/env sh
set -e

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.prod"
API_ENV_FILE="$ROOT_DIR/backend/.env.docker"
SECRETS_FILE="$ROOT_DIR/.env.prod.secrets"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it from .env.prod.example." >&2
  exit 1
fi
if [ ! -f "$API_ENV_FILE" ]; then
  echo "Missing $API_ENV_FILE. Create it from backend/.env.docker.example." >&2
  exit 1
fi

if [ -f "$SECRETS_FILE" ]; then
  set -a
  . "$SECRETS_FILE"
  set +a
fi

escape_sed() {
  printf '%s' "$1" | sed 's/[&|]/\\&/g'
}

apply_env() {
  key="$1"
  value="$2"
  if [ -z "$value" ]; then
    return
  fi
  escaped_value="$(escape_sed "$value")"
  if grep -q "^${key}=" "$API_ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$API_ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$API_ENV_FILE"
  fi
}

apply_env APP_BASE_URL "$APP_BASE_URL"
apply_env SUPER_ADMIN_EMAIL "$SUPER_ADMIN_EMAIL"
apply_env SUPER_ADMIN_PASSWORD "$SUPER_ADMIN_PASSWORD"
apply_env PENDING_SIGNUP_TTL_DAYS "$PENDING_SIGNUP_TTL_DAYS"
apply_env MP_ACCESS_TOKEN "$MP_ACCESS_TOKEN"
apply_env MP_PUBLIC_KEY "$MP_PUBLIC_KEY"
apply_env MP_WEBHOOK_URL "$MP_WEBHOOK_URL"
apply_env MP_WEBHOOK_SECRET "$MP_WEBHOOK_SECRET"
apply_env MP_API_BASE_URL "$MP_API_BASE_URL"
apply_env MP_DEBUG "$MP_DEBUG"
apply_env SMTP_HOST "$SMTP_HOST"
apply_env SMTP_PORT "$SMTP_PORT"
apply_env SMTP_USER "$SMTP_USER"
apply_env SMTP_PASS "$SMTP_PASS"
apply_env SMTP_SECURE "$SMTP_SECURE"
apply_env EMAIL_FROM "$EMAIL_FROM"

# Database (optional, but helps keep Docker+SSM aligned and prevents auth drift)
apply_env PGHOST "$PGHOST"
apply_env PGPORT "$PGPORT"
apply_env PGUSER "$PGUSER"
apply_env PGPASSWORD "$PGPASSWORD"
apply_env PGDATABASE "$PGDATABASE"
apply_env JWT_SECRET "$JWT_SECRET"

unset FRONTEND_PORT

# Prod safety: make Postgres volume external so `docker compose down -v` cannot delete it.
# We create the volume if missing (safe), but we never remove it here.
: "${POSTGRES_VOLUME_NAME:=edespetohub_postgres-data}"
if ! docker volume inspect "$POSTGRES_VOLUME_NAME" >/dev/null 2>&1; then
  echo "Creating Postgres volume: $POSTGRES_VOLUME_NAME"
  docker volume create "$POSTGRES_VOLUME_NAME" >/dev/null
fi

docker compose -f "$ROOT_DIR/docker-compose.yml" -f "$ROOT_DIR/docker-compose.prod.yml" --env-file "$ENV_FILE" up --build -d
