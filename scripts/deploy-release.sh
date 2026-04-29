#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.prod"
API_ENV_FILE="$ROOT_DIR/backend/.env.docker"
SECRETS_FILE="$ROOT_DIR/.env.prod.secrets"
CURRENT_USER="$(id -un 2>/dev/null || printf '%s' "${USER:-ec2-user}")"
CURRENT_HOME="$(getent passwd "$CURRENT_USER" 2>/dev/null | awk -F: '{print $6}' || true)"
if [ -z "$CURRENT_HOME" ]; then
  CURRENT_HOME="/home/$CURRENT_USER"
fi
export HOME="$CURRENT_HOME"
export DOCKER_CONFIG="${DOCKER_CONFIG:-$HOME/.docker}"
export PATH="/usr/local/bin:$PATH"

get_env_var() {
  eval "printf '%s' \"\${$1:-}\""
}

get_file_var() {
  key="$1"
  file="$2"
  [ -f "$file" ] || return 0
  sed -n "s/^${key}=//p" "$file" | tail -n 1
}

load_value_if_missing() {
  key="$1"
  current_value="$(get_env_var "$key")"
  if [ -n "$current_value" ]; then
    return 0
  fi

  for file in "$SECRETS_FILE" "$ENV_FILE" "$API_ENV_FILE"; do
    value="$(get_file_var "$key" "$file")"
    if [ -n "$value" ]; then
      export "$key=$value"
      return 0
    fi
  done
}

fetch_ssm_parameter() {
  parameter_name="$1"
  region="$2"

  if [ -z "$parameter_name" ]; then
    return 0
  fi

  if [ -z "$region" ]; then
    echo "AWS_REGION is required to load GHCR credentials from SSM." >&2
    return 1
  fi

  if ! command -v aws >/dev/null 2>&1; then
    echo "aws CLI not found; cannot load GHCR credentials from SSM." >&2
    return 1
  fi

  aws ssm get-parameter \
    --name "$parameter_name" \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text \
    --region "$region"
}

parse_json_key() {
  json_raw="$1"
  key="$2"

  if command -v python3 >/dev/null 2>&1; then
    JSON_RAW="$json_raw" python3 - "$key" <<'PY'
import json
import os
import sys

key = sys.argv[1]
raw = os.environ.get("JSON_RAW", "")
try:
    data = json.loads(raw)
except Exception:
    sys.exit(1)

value = data.get(key)
if value is None:
    sys.exit(2)

print(value)
PY
    return $?
  fi

  if command -v node >/dev/null 2>&1; then
    JSON_RAW="$json_raw" node -e "const key = process.argv[1]; const raw = process.env.JSON_RAW || ''; const data = JSON.parse(raw); if (data[key] == null) process.exit(2); process.stdout.write(String(data[key]));" "$key"
    return $?
  fi

  echo "Neither python3 nor node is available to parse JSON from SSM." >&2
  return 1
}

resolve_service_image_name() {
  case "$1" in
    api) printf '%s' 'edespetohub-api' ;;
    frontend) printf '%s' 'edespetohub-frontend' ;;
    face-worker) printf '%s' 'edespetohub-face-worker' ;;
    *) return 1 ;;
  esac
}

resolve_service_container_name() {
  case "$1" in
    api) printf '%s' 'chamanoespeto-api' ;;
    frontend) printf '%s' 'chamanoespeto-frontend' ;;
    face-worker) printf '%s' 'chamanoespeto-face-worker' ;;
    *) return 1 ;;
  esac
}

extract_build_number() {
  raw_value="$1"
  printf '%s' "$raw_value" | sed -n 's/.*gha\.\([0-9][0-9]*\)\..*/\1/p' | head -n 1
}

inspect_image_label() {
  image_ref="$1"
  label_key="$2"
  docker image inspect --format "{{ index .Config.Labels \"$label_key\" }}" "$image_ref" 2>/dev/null || true
}

inspect_container_image_id() {
  container_name="$1"
  docker inspect --format '{{.Image}}' "$container_name" 2>/dev/null || true
}

inspect_container_image_ref() {
  container_name="$1"
  docker inspect --format '{{.Config.Image}}' "$container_name" 2>/dev/null || true
}

format_image_summary() {
  image_ref="$1"

  version_label="$(inspect_image_label "$image_ref" 'io.janocaminho.build.version_label')"
  build_id="$(inspect_image_label "$image_ref" 'io.janocaminho.build.build_id')"
  short_sha="$(inspect_image_label "$image_ref" 'io.janocaminho.build.short_sha')"
  built_at="$(inspect_image_label "$image_ref" 'io.janocaminho.build.time_iso')"
  revision="$(inspect_image_label "$image_ref" 'org.opencontainers.image.revision')"
  build_number="$(extract_build_number "$build_id")"

  if [ -z "$short_sha" ] && [ -n "$revision" ]; then
    short_sha="$(printf '%.8s' "$revision")"
  fi

  summary=""
  if [ -n "$version_label" ]; then
    summary="$version_label"
    if [ -n "$build_number" ] && ! printf '%s' "$version_label" | grep -Eq "(^|[^0-9])${build_number}$"; then
      summary="${summary}.${build_number}"
    fi
  elif [ -n "$short_sha" ]; then
    summary="commit $short_sha"
  else
    summary="-"
  fi

  if [ -n "$build_id" ]; then
    summary="$summary | $build_id"
  elif [ -n "$short_sha" ]; then
    summary="$summary | $short_sha"
  fi

  if [ -n "$built_at" ]; then
    summary="$summary | $built_at"
  fi

  printf '%s' "$summary"
}

show_release_comparison() {
  service_name="$1"
  service_image_name="$(resolve_service_image_name "$service_name")" || return 0
  container_name="$(resolve_service_container_name "$service_name")" || return 0
  incoming_image_ref="${IMAGE_REGISTRY:-ghcr.io}/${IMAGE_NAMESPACE:-edmilsonfernandes}/${service_image_name}:${IMAGE_TAG}"
  current_image_id="$(inspect_container_image_id "$container_name")"
  current_image_ref="$(inspect_container_image_ref "$container_name")"

  printf '%s\n' "--- ${service_name} ---"
  if [ -n "$current_image_id" ]; then
    printf 'Atual: %s\n' "$(format_image_summary "$current_image_id")"
    if [ -n "$current_image_ref" ]; then
      printf 'Imagem atual: %s\n' "$current_image_ref"
    fi
  else
    printf 'Atual: %s\n' 'nenhum container rodando'
  fi

  printf 'Novo : %s\n' "$(format_image_summary "$incoming_image_ref")"
  printf 'Imagem nova: %s\n' "$incoming_image_ref"
}

usage() {
  echo "Uso: scripts/./deploy-release.sh [image-tag] [service ...]" >&2
  echo "Padrão sem image-tag: main" >&2
  echo "Exemplo: scripts/./deploy-release.sh" >&2
  echo "Exemplo: scripts/./deploy-release.sh frontend" >&2
  echo "Exemplo: scripts/./deploy-release.sh 3a254581 api face-worker" >&2
}

IMAGE_TAG_ARG="main"

case "${1:-}" in
  "" )
    ;;
  api|frontend|face-worker)
    ;;
  -*)
    usage
    exit 1
    ;;
  *)
    IMAGE_TAG_ARG="$1"
    shift || true
    ;;
esac

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it from .env.prod.example." >&2
  exit 1
fi

if [ ! -f "$API_ENV_FILE" ]; then
  echo "Missing $API_ENV_FILE. Create it from backend/.env.docker.example." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found in PATH." >&2
  exit 1
fi

if command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v sudo >/dev/null 2>&1 && sudo docker-compose version >/dev/null 2>&1; then
  COMPOSE_CMD="sudo -E docker-compose"
elif command -v sudo >/dev/null 2>&1 && sudo docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="sudo -E docker compose"
else
  echo "Neither 'docker compose' nor 'docker-compose' is available." >&2
  exit 1
fi

load_value_if_missing AWS_REGION
load_value_if_missing AWS_DEFAULT_REGION
load_value_if_missing GHCR_USERNAME
load_value_if_missing GHCR_TOKEN
load_value_if_missing SSM_PARAMETER_NAME
load_value_if_missing GHCR_SSM_PARAMETER_NAME
load_value_if_missing GHCR_USERNAME_SSM_PARAMETER
load_value_if_missing GHCR_TOKEN_SSM_PARAMETER

if [ $# -eq 0 ]; then
  set -- api frontend face-worker
fi

case "${IMAGE_REGISTRY:-ghcr.io}" in
  ghcr.io)
    GHCR_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"
    ghcr_from_ssm="false"
    ghcr_ssm_failed="false"
    ghcr_json_parameter="${GHCR_SSM_PARAMETER_NAME:-${SSM_PARAMETER_NAME:-}}"

    if [ -n "${GHCR_USERNAME_SSM_PARAMETER:-}" ]; then
      if ghcr_username_from_ssm="$(fetch_ssm_parameter "$GHCR_USERNAME_SSM_PARAMETER" "$GHCR_REGION")"; then
        export "GHCR_USERNAME=$ghcr_username_from_ssm"
        ghcr_from_ssm="true"
      else
        ghcr_ssm_failed="true"
      fi
    fi

    if [ -n "${GHCR_TOKEN_SSM_PARAMETER:-}" ]; then
      if ghcr_token_from_ssm="$(fetch_ssm_parameter "$GHCR_TOKEN_SSM_PARAMETER" "$GHCR_REGION")"; then
        export "GHCR_TOKEN=$ghcr_token_from_ssm"
        ghcr_from_ssm="true"
      else
        ghcr_ssm_failed="true"
      fi
    fi

    if [ -n "$ghcr_json_parameter" ] && { [ -z "${GHCR_USERNAME:-}" ] || [ -z "${GHCR_TOKEN:-}" ]; }; then
      if ghcr_json_raw="$(fetch_ssm_parameter "$ghcr_json_parameter" "$GHCR_REGION")"; then
        if [ -z "${GHCR_USERNAME:-}" ] && ghcr_username_from_json="$(parse_json_key "$ghcr_json_raw" GHCR_USERNAME)"; then
          export "GHCR_USERNAME=$ghcr_username_from_json"
          ghcr_from_ssm="true"
        fi
        if [ -z "${GHCR_TOKEN:-}" ] && ghcr_token_from_json="$(parse_json_key "$ghcr_json_raw" GHCR_TOKEN)"; then
          export "GHCR_TOKEN=$ghcr_token_from_json"
          ghcr_from_ssm="true"
        fi
      else
        ghcr_ssm_failed="true"
      fi
    fi

    if [ "$ghcr_ssm_failed" = "true" ] && { [ -z "${GHCR_USERNAME:-}" ] || [ -z "${GHCR_TOKEN:-}" ]; }; then
      echo "Failed to load GHCR credentials from SSM and no local fallback was found." >&2
      exit 1
    fi

    if { [ -n "${GHCR_USERNAME_SSM_PARAMETER:-}" ] || [ -n "${GHCR_TOKEN_SSM_PARAMETER:-}" ] || [ -n "$ghcr_json_parameter" ]; } && { [ -z "${GHCR_USERNAME:-}" ] || [ -z "${GHCR_TOKEN:-}" ]; }; then
      echo "Incomplete GHCR credentials after loading AWS SSM/local fallback." >&2
      exit 1
    fi

    if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
      if [ "$ghcr_from_ssm" = "true" ]; then
        echo "Authenticating to GHCR using AWS SSM Parameter Store."
      else
        echo "Authenticating to GHCR using local deploy secrets."
      fi
      printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
    else
      echo "GHCR credentials not found in AWS SSM or .env.prod.secrets; assuming docker login ghcr.io was already done."
    fi
    ;;
esac

: "${POSTGRES_VOLUME_NAME:=edespetohub_postgres-data}"
if ! docker volume inspect "$POSTGRES_VOLUME_NAME" >/dev/null 2>&1; then
  echo "Creating Postgres volume: $POSTGRES_VOLUME_NAME"
  docker volume create "$POSTGRES_VOLUME_NAME" >/dev/null
fi

export IMAGE_TAG="$IMAGE_TAG_ARG"

echo "Deploying image tag: $IMAGE_TAG"
echo "Services: $*"

$COMPOSE_CMD \
  -f "$ROOT_DIR/docker-compose.yml" \
  -f "$ROOT_DIR/docker-compose.prod.yml" \
  -f "$ROOT_DIR/docker-compose.deploy.yml" \
  --env-file "$ENV_FILE" \
  pull "$@"

for service_name in "$@"; do
  show_release_comparison "$service_name"
done

$COMPOSE_CMD \
  -f "$ROOT_DIR/docker-compose.yml" \
  -f "$ROOT_DIR/docker-compose.prod.yml" \
  -f "$ROOT_DIR/docker-compose.deploy.yml" \
  --env-file "$ENV_FILE" \
  up -d --no-build --no-deps "$@"

echo "Release deploy done."
