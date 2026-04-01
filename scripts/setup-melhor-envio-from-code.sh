#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.prod}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

if [ $# -lt 2 ]; then
  echo "Usage: $0 <authorization_code> <client_secret> [client_id] [base_url] [strict_provider]" >&2
  echo "Example: $0 \"def502...\" \"SECRET\" \"23621\" \"https://melhorenvio.com.br\" \"false\"" >&2
  exit 1
fi

CODE="$1"
CLIENT_SECRET="$2"
CLIENT_ID="${3:-23621}"
BASE_URL="${4:-https://melhorenvio.com.br}"
STRICT_PROVIDER="${5:-false}"

TMP_JSON="$(mktemp)"
HTTP_CODE="$(curl -sS -o "$TMP_JSON" -w "%{http_code}" -X POST "$BASE_URL/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{\"grant_type\":\"authorization_code\",\"client_id\":\"$CLIENT_ID\",\"client_secret\":\"$CLIENT_SECRET\",\"redirect_uri\":\"https://janocaminho.com.br/\",\"code\":\"$CODE\"}")"

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  echo "Failed to create token (HTTP $HTTP_CODE)." >&2
  cat "$TMP_JSON" >&2
  rm -f "$TMP_JSON"
  exit 1
fi

ACCESS_TOKEN="$(awk -F'"' '/"access_token"[[:space:]]*:[[:space:]]*"/{print $4; exit}' "$TMP_JSON")"
REFRESH_TOKEN="$(awk -F'"' '/"refresh_token"[[:space:]]*:[[:space:]]*"/{print $4; exit}' "$TMP_JSON")"

if [ -z "${ACCESS_TOKEN}" ] || [ -z "${REFRESH_TOKEN}" ]; then
  echo "Could not parse access/refresh token from response." >&2
  cat "$TMP_JSON" >&2
  rm -f "$TMP_JSON"
  exit 1
fi

sed -i '/^SHIPPING_PROVIDER=/d' "$ENV_FILE"
sed -i '/^SHIPPING_STRICT_PROVIDER=/d' "$ENV_FILE"
sed -i '/^MELHOR_ENVIO_BASE_URL=/d' "$ENV_FILE"
sed -i '/^MELHOR_ENVIO_CLIENT_ID=/d' "$ENV_FILE"
sed -i '/^MELHOR_ENVIO_CLIENT_SECRET=/d' "$ENV_FILE"
sed -i '/^MELHOR_ENVIO_ACCESS_TOKEN=/d' "$ENV_FILE"
sed -i '/^MELHOR_ENVIO_REFRESH_TOKEN=/d' "$ENV_FILE"

{
  echo "SHIPPING_PROVIDER=melhor_envio"
  echo "SHIPPING_STRICT_PROVIDER=$STRICT_PROVIDER"
  echo "MELHOR_ENVIO_BASE_URL=$BASE_URL"
  echo "MELHOR_ENVIO_CLIENT_ID=$CLIENT_ID"
  echo "MELHOR_ENVIO_CLIENT_SECRET=$CLIENT_SECRET"
  echo "MELHOR_ENVIO_ACCESS_TOKEN=$ACCESS_TOKEN"
  echo "MELHOR_ENVIO_REFRESH_TOKEN=$REFRESH_TOKEN"
} >> "$ENV_FILE"

rm -f "$TMP_JSON"

echo "Updated $ENV_FILE with live Melhor Envio tokens."
grep -E '^(SHIPPING_PROVIDER|SHIPPING_STRICT_PROVIDER|MELHOR_ENVIO_BASE_URL|MELHOR_ENVIO_CLIENT_ID|MELHOR_ENVIO_CLIENT_SECRET|MELHOR_ENVIO_ACCESS_TOKEN|MELHOR_ENVIO_REFRESH_TOKEN)=' "$ENV_FILE" \
  | sed 's/\(MELHOR_ENVIO_CLIENT_SECRET=\).*/\1***REDACTED***/; s/\(MELHOR_ENVIO_ACCESS_TOKEN=\).*/\1***REDACTED***/; s/\(MELHOR_ENVIO_REFRESH_TOKEN=\).*/\1***REDACTED***/'

if [ -x "$ROOT_DIR/scripts/deploy-api-shipping.sh" ]; then
  "$ROOT_DIR/scripts/deploy-api-shipping.sh"
else
  "$ROOT_DIR/scripts/deploy-api.sh"
fi

echo "Done."
