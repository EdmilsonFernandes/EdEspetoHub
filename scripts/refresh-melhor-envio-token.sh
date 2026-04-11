#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.prod}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

get_env() {
  KEY="$1"
  awk -F= -v k="$KEY" '$1==k{print substr($0,index($0,"=")+1); exit}' "$ENV_FILE"
}

BASE_URL="$(get_env MELHOR_ENVIO_BASE_URL)"
CLIENT_ID="$(get_env MELHOR_ENVIO_CLIENT_ID)"
CLIENT_SECRET="$(get_env MELHOR_ENVIO_CLIENT_SECRET)"
REFRESH_TOKEN="$(get_env MELHOR_ENVIO_REFRESH_TOKEN)"

if [ -z "${BASE_URL}" ]; then BASE_URL="https://melhorenvio.com.br"; fi

if [ -z "${CLIENT_ID}" ] || [ -z "${CLIENT_SECRET}" ] || [ -z "${REFRESH_TOKEN}" ]; then
  echo "Missing MELHOR_ENVIO_CLIENT_ID / MELHOR_ENVIO_CLIENT_SECRET / MELHOR_ENVIO_REFRESH_TOKEN in $ENV_FILE" >&2
  exit 1
fi

TMP_JSON="$(mktemp)"
HTTP_CODE="$(curl -sS -o "$TMP_JSON" -w "%{http_code}" -X POST "$BASE_URL/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\":\"refresh_token\",
    \"client_id\":\"$CLIENT_ID\",
    \"client_secret\":\"$CLIENT_SECRET\",
    \"refresh_token\":\"$REFRESH_TOKEN\"
  }")"

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  echo "Failed to refresh token (HTTP $HTTP_CODE)." >&2
  cat "$TMP_JSON" >&2
  rm -f "$TMP_JSON"
  exit 1
fi

ACCESS_TOKEN="$(awk -F'"' '/"access_token"[[:space:]]*:[[:space:]]*"/{print $4; exit}' "$TMP_JSON")"
NEW_REFRESH_TOKEN="$(awk -F'"' '/"refresh_token"[[:space:]]*:[[:space:]]*"/{print $4; exit}' "$TMP_JSON")"

if [ -z "${ACCESS_TOKEN}" ]; then
  echo "Could not parse access_token from response." >&2
  cat "$TMP_JSON" >&2
  rm -f "$TMP_JSON"
  exit 1
fi

sed -i '/^MELHOR_ENVIO_ACCESS_TOKEN=/d' "$ENV_FILE"
sed -i '/^MELHOR_ENVIO_REFRESH_TOKEN=/d' "$ENV_FILE"
echo "MELHOR_ENVIO_ACCESS_TOKEN=$ACCESS_TOKEN" >> "$ENV_FILE"
if [ -n "${NEW_REFRESH_TOKEN}" ]; then
  echo "MELHOR_ENVIO_REFRESH_TOKEN=$NEW_REFRESH_TOKEN" >> "$ENV_FILE"
else
  echo "MELHOR_ENVIO_REFRESH_TOKEN=$REFRESH_TOKEN" >> "$ENV_FILE"
fi

rm -f "$TMP_JSON"
echo "Melhor Envio token refreshed in $ENV_FILE"
