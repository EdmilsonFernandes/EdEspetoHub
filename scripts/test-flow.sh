#!/usr/bin/env sh
set -e

API_BASE="${API_BASE:-https://www.chamanoespeto.com.br/api}"
EMAIL="${TEST_EMAIL:-test-flow@example.com}"
PASSWORD="${TEST_PASSWORD:-Test@123456}"
STORE_NAME="${TEST_STORE_NAME:-Loja Fluxo Teste}"
PAYMENT_METHOD="${TEST_PAYMENT_METHOD:-PIX}"

echo "==> Preparando planos"
curl -s "$API_BASE/plans" >/dev/null

PLAN_ID="$(curl -s "$API_BASE/plans" | jq -r '.[] | select(.enabled==true) | .id' | head -n 1)"
if [ -z "$PLAN_ID" ] || [ "$PLAN_ID" = "null" ]; then
  echo "Nenhum plano ativo encontrado." >&2
  exit 1
fi

echo "==> Registrando usuario"
REGISTER_PAYLOAD="$(cat <<EOF
{
  "fullName": "Teste Fluxo",
  "email": "$EMAIL",
  "password": "$PASSWORD",
  "storeName": "$STORE_NAME",
  "paymentMethod": "$PAYMENT_METHOD",
  "planId": "$PLAN_ID"
}
EOF
)"

REGISTER_RESPONSE="$(curl -s -X POST "$API_BASE/auth/register" -H "Content-Type: application/json" -d "$REGISTER_PAYLOAD")"
PAYMENT_ID="$(printf '%s' "$REGISTER_RESPONSE" | jq -r '.payment.id')"
STORE_SLUG="$(printf '%s' "$REGISTER_RESPONSE" | jq -r '.store.slug')"

if [ -z "$PAYMENT_ID" ] || [ "$PAYMENT_ID" = "null" ]; then
  echo "Falha ao registrar usuario. Resposta: $REGISTER_RESPONSE" >&2
  exit 1
fi

echo "==> Verificando e-mail (necessario colar token manual)"
echo "Abra o e-mail de confirmacao e copie o token do link."
read -r -p "Token de verificacao: " VERIFY_TOKEN

VERIFY_PAYLOAD="$(cat <<EOF
{ "token": "$VERIFY_TOKEN" }
EOF
)"
curl -s -X POST "$API_BASE/auth/verify-email" -H "Content-Type: application/json" -d "$VERIFY_PAYLOAD" >/dev/null

echo "==> Pagamento criado: $PAYMENT_ID"
echo "Acesse: $API_BASE/../payment/$PAYMENT_ID"

echo "==> Login admin"
LOGIN_PAYLOAD="$(cat <<EOF
{ "slug": "$STORE_SLUG", "password": "$PASSWORD" }
EOF
)"

LOGIN_RESPONSE="$(curl -s -X POST "$API_BASE/auth/admin-login" -H "Content-Type: application/json" -d "$LOGIN_PAYLOAD")"
TOKEN="$(printf '%s' "$LOGIN_RESPONSE" | jq -r '.token')"
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Login admin falhou. Resposta: $LOGIN_RESPONSE" >&2
  exit 1
fi

echo "==> OK. Store: $STORE_SLUG"
