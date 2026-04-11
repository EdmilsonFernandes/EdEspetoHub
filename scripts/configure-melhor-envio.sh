#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.prod}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create it first (example: cp .env.prod.example .env.prod)." >&2
  exit 1
fi

if [ $# -lt 3 ]; then
  echo "Usage:" >&2
  echo "  $0 <access_token> <client_id> <client_secret> [refresh_token] [base_url] [provider] [strict_provider]" >&2
  echo "" >&2
  echo "Example:" >&2
  echo "  $0 \"ME_ACCESS\" \"23621\" \"ME_SECRET\" \"ME_REFRESH\" \"https://melhorenvio.com.br\" \"melhor_envio\" \"false\"" >&2
  exit 1
fi

ACCESS_TOKEN="$1"
CLIENT_ID="$2"
CLIENT_SECRET="$3"
REFRESH_TOKEN="${4:-}"
BASE_URL="${5:-https://melhorenvio.com.br}"
PROVIDER="${6:-melhor_envio}"
STRICT_PROVIDER="${7:-false}"

sed -i '/^SHIPPING_PROVIDER=/d' "$ENV_FILE"
sed -i '/^SHIPPING_STRICT_PROVIDER=/d' "$ENV_FILE"
sed -i '/^MELHOR_ENVIO_BASE_URL=/d' "$ENV_FILE"
sed -i '/^MELHOR_ENVIO_ACCESS_TOKEN=/d' "$ENV_FILE"
sed -i '/^MELHOR_ENVIO_CLIENT_ID=/d' "$ENV_FILE"
sed -i '/^MELHOR_ENVIO_CLIENT_SECRET=/d' "$ENV_FILE"
sed -i '/^MELHOR_ENVIO_REFRESH_TOKEN=/d' "$ENV_FILE"

{
  echo "SHIPPING_PROVIDER=$PROVIDER"
  echo "SHIPPING_STRICT_PROVIDER=$STRICT_PROVIDER"
  echo "MELHOR_ENVIO_BASE_URL=$BASE_URL"
  echo "MELHOR_ENVIO_ACCESS_TOKEN=$ACCESS_TOKEN"
  echo "MELHOR_ENVIO_CLIENT_ID=$CLIENT_ID"
  echo "MELHOR_ENVIO_CLIENT_SECRET=$CLIENT_SECRET"
  echo "MELHOR_ENVIO_REFRESH_TOKEN=$REFRESH_TOKEN"
} >> "$ENV_FILE"

echo "Updated $ENV_FILE with Melhor Envio settings."
grep -E '^(SHIPPING_PROVIDER|SHIPPING_STRICT_PROVIDER|MELHOR_ENVIO_BASE_URL|MELHOR_ENVIO_ACCESS_TOKEN|MELHOR_ENVIO_CLIENT_ID|MELHOR_ENVIO_CLIENT_SECRET|MELHOR_ENVIO_REFRESH_TOKEN)=' "$ENV_FILE" | sed 's/\(MELHOR_ENVIO_ACCESS_TOKEN=\).*/\1***REDACTED***/; s/\(MELHOR_ENVIO_CLIENT_SECRET=\).*/\1***REDACTED***/; s/\(MELHOR_ENVIO_REFRESH_TOKEN=\).*/\1***REDACTED***/'

