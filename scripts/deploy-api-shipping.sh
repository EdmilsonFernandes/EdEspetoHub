#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

if [ -x "$ROOT_DIR/scripts/refresh-melhor-envio-token.sh" ]; then
  "$ROOT_DIR/scripts/refresh-melhor-envio-token.sh" || true
fi

"$ROOT_DIR/scripts/deploy-api.sh"

