#!/usr/bin/env sh
set -eu

if [ $# -lt 4 ]; then
  echo "Usage:" >&2
  echo "  $0 <base_url> <store_slug> <destination_zip> <product_id> [quantity]" >&2
  echo "" >&2
  echo "Example:" >&2
  echo "  $0 \"https://janocaminho.com.br\" \"minha-loja\" \"01310100\" \"6381d629-5965-4677-8122-57b469edd647\" \"2\"" >&2
  exit 1
fi

BASE_URL="$1"
STORE_SLUG="$2"
DEST_ZIP="$3"
PRODUCT_ID="$4"
QUANTITY="${5:-1}"

curl -sS -X POST "$BASE_URL/api/stores/slug/$STORE_SLUG/postal/quote" \
  -H "Content-Type: application/json" \
  -d "{
    \"destinationZip\": \"$DEST_ZIP\",
    \"items\": [
      {
        \"productId\": \"$PRODUCT_ID\",
        \"quantity\": $QUANTITY
      }
    ]
  }"

